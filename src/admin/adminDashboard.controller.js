import User from "../../models/User.js";
import DepositRequest from "../../models/DepositRequest.js";
import Admin from "../../models/Admin.js";
import AdminLog from "../../models/AdminLog.js";

// GET /api/admin/dashboard/stats
export const getAdminStats = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      pendingVerifications,
      pendingDeposits,
      totalVolume,
      totalAdmins,
      activeAdmins
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: { $ne: 'suspended' } }),
      User.countDocuments({ isVerified: false }),
      DepositRequest.countDocuments({ status: 'Pending' }),
      User.aggregate([
        { $group: { _id: null, total: { $sum: "$balances.totalPortfolio" } } }
      ]),
      Admin.countDocuments(),
      Admin.countDocuments({ status: 'active' })
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        pendingVerifications: pendingVerifications || 0,
        pendingDeposits: pendingDeposits || 0,
        totalVolume: totalVolume[0]?.total || 0,
        totalAdmins: totalAdmins || 0,
        activeAdmins: activeAdmins || 0
      }
    });
  } catch (error) {
    console.error("❌ Admin stats error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch admin statistics" 
    });
  }
};

// GET /api/admin/dashboard/pending-actions
export const getPendingActions = async (req, res) => {
  try {
    const [pendingDeposits, pendingVerifications, pendingAdmins] = await Promise.all([
      DepositRequest.find({ status: 'Pending' })
        .populate('user', 'email fullName')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      
      User.find({ isVerified: false })
        .select('email fullName createdAt')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      
      Admin.find({ status: 'pending_approval' })
        .select('email fullName createdAt')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    const deposits = pendingDeposits.map(d => ({
      id: d._id.toString(),
      type: 'deposit',
      user: d.user || { email: d.email },
      amount: d.amount,
      currency: d.currency,
      createdAt: d.createdAt
    }));

    const verifications = pendingVerifications.map(v => ({
      id: v._id.toString(),
      type: 'verification',
      user: { email: v.email, fullName: v.fullName },
      createdAt: v.createdAt
    }));

    const adminApprovals = pendingAdmins.map(a => ({
      id: a._id.toString(),
      type: 'admin_approval',
      user: { email: a.email, fullName: a.fullName },
      createdAt: a.createdAt
    }));

    const allPending = [...deposits, ...verifications, ...adminApprovals]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({
      success: true,
      pending: allPending
    });
  } catch (error) {
    console.error("❌ Pending actions error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch pending actions" 
    });
  }
};

// GET /api/admin/dashboard/activities
export const getAdminActivities = async (req, res) => {
  try {
    const activities = await AdminLog.getRecent(50);

    const formatted = activities.map(log => ({
      id: log._id.toString(),
      action: log.action,
      admin: log.adminEmail,
      adminRole: log.adminRole,
      target: log.targetEmail || log.targetId,
      targetType: log.targetType,
      details: log.details,
      success: log.success,
      timestamp: log.createdAt,
      ipAddress: log.ipAddress
    }));

    res.status(200).json({
      success: true,
      activities: formatted
    });
  } catch (error) {
    console.error("❌ Activities error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch activity log" 
    });
  }
};