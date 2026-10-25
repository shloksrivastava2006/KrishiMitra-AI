import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const devOutbox = new Map();
export const latestDevEmailOtp = (target) => devOutbox.get(target);

export const mailConfigured = () => Boolean(env.smtpHost) || env.nodeEnv !== 'production';

let transport;
async function getTransport() {
  if (transport) return transport;
  const { default: nodemailer } = await import('nodemailer');   // loaded only when SMTP is really used
  transport = nodemailer.createTransport({
    host: env.smtpHost, port: env.smtpPort, secure: env.smtpPort === 465,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
  });
  return transport;
}

export async function sendOtpEmail(to, code, minutes, purposeText) {
  if (!mailConfigured()) throw new ApiError(503, 'Email OTP is not set up on this server yet');
  if (!env.smtpHost) {
    devOutbox.set(to, code);
    console.log(`[DEV OTP] email to ${to}: ${code} (valid ${minutes} min)`);
    return;
  }
  try {
    const t = await getTransport();
    await t.sendMail({
      from: env.mailFrom, to,
      subject: `${code} is your KrishiMitra AI code`,
      text: `Your KrishiMitra AI code ${purposeText} is ${code}.\nIt is valid for ${minutes} minutes. Do not share it with anyone.\nIf you did not ask for this, you can ignore this email.`,
    });
  } catch (err) {
    console.error('mail failed:', err.message);
    throw new ApiError(502, 'Could not send the email right now. Please try again in a moment');
  }
}
