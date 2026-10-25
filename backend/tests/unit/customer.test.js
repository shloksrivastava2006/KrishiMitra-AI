import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeBookings, summarizeOrders } from '../../services/customerService.js';

test('summarizeOrders: counts by status and adds up only delivered orders as spent', () => {
  const s = summarizeOrders([
    { _id: 'placed', n: 1, totalPaise: 50000 }, { _id: 'shipped', n: 2, totalPaise: 120000 },
    { _id: 'delivered', n: 3, totalPaise: 250050 }, { _id: 'cancelled', n: 1, totalPaise: 99900 },
    { _id: 'awaiting_payment', n: 2, totalPaise: 70000 },
  ]);
  assert.deepEqual(s, { total: 7, active: 3, delivered: 3, cancelled: 1, awaitingPayment: 2, spent: 2500.5, inProgress: 1700 });
});

test('summarizeOrders: a customer with no orders gets zeros, not errors', () => {
  assert.deepEqual(summarizeOrders([]), { total: 0, active: 0, delivered: 0, cancelled: 0, awaitingPayment: 0, spent: 0, inProgress: 0 });
  assert.deepEqual(summarizeOrders(), summarizeOrders([]));
});

test('summarizeBookings: active means requested, confirmed or handed over', () => {
  const b = summarizeBookings([{ _id: 'requested', n: 1 }, { _id: 'confirmed', n: 2 }, { _id: 'handed_over', n: 1 }, { _id: 'completed', n: 4 }, { _id: 'rejected', n: 1 }, { _id: 'cancelled', n: 2 }]);
  assert.deepEqual(b, { total: 11, active: 4, requested: 1, completed: 4 });
  assert.deepEqual(summarizeBookings([]), { total: 0, active: 0, requested: 0, completed: 0 });
});
