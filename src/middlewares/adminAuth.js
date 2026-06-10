import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";
import AdminLog from "../models/AdminLog.js";

// Verify admin JWT token
export const verifyAdminToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: "Access denied. No token provided." 
      });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback_secret_key_change_in_production'
    );

    if (decoded.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: "Access denied. Admin privileges required." 
      });
    }

    const admin = await Admin.findById(decoded.adminId);
    
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: "Admin account not found." 
      });
    }

    if (admin.status !== 'active') {
      return res.status(403).json({ 
        success: false, 
        message: `Admin account is ${admin.status}.` 
      });
    }

    req.admin = admin;
    req.adminId = admin._id;
    req.adminRole = admin.role;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: "Token expired. Please log in again." 
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid token." 
      });
    }
    
    console.error("Admin auth error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Authentication failed." 
    });
  }
};

// Check specific permission
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        message: "Authentication required." 
      });
    }

    if (req.admin.role === 'super_admin') {
      return next();
    }

    if (!req.admin.permissions?.includes(permission)) {
      AdminLog.log({
        action: 'permission_denied',
        adminId: req.admin._id,
        adminEmail: req.admin.email,
        adminRole: req.admin.role,
        targetType: 'system',
        details: { 
          attemptedPermission: permission,
          path: req.path,
          method: req.method
        },
        success: false,
        errorMessage: `Missing permission: ${permission}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({ 
        success: false, 
        message: `Insufficient permissions. Required: ${permission}` 
      });
    }

    next();
  };
};

// Log admin action middleware
export const logAdminAction = (action, targetType = 'system') => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      AdminLog.log({
        action,
        adminId: req.admin?._id,
        adminEmail: req.admin?.email || 'system',
        adminRole: req.admin?.role || 'system',
        targetType,
        targetId: req.params?.id || req.body?.targetId || null,
        targetEmail: req.body?.email || null,
        details: {
          path: req.path,
          method: req.method,
          body: req.body,
          params: req.params,
          query: req.query
        },
        success: data.success !== false,
        errorMessage: data.message && !data.success ? data.message : null,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return originalJson(data);
    };
    
    next();
  };
};

// Rate limiting for admin routes
export const adminRateLimiter = (req, res, next) => {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 100;
  
  if (!global.adminRateLimits) {
    global.adminRateLimits = new Map();
  }
  
  const ip = req.ip;
  const requests = global.adminRateLimits.get(ip) || [];
  const recentRequests = requests.filter(time => now - time < windowMs);
  
  if (recentRequests.length >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later."
    });
  }
  
  recentRequests.push(now);
  global.adminRateLimits.set(ip, recentRequests);
  
  next();
};