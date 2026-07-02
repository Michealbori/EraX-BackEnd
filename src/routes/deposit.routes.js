import express from "express";
import {
  notifyAdmin,
  approveDeposit,
  getDepositStatus,
  getDepositHistory,
  upload
} from "../controllers/deposit.controller.js";

import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// ✅ User submits deposit (with JWT)
router.post("/notify-admin", protect, upload.single('screenshot'), notifyAdmin);

// ✅ Admin approves deposit (NO JWT - direct backend link!)
router.get("/approve/:depositId", approveDeposit);

// ✅ User polls for status (with JWT)
router.get("/status/:id", protect, getDepositStatus);

// ✅ User views history (with JWT)
router.get("/history", protect, getDepositHistory);

export default router;