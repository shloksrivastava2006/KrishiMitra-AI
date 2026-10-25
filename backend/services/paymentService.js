import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export const razorpayEnabled = () => Boolean(env.razorpayKeyId && env.razorpayKeySecret);

const hmacHex = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest('hex');
function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a, 'utf8'); const y = Buffer.from(b, 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Checkout callback: HMAC-SHA256 of "order_id|payment_id" with the API key secret.
export const verifyPaymentSignature = ({ orderId, paymentId, signature, secret }) =>
  Boolean(secret && orderId && paymentId) && safeEqualHex(hmacHex(`${orderId}|${paymentId}`, secret), signature);

// Webhook: HMAC-SHA256 of the exact raw request bytes with the webhook secret (a different secret).
export const verifyWebhookSignature = (rawBody, signature, secret) =>
  Boolean(secret) && Buffer.isBuffer(rawBody) && safeEqualHex(hmacHex(rawBody, secret), signature);

export async function createRazorpayOrder({ amountPaise, receipt }) {
  if (!razorpayEnabled()) throw new ApiError(503, 'Online payment is not set up on this server. Choose cash on delivery');
  let res;
  try {
    res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST', signal: AbortSignal.timeout(15000),
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString('base64')}` },
      body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: String(receipt).slice(0, 40) }),
    });
  } catch { throw new ApiError(502, 'Payment service is not reachable. Try again or choose cash on delivery'); }
  if (!res.ok) { console.error(`Razorpay order creation failed with status ${res.status}`); throw new ApiError(502, 'Could not start the payment. Try again or choose cash on delivery'); }
  const data = await res.json();
  if (!data?.id || data.amount !== amountPaise) throw new ApiError(502, 'Payment service returned an unexpected answer');
  return { id: data.id, amount: data.amount, currency: data.currency };
}
