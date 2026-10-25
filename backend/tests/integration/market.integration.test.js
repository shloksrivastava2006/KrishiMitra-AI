// Needs a throwaway MongoDB: TEST_MONGODB_URI=mongodb://127.0.0.1:27017/krishimitra_test npm test
// Skipped when TEST_MONGODB_URI is not set. It wipes users, products and orders in that database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { proofs, phoneFor } from '../helpers/proofs.js';
import crypto from 'node:crypto';

const uri = process.env.TEST_MONGODB_URI;
const run = uri ? test : test.skip;
if (uri) { process.env.MONGODB_URI = uri; process.env.JWT_SECRET ||= 'test-secret-test-secret'; }

run('marketplace: review, stock, cod, cancel, payment gating, webhook', async () => {
  const { default: app } = await import('../../app.js');
  const { env } = await import('../../config/env.js');
  // These tests expect online payment to be off until they switch it on, whatever keys the developer has in .env.
  env.razorpayKeyId = ''; env.razorpayKeySecret = ''; env.razorpayWebhookSecret = '';
  const mongoose = (await import('mongoose')).default;
  const { User } = await import('../../models/User.js');
  const { Product } = await import('../../models/Product.js');
  const { Order } = await import('../../models/Order.js');
  await mongoose.connect(uri);
  await Promise.all([User.deleteMany({}), Product.deleteMany({}), Order.deleteMany({})]);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token, raw, headers = {} } = {}) => {
    const res = await fetch(base + path, { method, headers: { ...(raw ? {} : { 'Content-Type': 'application/json' }), ...(token && { Authorization: `Bearer ${token}` }), ...headers }, body: raw ?? (body && JSON.stringify(body)) });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };
  const signup = async (n) => (await call('/auth/register', { method: 'POST', body: await proofs({ name: `User ${n}`, email: `m${n}@example.com`, phone: phoneFor(n, 300000000), password: 'password123', confirmPassword: 'password123', consent: true }) })).json.data.token;
  const address = { name: 'Buyer', phone: '9876543210', line1: '12 Main Road', district: 'Agra', state: 'Uttar Pradesh', pincode: '282001' };

  try {
    const seller = await signup(1); const buyer = await signup(2);
    await User.create({ name: 'Admin', email: 'madmin@example.com', password: 'a-long-password-1', role: 'admin' });
    const admin = (await call('/auth/admin/login', { method: 'POST', body: { email: 'madmin@example.com', password: 'a-long-password-1' } })).json.data.token;

    // licence is required for seeds; the listing starts pending and is invisible to the public
    const draft = { name: 'Wheat seed', category: 'seeds', price: '50.50', unit: 'kg', stock: 5, district: 'Agra', state: 'UP' };
    assert.equal((await call('/products', { method: 'POST', token: seller, body: draft })).status, 422);
    const created = await call('/products', { method: 'POST', token: seller, body: { ...draft, licenceNumber: 'LIC-123' } });
    assert.equal(created.status, 201); const pid = created.json.data.id;
    assert.equal((await call('/products')).json.data.total, 0);
    assert.equal((await call(`/products/${pid}`)).status, 404);
    assert.equal((await call(`/admin/products/${pid}/review`, { method: 'PATCH', token: seller, body: { decision: 'approve' } })).status, 403);
    assert.equal((await call(`/admin/products/${pid}/review`, { method: 'PATCH', token: admin, body: { decision: 'approve' } })).status, 200);
    const listed = await call('/products');
    assert.equal(listed.json.data.total, 1); assert.equal(listed.json.data.products[0].price, 50.5);
    assert.equal(JSON.stringify(listed.json).includes('m1@example.com'), false);   // seller contact never public

    // COD order: server prices it, stock drops, own product refused, over-stock refused
    const items = [{ productId: pid, qty: 2, price: 1 }];   // a client price is ignored
    assert.equal((await call('/orders', { method: 'POST', token: seller, body: { items, address, paymentMethod: 'cod' } })).status, 403);
    assert.equal((await call('/orders', { method: 'POST', token: buyer, body: { items: [{ productId: pid, qty: 9 }], address, paymentMethod: 'cod' } })).status, 409);
    const placed = await call('/orders', { method: 'POST', token: buyer, body: { items, address, paymentMethod: 'cod' } });
    assert.equal(placed.status, 201); assert.equal(placed.json.data.order.total, 101); assert.equal((await Product.findById(pid)).stock, 3);
    assert.equal((await call('/orders', { method: 'POST', token: buyer, body: { items, address, paymentMethod: 'online' } })).status, 503); // Razorpay not configured

    // buyer cancels: stock returns exactly once
    const oid = placed.json.data.order.id;
    assert.equal((await call(`/orders/${oid}/cancel`, { method: 'POST', token: buyer })).status, 200);
    assert.equal((await call(`/orders/${oid}/cancel`, { method: 'POST', token: buyer })).status, 409);
    assert.equal((await Product.findById(pid)).stock, 5);

    // another buyer cannot touch it; seller walks a COD order to delivered and it becomes paid
    const o2 = (await call('/orders', { method: 'POST', token: buyer, body: { items: [{ productId: pid, qty: 1 }], address, paymentMethod: 'cod' } })).json.data.order.id;
    const stranger = await signup(3);
    assert.equal((await call(`/orders/${o2}/cancel`, { method: 'POST', token: stranger })).status, 404);
    assert.equal((await call(`/orders/${o2}/status`, { method: 'PATCH', token: buyer, body: { status: 'confirmed' } })).status, 403);
    assert.equal((await call(`/orders/${o2}/status`, { method: 'PATCH', token: seller, body: { status: 'delivered' } })).status, 409);   // cannot skip steps
    // tracking: courier details are saved on shipping, show up for the buyer, and can be corrected while shipped
    assert.equal((await call(`/orders/${o2}/status`, { method: 'PATCH', token: seller, body: { status: 'confirmed' } })).status, 200);
    assert.equal((await call(`/orders/${o2}/tracking`, { method: 'PATCH', token: seller, body: { courier: 'X' } })).status, 409);   // not shipped yet
    assert.equal((await call(`/orders/${o2}/status`, { method: 'PATCH', token: seller, body: { status: 'shipped', courier: 'India Post', trackingNumber: 'EE123456789IN', expectedDelivery: '2030-01-05' } })).status, 200);
    let mine = (await call('/orders/mine', { token: buyer })).json.data.find((x) => x.id === o2);
    assert.equal(mine.shipping.courier, 'India Post'); assert.equal(Boolean(mine.statusAt.shipped), true); assert.equal(mine.statusAt.delivered, undefined);
    assert.equal((await call(`/orders/${o2}/tracking`, { method: 'PATCH', token: buyer, body: { courier: 'Hack' } })).status, 403);
    assert.equal((await call(`/orders/${o2}/tracking`, { method: 'PATCH', token: seller, body: { trackingNumber: '!!' } })).status, 422);
    assert.equal((await call(`/orders/${o2}/tracking`, { method: 'PATCH', token: seller, body: { courier: 'DTDC', trackingNumber: 'D123456' } })).status, 200);
    assert.equal((await call(`/orders/${o2}/status`, { method: 'PATCH', token: seller, body: { status: 'delivered' } })).status, 200);
    mine = (await call('/orders/mine', { token: buyer })).json.data.find((x) => x.id === o2);
    assert.equal(mine.shipping.courier, 'DTDC'); assert.equal(Boolean(mine.statusAt.delivered), true);
    assert.equal((await Order.findById(o2)).paymentStatus, 'paid');

    // online order: forged callback rejected, bad webhook rejected, wrong amount ignored, right one pays once
    env.razorpayKeySecret = 'key-secret'; env.razorpayWebhookSecret = 'whsec';
    const buyerDoc = await User.findOne({ email: 'm2@example.com' }); const sellerDoc = await User.findOne({ email: 'm1@example.com' });
    const ord = await Order.create({ buyer: buyerDoc._id, seller: sellerDoc._id, lines: [{ product: pid, name: 'Wheat seed', unit: 'kg', unitPaise: 5050, qty: 1, linePaise: 5050 }], totalPaise: 5050, paymentMethod: 'online', paymentStatus: 'pending', status: 'awaiting_payment', razorpayOrderId: 'order_TEST1' });
    assert.equal((await call(`/orders/${ord._id}/verify-payment`, { method: 'POST', token: buyer, body: { razorpay_order_id: 'order_TEST1', razorpay_payment_id: 'pay_FAKE1', razorpay_signature: 'f'.repeat(64) } })).status, 400);
    const hook = (amount, sig) => { const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: { id: 'pay_REAL1', order_id: 'order_TEST1', amount } } } }); return call('/payments/razorpay/webhook', { method: 'POST', raw, headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': sig ?? crypto.createHmac('sha256', 'whsec').update(raw).digest('hex') } }); };
    assert.equal((await hook(5050, 'bad')).status, 400);
    assert.equal((await hook(1)).status, 200); assert.equal((await Order.findById(ord._id)).paymentStatus, 'pending');   // wrong amount: not paid
    assert.equal((await hook(5050)).status, 200); assert.equal((await hook(5050)).status, 200);                           // replay is harmless
    const after = await Order.findById(ord._id); assert.equal(after.paymentStatus, 'paid'); assert.equal(after.status, 'placed');

    // a signed callback verified by the buyer works too (new order)
    const ord2 = await Order.create({ buyer: buyerDoc._id, seller: sellerDoc._id, lines: after.lines, totalPaise: 5050, paymentMethod: 'online', paymentStatus: 'pending', status: 'awaiting_payment', razorpayOrderId: 'order_TEST2' });
    const sig = crypto.createHmac('sha256', 'key-secret').update('order_TEST2|pay_OK2').digest('hex');
    assert.equal((await call(`/orders/${ord2._id}/verify-payment`, { method: 'POST', token: buyer, body: { razorpay_order_id: 'order_TEST2', razorpay_payment_id: 'pay_OK2', razorpay_signature: sig } })).status, 200);
    assert.equal((await Order.findById(ord2._id)).paymentStatus, 'paid');
    // paid order cancelled by seller -> refund due, flagged for hand refund
    await call(`/orders/${ord2._id}/status`, { method: 'PATCH', token: seller, body: { status: 'cancelled' } });
    assert.equal((await Order.findById(ord2._id)).paymentStatus, 'refund_due');
  } finally { server.close(); await mongoose.disconnect(); }
});
