import api, { errorMessage } from '../../services/api.js';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { openRazorpay } from './razorpay.js';
import OrderCard from './OrderCard.jsx';
import { useOrders } from './useOrders.js';

export default function MyOrdersPage() {
  const { t } = useI18n(); const { user } = useAuth(); const { notify } = useToast();
  const { orders, error, setError, load } = useOrders('/orders/mine');

  const payNow = async (o) => {
    try {
      const { data } = await api.get(`/orders/${o.id}/pay`);
      const r = await openRazorpay(data.data.razorpay, { name: user.name, contact: user.phone });
      if (r.status === 'paid') { try { await api.post(`/orders/${o.id}/verify-payment`, r.response); notify(t('market.paymentDone')); } catch { notify(t('market.verifyFailed'), 'warn'); } }
      load();
    } catch (e) { setError(errorMessage(e)); load(); }
  };
  const cancel = async (o) => {
    if (!window.confirm(t('market.confirmCancel'))) return;
    try { await api.post(`/orders/${o.id}/cancel`); load(); } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t('market.myOrders')}</h1>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {orders && orders.length === 0 && <p className="mt-6 text-ink/70">{t('market.noOrders')}</p>}
      <ul className="mt-6 space-y-3">
        {(orders || []).map((o) => (
          <OrderCard key={o.id} o={o}>
            {o.status === 'awaiting_payment' && <button type="button" className="btn-primary px-3 py-1.5" onClick={() => payNow(o)}>{t('market.payNow')}</button>}
            {['awaiting_payment', 'placed'].includes(o.status) && <button type="button" className="btn-outline px-3 py-1.5" onClick={() => cancel(o)}>{t('market.cancelOrder')}</button>}
          </OrderCard>
        ))}
      </ul>
    </div>
  );
}
