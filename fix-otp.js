import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

const email = "deckardshawn01@gmail.com";
const newOTP = "123456";

async function fixUserOTP() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log("❌ User not found");
      process.exit(1);
    }

    console.log("📧 User found:", user.email);
    console.log("🔐 Current OTP:", user.otp);

    // Update OTP
    user.otp = newOTP;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    console.log("✅ OTP updated to:", newOTP);
    console.log("✅ Use this OTP to verify:", newOTP);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixUserOTP();