import { errorInfo } from '../../services/api.js';

// Only ever send the user to a path inside this site; never back to the auth pages themselves.
export const safeReturnPath = (location) => {
  const from = location.state?.from;
  const path = from?.pathname;
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || ['/login', '/register', '/forgot-password'].includes(path)) return '/';
  return `${path}${from.search || ''}`;
};

export const authErrorText = (err, t) => {
  const info = errorInfo(err);
  if (info.network) return t('auth.cannotReach');
  if (info.status === 401) return t('auth.invalidCredentials');
  if (info.status === 403) return info.message;   // wrong tab: the server says which tab to use
  return info.message; // validation text from the server (English)
};

// Where to go after signing in when nobody asked for a specific page.
export const homeFor = (user) => ({ vendor: '/seller', customer: '/customer', admin: '/admin' }[user?.role] || '/');
// The dashboard for each role (the home page stays at '/' for everyone).
export const dashboardFor = (user) => ({ farmer: '/my-overview', vendor: '/seller', customer: '/customer', admin: '/admin' }[user?.role] || null);
export const returnOrHome = (location, user) => {
  const back = safeReturnPath(location);
  return back === '/' ? homeFor(user) : back;
};

// Google/Apple failures: the server's own words are the useful ones ("not set up yet", "could not verify"); a 401 here is not a wrong password.
export const socialErrorText = (err, t) => {
  const info = errorInfo(err);
  if (info.network) return t('auth.cannotReach');
  return info.message || t('auth.socialFailed');
};

// For showing a name/email while a signup form is being filled in. DISPLAY ONLY: the server re-verifies the whole token.
export const decodeJwtPayload = (jwt) => {
  try {
    const b64 = String(jwt).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64.padEnd(Math.ceil(b64.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch { return {}; }
};
