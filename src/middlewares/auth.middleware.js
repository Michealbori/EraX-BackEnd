import admin from '../config/firebaseAdmin.js';
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// ✅ Firebase Security Clearance (Existing)
export async function checkSecurityClearance(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Access Denied', 
      message: 'No cryptographic token payload submitted with this request pipeline.' 
    });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
    
    next();
  } catch (error) {
    console.error('[AUTH GATE EXCEPTION]:', error.message);
    return res.status(403).json({ 
      error: 'Authentication Cleavage Failure', 
      message: 'Your encryption access token has expired or is structurally corrupted.' 
    });
  }
}

// ✅ JWT Protect Middleware (for API routes) - ✅ ENHANCED WITH LOGGING
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    console.log('🔐 [PROTECT] Route:', req.originalUrl);
    console.log('🔐 [PROTECT] Token exists:', !!token);

    // Check if token exists
    if (!token) {
      console.error('❌ [PROTECT] No token provided');
      return res.status(401).json({
        success: false,
        message: "Not authorized to access this route. Please login."
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ [PROTECT] Token decoded. User ID:', decoded.id);

      // Get user from token
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        console.error('❌ [PROTECT] User not found in database for ID:', decoded.id);
        return res.status(401).json({
          success: false,
          message: "User not found. Token invalid."
        });
      }

      console.log('✅ [PROTECT] User authenticated:', req.user.email);
      next();

    } catch (error) {
      console.error('❌ [PROTECT] Token verification failed:', error.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please login again."
      });
    }

  } catch (error) {
    console.error("❌ [PROTECT] MIDDLEWARE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Server error in authentication"
    });
  }
};

// ✅ Admin Only Middleware
export const adminOnly = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Admin only."
    });
  }
};

// ✅ Verify Admin Token
export const verifyAdminToken = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Admin token required."
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const adminUser = await User.findById(decoded.id);

    if (!adminUser || !adminUser.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }

    req.admin = adminUser;
    next();

  } catch (error) {
    console.error("❌ ADMIN TOKEN ERROR:", error);
    return res.status(401).json({
      success: false,
      message: "Invalid admin token"
    });
  }
};

// ✅ Require Permission
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (req.admin && req.admin.permissions && req.admin.permissions.includes(permission)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: `Permission denied. Required: ${permission}`
      });
    }
  };
};

// ✅ Log Admin Action
export const logAdminAction = (action, targetType) => {
  return async (req, res, next) => {
    req.adminAction = {
      action,
      targetType,
      adminId: req.admin?._id,
      adminEmail: req.admin?.email,
      timestamp: new Date()
    };
    next();
  };
};