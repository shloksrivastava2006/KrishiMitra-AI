import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { rupeesToPaise, buildLines, canMove, buyerCanCancel, sellerCanMove } from '../../services/marketRules.js';
import { verifyPaymentSignature, verifyWebhookSignature, createRazorpayOrder } from '../../services/paymentService.js';

const prod = (o) => ({ _id: o.id, seller: o.seller || 's1', name: o.name || 'Wheat seed', unit: 'kg', pricePaise: o.price || 5000, stock: o.stock ?? 10, status: o.status || 'approved' });
const map = (...ps) => new Map(ps.map((p) => [String(p._id), p]));
const status = (fn) => (e) => e.status === fn;

test('rupees become exact integer paise', () => {
  assert.equal(rupeesToPaise('199.99'), 19999);
  assert.equal(rupeesToPaise(19.99), 1999);          // 19.99 * 100 is 1998.9999999999998 in floating point
  assert.equal(rupeesToPaise('50'), 5000);
  for (const bad of ['12.345', '-5', '0', '0.50', '1e3', '', 'abc', '9999999', null]) assert.throws(() => rupeesToPaise(bad), status(422), String(bad));
});

test('order lines are priced by the server and totalled in paise', () => {
  const a = prod({ id: 'a', price: 1999 }); const b = prod({ id: 'b', price: 250 });
  const r = buildLines([{ productId: 'a', qty: 3 }, { productId: 'b', qty: 2 }, { productId: 'a', qty: 1 }], map(a, b), 'buyer');
  assert.equal(r.lines.find((l) => l.name && l.unitPaise === 1999).qty, 4);   // duplicates merged
  assert.equal(r.totalPaise, 4 * 1999 + 2 * 250); assert.equal(r.sellerId, 's1');
});

test('order rules: stock, availability, own product, one seller, bad quantity', () => {
  const a = prod({ id: 'a', stock: 2 });
  assert.throws(() => buildLines([{ productId: 'a', qty: 3 }], map(a), 'buyer'), status(409));
  assert.throws(() => buildLines([{ productId: 'a', qty: 1 }], map(prod({ id: 'a', status: 'pending' })), 'buyer'), status(409));
  assert.throws(() => buildLines([{ productId: 'zzz', qty: 1 }], map(a), 'buyer'), status(409));
  assert.throws(() => buildLines([{ productId: 'a', qty: 1 }], map(a), 's1'), status(403));
  assert.throws(() => buildLines([{ productId: 'a', qty: 1 }, { productId: 'b', qty: 1 }], map(a, prod({ id: 'b', seller: 's2' })), 'buyer'), status(422));
  for (const q of [0, -1, 1.5, '2x', 1001]) assert.throws(() => buildLines([{ productId: 'a', qty: q }], map(a), 'buyer'), status(422), String(q));
});

test('status moves: payment gates online orders, terminal states stay terminal', () => {
  assert.ok(canMove('placed', 'confirmed') && canMove('confirmed', 'shipped') && canMove('shipped', 'delivered'));
  assert.equal(canMove('delivered', 'cancelled'), false); assert.equal(canMove('cancelled', 'placed'), false); assert.equal(canMove('shipped', 'cancelled'), false);
  assert.equal(sellerCanMove('awaiting_payment', 'confirmed'), false);   // unpaid online order cannot be confirmed by hand
  assert.equal(sellerCanMove('awaiting_payment', 'placed'), false);
  assert.ok(sellerCanMove('placed', 'confirmed')); assert.equal(sellerCanMove('placed', 'delivered'), false);
  assert.ok(buyerCanCancel('placed') && buyerCanCancel('awaiting_payment')); assert.equal(buyerCanCancel('confirmed'), false);
});

test("payment signature matches Razorpay's documented example", () => {
  // Values published in Razorpay's own docs for Utils.verifyPaymentSignature.
  const ok = { orderId: 'order_IEIaMR65cu6nz3', paymentId: 'pay_IH4NVgf4Dreq1l', secret: 'EnLs21M47BllR3X8PSFtjtbd', signature: '0d4e745a1838664ad6c9c9902212a32d627d68e917290b0ad5f08ff4561bc50f' };
  assert.equal(verifyPaymentSignature(ok), true);
  assert.equal(verifyPaymentSignature({ ...ok, paymentId: 'pay_other' }), false);
  assert.equal(verifyPaymentSignature({ ...ok, signature: ok.signature.slice(0, -1) + '0' }), false);
  assert.equal(verifyPaymentSignature({ ...ok, signature: 'short' }), false);
  assert.equal(verifyPaymentSignature({ ...ok, signature: undefined }), false);
  assert.equal(verifyPaymentSignature({ ...ok, secret: '' }), false);
});

test('webhook signature is checked on the raw bytes', () => {
  const secret = 'whsec_test'; const raw = Buffer.from('{"event":"payment.captured","payload":{}}');
  const sig = crypto.createHmac('sha256', secret).update(raw).digest('hex');
  assert.equal(verifyWebhookSignature(raw, sig, secret), true);
  assert.equal(verifyWebhookSignature(Buffer.from('{"event":"payment.captured","payload":{} }'), sig, secret), false); // one extra space
  assert.equal(verifyWebhookSignature(raw, sig, 'other'), false);
  assert.equal(verifyWebhookSignature(raw, undefined, secret), false);
  assert.equal(verifyWebhookSignature(raw.toString(), sig, secret), false);   // a parsed or re-serialised body is refused
  assert.equal(verifyWebhookSignature(raw, sig, ''), false);
});

test('razorpay order: needs keys, sends paise with basic auth, rejects mismatched amount', async () => {
  const real = globalThis.fetch;
  env.razorpayKeyId = ''; env.razorpayKeySecret = '';
  await assert.rejects(createRazorpayOrder({ amountPaise: 5000, receipt: 'r1' }), status(503));
  env.razorpayKeyId = 'rzp_test_x'; env.razorpayKeySecret = 'sec';
  try {
    let seen;
    globalThis.fetch = async (url, init) => { seen = { url, init }; return { ok: true, json: async () => ({ id: 'order_1', amount: 5000, currency: 'INR' }) }; };
    assert.equal((await createRazorpayOrder({ amountPaise: 5000, receipt: 'r1' })).id, 'order_1');
    assert.equal(JSON.parse(seen.init.body).amount, 5000); assert.equal(JSON.parse(seen.init.body).currency, 'INR');
    assert.equal(seen.init.headers.Authorization, `Basic ${Buffer.from('rzp_test_x:sec').toString('base64')}`);
    globalThis.fetch = async () => ({ ok: true, json: async () => ({ id: 'order_1', amount: 4999, currency: 'INR' }) });
    await assert.rejects(createRazorpayOrder({ amountPaise: 5000, receipt: 'r1' }), status(502));
    globalThis.fetch = async () => ({ ok: false, status: 400 });
    await assert.rejects(createRazorpayOrder({ amountPaise: 5000, receipt: 'r1' }), status(502));
    globalThis.fetch = async () => { throw new Error('offline'); };
    await assert.rejects(createRazorpayOrder({ amountPaise: 5000, receipt: 'r1' }), status(502));
  } finally { globalThis.fetch = real; env.razorpayKeyId = ''; env.razorpayKeySecret = ''; }
});

test('discount: buyers pay the sale price, rounded to whole paise, never below Re 1', async () => {
  const { salePaiseOf, unitPaiseOf } = await import('../../services/marketRules.js');
  assert.equal(salePaiseOf(60000, 10), 54000);
  assert.equal(salePaiseOf(9999, 33), 6699);          // 6699.33 rounds to 6699
  assert.equal(salePaiseOf(100, 90), 100);            // floor of Re 1
  assert.equal(salePaiseOf(5000, 0), 5000);
  assert.equal(unitPaiseOf({ pricePaise: 5000 }), 5000);                 // old products without salePaise
  assert.equal(unitPaiseOf({ pricePaise: 5000, salePaise: 4500 }), 4500);
});

test('orders use the sale price and respect the seller\'s minimum order quantity', () => {
  const p = { ...prod({ id: 'a', price: 10000 }), salePaise: 9000, minOrderQty: 5, stock: 50 };
  const r = buildLines([{ productId: 'a', qty: 5 }], map(p), 'buyer');
  assert.equal(r.lines[0].unitPaise, 9000); assert.equal(r.totalPaise, 45000);
  assert.throws(() => buildLines([{ productId: 'a', qty: 4 }], map(p), 'buyer'), status(422));
});

test('commission is a whole-paise share and is zero until a rate is configured', async () => {
  const { commissionPaise, commissionPercent } = await import('../../services/marketRules.js');
  const old = process.env.PLATFORM_COMMISSION_PERCENT;
  try {
    delete process.env.PLATFORM_COMMISSION_PERCENT; assert.equal(commissionPercent(), 0); assert.equal(commissionPaise(100000), 0);
    process.env.PLATFORM_COMMISSION_PERCENT = '2.5'; assert.equal(commissionPaise(100000), 2500);
    process.env.PLATFORM_COMMISSION_PERCENT = '99'; assert.equal(commissionPercent(), 0);      // out of range is ignored
    process.env.PLATFORM_COMMISSION_PERCENT = 'abc'; assert.equal(commissionPercent(), 0);
  } finally { if (old === undefined) delete process.env.PLATFORM_COMMISSION_PERCENT; else process.env.PLATFORM_COMMISSION_PERCENT = old; }
});

test('uploaded files are identified by their bytes, not their name', async () => {
  const { sniffImage, IMAGE_URL } = await import('../../services/imageService.js');
  assert.equal(sniffImage(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)])), 'jpg');
  assert.equal(sniffImage(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20)])), 'png');
  assert.equal(sniffImage(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(8)])), 'webp');
  assert.equal(sniffImage(Buffer.from('<script>alert(1)</script>')), null);
  assert.equal(sniffImage(Buffer.from('GIF89a......................')), null);
  assert.ok(IMAGE_URL.test('/uploads/0123456789abcdef0123456789abcdef.png'));
  for (const bad of ['https://evil.example/a.png', '/uploads/../.env', '/uploads/abc.svg', '/uploads/0123456789abcdef0123456789abcdef.html']) assert.ok(!IMAGE_URL.test(bad), bad);
});
