import mongoose from 'mongoose';

// One row per (channel, target, purpose). Only a keyed hash of the code is stored, never the code itself.
// `purgeAt` lets MongoDB delete the row on its own once the hourly send window is over.
const otpSchema = new mongoose.Schema({
  channel: { type: String, enum: ['phone', 'email'], required: true },
  target: { type: String, required: true },            // 10-digit mobile or lowercase email
  purpose: { type: String, enum: ['signup', 'reset'], required: true },
  codeHash: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  attempts: { type: Number, default: 0 },              // wrong guesses so far
  sentAt: { type: Date, required: true },              // last send, used for the resend cooldown
  windowStart: { type: Date, required: true },         // start of the current one-hour send window
  sendCount: { type: Number, default: 1 },             // sends inside that window
  purgeAt: { type: Date, required: true },
});

otpSchema.index({ channel: 1, target: 1, purpose: 1 }, { unique: true });
otpSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

export const Otp = mongoose.model('Otp', otpSchema);
