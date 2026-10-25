import { ApiError } from '../utils/ApiError.js';

// Farm produce sold by farmers (crops, vegetables, fruits ...). A listing is "produce" purely because of its category, so the two can never disagree.
export const PRODUCE_CATEGORIES = ['grains-pulses', 'vegetables', 'fruits', 'oilseeds', 'spices', 'flowers', 'farm-other'];
export const INPUT_CATEGORIES = ['seeds', 'fertilizers', 'bio-pesticides', 'organic', 'machinery', 'solar', 'other'];
export const CATEGORIES = [...INPUT_CATEGORIES.slice(0, 4), ...PRODUCE_CATEGORIES, ...INPUT_CATEGORIES.slice(4)];
export const isProduce = (category) => PRODUCE_CATEGORIES.includes(category);
export const GRADES = ['A', 'B', 'C'];
// Harvest date may be a recent past date, or an expected date up to 90 days ahead (for selling before harvest).
export const HARVEST_PAST_DAYS = 60;
export const HARVEST_FUTURE_DAYS = 90;
export function harvestDateOk(value, now = new Date()) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const day = 24 * 60 * 60 * 1000;
  return d >= new Date(now.getTime() - HARVEST_PAST_DAYS * day) && d <= new Date(now.getTime() + HARVEST_FUTURE_DAYS * day);
}
// Online payment lands in the platform's Razorpay account and is paid out to sellers by hand, so the seller needs a UPI ID or bank account on file.
// Sellers (vendors) give those when they register. A farmer can take online payment once they have saved a UPI ID or bank account under "Bank details";
// until then their orders are cash on delivery. Pass the seller's user record (or just a role string, which can never unlock a farmer).
export const ONLINE_PAYMENT_SELLER_ROLES = ['vendor'];
export const hasPayoutDetails = (u) => Boolean(u && typeof u === 'object' && (u.payout?.upiId || u.payout?.accountLast4 || u.seller?.upiId || u.seller?.bankAccountLast4));
export const onlinePaymentAllowed = (seller) => {
  const role = typeof seller === 'string' ? seller : seller?.role;
  return ONLINE_PAYMENT_SELLER_ROLES.includes(role) || (role === 'farmer' && hasPayoutDetails(seller));
};
export const codOnlyForRole = (seller) => (typeof seller === 'string' ? seller : seller?.role) === 'farmer' && !onlinePaymentAllowed(seller);
// Where a seller should be sent for a notification. Vendors have /seller/*; farmers use the single-site pages.
export const sellerLink = (role, vendorPath, farmerPath) => (role === 'vendor' ? vendorPath : farmerPath);

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Public marketplace filter. type: 'produce' (fresh from farmers) or 'inputs' (seeds, fertilizers, machinery ...).
export function buildListFilter(q = {}) {
  const filter = { status: 'approved' };
  if (q.type === 'produce') filter.category = { $in: PRODUCE_CATEGORIES };
  else if (q.type === 'inputs') filter.category = { $in: INPUT_CATEGORIES };
  if (q.category) {
    // A category outside the chosen tab matches nothing, instead of silently widening the search.
    filter.category = filter.category && !filter.category.$in.includes(q.category) ? { $in: [] } : q.category;
  }
  if (q.q) filter.name = { $regex: escapeRegex(q.q), $options: 'i' };
  if (q.district) filter.district = { $regex: `^${escapeRegex(String(q.district).trim())}$`, $options: 'i' };
  if (q.organic === true || q.organic === 'true') filter.organic = true;
  return filter;
}
// Selling these usually needs a licence or registration. Admin checks the number before approving a listing.
export const LICENCE_REQUIRED = ['seeds', 'fertilizers', 'bio-pesticides'];
export const UNITS = ['kg', 'quintal', 'packet', 'bag', 'litre', 'piece', 'dozen', 'bunch'];
export const PRODUCT_STATUSES = ['pending', 'approved', 'rejected', 'inactive', 'archived'];
export const MAX_IMAGES = 5;
// Share of each paid order that the platform keeps. 0 until you decide a rate (set PLATFORM_COMMISSION_PERCENT in .env).
export const commissionPercent = () => {
  const n = Number(process.env.PLATFORM_COMMISSION_PERCENT);
  return Number.isFinite(n) && n >= 0 && n <= 50 ? n : 0;
};
export const commissionPaise = (grossPaise) => Math.round((grossPaise * commissionPercent()) / 100);

// What the buyer actually pays per unit: list price minus the seller's discount, in whole paise.
export const salePaiseOf = (pricePaise, discountPercent = 0) => Math.max(100, Math.round((pricePaise * (100 - (discountPercent || 0))) / 100));
export const unitPaiseOf = (p) => p.salePaise ?? p.pricePaise;
export const ONLINE_MAX_PAISE = 50_000_000;   // Razorpay's single-transaction limit: Rs 5,00,000
export const MAX_QTY = 1000;
export const UNPAID_HOLD_MINUTES = 30;

// Money is stored as integer paise so rounding errors can never move a rupee.
export function rupeesToPaise(value) {
  const text = String(value).trim();
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) throw new ApiError(422, 'Enter a price in rupees with at most 2 decimals');
  const paise = Math.round(Number(text) * 100);
  if (paise < 100 || paise > 100_000_000) throw new ApiError(422, 'Price must be between Rs 1 and Rs 10,00,000');
  return paise;
}
export const paiseToRupees = (paise) => paise / 100;

// items: [{ productId, qty }]. products: Map(id -> product). The server prices everything itself; client prices are never read.
export function buildLines(items, products, buyerId) {
  const merged = new Map();
  for (const it of items) {
    const qty = Number(it.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new ApiError(422, `Quantity must be a whole number from 1 to ${MAX_QTY}`);
    merged.set(String(it.productId), (merged.get(String(it.productId)) || 0) + qty);
  }
  let sellerId = null;
  const lines = [];
  for (const [id, qty] of merged) {
    const p = products.get(id);
    if (!p || p.status !== 'approved') throw new ApiError(409, 'A product in your cart is no longer available');
    if (String(p.seller) === String(buyerId)) throw new ApiError(403, 'You cannot buy your own product');
    if (sellerId && String(p.seller) !== sellerId) throw new ApiError(422, 'Order from one seller at a time');
    sellerId = String(p.seller);
    if (qty > p.stock) throw new ApiError(409, `Only ${p.stock} ${p.unit} of "${p.name}" left`);
    if (qty < (p.minOrderQty || 1)) throw new ApiError(422, `Minimum order for "${p.name}" is ${p.minOrderQty} ${p.unit}`);
    const unitPaise = unitPaiseOf(p);
    lines.push({ product: p._id, name: p.name, unit: p.unit, unitPaise, qty, linePaise: unitPaise * qty });
  }
  const totalPaise = lines.reduce((s, l) => s + l.linePaise, 0);
  return { sellerId, lines, totalPaise };
}

const NEXT = {
  awaiting_payment: ['placed', 'cancelled'],   // 'placed' only through a verified payment, never by hand
  placed: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [], cancelled: [],
};
export const canMove = (from, to) => (NEXT[from] || []).includes(to);
// Buyers may cancel only before the seller has confirmed.
export const buyerCanCancel = (status) => ['awaiting_payment', 'placed'].includes(status);
// Seller moves: confirm, ship, deliver, cancel. Never 'placed' (that is payment) and never out of awaiting_payment.
export const sellerCanMove = (from, to) => from !== 'awaiting_payment' && to !== 'placed' && canMove(from, to);
