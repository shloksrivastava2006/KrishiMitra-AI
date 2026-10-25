import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LocateFixed, Search, TrendingUp } from 'lucide-react';
import Field from '../../components/common/Field.jsx';
import { ErrorBox, Loading } from '../../components/common/ui.jsx';
import api, { errorMessage } from '../../services/api.js';
import { useAuth } from '../auth/AuthContext.jsx';

const rs = (n) => (n ? `₹${Number(n).toLocaleString('en-IN')}` : '-');
const perKg = (n) => (n ? `₹${(n / 100).toLocaleString('en-IN', { maximumFractionDigits: 2 })}/kg` : '');
const day = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
const KEY = 'krishimitra.mandiState';
const saved = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const STATE_ALIAS = { delhi: 'NCT of Delhi', orissa: 'Odisha', uttrakhand: 'Uttarakhand', chattisgarh: 'Chhattisgarh', pondicherry: 'Puducherry' };

// Live mandi prices (Agmarknet via data.gov.in), pick state, then district, mandi and crop.
export default function MandiPage() {
  const [states, setStates] = useState([]);
  const [state, setState] = useState(saved);
  const [district, setDistrict] = useState('');
  const [market, setMarket] = useState('');
  const [commodity, setCommodity] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [wantDistrict, setWantDistrict] = useState('');   // district found from GPS or the profile, picked once its state's list has loaded
  const [locating, setLocating] = useState(false);
  const [placeNote, setPlaceNote] = useState('');
  const { user } = useAuth() || {};

  useEffect(() => { api.get('/mandi/states').then((r) => setStates(r.data.data)).catch((e) => setError(errorMessage(e))); }, []);

  // A signed-in farmer's profile state and district are used once, when nothing was chosen before.
  useEffect(() => {
    if (state || !user?.state || !states.length) return;
    const st = states.find((x) => same(x, STATE_ALIAS[user.state.trim().toLowerCase()] || user.state));
    if (st) { setState(st); if (user.district) setWantDistrict(user.district); setPlaceNote(`Showing ${user.district ? `${user.district}, ` : ''}${st} from your profile.`); }
  }, [user, states, state]);

  // State and crop go to the server (the crop filter keeps the download small); district and mandi narrow what was fetched.
  useEffect(() => {
    if (!state) { setData(null); return undefined; }
    let live = true;
    setLoading(true); setError('');
    api.get('/mandi/prices', { params: { state, commodity: commodity || undefined, district: district || undefined } })
      .then((r) => {
        if (!live) return;
        setData(r.data.data);
      })
      .catch((e) => { if (live) { setData(null); setError(errorMessage(e)); } })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [state, commodity, district]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pick the GPS/profile district as soon as the list for its state is on screen (works even if the state did not change).
  useEffect(() => {
    if (!wantDistrict || !data || loading) return;
    const w = wantDistrict.toLowerCase();
    const d = data.options.districts.find((x) => same(x, wantDistrict)) || data.options.districts.find((x) => x.toLowerCase().includes(w) || w.includes(x.toLowerCase()));
    if (d) setDistrict(d); else setPlaceNote(`No mandi prices are listed for ${wantDistrict}, so the whole state of ${data.state} is shown. Pick a nearby district.`);
    setWantDistrict('');
  }, [wantDistrict, data, loading]);

  const pickState = (e) => {
    const s = e.target.value; setState(s); setPlaceNote(''); setWantDistrict(''); setDistrict(''); setMarket(''); setCommodity(''); setQ('');
    try { localStorage.setItem(KEY, s); } catch { /* storage blocked: still works for this visit */ }
  };

  const useMyLocation = () => {
    setError(''); setPlaceNote('');
    if (!navigator.geolocation) { setError('This browser cannot share your location. Choose your state yourself.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // Rounded to about 1 km; used only to find the state and district, not stored.
          const lat = Math.round(pos.coords.latitude * 100) / 100, lon = Math.round(pos.coords.longitude * 100) / 100;
          const { data: r } = await api.get('/mandi/locate', { params: { lat, lon } });
          setState(r.data.state); setMarket(''); setCommodity(''); setDistrict(''); setWantDistrict(r.data.district || '');
          setPlaceNote(`Your location: ${r.data.district ? `${r.data.district}, ` : ''}${r.data.state}.`);
          try { localStorage.setItem(KEY, r.data.state); } catch { /* storage blocked */ }
        } catch (e) { setError(errorMessage(e)); } finally { setLocating(false); }
      },
      (err) => { setLocating(false); setError(err.code === 1 ? 'Location permission was denied. Choose your state yourself.' : 'Your location could not be found. Choose your state yourself.'); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  };

  const rows = useMemo(() => {
    if (!data) return [];
    const needle = q.trim().toLowerCase();
    return data.records.filter((r) => (!market || r.market === market) && (!needle || `${r.commodity} ${r.variety} ${r.market}`.toLowerCase().includes(needle)));
  }, [data, market, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-bold"><TrendingUp className="h-7 w-7 text-forest" aria-hidden="true" /> Mandi prices <span className="text-xl text-ink/60">(Mandi bhav)</span></h1>
      <p className="mt-2 max-w-2xl text-ink/70">Live wholesale prices from mandis across India. Pick your state, then your district, mandi and crop. Prices are per quintal (100 kg).</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={useMyLocation} disabled={locating} className="btn-gold"><LocateFixed className="h-4 w-4" aria-hidden="true" /> {locating ? 'Finding your place...' : 'Use my location'}</button>
        {placeNote && <p role="status" className="text-sm text-ink/70">{placeNote}</p>}
      </div>
      <p className="mt-1 text-xs text-ink/55">Your approximate position (about 1 km) is sent to the server and OpenStreetMap only to find your state and district. It is not saved.</p>

      <div className="card mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field id="m-state" label="State (rajya)">
          <select id="m-state" className="input" value={state} onChange={pickState}>
            <option value="">Choose a state</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field id="m-district" label="District (zila)">
          <select id="m-district" className="input" value={district} onChange={(e) => { setDistrict(e.target.value); setMarket(''); setPlaceNote(''); }} disabled={!data}>
            <option value="">All districts</option>
            {data?.options.districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
        <Field id="m-market" label="Mandi">
          <select id="m-market" className="input" value={market} onChange={(e) => setMarket(e.target.value)} disabled={!data}>
            <option value="">All mandis</option>
            {data?.options.markets.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>
        <Field id="m-crop" label="Crop (fasal)">
          <select id="m-crop" className="input" value={commodity} onChange={(e) => { setCommodity(e.target.value); setMarket(''); }} disabled={!data}>
            <option value="">All crops</option>
            {(data?.options.commodities || []).map((c) => <option key={c} value={c}>{c}</option>)}
            {commodity && !data?.options.commodities.includes(commodity) && <option value={commodity}>{commodity}</option>}
          </select>
        </Field>
        <Field id="m-q" label="Search">
          <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-ink/40" aria-hidden="true" />
            <input id="m-q" className="input pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="wheat, onion, Meerut..." disabled={!data} /></div>
        </Field>
      </div>

      <div className="mt-4"><ErrorBox>{error}</ErrorBox></div>
      {loading && <div className="mt-6"><Loading /></div>}
      {!state && !loading && !error && <p className="mt-6 rounded-xl border border-dashed border-earth/30 bg-white/60 p-8 text-center text-sm text-ink/70">Choose your state to see today's mandi prices.</p>}

      {data && !loading && (
        <>
          <p className="mt-4 text-sm text-ink/70">{rows.length} price{rows.length === 1 ? '' : 's'} in {data.state}. Latest arrival date in this list: <strong>{day(data.latestDate)}</strong>. Mandis report on their own days, so a crop may show an older date.</p>
          {rows.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-earth/30 bg-white/60 p-8 text-center text-sm text-ink/70">No prices found for this choice. Try "All crops" or another district; mandis do not report every crop every day.</p>
          ) : (
            <div className="mt-3 overflow-x-auto rounded-xl border border-earth/15 bg-white">
              <table className="w-full min-w-[720px] text-sm">
                <thead><tr className="border-b border-earth/20 bg-earth-light/50 text-left text-xs text-ink/70">
                  <th className="p-3">Crop</th><th>Variety</th><th>Mandi</th><th>District</th><th>Date</th><th className="text-right">Min</th><th className="text-right">Max</th><th className="p-3 text-right">Modal (usual)</th>
                </tr></thead>
                <tbody>{rows.map((r, i) => (
                  <tr key={`${r.market}-${r.commodity}-${r.variety}-${r.grade}-${i}`} className="border-b border-earth/10">
                    <td className="p-3 font-semibold">{r.commodity}</td><td>{r.variety}{r.grade && r.grade !== r.variety ? ` (${r.grade})` : ''}</td><td>{r.market}</td><td>{r.district}</td><td>{day(r.date)}</td>
                    <td className="text-right">{rs(r.min)}</td><td className="text-right">{rs(r.max)}</td>
                    <td className="p-3 text-right"><strong>{rs(r.modal)}</strong><br /><span className="text-xs text-ink/55">{perKg(r.modal)}</span></td>
                  </tr>))}</tbody>
              </table>
            </div>
          )}
          {data.truncated && <p className="mt-2 text-xs text-ink/60">Showing the first 500 prices. Choose a district or crop to narrow the list.</p>}
          <p className="mt-3 text-xs text-ink/55">Source: {data.source}. Rs per quintal. Modal price is the price at which most trades happened. Prices can change through the day and differ from what you are offered; confirm at the mandi. Need storage? See <Link to="/cold-storage" className="font-semibold text-forest underline">cold storages by state</Link>. Selling your own produce? See the <Link to="/marketplace" className="font-semibold text-forest underline">marketplace</Link>.</p>
        </>
      )}
    </div>
  );
}
