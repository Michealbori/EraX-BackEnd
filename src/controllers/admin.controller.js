import User from "../models/User.js";
import DepositRequest from "../models/DepositRequest.js";
import Withdrawal from "../models/Withdrawal.js";
import Investment from "../models/Investment.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// =====================================================
// ADMIN AUTHENTICATION FUNCTIONS
// =====================================================

// POST /api/admin/auth/register
export const registerAdmin = async (req, res) => {
  try {
    const { adminName, email, password } = req.body;

    console.log('📝 [ADMIN REGISTER] Attempting registration');
    console.log('Email:', email);
    console.log('Admin Name:', adminName);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ 
      email: email.toLowerCase().trim(),
      isAdmin: true 
    });
    
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Admin already exists with this email' 
      });
    }

    // Validate password strength
    if (password.length < 12) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 12 characters'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const admin = await User.create({
      fullName: adminName,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      isAdmin: true,
      isVerified: true,
      verifiedAt: new Date()
    });

    console.log('✅ Admin created:', admin.email);

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, isAdmin: true, email: admin.email },
      process.env.JWT_SECRET || 'eraX_secret_key_2024',
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        isAdmin: admin.isAdmin
      },
      token
    });

  } catch (error) {
    console.error('❌ ADMIN REGISTER ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register admin',
      error: error.message
    });
  }
};

// POST /api/admin/auth/login
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔑 [ADMIN LOGIN] Email:', email);

    // Find admin user
    const admin = await User.findOne({ 
      email: email.toLowerCase().trim(),
      isAdmin: true 
    });

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials - admin not found'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials - wrong password'
      });
    }

    // Update last login
    admin.lastLoginAt = new Date();
    admin.lastIp = req.ip || req.connection.remoteAddress;
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, isAdmin: true, email: admin.email },
      process.env.JWT_SECRET || 'eraX_secret_key_2024',
      { expiresIn: '30d' }
    );

    console.log('✅ Admin logged in:', admin.email);

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        isAdmin: admin.isAdmin,
        lastLoginAt: admin.lastLoginAt
      },
      token
    });

  } catch (error) {
    console.error('❌ ADMIN LOGIN ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message
    });
  }
};

// =====================================================
// GET /api/admin/dashboard/stats
// =====================================================
export const getDashboardStats = async (req, res) => {
  try {
    console.log("📊 Fetching dashboard stats...");

    const [
      totalUsers,
      activeUsers,
      pendingVerifications,
      pendingDeposits,
      pendingWithdrawals,
      totalDeposits,
      totalWithdrawals,
      totalInvestments
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isVerified: true }),
      User.countDocuments({ isVerified: false }),
      DepositRequest.countDocuments({ status: 'pending' }),
      Withdrawal.countDocuments({ status: 'pending' }),
      DepositRequest.aggregate([
        { $match: { status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Withdrawal.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Investment.countDocuments({ status: { $in: ['active', 'claimed'] } })
    ]);

    const totalDepositVolume = totalDeposits[0]?.total || 0;
    const totalWithdrawalVolume = totalWithdrawals[0]?.total || 0;

    const stats = {
      totalUsers: totalUsers || 0,
      activeUsers: activeUsers || 0,
      pendingVerifications: pendingVerifications || 0,
      pendingDeposits: pendingDeposits || 0,
      pendingWithdrawals: pendingWithdrawals || 0,
      totalVolume: totalDepositVolume || 0,
      totalDeposits: totalDepositVolume || 0,
      totalWithdrawals: totalWithdrawalVolume || 0,
      totalInvestments: totalInvestments || 0
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

// =====================================================
// GET /api/admin/dashboard/pending-actions
// =====================================================
export const getPendingActions = async (req, res) => {
  try {
    console.log("📋 Fetching pending actions...");

    const [pendingDeposits, pendingWithdrawals, pendingVerifications] = await Promise.all([
      DepositRequest.find({ status: 'pending' })
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

    const pending = [
      ...pendingDeposits.map(d => ({
        id: d._id,
        type: 'deposit',
        user: d.user,
        amount: d.amount,
        currency: d.currency,
        network: d.network,
        status: d.status,
        createdAt: d.createdAt,
        details: {
          transactionId: d.transactionId || d.txHash,
          paymentMethod: d.paymentMethod,
          email: d.email
        }
      })),
      ...pendingWithdrawals.map(w => ({
        id: w._id,
        type: 'withdrawal',
        user: w.user,
        amount: w.amount,
        currency: w.currency,
        status: w.status,
        createdAt: w.requestedAt || w.createdAt,
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

// =====================================================
// GET /api/admin/dashboard/activities
// =====================================================
export const getRecentActivities = async (req, res) => {
  try {
    console.log("📜 Fetching recent activities...");

    const [recentDeposits, recentWithdrawals, recentUsers] = await Promise.all([
      DepositRequest.find({})
        .populate('user', 'email fullName')
        .sort({ createdAt: -1 })
        .limit(20),
      Withdrawal.find({})
        .populate('user', 'email fullName')
        .sort({ createdAt: -1 })
        .limit(20),
      User.find({})
        .select('email fullName createdAt isVerified')
        .sort({ createdAt: -1 })
        .limit(20)
    ]);

    const activities = [
      ...recentDeposits.map(d => ({
        id: d._id,
        action: d.status === 'completed' || d.status === 'confirmed' 
          ? 'deposit_approved' 
          : d.status === 'rejected' 
            ? 'deposit_rejected' 
            : 'deposit_pending',
        user: d.user,
        details: { amount: d.amount, currency: d.currency, email: d.email },
        timestamp: d.updatedAt || d.createdAt,
        success: d.status === 'completed' || d.status === 'confirmed'
      })),
      ...recentWithdrawals.map(w => ({
        id: w._id,
        action: w.status === 'completed' 
          ? 'withdrawal_approved' 
          : w.status === 'rejected' 
            ? 'withdrawal_rejected' 
            : 'withdrawal_pending',
        user: w.user,
        details: { amount: w.amount, currency: w.currency },
        timestamp: w.updatedAt || w.createdAt,
        success: w.status === 'completed'
      })),
      ...recentUsers.map(u => ({
        id: u._id,
        action: u.isVerified ? 'user_verified' : 'user_registered',
        user: { email: u.email, fullName: u.fullName },
        details: { email: u.email },
        timestamp: u.createdAt,
        success: true
      }))
    ];

    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log(`✅ Found ${activities.length} activities`);

    res.status(200).json({
      success: true,
      activities: activities.slice(0, 50),
      count: activities.length,
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

// =====================================================
// GET /api/admin/users
// =====================================================
export const getAllUsers = async (req, res) => {
  try {
    console.log("👥 Fetching all users...");

    const { page = 1, limit = 50, search = '' } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (search) {
      query = {
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -otp -otpExpires')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    console.log(`✅ Found ${users.length} users (page ${page})`);

    res.status(200).json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      timestamp: new Date()
    });

  } catch (error) {
    console.error("❌ GET USERS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message
    });
  }
};

// =====================================================
// PATCH /api/admin/users/:id/status
// =====================================================
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified, isAdmin } = req.body;

    console.log(`👤 [TOGGLE USER] ID: ${id}`);

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (isVerified !== undefined) {
      user.isVerified = isVerified;
      user.verifiedAt = isVerified ? new Date() : null;
    }

    if (isAdmin !== undefined) {
      user.isAdmin = isAdmin;
    }

    await user.save();

    console.log(`✅ User updated: ${user.email}`);

    res.status(200).json({
      success: true,
      message: "User status updated successfully",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin
      }
    });

  } catch (error) {
    console.error("❌ TOGGLE USER ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user status",
      error: error.message
    });
  }
};

// =====================================================
// POST /api/admin/deposit/:id
// =====================================================
export const handleDepositAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    console.log(`💰 [DEPOSIT ${action?.toUpperCase()}] ID: ${id}`);

    const deposit = await DepositRequest.findById(id).populate('user', 'email fullName');
    if (!deposit) {
      return res.status(404).json({ success: false, message: "Deposit not found" });
    }

    if (deposit.status !== 'pending' && deposit.status !== 'confirming') {
      return res.status(400).json({ 
        success: false, 
        message: `Deposit already processed (status: ${deposit.status})` 
      });
    }

    if (action === 'approve' || action === 'confirm') {
      const user = await User.findById(deposit.user._id || deposit.user);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      user.balances.availableLiquidity = (user.balances.availableLiquidity || 0) + deposit.amount;
      user.balances.totalDeposited = (user.balances.totalDeposited || 0) + deposit.amount;
      await user.save();

      deposit.status = 'completed';
      deposit.completedAt = new Date();
      deposit.confirmedAt = new Date();
      await deposit.save();

      console.log(`✅ Deposit approved: $${deposit.amount} for ${deposit.email}`);

      res.status(200).json({
        success: true,
        message: `Deposit of $${deposit.amount} approved successfully`,
        deposit: {
          id: deposit._id,
          status: deposit.status,
          amount: deposit.amount,
          completedAt: deposit.completedAt
        },
        userBalance: user.balances.availableLiquidity
      });

    } else if (action === 'reject') {
      deposit.status = 'rejected';
      deposit.rejectionReason = reason || 'Rejected by admin';
      deposit.rejectedAt = new Date();
      await deposit.save();

      console.log(`❌ Deposit rejected: $${deposit.amount}`);

      res.status(200).json({
        success: true,
        message: `Deposit rejected successfully`,
        deposit: {
          id: deposit._id,
          status: deposit.status,
          amount: deposit.amount,
          rejectionReason: deposit.rejectionReason
        }
      });

    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid action. Use 'approve' or 'reject'" 
      });
    }

  } catch (error) {
    console.error("❌ DEPOSIT ACTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process deposit",
      error: error.message
    });
  }
};

// =====================================================
// POST /api/admin/withdrawal/:id
// =====================================================
export const handleWithdrawalAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    console.log(`💸 [WITHDRAWAL ${action?.toUpperCase()}] ID: ${id}`);

    const withdrawal = await Withdrawal.findById(id).populate('user', 'email fullName');
    if (!withdrawal) {
      return res.status(404).json({ success: false, message: "Withdrawal not found" });
    }

    if (withdrawal.status !== 'pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Withdrawal already processed (status: ${withdrawal.status})` 
      });
    }

    if (action === 'approve') {
      const user = await User.findById(withdrawal.user._id || withdrawal.user);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      if ((user.balances.availableLiquidity || 0) < withdrawal.amount) {
        return res.status(400).json({ 
          success: false, 
          message: "Insufficient user balance" 
        });
      }

      user.balances.availableLiquidity -= withdrawal.amount;
      user.balances.totalWithdrawn = (user.balances.totalWithdrawn || 0) + withdrawal.amount;
      await user.save();

      withdrawal.status = 'completed';
      withdrawal.completedAt = new Date();
      await withdrawal.save();

      console.log(`✅ Withdrawal approved: $${withdrawal.amount}`);

      res.status(200).json({
        success: true,
        message: `Withdrawal of $${withdrawal.amount} approved successfully`,
        withdrawal: {
          id: withdrawal._id,
          status: withdrawal.status,
          amount: withdrawal.amount,
          completedAt: withdrawal.completedAt
        },
        userBalance: user.balances.availableLiquidity
      });

    } else if (action === 'reject') {
      withdrawal.status = 'rejected';
      withdrawal.rejectionReason = reason || 'Rejected by admin';
      await withdrawal.save();

      console.log(`❌ Withdrawal rejected: $${withdrawal.amount}`);

      res.status(200).json({
        success: true,
        message: `Withdrawal rejected successfully`,
        withdrawal: {
          id: withdrawal._id,
          status: withdrawal.status,
          amount: withdrawal.amount,
          rejectionReason: withdrawal.rejectionReason
        }
      });

    } else {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid action. Use 'approve' or 'reject'" 
      });
    }

  } catch (error) {
    console.error("❌ WITHDRAWAL ACTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process withdrawal",
      error: error.message
    });
  }
};

// =====================================================
// POST /api/admin/users/:id/verify
// =====================================================
export const verifyUser = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`✅ [USER VERIFY] ID: ${id}`);

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.isVerified = true;
    user.verifiedAt = new Date();
    await user.save();

    console.log(`✅ User verified: ${user.email}`);

    res.status(200).json({
      success: true,
      message: "User verified successfully",
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
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

// =====================================================
// GET /api/admin/users/export
// =====================================================
export const exportUsersCSV = async (req, res) => {
  try {
    console.log("📤 Exporting users as CSV...");

    const users = await User.find({})
      .select('email fullName isVerified isAdmin createdAt lastLoginAt')
      .sort({ createdAt: -1 });

    const headers = ['Email', 'Full Name', 'Verified', 'Admin', 'Created At', 'Last Login'];
    const rows = users.map(u => [
      u.email,
      u.fullName || '',
      u.isVerified ? 'Yes' : 'No',
      u.isAdmin ? 'Yes' : 'No',
      u.createdAt?.toISOString() || '',
      u.lastLoginAt?.toISOString() || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    res.status(200).send(csv);

  } catch (error) {
    console.error("❌ EXPORT CSV ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export users",
      error: error.message
    });
  }
};