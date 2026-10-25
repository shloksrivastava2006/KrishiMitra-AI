import mongoose from 'mongoose';

const lineSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: String, unit: String, unitPaise: Number, qty: Number, linePaise: Number,
}, { _id: false });

const schema = new mongoose.Schema(
  {
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lines: { type: [lineSchema], validate: (v) => v.length > 0 },
    totalPaise: { type: Number, required: true },
    address: { name: String, phone: String, line1: String, village: String, district: String, state: String, pincode: String },
    paymentMethod: { type: String, enum: ['cod', 'online'], required: true },
    // pending: online, not paid yet | cod: cash due on delivery | paid | refund_due: money taken, order cancelled, refund must be made by hand
    paymentStatus: { type: String, enum: ['pending', 'cod', 'paid', 'refund_due'], required: true },
    status: { type: String, enum: ['awaiting_payment', 'placed', 'confirmed', 'shipped', 'delivered', 'cancelled'], required: true, index: true },
    stockReleased: { type: Boolean, default: false },
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: String,
    paidAt: Date,
    cancelledBy: { type: String, enum: ['buyer', 'seller', 'system'] },
    // When each stage was reached, so the customer can follow the order. "placed" is derived (createdAt for cash orders, paidAt for online ones).
    statusAt: { confirmed: Date, shipped: Date, delivered: Date, cancelled: Date },
    // Filled in by the seller when the goods are dispatched. All optional: a farmer may deliver by hand with no courier.
    shipping: {
      courier: { type: String, trim: true, maxlength: 60 },
      trackingNumber: { type: String, trim: true, maxlength: 40 },
      expectedDelivery: Date,
      note: { type: String, trim: true, maxlength: 200 },
      updatedAt: Date,
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model('Order', schema);
