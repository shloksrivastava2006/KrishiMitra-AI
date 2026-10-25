import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Otp } from '../models/Otp.js';
import { ApiError } from '../utils/ApiError.js';
import { sendOtpSms, smsConfigured } from './smsService.js';
import { sendOtpEmail, mailConfigured } from './mailService.js';

export const OTP_MINUTES = 5;
const TTL_MS = OTP_MINUTES * 60 * 1000;
const RESEND_MS = 30 * 1000;            // wait between two codes for the same number or email
const WINDOW_MS = 60 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;         // codes per number or email per hour
const MAX_WRONG_GUESSES = 5;            // then the code is dead and a new one is needed
const PROOF_MINUTES = 15;               // how long a verified number/email may be used to finish signup

// Same wording for every failure so the reset flow cannot be used to discover which accounts exist.
const BAD_CODE = 'Incorrect or expired code. Please request a new one';

export const normalizeTarget = (channel, value) => {
  const v = String(value || '').trim();
  return channel === 'email' ? v.toLowerCase() : v.replace(/\D/g, '').slice(-10);
};

// Keyed hash: a leaked database row cannot be turned back into a code without the server secret.
const hashCode = (channel, target, purpose, code) =>
  crypto.createHmac('sha256', env.jwtSecret).update(`${channel}|${target}|${purpose}|${code}`).digest('hex');

export const channelAvailable = (channel) => (channel === 'email' ? mailConfigured() : smsConfigured());

const PURPOSE_TEXT = { signup: 'to verify your email', reset: 'to reset your password' };

// Creates a code, stores its hash and sends it. Throws 429 for resend too early / too many sends.
export async function issueOtp({ channel, target, purpose }) {
  if (!channelAvailable(channel)) throw new ApiError(503, channel === 'email' ? 'Email OTP is not set up on this server yet' : 'Mobile OTP is not set up on this server yet');
  const now = Date.now();
  const existing = await Otp.findOne({ channel, target, purpose });
  if (existing && now - existing.sentAt.getTime() < RESEND_MS) {
    const wait = Math.ceil((RESEND_MS - (now - existing.sentAt.getTime())) / 1000);
    throw new ApiError(429, `Please wait ${wait} seconds before asking for another code`);
  }
  let windowStart = now; let sendCount = 1;
  if (existing && now - existing.windowStart.getTime() < WINDOW_MS) {
    if (existing.sendCount >= MAX_SENDS_PER_WINDOW) throw new ApiError(429, 'Too many codes requested. Please try again after an hour');
    windowStart = existing.windowStart.getTime(); sendCount = existing.sendCount + 1;
  }
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await Otp.findOneAndUpdate({ channel, target, purpose }, {
    codeHash: hashCode(channel, target, purpose, code), expiresAt: new Date(now + TTL_MS), attempts: 0,
    sentAt: new Date(now), windowStart: new Date(windowStart), sendCount, purgeAt: new Date(windowStart + WINDOW_MS),
  }, { upsert: true, setDefaultsOnInsert: true });
  try {
    if (channel === 'email') await sendOtpEmail(target, code, OTP_MINUTES, PURPOSE_TEXT[purpose]);
    else await sendOtpSms(target, code, OTP_MINUTES);
  } catch (err) {
    // The code never left the server, so undo it: otherwise the person is told to "wait 30 seconds" for a code that does not exist.
    if (existing) await Otp.replaceOne({ _id: existing._id }, existing.toObject());
    else await Otp.deleteOne({ channel, target, purpose });
    throw err;
  }
}

// Checks a code. A code works once: it is deleted on success. Throws ApiError(400) on any failure.
export async function consumeOtp({ channel, target, purpose, code }) {
  if (!/^\d{6}$/.test(String(code || ''))) throw new ApiError(400, BAD_CODE);
  // Counting the attempt BEFORE comparing means parallel guesses cannot exceed the limit.
  const doc = await Otp.findOneAndUpdate(
    { channel, target, purpose, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_WRONG_GUESSES } },
    { $inc: { attempts: 1 } }, { new: true });
  if (!doc) throw new ApiError(400, BAD_CODE);
  const expected = Buffer.from(doc.codeHash, 'hex');
  const given = Buffer.from(hashCode(channel, target, purpose, code), 'hex');
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) throw new ApiError(400, BAD_CODE);
  const gone = await Otp.deleteOne({ _id: doc._id, codeHash: doc.codeHash });
  if (!gone.deletedCount) throw new ApiError(400, BAD_CODE);
}

// A short-lived signed receipt saying "this number/email was proven". Signup sends it back with the form.
// It uses its own secret, so it can never be used as a login token.
const proofSecret = () => `${env.jwtSecret}:otp-proof`;

export const signProof = ({ channel, target, purpose }) =>
  jwt.sign({ typ: 'otp-proof', ch: channel, tg: target, pu: purpose }, proofSecret(), { expiresIn: `${PROOF_MINUTES}m` });

export function checkProof(token, { channel, target, purpose }) {
  try {
    const p = jwt.verify(String(token || ''), proofSecret());
    if (p.typ === 'otp-proof' && p.ch === channel && p.tg === target && p.pu === purpose) return;
  } catch { /* falls through */ }
  throw new ApiError(400, channel === 'email' ? 'Please verify your email with the OTP again' : 'Please verify your mobile number with the OTP again');
}
