// Needs a throwaway MongoDB: TEST_MONGODB_URI=mongodb://127.0.0.1:27017/krishimitra_test JWT_SECRET=x npm test
// Skipped automatically when TEST_MONGODB_URI is not set. It wipes the users/farms collections of that database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { proofs, phoneFor } from '../helpers/proofs.js';

const uri = process.env.TEST_MONGODB_URI;
const run = uri ? test : test.skip;

if (uri) { process.env.MONGODB_URI = uri; process.env.JWT_SECRET ||= 'test-secret-test-secret'; }

run('auth: roles, admin API, logout revocation, ownership', async () => {
  const { default: app } = await import('../../app.js');
  const mongoose = (await import('mongoose')).default;
  const { User } = await import('../../models/User.js');
  await mongoose.connect(uri);
  await Promise.all([User.deleteMany({}), mongoose.connection.collection('farms').deleteMany({})]);
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
    return { status: res.status, json: await res.json() };
  };
  const signup = async (n, extra = {}) => call('/auth/register', { method: 'POST', body: await proofs({ name: `User ${n}`, email: `u${n}@example.com`, phone: phoneFor(n, 500000000), password: 'password123', confirmPassword: 'password123', consent: true, ...extra }) });

  try {
    // Test 3: default role is farmer; admin cannot be self-assigned
    const a = await signup(1);
    assert.equal(a.status, 201); assert.equal(a.json.data.user.role, 'farmer');
    assert.equal((await signup(2, { role: 'admin' })).status, 422);
    assert.equal((await signup(3, { confirmPassword: 'different1' })).status, 422);
    assert.equal((await signup(4, { consent: false })).status, 422);

    // Login by email and by phone
    await signup(5, { phone: '9876543210' });
    assert.equal((await call('/auth/login', { method: 'POST', body: { identifier: '9876543210', password: 'password123' } })).status, 200);
    assert.equal((await call('/auth/login', { method: 'POST', body: { identifier: 'u5@example.com', password: 'wrong-password' } })).status, 401);

    // Test 6 + 12: farmer denied on admin API; edited client role is irrelevant (role comes from the database)
    const farmerToken = a.json.data.token;
    assert.equal((await call('/admin/users', { token: farmerToken })).status, 403);
    assert.equal((await call('/admin/users')).status, 401);

    // Admin (created directly, as the seed script does) can use it
    await User.create({ name: 'Admin', email: 'admin@example.com', password: 'a-long-password-1', role: 'admin', isMainAdmin: true });
    const adminLogin = await call('/auth/admin/login', { method: 'POST', body: { email: 'admin@example.com', password: 'a-long-password-1' } });
    assert.equal(adminLogin.json.data.user.role, 'admin');
    assert.equal((await call('/admin/users', { token: adminLogin.json.data.token })).status, 200);

    // Admins can be created only by an admin
    const newAdmin = { name: 'Second Admin', email: 'admin2@example.com', password: 'another-long-pass-1' };
    assert.equal((await call('/admin/users', { method: 'POST', token: farmerToken, body: newAdmin })).status, 403);
    assert.equal((await call('/admin/users', { method: 'POST', token: adminLogin.json.data.token, body: newAdmin })).status, 201);
    assert.equal((await call('/auth/admin/login', { method: 'POST', body: { email: 'admin2@example.com', password: newAdmin.password } })).json.data.user.role, 'admin');

    // Block, unblock and delete: main admin vs sub admin
    const mainTok = adminLogin.json.data.token;
    const subTok = (await call('/auth/admin/login', { method: 'POST', body: { email: 'admin2@example.com', password: newAdmin.password } })).json.data.token;
    const subAdmin = await User.findOne({ email: 'admin2@example.com' }); const mainAdmin = await User.findOne({ email: 'admin@example.com' });
    assert.equal(subAdmin.isMainAdmin, false); assert.equal(Boolean(subAdmin.createdBy), true);
    const victim = await signup(20); const vId = victim.json.data.user.id;
    // a sub admin can add nobody, but can manage farmers
    assert.equal((await call('/admin/users', { method: 'POST', token: subTok, body: { name: 'Third', email: 'admin3@example.com', password: 'yet-another-long-pass-1' } })).status, 403);
    assert.equal((await call(`/admin/users/${vId}/status`, { method: 'PATCH', token: farmerToken, body: { active: false } })).status, 403);
    assert.equal((await call(`/admin/users/${vId}/status`, { method: 'PATCH', token: subTok, body: { active: false } })).status, 200);
    assert.equal((await call('/auth/me', { token: victim.json.data.token })).status, 401);   // sessions end at once
    assert.equal((await call('/auth/login', { method: 'POST', body: { identifier: 'u20@example.com', password: 'password123' } })).status, 403);
    assert.equal((await call(`/admin/users/${vId}/status`, { method: 'PATCH', token: subTok, body: { active: true } })).status, 200);
    assert.equal((await call('/auth/login', { method: 'POST', body: { identifier: 'u20@example.com', password: 'password123' } })).status, 200);
    // nobody touches the main admin or themselves; a sub admin cannot touch other admins
    assert.equal((await call(`/admin/users/${mainAdmin._id}/status`, { method: 'PATCH', token: subTok, body: { active: false } })).status, 403);
    assert.equal((await call(`/admin/users/${mainAdmin._id}`, { method: 'DELETE', token: subTok })).status, 403);
    assert.equal((await call(`/admin/users/${mainAdmin._id}`, { method: 'DELETE', token: mainTok })).status, 403);
    assert.equal((await call(`/admin/users/${subAdmin._id}`, { method: 'DELETE', token: subTok })).status, 403);
    const list = await call('/admin/users?role=admin', { token: subTok });
    assert.equal(list.json.data.users.find((u) => u.isMainAdmin).canDelete, false);
    assert.equal(list.json.data.canManageAdmins, false);
    // delete a farmer (and their data); main admin removes the sub admin, which then can no longer log in
    assert.equal((await call(`/admin/users/${vId}`, { method: 'DELETE', token: subTok })).status, 200);
    assert.equal(await User.exists({ _id: vId }), null);
    assert.equal((await call(`/admin/users/${subAdmin._id}`, { method: 'DELETE', token: mainTok })).status, 200);
    assert.equal((await call('/auth/admin/login', { method: 'POST', body: { email: 'admin2@example.com', password: newAdmin.password } })).status, 401);
    assert.equal((await call('/admin/users', { token: subTok })).status, 401);
    // Farmer bank details: validated, saved masked, readable in full only by an admin
    const putPay = (b, tok = farmerToken) => call('/payout', { method: 'PUT', token: tok, body: b });
    assert.equal((await call('/payout')).status, 401);
    assert.equal((await putPay({})).status, 422);                                                       // needs UPI or bank
    assert.equal((await putPay({ accountName: 'Ram Kumar', ifsc: 'SBIN0001234' })).status, 422);      // bank needs the number too
    assert.equal((await putPay({ upiId: 'not a upi' })).status, 422);
    assert.equal((await putPay({ accountName: 'Ram Kumar', accountNumber: '12ab', ifsc: 'SBIN0001234' })).status, 422);
    const okPay = await putPay({ upiId: 'ram@okbank', accountName: 'Ram Kumar', accountNumber: '123456789012', ifsc: 'sbin0001234' });
    assert.equal(okPay.status, 200); assert.equal(okPay.json.data.payout.accountLast4, '9012'); assert.equal(okPay.json.data.payout.ifsc, 'SBIN0001234');
    assert.equal(JSON.stringify(okPay.json).includes('123456789012'), false);                          // the full number never comes back
    const meNow = await call('/auth/me', { token: farmerToken });
    assert.equal(meNow.json.data.user.payout.hasBank, true); assert.equal(JSON.stringify(meNow.json).includes('123456789012'), false);
    assert.equal((await putPay({ upiId: 'ram@okbank', accountName: 'Ram K', ifsc: 'SBIN0001234' })).status, 200);   // blank number keeps the saved one
    const farmerId = meNow.json.data.user.id;
    assert.equal((await call(`/admin/users/${farmerId}/payout`, { token: farmerToken })).status, 403);
    const shown = await call(`/admin/users/${farmerId}/payout`, { token: mainTok });
    assert.equal(shown.status, 200); assert.equal(shown.json.data.accountNumber, '123456789012'); assert.equal(shown.json.data.accountName, 'Ram K');
    assert.equal((await call('/payout', { method: 'DELETE', token: farmerToken })).json.data.payout.hasAny, false);
    assert.equal((await putPay({ upiId: 'ram@okbank' })).json.data.payout.hasBank, false);            // UPI alone is enough

    // only one main admin can exist
    await User.init();
    await assert.rejects(User.create({ name: 'Other', email: 'other-main@example.com', password: 'a-long-password-1', role: 'admin', isMainAdmin: true }));

    // Test 13: another user's farm is invisible
    const b = await signup(6);
    const farm = await call('/farms', { method: 'POST', token: farmerToken, body: { name: 'Mine', area: 2, unit: 'acre' } });
    assert.equal((await call(`/farms/${farm.json.data._id}`, { token: b.json.data.token })).status, 404);

    // Test 8/11: logout revokes the token server-side
    assert.equal((await call('/auth/me', { token: farmerToken })).status, 200);
    assert.equal((await call('/auth/logout', { method: 'POST', token: farmerToken })).status, 200);
    assert.equal((await call('/auth/me', { token: farmerToken })).status, 401);
    assert.equal((await call('/farms', { token: farmerToken })).status, 401);
  } finally {
    server.close(); await mongoose.disconnect();
  }
});
