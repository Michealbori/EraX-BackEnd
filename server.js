import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Imports
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

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ ROBUST CORS CONFIGURATION
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://michealbori.github.io',
      'https://michealbori.github.io/EraX-FrontEnd',
      'https://michealbori.github.io/EraX',
      'https://erax-backend-o3hb.onrender.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.github.io')) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600
}));

// Handle preflight OPTIONS requests
app.options('*', cors());

// Manual CORS headers as fallback
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

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

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "EraX API is running",
    timestamp: new Date().toISOString(),
    cors: 'enabled'
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Welcome to EraX API",
    version: "1.0.0"
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);
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

// Verify email
verifyEmailConnections();

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 EraX Server running on port ${PORT}`);
  console.log(`🌐 CORS enabled for GitHub Pages\n`);
});

export default app;