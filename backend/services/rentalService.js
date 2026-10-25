import { RentalBooking } from '../models/Rental.js';
import { User } from '../models/User.js';
import { notify } from './notify.js';
import { sellerLink } from './marketRules.js';

export const PAY_WINDOW_MINUTES = 180;
// Money for these counts as the owner's: the booking is live or done.
export const EARNING_STATUSES = ['confirmed', 'handed_over', 'completed'];

// Called from the checkout callback and the webhook, so it must be safe to run twice.
// Money that arrives after the booking was cancelled or rejected is flagged for a manual refund.
export async function markRentalPaid(b, paymentId) {
  const late = ['cancelled', 'rejected'].includes(b.status);
  const patch = { razorpayPaymentId: paymentId, paidAt: new Date(), paymentStatus: late ? 'refund_due' : 'paid' };
  return (await RentalBooking.findOneAndUpdate({ _id: b._id, paymentStatus: 'unpaid' }, patch, { new: true })) || (await RentalBooking.findById(b._id));
}

// An online booking the owner confirmed but the renter never paid for frees its time slot again.
export async function expireUnpaidBookings() {
  const stale = await RentalBooking.find({ status: 'confirmed', paymentMethod: 'online', paymentStatus: 'unpaid', payBy: { $lt: new Date() } }).limit(50).populate('rental', 'name');
  for (const b of stale) {
    const hit = await RentalBooking.updateOne({ _id: b._id, status: 'confirmed', paymentStatus: 'unpaid' }, { status: 'cancelled', 'statusAt.cancelled': new Date() });
    if (!hit.modifiedCount) continue;
    notify(b.renter, 'rental_update', 'Rental cancelled: payment not received in time', b.rental?.name, '/my-bookings');
    notify(b.owner, 'rental_update', 'Rental released: renter did not pay in time', b.rental?.name, await ownerRentalsLink(b.owner));
  }
  return stale.length;
}

// Online rent can be sent only to an owner who has saved a UPI ID or bank account (farmers in "Bank details", sellers in their profile).
export const OWNER_PAYOUT_FIELDS = 'payout.upiId payout.accountLast4 seller.upiId seller.bankAccountLast4';
export const canReceiveOnline = (owner) => Boolean(owner?.payout?.upiId || owner?.payout?.accountLast4 || owner?.seller?.upiId || owner?.seller?.bankAccountLast4);

// Sellers manage equipment under /seller; farmers under /my-equipment.
export const ownerRentalsLink = async (ownerId) => sellerLink((await User.findById(ownerId).select('role'))?.role, '/seller/rentals', '/my-equipment');
