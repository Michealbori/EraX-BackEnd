// src/controllers/user.controller.js
import User from "../models/User.js";

export const getUserBalances = async (req, res) => {
  try {
    // req.user.id would come from your JWT verification middleware
    const user = await User.findById(req.user.id); 
    if (!user) return res.status(404).json({ message: "User context not found" });

    res.status(200).json({
      balances: user.balances,
      allocations: user.allocations
    });
  } catch (error) {
    res.status(500).json({ message: "Server balance retrieval error" });
  }
};