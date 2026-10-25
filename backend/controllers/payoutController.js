import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const clean = (v) => (v === undefined || v === null ? '' : String(v).trim());
const body = (u) => ({ payout: u.payoutView(), user: u.toSafeObject() });

export const getPayout = asyncHandler(async (req, res) => {
  const u = await User.findById(req.user._id);
  res.json({ success: true, data: body(u) });
});

// The form sends everything it shows. A blank UPI box clears the UPI ID; a blank account number keeps the saved one;
// blank holder name and IFSC with no new number removes the bank account.
export const savePayout = asyncHandler(async (req, res) => {
  const u = await User.findById(req.user._id).select('+payout.accountNumber');
  const upiId = clean(req.body.upiId);
  const accountName = clean(req.body.accountName); const ifsc = clean(req.body.ifsc).toUpperCase(); const newNumber = clean(req.body.accountNumber);
  const savedNumber = u.get('payout.accountNumber');
  const wantsBank = Boolean(accountName || ifsc || newNumber);
  if (wantsBank) {
    if (!accountName || !ifsc || !(newNumber || savedNumber)) throw new ApiError(422, 'Fill the account holder name, account number and IFSC together, or leave all three empty');
  }
  if (!upiId && !wantsBank) throw new ApiError(422, 'Add a UPI ID or a bank account so you can receive money');
  u.set('payout.upiId', upiId || undefined);
  if (wantsBank) {
    u.set('payout.accountName', accountName); u.set('payout.ifsc', ifsc);
    if (newNumber) u.set('payout.accountNumber', newNumber);
  } else {
    for (const f of ['accountName', 'accountNumber', 'accountLast4', 'ifsc']) u.set(`payout.${f}`, undefined);
  }
  u.set('payout.updatedAt', new Date());
  await u.save();
  res.json({ success: true, data: body(u) });
});

export const removePayout = asyncHandler(async (req, res) => {
  const u = await User.findById(req.user._id);
  u.set('payout', undefined);
  await u.save();
  res.json({ success: true, data: body(u) });
});
