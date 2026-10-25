import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api.js';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useCart } from './CartContext.jsx';
import { inr } from './format.js';

export default function CartPage() {
  const { t } = useI18n(); const cart = useCart(); const { notify } = useToast();
  const [ready, setReady] = useState(false);

  // Refresh prices and stock from the server so the page never shows stale numbers; drop products that are gone.
  useEffect(() => {
    let live = true; const snapshot = cart.items;
    if (snapshot.length === 0) { setReady(true); return undefined; }
    Promise.allSettled(snapshot.map((i) => api.get(`/products/${i.id}`))).then((results) => {
      if (!live) return;
      const fresh = []; let dropped = false;
      results.forEach((r, idx) => {
        const old = snapshot[idx];
        if (r.status === 'fulfilled' && r.value.data.data.stock > 0) { const p = r.value.data.data; fresh.push({ ...old, price: p.price, stock: p.stock, name: p.name, codOnly: Boolean(p.codOnly), qty: Math.min(old.qty, p.stock) }); }
        else if (r.status === 'rejected' && !r.reason.response) fresh.push(old);   // server unreachable: keep the item
        else dropped = true;
      });
      cart.refresh(fresh); if (dropped) notify(t('market.cartChanged'), 'warn'); setReady(true);
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t('market.cartTitle')}</h1>
      {ready && cart.items.length === 0 ? (
        <div className="card mt-6"><p>{t('market.cartEmpty')}</p><Link to="/marketplace" className="btn-primary mt-4">{t('market.continueShopping')}</Link></div>
      ) : (
        <>
          <ul className="mt-6 space-y-3">
            {cart.items.map((i) => (
              <li key={i.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div><p className="font-semibold">{i.name}</p><p className="text-sm text-ink/60">{inr(i.price)} / {i.unit}{i.sellerName ? ` | ${t('market.soldBy', { name: i.sellerName })}` : ''}</p></div>
                <div className="flex items-center gap-3">
                  <label className="sr-only" htmlFor={`q-${i.id}`}>{t('market.qty')}</label>
                  <input id={`q-${i.id}`} type="number" min="1" max={i.stock} className="input w-24" value={i.qty} onChange={(e) => cart.setQty(i.id, e.target.value)} />
                  <p className="w-24 text-right font-medium">{inr(i.qty * i.price)}</p>
                  <button type="button" className="text-sm text-red-700" onClick={() => cart.remove(i.id)}>{t('market.remove')}</button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-ink/60">{t('market.oneSellerNote')}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xl font-bold">{t('market.total')}: {inr(cart.total)}</p>
            <div className="flex gap-3"><Link to="/marketplace" className="btn-outline">{t('market.continueShopping')}</Link><Link to="/checkout" className="btn-primary">{t('market.checkout')}</Link></div>
          </div>
        </>
      )}
    </div>
  );
}
