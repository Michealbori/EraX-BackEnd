import Investment from "../models/Investment.js";
import User from "../models/User.js";

// Helper: Generate unique 8-character code
const generateClaimCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// ==========================================
// ⚠️ TESTING MODE TOGGLE
// ==========================================
const TESTING_MODE = false; // ✅ Set to FALSE for 24-hour production mode

// POST /api/investment/create
export const createInvestment = async (req, res) => {
  try {
    const { email, assetClass, amount } = req.body;

    console.log("\n" + "=".repeat(60));
    console.log("💰 [INVESTMENT REQUEST]", { email, assetClass, amount });

    if (!email || !assetClass || !amount) {
      return res.status(400).json({
        success: false,
        message: "Email, asset class, and amount are required"
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 50) {
      return res.status(400).json({
        success: false,
        message: "Minimum investment amount is $50"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
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
    
    console.log(`💸 Balance Before: $${balanceBefore.toFixed(2)}`);
    console.log(`💸 Balance After: $${user.balances.availableLiquidity.toFixed(2)}`);
    console.log(`💸 Total Invested: $${user.balances.totalInvested.toFixed(2)}`);
    
    // ✅ STEP 2: DATE SETUP (24 HOURS)
    const startDate = new Date();
    let expectedEndDate;
    let isComplete;
    
    if (TESTING_MODE) {
      expectedEndDate = new Date(startDate.getTime() + 20 * 1000);
      isComplete = true; 
      console.log(`⏰ [TEST MODE] Investment will be ready in 20 seconds.`);
    } else {
      // ✅ PRODUCTION: 24 HOURS
      expectedEndDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000); 
      isComplete = false; // Must complete the 24-hour task
      console.log(`⏰ [PROD MODE] Investment ends in 24 hours at ${expectedEndDate.toLocaleTimeString()}`);
    }
    
    // ✅ STEP 3: CALCULATE POTENTIAL RETURN (Money Doubles)
    const interestAmount = amountNum; // 100% return
    const potentialReturn = amountNum + interestAmount; 
    
    console.log(`💰 Potential Return: $${potentialReturn.toFixed(2)}`);
    
    // ✅ STEP 4: CREATE 1 DAILY TASK (Due in 24 hours)
    let dailyTasks = [];
    if (!TESTING_MODE) {
      dailyTasks = Array.from({ length: 1 }, (_, i) => ({
        dayNumber: i + 1,
        date: expectedEndDate, // Task becomes available exactly at the 24-hour mark
        completed: false,
        completedAt: null,
        taskCode: null
      }));
    }
    
    const transactionId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // ✅ STEP 5: CREATE INVESTMENT RECORD
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
      totalDays: 1, // 1 task for the 24-hour period
      completedDays: 0,
      missedDays: 0,
      extensionDays: 0,
      isComplete: isComplete, 
      dailyTasks: dailyTasks,
      interestStatus: 'pending',
      status: 'active',
      transactionId: transactionId,
      investedAt: startDate
    });

    await user.save();

    console.log(`✅ Investment created: ${transactionId}`);
    console.log("=".repeat(60) + "\n");

    res.status(201).json({
      success: true,
      message: TESTING_MODE 
        ? `Successfully invested $${amountNum}! Claim code will generate in 20 seconds.`
        : `Successfully invested $${amountNum}! Complete your task in 24 hours to double your money to $${potentialReturn}.`,
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
        daysRemaining: 1
      },
      balances: {
        availableLiquidity: user.balances.availableLiquidity,
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

// ✅ POST /api/investment/complete-daily-task/:investmentId
export const completeDailyTask = async (req, res) => {
  try {
    const { investmentId } = req.params;
    const { email, taskCode } = req.body;

    if (TESTING_MODE) {
      return res.status(400).json({
        success: false,
        message: "Daily tasks are disabled in TEST_MODE."
      });
    }

    if (!email || !taskCode) {
      return res.status(400).json({
        success: false,
        message: "Email and task code are required"
      });
    }

    const investment = await Investment.findById(investmentId);
    if (!investment) return res.status(404).json({ success: false, message: "Investment not found" });
    if (investment.email !== email) return res.status(403).json({ success: false, message: "Unauthorized" });
    if (investment.isComplete) return res.status(400).json({ success: false, message: "Task already completed" });

    const now = new Date();
    
    // ✅ Find the first uncompleted task that is due (current time is past task date)
    const todayTask = investment.dailyTasks.find(task => {
      return !task.completed && now >= new Date(task.date);
    });

    if (!todayTask) {
      return res.status(400).json({ 
        success: false, 
        message: "No task available yet. Please wait until the 24-hour mark." 
      });
    }

    if (taskCode.length !== 8) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid task code. Must be 8 characters." 
      });
    }

    // Mark task as completed
    todayTask.completed = true;
    todayTask.completedAt = new Date();
    todayTask.taskCode = taskCode.toUpperCase();

    investment.completedDays = investment.dailyTasks.filter(t => t.completed).length;

    // Check if the 24-hour task is completed
    if (investment.completedDays === 1) {
      investment.isComplete = true;
      investment.actualEndDate = new Date();
    }

    await investment.save();

    console.log(`✅ 24-hour task completed for investment ${investmentId}.`);

    res.status(200).json({
      success: true,
      message: `24-hour task completed! Your investment is now ready to claim.`,
      completedDays: investment.completedDays,
      daysRemaining: 0,
      isComplete: investment.isComplete
    });

  } catch (error) {
    console.error("❌ DAILY TASK ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to complete task",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ POST /api/investment/claim-with-code
export const claimInterestWithCode = async (req, res) => {
  try {
    const { investmentId, code } = req.body;
    const email = req.body.email;

    console.log("\n" + "=".repeat(60));
    console.log("🎁 [CLAIM INTEREST REQUEST]", { investmentId, email });

    if (!investmentId || !code) {
      return res.status(400).json({ success: false, message: 'Investment ID and code are required' });
    }

    const investment = await Investment.findOne({ _id: investmentId, email: email });
    if (!investment) return res.status(404).json({ success: false, message: 'Investment not found' });
    
    if (!investment.isComplete) {
      return res.status(400).json({ success: false, message: 'Please complete the 24-hour task first' });
    }

    if (investment.claimCode !== code.toUpperCase()) {
      return res.status(400).json({ success: false, message: 'Invalid claim code' });
    }

    if (investment.interestStatus === 'claimed') {
      return res.status(400).json({ success: false, message: 'Interest already claimed' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const totalReturn = investment.amount + investment.interestAmount;
    
    console.log(`💰 Total Return: $${totalReturn.toFixed(2)}`);

    // ✅ Update Balances
    user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) + totalReturn;
    user.balances.totalInvested = Math.max(0, (user.balances?.totalInvested || 0) - investment.amount);
    user.balances.netProfitLoss = (user.balances?.netProfitLoss || 0) + investment.interestAmount;
    await user.save();

    // ✅ Update Investment Status
    investment.interestStatus = 'claimed';
    investment.codeClaimedAt = new Date();
    investment.status = 'completed';
    await investment.save();

    console.log(`✅ Interest claimed successfully!`);
    console.log("=".repeat(60) + "\n");

    res.json({
      success: true,
      message: `🎉 Congratulations! Your money has doubled! $${totalReturn.toFixed(2)} added to your balance.`,
      originalAmount: investment.amount,
      interestEarned: investment.interestAmount,
      totalReturn: totalReturn,
      balances: {
        availableLiquidity: user.balances.availableLiquidity,
        totalInvested: user.balances.totalInvested,
        netProfitLoss: user.balances.netProfitLoss
      }
    });

  } catch (error) {
    console.error('❌ Claim interest error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ GET /api/investment/user/:email
export const getUserInvestments = async (req, res) => {
  try {
    const { email } = req.params;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const investments = await Investment.find({ user: user._id }).sort({ investedAt: -1 });

    const processedInvestments = investments.map(inv => {
      const now = new Date();
      
      // Calculate if a task is missed (only relevant if past expectedEndDate and not completed)
      const missedDays = inv.dailyTasks.filter(task => {
        return now >= new Date(task.date) && !task.completed;
      }).length;

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
        missedDays: missedDays,
        isComplete: inv.isComplete,
        interestStatus: inv.interestStatus || 'pending',
        status: inv.status || 'active',
        claimCode: inv.claimCode,
        codeExpiresAt: inv.codeExpiresAt,
        dailyTasks: inv.dailyTasks,
        daysRemaining: Math.max(0, inv.totalDays - inv.completedDays)
      };
    });

    const activeInvestments = processedInvestments.filter(i => i.status === 'active');
    const completedInvestments = processedInvestments.filter(i => i.isComplete && i.interestStatus !== 'claimed');
    
    const summary = {
      totalInvested: activeInvestments.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0),
      totalPotentialReturn: activeInvestments.reduce((sum, i) => sum + parseFloat(i.totalReturn || 0), 0),
      activeCount: activeInvestments.length,
      completedCount: completedInvestments.length,
      investmentCount: processedInvestments.length,
      availableLiquidity: user.balances?.availableLiquidity || 0,
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

// ✅ POST /api/investment/early-withdrawal/:id
export const earlyWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const investment = await Investment.findById(id);
    if (!investment) return res.status(404).json({ success: false, message: "Investment not found" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || investment.user.toString() !== user._id.toString()) return res.status(403).json({ success: false, message: "Unauthorized" });
    if (investment.status !== 'active') return res.status(400).json({ success: false, message: "Investment is not active" });

    const penalty = investment.amount * 0.50;
    const payout = investment.amount - penalty;

    user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) + payout;
    user.balances.totalInvested = Math.max(0, (user.balances?.totalInvested || 0) - investment.amount);
    user.balances.netProfitLoss = (user.balances?.netProfitLoss || 0) - penalty;
    await user.save();

    investment.interestStatus = 'early_withdrawn';
    investment.status = 'early_withdrawn';
    investment.earlyWithdrawalRequestedAt = new Date();
    investment.earlyWithdrawalPenalty = penalty;
    investment.earlyWithdrawalPayout = payout;
    await investment.save();

    res.status(200).json({
      success: true,
      message: `Early withdrawal processed. You received $${payout.toFixed(2)} (50% penalty: $${penalty.toFixed(2)}).`,
      balances: {
        availableLiquidity: user.balances.availableLiquidity,
        totalInvested: user.balances.totalInvested,
        netProfitLoss: user.balances.netProfitLoss
      }
    });

  } catch (error) {
    console.error("❌ EARLY WITHDRAWAL ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to process early withdrawal" });
  }
};

// ✅ GET /api/investment/claim-code/:investmentId
export const getClaimCode = async (req, res) => {
  try {
    const { investmentId } = req.params;
    const email = req.query.email;

    const investment = await Investment.findOne({ _id: investmentId, email: email });
    if (!investment) return res.status(404).json({ success: false, message: 'Investment not found' });

    res.json({ 
      success: true, 
      code: investment.claimCode || null,
      expiresAt: investment.codeExpiresAt,
      status: investment.interestStatus,
      isComplete: investment.isComplete
    });

  } catch (error) {
    console.error('❌ Get claim code error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ EXPORT ALL FUNCTIONS
export default {
  createInvestment,
  getUserInvestments,
  completeDailyTask,
  claimInterestWithCode,
  getClaimCode,
  earlyWithdrawal
};