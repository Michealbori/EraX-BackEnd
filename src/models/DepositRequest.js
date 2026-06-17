import mongoose from "mongoose";

const DepositRequestSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  email: { 
    type: String, 
    required: true 
  },
  
  amount: { 
    type: Number, 
    required: true, 
    min: 200 
  },
  currency: { 
    type: String, 
    required: true,
    default: "USDT"
  },
  network: { 
    type: String, 
    required: true 
  },
  
  // ✅ Added fields for admin controller
  transactionId: { 
    type: String, 
    default: null 
  },
  txHash: { 
    type: String, 
    default: null 
  },
  paymentMethod: { 
    type: String, 
    default: null 
  },
  addressUsed: { 
    type: String, 
    default: null 
  },
  screenshotPath: { 
    type: String, 
    default: null 
  },
  
  // ✅ Standardized status (lowercase for consistency)
  status: { 
    type: String, 
    enum: ["pending", "confirming", "confirmed", "completed", "rejected", "expired"],
    default: "pending"
  },
  
  // ✅ Added admin action fields
  rejectionReason: { 
    type: String, 
    default: null 
  },
  adminNotes: { 
    type: String, 
    default: null 
  },
  
  // ✅ Timestamps
  countdownExpiresAt: { 
    type: Date, 
    default: null 
  },
  confirmedAt: { 
    type: Date, 
    default: null 
  },
  completedAt: { 
    type: Date, 
    default: null 
  },
  rejectedAt: { 
    type: Date, 
    default: null 
  }
}, { 
  timestamps: true 
});

// Indexes for faster queries
DepositRequestSchema.index({ status: 1 });
DepositRequestSchema.index({ user: 1 });
DepositRequestSchema.index({ email: 1 });
DepositRequestSchema.index({ createdAt: -1 });

const DepositRequest = mongoose.models.DepositRequest || mongoose.model("DepositRequest", DepositRequestSchema);

export default DepositRequest;