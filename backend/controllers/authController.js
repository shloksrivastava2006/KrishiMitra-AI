import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { signToken } from '../services/authService.js';
import { env } from '../config/env.js';
import { issueOtp, consumeOtp, signProof, checkProof, channelAvailable, OTP_MINUTES } from '../services/otpService.js';
import { verifySocialToken, providerIdField, socialConfigured } from '../services/socialAuthService.js';

// Role is deliberately NOT in this list: every public signup is a farmer.
const FIELDS = ['name', 'email', 'phone', 'password', 'language', 'village', 'district', 'state'];

// Every signup needs a verified email (OTP, compulsory). The mobile number is optional and is not OTP-verified.
// The browser proves the email with a short-lived receipt from POST /auth/otp/verify; the server re-checks it here.
async function prepareSignup(body) {
  const data = Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined && body[f] !== '').map((f) => [f, body[f]]));
  if (await User.exists({ email: data.email })) throw new ApiError(409, 'An account with this email already exists');
  // Phone can be used to log in, so when given it must identify one account.
  if (data.phone && (await User.exists({ phone: data.phone }))) throw new ApiError(409, 'An account with this mobile number already exists');
  checkProof(body.emailProof, { channel: 'email', target: data.email, purpose: 'signup' });
  return { ...data, emailVerified: true, phoneVerified: false };
}

export const register = asyncHandler(async (req, res) => {
  // Whitelist fields so clients cannot set role, isActive, tokenVersion etc.
  const user = await User.create({ ...(await prepareSignup(req.body)), role: 'farmer' });
  res.status(201).json({ success: true, data: { token: signToken(user), user: user.toSafeObject() } });
});

const SELLER_FIELDS = ['shopName', 'address', 'pincode', 'licenceNumber', 'upiId', 'bankAccountName', 'bankAccountNumber', 'bankIfsc'];
const pickSeller = (b) => Object.fromEntries(SELLER_FIELDS.filter((f) => b[f] !== undefined && b[f] !== '').map((f) => [f, b[f]]));

// Seller signup uses the same page as farmer signup. Role is forced here; the client cannot pick it.
export const registerSeller = asyncHandler(async (req, res) => {
  // Verification always starts as 'pending'; only an admin can change it.
  const user = await User.create({ ...(await prepareSignup(req.body)), role: 'vendor', seller: { ...pickSeller(req.body), verification: 'pending' } });
  res.status(201).json({ success: true, data: { token: signToken(user), user: user.toSafeObject() } });
});

// Customers are buyers: they can shop and rent equipment but have no farm tools and cannot sell. Role is forced here.
export const registerCustomer = asyncHandler(async (req, res) => {
  const user = await User.create({ ...(await prepareSignup(req.body)), role: 'customer' });
  res.status(201).json({ success: true, data: { token: signToken(user), user: user.toSafeObject() } });
});

// ---- OTP (signup) ------------------------------------------------------------------------------------

// What the login/signup pages may offer: which social buttons and which OTP channels are switched on. Public values only.
export const authConfig = (req, res) => res.json({ success: true, data: {
  google: socialConfigured('google') ? { clientId: env.googleClientId } : null,
  apple: socialConfigured('apple') ? { clientId: env.appleClientId, redirectUri: env.appleRedirectUri } : null,
  otp: { phone: channelAvailable('phone'), email: channelAvailable('email'), minutes: OTP_MINUTES },
} });

export const sendOtp = asyncHandler(async (req, res) => {
  const { channel, target } = req.body;
  const taken = await User.exists(channel === 'email' ? { email: target } : { phone: target });
  if (taken) throw new ApiError(409, channel === 'email' ? 'An account with this email already exists' : 'An account with this mobile number already exists');
  await issueOtp({ channel, target, purpose: 'signup' });
  res.json({ success: true, message: 'Code sent', data: { expiresInSeconds: OTP_MINUTES * 60 } });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { channel, target, code } = req.body;
  await consumeOtp({ channel, target, purpose: 'signup', code });
  res.json({ success: true, data: { proof: signProof({ channel, target, purpose: 'signup' }) } });
});

// ---- Google / Apple ----------------------------------------------------------------------------------

const PORTAL_TO_ROLE = { farmer: 'farmer', seller: 'vendor', customer: 'customer' };

// The provider's own id first; otherwise the same email address (the provider has verified it, so it is the same person).
async function findSocialUser(provider, claims) {
  const field = providerIdField(provider);
  const fields = '+tokenVersion +googleId +appleId';   // tokenVersion goes into the new token; the provider ids are hidden by default
  let user = await User.findOne({ [field]: claims.id }).select(fields);
  if (!user && claims.email && claims.emailVerified) user = await User.findOne({ email: claims.email }).select(fields);
  return user;
}

export const socialLogin = asyncHandler(async (req, res) => {
  const { provider, idToken, portal } = req.body;
  const claims = await verifySocialToken(provider, idToken);
  const user = await findSocialUser(provider, claims);
  // Not signed up yet: tell the page, and hand back the verified name/email so the signup form can start filled in.
  if (!user || user.role === 'admin') {
    throw new ApiError(404, 'No account found for this sign-in. Please sign up first', { code: 'NO_ACCOUNT', provider, email: claims.email, name: claims.name });
  }
  if (!user.isActive) throw new ApiError(403, 'Your account has been blocked. Please contact support');
  if (portal && PORTAL_ROLE[portal] !== user.role) {
    throw new ApiError(403, `This is a ${ROLE_TAB[user.role].toLowerCase()} account. Use the ${ROLE_TAB[user.role]} tab to log in`);
  }
  // First time this provider is used on an existing account: remember it.
  const field = providerIdField(provider);
  const update = {};
  if (!user.get(field)) update[field] = claims.id;
  if (claims.emailVerified && !user.emailVerified) update.emailVerified = true;
  if (Object.keys(update).length) await User.updateOne({ _id: user._id }, { $set: update });
  res.json({ success: true, data: { token: signToken(user), user: user.toSafeObject() } });
});

// New account through Google/Apple. The email comes from the verified token (so no email OTP is needed);
// the mobile number is optional (no OTP), and sellers still give their business details.
export const socialRegister = asyncHandler(async (req, res) => {
  const { provider, idToken, portal } = req.body;
  const phone = req.body.phone || undefined;
  const claims = await verifySocialToken(provider, idToken);
  if (!claims.email) throw new ApiError(400, 'Your account did not share an email address, so we cannot create the account');
  if (await findSocialUser(provider, claims)) throw new ApiError(409, 'An account with this email already exists. Please log in instead');
  if (phone && (await User.exists({ phone }))) throw new ApiError(409, 'An account with this mobile number already exists');
  const role = PORTAL_TO_ROLE[portal];
  const name = (req.body.name || claims.name || claims.email.split('@')[0]).slice(0, 80);
  const data = { name: name.length >= 2 ? name : `${name} user`, email: claims.email, phone, role,
    language: req.body.language, village: req.body.village, district: req.body.district, state: req.body.state,
    [providerIdField(provider)]: claims.id, emailVerified: claims.emailVerified, phoneVerified: false };
  if (role === 'vendor') data.seller = { ...pickSeller(req.body), verification: 'pending' };
  const user = await User.create(data);
  res.status(201).json({ success: true, data: { token: signToken(user), user: user.toSafeObject() } });
});

// ---- Forgot password (OTP) ----------------------------------------------------------------------------

const channelOf = (identifier) => (identifier.includes('@') ? 'email' : 'phone');
const findByIdentifier = (identifier) => User.findOne(identifier.includes('@') ? { email: identifier } : { phone: identifier });

// Always answers the same way, whether or not the account exists, so it cannot be used to find out who is registered.
export const forgotPasswordSend = asyncHandler(async (req, res) => {
  const { identifier } = req.body;
  const channel = channelOf(identifier);
  if (!channelAvailable(channel)) throw new ApiError(503, channel === 'email' ? 'Email OTP is not set up on this server yet. Use your mobile number instead' : 'Mobile OTP is not set up on this server yet');
  const user = await findByIdentifier(identifier).select('role isActive phoneVerified');
  // An unverified mobile number (optional at signup) cannot be used to reset a password.
  if (user && user.role !== 'admin' && user.isActive && (channel === 'email' || user.phoneVerified)) {
    try { await issueOtp({ channel, target: identifier, purpose: 'reset' }); }
    catch (err) { if (!(err instanceof ApiError)) throw err; console.error('reset otp not sent:', err.message); }
  }
  res.json({ success: true, message: 'If an account exists for this number or email, a code has been sent', data: { expiresInSeconds: OTP_MINUTES * 60 } });
});

export const forgotPasswordReset = asyncHandler(async (req, res) => {
  const { identifier, code, newPassword } = req.body;
  const user = await findByIdentifier(identifier).select('+password +tokenVersion');
  if (!user || user.role === 'admin' || !user.isActive) throw new ApiError(400, 'Incorrect or expired code. Please request a new one');
  await consumeOtp({ channel: channelOf(identifier), target: identifier, purpose: 'reset', code });
  user.password = newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;   // signs out every device, including anyone who had the old password
  if (channelOf(identifier) === 'email') user.emailVerified = true; else user.phoneVerified = true;
  await user.save();
  res.json({ success: true, message: 'Password changed. Please log in with your new password' });
});

// Which sign-in tab belongs to which role. Used only to guide people to the right tab; it is not a permission.
const PORTAL_ROLE = { farmer: 'farmer', seller: 'vendor', customer: 'customer' };
const ROLE_TAB = { farmer: 'Farmer', vendor: 'Seller', customer: 'Customer' };

export const login = asyncHandler(async (req, res) => {
  const { identifier, password, portal } = req.body;
  const query = identifier.includes('@') ? { email: identifier } : { phone: identifier };
  const user = await User.findOne(query).select('+password +tokenVersion');
  // Same message for unknown account and wrong password to avoid account enumeration.
  // Admins cannot sign in here at all: they use /auth/admin/login, so the public form never works for them.
  if (!user || user.role === 'admin' || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Incorrect email/mobile or password');
  }
  // Only said after the right password, so it cannot be used to discover which accounts exist.
  if (!user.isActive) throw new ApiError(403, 'Your account has been blocked. Please contact support');
  // Right password, wrong tab: say which tab to use instead of silently logging in.
  if (portal && PORTAL_ROLE[portal] !== user.role) {
    throw new ApiError(403, `This is a ${ROLE_TAB[user.role].toLowerCase()} account. Use the ${ROLE_TAB[user.role]} tab to log in`);
  }
  res.json({ success: true, data: { token: signToken(user), user: user.toSafeObject() } });
});

// Separate, stricter entry for administrators. Only role 'admin' can pass; everyone else gets the generic 401.
export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password +tokenVersion');
  if (!user || user.role !== 'admin' || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Incorrect email or password');
  }
  if (!user.isActive) throw new ApiError(403, 'This admin account has been blocked by the main admin');
  res.json({ success: true, data: { token: signToken(user), user: user.toSafeObject() } });
});

// Seller profile edit. Verification status, role and isActive are never read from the body.
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const oldPhone = user.phone;
  for (const f of ['name', 'phone', 'village', 'district', 'state']) if (req.body[f] !== undefined) user[f] = req.body[f] === '' && f === 'phone' ? undefined : req.body[f];
  if (user.phone !== oldPhone) user.phoneVerified = false;   // a new number has not been proven by OTP
  if (req.body.phone && (await User.exists({ phone: req.body.phone, _id: { $ne: user._id } }))) throw new ApiError(409, 'An account with this mobile number already exists');
  if (user.role === 'vendor') {
    const next = pickSeller(req.body);
    // A changed licence number must be re-checked by an admin.
    if (next.licenceNumber !== undefined && next.licenceNumber !== user.seller?.licenceNumber) user.seller.verification = 'pending';
    Object.assign(user.seller, next);
  }
  await user.save();
  res.json({ success: true, data: { user: user.toSafeObject() } });
});

export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password +tokenVersion');
  if (!(await user.comparePassword(req.body.currentPassword))) throw new ApiError(401, 'Current password is incorrect');
  user.password = req.body.newPassword;
  user.tokenVersion = (user.tokenVersion || 0) + 1;   // signs out every other device
  await user.save();
  res.json({ success: true, data: { token: signToken(user) } });
});

export const me = (req, res) => res.json({ success: true, data: { user: req.user.toSafeObject() } });

// Ends every session for this account: tokens issued earlier carry an older tokenVersion and are rejected.
export const logout = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  res.json({ success: true, message: 'Logged out' });
});

export const updateLanguage = asyncHandler(async (req, res) => {
  req.user.language = req.body.language;
  await req.user.save();
  res.json({ success: true, data: { user: req.user.toSafeObject() } });
});
