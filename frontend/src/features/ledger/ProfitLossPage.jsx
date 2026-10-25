import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../services/api.js';
import Field from '../../components/common/Field.jsx';
import { Empty, ErrorBox, Loading, PageTitle } from '../../components/common/ui.jsx';
import { inr } from '../market/format.js';
import { labelOf, qs } from './ledgerShared.js';

const iso = (d) => d.toISOString().slice(0, 10);
const RANGES = {
  all: () => ({ from: '', to: '' }),
  d30: () => { const t = new Date(); const f = new Date(); f.setDate(t.getDate() - 30); return { from: iso(f), to: iso(t) }; },
  fy: () => { const t = new Date(); const y = t.getMonth() >= 3 ? t.getFullYear() : t.getFullYear() - 1; return { from: `${y}-04-01`, to: iso(t) }; },   // Indian financial year starts 1 April
  year: () => { const y = new Date().getFullYear(); return { from: `${y}-01-01`, to: `${y}-12-31` }; },
};

const Result = ({ profit }) => (profit < 0 ? { word: 'Loss', cls: 'border-red-200 bg-red-50 text-red-800' } : profit === 0 ? { word: 'Break-even', cls: 'border-earth/20 bg-earth-light text-ink' } : { word: 'Profit', cls: 'border-leaf bg-leaf-light text-forest' });

export default function ProfitLossPage() {
  const [range, setRange] = useState('all'); const [custom, setCustom] = useState({ from: '', to: '' });
  const [farm, setFarm] = useState(''); const [farms, setFarms] = useState([]);
  const [data, setData] = useState(null); const [error, setError] = useState('');
  const dates = range === 'custom' ? custom : RANGES[range]();

  useEffect(() => { api.get('/farms').then((r) => setFarms(r.data.data)).catch(() => {}); }, []);
  useEffect(() => {
    let live = true; setError('');
    api.get(`/ledger/profit-loss${qs({ farm, from: dates.from, to: dates.to })}`).then((r) => live && setData(r.data.data)).catch((e) => live && setError(errorMessage(e)));
    return () => { live = false; };
  }, [farm, dates.from, dates.to]);   // eslint-disable-line react-hooks/exhaustive-deps

  const res = data ? Result({ profit: data.profit }) : null;
  const maxCat = Math.max(1, ...(data?.byCategory || []).map((c) => c.amount));
  const worst = data?.perCrop.filter((c) => c.crop && c.profit < 0).sort((a, b) => a.profit - b.profit)[0];

  return (
    <div>
      <PageTitle action={<Link to="/my-expenses" className="btn-outline">Add expenses</Link>}>Profit and loss</PageTitle>
      <p className="-mt-2 mb-5 max-w-2xl text-sm text-ink/70">Profit = money earned minus money spent. It is calculated only from the entries you added in Farm expenses.</p>

      <div className="card mb-6 flex flex-wrap items-end gap-3">
        <Field id="p-range" label="Period"><select id="p-range" className="input" value={range} onChange={(e) => setRange(e.target.value)}>
          <option value="all">All time</option><option value="fy">This financial year (from 1 April)</option><option value="year">This calendar year</option><option value="d30">Last 30 days</option><option value="custom">Choose dates</option></select></Field>
        {range === 'custom' && <>
          <Field id="p-from" label="From"><input id="p-from" type="date" className="input" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></Field>
          <Field id="p-to" label="To"><input id="p-to" type="date" className="input" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></Field>
        </>}
        {farms.length > 0 && <Field id="p-farm" label="Farm"><select id="p-farm" className="input" value={farm} onChange={(e) => setFarm(e.target.value)}><option value="">All farms</option>{farms.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}</select></Field>}
      </div>

      <ErrorBox>{error}</ErrorBox>
      {!data && !error && <Loading />}
      {data && data.entries === 0 && <Empty>Nothing to show for this period. <Link to="/my-expenses" className="font-semibold text-forest underline">Add your expenses and income</Link> and your profit or loss appears here.</Empty>}
      {data && data.entries > 0 && (
        <>
          <section className={`rounded-2xl border p-6 ${res.cls}`} aria-live="polite">
            <p className="text-sm font-semibold uppercase tracking-wide">{res.word}</p>
            <p className="font-display text-4xl font-bold">{inr(Math.abs(data.profit))}</p>
            <p className="mt-1 text-sm">{data.roiPercent != null ? `${data.profit < 0 ? 'You lost' : 'You earned'} ${Math.abs(data.roiPercent)}% ${data.profit < 0 ? 'of' : 'on'} the money you spent.` : 'No expenses recorded in this period.'}</p>
            <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div><dt className="opacity-75">Total earned</dt><dd className="text-lg font-semibold">{inr(data.income)}</dd></div>
              <div><dt className="opacity-75">Total spent</dt><dd className="text-lg font-semibold">{inr(data.expense)}</dd></div>
            </dl>
          </section>
          {worst && <p className="mt-3 rounded-lg bg-gold-light/60 p-3 text-sm text-ink/80">{worst.crop} is running at a loss of {inr(Math.abs(worst.profit))}. Check its biggest costs below and compare your selling price with the <Link to="/mandi" className="font-semibold text-forest underline">mandi price</Link>.</p>}

          <section className="mt-6">
            <h2 className="mb-3 text-xl font-semibold">Crop-wise profit and loss</h2>
            <div className="overflow-x-auto rounded-xl border border-earth/15 bg-white">
              <table className="w-full min-w-[34rem] text-sm">
                <thead className="bg-earth-light/60 text-left text-xs uppercase tracking-wide text-ink/60"><tr><th className="p-3">Crop</th><th className="p-3 text-right">Spent</th><th className="p-3 text-right">Earned</th><th className="p-3 text-right">Profit or loss</th><th className="p-3 text-right">Return</th></tr></thead>
                <tbody>
                  {data.perCrop.map((c) => (
                    <tr key={c.crop || '_general'} className="border-t border-earth/10">
                      <td className="p-3 font-medium">{c.crop || 'General farm costs (no crop)'}</td>
                      <td className="p-3 text-right">{inr(c.expense)}</td>
                      <td className="p-3 text-right">{inr(c.income)}</td>
                      <td className={`p-3 text-right font-semibold ${c.profit < 0 ? 'text-red-800' : 'text-forest'}`}>{c.profit < 0 ? '-' : ''}{inr(Math.abs(c.profit))}</td>
                      <td className="p-3 text-right text-ink/70">{c.roiPercent != null ? `${c.roiPercent}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {data.byCategory.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 text-xl font-semibold">Where your money went</h2>
              <ul className="card space-y-3">
                {data.byCategory.map((c) => (
                  <li key={c.category}>
                    <div className="flex justify-between text-sm"><span>{labelOf(c.category, 'expense')}</span><span className="font-medium">{inr(c.amount)} <span className="text-ink/50">({c.share}%)</span></span></div>
                    <div className="mt-1 h-2.5 rounded-full bg-leaf-light"><div className="h-2.5 rounded-full bg-forest" style={{ width: `${Math.max(3, (c.amount / maxCat) * 100)}%` }} /></div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
