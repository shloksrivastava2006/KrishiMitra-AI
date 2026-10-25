import { Link } from 'react-router-dom';
import { assetUrl } from '../../services/api.js';
import SmartImage from '../../components/common/SmartImage.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { catKey, inr, placeholderFor } from './format.js';
import { useAddToCart } from './useAddToCart.js';

export default function ProductCard({ p }) {
  const { t } = useI18n(); const addToCart = useAddToCart();
  const [folder, name] = placeholderFor(p.category);
  return (
    <li className="card flex flex-col overflow-hidden p-0">
      <Link to={`/marketplace/${p.id}`}>{p.images?.[0] ? <img src={assetUrl(p.images[0])} alt="" loading="lazy" className="h-36 w-full object-cover" /> : <SmartImage folder={folder} name={name} alt="" className="h-36 w-full" />}</Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs text-ink/60">{t(catKey(p.category))}{p.variety ? ` | ${p.variety}` : ''}</p>
        <Link to={`/marketplace/${p.id}`} className="font-semibold hover:text-forest">{p.name}</Link>
        <p className="mt-1 font-display text-xl font-bold text-forest">{inr(p.price)} <span className="text-sm font-normal text-ink/60">{t('market.perUnit', { unit: p.unit })}</span>{p.discountPercent > 0 && <span className="ml-2 text-xs font-normal text-ink/50"><s>{inr(p.listPrice)}</s> {t('seller.offPercent', { n: p.discountPercent })}</span>}</p>
        {(p.organic || p.grade) && <p className="mt-1 flex flex-wrap gap-1.5">{p.organic && <span className="rounded-full bg-leaf-light px-2 py-0.5 text-xs font-medium text-forest">{t('market.organic')}</span>}{p.grade && <span className="rounded-full bg-earth-light px-2 py-0.5 text-xs">{t('market.gradeLabel', { g: p.grade })}</span>}</p>}
        <p className="text-xs text-ink/60">{p.sellerName ? t('market.soldBy', { name: p.sellerName }) : ''}{p.district ? ` | ${p.district}` : ''}</p>
        <div className="mt-auto pt-3">
          {p.stock > 0 ? <button type="button" className="btn-primary w-full" onClick={() => addToCart(p)}>{t('market.addToCart')}</button>
            : <p className="text-sm font-medium text-red-700">{t('market.outOfStock')}</p>}
        </div>
      </div>
    </li>
  );
}
