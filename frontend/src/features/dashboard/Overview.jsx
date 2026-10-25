import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Calculator, CheckCircle2, Circle, CloudSun, Droplets, MapPin, Sprout, Store, Tractor, Wheat } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import api, { errorMessage } from '../../services/api.js';
import { Badge, ErrorBox, Loading, PageTitle, Stat, fmtDate, useFetch } from '../../components/common/ui.jsx';

const COLORS = ['#1B4D2E', '#5BA83C', '#E3A81C', '#7A5230', '#2A6B43', '#B8841C'];
const stageKey = (s) => `farmer.stage_${s.replace(/-(\w)/g, (_, c) => c.toUpperCase())}`;
const codeKey = (c) => (c === 0 ? 'c_clear' : c <= 3 ? 'c_partly' : c === 45 || c === 48 ? 'c_fog' : c >= 51 && c <= 57 ? 'c_drizzle'
  : c >= 61 && c <= 67 ? 'c_rain' : c >= 71 && c <= 77 ? 'c_snow' : c >= 80 && c <= 82 ? 'c_showers' : c >= 95 ? 'c_storm' : 'c_unknown');

function QuickActions() {
  const { t } = useI18n();
  const actions = [
    { to: '/my-farm', label: t('farmer.qaAddFarm'), icon: Tractor },
    { to: '/my-crops', label: t('farmer.qaAddCrop'), icon: Wheat },
    { to: '/calculators/seed-calculator', label: t('farmer.qaSeedCalc'), icon: Sprout },
    { to: '/calculators', label: t('farmer.qaCalcs'), icon: Calculator },
    { to: '/marketplace', label: t('farmer.qaMarket'), icon: Store },
  ];
  return (
    <section aria-label={t('farmer.quick')} className="flex flex-wrap gap-3">
      <Link to="/sell-produce" className="btn-primary"><Sprout className="h-4 w-4" aria-hidden="true" /> {t('sell.sellCta')}</Link>
      {actions.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} className="btn-outline bg-white"><Icon className="h-4 w-4" aria-hidden="true" /> {label}</Link>
      ))}
    </section>
  );
}

// Shown until the farmer has recorded a farm and a crop. Each step is ticked from real records only.
function GetStarted({ hasFarm, hasCrop }) {
  const { t } = useI18n();
  const steps = [
    { done: hasFarm, to: '/my-farm', title: t('farmer.stepFarm'), text: t('farmer.stepFarmText') },
    { done: hasCrop, to: '/my-crops', title: t('farmer.stepCrop'), text: t('farmer.stepCropText') },
  ];
  return (
    <section className="card border-gold/40 bg-gold-light/40">
      <h2 className="text-lg font-semibold">{t('farmer.startTitle')}</h2>
      <p className="mt-1 text-sm text-ink/70">{t('farmer.startText')}</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.to}>
            <Link to={s.to} className="flex h-full items-start gap-3 rounded-lg bg-white p-3 hover:shadow-sm">
              {s.done ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-leaf" aria-hidden="true" /> : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-ink/40" aria-hidden="true" />}
              <span className="text-sm"><span className="font-semibold">{i + 1}. {s.title}</span>{s.done && <span className="ml-2 text-xs text-forest">{t('farmer.done')}</span>}<br /><span className="text-ink/65">{s.text}</span></span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Live forecast for the first farm that has coordinates. Real data from the weather service, never a placeholder.
function WeatherCard({ farms }) {
  const { t } = useI18n();
  const farm = farms.find((f) => f.latitude != null && f.longitude != null);
  const [state, setState] = useState({ data: null, error: '', loading: Boolean(farm) });
  const { latitude, longitude } = farm || {};

  useEffect(() => {
    if (latitude == null) return undefined;
    let live = true;
    setState({ data: null, error: '', loading: true });
    api.get('/weather', { params: { lat: latitude, lon: longitude } })
      .then((r) => { if (live) setState({ data: r.data.data, error: '', loading: false }); })
      .catch((e) => { if (live) setState({ data: null, error: errorMessage(e), loading: false }); });
    return () => { live = false; };
  }, [latitude, longitude]);

  const { data, error, loading } = state;
  const today = data?.daily?.[0];
  return (
    <section className="card">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><CloudSun className="h-5 w-5 text-forest" aria-hidden="true" /> {t('farmer.weatherTitle', { farm: farm?.name || t('nav.weather') })}</h2>
      {!farm && (
        <>
          <p className="mt-3 text-sm text-ink/65">{t('farmer.weatherNoCoords')}</p>
          <Link to="/my-farm" className="btn-outline mt-3"><MapPin className="h-4 w-4" aria-hidden="true" /> {t('farmer.weatherAddCoords')}</Link>
        </>
      )}
      {farm && loading && <p role="status" className="mt-3 text-sm text-ink/60">{t('weather.loading')}</p>}
      {farm && error && <div className="mt-3"><ErrorBox>{error}</ErrorBox></div>}
      {farm && data && (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-2">
            <p className="font-display text-4xl font-bold text-forest-dark">{typeof data.current.tempC === 'number' ? `${Math.round(data.current.tempC)}°C` : '-'}</p>
            <p className="pb-1 text-sm text-ink/70">{t(`weather.${codeKey(data.current.code)}`)}</p>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="flex items-center gap-1 text-ink/60"><Droplets className="h-4 w-4" aria-hidden="true" /> {t('farmer.weatherHumidity')}</dt><dd className="font-semibold">{typeof data.current.humidity === 'number' ? `${Math.round(data.current.humidity)}%` : '-'}</dd></div>
            <div><dt className="text-ink/60">{t('farmer.weatherRain')}</dt><dd className="font-semibold">{typeof today?.rainChance === 'number' ? `${Math.round(today.rainChance)}%` : '-'}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-ink/55">{t('weather.source', { source: data.source })}</p>
        </>
      )}
      {farm && <Link to="/weather" className="mt-3 inline-block text-sm font-semibold text-forest">{t('farmer.weatherFull')}</Link>}
    </section>
  );
}

function harvestLabel(days, t) {
  if (days == null) return t('farmer.noHarvestDate');
  return days === 0 ? t('farmer.harvestToday') : days === 1 ? t('farmer.harvestTomorrow') : t('farmer.harvestIn', { n: days });
}

export default function Overview() {
  const { t, lang } = useI18n(); const { user } = useAuth();
  const { data, error, loading } = useFetch('/dashboard/farmer');

  if (loading) return <Loading />;
  if (error) return <ErrorBox>{error}</ErrorBox>;
  const d = data;
  const firstName = (user?.name || '').split(' ')[0];
  const maxStage = Math.max(1, ...d.stages.map((s) => s.count));
  const todayText = new Date().toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="space-y-6">
      <div>
        <PageTitle>{t('farmer.welcome', { name: firstName })}</PageTitle>
        <p className="-mt-3 text-sm text-ink/65">{todayText}. {t('farmer.subtitle')}</p>
      </div>

      <QuickActions />
      {(d.farmCount === 0 || d.activeCropCount === 0) && <GetStarted hasFarm={d.farmCount > 0} hasCrop={d.activeCropCount > 0} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={t('farmer.statFarms')} value={d.farmCount} />
        <Stat label={t('farmer.statLand')} value={d.totalAcres} hint={d.bighaFarmsExcluded ? t('farmer.statLandHint') : undefined} />
        <Stat label={t('farmer.statCrops')} value={d.activeCropCount} />
        <Stat label={t('farmer.statNextHarvest')} value={harvestLabel(d.nextHarvestInDays, t)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <WeatherCard farms={d.farms} />

        <section className="card">
          <h2 className="text-lg font-semibold">{t('farmer.activity')}</h2>
          <ul className="mt-3 divide-y divide-earth/10 text-sm">
            <li className="flex items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-2"><Bell className="h-4 w-4 text-forest" aria-hidden="true" /> {t('farmer.unread')}</span>
              <Link to="/notifications" className="font-semibold text-forest">{d.unreadNotifications} · {t('farmer.viewAll')}</Link>
            </li>
            <li className="flex items-center justify-between gap-3 py-3">
              <span className="flex items-center gap-2"><Store className="h-4 w-4 text-forest" aria-hidden="true" /> {t('farmer.listings')}</span>
              <Link to="/my-products" className="text-right font-semibold text-forest">{t('farmer.listingsLive', { n: d.listings.live })}{d.listings.pending > 0 && ` · ${t('farmer.listingsPending', { n: d.listings.pending })}`}</Link>
            </li>
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="text-lg font-semibold">{t('farmer.distTitle')}</h2>
          {d.distribution.length === 0 ? (
            <p className="mt-4 text-sm text-ink/65">{t('farmer.noCrops')} <Link className="font-semibold text-forest" to={d.farmCount === 0 ? '/my-farm' : '/my-crops'}>{d.farmCount === 0 ? t('farmer.qaAddFarm') : t('farmer.qaAddCrop')}</Link></p>
          ) : (
            <div className="mt-2 h-64" role="img" aria-label={t('farmer.chartLabel')}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.distribution} dataKey="area" nameKey="name" outerRadius="75%" label>
                    {d.distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="card">
          <h2 className="text-lg font-semibold">{t('farmer.stagesTitle')}</h2>
          {d.stages.length === 0 ? <p className="mt-4 text-sm text-ink/65">{t('farmer.noCrops')}</p> : (
            <ul className="mt-4 space-y-3">
              {d.stages.map(({ stage, count }) => (
                <li key={stage} className="text-sm">
                  <div className="flex justify-between"><span>{t(stageKey(stage))}</span><span className="font-semibold">{count}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-leaf-light"><div className="h-2 rounded-full bg-forest" style={{ width: `${(count / maxStage) * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t('farmer.cropsTitle')}</h2><Link to="/my-crops" className="text-sm font-semibold text-forest">{t('farmer.manage')}</Link></div>
        {d.activeCrops.length === 0 ? <p className="mt-4 text-sm text-ink/65">{t('farmer.noCrops')}</p> : (
          <ul className="mt-3 divide-y divide-earth/10">
            {d.activeCrops.map((c) => (
              <li key={c._id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span><span className="font-semibold">{c.name}</span>{c.variety && <span className="text-ink/60"> ({c.variety})</span>}{c.farmName && <span className="text-ink/60"> {t('farmer.onFarm', { farm: c.farmName })}</span>}</span>
                  <Badge kind="info" label={t(stageKey(c.growthStage))} />
                </div>
                <p className="mt-1 text-xs text-ink/60">{t('farmer.sown', { date: fmtDate(c.sowingDate, lang) })}{c.expectedHarvestDate && ` · ${t('farmer.harvestOn', { date: fmtDate(c.expectedHarvestDate, lang) })}`}</p>
                {c.progress != null && (
                  <div className="mt-2 h-2 rounded-full bg-leaf-light" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.progress} aria-label={t('farmer.progress', { n: c.progress })}>
                    <div className="h-2 rounded-full bg-leaf" style={{ width: `${c.progress}%` }} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card">
          <h2 className="text-lg font-semibold">{t('farmer.harvestsTitle')}</h2>
          {d.upcomingHarvests.length === 0 ? <p className="mt-4 text-sm text-ink/65">{t('farmer.noHarvests')}</p> : (
            <ul className="mt-3 divide-y divide-earth/10">
              {d.upcomingHarvests.map((c) => (
                <li key={c._id} className="flex justify-between py-2 text-sm">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-ink/65">{fmtDate(c.expectedHarvestDate, lang)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t('farmer.farmsTitle')}</h2><Link to="/my-farm" className="text-sm font-semibold text-forest">{t('farmer.manage')}</Link></div>
          {d.farms.length === 0 ? <p className="mt-4 text-sm text-ink/65">{t('farmer.noFarms')} <Link className="font-semibold text-forest" to="/my-farm">{t('farmer.qaAddFarm')}</Link></p> : (
            <ul className="mt-3 divide-y divide-earth/10">
              {d.farms.map((f) => (
                <li key={f._id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span><span className="font-medium">{f.name}</span>{f.location && <span className="flex items-center gap-1 text-xs text-ink/60"><MapPin className="h-3 w-3" aria-hidden="true" /> {f.location}</span>}</span>
                  <span className="shrink-0 text-ink/65">{f.area} {f.unit}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
