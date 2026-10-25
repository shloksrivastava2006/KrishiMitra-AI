import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useCart } from './CartContext.jsx';

export function useAddToCart() {
  const { t } = useI18n(); const cart = useCart(); const { notify } = useToast();
  return (p, qty = 1) => {
    const other = cart.items[0] && cart.items[0].sellerId !== p.sellerId;
    if (other && !window.confirm(t('market.otherSeller'))) return false;
    cart.add(p, qty, Boolean(other)); notify(t('market.added')); return true;
  };
}
