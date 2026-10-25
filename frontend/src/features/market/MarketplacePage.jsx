import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../../services/api.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { CATEGORIES, INPUT_CATS, PRODUCE_CATS, catKey } from './format.js';
import ProductCard from './ProductCard.jsx';

export default function MarketplacePage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState(params.get('q') || '');
  const [district, setDistrict] = useState(params.get('district') || '');
  const type = ['produce', 'inputs'].includes(params.get('type')) ? params.get('type') : '';
  const organic = params.get('organic') === 'true'; const districtQ = params.get('district') || '';
  const category = params.get('category') || ''; const page = Number(params.get('page')) || 1; const query = params.get('q') || '';
  const cats = type === 'produce' ? PRODUCE_CATS : type === 'inputs' ? INPUT_CATS : CATEGORIES;

  useEffect(() => {
    let live = true; setError('');
    api.get('/products', { params: { type: type || undefined, category: category || undefined, q: query || undefined, organic: organic || undefined, district: districtQ || undefined, page } })
      .then((r) => live && setData(r.data.data)).catch((e) => live && setError(errorMessage(e)));
    return () => { live = false; };
  }, [type, category, query, organic, districtQ, page]);

  const set = (patch) => { const n = new URLSearchParams(params); Object.entries(patch).forEach(([k, v]) => (v ? n.set(k, v) : n.delete(k))); if (!('page' in patch)) n.delete('page'); setParams(n); };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t('market.title')}</h1>
      <p className="mt-2 max-w-2xl text-ink/70">{t('market.intro')}</p>
      <p className="mt-2 max-w-3xl rounded-lg bg-gold-light/60 p-3 text-xs text-ink/80">{type === 'produce' ? t('market.produceNote') : t('market.note')}</p>

      <div role="tablist" aria-label={t('market.title')} className="mt-6 flex flex-wrap gap-2">
        {[['', 'market.tabAll'], ['produce', 'market.tabProduce'], ['inputs', 'market.tabInputs']].map(([v, key]) => (
          <button key={v || 'all'} type="button" role="tab" aria-selected={type === v} onClick={() => set({ type: v, category: '' })}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${type === v ? 'bg-forest text-white' : 'bg-leaf-light text-forest'}`}>{t(key)}</button>
        ))}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); set({ q: q.trim(), district: district.trim() }); }} className="mt-4 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="m-q">{t('market.search')}</label>
        <input id="m-q" className="input max-w-xs" placeholder={t('market.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="sr-only" htmlFor="m-cat">{t('market.allCategories')}</label>
        <select id="m-cat" className="input max-w-[14rem]" value={category} onChange={(e) => set({ category: e.target.value })}>
          <option value="">{t('market.allCategories')}</option>
          {cats.map((c) => <option key={c} value={c}>{t(catKey(c))}</option>)}
        </select>
        <label className="sr-only" htmlFor="m-district">{t('market.district')}</label>
        <input id="m-district" className="input max-w-[10rem]" placeholder={t('market.district')} value={district} onChange={(e) => setDistrict(e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-forest" checked={organic} onChange={(e) => set({ organic: e.target.checked ? 'true' : '' })} /> {t('market.organicOnly')}</label>
        <button className="btn-outline">{t('market.search')}</button>
      </form>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {data && data.products.length === 0 && <p className="mt-6 text-ink/70">{t('market.noProducts')}</p>}
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{(data?.products || []).map((p) => <ProductCard key={p.id} p={p} />)}</ul>
      {data && data.pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4 text-sm">
          <button className="btn-outline" disabled={page <= 1} onClick={() => set({ page: String(page - 1) })}>{t('market.prev')}</button>
          <span>{t('market.page', { n: data.page, total: data.pages })}</span>
          <button className="btn-outline" disabled={page >= data.pages} onClick={() => set({ page: String(page + 1) })}>{t('market.next')}</button>
        </div>
      )}
    </div>
  );
}
