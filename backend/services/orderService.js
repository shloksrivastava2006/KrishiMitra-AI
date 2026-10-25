import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { UNPAID_HOLD_MINUTES } from './marketRules.js';
import { ApiError } from '../utils/ApiError.js';

// Takes stock for every line. The filter also checks price, so a price edited a moment ago fails instead of being undercharged.
// No multi-document transaction (a plain local MongoDB does not support them), so earlier lines are put back on failure.
export async function reserveStock(lines) {
  const taken = [];
  for (const l of lines) {
    const hit = await Product.findOneAndUpdate(
      { _id: l.product, status: 'approved', stock: { $gte: l.qty },
        $or: [{ salePaise: l.unitPaise }, { salePaise: { $exists: false }, pricePaise: l.unitPaise }] }, { $inc: { stock: -l.qty } });
    if (!hit) {
      await Promise.all(taken.map((t) => Product.updateOne({ _id: t.product }, { $inc: { stock: t.qty } })));
      throw new ApiError(409, `"${l.name}" is out of stock or its price changed. Please refresh your cart`);
    }
    taken.push(l);
  }
}

// Returns stock exactly once per order (the flag flips atomically, so double calls cannot double-restore).
export async function releaseStock(orderId) {
  const order = await Order.findOneAndUpdate({ _id: orderId, stockReleased: false }, { stockReleased: true });
  if (!order) return;
  await Promise.all(order.lines.map((l) => Product.updateOne({ _id: l.product }, { $inc: { stock: l.qty } })));
}

export async function cancelOrder(order, by) {
  const patch = { status: 'cancelled', cancelledBy: by, 'statusAt.cancelled': new Date() };
  if (order.paymentStatus === 'paid') patch.paymentStatus = 'refund_due';
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: { $ne: 'cancelled' } }, patch, { new: true });
  if (updated) await releaseStock(order._id);
  return updated || order;
}

// Called from both the checkout callback and the webhook, so it must be safe to run twice.
export async function markPaid(order, paymentId) {
  const patch = { razorpayPaymentId: paymentId, paidAt: new Date() };
  if (order.status === 'cancelled') patch.paymentStatus = 'refund_due';   // paid after we released the stock: refund by hand
  else { patch.paymentStatus = 'paid'; if (order.status === 'awaiting_payment') patch.status = 'placed'; }
  const updated = await Order.findOneAndUpdate({ _id: order._id, paymentStatus: 'pending' }, patch, { new: true });
  return updated || (await Order.findById(order._id));
}

export async function expireUnpaidOrders() {
  const cutoff = new Date(Date.now() - UNPAID_HOLD_MINUTES * 60 * 1000);
  const stale = await Order.find({ status: 'awaiting_payment', createdAt: { $lt: cutoff } }).limit(50);
  for (const o of stale) await cancelOrder(o, 'system');
  return stale.length;
}
