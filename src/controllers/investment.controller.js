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

// POST /api/investment/create
export const createInvestment = async (req, res) => {
  try {
    const { email, assetClass, amount } = req.body;

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

    // ✅ DEDUCT FROM BALANCE
    user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) - amountNum;
    user.balances.totalPortfolio = (user.balances?.totalPortfolio || 0) + amountNum;
    
    // ✅ 30-DAY PLAN SETUP
    const startDate = new Date();
    const expectedEndDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // ✅ INTEREST = 100% OF PRINCIPAL (MONEY DOUBLES)
    const interestAmount = amountNum;
    
    // ✅ CREATE 30 DAILY TASKS
    const dailyTasks = Array.from({ length: 30 }, (_, i) => ({
      dayNumber: i + 1,
      date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
      completed: false,
      completedAt: null,
      taskCode: null
    }));
    
    // Generate transaction ID
    const transactionId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create investment record
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
      dailyTasks: dailyTasks,
      interestStatus: 'pending',
      status: 'active',
      transactionId: transactionId,
      investedAt: startDate
    });

    // ✅ SAVE USER WITH DEDUCTED BALANCE
    await user.save();

    console.log(`✅ Investment created: $${amountNum} in ${assetClass}`);
    console.log(`💰 Interest: $${interestAmount} (100% return - money will double)`);
    console.log(`📅 Expected end date (30 days): ${expectedEndDate.toISOString()}`);

    res.status(201).json({
      success: true,
      message: `Successfully invested $${amountNum}! Complete 30 daily tasks to double your money to $${amountNum * 2}.`,
      investment: {
        id: investment._id,
        transactionId: investment.transactionId,
        assetClass: investment.assetClass,
        amount: investment.amount,
        interestAmount: investment.interestAmount,
        totalReturn: amountNum * 2,
        startDate: investment.startDate,
        expectedEndDate: investment.expectedEndDate,
        totalDays: investment.totalDays,
        completedDays: investment.completedDays,
        daysRemaining: 30
      },
      newBalance: user.balances.availableLiquidity,
      balances: {
        availableLiquidity: user.balances.availableLiquidity,
        totalPortfolio: user.balances.totalPortfolio,
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

    if (!email || !taskCode) {
      return res.status(400).json({
        success: false,
        message: "Email and task code are required"
      });
    }

    const investment = await Investment.findById(investmentId);
    if (!investment) {
      return res.status(404).json({ success: false, message: "Investment not found" });
    }

    if (investment.email !== email) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (investment.isComplete) {
      return res.status(400).json({ success: false, message: "All tasks already completed" });
    }

    // Find today's task
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayTask = investment.dailyTasks.find(task => {
      const taskDate = new Date(task.date);
      taskDate.setHours(0, 0, 0, 0);
      return taskDate.getTime() === today.getTime() && !task.completed;
    });

    if (!todayTask) {
      return res.status(400).json({ 
        success: false, 
        message: "No task available for today or already completed" 
      });
    }

    // ✅ VALIDATE TASK CODE (8 characters)
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

    // Update completed days
    investment.completedDays = investment.dailyTasks.filter(t => t.completed).length;

    // Check if all 30 days completed
    if (investment.completedDays === 30) {
      investment.isComplete = true;
      investment.actualEndDate = new Date();
    }

    await investment.save();

    console.log(`✅ Daily task completed for investment ${investmentId}. Day ${investment.completedDays}/30`);

    res.status(200).json({
      success: true,
      message: `Daily task completed! Day ${investment.completedDays} of 30`,
      completedDays: investment.completedDays,
      daysRemaining: 30 - investment.completedDays,
      isComplete: investment.isComplete
    });

  } catch (error) {
    console.error("❌ DAILY TASK ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to complete daily task",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ✅ POST /api/investment/claim-with-code
export const claimInterestWithCode = async (req, res) => {
  try {
    const { investmentId, code } = req.body;
    const email = req.body.email;

    if (!investmentId || !code) {
      return res.status(400).json({ 
        success: false,
        message: 'Investment ID and code are required' 
      });
    }

    const investment = await Investment.findOne({ 
      _id: investmentId,
      email: email
    });

    if (!investment) {
      return res.status(404).json({ 
        success: false,
        message: 'Investment not found' 
      });
    }

    if (!investment.isComplete) {
      return res.status(400).json({ 
        success: false,
        message: 'Please complete all 30 daily tasks first' 
      });
    }

    if (investment.claimCode !== code.toUpperCase()) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid claim code' 
      });
    }

    if (investment.interestStatus === 'claimed') {
      return res.status(400).json({ 
        success: false,
        message: 'Interest already claimed' 
      });
    }

    // ✅ DOUBLE THE MONEY (Principal + Interest)
    const totalReturn = investment.amount + investment.interestAmount;
    
    const user = await User.findOneAndUpdate(
      { email },
      { 
        $inc: { 
          "balances.availableLiquidity": totalReturn,
          "balances.totalPortfolio": totalReturn,
          "balances.netProfitLoss": investment.interestAmount
        } 
      },
      { new: true }
    );

    // Update investment status
    investment.interestStatus = 'claimed';
    investment.codeClaimedAt = new Date();
    investment.status = 'completed';
    await investment.save();

    console.log(`✅ Interest claimed: $${totalReturn} (doubled from $${investment.amount}) for ${email}`);

    res.json({
      success: true,
      message: `🎉 Congratulations! Your money has doubled! $${totalReturn} added to your balance.`,
      originalAmount: investment.amount,
      interestEarned: investment.interestAmount,
      totalReturn: totalReturn,
      newBalance: user.balances.availableLiquidity
    });

  } catch (error) {
    console.error('❌ Claim interest error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// ✅ GET /api/investment/user/:email
export const getUserInvestments = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const investments = await Investment.find({ user: user._id })
      .sort({ investedAt: -1 });

    const processedInvestments = investments.map(inv => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate missed days
      const missedDays = inv.dailyTasks.filter(task => {
        const taskDate = new Date(task.date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate < today && !task.completed;
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
        extensionDays: inv.extensionDays,
        isComplete: inv.isComplete,
        interestStatus: inv.interestStatus || 'pending',
        status: inv.status || 'active',
        claimCode: inv.claimCode,
        codeExpiresAt: inv.codeExpiresAt,
        dailyTasks: inv.dailyTasks,
        daysRemaining: Math.max(0, inv.totalDays - inv.completedDays),
        earlyWithdrawalInfo: null
      };
    });

    const activeInvestments = processedInvestments.filter(i => i.status === 'active');
    const completedInvestments = processedInvestments.filter(i => i.isComplete);
    
    const summary = {
      totalInvested: activeInvestments.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0),
      totalPotentialReturn: processedInvestments.reduce((sum, i) => sum + parseFloat(i.totalReturn || 0), 0),
      completedCount: completedInvestments.length,
      activeCount: activeInvestments.length,
      investmentCount: processedInvestments.length
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

    console.log(`💸 [EARLY WITHDRAWAL] Investment: ${id}`);

    const investment = await Investment.findById(id);
    if (!investment) {
      return res.status(404).json({ success: false, message: "Investment not found" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || investment.user.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (investment.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: "Investment is not active"
      });
    }

    // ✅ 50% PENALTY ON ORIGINAL INVESTMENT
    const penalty = investment.amount * 0.50;
    const payout = investment.amount - penalty;

    // Add payout to balance
    user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) + payout;
    user.balances.totalPortfolio = Math.max(0, (user.balances?.totalPortfolio || 0) - investment.amount);
    await user.save();

    investment.interestStatus = 'early_withdrawn';
    investment.status = 'early_withdrawn';
    investment.earlyWithdrawalRequestedAt = new Date();
    investment.earlyWithdrawalPenalty = penalty;
    investment.earlyWithdrawalPayout = payout;
    await investment.save();

    console.log(`✅ Early withdrawal processed: $${payout} (penalty: $${penalty})`);

    res.status(200).json({
      success: true,
      message: `Early withdrawal processed. You received $${payout.toFixed(2)} (50% penalty: $${penalty.toFixed(2)}).`,
      withdrawalDetails: {
        originalAmount: investment.amount.toFixed(2),
        penalty: penalty.toFixed(2),
        penaltyPercentage: 50,
        payout: payout.toFixed(2)
      },
      updatedBalances: {
        availableLiquidity: user.balances.availableLiquidity,
        totalPortfolio: user.balances.totalPortfolio
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

    const investment = await Investment.findOne({ 
      _id: investmentId,
      email: email
    });

    if (!investment) {
      return res.status(404).json({ 
        success: false,
        message: 'Investment not found' 
      });
    }

    res.json({ 
      success: true, 
      code: investment.claimCode || null,
      expiresAt: investment.codeExpiresAt,
      status: investment.interestStatus,
      isComplete: investment.isComplete
    });

  } catch (error) {
    console.error('❌ Get claim code error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
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