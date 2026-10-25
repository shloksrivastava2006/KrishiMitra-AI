import { Link } from 'react-router-dom';
import { Landmark } from 'lucide-react';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

// Shown to a farmer who has not saved a UPI ID or bank account yet. Nothing for sellers (they add theirs in the seller profile) or once saved.
export default function PayoutPrompt() {
  const { t } = useI18n(); const { user } = useAuth();
  if (user?.role !== 'farmer' || user.payout?.hasAny) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold bg-gold-light/60 p-3 text-sm">
      <p className="flex items-center gap-2"><Landmark className="h-4 w-4 shrink-0 text-forest" aria-hidden="true" />{t('payout.prompt')}</p>
      <Link to="/my-payout" className="btn-primary px-3 py-1.5">{t('payout.addNow')}</Link>
    </div>
  );
}
