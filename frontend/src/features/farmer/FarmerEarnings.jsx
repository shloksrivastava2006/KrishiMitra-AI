import { useState } from 'react';
import PayoutPrompt from './PayoutPrompt.jsx';
import { Download } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../services/api.js';
import { inr } from '../market/format.js';
import { Badge, Empty, ErrorBox, Loading, PageTitle, Stat, downloadFile, fmtDate, useFetch } from '../../components/common/ui.jsx';

// Cash sales are paid to the farmer directly. Online payments are held by the site and sent to the farmer's UPI or bank account; the card above shows that balance.
export default function FarmerEarnings() {
  const { t, lang } = useI18n();
  const { data: d, error, loading } = useFetch('/farmer/earnings');
  const [range, setRange] = useState({ from: '', to: '' }); const [err, setErr] = useState('');
  if (loading) return <Loading />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const s = d.summary;
  const report = async () => {
    setErr('');
    try { await downloadFile('/farmer/reports/sales.csv', { from: range.from || undefined, to: range.to || undefined }, 'sales-report.csv'); }
    catch (e) { setErr(e.response?.data instanceof Blob ? t('seller.reportFailed') : errorMessage(e)); }
  };
  return (
    <div className="space-y-6">
      <PageTitle>{t('seller.nav_earnings')}</PageTitle>
      <PayoutPrompt />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t('farmer.earnTotal')} value={inr(s.totalSales)} hint={t('farmer.earnTotalHint')} />
        <Stat label={t('farmer.earnReceived')} value={inr(s.received)} hint={t('farmer.earnReceivedHint')} />
        <Stat label={t('farmer.earnToCollect')} value={inr(s.toCollect)} hint={t('farmer.earnToCollectHint', { n: s.ordersToCollect })} tone={s.toCollect ? 'warn' : undefined} />
      </div>
      {d.online && (d.online.gross > 0 || d.online.paidOut > 0) && (
        <section className="card space-y-3" aria-label={t('farmer.onlineTitle')}>
          <h2 className="text-lg font-semibold">{t('farmer.onlineTitle')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t('farmer.onlineGross')} value={inr(d.online.gross)} />
            {d.online.commission > 0 && <Stat label={t('farmer.onlineFee')} value={inr(d.online.commission)} />}
            <Stat label={t('farmer.onlinePaidOut')} value={inr(d.online.paidOut)} />
            <Stat label={t('farmer.onlineBalance')} value={inr(d.online.balance)} hint={t('farmer.onlineBalanceHint')} tone={d.online.balance ? 'warn' : undefined} />
          </div>
          <p className="text-xs text-ink/70">{t('farmer.onlineNote')}</p>
        </section>
      )}
      <p className="rounded-lg bg-gold-light/60 p-3 text-xs text-ink/80">{t('farmer.earnNote')}</p>

      <div className="card">
        <h2 className="text-lg font-semibold">{t('seller.salesReport')}</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="text-sm">{t('seller.from')}<input type="date" className="input mt-1" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} /></label>
          <label className="text-sm">{t('seller.to')}<input type="date" className="input mt-1" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} /></label>
          <button type="button" className="btn-outline" onClick={report}><Download className="h-4 w-4" aria-hidden="true" /> {t('seller.downloadCsv')}</button>
        </div>
        <div className="mt-3"><ErrorBox>{err}</ErrorBox></div>
      </div>

      <div className="card overflow-x-auto">
        <h2 className="text-lg font-semibold">{t('seller.transactions')}</h2>
        {d.transactions.length === 0 ? <Empty>{t('seller.noTransactions')}</Empty> : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-ink/60"><tr><th className="py-2 pr-4">#</th><th className="pr-4">{t('seller.date')}</th><th className="pr-4">{t('market.total')}</th><th className="pr-4">{t('market.payment')}</th><th>{t('admin.status')}</th></tr></thead>
            <tbody>
              {d.transactions.map((x) => (
                <tr key={x.id} className="border-t border-earth/10">
                  <td className="py-2 pr-4">{String(x.id).slice(-6).toUpperCase()}</td><td className="pr-4">{fmtDate(x.date, lang)}</td><td className="pr-4">{inr(x.amount)}</td>
                  <td className="pr-4"><Badge kind={x.paymentStatus} label={`${x.method === 'cod' ? t('market.payCod') : t('market.payOnline')}: ${t(`market.ps_${x.paymentStatus}`)}`} /></td>
                  <td><Badge kind={x.status} label={t(`seller.st_${x.status}`)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
