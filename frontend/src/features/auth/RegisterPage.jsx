import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Field from '../../components/common/Field.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { LANGUAGES, useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from './AuthContext.jsx';
import OtpVerify from './OtpVerify.jsx';
import PasswordInput from './PasswordInput.jsx';
import SocialButtons from './SocialButtons.jsx';
import { authErrorText, decodeJwtPayload, homeFor, returnOrHome, safeReturnPath, socialErrorText } from './authHelpers.js';

const EMAIL = /^\S+@\S+\.\S+$/;
const PROVIDER_NAME = { google: 'Google', apple: 'Apple' };

// One signup page for farmers, sellers and customers. The server decides the role from the endpoint used; there is no role field to tamper with.
export default function RegisterPage() {
  const { t, lang, setLang } = useI18n();
  const { user, register: registerUser, registerSeller, registerCustomer, socialRegister } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(['seller', 'customer'].includes(location.state?.tab) ? location.state.tab : 'farmer');
  const [serverError, setServerError] = useState('');
  // Email OTP is compulsory; the mobile number is optional and has no OTP. The "proof" is the signed receipt the server gave after the right code.
  const [emailProof, setEmailProof] = useState('');
  // Set when the person came through Google or Apple: { provider, idToken, email, name }. Their email is then already verified.
  const [social, setSocial] = useState(location.state?.social || null);
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { language: lang, consent: false, name: location.state?.social?.name || '', email: location.state?.social?.email || '' } });
  const emailValue = (watch('email') || '').trim().toLowerCase();
  const seller = tab === 'seller';
  const customer = tab === 'customer';

  if (user) return <Navigate to="/" replace />;

  const onSocialToken = ({ provider, idToken, name }) => {
    const p = decodeJwtPayload(idToken);   // only to pre-fill the form; the server verifies the token again
    setSocial({ provider, idToken, email: p.email, name: name || p.name });
    if (name || p.name) setValue('name', name || p.name);
    if (p.email) setValue('email', p.email);
    setEmailProof(''); setServerError('');
  };
  const clearSocial = () => { setSocial(null); setValue('email', ''); setServerError(''); };

  const onSubmit = async (v) => {
    setServerError('');
    if (!social && !emailProof) { setServerError(t('auth.emailVerifyNeeded')); return; }
    try {
      const sellerExtra = seller ? { shopName: v.shopName.trim(), address: v.address.trim(), village: v.village?.trim() || undefined, district: v.district.trim(), state: v.state.trim(),
        pincode: v.pincode.trim(), licenceNumber: v.licenceNumber?.trim() || undefined, upiId: v.upiId?.trim() || undefined,
        bankAccountName: v.bankAccountName?.trim() || undefined, bankAccountNumber: v.bankAccountNumber?.trim() || undefined, bankIfsc: v.bankIfsc?.trim() || undefined } : {};
      let u;
      if (social) {
        // Google / Apple: the server takes the email from the verified token, so there is no password and no email OTP.
        u = await socialRegister({ provider: social.provider, idToken: social.idToken, portal: tab, name: v.name.trim(), phone: v.phone?.trim() || undefined,
          language: v.language, consent: v.consent, ...sellerExtra });
      } else {
        const base = { name: v.name.trim(), email: v.email.trim(), phone: v.phone?.trim() || undefined, emailProof, password: v.password, confirmPassword: v.confirmPassword, language: v.language, consent: v.consent };
        u = seller ? await registerSeller({ ...base, ...sellerExtra }) : await (customer ? registerCustomer(base) : registerUser(base));
      }
      notify(t('auth.registerSuccess', { name: u.name.split(' ')[0] }));
      navigate(seller ? homeFor(u) : customer ? returnOrHome(location, u) : safeReturnPath(location), { replace: true });
    } catch (err) {
      // An expired or rejected Google/Apple token: start that part again instead of looping on the same error.
      if (social && err.response?.status === 401) { setServerError(socialErrorText(err, t)); setSocial(null); return; }
      setServerError(social ? socialErrorText(err, t) : authErrorText(err, t));
    }
  };
  const req = (key) => errors[key] && t('seller.errRequired');

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <h1 className="text-3xl font-bold">{t('auth.registerTitle')}</h1>
      <div role="tablist" aria-label={t('auth.registerTitle')} className="mt-6 grid grid-cols-3 rounded-lg bg-leaf-light p-1 text-sm font-semibold">
        {['farmer', 'seller', 'customer'].map((key) => (
          <button key={key} role="tab" type="button" aria-selected={tab === key} onClick={() => { setTab(key); setServerError(''); }}
            className={`rounded-md px-3 py-2 ${tab === key ? 'bg-white text-forest shadow-sm' : 'text-ink/60'}`}>
            {t(`auth.register${key[0].toUpperCase()}${key.slice(1)}`)}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink/60">{t(`auth.${tab}OnlyNote`)}</p>
      {location.state?.social && social && <p role="status" className="mt-3 rounded-lg bg-gold-light p-3 text-sm text-forest-dark">{t('auth.socialNoAccount')}</p>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field id="name" label={t('auth.fullName')} error={errors.name && t('auth.errName')}>
          <input id="name" className="input" autoComplete="name" {...register('name', { required: true, minLength: 2 })} />
        </Field></div>
        <Field id="email" label={social ? t('auth.emailFromProvider', { provider: PROVIDER_NAME[social.provider] }) : t('auth.email')} error={errors.email && t('auth.errEmail')}>
          <input id="email" type="email" className={`input ${social ? 'bg-ink/5' : ''}`} autoComplete="email" readOnly={Boolean(social)} {...register('email', { required: true, pattern: EMAIL })} />
          {!social && <OtpVerify channel="email" target={emailValue} valid={EMAIL.test(emailValue)} proof={emailProof} onProof={setEmailProof} hint={t('auth.emailOtpHint')} />}
        </Field>
        <Field id="phone" label={t('auth.phone')} error={errors.phone && t('auth.errPhone')}>
          <input id="phone" className="input" inputMode="numeric" autoComplete="tel" maxLength={10} {...register('phone', { pattern: /^$|^[6-9]\d{9}$/ })} />
        </Field>

        {seller && (
          <>
            <h2 className="text-lg font-semibold sm:col-span-2">{t('seller.businessDetails')}</h2>
            <div className="sm:col-span-2"><Field id="shopName" label={t('seller.shopName')} error={req('shopName')}><input id="shopName" className="input" {...register('shopName', { required: true, minLength: 2 })} /></Field></div>
            <div className="sm:col-span-2"><Field id="address" label={t('seller.address')} error={req('address')}><input id="address" className="input" autoComplete="street-address" {...register('address', { required: true, minLength: 5 })} /></Field></div>
            <Field id="village" label={t('market.village')}><input id="village" className="input" {...register('village')} /></Field>
            <Field id="district" label={t('market.district')} error={req('district')}><input id="district" className="input" {...register('district', { required: true })} /></Field>
            <Field id="state" label={t('market.state')} error={req('state')}><input id="state" className="input" {...register('state', { required: true })} /></Field>
            <Field id="pincode" label={t('seller.pincode')} error={errors.pincode && t('seller.errPincode')}><input id="pincode" inputMode="numeric" className="input" {...register('pincode', { required: true, pattern: /^[1-9]\d{5}$/ })} /></Field>
            <div className="sm:col-span-2">
              <Field id="licenceNumber" label={t('seller.licence')}><input id="licenceNumber" className="input" {...register('licenceNumber')} /></Field>
              <p className="mt-1 text-xs text-ink/60">{t('seller.licenceHelp')}</p>
            </div>
            <h2 className="text-lg font-semibold sm:col-span-2">{t('seller.payoutDetails')}</h2>
            <p className="-mt-2 text-xs text-ink/60 sm:col-span-2">{t('seller.payoutHelp')}</p>
            <Field id="upiId" label={t('seller.upi')} error={errors.upiId && t('seller.errUpi')}><input id="upiId" className="input" placeholder="name@bank" {...register('upiId', { pattern: /^$|^[\w.-]{2,40}@[a-zA-Z]{2,30}$/ })} /></Field>
            <Field id="bankAccountName" label={t('seller.accountName')}><input id="bankAccountName" className="input" {...register('bankAccountName')} /></Field>
            <Field id="bankAccountNumber" label={t('seller.accountNumber')} error={errors.bankAccountNumber && t('seller.errAccount')}><input id="bankAccountNumber" inputMode="numeric" autoComplete="off" className="input" {...register('bankAccountNumber', { pattern: /^$|^\d{9,18}$/ })} /></Field>
            <Field id="bankIfsc" label={t('seller.ifsc')} error={errors.bankIfsc && t('seller.errIfsc')}><input id="bankIfsc" className="input uppercase" {...register('bankIfsc', { pattern: /^$|^[A-Za-z]{4}0[A-Za-z0-9]{6}$/ })} /></Field>
            <h2 className="text-lg font-semibold sm:col-span-2">{t('seller.accountSecurity')}</h2>
          </>
        )}

        {social ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-leaf-light p-3 text-sm sm:col-span-2">
            <span>{t('auth.socialSignupAs', { provider: PROVIDER_NAME[social.provider], email: social.email || emailValue })}</span>
            <button type="button" className="font-semibold text-forest underline" onClick={clearSocial}>{t('auth.socialUseEmail')}</button>
          </div>
        ) : (
          <>
            <Field id="password" label={t('auth.password')} error={errors.password && t('auth.errPasswordShort')}>
              <PasswordInput id="password" autoComplete="new-password" {...register('password', { required: true, minLength: 8 })} />
            </Field>
            <Field id="confirmPassword" label={t('auth.confirmPassword')} error={errors.confirmPassword && t('auth.errConfirm')}>
              <PasswordInput id="confirmPassword" autoComplete="new-password" {...register('confirmPassword', { required: true, validate: (v) => v === watch('password') })} />
            </Field>
          </>
        )}
        <div className="sm:col-span-2"><Field id="language" label={t('auth.language')}>
          <select id="language" className="input" {...register('language', { onChange: (e) => setLang(e.target.value) })}>
            {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </Field></div>
        <div className="sm:col-span-2">
          <label className="flex items-start gap-2 text-sm text-ink/80">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-forest" {...register('consent', { required: true })} />
            <span>{t('auth.consent')}</span>
          </label>
          {errors.consent && <p role="alert" className="field-error">{t('auth.errConsent')}</p>}
        </div>
        {serverError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800 sm:col-span-2">{serverError}</p>}
        <button className="btn-primary w-full sm:col-span-2" disabled={isSubmitting}>{isSubmitting ? t('auth.wait') : t(seller ? 'auth.submitSeller' : customer ? 'auth.submitCustomer' : 'auth.submitRegister')}</button>
        {!social && <div className="sm:col-span-2"><SocialButtons mode="register" onToken={onSocialToken} disabled={isSubmitting} /></div>}
      </form>
      <p className="mt-4 text-center text-sm text-ink/70">
        {t('auth.haveAccount')} <Link className="font-semibold text-forest" to="/login" state={{ ...location.state, tab }}>{t('auth.submitLogin')}</Link>
      </p>
    </div>
  );
}
