import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, registerSeller, registerCustomer, login, adminLogin, updateProfile, changePassword, me, logout, updateLanguage,
  authConfig, sendOtp, verifyOtp, socialLogin, socialRegister, forgotPasswordSend, forgotPasswordReset } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerRules, customerRegisterRules, sellerRegisterRules, loginRules, adminLoginRules, profileRules, passwordRules, languageRules,
  otpSendRules, otpVerifyRules, socialLoginRules, socialRegisterRules, forgotSendRules, forgotResetRules } from '../validators/authValidators.js';

const router = Router();
// Slows down password guessing.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Try again in a few minutes' } });

// Every OTP sent costs money (SMS) and can be used to annoy someone, so sending is limited more tightly than login.
const otpLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many codes requested. Try again in a few minutes' } });

router.get('/config', authConfig);
router.post('/otp/send', otpLimiter, otpSendRules, validate, sendOtp);
router.post('/otp/verify', authLimiter, otpVerifyRules, validate, verifyOtp);
router.post('/social/login', authLimiter, socialLoginRules, validate, socialLogin);
router.post('/social/register', authLimiter, socialRegisterRules, validate, socialRegister);
router.post('/forgot-password/send', otpLimiter, forgotSendRules, validate, forgotPasswordSend);
router.post('/forgot-password/reset', authLimiter, forgotResetRules, validate, forgotPasswordReset);
router.post('/register', authLimiter, registerRules, validate, register);
router.post('/register-customer', authLimiter, customerRegisterRules, validate, registerCustomer);
router.post('/register-seller', authLimiter, sellerRegisterRules, validate, registerSeller);
router.post('/login', authLimiter, loginRules, validate, login);
// Stricter limit than the public login: admin accounts are the most valuable target.
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Try again in a few minutes' } });
router.post('/admin/login', adminLimiter, adminLoginRules, validate, adminLogin);
router.patch('/profile', protect, profileRules, validate, updateProfile);
router.post('/change-password', protect, authLimiter, passwordRules, validate, changePassword);
router.get('/me', protect, me);
router.post('/logout', protect, logout);
router.patch('/language', protect, languageRules, validate, updateLanguage);
export default router;
