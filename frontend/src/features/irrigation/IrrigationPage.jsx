import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Droplets } from 'lucide-react';
import api, { errorMessage } from '../../services/api.js';
import Field from '../../components/common/Field.jsx';
import { ErrorBox, PageTitle } from '../../components/common/ui.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';

const CROP_IDS = ['wheat', 'rice', 'maize', 'barley', 'bajra', 'jowar', 'ragi', 'pigeon-pea', 'moong', 'urad', 'chickpea', 'lentil', 'pea', 'mustard', 'soybean', 'groundnut', 'sesame', 'potato', 'onion', 'tomato', 'cauliflower', 'cabbage', 'carrot', 'spinach', 'brinjal', 'chilli', 'okra', 'bottle-gourd', 'watermelon', 'banana', 'papaya', 'mango', 'guava', 'sugarcane', 'cotton'];
const STAGES = { germination: 'Germination and establishment', vegetative: 'Vegetative growth (tillering, branching)', flowering: 'Flowering', fruiting: 'Fruit or grain filling', maturity: 'Maturity (near harvest)' };
const SOILS = { loamy: 'Loamy soil', sandy: 'Sandy soil', clay: 'Clay soil', black: 'Black soil', red: 'Red soil', alluvial: 'Alluvial soil' };
const METHODS = { drip: 'Drip irrigation (high precision)', sprinkler: 'Sprinkler', flood: 'Flood or canal irrigation', rainfed: 'Rain-fed (no irrigation)' };
const ACRE_LITRES_PER_MM = 4047;   // 1 mm of water over 1 acre

const STATUS = {
  optimal: { tone: 'border-leaf bg-leaf-light text-forest', icon: '✅', text: 'Optimal moisture maintained' },
  too_wet: { tone: 'border-sky-200 bg-sky-50 text-sky-900', icon: '💧', text: 'Soil is too wet. Skip irrigation and drain the field' },
  irrigate: { tone: 'border-gold bg-gold-light text-forest-dark', icon: '🚿', text: 'Irrigate soon' },
  urgent: { tone: 'border-red-200 bg-red-50 text-red-800', icon: '⚠️', text: 'Irrigate today. Soil is very dry' },
  rainfed_dry: { tone: 'border-gold bg-gold-light text-forest-dark', icon: '☁️', text: 'Soil is dry and the crop is rain-fed. Give one irrigation if you can, or mulch to hold moisture' },
  stop: { tone: 'border-earth/20 bg-earth-light text-ink', icon: '🌾', text: 'Maturity stage: irrigation is usually stopped now' },
  stop_dry: { tone: 'border-earth/20 bg-earth-light text-ink', icon: '🌾', text: 'Maturity stage: irrigation is usually stopped, even if the soil looks dry. Ask your KVK for your crop' },
};
const TIPS = {
  drip: 'Drip with fertigation in the early morning loses less water to evaporation than midday flood irrigation.',
  sprinkler: 'Avoid sprinkling in strong wind or the midday heat; much of the water is lost before it reaches the crop.',
  flood: 'Level the field and irrigate in the cool hours. Avoid midday so less water is lost to evaporation.',
  rainfed: 'A layer of straw mulch holds soil moisture and cuts evaporation on rain-fed fields.',
};
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export default function IrrigationPage() {
  const { t } = useI18n();
  const [f, setF] = useState({ crop: 'wheat', stage: 'vegetative', soil: 'loamy', method: 'drip', moisture: 55 });
  const [res, setRes] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setRes(null); };
  const cropName = (id) => t(`recommend.crop_${id.replace(/-/g, '_')}`);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try { setRes((await api.get('/irrigation/advice', { params: f })).data.data); } catch (err) { setError(errorMessage(err)); setRes(null); } finally { setBusy(false); }
  };

  const st = res && STATUS[res.status];
  const watersNow = res && (res.status === 'irrigate' || res.status === 'urgent');
  const nextText = !res ? '' : res.status === 'stop' || res.status === 'stop_dry' ? 'Not needed' : watersNow ? `Now, then again in about ${res.nextDays} day${res.nextDays === 1 ? '' : 's'}` : res.status === 'too_wet' ? `After about ${res.nextDays} days, when the soil dries` : res.nextDays <= 1 ? 'Tomorrow: check moisture again' : `In about ${res.nextDays} days`;
  const remindDays = !res ? 0 : watersNow ? 0 : res.status === 'stop' || res.status === 'stop_dry' ? null : res.nextDays;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <form onSubmit={submit} className="card space-y-4 self-start p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-forest">Water resource optimisation</p>
          <PageTitle>Smart irrigation advisory</PageTitle>
          <p className="-mt-2 text-sm text-ink/65">Watering advice based on crop stage, soil, how you irrigate and your soil moisture reading.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="i-crop" label="Crop name"><select id="i-crop" className="input" value={f.crop} onChange={set('crop')}>{CROP_IDS.map((c) => <option key={c} value={c}>{cropName(c)}</option>)}</select></Field>
            <Field id="i-stage" label="Crop growth stage"><select id="i-stage" className="input" value={f.stage} onChange={set('stage')}>{Object.entries(STAGES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field id="i-soil" label="Soil type"><select id="i-soil" className="input" value={f.soil} onChange={set('soil')}>{Object.entries(SOILS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
            <Field id="i-method" label="Irrigation setup"><select id="i-method" className="input" value={f.method} onChange={set('method')}>{Object.entries(METHODS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
          </div>
          <div>
            <div className="flex items-baseline justify-between"><label htmlFor="i-moist" className="text-sm font-medium">Current soil moisture reading</label><output htmlFor="i-moist" className="font-semibold text-forest">{f.moisture}%</output></div>
            <input id="i-moist" type="range" min="0" max="100" step="1" value={f.moisture} onChange={set('moisture')} className="mt-2 w-full accent-forest" />
            <p className="mt-1 text-xs text-ink/55">No sensor? Push a finger 5 to 10 cm into the soil. Crumbly and slightly cool is about 50 to 60%. Dusty dry is under 30%. Sticky wet is over 80%.</p>
          </div>
          <button className="btn-primary w-full py-3" disabled={busy}><Droplets className="h-4 w-4" aria-hidden="true" /> {busy ? 'Working out...' : 'Get precision watering schedule'}</button>
        </form>

        <section className="card self-start p-6" aria-live="polite">
          <h2 className="font-display text-2xl font-bold">Irrigation protocol</h2>
          <ErrorBox>{error}</ErrorBox>
          {!res ? <p className="mt-4 text-sm text-ink/60">Fill in the details and press the button to get your schedule.</p> : (
            <div className="mt-4 space-y-3">
              <div className={`rounded-xl border p-4 ${st.tone}`}>
                <p className="text-xs font-semibold uppercase tracking-wide">Status</p>
                <p className="mt-1 font-display text-xl font-bold"><span aria-hidden="true">{st.icon} </span>{st.text}</p>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3 rounded-lg bg-earth-light/60 p-3"><dt className="text-ink/65">Recommended water volume</dt><dd className="text-right font-semibold">{res.volumeMm > 0 ? `${res.volumeMm} mm (about ${(Math.round((res.volumeMm * ACRE_LITRES_PER_MM) / 100) * 100).toLocaleString('en-IN')} litres per acre)` : 'None needed now'}</dd></div>
                <div className="flex justify-between gap-3 rounded-lg bg-earth-light/60 p-3"><dt className="text-ink/65">Next watering</dt><dd className="text-right font-semibold text-forest">{nextText}</dd></div>
                <div className="flex justify-between gap-3 rounded-lg bg-earth-light/60 p-3"><dt className="text-ink/65">Best timing</dt><dd className="text-right font-semibold">{res.timing}</dd></div>
              </dl>
              <p className="rounded-lg border border-earth/15 bg-white p-3 text-sm text-ink/75"><span aria-hidden="true">💡 </span><strong>Tip:</strong> {TIPS[res.method]}</p>
              {remindDays !== null && (
                <Link className="btn-outline w-full" to={`/my-tasks?${new URLSearchParams({ title: `Irrigate ${cropName(res.crop)}${res.volumeMm ? ` (about ${res.volumeMm} mm)` : ' (check moisture)'}`, crop: cropName(res.crop).replace(/\s*\(.*\)$/, ''), category: 'irrigation', date: addDays(remindDays) })}`}>
                  Set a reminder for {remindDays === 0 ? 'today' : `${addDays(remindDays)}`}
                </Link>
              )}
              <p className="text-xs text-ink/55">General rule-of-thumb advice. It does not know today&apos;s rain or temperature, so check the <Link to="/weather" className="font-semibold text-forest underline">weather forecast</Link> before watering and confirm with your KVK.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
