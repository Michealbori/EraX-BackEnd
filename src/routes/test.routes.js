import express from 'express';
import { sendOTPEmail } from '../utils/sendEmail.js';

const router = express.Router();

router.post('/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    const otp = '123456';
    
    const sent = await sendOTPEmail(email, otp);
    
    if (sent) {
      res.json({ success: true, message: 'Test email sent!' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send email' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;