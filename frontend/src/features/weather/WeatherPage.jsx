import { useEffect, useState } from 'react';
import { CloudSun, Droplets, MapPin, Search, Wind } from 'lucide-react';
import api, { errorMessage } from '../../services/api.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

// Open-Meteo uses WMO weather codes. Grouped into a few readable labels.
const codeKey = (c) => (c === 0 ? 'c_clear' : c <= 3 ? 'c_partly' : c === 45 || c === 48 ? 'c_fog' : c >= 51 && c <= 57 ? 'c_drizzle'
  : c >= 61 && c <= 67 ? 'c_rain' : c >= 71 && c <= 77 ? 'c_snow' : c >= 80 && c <= 82 ? 'c_showers' : c >= 95 ? 'c_storm' : 'c_unknown');
const round = (n) => (typeof n === 'number' ? Math.round(n) : '-');

export default function WeatherPage() {
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const [place, setPlace] = useState(null);       // { label, latitude, longitude }
  const [forecast, setForecast] = useState(null);
  const [status, setStatus] = useState('idle');   // idle | locating | loading | error
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [farms, setFarms] = useState([]);

  // Saved farms with coordinates (farmers only). Failure just hides the list.
  useEffect(() => {
    if (user?.role !== 'farmer') return;
    api.get('/farms').then((r) => setFarms(r.data.data.filter((f) => f.latitude != null && f.longitude != null))).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!place) return undefined;
    let live = true;
    setStatus('loading'); setError('');
    api.get('/weather', { params: { lat: place.latitude, lon: place.longitude } })
      .then((r) => { if (live) { setForecast(r.data.data); setStatus('idle'); } })
      .catch((e) => { if (live) { setError(errorMessage(e)); setStatus('error'); } });
    return () => { live = false; };
  }, [place]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError(t('weather.unsupported')); setStatus('error'); return; }
    setStatus('locating'); setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => setPlace({ label: '', latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => { setError(t(err.code === 1 ? 'weather.denied' : 'weather.unavailable')); setStatus('error'); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  };

  const search = async (e) => {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setError(''); setResults(null);
    try { const r = await api.get('/weather/search', { params: { q: q.trim() } }); setResults(r.data.data); }
    catch (err) { setError(errorMessage(err)); setStatus('error'); }
  };

  const fmtDay = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  const adv = forecast?.irrigation;
  const advText = adv && (adv.level === 'unknown' ? t('weather.unknown') : t(`weather.${adv.level}`, {
    chance: adv.reasons[0]?.chance, mm: adv.reasons[0]?.rainMm, et0: adv.reasons[0]?.et0 }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t('weather.title')}</h1>
      <p className="mt-2 max-w-2xl text-ink/70">{t('weather.intro')}</p>

      <div className="card mt-6 space-y-4">
        <button type="button" className="btn-primary" onClick={useMyLocation} disabled={status === 'locating'}>
          <MapPin className="h-4 w-4" aria-hidden="true" /> {status === 'locating' ? t('weather.locating') : t('weather.useMyLocation')}
        </button>
        <p className="text-xs uppercase tracking-wide text-ink/50">{t('weather.or')}</p>
        <form onSubmit={search} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[14rem] flex-1">
            <label htmlFor="w-q" className="label">{t('weather.searchLabel')}</label>
            <input id="w-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn-outline"><Search className="h-4 w-4" aria-hidden="true" /> {t('weather.searchBtn')}</button>
        </form>
        {results && (results.length === 0 ? <p className="text-sm text-ink/70">{t('weather.noPlaces')}</p> : (
          <ul className="divide-y divide-earth/10 rounded-lg border border-earth/15">
            {results.map((r) => (
              <li key={`${r.latitude},${r.longitude}`}>
                <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-leaf-light"
                  onClick={() => { setPlace({ label: [r.name, r.district, r.state].filter(Boolean).join(', '), latitude: r.latitude, longitude: r.longitude }); setResults(null); }}>
                  {[r.name, r.district, r.state].filter(Boolean).join(', ')}
                </button>
              </li>
            ))}
          </ul>
        ))}
        {farms.length > 0 && (
          <div>
            <label htmlFor="w-farm" className="label">{t('weather.savedFarms')}</label>
            <select id="w-farm" className="input" defaultValue="" onChange={(e) => { const f = farms.find((x) => x._id === e.target.value); if (f) setPlace({ label: f.name, latitude: f.latitude, longitude: f.longitude }); }}>
              <option value="" disabled>{t('weather.pickFarm')}</option>
              {farms.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
            </select>
          </div>
        )}
      </div>

      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {status === 'loading' && <p className="mt-4 text-ink/60" role="status">{t('weather.loading')}</p>}

      {forecast && status !== 'loading' && (
        <div className="mt-6 space-y-6">
          <section className="card">
            <h2 className="text-lg font-semibold">{t('weather.now')}{place?.label ? `: ${place.label}` : ''}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-3">
              <p className="flex items-center gap-2 font-display text-5xl font-bold text-forest"><CloudSun className="h-10 w-10 text-gold" aria-hidden="true" />{round(forecast.current.tempC)}°C</p>
              <p className="text-ink/80">{t(`weather.${codeKey(forecast.current.code)}`)}</p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-4">
                <div><dt className="text-ink/55">{t('weather.feels')}</dt><dd>{round(forecast.current.feelsC)}°C</dd></div>
                <div><dt className="flex items-center gap-1 text-ink/55"><Droplets className="h-3.5 w-3.5" aria-hidden="true" />{t('weather.humidity')}</dt><dd>{round(forecast.current.humidity)}%</dd></div>
                <div><dt className="flex items-center gap-1 text-ink/55"><Wind className="h-3.5 w-3.5" aria-hidden="true" />{t('weather.wind')}</dt><dd>{round(forecast.current.windKmh)} km/h</dd></div>
                <div><dt className="text-ink/55">{t('weather.rainNow')}</dt><dd>{forecast.current.rainMm ?? 0} mm</dd></div>
              </dl>
            </div>
          </section>

          <section className="card border-leaf/40 bg-leaf-light/50">
            <h2 className="text-lg font-semibold">{t('weather.adviceTitle')}</h2>
            <p className="mt-2">{advText}</p>
            <p className="mt-2 text-xs text-ink/60">{t('weather.adviceNote')}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">{t('weather.next7')}</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {forecast.daily.map((d) => (
                <li key={d.date} className="card p-4 text-sm">
                  <p className="font-semibold">{fmtDay(d.date)}</p>
                  <p className="text-ink/70">{t(`weather.${codeKey(d.code)}`)}</p>
                  <p className="mt-1 font-medium">{round(d.maxC)}° / {round(d.minC)}°C</p>
                  <p className="text-ink/60">{t('weather.rainChance')}: {d.rainChance ?? '-'}%</p>
                  <p className="text-ink/60">{t('weather.rain')}: {d.rainMm ?? 0} mm</p>
                </li>
              ))}
            </ul>
          </section>
          <p className="text-xs text-ink/60">{t('weather.source', { source: forecast.source })}</p>
        </div>
      )}
    </div>
  );
}
