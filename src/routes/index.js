// src/routes/index.js
const { Router } = require('express');
const router = Router();

// Import Security Interceptor Checkpoints
const { checkSecurityClearance } = require('../middlewares/auth.middleware');

// Import Subsystem Routing Arrays
const identityRoutes = require('./identity.routes');
const ledgerRoutes = require('./ledger.routes');
const transitRoutes = require('./transit.routes');

// 1. Identity Domain (Publicly accessible for profile creation/lookups)
router.use('/identity', identityRoutes);

// 2. Financial Ledger Domain (Strict Token Block Clearance Required)
router.use('/ledger', checkSecurityClearance, ledgerRoutes);

// 3. Settlement Transit Domain (Strict Token Block Clearance Required)
router.use('/transit', checkSecurityClearance, transitRoutes);

module.exports = router;