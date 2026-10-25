import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Field from '../../components/common/Field.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import api, { errorMessage } from '../../services/api.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from './AuthContext.jsx';
import PasswordInput from './PasswordInput.jsx';

const phoneOrEmail = /^(\S+@\S+\.\S+|[6-9]\d{9})$/;
const RESEND_SECONDS = 30;

// Step 1: type the email or mobile number and get an OTP. Step 2: type the OTP and a new password.
// The server answers step 1 the same way whether or not the account exists, so this page cannot be used to look people up.
export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const tab = location.state?.tab;

  if (user) return <Navigate to="/" replace />;

  const startTimer = () => {
    setWait(RESEND_SECONDS);
    const id = setInterval(() => setWait((w) => { if (w <= 1) { clearInterval(id); return 0; } return w - 1; }), 1000);
  };

  const requestCode = async (idRaw) => {
    const id = idRaw.trim().includes('@') ? idRaw.trim().toLowerCase() : idRaw.trim();
    setError('');
    try {
      await api.post('/auth/forgot-password/send', { identifier: id });
      setIdentifier(id); setStep(2); startTimer();
    } catch (err) { setError(errorMessage(err)); }
  };

  const reset = async ({ code, newPassword, confirmPassword }) => {
    setError('');
    try {
      await api.post('/auth/forgot-password/reset', { identifier, code: code.trim(), newPassword, confirmPassword });
      notify(t('auth.resetDone'));
      navigate('/login', { replace: true, state: { tab } });
    } catch (err) { setError(errorMessage(err)); }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-bold">{t('auth.forgotTitle')}</h1>

      {step === 1 ? (
        <form onSubmit={handleSubmit((v) => requestCode(v.identifier))} noValidate className="card mt-6 space-y-4">
          <p className="text-sm text-ink/70">{t('auth.forgotIntro')}</p>
          <Field id="fp-identifier" label={t('auth.identifier')} error={errors.identifier && t('auth.errIdentifier')}>
            <input id="fp-identifier" className="input" autoComplete="username" aria-invalid={Boolean(errors.identifier)}
              {...register('identifier', { required: true, pattern: phoneOrEmail })} />
          </Field>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? t('auth.wait') : t('auth.forgotSendCode')}</button>
        </form>
      ) : (
        <form onSubmit={handleSubmit(reset)} noValidate className="card mt-6 space-y-4">
          <p role="status" className="rounded-lg bg-leaf-light p-3 text-sm text-forest-dark">{t('auth.forgotSent', { to: identifier, min: 5 })}</p>
          <Field id="fp-code" label={t('auth.forgotCode')} error={errors.code && t('auth.errOtp')}>
            <input id="fp-code" className="input tracking-widest" inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-invalid={Boolean(errors.code)}
              {...register('code', { required: true, pattern: /^\d{6}$/ })} />
          </Field>
          <Field id="fp-new" label={t('auth.newPassword')} error={errors.newPassword && t('auth.errPasswordShort')}>
            <PasswordInput id="fp-new" autoComplete="new-password" {...register('newPassword', { required: true, minLength: 8 })} />
          </Field>
          <Field id="fp-confirm" label={t('auth.confirmPassword')} error={errors.confirmPassword && t('auth.errConfirm')}>
            <PasswordInput id="fp-confirm" autoComplete="new-password" {...register('confirmPassword', { required: true, validate: (v) => v === watch('newPassword') })} />
          </Field>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          <button className="btn-primary w-full" disabled={isSubmitting}>{isSubmitting ? t('auth.wait') : t('auth.resetPassword')}</button>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button type="button" className="font-semibold text-forest disabled:text-ink/40" disabled={wait > 0} onClick={() => requestCode(identifier)}>
              {wait > 0 ? t('auth.resendIn', { n: wait }) : t('auth.resendOtp')}
            </button>
            <button type="button" className="text-ink/70 underline" onClick={() => { setStep(1); setError(''); }}>{t('auth.changeIdentifier')}</button>
          </div>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-ink/70"><Link className="font-semibold text-forest" to="/login" state={{ tab }}>{t('auth.backToLogin')}</Link></p>
    </div>
  );
}
