import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { MapPin, Trash2 } from 'lucide-react';
import Field from '../../components/common/Field.jsx';
import api, { errorMessage } from '../../services/api.js';

const SOILS = ['alluvial', 'black', 'red', 'laterite', 'sandy', 'loamy', 'clay', 'other'];
const IRRIGATION = ['rainfed', 'canal', 'tubewell', 'drip', 'sprinkler', 'other'];

export default function FarmsPage() {
  const [farms, setFarms] = useState(null);
  const [error, setError] = useState('');
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm({ defaultValues: { unit: 'acre', soilType: 'other', irrigationMethod: 'rainfed' } });

  const load = useCallback(() => api.get('/farms').then((r) => setFarms(r.data.data)).catch((e) => setError(errorMessage(e))), []);
  useEffect(() => { load(); }, [load]);

  const onSubmit = async (values) => {
    setError('');
    try { await api.post('/farms', { ...values, area: Number(values.area), latitude: values.latitude === '' ? undefined : Number(values.latitude), longitude: values.longitude === '' ? undefined : Number(values.longitude) }); reset(); await load(); }
    catch (e) { setError(errorMessage(e)); }
  };

  // Fills the coordinate fields from the device. Nothing is sent until the farm is saved.
  const fillFromDevice = () => {
    if (!navigator.geolocation) { setError('This browser cannot share location. Type the coordinates instead.'); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => { setValue('latitude', p.coords.latitude.toFixed(5)); setValue('longitude', p.coords.longitude.toFixed(5)); },
      () => setError('Could not read your location. Allow location access or type the coordinates.'),
      { timeout: 10000 },
    );
  };

  const remove = async (farm) => {
    if (!window.confirm(`Delete "${farm.name}" and all crops recorded on it?`)) return;
    try { await api.delete(`/farms/${farm._id}`); await load(); } catch (e) { setError(errorMessage(e)); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="lg:col-span-2">
        <h1 className="text-2xl font-bold">My farms</h1>
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {!farms ? <p className="mt-4 text-ink/60">Loading farms...</p> : farms.length === 0 ? (
          <p className="card mt-4 text-sm text-ink/70">You have no farms yet. Use the form to add your first one.</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {farms.map((f) => (
              <li key={f._id} className="card">
                <div className="flex items-start justify-between">
                  <h2 className="font-semibold">{f.name}</h2>
                  <button onClick={() => remove(f)} aria-label={`Delete ${f.name}`} className="text-ink/50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                </div>
                <p className="text-sm text-ink/65">{f.location || 'Location not set'}</p>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="text-ink/55">Area</dt><dd>{f.area} {f.unit}</dd></div>
                  <div><dt className="text-ink/55">Soil</dt><dd className="capitalize">{f.soilType}</dd></div>
                  <div><dt className="text-ink/55">Irrigation</dt><dd className="capitalize">{f.irrigationMethod}</dd></div>
                  <div><dt className="text-ink/55">Water source</dt><dd>{f.waterSource || 'Not set'}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card space-y-3 self-start">
        <h2 className="text-lg font-semibold">Add a farm</h2>
        <Field id="farm-name" label="Farm name" error={errors.name?.message}><input id="farm-name" className="input" {...register('name', { required: 'Enter a farm name' })} /></Field>
        <Field id="farm-location" label="Location"><input id="farm-location" className="input" {...register('location')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field id="farm-lat" label="Latitude (for weather)" error={errors.latitude?.message}><input id="farm-lat" type="number" step="any" className="input" {...register('latitude', { min: { value: -90, message: '-90 to 90' }, max: { value: 90, message: '-90 to 90' } })} /></Field>
          <Field id="farm-lon" label="Longitude" error={errors.longitude?.message}><input id="farm-lon" type="number" step="any" className="input" {...register('longitude', { min: { value: -180, message: '-180 to 180' }, max: { value: 180, message: '-180 to 180' } })} /></Field>
        </div>
        <button type="button" onClick={fillFromDevice} className="btn-outline w-full"><MapPin className="h-4 w-4" aria-hidden="true" /> Use my current location</button>
        <div className="grid grid-cols-2 gap-3">
          <Field id="farm-area" label="Land area" error={errors.area?.message}>
            <input id="farm-area" type="number" step="any" className="input" {...register('area', { required: 'Enter the area', min: { value: 0.01, message: 'Must be above zero' } })} />
          </Field>
          <Field id="farm-unit" label="Unit">
            <select id="farm-unit" className="input" {...register('unit')}>{['acre', 'hectare', 'sqm', 'sqft', 'bigha'].map((u) => <option key={u}>{u}</option>)}</select>
          </Field>
        </div>
        <Field id="farm-soil" label="Soil type"><select id="farm-soil" className="input capitalize" {...register('soilType')}>{SOILS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field id="farm-irr" label="Irrigation method"><select id="farm-irr" className="input capitalize" {...register('irrigationMethod')}>{IRRIGATION.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field id="farm-water" label="Water source"><input id="farm-water" className="input" {...register('waterSource')} /></Field>
        <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save farm'}</button>
      </form>
    </div>
  );
}
