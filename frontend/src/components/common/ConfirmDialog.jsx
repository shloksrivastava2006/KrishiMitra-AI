import { useEffect, useRef } from 'react';
import { useI18n } from '../../i18n/I18nProvider.jsx';

// Small modal that asks "are you sure?" before something risky (block, delete). Escape or the backdrop cancels.
export default function ConfirmDialog({ title, message, confirmLabel, danger = false, busy = false, onConfirm, onCancel }) {
  const { t } = useI18n();
  const cancelRef = useRef(null);
  useEffect(() => {
    cancelRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="cd-title" aria-describedby="cd-msg" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="cd-title" className="text-lg font-bold text-ink">{title}</h2>
        <p id="cd-msg" className="mt-2 text-sm text-ink/75">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button ref={cancelRef} type="button" className="btn-outline px-4 py-2" onClick={onCancel} disabled={busy}>{t('admin.cancel')}</button>
          <button type="button" onClick={onConfirm} disabled={busy}
            className={danger ? 'rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60' : 'btn-primary px-4 py-2'}>
            {busy ? t('auth.wait') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
