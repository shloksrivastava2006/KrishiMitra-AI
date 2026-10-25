// Needs a throwaway MongoDB: TEST_MONGODB_URI=mongodb://127.0.0.1:27017/krishimitra_test npm test
// Skipped when TEST_MONGODB_URI is not set. It wipes the users and otps collections of that database.
import test from 'node:test';
import assert from 'node:assert/strict';
import { installFakeProvider } from '../helpers/fakeProvider.js';
import { proofs } from '../helpers/proofs.js';

const uri = process.env.TEST_MONGODB_URI;
const run = uri ? test : test.skip;
if (uri) {
  process.env.MONGODB_URI = uri; process.env.JWT_SECRET ||= 'test-secret-test-secret'; process.env.SMS_PROVIDER = 'console';
  process.env.GOOGLE_CLIENT_ID = 'g-client'; process.env.APPLE_CLIENT_ID = '';   // Google is on, Apple is off
}

run('Google sign-up and login for every role, safe linking, Apple switched off', async () => {
  const fake = installFakeProvider();
  const { default: app } = await import('../../app.js');
  const mongoose = (await import('mongoose')).default;
  const { User } = await import('../../models/User.js');
  const { latestDevOtp } = await import('../../services/smsService.js');
  await mongoose.connect(uri);
  await Promise.all(['users', 'otps'].map((c) => mongoose.connection.collection(c).deleteMany({})));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };
  const social = (path, body) => call(`/auth/social/${path}`, { method: 'POST', body });
  const gLogin = (idToken, portal) => social('login', { provider: 'google', idToken, portal });
  const signup = (idToken, portal, phone, extra = {}) => proofs({ provider: 'google', idToken, portal, phone, consent: true, ...extra });

  try {
    const cfg = (await call('/auth/config')).json.data;
    assert.equal(cfg.google.clientId, 'g-client'); assert.equal(cfg.apple, null);

    // Not signed up yet: 404 with the verified name and email so the signup form can start filled in
    const t1 = fake.google({ sub: 'g-cust', email: 'cust@example.com', name: 'Cust Omer' });
    const miss = await gLogin(t1);
    assert.equal(miss.status, 404); assert.equal(miss.json.details.code, 'NO_ACCOUNT'); assert.equal(miss.json.details.email, 'cust@example.com');

    // Signup needs the consent (no mobile OTP any more); the role comes from the chosen tab
    assert.equal((await social('register', { provider: 'google', idToken: t1, portal: 'customer', phone: '12345', consent: true })).status, 422);
    assert.equal((await social('register', await signup(t1, 'customer', '9811111111', { consent: false }))).status, 422);
    assert.equal((await social('register', await signup(t1, 'admin', '9811111111'))).status, 422);
    const made = await social('register', await signup(t1, 'customer', '9811111111'));
    assert.equal(made.status, 201); assert.equal(made.json.data.user.role, 'customer');
    assert.equal(made.json.data.user.emailVerified, true); assert.equal(made.json.data.user.phoneVerified, false);
    assert.equal(made.json.data.user.name, 'Cust Omer');
    assert.equal((await call('/auth/me', { token: made.json.data.token })).status, 200);

    // Login with Google: right tab works, wrong tab is guided, signing up twice is refused
    const again = await gLogin(fake.google({ sub: 'g-cust', email: 'cust@example.com' }), 'customer');
    assert.equal(again.status, 200); assert.equal(again.json.data.user.id, made.json.data.user.id);
    assert.equal((await gLogin(t1, 'farmer')).status, 403);
    assert.equal((await social('register', await signup(t1, 'customer', '9822222222'))).status, 409);

    // Farmer through Google
    const farmer = await social('register', await signup(fake.google({ sub: 'g-far', email: 'far@example.com', name: 'Far Mer' }), 'farmer', '9833333333'));
    assert.equal(farmer.status, 201); assert.equal(farmer.json.data.user.role, 'farmer');
    // The mobile number is optional: an account can be made without one
    const noPhone = await social('register', await signup(fake.google({ sub: 'g-nop', email: 'nop@example.com', name: 'No Phone' }), 'farmer', undefined));
    assert.equal(noPhone.status, 201); assert.ok(!noPhone.json.data.user.phone);
    // The same mobile number cannot be used for a second account
    assert.equal((await social('register', await signup(fake.google({ sub: 'g-far2', email: 'far2@example.com' }), 'farmer', '9833333333'))).status, 409);

    // Seller through Google needs the business details, and starts pending
    const sTok = fake.google({ sub: 'g-sel', email: 'shop@example.com', name: 'Shop Owner' });
    assert.equal((await social('register', await signup(sTok, 'seller', '9844444444'))).status, 422);
    const seller = await social('register', await signup(sTok, 'seller', '9844444444', { shopName: 'Kisan Seeds', address: '12 Market Road', district: 'Agra', state: 'Uttar Pradesh', pincode: '282001' }));
    assert.equal(seller.status, 201); assert.equal(seller.json.data.user.role, 'vendor'); assert.equal(seller.json.data.user.seller.verification, 'pending');

    // An existing password account is linked only when Google says the email is verified
    await User.create({ name: 'Old Timer', email: 'old@example.com', phone: '9855555555', password: 'oldpassword1', role: 'farmer' });
    assert.equal((await gLogin(fake.google({ sub: 'g-old', email: 'old@example.com', email_verified: false }))).status, 404);
    const linked = await gLogin(fake.google({ sub: 'g-old', email: 'old@example.com' }), 'farmer');
    assert.equal(linked.status, 200); assert.equal(linked.json.data.user.email, 'old@example.com');
    assert.equal((await User.findOne({ email: 'old@example.com' }).select('+googleId')).googleId, 'g-old');
    // ...and the password still works
    assert.equal((await call('/auth/login', { method: 'POST', body: { identifier: 'old@example.com', password: 'oldpassword1' } })).status, 200);

    // Forged or foreign tokens are refused; Apple is off because no client id is set
    assert.equal((await gLogin(fake.google({ aud: 'another-app' }))).status, 401);
    assert.equal((await gLogin('x'.repeat(40))).status, 401);
    assert.equal((await social('login', { provider: 'apple', idToken: fake.apple() })).status, 503);

    // A Google-only account has no password, so password login fails cleanly, and "Forgot password" lets the owner set one
    const noPass = await call('/auth/login', { method: 'POST', body: { identifier: 'cust@example.com', password: 'anything123' } });
    assert.equal(noPass.status, 401);
    await call('/auth/forgot-password/send', { method: 'POST', body: { identifier: '9811111111' } });
    const reset = await call('/auth/forgot-password/reset', { method: 'POST', body: { identifier: '9811111111', code: latestDevOtp('9811111111'), newPassword: 'my-new-pass-1', confirmPassword: 'my-new-pass-1' } });
    assert.equal(reset.status, 200);
    assert.equal((await call('/auth/login', { method: 'POST', body: { identifier: 'cust@example.com', password: 'my-new-pass-1', portal: 'customer' } })).status, 200);
  } finally { server.close(); await mongoose.disconnect(); }
});
