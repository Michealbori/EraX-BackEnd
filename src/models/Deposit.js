import mongoose from "mongoose";

const DepositSchema = new mongoose.Schema({
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
    min: [50, "Minimum deposit is $50"] 
  },
  
  paymentMethod: { 
    type: String, 
    required: true,
    enum: ["bank_transfer", "crypto", "card", "other"]
  },
  
  transactionReference: { 
    type: String, 
    required: true 
  },
  
  status: { 
    type: String, 
    enum: ["pending", "completed", "rejected", "cancelled"], 
    default: "pending",
    index: true 
  },
  
  transactionId: { 
    type: String, 
    unique: true, 
    sparse: true 
  },
  
  requestedAt: { 
    type: Date, 
    default: Date.now 
  },
  
  completedAt: { 
    type: Date, 
    default: null 
  },
  
  adminNotes: { 
    type: String, 
    default: "" 
  },
  
  rejectionReason: { 
    type: String, 
    default: "" 
  }

}, { 
  timestamps: true, 
  toJSON: { virtuals: true }, 
  toObject: { virtuals: true } 
});

// Indexes for better query performance
DepositSchema.index({ user: 1, status: 1 });
DepositSchema.index({ email: 1, status: 1 });
DepositSchema.index({ transactionId: 1 });

export default mongoose.model("Deposit", DepositSchema);