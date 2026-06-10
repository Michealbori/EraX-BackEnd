import User from "../../models/User.js";
import AdminLog from "../../models/AdminLog.js";

// GET /api/admin/users - READ all users from database
export const getAllUsers = async (req, res) => {
  try {
    console.log("👥 Fetching all users from database...");
    
    const { page = 1, limit = 50, search, status, role } = req.query;
    
    let query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Status filter
    if (status) {
      query.status = status;
    }
    
    // Role filter
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .select('email fullName balances status createdAt isVerified role lastLogin')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();
    
    const total = await User.countDocuments(query);

    console.log(`✅ Found ${users.length} users (total: ${total})`);

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
      message: "Failed to fetch users from database",
      error: error.message 
    });
  }
};

// PATCH /api/admin/users/:id/status - UPDATE user status
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    
    console.log(`🔄 Updating user ${id} status to: ${status}`);
    
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
        message: "User not found in database" 
      });
    }

    const previousStatus = user.status;
    user.status = status;
    user.statusUpdatedAt = new Date();
    user.statusUpdatedBy = req.adminId || 'system';
    
    if (status === 'suspended' && reason) {
      user.suspensionReason = reason;
    } else if (status === 'active') {
      user.suspensionReason = null;
    }
    
    await user.save();
    
    // Log the action
    await AdminLog.create({
      action: status === 'suspended' ? 'user_suspended' : 'user_activated',
      adminId: req.adminId,
      adminEmail: req.admin?.email || 'system',
      adminRole: req.admin?.role || 'system',
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
    
    console.log(`✅ User ${user.email} status changed to: ${status}`);
    
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
      message: "Failed to update user status",
      error: error.message 
    });
  }
};

// POST /api/admin/users/:id/verify - UPDATE user verification
export const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`✅ Verifying user: ${id}`);
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found in database" 
      });
    }

    user.isVerified = true;
    user.verifiedAt = new Date();
    user.verifiedBy = req.adminId || 'system';
    
    await user.save();
    
    await AdminLog.create({
      action: 'user_verified',
      adminId: req.adminId,
      adminEmail: req.admin?.email || 'system',
      adminRole: req.admin?.role || 'system',
      targetType: 'user',
      targetId: user._id,
      targetEmail: user.email,
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    console.log(`✅ User ${user.email} verified successfully`);
    
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
      message: "Failed to verify user",
      error: error.message 
    });
  }
};

// DELETE /api/admin/users/:id - DELETE user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🗑️ Deleting user: ${id}`);
    
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: "User not found in database" 
      });
    }

    // Soft delete - update status instead of deleting
    user.status = 'deleted';
    user.deletedAt = new Date();
    user.deletedBy = req.adminId || 'system';
    
    await user.save();
    
    await AdminLog.create({
      action: 'user_deleted',
      adminId: req.adminId,
      adminEmail: req.admin?.email || 'system',
      adminRole: req.admin?.role || 'system',
      targetType: 'user',
      targetId: user._id,
      targetEmail: user.email,
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    console.log(`✅ User ${user.email} marked as deleted`);
    
    res.status(200).json({ 
      success: true, 
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error("❌ Delete user error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to delete user",
      error: error.message 
    });
  }
};

// GET /api/admin/users/export - Export real data to CSV
export const exportUsersCSV = async (req, res) => {
  try {
    console.log("📥 Exporting users to CSV...");
    
    const users = await User.find()
      .select('email fullName balances status createdAt isVerified lastLogin')
      .lean();
    
    const headers = ['Email', 'Full Name', 'Available Balance', 'Total Portfolio', 'Status', 'Verified', 'Last Login', 'Joined'];
    
    const rows = users.map(u => [
      u.email || '',
      `"${u.fullName || ''}"`,
      u.balances?.availableLiquidity || 0,
      u.balances?.totalPortfolio || 0,
      u.status || 'active',
      u.isVerified ? 'Yes' : 'No',
      u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-US') : 'Never',
      new Date(u.createdAt).toLocaleDateString('en-US')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    res.setHeader('Content-Type', 'text/csv;charset=utf-8;');
    res.setHeader('Content-Disposition', `attachment; filename="eraX-users-${new Date().toISOString().split('T')[0]}.csv"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    await AdminLog.create({
      action: 'export_data',
      adminId: req.adminId,
      adminEmail: req.admin?.email || 'system',
      adminRole: req.admin?.role || 'system',
      targetType: 'user',
      details: { recordCount: users.length, exportType: 'csv' },
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    console.log(`✅ Exported ${users.length} users to CSV`);
    
    res.status(200).send(csvContent);
    
  } catch (error) {
    console.error("❌ Export error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to export users",
      error: error.message 
    });
  }
};