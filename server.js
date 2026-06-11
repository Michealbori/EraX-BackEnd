import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ✅ UPDATED IMPORTS - Add ./src/ prefix
import connectDB from "./src/config/db.js";
import authRoutes from "./src/routes/auth.routes.js";
import identityRoutes from "./src/routes/identity.routes.js";
import investmentRoutes from "./src/routes/investment.routes.js";
import depositRoutes from "./src/routes/deposit.routes.js";
import withdrawalRoutes from "./src/routes/withdrawal.routes.js";
import ledgerRoutes from "./src/routes/ledger.routes.js";
import transitRoutes from "./src/routes/transit.routes.js";
import adminRoutes from "./src/routes/admin/index.js";
import testRoutes from './src/routes/test.routes.js';
import { verifyEmailConnections } from './src/config/email.js';

// Load environment variables
dotenv.config();

// Initialize express
const app = express();

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS - Updated with GitHub Pages URLs
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://Michealbori.github.io",
    "https://Michealbori.github.io/EraX-FrontEnd"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ UPDATED: Serve static files - change path
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Connect to database
connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/identity", identityRoutes);
app.use("/api/investment", investmentRoutes);
app.use("/api/deposit", depositRoutes);
app.use("/api/withdrawal", withdrawalRoutes);
app.use("/api/ledger", ledgerRoutes);
app.use("/api/transit", transitRoutes);
app.use("/api/admin", adminRoutes);
app.use('/api/test', testRoutes);

// Debug logs
console.log('\n' + '='.repeat(70));
console.log('🔍 DEBUG: CHECKING .ENV FILE');
console.log('='.repeat(70));
console.log('PORT:', process.env.PORT);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? `✓ Set (${process.env.EMAIL_PASS.length} chars)` : ' EMPTY or NOT SET');
console.log('DEPOSIT_EMAIL_USER:', process.env.DEPOSIT_EMAIL_USER);
console.log('DEPOSIT_EMAIL_PASS:', process.env.DEPOSIT_EMAIL_PASS ? `✓ Set (${process.env.DEPOSIT_EMAIL_PASS.length} chars)` : '✗ EMPTY or NOT SET');
console.log('='.repeat(70) + '\n');

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "EraX API is running",
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(" Framework Error:", err.stack);
  res.status(500).json({ 
    success: false, 
    message: "Something went wrong!",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Verify email connections
verifyEmailConnections();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 EraX Server running on port ${PORT}`);
  console.log(`📁 Static files served from: ${path.join(__dirname, "public/uploads")}`);
});

console.log('📧 Email User:', process.env.EMAIL_USER);
console.log('🔑 Email Pass:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');

export default app;