import { useEffect, useMemo, useState } from 'react';
import { Printer, RotateCcw, Trash2 } from 'lucide-react';
import Field from '../../components/common/Field.jsx';
import api, { errorMessage } from '../../services/api.js';

const STORE_KEY = 'krishimitra.customSeedCrops';
const EMPTY = { recordId: 'manual', area: '', unit: 'acre', bighaSqm: '', rate: '', rateUnit: 'kg/ha', assumedGermination: '', actualGermination: '', bagSizeKg: '' };
const fmt = (n, d = 2) => Number(n).toLocaleString('en-IN', { maximumFractionDigits: d });
const rangeText = (r) => `${r.seedRate}${r.seedRateMax ? `–${r.seedRateMax}` : ''} ${r.unit}`;
const recordLabel = (r) => `${[r.variety, r.sowingMethod].filter(Boolean).join(' · ') || 'General'} (${r.season}): ${r.published && r.published !== rangeText(r) ? `${r.published} = ` : ''}${rangeText(r)}`;

// Farmer-added crops live in this browser only (per device); wrapped in try/catch because storage can be blocked.
const loadCustom = () => { try { const v = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
const saveCustom = (list) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch { /* storage blocked: the crop still works for this visit */ } };

export default function SeedCalculatorPage() {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [crop, setCrop] = useState('');            // crop id, 'other', or 'my:<id>'
  const [stateName, setStateName] = useState('');  // state, or 'own' = enter my own rate
  const [otherName, setOtherName] = useState('');
  const [remember, setRemember] = useState(true);
  const [customCrops, setCustomCrops] = useState(loadCustom);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/calculator/seed-rates').then((r) => setData(r.data.data)).catch((e) => setLoadError(errorMessage(e)));
  }, []);

  const isPublishedCrop = !!crop && crop !== 'other' && !crop.startsWith('my:');
  const myCrop = crop.startsWith('my:') ? customCrops.find((c) => `my:${c.id}` === crop) : null;
  const allForCrop = useMemo(() => (data && isPublishedCrop ? data.rates.filter((r) => r.crop === crop) : []), [data, crop, isPublishedCrop]);
  const states = useMemo(() => [...new Set(allForCrop.map((r) => r.region))].sort(), [allForCrop]);
  const records = useMemo(() => allForCrop.filter((r) => r.region === stateName), [allForCrop, stateName]);
  const record = records.find((r) => r.id === form.recordId);
  const set = (k) => (e) => { setForm({ ...form, [k]: e.target.value }); setResult(null); };

  // A published rate stays "published" only while the farmer has not changed the number.
  const rateIsPublished = record && Number(form.rate) === record.seedRate && form.rateUnit === record.unit;

  const cropLabel = (id) => {
    if (id === 'other') return otherName.trim() || 'Other crop';
    if (id.startsWith('my:')) return customCrops.find((c) => `my:${c.id}` === id)?.name || 'My crop';
    return data?.crops.find((c) => c.id === id)?.label || id;
  };

  const pickCrop = (e) => {
    const id = e.target.value;
    setCrop(id); setStateName(''); setOtherName(''); setResult(null); setErrors({});
    const mine = id.startsWith('my:') ? customCrops.find((c) => `my:${c.id}` === id) : null;
    setForm({ ...form, recordId: 'manual', rate: mine?.rate ? String(mine.rate) : '', rateUnit: mine?.rateUnit || 'kg/ha' });
  };
  const pickState = (e) => {
    const s = e.target.value;
    setStateName(s); setResult(null);
    const list = allForCrop.filter((r) => r.region === s);
    if (list.length === 1) setForm({ ...form, recordId: list[0].id, rate: String(list[0].seedRate), rateUnit: list[0].unit });
    else setForm({ ...form, recordId: 'manual', rate: '', rateUnit: form.rateUnit });
  };
  const pickRecord = (e) => {
    const r = records.find((x) => x.id === e.target.value);
    setForm({ ...form, recordId: e.target.value, rate: r ? String(r.seedRate) : '', rateUnit: r ? r.unit : form.rateUnit });
    setResult(null);
  };
  const removeMine = () => {
    if (!myCrop) return;
    const next = customCrops.filter((c) => c.id !== myCrop.id);
    setCustomCrops(next); saveCustom(next); reset();
  };

  const validate = () => {
    const e = {};
    if (!crop) e.crop = 'Choose a crop, or "Other crop" to add your own';
    if (crop === 'other' && !otherName.trim()) e.otherName = 'Type the name of your crop';
    if (isPublishedCrop && !stateName) e.state = 'Choose your state, or "My state is not listed" to enter your own rate';
    if (!(Number(form.area) > 0)) e.area = 'Enter a land area greater than zero';
    if (form.unit === 'bigha' && !(Number(form.bighaSqm) > 0)) e.bighaSqm = 'Enter your local bigha size in square metres';
    if (!(Number(form.rate) > 0)) e.rate = 'Enter a seed rate greater than zero';
    const a = form.assumedGermination, b = form.actualGermination;
    if ((a === '') !== (b === '')) e.germination = 'Enter both germination percentages, or leave both empty';
    for (const g of [a, b]) if (g !== '' && !(Number(g) > 0 && Number(g) <= 100)) e.germination = 'Germination must be between 1 and 100';
    if (form.bagSizeKg !== '' && !(Number(form.bagSizeKg) > 0)) e.bagSizeKg = 'Bag size must be above zero';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    setApiError(''); setResult(null);
    if (!validate()) return;
    setBusy(true);
    try {
      const { recordId, ...payload } = form;
      const res = await api.post('/calculator/seed', payload);
      let usedCrop = crop;
      if (crop === 'other' && remember) {
        // Save the farmer's own crop (name + the rate and unit they used) for next time on this device.
        const id = `${Date.now()}`;
        const next = [...customCrops, { id, name: otherName.trim(), rate: Number(form.rate), rateUnit: form.rateUnit, state: stateName && stateName !== 'own' ? stateName : '' }];
        setCustomCrops(next); saveCustom(next); usedCrop = `my:${id}`; setCrop(usedCrop);
      }
      setResult({ ...res.data.data, snapshot: { crop: usedCrop, cropName: cropLabel(crop), state: stateName, form: { ...form }, record: rateIsPublished ? record : null } });
    } catch (err) { setApiError(errorMessage(err)); } finally { setBusy(false); }
  };

  const reset = () => { setCrop(''); setStateName(''); setOtherName(''); setForm(EMPTY); setErrors({}); setApiError(''); setResult(null); };
  const showState = isPublishedCrop;
  const otherStates = states.filter((s) => s !== stateName);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-3xl font-bold">Seed calculator <span className="text-xl text-ink/60">(Beej matra calculator)</span></h1>
      <p className="mt-2 max-w-2xl text-ink/70">Seed required = land area in hectares × seed rate in kg per hectare. Pick the crop and your state to load the rate published in the ICAR agro-advisories, or add your own crop and rate.</p>
      {loadError && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{loadError} Please retry: the crop list could not be loaded.</p>}

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <form onSubmit={submit} noValidate className="card space-y-5 lg:col-span-3">
          <div>
            <Field id="seed-crop" label="1. Crop (seed name)" error={errors.crop}>
              <select id="seed-crop" className="input" value={crop} onChange={pickCrop} disabled={!data}>
                <option value="">{data ? 'Choose a crop' : 'Loading crops...'}</option>
                {customCrops.length > 0 && <optgroup label="My crops">{customCrops.map((c) => <option key={c.id} value={`my:${c.id}`}>{c.name}</option>)}</optgroup>}
                {data && <optgroup label={`Crops in the ICAR advisories (${data.crops.length})`}>{data.crops.map((c) => <option key={c.id} value={c.id}>{c.label}{c.labelHi ? ` · ${c.labelHi}` : ''}</option>)}</optgroup>}
                <option value="other">Other crop (not in the list): add my own</option>
              </select>
            </Field>
            {crop === 'other' && (
              <div className="mt-3 space-y-2 rounded-lg bg-gold-light p-3 text-sm">
                <p>This crop has no published rate here. Type its name and the rate your local agriculture office or seed packet recommends.</p>
                <Field id="seed-other-name" label="Crop name" error={errors.otherName}>
                  <input id="seed-other-name" className="input" value={otherName} onChange={(e) => { setOtherName(e.target.value); setResult(null); }} maxLength={60} />
                </Field>
                <label className="flex items-center gap-2"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Save this crop in "My crops" on this device</label>
              </div>
            )}
            {myCrop && (
              <p className="mt-2 text-xs text-ink/65">Your own crop, saved on this device. Its rate has not been verified by KrishiMitra AI.{' '}
                <button type="button" onClick={removeMine} className="inline-flex items-center gap-1 font-semibold text-red-700 underline"><Trash2 className="h-3 w-3" aria-hidden="true" /> Remove it</button></p>
            )}
          </div>

          {showState && (
            <div>
              <Field id="seed-state" label="2. State" error={errors.state}>
                <select id="seed-state" className="input" value={stateName} onChange={pickState}>
                  <option value="">Choose your state</option>
                  {states.map((s) => <option key={s} value={s}>{s}</option>)}
                  <option value="own">My state is not listed: I will enter my own rate</option>
                </select>
              </Field>
              <p className="mt-1 text-xs text-ink/60">{states.length} state{states.length === 1 ? '' : 's'} have a published rate for {cropLabel(crop)}.</p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field id="seed-area" label={`${showState ? '3' : '2'}. Land area`} error={errors.area}>
                <input id="seed-area" type="number" step="any" min="0" inputMode="decimal" className="input" value={form.area} onChange={set('area')} />
              </Field>
            </div>
            <Field id="seed-unit" label="Unit">
              <select id="seed-unit" className="input" value={form.unit} onChange={set('unit')}>
                <option value="acre">Acre</option><option value="hectare">Hectare</option><option value="bigha">Bigha</option><option value="sqm">Square metre</option>
              </select>
            </Field>
          </div>
          {form.unit === 'bigha' && (
            <Field id="seed-bigha" label="Your local bigha size (square metres)" error={errors.bighaSqm}>
              <input id="seed-bigha" type="number" step="any" min="0" className="input" value={form.bighaSqm} onChange={set('bighaSqm')} placeholder="Bigha differs by state. Ask your local revenue or agriculture office" />
            </Field>
          )}

          <div className="space-y-3">
            <p className="label">{showState ? '4' : '3'}. Seed rate</p>
            {isPublishedCrop && stateName && stateName !== 'own' && (
              records.length > 0 && (
                <Field id="seed-record" label="Published recommendation (variety, sowing method, season)">
                  <select id="seed-record" className="input" value={form.recordId} onChange={pickRecord}>
                    {records.length > 1 && <option value="manual">Choose a recommendation, or enter my own rate</option>}
                    {records.map((r) => <option key={r.id} value={r.id}>{recordLabel(r)}</option>)}
                  </select>
                </Field>
              )
            )}
            {isPublishedCrop && stateName === 'own' && (
              <p className="rounded-lg bg-gold-light p-3 text-sm">Enter the rate your local agriculture office or seed packet recommends for {cropLabel(crop)} in your state.</p>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Field id="seed-rate" label="Seed rate" error={errors.rate}>
                  <input id="seed-rate" type="number" step="any" min="0" inputMode="decimal" className="input" value={form.rate} onChange={set('rate')} />
                </Field>
              </div>
              <Field id="seed-rate-unit" label="Rate unit">
                <select id="seed-rate-unit" className="input" value={form.rateUnit} onChange={set('rateUnit')}><option value="kg/ha">kg per hectare</option><option value="kg/acre">kg per acre</option></select>
              </Field>
            </div>
            <p className="text-xs text-ink/65">
              {rateIsPublished ? `Source: ${record.sourceDocument} (${record.region}), PDF page ${record.sourcePage}. Published value ${record.published}; the number above is the one used.`
                : record && form.rate ? 'This is your own value, not the published one.' : form.rate ? 'Source: your own value.' : ''}
            </p>
            {record?.notes && <p className="text-xs text-ink/65">Note from the advisory: {record.notes}</p>}
            {isPublishedCrop && stateName && stateName !== 'own' && otherStates.length > 0 && (
              <details className="rounded-lg border border-earth/15 p-3 text-sm">
                <summary className="cursor-pointer font-medium">For reference: rates published for other states ({otherStates.length})</summary>
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-ink/75">
                  {allForCrop.filter((r) => r.region !== stateName).map((r) => <li key={r.id}><span className="font-medium">{r.region}</span>: {recordLabel(r)}</li>)}
                </ul>
                <p className="mt-2 text-xs text-ink/60">Other states' rates are not a recommendation for your state.</p>
              </details>
            )}
          </div>

          <details className="rounded-lg border border-earth/15 p-3">
            <summary className="cursor-pointer text-sm font-medium">Optional: germination and bag size</summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field id="seed-germ-a" label="Germination the rate assumes (%)"><input id="seed-germ-a" type="number" step="any" className="input" value={form.assumedGermination} onChange={set('assumedGermination')} /></Field>
              <Field id="seed-germ-b" label="Germination of your seed (%)"><input id="seed-germ-b" type="number" step="any" className="input" value={form.actualGermination} onChange={set('actualGermination')} /></Field>
              {errors.germination && <p role="alert" className="field-error sm:col-span-2">{errors.germination}</p>}
              <p className="text-xs text-ink/60 sm:col-span-2">Adjusted seed = base seed × (assumed germination ÷ your germination). Use it only if you know both numbers, for example from the seed packet or a germination test.</p>
              <Field id="seed-bag" label="Seed bag size (kg)" error={errors.bagSizeKg}><input id="seed-bag" type="number" step="any" className="input" value={form.bagSizeKg} onChange={set('bagSizeKg')} /></Field>
            </div>
          </details>

          {apiError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{apiError}</p>}
          <div className="flex gap-3">
            <button className="btn-primary" disabled={busy || !data}>{busy ? 'Calculating...' : 'Calculate seed'}</button>
            <button type="button" className="btn-outline" onClick={reset}><RotateCcw className="h-4 w-4" aria-hidden="true" /> Reset</button>
          </div>
        </form>

        <section aria-live="polite" className="lg:col-span-2">
          {!result ? (
            <div className="card text-sm text-ink/70">
              <p className="font-semibold text-ink">Your result appears here.</p>
              <p className="mt-2">Example for illustration only: 2 acres at 100 kg/ha is about 0.8094 ha, so about 80.94 kg. This is not a recommended rate for any crop.</p>
            </div>
          ) : (
            <div className="card border-forest/30">
              <h2 className="text-xl font-bold">Seed required</h2>
              <p className="mt-1 font-display text-4xl font-bold text-forest">{fmt(result.totalSeedKg)} kg</p>
              <p className="text-sm text-ink/65">{fmt(result.totalQuintals, 3)} quintal{result.bags ? ` · about ${result.bags} bag${result.bags > 1 ? 's' : ''} of ${result.bagSizeKg} kg` : ''}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-ink/55">Crop</dt><dd className="font-medium">{result.snapshot.cropName}</dd></div>
                {result.snapshot.state && result.snapshot.state !== 'own' && <div><dt className="text-ink/55">State</dt><dd className="font-medium">{result.snapshot.state}</dd></div>}
                <div><dt className="text-ink/55">Land area</dt><dd className="font-medium">{result.snapshot.form.area} {result.snapshot.form.unit} ({fmt(result.areaHectare, 4)} ha)</dd></div>
                <div><dt className="text-ink/55">Seed rate used</dt><dd className="font-medium">{fmt(result.rateKgPerHa)} kg/ha</dd></div>
                {result.germinationFactor !== 1 && <div><dt className="text-ink/55">Germination factor</dt><dd className="font-medium">× {fmt(result.germinationFactor, 3)}</dd></div>}
              </dl>
              <div className="mt-4 rounded-lg bg-leaf-light p-3 text-sm">
                {result.snapshot.record ? (
                  <>
                    <p className="font-medium">Rate source: {result.snapshot.record.sourceDocument}</p>
                    <p>{result.snapshot.record.region}, {result.snapshot.record.season}, PDF page {result.snapshot.record.sourcePage}. Published as {result.snapshot.record.published}. Status: {result.snapshot.record.verificationStatus}.</p>
                    {result.snapshot.record.notes && <p className="mt-1">{result.snapshot.record.notes}</p>}
                  </>
                ) : <p className="font-medium">Rate source: value entered by you. It has not been verified by KrishiMitra AI.</p>}
              </div>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-ink/65">
                <li>Area is converted using 1 acre = 0.404686 ha.</li>
                <li>Seed rates vary by region, variety, sowing date and method. Confirm with your local agriculture office or seed packet.</li>
                <li>This is an estimate, not a yield or profit guarantee.</li>
              </ul>
              <button type="button" onClick={() => window.print()} className="btn-outline no-print mt-4"><Printer className="h-4 w-4" aria-hidden="true" /> Print summary</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
