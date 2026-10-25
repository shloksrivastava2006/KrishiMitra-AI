import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import api, { errorMessage } from '../../services/api.js';
import Field from '../../components/common/Field.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useCart } from './CartContext.jsx';
import { inr } from './format.js';
import { openRazorpay } from './razorpay.js';

export default function CheckoutPage() {
  const { t } = useI18n(); const { user } = useAuth(); const cart = useCart(); const navigate = useNavigate(); const { notify } = useToast();
  const [online, setOnline] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const codOnly = cart.items.some((i) => i.codOnly);   // farmers are paid directly, so their goods are cash on delivery only
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { name: user.name, phone: user.phone || '', line1: '', village: user.village || '', district: user.district || '', state: user.state || '', pincode: '', paymentMethod: 'cod' },
  });
  useEffect(() => { api.get('/orders/options').then((r) => setOnline(r.data.data.online)).catch(() => {}); }, []);

  if (user.role === 'admin') return <p className="p-8 text-center">{t('access.deniedText')}</p>;
  if (cart.items.length === 0) return <div className="mx-auto max-w-xl px-4 py-12"><p>{t('market.cartEmpty')}</p><Link to="/marketplace" className="btn-primary mt-4">{t('market.continueShopping')}</Link></div>;

  const verify = async (orderId, response) => {
    await api.post(`/orders/${orderId}/verify-payment`, response);
  };

  const onSubmit = async (v) => {
    setBusy(true); setError('');
    try {
      const { paymentMethod, ...address } = v;
      const res = await api.post('/orders', { items: cart.items.map((i) => ({ productId: i.id, qty: i.qty })), address, paymentMethod });
      const { order, razorpay } = res.data.data;
      cart.clear();   // the order exists now; clearing stops a double order
      if (paymentMethod === 'cod') { notify(t('market.orderPlaced')); navigate('/my-orders', { replace: true }); return; }
      const result = await openRazorpay(razorpay, { name: address.name, contact: address.phone });
      if (result.status === 'paid') {
        try { await verify(order.id, result.response); notify(t('market.paymentDone')); } catch { notify(t('market.verifyFailed'), 'warn'); }
      } else notify(t('market.paymentCancelled'), 'warn');
      navigate('/my-orders', { replace: true });
    } catch (err) { setError(err.message && !err.response ? err.message : errorMessage(err)); } finally { setBusy(false); }
  };

  const f = (id, label, err, input) => <Field id={id} label={label} error={err}>{input}</Field>;
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t('market.checkoutTitle')}</h1>
      <p className="mt-2 font-medium">{t('market.total')}: {inr(cart.total)}</p>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card mt-6 space-y-4">
        <h2 className="text-lg font-semibold">{t('market.deliveryAddress')}</h2>
        {f('c-name', t('market.receiver'), errors.name && t('market.errName'), <input id="c-name" className="input" autoComplete="name" {...register('name', { required: true, minLength: 2 })} />)}
        {f('c-phone', t('market.mobile'), errors.phone && t('market.errMobile'), <input id="c-phone" className="input" inputMode="numeric" autoComplete="tel" {...register('phone', { required: true, pattern: /^[6-9]\d{9}$/ })} />)}
        {f('c-line1', t('market.address'), errors.line1 && t('market.errAddress'), <input id="c-line1" className="input" autoComplete="street-address" {...register('line1', { required: true, minLength: 3 })} />)}
        <div className="grid gap-4 sm:grid-cols-2">
          {f('c-village', t('market.village'), null, <input id="c-village" className="input" {...register('village')} />)}
          {f('c-district', t('market.district'), errors.district && t('market.errDistrict'), <input id="c-district" className="input" {...register('district', { required: true, minLength: 2 })} />)}
          {f('c-state', t('market.state'), errors.state && t('market.errState'), <input id="c-state" className="input" {...register('state', { required: true, minLength: 2 })} />)}
          {f('c-pin', t('market.pincode'), errors.pincode && t('market.errPincode'), <input id="c-pin" className="input" inputMode="numeric" autoComplete="postal-code" {...register('pincode', { required: true, pattern: /^[1-9]\d{5}$/ })} />)}
        </div>
        <fieldset className="space-y-2">
          <legend className="text-lg font-semibold">{t('market.payment')}</legend>
          <label className="flex items-start gap-2 text-sm"><input type="radio" value="cod" className="mt-1 accent-forest" {...register('paymentMethod')} /><span><strong>{t('market.payCod')}</strong><br /><span className="text-ink/70">{t('market.codNote')}</span></span></label>
          <label className={`flex items-start gap-2 text-sm ${online && !codOnly ? '' : 'opacity-50'}`}><input type="radio" value="online" disabled={!online || codOnly} className="mt-1 accent-forest" {...register('paymentMethod')} /><span><strong>{t('market.payOnline')}</strong><br /><span className="text-ink/70">{codOnly ? t('market.farmerCodOnly') : online ? t('market.onlineNote') : t('market.onlineOff')}</span></span></label>
        </fieldset>
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? t('market.placing') : t('market.placeOrder')}</button>
      </form>
    </div>
  );
}
