import { badgeClass, inr } from '../market/format.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useApi } from './useApi.js';

export default function AdminOrders() {
  const { t } = useI18n();
  const { data, error } = useApi('/admin/orders');
  if (error) return <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>;
  if (!data) return <p className="text-ink/60">...</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-earth/15 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-leaf-light text-forest-dark"><tr>{['#', t('market.buyer'), t('market.seller'), t('market.total'), t('admin.status'), t('market.payment'), 'Razorpay ID'].map((c) => <th key={c} className="px-4 py-2 font-semibold">{c}</th>)}</tr></thead>
        <tbody>
          {data.map((o) => (
            <tr key={o.id} className="border-t border-earth/10">
              <td className="px-4 py-2">{String(o.id).slice(-6).toUpperCase()}</td><td className="px-4 py-2">{o.buyer}</td><td className="px-4 py-2">{o.seller}</td><td className="px-4 py-2">{inr(o.total)}</td>
              <td className="px-4 py-2">{t(`market.st_${o.status}`)}</td>
              <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs ${badgeClass(o.paymentStatus === 'refund_due' ? 'bad' : o.paymentStatus === 'paid' ? 'ok' : 'warn')}`}>{o.paymentMethod === 'cod' ? t('market.payCod') : t('market.payOnline')}: {t(`market.ps_${o.paymentStatus}`)}</span></td>
              <td className="px-4 py-2 text-xs">{o.razorpayPaymentId || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
