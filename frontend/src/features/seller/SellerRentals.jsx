import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api, { assetUrl, errorMessage } from '../../services/api.js';
import Field from '../../components/common/Field.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { inr } from '../market/format.js';
import { Badge, Empty, ErrorBox, ImagePicker, Loading, PageTitle, useFetch } from '../../components/common/ui.jsx';
import RentalTracker from '../rentals/RentalTracker.jsx';
import PayoutPrompt from '../farmer/PayoutPrompt.jsx';

export const EQUIPMENT_TYPES = ['tractor', 'rotavator', 'seed-drill', 'harvester', 'sprayer', 'water-pump', 'other'];
const blank = { name: '', type: '', description: '', hourly: '', daily: '', deposit: '', address: '', village: '', district: '', state: '', pincode: '', upiId: '', terms: '' };
const BOOKING_NEXT = { requested: [['confirmed', 'confirmBooking'], ['rejected', 'rejectBooking']], confirmed: [['handed_over', 'markHandedOver'], ['cancelled', 'cancelBooking']], handed_over: [['completed', 'markReturned']] };

export default function SellerRentals() {
  const { t } = useI18n(); const { notify } = useToast();
  const list = useFetch('/rentals/mine/list'); const bookings = useFetch('/rentals/mine/bookings');
  const [editing, setEditing] = useState(null); const [images, setImages] = useState([]); const [error, setError] = useState('');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({ defaultValues: blank });

  const startEdit = (r) => { setEditing(r.id); setImages(r.images); reset({ name: r.name, type: r.type, description: r.description || '', hourly: r.hourly ? String(r.hourly) : '', daily: r.daily ? String(r.daily) : '', deposit: r.deposit ? String(r.deposit) : '', address: r.address || '', village: r.village || '', district: r.district || '', state: r.state || '', pincode: r.pincode || '', upiId: r.upiId || '', terms: r.terms || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cancelEdit = () => { setEditing(null); setImages([]); reset(blank); };
  const onSubmit = async (v) => {
    setError('');
    if (!v.hourly && !v.daily) return setError(t('seller.errRate'));
    try {
      const body = { ...v, images }; if (editing) await api.put(`/rentals/${editing}`, body); else await api.post('/rentals', body);
      notify(t('seller.saved')); cancelEdit(); list.reload();
    } catch (e) { setError(errorMessage(e)); }
  };
  const act = async (fn) => { setError(''); try { await fn(); list.reload(); bookings.reload(); } catch (e) { setError(errorMessage(e)); } };

  return (
    <div className="space-y-6">
      <PageTitle>{t('seller.nav_rentals')}</PageTitle>
      <PayoutPrompt />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card grid gap-4 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">{t(editing ? 'seller.editEquipment' : 'seller.addEquipment')}</h2>
        <Field id="r-name" label={t('seller.equipmentName')} error={errors.name && t('auth.errName')}><input id="r-name" className="input" {...register('name', { required: true, minLength: 2 })} /></Field>
        <Field id="r-type" label={t('seller.equipmentType')} error={errors.type && t('seller.errRequired')}><select id="r-type" className="input" {...register('type', { required: true })}><option value="">-</option>{EQUIPMENT_TYPES.map((x) => <option key={x} value={x}>{t(`seller.eq_${x.replace(/-/g, '_')}`)}</option>)}</select></Field>
        <div className="sm:col-span-2"><Field id="r-desc" label={t('market.prodDescription')}><textarea id="r-desc" rows="2" className="input" {...register('description')} /></Field></div>
        <div className="sm:col-span-2"><span className="label">{t('seller.photos')}</span><ImagePicker value={images} onChange={setImages} /></div>
        <Field id="r-hr" label={t('seller.hourlyRent')}><input id="r-hr" inputMode="decimal" className="input" {...register('hourly', { pattern: /^$|^\d{1,7}(\.\d{1,2})?$/ })} /></Field>
        <Field id="r-day" label={t('seller.dailyRent')}><input id="r-day" inputMode="decimal" className="input" {...register('daily', { pattern: /^$|^\d{1,7}(\.\d{1,2})?$/ })} /></Field>
        <Field id="r-dep" label={t('seller.deposit')}><input id="r-dep" inputMode="decimal" className="input" {...register('deposit', { pattern: /^$|^\d{1,7}(\.\d{1,2})?$/ })} /></Field>
        <div />
        <div className="sm:col-span-2"><p className="rounded-lg bg-gold-light/60 p-3 text-xs text-ink/80">{t('rentals.ownerFixedPlace')}</p></div>
        <div className="sm:col-span-2"><Field id="r-address" label={t('rentals.fullAddress')} error={errors.address && t('seller.errRequired')}><input id="r-address" className="input" maxLength={200} {...register('address', { required: true, minLength: 5 })} /></Field></div>
        <Field id="r-village" label={t('rentals.village')}><input id="r-village" className="input" maxLength={80} {...register('village')} /></Field>
        <Field id="r-pincode" label={t('rentals.pincode')} error={errors.pincode && t('rentals.errPincode')}><input id="r-pincode" inputMode="numeric" maxLength={6} className="input" {...register('pincode', { required: true, pattern: /^[1-9]\d{5}$/ })} /></Field>
        <Field id="r-district" label={t('market.district')} error={errors.district && t('seller.errRequired')}><input id="r-district" className="input" {...register('district', { required: true })} /></Field>
        <Field id="r-state" label={t('market.state')} error={errors.state && t('seller.errRequired')}><input id="r-state" className="input" {...register('state', { required: true })} /></Field>
        <div className="sm:col-span-2"><Field id="r-upi" label={t('rentals.upiId')}><input id="r-upi" className="input" maxLength={80} placeholder="name@bank" {...register('upiId')} /></Field><p className="mt-1 text-xs text-ink/65">{t('rentals.upiHelp')}</p></div>
        <div className="sm:col-span-2"><Field id="r-terms" label={t('seller.rentalTerms')}><textarea id="r-terms" rows="2" className="input" {...register('terms')} /></Field></div>
        <div className="sm:col-span-2"><ErrorBox>{error}</ErrorBox></div>
        <div className="flex gap-3 sm:col-span-2"><button className="btn-primary" disabled={isSubmitting}>{isSubmitting ? t('market.saving') : t('market.save')}</button>{editing && <button type="button" className="btn-outline" onClick={cancelEdit}>{t('market.cancelEdit')}</button>}</div>
      </form>

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t('seller.myEquipment')}</h2>
        {list.loading && <Loading />}
        {list.data?.length === 0 && <Empty>{t('seller.noEquipment')}</Empty>}
        <ul className="space-y-3">
          {(list.data || []).map((r) => (
            <li key={r.id} className="card flex flex-wrap items-center gap-4 p-4 text-sm">
              {r.images[0] && <img src={assetUrl(r.images[0])} alt="" className="h-16 w-16 rounded-lg object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.name} <span className="font-normal text-ink/60">| {t(`seller.eq_${r.type.replace(/-/g, '_')}`)}</span></p>
                <p>{r.hourly ? `${inr(r.hourly)}/${t('seller.hr')} ` : ''}{r.daily ? `${inr(r.daily)}/${t('seller.day')}` : ''}{r.deposit ? ` | ${t('seller.deposit')}: ${inr(r.deposit)}` : ''}</p>
                {r.address ? <p className="text-xs text-ink/70">{r.address}, {[r.village, r.district, r.state].filter(Boolean).join(', ')} - {r.pincode}</p> : <p className="text-xs font-semibold text-red-700">{t('rentals.addAddress')}</p>}
                {r.blocked && <p className="text-red-700">{t('seller.blockedByAdmin')}</p>}
              </div>
              <Badge kind={r.active && !r.blocked ? 'approved' : 'inactive'} label={t(r.active && !r.blocked ? 'seller.available' : 'seller.unavailable')} />
              <div className="flex gap-2">
                <button type="button" className="btn-outline px-3 py-1.5" onClick={() => act(() => api.patch(`/rentals/${r.id}/active`, { active: !r.active }))}>{t(r.active ? 'seller.pause' : 'seller.resume')}</button>
                <button type="button" className="btn-outline px-3 py-1.5" onClick={() => startEdit(r)}>{t('market.edit')}</button>
                <button type="button" className="text-red-700" onClick={() => { if (window.confirm(t('market.confirmDelete'))) act(() => api.delete(`/rentals/${r.id}`)); }}>{t('market.delete')}</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">{t('seller.rentalRequests')}</h2>
        {bookings.data?.length === 0 && <Empty>{t('seller.noRequests')}</Empty>}
        <ul className="space-y-3">
          {(bookings.data || []).map((b) => (
            <li key={b.id} className="card space-y-1 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{b.rentalName}</p><Badge kind={b.status} label={t(`seller.bk_${b.status}`)} /></div>
              <RentalTracker b={b} owner />
              <p>{new Date(b.start).toLocaleString()} - {new Date(b.end).toLocaleString()} | {inr(b.amount)}{b.deposit ? ` + ${t('seller.deposit')} ${inr(b.deposit)}` : ''}</p>
              <p className="text-ink/70">{b.renterName}{b.renterPhone ? `, ${b.renterPhone}` : ''}{b.note ? ` | ${b.note}` : ''}</p>
              <p className="flex flex-wrap items-center gap-2 text-xs"><Badge kind={b.paymentStatus === 'pay_at_pickup' ? 'cod' : b.paymentStatus === 'paid' ? 'paid' : b.paymentStatus === 'unpaid' ? 'pending' : 'refund_due'} label={t(b.paymentMethod === 'online' ? `rentals.owner_online_${b.paymentStatus}` : 'rentals.owner_pickup')} />
                {b.status === 'confirmed' && b.paymentMethod === 'pay_at_pickup' && <span className="text-ink/70">{t('rentals.collectAtPickup', { rent: inr(b.amount), deposit: inr(b.deposit || 0) })}</span>}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {(BOOKING_NEXT[b.status] || []).map(([to, key]) => <button key={to} type="button" disabled={to === 'handed_over' && b.paymentStatus === 'unpaid'} title={to === 'handed_over' && b.paymentStatus === 'unpaid' ? t('rentals.waitingPayment') : undefined} className={to === 'rejected' || to === 'cancelled' ? 'btn-outline px-3 py-1.5' : 'btn-primary px-3 py-1.5 disabled:opacity-50'} onClick={() => act(() => api.patch(`/rentals/bookings/${b.id}/status`, { status: to }))}>{t(`seller.${key}`)}</button>)}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink/60">{t('seller.rentalPaymentNote')}</p>
      </div>
    </div>
  );
}
