import Investment from "../models/Investment.js";
import User from "../models/User.js";
import Deposit from "../models/Deposit.js"; // ✅ ADDED: For referral commission calculation
import { SURVEY_QUESTION_POOL, SURVEY_METADATA } from "../config/surveyQuestions.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendOTPEmail } from '../config/email.js';

// =====================================================
// HELPERS & UTILITIES
// =====================================================

const getSecureUser = async (req, res) => {
  if (req.user?.id) {
    const user = await User.findById(req.user.id);
    if (user) return user;
  }
  
  const email = req.body?.email || req.query?.email || req.params?.email;
  if (email) {
    console.warn("⚠️ SECURITY WARNING: Identifying user via email in request body/query.");
    return await User.findOne({ email: email.toLowerCase().trim() });
  }

  return null;
};

const getRandomQuestions = (pool, count) => {
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

const calculateEarlyWithdrawal = (investment) => {
  const daysSinceInvestment = Math.floor(
    (new Date() - new Date(investment.investedAt)) / (1000 * 60 * 60 * 24)
  );
  
  const interestAmount = investment.interestAmount || 0;
  let penaltyPercentage = 0;
  
  if (daysSinceInvestment <= 7) penaltyPercentage = 50;
  else if (daysSinceInvestment <= 14) penaltyPercentage = 30;
  else if (daysSinceInvestment <= 21) penaltyPercentage = 15;
  else if (daysSinceInvestment < 30) penaltyPercentage = 5;
  
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

const generateToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("FATAL: JWT_SECRET environment variable is not set!");
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const generateUniqueReferralCode = async () => {
  while (true) {
    const code = `ERAX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const exists = await User.findOne({ referralCode: code });
    if (!exists) return code;
  }
};

// =====================================================
// AUTH FUNCTIONS
// =====================================================

export const registerUserNode = async (req, res) => {
  try {
    const { email, password, fullName, firstName, lastName, referralCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required" });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists.", code: "EMAIL_EXISTS" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    let referredByData = null;
    if (referralCode && referralCode.trim()) {
      const referrer = await User.findOne({ referralCode: referralCode.trim().toUpperCase() });
      if (referrer) {
        referredByData = { id: referrer._id, name: referrer.fullName || 'Unknown', email: referrer.email };
        await User.findByIdAndUpdate(referrer._id, { $inc: { 'balances.referralCount': 1 } });
      }
    }

    const userReferralCode = await generateUniqueReferralCode();

    const user = await User.create({
      email: cleanEmail,
      password: hashedPassword,
      fullName: fullName || `${firstName || ''} ${lastName || ''}`.trim() || cleanEmail.split('@')[0],
      firstName: firstName || '',
      lastName: lastName || '',
      isVerified: false,
      otp,
      otpExpires,
      authProvider: 'email',
      referredBy: referredByData,
      referralCode: userReferralCode,
      balances: { 
        availableLiquidity: 0, 
        lockedInvestment: 0, // ✅ ADDED
        totalDeposited: 0, 
        totalWithdrawn: 0, 
        netProfitLoss: 0, 
        totalInvested: 0, 
        currentInvestmentValue: 0, 
        referralCount: 0, 
        referralEarnings: 0 
      }
    });

    try {
      await sendOTPEmail(cleanEmail, otp);
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError.message);
    }

    res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email for verification code.",
      user: { id: user._id, email: user.email, fullName: user.fullName, referralCode: user.referralCode },
      token: generateToken(user._id)
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Email or referral code already exists." });
    }
    res.status(500).json({ success: false, message: "Failed to register user", error: error.message });
  }
};

export const checkEmailAvailability = async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanEmail });

    if (existingUser) {
      return res.status(200).json({ success: true, available: false, message: "This email is already registered." });
    }

    return res.status(200).json({ success: true, available: true, message: "Email is available for registration" });
  } catch (error) {
    console.error("CHECK EMAIL ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to check email availability" });
  }
};

export const loginUserNode = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.password) return res.status(401).json({ success: false, message: "Invalid credentials or Google account" });

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return res.status(401).json({ success: false, message: "Invalid email or password" });

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: { 
        id: user._id, 
        email: user.email, 
        fullName: user.fullName, 
        isAdmin: user.isAdmin, 
        isVerified: user.isVerified, 
        balances: user.balances 
      },
      token: token
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to login" });
  }
};

export const verifyOtpToken = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: "Email and OTP are required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (String(user.otp) !== String(otp)) return res.status(400).json({ success: false, message: "Invalid OTP" });
    if (user.otpExpires && user.otpExpires < new Date()) return res.status(400).json({ success: false, message: "OTP expired" });

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.status(200).json({ success: true, message: "Email verified successfully", token: generateToken(user._id) });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to verify OTP" });
  }
};

export const resendOtpToken = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try { await sendOTPEmail(email, otp); } catch (e) { console.error("Resend OTP email failed:", e); }

    res.status(200).json({ success: true, message: "New OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to resend OTP" });
  }
};

export const handleGoogleSignIn = async (req, res) => {
  try {
    const { email, fullName, uid, photoURL } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email is required" });

    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      user.lastLoginAt = new Date();
      if (photoURL && !user.photoURL) user.photoURL = photoURL;
      await user.save();
      return res.status(200).json({ 
        success: true, 
        message: "Login successful", 
        user: { 
          id: user._id, 
          email: user.email, 
          fullName: user.fullName, 
          balances: user.balances, 
          isAdmin: user.isAdmin, 
          isVerified: user.isVerified 
        },
        token: generateToken(user._id)
      });
    }

    const randomPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

    user = await User.create({
      email: email.toLowerCase().trim(),
      fullName: fullName || email.split('@')[0],
      firebaseUid: uid,
      photoURL: photoURL || null,
      isVerified: true,
      authProvider: 'google',
      password: randomPassword,
      balances: { 
        availableLiquidity: 0, 
        lockedInvestment: 0, // ✅ ADDED
        totalDeposited: 0, 
        totalWithdrawn: 0, 
        netProfitLoss: 0, 
        totalInvested: 0, 
        currentInvestmentValue: 0, 
        referralCount: 0, 
        referralEarnings: 0 
      },
      lastLoginAt: new Date()
    });

    res.status(201).json({ 
      success: true, 
      message: "Account created", 
      user: { 
        id: user._id, 
        email: user.email, 
        fullName: user.fullName, 
        balances: user.balances, 
        isAdmin: user.isAdmin, 
        isVerified: user.isVerified 
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error("GOOGLE SIGN-IN ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to process Google sign-in" });
  }
};

// =====================================================
// PROFILE & SETTINGS
// =====================================================

export const getProfileNode = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({
      success: true,
      user: {
        id: user._id, 
        email: user.email, 
        fullName: user.fullName, 
        firstName: user.firstName, 
        lastName: user.lastName,
        phone: user.phone, 
        location: user.location, 
        photoURL: user.photoURL, 
        isVerified: user.isVerified, 
        isAdmin: user.isAdmin,
        referralCode: user.referralCode, 
        referredBy: user.referredBy || null, 
        balances: user.balances, 
        twoStep: user.twoStep, 
        lastLoginAt: user.lastLoginAt, 
        authProvider: user.authProvider, 
        createdAt: user.createdAt, 
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get profile" });
  }
};

export const updateProfileNode = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { fullName, firstName, lastName, phone, location, twoStep } = req.body;
    if (fullName) user.fullName = fullName;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (location) user.location = location;
    if (typeof twoStep === 'boolean') user.twoStep = twoStep;

    await user.save();
    res.status(200).json({ success: true, message: "Profile updated", user: { id: user._id, email: user.email, fullName: user.fullName, twoStep: user.twoStep } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

export const updateEmailNode = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { newEmail } = req.body; 
    if (!newEmail) return res.status(400).json({ success: false, message: "New email is required" });

    const cleanNewEmail = newEmail.toLowerCase().trim();
    const existingUser = await User.findOne({ email: cleanNewEmail });
    if (existingUser) return res.status(400).json({ success: false, message: "Email already in use" });

    user.email = cleanNewEmail;
    user.isVerified = false;
    await user.save();

    res.status(200).json({ success: true, message: "Email updated successfully. Please verify your new email." });
  } catch (error) {
    console.error("UPDATE EMAIL ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to update email" });
  }
};

export const setPasswordNode = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ success: true, message: "Password set successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to set password" });
  }
};

export const updatePasswordNode = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (!user.password) return res.status(400).json({ success: false, message: "Google account. Set password first." });

    const { currentPassword, newPassword } = req.body;
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(401).json({ success: false, message: "Current password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update password" });
  }
};

export const deleteAccountNode = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    await Investment.deleteMany({ user: user._id });
    await User.findByIdAndDelete(user._id);

    res.status(200).json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete account" });
  }
};

export const requestEmailChangeNode = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { newEmail } = req.body;
    const otp = generateOTP();
    
    user.emailChangeOtp = otp;
    user.emailChangeOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.pendingEmail = newEmail.toLowerCase().trim();
    await user.save();

    try {
      await sendOTPEmail(user.email, otp);
    } catch (emailError) {
      console.error("Failed to send email change OTP:", emailError);
    }

    res.status(200).json({ success: true, message: "Verification code sent to your current email" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to request email change" });
  }
};

export const verifyEmailChangeNode = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const { otp } = req.body;
    if (user.emailChangeOtp !== otp) return res.status(400).json({ success: false, message: "Invalid verification code" });
    if (user.emailChangeOtpExpires < new Date()) return res.status(400).json({ success: false, message: "Verification code expired" });

    user.email = user.pendingEmail;
    user.emailChangeOtp = null;
    user.emailChangeOtpExpires = null;
    user.pendingEmail = null;
    user.isVerified = false;
    await user.save();

    res.status(200).json({ success: true, message: "Email changed successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to verify email change" });
  }
};

export const uploadAvatarNode = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (req.file) {
      user.photoURL = `/uploads/${req.file.filename}`;
      await user.save();
    }
    res.status(200).json({ success: true, message: "Avatar uploaded", photoURL: user.photoURL });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to upload avatar" });
  }
};

export const deleteAvatarNode = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    user.photoURL = null;
    await user.save();
    res.status(200).json({ success: true, message: "Avatar deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete avatar" });
  }
};

// =====================================================
// DASHBOARD & REFERRALS
// =====================================================

export const getDashboardMetrics = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // ✅ UPDATED: Include lockedInvestment in total portfolio
    const totalPortfolio = (user.balances?.availableLiquidity || 0) + 
                          (user.balances?.lockedInvestment || 0) + 
                          (user.balances?.currentInvestmentValue || 0);

    res.status(200).json({
      success: true,
      balances: {
        availableLiquidity: user.balances?.availableLiquidity || 0,
        lockedInvestment: user.balances?.lockedInvestment || 0, // ✅ ADDED
        totalPortfolio,
        netProfitLoss: user.balances?.netProfitLoss || 0,
        totalDeposited: user.balances?.totalDeposited || 0,
        totalWithdrawn: user.balances?.totalWithdrawn || 0,
        totalInvested: user.balances?.totalInvested || 0, // ✅ ADDED
        currentInvestmentValue: user.balances?.currentInvestmentValue || 0 // ✅ ADDED
      },
      allocations: user.balances?.allocations || { stocks: 0, bonds: 0, commodities: 0 },
      user: { id: user._id, email: user.email, fullName: user.fullName, isAdmin: user.isAdmin }
    });
  } catch (error) {
    console.error("GET DASHBOARD METRICS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to fetch metrics" });
  }
};

export const validateReferralCodeEndpoint = async (req, res) => {
  try {
    const { code } = req.params;
    const user = await User.findOne({ referralCode: code.toUpperCase() });

    if (!user) return res.status(404).json({ success: false, valid: false, message: "Invalid referral code" });

    res.status(200).json({ success: true, valid: true, referrer: { name: user.fullName ? user.fullName.split(' ')[0] : 'A Friend' } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to validate code" });
  }
};

export const getMyReferralCode = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    if (!user.referralCode) {
      user.referralCode = await generateUniqueReferralCode();
      await user.save();
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://erax.company';
    const referralLink = `${frontendUrl}/#/register?ref=${user.referralCode}`;

    res.status(200).json({ success: true, referralCode: user.referralCode, referralLink, referredBy: user.referredBy || null });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get referral code" });
  }
};

// ✅ UPDATED: Calculate 3% commission from referred users' deposits
export const getReferralStats = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    console.log(`📊 Fetching referral stats for user: ${user.email}`);

    // ✅ Find all users referred by this user
    const referredUsers = await User.find({ 
      'referredBy.id': user._id 
    }).select('fullName email createdAt').sort({ createdAt: -1 });

    console.log(`📥 Found ${referredUsers.length} referred users`);

    // ✅ Calculate total earnings from deposits (3% commission)
    let totalEarnings = 0;
    const referralsWithDetails = [];

    for (const referredUser of referredUsers) {
      // Find completed deposits by this referred user
      const deposits = await Deposit.find({
        user: referredUser._id,
        status: { $in: ['completed', 'confirmed'] }
      });

      // Calculate 3% commission from each deposit
      let userEarnings = 0;
      deposits.forEach(deposit => {
        const commission = deposit.amount * 0.03; // 3% commission
        userEarnings += commission;
      });

      totalEarnings += userEarnings;

      referralsWithDetails.push({
        id: referredUser._id,
        name: referredUser.fullName || referredUser.email.split('@')[0],
        email: referredUser.email,
        joinedAt: referredUser.createdAt,
        date: new Date(referredUser.createdAt).toLocaleDateString('en-US', { 
          month: 'short', day: 'numeric', year: 'numeric' 
        }),
        earned: userEarnings,
        totalDeposits: deposits.reduce((sum, d) => sum + d.amount, 0),
        depositCount: deposits.length
      });
    }

    console.log(`💰 Total earnings: $${totalEarnings.toFixed(2)}`);

    // ✅ Update user's referral earnings in database
    if (totalEarnings > 0 && totalEarnings !== (user.balances?.referralEarnings || 0)) {
      user.balances.referralEarnings = totalEarnings;
      await user.save();
      console.log(`✅ Updated referral earnings for ${user.email}`);
    }

    res.status(200).json({
      success: true,
      totalReferrals: referredUsers.length,
      totalEarnings: totalEarnings,
      referrals: referralsWithDetails,
      stats: {
        totalReferrals: referredUsers.length,
        earnings: totalEarnings,
        referralCode: user.referralCode
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error("❌ GET REFERRAL STATS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get referral stats",
      error: error.message
    });
  }
};

// =====================================================
// INVESTMENTS & SURVEYS
// =====================================================

export const createInvestment = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) return res.status(401).json({ success: false, message: "User not found" });

    const { assetClass, amount } = req.body;
    if (!assetClass || !amount) return res.status(400).json({ success: false, message: "Asset class and amount are required" });

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum < 50) return res.status(400).json({ success: false, message: "Minimum investment is $50" });

    if ((user.balances?.availableLiquidity || 0) < amountNum) {
      return res.status(400).json({ success: false, message: `Insufficient balance. Available: $${(user.balances?.availableLiquidity || 0).toFixed(2)}` });
    }

    user.balances.availableLiquidity -= amountNum;
    user.balances.totalInvested = (user.balances.totalInvested || 0) + amountNum;
    
    const TESTING_MODE = process.env.NODE_ENV !== 'production'; 
    const maturityDate = new Date();
    if (TESTING_MODE) {
      maturityDate.setSeconds(maturityDate.getSeconds() + 20);
    } else {
      maturityDate.setHours(maturityDate.getHours() + 24);
    }

    const interestAmount = amountNum; 
    const transactionId = `INV-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    const investment = await Investment.create({
      user: user._id, 
      email: user.email, 
      assetClass: assetClass.toLowerCase(), 
      symbol: assetClass.toUpperCase(),
      name: `${assetClass} Investment`, 
      amount: amountNum, 
      interestAmount, 
      maturityDate, 
      actualEndDate: maturityDate, 
      isComplete: true, 
      interestStatus: 'pending', 
      status: 'active', 
      transactionId
    });

    await user.save();

    res.status(201).json({
      success: true,
      message: `Successfully invested $${amountNum}!`,
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
    console.error("INVESTMENT ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to create investment" });
  }
};

export const getUserInvestments = async (req, res) => {
  try {
    const user = await getSecureUser(req, res);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const investments = await Investment.find({ user: user._id }).sort({ investedAt: -1 });

    const processedInvestments = investments.map(inv => {
      const isMatured = inv.maturityDate ? (new Date() >= new Date(inv.maturityDate)) : false;
      const hoursUntilMaturity = inv.maturityDate ? Math.max(0, Math.ceil((new Date(inv.maturityDate) - new Date()) / (1000 * 60 * 60))) : 0;
      
      let earlyWithdrawalInfo = null;
      if (inv.status === 'active' && !isMatured) earlyWithdrawalInfo = calculateEarlyWithdrawal(inv);

      return {
        id: inv._id, 
        transactionId: inv.transactionId || '', 
        assetClass: inv.assetClass || 'stocks', 
        symbol: inv.symbol || 'STOCK',
        name: inv.name || 'Investment', 
        amount: (inv.amount || 0).toFixed(2), 
        interestAmount: (inv.interestAmount || 0).toFixed(2),
        investedAt: inv.investedAt, 
        maturityDate: inv.maturityDate, 
        hoursUntilMaturity, 
        isMatured,
        interestStatus: inv.interestStatus || 'pending', 
        surveyCompleted: inv.surveyResponses && inv.surveyResponses.size > 0,
        status: inv.status || 'active', 
        earlyWithdrawalInfo, 
        earlyWithdrawalPayout: inv.earlyWithdrawalPayout || 0, 
        earlyWithdrawalPenalty: inv.earlyWithdrawalPenalty || 0
      };
    });

    const activeInvestments = processedInvestments.filter(i => i.status === 'active');
    const maturedInvestments = processedInvestments.filter(i => i.isMatured);
    
    const pendingInterest = maturedInvestments.filter(i => i.interestStatus !== 'claimed' && i.interestStatus !== 'early_withdrawn').reduce((sum, i) => sum + parseFloat(i.interestAmount || 0), 0);

    res.status(200).json({
      success: true,
      investments: processedInvestments,
      summary: {
        totalInvested: activeInvestments.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0),
        totalPendingInterest: pendingInterest, 
        maturedCount: maturedInvestments.length, 
        activeCount: activeInvestments.length, 
        investmentCount: processedInvestments.length
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch investments" });
  }
};

export const getSurveyQuestions = async (req, res) => {
  try {
    const { investmentId } = req.params;
    const user = await getSecureUser(req, res);
    if (!user) return res.status(401).json({ success: false, message: "Not authenticated" });

    const investment = await Investment.findById(investmentId);
    if (!investment || investment.user.toString() !== user._id.toString()) return res.status(403).json({ success: false, message: "Unauthorized" });

    if (!investment.maturityDate || new Date() < new Date(investment.maturityDate)) return res.status(400).json({ success: false, message: "Not matured yet" });

    if (investment.assignedQuestions && investment.assignedQuestions.length > 0) {
      investment.interestStatus = 'survey_assigned';
      await investment.save();
      return res.status(200).json({ success: true, questions: investment.assignedQuestions, metadata: SURVEY_METADATA });
    }

    const selectedQuestions = getRandomQuestions(SURVEY_QUESTION_POOL, SURVEY_METADATA.questionsPerSession);
    investment.assignedQuestions = selectedQuestions.map(q => ({ questionId: q.id, questionText: q.question, options: q.options }));
    investment.interestStatus = 'survey_assigned';
    await investment.save();

    res.status(200).json({ success: true, questions: investment.assignedQuestions, metadata: SURVEY_METADATA });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch survey" });
  }
};

export const submitSurvey = async (req, res) => {
  try {
    const { id } = req.params;
    const { responses } = req.body;
    const user = await getSecureUser(req, res);
    if (!user) return res.status(401).json({ success: false, message: "Not authenticated" });

    if (!responses || typeof responses !== 'object') return res.status(400).json({ success: false, message: "Responses required" });

    const investment = await Investment.findById(id);
    if (!investment || investment.user.toString() !== user._id.toString()) return res.status(403).json({ success: false, message: "Unauthorized" });

    if (investment.interestStatus === 'claimed' || investment.interestStatus === 'survey_completed') {
      return res.status(400).json({ success: false, message: "Survey already processed" });
    }

    const assignedIds = investment.assignedQuestions.map(q => q.questionId.toString());
    const missing = assignedIds.filter(id => !Object.keys(responses).includes(id));
    if (missing.length > 0) return res.status(400).json({ success: false, message: "Please answer all questions." });

    investment.surveyResponses = new Map(Object.entries(responses));
    investment.surveyCompletedAt = new Date();
    investment.interestStatus = 'survey_completed';
    await investment.save();

    res.status(200).json({ success: true, message: "Survey submitted! Claim interest now.", interestAmount: (investment.interestAmount || 0).toFixed(2) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to submit survey" });
  }
};

export const claimInterest = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getSecureUser(req, res);
    if (!user) return res.status(401).json({ success: false, message: "Not authenticated" });

    const investment = await Investment.findById(id);
    if (!investment || investment.user.toString() !== user._id.toString()) return res.status(403).json({ success: false, message: "Unauthorized" });

    if (investment.interestStatus !== 'survey_completed') return res.status(400).json({ success: false, message: "Complete survey first" });

    const interestAmount = investment.interestAmount || 0;
    user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) + interestAmount;
    user.balances.netProfitLoss = (user.balances?.netProfitLoss || 0) + interestAmount;
    await user.save();

    investment.interestStatus = 'claimed';
    investment.interestClaimedAt = new Date();
    investment.status = 'claimed';
    await investment.save();

    res.status(200).json({ success: true, message: `Claimed $${interestAmount.toFixed(2)}!`, updatedBalances: { availableLiquidity: user.balances.availableLiquidity, netProfitLoss: user.balances.netProfitLoss } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to claim interest" });
  }
};

export const earlyWithdrawal = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getSecureUser(req, res);
    if (!user) return res.status(401).json({ success: false, message: "Not authenticated" });

    const investment = await Investment.findById(id);
    if (!investment || investment.user.toString() !== user._id.toString()) return res.status(403).json({ success: false, message: "Unauthorized" });

    if (investment.status !== 'active') return res.status(400).json({ success: false, message: "Not active" });

    const isMatured = investment.maturityDate && new Date() >= new Date(investment.maturityDate);
    if (isMatured) return res.status(400).json({ success: false, message: "Matured. Complete survey instead." });

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

    res.status(200).json({ success: true, message: `Withdrew $${payout.toFixed(2)}`, withdrawalDetails: withdrawalInfo, updatedBalances: { availableLiquidity: user.balances.availableLiquidity } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to withdraw" });
  }
};

// =====================================================
// DAILY CHECK-IN & 30-DAY REWARD
// =====================================================

export const verifyDailyCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const { code } = req.body;
    const user = await getSecureUser(req, res);
    
    if (!user) return res.status(401).json({ success: false, message: "Not authenticated" });

    const investment = await Investment.findById(id);
    if (!investment || investment.user.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (investment.interestStatus === 'claimed') {
      return res.status(400).json({ success: false, message: "Reward already released! Challenge completed." });
    }

    if (!investment.claimCode) {
      return res.status(400).json({ success: false, message: "No daily code available yet. Please wait for the system to generate today's code." });
    }

    if (investment.codeExpiresAt && new Date() > new Date(investment.codeExpiresAt)) {
      return res.status(400).json({ success: false, message: "Today's code has expired. Please wait for a new one." });
    }

    if (investment.claimCode !== code.toUpperCase().trim()) {
      return res.status(400).json({ success: false, message: "Invalid daily code. Please try again." });
    }

    const today = new Date().setHours(0, 0, 0, 0);
    const alreadyCheckedInToday = investment.dailyTasks.some(task => 
      new Date(task.date).setHours(0, 0, 0, 0) === today && task.completed
    );
    
    if (alreadyCheckedInToday) {
      return res.status(400).json({ success: false, message: "You have already checked in today! Come back tomorrow." });
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
    investment.codeClaimedAt = new Date();
    investment.claimCode = null; 
    investment.codeExpiresAt = null;
    investment.interestStatus = 'pending';

    let message = "";
    let rewardReleased = false;

    if (investment.completedDays >= investment.totalDays) {
      const rewardAmount = investment.amount * 2; 
      
      user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) + rewardAmount;
      user.balances.netProfitLoss = (user.balances?.netProfitLoss || 0) + investment.amount;
      await user.save();

      investment.interestStatus = 'claimed';
      investment.status = 'claimed';
      investment.actualEndDate = new Date();
      
      message = `🎉 CONGRATULATIONS! You completed ${investment.totalDays} days! Your reward of $${rewardAmount.toFixed(2)} has been released to your wallet!`;
      rewardReleased = true;
    } else {
      message = `✅ Checked in successfully! Day ${investment.completedDays}/${investment.totalDays} completed. Keep going!`;
    }

    await investment.save();

    res.status(200).json({
      success: true,
      message,
      rewardReleased,
      completedDays: investment.completedDays,
      targetDays: investment.totalDays,
      updatedBalances: rewardReleased ? {
        availableLiquidity: user.balances.availableLiquidity,
        netProfitLoss: user.balances.netProfitLoss
      } : null
    });

  } catch (error) {
    console.error("❌ VERIFY DAILY CHECK-IN ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to verify daily code" });
  }
};

export const getCheckInStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await getSecureUser(req, res);
    if (!user) return res.status(401).json({ success: false, message: "Not authenticated" });

    const investment = await Investment.findById(id);
    if (!investment || investment.user.toString() !== user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const lastTask = investment.dailyTasks.length > 0 ? investment.dailyTasks[investment.dailyTasks.length - 1] : null;

    res.status(200).json({
      success: true,
      status: {
        completedDays: investment.completedDays || 0,
        targetDays: investment.totalDays || 30,
        isRewardReleased: investment.interestStatus === 'claimed',
        lastCheckInDate: lastTask ? lastTask.date : null,
        hasCodeToday: !!investment.claimCode
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get status" });
  }
};

// =====================================================
// GET CURRENT USER
// =====================================================

export const getCurrentUser = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      console.error("❌ getCurrentUser: No user in request. req.user =", req.user);
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated - no user found in token" 
      });
    }

    const user = await User.findById(req.user.id).select('-password -otp -otpExpires -emailChangeOtp -emailChangeOtpExpires -pendingEmail -firebaseUid -lastIp');
    
    if (!user) {
      console.error("❌ getCurrentUser: User not found for ID:", req.user.id);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("✅ getCurrentUser: Successfully fetched user:", user.email);

    res.status(200).json({ 
      success: true, 
      user: { 
        id: user._id, 
        email: user.email, 
        fullName: user.fullName, 
        firstName: user.firstName, 
        lastName: user.lastName, 
        phone: user.phone, 
        location: user.location, 
        photoURL: user.photoURL, 
        isVerified: user.isVerified, 
        isAdmin: user.isAdmin, 
        referralCode: user.referralCode, 
        referredBy: user.referredBy || null, 
        balances: user.balances, 
        twoStep: user.twoStep, 
        lastLoginAt: user.lastLoginAt, 
        authProvider: user.authProvider, 
        createdAt: user.createdAt, 
        updatedAt: user.updatedAt 
      } 
    });
  } catch (error) {
    console.error("❌ getCurrentUser ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch current user",
      error: error.message 
    });
  }
};

// =====================================================
// EXPORT ALL FUNCTIONS
// =====================================================

export default {
  registerUserNode,
  loginUserNode,
  verifyOtpToken,
  resendOtpToken,
  getProfileNode,
  updateProfileNode,
  updateEmailNode,
  updatePasswordNode,
  setPasswordNode,
  deleteAccountNode,
  requestEmailChangeNode,
  verifyEmailChangeNode,
  uploadAvatarNode,
  deleteAvatarNode,
  getDashboardMetrics,
  validateReferralCodeEndpoint,
  getMyReferralCode,
  getReferralStats, // ✅ UPDATED
  handleGoogleSignIn,
  checkEmailAvailability,
  getCurrentUser,
  createInvestment,
  getUserInvestments,
  getSurveyQuestions,
  submitSurvey,
  claimInterest,
  earlyWithdrawal,
  verifyDailyCheckIn,
  getCheckInStatus
};