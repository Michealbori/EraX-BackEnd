import mongoose from "mongoose";

const DepositRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  email: { type: String, required: true },
  
  amount: { type: Number, required: true, min: 200 },
  currency: { type: String, required: true }, // e.g., "USDT"
  network: { type: String, required: true },  // e.g., "TRC20"
  
  txHash: { type: String }, // Optional: user can paste TxID later
  status: { 
    type: String, 
    enum: ["Pending", "Confirmed", "Rejected", "Expired"],
    default: "Pending"
  },
  
  countdownExpiresAt: { type: Date },
  confirmedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model("DepositRequest", DepositRequestSchema);