import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, "Password is required"]
  },
  fullName: {
    type: String,
    default: ""
  },
  firstName: {
    type: String,
    default: ""
  },
  lastName: {
    type: String,
    default: ""
  },
  phone: {
    type: String,
    default: ""
  },
  location: {
    type: String,
    default: ""
  },
  photoURL: {
    type: String,
    default: null
  },
  
  // ✅ OTP FIELDS
  otp: {
    type: String,
    default: null
  },
  otpExpires: {
    type: Date,
    default: null
  },
  emailChangeOtp: {
    type: String,
    default: null
  },
  emailChangeOtpExpires: {
    type: Date,
    default: null
  },
  pendingEmail: {
    type: String,
    default: null
  },
  
  // ✅ VERIFICATION & AUTH
  isVerified: {
    type: Boolean,
    default: false
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  authProvider: {
    type: String,
    enum: ['email', 'google'],
    default: 'email'
  },
  firebaseUid: {
    type: String,
    default: null
  },
  
  // ✅ FIXED: Remove unique constraint, we'll handle uniqueness in code
  referralCode: {
    type: String,
    default: null,
    index: true, // ✅ Just a regular index, not unique
    sparse: true
  },
  
  // ✅ UPDATED: referredBy is now an OBJECT that stores ID, Name, and Email directly
  referredBy: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, default: '' },
    email: { type: String, default: '' }
  },
  
  twoStep: {
    type: Boolean,
    default: false
  },
  
  // ✅ BALANCES
  balances: {
    availableLiquidity: { type: Number, default: 0 },
    totalDeposited: { type: Number, default: 0 },
    totalWithdrawn: { type: Number, default: 0 },
    netProfitLoss: { type: Number, default: 0 },
    totalInvested: { type: Number, default: 0 },
    currentInvestmentValue: { type: Number, default: 0 },
    allocations: {
      stocks: { type: Number, default: 0 },
      bonds: { type: Number, default: 0 },
      commodities: { type: Number, default: 0 }
    },
    // ✅ Secure referral tracking fields
    referralCount: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 }
  },
  
  // ✅ TIMESTAMPS
  lastLoginAt: {
    type: Date,
    default: null
  },
  lastIp: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// ✅ Remove the old unique index on referralCode
userSchema.index({ referralCode: 1 }, { sparse: true, unique: false });

const User = mongoose.models.User || mongoose.model("User", userSchema);

// ✅ Migration: Fix existing null referralCodes
async function migrateReferralCodes() {
  try {
    const usersWithNullCode = await User.find({ referralCode: null });
    console.log(`🔧 Found ${usersWithNullCode.length} users with null referralCode`);
    
    for (const user of usersWithNullCode) {
      const newCode = `ERAX-${user._id.toString().slice(-8).toUpperCase()}`;
      user.referralCode = newCode;
      await user.save();
      console.log(`✅ Updated ${user.email} with code: ${newCode}`);
    }
  } catch (error) {
    console.error("❌ Migration error:", error);
  }
}

// Run migration on startup (only once)
if (process.env.NODE_ENV !== 'test') {
  migrateReferralCodes();
}

export default User;