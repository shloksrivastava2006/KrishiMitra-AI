import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
// Always read backend/.env, whatever folder the server was started from.
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const required = ['MONGODB_URI', 'JWT_SECRET'];

export const env = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173').split(',').map((s) => s.trim()),
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  // Disease check is switched off until a key is set. Model names change; verify the current one in Google's docs.
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  // Online payments stay off until all three are set. COD works without them.
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  // Social sign-in. The buttons stay hidden until the matching client id is set.
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  appleClientId: process.env.APPLE_CLIENT_ID || '',            // the Apple "Services ID"
  appleRedirectUri: process.env.APPLE_REDIRECT_URI || '',      // a Return URL registered for that Services ID
  // Mobile OTP. 'console' only prints the code (development); real providers: 'msg91' or 'twilio'.
  smsProvider: (process.env.SMS_PROVIDER || 'console').toLowerCase(),
  msg91AuthKey: process.env.MSG91_AUTH_KEY || '',
  msg91TemplateId: process.env.MSG91_TEMPLATE_ID || '',
  twilioSid: process.env.TWILIO_ACCOUNT_SID || '',
  twilioToken: process.env.TWILIO_AUTH_TOKEN || '',
  twilioFrom: process.env.TWILIO_FROM || '',
  // Email OTP. Without SMTP_HOST the code is only printed in development, and email OTP is refused in production.
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  mailFrom: process.env.MAIL_FROM || process.env.SMTP_USER || 'KrishiMitra AI <no-reply@localhost>',
  // checked in server.js so tests can import app without a database
  missing: required.filter((key) => !process.env[key]),
};
