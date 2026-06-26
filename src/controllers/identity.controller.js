import Investment from "../models/Investment.js";
import User from "../models/User.js";
import { SURVEY_QUESTION_POOL, SURVEY_METADATA } from "../config/surveyQuestions.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendOTPEmail } from '../config/email.js';

const getRandomQuestions = (pool, count) => {
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

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

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "erax_secret_key", {
    expiresIn: "30d"
  });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// =====================================================
// AUTH FUNCTIONS
// =====================================================

export const registerUserNode = async (req, res) => {
  try {
    const { email, password, fullName, firstName, lastName, referralCode } = req.body;

    console.log("\n" + "=".repeat(60));
    console.log("📝 [REGISTER] Starting registration process");
    console.log("Email:", email);
    console.log("Referral Code from frontend:", referralCode);
    console.log("=".repeat(60));

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      console.log("⚠️ User already exists:", email);
      return res.status(400).json({
        success: false,
        message: "User already exists with this email. Please login instead.",
        code: "EMAIL_EXISTS"
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    console.log("\n🔐 Generated OTP:", otp);
    console.log("📅 OTP expires:", otpExpires);

    // ✅ HANDLE REFERRAL CODE WITH DETAILED LOGGING
    let referredByData = null;
    
    if (referralCode && referralCode.trim()) {
      const cleanReferralCode = referralCode.trim().toUpperCase();
      console.log("\n🔍 Looking for referrer with code:", cleanReferralCode);
      
      const referrer = await User.findOne({ referralCode: cleanReferralCode });
      
      if (referrer) {
        // ✅ SAVE REFERRER INFO
        referredByData = {
          id: referrer._id,
          name: referrer.fullName || 'Unknown User',
          email: referrer.email
        };
        console.log("✅ Referrer found!");
        console.log("   - Referrer ID:", referrer._id);
        console.log("   - Referrer Name:", referrer.fullName);
        console.log("   - Referrer Email:", referrer.email);
        console.log("   - Saving to referredBy:", JSON.stringify(referredByData, null, 2));
      } else {
        console.log("⚠️ No user found with referral code:", cleanReferralCode);
        console.log("⚠️ Checking available codes in DB...");
        const sampleUsers = await User.find().select('referralCode email').limit(5);
        console.log("   Available codes:");
        sampleUsers.forEach(u => console.log("   -", u.referralCode, "->", u.email));
      }
    } else {
      console.log("ℹ️ No referral code provided or it's empty");
      console.log("   - referralCode value:", referralCode);
      console.log("   - referralCode type:", typeof referralCode);
    }

    // Generate unique referral code for new user
    let userReferralCode = `ERAX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    let referralCodeExists = await User.findOne({ referralCode: userReferralCode });
    while (referralCodeExists) {
      userReferralCode = `ERAX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      referralCodeExists = await User.findOne({ referralCode: userReferralCode });
    }

    console.log("🏷️ Generated referral code for new user:", userReferralCode);

    // ✅ CREATE USER WITH REFERRAL DATA
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      fullName: fullName || `${firstName || ''} ${lastName || ''}`.trim() || email.split('@')[0],
      firstName: firstName || '',
      lastName: lastName || '',
      isAdmin: false,
      isVerified: false,
      otp: otp,
      otpExpires: otpExpires,
      authProvider: 'email',
      referredBy: referredByData, // ✅ This saves the referrer info
      referralCode: userReferralCode,
      balances: {
        availableLiquidity: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        netProfitLoss: 0,
        totalInvested: 0,
        currentInvestmentValue: 0,
        referralCount: 0,
        referralEarnings: 0
      }
    });

    console.log("\n✅ User created in database");
    console.log("✅ User ID:", user._id);
    console.log("✅ User referredBy saved as:", JSON.stringify(user.referredBy, null, 2));

    // ✅ INCREMENT REFERRER COUNT
    if (referredByData) {
      try {
        console.log("\n🔄 Attempting to increment referrer count...");
        console.log("   - Referrer ID to update:", referredByData.id);
        
        const updateResult = await User.findByIdAndUpdate(
          referredByData.id, 
          { $inc: { 'balances.referralCount': 1 } },
          { new: true }
        );
        
        if (updateResult) {
          console.log("✅ Referrer count incremented successfully");
          console.log("✅ New referral count:", updateResult.balances.referralCount);
        } else {
          console.log("⚠️ Failed to update referrer - updateResult is null");
        }
      } catch (updateError) {
        console.error("❌ Error incrementing referrer count:", updateError);
      }
    } else {
      console.log("ℹ️ No referrer to increment (user didn't use a referral code)");
    }

    console.log("✅ OTP saved to database:", user.otp);
    console.log("✅ Referral code:", user.referralCode);

    try {
      const emailSent = await sendOTPEmail(email, otp);
      
      if (emailSent) {
        console.log("✅ OTP email SENT successfully!");
      } else {
        console.log("⚠️ Email sending returned false");
        console.log("⚠️ OTP for manual use:", otp);
      }
    } catch (emailError) {
      console.log("❌ Email sending failed:", emailError.message);
      console.log("⚠️ OTP for manual use:", otp);
    }

    console.log("=".repeat(60) + "\n");

    res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email for verification code.",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        isVerified: user.isVerified,
        referralCode: user.referralCode
      },
      token: generateToken(user._id)
    });

  } catch (error) {
    console.error("\n❌ REGISTER ERROR:", error);
    console.error("Error stack:", error.stack);
    console.error("Error code:", error.code);
    console.error("Error keyPattern:", error.keyPattern);
    console.error("Error keyValue:", error.keyValue);
    console.log("=".repeat(60) + "\n");
    
    if (error.code === 11000) {
      console.log("🔍 Duplicate key error detected");
      console.log("🔍 Duplicate key pattern:", error.keyPattern);
      console.log("🔍 Duplicate key value:", error.keyValue);

      if (error.keyPattern?.email) {
        return res.status(400).json({
          success: false,
          message: "Email already registered. Please login instead.",
          code: "EMAIL_EXISTS"
        });
      }
      
      if (error.keyPattern?.referralCode) {
        return res.status(400).json({
          success: false,
          message: "Referral code already exists. Please try again.",
          code: "REFERRAL_CODE_EXISTS"
        });
      }

      return res.status(400).json({
        success: false,
        message: "Duplicate field detected. Please use different values.",
        code: "DUPLICATE_KEY",
        field: Object.keys(error.keyPattern || {})[0]
      });
    }
    
    res.status(500).json({
      success: false,
      message: "Failed to register user",
      error: error.message || error.toString()
    });
  }
};

export const checkEmailAvailability = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    
    const existingUser = await User.findOne({ email: cleanEmail });
    
    if (existingUser) {
      console.log("⚠️ Email already registered:", cleanEmail);
      return res.status(200).json({
        success: true,
        available: false,
        message: "This email is already registered. Please login instead."
      });
    }

    console.log("✅ Email available:", cleanEmail);
    return res.status(200).json({
      success: true,
      available: true,
      message: "Email is available for registration"
    });

  } catch (error) {
    console.error("❌ CHECK EMAIL ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check email availability",
      error: error.message
    });
  }
};

export const loginUserNode = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log("🔑 [LOGIN] Email:", email);

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (!user.password) {
      console.log("⚠️ User has no password (Google account):", email);
      return res.status(401).json({
        success: false,
        message: "This account was created with Google. Please use Google Sign-In or set a password first."
      });
    }

    console.log("🔐 Comparing password for:", email);
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log("❌ Invalid password for:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    console.log("✅ Password valid for:", email);

    user.lastLoginAt = new Date();
    user.lastIp = req.ip || req.connection.remoteAddress;
    await user.save();

    console.log("✅ Login successful:", email);

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
      token: generateToken(user._id)
    });

  } catch (error) {
    console.error("❌ LOGIN ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to login",
      error: error.message
    });
  }
};

export const verifyOtpToken = async (req, res) => {
  try {
    const { email, otp } = req.body;

    console.log("\n" + "=".repeat(60));
    console.log("🔐 [VERIFY OTP] Request received");
    console.log("Email:", email);
    console.log("OTP entered:", otp);
    console.log("=".repeat(60));

    if (!email || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and OTP are required" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("📥 OTP in database:", user.otp);
    console.log("📅 OTP expires:", user.otpExpires);
    console.log("📅 Current time:", new Date());
    console.log("📅 Is expired?", user.otpExpires ? user.otpExpires < new Date() : 'No expiry date');

    if (!user.otp || user.otp === null) {
      console.log("❌ No OTP found in database!");
      return res.status(400).json({ 
        success: false, 
        message: "No OTP found. Please request a new one." 
      });
    }

    if (String(user.otp) !== String(otp)) {
      console.log("❌ OTP MISMATCH!");
      console.log("Expected:", user.otp);
      console.log("Received:", otp);
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (user.otpExpires && user.otpExpires < new Date()) {
      console.log("❌ OTP EXPIRED!");
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new one." });
    }

    console.log("✅ OTP VERIFIED SUCCESSFULLY!");

    user.isVerified = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    console.log("✅ User marked as verified");

    res.status(200).json({
      success: true,
      message: "Email verified successfully",
      token: generateToken(user._id)
    });

  } catch (error) {
    console.error("❌ VERIFY OTP ERROR:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ success: false, message: "Failed to verify OTP" });
  }
};

export const resendOtpToken = async (req, res) => {
  try {
    const { email } = req.body;

    console.log("\n" + "=".repeat(60));
    console.log("🔄 [RESEND OTP] Request received");
    console.log("Email:", email);
    console.log("=".repeat(60));

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    console.log("🔐 Generated NEW OTP:", otp);
    console.log("📅 OTP expires at:", otpExpires);

    const updatedUser = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { 
        $set: { 
          otp: otp,
          otpExpires: otpExpires 
        } 
      },
      { new: true }
    );

    if (!updatedUser) {
      console.log("❌ Failed to update user with new OTP");
      return res.status(500).json({ 
        success: false, 
        message: "Failed to update OTP" 
      });
    }

    console.log("✅ User document updated in database");
    console.log("✅ New OTP in database:", updatedUser.otp);

    try {
      console.log("📤 Sending OTP email...");
      const emailSent = await sendOTPEmail(email, otp);
      
      if (emailSent) {
        console.log("✅ OTP email RESENT successfully!");
      } else {
        console.log("⚠️ Email sending returned false");
        console.log("⚠️ Manual OTP for testing:", otp);
      }
    } catch (emailError) {
      console.log("❌ Email sending failed:", emailError.message);
      console.log("⚠️ Manual OTP for testing:", otp);
    }

    console.log("=".repeat(60) + "\n");

    res.status(200).json({
      success: true,
      message: "New OTP sent successfully to your email",
      debug: process.env.NODE_ENV === 'development' ? { otp } : undefined
    });

  } catch (error) {
    console.error("❌ RESEND OTP ERROR:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({ 
      success: false, 
      message: "Failed to resend OTP",
      error: error.message 
    });
  }
};

// =====================================================
// PROFILE FUNCTIONS
// =====================================================

export const getProfileNode = async (req, res) => {
  try {
    const { email } = req.query;

    console.log("\n👤 [GET PROFILE] Email:", email);

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    console.log("✅ User found:", user.email);
    console.log("🔍 User referredBy:", user.referredBy);

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
    console.error("❌ GET PROFILE ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get profile",
      error: error.message 
    });
  }
};

export const updateProfileNode = async (req, res) => {
  try {
    const { email, fullName, firstName, lastName, phone, location, twoStep } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (fullName) user.fullName = fullName;
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (location) user.location = location;
    
    if (typeof twoStep === 'boolean') {
      user.twoStep = twoStep;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        twoStep: user.twoStep
      }
    });

  } catch (error) {
    console.error("❌ UPDATE PROFILE ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

export const updateEmailNode = async (req, res) => {
  try {
    const { email, newEmail } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const existingUser = await User.findOne({ email: newEmail.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    user.email = newEmail.toLowerCase().trim();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email updated successfully"
    });

  } catch (error) {
    console.error("❌ UPDATE EMAIL ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to update email" });
  }
};

export const setPasswordNode = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    console.log("🔐 [SET PASSWORD] Email:", email);

    if (!email || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email and new password are required"
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    console.log("✅ Password set for:", email);

    res.status(200).json({
      success: true,
      message: "Password set successfully. You can now login with email and password."
    });

  } catch (error) {
    console.error("❌ SET PASSWORD ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to set password" });
  }
};

export const updatePasswordNode = async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.password) {
      return res.status(400).json({ 
        success: false, 
        message: "This account was created with Google. Please use the 'Set Password' feature first." 
      });
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully"
    });

  } catch (error) {
    console.error("❌ UPDATE PASSWORD ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to update password" });
  }
};

export const deleteAccountNode = async (req, res) => {
  try {
    const { email } = req.body;

    console.log("🗑️ [DELETE ACCOUNT] Email:", email);

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    await Investment.deleteMany({ user: user._id });
    await User.findByIdAndDelete(user._id);

    console.log("✅ Account deleted:", email);

    res.status(200).json({
      success: true,
      message: "Account deleted successfully"
    });

  } catch (error) {
    console.error("❌ DELETE ACCOUNT ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete account",
      error: error.message 
    });
  }
};

export const requestEmailChangeNode = async (req, res) => {
  try {
    const { email, newEmail } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const otp = generateOTP();
    user.emailChangeOtp = otp;
    user.emailChangeOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.pendingEmail = newEmail.toLowerCase().trim();
    await user.save();

    res.status(200).json({
      success: true,
      message: "Verification code sent to your current email"
    });

  } catch (error) {
    console.error("❌ REQUEST EMAIL CHANGE ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to request email change" });
  }
};

export const verifyEmailChangeNode = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (user.emailChangeOtp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid verification code" });
    }

    if (user.emailChangeOtpExpires < new Date()) {
      return res.status(400).json({ success: false, message: "Verification code expired" });
    }

    user.email = user.pendingEmail;
    user.emailChangeOtp = null;
    user.emailChangeOtpExpires = null;
    user.pendingEmail = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Email changed successfully"
    });

  } catch (error) {
    console.error("❌ VERIFY EMAIL CHANGE ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to verify email change" });
  }
};

export const uploadAvatarNode = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (req.file) {
      user.photoURL = `/uploads/${req.file.filename}`;
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: "Avatar uploaded successfully",
      photoURL: user.photoURL
    });

  } catch (error) {
    console.error("❌ UPLOAD AVATAR ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to upload avatar" });
  }
};

export const deleteAvatarNode = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.photoURL = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Avatar deleted successfully"
    });

  } catch (error) {
    console.error("❌ DELETE AVATAR ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to delete avatar" });
  }
};

// =====================================================
// GOOGLE SIGN-IN & DASHBOARD
// =====================================================

export const handleGoogleSignIn = async (req, res) => {
  try {
    const { email, fullName, uid, photoURL } = req.body;

    console.log("🔵 [GOOGLE SIGN-IN] Processing:", email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    let user = await User.findOne({ email: email.toLowerCase().trim() });

    if (user) {
      user.lastLoginAt = new Date();
      user.lastIp = req.ip || req.connection.remoteAddress;
      if (photoURL && !user.photoURL) {
        user.photoURL = photoURL;
      }
      await user.save();

      console.log("✅ [GOOGLE SIGN-IN] Existing user:", email);

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
        }
      });
    }

    const randomPassword = await bcrypt.hash(uid + Date.now(), 10);

    user = await User.create({
      email: email.toLowerCase().trim(),
      fullName: fullName || email.split('@')[0],
      firebaseUid: uid,
      photoURL: photoURL || null,
      isVerified: true,
      isAdmin: false,
      authProvider: 'google',
      password: randomPassword,
      balances: {
        availableLiquidity: 0,
        totalDeposited: 0,
        totalWithdrawn: 0,
        netProfitLoss: 0,
        totalInvested: 0,
        currentInvestmentValue: 0,
        referralCount: 0,
        referralEarnings: 0
      },
      lastLoginAt: new Date(),
      lastIp: req.ip || req.connection.remoteAddress
    });

    console.log("✅ [GOOGLE SIGN-IN] New user created:", email);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        balances: user.balances,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified
      }
    });

  } catch (error) {
    console.error("❌ GOOGLE SIGN-IN ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process Google sign-in",
      error: error.message
    });
  }
};

export const getDashboardMetrics = async (req, res) => {
  try {
    const { email } = req.query;

    console.log("📊 [DASHBOARD METRICS] Email:", email);

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    const totalPortfolio = (user.balances?.availableLiquidity || 0) + 
                          (user.balances?.currentInvestmentValue || 0);

    const allocations = {
      stocks: user.balances?.allocations?.stocks || 0,
      bonds: user.balances?.allocations?.bonds || 0,
      commodities: user.balances?.allocations?.commodities || 0
    };

    res.status(200).json({
      success: true,
      balances: {
        availableLiquidity: user.balances?.availableLiquidity || 0,
        totalPortfolio: totalPortfolio,
        netProfitLoss: user.balances?.netProfitLoss || 0,
        totalDeposited: user.balances?.totalDeposited || 0,
        totalWithdrawn: user.balances?.totalWithdrawn || 0
      },
      allocations: allocations,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin
      }
    });

  } catch (error) {
    console.error("❌ DASHBOARD METRICS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard metrics",
      error: error.message
    });
  }
};

// =====================================================
// REFERRAL FUNCTIONS
// =====================================================

export const validateReferralCodeEndpoint = async (req, res) => {
  try {
    const { code } = req.params;

    console.log("\n🔍 [VALIDATE REFERRAL] Code:", code);
    console.log("🔍 [VALIDATE REFERRAL] Uppercase:", code.toUpperCase());

    const user = await User.findOne({ referralCode: code.toUpperCase() });

    if (!user) {
      console.log("❌ Referral code not found in database");
      return res.status(404).json({ success: false, valid: false, message: "Invalid referral code" });
    }

    console.log("✅ Referral code valid. Referrer:", user.fullName);
    console.log("✅ Referrer email:", user.email);

    res.status(200).json({
      success: true,
      valid: true,
      referrer: {
        name: user.fullName ? user.fullName.split(' ')[0] : 'A Friend'
      }
    });

  } catch (error) {
    console.error("❌ VALIDATE REFERRAL ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to validate referral code" });
  }
};

export const getMyReferralCode = async (req, res) => {
  try {
    const { email } = req.params;

    console.log("\n🔗 [GET REFERRAL CODE] Email:", email);

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required" 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (!user.referralCode) {
      user.referralCode = `ERAX-${user._id.toString().slice(-8).toUpperCase()}`;
      await user.save();
      console.log("✅ Generated new referral code:", user.referralCode);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://erax.company';
    const referralLink = `${frontendUrl}/#/register?ref=${user.referralCode}`;

    console.log("✅ Referral code:", user.referralCode);
    console.log("✅ Referral link:", referralLink);
    console.log("✅ Referred by:", user.referredBy);

    res.status(200).json({
      success: true,
      referralCode: user.referralCode,
      referralLink: referralLink,
      referredBy: user.referredBy || null 
    });

  } catch (error) {
    console.error("❌ GET REFERRAL CODE ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to get referral code",
      error: error.message 
    });
  }
};

// ✅ UPDATED: Now fetches and returns the actual list of referred users
export const getReferralStats = async (req, res) => {
  try {
    const { email } = req.params;

    console.log("📊 [GET REFERRAL STATS] Email:", email);

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // ✅ Fetch actual list of users who were referred by this user
    const referredUsers = await User.find({ "referredBy.id": user._id })
      .select('fullName email createdAt')
      .sort({ createdAt: -1 })
      .limit(10); // Get last 10 referrals

    const referralCount = user.balances?.referralCount || referredUsers.length;

    console.log("✅ Total referrals:", referralCount);
    console.log("✅ Found", referredUsers.length, "referred users");

    let earnings = user.balances?.referralEarnings || 0;
    
    if (referralCount >= 20) {
      earnings += 20;
    } else if (referralCount >= 10) {
      earnings += 10;
    }

    console.log("✅ Calculated earnings:", earnings);

    // ✅ Format the referrals list for frontend
    const referralsList = referredUsers.map(ref => ({
      id: ref._id,
      name: ref.fullName || ref.email.split('@')[0],
      email: ref.email,
      date: new Date(ref.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      }),
      earned: 0 // You can calculate individual earnings per referral if needed
    }));

    res.status(200).json({
      success: true,
      stats: {
        totalReferrals: referralCount,
        referralCode: user.referralCode || null,
        earnings: parseFloat(earnings.toFixed(2))
      },
      referrals: referralsList // ✅ NEW: Send the actual list
    });

  } catch (error) {
    console.error("❌ GET REFERRAL STATS ERROR:", error);
    res.status(500).json({ success: false, message: "Failed to get referral stats" });
  }
};

// =====================================================
// INVESTMENT FUNCTIONS
// =====================================================

export const createInvestment = async (req, res) => {
  try {
    const { email, assetClass, amount } = req.body;

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

    user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) - amountNum;
    
    const TESTING_MODE = true;
    
    const maturityDate = new Date();
    if (TESTING_MODE) {
      maturityDate.setSeconds(maturityDate.getSeconds() + 20);
    } else {
      maturityDate.setHours(maturityDate.getHours() + 24);
    }

    const interestAmount = amountNum;
    const transactionId = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const investment = await Investment.create({
      user: user._id,
      email: user.email,
      assetClass: assetClass.toLowerCase(),
      symbol: assetClass.toUpperCase(),
      name: `${assetClass} Investment`,
      amount: amountNum,
      interestAmount: interestAmount,
      maturityDate: maturityDate,
      actualEndDate: maturityDate, 
      isComplete: true, 
      interestStatus: 'pending',
      status: 'active',
      transactionId: transactionId
    });

    user.balances.availableLiquidity = (user.balances?.availableLiquidity || 0) + amountNum;
    await user.save();

    res.status(201).json({
      success: true,
      message: `Successfully invested $${amountNum}! ${TESTING_MODE ? 'Code will generate in 20 seconds.' : 'Complete the survey after 24 hours to claim interest.'}`,
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

    const investments = await Investment.find({ user: user._id }).sort({ investedAt: -1 });

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

    if (investment.assignedQuestions && investment.assignedQuestions.length > 0) {
      investment.interestStatus = 'survey_assigned';
      await investment.save();
      return res.status(200).json({
        success: true,
        questions: investment.assignedQuestions,
        metadata: SURVEY_METADATA
      });
    }

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

    const assignedIds = investment.assignedQuestions.map(q => q.questionId.toString());
    const answeredIds = Object.keys(responses);
    
    const missing = assignedIds.filter(id => !answeredIds.includes(id));
    if (missing.length > 0) {
      return res.status(400).json({ success: false, message: "Please answer all assigned questions." });
    }

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

export const earlyWithdrawal = async (req, res) => {
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

// =====================================================
// GET LOGGED-IN USER DATA
// =====================================================

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated. Please login." 
      });
    }

    const user = await User.findById(userId).select('-password -otp -otpExpires -emailChangeOtp -emailChangeOtpExpires -pendingEmail -firebaseUid -lastIp');

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

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
    console.error("❌ GET CURRENT USER ERROR:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch logged-in user data",
      error: error.message 
    });
  }
};