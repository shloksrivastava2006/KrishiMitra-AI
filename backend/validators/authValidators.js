import { body } from 'express-validator';

export const SUPPORTED_LANGUAGES = ['en', 'hi'];
const phonePattern = /^[6-9]\d{9}$/;
// express-validator's default normalizeEmail() deletes dots and "+tags" from Gmail addresses, so the saved address
// would differ from what the person types at login. Keep the address as typed (lower-case only).
const EMAIL_OPTS = { gmail_remove_dots: false, gmail_remove_subaddress: false, gmail_convert_googlemaildotcom: false, outlookdotcom_remove_subaddress: false, yahoo_remove_subaddress: false, icloud_remove_subaddress: false };
const proofRules = [
  // Email OTP is compulsory at signup; the mobile number is optional and needs no OTP. The proof comes from POST /auth/otp/verify.
  body('emailProof').isString().notEmpty().withMessage('Please verify your email with the OTP'),
];

const accountRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter your full name'),
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(EMAIL_OPTS),
  body('phone').optional({ checkFalsy: true }).matches(phonePattern).withMessage('Enter a valid 10-digit Indian mobile number'),
  ...proofRules,
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
  body('language').optional().isIn(SUPPORTED_LANGUAGES).withMessage('Unsupported language'),
  body('consent').equals('true').withMessage('Please accept the terms and privacy policy').toBoolean(false),
];

// "role" is not read at all: the controller forces the role. Reject attempts loudly so they are visible in tests and logs.
export const registerRules = [
  ...accountRules,
  body('role').custom((value) => value === undefined || value === 'farmer').withMessage('Role cannot be chosen at signup'),
];

// Customer signup: a buyer account (shop and rent equipment, no farm tools, no selling). Role is forced to 'customer' by the controller.
export const customerRegisterRules = [
  ...accountRules,
  body('role').custom((value) => value === undefined || value === 'customer').withMessage('Role cannot be chosen at signup'),
];

// Seller signup: same account fields as a farmer plus business details. Role is forced to 'vendor' by the controller.
export const sellerRegisterRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter your full name'),
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(EMAIL_OPTS),
  body('phone').optional({ checkFalsy: true }).matches(phonePattern).withMessage('Enter a valid 10-digit Indian mobile number'),
  ...proofRules,
  body('password').isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters'),
  body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
  body('language').optional().isIn(SUPPORTED_LANGUAGES).withMessage('Unsupported language'),
  body('role').custom((value) => value === undefined || value === 'vendor').withMessage('Role cannot be chosen at signup'),
  body('consent').equals('true').withMessage('Please accept the terms and privacy policy').toBoolean(false),
  ...sellerProfileRules(false),
];

// Reused for signup (all business fields required) and profile edit (all optional).
export function sellerProfileRules(optional) {
  const f = (name) => (optional ? body(name).optional({ checkFalsy: true }) : body(name));
  return [
    f('shopName').trim().isLength({ min: 2, max: 100 }).withMessage('Enter your shop or business name'),
    f('address').trim().isLength({ min: 5, max: 300 }).withMessage('Enter your business address'),
    f('village').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
    f('district').trim().isLength({ min: 2, max: 80 }).withMessage('Enter your district'),
    f('state').trim().isLength({ min: 2, max: 80 }).withMessage('Enter your state'),
    f('pincode').matches(/^[1-9]\d{5}$/).withMessage('Enter a valid 6-digit PIN code'),
    body('licenceNumber').optional({ checkFalsy: true }).trim().isLength({ max: 60 }).withMessage('Licence number is too long'),
    body('upiId').optional({ checkFalsy: true }).trim().matches(/^[\w.\-]{2,40}@[a-zA-Z]{2,30}$/).withMessage('Enter a valid UPI ID, e.g. name@bank'),
    body('bankAccountName').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
    body('bankAccountNumber').optional({ checkFalsy: true }).trim().matches(/^\d{9,18}$/).withMessage('Bank account number must be 9 to 18 digits'),
    body('bankIfsc').optional({ checkFalsy: true }).trim().matches(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/).withMessage('Enter a valid IFSC code'),
  ];
}

export const profileRules = [
  body('name').optional().trim().isLength({ min: 2, max: 80 }).withMessage('Enter your full name'),
  body('phone').optional({ checkFalsy: true }).matches(phonePattern).withMessage('Enter a valid 10-digit Indian mobile number'),
  ...sellerProfileRules(true),
];

export const passwordRules = [
  body('currentPassword').notEmpty().withMessage('Enter your current password'),
  body('newPassword').isLength({ min: 8, max: 128 }).withMessage('New password must be at least 8 characters'),
  body('confirmPassword').custom((v, { req }) => v === req.body.newPassword).withMessage('Passwords do not match'),
];

const identifierRule = () => body('identifier').trim().custom((v) => (v.includes('@') ? /^\S+@\S+\.\S+$/.test(v) : phonePattern.test(v)))
  .withMessage('Enter a valid email or 10-digit mobile number').customSanitizer((v) => (v.includes('@') ? v.toLowerCase() : v));

export const loginRules = [
  identifierRule(),
  body('password').notEmpty().withMessage('Enter your password'),
  // Which sign-in tab was used. Checked after the password so it only guides people; it is not a permission.
  body('portal').optional().isIn(['farmer', 'seller', 'customer']).withMessage('Unknown login type'),
];

// The admin form has no portal field: it is a different endpoint (POST /auth/admin/login).
export const adminLoginRules = [
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Enter your password'),
];

export const languageRules = [body('language').isIn(SUPPORTED_LANGUAGES).withMessage('Unsupported language')];

// Used only by the admin-protected endpoint that creates another administrator.
export const adminCreateRules = [
  body('name').trim().isLength({ min: 2, max: 80 }).withMessage('Enter a full name'),
  body('email').isEmail().withMessage('Enter a valid email address').normalizeEmail(),
  body('password').isLength({ min: 12, max: 128 }).withMessage('Admin passwords need at least 12 characters'),
];

// ---- OTP, social sign-in and password reset ----------------------------------------------------------

const targetRule = body('target').trim().custom((v, { req }) => (req.body.channel === 'email' ? /^\S+@\S+\.\S+$/.test(v) : phonePattern.test(v)))
  .withMessage('Enter a valid mobile number or email address').customSanitizer((v, { req }) => (req.body.channel === 'email' ? v.toLowerCase() : v));

// Signup OTP: ask for a code, then hand it back to get a proof that is sent with the signup form.
export const otpSendRules = [body('channel').isIn(['phone', 'email']).withMessage('Unknown OTP channel'), targetRule];
export const otpVerifyRules = [
  ...otpSendRules,
  body('code').trim().matches(/^\d{6}$/).withMessage('Enter the 6-digit code'),
];

const providerRules = [
  body('provider').isIn(['google', 'apple']).withMessage('Unknown sign-in provider'),
  body('idToken').isString().isLength({ min: 20, max: 8000 }).withMessage('Sign-in failed. Please try again'),
];
const portalRule = (required) => (required ? body('portal') : body('portal').optional()).isIn(['farmer', 'seller', 'customer']).withMessage('Unknown account type');

export const socialLoginRules = [...providerRules, portalRule(false)];

// Wraps validator chains so they run only for some requests (seller details are needed only when the account type is seller).
const onlyIf = (test, chains) => chains.map((chain) => (req, res, next) => (test(req) ? chain.run(req).then(() => next(), next) : next()));

export const socialRegisterRules = [
  ...providerRules,
  portalRule(true),
  body('name').optional({ checkFalsy: true }).trim().isLength({ min: 2, max: 80 }).withMessage('Enter your full name'),
  body('phone').optional({ checkFalsy: true }).matches(phonePattern).withMessage('Enter a valid 10-digit Indian mobile number'),
  body('language').optional().isIn(SUPPORTED_LANGUAGES).withMessage('Unsupported language'),
  body('consent').equals('true').withMessage('Please accept the terms and privacy policy').toBoolean(false),
  ...onlyIf((req) => req.body.portal === 'seller', sellerProfileRules(false)),
];

export const forgotSendRules = [identifierRule()];
export const forgotResetRules = [
  identifierRule(),
  body('code').trim().matches(/^\d{6}$/).withMessage('Enter the 6-digit code'),
  body('newPassword').isLength({ min: 8, max: 128 }).withMessage('New password must be at least 8 characters'),
  body('confirmPassword').custom((v, { req }) => v === req.body.newPassword).withMessage('Passwords do not match'),
];
