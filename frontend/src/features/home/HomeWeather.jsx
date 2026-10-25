import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Droplets, MapPin, Snowflake, Sun, Wind } from 'lucide-react';
import api, { errorMessage } from '../../services/api.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

// Real forecast from the weather service (Open-Meteo). Nothing is shown until there is a place to look up:
// a farmer's saved farm, or the visitor's own location after they press the button. The browser never asks for location by itself.
const PLACE_KEY = 'krishimitra_home_place';
const readPlace = () => { try { const p = JSON.parse(sessionStorage.getItem(PLACE_KEY)); return p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude) ? p : null; } catch { return null; } };
const codeKey = (c) => (c === 0 ? 'c_clear' : c <= 3 ? 'c_partly' : c === 45 || c === 48 ? 'c_fog' : c >= 51 && c <= 57 ? 'c_drizzle'
  : c >= 61 && c <= 67 ? 'c_rain' : c >= 71 && c <= 77 ? 'c_snow' : c >= 80 && c <= 82 ? 'c_showers' : c >= 95 ? 'c_storm' : 'c_unknown');
const iconFor = (c) => (c === 0 ? Sun : c <= 3 ? CloudSun : c === 45 || c === 48 ? CloudFog : c >= 51 && c <= 67 ? CloudRain : c >= 71 && c <= 77 ? Snowflake : c >= 80 && c <= 82 ? CloudRain : c >= 95 ? CloudLightning : Cloud);
const round = (n) => (typeof n === 'number' ? Math.round(n) : '-');

export default function HomeWeather() {
  const { t, lang } = useI18n(); const { user } = useAuth();
  const [place, setPlace] = useState(readPlace);   // { label, latitude, longitude }
  const [state, setState] = useState({ data: null, error: '', loading: false });
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  // A farmer with a saved farm that has coordinates sees that farm's weather straight away.
  useEffect(() => {
    if (user?.role !== 'farmer' || place) return undefined;
    let live = true;
    api.get('/farms').then((r) => {
      const f = r.data.data.find((x) => x.latitude != null && x.longitude != null);
      if (live && f) setPlace({ label: f.name, latitude: f.latitude, longitude: f.longitude, farm: true });
    }).catch(() => { /* no farm shown: the button below still works */ });
    return () => { live = false; };
  }, [user, place]);

  useEffect(() => {
    if (!place) return undefined;
    let live = true;
    setState({ data: null, error: '', loading: true });
    api.get('/weather', { params: { lat: place.latitude, lon: place.longitude } })
      .then((r) => { if (live) setState({ data: r.data.data, error: '', loading: false }); })
      .catch((e) => { if (live) setState({ data: null, error: errorMessage(e), loading: false }); });
    return () => { live = false; };
  }, [place]);

  const locate = () => {
    setLocError('');
    if (!navigator.geolocation) { setLocError(t('weather.unsupported')); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // About 1 km precision is plenty for a forecast, and it is all that is kept (this tab only).
        const p = { label: '', latitude: Math.round(pos.coords.latitude * 100) / 100, longitude: Math.round(pos.coords.longitude * 100) / 100 };
        try { sessionStorage.setItem(PLACE_KEY, JSON.stringify(p)); } catch { /* storage blocked */ }
        setLocating(false); setPlace(p);
      },
      (err) => { setLocating(false); setLocError(t(err.code === 1 ? 'weather.denied' : 'weather.unavailable')); },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  };

  const { data, error, loading } = state;
  const Icon = data ? iconFor(data.current.code) : CloudSun;
  const day = (d) => new Date(`${d}T00:00:00`).toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'short' });
  const where = place?.farm ? `${t('shop.wFarm')}: ${place.label}` : t('shop.wHere');

  return (
    <section className="card" aria-label={t('shop.wTitle')}>
      <h2 className="flex items-center gap-2 text-lg font-semibold"><CloudSun className="h-5 w-5 text-gold" aria-hidden="true" /> {t('shop.wTitle')}</h2>

      {!place && (
        <div className="mt-3">
          <button type="button" className="btn-primary w-full" onClick={locate} disabled={locating}><MapPin className="h-4 w-4" aria-hidden="true" /> {locating ? t('shop.wLocating') : t('shop.wLocate')}</button>
          {locError && <p role="alert" className="mt-2 text-sm text-red-800">{locError}</p>}
          <p className="mt-2 text-xs text-ink/60">{t('shop.wNote')}</p>
        </div>
      )}
      {place && loading && <p role="status" className="mt-3 text-sm text-ink/60">{t('weather.loading')}</p>}
      {place && error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {data && (
        <>
          <p className="mt-2 flex items-center gap-1 text-xs text-ink/65"><MapPin className="h-3.5 w-3.5" aria-hidden="true" /> {where}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div><p className="font-display text-5xl font-bold text-forest-dark">{round(data.current.tempC)}°C</p><p className="mt-1 text-sm text-ink/75">{t(`weather.${codeKey(data.current.code)}`)}</p></div>
            <Icon className="h-14 w-14 text-gold" aria-hidden="true" />
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 border-y border-earth/10 py-3 text-center text-xs">
            <div><dt className="flex items-center justify-center gap-1 text-ink/55"><Droplets className="h-3.5 w-3.5" aria-hidden="true" />{t('weather.humidity')}</dt><dd className="mt-0.5 text-sm font-semibold">{round(data.current.humidity)}%</dd></div>
            <div><dt className="flex items-center justify-center gap-1 text-ink/55"><Wind className="h-3.5 w-3.5" aria-hidden="true" />{t('weather.wind')}</dt><dd className="mt-0.5 text-sm font-semibold">{round(data.current.windKmh)} km/h</dd></div>
            <div><dt className="text-ink/55">{t('weather.feels')}</dt><dd className="mt-0.5 text-sm font-semibold">{round(data.current.feelsC)}°C</dd></div>
          </dl>
          <ul className="mt-3 grid grid-cols-4 gap-1 text-center text-xs">
            {data.daily.slice(1, 5).map((d) => {
              const DayIcon = iconFor(d.code);
              return (
                <li key={d.date}><p className="text-ink/60">{day(d.date)}</p><DayIcon className="mx-auto my-1 h-5 w-5 text-gold" aria-label={t(`weather.${codeKey(d.code)}`)} /><p className="font-medium">{round(d.maxC)}°/{round(d.minC)}°</p></li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-ink/50">{t('weather.source', { source: data.source })}</p>
        </>
      )}
      <Link to="/weather" className="btn-primary mt-4 w-full">{t('shop.wFull')}</Link>
    </section>
  );
}
