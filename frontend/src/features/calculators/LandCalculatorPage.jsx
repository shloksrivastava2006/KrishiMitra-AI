import { useEffect, useState } from 'react';
import Field from '../../components/common/Field.jsx';
import api, { errorMessage } from '../../services/api.js';
import { CalcPage, ErrorText, UNITS, fmt, useCalculator } from './calcShared.jsx';

const OTHER = 'other';
const fmtSmall = (n) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: n < 1 ? 4 : 2 });

// Land calculator: pick the state, then enter the area in any unit that state uses (bigha, kanal, guntha, nali...) and see it in
// every other unit. The unit sizes per state come from the Agriculture Statistics Manual (backend/data/landUnits.js).
export default function LandCalculatorPage() {
  const [meta, setMeta] = useState(null); const [loadError, setLoadError] = useState('');
  const [state, setState] = useState(''); const [unit, setUnit] = useState('acre'); const [value, setValue] = useState('');
  const [res, setRes] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const other = useCalculator('area'); const [bighaSqm, setBighaSqm] = useState('');

  useEffect(() => { api.get('/calculator/land-units').then((r) => setMeta(r.data.data)).catch((e) => setLoadError(errorMessage(e))); }, []);

  const st = meta?.states.find((s) => s.id === state);
  const unitOptions = state === OTHER ? UNITS.map((u) => ({ id: u, name: u })) : st ? [...meta.standard, ...st.units] : meta?.standard || [];
  const changeState = (id) => { setState(id); setUnit('acre'); setRes(null); };

  const submit = async (e) => {
    e.preventDefault(); setError(''); setRes(null);
    if (state === OTHER) { other.run({ value, unit, bighaSqm }); return; }
    setBusy(true);
    try { setRes((await api.post('/calculator/land', { state, unit, value })).data.data); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  return (
    <CalcPage title="Land calculator" intro="Choose your state, enter your land in the unit you use, and see it in acre, hectare and your state's local units.">
      <ErrorText text={loadError} />
      <form className="card space-y-3" onSubmit={submit}>
        <Field id="land-state" label="State">
          <select id="land-state" required className="input" value={state} onChange={(e) => changeState(e.target.value)}>
            <option value="">Choose your state</option>
            {meta?.states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            <option value={OTHER}>Other state (I know my bigha size)</option>
          </select>
        </Field>
        {state && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field id="land-value" label="Area"><input id="land-value" type="number" step="any" min="0" required className="input" value={value} onChange={(e) => { setValue(e.target.value); setRes(null); }} /></Field>
              <Field id="land-unit" label="Unit"><select id="land-unit" className="input" value={unit} onChange={(e) => { setUnit(e.target.value); setRes(null); }}>{unitOptions.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
            </div>
            {state === OTHER && unit === 'bigha' && (
              <Field id="land-bigha" label="Local bigha size in square metres">
                <input id="land-bigha" type="number" step="any" min="0" required className="input" value={bighaSqm} onChange={(e) => setBighaSqm(e.target.value)} placeholder="Varies by state, ask your local revenue office" />
              </Field>
            )}
            <button className="btn-primary" disabled={busy}>{busy ? 'Converting...' : 'Convert'}</button>
          </>
        )}
        <ErrorText text={error || other.error} />

        {res && (
          <div aria-live="polite" className="space-y-3">
            {res.input.check && <p role="alert" className="rounded-lg bg-gold-light p-3 text-sm text-forest-dark"><strong>Check this unit:</strong> {res.input.note}</p>}
            <table className="w-full text-sm">
              <caption className="mb-2 text-left font-semibold">{fmtSmall(res.input.value)} {res.input.unit} in {res.state} is</caption>
              <tbody>
                {res.results.map((r) => (
                  <tr key={r.id} className={`border-t border-earth/10 ${r.local ? 'bg-leaf-light/50' : ''}`}>
                    <th scope="row" className="py-2 pr-3 text-left font-medium">{r.name}{(r.check || r.derived) && <span title={r.note} aria-label={r.check ? 'Check this value' : 'Note'} className={`ml-1 cursor-help ${r.check ? 'text-gold' : 'text-forest'}`}>{r.check ? '⚠' : 'ℹ'}</span>}</th>
                    <td className="py-2 text-right font-semibold">{fmtSmall(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {res.results.some((r) => (r.check || r.derived) && r.note) && <ul className="space-y-1 text-xs text-ink/70">{res.results.filter((r) => (r.check || r.derived) && r.note).map((r) => <li key={r.id}>{r.check ? '⚠' : 'ℹ'} <strong>{r.name}:</strong> {r.note}</li>)}</ul>}
            {res.stateNote && <p className="text-xs text-ink/70">{res.stateNote}</p>}
          </div>
        )}
        {other.result && state === OTHER && <dl className="grid grid-cols-2 gap-3 rounded-lg bg-leaf-light p-3 text-sm sm:grid-cols-3">{Object.entries(other.result.data).map(([k, v]) => <div key={k}><dt className="text-ink/60">{k}</dt><dd className="font-semibold">{fmt(v)}</dd></div>)}</dl>}
      </form>

      {st && st.units.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-lg font-semibold">Local units used in {st.name}</h2>
          <div className="overflow-x-auto rounded-xl border border-earth/15 bg-white">
            <table className="w-full min-w-[22rem] text-sm">
              <thead className="bg-earth-light/60 text-left text-xs uppercase tracking-wide text-ink/60"><tr><th className="p-3">Unit</th><th className="p-3 text-right">Hectare</th><th className="p-3 text-right">Square metre</th></tr></thead>
              <tbody>{st.units.map((u) => <tr key={u.id} className="border-t border-earth/10"><td className="p-3 font-medium">{u.name}{(u.check || u.derived) && <span title={u.note} className={`ml-1 ${u.check ? 'text-gold' : 'text-forest'}`}>{u.check ? '⚠' : 'ℹ'}</span>}</td><td className="p-3 text-right">{fmtSmall(u.hectare)}</td><td className="p-3 text-right">{fmt(u.hectare * 10000)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
      {st && st.units.length === 0 && <p className="mt-4 rounded-lg bg-leaf-light p-3 text-sm">The manual lists only hectare for {st.name}, so there are no local units to convert. Acre, square metre and square foot are available above.</p>}
      {meta && <p className="mt-4 text-xs text-ink/55">Unit sizes: {meta.source}. They are the factors state agencies use for crop-area surveys and are rounded. Local units can differ by district, so your land record (khasra, khatauni, jamabandi) is the final word.</p>}
    </CalcPage>
  );
}
