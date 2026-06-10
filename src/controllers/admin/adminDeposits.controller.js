import DepositRequest from "../../models/DepositRequest.js";
import User from "../../models/User.js";
import AdminLog from "../../models/AdminLog.js";

// GET /api/admin/deposits - READ all deposits
export const getAllDeposits = async (req, res) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    
    let query = {};
    if (status) {
      query.status = status;
    }
    
    const deposits = await DepositRequest.find(query)
      .populate('user', 'email fullName')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))
      .lean();
    
    const total = await DepositRequest.countDocuments(query);
    
    res.status(200).json({
      success: true,
      deposits,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("❌ Get deposits error:", error);
    res.status(500).json({ message: "Failed to fetch deposits" });
  }
};

// POST /api/admin/deposits/:id - UPDATE deposit status (Approve/Reject)
export const processDeposit = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason } = req.body;
    
    console.log(`🔄 Processing deposit ${id}: ${action}`);
    
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid action" 
      });
    }
    
    const deposit = await DepositRequest.findById(id);
    if (!deposit) {
      return res.status(404).json({ 
        success: false, 
        message: "Deposit not found in database" 
      });
    }
    
    if (deposit.status !== 'Pending') {
      return res.status(400).json({ 
        success: false, 
        message: "Deposit already processed" 
      });
    }

    if (action === 'approve') {
      // Credit user balance
      await User.findByIdAndUpdate(deposit.user, {
        $inc: {
          "balances.availableLiquidity": deposit.amount,
          "balances.totalPortfolio": deposit.amount
        }
      });
      
      deposit.status = 'Confirmed';
      deposit.confirmedAt = new Date();
      deposit.confirmedBy = req.adminId || 'system';
      
    } else {
      deposit.status = 'Rejected';
      deposit.rejectedAt = new Date();
      deposit.rejectedBy = req.adminId || 'system';
      deposit.rejectionReason = reason || 'Admin rejection';
    }
    
    await deposit.save();

    await AdminLog.create({
      action: action === 'approve' ? 'deposit_approved' : 'deposit_rejected',
      adminId: req.adminId,
      adminEmail: req.admin?.email || 'system',
      adminRole: req.admin?.role || 'system',
      targetType: 'deposit',
      targetId: deposit._id,
      targetEmail: deposit.email,
      details: { 
        amount: deposit.amount, 
        currency: deposit.currency,
        action,
        reason 
      },
      success: true,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    console.log(`✅ Deposit ${action}d: $${deposit.amount} ${deposit.currency}`);

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
    console.error("❌ Process deposit error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to process deposit" 
    });
  }
};