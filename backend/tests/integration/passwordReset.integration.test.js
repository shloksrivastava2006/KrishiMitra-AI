// Needs a throwaway MongoDB: TEST_MONGODB_URI=mongodb://127.0.0.1:27017/krishimitra_test npm test
// Skipped when TEST_MONGODB_URI is not set. It wipes the users and otps collections of that database.
import test from 'node:test';
import assert from 'node:assert/strict';

const uri = process.env.TEST_MONGODB_URI;
const run = uri ? test : test.skip;
if (uri) { process.env.MONGODB_URI = uri; process.env.JWT_SECRET ||= 'test-secret-test-secret'; process.env.SMS_PROVIDER = 'console'; }

run('forgot password: OTP by mobile and by email, new password, old sessions end, no account leak, admin excluded', async () => {
  const { default: app } = await import('../../app.js');
  const mongoose = (await import('mongoose')).default;
  const { User } = await import('../../models/User.js');
  const { latestDevOtp } = await import('../../services/smsService.js');
  const { latestDevEmailOtp } = await import('../../services/mailService.js');
  await mongoose.connect(uri);
  await Promise.all(['users', 'otps'].map((c) => mongoose.connection.collection(c).deleteMany({})));
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const call = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) }, body: body && JSON.stringify(body) });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };
  const login = (identifier, password) => call('/auth/login', { method: 'POST', body: { identifier, password } });
  const send = (identifier) => call('/auth/forgot-password/send', { method: 'POST', body: { identifier } });
  const reset = (identifier, code, newPassword = 'brand-new-pass1', confirmPassword = newPassword) => call('/auth/forgot-password/reset', { method: 'POST', body: { identifier, code, newPassword, confirmPassword } });

  try {
    await User.create({ name: 'Reset Farmer', email: 'reset@example.com', phone: '9855555555', phoneVerified: true, password: 'oldpassword1', role: 'farmer' });
    await User.create({ name: 'Admin', email: 'admin@example.com', phone: '9866666666', password: 'a-long-password-1', role: 'admin', isMainAdmin: true });
    const oldToken = (await login('9855555555', 'oldpassword1')).json.data.token;

    // Unknown number and real number get the same answer, but only the real one gets a code
    const unknown = await send('9877777777'); const real = await send('9855555555');
    assert.equal(unknown.status, 200); assert.equal(real.status, 200); assert.equal(unknown.json.message, real.json.message);
    assert.equal(latestDevOtp('9877777777'), undefined);
    const code = latestDevOtp('9855555555'); assert.match(code, /^\d{6}$/);

    // Wrong code, mismatched confirmation, then the right code
    assert.equal((await reset('9855555555', code === '111111' ? '222222' : '111111')).status, 400);
    assert.equal((await reset('9855555555', code, 'brand-new-pass1', 'different-pass1')).status, 422);
    assert.equal((await reset('9855555555', code, 'short')).status, 422);
    assert.equal((await reset('9855555555', code)).status, 200);

    // The password really changed, the old one and the old session are dead, and the code works only once
    assert.equal((await login('9855555555', 'oldpassword1')).status, 401);
    assert.equal((await login('9855555555', 'brand-new-pass1')).status, 200);
    assert.equal((await login('reset@example.com', 'brand-new-pass1')).status, 200);
    assert.equal((await call('/auth/me', { token: oldToken })).status, 401);
    assert.equal((await reset('9855555555', code, 'another-pass-123')).status, 400);

    // Same thing by email
    assert.equal((await send('reset@example.com')).status, 200);
    const mailCode = latestDevEmailOtp('reset@example.com'); assert.match(mailCode, /^\d{6}$/);
    assert.equal((await reset('reset@example.com', mailCode, 'by-email-pass-1')).status, 200);
    assert.equal((await login('reset@example.com', 'by-email-pass-1')).status, 200);

    // A reset code for an unknown account, and any attempt on an administrator, is refused; no code is even sent to the admin
    assert.equal((await reset('9877777777', '123456')).status, 400);
    assert.equal((await send('admin@example.com')).status, 200);
    assert.equal(latestDevEmailOtp('admin@example.com'), undefined);
    assert.equal((await reset('admin@example.com', '123456')).status, 400);
  } finally { server.close(); await mongoose.disconnect(); }
});
