import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Google and Apple both hand the browser a signed ID token (a JWT). We never trust the browser's word:
// the signature is checked against the provider's published public keys, plus issuer, audience and expiry.
const PROVIDERS = {
  google: {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    keysUrl: 'https://www.googleapis.com/oauth2/v3/certs',
    audience: () => env.googleClientId,
    idField: 'googleId',
  },
  apple: {
    issuer: 'https://appleid.apple.com',
    keysUrl: 'https://appleid.apple.com/auth/keys',
    audience: () => env.appleClientId,
    idField: 'appleId',
  },
};

export const SOCIAL_PROVIDERS = Object.keys(PROVIDERS);
export const providerIdField = (provider) => PROVIDERS[provider].idField;
export const socialConfigured = (provider) => Boolean(PROVIDERS[provider]?.audience());

const keyCache = new Map();   // provider -> { keys, fetchedAt }
const KEY_TTL_MS = 60 * 60 * 1000;

async function getKeys(provider, force = false) {
  const hit = keyCache.get(provider);
  if (hit && !force && Date.now() - hit.fetchedAt < KEY_TTL_MS) return hit.keys;
  const res = await fetch(PROVIDERS[provider].keysUrl, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`key fetch ${res.status}`);
  const { keys } = await res.json();
  keyCache.set(provider, { keys, fetchedAt: Date.now() });
  return keys;
}

const truthy = (v) => v === true || v === 'true';

// Returns { id, email, emailVerified, name } for a valid token, or throws ApiError(401).
export async function verifySocialToken(provider, idToken) {
  const cfg = PROVIDERS[provider];
  if (!cfg) throw new ApiError(400, 'Unknown sign-in provider');
  if (!socialConfigured(provider)) throw new ApiError(503, `${provider === 'google' ? 'Google' : 'Apple'} sign-in is not set up on this server yet`);
  const fail = () => new ApiError(401, `Could not verify your ${provider === 'google' ? 'Google' : 'Apple'} sign-in. Please try again`);

  const decoded = jwt.decode(String(idToken || ''), { complete: true });
  if (!decoded?.header?.kid || decoded.header.alg !== 'RS256') throw fail();

  let payload;
  try {
    let keys = await getKeys(provider);
    let jwk = keys.find((k) => k.kid === decoded.header.kid);
    if (!jwk) { keys = await getKeys(provider, true); jwk = keys.find((k) => k.kid === decoded.header.kid); }   // keys rotate
    if (!jwk) throw new Error('unknown key id');
    const pem = crypto.createPublicKey({ key: jwk, format: 'jwk' }).export({ type: 'spki', format: 'pem' });
    payload = jwt.verify(idToken, pem, { algorithms: ['RS256'], audience: cfg.audience(), issuer: cfg.issuer });
  } catch (err) {
    console.error(`${provider} token rejected:`, err.message);
    throw fail();
  }
  if (!payload.sub) throw fail();
  return {
    id: String(payload.sub),
    email: payload.email ? String(payload.email).toLowerCase() : '',
    emailVerified: truthy(payload.email_verified),
    name: typeof payload.name === 'string' ? payload.name.trim() : '',
  };
}
