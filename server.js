// ✅ CRITICAL: Load .env FIRST - before ANY other imports
import 'dotenv/config';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// =====================================================
// ✅ NOW IMPORT ALL ROUTES (after .env is loaded)
// =====================================================
import identityRoutes from './src/routes/identity.routes.js';
import depositRoutes from './src/routes/deposit.routes.js';
import investmentRoutes from './src/routes/investment.routes.js';
import withdrawalRoutes from './src/routes/withdrawal.routes.js';
import adminRoutes from './src/routes/admin.routes.js';
import verification from './src/routes/verification.routes.js';

// ✅ IMPORT CODE GENERATORS
import { startCodeGenerator } from './src/jobs/codeGenerator.js';

// 🔍 DEBUG: Verify .env is loaded
console.log('\n🔍 ===== SERVER STARTUP DEBUG =====');
console.log('RESEND_API_KEY loaded:', process.env.RESEND_API_KEY ? '✅ YES' : '❌ NO');
console.log('JWT_SECRET loaded:', process.env.JWT_SECRET ? '✅ YES' : '❌ NO');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('===================================\n');

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================
// ✅ CORS CONFIGURATION
// =====================================================
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'Expires',
    'X-Requested-With'
  ],
  credentials: true,
  maxAge: 86400
}));

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging - ✅ ENHANCED
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  if (req.headers.authorization) {
    console.log(`[${timestamp}] Auth header present: YES`);
  }
  next();
});

// =====================================================
// ✅ API ROUTES - ALL REGISTERED
// =====================================================

// User routes
app.use('/api/identity', identityRoutes);

// Deposit routes
app.use('/api/deposit', depositRoutes);

// Investment routes
app.use('/api/investment', investmentRoutes);

// Withdrawal routes
app.use('/api/withdrawal', withdrawalRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Verification routes
app.use('/api/verification', verification);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EraX Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to EraX API',
    version: '1.0.0',
    endpoints: {
      identity: '/api/identity',
      deposit: '/api/deposit',
      investment: '/api/investment',
      withdrawal: '/api/withdrawal',
      admin: '/api/admin',
      verification: '/api/verification'
    }
  });
});

// =====================================================
// ERROR HANDLING
// =====================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ SERVER ERROR:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

// =====================================================
// DATABASE CONNECTION & SERVER START
// =====================================================

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB Connected');
  
  // ✅ START CODE GENERATORS AFTER DB CONNECTS
  startCodeGenerator();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📍 Routes registered:`);
    console.log(`   - Identity: /api/identity`);
    console.log(`   - Deposit: /api/deposit`);
    console.log(`   - Investment: /api/investment`);
    console.log(`   - Withdrawal: /api/withdrawal`);
    console.log(`   - Admin: /api/admin`);
    console.log(`   - Verification: /api/verification`);
    console.log(`⏰ Code generators started`);
  });
})
.catch((error) => {
  console.error('❌ MongoDB Connection Error:', error);
  process.exit(1);
});

export default app;