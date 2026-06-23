import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Verification from '../models/Verification.js';
import User from '../models/User.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../../uploads/verifications');
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Get verification status
router.get('/status/:email', async (req, res) => {
  try {
    const { email } = req.params;
    
    const verification = await Verification.findOne({ email });
    
    if (!verification) {
      return res.json({ 
        success: true, 
        verification: null 
      });
    }
    
    res.json({ 
      success: true, 
      verification 
    });
  } catch (error) {
    console.error("Status check error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Submit verification documents
router.post('/submit', upload.fields([
  { name: 'faceImage', maxCount: 1 },
  { name: 'idImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { 
      email, 
      idType, 
      idNumber, 
      fullName, 
      dateOfBirth, 
      address, 
      city, 
      country, 
      postalCode 
    } = req.body;

    if (!req.files.faceImage || !req.files.idImage) {
      return res.status(400).json({ message: 'Both face and ID images are required' });
    }

    const faceImagePath = `/uploads/verifications/${req.files.faceImage[0].filename}`;
    const idImagePath = `/uploads/verifications/${req.files.idImage[0].filename}`;

    // Check if verification already exists
    const existingVerification = await Verification.findOne({ email });
    if (existingVerification) {
      if (existingVerification.status === 'pending' || existingVerification.status === 'approved') {
        return res.status(400).json({ 
          message: `Verification already ${existingVerification.status}` 
        });
      }
    }

    // Create or update verification
    const verification = await Verification.findOneAndUpdate(
      { email },
      {
        email,
        idType,
        idNumber,
        personalInfo: {
          fullName,
          dateOfBirth,
          address,
          city,
          country,
          postalCode
        },
        faceImagePath,
        idImagePath,
        status: 'pending',
        submittedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ 
      success: true, 
      message: 'Verification documents submitted successfully',
      verification 
    });
  } catch (error) {
    console.error("Submission error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Admin: Approve/Reject verification
router.patch('/review/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const verification = await Verification.findById(id);
    if (!verification) {
      return res.status(404).json({ message: 'Verification not found' });
    }

    verification.status = status;
    verification.reviewedBy = req.user?.email || 'admin';
    verification.reviewedAt = new Date();
    
    if (status === 'rejected') {
      verification.rejectionReason = rejectionReason;
    }

    await verification.save();

    // If approved, update user verification status
    if (status === 'approved') {
      await User.findOneAndUpdate(
        { email: verification.email },
        { 
          $set: { 
            isVerified: true,
            verifiedAt: new Date()
          }
        }
      );
    }

    res.json({ 
      success: true, 
      message: `Verification ${status}`,
      verification 
    });
  } catch (error) {
    console.error("Review error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;