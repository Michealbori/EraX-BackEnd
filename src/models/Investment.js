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

  investedAt: { 
    type: Date, 
    default: Date.now 
  },
  
  maturityDate: { 
    type: Date, 
    required: true 
  },

  interestStatus: {
    type: String,
    enum: ["pending", "survey_assigned", "survey_completed", "claimed", "early_withdrawn"],
    default: "pending"
  },
  
  assignedQuestions: [{
    questionId: Number,
    questionText: String,
    options: [String]
  }],
  
  surveyResponses: { 
    type: Map, 
    of: String, 
    default: {} 
  },
  
  surveyCompletedAt: { type: Date, default: null },
  interestClaimedAt: { type: Date, default: null },
  
  earlyWithdrawalRequestedAt: { type: Date, default: null },
  earlyWithdrawalPenalty: { type: Number, default: 0 },
  earlyWithdrawalPayout: { type: Number, default: 0 },
  
  status: { 
    type: String, 
    enum: ["active", "matured", "claimed", "cancelled", "early_withdrawn"], 
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

// ✅ ADD THIS METHOD
InvestmentSchema.methods.updateValue = function() {
  const now = new Date();
  const investedDate = this.investedAt;
  
  // Calculate days since investment
  const daysSinceInvestment = Math.floor(
    (now - investedDate) / (1000 * 60 * 60 * 24)
  );
  
  // Calculate growth (100% return over 30 days = ~3.33% per day)
  // Or you can use a different growth model
  const dailyGrowthRate = 1.0333; // 3.33% daily growth
  const growthMultiplier = Math.pow(dailyGrowthRate, daysSinceInvestment);
  
  // Calculate current value
  const currentValue = this.amount * growthMultiplier;
  const totalGrowth = currentValue - this.amount;
  
  // Update the document
  this.currentValue = currentValue;
  this.totalGrowth = totalGrowth;
  this.growthPercentage = ((totalGrowth / this.amount) * 100).toFixed(2);
  this.lastUpdated = now;
  
  return this.save();
};

// Indexes
InvestmentSchema.index({ user: 1, status: 1 });
InvestmentSchema.index({ maturityDate: 1, interestStatus: 1 });

// Virtuals
InvestmentSchema.virtual('isMatured').get(function() {
  return new Date() >= this.maturityDate;
});

InvestmentSchema.virtual('daysUntilMaturity').get(function() {
  const diff = this.maturityDate - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
});

InvestmentSchema.virtual('daysSinceInvestment').get(function() {
  const diff = new Date() - this.investedAt;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

export default mongoose.model("Investment", InvestmentSchema);