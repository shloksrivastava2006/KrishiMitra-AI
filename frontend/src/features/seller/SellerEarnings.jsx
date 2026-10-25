import { useState } from 'react';
import { Download } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { errorMessage } from '../../services/api.js';
import { inr } from '../market/format.js';
import { Badge, Empty, ErrorBox, Loading, PageTitle, Stat, downloadFile, fmtDate, useFetch } from '../../components/common/ui.jsx';

export default function SellerEarnings() {
  const { t, lang } = useI18n();
  const { data: d, error, loading } = useFetch('/seller/earnings');
  const [range, setRange] = useState({ from: '', to: '' }); const [err, setErr] = useState('');
  if (loading) return <Loading />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const s = d.summary;
  const report = async () => { setErr(''); try { await downloadFile('/seller/reports/sales.csv', { from: range.from || undefined, to: range.to || undefined }, 'sales-report.csv'); } catch (e) { setErr(e.response?.data instanceof Blob ? t('seller.reportFailed') : errorMessage(e)); } };
  return (
    <div className="space-y-6">
      <PageTitle>{t('seller.nav_earnings')}</PageTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Stat label={t('seller.totalSales')} value={inr(s.totalSales)} hint={t('seller.totalSalesHint')} />
        <Stat label={t('seller.grossRevenue')} value={inr(s.gross)} hint={t('seller.grossHint')} />
        <Stat label={t('seller.commission')} value={inr(s.fee)} hint={t('seller.commissionHint', { n: d.commissionPercent })} />
        <Stat label={t('seller.refunds')} value={inr(s.refund)} hint={t('seller.refundsHint')} />
        <Stat label={t('seller.netEarnings')} value={inr(s.net)} />
        <Stat label={t('seller.pendingPayout')} value={inr(s.pendingPayout)} hint={t('seller.paidOutHint', { amount: inr(s.paidOut) })} />
      </div>
      <p className="rounded-lg bg-gold-light/60 p-3 text-xs text-ink/80">{t('seller.payoutNote')}</p>

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

      <div className="card overflow-x-auto">
        <h2 className="text-lg font-semibold">{t('seller.payoutHistory')}</h2>
        {d.payouts.length === 0 ? <Empty>{t('seller.noPayouts')}</Empty> : (
          <table className="mt-3 w-full text-left text-sm">
            <thead className="text-ink/60"><tr><th className="py-2 pr-4">{t('seller.date')}</th><th className="pr-4">{t('seller.amount')}</th><th>{t('seller.reference')}</th></tr></thead>
            <tbody>{d.payouts.map((p) => <tr key={p.id} className="border-t border-earth/10"><td className="py-2 pr-4">{fmtDate(p.date, lang)}</td><td className="pr-4">{inr(p.amount)}</td><td>{p.reference}</td></tr>)}</tbody>
          </table>
        )}
      </div>
    </div>
  );
}
