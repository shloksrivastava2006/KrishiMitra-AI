import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import api, { assetUrl, errorMessage } from '../../services/api.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { badgeClass } from '../../features/market/format.js';

export function useFetch(path) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const load = useCallback(() => api.get(path)
    .then((r) => setState({ data: r.data.data, error: '', loading: false }))
    .catch((e) => setState({ data: null, error: errorMessage(e), loading: false })), [path]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

export const ErrorBox = ({ children }) => (children ? <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{children}</p> : null);
export const Loading = () => <p role="status" className="flex items-center gap-2 text-ink/60"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> ...</p>;
export const Empty = ({ children }) => <div className="rounded-xl border border-dashed border-earth/30 bg-white/60 p-8 text-center text-sm text-ink/70">{children}</div>;
export const PageTitle = ({ children, action }) => <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold sm:text-3xl">{children}</h1>{action}</div>;

export function Stat({ label, value, hint, tone }) {
  return (
    <div className="card">
      <p className="text-sm text-ink/60">{label}</p>
      <p className={`mt-1 font-display text-2xl font-bold ${tone === 'warn' ? 'text-earth' : 'text-forest'}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink/50">{hint}</p>}
    </div>
  );
}

const TONES = { approved: 'ok', pending: 'warn', rejected: 'bad', inactive: 'info', out_of_stock: 'bad', delivered: 'ok', placed: 'warn', confirmed: 'info', shipped: 'info',
  cancelled: 'bad', paid: 'ok', cod: 'warn', refund_due: 'bad', requested: 'warn', handed_over: 'info', completed: 'ok', verified: 'ok' };
export function Badge({ kind, label }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass(TONES[kind] || 'info')}`}>{label}</span>;
}

export const fmtDate = (d, lang) => new Date(d).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// Uploads photos to POST /uploads/images and reports the saved paths. The server re-checks type and size; this is only for quick feedback.
export function ImagePicker({ value, onChange, max = 5 }) {
  const { t } = useI18n();
  const input = useRef(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const pick = async (e) => {
    const files = [...e.target.files]; e.target.value = ''; setError('');
    if (!files.length) return;
    if (value.length + files.length > max) return setError(t('seller.errTooManyPhotos', { n: max }));
    if (files.some((f) => !/^image\/(jpeg|png|webp)$/.test(f.type))) return setError(t('seller.errPhotoType'));
    if (files.some((f) => f.size > 3 * 1024 * 1024)) return setError(t('seller.errPhotoSize'));
    const body = new FormData(); files.forEach((f) => body.append('images', f));
    setBusy(true);
    try { const r = await api.post('/uploads/images', body); onChange([...value, ...r.data.data.urls]); } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {value.map((u) => (
          <div key={u} className="relative h-24 w-24 overflow-hidden rounded-lg border border-earth/20">
            <img src={assetUrl(u)} alt="" className="h-full w-full object-cover" />
            <button type="button" aria-label={t('seller.removePhoto')} onClick={() => onChange(value.filter((x) => x !== u))} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-red-700"><X className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        ))}
        {value.length < max && (
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-forest/40 text-xs text-forest hover:bg-leaf-light disabled:opacity-60">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-5 w-5" aria-hidden="true" />} {t('seller.addPhotos')}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={pick} />
      <p className="mt-1 text-xs text-ink/60">{t('seller.photoHelp', { n: max })}</p>
      {error && <p role="alert" className="field-error">{error}</p>}
    </div>
  );
}

// Saves a text/csv response from the API through the browser's normal download.
export async function downloadFile(path, params, filename) {
  const r = await api.get(path, { params, responseType: 'blob' });
  const url = URL.createObjectURL(r.data);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}
