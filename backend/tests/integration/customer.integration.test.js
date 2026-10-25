// Needs a throwaway MongoDB: TEST_MONGODB_URI=mongodb://127.0.0.1:27017/krishimitra_test npm test
// Skipped when TEST_MONGODB_URI is not set. It wipes users, orders, rentalbookings and notifications in that database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { proofs, phoneFor } from '../helpers/proofs.js';

const uri = process.env.TEST_MONGODB_URI;
const run = uri ? test : test.skip;
if (uri) { process.env.MONGODB_URI = uri; process.env.JWT_SECRET ||= 'test-secret-test-secret'; }

run('customer: signup, login tabs, role-only dashboard, own numbers only', async () => {
  const { default: app } = await import('../../app.js');
  const mongoose = (await import('mongoose')).default;
  const { Order } = await import('../../models/Order.js');
  await mongoose.connect(uri);
  await Promise.all(['users', 'orders', 'rentalbookings', 'notifications'].map((c) => mongoose.connection.collection(c).deleteMany({})));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };
  const account = (n, extra = {}) => ({ name: `Person ${n}`, email: `p${n}@example.com`, phone: phoneFor(n), password: 'password123', confirmPassword: 'password123', consent: true, ...extra });

  try {
    // Signup: role is forced by the endpoint and cannot be chosen
    assert.equal((await call('/auth/register-customer', { method: 'POST', body: await proofs(account(1, { role: 'admin' })) })).status, 422);
    assert.equal((await call('/auth/register', { method: 'POST', body: await proofs(account(1, { role: 'customer' })) })).status, 422);
    const c1 = await call('/auth/register-customer', { method: 'POST', body: await proofs(account(1)) });
    assert.equal(c1.status, 201); assert.equal(c1.json.data.user.role, 'customer');
    assert.equal((await call('/auth/register-customer', { method: 'POST', body: await proofs(account(1)) })).status, 409);   // same email
    const c2 = await call('/auth/register-customer', { method: 'POST', body: await proofs(account(2)) });
    const farmer = await call('/auth/register', { method: 'POST', body: await proofs(account(3)) });
    const login = (email, portal) => call('/auth/login', { method: 'POST', body: { identifier: email, password: 'password123', portal } });

    // Login tabs only guide people to the right tab
    assert.equal((await login('p1@example.com', 'customer')).status, 200);
    assert.equal((await login('p1@example.com', 'farmer')).status, 403);
    assert.equal((await login('p1@example.com', 'seller')).status, 403);
    assert.equal((await login('p3@example.com', 'customer')).status, 403);
    assert.equal((await login('p3@example.com', 'farmer')).status, 200);

    // Dashboard: customers only
    assert.equal((await call('/customer/summary')).status, 401);
    assert.equal((await call('/customer/summary', { token: farmer.json.data.token })).status, 403);
    const empty = await call('/customer/summary', { token: c1.json.data.token });
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.json.data.orders, { total: 0, active: 0, delivered: 0, cancelled: 0, awaitingPayment: 0, spent: 0, inProgress: 0 });
    assert.deepEqual(empty.json.data.recentOrders, []);

    // Numbers come from this customer's own orders only
    const line = { product: new mongoose.Types.ObjectId(), name: 'Wheat seed', unit: 'kg', unitPaise: 12500, qty: 2, linePaise: 25000 };
    const mk = (buyer, status, totalPaise) => Order.create({ buyer, seller: new mongoose.Types.ObjectId(), lines: [line], totalPaise, paymentMethod: 'cod', paymentStatus: status === 'delivered' ? 'paid' : 'cod', status });
    await mk(c1.json.data.user.id, 'delivered', 25000);
    await mk(c1.json.data.user.id, 'shipped', 10000);
    await mk(c2.json.data.user.id, 'delivered', 99900);   // someone else's order must not show up
    const s = (await call('/customer/summary', { token: c1.json.data.token })).json.data;
    assert.deepEqual(s.orders, { total: 2, active: 1, delivered: 1, cancelled: 0, awaitingPayment: 0, spent: 250, inProgress: 100 });
    assert.equal(s.recentOrders.length, 2);
  } finally { server.close(); await mongoose.disconnect(); }
});
