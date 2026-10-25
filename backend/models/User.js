import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Admin is intentionally NOT in PUBLIC_ROLES; admins are created via the seed script only.
export const PUBLIC_ROLES = ['farmer', 'vendor', 'customer'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    // Accounts created with Google or Apple have no password until they use "Forgot password" to set one.
    password: { type: String, required() { return !this.googleId && !this.appleId; }, minlength: 8, select: false },
    googleId: { type: String, unique: true, sparse: true, select: false },
    appleId: { type: String, unique: true, sparse: true, select: false },
    emailVerified: { type: Boolean, default: false },   // proven by an email OTP, Google or Apple
    phoneVerified: { type: Boolean, default: false },   // proven by a mobile OTP
    role: { type: String, enum: [...PUBLIC_ROLES, 'admin'], default: 'farmer' },
    village: String,
    district: String,
    state: String,
    avatarUrl: String,
    language: { type: String, default: 'en', maxlength: 8 },
    tokenVersion: { type: Number, default: 0, select: false },
    isActive: { type: Boolean, default: true },
    // Exactly one account can be the main (permanent) admin. It cannot be blocked or deleted, and it is the only one that can add, block or remove other admins.
    isMainAdmin: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },   // which admin added this admin
    // Where a farmer wants money sent (online equipment rent, payouts). Vendors keep theirs inside `seller`.
    // Only the last 4 digits of the account number ever leave the server, except to an admin who asks for the full details to make a transfer.
    payout: {
      upiId: { type: String, trim: true, maxlength: 80 },
      accountName: { type: String, trim: true, maxlength: 80 },
      accountNumber: { type: String, trim: true, maxlength: 20, select: false },
      accountLast4: { type: String, maxlength: 4 },
      ifsc: { type: String, trim: true, uppercase: true, maxlength: 11 },
      updatedAt: Date,
    },
    // Only used when role === 'vendor'. Payout details are never returned by toSafeObject().
    seller: {
      shopName: { type: String, trim: true, maxlength: 100 },
      address: { type: String, trim: true, maxlength: 300 },
      pincode: { type: String, trim: true, match: /^[1-9]\d{5}$/ },
      licenceNumber: { type: String, trim: true, maxlength: 60 },
      upiId: { type: String, trim: true, maxlength: 80 },
      bankAccountName: { type: String, trim: true, maxlength: 80 },
      bankAccountNumber: { type: String, trim: true, maxlength: 20, select: false },
      bankAccountLast4: { type: String, maxlength: 4 },   // the only part of the account number ever sent back to a browser
      bankIfsc: { type: String, trim: true, uppercase: true, maxlength: 11 },
      verification: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
      verificationNote: { type: String, maxlength: 300 },
    },
  },
  { timestamps: true }
);

// The database itself refuses a second main admin.
userSchema.index({ isMainAdmin: 1 }, { unique: true, partialFilterExpression: { isMainAdmin: true } });

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Keep the last 4 digits next to the number so the profile can say "ending 9012" without ever loading the full number.
userSchema.pre('save', function maskAccount(next) {
  if (this.seller && this.isModified('seller.bankAccountNumber') && this.seller.bankAccountNumber) this.seller.bankAccountLast4 = String(this.seller.bankAccountNumber).slice(-4);
  next();
});

userSchema.pre('save', function maskPayout(next) {
  if (this.isModified('payout.accountNumber') && this.get('payout.accountNumber')) this.set('payout.accountLast4', String(this.get('payout.accountNumber')).slice(-4));
  next();
});

userSchema.methods.comparePassword = function comparePassword(plain) {
  if (!this.password) return false;   // social-only account: no password to match
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  const { _id, name, email, phone, role, village, district, state, avatarUrl, language, emailVerified, phoneVerified } = this;
  const out = { id: _id, name, email, phone, role, village, district, state, avatarUrl, language, emailVerified: Boolean(emailVerified), phoneVerified: Boolean(phoneVerified) };
  if (role === 'vendor') out.seller = this.sellerView();
  if (role === 'farmer') out.payout = this.payoutView();
  if (role === 'admin') out.isMainAdmin = Boolean(this.isMainAdmin);
  return out;
};

// A farmer's saved payout details with the account number removed: just "ending 1234".
userSchema.methods.payoutView = function payoutView() {
  const { accountNumber, ...rest } = this.toObject().payout || {};
  return { upiId: rest.upiId, accountName: rest.accountName, accountLast4: rest.accountLast4, ifsc: rest.ifsc, updatedAt: rest.updatedAt, hasBank: Boolean(rest.accountLast4), hasAny: Boolean(rest.upiId || rest.accountLast4) };
};

// Bank account number is masked: only the last 4 digits ever leave the server.
userSchema.methods.sellerView = function sellerView() {
  const s = this.seller?.toObject ? this.seller.toObject() : { ...(this.seller || {}) };
  delete s.bankAccountNumber;
  return s;
};

export const User = mongoose.model('User', userSchema);
