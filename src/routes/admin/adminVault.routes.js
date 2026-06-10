import express from "express";
import {
  getVaultBalances,
  executeLiquiditySweep,
  provisionHotLiquidity
} from "../../controllers/admin/adminVault.controller.js";
import { 
  verifyAdminToken, 
  requirePermission 
} from "../../middlewares/adminAuth.js";

const router = express.Router();

// All routes require admin authentication
router.use(verifyAdminToken);

// GET vault balances
router.get(
  "/balances",
  requirePermission('view_analytics'),
  getVaultBalances
);

// POST execute liquidity sweep
router.post(
  "/sweep",
  requirePermission('manage_settings'),
  executeLiquiditySweep
);

// POST provision hot liquidity
router.post(
  "/provision",
  requirePermission('manage_settings'),
  provisionHotLiquidity
);

export default router;