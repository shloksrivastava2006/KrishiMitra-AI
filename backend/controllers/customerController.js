import { Order } from '../models/Order.js';
import { RentalBooking } from '../models/Rental.js';
import { Notification } from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { expireUnpaidOrders } from '../services/orderService.js';
import { expireUnpaidBookings } from '../services/rentalService.js';
import { ACTIVE_BOOKING_STATUSES, summarizeBookings, summarizeOrders } from '../services/customerService.js';

// Customer dashboard. Every query is filtered by req.user._id, so a customer only ever sees their own orders, bookings and notifications.
export const summary = asyncHandler(async (req, res) => {
  const me = req.user._id;
  // Same housekeeping the order and booking lists do, so abandoned online payments do not inflate the numbers.
  await Promise.all([expireUnpaidOrders().catch(() => {}), expireUnpaidBookings().catch(() => {})]);
  const [orders, bookings, recent, upcoming, notes, unread] = await Promise.all([
    Order.aggregate([{ $match: { buyer: me } }, { $group: { _id: '$status', n: { $sum: 1 }, totalPaise: { $sum: '$totalPaise' } } }]),
    RentalBooking.aggregate([{ $match: { renter: me } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Order.find({ buyer: me }).sort({ createdAt: -1 }).limit(5),
    RentalBooking.find({ renter: me, status: { $in: ACTIVE_BOOKING_STATUSES }, end: { $gte: new Date() } }).sort({ start: 1 }).limit(3).populate('rental', 'name'),
    Notification.find({ user: me }).sort({ createdAt: -1 }).limit(5),
    Notification.countDocuments({ user: me, read: false }),
  ]);
  res.json({ success: true, data: {
    orders: summarizeOrders(orders),
    bookings: summarizeBookings(bookings),
    recentOrders: recent.map((o) => ({ id: o._id, total: o.totalPaise / 100, status: o.status, paymentStatus: o.paymentStatus, createdAt: o.createdAt, items: o.lines.length })),
    upcomingBookings: upcoming.map((b) => ({ id: b._id, name: b.rental?.name || '', start: b.start, end: b.end, status: b.status })),
    unreadNotifications: unread,
    notifications: notes.map((n) => ({ id: n._id, title: n.title, message: n.message, read: n.read, createdAt: n.createdAt })),
  } });
});
