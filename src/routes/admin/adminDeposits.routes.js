import express from "express";
import DepositRequest from "../../models/DepositRequest.js";
import User from "../../models/User.js";
import AdminLog from "../../models/AdminLog.js";
import { 
  verifyAdminToken, 
  requirePermission,
  logAdminAction 
} from "../../middlewares/adminAuth.js";

const router = express.Router();

// All routes require admin authentication
router.use(verifyAdminToken);

// POST /api/admin/deposits/:id
router.post(
  "/:id", 
  requirePermission('approve_deposits'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { action, reason } = req.body;
      
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
          message: "Deposit not found" 
        });
      }
      
      if (deposit.status !== 'Pending') {
        return res.status(400).json({ 
          success: false, 
          message: "Deposit already processed" 
        });
      }

      if (action === 'approve') {
        await User.findByIdAndUpdate(deposit.user, {
          $inc: {
            "balances.availableLiquidity": deposit.amount,
            "balances.totalPortfolio": deposit.amount
          }
        });
        
        deposit.status = 'Confirmed';
        deposit.confirmedAt = new Date();
        deposit.confirmedBy = req.adminId;
        
      } else {
        deposit.status = 'Rejected';
        deposit.rejectedAt = new Date();
        deposit.rejectedBy = req.adminId;
        deposit.rejectionReason = reason || 'Admin rejection';
      }
      
      await deposit.save();

      await AdminLog.log({
        action: action === 'approve' ? 'deposit_approved' : 'deposit_rejected',
        adminId: req.adminId,
        adminEmail: req.admin.email,
        adminRole: req.admin.role,
        targetType: 'deposit',
        targetId: deposit._id,
        targetEmail: deposit.email,
        details: { 
          amount: deposit.amount,
          currency: deposit.currency,
          reason
        },
        success: true,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

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
  }
);

// POST /api/admin/deposits/:id/verify
router.post(
  "/:id/verify", 
  requirePermission('manage_users'),
  async (req, res) => {
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
        message: "User verified successfully"
      });
    } catch (error) {
      console.error("❌ Verify user error:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to verify user" 
      });
    }
  }
);

export default router;