import { User } from '../models/User.js';
import { Farm } from '../models/Farm.js';
import { Product, publicProduct } from '../models/Product.js';
import { Order } from '../models/Order.js';
import { Crop } from '../models/Crop.js';
import { Payout } from '../models/Payout.js';
import { Rental, RentalBooking } from '../models/Rental.js';
import { Review } from '../models/Review.js';
import { Notification } from '../models/Notification.js';
import { DiseaseCheck } from '../models/DiseaseCheck.js';
import { accessFor } from '../services/adminAccess.js';
import { EARNING_STATUSES } from '../services/rentalService.js';
import { owedPaise } from '../services/payoutService.js';
import { notify } from '../services/notify.js';
import { commissionPaise, isProduce, sellerLink } from '../services/marketRules.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const overview = asyncHandler(async (req, res) => {
  const [byRole, blocked, farms, crops, pendingProducts, pendingSellers] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
    User.countDocuments({ isActive: false }),
    Farm.countDocuments(), Crop.countDocuments(),
    Product.countDocuments({ status: 'pending' }),
    User.countDocuments({ role: 'vendor', 'seller.verification': 'pending' }),
  ]);
  const n = Object.fromEntries(byRole.map((g) => [g._id, g.n]));
  const users = byRole.reduce((sum, g) => sum + g.n, 0);
  res.json({ success: true, data: { users, farmers: n.farmer || 0, sellers: n.vendor || 0, customers: n.customer || 0, admins: n.admin || 0, blocked, farms, crops, pendingProducts, pendingSellers } });
});

const USER_ROLES = ['farmer', 'vendor', 'customer', 'admin'];
const escapeRegex = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Search and filter every account. Each row says whether THIS admin may block or delete it, so the screen never offers a button that would be refused.
export const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 25;
  const filter = {};
  if (USER_ROLES.includes(req.query.role)) filter.role = req.query.role;
  if (req.query.status === 'blocked') filter.isActive = false;
  else if (req.query.status === 'active') filter.isActive = true;
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q) { const rx = { $regex: escapeRegex(q), $options: 'i' }; filter.$or = [{ name: rx }, { email: rx }, { phone: rx }]; }
  const [items, total, byRole, blocked] = await Promise.all([
    User.find(filter).sort({ isMainAdmin: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    User.countDocuments(filter),
    User.aggregate([{ $group: { _id: '$role', n: { $sum: 1 } } }]),
    User.countDocuments({ isActive: false }),
  ]);
  const counts = { all: 0, blocked }; for (const g of byRole) { counts[g._id] = g.n; counts.all += g.n; }
  res.json({ success: true, data: {
    users: items.map((u) => ({
      id: u._id, name: u.name, email: u.email, phone: u.phone, role: u.role, district: u.district, state: u.state, shopName: u.seller?.shopName,
      isActive: u.isActive, isMainAdmin: Boolean(u.isMainAdmin), createdAt: u.createdAt, ...accessFor(req.user, u),
    })),
    page, pages: Math.max(1, Math.ceil(total / limit)), total, counts, canManageAdmins: Boolean(req.user.isMainAdmin),
  } });
});

// Restricted provisioning: only the main admin can add another admin. Public signup can never do this.
export const createAdmin = asyncHandler(async (req, res) => {
  if (!req.user.isMainAdmin) throw new ApiError(403, 'Only the main admin can add another admin');
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists');
  const user = await User.create({ name, email, password, role: 'admin', createdBy: req.user._id });
  res.status(201).json({ success: true, data: { user: user.toSafeObject() } });
});

function assertCan(actor, target, what) {
  if (accessFor(actor, target)[what]) return;
  if (String(actor._id) === String(target._id)) throw new ApiError(403, 'You cannot do this to your own account');
  if (target.isMainAdmin) throw new ApiError(403, 'The main admin cannot be blocked or deleted');
  throw new ApiError(403, 'Only the main admin can manage other admins');
}

// Block or unblock any account the admin is allowed to manage. Blocking ends that person's sessions at once.
export const setUserStatus = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) throw new ApiError(404, 'Account not found');
  assertCan(req.user, target, 'canBlock');
  const active = req.body.active;
  await User.updateOne({ _id: target._id }, { isActive: active, ...(active ? {} : { $inc: { tokenVersion: 1 } }) });
  res.json({ success: true, data: { id: target._id, isActive: active } });
});

const OPEN_ORDER = ['awaiting_payment', 'placed', 'confirmed', 'shipped'];

// Deletes the account and the personal data that hangs off it (farms, crops, listings, equipment, notifications, reviews).
// Orders and payout records stay: they are financial history the other party still needs.
export const deleteUser = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) throw new ApiError(404, 'Account not found');
  assertCan(req.user, target, 'canDelete');
  const id = target._id;
  if (target.role !== 'admin') {
    const party = { $or: [{ buyer: id }, { seller: id }] };
    if (await Order.exists({ $and: [party, { $or: [{ status: { $in: OPEN_ORDER } }, { paymentStatus: 'refund_due' }] }] })) {
      throw new ApiError(409, 'This account still has orders or refunds in progress. Block it for now, and delete it after they are finished');
    }
    if (await RentalBooking.exists({ $or: [{ owner: id }, { renter: id }], status: { $in: ['requested', 'confirmed', 'handed_over'] } })) {
      throw new ApiError(409, 'This account still has equipment bookings in progress. Block it for now, and delete it after they are finished');
    }
    if ((await owedPaise(id)) > 0) throw new ApiError(409, 'This seller is still owed money. Record the payout first, then delete the account');
    if (await RentalBooking.exists({ renter: id, paymentStatus: 'refund_due' })) throw new ApiError(409, 'A rent refund is still due to this account. Refund it first, then delete the account');
    await Promise.all([
      Farm.deleteMany({ owner: id }), Crop.deleteMany({ owner: id }), DiseaseCheck.deleteMany({ owner: id }),
      Notification.deleteMany({ user: id }), Rental.deleteMany({ owner: id }), RentalBooking.deleteMany({ $or: [{ owner: id }, { renter: id }] }),
      Product.deleteMany({ seller: id }), Review.deleteMany({ $or: [{ seller: id }, { buyer: id }] }),
    ]);
  }
  await Notification.deleteMany({ user: id });
  await target.deleteOne();
  res.json({ success: true, data: { id } });
});

export const listProductsForReview = asyncHandler(async (req, res) => {
  const status = ['pending', 'approved', 'rejected'].includes(req.query.status) ? req.query.status : 'pending';
  const items = await Product.find({ status }).sort({ createdAt: -1 }).limit(100).populate('seller', 'name email phone seller.shopName seller.verification');
  res.json({ success: true, data: items.map((p) => ({ ...publicProduct(p), status: p.status, seller: { name: p.seller?.name, email: p.seller?.email, phone: p.seller?.phone, shopName: p.seller?.seller?.shopName, verification: p.seller?.seller?.verification } })) });
});

export const reviewProduct = asyncHandler(async (req, res) => {
  const { decision, reason } = req.body;
  if (decision === 'reject' && !reason) throw new ApiError(422, 'Give a reason so the seller can fix the listing');
  const p = await Product.findOneAndUpdate({ _id: req.params.id, status: { $in: ['pending', 'approved', 'rejected'] } },
    decision === 'approve' ? { status: 'approved', approvedAt: new Date(), $unset: { rejectionReason: 1 } } : { status: 'rejected', rejectionReason: reason }, { new: true });
  if (!p) throw new ApiError(404, 'Product not found');
  const role = (await User.findById(p.seller).select('role'))?.role;
  const link = sellerLink(role, '/seller/products', isProduce(p.category) ? '/sell-produce' : '/my-products');
  if (decision === 'approve') notify(p.seller, 'product_approved', 'Product approved', `"${p.name}" is now live in the marketplace`, link);
  else notify(p.seller, 'product_rejected', 'Product rejected', `"${p.name}": ${reason}`, link);
  res.json({ success: true, data: { id: p._id, status: p.status } });
});

export const listAllOrders = asyncHandler(async (req, res) => {
  const items = await Order.find().sort({ createdAt: -1 }).limit(100).populate('buyer', 'name').populate('seller', 'name');
  res.json({ success: true, data: items.map((o) => ({ id: o._id, createdAt: o.createdAt, status: o.status, paymentMethod: o.paymentMethod, paymentStatus: o.paymentStatus, total: o.totalPaise / 100, buyer: o.buyer?.name || 'Deleted user', seller: o.seller?.name || 'Deleted user', razorpayPaymentId: o.razorpayPaymentId })) });
});

// ---- sellers ----
export const listSellers = asyncHandler(async (req, res) => {
  const items = await User.find({ role: 'vendor' }).sort({ createdAt: -1 }).limit(200);
  const ids = items.map((u) => u._id);
  const [paid, rent, out] = await Promise.all([
    Order.aggregate([{ $match: { seller: { $in: ids }, status: { $in: ['placed', 'confirmed', 'shipped', 'delivered'] }, paymentStatus: 'paid' } }, { $group: { _id: '$seller', t: { $sum: '$totalPaise' } } }]),
    RentalBooking.aggregate([{ $match: { owner: { $in: ids }, paymentMethod: 'online', paymentStatus: 'paid', status: { $in: EARNING_STATUSES } } }, { $group: { _id: '$owner', t: { $sum: '$amountPaise' } } }]),
    Payout.aggregate([{ $match: { seller: { $in: ids } } }, { $group: { _id: '$seller', t: { $sum: '$amountPaise' } } }]),
  ]);
  const paidMap = new Map(paid.map((g) => [String(g._id), g.t]));
  for (const g of rent) paidMap.set(String(g._id), (paidMap.get(String(g._id)) || 0) + g.t);
  const outMap = new Map(out.map((g) => [String(g._id), g.t]));
  res.json({ success: true, data: items.map((u) => {
    const gross = paidMap.get(String(u._id)) || 0; const net = gross - commissionPaise(gross);
    return { ...u.toSafeObject(), isActive: u.isActive, createdAt: u.createdAt, pendingPayout: Math.max(0, net - (outMap.get(String(u._id)) || 0)) / 100 };
  }) });
});

export const reviewSeller = asyncHandler(async (req, res) => {
  const { decision, note } = req.body;
  if (['reject', 'suspend'].includes(decision) && !note) throw new ApiError(422, 'Give a reason');
  const u = await User.findOne({ _id: req.params.id, role: 'vendor' });
  if (!u) throw new ApiError(404, 'Seller not found');
  if (decision === 'suspend') { u.isActive = false; u.tokenVersion = (u.tokenVersion || 0) + 1; }   // ends their sessions immediately
  else if (decision === 'reinstate') u.isActive = true;
  else { u.seller.verification = decision === 'verify' ? 'verified' : 'rejected'; u.seller.verificationNote = decision === 'verify' ? undefined : note; }
  await u.save();
  if (['verify', 'reject'].includes(decision)) notify(u._id, 'seller_verification', decision === 'verify' ? 'Your seller account is verified' : 'Seller verification rejected', note, '/seller/profile');
  res.json({ success: true, data: { id: u._id, isActive: u.isActive, verification: u.seller?.verification } });
});

// Records money the admin already paid to the seller outside the app. Capped at what the seller is actually owed.
export const recordPayout = asyncHandler(async (req, res) => {
  const seller = await User.findOne({ _id: req.params.id, role: { $in: ['vendor', 'farmer'] } });   // farmers can be owed online equipment rent
  if (!seller) throw new ApiError(404, 'Seller not found');
  const amountPaise = Math.round(Number(req.body.amount) * 100);
  const owed = await owedPaise(seller._id);
  if (amountPaise > owed) throw new ApiError(422, `This seller is owed only Rs ${(Math.max(0, owed) / 100).toFixed(2)}`);
  const p = await Payout.create({ seller: seller._id, amountPaise, reference: req.body.reference, note: req.body.note, recordedBy: req.user._id });
  notify(seller._id, 'payout', 'Payout sent', `Rs ${(amountPaise / 100).toFixed(2)}, ref ${p.reference}`, sellerLink(seller.role, '/seller/earnings', '/my-earnings'));
  res.status(201).json({ success: true, data: { id: p._id } });
});

// Online equipment rent waiting to be paid out to owners, and cancelled bookings whose rent must be refunded.
export const rentalMoney = asyncHandler(async (req, res) => {
  // Online money held for owners: rent paid online, and online sales by farmers (sellers see theirs on the Sellers page).
  const [rentOwners, soldOnline] = await Promise.all([
    RentalBooking.aggregate([{ $match: { paymentMethod: 'online', paymentStatus: 'paid', status: { $in: EARNING_STATUSES } } }, { $group: { _id: '$owner' } }]),
    Order.aggregate([{ $match: { paymentMethod: 'online', paymentStatus: 'paid', status: { $in: ['placed', 'confirmed', 'shipped', 'delivered'] } } }, { $group: { _id: '$seller' } }]),
  ]);
  const farmerSellers = await User.find({ _id: { $in: soldOnline.map((g) => g._id) }, role: 'farmer' }).distinct('_id');
  const ownerIds = [...new Map([...rentOwners.map((g) => g._id), ...farmerSellers].map((id) => [String(id), id])).values()];
  const [owners, listings, refunds] = await Promise.all([
    User.find({ _id: { $in: ownerIds } }).select('name phone email role payout.upiId payout.accountName payout.accountLast4 payout.ifsc seller.upiId seller.bankAccountName seller.bankAccountLast4 seller.bankIfsc'),
    Rental.find({ owner: { $in: ownerIds }, upiId: { $exists: true, $ne: '' } }).select('owner upiId'),
    RentalBooking.find({ paymentStatus: 'refund_due' }).sort({ updatedAt: -1 }).limit(100).populate('rental', 'name').populate('renter', 'name phone'),
  ]);
  const rows = await Promise.all(owners.map(async (u) => ({
    id: u._id, name: u.name, phone: u.phone, email: u.email, role: u.role, owed: Math.max(0, await owedPaise(u._id)) / 100,
    upiIds: [...new Set([u.payout?.upiId, u.seller?.upiId, ...listings.filter((l) => String(l.owner) === String(u._id)).map((l) => l.upiId)].filter(Boolean))],
    bank: (u.payout?.accountLast4 || u.seller?.bankAccountLast4) ? { name: u.payout?.accountName || u.seller?.bankAccountName, last4: u.payout?.accountLast4 || u.seller?.bankAccountLast4, ifsc: u.payout?.ifsc || u.seller?.bankIfsc } : null,
  })));
  res.json({ success: true, data: {
    owners: rows.filter((r) => r.owed > 0),
    refunds: refunds.map((b) => ({ id: b._id, rentalName: b.rental?.name, renterName: b.renter?.name || 'Deleted user', renterPhone: b.renter?.phone, amount: b.amountPaise / 100, paymentId: b.razorpayPaymentId })),
  } });
});
// The only place a full account number leaves the server: an admin who is about to send money asks for it, and the request is logged.
export const revealPayout = asyncHandler(async (req, res) => {
  const u = await User.findOne({ _id: req.params.id, role: { $in: ['farmer', 'vendor'] } }).select('+payout.accountNumber +seller.bankAccountNumber');
  if (!u) throw new ApiError(404, 'Account not found');
  const d = u.role === 'farmer'
    ? { upiId: u.payout?.upiId, accountName: u.payout?.accountName, accountNumber: u.get('payout.accountNumber'), ifsc: u.payout?.ifsc }
    : { upiId: u.seller?.upiId, accountName: u.seller?.bankAccountName, accountNumber: u.get('seller.bankAccountNumber'), ifsc: u.seller?.bankIfsc };
  console.log(`Payout details of ${u._id} viewed by admin ${req.user.email}`);
  res.json({ success: true, data: { name: u.name, ...d } });
});

// The admin refunded the rent in the Razorpay dashboard; this clears it from the list and tells the renter.
export const rentalRefunded = asyncHandler(async (req, res) => {
  const b = await RentalBooking.findOneAndUpdate({ _id: req.params.id, paymentStatus: 'refund_due' }, { paymentStatus: 'refunded' }, { new: true }).populate('rental', 'name');
  if (!b) throw new ApiError(404, 'No refund is due for this booking');
  notify(b.renter, 'general', 'Rent refunded', `${b.rental?.name}: Rs ${(b.amountPaise / 100).toFixed(2)}`, '/my-bookings');
  res.json({ success: true, data: { id: b._id } });
});

export const listRentals = asyncHandler(async (req, res) => {
  const items = await Rental.find().sort({ createdAt: -1 }).limit(100).populate('owner', 'name');
  res.json({ success: true, data: items.map((r) => ({ id: r._id, name: r.name, type: r.type, owner: r.owner?.name, daily: r.dailyPaise ? r.dailyPaise / 100 : null, hourly: r.hourlyPaise ? r.hourlyPaise / 100 : null, active: r.active, blocked: r.blocked })) });
});
export const blockRental = asyncHandler(async (req, res) => {
  const r = await Rental.findByIdAndUpdate(req.params.id, { blocked: req.body.blocked }, { new: true });
  if (!r) throw new ApiError(404, 'Equipment not found');
  res.json({ success: true, data: { id: r._id, blocked: r.blocked } });
});
