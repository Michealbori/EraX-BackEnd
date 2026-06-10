import mongoose from "mongoose";

const AdminLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    index: true
  },
  
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    required: true,
    index: true
  },
  
  adminEmail: {
    type: String,
    required: true,
    lowercase: true
  },
  
  adminRole: {
    type: String,
    required: true
  },
  
  targetType: {
    type: String,
    enum: ["user", "deposit", "admin", "system", "settings"],
    required: true
  },
  
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  
  targetEmail: {
    type: String,
    default: null
  },
  
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  ipAddress: {
    type: String,
    default: null
  },
  
  userAgent: {
    type: String,
    default: null
  },
  
  success: {
    type: Boolean,
    default: true
  },
  
  errorMessage: {
    type: String,
    default: null
  }

}, {
  timestamps: true
});

AdminLogSchema.index({ createdAt: -1 });

AdminLogSchema.statics.log = async function(data) {
  try {
    return await this.create(data);
  } catch (error) {
    console.error("Failed to log admin action:", error);
    return null;
  }
};

AdminLogSchema.statics.getRecent = async function(limit = 50) {
  return await this.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

export default mongoose.model("AdminLog", AdminLogSchema);