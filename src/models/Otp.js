import mongoose from "mongoose";

const otpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true, // Faster lookups by email
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      enum: ['registration', 'login', 'email_change', 'password_reset'],
      default: 'login',
    },
    createdAt: {
      type: Date,
      default: Date.now,
      // Auto-delete after 10 minutes (600 seconds) for email_change, 5 min for others
      expires: 600, 
    },
    expiresAt: {
      type: Date,
      // Optional explicit expiration for more control
      default: function() {
        return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes default
      }
    },
    isUsed: {
      type: Boolean,
      default: false,
    },
  },
  { 
    timestamps: true,
    // Ensure one active OTP per email+purpose combination
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Compound index for faster unique lookups
otpSchema.index({ email: 1, purpose: 1, isUsed: 1 }, { partialFilterExpression: { isUsed: false } });

// Virtual for checking if OTP is expired
otpSchema.virtual('isExpired').get(function() {
  return this.expiresAt < new Date();
});

// Pre-save middleware to ensure expiresAt is set
otpSchema.pre('save', function(next) {
  if (!this.expiresAt) {
    const ttlMinutes = this.purpose === 'email_change' ? 10 : 5;
    this.expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  }
  next();
});

const OtpRecord = mongoose.models.Otp || mongoose.model("Otp", otpSchema);
export default OtpRecord;