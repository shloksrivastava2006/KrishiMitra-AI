import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { inr } from '../market/format.js';
import { Empty, ErrorBox, Loading, PageTitle, Stat, useFetch } from '../../components/common/ui.jsx';

// base is '/seller' for sellers and '/farmer' for farmers; each is checked for its own role on the server.
export default function SellerAnalytics({ base = '/seller' }) {
  const { t } = useI18n();
  const { data: d, error, loading } = useFetch(`${base}/analytics`);
  const [range, setRange] = useState('daily');
  if (loading) return <Loading />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const series = d[range];
  return (
    <div className="space-y-6">
      <PageTitle>{t('seller.nav_analytics')}</PageTitle>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label={t('seller.totalOrders')} value={d.totals.orders} />
        <Stat label={t('seller.revenue')} value={inr(d.totals.revenue)} />
        <Stat label={t('seller.lowStock')} value={d.lowStock.length} tone={d.lowStock.length ? 'warn' : undefined} />
      </div>
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t('seller.revenueChart')}</h2>
          <div className="flex gap-2">{['daily', 'weekly', 'monthly'].map((r) => <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)} className={`rounded-full px-3 py-1 text-sm ${range === r ? 'bg-forest text-white' : 'bg-leaf-light text-forest'}`}>{t(`seller.${r}`)}</button>)}</div>
        </div>
        {series.length === 0 ? <Empty>{t('seller.noSalesYet')}</Empty> : (
          <div className="mt-4 h-72" role="img" aria-label={t('seller.revenueChart')}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series}><CartesianGrid strokeDasharray="3 3" stroke="#0001" /><XAxis dataKey="label" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} width={60} />
                <Tooltip formatter={(v, n) => (n === 'revenue' ? inr(v) : v)} /><Line type="monotone" dataKey="revenue" stroke="#1f6b3a" strokeWidth={2} dot={false} /></LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold">{t('seller.topProducts')}</h2>
          {d.topProducts.length === 0 ? <Empty>{t('seller.noSalesYet')}</Empty> : (
            <div className="mt-4 h-64" role="img" aria-label={t('seller.topProducts')}>
              <ResponsiveContainer width="100%" height="100%"><BarChart data={d.topProducts} layout="vertical" margin={{ left: 10 }}><CartesianGrid strokeDasharray="3 3" stroke="#0001" /><XAxis type="number" tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="qty" fill="#1f6b3a" /></BarChart></ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="card">
          <h2 className="text-lg font-semibold">{t('seller.lowStock')}</h2>
          {d.lowStock.length === 0 ? <p className="mt-3 text-sm text-ink/60">{t('seller.noLowStock')}</p> : (
            <ul className="mt-3 divide-y divide-earth/10 text-sm">{d.lowStock.map((p) => <li key={p.id} className="flex justify-between py-2"><span>{p.name}</span><span className={p.stock === 0 ? 'font-semibold text-red-700' : 'text-earth'}>{p.stock} {p.unit}</span></li>)}</ul>
          )}
        </div>
      </div>
    </div>
  );
}
