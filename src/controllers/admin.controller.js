import User from "../models/User.js";
import Deposit from "../models/Deposit.js"; // ✅ CHANGED from DepositRequest
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
// USER MANAGEMENT CRUD FUNCTIONS
// =====================================================

// POST /api/admin/auth/users - CREATE USER
export const createUserByAdmin = async (req, res) => {
  try {
    const { email, password, fullName, isAdmin = false, isVerified = true } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('👤 [ADMIN CREATE USER] Starting user creation');
    console.log('Email:', email);
    console.log('Full Name:', fullName);
    console.log('='.repeat(60));

    // Validate required fields
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, and full name are required'
      });
    }

    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      console.log('⚠️ User already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
        code: 'EMAIL_EXISTS'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate unique referral code
    let userReferralCode = `ERAX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    let referralCodeExists = await User.findOne({ referralCode: userReferralCode });
    while (referralCodeExists) {
      userReferralCode = `ERAX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      referralCodeExists = await User.findOne({ referralCode: userReferralCode });
    }

    // Create user
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      fullName: fullName.trim(),
      isAdmin: isAdmin,
      isVerified: isVerified,
      authProvider: 'email',
      referralCode: userReferralCode,
      verifiedAt: isVerified ? new Date() : null,
      balances: {
        availableLiquidity: 0,
        lockedInvestment: 0, // ✅ NEW
        totalDeposited: 0,
        totalWithdrawn: 0,
        netProfitLoss: 0,
        totalInvested: 0,
        currentInvestmentValue: 0,
        referralCount: 0,
        referralEarnings: 0
      }
    });

    console.log('✅ User created successfully');
    console.log('User ID:', user._id);
    console.log('Email:', user.email);
    console.log('Admin:', user.isAdmin);
    console.log('Verified:', user.isVerified);
    console.log('Referral Code:', user.referralCode);
    console.log('='.repeat(60) + '\n');

    res.status(201).json({
      success: true,
      message: 'User created successfully by admin',
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        referralCode: user.referralCode
      }
    });

  } catch (error) {
    console.error('\n❌ CREATE USER ERROR:', error);
    console.error('Error stack:', error.stack);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate field detected',
        code: 'DUPLICATE_KEY'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
      error: error.message
    });
  }
};

// PUT /api/admin/auth/users/:id - UPDATE USER
export const updateUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      fullName, 
      email, 
      phone, 
      location, 
      isAdmin, 
      isVerified, 
      twoStep,
      balances 
    } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('✏️ [ADMIN UPDATE USER] ID:', id);
    console.log('='.repeat(60));

    // Find user
    const user = await User.findById(id);
    if (!user) {
      console.log('❌ User not found:', id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Track changes for logging
    const changes = [];

    // Update personal information
    if (fullName !== undefined && fullName !== user.fullName) {
      changes.push(`fullName: ${user.fullName} → ${fullName}`);
      user.fullName = fullName;
    }
    
    if (email !== undefined && email.toLowerCase().trim() !== user.email) {
      // Check if new email is already in use
      const existingEmail = await User.findOne({ 
        email: email.toLowerCase().trim(),
        _id: { $ne: id }
      });
      
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another user'
        });
      }
      
      changes.push(`email: ${user.email} → ${email}`);
      user.email = email.toLowerCase().trim();
    }
    
    if (phone !== undefined) {
      changes.push(`phone: ${user.phone} → ${phone}`);
      user.phone = phone;
    }
    
    if (location !== undefined) {
      changes.push(`location: ${user.location} → ${location}`);
      user.location = location;
    }

    // Update account settings
    if (isAdmin !== undefined && isAdmin !== user.isAdmin) {
      changes.push(`isAdmin: ${user.isAdmin} → ${isAdmin}`);
      user.isAdmin = isAdmin;
    }
    
    if (isVerified !== undefined && isVerified !== user.isVerified) {
      changes.push(`isVerified: ${user.isVerified} → ${isVerified}`);
      user.isVerified = isVerified;
      user.verifiedAt = isVerified ? new Date() : null;
    }
    
    if (twoStep !== undefined && twoStep !== user.twoStep) {
      changes.push(`twoStep: ${user.twoStep} → ${twoStep}`);
      user.twoStep = twoStep;
    }

    // Update financial balances
    if (balances && typeof balances === 'object') {
      const balanceFields = [
        'availableLiquidity',
        'lockedInvestment', // ✅ NEW
        'totalDeposited',
        'totalWithdrawn',
        'netProfitLoss',
        'totalInvested',
        'currentInvestmentValue'
      ];

      balanceFields.forEach(field => {
        if (balances[field] !== undefined) {
          const oldValue = user.balances[field] || 0;
          const newValue = parseFloat(balances[field]) || 0;
          
          if (oldValue !== newValue) {
            changes.push(`${field}: $${oldValue} → $${newValue}`);
            user.balances[field] = newValue;
          }
        }
      });
    }

    // Save user
    await user.save();

    console.log('✅ User updated successfully');
    console.log('Changes made:', changes.length > 0 ? changes.join(', ') : 'No changes');
    console.log('='.repeat(60) + '\n');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        isAdmin: user.isAdmin,
        isVerified: user.isVerified,
        balances: user.balances
      },
      changesMade: changes
    });

  } catch (error) {
    console.error('\n❌ UPDATE USER ERROR:', error);
    console.error('Error stack:', error.stack);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate field detected',
        code: 'DUPLICATE_KEY'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

// DELETE /api/admin/auth/users/:id - DELETE USER
export const deleteUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('\n' + '='.repeat(60));
    console.log('🗑️ [ADMIN DELETE USER] ID:', id);
    console.log('='.repeat(60));

    // Find user
    const user = await User.findById(id);
    if (!user) {
      console.log('❌ User not found:', id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (req.admin && req.admin.id === id) {
      console.log('⚠️ Admin attempted to delete themselves');
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Store user info for response
    const userInfo = {
      id: user._id,
      email: user.email,
      fullName: user.fullName
    };

    // Delete all related data
    console.log('🔄 Deleting related data...');
    
    const [deletedInvestments, deletedDeposits, deletedWithdrawals] = await Promise.all([
      Investment.deleteMany({ user: id }),
      Deposit.deleteMany({ user: id }), // ✅ CHANGED
      Withdrawal.deleteMany({ user: id })
    ]);

    console.log('✅ Deleted investments:', deletedInvestments.deletedCount);
    console.log('✅ Deleted deposits:', deletedDeposits.deletedCount);
    console.log('✅ Deleted withdrawals:', deletedWithdrawals.deletedCount);

    // Delete user
    await User.findByIdAndDelete(id);

    console.log('✅ User deleted successfully');
    console.log('Deleted user:', userInfo.email);
    console.log('='.repeat(60) + '\n');

    res.status(200).json({
      success: true,
      message: 'User and all related data deleted successfully',
      user: userInfo,
      deletedData: {
        investments: deletedInvestments.deletedCount,
        deposits: deletedDeposits.deletedCount,
        withdrawals: deletedWithdrawals.deletedCount
      }
    });

  } catch (error) {
    console.error('\n❌ DELETE USER ERROR:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

// =====================================================
// DASHBOARD FUNCTIONS
// =====================================================

// GET /api/admin/dashboard/stats
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
      Deposit.countDocuments({ status: 'pending' }), // ✅ CHANGED
      Withdrawal.countDocuments({ status: 'pending' }),
      Deposit.aggregate([ // ✅ CHANGED
        { $match: { status: { $in: ['confirmed', 'completed'] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Withdrawal.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Investment.countDocuments({ status: { $in: ['active', 'claimed', 'auto_renewed'] } }) // ✅ UPDATED
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

// GET /api/admin/dashboard/pending-actions
export const getPendingActions = async (req, res) => {
  try {
    console.log("📋 Fetching pending actions...");

    const [pendingDeposits, pendingWithdrawals, pendingVerifications] = await Promise.all([
      Deposit.find({ status: 'pending' }) // ✅ CHANGED from DepositRequest
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
        user: d.user || { email: d.email, fullName: 'Unknown' }, // ✅ Handle missing populate
        amount: d.amount,
        currency: d.currency,
        network: d.network,
        status: d.status,
        createdAt: d.createdAt || d.requestedAt, // ✅ Handle different field names
        details: {
          transactionId: d.transactionId || d.txHash,
          paymentMethod: d.paymentMethod,
          email: d.email,
          screenshotPath: d.screenshotPath // ✅ NEW: Show screenshot info
        }
      })),
      ...pendingWithdrawals.map(w => ({
        id: w._id,
        type: 'withdrawal',
        user: w.user,
        amount: w.amount,
        currency: w.cryptocurrency || w.currency, // ✅ Handle different field names
        status: w.status,
        createdAt: w.requestedAt || w.createdAt,
        details: {
          transactionId: w.transactionId,
          bankName: w.bankName,
          accountNumber: w.accountNumber,
          walletAddress: w.walletAddress // ✅ NEW
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
    console.log(`   - Deposits: ${pendingDeposits.length}`);
    console.log(`   - Withdrawals: ${pendingWithdrawals.length}`);
    console.log(`   - Verifications: ${pendingVerifications.length}`);

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

    const [recentDeposits, recentWithdrawals, recentUsers] = await Promise.all([
      Deposit.find({}) // ✅ CHANGED
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
        user: d.user || { email: d.email, fullName: 'Unknown' }, // ✅ Handle missing populate
        details: { amount: d.amount, currency: d.currency, email: d.email },
        timestamp: d.updatedAt || d.completedAt || d.createdAt, // ✅ Handle different timestamps
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
        details: { amount: w.amount, currency: w.cryptocurrency || w.currency },
        timestamp: w.updatedAt || w.completedAt || w.createdAt,
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
// USER MANAGEMENT FUNCTIONS
// =====================================================

// GET /api/admin/users
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

    // ✅ Enrich user data with stats
    const enrichedUsers = await Promise.all(users.map(async (user) => {
      const [deposits, withdrawals, investments] = await Promise.all([
        Deposit.find({ user: user._id }), // ✅ CHANGED
        Withdrawal.find({ user: user._id }),
        Investment.find({ user: user._id })
      ]);

      const completedDeposits = deposits.filter(d => d.status === 'completed' || d.status === 'confirmed');
      const completedWithdrawals = withdrawals.filter(w => w.status === 'completed');
      const activeInvestments = investments.filter(i => i.status === 'active' || i.status === 'auto_renewed');

      return {
        ...user.toObject(),
        stats: {
          totalPortfolio: user.balances?.totalInvested || 0,
          totalInvestments: activeInvestments.length,
          totalInvested: user.balances?.totalInvested || 0,
          totalDeposits: completedDeposits.length,
          totalDeposited: completedDeposits.reduce((sum, d) => sum + d.amount, 0),
          totalWithdrawals: completedWithdrawals.length,
          totalWithdrawn: completedWithdrawals.reduce((sum, w) => sum + w.amount, 0)
        },
        deposits: deposits.slice(0, 5), // Recent 5 deposits
        withdrawals: withdrawals.slice(0, 5), // Recent 5 withdrawals
        investments: investments.slice(0, 5) // Recent 5 investments
      };
    }));

    console.log(`✅ Found ${users.length} users (page ${page})`);

    res.status(200).json({
      success: true,
      users: enrichedUsers, // ✅ Return enriched data
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

// GET /api/admin/users/:id - Get single user with full details
export const getUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    console.log(`👤 [GET USER DETAILS] ID: ${id}`);

    const user = await User.findById(id).select('-password -otp -otpExpires');
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Fetch all related data
    const [deposits, withdrawals, investments] = await Promise.all([
      Deposit.find({ user: id }).sort({ createdAt: -1 }).limit(10), // ✅ CHANGED
      Withdrawal.find({ user: id }).sort({ createdAt: -1 }).limit(10),
      Investment.find({ user: id }).sort({ investedAt: -1 }).limit(10)
    ]);

    const completedDeposits = deposits.filter(d => d.status === 'completed' || d.status === 'confirmed');
    const completedWithdrawals = withdrawals.filter(w => w.status === 'completed');
    const activeInvestments = investments.filter(i => i.status === 'active' || i.status === 'auto_renewed');

    const enrichedUser = {
      ...user.toObject(),
      stats: {
        totalPortfolio: user.balances?.totalInvested || 0,
        totalInvestments: activeInvestments.length,
        totalInvested: user.balances?.totalInvested || 0,
        totalDeposits: completedDeposits.length,
        deposits: {
          completed: completedDeposits.reduce((sum, d) => sum + d.amount, 0)
        },
        totalWithdrawals: completedWithdrawals.length,
        withdrawals: {
          completed: completedWithdrawals.reduce((sum, w) => sum + w.amount, 0)
        },
        investments: {
          total: activeInvestments.reduce((sum, i) => sum + i.amount, 0),
          currentValue: activeInvestments.reduce((sum, i) => sum + i.amount + i.interestAmount, 0)
        }
      },
      deposits,
      withdrawals,
      investments
    };

    console.log(`✅ User details fetched: ${user.email}`);

    res.status(200).json({
      success: true,
      user: enrichedUser,
      timestamp: new Date()
    });

  } catch (error) {
    console.error("❌ GET USER DETAILS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user details",
      error: error.message
    });
  }
};

// PATCH /api/admin/users/:id/status
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, isVerified, isAdmin } = req.body;

    console.log(`👤 [TOGGLE USER] ID: ${id}`);

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (status !== undefined) {
      user.status = status;
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
        isAdmin: user.isAdmin,
        status: user.status
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
// DEPOSIT & WITHDRAWAL FUNCTIONS
// =====================================================

// POST /api/admin/deposit/:id
export const handleDepositAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;

    console.log(`💰 [DEPOSIT ${action?.toUpperCase()}] ID: ${id}`);

    const deposit = await Deposit.findById(id).populate('user', 'email fullName'); // ✅ CHANGED
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

      // ✅ Add to locked investment (perpetual model)
      user.balances.lockedInvestment = (user.balances.lockedInvestment || 0) + deposit.amount;
      user.balances.totalDeposited = (user.balances.totalDeposited || 0) + deposit.amount;
      user.balances.totalInvested = (user.balances.totalInvested || 0) + deposit.amount;
      
      // Don't add to available liquidity - it goes directly to locked investment
      await user.save();

      deposit.status = 'completed';
      deposit.completedAt = new Date();
      deposit.confirmedAt = new Date();
      await deposit.save();

      // ✅ Auto-create investment
      const startDate = new Date();
      const expectedEndDate = new Date(startDate);
      
      const TESTING_MODE = process.env.NODE_ENV !== 'production';
      if (TESTING_MODE) {
        expectedEndDate.setSeconds(expectedEndDate.getSeconds() + (30 * 20));
      } else {
        expectedEndDate.setDate(expectedEndDate.getDate() + 30);
      }

      const investment = await Investment.create({
        user: user._id,
        email: user.email,
        assetClass: 'stocks',
        symbol: 'STOCKS',
        name: 'Stocks Investment',
        amount: deposit.amount,
        interestAmount: deposit.amount, // 100% ROI
        startDate: startDate,
        expectedEndDate: expectedEndDate,
        actualEndDate: expectedEndDate,
        totalDays: 30,
        completedDays: 0,
        missedDays: 0,
        extensionDays: 0,
        isComplete: false,
        dailyTasks: [],
        interestStatus: 'pending',
        status: 'active',
        transactionId: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        investedAt: startDate,
        cycleNumber: 1,
        parentInvestment: null,
        isAutoRenewed: false,
        profitPaidOut: 0
      });

      deposit.autoInvested = true;
      deposit.investmentId = investment._id;
      await deposit.save();

      console.log(`✅ Deposit approved & Investment created: $${deposit.amount} for ${user.email}`);

      res.status(200).json({
        success: true,
        message: `Deposit of $${deposit.amount} approved and investment created`,
        deposit: {
          id: deposit._id,
          status: deposit.status,
          amount: deposit.amount,
          completedAt: deposit.completedAt
        },
        investment: {
          id: investment._id,
          amount: investment.amount,
          expectedEndDate: investment.expectedEndDate
        },
        userBalance: {
          lockedInvestment: user.balances.lockedInvestment,
          totalInvested: user.balances.totalInvested
        }
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

// POST /api/admin/withdrawal/:id
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

// POST /api/admin/users/:id/verify
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
// EXPORT FUNCTIONS
// =====================================================

// GET /api/admin/users/export
export const exportUsersCSV = async (req, res) => {
  try {
    console.log("📤 Exporting users as CSV...");

    const users = await User.find({})
      .select('email fullName isVerified isAdmin createdAt lastLoginAt balances')
      .sort({ createdAt: -1 });

    const headers = ['Email', 'Full Name', 'Verified', 'Admin', 'Available Balance', 'Locked Investment', 'Total Invested', 'Created At', 'Last Login'];
    const rows = users.map(u => [
      u.email,
      u.fullName || '',
      u.isVerified ? 'Yes' : 'No',
      u.isAdmin ? 'Yes' : 'No',
      `$${(u.balances?.availableLiquidity || 0).toFixed(2)}`,
      `$${(u.balances?.lockedInvestment || 0).toFixed(2)}`,
      `$${(u.balances?.totalInvested || 0).toFixed(2)}`,
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