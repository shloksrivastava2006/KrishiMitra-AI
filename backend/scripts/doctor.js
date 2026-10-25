// Run: npm run doctor   (from the project root)
// Checks the things that most often break login: missing .env, bad Mongo URI, unreachable database.
import { existsSync } from 'node:fs';
import mongoose from 'mongoose';
import { env } from '../config/env.js';

const ok = (m) => console.log(`  OK    ${m}`);
const bad = (m, fix) => { console.log(`  FAIL  ${m}\n        -> ${fix}`); process.exitCode = 1; };

console.log('KrishiMitra backend check');
existsSync(new URL('../.env', import.meta.url)) ? ok('backend/.env found') : bad('backend/.env is missing', 'Run: cp backend/.env.example backend/.env');
env.mongoUri ? ok('MONGODB_URI is set') : bad('MONGODB_URI is empty', 'Add your MongoDB connection string to backend/.env');
if (!env.jwtSecret) bad('JWT_SECRET is empty', 'Set a long random value in backend/.env');
else if (env.jwtSecret === 'change-me') bad('JWT_SECRET is still "change-me"', 'Replace it with a long random value');
else ok('JWT_SECRET is set');
// Optional feature: not a FAIL, but this is exactly what the "disease check is not switched on" message means.
if (!env.geminiApiKey) console.log('  NOTE  GEMINI_API_KEY is empty, so the plant disease check will say it is not switched on.\n        -> Put GEMINI_API_KEY=your_key in backend/.env (key from https://aistudio.google.com/apikey), then restart the backend.');
else if (env.geminiApiKey.length < 20) console.log(`  NOTE  GEMINI_API_KEY is only ${env.geminiApiKey.length} characters long; a real key is longer. Check that you copied all of it.`);
else ok(`GEMINI_API_KEY is set (${env.geminiApiKey.length} characters), model ${env.geminiModel}`);

// Sign-up OTP, Google and Apple
if (env.smsProvider === 'console') {
  if (env.nodeEnv === 'production') bad('SMS_PROVIDER is "console" in production, so nobody can receive a mobile OTP', 'Set SMS_PROVIDER=msg91 or twilio and its keys in backend/.env');
  else console.log('  NOTE  SMS_PROVIDER=console: mobile OTP codes are printed in this backend terminal, not sent. Fine for development.\n        -> For real SMS set SMS_PROVIDER=msg91 or twilio (see backend/.env.example).');
} else if (env.smsProvider === 'msg91' ? !(env.msg91AuthKey && env.msg91TemplateId) : env.smsProvider === 'twilio' ? !(env.twilioSid && env.twilioToken && env.twilioFrom) : true) {
  bad(`SMS_PROVIDER=${env.smsProvider} is not fully set up`, 'Fill in its keys in backend/.env (see backend/.env.example), or use SMS_PROVIDER=console for development');
} else ok(`mobile OTP via ${env.smsProvider}`);
env.smtpHost ? ok(`email OTP via SMTP (${env.smtpHost})`) : console.log('  NOTE  SMTP_HOST is empty: email OTP is only printed in development and is refused in production.');
console.log(env.googleClientId ? '  OK    Google sign-in is on' : '  NOTE  GOOGLE_CLIENT_ID is empty: the Google button is hidden.');
console.log(env.appleClientId ? '  OK    Apple sign-in is on' : '  NOTE  APPLE_CLIENT_ID is empty: the Apple button is hidden.');

if (env.mongoUri) {
  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 6000 });
    ok('connected to MongoDB');
    await mongoose.disconnect();
  } catch (err) {
    bad(`MongoDB connection failed: ${err.message}`,
      'Atlas: add your IP in Network Access, check user/password (URL-encode special characters). Local: make sure mongod is running.');
  }
}
console.log(process.exitCode ? '\nFix the FAIL lines above, then start the backend.' : '\nAll checks passed. Start with: npm run dev:backend');
process.exit(process.exitCode || 0);
