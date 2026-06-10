import express from "express";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET user's transit/transfer history
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Transit endpoint working",
    transfers: []
  });
});

// POST create new transfer/transit
router.post("/create", (req, res) => {
  res.json({
    success: true,
    message: "Transfer created successfully"
  });
});

export default router; // ✅ Required default export