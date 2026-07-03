import mongoose from "mongoose";

const InvestmentSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
    index: true 
  },
  
  email: { 
    type: String, 
    required: true, 
    lowercase: true, 
    trim: true, 
    index: true 
  },

  assetClass: { 
    type: String, 
    required: true, 
    enum: ["stocks", "bonds", "commodities"] 
  },
  
  symbol: { type: String, required: true },
  name: { type: String, required: true },
  
  amount: { 
    type: Number, 
    required: true, 
    min: [50, "Minimum investment is $50"] 
  },

  interestAmount: { 
    type: Number, 
    required: true 
  },

  // ✅ NEW: DAILY GROWTH TRACKING
  currentValue: {
    type: Number,
    default: 0
  },
  
  dailyInterestRate: {
    type: Number,
    default: 3.333
  },
  
  totalInterestEarned: {
    type: Number,
    default: 0
  },

  investedAt: { 
    type: Date, 
    default: Date.now 
  },

  totalDays: { 
    type: Number, 
    default: 30 
  },
  completedDays: { 
    type: Number, 
    default: 0 
  },
  startDate: { 
    type: Date, 
    default: Date.now 
  },
  
  expectedEndDate: { 
    type: Date, 
    required: true 
  },
  actualEndDate: { 
    type: Date, 
    required: true 
  },
  
  dailyTasks: [{
    dayNumber: Number,
    date: Date,
    completed: { type: Boolean, default: false },
    completedAt: Date,
    taskCode: String,
    interestEarned: Number
  }],

  lastCheckInDate: { 
    type: Date, 
    default: null 
  },

  claimCode: { 
    type: String, 
    sparse: true, 
    unique: true 
  },
  codeGeneratedAt: Date,
  codeClaimedAt: Date,
  codeExpiresAt: Date,

  interestStatus: {
    type: String,
    enum: ["pending", "code_generated", "claimed"],
    default: "pending"
  },
  
  status: { 
    type: String, 
    enum: ["active", "completed", "claimed", "cancelled", "auto_renewed"], 
    default: "active", 
    index: true 
  },

  transactionId: { 
    type: String, 
    unique: true, 
    sparse: true 
  },

  cycleNumber: {
    type: Number,
    default: 1,
    required: true
  },
  
  parentInvestment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Investment",
    default: null
  },
  
  isAutoRenewed: {
    type: Boolean,
    default: false
  },
  
  profitPaidOut: {
    type: Number,
    default: 0
  }

}, { 
  timestamps: true, 
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

InvestmentSchema.index({ user: 1, status: 1 });
InvestmentSchema.index({ actualEndDate: 1, interestStatus: 1 });
InvestmentSchema.index({ claimCode: 1 });
InvestmentSchema.index({ completedDays: 1 });
InvestmentSchema.index({ cycleNumber: 1 });

export default mongoose.model("Investment", InvestmentSchema);