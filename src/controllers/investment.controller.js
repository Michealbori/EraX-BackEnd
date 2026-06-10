import Investment from "../models/Investment.js";
import User from "../models/User.js";
import { SURVEY_QUESTION_POOL, SURVEY_METADATA } from "../config/surveyQuestions.js";

// Helper: Shuffle array and pick N items
const getRandomQuestions = (pool, count) => {
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Calculate early withdrawal penalty
const calculateEarlyWithdrawal = (investment) => {
  const daysSinceInvestment = Math.floor(
    (new Date() - investment.investedAt) / (1000 * 60 * 60 * 24)
  );
  
  const interestAmount = investment.interestAmount || 0;
  let penaltyPercentage = 0;
  
  if (daysSinceInvestment <= 7) {
    penaltyPercentage = 50;
  } else if (daysSinceInvestment <= 14) {
    penaltyPercentage = 30;
  } else if (daysSinceInvestment <= 21) {
    penaltyPercentage = 15;
  } else if (daysSinceInvestment < 30) {
    penaltyPercentage = 5;
  } else {
    penaltyPercentage = 0;
  }
  
  const penalty = (interestAmount * penaltyPercentage) / 100;
  const payout = interestAmount - penalty;
  
  return {
    daysSinceInvestment,
    penaltyPercentage,
    penalty: penalty.toFixed(2),
    payout: payout.toFixed(2),
    originalInterest: interestAmount.toFixed(2)
  };
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

    // Deduct from balance temporarily
    user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) - amountNum;
    
    // ✅ 24-HOUR MATURITY
    const maturityDate = new Date();
    maturityDate.setHours(maturityDate.getHours() + 24);
    
    // Interest = 100% of principal
    const interestAmount = amountNum;
    
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
      maturityDate: maturityDate,
      interestStatus: 'pending',
      status: 'active',
      transactionId: transactionId
    });

    // Return principal to user's balance immediately
    user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) + amountNum;
    await user.save();

    console.log(`✅ Investment created: $${amountNum} in ${assetClass}`);
    console.log(`📅 Maturity date (24 hours): ${maturityDate.toISOString()}`);

    res.status(201).json({
      success: true,
      message: `Successfully invested $${amountNum}! Complete the survey after 24 hours to claim $${interestAmount} interest.`,
      investment: {
        id: investment._id,
        transactionId: investment.transactionId,
        assetClass: investment.assetClass,
        amount: investment.amount,
        interestAmount: investment.interestAmount,
        maturityDate: investment.maturityDate,
        hoursUntilMaturity: Math.ceil((maturityDate - new Date()) / (1000 * 60 * 60))
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

// GET /api/investment/user/:email
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
      const isMatured = inv.maturityDate ? (new Date() >= inv.maturityDate) : false;
      const hoursUntilMaturity = inv.maturityDate 
        ? Math.max(0, Math.ceil((inv.maturityDate - new Date()) / (1000 * 60 * 60)))
        : 0;

      const amount = inv.amount || 0;
      const interestAmount = inv.interestAmount || 0;
      
      let earlyWithdrawalInfo = null;
      if (inv.status === 'active' && !isMatured) {
        earlyWithdrawalInfo = calculateEarlyWithdrawal(inv);
      }

      return {
        id: inv._id,
        transactionId: inv.transactionId || '',
        assetClass: inv.assetClass || 'stocks',
        symbol: inv.symbol || 'STOCK',
        name: inv.name || 'Investment',
        amount: amount.toFixed(2),
        interestAmount: interestAmount.toFixed(2),
        investedAt: inv.investedAt,
        maturityDate: inv.maturityDate,
        hoursUntilMaturity: hoursUntilMaturity,
        isMatured: isMatured,
        interestStatus: inv.interestStatus || 'pending',
        surveyCompleted: inv.surveyResponses && inv.surveyResponses.size > 0,
        surveyCompletedAt: inv.surveyCompletedAt,
        status: inv.status || 'active',
        earlyWithdrawalInfo: earlyWithdrawalInfo,
        earlyWithdrawalPayout: inv.earlyWithdrawalPayout || 0,
        earlyWithdrawalPenalty: inv.earlyWithdrawalPenalty || 0
      };
    });

    const activeInvestments = processedInvestments.filter(i => i.status === 'active');
    const maturedInvestments = processedInvestments.filter(i => i.isMatured);
    
    const pendingInterest = maturedInvestments
      .filter(i => i.interestStatus !== 'claimed' && i.interestStatus !== 'early_withdrawn')
      .reduce((sum, i) => sum + parseFloat(i.interestAmount || 0), 0);

    const summary = {
      totalInvested: activeInvestments.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0),
      totalPendingInterest: pendingInterest,
      maturedCount: maturedInvestments.length,
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

// GET /api/investment/survey-questions/:investmentId
export const getSurveyQuestions = async (req, res) => {
  try {
    const { investmentId } = req.params;
    const { email } = req.query;

    const investment = await Investment.findById(investmentId);
    if (!investment) return res.status(404).json({ success: false, message: "Investment not found" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || investment.user.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (!investment.maturityDate || new Date() < investment.maturityDate) {
      return res.status(400).json({ success: false, message: "Investment has not matured yet" });
    }

    // If questions are already assigned, return them (prevents changing on refresh)
    if (investment.assignedQuestions && investment.assignedQuestions.length > 0) {
      investment.interestStatus = 'survey_assigned';
      await investment.save();
      return res.status(200).json({
        success: true,
        questions: investment.assignedQuestions,
        metadata: SURVEY_METADATA
      });
    }

    // Assign new random questions
    const selectedQuestions = getRandomQuestions(SURVEY_QUESTION_POOL, SURVEY_METADATA.questionsPerSession);
    
    investment.assignedQuestions = selectedQuestions.map(q => ({
      questionId: q.id,
      questionText: q.question,
      options: q.options
    }));
    investment.interestStatus = 'survey_assigned';
    await investment.save();

    res.status(200).json({
      success: true,
      questions: investment.assignedQuestions,
      metadata: SURVEY_METADATA
    });

  } catch (error) {
    console.error("❌ GET SURVEY ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch survey" });
  }
};

// POST /api/investment/submit-survey/:id
export const submitSurvey = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, responses } = req.body;

    if (!responses || typeof responses !== 'object') {
      return res.status(400).json({
        success: false,
        message: "Survey responses are required"
      });
    }

    const investment = await Investment.findById(id);
    if (!investment) {
      return res.status(404).json({ success: false, message: "Investment not found" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || investment.user.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (investment.interestStatus === 'claimed') {
      return res.status(400).json({ success: false, message: "Interest already claimed" });
    }

    if (investment.interestStatus === 'survey_completed') {
      return res.status(400).json({ success: false, message: "Survey already submitted" });
    }

    // Validate that they answered the EXACT questions assigned to them
    const assignedIds = investment.assignedQuestions.map(q => q.questionId.toString());
    const answeredIds = Object.keys(responses);
    
    const missing = assignedIds.filter(id => !answeredIds.includes(id));
    if (missing.length > 0) {
      return res.status(400).json({ success: false, message: "Please answer all assigned questions." });
    }

    // Save responses
    investment.surveyResponses = new Map(Object.entries(responses));
    investment.surveyCompletedAt = new Date();
    investment.interestStatus = 'survey_completed';
    await investment.save();

    res.status(200).json({
      success: true,
      message: "Survey submitted successfully! You can now claim your interest.",
      interestAmount: (investment.interestAmount || 0).toFixed(2)
    });

  } catch (error) {
    console.error("❌ SUBMIT SURVEY ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to submit survey" });
  }
};

// POST /api/investment/claim-interest/:id
export const claimInterest = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const investment = await Investment.findById(id);
    if (!investment) {
      return res.status(404).json({ success: false, message: "Investment not found" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || investment.user.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (investment.interestStatus !== 'survey_completed') {
      return res.status(400).json({
        success: false,
        message: "Please complete the survey first"
      });
    }

    const interestAmount = investment.interestAmount || 0;
    user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) + interestAmount;
    user.balances.netProfitLoss = (user.balances?.netProfitLoss || 0) + interestAmount;
    await user.save();

    investment.interestStatus = 'claimed';
    investment.interestClaimedAt = new Date();
    investment.status = 'claimed';
    await investment.save();

    res.status(200).json({
      success: true,
      message: `Interest of $${interestAmount.toFixed(2)} claimed successfully!`,
      claimedAmount: interestAmount,
      updatedBalances: {
        availableLiquidity: user.balances.availableLiquidity,
        netProfitLoss: user.balances.netProfitLoss
      }
    });

  } catch (error) {
    console.error("❌ CLAIM INTEREST ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to claim interest" });
  }
};

// POST /api/investment/early-withdrawal/:id
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

    if (investment.isMatured) {
      return res.status(400).json({
        success: false,
        message: "Investment has matured. Please complete the survey to claim full interest."
      });
    }

    const withdrawalInfo = calculateEarlyWithdrawal(investment);
    const payout = parseFloat(withdrawalInfo.payout);
    const penalty = parseFloat(withdrawalInfo.penalty);

    user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) + payout;
    user.balances.netProfitLoss = (user.balances?.netProfitLoss || 0) + payout;
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
      message: `Early withdrawal processed. You received $${payout.toFixed(2)} (penalty: $${penalty.toFixed(2)}).`,
      withdrawalDetails: {
        originalInterest: withdrawalInfo.originalInterest,
        penalty: withdrawalInfo.penalty,
        penaltyPercentage: withdrawalInfo.penaltyPercentage,
        payout: withdrawalInfo.payout,
        daysSinceInvestment: withdrawalInfo.daysSinceInvestment
      },
      updatedBalances: {
        availableLiquidity: user.balances.availableLiquidity,
        netProfitLoss: user.balances.netProfitLoss
      }
    });

  } catch (error) {
    console.error("❌ EARLY WITHDRAWAL ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to process early withdrawal" });
  }
};