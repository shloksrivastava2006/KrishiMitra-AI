import { Rental, RentalBooking } from '../models/Rental.js';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ONLINE_MAX_PAISE, rupeesToPaise, sellerLink } from '../services/marketRules.js';
import { createRazorpayOrder, razorpayEnabled, verifyPaymentSignature } from '../services/paymentService.js';
import { OWNER_PAYOUT_FIELDS, PAY_WINDOW_MINUTES, canReceiveOnline, expireUnpaidBookings, markRentalPaid, ownerRentalsLink } from '../services/rentalService.js';
import { notify } from '../services/notify.js';

const paise = (v) => (v === undefined || v === null || v === '' ? undefined : rupeesToPaise(v));
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exactCI = (v) => ({ $regex: `^${escapeRegex(String(v).trim())}$`, $options: 'i' });

// Public view never includes the street address or the owner's UPI id. Those are shown only to the owner (forOwner) or to a renter with a confirmed booking.
const view = (r, ownerName, { forOwner = false, near, ownerCanReceive = false } = {}) => ({
  id: r._id, name: r.name, type: r.type, description: r.description, images: r.images || [], hourly: r.hourlyPaise ? r.hourlyPaise / 100 : null,
  daily: r.dailyPaise ? r.dailyPaise / 100 : null, deposit: (r.depositPaise || 0) / 100, village: r.village, district: r.district, state: r.state, pincode: r.pincode, terms: r.terms,
  active: r.active, blocked: r.blocked, ownerName, createdAt: r.createdAt, onlineOk: razorpayEnabled() && Boolean(r.upiId || ownerCanReceive), near,
  ...(forOwner && { address: r.address, upiId: r.upiId }),
});

const pickupView = (rental, owner) => ({
  address: rental?.address, village: rental?.village, district: rental?.district, state: rental?.state, pincode: rental?.pincode, ownerName: owner?.name, ownerPhone: owner?.phone,
});
// The exact address is released when the renter can act on it: right after confirmation for pay-at-pickup, after payment for online.
const pickupVisible = (b) => ['confirmed', 'handed_over', 'completed'].includes(b.status) && (b.paymentMethod !== 'online' || b.paymentStatus === 'paid');

const bookingView = (b, extra = {}) => ({
  id: b._id, rentalId: b.rental?._id || b.rental, rentalName: b.rental?.name, start: b.start, end: b.end, rateType: b.rateType,
  amount: b.amountPaise / 100, deposit: b.depositPaise / 100, status: b.status, note: b.note, createdAt: b.createdAt,
  paymentMethod: b.paymentMethod, paymentStatus: b.paymentStatus, payBy: b.payBy,
  statusAt: { requested: b.createdAt, confirmed: b.statusAt?.confirmed, handed_over: b.statusAt?.handed_over, completed: b.statusAt?.completed, rejected: b.statusAt?.rejected, cancelled: b.statusAt?.cancelled },
  overdue: b.status === 'handed_over' && new Date(b.end) < new Date(), ...extra,
});

// Blocking states: a confirmed or handed-over booking owns its time slot.
const HOLDING = ['confirmed', 'handed_over'];
const overlapping = (rental, start, end, excludeId) => RentalBooking.findOne({ rental, status: { $in: HOLDING }, start: { $lt: end }, end: { $gt: start }, ...(excludeId && { _id: { $ne: excludeId } }) });

// ---- public ----
// Location-wise: state and district narrow the list; a PIN code puts the closest equipment first (same PIN, then same area code).
export const listPublic = asyncHandler(async (req, res) => {
  const filter = { active: true, blocked: false };
  if (req.query.type) filter.type = String(req.query.type);
  if (req.query.state) filter.state = exactCI(req.query.state);
  if (req.query.district) filter.district = exactCI(req.query.district);
  const q = String(req.query.q || '').trim().slice(0, 60);
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };
  const items = await Rental.find(filter).sort({ createdAt: -1 }).limit(150).populate({ path: 'owner', select: `name isActive ${OWNER_PAYOUT_FIELDS}` });
  const pin = /^[1-9]\d{5}$/.test(String(req.query.pincode || '')) ? String(req.query.pincode) : null;
  const score = (r) => (!pin || !r.pincode ? 0 : r.pincode === pin ? 3 : r.pincode.slice(0, 3) === pin.slice(0, 3) ? 2 : 0);
  const rows = items.filter((r) => r.owner?.isActive).map((r) => ({ r, s: score(r) })).sort((a, b) => b.s - a.s).slice(0, 60);
  res.json({ success: true, data: rows.map(({ r, s }) => view(r, r.owner.name.split(' ')[0], { near: s >= 2 ? (s === 3 ? 'pin' : 'area') : undefined, ownerCanReceive: canReceiveOnline(r.owner) })) });
});

// States and districts that actually have equipment, for the filter drop-downs.
export const locations = asyncHandler(async (req, res) => {
  const rows = await Rental.aggregate([{ $match: { active: true, blocked: false, state: { $nin: [null, ''] }, district: { $nin: [null, ''] } } }, { $group: { _id: { s: { $toLower: '$state' }, d: { $toLower: '$district' } }, state: { $first: '$state' }, district: { $first: '$district' }, n: { $sum: 1 } } }]);
  const out = rows.map((g) => ({ state: g.state, district: g.district, count: g.n })).sort((a, b) => a.state.localeCompare(b.state) || a.district.localeCompare(b.district));
  res.json({ success: true, data: out });
});

// ---- owner ----
export const mine = asyncHandler(async (req, res) => {
  const items = await Rental.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, data: items.map((r) => view(r, undefined, { forOwner: true })) });
});
const fromBody = (b) => ({ name: b.name, type: b.type, description: b.description, images: b.images, hourlyPaise: paise(b.hourly), dailyPaise: paise(b.daily),
  depositPaise: paise(b.deposit) ?? 0, address: b.address, village: b.village || undefined, district: b.district, state: b.state, pincode: b.pincode, upiId: b.upiId || undefined, terms: b.terms });
export const create = asyncHandler(async (req, res) => {
  const r = await Rental.create({ ...fromBody(req.body), owner: req.user._id });
  res.status(201).json({ success: true, data: view(r, undefined, { forOwner: true }) });
});
export const update = asyncHandler(async (req, res) => {
  const r = await Rental.findOne({ _id: req.params.id, owner: req.user._id });
  if (!r) throw new ApiError(404, 'Equipment not found');
  const next = fromBody(req.body);
  if (next.hourlyPaise === undefined) r.hourlyPaise = undefined;
  if (next.dailyPaise === undefined) r.dailyPaise = undefined;
  r.set(Object.fromEntries(Object.entries(next).filter(([, v]) => v !== undefined)));
  for (const f of ['upiId', 'village']) if (!req.body[f]) r[f] = undefined;   // an emptied box clears the saved value
  await r.save();
  res.json({ success: true, data: view(r, undefined, { forOwner: true }) });
});
export const setActive = asyncHandler(async (req, res) => {
  const r = await Rental.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, { active: req.body.active }, { new: true });
  if (!r) throw new ApiError(404, 'Equipment not found');
  res.json({ success: true, data: view(r, undefined, { forOwner: true }) });
});
export const remove = asyncHandler(async (req, res) => {
  const r = await Rental.findOne({ _id: req.params.id, owner: req.user._id });
  if (!r) throw new ApiError(404, 'Equipment not found');
  if (await RentalBooking.exists({ rental: r._id, status: { $in: ['requested', ...HOLDING] } })) throw new ApiError(409, 'Finish or reject open bookings before removing this listing');
  await r.deleteOne();
  res.json({ success: true, message: 'Listing removed' });
});

// ---- bookings ----
export const requestBooking = asyncHandler(async (req, res) => {
  const rental = await Rental.findOne({ _id: req.params.id, active: true, blocked: false });
  if (!rental) throw new ApiError(404, 'Equipment not found');
  if (String(rental.owner) === String(req.user._id)) throw new ApiError(403, 'You cannot book your own equipment');
  const owner = await User.findById(rental.owner).select(`isActive role ${OWNER_PAYOUT_FIELDS}`);
  if (!owner?.isActive) throw new ApiError(404, 'Equipment not found');
  if (!rental.address || !rental.pincode) throw new ApiError(409, 'The owner has not added the pickup address for this equipment yet');
  const start = new Date(req.body.start); const end = new Date(req.body.end);
  if (Number.isNaN(+start) || Number.isNaN(+end)) throw new ApiError(422, 'Choose valid start and end times');
  if (start < new Date(Date.now() - 5 * 60000)) throw new ApiError(422, 'Start time cannot be in the past');
  if (end <= start) throw new ApiError(422, 'End time must be after the start time');
  if (end - start > 30 * 86400000) throw new ApiError(422, 'A booking can be 30 days at most');
  const { rateType } = req.body;
  if (rateType === 'hour' && !rental.hourlyPaise) throw new ApiError(422, 'This equipment is not rented by the hour');
  if (rateType === 'day' && !rental.dailyPaise) throw new ApiError(422, 'This equipment is not rented by the day');
  const paymentMethod = req.body.paymentMethod === 'online' ? 'online' : 'pay_at_pickup';
  if (paymentMethod === 'online' && !(razorpayEnabled() && (rental.upiId || canReceiveOnline(owner)))) throw new ApiError(422, 'Online payment is not available for this equipment. Choose pay at pickup');
  // The server prices the booking; the client never sends an amount.
  const hours = Math.ceil((end - start) / 3600000);
  const amountPaise = rateType === 'hour' ? hours * rental.hourlyPaise : Math.ceil(hours / 24) * rental.dailyPaise;
  if (paymentMethod === 'online' && amountPaise > ONLINE_MAX_PAISE) throw new ApiError(422, 'Online payment is limited to Rs 5,00,000. Choose pay at pickup');
  if (await overlapping(rental._id, start, end)) throw new ApiError(409, 'This equipment is already booked for those times. Choose other times');
  const b = await RentalBooking.create({ rental: rental._id, owner: rental.owner, renter: req.user._id, start, end, rateType, amountPaise,
    depositPaise: rental.depositPaise || 0, note: req.body.note, contactPhone: req.user.phone, paymentMethod, paymentStatus: paymentMethod === 'online' ? 'unpaid' : 'pay_at_pickup' });
  notify(rental.owner, 'rental_request', 'New rental request', `${rental.name}, ${start.toLocaleDateString('en-IN')}`, sellerLink(owner.role, '/seller/rentals', '/my-equipment'));
  res.status(201).json({ success: true, data: bookingView(b, { rentalName: rental.name }) });
});

const RENTAL_FIELDS = 'name address village district state pincode';
export const myBookings = asyncHandler(async (req, res) => {
  await expireUnpaidBookings().catch(() => {});
  const items = await RentalBooking.find({ renter: req.user._id }).sort({ createdAt: -1 }).limit(50).populate('rental', RENTAL_FIELDS).populate('owner', 'name phone');
  res.json({ success: true, data: items.map((b) => bookingView(b, {
    location: { village: b.rental?.village, district: b.rental?.district, state: b.rental?.state, pincode: b.rental?.pincode },
    pickup: pickupVisible(b) ? pickupView(b.rental, b.owner) : undefined,
  })) });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  const b0 = await RentalBooking.findOne({ _id: req.params.id, renter: req.user._id, status: { $in: ['requested', 'confirmed'] } });
  if (!b0) throw new ApiError(409, 'This booking cannot be cancelled');
  const refund = b0.paymentMethod === 'online' && b0.paymentStatus === 'paid';
  const b = await RentalBooking.findOneAndUpdate({ _id: b0._id, status: b0.status }, { status: 'cancelled', 'statusAt.cancelled': new Date(), ...(refund && { paymentStatus: 'refund_due' }) }, { new: true }).populate('rental', 'name');
  if (!b) throw new ApiError(409, 'This booking changed. Refresh and try again');
  notify(b.owner, 'rental_update', 'Rental cancelled by renter', b.rental?.name, await ownerRentalsLink(b.owner));
  res.json({ success: true, data: bookingView(b) });
});

export const incoming = asyncHandler(async (req, res) => {
  await expireUnpaidBookings().catch(() => {});
  const items = await RentalBooking.find({ owner: req.user._id }).sort({ createdAt: -1 }).limit(100).populate('rental', 'name').populate('renter', 'name phone');
  res.json({ success: true, data: items.map((b) => bookingView(b, { renterName: b.renter?.name, renterPhone: b.renter?.phone })) });
});

const FLOW = { requested: ['confirmed', 'rejected'], confirmed: ['handed_over', 'cancelled'], handed_over: ['completed'] };
export const moveBooking = asyncHandler(async (req, res) => {
  let b = await RentalBooking.findOne({ _id: req.params.id, owner: req.user._id }).populate('rental', 'name');
  if (!b) throw new ApiError(404, 'Booking not found');
  const to = req.body.status; const now = new Date();
  if (!(FLOW[b.status] || []).includes(to)) throw new ApiError(409, `Cannot move a booking from "${b.status}" to "${to}"`);
  let message = `Your rental request was ${to.replace('_', ' ')}`;
  if (to === 'confirmed') {
    if (await overlapping(b.rental._id, b.start, b.end, b._id)) throw new ApiError(409, 'Another confirmed booking already covers these times');
    const online = b.paymentMethod === 'online';
    const claimed = await RentalBooking.findOneAndUpdate({ _id: b._id, status: 'requested' },
      { status: 'confirmed', 'statusAt.confirmed': now, ...(online && { payBy: new Date(now.getTime() + PAY_WINDOW_MINUTES * 60000) }) }, { new: true });
    if (!claimed) throw new ApiError(409, 'This booking changed. Refresh and try again');
    // Two confirmations at the same instant could both pass the check above; this second look makes both back off rather than double-book.
    if (await overlapping(b.rental._id, b.start, b.end, b._id)) {
      await RentalBooking.updateOne({ _id: b._id, status: 'confirmed' }, { status: 'requested', $unset: { payBy: 1, 'statusAt.confirmed': 1 } });
      throw new ApiError(409, 'Another confirmed booking already covers these times');
    }
    b = await RentalBooking.findById(b._id).populate('rental', 'name');
    if (online) message = `Your rental request was confirmed. Pay within ${PAY_WINDOW_MINUTES / 60} hours to keep the booking`;
  } else {
    if (to === 'handed_over') {
      if (b.paymentStatus === 'unpaid') throw new ApiError(409, 'The renter has not paid online yet. Wait for the payment before handing over');
      if (b.paymentMethod === 'pay_at_pickup') { b.paymentStatus = 'paid'; b.paidAt = now; }   // rent collected in person
    }
    if (['rejected', 'cancelled'].includes(to) && b.paymentMethod === 'online' && b.paymentStatus === 'paid') b.paymentStatus = 'refund_due';
    b.status = to; b.set(`statusAt.${to}`, now);
    await b.save();
    if (to === 'completed') message = 'Equipment returned. Thank you!';
  }
  notify(b.renter, 'rental_update', message, b.rental?.name, '/my-bookings');
  res.json({ success: true, data: bookingView(b) });
});

// ---- online rent ----
// Opens the payment window for a booking the owner confirmed. Rent only: the deposit is handed over in person.
export const payInfo = asyncHandler(async (req, res) => {
  await expireUnpaidBookings().catch(() => {});
  const b = await RentalBooking.findOne({ _id: req.params.id, renter: req.user._id });
  if (!b || b.paymentMethod !== 'online' || b.status !== 'confirmed' || b.paymentStatus !== 'unpaid') throw new ApiError(409, 'This booking is not waiting for payment');
  if (!b.razorpayOrderId) {
    const rz = await createRazorpayOrder({ amountPaise: b.amountPaise, receipt: `rb_${String(b._id).slice(-12)}` });
    b.razorpayOrderId = rz.id; await b.save();
  }
  res.json({ success: true, data: { razorpay: { keyId: env.razorpayKeyId, orderId: b.razorpayOrderId, amount: b.amountPaise, currency: 'INR' } } });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const b = await RentalBooking.findOne({ _id: req.params.id, renter: req.user._id }).populate('rental', 'name');
  if (!b || b.paymentMethod !== 'online') throw new ApiError(404, 'Booking not found');
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
  if (orderId !== b.razorpayOrderId || !verifyPaymentSignature({ orderId, paymentId, signature, secret: env.razorpayKeySecret })) {
    throw new ApiError(400, 'Payment could not be verified. If money was deducted it will be matched automatically or refunded; contact support with your booking details');
  }
  const was = b.paymentStatus;
  const paid = await markRentalPaid(b, paymentId);
  if (was === 'unpaid' && paid.paymentStatus === 'paid') notify(paid.owner, 'payment_received', 'Rent paid online', `${b.rental?.name}: Rs ${(paid.amountPaise / 100).toFixed(2)}. The renter can now collect the equipment`, await ownerRentalsLink(paid.owner));
  res.json({ success: true, data: bookingView(paid, { rentalName: b.rental?.name }) });
});
