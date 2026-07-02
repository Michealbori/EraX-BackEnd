import Withdrawal from "../models/Withdrawal.js";
import User from "../models/User.js";
import Investment from "../models/Investment.js";
import { sendWithdrawalRequestEmail } from "../services/email.service.js";

const getSecureUser = async (req, res) => {
  if (req.user?.id) {
    const user = await User.findById(req.user.id);
    if (user) return user;
  }
  return null;
};

// ==========================================
// POST /api/withdrawal/request - UPDATED: Can withdraw all availableLiquidity
// ==========================================
export const requestWithdrawal = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    const { amount, accountNumber, bankName, accountName } = req.body;

    console.log("💸 [WITHDRAWAL REQUEST]", { 
      email: user.email, 
      amount 
    });

    if (!amount || !accountNumber || !bankName || !accountName) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 50) {
      return res.status(400).json({
        success: false,
        message: "Minimum withdrawal is $50"
      });
    }

    // ✅ Check eligibility: Must have at least one investment that's at least 1 month old
    const oldestInvestment = await Investment.findOne({
      user: user._id,
      status: { $in: ['active', 'auto_renewed', 'claimed'] }
    }).sort({ investedAt: 1 });

    if (!oldestInvestment) {
      return res.status(403).json({
        success: false,
        message: "You must make at least one investment before withdrawing"
      });
    }

    const daysSinceFirstInvestment = Math.floor(
      (new Date() - oldestInvestment.investedAt) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceFirstInvestment < 30) {
      const daysRemaining = 30 - daysSinceFirstInvestment;
      return res.status(403).json({
        success: false,
        message: `You can withdraw after ${daysRemaining} more days.`,
        daysRemaining: daysRemaining,
        daysSinceFirstInvestment: daysSinceFirstInvestment
      });
    }

    // ✅ UPDATED: Can withdraw up to 100% of availableLiquidity (all profit)
    const availableBalance = user.balances?.availableLiquidity || 0;

    if (amountNum > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: $${availableBalance.toFixed(2)}`,
        availableBalance: availableBalance.toFixed(2)
      });
    }

    const pendingWithdrawal = await Withdrawal.findOne({
      user: user._id,
      status: { $in: ['pending', 'processing'] }
    });

    if (pendingWithdrawal) {
      return res.status(400).json({
        success: false,
        message: "You already have a pending withdrawal request"
      });
    }

    const countdownEndsAt = new Date();
    countdownEndsAt.setMinutes(countdownEndsAt.getMinutes() + 20);

    const transactionId = `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const withdrawal = await Withdrawal.create({
      user: user._id,
      email: user.email,
      amount: amountNum,
      accountNumber: accountNumber,
      bankName: bankName,
      accountName: accountName,
      status: 'pending',
      countdownEndsAt: countdownEndsAt,
      transactionId: transactionId
    });

    try {
      await sendWithdrawalRequestEmail({
        userEmail: user.email,
        userName: user.fullName,
        amount: amountNum,
        accountNumber: accountNumber,
        bankName: bankName,
        accountName: accountName,
        transactionId: transactionId,
        requestedAt: new Date()
      });
      console.log("✅ Admin notification email sent");
    } catch (emailError) {
      console.error("❌ Failed to send admin email:", emailError);
    }

    console.log(`✅ Withdrawal request created: $${amountNum}`);

    res.status(201).json({
      success: true,
      message: "Withdrawal request submitted successfully",
      withdrawal: {
        id: withdrawal._id,
        transactionId: withdrawal.transactionId,
        amount: withdrawal.amount,
        status: withdrawal.status,
        countdownEndsAt: withdrawal.countdownEndsAt,
        minutesRemaining: 20
      }
    });

  } catch (error) {
    console.error("❌ WITHDRAWAL ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process withdrawal request",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==========================================
// GET /api/withdrawal/status/:id
// ==========================================
export const getWithdrawalStatus = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    const { id } = req.params;

    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal not found" });
    }

    if (withdrawal.user.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    res.status(200).json({
      success: true,
      withdrawal: {
        id: withdrawal._id,
        transactionId: withdrawal.transactionId,
        amount: withdrawal.amount,
        status: withdrawal.status,
        requestedAt: withdrawal.requestedAt,
        countdownEndsAt: withdrawal.countdownEndsAt,
        minutesRemaining: withdrawal.minutesRemaining,
        isCountdownExpired: withdrawal.isCountdownExpired,
        completedAt: withdrawal.completedAt,
        adminNotes: withdrawal.adminNotes
      }
    });

  } catch (error) {
    console.error("❌ GET STATUS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to get withdrawal status" });
  }
};

// ==========================================
// GET /api/withdrawal/history
// ==========================================
export const getWithdrawalHistory = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    const withdrawals = await Withdrawal.find({ user: user._id })
      .sort({ requestedAt: -1 })
      .limit(20);

    const processedWithdrawals = withdrawals.map(w => ({
      id: w._id,
      transactionId: w.transactionId,
      amount: w.amount,
      status: w.status,
      requestedAt: w.requestedAt,
      completedAt: w.completedAt,
      bankName: w.bankName,
      accountNumber: w.accountNumber.substring(0, 4) + '****'
    }));

    res.status(200).json({
      success: true,
      withdrawals: processedWithdrawals
    });

  } catch (error) {
    console.error("❌ GET HISTORY ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to get withdrawal history" });
  }
};

// ==========================================
// GET /api/withdrawal/check-eligibility
// ==========================================
export const checkEligibility = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required" 
      });
    }

    const oldestInvestment = await Investment.findOne({
      user: user._id,
      status: { $in: ['active', 'auto_renewed', 'claimed'] }
    }).sort({ investedAt: 1 });

    const availableBalance = user.balances?.availableLiquidity || 0;

    if (!oldestInvestment) {
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: "no_investment",
        message: "You must make at least one investment before withdrawing",
        availableBalance: availableBalance.toFixed(2),
        lockedInvestment: (user.balances?.lockedInvestment || 0).toFixed(2)
      });
    }

    const daysSinceFirstInvestment = Math.floor(
      (new Date() - oldestInvestment.investedAt) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceFirstInvestment < 30) {
      const daysRemaining = 30 - daysSinceFirstInvestment;
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: "too_early",
        message: `You can withdraw in ${daysRemaining} more days`,
        daysRemaining: daysRemaining,
        daysSinceFirstInvestment: daysSinceFirstInvestment,
        availableBalance: availableBalance.toFixed(2),
        lockedInvestment: (user.balances?.lockedInvestment || 0).toFixed(2)
      });
    }

    return res.status(200).json({
      success: true,
      eligible: true,
      message: "You are eligible to withdraw",
      daysSinceFirstInvestment: daysSinceFirstInvestment,
      availableBalance: availableBalance.toFixed(2),
      lockedInvestment: (user.balances?.lockedInvestment || 0).toFixed(2),
      maxWithdrawal: availableBalance.toFixed(2) // ✅ Can withdraw all available
    });

  } catch (error) {
    console.error("❌ CHECK ELIGIBILITY ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to check eligibility" });
  }
};