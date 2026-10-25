import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../../services/api.js';
import Field from '../../components/common/Field.jsx';
import { Empty, ErrorBox, Loading, PageTitle, Stat, fmtDate } from '../../components/common/ui.jsx';
import { inr } from '../market/format.js';
import { crops as knownCrops } from '../../constants/content.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, labelOf, qs, today } from './ledgerShared.js';

const blank = () => ({ type: 'expense', category: 'seed', amount: '', date: today(), farm: '', crop: '', note: '' });

function csv(entries) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Date', 'Type', 'Category', 'Crop', 'Farm', 'Amount (INR)', 'Note'], ...entries.map((e) => [e.date.slice(0, 10), e.type, labelOf(e.category, e.type), e.crop, e.farm?.name || '', e.amount, e.note || ''])];
  const blob = new Blob([`\uFEFF${rows.map((r) => r.map(esc).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'farm-expenses.csv'; a.click(); URL.revokeObjectURL(a.href);
}

export default function ExpensesPage() {
  const { lang } = useI18n();
  const [params] = useSearchParams();
  const [form, setForm] = useState(() => ({ ...blank(), crop: params.get('crop') || '' }));
  const [filter, setFilter] = useState({ farm: '', crop: '', type: '' });
  const [entries, setEntries] = useState(null); const [totals, setTotals] = useState(null);
  const [farms, setFarms] = useState([]); const [myCrops, setMyCrops] = useState([]);
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, sum] = await Promise.all([api.get(`/ledger${qs(filter)}`), api.get(`/ledger/profit-loss${qs({ farm: filter.farm, crop: filter.crop })}`)]);
      setEntries(list.data.data); setTotals(sum.data.data);
    } catch (e) { setError(errorMessage(e)); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/farms').then((r) => setFarms(r.data.data)).catch(() => {});
    api.get('/crops').then((r) => setMyCrops([...new Set(r.data.data.map((c) => c.name))])).catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setType = (type) => setForm((f) => ({ ...f, type, category: type === 'income' ? 'crop_sale' : 'seed' }));

  const submit = async (e) => {
    e.preventDefault(); setError(''); setSaving(true);
    try {
      await api.post('/ledger', { ...form, amount: Number(form.amount), farm: form.farm || undefined, crop: form.crop.trim() || undefined, note: form.note.trim() || undefined });
      setForm((f) => ({ ...blank(), type: f.type, category: f.category, date: f.date, farm: f.farm, crop: f.crop }));   // keep the context so several lines can be entered quickly
      await load();
    } catch (err) { setError(errorMessage(err)); } finally { setSaving(false); }
  };
  const remove = async (entry) => {
    if (!window.confirm(`Delete this ${entry.type} of ${inr(entry.amount)}?`)) return;
    try { await api.delete(`/ledger/${entry._id}`); await load(); } catch (err) { setError(errorMessage(err)); }
  };

  const cropOptions = [...new Set([...myCrops, ...knownCrops.map((c) => c.name)])];
  const isIncome = form.type === 'income';
  const net = totals?.profit ?? 0;

  return (
    <div>
      <PageTitle action={<Link to="/my-profit-loss" className="btn-outline">See profit and loss</Link>}>Farm expenses</PageTitle>
      <p className="-mt-2 mb-5 max-w-2xl text-sm text-ink/70">Write down every rupee you spend on the farm and every rupee you earn. Your profit or loss is worked out for you.</p>
      <ErrorBox>{error}</ErrorBox>

      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <Stat label="Total spent" value={totals ? inr(totals.expense) : '...'} />
        <Stat label="Total earned" value={totals ? inr(totals.income) : '...'} />
        <Stat label={net < 0 ? 'Loss so far' : 'Profit so far'} value={totals ? inr(Math.abs(net)) : '...'} tone={net < 0 ? 'warn' : undefined} hint={totals?.roiPercent != null ? `${totals.roiPercent}% on money spent` : undefined} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_1fr]">
        <form onSubmit={submit} className="card space-y-3 self-start">
          <div role="group" aria-label="Entry type" className="grid grid-cols-2 gap-1 rounded-lg bg-earth-light p-1">
            {[['expense', 'Expense (kharcha)'], ['income', 'Income (kamai)']].map(([v, label]) => (
              <button key={v} type="button" aria-pressed={form.type === v} onClick={() => setType(v)}
                className={`rounded-md px-3 py-2 text-sm font-semibold ${form.type === v ? (v === 'expense' ? 'bg-white text-red-800 shadow-sm' : 'bg-white text-forest shadow-sm') : 'text-ink/60'}`}>{label}</button>
            ))}
          </div>
          <Field id="l-cat" label="Category"><select id="l-cat" className="input" value={form.category} onChange={set('category')}>{(isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => <option key={c} value={c}>{labelOf(c, form.type)}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field id="l-amt" label="Amount (Rs)"><input id="l-amt" type="number" inputMode="decimal" min="0.01" step="any" required className="input" value={form.amount} onChange={set('amount')} /></Field>
            <Field id="l-date" label="Date"><input id="l-date" type="date" required className="input" value={form.date} max={today()} onChange={set('date')} /></Field>
          </div>
          <Field id="l-crop" label="Crop (leave empty for general farm cost)">
            <input id="l-crop" list="l-crops" className="input" maxLength={80} value={form.crop} onChange={set('crop')} placeholder="e.g. Wheat" />
            <datalist id="l-crops">{cropOptions.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          {farms.length > 0 && (
            <Field id="l-farm" label="Farm (optional)"><select id="l-farm" className="input" value={form.farm} onChange={set('farm')}><option value="">No farm selected</option>{farms.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}</select></Field>
          )}
          <Field id="l-note" label="Note (optional)"><input id="l-note" className="input" maxLength={300} value={form.note} onChange={set('note')} placeholder="e.g. 4 bags urea from Sharma store" /></Field>
          <button className="btn-primary w-full" disabled={saving}>{saving ? 'Saving...' : isIncome ? 'Add income' : 'Add expense'}</button>
        </form>

        <section>
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <Field id="f-type" label="Show"><select id="f-type" className="input" value={filter.type} onChange={(e) => setFilter({ ...filter, type: e.target.value })}><option value="">Everything</option><option value="expense">Expenses only</option><option value="income">Income only</option></select></Field>
            <Field id="f-crop" label="Crop"><select id="f-crop" className="input" value={filter.crop} onChange={(e) => setFilter({ ...filter, crop: e.target.value })}><option value="">All crops</option>{[...new Set((entries || []).map((e) => e.crop).filter(Boolean).concat(filter.crop || []))].map((c) => <option key={c}>{c}</option>)}</select></Field>
            {farms.length > 0 && <Field id="f-farm" label="Farm"><select id="f-farm" className="input" value={filter.farm} onChange={(e) => setFilter({ ...filter, farm: e.target.value })}><option value="">All farms</option>{farms.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}</select></Field>}
            {entries?.length > 0 && <button type="button" onClick={() => csv(entries)} className="btn-outline ml-auto py-2"><Download className="h-4 w-4" aria-hidden="true" /> Download CSV</button>}
          </div>
          {!entries ? <Loading /> : entries.length === 0 ? <Empty>No entries yet. Add your first expense, for example the seed or fertilizer you bought.</Empty> : (
            <ul className="space-y-2">
              {entries.map((e) => (
                <li key={e._id} className="card flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{labelOf(e.category, e.type)}{e.crop && <span className="ml-2 rounded-full bg-leaf-light px-2 py-0.5 text-xs font-medium text-forest">{e.crop}</span>}</p>
                    <p className="truncate text-xs text-ink/60">{fmtDate(e.date, lang)}{e.farm?.name ? ` · ${e.farm.name}` : ''}{e.note ? ` · ${e.note}` : ''}</p>
                  </div>
                  <p className={`shrink-0 font-display text-lg font-bold ${e.type === 'income' ? 'text-forest' : 'text-red-800'}`}>{e.type === 'income' ? '+' : '-'}{inr(e.amount)}</p>
                  <button onClick={() => remove(e)} aria-label={`Delete ${labelOf(e.category, e.type)} ${inr(e.amount)}`} className="text-ink/45 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
