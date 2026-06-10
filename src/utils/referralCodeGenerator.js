import crypto from 'crypto';
import User from '../models/User.js';

/**
 * Generate a unique referral code
 * Format: ERAX-XXXXXX (8 characters after prefix)
 */
export const generateUniqueReferralCode = async () => {
  const prefix = 'ERAX';
  let isUnique = false;
  let referralCode = '';
  
  while (!isUnique) {
    // Generate random 8-character alphanumeric code
    const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase().substring(0, 8);
    referralCode = `${prefix}-${randomPart}`;
    
    // Check if code already exists
    const existingUser = await User.findOne({ referralCode });
    if (!existingUser) {
      isUnique = true;
    }
  }
  
  return referralCode;
};

/**
 * Validate a referral code
 * Returns the referrer's user document if valid, null otherwise
 */
export const validateReferralCode = async (code) => {
  if (!code || typeof code !== 'string') {
    return null;
  }
  
  const cleanCode = code.trim().toUpperCase();
  
  // Basic format validation
  if (!cleanCode.startsWith('ERAX-') || cleanCode.length !== 13) {
    return null;
  }
  
  const referrer = await User.findOne({ 
    referralCode: cleanCode,
    isVerified: true
  });
  
  return referrer;
};

/**
 * Generate referral link for a user
 */
export const generateReferralLink = (referralCode, baseUrl = 'http://localhost:3000') => {
  return `${baseUrl}/register?ref=${referralCode}`;
};