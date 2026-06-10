import mongoose from "mongoose";

const WithdrawalSchema = new mongoose.Schema({
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
  
  amount: {
    type: Number,
    required: true,
    min: [50, "Minimum withdrawal is $50"]
  },
  
  // Bank details
  accountNumber: {
    type: String,
    required: true,
    trim: true
  },
  
  bankName: {
    type: String,
    required: true,
    trim: true
  },
  
  accountName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Status tracking
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "rejected"],
    default: "pending",
    index: true
  },
  
  // Timeline
  requestedAt: {
    type: Date,
    default: Date.now
  },
  
  countdownEndsAt: {
    type: Date,
    required: true
  },
  
  completedAt: {
    type: Date,
    default: null
  },
  
  // Admin info
  processedBy: {
    type: String,
    default: null
  },
  
  adminNotes: {
    type: String,
    default: null,
    maxlength: 500
  },
  
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  rejectionReason: {
    type: String,
    default: null
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
WithdrawalSchema.index({ user: 1, status: 1 });
WithdrawalSchema.index({ email: 1, createdAt: -1 });
WithdrawalSchema.index({ countdownEndsAt: 1, status: 1 });

// Virtual: Check if countdown has expired
WithdrawalSchema.virtual('isCountdownExpired').get(function() {
  return new Date() > this.countdownEndsAt;
});

// Virtual: Minutes remaining
WithdrawalSchema.virtual('minutesRemaining').get(function() {
  const diff = this.countdownEndsAt - new Date();
  return Math.max(0, Math.floor(diff / (1000 * 60)));
});

export default mongoose.model("Withdrawal", WithdrawalSchema);