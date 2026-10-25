import { Product } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { Payout } from '../models/Payout.js';
import { Review } from '../models/Review.js';
import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { commissionPaise, commissionPercent } from '../services/marketRules.js';

const LOW_STOCK = 10;
// Orders that count as a sale: not cancelled and not still waiting for an online payment.
const SOLD = ['placed', 'confirmed', 'shipped', 'delivered'];

// Every figure below is computed from this seller's own Order and Payout rows. Nothing is typed in by hand.
async function money(sellerId) {
  const [byStatus, refunds, payouts] = await Promise.all([
    Order.aggregate([{ $match: { seller: sellerId, status: { $in: SOLD } } },
      { $group: { _id: { paid: { $eq: ['$paymentStatus', 'paid'] } }, total: { $sum: '$totalPaise' }, n: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { seller: sellerId, paymentStatus: 'refund_due' } }, { $group: { _id: null, total: { $sum: '$totalPaise' }, n: { $sum: 1 } } }]),
    Payout.aggregate([{ $match: { seller: sellerId } }, { $group: { _id: null, total: { $sum: '$amountPaise' }, n: { $sum: 1 } } }]),
  ]);
  const sum = (paid) => byStatus.find((g) => g._id.paid === paid)?.total || 0;
  const totalSalesPaise = sum(true) + sum(false);
  const grossPaise = sum(true);                      // verified online payments + COD cash collected on delivery
  const feePaise = commissionPaise(grossPaise);
  const netPaise = grossPaise - feePaise;
  const paidOutPaise = payouts[0]?.total || 0;
  return { totalSalesPaise, grossPaise, feePaise, refundPaise: refunds[0]?.total || 0, netPaise, paidOutPaise, pendingPayoutPaise: Math.max(0, netPaise - paidOutPaise) };
}
const rupees = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.replace(/Paise$/, ''), v / 100]));

export const summary = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const [products, orders, m, recent, low, notes, rating] = await Promise.all([
    Product.aggregate([{ $match: { seller: me, status: { $ne: 'archived' } } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Order.aggregate([{ $match: { seller: me, status: { $ne: 'awaiting_payment' } } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    money(me),
    Order.find({ seller: me, status: { $ne: 'awaiting_payment' } }).sort({ createdAt: -1 }).limit(5),
    Product.find({ seller: me, status: { $in: ['approved', 'inactive'] }, stock: { $lte: LOW_STOCK } }).sort({ stock: 1 }).limit(8).select('name stock unit'),
    Notification.find({ user: me }).sort({ createdAt: -1 }).limit(5),
    Review.aggregate([{ $match: { seller: me } }, { $group: { _id: null, avg: { $avg: '$rating' }, n: { $sum: 1 } } }]),
  ]);
  const pc = Object.fromEntries(products.map((g) => [g._id, g.n]));
  const oc = Object.fromEntries(orders.map((g) => [g._id, g.n]));
  res.json({ success: true, data: {
    products: { total: Object.values(pc).reduce((a, b) => a + b, 0), active: pc.approved || 0, pending: pc.pending || 0, rejected: pc.rejected || 0, inactive: pc.inactive || 0 },
    orders: { total: Object.values(oc).reduce((a, b) => a + b, 0), pending: (oc.placed || 0) + (oc.confirmed || 0) + (oc.shipped || 0), delivered: oc.delivered || 0, cancelled: oc.cancelled || 0 },
    money: rupees(m),
    rating: { average: Math.round((rating[0]?.avg || 0) * 10) / 10, count: rating[0]?.n || 0 },
    recentOrders: recent.map((o) => ({ id: o._id, total: o.totalPaise / 100, status: o.status, paymentStatus: o.paymentStatus, createdAt: o.createdAt, items: o.lines.length })),
    lowStock: low.map((p) => ({ id: p._id, name: p.name, stock: p.stock, unit: p.unit })),
    notifications: notes.map((n) => ({ id: n._id, title: n.title, message: n.message, read: n.read, createdAt: n.createdAt })),
  } });
});

export const earnings = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const [m, txns, payouts] = await Promise.all([
    money(me),
    Order.find({ seller: me, status: { $ne: 'awaiting_payment' } }).sort({ createdAt: -1 }).limit(100).select('totalPaise paymentMethod paymentStatus status createdAt paidAt'),
    Payout.find({ seller: me }).sort({ createdAt: -1 }).limit(100),
  ]);
  res.json({ success: true, data: {
    summary: rupees(m), commissionPercent: commissionPercent(),
    transactions: txns.map((o) => ({ id: o._id, amount: o.totalPaise / 100, method: o.paymentMethod, paymentStatus: o.paymentStatus, status: o.status, date: o.paidAt || o.createdAt })),
    payouts: payouts.map((p) => ({ id: p._id, amount: p.amountPaise / 100, reference: p.reference, note: p.note, date: p.createdAt })),
  } });
});

const GROUPS = { day: { fmt: '%Y-%m-%d', back: 30 }, week: { fmt: '%G-W%V', back: 12 * 7 }, month: { fmt: '%Y-%m', back: 365 } };

export const analytics = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const since = (days) => new Date(Date.now() - days * 86400000);
  const series = async (key) => {
    const { fmt, back } = GROUPS[key];
    const rows = await Order.aggregate([
      { $match: { seller: me, status: { $in: SOLD }, createdAt: { $gte: since(back) } } },
      { $group: { _id: { $dateToString: { format: fmt, date: '$createdAt', timezone: 'Asia/Kolkata' } }, revenuePaise: { $sum: '$totalPaise' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } }]);
    return rows.map((r) => ({ label: r._id, revenue: r.revenuePaise / 100, orders: r.orders }));
  };
  const [daily, weekly, monthly, top, low, totals] = await Promise.all([
    series('day'), series('week'), series('month'),
    Order.aggregate([{ $match: { seller: me, status: { $in: SOLD } } }, { $unwind: '$lines' },
      { $group: { _id: '$lines.product', name: { $first: '$lines.name' }, unit: { $first: '$lines.unit' }, qty: { $sum: '$lines.qty' }, revenuePaise: { $sum: '$lines.linePaise' } } },
      { $sort: { qty: -1 } }, { $limit: 5 }]),
    Product.find({ seller: me, status: { $in: ['approved', 'inactive'] }, stock: { $lte: LOW_STOCK } }).sort({ stock: 1 }).limit(20).select('name stock unit'),
    Order.aggregate([{ $match: { seller: me, status: { $in: SOLD } } }, { $group: { _id: null, orders: { $sum: 1 }, revenuePaise: { $sum: '$totalPaise' } } }]),
  ]);
  res.json({ success: true, data: { daily, weekly, monthly,
    topProducts: top.map((t) => ({ id: t._id, name: t.name, unit: t.unit, qty: t.qty, revenue: t.revenuePaise / 100 })),
    lowStock: low.map((p) => ({ id: p._id, name: p.name, stock: p.stock, unit: p.unit })),
    totals: { orders: totals[0]?.orders || 0, revenue: (totals[0]?.revenuePaise || 0) / 100 } } });
});

// A spreadsheet can run "=..." typed by a buyer (name, address) as a formula. A leading quote makes it plain text.
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const salesReport = asyncHandler(async (req, res) => {
  const from = req.query.from ? new Date(`${req.query.from}T00:00:00+05:30`) : new Date(Date.now() - 30 * 86400000);
  const to = req.query.to ? new Date(`${req.query.to}T23:59:59+05:30`) : new Date();
  if (Number.isNaN(+from) || Number.isNaN(+to) || from > to) throw new ApiError(422, 'Choose a valid date range');
  if (to - from > 366 * 86400000) throw new ApiError(422, 'Choose a range of one year or less');
  const orders = await Order.find({ seller: req.user._id, status: { $ne: 'awaiting_payment' }, createdAt: { $gte: from, $lte: to } }).sort({ createdAt: 1 }).limit(5000);
  const head = ['Order', 'Date', 'Items', 'Total (INR)', 'Payment method', 'Payment status', 'Order status', 'District', 'State'];
  const rows = orders.map((o) => [String(o._id).slice(-6).toUpperCase(), o.createdAt.toISOString().slice(0, 10), o.lines.map((l) => `${l.name} x${l.qty} ${l.unit}`).join('; '),
    (o.totalPaise / 100).toFixed(2), o.paymentMethod, o.paymentStatus, o.status, o.address?.district, o.address?.state]);
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="sales-report.csv"' });
  res.send(`\uFEFF${[head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n')}\r\n`);
});

export const myReviews = asyncHandler(async (req, res) => {
  const items = await Review.find({ seller: req.user._id }).sort({ createdAt: -1 }).limit(100).populate('buyer', 'name').populate('product', 'name');
  const byProduct = await Review.aggregate([{ $match: { seller: req.user._id } }, { $group: { _id: '$product', avg: { $avg: '$rating' }, n: { $sum: 1 } } }]);
  const avg = items.length ? items.reduce((s, r) => s + r.rating, 0) / items.length : 0;
  res.json({ success: true, data: { average: Math.round(avg * 10) / 10, count: items.length,
    perProduct: byProduct.map((b) => ({ productId: b._id, average: Math.round(b.avg * 10) / 10, count: b.n })),
    reviews: items.map((r) => ({ id: r._id, rating: r.rating, comment: r.comment, buyerName: r.buyer?.name?.split(' ')[0], productName: r.product?.name, reply: r.reply?.text, createdAt: r.createdAt })) } });
});

// Sellers can answer a review but never edit its rating or text, and only on their own products.
export const replyToReview = asyncHandler(async (req, res) => {
  const r = await Review.findOneAndUpdate({ _id: req.params.id, seller: req.user._id }, { reply: { text: req.body.text, at: new Date() } }, { new: true });
  if (!r) throw new ApiError(404, 'Review not found');
  res.json({ success: true, data: { id: r._id, reply: r.reply.text } });
});
