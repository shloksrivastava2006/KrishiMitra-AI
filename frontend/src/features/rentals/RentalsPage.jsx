import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import api, { assetUrl, errorMessage } from '../../services/api.js';
import SmartImage from '../../components/common/SmartImage.jsx';
import Field from '../../components/common/Field.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { inr } from '../market/format.js';
import { Empty, ErrorBox, Loading, useFetch } from '../../components/common/ui.jsx';

const TYPES = ['tractor', 'rotavator', 'seed-drill', 'harvester', 'sprayer', 'water-pump', 'other'];
const picture = (r) => (r.type === 'tractor' ? 'tractor' : r.type === 'rotavator' ? 'rotavator' : r.type === 'sprayer' ? 'sprayer' : 'solar-pump');
const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
const place = (r) => [r.village, r.district, r.state].filter(Boolean).join(', ') + (r.pincode ? ` - ${r.pincode}` : '');

function BookForm({ r, onDone }) {
  const { t } = useI18n(); const { notify } = useToast(); const [error, setError] = useState('');
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues: { rateType: r.daily ? 'day' : 'hour', paymentMethod: 'pay_at_pickup' } });
  const rate = watch('rateType'); const [s, e] = [watch('start'), watch('end')]; const pay = watch('paymentMethod');
  // Shown as an estimate only. The server calculates the real amount again.
  const hours = s && e && new Date(e) > new Date(s) ? Math.ceil((new Date(e) - new Date(s)) / 3600000) : 0;
  const estimate = hours ? (rate === 'hour' ? hours * (r.hourly || 0) : Math.ceil(hours / 24) * (r.daily || 0)) : 0;
  const onSubmit = async (v) => {
    setError('');
    try {
      await api.post(`/rentals/${r.id}/book`, { start: new Date(v.start).toISOString(), end: new Date(v.end).toISOString(), rateType: v.rateType, note: v.note, paymentMethod: v.paymentMethod });
      notify(t('rentals.requested')); onDone();
    } catch (err) { setError(errorMessage(err)); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-3 grid gap-3 border-t border-earth/10 pt-3 sm:grid-cols-2">
      <p className="rounded-lg bg-gold-light/60 p-3 text-xs text-ink/80 sm:col-span-2"><MapPin className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />{t('rentals.fixedPlace')}</p>
      <Field id={`s-${r.id}`} label={t('rentals.start')} error={errors.start && t('seller.errRequired')}><input id={`s-${r.id}`} type="datetime-local" className="input" {...register('start', { required: true })} /></Field>
      <Field id={`e-${r.id}`} label={t('rentals.end')} error={errors.end && t('seller.errRequired')}><input id={`e-${r.id}`} type="datetime-local" className="input" {...register('end', { required: true })} /></Field>
      <Field id={`t-${r.id}`} label={t('rentals.rateType')}><select id={`t-${r.id}`} className="input" {...register('rateType')}>{r.hourly && <option value="hour">{t('rentals.byHour')}</option>}{r.daily && <option value="day">{t('rentals.byDay')}</option>}</select></Field>
      <Field id={`n-${r.id}`} label={t('rentals.note')}><input id={`n-${r.id}`} className="input" maxLength={300} {...register('note')} /></Field>
      <fieldset className="sm:col-span-2">
        <legend className="label">{t('rentals.payHow')}</legend>
        <div className="mt-1 grid gap-2 sm:grid-cols-2">
          <label className={`flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm ${pay === 'pay_at_pickup' ? 'border-forest bg-leaf-light/50' : 'border-earth/20'}`}>
            <input type="radio" value="pay_at_pickup" className="mt-1" {...register('paymentMethod')} /><span><strong>{t('rentals.payPickup')}</strong><br /><span className="text-xs text-ink/70">{t('rentals.payPickupHelp')}</span></span>
          </label>
          <label className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${r.onlineOk ? 'cursor-pointer' : 'cursor-not-allowed opacity-55'} ${pay === 'online' ? 'border-forest bg-leaf-light/50' : 'border-earth/20'}`}>
            <input type="radio" value="online" disabled={!r.onlineOk} className="mt-1" {...register('paymentMethod')} /><span><strong>{t('rentals.payOnline')}</strong><br /><span className="text-xs text-ink/70">{r.onlineOk ? t('rentals.payOnlineHelp') : t('rentals.onlineOff')}</span></span>
          </label>
        </div>
      </fieldset>
      {estimate > 0 && <p className="text-sm sm:col-span-2">{t('rentals.estimate')}: <strong>{inr(estimate)}</strong>{r.deposit ? <span className="block text-xs text-ink/70">{t('rentals.depositInHand', { amount: inr(r.deposit) })}</span> : null}</p>}
      <div className="sm:col-span-2"><ErrorBox>{error}</ErrorBox></div>
      <div className="sm:col-span-2"><button className="btn-primary" disabled={isSubmitting}>{isSubmitting ? t('auth.wait') : t('rentals.request')}</button></div>
    </form>
  );
}

export default function RentalsPage() {
  const { t } = useI18n(); const { user } = useAuth(); const navigate = useNavigate(); const location = useLocation();
  const [f, setF] = useState({ state: '', district: '', pincode: '', type: '', q: '' });
  const [applied, setApplied] = useState(f);
  const [open, setOpen] = useState(null); const [hint, setHint] = useState('');
  // Dropdown choices apply at once; typed boxes wait a moment so each key press does not search.
  useEffect(() => { const id = setTimeout(() => setApplied(f), 300); return () => clearTimeout(id); }, [f]);
  const qs = useMemo(() => { const p = new URLSearchParams(); Object.entries(applied).forEach(([k, v]) => { if (v && !(k === 'pincode' && !/^[1-9]\d{5}$/.test(v))) p.set(k, v.trim()); }); return p.toString(); }, [applied]);
  const { data, error, loading } = useFetch(`/rentals${qs ? `?${qs}` : ''}`);
  const locs = useFetch('/rentals/locations').data || [];
  const states = [...new Map(locs.map((l) => [l.state.toLowerCase(), l.state])).values()].sort();
  const districts = [...new Map(locs.filter((l) => !f.state || same(l.state, f.state)).map((l) => [l.district.toLowerCase(), l.district])).values()].sort();
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value, ...(k === 'state' ? { district: '' } : {}) }));
  const useMine = () => {
    setHint('');
    if (!user?.state && !user?.district) return setHint(t(user ? 'rentals.noProfileLocation' : 'rentals.loginForLocation'));
    const pick = (list, v) => list.find((x) => same(x, v)) || v || '';
    setF((x) => ({ ...x, state: pick(states, user.state), district: pick(districts, user.district) }));
  };
  const clear = () => { setF({ state: '', district: '', pincode: '', type: '', q: '' }); setHint(''); };
  const filtered = Object.values(f).some(Boolean);
  const book = (r) => { if (!user) return navigate('/login', { state: { from: location } }); setOpen(open === r.id ? null : r.id); };
  const map = (r) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([r.village, r.district, r.state, r.pincode].filter(Boolean).join(' '))}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t('rentals.title')}</h1>
      <p className="mt-2 max-w-2xl text-ink/70">{t('rentals.intro')}</p>
      <p className="mt-2 max-w-3xl rounded-lg bg-gold-light/60 p-3 text-xs text-ink/80">{t('rentals.fixedPlace')} {t('seller.rentalPaymentNote')}</p>

      <section aria-label={t('rentals.findNear')} className="card mt-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-semibold lg:col-span-2">{t('rentals.searchName')}
          <span className="relative mt-1 block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/50" aria-hidden="true" /><input className="input pl-9 font-normal" value={f.q} onChange={set('q')} maxLength={60} /></span></label>
        <label className="text-xs font-semibold">{t('rentals.state')}<select className="input mt-1 font-normal" value={f.state} onChange={set('state')}><option value="">{t('rentals.allStates')}</option>{states.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="text-xs font-semibold">{t('rentals.district')}<select className="input mt-1 font-normal" value={f.district} onChange={set('district')}><option value="">{t('rentals.allDistricts')}</option>{districts.map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="text-xs font-semibold">{t('rentals.pincode')}<input className="input mt-1 font-normal" inputMode="numeric" maxLength={6} value={f.pincode} onChange={(e) => setF({ ...f, pincode: e.target.value.replace(/\D/g, '') })} placeholder={t('rentals.pincodeHelp')} /></label>
        <label className="text-xs font-semibold">{t('seller.equipmentType')}<select className="input mt-1 font-normal" value={f.type} onChange={set('type')}><option value="">{t('rentals.allTypes')}</option>{TYPES.map((x) => <option key={x} value={x}>{t(`seller.eq_${x.replace(/-/g, '_')}`)}</option>)}</select></label>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-4">
          <button type="button" className="btn-outline inline-flex items-center gap-1.5 px-3 py-2" onClick={useMine}><MapPin className="h-4 w-4" aria-hidden="true" />{t('rentals.useMyLocation')}</button>
          {filtered && <button type="button" className="px-3 py-2 text-sm font-semibold text-forest underline" onClick={clear}>{t('rentals.clearFilters')}</button>}
          {hint && <span role="status" className="text-xs text-ink/70">{hint}</span>}
        </div>
      </section>

      <div className="mt-6"><ErrorBox>{error}</ErrorBox></div>
      {loading && <Loading />}
      {data?.length === 0 && <Empty>{filtered ? t('rentals.noneHere') : t('rentals.none')}</Empty>}
      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {(data || []).map((r) => (
          <li key={r.id} className="card overflow-hidden p-0">
            {r.images[0] ? <img src={assetUrl(r.images[0])} alt="" className="h-44 w-full object-cover" /> : <SmartImage folder="equipment" name={picture(r)} alt="" className="h-44 w-full" />}
            <div className="p-4 text-sm">
              <p className="text-xs text-ink/60">{t(`seller.eq_${r.type.replace(/-/g, '_')}`)}{r.near && <span className="ml-2 rounded-full bg-forest px-2 py-0.5 font-bold text-white">{t('rentals.nearYou')}</span>}</p>
              <h2 className="text-lg font-semibold">{r.name}</h2>
              <p className="mt-1 flex items-start gap-1 text-ink/80"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden="true" /><span>{place(r)} <a href={map(r)} target="_blank" rel="noreferrer" className="ml-1 font-semibold text-forest underline">{t('rentals.mapOpen')}</a></span></p>
              <p className="mt-1 font-display text-xl font-bold text-forest">{r.hourly ? `${inr(r.hourly)}/${t('seller.hr')} ` : ''}{r.daily ? `${inr(r.daily)}/${t('seller.day')}` : ''}</p>
              {r.deposit > 0 && <p className="text-ink/70">{t('seller.deposit')}: {inr(r.deposit)} <span className="text-xs">({t('rentals.depositHand')})</span></p>}
              <p className="mt-1 text-xs text-ink/70">{r.onlineOk ? t('rentals.payBoth') : t('rentals.payPickupOnly')}</p>
              {r.description && <p className="mt-2 text-ink/80">{r.description}</p>}
              {r.terms && <p className="mt-2 text-xs text-ink/60"><strong>{t('seller.rentalTerms')}:</strong> {r.terms}</p>}
              <p className="mt-2 text-xs text-ink/60">{t('market.soldBy', { name: r.ownerName })}</p>
              <button type="button" className="btn-primary mt-3" onClick={() => book(r)}>{t('rentals.request')}</button>
              {open === r.id && <BookForm r={r} onDone={() => { setOpen(null); navigate('/my-bookings'); }} />}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
