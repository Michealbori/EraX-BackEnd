import Withdrawal from "../models/Withdrawal.js";
import User from "../models/User.js";
import Investment from "../models/Investment.js";
import { sendWithdrawalRequestEmail } from "../services/email.service.js";

// POST /api/withdrawal/request
export const requestWithdrawal = async (req, res) => {
  try {
    const { email, amount, accountNumber, bankName, accountName } = req.body;

    console.log("💸 [WITHDRAWAL REQUEST]", { email, amount });

    // Validation
    if (!email || !amount || !accountNumber || !bankName || !accountName) {
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

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // ✅ Check eligibility: Must have at least one investment that's at least 1 month old
    const oldestInvestment = await Investment.findOne({
      user: user._id,
      status: { $in: ['active', 'claimed'] }
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
        message: `You can withdraw after ${daysRemaining} more days. First investment was made ${daysSinceFirstInvestment} days ago.`,
        daysRemaining: daysRemaining,
        daysSinceFirstInvestment: daysSinceFirstInvestment
      });
    }

    // ✅ Check 50% limit
    const availableBalance = user.balances?.availableLiquidity || 0;
    const maxWithdrawal = availableBalance * 0.5;

    if (amountNum > maxWithdrawal) {
      return res.status(400).json({
        success: false,
        message: `You can only withdraw up to 50% of your balance. Maximum: $${maxWithdrawal.toFixed(2)}`,
        maxWithdrawal: maxWithdrawal.toFixed(2),
        availableBalance: availableBalance.toFixed(2)
      });
    }

    // Check if user has pending withdrawal
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

    // Calculate countdown end time (20 minutes from now)
    const countdownEndsAt = new Date();
    countdownEndsAt.setMinutes(countdownEndsAt.getMinutes() + 20);

    // Generate transaction ID
    const transactionId = `WD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create withdrawal request
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

    // ✅ Send email to admin
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
      // Don't fail the request if email fails
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

// GET /api/withdrawal/status/:id
export const getWithdrawalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.query;

    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal not found" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || withdrawal.user.toString() !== user._id.toString()) {
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

// GET /api/withdrawal/history/:email
export const getWithdrawalHistory = async (req, res) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
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
      accountNumber: w.accountNumber.substring(0, 4) + '****' // Mask for security
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

// GET /api/withdrawal/check-eligibility/:email
export const checkEligibility = async (req, res) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const oldestInvestment = await Investment.findOne({
      user: user._id,
      status: { $in: ['active', 'claimed'] }
    }).sort({ investedAt: 1 });

    const availableBalance = user.balances?.availableLiquidity || 0;
    const maxWithdrawal = availableBalance * 0.5;

    if (!oldestInvestment) {
      return res.status(200).json({
        success: true,
        eligible: false,
        reason: "no_investment",
        message: "You must make at least one investment before withdrawing",
        availableBalance: availableBalance.toFixed(2),
        maxWithdrawal: maxWithdrawal.toFixed(2)
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
        maxWithdrawal: maxWithdrawal.toFixed(2)
      });
    }

    return res.status(200).json({
      success: true,
      eligible: true,
      message: "You are eligible to withdraw",
      daysSinceFirstInvestment: daysSinceFirstInvestment,
      availableBalance: availableBalance.toFixed(2),
      maxWithdrawal: maxWithdrawal.toFixed(2)
    });

  } catch (error) {
    console.error("❌ CHECK ELIGIBILITY ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to check eligibility" });
  }
};