import express from "express";
import adminAuthRoutes from "./adminAuth.routes.js";
import adminDashboardRoutes from "./adminDashboard.routes.js";
import adminUsersRoutes from "./adminUsers.routes.js";
import adminDepositsRoutes from "./adminDeposits.routes.js";
import adminVaultRoutes from "./adminVault.routes.js"; // ✅ ADD THIS
import { adminRateLimiter } from "../../middlewares/adminAuth.js";
import dashboardRoutes from "./dashboard.routes.js";
import usersRoutes from "./adminUsers.routes.js";  // ✅ Correct filename
import userManagementRoutes from "./userManagement.routes.js"; // ✅ This line

const router = express.Router();

router.use(adminRateLimiter);

router.use("/auth", adminAuthRoutes);
router.use("/dashboard", adminDashboardRoutes);
router.use("/users", adminUsersRoutes);
router.use("/deposits", adminDepositsRoutes);
router.use("/vault", adminVaultRoutes); // ✅ ADD THIS
router.use("/dashboard", dashboardRoutes);
router.use("/users", usersRoutes);
router.use("/user-management", userManagementRoutes); // ✅ This line

export default router;