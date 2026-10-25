import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { assetUrl } from '../../services/api.js';
import SmartImage from '../../components/common/SmartImage.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { catKey, inr, placeholderFor } from '../market/format.js';
import { useAddToCart } from '../market/useAddToCart.js';

// The newest approved listings, exactly as sellers entered them. Prices and discounts are the sellers' own.
// There are no star ratings here: the list does not carry any, so none are shown.
function MiniCard({ p }) {
  const { t } = useI18n(); const addToCart = useAddToCart();
  const [folder, name] = placeholderFor(p.category);
  return (
    <li className="card relative flex flex-col overflow-hidden p-0">
      {p.discountPercent > 0 && <span className="absolute left-2 top-2 z-10 rounded bg-forest px-2 py-0.5 text-[11px] font-semibold text-white">{t('shop.off', { n: p.discountPercent })}</span>}
      <Link to={`/marketplace/${p.id}`} className="block">
        {p.images?.[0] ? <img src={assetUrl(p.images[0])} alt="" loading="lazy" className="h-32 w-full object-cover" /> : <SmartImage folder={folder} name={name} alt="" className="h-32 w-full" />}
      </Link>
      <div className="flex flex-1 flex-col p-3 text-sm">
        <p className="text-[11px] text-ink/55">{t(catKey(p.category))}</p>
        <Link to={`/marketplace/${p.id}`} className="font-semibold leading-snug hover:text-forest">{p.name}</Link>
        <p className="mt-1 font-bold text-forest">{inr(p.price)} <span className="text-xs font-normal text-ink/60">{t('market.perUnit', { unit: p.unit })}</span></p>
        {p.discountPercent > 0 && <p className="text-xs text-ink/50 line-through">{inr(p.listPrice)}</p>}
        <p className="truncate text-xs text-ink/55">{p.sellerName ? t('market.soldBy', { name: p.sellerName }) : ''}</p>
        <div className="mt-auto pt-2">
          {p.stock > 0 ? <button type="button" className="btn-outline w-full px-2 py-1.5 text-xs" onClick={() => addToCart(p)}>{t('market.addToCart')}</button>
            : <p className="text-xs font-medium text-red-700">{t('market.outOfStock')}</p>}
        </div>
      </div>
    </li>
  );
}

export default function HomeProducts() {
  const { t } = useI18n();
  const [state, setState] = useState({ items: null, failed: false });
  useEffect(() => {
    let live = true;
    api.get('/products', { params: { page: 1 } })
      .then((r) => live && setState({ items: r.data.data.products.slice(0, 6), failed: false }))
      .catch(() => live && setState({ items: [], failed: true }));
    return () => { live = false; };
  }, []);
  const { items, failed } = state;
  return (
    <section aria-labelledby="home-latest">
      <div className="flex items-end justify-between gap-3">
        <h2 id="home-latest" className="text-xl font-bold">{t('shop.latestTitle')}</h2>
        <Link to="/marketplace" className="text-sm font-semibold text-forest hover:underline">{t('shop.latestAll')} →</Link>
      </div>
      {items && items.length === 0 && (
        <p className="mt-4 rounded-xl border border-earth/15 bg-white p-5 text-sm text-ink/70">
          {failed ? t('shop.loadFail') : <>{t('shop.noProducts')} <Link to="/register" className="font-semibold text-forest hover:underline">{t('shop.noProductsCta')}</Link></>}
        </p>
      )}
      {items && items.length > 0 && <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">{items.map((p) => <MiniCard key={p.id} p={p} />)}</ul>}
    </section>
  );
}
