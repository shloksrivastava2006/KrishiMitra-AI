import test from 'node:test';
import assert from 'node:assert/strict';
import { summariseSales } from '../../services/earningsService.js';

test('total sales is received plus still-to-collect, in paise', () => {
  const s = summariseSales([{ paid: true, total: 150000, n: 3 }, { paid: false, total: 40000, n: 1 }]);
  assert.deepEqual(s, { totalSalesPaise: 190000, receivedPaise: 150000, toCollectPaise: 40000, orders: 4, ordersToCollect: 1 });
});
test('no orders gives zeros, never undefined or NaN', () => {
  assert.deepEqual(summariseSales([]), { totalSalesPaise: 0, receivedPaise: 0, toCollectPaise: 0, orders: 0, ordersToCollect: 0 });
  assert.equal(summariseSales().totalSalesPaise, 0);
});
test('only one kind of group present still works', () => {
  assert.equal(summariseSales([{ paid: false, total: 5000, n: 2 }]).receivedPaise, 0);
  assert.equal(summariseSales([{ paid: true, total: 5000, n: 2 }]).toCollectPaise, 0);
});
