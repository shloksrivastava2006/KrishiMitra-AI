import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext.jsx';
import { useI18n } from '../i18n/I18nProvider.jsx';

// UI convenience only. The backend enforces the real permission check on every API call.
// While the session is being restored we render only a loading note, so no private content flashes
// and a valid URL is never lost to a premature redirect.
export default function ProtectedRoute({ allowedRoles }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  if (loading) return <p className="p-8 text-center text-ink/60" role="status">{t('auth.loadingAccount')}</p>;
  // Admin-only pages send signed-out visitors to the private admin login, never to the public one.
  const adminOnly = allowedRoles?.length === 1 && allowedRoles[0] === 'admin';
  if (!user) return <Navigate to={adminOnly ? '/admin/login' : '/login'} state={{ from: location, tab: allowedRoles?.includes('vendor') ? 'seller' : allowedRoles?.length === 1 && allowedRoles[0] === 'customer' ? 'customer' : undefined }} replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-3xl font-bold">{t('access.deniedTitle')}</h1>
        <p className="mt-3 text-ink/70">{t('access.deniedText')}</p>
        <Link to="/" className="btn-primary mt-6">{t('access.backToSite')}</Link>
      </div>
    );
  }
  return <Outlet />;
}
