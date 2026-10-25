import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import api, { errorMessage } from '../../services/api.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';

const COOLDOWN_SECONDS = 30;   // the server also enforces this

// "Send OTP" -> type the 6-digit code -> "Verified". On success it hands the parent a signed receipt (`proof`)
// that the signup form sends back to the server. The receipt is only good for the exact number/email it was made for.
export default function OtpVerify({ channel, target, valid, proof, onProof, hint }) {
  const { t } = useI18n();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [wait, setWait] = useState(0);
  const lastTarget = useRef(target);

  // Editing the number/email after sending or verifying starts over.
  useEffect(() => {
    if (lastTarget.current === target) return;
    lastTarget.current = target;
    setSent(false); setCode(''); setError(''); setWait(0);
    if (proof) onProof('');
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (wait <= 0) return undefined;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const send = async () => {
    setError(''); setBusy(true);
    try {
      await api.post('/auth/otp/send', { channel, target });
      setSent(true); setCode(''); setWait(COOLDOWN_SECONDS);
    } catch (err) {
      // 429 "please wait N seconds": a code was already sent a moment ago, so show the box to type it instead of hiding it.
      const m = err.response?.status === 429 && /wait (\d+) seconds/.exec(errorMessage(err) || '');
      if (m) { setSent(true); setWait(Number(m[1])); } else setError(errorMessage(err) || t('auth.otpDown'));
    } finally { setBusy(false); }
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code)) { setError(t('auth.errOtp')); return; }
    setError(''); setBusy(true);
    try {
      const res = await api.post('/auth/otp/verify', { channel, target, code });
      onProof(res.data.data.proof); setSent(false); setCode('');
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };

  if (proof) {
    return <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-forest"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {t('auth.verified')}</p>;
  }

  return (
    <div className="mt-2">
      {!sent ? (
        <>
          <button type="button" className="btn-outline px-3 py-1.5" disabled={!valid || busy} onClick={send}>{busy ? t('auth.wait') : t('auth.sendOtp')}</button>
          {hint && <p className="mt-1 text-xs text-ink/60">{hint}</p>}
        </>
      ) : (
        <div>
          <p className="text-xs text-ink/70">{t('auth.otpSentTo', { to: target })}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <input className="input w-36 tracking-widest" inputMode="numeric" autoComplete="one-time-code" maxLength={6} aria-label={t('auth.otpCode')} placeholder="______"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); verify(); } }} />
            <button type="button" className="btn-primary px-3 py-2" disabled={busy || code.length !== 6} onClick={verify}>{t('auth.verifyOtp')}</button>
            <button type="button" className="text-xs font-semibold text-forest disabled:text-ink/40" disabled={wait > 0 || busy} onClick={send}>
              {wait > 0 ? t('auth.resendIn', { n: wait }) : t('auth.resendOtp')}
            </button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="field-error">{error}</p>}
    </div>
  );
}
