import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarPlus, Droplets, Printer, Sprout } from 'lucide-react';
import Field from '../../components/common/Field.jsx';
import api, { errorMessage } from '../../services/api.js';
import { ErrorText, UNITS, fmt, useCalculator } from './calcShared.jsx';

const EMPTY = { planId: '', area: '', unit: 'acre', bighaSqm: '', pSource: 'DAP', baseDate: '' };
const kg = (lo, hi) => (lo === hi ? `${fmt(lo)} kg` : `${fmt(lo)} to ${fmt(hi)} kg`);
const dayText = (d, base) => (!d ? '' : d.from === d.to ? (d.from === 0 ? `at ${base}` : `day ${d.from} after ${base}`) : `day ${d.from} to ${d.to} after ${base}`);
const dateText = (r) => {
  if (!r) return '';
  const f = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return r.from === r.to ? f(r.from) : `${f(r.from)} to ${f(r.to)}`;
};
const taskLink = (title, crop, category, dates, notes) =>
  `/my-tasks?${new URLSearchParams({ title, crop, category, date: dates.from, notes }).toString()}`;

export default function FertilizerCalculatorPage() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [crop, setCrop] = useState('');
  const [state, setState] = useState('');
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/calculator/fertilizer-plans').then((r) => setData(r.data.data)).catch((e) => setLoadError(errorMessage(e)));
  }, []);

  const forCrop = useMemo(() => (data && crop && crop !== 'own' ? data.plans.filter((p) => p.crop === crop) : []), [data, crop]);
  const states = useMemo(() => [...new Set(forCrop.map((p) => p.state))].sort(), [forCrop]);
  const plans = useMemo(() => forCrop.filter((p) => p.state === state), [forCrop, state]);
  const plan = plans.find((p) => p.id === form.planId);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setResult(null); };
  const cropLabel = (id) => data?.crops.find((c) => c.id === id)?.label || id;

  const pickCrop = (e) => { setCrop(e.target.value); setState(''); setForm({ ...form, planId: '' }); setResult(null); setErrors({}); };
  const pickState = (e) => {
    const s = e.target.value; setState(s); setResult(null);
    const list = forCrop.filter((p) => p.state === s);
    setForm({ ...form, planId: list.length === 1 ? list[0].id : '' });
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (crop === 'own') return;
    setApiError(''); setResult(null);
    const er = {};
    if (!crop) er.crop = 'Choose a crop';
    if (!state) er.state = 'Choose your state';
    if (state && !form.planId) er.plan = 'Choose the variety or condition that matches your field';
    if (!(Number(form.area) > 0)) er.area = 'Enter a land area greater than zero';
    if (form.unit === 'bigha' && !(Number(form.bighaSqm) > 0)) er.bighaSqm = 'Enter your local bigha size in square metres';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try {
      const res = await api.post('/calculator/fertilizer-plan', form);
      setResult({ ...res.data.data, note: res.data.note });
    } catch (err) { setApiError(errorMessage(err)); } finally { setBusy(false); }
  };

  const baseLabel = plan ? { sowing: 'Sowing date', transplanting: 'Transplanting date', planting: 'Planting date', emergence: 'Date the shoots came up' }[plan.base] : 'Sowing date';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link to="/calculators" className="text-sm font-semibold text-forest underline">&larr; All calculators</Link>
      <h1 className="mt-3 text-3xl font-bold">Fertilizer and water calculator <span className="text-xl text-ink/60">(Khad aur sinchai)</span></h1>
      <p className="mt-2 max-w-2xl text-ink/70">Choose your crop and state. You get how much of each fertilizer your field needs, <strong>when to put each dose</strong>, and <strong>when to give water</strong>, from the ICAR agro-advisories. Add your sowing date to see calendar dates.</p>
      {loadError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{loadError} Please retry: the crop list could not be loaded.</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <form onSubmit={submit} noValidate className="card space-y-4 lg:col-span-2 lg:self-start">
          <Field id="fp-crop" label="1. Crop (fasal)" error={errors.crop}>
            <select id="fp-crop" className="input" value={crop} onChange={pickCrop} disabled={!data}>
              <option value="">{data ? 'Choose a crop' : 'Loading crops...'}</option>
              {data?.crops.map((c) => <option key={c.id} value={c.id}>{c.label} · {c.labelHi}</option>)}
              <option value="own">Other crop: I know my own nutrient rate</option>
            </select>
          </Field>

          {crop && crop !== 'own' && (
            <Field id="fp-state" label="2. State (rajya)" error={errors.state}>
              <select id="fp-state" className="input" value={state} onChange={pickState}>
                <option value="">Choose your state</option>
                {states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <p className="mt-1 text-xs text-ink/60">{states.length} state{states.length === 1 ? '' : 's'} in the advisories for {cropLabel(crop)}. Not yours? Pick "Other crop" above to enter your own rate.</p>
            </Field>
          )}

          {plans.length > 1 && (
            <Field id="fp-plan" label="3. Variety or condition" error={errors.plan}>
              <select id="fp-plan" className="input" value={form.planId} onChange={set('planId')}>
                <option value="">Choose one</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.label} ({p.season})</option>)}
              </select>
            </Field>
          )}

          {crop && crop !== 'own' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Field id="fp-area" label="Land area" error={errors.area}>
                    <input id="fp-area" type="number" step="any" min="0" inputMode="decimal" className="input" value={form.area} onChange={set('area')} />
                  </Field>
                </div>
                <Field id="fp-unit" label="Unit">
                  <select id="fp-unit" className="input" value={form.unit} onChange={set('unit')}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select>
                </Field>
              </div>
              {form.unit === 'bigha' && (
                <Field id="fp-bigha" label="Your local bigha size (square metres)" error={errors.bighaSqm}>
                  <input id="fp-bigha" type="number" step="any" min="0" className="input" value={form.bighaSqm} onChange={set('bighaSqm')} placeholder="Bigha differs by state" />
                </Field>
              )}
              {(!plan || plan.basis === 'nutrient') && (
                <Field id="fp-p" label="Phosphorus fertilizer you will use">
                  <select id="fp-p" className="input" value={form.pSource} onChange={set('pSource')}>
                    <option value="DAP">DAP (also gives nitrogen, so less urea)</option>
                    <option value="SSP">SSP (single super phosphate)</option>
                  </select>
                </Field>
              )}
              <Field id="fp-date" label={`${baseLabel} (optional, to get calendar dates)`}>
                <input id="fp-date" type="date" className="input" value={form.baseDate} onChange={set('baseDate')} />
              </Field>
              <button className="btn-primary w-full" disabled={busy}>{busy ? 'Calculating...' : 'Show fertilizer and water schedule'}</button>
              <ErrorText text={apiError} />
            </>
          )}
          {crop === 'own' && <OwnRate />}
        </form>

        <div className="lg:col-span-3">
          {!result && crop !== 'own' && (
            <div className="card text-sm text-ink/70"><Sprout className="mb-2 h-6 w-6 text-forest" aria-hidden="true" />
              <p>Pick a crop and state to see the schedule. Every dose and day is taken from the ICAR Kharif 2025 and Rabi 2021-22 advisories, and the PDF page is shown with the result.</p>
              {plan && <p className="mt-3 rounded-lg bg-leaf-light p-3 text-ink"><strong>This advisory says:</strong> {plan.published}</p>}
            </div>
          )}
          {result && <Result r={result} cropName={cropLabel(result.plan.crop)} />}
        </div>
      </div>
    </div>
  );
}

function Result({ r, cropName }) {
  const hasFert = r.steps.length > 0;
  return (
    <div className="space-y-4" id="fert-result">
      <div className="card">
        <h2 className="text-xl font-bold">{cropName}, {r.plan.state}</h2>
        <p className="text-sm text-ink/70">{r.plan.label} · {r.plan.season} · field {fmt(r.areaHectare)} ha ({fmt(r.areaHectare * 2.47105)} acre)</p>
        <p className="mt-2 rounded-lg bg-leaf-light p-3 text-sm"><strong>The advisory says:</strong> {r.plan.published}</p>
        <p className="mt-2 text-xs text-ink/60">Source: {r.plan.doc}, PDF page {r.plan.pages.join(', ')}.</p>
      </div>

      {hasFert && (
        <div className="card">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Sprout className="h-5 w-5 text-forest" aria-hidden="true" /> When to apply fertilizer</h2>
          <ol className="mt-3 space-y-3">
            {r.steps.map((s, i) => (
              <li key={i} className="rounded-lg border border-earth/20 p-3">
                <p className="font-semibold"><span className="mr-2 rounded-full bg-forest px-2 py-0.5 text-xs text-white">{i + 1}</span>{s.when}</p>
                <p className="mt-1 text-xs text-ink/65">
                  {s.day && <>{dayText(s.day, r.plan.baseText)}. </>}
                  {s.dates && <strong className="text-forest">{dateText(s.dates)}</strong>}
                </p>
                {s.foliar ? <p className="mt-2 text-sm">Spray urea on the leaves (20 g per litre of water). The amount is per tank, so no kg is calculated.</p> : (
                  <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                    {s.fertilizers.map((f) => <li key={f.key} className="rounded bg-paper px-3 py-1.5 text-sm"><span className="text-ink/70">{f.name}</span><br /><strong>{kg(f.kgLow, f.kgHigh)}</strong></li>)}
                  </ul>
                )}
                {s.note && <p className="mt-2 text-xs text-ink/60">{s.note}</p>}
                {s.dates && <Link to={taskLink(`${s.when}: ${s.fertilizers.map((f) => `${f.name.split(' (')[0]} ${kg(f.kgLow, f.kgHigh)}`).join(', ')}`, cropName, 'fertilizer', s.dates, `From the ICAR advisory, ${r.plan.state}`)} className="no-print mt-2 inline-flex items-center gap-1 text-xs font-semibold text-forest underline"><CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" /> Remind me</Link>}
              </li>
            ))}
          </ol>
          <h3 className="mt-4 font-semibold">Total to buy for this field</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-earth/20 text-left text-xs text-ink/60"><th className="py-1 pr-3">Fertilizer</th><th className="pr-3">Quantity</th><th>50 kg bags</th></tr></thead>
              <tbody>{r.totals.map((t) => (
                <tr key={t.key} className="border-b border-earth/10"><td className="py-1.5 pr-3">{t.name}</td><td className="pr-3 font-semibold">{kg(t.kgLow, t.kgHigh)}</td><td>{t.bagsLow === undefined ? '' : t.bagsLow === t.bagsHigh ? t.bagsLow : `${t.bagsLow} to ${t.bagsHigh}`}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      )}
      {!hasFert && <div className="card text-sm">The advisory gives <strong>no fertilizer schedule</strong> for this crop and state, only water. For fertilizer, use "Other crop: I know my own nutrient rate", or ask your KVK.</div>}

      {r.water.length > 0 && (
        <div className="card">
          <h2 className="flex items-center gap-2 text-lg font-bold"><Droplets className="h-5 w-5 text-forest" aria-hidden="true" /> When to give water</h2>
          <ol className="mt-3 space-y-2">
            {r.water.map((w, i) => (
              <li key={i} className="rounded-lg border border-earth/20 p-3 text-sm">
                <p className="font-semibold">{w.when}</p>
                <p className="mt-1 text-xs text-ink/65">
                  {w.day && <>{dayText(w.day, r.plan.baseText)}. </>}
                  {w.dates && <strong className="text-forest">{dateText(w.dates)}. </strong>}
                  {w.litres && <>Depth {w.depthCm} cm on your field = about <strong>{fmt(w.litres)} litres</strong>.</>}
                </p>
                {w.note && <p className="mt-1 text-xs text-ink/60">{w.note}</p>}
                {w.dates && <Link to={taskLink(`Irrigation: ${w.when}`, cropName, 'irrigation', w.dates, `From the ICAR advisory, ${r.plan.state}`)} className="no-print mt-1 inline-flex items-center gap-1 text-xs font-semibold text-forest underline"><CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" /> Remind me</Link>}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-ink/60">The advisories give irrigation timing, not the volume of water, except where a depth is shown. For how much water to give now, use the <Link to="/irrigation" className="font-semibold text-forest underline">Smart irrigation advisory</Link>.</p>
        </div>
      )}

      {r.notes.length > 0 && <div className="card text-xs text-ink/70"><p className="mb-1 font-semibold text-ink/80">Notes</p><ul className="list-disc space-y-1 pl-4">{r.notes.map((n, i) => <li key={i}>{n}</li>)}</ul></div>}
      <p className="text-xs text-ink/55">{r.note}</p>
      <button type="button" onClick={() => window.print()} className="btn-outline no-print"><Printer className="h-4 w-4" aria-hidden="true" /> Print this schedule</button>
    </div>
  );
}

// Fallback: the original calculator, for crops or states that are not in the advisories.
function OwnRate() {
  const { result, error, run } = useCalculator('fertilizer');
  const [f, setF] = useState({ area: '', unit: 'acre', bighaSqm: '', nutrientRateKgPerHa: '', nutrientPercent: '46' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-3 rounded-lg bg-gold-light p-3 text-sm">
      <p>Enter the rate your KVK, soil-test report or fertilizer packet recommends. This gives the quantity only, not the timing.</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2"><Field id="own-area" label="Field area"><input id="own-area" type="number" step="any" min="0" className="input" value={f.area} onChange={set('area')} /></Field></div>
        <Field id="own-unit" label="Unit"><select id="own-unit" className="input" value={f.unit} onChange={set('unit')}>{UNITS.map((u) => <option key={u}>{u}</option>)}</select></Field>
      </div>
      {f.unit === 'bigha' && <Field id="own-bigha" label="Local bigha size (sq m)"><input id="own-bigha" type="number" step="any" min="0" className="input" value={f.bighaSqm} onChange={set('bighaSqm')} /></Field>}
      <Field id="own-rate" label="Nutrient rate (kg per hectare)"><input id="own-rate" type="number" step="any" min="0" className="input" value={f.nutrientRateKgPerHa} onChange={set('nutrientRateKgPerHa')} /></Field>
      <Field id="own-pct" label="Nutrient in the fertilizer (%). Urea is 46% N"><input id="own-pct" type="number" step="any" min="0" max="100" className="input" value={f.nutrientPercent} onChange={set('nutrientPercent')} /></Field>
      <button type="button" className="btn-primary w-full" onClick={() => run(f)}>Calculate</button>
      <ErrorText text={error} />
      {result && (
        <div className="rounded-lg bg-leaf-light p-3">
          <p>Area: <strong>{fmt(result.data.areaHectare)} ha</strong></p>
          <p>Fertilizer needed: <strong>{fmt(result.data.fertilizerKg)} kg</strong> (about {fmt(result.data.fertilizerBags50kg)} bags of 50 kg)</p>
          <p className="mt-2 text-xs text-ink/65">{result.note}</p>
        </div>
      )}
    </div>
  );
}
