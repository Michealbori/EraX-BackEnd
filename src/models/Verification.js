import mongoose from "mongoose";

const VerificationSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true 
  },
  
  // ID Information
  idType: { 
    type: String, 
    required: true,
    enum: ['passport', 'drivers_license', 'national_id']
  },
  idNumber: { 
    type: String, 
    required: true 
  },
  
  // Personal Information
  personalInfo: {
    fullName: { type: String, required: true },
    dateOfBirth: { type: Date, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    country: { type: String, required: true },
    postalCode: { type: String, required: true }
  },
  
  // File Paths
  faceImagePath: { 
    type: String, 
    required: true 
  },
  idImagePath: { 
    type: String, 
    required: true 
  },
  
  // Verification Status
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  
  // Admin Review Fields
  reviewedBy: { type: String },
  reviewedAt: { type: Date },
  rejectionReason: { type: String },
  
  submittedAt: { 
    type: Date, 
    default: Date.now 
  }
}, { 
  timestamps: true 
});

// Create index for faster queries
VerificationSchema.index({ email: 1 });
VerificationSchema.index({ status: 1 });

export default mongoose.model("Verification", VerificationSchema);