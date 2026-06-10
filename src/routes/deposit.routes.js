import express from "express";
import upload from "../models/upload.js";
import {
  getDepositAddress,
  submitTransaction,
  notifyAdminOfDeposit,
  approveDeposit,
  confirmDeposit,
  checkDepositStatus  // ✅ This import must match the export name
} from "../controllers/deposit.controller.js";

const router = express.Router();

router.post("/address", getDepositAddress);
router.post("/submit", submitTransaction);
router.post("/notify-admin", upload.single("screenshot"), notifyAdminOfDeposit);
router.get("/approve/:depositId", approveDeposit);
router.patch("/confirm/:depositId", confirmDeposit);
router.get("/status/:depositId", checkDepositStatus); // ✅ Route for polling

export default router;