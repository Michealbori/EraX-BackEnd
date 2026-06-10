import User from "../../models/User.js";
import AdminLog from "../../models/AdminLog.js";

// GET /api/admin/user-management - Get all users for management
export const getAllUsersForManagement = async (req, res) => {
  try {
    console.log("👥 Fetching all users for management...");

    const users = await User.find({})
      .sort({ createdAt: -1 })
      .lean();

    // Format users to match frontend structure
    const formattedUsers = users.map(user => {
      const lastLogin = user.lastLoginAt || user.createdAt;
      const lastLoginDate = new Date(lastLogin).toISOString().split('T')[0];
      const lastLoginTime = new Date(lastLogin).toTimeString().split(' ')[0];

      return {
        id: user._id,
        name: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A',
        email: user.email,
        tier: user.isAdmin ? 'Level 5 Auth' : user.isVerified ? 'Level 2 Auth' : 'Level 1 Auth',
        lastLoginDate: lastLoginDate,
        lastLoginTime: lastLoginTime,
        location: user.location || 'Unknown',
        ip: user.lastIp || 'N/A',
        status: user.status || 'active',
        isVerified: user.isVerified || false,
        twoStep: user.twoStep !== false,
        createdAt: user.createdAt,
        balances: {
          usdt: (user.balances?.availableLiquidity || 0).toFixed(2),
          btc: ((user.balances?.availableLiquidity || 0) * 0.000015).toFixed(4),
          ltc: ((user.balances?.availableLiquidity || 0) * 0.12).toFixed(2),
          eth: ((user.balances?.availableLiquidity || 0) * 0.0003).toFixed(4)
        },
        stats: {
          totalDeposited: user.balances?.totalDeposited || 0,
          totalWithdrawn: user.balances?.totalWithdrawn || 0,
          totalInvested: user.balances?.totalInvested || 0,
          currentInvestmentValue: user.balances?.currentInvestmentValue || 0,
          totalPortfolio: (user.balances?.availableLiquidity || 0) + (user.balances?.currentInvestmentValue || 0)
        }
      };
    });

    console.log(`✅ Fetched ${formattedUsers.length} users`);

    res.status(200).json({
      success: true,
      users: formattedUsers,
      count: formattedUsers.length
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

// POST /api/admin/user-management - Create new user
export const createUser = async (req, res) => {
  try {
    const { name, email, tier, usdtBalance, btcBalance, ltcBalance, ethBalance } = req.body;

    console.log("➕ Creating new user:", { name, email, tier });

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Parse balances
    const usdt = parseFloat(usdtBalance) || 0;
    const btc = parseFloat(btcBalance) || 0;
    const ltc = parseFloat(ltcBalance) || 0;
    const eth = parseFloat(ethBalance) || 0;

    // Convert crypto to USDT equivalent (mock rates)
    const totalInUsdt = usdt + (btc * 65000) + (ltc * 85) + (eth * 3500);

    // Determine tier settings
    const isAdmin = tier === 'Level 5 Auth';
    const isVerified = tier === 'Level 2 Auth' || tier === 'Level 5 Auth';

    // Create user
    const user = await User.create({
      fullName: name,
      email: email.toLowerCase().trim(),
      password: 'tempPassword123', // Will be changed on first login
      isAdmin: isAdmin,
      isVerified: isVerified,
      status: 'active',
      balances: {
        availableLiquidity: totalInUsdt,
        totalDeposited: totalInUsdt,
        totalWithdrawn: 0,
        netProfitLoss: 0,
        totalInvested: 0,
        currentInvestmentValue: 0
      },
      lastLoginAt: new Date(),
      lastIp: req.ip || '127.0.0.1',
      location: 'Admin Provisioned'
    });

    // Log admin action
    await AdminLog.create({
      action: 'user_created',
      adminId: req.admin?.id || 'admin-system',
      adminEmail: req.admin?.email || 'admin@erax.io',
      targetType: 'user',
      targetId: user._id,
      details: { 
        userEmail: user.email, 
        userName: user.fullName,
        initialBalance: totalInUsdt,
        tier: tier
      },
      success: true
    });

    console.log(`✅ User created: ${user.email}`);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: user._id,
        email: user.email,
        name: user.fullName,
        tier: tier
      }
    });

  } catch (error) {
    console.error("❌ CREATE USER ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      error: error.message
    });
  }
};

// PUT /api/admin/user-management/:id - Update user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, tier, usdtBalance, btcBalance, ltcBalance, ethBalance } = req.body;

    console.log("🔄 Updating user:", id);

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Parse balances
    const usdt = parseFloat(usdtBalance) || 0;
    const btc = parseFloat(btcBalance) || 0;
    const ltc = parseFloat(ltcBalance) || 0;
    const eth = parseFloat(ethBalance) || 0;

    // Convert crypto to USDT equivalent
    const totalInUsdt = usdt + (btc * 65000) + (ltc * 85) + (eth * 3500);

    // Update user fields
    user.fullName = name;
    user.email = email.toLowerCase().trim();
    user.isAdmin = tier === 'Level 5 Auth';
    user.isVerified = tier === 'Level 2 Auth' || tier === 'Level 5 Auth';
    user.balances.availableLiquidity = totalInUsdt;

    await user.save();

    // Log admin action
    await AdminLog.create({
      action: 'user_updated',
      adminId: req.admin?.id || 'admin-system',
      adminEmail: req.admin?.email || 'admin@erax.io',
      targetType: 'user',
      targetId: user._id,
      details: { 
        userEmail: user.email, 
        newBalance: totalInUsdt,
        tier: tier
      },
      success: true
    });

    console.log(`✅ User updated: ${user.email}`);

    res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: {
        id: user._id,
        email: user.email,
        name: user.fullName
      }
    });

  } catch (error) {
    console.error("❌ UPDATE USER ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
      error: error.message
    });
  }
};

// DELETE /api/admin/user-management/:id - Delete user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🗑️ Deleting user:", id);

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    // Log admin action before deletion
    await AdminLog.create({
      action: 'user_deleted',
      adminId: req.admin?.id || 'admin-system',
      adminEmail: req.admin?.email || 'admin@erax.io',
      targetType: 'user',
      targetId: user._id,
      details: { 
        userEmail: user.email, 
        userName: user.fullName
      },
      success: true
    });

    // Delete user
    await User.findByIdAndDelete(id);

    console.log(`✅ User deleted: ${user.email}`);

    res.status(200).json({
      success: true,
      message: "User deleted successfully"
    });

  } catch (error) {
    console.error("❌ DELETE USER ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message
    });
  }
};