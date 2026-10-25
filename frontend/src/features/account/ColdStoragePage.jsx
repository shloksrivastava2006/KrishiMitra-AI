import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Snowflake } from 'lucide-react';
import { ErrorBox, Loading, useFetch } from '../../components/common/ui.jsx';

const n = (v) => Number(v).toLocaleString('en-IN');
const SORTS = { capacity: 'Capacity (largest first)', number: 'Number of cold storages (most first)', state: 'State (A to Z)' };

// State-wise cold storages (number and capacity), as on 31.12.2009, from a Lok Sabha reply quoting DMI, Ministry of Agriculture.
export default function ColdStoragePage() {
  const { data, error, loading } = useFetch('/cold-storage');
  const [sort, setSort] = useState('capacity');
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    if (!data) return [];
    const list = data.states.filter((r) => r.state.toLowerCase().includes(q.trim().toLowerCase()));
    const by = { capacity: (a, b) => b.capacityMt - a.capacityMt, number: (a, b) => b.number - a.number, state: (a, b) => a.state.localeCompare(b.state) }[sort];
    return [...list].sort(by);
  }, [data, sort, q]);
  const max = data ? Math.max(...data.states.map((r) => r.capacityMt)) : 1;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-bold"><Snowflake className="h-7 w-7 text-forest" aria-hidden="true" /> Cold storages in India <span className="text-xl text-ink/60">(Cold storage, rajya-wise)</span></h1>
      <p className="mt-2 max-w-2xl text-ink/70">How many cold storages each State and Union Territory had, and their total capacity, as on 31 December 2009. This is old data: use it to see where storage is concentrated, and ask your local horticulture office for today's list.</p>
      <ErrorBox>{error}</ErrorBox>
      {loading && <Loading />}
      {data && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
            <div className="card p-4"><p className="text-xs text-ink/60">Cold storages in India</p><p className="text-2xl font-bold text-forest">{n(data.total.number)}</p></div>
            <div className="card p-4"><p className="text-xs text-ink/60">Total capacity</p><p className="text-2xl font-bold text-forest">{n(data.total.capacityMt)} <span className="text-sm font-medium">MT</span></p></div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="cs-q" className="label">Find a state</label><input id="cs-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Punjab, Gujarat..." /></div>
            <div><label htmlFor="cs-sort" className="label">Sort by</label><select id="cs-sort" className="input" value={sort} onChange={(e) => setSort(e.target.value)}>{Object.entries(SORTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          </div>
          <div className="mt-4 overflow-x-auto rounded-xl border border-earth/15 bg-white">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr className="border-b border-earth/20 bg-earth-light/50 text-left text-xs text-ink/70"><th className="p-3">State / UT</th><th className="text-right">Cold storages</th><th className="text-right">Capacity (MT)</th><th className="p-3">Capacity compared with the biggest state</th></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.state} className="border-b border-earth/10">
                  <td className="p-3 font-semibold">{r.state}</td><td className="text-right">{n(r.number)}</td><td className="text-right">{n(r.capacityMt)}</td>
                  <td className="p-3"><div className="h-2 w-full rounded bg-leaf-light" role="img" aria-label={`${Math.round((r.capacityMt / max) * 100)} percent of the largest state`}><div className="h-2 rounded bg-forest" style={{ width: `${(r.capacityMt / max) * 100}%` }} /></div></td>
                </tr>))}
                {rows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-ink/60">No state matches "{q}".</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-ink/60">Source: {data.source}. {data.note} Capacity is in metric tonnes (MT); 1 MT = 1,000 kg. Manipur and Mizoram reported none. See today's prices on <Link to="/mandi" className="font-semibold text-forest underline">Mandi prices</Link>.</p>
        </>
      )}
    </div>
  );
}
