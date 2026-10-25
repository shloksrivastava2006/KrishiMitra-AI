// A fake Google/Apple: signs ID tokens with our own key and answers the "public keys" request with it,
// so sign-in code can be tested without the internet. Install BEFORE importing anything from services/.
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

export function installFakeProvider() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'test-kid', alg: 'RS256', use: 'sig' };
  const realFetch = globalThis.fetch;
  const state = { keyRequests: 0 };
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('googleapis.com/oauth2/v3/certs') || u.includes('appleid.apple.com/auth/keys')) {
      state.keyRequests += 1;
      return new Response(JSON.stringify({ keys: [jwk] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return realFetch(url, init);
  };
  const sign = (claims, { key = privateKey, kid = 'test-kid', alg = 'RS256', expiresIn = '1h' } = {}) =>
    jwt.sign(claims, key, { algorithm: alg, keyid: kid, expiresIn });
  const google = (claims = {}, opts) => sign({ iss: 'https://accounts.google.com', aud: 'g-client', sub: 'g-1', email: 'farmer@example.com', email_verified: true, name: 'Google Farmer', ...claims }, opts);
  const apple = (claims = {}, opts) => sign({ iss: 'https://appleid.apple.com', aud: 'a-client', sub: 'a-1', email: 'apple@example.com', email_verified: 'true', ...claims }, opts);
  return { sign, google, apple, state, privateKey };
}
