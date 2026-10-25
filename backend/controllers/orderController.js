import { Order } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ONLINE_MAX_PAISE, buildLines, buyerCanCancel, isProduce, onlinePaymentAllowed, sellerCanMove, sellerLink } from '../services/marketRules.js';
import { createRazorpayOrder, razorpayEnabled, verifyPaymentSignature, verifyWebhookSignature } from '../services/paymentService.js';
import { notify } from '../services/notify.js';
import { RentalBooking } from '../models/Rental.js';
import { markRentalPaid, ownerRentalsLink } from '../services/rentalService.js';
import { cancelOrder, expireUnpaidOrders, markPaid, releaseStock, reserveStock } from '../services/orderService.js';

const hasShipping = (sh) => Boolean(sh && (sh.courier || sh.trackingNumber || sh.expectedDelivery || sh.note));
const SHIP_FIELDS = ['courier', 'trackingNumber', 'expectedDelivery', 'note'];
const pickShipping = (b) => ({ ...Object.fromEntries(SHIP_FIELDS.filter((f) => b[f] !== undefined && b[f] !== '').map((f) => [f, b[f]])), updatedAt: new Date() });
const shipText = (sh) => [sh?.courier, sh?.trackingNumber && `#${sh.trackingNumber}`].filter(Boolean).join(' ');

const view = (o, { forSeller = false } = {}) => ({
  id: o._id, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus, total: o.totalPaise / 100,
  lines: o.lines.map((l) => ({ name: l.name, unit: l.unit, unitPrice: l.unitPaise / 100, qty: l.qty, lineTotal: l.linePaise / 100 })),
  createdAt: o.createdAt, razorpayOrderId: o.razorpayOrderId,
  // Tracking: when each stage happened plus the seller's courier details. Old orders simply have fewer dates.
  statusAt: { placed: o.paymentMethod === 'cod' ? o.createdAt : o.paidAt || undefined, confirmed: o.statusAt?.confirmed, shipped: o.statusAt?.shipped, delivered: o.statusAt?.delivered, cancelled: o.statusAt?.cancelled },
  shipping: hasShipping(o.shipping) ? { courier: o.shipping.courier, trackingNumber: o.shipping.trackingNumber, expectedDelivery: o.shipping.expectedDelivery, note: o.shipping.note, updatedAt: o.shipping.updatedAt } : undefined,
  // Delivery details go to the seller of this order only.
  address: forSeller || o.address ? o.address : undefined,
});

const notifyNewOrder = (order) => notifyNewOrderAsync(order).catch((e) => console.error('order notify failed:', e.message));
const notifyNewOrderAsync = async (order) => {
  const role = (await User.findById(order.seller).select('role'))?.role;
  notify(order.seller, 'new_order', 'New order received', `Order #${String(order._id).slice(-6).toUpperCase()}, Rs ${(order.totalPaise / 100).toFixed(2)}`, sellerLink(role, '/seller/orders', '/my-sales'));
  // Low-stock alert once an order pushes a product to 5 or fewer.
  for (const l of order.lines) {
    const p = await Product.findById(l.product).select('name stock unit seller category');
    if (p && p.stock <= 5) notify(p.seller, 'low_stock', 'Low stock', `"${p.name}" has only ${p.stock} ${p.unit} left`, sellerLink(role, '/seller/products', isProduce(p.category) ? '/sell-produce' : '/my-products'));
  }
};

export const placeOrder = asyncHandler(async (req, res) => {
  await expireUnpaidOrders().catch(() => {});  // free stock held by abandoned payments
  const { items, address, paymentMethod } = req.body;
  const products = new Map((await Product.find({ _id: { $in: items.map((i) => i.productId) } })).map((p) => [String(p._id), p]));
  const { sellerId, lines, totalPaise } = buildLines(items, products, req.user._id);
  if (!(await User.exists({ _id: sellerId, isActive: true }))) throw new ApiError(422, 'This seller is not taking orders right now');

  if (paymentMethod === 'online') {
    if (!razorpayEnabled()) throw new ApiError(503, 'Online payment is not set up on this server. Choose cash on delivery');
    if (totalPaise > ONLINE_MAX_PAISE) throw new ApiError(422, 'Online payment is limited to Rs 5,00,000 per order. Split the order or pay cash on delivery');
    // Money taken online goes to the site first and is sent on to the seller, so the seller needs a UPI ID or bank account on file.
    const seller = await User.findById(sellerId).select('role payout.upiId payout.accountLast4 seller.upiId seller.bankAccountLast4');
    if (!onlinePaymentAllowed(seller)) throw new ApiError(422, 'This seller has not set up online payments yet. Choose cash on delivery');
  }

  await reserveStock(lines);
  let order;
  try {
    order = await Order.create({
      buyer: req.user._id, seller: sellerId, lines, totalPaise, paymentMethod,
      address: { name: address.name, phone: address.phone, line1: address.line1, village: address.village, district: address.district, state: address.state, pincode: address.pincode },
      paymentStatus: paymentMethod === 'cod' ? 'cod' : 'pending', status: paymentMethod === 'cod' ? 'placed' : 'awaiting_payment',
    });
  } catch (err) {
    await Promise.all(lines.map((l) => Product.updateOne({ _id: l.product }, { $inc: { stock: l.qty } })));
    throw err;
  }

  if (paymentMethod === 'cod') { notifyNewOrder(order); return res.status(201).json({ success: true, data: { order: view(order) } }); }

  try {
    const rz = await createRazorpayOrder({ amountPaise: totalPaise, receipt: String(order._id) });
    order.razorpayOrderId = rz.id; await order.save();
    return res.status(201).json({ success: true, data: { order: view(order), razorpay: { keyId: env.razorpayKeyId, orderId: rz.id, amount: rz.amount, currency: rz.currency } } });
  } catch (err) {
    await cancelOrder(order, 'system');  // payment could not start: give the stock back
    throw err;
  }
});

// Lets the buyer reopen the payment window for an order that is still waiting for payment.
export const payInfo = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, buyer: req.user._id });
  if (!order || order.status !== 'awaiting_payment' || order.paymentStatus !== 'pending' || !order.razorpayOrderId) throw new ApiError(409, 'This order is not waiting for payment');
  res.json({ success: true, data: { razorpay: { keyId: env.razorpayKeyId, orderId: order.razorpayOrderId, amount: order.totalPaise, currency: 'INR' } } });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, buyer: req.user._id });
  if (!order || order.paymentMethod !== 'online') throw new ApiError(404, 'Order not found');
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  if (orderId !== order.razorpayOrderId || !verifyPaymentSignature({ orderId, paymentId, signature, secret: env.razorpayKeySecret })) {
    throw new ApiError(400, 'Payment could not be verified. If money was deducted, it will be matched automatically or refunded; contact support with your order number');
  }
  const paidOrder = await markPaid(order, paymentId);
  if (paidOrder.paymentStatus === 'paid' && order.paymentStatus === 'pending') { notifyNewOrder(paidOrder); notify(paidOrder.seller, 'payment_received', 'Payment received', `Rs ${(paidOrder.totalPaise / 100).toFixed(2)} paid online`, '/seller/earnings'); }
  res.json({ success: true, data: { order: view(paidOrder) } });
});

// Razorpay server-to-server notification. Signature is checked on the raw bytes before anything is read.
export const razorpayWebhook = asyncHandler(async (req, res) => {
  if (!env.razorpayWebhookSecret) throw new ApiError(503, 'Webhook is not configured');
  if (!verifyWebhookSignature(req.body, req.get('x-razorpay-signature'), env.razorpayWebhookSecret)) throw new ApiError(400, 'Invalid signature');
  let event;
  try { event = JSON.parse(req.body.toString('utf8')); } catch { throw new ApiError(400, 'Invalid body'); }
  if (['payment.captured', 'order.paid'].includes(event.event)) {
    const pay = event.payload?.payment?.entity;
    const order = pay?.order_id && (await Order.findOne({ razorpayOrderId: pay.order_id }));
    if (!order) {
      // Not a shop order: it may be rent for an equipment booking.
      const booking = pay?.order_id && (await RentalBooking.findOne({ razorpayOrderId: pay.order_id }));
      if (!booking) console.error('Webhook for unknown Razorpay order');
      else if (pay.amount !== booking.amountPaise) console.error(`Webhook amount mismatch for rental booking ${booking._id}`);
      else {
        const before = booking.paymentStatus; const paid = await markRentalPaid(booking, pay.id);
        if (before === 'unpaid' && paid.paymentStatus === 'paid') notify(paid.owner, 'payment_received', 'Rent paid online', `Rs ${(paid.amountPaise / 100).toFixed(2)}. The renter can now collect the equipment`, await ownerRentalsLink(paid.owner));
      }
    }
    else if (pay.amount !== order.totalPaise) console.error(`Webhook amount mismatch for order ${order._id}`); // never mark paid on a wrong amount
    else {
      const before = order.paymentStatus; const paid = await markPaid(order, pay.id);
      if (before === 'pending' && paid.paymentStatus === 'paid') { notifyNewOrder(paid); notify(paid.seller, 'payment_received', 'Payment received', `Rs ${(paid.totalPaise / 100).toFixed(2)} paid online`, '/seller/earnings'); }
    }
  }
  res.json({ success: true });  // 200 so Razorpay does not keep retrying events we have handled or deliberately ignored
});

export const options = (req, res) => res.json({ success: true, data: { online: razorpayEnabled() } });

export const myOrders = asyncHandler(async (req, res) => {
  await expireUnpaidOrders().catch(() => {});
  const items = await Order.find({ buyer: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, data: items.map((o) => view(o)) });
});

export const sellingOrders = asyncHandler(async (req, res) => {
  const items = await Order.find({ seller: req.user._id, status: { $ne: 'awaiting_payment' } }).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, data: items.map((o) => view(o, { forSeller: true })) });
});

export const cancelMine = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, buyer: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found');
  if (!buyerCanCancel(order.status)) throw new ApiError(409, 'This order can no longer be cancelled. Contact the seller');
  const cancelled = await cancelOrder(order, 'buyer');
  notify(order.seller, 'order_cancelled', 'Customer cancelled an order', `Order #${String(order._id).slice(-6).toUpperCase()}`, sellerLink((await User.findById(order.seller).select('role'))?.role, '/seller/orders', '/my-sales'));
  res.json({ success: true, data: { order: view(cancelled) } });
});

export const updateStatus = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, seller: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found');
  const to = req.body.status;
  if (!sellerCanMove(order.status, to)) throw new ApiError(409, `Cannot move an order from "${order.status}" to "${to}"`);
  if (to === 'cancelled') { notify(order.buyer, 'order_update', 'Your order was cancelled by the seller', `Order #${String(order._id).slice(-6).toUpperCase()}`, '/my-orders'); return res.json({ success: true, data: { order: view(await cancelOrder(order, 'seller'), { forSeller: true }) } }); }
  order.status = to;
  order.set(`statusAt.${to}`, new Date());
  if (to === 'shipped') order.shipping = pickShipping(req.body);
  const shipped = to === 'shipped' && shipText(order.shipping);
  notify(order.buyer, 'order_update', `Your order is ${to}`, `Order #${String(order._id).slice(-6).toUpperCase()}${shipped ? `, ${shipped}` : ''}`, '/my-orders');
  if (to === 'delivered' && order.paymentMethod === 'cod') { order.paymentStatus = 'paid'; order.paidAt = new Date(); } // cash collected at the door
  await order.save();
  res.json({ success: true, data: { order: view(order, { forSeller: true }) } });
});

// The seller can fix or add courier details after dispatch (wrong number, new delivery date). Only while the order is on its way.
export const updateTracking = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ _id: req.params.id, seller: req.user._id });
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.status !== 'shipped') throw new ApiError(409, 'Tracking can be changed only while the order is shipped');
  order.shipping = pickShipping(req.body);
  await order.save();
  notify(order.buyer, 'order_update', 'Delivery details updated', `Order #${String(order._id).slice(-6).toUpperCase()}${shipText(order.shipping) ? `, ${shipText(order.shipping)}` : ''}`, '/my-orders');
  res.json({ success: true, data: { order: view(order, { forSeller: true }) } });
});

export { releaseStock };
