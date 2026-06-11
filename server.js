import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ✅ UPDATED: Add ./src/ prefix to all imports
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

// ✅ FIXED CORS - Removed wildcard OPTIONS handler
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://michealbori.github.io",
    "https://michealbori.github.io/EraX-FrontEnd",
    "https://michealbori.github.io/EraX",
    "https://erax-backend-o3hb.onrender.com"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "X-Requested-With",
    "Accept",
    "Origin"
  ],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 86400 // 24 hours cache for preflight requests
}));

// ❌ REMOVED: app.options('*', cors()) - This was causing the router conflict

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
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
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? `✓ Set (${process.env.EMAIL_PASS.length} chars)` : '✗ EMPTY or NOT SET');
console.log('DEPOSIT_EMAIL_USER:', process.env.DEPOSIT_EMAIL_USER);
console.log('DEPOSIT_EMAIL_PASS:', process.env.DEPOSIT_EMAIL_PASS ? `✓ Set (${process.env.DEPOSIT_EMAIL_PASS.length} chars)` : '✗ EMPTY or NOT SET');
console.log('NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('='.repeat(70) + '\n');

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "EraX API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: "1.0.0"
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to EraX API",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      identity: "/api/identity",
      investment: "/api/investment",
      deposit: "/api/deposit",
      withdrawal: "/api/withdrawal",
      admin: "/api/admin"
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("🚨 Framework Error:", err.stack);
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
  console.log(`\n🚀 EraX Server running on port ${PORT}`);
  console.log(`📁 Static files served from: ${path.join(__dirname, "public/uploads")}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📡 CORS enabled for: Michealbori.github.io\n`);
});

console.log('📧 Email User:', process.env.EMAIL_USER);
console.log('🔑 Email Pass:', process.env.EMAIL_PASS ? '***configured***' : 'NOT SET');

export default app;