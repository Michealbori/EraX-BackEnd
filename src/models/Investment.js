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

  // ✅ INTEREST = 100% OF AMOUNT (MONEY DOUBLES)
  interestAmount: { 
    type: Number, 
    required: true 
  },

  investedAt: { 
    type: Date, 
    default: Date.now 
  },

  // ✅ 30-DAY TASK SYSTEM
  totalDays: { 
    type: Number, 
    default: 30 
  },
  completedDays: { 
    type: Number, 
    default: 0 
  },
  missedDays: { 
    type: Number, 
    default: 0 
  },
  extensionDays: { 
    type: Number, 
    default: 0 
  },
  startDate: { 
    type: Date, 
    default: Date.now 
  },
  
  // ✅ END DATES (Required for maturity check)
  expectedEndDate: { 
    type: Date, 
    required: true 
  },
  actualEndDate: { 
    type: Date, 
    required: true 
  },
  
  // ✅ COMPLETION FLAG (For cron job to find investments)
  isComplete: { 
    type: Boolean, 
    default: false 
  },

  // ✅ DAILY TASK RECORDS
  dailyTasks: [{
    dayNumber: Number,
    date: Date,
    completed: { type: Boolean, default: false },
    completedAt: Date,
    taskCode: String
  }],

  // ✅ CLAIM CODE SYSTEM
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
    enum: ["pending", "code_generated", "claimed", "early_withdrawn"],
    default: "pending"
  },
  
  earlyWithdrawalRequestedAt: { type: Date, default: null },
  earlyWithdrawalPenalty: { type: Number, default: 0 },
  earlyWithdrawalPayout: { type: Number, default: 0 },
  
  status: { 
    type: String, 
    enum: ["active", "completed", "claimed", "cancelled", "early_withdrawn"], 
    default: "active", 
    index: true 
  },

  transactionId: { 
    type: String, 
    unique: true, 
    sparse: true 
  }

}, { 
  timestamps: true, 
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

// Indexes for better query performance
InvestmentSchema.index({ user: 1, status: 1 });
InvestmentSchema.index({ actualEndDate: 1, interestStatus: 1 });
InvestmentSchema.index({ isComplete: 1, claimCode: 1 });

export default mongoose.model("Investment", InvestmentSchema);