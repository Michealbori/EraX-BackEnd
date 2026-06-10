import User from "../../models/User.js";
import Admin from "../../models/Admin.js";
import AdminLog from "../../models/AdminLog.js";

// GET /api/admin/users
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, status, role } = req.query;
    
    let query = {};
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) {
      query.status = status;
    }
    
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('email fullName balances status createdAt isVerified role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    
    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("❌ Get users error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch users" 
    });
  }
};

// PATCH /api/admin/users/:id/status
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid status. Must be 'active' or 'suspended'" 
      });
    }
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    const previousStatus = user.status;
    user.status = status;
    user.statusUpdatedAt = new Date();
    user.statusUpdatedBy = req.adminId;
    
    if (status === 'suspended' && reason) {
      user.suspensionReason = reason;
    }
    
    await user.save();
    
    await AdminLog.log({
      action: status === 'suspended' ? 'user_suspended' : 'user_activated',
      adminId: req.adminId,
      adminEmail: req.admin.email,
      adminRole: req.admin.role,
      targetType: 'user',
      targetId: user._id,
      targetEmail: user.email,
      details: { 
        previousStatus,
        newStatus: status,
        reason
      },
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({ 
      success: true, 
      message: `User ${status} successfully`,
      user: {
        id: user._id,
        email: user.email,
        status: user.status
      }
    });
  } catch (error) {
    console.error("❌ Toggle user status error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update user status" 
    });
  }
};

// POST /api/admin/users/:id/verify
export const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    user.isVerified = true;
    user.verifiedAt = new Date();
    user.verifiedBy = req.adminId;
    
    await user.save();
    
    await AdminLog.log({
      action: 'user_verified',
      adminId: req.adminId,
      adminEmail: req.admin.email,
      adminRole: req.admin.role,
      targetType: 'user',
      targetId: user._id,
      targetEmail: user.email,
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({ 
      success: true, 
      message: "User verified successfully",
      user: {
        id: user._id,
        email: user.email,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error("❌ Verify user error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to verify user" 
    });
  }
};

// GET /api/admin/users/export
export const exportUsersCSV = async (req, res) => {
  try {
    const users = await User.find()
      .select('email fullName balances status createdAt isVerified')
      .lean();
    
    const headers = ['Email', 'Full Name', 'Available Balance', 'Total Portfolio', 'Status', 'Verified', 'Joined'];
    
    const rows = users.map(u => [
      u.email || '',
      `"${u.fullName || ''}"`,
      u.balances?.availableLiquidity || 0,
      u.balances?.totalPortfolio || 0,
      u.status || 'active',
      u.isVerified ? 'Yes' : 'No',
      new Date(u.createdAt).toLocaleDateString('en-US')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv;charset=utf-8;');
    res.setHeader('Content-Disposition', `attachment; filename="eraX-users-${new Date().toISOString().split('T')[0]}.csv"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    await AdminLog.log({
      action: 'export_data',
      adminId: req.adminId,
      adminEmail: req.admin.email,
      adminRole: req.admin.role,
      targetType: 'user',
      details: { recordCount: users.length },
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).send(csvContent);
    
  } catch (error) {
    console.error("❌ Export error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to export users" 
    });
  }
};

// GET /api/admin/admins
export const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('-password -securityClearanceKey -twoFactorSecret')
      .sort({ createdAt: -1 })
      .lean();
    
    res.status(200).json({
      success: true,
      admins
    });
  } catch (error) {
    console.error("❌ Get admins error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch admins" 
    });
  }
};

// POST /api/admin/admins/:id/approve
export const approveAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;
    
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: "Admin not found" 
      });
    }

    if (admin.status !== 'pending_approval') {
      return res.status(400).json({ 
        success: false, 
        message: "Admin is not pending approval" 
      });
    }

    admin.status = 'active';
    admin.approvedBy = req.adminId;
    admin.approvedAt = new Date();
    admin.permissions = permissions || ['view_analytics'];
    
    await admin.save();
    
    await AdminLog.log({
      action: 'admin_approved',
      adminId: req.adminId,
      adminEmail: req.admin.email,
      adminRole: req.admin.role,
      targetType: 'admin',
      targetId: admin._id,
      targetEmail: admin.email,
      details: { permissions: admin.permissions },
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({ 
      success: true, 
      message: "Admin approved successfully",
      admin: {
        id: admin._id,
        email: admin.email,
        fullName: admin.fullName,
        status: admin.status,
        permissions: admin.permissions
      }
    });
  } catch (error) {
    console.error("❌ Approve admin error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to approve admin" 
    });
  }
};

// PATCH /api/admin/admins/:id/status
export const toggleAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid status" 
      });
    }
    
    const admin = await Admin.findById(id);
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: "Admin not found" 
      });
    }

    // Prevent suspending super admin
    if (admin.role === 'super_admin' && status === 'suspended') {
      return res.status(403).json({ 
        success: false, 
        message: "Cannot suspend super admin" 
      });
    }

    // Prevent self-suspension
    if (admin._id.toString() === req.adminId.toString()) {
      return res.status(400).json({ 
        success: false, 
        message: "Cannot change your own status" 
      });
    }

    admin.status = status;
    
    if (status === 'suspended') {
      admin.suspendedAt = new Date();
      admin.suspendedBy = req.adminId;
      admin.suspensionReason = reason || 'Suspended by admin';
    } else {
      admin.suspendedAt = null;
      admin.suspendedBy = null;
      admin.suspensionReason = null;
    }
    
    await admin.save();
    
    await AdminLog.log({
      action: status === 'suspended' ? 'admin_suspended' : 'admin_activated',
      adminId: req.adminId,
      adminEmail: req.admin.email,
      adminRole: req.admin.role,
      targetType: 'admin',
      targetId: admin._id,
      targetEmail: admin.email,
      details: { reason },
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.status(200).json({ 
      success: true, 
      message: `Admin ${status} successfully`
    });
  } catch (error) {
    console.error("❌ Toggle admin status error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update admin status" 
    });
  }
};