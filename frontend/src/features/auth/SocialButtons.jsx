import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuthConfig } from './useAuthConfig.js';

const GOOGLE_SRC = 'https://accounts.google.com/gsi/client';
const APPLE_SRC = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';

const scripts = {};
const loadScript = (src) => (scripts[src] ||= new Promise((resolve, reject) => {
  const el = document.createElement('script');
  el.src = src; el.async = true; el.onload = resolve;
  el.onerror = () => { delete scripts[src]; reject(new Error('script blocked or offline')); };
  document.head.appendChild(el);
}));

// "Continue with Google / Apple". Each button shows only if the server has that provider switched on (GET /auth/config).
// The provider gives the browser a signed ID token; onToken({ provider, idToken, name? }) passes it to the page,
// which sends it to our server. The server verifies the signature, so nothing here is trusted.
export default function SocialButtons({ mode = 'login', onToken, disabled = false }) {
  const { t } = useI18n();
  const cfg = useAuthConfig();
  const googleBox = useRef(null);
  const handler = useRef(onToken);
  handler.current = onToken;
  const [error, setError] = useState('');
  const google = cfg?.google; const apple = cfg?.apple;

  useEffect(() => {
    if (!google || !googleBox.current) return undefined;
    let cancelled = false;
    loadScript(GOOGLE_SRC).then(() => {
      if (cancelled || !window.google?.accounts?.id) return;
      window.google.accounts.id.initialize({ client_id: google.clientId, callback: (r) => { if (r?.credential) handler.current({ provider: 'google', idToken: r.credential }); } });
      const width = Math.min(400, Math.max(200, Math.floor(googleBox.current.offsetWidth || 320)));
      window.google.accounts.id.renderButton(googleBox.current, { theme: 'outline', size: 'large', shape: 'rectangular', logo_alignment: 'left', width, text: mode === 'register' ? 'signup_with' : 'signin_with' });
    }).catch(() => { if (!cancelled) setError(t('auth.socialScript', { provider: 'Google' })); });
    return () => { cancelled = true; };
  }, [google?.clientId, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const appleSignIn = async () => {
    setError('');
    try {
      await loadScript(APPLE_SRC);
      window.AppleID.auth.init({ clientId: apple.clientId, scope: 'name email', redirectURI: apple.redirectUri || window.location.origin, usePopup: true });
      const r = await window.AppleID.auth.signIn();
      const idToken = r?.authorization?.id_token;
      if (!idToken) throw new Error('no token');
      // Apple sends the name only the very first time a person uses it with this app.
      const n = r.user?.name;
      handler.current({ provider: 'apple', idToken, name: n ? [n.firstName, n.lastName].filter(Boolean).join(' ') : '' });
    } catch (err) {
      if (err?.error === 'popup_closed_by_user' || err?.error === 'user_cancelled_authorize') return;   // the person changed their mind
      setError(err?.error ? t('auth.socialFailed') : t('auth.socialScript', { provider: 'Apple' }));
    }
  };

  if (!google && !apple) return null;
  return (
    <div className="mt-5">
      <div className="flex items-center gap-3 text-xs text-ink/50" aria-hidden="true"><span className="h-px flex-1 bg-earth/20" />{t(mode === 'register' ? 'auth.orSignUpWith' : 'auth.orLoginWith')}<span className="h-px flex-1 bg-earth/20" /></div>
      <div className={`mt-3 space-y-3 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
        {google && <div ref={googleBox} className="flex min-h-[44px] w-full justify-center" />}
        {apple && (
          <button type="button" onClick={appleSignIn} disabled={disabled}
            className="flex w-full items-center justify-center rounded-lg bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-black/85 disabled:opacity-60">
            {t(mode === 'register' ? 'auth.appleSignup' : 'auth.appleLogin')}
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    </div>
  );
}
