import { useEffect, useState } from 'react';
import { Lock, Search, ShieldCheck } from 'lucide-react';
import api, { errorMessage } from '../../services/api.js';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { badgeClass } from '../market/format.js';
import { useApi } from './useApi.js';
import AddAdminForm from './AddAdminForm.jsx';

const TABS = [['', 'admin.tabAll'], ['farmer', 'admin.tabFarmer'], ['vendor', 'admin.tabVendor'], ['customer', 'admin.tabCustomer'], ['admin', 'admin.tabAdmin'], ['blocked', 'admin.tabBlocked']];
const countFor = (counts, key) => (key === '' ? counts.all : counts[key] ?? 0);

export default function AdminUsers() {
  const { t } = useI18n();
  const { notify } = useToast();
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState('');
  const [input, setInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [ask, setAsk] = useState(null);   // { kind: 'block' | 'unblock' | 'delete', user }
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');

  // Wait a moment after typing before searching, and go back to page 1 for every new search or tab.
  useEffect(() => { const id = setTimeout(() => { setQ(input.trim()); setPage(1); }, 300); return () => clearTimeout(id); }, [input]);

  const params = new URLSearchParams({ page: String(page) });
  if (tab === 'blocked') params.set('status', 'blocked'); else if (tab) params.set('role', tab);
  if (q) params.set('q', q);
  const { data, error } = useApi(`/admin/users?${params}`, version);
  const refresh = () => setVersion((v) => v + 1);

  const run = async () => {
    const { kind, user } = ask;
    setBusy(true); setActionError('');
    try {
      if (kind === 'delete') await api.delete(`/admin/users/${user.id}`);
      else await api.patch(`/admin/users/${user.id}/status`, { active: kind === 'unblock' });
      notify(t(`admin.done_${kind}`, { name: user.name }));
      setAsk(null); refresh();
    } catch (e) { setActionError(errorMessage(e)); setAsk(null); } finally { setBusy(false); }
  };

  const roleBadge = (u) => (u.isMainAdmin
    ? <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${badgeClass('warn')}`}><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />{t('admin.mainAdmin')}</span>
    : <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(u.role === 'admin' ? 'info' : 'ok')}`}>{t(`admin.role_${u.role}`)}</span>);

  return (
    <div>
      {data?.canManageAdmins && <AddAdminForm onCreated={refresh} />}
      {data && !data.canManageAdmins && <p className="mb-4 rounded-lg bg-gold-light/60 p-3 text-xs text-ink/80">{t('admin.subAdminNote')}</p>}

      <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label={t('admin.users')}>
        {TABS.map(([key, label]) => (
          <button key={key || 'all'} type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setPage(1); }}
            className={`rounded-full px-4 py-1.5 text-sm font-bold ${tab === key ? 'bg-forest text-white' : 'bg-leaf-light text-forest hover:bg-leaf/30'}`}>
            {t(label)}{data ? ` (${countFor(data.counts, key)})` : ''}
          </button>
        ))}
      </div>

      <label className="relative mb-4 block max-w-md">
        <span className="sr-only">{t('admin.searchLabel')}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/50" aria-hidden="true" />
        <input className="input pl-9" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('admin.searchLabel')} />
      </label>

      {(error || actionError) && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error || actionError}</p>}
      {!data && !error && <p className="text-ink/60">...</p>}
      {data && (
        <>
          <p className="mb-2 text-sm text-ink/70">{t('admin.total', { n: data.total })}</p>
          {data.users.length === 0 ? <p className="rounded-xl border border-earth/15 bg-white p-6 text-center text-ink/70">{t('admin.noUsers')}</p> : (
            <div className="overflow-x-auto rounded-xl border border-earth/15 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-leaf-light text-forest-dark"><tr>{['name', 'email', 'role', 'status', 'joined', 'actions'].map((c) => <th key={c} className="whitespace-nowrap px-4 py-2 font-bold">{t(`admin.${c}`)}</th>)}</tr></thead>
                <tbody>
                  {data.users.map((u) => (
                    <tr key={u.id} className="border-t border-earth/10 align-middle">
                      <td className="px-4 py-2 font-semibold">{u.name}{u.shopName && <span className="block text-xs font-normal text-ink/60">{u.shopName}</span>}</td>
                      <td className="px-4 py-2">{u.email}{u.phone && <span className="block text-xs text-ink/60">{u.phone}</span>}</td>
                      <td className="px-4 py-2">{roleBadge(u)}</td>
                      <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass(u.isActive ? 'ok' : 'bad')}`}>{u.isActive ? t('admin.active') : t('admin.blockedStatus')}</span></td>
                      <td className="whitespace-nowrap px-4 py-2">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        {u.canBlock || u.canDelete ? (
                          <div className="flex flex-wrap gap-2">
                            {u.canBlock && <button type="button" className="btn-outline px-3 py-1 text-xs font-bold" onClick={() => setAsk({ kind: u.isActive ? 'block' : 'unblock', user: u })}>{u.isActive ? t('admin.block') : t('admin.unblock')}</button>}
                            {u.canDelete && <button type="button" className="rounded-lg border border-red-300 px-3 py-1 text-xs font-bold text-red-700 hover:bg-red-50" onClick={() => setAsk({ kind: 'delete', user: u })}>{t('admin.delete')}</button>}
                          </div>
                        ) : <span className="inline-flex items-center gap-1 text-xs text-ink/55"><Lock className="h-3.5 w-3.5" aria-hidden="true" />{t('admin.protected')}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data.pages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <button type="button" className="btn-outline px-3 py-1.5" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('admin.prev')}</button>
              <span className="text-ink/70">{t('admin.pageOf', { p: data.page, n: data.pages })}</span>
              <button type="button" className="btn-outline px-3 py-1.5" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>{t('admin.next')}</button>
            </div>
          )}
        </>
      )}

      {ask && (
        <ConfirmDialog danger={ask.kind !== 'unblock'} busy={busy} onCancel={() => setAsk(null)} onConfirm={run}
          title={t(`admin.ask_${ask.kind}_title`, { name: ask.user.name })}
          message={t(ask.kind === 'delete' && ask.user.role === 'admin' ? 'admin.ask_delete_admin_msg' : `admin.ask_${ask.kind}_msg`)}
          confirmLabel={t(ask.kind === 'delete' ? 'admin.delete' : ask.kind === 'block' ? 'admin.block' : 'admin.unblock')} />
      )}
    </div>
  );
}
