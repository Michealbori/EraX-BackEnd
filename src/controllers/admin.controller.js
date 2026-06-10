import User from "../../models/User.js";
import Deposit from "../../models/Deposit.js";
import Withdrawal from "../../models/Withdrawal.js";
import Investment from "../../models/Investment.js";
import AdminLog from "../../models/AdminLog.js";

// GET /api/admin/dashboard/stats
export const getDashboardStats = async (req, res) => {
  try {
    console.log("📊 Fetching dashboard stats...");

    // Get all stats in parallel
    const [
      totalUsers,
      activeUsers,
      pendingVerifications,
      pendingDeposits,
      pendingWithdrawals,
      totalDeposits,
      totalWithdrawals,
      totalInvestments,
      totalAdmins
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ isVerified: false }),
      Deposit.countDocuments({ status: 'pending' }),
      Withdrawal.countDocuments({ status: 'pending' }),
      Deposit.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Withdrawal.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Investment.countDocuments({ status: { $in: ['active', 'claimed'] } }),
      User.countDocuments({ role: 'admin' })
    ]);

    const totalDepositVolume = totalDeposits[0]?.total || 0;
    const totalWithdrawalVolume = totalWithdrawals[0]?.total || 0;
    const totalVolume = totalDepositVolume;

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      pendingVerifications: pendingVerifications || 0,
      pendingDeposits: pendingDeposits || 0,
      pendingWithdrawals: pendingWithdrawals || 0,
      totalVolume: totalVolume || 0,
      totalDeposits: totalDepositVolume || 0,
      totalWithdrawals: totalWithdrawalVolume || 0,
      totalInvestments: totalInvestments || 0,
      totalAdmins: totalAdmins || 0,
      activeAdmins: totalAdmins || 0
    };

    console.log("✅ Stats calculated:", stats);

    res.status(200).json({
      success: true,
      stats,
      timestamp: new Date()
    });

  } catch (error) {
    console.error("❌ GET STATS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard stats",
      error: error.message
    });
  }
};

// GET /api/admin/dashboard/pending-actions
export const getPendingActions = async (req, res) => {
  try {
    console.log("📋 Fetching pending actions...");

    // Get all pending items in parallel
    const [pendingDeposits, pendingWithdrawals, pendingVerifications] = await Promise.all([
      Deposit.find({ status: 'pending' })
        .populate('user', 'email fullName')
        .sort({ createdAt: -1 })
        .limit(50),
      
      Withdrawal.find({ status: 'pending' })
        .populate('user', 'email fullName')
        .sort({ createdAt: -1 })
        .limit(50),
      
      User.find({ isVerified: false })
        .select('email fullName createdAt')
        .sort({ createdAt: -1 })
        .limit(50)
    ]);

    // Format pending actions
    const pending = [
      ...pendingDeposits.map(d => ({
        id: d._id,
        type: 'deposit',
        user: d.user,
        amount: d.amount,
        status: d.status,
        createdAt: d.createdAt,
        details: {
          transactionId: d.transactionId,
          paymentMethod: d.paymentMethod
        }
      })),
      ...pendingWithdrawals.map(w => ({
        id: w._id,
        type: 'withdrawal',
        user: w.user,
        amount: w.amount,
        status: w.status,
        createdAt: w.requestedAt,
        details: {
          transactionId: w.transactionId,
          bankName: w.bankName,
          accountNumber: w.accountNumber
        }
      })),
      ...pendingVerifications.map(u => ({
        id: u._id,
        type: 'verification',
        user: { email: u.email, fullName: u.fullName },
        amount: null,
        status: 'pending',
        createdAt: u.createdAt,
        details: {}
      }))
    ];

    // Sort by date (newest first)
    pending.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log(`✅ Found ${pending.length} pending actions`);

    res.status(200).json({
      success: true,
      pending,
      count: pending.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error("❌ GET PENDING ACTIONS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pending actions",
      error: error.message
    });
  }
};

// GET /api/admin/dashboard/activities
export const getRecentActivities = async (req, res) => {
  try {
    console.log("📜 Fetching recent activities...");

    const activities = await AdminLog.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('user', 'email fullName');

    const formattedActivities = activities.map(log => ({
      id: log._id,
      action: log.action,
      user: log.user,
      admin: log.adminEmail,
      details: log.details,
      timestamp: log.createdAt,
      success: log.success
    }));

    console.log(`✅ Found ${formattedActivities.length} activities`);

    res.status(200).json({
      success: true,
      activities: formattedActivities,
      count: formattedActivities.length,
      timestamp: new Date()
    });

  } catch (error) {
    console.error("❌ GET ACTIVITIES ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch activities",
      error: error.message
    });
  }
};

// POST /api/admin/deposits/:id
export const handleDepositAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminId } = req.body;

    console.log(`💰 [DEPOSIT ${action.toUpperCase()}] ID: ${id}`);

    const deposit = await Deposit.findById(id).populate('user', 'email');
    if (!deposit) {
      return res.status(404).json({ success: false, message: "Deposit not found" });
    }

    if (deposit.status !== 'pending') {
      return res.status(400).json({ success: false, message: "Deposit already processed" });
    }

    if (action === 'approve') {
      // Add to user balance
      const user = await User.findById(deposit.user._id);
      user.balances.availableLiquidity = (user.balances.availableLiquidity || 0) + deposit.amount;
      await user.save();

      deposit.status = 'completed';
      deposit.completedAt = new Date();
      await deposit.save();

      // Log activity
      await AdminLog.create({
        action: 'deposit_approved',
        adminId: adminId,
        adminEmail: req.admin?.email || 'admin',
        targetType: 'deposit',
        targetId: deposit._id,
        details: { amount: deposit.amount, userEmail: deposit.user.email },
        success: true
      });

      console.log(`✅ Deposit approved: $${deposit.amount}`);

    } else if (action === 'reject') {
      deposit.status = 'rejected';
      deposit.rejectionReason = req.body.reason || 'Rejected by admin';
      await deposit.save();

      // Log activity
      await AdminLog.create({
        action: 'deposit_rejected',
        adminId: adminId,
        adminEmail: req.admin?.email || 'admin',
        targetType: 'deposit',
        targetId: deposit._id,
        details: { amount: deposit.amount, userEmail: deposit.user.email },
        success: true
      });

      console.log(`❌ Deposit rejected: $${deposit.amount}`);
    }

    res.status(200).json({
      success: true,
      message: `Deposit ${action}d successfully`,
      deposit: {
        id: deposit._id,
        status: deposit.status,
        amount: deposit.amount
      }
    });

  } catch (error) {
    console.error("❌ DEPOSIT ACTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process deposit",
      error: error.message
    });
  }
};

// POST /api/admin/withdrawals/:id
export const handleWithdrawalAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, adminId } = req.body;

    console.log(`💸 [WITHDRAWAL ${action.toUpperCase()}] ID: ${id}`);

    const withdrawal = await Withdrawal.findById(id).populate('user', 'email');
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal not found" });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ success: false, message: "Withdrawal already processed" });
    }

    if (action === 'approve') {
      // Deduct from user balance
      const user = await User.findById(withdrawal.user._id);
      if ((user.balances.availableLiquidity || 0) < withdrawal.amount) {
        return res.status(400).json({ 
          success: false, 
          message: "Insufficient user balance" 
        });
      }

      user.balances.availableLiquidity -= withdrawal.amount;
      await user.save();

      withdrawal.status = 'completed';
      withdrawal.completedAt = new Date();
      await withdrawal.save();

      // Log activity
      await AdminLog.create({
        action: 'withdrawal_approved',
        adminId: adminId,
        adminEmail: req.admin?.email || 'admin',
        targetType: 'withdrawal',
        targetId: withdrawal._id,
        details: { amount: withdrawal.amount, userEmail: withdrawal.user.email },
        success: true
      });

      console.log(`✅ Withdrawal approved: $${withdrawal.amount}`);

    } else if (action === 'reject') {
      withdrawal.status = 'rejected';
      withdrawal.rejectionReason = req.body.reason || 'Rejected by admin';
      await withdrawal.save();

      // Log activity
      await AdminLog.create({
        action: 'withdrawal_rejected',
        adminId: adminId,
        adminEmail: req.admin?.email || 'admin',
        targetType: 'withdrawal',
        targetId: withdrawal._id,
        details: { amount: withdrawal.amount, userEmail: withdrawal.user.email },
        success: true
      });

      console.log(`❌ Withdrawal rejected: $${withdrawal.amount}`);
    }

    res.status(200).json({
      success: true,
      message: `Withdrawal ${action}d successfully`,
      withdrawal: {
        id: withdrawal._id,
        status: withdrawal.status,
        amount: withdrawal.amount
      }
    });

  } catch (error) {
    console.error("❌ WITHDRAWAL ACTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process withdrawal",
      error: error.message
    });
  }
};

// POST /api/admin/users/:id/verify
export const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { adminId } = req.body;

    console.log(`✅ [USER VERIFY] ID: ${id}`);

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.isVerified = true;
    user.verifiedAt = new Date();
    await user.save();

    // Log activity
    await AdminLog.create({
      action: 'user_verified',
      adminId: adminId,
      adminEmail: req.admin?.email || 'admin',
      targetType: 'user',
      targetId: user._id,
      details: { userEmail: user.email },
      success: true
    });

    console.log(`✅ User verified: ${user.email}`);

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
    console.error("❌ VERIFY USER ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify user",
      error: error.message
    });
  }
};