import api, { errorMessage } from '../../services/api.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useState } from 'react';
import OrderCard from './OrderCard.jsx';
import ShippingForm from './ShippingForm.jsx';
import { useOrders } from './useOrders.js';

const NEXT_ACTION = { placed: ['confirmed', 'markConfirmed'], confirmed: ['shipped', 'markShipped'], shipped: ['delivered', 'markDelivered'] };

export default function MySalesPage() {
  const { t } = useI18n();
  const { orders, error, setError, load } = useOrders('/orders/selling');
  const [ship, setShip] = useState(null);   // { id, mode: 'ship' | 'track' }
  const move = async (o, status) => {
    if (status === 'cancelled' && !window.confirm(t('market.confirmCancel'))) return;
    try { await api.patch(`/orders/${o.id}/status`, { status }); load(); } catch (e) { setError(errorMessage(e)); }
  };
  // Throws on failure so the form can show the message; closes itself on success.
  const sendShipping = (o, mode) => async (values) => {
    if (mode === 'ship') await api.patch(`/orders/${o.id}/status`, { status: 'shipped', ...values });
    else await api.patch(`/orders/${o.id}/tracking`, values);
    setShip(null); load();
  };
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t('market.mySales')}</h1>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {orders && orders.length === 0 && <p className="mt-6 text-ink/70">{t('market.noSales')}</p>}
      <ul className="mt-6 space-y-3">
        {(orders || []).map((o) => {
          const next = NEXT_ACTION[o.status];
          return (
            <OrderCard key={o.id} o={o} seller>
              {next && <button type="button" className="btn-primary px-3 py-1.5" onClick={() => (next[0] === 'shipped' ? setShip({ id: o.id, mode: 'ship' }) : move(o, next[0]))}>{t(`market.${next[1]}`)}</button>}
              {o.status === 'shipped' && <button type="button" className="btn-outline px-3 py-1.5" onClick={() => setShip({ id: o.id, mode: 'track' })}>{t('market.updateTracking')}</button>}
              {['placed', 'confirmed'].includes(o.status) && <button type="button" className="btn-outline px-3 py-1.5" onClick={() => move(o, 'cancelled')}>{t('market.cancelOrder')}</button>}
              {ship?.id === o.id && <ShippingForm initial={o.shipping} submitLabel={ship.mode === 'ship' ? t('market.markShipped') : t('market.saveTracking')} onSubmit={sendShipping(o, ship.mode)} onCancel={() => setShip(null)} />}
            </OrderCard>
          );
        })}
      </ul>
    </div>
  );
}
