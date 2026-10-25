// Pure helpers for the customer dashboard. They only add up rows the database already returned, so they can be unit-tested without a database.

// Orders that are still on their way to the customer.
export const ACTIVE_ORDER_STATUSES = ['placed', 'confirmed', 'shipped'];
// Rental bookings that are not finished or closed.
export const ACTIVE_BOOKING_STATUSES = ['requested', 'confirmed', 'handed_over'];

const count = (groups) => (status) => groups.find((g) => g._id === status)?.n || 0;
const sumOf = (fn, statuses) => statuses.reduce((a, s) => a + fn(s), 0);

// groups: [{ _id: <order status>, n: <how many>, totalPaise: <sum of totals> }] for one buyer.
export function summarizeOrders(groups = []) {
  const n = count(groups);
  const paise = (s) => groups.find((g) => g._id === s)?.totalPaise || 0;
  return {
    // Orders still waiting for an online payment are not counted as placed; they are reported on their own.
    total: sumOf(n, ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled']),
    active: sumOf(n, ACTIVE_ORDER_STATUSES),
    delivered: n('delivered'),
    cancelled: n('cancelled'),
    awaitingPayment: n('awaiting_payment'),
    // "Spent" counts only delivered orders (cash paid on delivery or online payment received). Cancelled orders never count.
    spent: paise('delivered') / 100,
    inProgress: sumOf(paise, ACTIVE_ORDER_STATUSES) / 100,
  };
}

// groups: [{ _id: <booking status>, n: <how many> }] for one renter.
export function summarizeBookings(groups = []) {
  const n = count(groups);
  return {
    total: sumOf(n, ['requested', 'confirmed', 'handed_over', 'completed', 'rejected', 'cancelled']),
    active: sumOf(n, ACTIVE_BOOKING_STATUSES),
    requested: n('requested'),
    completed: n('completed'),
  };
}
