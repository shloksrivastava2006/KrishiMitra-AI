// Signup now needs a verified email. Tests that are not about OTP mint the receipt directly
// (same secret and format as POST /auth/otp/verify), so they do not depend on SMS, cooldowns or rate limits.
// Call only after process.env.JWT_SECRET is set.
export async function proofs(body) {
  const { signProof } = await import('../services/otpService.js');
  const out = { ...body, emailProof: signProof({ channel: 'email', target: String(body.email).toLowerCase(), purpose: 'signup' }) };
  return out;
}
// Unique, valid Indian mobile numbers for test users: 9 + 9 digits.
export const phoneFor = (n, base = 100000000) => `9${base + n}`;
