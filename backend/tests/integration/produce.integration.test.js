// Needs a throwaway MongoDB: TEST_MONGODB_URI=mongodb://127.0.0.1:27017/krishimitra_test npm test
// Skipped when TEST_MONGODB_URI is not set. It wipes users, products, orders and notifications in that database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { proofs, phoneFor } from '../helpers/proofs.js';

const uri = process.env.TEST_MONGODB_URI;
const run = uri ? test : test.skip;
if (uri) { process.env.MONGODB_URI = uri; process.env.JWT_SECRET ||= 'test-secret-test-secret'; }

run('sell produce: listing, review, filters, farmer-paid-directly flag, notification link', async () => {
  const { default: app } = await import('../../app.js');
  const mongoose = (await import('mongoose')).default;
  const { User } = await import('../../models/User.js');
  const { Product } = await import('../../models/Product.js');
  const { Order } = await import('../../models/Order.js');
  const { Notification } = await import('../../models/Notification.js');
  await mongoose.connect(uri);
  await Promise.all([User.deleteMany({}), Product.deleteMany({}), Order.deleteMany({}), Notification.deleteMany({})]);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };
  const signup = async (n) => (await call('/auth/register', { method: 'POST', body: await proofs({ name: `Kisan ${n}`, email: `p${n}@example.com`, phone: phoneFor(n, 400000000), password: 'password123', confirmPassword: 'password123', consent: true }) })).json.data.token;
  const address = { name: 'Buyer', phone: '9876543210', line1: '12 Main Road', district: 'Meerut', state: 'Uttar Pradesh', pincode: '250001' };
  const day = 86400000; const iso = (n) => new Date(Date.now() + n * day).toISOString().slice(0, 10);

  try {
    const farmer = await signup(1); const buyer = await signup(2);
    await User.create({ name: 'Admin', email: 'padmin@example.com', password: 'a-long-password-1', role: 'admin' });
    const admin = (await call('/auth/admin/login', { method: 'POST', body: { email: 'padmin@example.com', password: 'a-long-password-1' } })).json.data.token;

    // a vegetable listing needs no licence, carries produce details, and waits for admin review
    const draft = { name: 'Tomato', category: 'vegetables', variety: 'Hybrid', price: '20', unit: 'kg', stock: 50, minOrderQty: 5, harvestDate: iso(0), grade: 'A', organic: true, village: 'Mawana', district: 'Meerut', state: 'Uttar Pradesh' };
    const made = await call('/products', { method: 'POST', token: farmer, body: draft });
    assert.equal(made.status, 201); assert.equal(made.json.data.status, 'pending'); assert.equal(made.json.data.isProduce, true);
    const pid = made.json.data.id;
    assert.equal((await call('/products?type=produce')).json.data.total, 0);   // not public until approved

    // bad harvest date and bad grade are refused
    assert.equal((await call('/products', { method: 'POST', token: farmer, body: { ...draft, harvestDate: iso(-200) } })).status, 422);
    assert.equal((await call('/products', { method: 'POST', token: farmer, body: { ...draft, harvestDate: iso(200) } })).status, 422);
    assert.equal((await call('/products', { method: 'POST', token: farmer, body: { ...draft, grade: 'Z' } })).status, 422);

    // produce details are dropped for non-produce categories
    const seed = await call('/products', { method: 'POST', token: farmer, body: { name: 'Wheat seed', category: 'seeds', licenceNumber: 'LIC-1', price: '50', unit: 'kg', stock: 5, organic: true, grade: 'A' } });
    assert.equal(seed.status, 201); assert.equal(seed.json.data.organic, false); assert.equal(seed.json.data.grade, undefined);

    assert.equal((await call(`/admin/products/${pid}/review`, { method: 'PATCH', token: admin, body: { decision: 'approve' } })).status, 200);
    const approvedNote = await Notification.findOne({ user: (await User.findOne({ email: 'p1@example.com' }))._id, type: 'product_approved' });
    assert.equal(approvedNote.link, '/sell-produce');   // a farmer is sent to a page they can open

    // marketplace tabs and filters
    const only = (q) => call(`/products${q}`).then((r) => r.json.data);
    assert.equal((await only('?type=produce')).total, 1);
    assert.equal((await only('?type=inputs')).total, 0);   // the seed listing is still pending
    assert.equal((await only('?type=produce&organic=true')).total, 1);
    assert.equal((await only('?type=produce&district=meerut')).total, 1);
    assert.equal((await only('?type=produce&district=Agra')).total, 0);
    assert.equal((await only('?type=produce&category=seeds')).total, 0);
    const card = (await only('?type=produce')).products[0];
    assert.equal(card.organic, true); assert.equal(card.grade, 'A'); assert.equal(card.variety, 'Hybrid'); assert.equal(card.codOnly, true);
    // saving a UPI ID under "Bank details" lets this farmer take online payment; removing it brings cash on delivery back
    assert.equal((await call('/payout', { method: 'PUT', token: farmer, body: { upiId: 'kisan@okbank' } })).status, 200);
    assert.equal((await only('?type=produce')).products[0].codOnly, false);
    assert.equal((await call('/payout', { method: 'DELETE', token: farmer })).status, 200);
    assert.equal((await only('?type=produce')).products[0].codOnly, true);
    assert.equal(JSON.stringify(card).includes('p1@example.com'), false);

    // changing the organic claim sends the listing back to review; changing harvest date or grade does not
    assert.equal((await call(`/products/${pid}`, { method: 'PUT', token: farmer, body: { ...draft, grade: 'B', harvestDate: iso(-1) } })).json.data.status, 'approved');
    assert.equal((await call(`/products/${pid}`, { method: 'PUT', token: farmer, body: { ...draft, organic: false } })).json.data.status, 'pending');
    await call(`/admin/products/${pid}/review`, { method: 'PATCH', token: admin, body: { decision: 'approve' } });

    // an order for a farmer's produce notifies the farmer at /my-sales (farmers cannot open /seller/*)
    const placed = await call('/orders', { method: 'POST', token: buyer, body: { items: [{ productId: pid, qty: 5 }], address, paymentMethod: 'cod' } });
    assert.equal(placed.status, 201);
    await new Promise((r) => setTimeout(r, 300));   // notifications are fire-and-forget
    const orderNote = await Notification.findOne({ type: 'new_order' });
    assert.equal(orderNote.link, '/my-sales');
    assert.equal((await call('/orders', { method: 'POST', token: buyer, body: { items: [{ productId: pid, qty: 1 }], address, paymentMethod: 'cod' } })).status, 422);   // below the minimum order of 5
  } finally {
    server.close(); await mongoose.disconnect();
  }
});
