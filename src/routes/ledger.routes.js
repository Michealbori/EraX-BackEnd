import express from "express";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET user's ledger/transaction history
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Ledger endpoint working",
    ledger: []
  });
});

export default router; // ✅ THIS IS WHAT'S MISSING!