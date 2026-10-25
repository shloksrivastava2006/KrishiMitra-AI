import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { tokenStore } from '../../services/api.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useToast } from '../../components/common/Toast.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));
  const { lang, t } = useI18n();
  const { notify } = useToast();

  // Clears every piece of user-specific client state. Language and other public preferences are left alone.
  const clearSession = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  const logout = useCallback(async () => {
    // Revoke on the server first (bumps tokenVersion, so a copied token stops working), then clear locally.
    // If the server is unreachable we still log out locally.
    try { if (tokenStore.get()) await api.post('/auth/logout'); } catch { /* local logout still proceeds */ }
    clearSession();
  }, [clearSession]);

  // Restore the session on page load by asking the server who the token belongs to.
  useEffect(() => {
    if (!tokenStore.get()) return;
    api.get('/auth/me')
      .then((res) => setUser(res.data.data.user))
      .catch((err) => { if (err.response) clearSession(); }) // keep the token if the server was merely unreachable
      .finally(() => setLoading(false));
  }, [clearSession]);

  useEffect(() => {
    const onExpired = () => { setUser(null); notify(t('auth.sessionExpired'), 'warn'); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [notify, t]);

  // Keep the saved account language in step with the language chosen in the UI.
  useEffect(() => {
    if (!user || user.language === lang) return;
    api.patch('/auth/language', { language: lang }).then((res) => setUser(res.data.data.user)).catch(() => {});
  }, [lang, user]);

  const authenticate = async (path, payload, remember = true) => {
    const res = await api.post(`/auth/${path}`, payload);
    // Admin sessions never outlive the tab, even if "keep me logged in" were ticked.
    tokenStore.set(res.data.data.token, path === 'admin/login' ? false : remember);
    setUser(res.data.data.user);
    return res.data.data.user;
  };

  const value = useMemo(() => ({
    user, loading, logout, setUser,
    isAdmin: user?.role === 'admin',
    isSeller: user?.role === 'vendor',
    adminLogin: ({ remember, ...payload }) => authenticate('admin/login', payload, remember),
    registerSeller: (payload) => authenticate('register-seller', payload, true),
    registerCustomer: (payload) => authenticate('register-customer', payload, true),
    login: ({ remember, ...payload }) => authenticate('login', payload, remember),
    // Google / Apple: { provider, idToken, portal } to log in; the same plus optional phone, consent... to sign up.
    socialLogin: ({ remember, ...payload }) => authenticate('social/login', payload, remember),
    socialRegister: (payload) => authenticate('social/register', payload, true),
    register: (payload) => authenticate('register', payload, true),
  }), [user, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
