import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Development only: the most recent code sent to each number, so tests and the console provider can read it.
// Never filled in production.
const devOutbox = new Map();
export const latestDevOtp = (target) => devOutbox.get(target);

const isProd = () => env.nodeEnv === 'production';

export function smsConfigured() {
  if (env.smsProvider === 'msg91') return Boolean(env.msg91AuthKey && env.msg91TemplateId);
  if (env.smsProvider === 'twilio') return Boolean(env.twilioSid && env.twilioToken && env.twilioFrom);
  return !isProd();   // 'console' works only outside production
}

async function post(url, init) {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`SMS provider answered ${res.status}`);
  return res;
}

// phone is the 10-digit Indian mobile number. Throws ApiError if the code could not be sent.
export async function sendOtpSms(phone, code, minutes) {
  if (!smsConfigured()) throw new ApiError(503, 'Mobile OTP is not set up on this server yet');
  try {
    if (env.smsProvider === 'msg91') {
      // MSG91 OTP API: the template must be approved (DLT) and contain the ##OTP## variable.
      const qs = new URLSearchParams({ template_id: env.msg91TemplateId, mobile: `91${phone}`, authkey: env.msg91AuthKey, otp: code, otp_expiry: String(minutes) });
      await post(`https://control.msg91.com/api/v5/otp?${qs}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    } else if (env.smsProvider === 'twilio') {
      const body = new URLSearchParams({ To: `+91${phone}`, From: env.twilioFrom, Body: `${code} is your KrishiMitra AI verification code. It is valid for ${minutes} minutes. Do not share it with anyone.` });
      const auth = Buffer.from(`${env.twilioSid}:${env.twilioToken}`).toString('base64');
      await post(`https://api.twilio.com/2010-04-01/Accounts/${env.twilioSid}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    } else {
      devOutbox.set(phone, code);
      console.log(`[DEV OTP] SMS to ${phone}: ${code} (valid ${minutes} min)`);
    }
  } catch (err) {
    console.error('sms failed:', err.message);
    throw new ApiError(502, 'Could not send the SMS right now. Please try again in a moment');
  }
}
