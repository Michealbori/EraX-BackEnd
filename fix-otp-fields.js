import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';

dotenv.config();

async function fixOTPFields() {
  try {
    console.log("🔧 Fixing OTP fields in User model...\n");
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find all users without OTP fields
    const usersWithoutOTP = await User.find({
      $or: [
        { otp: { $exists: false } },
        { otpExpires: { $exists: false } }
      ]
    });

    console.log(`📊 Found ${usersWithoutOTP.length} users missing OTP fields\n`);

    if (usersWithoutOTP.length > 0) {
      console.log("🔨 Updating users...\n");
      
      for (const user of usersWithoutOTP) {
        console.log(`📧 User: ${user.email}`);
        
        // Add missing fields
        let updated = false;
        
        if (user.otp === undefined) {
          user.otp = null;
          updated = true;
          console.log("   ✅ Added otp field");
        }
        
        if (user.otpExpires === undefined) {
          user.otpExpires = null;
          updated = true;
          console.log("   ✅ Added otpExpires field");
        }
        
        if (user.emailChangeOtp === undefined) {
          user.emailChangeOtp = null;
          updated = true;
          console.log("   ✅ Added emailChangeOtp field");
        }
        
        if (user.emailChangeOtpExpires === undefined) {
          user.emailChangeOtpExpires = null;
          updated = true;
          console.log("   ✅ Added emailChangeOtpExpires field");
        }
        
        if (user.pendingEmail === undefined) {
          user.pendingEmail = null;
          updated = true;
          console.log("   ✅ Added pendingEmail field");
        }
        
        if (updated) {
          await user.save();
          console.log("   💾 Saved successfully\n");
        }
      }
    }

    // Verify the fix
    const testUser = await User.findOne({ email: "deckardshawn01@gmail.com" });
    if (testUser) {
      console.log("✅ Verification for deckardshawn01@gmail.com:");
      console.log("   otp:", testUser.otp);
      console.log("   otpExpires:", testUser.otpExpires);
      console.log("   has otp field:", testUser.otp !== undefined);
      console.log("   has otpExpires field:", testUser.otpExpires !== undefined);
    }

    console.log("\n🎉 All users updated successfully!");
    process.exit(0);
    
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixOTPFields();