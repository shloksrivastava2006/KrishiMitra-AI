import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import Field from '../../components/common/Field.jsx';
import SmartImage from '../../components/common/SmartImage.jsx';
import { crops as knownCrops } from '../../constants/content.js';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../services/api.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';

const STAGES = ['sowing', 'germination', 'vegetative', 'flowering', 'fruiting', 'harvest-ready', 'harvested'];

// Share of time elapsed between sowing and expected harvest; only shown when both dates exist.
function timeProgress(crop) {
  if (!crop.expectedHarvestDate) return null;
  const start = new Date(crop.sowingDate).getTime();
  const end = new Date(crop.expectedHarvestDate).getTime();
  return Math.min(100, Math.max(0, Math.round(((Date.now() - start) / (end - start)) * 100)));
}

export default function CropsPage() {
  const { t } = useI18n();
  const [crops, setCrops] = useState(null);
  const [farms, setFarms] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: { growthStage: 'sowing' } });

  const loadCrops = useCallback(() => api.get('/crops', { params: search ? { q: search } : {} })
    .then((r) => setCrops(r.data.data)).catch((e) => setError(errorMessage(e))), [search]);

  useEffect(() => { api.get('/farms').then((r) => setFarms(r.data.data)).catch((e) => setError(errorMessage(e))); }, []);
  useEffect(() => { loadCrops(); }, [loadCrops]);

  const onSubmit = async (values) => {
    setError('');
    try {
      await api.post('/crops', { ...values, area: Number(values.area), expectedHarvestDate: values.expectedHarvestDate || undefined });
      reset(); await loadCrops();
    } catch (e) { setError(errorMessage(e)); }
  };

  const remove = async (crop) => {
    if (!window.confirm(`Remove ${crop.name}?`)) return;
    try { await api.delete(`/crops/${crop._id}`); await loadCrops(); } catch (e) { setError(errorMessage(e)); }
  };

  const imageFor = (name) => knownCrops.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Crops</h1>
          <input aria-label="Search crops" placeholder="Search by name" className="input max-w-xs" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {!crops ? <p className="mt-4 text-ink/60">Loading crops...</p> : crops.length === 0 ? (
          <p className="card mt-4 text-sm text-ink/70">{search ? 'No crops match your search.' : 'No crops recorded yet. Add a farm first, then record a crop.'}</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {crops.map((c) => {
              const progress = timeProgress(c);
              return (
                <li key={c._id} className="overflow-hidden rounded-xl border border-earth/15 bg-white">
                  <SmartImage folder="crops" name={imageFor(c.name) || 'vegetables'} alt={`${c.name}`} className="h-32 w-full" />
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div><h2 className="font-semibold">{c.name}</h2><p className="text-xs text-ink/60">{c.farm?.name} &middot; {c.area} acres</p></div>
                      <button onClick={() => remove(c)} aria-label={`Remove ${c.name}`} className="text-ink/50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                    </div>
                    <p className="mt-2 text-sm capitalize">Stage: {c.growthStage}</p>
                    <Link to={`/sell-produce?crop=${c._id}`} className="btn-outline mt-3 w-full justify-center py-1.5 text-sm">{t('sell.sellThisCrop')}</Link>
                    {progress !== null && (
                      <div className="mt-2" aria-label={`Time elapsed toward harvest: ${progress}%`}>
                        <div className="h-2 rounded-full bg-leaf-light"><div className="h-2 rounded-full bg-leaf" style={{ width: `${progress}%` }} /></div>
                        <p className="mt-1 text-xs text-ink/55">{progress}% of time to expected harvest</p>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-3 self-start">
        <h2 className="text-lg font-semibold">Add a crop</h2>
        <Field id="crop-farm" label="Farm" error={errors.farm?.message}>
          <select id="crop-farm" className="input" {...register('farm', { required: 'Choose a farm' })}>
            <option value="">{farms.length ? 'Select a farm' : 'Add a farm first'}</option>
            {farms.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
          </select>
        </Field>
        <Field id="crop-name" label="Crop name" error={errors.name?.message}><input id="crop-name" list="crop-names" className="input" {...register('name', { required: 'Enter a crop name' })} />
          <datalist id="crop-names">{knownCrops.map((c) => <option key={c.id} value={c.name} />)}</datalist>
        </Field>
        <Field id="crop-area" label="Area (acres)" error={errors.area?.message}><input id="crop-area" type="number" step="any" className="input" {...register('area', { required: 'Enter the area', min: { value: 0.01, message: 'Must be above zero' } })} /></Field>
        <Field id="crop-sow" label="Sowing date" error={errors.sowingDate?.message}><input id="crop-sow" type="date" className="input" {...register('sowingDate', { required: 'Enter the sowing date' })} /></Field>
        <Field id="crop-harvest" label="Expected harvest date"><input id="crop-harvest" type="date" className="input" {...register('expectedHarvestDate')} /></Field>
        <Field id="crop-stage" label="Growth stage"><select id="crop-stage" className="input capitalize" {...register('growthStage')}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save crop'}</button>
      </form>
    </div>
  );
}
