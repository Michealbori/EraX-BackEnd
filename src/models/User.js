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
  
  // ✅ OTP FIELDS - CRITICAL FOR VERIFICATION
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
  referralCode: {
    type: String,
    default: null
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
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
    }
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

const User = mongoose.model('User', userSchema);

export default User;