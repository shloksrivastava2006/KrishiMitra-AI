// Needs a throwaway MongoDB: TEST_MONGODB_URI=mongodb://127.0.0.1:27017/krishimitra_test npm test
// Skipped when TEST_MONGODB_URI is not set. It wipes the users and otps collections of that database.
import test from 'node:test';
import assert from 'node:assert/strict';

const uri = process.env.TEST_MONGODB_URI;
const run = uri ? test : test.skip;
if (uri) { process.env.MONGODB_URI = uri; process.env.JWT_SECRET ||= 'test-secret-test-secret'; process.env.SMS_PROVIDER = 'console'; }

run('signup OTP: send, resend limit, wrong codes, one-time use, email compulsory, mobile optional', async () => {
  const { default: app } = await import('../../app.js');
  const mongoose = (await import('mongoose')).default;
  const { latestDevEmailOtp } = await import('../../services/mailService.js');
  await mongoose.connect(uri);
  await Promise.all(['users', 'otps'].map((c) => mongoose.connection.collection(c).deleteMany({})));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };
  const send = (channel, target) => call('/auth/otp/send', { method: 'POST', body: { channel, target } });
  const verify = (channel, target, code) => call('/auth/otp/verify', { method: 'POST', body: { channel, target, code } });
  const wrongCode = (real) => (real === '111111' ? '222222' : '111111');
  const account = (extra) => ({ name: 'Ram Kumar', email: 'ram@example.com', password: 'password123', confirmPassword: 'password123', consent: true, ...extra });

  try {
    const cfg = await call('/auth/config');
    assert.equal(cfg.json.data.otp.email, true);

    // Email OTP: send, resend too soon, wrong code, right code, code cannot be reused
    const mail = 'ram@example.com';
    assert.equal((await send('email', mail)).status, 200);
    const code = latestDevEmailOtp(mail); assert.match(code, /^\d{6}$/);
    assert.equal((await send('email', mail)).status, 429);
    assert.equal((await verify('email', mail, wrongCode(code))).status, 400);
    const ok = await verify('email', mail, code);
    assert.equal(ok.status, 200); assert.ok(ok.json.data.proof);
    assert.equal((await verify('email', mail, code)).status, 400);

    // Email OTP is compulsory: no proof, a garbage proof, or a proof for another email is refused
    assert.equal((await call('/auth/register-customer', { method: 'POST', body: account() })).status, 422);
    assert.equal((await call('/auth/register-customer', { method: 'POST', body: account({ emailProof: 'garbage' }) })).status, 400);
    assert.equal((await call('/auth/register-customer', { method: 'POST', body: account({ email: 'other@example.com', emailProof: ok.json.data.proof }) })).status, 400);

    // Mobile number is optional: signup works with only the email proof; the account has no phone and the email is verified
    const done = await call('/auth/register-customer', { method: 'POST', body: account({ emailProof: ok.json.data.proof }) });
    assert.equal(done.status, 201);
    assert.equal(done.json.data.user.emailVerified, true); assert.equal(done.json.data.user.phoneVerified, false);
    assert.ok(!done.json.data.user.phone);

    // An email that already has an account cannot ask for a signup code
    assert.equal((await send('email', mail)).status, 409);

    // A mobile number can be given without any OTP; a malformed one is refused; a used one cannot be reused
    const mail2 = 'sita@example.com';
    assert.equal((await send('email', mail2)).status, 200);
    const proof2 = (await verify('email', mail2, latestDevEmailOtp(mail2))).json.data.proof;
    assert.equal((await call('/auth/register', { method: 'POST', body: account({ name: 'Sita Devi', email: mail2, phone: '12345', emailProof: proof2 }) })).status, 422);
    const withPhone = await call('/auth/register', { method: 'POST', body: account({ name: 'Sita Devi', email: mail2, phone: '9822222222', emailProof: proof2 }) });
    assert.equal(withPhone.status, 201); assert.equal(withPhone.json.data.user.phone, '9822222222'); assert.equal(withPhone.json.data.user.phoneVerified, false);
    const mail3 = 'gita@example.com';
    assert.equal((await send('email', mail3)).status, 200);
    const proof3 = (await verify('email', mail3, latestDevEmailOtp(mail3))).json.data.proof;
    assert.equal((await call('/auth/register', { method: 'POST', body: account({ name: 'Gita', email: mail3, phone: '9822222222', emailProof: proof3 }) })).status, 409);

    // Five wrong guesses kill the code, even if the next guess is right
    const mail4 = 'four@example.com'; await send('email', mail4);
    const real = latestDevEmailOtp(mail4);
    for (let i = 0; i < 5; i += 1) assert.equal((await verify('email', mail4, wrongCode(real))).status, 400);
    assert.equal((await verify('email', mail4, real)).status, 400);

    // The code itself is never stored
    const stored = await mongoose.connection.collection('otps').findOne({ target: mail4 });
    assert.equal(JSON.stringify(stored).includes(real), false);
  } finally { server.close(); await mongoose.disconnect(); }
});
