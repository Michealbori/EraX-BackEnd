import Investment from "../models/Investment.js";
import User from "../models/User.js";
import crypto from "crypto";
import { sendInvestmentRenewalEmail } from "../config/email.js";

const getSecureUser = async (req, res) => {
  if (req.user?.id) {
    const user = await User.findById(req.user.id);
    if (user) return user;
  }
  
  const email = req.body?.email || req.query?.email;
  if (email) {
    console.warn("⚠️ SECURITY WARNING: Using email fallback instead of JWT token!");
    return await User.findOne({ email: email.toLowerCase().trim() });
  }

  return null;
};

const generateClaimCode = () => {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 8);
};

const TESTING_MODE = process.env.NODE_ENV !== 'production'; 

// ==========================================
// POST /api/investment/create
// ==========================================
export const createInvestment = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { assetClass, amount } = req.body;

    console.log("\n" + "=".repeat(60));
    console.log("💰 [INVESTMENT REQUEST]", { 
      email: user.email, 
      assetClass, 
      amount 
    });

    if (!assetClass || !amount) {
      return res.status(400).json({
        success: false,
        message: "Asset class and amount are required"
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 50) {
      return res.status(400).json({
        success: false,
        message: "Minimum investment amount is $50"
      });
    }

    if ((user.balances?.availableLiquidity || 0) < amountNum) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: $${(user.balances?.availableLiquidity || 0).toFixed(2)}`
      });
    }

    const balanceBefore = user.balances.availableLiquidity;
    user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) - amountNum;
    user.balances.totalInvested = (user.balances?.totalInvested || 0) + amountNum;
    user.balances.lockedInvestment = (user.balances?.lockedInvestment || 0) + amountNum;
    
    console.log(`💸 Balance Before: $${balanceBefore.toFixed(2)}`);
    console.log(`💸 Balance After: $${user.balances.availableLiquidity.toFixed(2)}`);
    console.log(`🔒 Locked Investment: $${user.balances.lockedInvestment.toFixed(2)}`);
    console.log(`💰 Total Invested: $${user.balances.totalInvested.toFixed(2)}`);
    
    const startDate = new Date();
    let expectedEndDate = new Date(startDate);
    
    if (TESTING_MODE) {
      expectedEndDate.setSeconds(expectedEndDate.getSeconds() + (30 * 20));
      console.log(`⏰ [TEST MODE] 30-Day challenge will complete in 10 minutes.`);
    } else {
      expectedEndDate.setDate(expectedEndDate.getDate() + 30);
      console.log(`⏰ [PROD MODE] 30-Day challenge ends on ${expectedEndDate.toLocaleDateString()}`);
    }
    
    const interestAmount = amountNum;
    const potentialReturn = amountNum + interestAmount; 
    
    console.log(`💰 Potential Return: $${potentialReturn.toFixed(2)}`);
    
    const transactionId = `INV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const firstCodeGenerationTime = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
    
    console.log(`📅 First code will be generated at: ${firstCodeGenerationTime.toLocaleString()}`);

    const investment = await Investment.create({
      user: user._id,
      email: user.email,
      assetClass: assetClass.toLowerCase(),
      symbol: assetClass.toUpperCase(),
      name: `${assetClass} Investment`,
      amount: amountNum,
      interestAmount: interestAmount,
      startDate: startDate,
      expectedEndDate: expectedEndDate,
      actualEndDate: expectedEndDate,
      totalDays: 30,
      completedDays: 0,
      missedDays: 0,
      extensionDays: 0,
      isComplete: false, 
      dailyTasks: [],
      interestStatus: 'pending',
      status: 'active',
      transactionId: transactionId,
      investedAt: startDate,
      cycleNumber: 1,
      parentInvestment: null,
      isAutoRenewed: false,
      profitPaidOut: 0,
      currentValue: amountNum,
      dailyInterestRate: 3.333,
      totalInterestEarned: 0,
      codeGeneratedAt: firstCodeGenerationTime,
      claimCode: null,
      codeExpiresAt: null
    });

    await user.save();

    console.log(`✅ Investment created: ${transactionId}`);
    console.log(`⏰ First daily code will be available in 24 hours`);
    console.log("=".repeat(60) + "\n");

    res.status(201).json({
      success: true,
      message: TESTING_MODE 
        ? `Successfully invested $${amountNum}! 30-day challenge will complete in 10 minutes. First code available in 24 hours.`
        : `Successfully invested $${amountNum}! Complete your daily tasks for 30 days to earn $${interestAmount} profit. First code will be emailed in 24 hours.`,
      investment: {
        id: investment._id,
        transactionId: investment.transactionId,
        assetClass: investment.assetClass,
        amount: investment.amount,
        interestAmount: investment.interestAmount,
        potentialReturn: potentialReturn,
        startDate: investment.startDate,
        expectedEndDate: investment.expectedEndDate,
        totalDays: investment.totalDays,
        completedDays: investment.completedDays,
        daysRemaining: 30,
        cycleNumber: investment.cycleNumber,
        currentValue: investment.currentValue,
        firstCodeAt: firstCodeGenerationTime
      },
      balances: {
        availableLiquidity: user.balances.availableLiquidity,
        lockedInvestment: user.balances.lockedInvestment,
        totalInvested: user.balances.totalInvested,
        netProfitLoss: user.balances.netProfitLoss
      }
    });

  } catch (error) {
    console.error("❌ INVESTMENT ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create investment",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==========================================
// ✅ NEW: Direct Database Code Validation (No Errors)
// ==========================================
export const validateDailyCode = async (req, res) => {
  try {
    const { investmentId } = req.params;
    const { code } = req.body;
    
    const user = await getSecureUser(req, res);
    if (!user) {
      return res.status(401).json({ success: false, valid: false, message: "Authentication required" });
    }

    // Validate input
    if (!code || typeof code !== 'string') {
      return res.status(200).json({ 
        success: false, 
        valid: false, 
        message: "Please enter a code" 
      });
    }

    // ✅ Direct database lookup
    const investment = await Investment.findOne({ 
      _id: investmentId, 
      user: user._id 
    });

    if (!investment) {
      return res.status(200).json({ 
        success: false, 
        valid: false, 
        message: "Investment not found" 
      });
    }

    // Check if already completed
    if (investment.interestStatus === 'claimed') {
      return res.status(200).json({ 
        success: false, 
        valid: false, 
        message: "This investment cycle is already complete",
        completed: true
      });
    }

    // Check if there's a code to validate
    if (!investment.claimCode) {
      return res.status(200).json({ 
        success: false, 
        valid: false, 
        message: "No code available yet. Check back later!",
        waiting: true
      });
    }

    // Check if code expired
    if (investment.codeExpiresAt && new Date() > new Date(investment.codeExpiresAt)) {
      return res.status(200).json({ 
        success: false, 
        valid: false, 
        message: "This code has expired. A new one will be generated soon.",
        expired: true
      });
    }

    // Check if already checked in today
    const today = new Date().setHours(0, 0, 0, 0);
    const alreadyCheckedInToday = investment.dailyTasks.some(task => 
      new Date(task.date).setHours(0, 0, 0, 0) === today && task.completed
    );
    
    if (alreadyCheckedInToday) {
      return res.status(200).json({ 
        success: false, 
        valid: false, 
        message: "You've already checked in today. Come back tomorrow!",
        alreadyCheckedIn: true
      });
    }

    // ✅ DIRECT DATABASE VALIDATION - Case insensitive, trim whitespace
    const normalizedInput = code.toUpperCase().trim();
    const normalizedStored = investment.claimCode.toUpperCase().trim();
    
    const isValid = normalizedInput === normalizedStored;

    if (isValid) {
      return res.status(200).json({ 
        success: true, 
        valid: true, 
        message: "✅ Code is valid! Ready to check in.",
        day: investment.completedDays + 1,
        totalDays: investment.totalDays,
        currentValue: investment.currentValue || investment.amount
      });
    } else {
      return res.status(200).json({ 
        success: false, 
        valid: false, 
        message: "❌ Invalid code. Please check and try again.",
        invalid: true
      });
    }

  } catch (error) {
    console.error("❌ VALIDATE CODE ERROR:", error);
    return res.status(200).json({ 
      success: false, 
      valid: false, 
      message: "Validation error. Please try again." 
    });
  }
};

// ==========================================
// ✅ POST /api/investment/check-in/:investmentId - WITH DAILY INTEREST
// ==========================================
export const verifyDailyCheckIn = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { investmentId } = req.params;
    const { code } = req.body;

    console.log("\n" + "=".repeat(60));
    console.log("📅 [DAILY CHECK-IN REQUEST]", { 
      investmentId, 
      email: user.email 
    });

    if (!code) {
      return res.status(400).json({ success: false, message: "Daily code is required" });
    }

    const investment = await Investment.findById(investmentId);
    if (!investment) {
      return res.status(404).json({ success: false, message: "Investment not found" });
    }

    if (investment.user.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (investment.interestStatus === 'claimed') {
      return res.status(400).json({ success: false, message: "Reward already released!" });
    }

    if (!investment.claimCode) {
      return res.status(400).json({ success: false, message: "No daily code available yet. Wait for the next code generation." });
    }

    if (investment.codeExpiresAt && new Date() > new Date(investment.codeExpiresAt)) {
      return res.status(400).json({ success: false, message: "Today's code has expired. Wait for a new code." });
    }

    // ✅ Case-insensitive comparison with trim
    const normalizedInput = code.toUpperCase().trim();
    const normalizedStored = investment.claimCode.toUpperCase().trim();
    
    if (normalizedInput !== normalizedStored) {
      return res.status(400).json({ success: false, message: "Invalid daily code." });
    }

    const today = new Date().setHours(0, 0, 0, 0);
    const alreadyCheckedInToday = investment.dailyTasks.some(task => 
      new Date(task.date).setHours(0, 0, 0, 0) === today && task.completed
    );
    
    if (alreadyCheckedInToday) {
      return res.status(400).json({ success: false, message: "Already checked in today!" });
    }

    const currentDay = investment.completedDays + 1;
    
    // ✅ CALCULATE DAILY INTEREST
    const dailyInterestRate = investment.dailyInterestRate || 3.333;
    const dailyInterestAmount = investment.amount * (dailyInterestRate / 100);
    
    console.log(`💰 Daily Interest Calculation:`, {
      principal: investment.amount,
      dailyRate: `${dailyInterestRate}%`,
      dailyInterest: `$${dailyInterestAmount.toFixed(2)}`,
      day: currentDay
    });
    
    investment.dailyTasks.push({
      dayNumber: currentDay,
      date: new Date(),
      completed: true,
      completedAt: new Date(),
      taskCode: normalizedInput,
      interestEarned: dailyInterestAmount
    });
    
    investment.completedDays = currentDay;
    investment.lastCheckInDate = new Date();
    investment.codeClaimedAt = new Date();
    
    investment.claimCode = null; 
    investment.codeExpiresAt = null;
    investment.interestStatus = 'pending';
    
    const nextCodeGenerationTime = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
    investment.codeGeneratedAt = nextCodeGenerationTime;
    
    console.log(`📅 Next code will be generated at: ${nextCodeGenerationTime.toLocaleString()}`);
    
    investment.totalInterestEarned = (investment.totalInterestEarned || 0) + dailyInterestAmount;
    investment.currentValue = investment.amount + investment.totalInterestEarned;
    
    console.log(`📈 Investment Growth:`, {
      day: currentDay,
      principal: investment.amount,
      totalInterest: investment.totalInterestEarned.toFixed(2),
      currentValue: investment.currentValue.toFixed(2)
    });

    let message = "";
    let rewardReleased = false;
    let newInvestment = null;
    let dailyGrowth = null;

    if (investment.completedDays >= investment.totalDays) {
      const profitAmount = investment.interestAmount;
      
      user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) + profitAmount;
      user.balances.netProfitLoss = (user.balances?.netProfitLoss || 0) + profitAmount;
      
      investment.interestStatus = 'claimed';
      investment.status = 'auto_renewed';
      investment.actualEndDate = new Date();
      investment.profitPaidOut = profitAmount;
      
      await investment.save();
      
      const startDate = new Date();
      let expectedEndDate = new Date(startDate);
      
      if (TESTING_MODE) {
        expectedEndDate.setSeconds(expectedEndDate.getSeconds() + (30 * 20));
      } else {
        expectedEndDate.setDate(expectedEndDate.getDate() + 30);
      }
      
      const newTransactionId = `INV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const firstCodeGenerationTime = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      
      newInvestment = await Investment.create({
        user: user._id,
        email: user.email,
        assetClass: investment.assetClass,
        symbol: investment.symbol,
        name: investment.name,
        amount: investment.amount,
        interestAmount: investment.interestAmount,
        startDate: startDate,
        expectedEndDate: expectedEndDate,
        actualEndDate: expectedEndDate,
        totalDays: 30,
        completedDays: 0,
        missedDays: 0,
        extensionDays: 0,
        isComplete: false,
        dailyTasks: [],
        interestStatus: 'pending',
        status: 'active',
        transactionId: newTransactionId,
        investedAt: startDate,
        cycleNumber: investment.cycleNumber + 1,
        parentInvestment: investment._id,
        isAutoRenewed: true,
        profitPaidOut: 0,
        currentValue: investment.amount,
        dailyInterestRate: investment.dailyInterestRate,
        totalInterestEarned: 0,
        codeGeneratedAt: firstCodeGenerationTime,
        claimCode: null,
        codeExpiresAt: null
      });
      
      await user.save();
      
      message = `🎉 Cycle ${investment.cycleNumber} Complete! You earned $${profitAmount.toFixed(2)} profit. Your investment has automatically renewed for Cycle ${newInvestment.cycleNumber}. First code for new cycle will be available in 24 hours.`;
      rewardReleased = true;
      
      console.log(`💰 PROFIT PAID: $${profitAmount.toFixed(2)} | 🔒 LOCKED: $${investment.amount.toFixed(2)} | 🔄 CYCLE: ${newInvestment.cycleNumber}`);
      
      try {
        await sendInvestmentRenewalEmail({
          userEmail: user.email,
          userName: user.fullName || user.email.split('@')[0],
          profitAmount: profitAmount,
          lockedAmount: investment.amount,
          cycleNumber: investment.cycleNumber,
          newCycleNumber: newInvestment.cycleNumber,
          nextEndDate: expectedEndDate
        });
        console.log("✅ Renewal email sent");
      } catch (emailError) {
        console.error("❌ Renewal email failed:", emailError.message);
      }
      
    } else {
      message = `✅ Checked in successfully! Day ${investment.completedDays}/${investment.totalDays} completed. Your investment grew by $${dailyInterestAmount.toFixed(2)} today! Next code will be available in 24 hours.`;
      await investment.save();
      
      dailyGrowth = {
        dailyInterestEarned: dailyInterestAmount,
        totalInterestEarned: investment.totalInterestEarned,
        currentValue: investment.currentValue,
        principal: investment.amount,
        growthPercentage: ((investment.currentValue / investment.amount - 1) * 100).toFixed(2)
      };
    }

    console.log(`✅ Daily check-in recorded. Day ${investment.completedDays}/${investment.totalDays}`);
    console.log("=".repeat(60) + "\n");

    res.status(200).json({
      success: true,
      message,
      rewardReleased,
      completedDays: investment.completedDays,
      targetDays: investment.totalDays,
      cycleNumber: investment.cycleNumber,
      dailyGrowth,
      newInvestment: newInvestment ? {
        id: newInvestment._id,
        transactionId: newInvestment.transactionId,
        cycleNumber: newInvestment.cycleNumber,
        startDate: newInvestment.startDate,
        expectedEndDate: newInvestment.expectedEndDate,
        firstCodeAt: newInvestment.codeGeneratedAt
      } : null,
      updatedBalances: rewardReleased ? {
        availableLiquidity: user.balances.availableLiquidity,
        lockedInvestment: user.balances.lockedInvestment,
        netProfitLoss: user.balances.netProfitLoss
      } : null
    });

  } catch (error) {
    console.error("❌ DAILY CHECK-IN ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to verify daily code",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==========================================
// GET /api/investment/user-investments
// ==========================================
export const getUserInvestments = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const investments = await Investment.find({ user: user._id }).sort({ investedAt: -1 });

    const processedInvestments = investments.map(inv => {
      const now = new Date();
      const totalReturn = inv.amount + inv.interestAmount;

      return {
        id: inv._id,
        transactionId: inv.transactionId || '',
        assetClass: inv.assetClass || 'stocks',
        symbol: inv.symbol || 'STOCK',
        name: inv.name || 'Investment',
        amount: inv.amount.toFixed(2),
        interestAmount: inv.interestAmount.toFixed(2),
        totalReturn: totalReturn.toFixed(2),
        investedAt: inv.investedAt,
        startDate: inv.startDate,
        expectedEndDate: inv.expectedEndDate,
        actualEndDate: inv.actualEndDate,
        totalDays: inv.totalDays,
        completedDays: inv.completedDays,
        missedDays: inv.missedDays || 0,
        lastCheckInDate: inv.lastCheckInDate || inv.investedAt,
        isComplete: inv.interestStatus === 'claimed',
        interestStatus: inv.interestStatus || 'pending',
        status: inv.status || 'active',
        claimCode: inv.claimCode,
        codeExpiresAt: inv.codeExpiresAt,
        codeGeneratedAt: inv.codeGeneratedAt,
        dailyTasks: inv.dailyTasks,
        daysRemaining: Math.max(0, inv.totalDays - inv.completedDays),
        cycleNumber: inv.cycleNumber || 1,
        parentInvestment: inv.parentInvestment,
        isAutoRenewed: inv.isAutoRenewed || false,
        profitPaidOut: inv.profitPaidOut || 0,
        currentValue: inv.currentValue || inv.amount,
        totalInterestEarned: inv.totalInterestEarned || 0,
        dailyInterestRate: inv.dailyInterestRate || 3.333
      };
    });

    const activeInvestments = processedInvestments.filter(i => i.status === 'active');
    const completedInvestments = processedInvestments.filter(i => i.interestStatus === 'claimed');
    
    const summary = {
      totalInvested: activeInvestments.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0),
      totalPotentialReturn: activeInvestments.reduce((sum, i) => sum + parseFloat(i.totalReturn || 0), 0),
      activeCount: activeInvestments.length,
      completedCount: completedInvestments.length,
      investmentCount: processedInvestments.length,
      availableLiquidity: user.balances?.availableLiquidity || 0,
      lockedInvestment: user.balances?.lockedInvestment || 0,
      totalInvestedBalance: user.balances?.totalInvested || 0,
      netProfitLoss: user.balances?.netProfitLoss || 0
    };

    res.status(200).json({
      success: true,
      investments: processedInvestments,
      summary,
      timestamp: new Date()
    });

  } catch (error) {
    console.error("❌ GET INVESTMENTS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch investments",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==========================================
// GET /api/investment/claim-code/:investmentId
// ==========================================
export const getClaimCode = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { investmentId } = req.params;

    const investment = await Investment.findOne({ 
      _id: investmentId, 
      user: user._id 
    });
    
    if (!investment) {
      return res.status(404).json({ success: false, message: 'Investment not found' });
    }

    res.json({ 
      success: true, 
      code: investment.claimCode || null,
      expiresAt: investment.codeExpiresAt,
      generatedAt: investment.codeGeneratedAt,
      status: investment.interestStatus,
      completedDays: investment.completedDays,
      totalDays: investment.totalDays,
      cycleNumber: investment.cycleNumber || 1,
      isAutoRenewed: investment.isAutoRenewed || false,
      currentValue: investment.currentValue || investment.amount,
      totalInterestEarned: investment.totalInterestEarned || 0
    });

  } catch (error) {
    console.error('❌ Get claim code error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// ✅ EXPORT ALL FUNCTIONS
// ==========================================
export default {
  createInvestment,
  getUserInvestments,
  verifyDailyCheckIn,
  getClaimCode,
  validateDailyCode  // ✅ NEW
};