import jwt from "jsonwebtoken";
import crypto from "crypto";
import Admin from "../../models/Admin.js";
import AdminLog from "../../models/AdminLog.js";

// POST /api/admin/auth/register
export const registerAdmin = async (req, res) => {
  try {
    const { adminName, email, securityClearanceKey, password } = req.body;

    // Validate required fields
    if (!adminName || !email || !securityClearanceKey || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "All registration fields are required." 
      });
    }

    // Validate password complexity
    if (password.length < 12) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 12 characters." 
      });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must contain an uppercase letter." 
      });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must contain a number." 
      });
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must contain a special character." 
      });
    }

    // Validate Security Clearance Key
    const MASTER_CLEARANCE_KEY = process.env.ADMIN_CLEARANCE_KEY;
    
    if (!MASTER_CLEARANCE_KEY) {
      console.error("❌ ADMIN_CLEARANCE_KEY not set in .env");
      return res.status(500).json({ 
        success: false, 
        message: "Server configuration error." 
      });
    }
    
    if (securityClearanceKey !== MASTER_CLEARANCE_KEY) {
      return res.status(403).json({ 
        success: false, 
        message: "Invalid security clearance key. Access denied." 
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ 
      email: email.toLowerCase().trim()
    });
    
    if (existingAdmin) {
      return res.status(409).json({ 
        success: false, 
        message: "An admin with this email already exists." 
      });
    }

    // Check if this is the first admin (auto-approve as super admin)
    const adminCount = await Admin.countDocuments();
    const isFirstAdmin = adminCount === 0;

    // Create new admin
    const newAdmin = await Admin.create({
      fullName: adminName.trim(),
      email: email.toLowerCase().trim(),
      password: password,  // Will be hashed by pre-save hook
      securityClearanceKey: securityClearanceKey,
      role: isFirstAdmin ? 'super_admin' : 'admin',
      status: isFirstAdmin ? 'active' : 'pending_approval',
      permissions: isFirstAdmin ? [
        'manage_users', 'approve_deposits', 'reject_deposits',
        'view_analytics', 'manage_settings', 'export_data',
        'suspend_users', 'view_logs'
      ] : ['view_analytics']
    });

    // Log registration
    await AdminLog.log({
      action: 'admin_registered',
      adminId: newAdmin._id,
      adminEmail: newAdmin.email,
      adminRole: newAdmin.role,
      targetType: 'admin',
      targetId: newAdmin._id,
      details: { 
        isFirstAdmin,
        autoApproved: isFirstAdmin
      },
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    console.log(`✅ New admin registered: ${email} (${isFirstAdmin ? 'SUPER ADMIN' : 'pending approval'})`);

    res.status(201).json({
      success: true,
      message: isFirstAdmin 
        ? "Super admin account created successfully. You can now log in."
        : "Admin registration submitted. Awaiting approval from super admin.",
      admin: {
        id: newAdmin._id,
        email: newAdmin.email,
        fullName: newAdmin.fullName,
        role: newAdmin.role,
        status: newAdmin.status
      }
    });

  } catch (error) {
    console.error("❌ Admin registration error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to register admin." 
    });
  }
};

// POST /api/admin/auth/login
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: "Email and password are required." 
      });
    }

    // Find admin with password field
    const admin = await Admin.findByEmailWithPassword(email);

    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid admin credentials." 
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      await AdminLog.log({
        action: 'admin_login_failed',
        adminId: admin._id,
        adminEmail: admin.email,
        adminRole: admin.role,
        targetType: 'admin',
        targetId: admin._id,
        details: { reason: 'Account locked' },
        success: false,
        errorMessage: 'Login attempt on locked account',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({ 
        success: false, 
        message: "Account is temporarily locked. Try again later." 
      });
    }

    // Check if admin is active
    if (admin.status === 'pending_approval') {
      return res.status(403).json({ 
        success: false, 
        message: "Account pending approval. Contact super admin." 
      });
    }

    if (admin.status === 'suspended') {
      await AdminLog.log({
        action: 'admin_login_failed',
        adminId: admin._id,
        adminEmail: admin.email,
        adminRole: admin.role,
        targetType: 'admin',
        targetId: admin._id,
        details: { reason: 'Account suspended' },
        success: false,
        errorMessage: 'Login attempt on suspended account',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({ 
        success: false, 
        message: "Account is suspended." 
      });
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);
    
    if (!isMatch) {
      await admin.incrementLoginAttempts();
      
      await AdminLog.log({
        action: 'admin_login_failed',
        adminId: admin._id,
        adminEmail: admin.email,
        adminRole: admin.role,
        targetType: 'admin',
        targetId: admin._id,
        details: { reason: 'Invalid password' },
        success: false,
        errorMessage: 'Invalid password attempt',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({ 
        success: false, 
        message: "Invalid admin credentials." 
      });
    }

    // Reset login attempts on successful login
    await admin.resetLoginAttempts();

    // Generate JWT token
    const token = jwt.sign(
      { 
        adminId: admin._id, 
        email: admin.email, 
        role: 'admin',
        adminRole: admin.role
      },
      process.env.JWT_SECRET || 'fallback_secret_key_change_in_production',
      { expiresIn: '24h' }
    );

    // Log successful login
    await AdminLog.log({
      action: 'admin_login',
      adminId: admin._id,
      adminEmail: admin.email,
      adminRole: admin.role,
      targetType: 'admin',
      targetId: admin._id,
      details: { loginTime: new Date() },
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: "Admin authentication successful.",
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        permissions: admin.permissions,
        avatarUrl: admin.avatarUrl
      }
    });

  } catch (error) {
    console.error("❌ Admin login error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Authentication failed." 
    });
  }
};

// POST /api/admin/auth/logout
export const logoutAdmin = async (req, res) => {
  try {
    if (req.admin) {
      await AdminLog.log({
        action: 'admin_logout',
        adminId: req.admin._id,
        adminEmail: req.admin.email,
        adminRole: req.admin.role,
        targetType: 'admin',
        targetId: req.admin._id,
        success: true,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    res.status(200).json({
      success: true,
      message: "Logged out successfully."
    });
  } catch (error) {
    console.error("❌ Logout error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Logout failed." 
    });
  }
};

// GET /api/admin/auth/me
export const getCurrentAdmin = async (req, res) => {
  try {
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        message: "Not authenticated." 
      });
    }

    res.status(200).json({
      success: true,
      admin: {
        id: req.admin._id,
        email: req.admin.email,
        fullName: req.admin.fullName,
        role: req.admin.role,
        permissions: req.admin.permissions,
        avatarUrl: req.admin.avatarUrl,
        lastLogin: req.admin.lastLogin,
        twoFactorEnabled: req.admin.twoFactorEnabled
      }
    });
  } catch (error) {
    console.error("❌ Get current admin error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch admin profile." 
    });
  }
};

// POST /api/admin/auth/change-password
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Current and new passwords are required." 
      });
    }

    // Validate new password
    if (newPassword.length < 12) {
      return res.status(400).json({ 
        success: false, 
        message: "New password must be at least 12 characters." 
      });
    }

    // Get admin with password
    const admin = await Admin.findById(req.adminId).select('+password');
    
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: "Admin not found." 
      });
    }

    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: "Current password is incorrect." 
      });
    }

    // Update password
    admin.password = newPassword;
    admin.lastPasswordChange = new Date();
    await admin.save();

    await AdminLog.log({
      action: 'password_changed',
      adminId: admin._id,
      adminEmail: admin.email,
      adminRole: admin.role,
      targetType: 'admin',
      targetId: admin._id,
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: "Password changed successfully."
    });

  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to change password." 
    });
  }
};

// POST /api/admin/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: "Email is required." 
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase().trim() });

    // Always return success to prevent email enumeration
    if (!admin) {
      return res.status(200).json({
        success: true,
        message: "If an admin account exists with that email, a reset link has been sent."
      });
    }

    // Generate reset token
    const resetToken = admin.generatePasswordReset();
    await admin.save();

    // TODO: Send reset email with token
    // const resetUrl = `${process.env.FRONTEND_URL}/admin/reset-password/${resetToken}`;
    // await sendPasswordResetEmail(admin.email, resetUrl);

    console.log(`📧 Password reset token generated for: ${email}`);
    console.log(`🔗 Reset token: ${resetToken}`); // Remove in production

    res.status(200).json({
      success: true,
      message: "If an admin account exists with that email, a reset link has been sent.",
      // Remove in production - for testing only:
      resetToken
    });

  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to process password reset." 
    });
  }
};

// POST /api/admin/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Token and new password are required." 
      });
    }

    // Validate new password
    if (newPassword.length < 12) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 12 characters." 
      });
    }

    // Find admin with valid reset token
    const admin = await Admin.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!admin) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid or expired reset token." 
      });
    }

    // Update password
    admin.password = newPassword;
    admin.passwordResetToken = null;
    admin.passwordResetExpires = null;
    admin.lastPasswordChange = new Date();
    await admin.save();

    await AdminLog.log({
      action: 'password_changed',
      adminId: admin._id,
      adminEmail: admin.email,
      adminRole: admin.role,
      targetType: 'admin',
      targetId: admin._id,
      details: { method: 'reset_token' },
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in."
    });

  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to reset password." 
    });
  }
};