import { useState } from 'react';
import { Star } from 'lucide-react';
import api, { errorMessage } from '../../services/api.js';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { Empty, ErrorBox, Loading, PageTitle, Stat, fmtDate, useFetch } from '../../components/common/ui.jsx';

export const Stars = ({ n }) => <span aria-label={`${n}/5`} className="inline-flex">{[1, 2, 3, 4, 5].map((i) => <Star key={i} className={`h-4 w-4 ${i <= n ? 'fill-gold text-gold' : 'text-ink/20'}`} aria-hidden="true" />)}</span>;

export default function SellerReviews() {
  const { t, lang } = useI18n(); const { notify } = useToast();
  const { data: d, error, loading, reload } = useFetch('/seller/reviews');
  const [open, setOpen] = useState(null); const [text, setText] = useState(''); const [err, setErr] = useState('');
  if (loading) return <Loading />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const send = async (r) => {
    setErr('');
    try { await api.post(`/seller/reviews/${r.id}/reply`, { text }); notify(t('seller.replySent')); setOpen(null); setText(''); reload(); } catch (e) { setErr(errorMessage(e)); }
  };
  return (
    <div className="space-y-5">
      <PageTitle>{t('seller.nav_reviews')}</PageTitle>
      <div className="grid gap-4 sm:grid-cols-2"><Stat label={t('seller.avgRating')} value={d.count ? `${d.average} / 5` : '-'} /><Stat label={t('seller.totalReviews')} value={d.count} /></div>
      <p className="text-xs text-ink/60">{t('seller.reviewRules')}</p>
      <ErrorBox>{err}</ErrorBox>
      {d.reviews.length === 0 && <Empty>{t('seller.noReviews')}</Empty>}
      <ul className="space-y-3">
        {d.reviews.map((r) => (
          <li key={r.id} className="card space-y-2 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{r.productName}</p><Stars n={r.rating} /></div>
            <p className="text-ink/60">{r.buyerName} | {fmtDate(r.createdAt, lang)}</p>
            {r.comment && <p>{r.comment}</p>}
            {r.reply ? <p className="rounded-lg bg-leaf-light p-3"><strong>{t('seller.yourReply')}:</strong> {r.reply}</p> : open === r.id ? (
              <div className="space-y-2">
                <label className="sr-only" htmlFor={`rp-${r.id}`}>{t('seller.writeReply')}</label>
                <textarea id={`rp-${r.id}`} rows="2" maxLength={500} className="input" value={text} onChange={(e) => setText(e.target.value)} />
                <div className="flex gap-2"><button type="button" className="btn-primary px-3 py-1.5" disabled={!text.trim()} onClick={() => send(r)}>{t('seller.sendReply')}</button><button type="button" className="btn-outline px-3 py-1.5" onClick={() => setOpen(null)}>{t('market.cancelEdit')}</button></div>
              </div>
            ) : <button type="button" className="btn-outline px-3 py-1.5" onClick={() => { setOpen(r.id); setText(''); }}>{t('seller.reply')}</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
