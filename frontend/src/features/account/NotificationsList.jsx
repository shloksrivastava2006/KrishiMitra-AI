import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../services/api.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { Empty, ErrorBox, Loading, PageTitle, fmtDate, useFetch } from '../../components/common/ui.jsx';
import { useState } from 'react';

// Real notifications for any signed-in user. The API only ever returns the caller's own.
export default function NotificationsList({ wide = false }) {
  const { t, lang } = useI18n();
  const { data, error, loading, reload } = useFetch('/notifications');
  const [err, setErr] = useState('');
  const act = async (fn) => { setErr(''); try { await fn(); reload(); } catch (e) { setErr(errorMessage(e)); } };
  const body = (
    <>
      <PageTitle action={data?.unread > 0 && <button type="button" className="btn-outline" onClick={() => act(() => api.patch('/notifications/read-all'))}>{t('seller.markAllRead')}</button>}>{t('nav.notifications')}</PageTitle>
      <ErrorBox>{error || err}</ErrorBox>
      {loading && <Loading />}
      {data?.items.length === 0 && <Empty>{t('seller.noNotifications')}</Empty>}
      <ul className="space-y-2">
        {(data?.items || []).map((n) => (
          <li key={n.id} className={`card flex items-start justify-between gap-3 p-4 text-sm ${n.read ? 'opacity-70' : 'border-forest/40'}`}>
            <div>
              <p className={n.read ? '' : 'font-semibold'}>{n.title}</p>
              {n.message && <p className="text-ink/70">{n.message}</p>}
              <p className="mt-1 text-xs text-ink/50">{fmtDate(n.createdAt, lang)}{n.link && <> | <Link className="text-forest" to={n.link} onClick={() => !n.read && api.patch(`/notifications/${n.id}/read`).catch(() => {})}>{t('seller.open')}</Link></>}</p>
            </div>
            {!n.read && <button type="button" className="shrink-0 text-xs text-forest underline" onClick={() => act(() => api.patch(`/notifications/${n.id}/read`))}>{t('seller.markRead')}</button>}
          </li>
        ))}
      </ul>
    </>
  );
  return wide ? <div className="mx-auto max-w-3xl px-4 py-12">{body}</div> : body;
}
