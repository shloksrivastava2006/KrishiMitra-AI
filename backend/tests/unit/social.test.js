// Runs without a database: checks that Google/Apple ID tokens are accepted only when they are genuine.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { installFakeProvider } from '../helpers/fakeProvider.js';

process.env.GOOGLE_CLIENT_ID = 'g-client';
process.env.APPLE_CLIENT_ID = 'a-client';
process.env.JWT_SECRET ||= 'test-secret-test-secret';
const fake = installFakeProvider();
const { verifySocialToken } = await import('../../services/socialAuthService.js');

const rejects = (provider, token) => assert.rejects(() => verifySocialToken(provider, token), (e) => e.status === 401);

test('a genuine Google token gives id, email and name', async () => {
  const c = await verifySocialToken('google', fake.google());
  assert.deepEqual(c, { id: 'g-1', email: 'farmer@example.com', emailVerified: true, name: 'Google Farmer' });
});

test('a genuine Apple token works, including email_verified sent as the string "true"', async () => {
  const c = await verifySocialToken('apple', fake.apple());
  assert.equal(c.id, 'a-1'); assert.equal(c.emailVerified, true); assert.equal(c.name, '');
});

test('public keys are cached between requests', async () => {
  const before = fake.state.keyRequests;
  await verifySocialToken('google', fake.google({ sub: 'g-2' }));
  await verifySocialToken('google', fake.google({ sub: 'g-3' }));
  assert.equal(fake.state.keyRequests, before);
});

test('a token meant for another app (wrong audience) is refused', () => rejects('google', fake.google({ aud: 'someone-elses-app' })));
test('a token from the wrong issuer is refused', () => rejects('google', fake.google({ iss: 'https://evil.example.com' })));
test('an Apple token is not accepted as a Google token', () => rejects('google', fake.apple()));
test('an expired token is refused', () => rejects('google', fake.google({}, { expiresIn: -60 })));
test('a token signed with a different key is refused', () => {
  const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
  return rejects('google', fake.google({}, { key: other }));
});
test('an HS256 token (the "alg" downgrade trick) is refused', () => rejects('google', fake.google({}, { key: 'secret', alg: 'HS256' })));
test('garbage is refused', () => rejects('google', 'not-a-token'));
test('a token whose key id is unknown is refused', () => rejects('google', fake.google({}, { kid: 'unknown-kid' })));
