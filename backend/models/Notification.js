import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['new_order', 'product_approved', 'product_rejected', 'low_stock', 'payment_received', 'rental_request', 'rental_update', 'order_cancelled', 'order_update', 'seller_verification', 'payout', 'review', 'general'], default: 'general' },
    title: { type: String, required: true, maxlength: 120 },
    message: { type: String, maxlength: 300 },
    link: { type: String, maxlength: 120 },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);
schema.index({ user: 1, createdAt: -1 });
export const Notification = mongoose.model('Notification', schema);
