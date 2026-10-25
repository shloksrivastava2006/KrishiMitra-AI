// Needs a throwaway MongoDB: TEST_MONGODB_URI=mongodb://127.0.0.1:27017/krishimitra_test npm test
// Skipped when TEST_MONGODB_URI is not set. It wipes users, products, orders, reviews, rentals, payouts and notifications in that database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { proofs, phoneFor } from '../helpers/proofs.js';

const uri = process.env.TEST_MONGODB_URI;
const run = uri ? test : test.skip;
if (uri) { process.env.MONGODB_URI = uri; process.env.JWT_SECRET ||= 'test-secret-test-secret'; }

run('seller: signup, admin login, approval, ownership, orders, earnings, reviews, rentals', async () => {
  const { default: app } = await import('../../app.js');
  const mongoose = (await import('mongoose')).default;
  const { User } = await import('../../models/User.js');
  await mongoose.connect(uri);
  await Promise.all(['users', 'products', 'orders', 'reviews', 'rentals', 'rentalbookings', 'payouts', 'notifications'].map((c) => mongoose.connection.collection(c).deleteMany({})));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };
  const seller = (n, extra = {}) => ({ name: `Seller ${n}`, email: `s${n}@example.com`, phone: `98765432${10 + n}`, password: 'password123', confirmPassword: 'password123', consent: true,
    shopName: `Shop ${n}`, address: '12 Market Road', district: 'Agra', state: 'Uttar Pradesh', pincode: '282001', licenceNumber: 'LIC-1', ...extra });
  const farmer = (n) => ({ name: `Farmer ${n}`, email: `f${n}@example.com`, phone: phoneFor(n, 200000000), password: 'password123', confirmPassword: 'password123', consent: true });
  const address = { name: 'Buyer', phone: '9876543210', line1: '12 Main Road', district: 'Agra', state: 'Uttar Pradesh', pincode: '282001' };

  try {
    // Seller signup: role forced to vendor, verification starts pending, role cannot be chosen, bank number never returned in full
    assert.equal((await call('/auth/register-seller', { method: 'POST', body: await proofs(seller(1, { role: 'admin' })) })).status, 422);
    assert.equal((await call('/auth/register-seller', { method: 'POST', body: await proofs(seller(1, { pincode: '12' })) })).status, 422);
    const s1 = await call('/auth/register-seller', { method: 'POST', body: await proofs(seller(1, { bankAccountNumber: '123456789012', bankIfsc: 'SBIN0001234', upiId: 'shop1@okbank', verification: 'verified' })) });
    assert.equal(s1.status, 201); assert.equal(s1.json.data.user.role, 'vendor');
    assert.equal(s1.json.data.user.seller.verification, 'pending');
    assert.equal(s1.json.data.user.seller.bankAccountLast4, '9012'); assert.equal(s1.json.data.user.seller.bankAccountNumber, undefined);
    const t1 = s1.json.data.token;
    const t2 = (await call('/auth/register-seller', { method: 'POST', body: await proofs(seller(2)) })).json.data.token;
    const farmerTok = (await call('/auth/register', { method: 'POST', body: await proofs(farmer(1)) })).json.data.token;
    const buyerTok = (await call('/auth/register', { method: 'POST', body: await proofs(farmer(2)) })).json.data.token;

    // Login tabs: right password on the wrong tab is refused with guidance
    assert.equal((await call('/auth/login', { method: 'POST', body: { identifier: 's1@example.com', password: 'password123', portal: 'farmer' } })).status, 403);
    assert.equal((await call('/auth/login', { method: 'POST', body: { identifier: 's1@example.com', password: 'password123', portal: 'seller' } })).status, 200);
    assert.equal((await call('/auth/login', { method: 'POST', body: { identifier: 'f1@example.com', password: 'password123', portal: 'seller' } })).status, 403);

    // Admin cannot use the public login; the admin endpoint rejects everyone else
    await User.create({ name: 'Admin', email: 'admin@example.com', password: 'a-long-password-1', role: 'admin' });
    assert.equal((await call('/auth/login', { method: 'POST', body: { identifier: 'admin@example.com', password: 'a-long-password-1' } })).status, 401);
    assert.equal((await call('/auth/admin/login', { method: 'POST', body: { email: 's1@example.com', password: 'password123' } })).status, 401);
    const admin = (await call('/auth/admin/login', { method: 'POST', body: { email: 'admin@example.com', password: 'a-long-password-1' } })).json.data.token;

    // Seller API is seller-only
    assert.equal((await call('/seller/summary', { token: farmerTok })).status, 403);
    assert.equal((await call('/seller/summary')).status, 401);
    assert.equal((await call('/seller/summary', { token: admin })).status, 403);
    assert.equal((await call('/admin/sellers', { token: t1 })).status, 403);

    // Product: starts pending, invisible, photo paths must come from our uploader
    const draft = { name: 'HD-2967 Wheat Seeds', category: 'seeds', price: '600', discountPercent: 10, unit: 'bag', stock: 8, minOrderQty: 2, licenceNumber: 'LIC-9', district: 'Ghazipur', state: 'Uttar Pradesh' };
    assert.equal((await call('/products', { method: 'POST', token: t1, body: { ...draft, images: ['https://evil.example/x.png'] } })).status, 422);
    const created = await call('/products', { method: 'POST', token: t1, body: { ...draft, images: ['/uploads/0123456789abcdef0123456789abcdef.png'] } });
    assert.equal(created.status, 201); assert.equal(created.json.data.price, 540); assert.equal(created.json.data.status, 'pending');
    const pid = created.json.data.id;
    assert.equal((await call('/products')).json.data.total, 0);

    // Ownership: another seller cannot edit, quick-update or delete it
    assert.equal((await call(`/products/${pid}`, { method: 'PUT', token: t2, body: draft })).status, 404);
    assert.equal((await call(`/products/${pid}/quick`, { method: 'PATCH', token: t2, body: { stock: 999 } })).status, 404);
    assert.equal((await call(`/products/${pid}`, { method: 'DELETE', token: t2 })).status, 404);
    assert.equal((await call('/admin/products/' + pid + '/review', { method: 'PATCH', token: t1, body: { decision: 'approve' } })).status, 403);

    // Admin approves: now public, seller notified; sale price is what buyers see
    assert.equal((await call(`/admin/products/${pid}/review`, { method: 'PATCH', token: admin, body: { decision: 'approve' } })).status, 200);
    const pub = await call('/products');
    assert.equal(pub.json.data.total, 1); assert.equal(pub.json.data.products[0].price, 540); assert.equal(pub.json.data.products[0].listPrice, 600);
    assert.ok((await call('/notifications', { token: t1 })).json.data.items.some((n) => n.type === 'product_approved'));
    assert.equal((await call('/notifications', { token: t2 })).json.data.items.length, 0);

    // Pause and resume without a new review; price/stock quick edit keeps it live
    assert.equal((await call(`/products/${pid}/quick`, { method: 'PATCH', token: t1, body: { active: false } })).json.data.status, 'inactive');
    assert.equal((await call('/products')).json.data.total, 0);
    assert.equal((await call(`/products/${pid}/quick`, { method: 'PATCH', token: t1, body: { active: true } })).json.data.status, 'approved');
    assert.equal((await call(`/products/${pid}/quick`, { method: 'PATCH', token: t1, body: { stock: 10 } })).json.data.stock, 10);

    // Orders: minimum quantity enforced, sale price charged, seller notified, farmer cannot read seller orders of others
    const order = (qty) => call('/orders', { method: 'POST', token: buyerTok, body: { items: [{ productId: pid, qty }], paymentMethod: 'cod', address } });
    assert.equal((await order(1)).status, 422);
    const placed = await order(3); assert.equal(placed.status, 201); assert.equal(placed.json.data.order.total, 1620);
    const oid = placed.json.data.order.id;
    // The seller notification is sent just after the order response, so give it a moment (a remote database is slower than a local one).
    const waitFor = async (check) => { for (let i = 0; i < 30; i++) { if (await check()) return true; await new Promise((r) => setTimeout(r, 100)); } return false; };
    assert.ok(await waitFor(async () => (await call('/notifications', { token: t1 })).json.data.items.some((n) => n.type === 'new_order')));
    assert.equal((await call('/orders/selling', { token: t2 })).json.data.length, 0);
    assert.equal((await call(`/orders/${oid}/status`, { method: 'PATCH', token: t2, body: { status: 'confirmed' } })).status, 404);

    // Reviews need a delivered order, once only; seller can reply but only to own products
    const review = (tok) => call(`/products/${pid}/reviews`, { method: 'POST', token: tok, body: { rating: 5, comment: 'Good seed' } });
    assert.equal((await review(buyerTok)).status, 403);
    for (const s of ['confirmed', 'shipped', 'delivered']) assert.equal((await call(`/orders/${oid}/status`, { method: 'PATCH', token: t1, body: { status: s } })).status, 200);
    assert.equal((await review(buyerTok)).status, 201); assert.equal((await review(buyerTok)).status, 409); assert.equal((await review(farmerTok)).status, 403);
    const rv = (await call('/seller/reviews', { token: t1 })).json.data; assert.equal(rv.count, 1);
    assert.equal((await call(`/seller/reviews/${rv.reviews[0].id}/reply`, { method: 'POST', token: t2, body: { text: 'Thanks' } })).status, 404);
    assert.equal((await call(`/seller/reviews/${rv.reviews[0].id}/reply`, { method: 'POST', token: t1, body: { text: 'Thanks' } })).status, 200);

    // Earnings come from real paid orders (COD counts once delivered); payouts are capped at what is owed
    const e = (await call('/seller/earnings', { token: t1 })).json.data.summary;
    assert.equal(e.gross, 1620); assert.equal(e.net, 1620); assert.equal(e.pendingPayout, 1620);
    assert.equal((await call(`/admin/sellers/${s1.json.data.user.id}/payouts`, { method: 'POST', token: admin, body: { amount: 5000, reference: 'UTR123' } })).status, 422);
    assert.equal((await call(`/admin/sellers/${s1.json.data.user.id}/payouts`, { method: 'POST', token: admin, body: { amount: 1000, reference: 'UTR123' } })).status, 201);
    assert.equal((await call('/seller/earnings', { token: t1 })).json.data.summary.pendingPayout, 620);
    const a = (await call('/seller/analytics', { token: t1 })).json.data; assert.equal(a.totals.orders, 1); assert.equal(a.topProducts[0].qty, 3);

    // Seller verification and suspension: suspended seller's sessions end immediately
    assert.equal((await call(`/admin/sellers/${s1.json.data.user.id}/review`, { method: 'PATCH', token: admin, body: { decision: 'verify' } })).status, 200);
    assert.equal((await call('/auth/me', { token: t1 })).json.data.user.seller.verification, 'verified');
    assert.equal((await call(`/admin/sellers/${s1.json.data.user.id}/review`, { method: 'PATCH', token: admin, body: { decision: 'suspend', note: 'fake licence' } })).status, 200);
    assert.equal((await call('/seller/summary', { token: t1 })).status, 401);

    // Rentals: no double booking, owner-only control, server prices the booking
    const rent = await call('/rentals', { method: 'POST', token: t2, body: { name: 'Mahindra 575', type: 'tractor', daily: '1500', hourly: '250', deposit: '2000', district: 'Agra', address: 'Plot 4, Near Shiv Mandir', village: 'Kheda', state: 'Uttar Pradesh', pincode: '282001' } });
    assert.equal(rent.status, 201); const rid = rent.json.data.id;
    assert.equal((await call('/rentals', { method: 'POST', token: t2, body: { name: 'No price', type: 'tractor', district: 'Agra', address: 'Plot 4, Near Shiv Mandir', village: 'Kheda', state: 'Uttar Pradesh', pincode: '282001' } })).status, 400);
    assert.equal((await call('/rentals', { method: 'POST', token: t2, body: { name: 'No address', type: 'tractor', daily: '900' } })).status, 422);   // pickup address is required
    const day = (d, h = 9) => new Date(Date.UTC(2099, 0, d, h)).toISOString();
    const book = (tok, s, en) => call(`/rentals/${rid}/book`, { method: 'POST', token: tok, body: { start: s, end: en, rateType: 'day' } });
    const b1 = await book(buyerTok, day(10), day(12)); assert.equal(b1.status, 201); assert.equal(b1.json.data.amount, 3000);   // 48h = 2 days
    const b2 = await book(farmerTok, day(11), day(13)); assert.equal(b2.status, 201);   // requests may overlap; confirmation may not
    assert.equal((await call(`/rentals/bookings/${b1.json.data.id}/status`, { method: 'PATCH', token: farmerTok, body: { status: 'confirmed' } })).status, 404);
    // location, fixed pickup address and payment choice
    const listed = (await call('/rentals')).json.data.find((x) => x.id === rid);
    assert.equal(listed.address, undefined); assert.equal(listed.upiId, undefined); assert.equal(listed.district, 'Agra');   // street address and UPI stay private
    assert.equal((await call('/rentals?state=uttar%20pradesh&district=agra')).json.data.some((x) => x.id === rid), true);
    assert.equal((await call('/rentals?district=Nowhere')).json.data.length, 0);
    assert.equal((await call('/rentals?pincode=282005')).json.data.find((x) => x.id === rid).near, 'area');
    assert.equal((await call('/rentals/locations')).json.data.some((l) => l.district === 'Agra'), true);
    assert.equal((await call(`/rentals/${rid}/book`, { method: 'POST', token: farmerTok, body: { start: day(30), end: day(31), rateType: 'day', paymentMethod: 'online' } })).status, 422);   // owner has no UPI id / online is off
    let mineB = (await call('/rentals/bookings/mine', { token: buyerTok })).json.data.find((x) => x.id === b1.json.data.id);
    assert.equal(mineB.pickup, undefined); assert.equal(mineB.paymentStatus, 'pay_at_pickup');   // address hidden until the owner confirms
    assert.equal((await call(`/rentals/bookings/${b1.json.data.id}/status`, { method: 'PATCH', token: t2, body: { status: 'confirmed' } })).status, 200);
    mineB = (await call('/rentals/bookings/mine', { token: buyerTok })).json.data.find((x) => x.id === b1.json.data.id);
    assert.equal(mineB.pickup.address, 'Plot 4, Near Shiv Mandir'); assert.equal(Boolean(mineB.statusAt.confirmed), true);
    assert.equal((await call(`/rentals/bookings/${b1.json.data.id}/status`, { method: 'PATCH', token: t2, body: { status: 'handed_over' } })).status, 200);
    mineB = (await call('/rentals/bookings/mine', { token: buyerTok })).json.data.find((x) => x.id === b1.json.data.id);
    assert.equal(mineB.paymentStatus, 'paid'); assert.equal(Boolean(mineB.statusAt.handed_over), true);   // rent collected in person at pickup
    // (the booking stays handed over so the double-booking checks below still apply)
    assert.equal((await call(`/rentals/bookings/${b2.json.data.id}/status`, { method: 'PATCH', token: t2, body: { status: 'confirmed' } })).status, 409);
    assert.equal((await book(farmerTok, day(11), day(12))).status, 409);        // now blocked at request time too
    assert.equal((await book(farmerTok, day(12), day(14))).status, 201);        // back-to-back is fine
    assert.equal((await call(`/rentals/${rid}/book`, { method: 'POST', token: t2, body: { start: day(20), end: day(21), rateType: 'day' } })).status, 403);   // not your own
  } finally { server.close(); await mongoose.disconnect(); }
});
