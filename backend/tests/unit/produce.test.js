import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CATEGORIES, INPUT_CATEGORIES, PRODUCE_CATEGORIES, UNITS, buildListFilter, codOnlyForRole, harvestDateOk, isProduce, onlinePaymentAllowed, sellerLink,
} from '../../services/marketRules.js';

test('produce and input categories are disjoint and together make up every category', () => {
  assert.deepEqual([...PRODUCE_CATEGORIES, ...INPUT_CATEGORIES].sort(), [...CATEGORIES].sort());
  assert.equal(PRODUCE_CATEGORIES.filter((c) => INPUT_CATEGORIES.includes(c)).length, 0);
  for (const c of ['vegetables', 'fruits', 'grains-pulses', 'oilseeds', 'spices', 'flowers', 'farm-other']) assert.ok(isProduce(c), c);
  for (const c of ['seeds', 'fertilizers', 'machinery', 'other']) assert.equal(isProduce(c), false, c);
});

test('units cover loose produce sold by the dozen or bunch', () => {
  assert.ok(UNITS.includes('dozen') && UNITS.includes('bunch') && UNITS.includes('quintal'));
});

test('harvest date: recent past or expected within 90 days, nothing else', () => {
  const now = new Date('2026-10-16T00:00:00Z'); const day = 86400000; const at = (n) => new Date(now.getTime() + n * day).toISOString();
  assert.ok(harvestDateOk(at(0), now) && harvestDateOk(at(-59), now) && harvestDateOk(at(89), now));
  assert.equal(harvestDateOk(at(-61), now), false);
  assert.equal(harvestDateOk(at(91), now), false);
  assert.equal(harvestDateOk('not a date', now), false);
});

test('marketplace filter: tabs, category inside tab, organic, district, regex is escaped', () => {
  assert.deepEqual(buildListFilter({}), { status: 'approved' });
  assert.deepEqual(buildListFilter({ type: 'produce' }).category, { $in: PRODUCE_CATEGORIES });
  assert.deepEqual(buildListFilter({ type: 'inputs' }).category, { $in: INPUT_CATEGORIES });
  assert.equal(buildListFilter({ type: 'produce', category: 'vegetables' }).category, 'vegetables');
  assert.deepEqual(buildListFilter({ type: 'produce', category: 'seeds' }).category, { $in: [] });   // never widens the search
  assert.equal(buildListFilter({ category: 'seeds' }).category, 'seeds');
  assert.equal(buildListFilter({ organic: 'true' }).organic, true);
  assert.equal(buildListFilter({ organic: 'false' }).organic, undefined);
  const d = buildListFilter({ district: ' Meerut ' }).district;
  assert.ok(new RegExp(d.$regex, 'i').test('meerut') && !new RegExp(d.$regex, 'i').test('Meerut City'));
  const evil = buildListFilter({ q: '.*', district: '(a+)+' });
  assert.ok(!new RegExp(evil.name.$regex).test('tomato'));   // ".*" is matched literally
  assert.equal(evil.status, 'approved');                      // unapproved listings can never be reached through a filter
});

test('payment: sellers take online payment; a farmer can once a UPI ID or bank account is saved', () => {
  assert.equal(onlinePaymentAllowed('vendor'), true); assert.equal(codOnlyForRole('vendor'), false);
  assert.equal(codOnlyForRole('farmer'), true);                                              // a bare role never unlocks a farmer
  const bare = { role: 'farmer' };
  assert.equal(onlinePaymentAllowed(bare), false); assert.equal(codOnlyForRole(bare), true);   // no payout details yet
  assert.equal(onlinePaymentAllowed({ role: 'farmer', payout: { upiId: 'ram@okbank' } }), true);
  assert.equal(onlinePaymentAllowed({ role: 'farmer', payout: { accountLast4: '9012' } }), true);
  assert.equal(codOnlyForRole({ role: 'farmer', payout: { upiId: 'ram@okbank' } }), false);
  assert.equal(onlinePaymentAllowed({ role: 'customer', payout: { upiId: 'ram@okbank' } }), false);   // only sellers
  for (const r of ['customer', 'admin', undefined]) assert.equal(onlinePaymentAllowed(r), false, String(r));
});

test('notification links send each seller to a page their role can open', () => {
  assert.equal(sellerLink('vendor', '/seller/orders', '/my-sales'), '/seller/orders');
  assert.equal(sellerLink('farmer', '/seller/orders', '/my-sales'), '/my-sales');
});
