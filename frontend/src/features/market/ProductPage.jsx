import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { assetUrl, errorMessage } from '../../services/api.js';
import SmartImage from '../../components/common/SmartImage.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { Stars } from '../seller/SellerReviews.jsx';
import { fmtDate } from '../../components/common/ui.jsx';
import { catKey, inr, placeholderFor } from './format.js';
import { useAddToCart } from './useAddToCart.js';

export default function ProductPage() {
  const { id } = useParams();
  const { t, lang } = useI18n(); const navigate = useNavigate(); const addToCart = useAddToCart();
  const [p, setP] = useState(null); const [error, setError] = useState(''); const [qty, setQty] = useState(1);
  useEffect(() => { api.get(`/products/${id}`).then((r) => { setP(r.data.data); setQty(r.data.data.minOrderQty || 1); }).catch((e) => setError(errorMessage(e))); }, [id]);
  if (error) return <div className="mx-auto max-w-3xl px-4 py-12"><p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p><Link to="/marketplace" className="btn-outline mt-4">{t('market.back')}</Link></div>;
  if (!p) return <p className="p-8 text-center text-ink/60">...</p>;
  return (
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-2">
      <Gallery p={p} />
      <div>
        <Link to="/marketplace" className="text-sm text-forest">{t('market.back')}</Link>
        <p className="mt-3 text-xs text-ink/60">{t(catKey(p.category))}</p>
        <h1 className="text-3xl font-bold">{p.name}</h1>
        <p className="mt-2 font-display text-3xl font-bold text-forest">{inr(p.price)} <span className="text-base font-normal text-ink/60">{t('market.perUnit', { unit: p.unit })}</span>{p.discountPercent > 0 && <span className="ml-3 text-base font-normal text-ink/50"><s>{inr(p.listPrice)}</s> {t('seller.offPercent', { n: p.discountPercent })}</span>}</p>
        {p.description && <p className="mt-4 whitespace-pre-line text-ink/80">{p.description}</p>}
        <dl className="mt-4 space-y-1 text-sm">
          {p.sellerName && <div><dt className="inline text-ink/60">{t('market.soldBy', { name: '' })}</dt> <dd className="inline font-medium">{p.sellerName}</dd></div>}
          {p.variety && <div><dt className="inline text-ink/60">{t('sell.variety')}: </dt><dd className="inline">{p.variety}</dd></div>}
          {p.harvestDate && <div><dt className="inline text-ink/60">{t('sell.harvestDate')}: </dt><dd className="inline">{fmtDate(p.harvestDate, lang)}{new Date(p.harvestDate) > new Date() ? ` (${t('sell.expectedTag')})` : ''}</dd></div>}
          {p.grade && <div><dt className="inline text-ink/60">{t('sell.grade')}: </dt><dd className="inline">{t(`sell.grade_${p.grade}`)}</dd></div>}
          {p.organic && <div><dd className="inline rounded-full bg-leaf-light px-2.5 py-0.5 text-xs font-medium text-forest">{t('market.organic')}</dd></div>}
          {(p.district || p.state) && <div><dt className="inline text-ink/60">{t('market.location')}: </dt><dd className="inline">{[p.village, p.district, p.state].filter(Boolean).join(', ')}</dd></div>}
          {p.minOrderQty > 1 && <div><dt className="inline text-ink/60">{t('seller.minOrder')}: </dt><dd className="inline">{p.minOrderQty} {p.unit}</dd></div>}
          <div><dt className="inline text-ink/60">{t('seller.delivery')}: </dt><dd className="inline">{p.deliveryAvailable ? (p.deliveryLocation || t('seller.deliveryYes')) : t('seller.pickupOnly')}</dd></div>
          {p.licenceNumber && <div><dt className="inline text-ink/60">{t('market.licence')}: </dt><dd className="inline font-medium">{p.licenceNumber}</dd></div>}
        </dl>
        <p className="mt-4 rounded-lg bg-gold-light/60 p-3 text-xs text-ink/80">{p.isProduce ? t('market.produceNote') : t('market.note')}</p>
        {p.codOnly && <p className="mt-2 rounded-lg bg-leaf-light p-3 text-xs">{t('market.paidDirectly')}</p>}
        {p.stock > 0 ? (
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <div><label htmlFor="p-qty" className="label">{t('market.qty')} ({t('market.left', { n: p.stock })})</label>
              <input id="p-qty" type="number" min={p.minOrderQty || 1} max={p.stock} className="input w-28" value={qty} onChange={(e) => setQty(Math.max(p.minOrderQty || 1, Math.min(p.stock, Number(e.target.value) || 1)))} /></div>
            <button type="button" className="btn-primary" onClick={() => addToCart(p, qty)}>{t('market.addToCart')}</button>
            <button type="button" className="btn-outline" onClick={() => { if (addToCart(p, qty)) navigate('/cart'); }}>{t('market.viewCart')}</button>
          </div>
        ) : <p className="mt-5 font-medium text-red-700">{t('market.outOfStock')}</p>}
      </div>
      <div className="md:col-span-2"><Reviews productId={p.id} /></div>
    </div>
  );
}

function Gallery({ p }) {
  const [i, setI] = useState(0); const imgs = p.images || []; const [folder, name] = placeholderFor(p.category);
  if (!imgs.length) return <SmartImage folder={folder} name={name} alt="" className="h-72 w-full rounded-xl" eager />;
  return (
    <div>
      <img src={assetUrl(imgs[i])} alt={p.name} className="h-72 w-full rounded-xl object-cover" />
      {imgs.length > 1 && <div className="mt-2 flex gap-2">{imgs.map((u, k) => <button key={u} type="button" aria-label={`${k + 1}`} onClick={() => setI(k)} className={`h-14 w-14 overflow-hidden rounded-lg border-2 ${k === i ? 'border-forest' : 'border-transparent'}`}><img src={assetUrl(u)} alt="" className="h-full w-full object-cover" /></button>)}</div>}
    </div>
  );
}

// Anyone can read reviews. Only a buyer whose order was delivered can post one (the server checks).
function Reviews({ productId }) {
  const { t } = useI18n(); const { user } = useAuth(); const { notify } = useToast();
  const [data, setData] = useState(null); const [rating, setRating] = useState(5); const [comment, setComment] = useState(''); const [err, setErr] = useState('');
  const load = () => api.get(`/products/${productId}/reviews`).then((r) => setData(r.data.data)).catch(() => {});
  useEffect(() => { load(); }, [productId]); // eslint-disable-line react-hooks/exhaustive-deps
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { await api.post(`/products/${productId}/reviews`, { rating, comment }); notify(t('seller.reviewThanks')); setComment(''); load(); } catch (x) { setErr(errorMessage(x)); }
  };
  return (
    <section aria-labelledby="rev-h" className="mt-4 border-t border-earth/15 pt-6">
      <h2 id="rev-h" className="text-xl font-semibold">{t('seller.customerReviews')} {data?.count > 0 && <span className="text-base font-normal text-ink/60">({data.average}/5, {data.count})</span>}</h2>
      {data?.count === 0 && <p className="mt-2 text-sm text-ink/60">{t('seller.noReviewsYet')}</p>}
      <ul className="mt-3 space-y-3">
        {(data?.reviews || []).map((r) => (
          <li key={r.id} className="card p-4 text-sm"><div className="flex items-center gap-2"><Stars n={r.rating} /><span className="text-ink/60">{r.buyerName}</span></div>{r.comment && <p className="mt-1">{r.comment}</p>}{r.reply && <p className="mt-2 rounded-lg bg-leaf-light p-2 text-xs"><strong>{t('seller.sellerReply')}:</strong> {r.reply}</p>}</li>
        ))}
      </ul>
      {user && (
        <form onSubmit={submit} className="card mt-4 space-y-3 p-4 text-sm">
          <p className="font-semibold">{t('seller.writeReview')}</p>
          <label className="flex items-center gap-2">{t('seller.rating')}<select className="input w-24" value={rating} onChange={(e) => setRating(Number(e.target.value))}>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n}</option>)}</select></label>
          <textarea rows="2" maxLength={500} className="input" aria-label={t('seller.writeReview')} value={comment} onChange={(e) => setComment(e.target.value)} />
          {err && <p role="alert" className="text-xs text-red-700">{err}</p>}
          <button className="btn-outline">{t('seller.submitReview')}</button>
        </form>
      )}
    </section>
  );
}
