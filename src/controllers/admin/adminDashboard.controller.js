import User from "../../models/User.js";
import DepositRequest from "../../models/DepositRequest.js";
import Admin from "../../models/Admin.js";
import AdminLog from "../../models/AdminLog.js";

// GET /api/admin/dashboard/stats - REAL DATA FROM DATABASE
export const getAdminStats = async (req, res) => {
  try {
    console.log("📊 Fetching real stats from database...");
    
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      pendingVerifications,
      pendingDeposits,
      confirmedDeposits,
      totalAdmins,
      activeAdmins,
      totalVolume
    ] = await Promise.all([
      // Total users from database
      User.countDocuments(),
      
      // Active users
      User.countDocuments({ status: 'active' }),
      
      // Suspended users
      User.countDocuments({ status: 'suspended' }),
      
      // Pending verifications
      User.countDocuments({ isVerified: false }),
      
      // Pending deposits
      DepositRequest.countDocuments({ status: 'Pending' }),
      
      // Confirmed deposits
      DepositRequest.countDocuments({ status: 'Confirmed' }),
      
      // Total admins
      Admin.countDocuments(),
      
      // Active admins
      Admin.countDocuments({ status: 'active' }),
      
      // Total volume from all users
      User.aggregate([
        { $group: { _id: null, total: { $sum: "$balances.totalPortfolio" } } }
      ])
    ]);

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      suspendedUsers: suspendedUsers || 0,
      pendingVerifications: pendingVerifications || 0,
      pendingDeposits: pendingDeposits || 0,
      confirmedDeposits: confirmedDeposits || 0,
      totalAdmins: totalAdmins || 0,
      activeAdmins: activeAdmins || 0,
      totalVolume: totalVolume[0]?.total || 0
    };

    console.log("✅ Real stats from database:", stats);

    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error("❌ Admin stats error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch statistics from database",
      error: error.message 
    });
  }
};

// GET /api/admin/dashboard/pending-actions - REAL DATA
export const getPendingActions = async (req, res) => {
  try {
    console.log("📋 Fetching pending actions from database...");
    
    const [pendingDeposits, pendingVerifications, pendingAdmins] = await Promise.all([
      // Pending deposits with user info
      DepositRequest.find({ status: 'Pending' })
        .populate('user', 'email fullName')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      
      // Pending user verifications
      User.find({ isVerified: false })
        .select('email fullName createdAt status')
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      
      // Pending admin approvals
      Admin.find({ status: 'pending_approval' })
        .select('email fullName createdAt')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean()
    ]);

    // Format deposits
    const deposits = pendingDeposits.map(d => ({
      id: d._id.toString(),
      type: 'deposit',
      user: d.user || { email: d.email },
      amount: d.amount,
      currency: d.currency,
      network: d.network,
      createdAt: d.createdAt,
      txHash: d.txHash
    }));

    // Format verifications
    const verifications = pendingVerifications.map(v => ({
      id: v._id.toString(),
      type: 'verification',
      user: { email: v.email, fullName: v.fullName },
      status: v.status,
      createdAt: v.createdAt
    }));

    // Format admin approvals
    const adminApprovals = pendingAdmins.map(a => ({
      id: a._id.toString(),
      type: 'admin_approval',
      user: { email: a.email, fullName: a.fullName },
      createdAt: a.createdAt
    }));

    // Combine all pending actions
    const allPending = [...deposits, ...verifications, ...adminApprovals]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`✅ Found ${allPending.length} pending actions:`, {
      deposits: deposits.length,
      verifications: verifications.length,
      adminApprovals: adminApprovals.length
    });

    res.status(200).json({
      success: true,
      pending: allPending,
      counts: {
        deposits: deposits.length,
        verifications: verifications.length,
        adminApprovals: adminApprovals.length
      }
    });
  } catch (error) {
    console.error("❌ Pending actions error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch pending actions",
      error: error.message 
    });
  }
};

// GET /api/admin/dashboard/activities - REAL DATA
export const getAdminActivities = async (req, res) => {
  try {
    console.log("📜 Fetching activity log from database...");
    
    const activities = await AdminLog.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    console.log(`✅ Found ${activities.length} activity logs`);

    res.status(200).json({
      success: true,
      activities,
      count: activities.length
    });
  } catch (error) {
    console.error("❌ Activities error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch activity log",
      error: error.message 
    });
  }
};