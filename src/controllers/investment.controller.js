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

    // ✅ STEP 1: DEDUCT FROM AVAILABLE BALANCE
    const balanceBefore = user.balances.availableLiquidity;
    user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) - amountNum;
    user.balances.totalInvested = (user.balances?.totalInvested || 0) + amountNum;
    
    // ✅ NEW: Add to locked investment (perpetual principal)
    user.balances.lockedInvestment = (user.balances?.lockedInvestment || 0) + amountNum;
    
    console.log(`💸 Balance Before: $${balanceBefore.toFixed(2)}`);
    console.log(`💸 Balance After: $${user.balances.availableLiquidity.toFixed(2)}`);
    console.log(`🔒 Locked Investment: $${user.balances.lockedInvestment.toFixed(2)}`);
    console.log(`💰 Total Invested: $${user.balances.totalInvested.toFixed(2)}`);
    
    // ✅ STEP 2: DATE SETUP (30 DAYS)
    const startDate = new Date();
    let expectedEndDate = new Date(startDate);
    
    if (TESTING_MODE) {
      expectedEndDate.setSeconds(expectedEndDate.getSeconds() + (30 * 20));
      console.log(`⏰ [TEST MODE] 30-Day challenge will complete in 10 minutes.`);
    } else {
      expectedEndDate.setDate(expectedEndDate.getDate() + 30);
      console.log(`⏰ [PROD MODE] 30-Day challenge ends on ${expectedEndDate.toLocaleDateString()}`);
    }
    
    // ✅ STEP 3: CALCULATE POTENTIAL RETURN (100% ROI)
    const interestAmount = amountNum;
    const potentialReturn = amountNum + interestAmount; 
    
    console.log(`💰 Potential Return: $${potentialReturn.toFixed(2)}`);
    
    const transactionId = `INV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // ✅ STEP 4: CREATE INVESTMENT RECORD
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
      profitPaidOut: 0
    });

    await user.save();

    console.log(`✅ Investment created: ${transactionId}`);
    console.log("=".repeat(60) + "\n");

    res.status(201).json({
      success: true,
      message: TESTING_MODE 
        ? `Successfully invested $${amountNum}! 30-day challenge will complete in 10 minutes.`
        : `Successfully invested $${amountNum}! Complete your daily tasks for 30 days to earn $${interestAmount} profit.`,
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
        cycleNumber: investment.cycleNumber
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
// ✅ POST /api/investment/check-in/:investmentId - WITH AUTO-RENEWAL
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
      return res.status(400).json({ success: false, message: "No daily code available yet." });
    }

    if (investment.codeExpiresAt && new Date() > new Date(investment.codeExpiresAt)) {
      return res.status(400).json({ success: false, message: "Today's code has expired." });
    }

    if (investment.claimCode !== code.toUpperCase().trim()) {
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
    
    investment.dailyTasks.push({
      dayNumber: currentDay,
      date: new Date(),
      completed: true,
      completedAt: new Date(),
      taskCode: code.toUpperCase().trim()
    });
    
    investment.completedDays = currentDay;
    investment.lastCheckInDate = new Date();
    investment.codeClaimedAt = new Date();
    investment.claimCode = null; 
    investment.codeExpiresAt = null;
    investment.interestStatus = 'pending';

    let message = "";
    let rewardReleased = false;
    let newInvestment = null;

    // ✅ CHECK IF 30 DAYS COMPLETED - AUTO-RENEWAL LOGIC
    if (investment.completedDays >= investment.totalDays) {
      // 🎉 CYCLE COMPLETE - PAY 50% PROFIT, KEEP 50% LOCKED
      
      const profitAmount = investment.interestAmount; // 100% ROI = $100 profit on $100
      
      // ✅ STEP 1: Pay profit to available balance (withdrawable)
      user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) + profitAmount;
      user.balances.netProfitLoss = (user.balances?.netProfitLoss || 0) + profitAmount;
      
      // ✅ STEP 2: Keep principal locked (don't subtract from lockedInvestment)
      // The lockedInvestment stays the same - it's the perpetual principal
      
      // ✅ STEP 3: Mark this investment as auto-renewed
      investment.interestStatus = 'claimed';
      investment.status = 'auto_renewed';
      investment.actualEndDate = new Date();
      investment.profitPaidOut = profitAmount;
      
      await investment.save();
      
      // ✅ STEP 4: Create NEW investment for next cycle (auto-renewal)
      const startDate = new Date();
      let expectedEndDate = new Date(startDate);
      
      if (TESTING_MODE) {
        expectedEndDate.setSeconds(expectedEndDate.getSeconds() + (30 * 20));
      } else {
        expectedEndDate.setDate(expectedEndDate.getDate() + 30);
      }
      
      const newTransactionId = `INV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      
      newInvestment = await Investment.create({
        user: user._id,
        email: user.email,
        assetClass: investment.assetClass,
        symbol: investment.symbol,
        name: investment.name,
        amount: investment.amount, // Same locked amount
        interestAmount: investment.interestAmount, // Same profit potential
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
        cycleNumber: investment.cycleNumber + 1, // Increment cycle
        parentInvestment: investment._id, // Link to previous
        isAutoRenewed: true,
        profitPaidOut: 0
      });
      
      await user.save();
      
      message = `🎉 Cycle ${investment.cycleNumber} Complete! You earned $${profitAmount.toFixed(2)} profit. Your investment has automatically renewed for Cycle ${newInvestment.cycleNumber}.`;
      rewardReleased = true;
      
      console.log(`💰 PROFIT PAID: $${profitAmount.toFixed(2)} | 🔒 LOCKED: $${investment.amount.toFixed(2)} | 🔄 CYCLE: ${newInvestment.cycleNumber}`);
      
      // ✅ STEP 5: Send email notification
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
      message = `✅ Checked in successfully! Day ${investment.completedDays}/${investment.totalDays} completed.`;
      await investment.save();
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
      newInvestment: newInvestment ? {
        id: newInvestment._id,
        transactionId: newInvestment.transactionId,
        cycleNumber: newInvestment.cycleNumber,
        startDate: newInvestment.startDate,
        expectedEndDate: newInvestment.expectedEndDate
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
        dailyTasks: inv.dailyTasks,
        daysRemaining: Math.max(0, inv.totalDays - inv.completedDays),
        // ✅ NEW: Cycle tracking
        cycleNumber: inv.cycleNumber || 1,
        parentInvestment: inv.parentInvestment,
        isAutoRenewed: inv.isAutoRenewed || false,
        profitPaidOut: inv.profitPaidOut || 0
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
      status: investment.interestStatus,
      completedDays: investment.completedDays,
      totalDays: investment.totalDays,
      cycleNumber: investment.cycleNumber || 1,
      isAutoRenewed: investment.isAutoRenewed || false
    });

  } catch (error) {
    console.error('❌ Get claim code error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export default {
  createInvestment,
  getUserInvestments,
  verifyDailyCheckIn,
  getClaimCode
};