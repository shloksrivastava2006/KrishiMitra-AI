import test from 'node:test';
import assert from 'node:assert/strict';
import { isVendorLocked } from '../src/features/auth/vendorLock.js';
import { navActive } from '../src/components/layout/navActive.js';

test('a seller can open only the dashboard and the pages below it', () => {
  const vendor = { role: 'vendor' };
  for (const p of ['/seller', '/seller/products', '/seller/products/new', '/seller/orders']) assert.equal(isVendorLocked(vendor, p), false, p);
  for (const p of ['/', '/marketplace', '/marketplace/64f1', '/weather', '/calculators', '/profile', '/cart', '/my-products', '/seller-x', '/sellers']) assert.equal(isVendorLocked(vendor, p), true, p);
});

test('nobody else is locked, including visitors who are not signed in', () => {
  for (const user of [null, undefined, { role: 'farmer' }, { role: 'admin' }]) for (const p of ['/', '/marketplace', '/seller']) assert.equal(isVendorLocked(user, p), false);
});

test('the Home link is lit on the home page only', () => {
  assert.equal(navActive('/', '/', ''), true);
  for (const p of ['/marketplace', '/weather', '/crops/wheat', '/seller']) assert.equal(navActive('/', p, ''), false, p);
});
