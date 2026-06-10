import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const AdminSchema = new mongoose.Schema({
  // ===== BASIC IDENTITY =====
  fullName: {
    type: String,
    required: [true, "Admin name is required"],
    trim: true,
    minlength: [2, "Name must be at least 2 characters"],
    maxlength: [100, "Name cannot exceed 100 characters"]
  },
  
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    index: true
  },
  
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [12, "Password must be at least 12 characters"],
    select: false
  },

  // ===== ADMIN ROLE & PERMISSIONS =====
  role: {
    type: String,
    enum: ["super_admin", "admin", "moderator"],
    default: "admin",
    index: true
  },
  
  permissions: [{
    type: String,
    enum: [
      "manage_users",
      "approve_deposits",
      "reject_deposits",
      "view_analytics",
      "manage_settings",
      "export_data",
      "suspend_users",
      "view_logs"
    ],
    default: ['view_analytics']
  }],
  
  status: {
    type: String,
    enum: ["active", "suspended", "pending_approval"],
    default: "active",
    index: true
  },

  // ===== SECURITY =====
  securityClearanceKey: {
    type: String,
    required: [true, "Security clearance key is required"]
  },
  
  lastLogin: {
    type: Date,
    default: null
  },
  
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: {
    type: Date,
    default: null
  },
  
  passwordResetToken: {
    type: String,
    default: null
  },
  
  passwordResetExpires: {
    type: Date,
    default: null
  },

  // ===== PROFILE =====
  avatarUrl: {
    type: String,
    default: null
  },
  
  phone: {
    type: String,
    default: null
  },
  
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
  twoFactorSecret: {
    type: String,
    default: null
  },

  // ===== AUDIT FIELDS =====
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    default: null
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    default: null
  },
  
  approvedAt: {
    type: Date,
    default: null
  },
  
  suspendedAt: {
    type: Date,
    default: null
  },
  
  suspendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Admin",
    default: null
  },
  
  suspensionReason: {
    type: String,
    default: null
  },
  
  lastPasswordChange: {
    type: Date,
    default: null
  },
  
  notes: {
    type: String,
    default: null,
    maxlength: 1000
  }

}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.password;
      delete ret.securityClearanceKey;
      delete ret.twoFactorSecret;
      delete ret.passwordResetToken;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// ===== INDEXES =====
AdminSchema.index({ email: 1, role: 1 });
AdminSchema.index({ status: 1, createdAt: -1 });

// ===== VIRTUALS =====
AdminSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

AdminSchema.virtual('isSuperAdmin').get(function() {
  return this.role === 'super_admin';
});

// ✅ RENAMED from "hasPermission" to "checkPermission" to avoid conflict
AdminSchema.virtual('checkPermission').get(function() {
  return (permission) => {
    if (this.role === 'super_admin') return true;
    return this.permissions?.includes(permission) || false;
  };
});

// ===== PRE-SAVE MIDDLEWARE =====
AdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

AdminSchema.pre('save', function(next) {
  if (this.passwordResetExpires && this.passwordResetExpires < new Date()) {
    this.passwordResetToken = null;
    this.passwordResetExpires = null;
  }
  next();
});

// ===== INSTANCE METHODS =====
AdminSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

AdminSchema.methods.incrementLoginAttempts = async function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return await this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.lockUntil) {
    updates.$set = { lockUntil: Date.now() + 60 * 60 * 1000 };
  }
  
  return await this.updateOne(updates);
};

AdminSchema.methods.resetLoginAttempts = async function() {
  return await this.updateOne({
    $set: { loginAttempts: 0, lastLogin: new Date() },
    $unset: { lockUntil: 1 }
  });
};

// ✅ INSTANCE METHOD - This is the correct one to use
AdminSchema.methods.hasPermission = function(permission) {
  if (this.role === 'super_admin') return true;
  return this.permissions?.includes(permission) || false;
};

AdminSchema.methods.generatePasswordReset = function() {
  const crypto = require('crypto');
  this.passwordResetToken = crypto.randomBytes(32).toString('hex');
  this.passwordResetExpires = Date.now() + 3600000;
  return this.passwordResetToken;
};

// ===== STATIC METHODS =====
AdminSchema.statics.findActive = function() {
  return this.find({ status: 'active' }).select('-password -securityClearanceKey');
};

AdminSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ email: email.toLowerCase().trim() }).select('+password');
};

AdminSchema.statics.getStats = async function() {
  return await this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ]);
};

AdminSchema.statics.createSuperAdmin = async function(data) {
  const existingSuper = await this.findOne({ role: 'super_admin' });
  if (existingSuper) {
    throw new Error('Super admin already exists');
  }
  
  return await this.create({
    ...data,
    role: 'super_admin',
    status: 'active',
    permissions: [
      'manage_users', 'approve_deposits', 'reject_deposits',
      'view_analytics', 'manage_settings', 'export_data',
      'suspend_users', 'view_logs'
    ]
  });
};

AdminSchema.statics.findPendingApproval = function() {
  return this.find({ status: 'pending_approval' })
    .select('-password -securityClearanceKey');
};

AdminSchema.statics.approveAdmin = async function(adminId, approvedBy) {
  return await this.findByIdAndUpdate(
    adminId,
    {
      $set: {
        status: 'active',
        approvedBy: approvedBy,
        approvedAt: new Date()
      }
    },
    { new: true, select: '-password -securityClearanceKey' }
  );
};

AdminSchema.statics.suspendAdmin = async function(adminId, suspendedBy, reason) {
  return await this.findByIdAndUpdate(
    adminId,
    {
      $set: {
        status: 'suspended',
        suspendedBy: suspendedBy,
        suspendedAt: new Date(),
        suspensionReason: reason
      }
    },
    { new: true, select: '-password -securityClearanceKey' }
  );
};

export default mongoose.model("Admin", AdminSchema);