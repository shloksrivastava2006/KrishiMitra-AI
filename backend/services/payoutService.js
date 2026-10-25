import { Order } from '../models/Order.js';
import { RentalBooking } from '../models/Rental.js';
import { Payout } from '../models/Payout.js';
import { User } from '../models/User.js';
import { commissionPaise } from './marketRules.js';
import { EARNING_STATUSES } from './rentalService.js';

const COUNTED = ['placed', 'confirmed', 'shipped', 'delivered'];

// What the site owes one seller or farmer, in paise: paid orders and online rent, minus the commission, minus payouts already made.
// Sellers (vendors) count every paid order, as before. A farmer's cash-on-delivery sales are not counted, because the farmer already
// has that cash in hand; only money the buyer paid online (which the site holds) is owed to a farmer.
export async function settlement(sellerId) {
  const role = (await User.findById(sellerId).select('role'))?.role;
  const orderMatch = { seller: sellerId, status: { $in: COUNTED }, paymentStatus: 'paid', ...(role === 'farmer' && { paymentMethod: 'online' }) };
  const [orders, rent, out] = await Promise.all([
    Order.aggregate([{ $match: orderMatch }, { $group: { _id: null, t: { $sum: '$totalPaise' } } }]),
    RentalBooking.aggregate([{ $match: { owner: sellerId, paymentMethod: 'online', paymentStatus: 'paid', status: { $in: EARNING_STATUSES } } }, { $group: { _id: null, t: { $sum: '$amountPaise' } } }]),
    Payout.aggregate([{ $match: { seller: sellerId } }, { $group: { _id: null, t: { $sum: '$amountPaise' } } }]),
  ]);
  const grossPaise = (orders[0]?.t || 0) + (rent[0]?.t || 0);
  const fee = commissionPaise(grossPaise);
  const paidOutPaise = out[0]?.t || 0;
  return { grossPaise, commissionPaise: fee, paidOutPaise, owedPaise: grossPaise - fee - paidOutPaise };
}

export const owedPaise = async (sellerId) => (await settlement(sellerId)).owedPaise;
