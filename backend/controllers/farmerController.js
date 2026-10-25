import { Order } from '../models/Order.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { summariseSales } from '../services/earningsService.js';
import { settlement } from '../services/payoutService.js';

// Orders that count as a sale: not cancelled and not still waiting for an online payment.
const SOLD = ['placed', 'confirmed', 'shipped', 'delivered'];

// Every figure comes from this farmer's own Order rows; nothing is typed in by hand.
export const earnings = asyncHandler(async (req, res) => {
  const me = req.user._id;
  const [groups, txns, held] = await Promise.all([
    Order.aggregate([
      { $match: { seller: me, status: { $in: SOLD } } },
      { $group: { _id: { $eq: ['$paymentStatus', 'paid'] }, total: { $sum: '$totalPaise' }, n: { $sum: 1 } } },
    ]),
    Order.find({ seller: me, status: { $ne: 'awaiting_payment' } }).sort({ createdAt: -1 }).limit(100)
      .select('totalPaise paymentMethod paymentStatus status createdAt paidAt'),
    settlement(me),
  ]);
  const s = summariseSales(groups.map((g) => ({ paid: g._id, total: g.total, n: g.n })));
  res.json({ success: true, data: {
    summary: { totalSales: s.totalSalesPaise / 100, received: s.receivedPaise / 100, toCollect: s.toCollectPaise / 100, orders: s.orders, ordersToCollect: s.ordersToCollect },
    // Money buyers paid online (orders and equipment rent). The site holds it and sends it to the farmer's UPI or bank account.
    online: { gross: held.grossPaise / 100, commission: held.commissionPaise / 100, paidOut: held.paidOutPaise / 100, balance: Math.max(0, held.owedPaise) / 100 },
    transactions: txns.map((o) => ({ id: o._id, amount: o.totalPaise / 100, method: o.paymentMethod, paymentStatus: o.paymentStatus, status: o.status, date: o.paidAt || o.createdAt })),
  } });
});
