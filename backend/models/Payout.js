import mongoose from 'mongoose';

// Recorded by an admin after paying the seller outside the app (bank/UPI). The app does not move money by itself.
const schema = new mongoose.Schema(
  {
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountPaise: { type: Number, required: true, min: 100 },
    reference: { type: String, required: true, trim: true, maxlength: 80 },   // UTR / transaction id
    note: { type: String, trim: true, maxlength: 200 },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);
export const Payout = mongoose.model('Payout', schema);
