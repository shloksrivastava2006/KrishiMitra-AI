import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Landmark, ShieldCheck } from 'lucide-react';
import api, { errorMessage } from '../../services/api.js';
import Field from '../../components/common/Field.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { Badge, ErrorBox, Loading, PageTitle, useFetch } from '../../components/common/ui.jsx';

// The farmer's UPI ID and bank account, used to send money such as online equipment rent.
// The account number is sent to the server once and only "ending 1234" ever comes back.
function PayoutForm({ saved, onSaved }) {
  const { t } = useI18n(); const { notify } = useToast(); const { setUser } = useAuth(); const [error, setError] = useState('');
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { upiId: saved.upiId || '', accountName: saved.accountName || '', accountNumber: '', confirmNumber: '', ifsc: saved.ifsc || '' },
  });
  const number = watch('accountNumber');
  const onSubmit = async (v) => {
    setError('');
    try {
      const { data } = await api.put('/payout', { upiId: v.upiId, accountName: v.accountName, accountNumber: v.accountNumber, ifsc: v.ifsc });
      setUser(data.data.user); notify(t('payout.saved')); onSaved(data.data.payout);
    } catch (e) { setError(errorMessage(e)); }
  };
  const remove = async () => {
    if (!window.confirm(t('payout.confirmRemove'))) return;
    setError('');
    try { const { data } = await api.delete('/payout'); setUser(data.data.user); notify(t('payout.removed')); onSaved(data.data.payout); } catch (e) { setError(errorMessage(e)); }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="card grid gap-4 sm:grid-cols-2">
      <h2 className="flex items-center gap-2 text-lg font-semibold sm:col-span-2"><Landmark className="h-5 w-5 text-forest" aria-hidden="true" />{t('payout.upiTitle')}</h2>
      <div className="sm:col-span-2">
        <Field id="po-upi" label={t('payout.upi')} error={errors.upiId && t('seller.errUpi')}>
          <input id="po-upi" className="input" autoComplete="off" placeholder="name@bank" {...register('upiId', { pattern: /^$|^[\w.-]{2,40}@[a-zA-Z]{2,30}$/ })} />
        </Field>
      </div>

      <h2 className="flex items-center gap-2 border-t border-earth/15 pt-4 text-lg font-semibold sm:col-span-2">{t('payout.bankTitle')}</h2>
      <Field id="po-name" label={t('payout.holder')} error={errors.accountName && t('payout.errHolder')}>
        <input id="po-name" className="input" autoComplete="off" {...register('accountName', { pattern: /^$|^[\p{L} .'-]{2,80}$/u })} />
      </Field>
      <Field id="po-ifsc" label={t('seller.ifsc')} error={errors.ifsc && t('seller.errIfsc')}>
        <input id="po-ifsc" className="input uppercase" autoComplete="off" maxLength={11} {...register('ifsc', { pattern: /^$|^[A-Za-z]{4}0[A-Za-z0-9]{6}$/ })} />
      </Field>
      <Field id="po-acc" label={`${t('seller.accountNumber')}${saved.accountLast4 ? ` (${t('seller.savedEnding', { n: saved.accountLast4 })})` : ''}`} error={errors.accountNumber && t('seller.errAccount')}>
        <input id="po-acc" inputMode="numeric" autoComplete="off" className="input" placeholder={saved.accountLast4 ? t('seller.leaveBlank') : ''} {...register('accountNumber', { pattern: /^$|^\d{9,18}$/ })} />
      </Field>
      <Field id="po-acc2" label={t('payout.confirmNumber')} error={errors.confirmNumber && t('payout.errMismatch')}>
        <input id="po-acc2" inputMode="numeric" autoComplete="off" className="input" {...register('confirmNumber', { validate: (v) => v === (number || '') })} />
      </Field>

      <p className="flex items-start gap-2 rounded-lg bg-leaf-light/60 p-3 text-xs text-ink/80 sm:col-span-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden="true" />{t('payout.privacy')}</p>
      <div className="sm:col-span-2"><ErrorBox>{error}</ErrorBox></div>
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={isSubmitting}>{isSubmitting ? t('market.saving') : t('market.save')}</button>
        {(saved.hasAny) && <button type="button" className="btn-outline text-red-700" onClick={remove}>{t('payout.remove')}</button>}
      </div>
    </form>
  );
}

export default function FarmerPayout() {
  const { t } = useI18n();
  const { data, error, loading } = useFetch('/payout');
  const [override, setOverride] = useState(null);
  if (loading) return <Loading />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const saved = override || data.payout;
  return (
    <div className="space-y-4">
      <PageTitle action={<Badge kind={saved.hasAny ? 'verified' : 'pending'} label={t(saved.hasAny ? 'payout.statusSaved' : 'payout.statusNone')} />}>{t('payout.title')}</PageTitle>
      <p className="max-w-2xl text-sm text-ink/75">{t('payout.intro')}</p>
      {/* Remount after a save so the saved values and the "ending 1234" hint refresh. */}
      <PayoutForm key={`${saved.updatedAt || 'new'}-${saved.accountLast4 || ''}-${saved.upiId || ''}`} saved={saved} onSaved={setOverride} />
    </div>
  );
}
