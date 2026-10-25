import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { X } from 'lucide-react';
import api, { errorMessage } from '../../services/api.js';
import Field from '../../components/common/Field.jsx';
import SmartImage from '../../components/common/SmartImage.jsx';
import { Empty, ErrorBox, Loading, PageTitle } from '../../components/common/ui.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useAuth } from '../auth/AuthContext.jsx';

const SOILS = ['alluvial', 'black', 'red', 'laterite', 'sandy', 'loamy', 'clay', 'unknown'];
const WATER = ['low', 'medium', 'high'];
const CATEGORIES = ['grain', 'pulse', 'oilseed', 'vegetable', 'fruit', 'cash'];
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
// A saved farm's irrigation method gives a starting guess for water supply; the farmer can change it.
const WATER_FROM_IRRIGATION = { rainfed: 'low', canal: 'high', tubewell: 'high', drip: 'medium', sprinkler: 'medium', other: 'medium' };
const cropKey = (id) => `recommend.crop_${id.replace(/-/g, '_')}`;

function useMonthName() {
  const { lang } = useI18n();
  const loc = lang === 'hi' ? 'hi-IN' : 'en-IN';
  return (m, style = 'long') => new Date(2024, m - 1, 1).toLocaleString(loc, { month: style });
}

// "Jun, Jul and Oct to Nov" style summary of a list of months.
function monthsText(list, name) {
  const sorted = [...list].sort((a, b) => a - b); const parts = []; let i = 0;
  while (i < sorted.length) {
    let j = i; while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    parts.push(j - i >= 2 ? `${name(sorted[i], 'short')} to ${name(sorted[j], 'short')}` : sorted.slice(i, j + 1).map((m) => name(m, 'short')).join(', '));
    i = j + 1;
  }
  return parts.join(', ');
}

function Duration({ days }) {
  const { t } = useI18n();
  return days[0] >= 365 ? t('recommend.durYears', { min: Math.round(days[0] / 365), max: Math.round(days[1] / 365) }) : t('recommend.days', { min: days[0], max: days[1] });
}

function MonthStrip({ crop }) {
  const { t } = useI18n(); const name = useMonthName();
  return (
    <div>
      <ul className="grid grid-cols-12 gap-1" aria-label={t('recommend.calendar')}>
        {MONTHS.map((m) => {
          const sow = crop.sow.includes(m); const har = crop.harvest.includes(m);
          return (
            <li key={m} className={`rounded text-center text-[10px] font-semibold leading-none sm:text-xs ${sow && har ? 'bg-gradient-to-b from-leaf to-gold text-forest-dark' : sow ? 'bg-leaf text-white' : har ? 'bg-gold text-forest-dark' : 'bg-earth-light text-ink/40'}`}>
              <span className="block py-2">{name(m, 'narrow')}</span>
              <span className="sr-only">{name(m)}{sow ? `: ${t('recommend.legendSow')}` : ''}{har ? `: ${t('recommend.legendHarvest')}` : ''}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/70">
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-leaf align-middle" />{t('recommend.legendSow')}: {monthsText(crop.sow, name)}</span>
        <span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-gold align-middle" />{t('recommend.legendHarvest')}: {monthsText(crop.harvest, name)}</span>
      </p>
    </div>
  );
}

function CropDetail({ crop, soil, onClose }) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  const name = t(cropKey(crop.id));
  const soils = (list) => list.map((s) => t(`recommend.soil_${s}`)).join(', ');
  const sections = [['sec_land', 'land'], ['sec_sowing', 'sowing'], ['sec_water', 'water'], ['sec_feed', 'feed'], ['sec_yield', 'yield']];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={name} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="relative">
          <SmartImage folder="crops" name={crop.image || 'vegetables'} alt={name} className="h-48 w-full sm:h-56" eager />
          <button type="button" onClick={onClose} aria-label={t('recommend.close')} className="absolute right-3 top-3 rounded-full bg-white/90 p-2 text-ink shadow hover:bg-white"><X className="h-5 w-5" aria-hidden="true" /></button>
        </div>
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-forest">{t(`recommend.cat_${crop.category}`)}</p>
            <h2 className="font-display text-2xl font-bold">{name}</h2>
            <p className="mt-1 text-sm text-ink/70"><Duration days={crop.days} /> &middot; {t(`recommend.need_${crop.water}`)}</p>
          </div>
          <section><h3 className="mb-2 text-sm font-semibold">{t('recommend.calendar')}</h3><MonthStrip crop={crop} /></section>
          <section className="rounded-lg bg-leaf-light/60 p-3 text-sm">
            <p><strong>{t('recommend.goodSoils')}:</strong> {soils(crop.soilGood)}</p>
            {crop.soilOk.length > 0 && <p className="mt-1"><strong>{t('recommend.okSoils')}:</strong> {soils(crop.soilOk)}</p>}
            {soil !== 'unknown' && crop.soilFit !== 'unknown' && <p className="mt-1 text-forest">{t(`recommend.why_soil_${crop.soilFit}`, { soil: t(`recommend.soil_${soil}`) })}</p>}
          </section>
          {sections.map(([title, key]) => (
            <section key={key}><h3 className="text-sm font-semibold text-forest">{t(`recommend.${title}`)}</h3><p className="mt-1 text-sm leading-relaxed text-ink/85">{crop.guide[key]}</p></section>
          ))}
          <p className="rounded-lg bg-gold-light/60 p-3 text-xs text-ink/80">{t('recommend.guideNote')}</p>
          <div className="flex flex-wrap gap-2">
            <Link to="/calculators/seed-calculator" className="btn-outline">{t('recommend.seedCalc')}</Link>
            <Link to={`/my-expenses?crop=${encodeURIComponent(name.replace(/\s*\(.*\)$/, ''))}`} className="btn-primary">{t('recommend.planCost')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RecommendPage() {
  const { t } = useI18n(); const { user } = useAuth(); const monthName = useMonthName();
  const [params, setParams] = useSearchParams();
  const wanted = params.get('crop');                       // e.g. /recommend?crop=wheat opens that crop straight away
  const [month, setMonth] = useState(() => (wanted ? 'any' : String(new Date().getMonth() + 1)));
  const [soil, setSoil] = useState('unknown'); const [water, setWater] = useState(wanted ? 'high' : 'medium');
  const [farms, setFarms] = useState([]); const [farmId, setFarmId] = useState(''); const [farmName, setFarmName] = useState('');
  const [crops, setCrops] = useState(null); const [error, setError] = useState('');
  const [category, setCategory] = useState('all'); const [open, setOpen] = useState(null);

  useEffect(() => {
    if (user?.role !== 'farmer') return;
    api.get('/farms').then((r) => setFarms(r.data.data)).catch(() => {});
  }, [user?.role]);

  useEffect(() => {
    let live = true; setError('');
    api.get('/recommend', { params: month === 'any' ? { season: 'any', soil, water } : { month, soil, water } })
      .then((r) => live && setCrops(r.data.data.crops)).catch((e) => live && setError(errorMessage(e)));
    return () => { live = false; };
  }, [month, soil, water]);

  // Open the crop named in the link once the list has loaded.
  useEffect(() => { if (wanted && crops) { const c = crops.find((x) => x.id === wanted); if (c) setOpen(c); } }, [wanted, crops]);
  const close = () => { setOpen(null); if (params.get('crop')) { const p = new URLSearchParams(params); p.delete('crop'); setParams(p, { replace: true }); } };

  const pickFarm = (id) => {
    setFarmId(id);
    const f = farms.find((x) => x._id === id);
    if (!f) { setFarmName(''); return; }
    setSoil(f.soilType === 'other' || !SOILS.includes(f.soilType) ? 'unknown' : f.soilType);
    setWater(WATER_FROM_IRRIGATION[f.irrigationMethod] || 'medium'); setFarmName(f.name);
  };
  const manual = (setter) => (e) => { setter(e.target.value); setFarmName(''); };

  const counts = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c, (crops || []).filter((x) => x.category === c).length])), [crops]);
  const shown = (crops || []).filter((c) => category === 'all' || c.category === category);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <PageTitle>{t('recommend.title')}</PageTitle>
      <p className="max-w-2xl text-ink/70">{t('recommend.intro')}</p>
      <p className="mt-3 max-w-3xl rounded-lg bg-gold-light/60 p-3 text-xs text-ink/80">{t('recommend.disclaimer')}</p>

      <form onSubmit={(e) => e.preventDefault()} className="card mt-6 grid gap-4 sm:grid-cols-3">
        {farms.length > 0 && (
          <div className="sm:col-span-3">
            <Field id="r-farm" label={t('recommend.useFarm')}>
              <select id="r-farm" className="input" value={farmId} onChange={(e) => pickFarm(e.target.value)}>
                <option value="">{t('recommend.farmNone')}</option>{farms.map((f) => <option key={f._id} value={f._id}>{f.name}</option>)}
              </select>
            </Field>
            {farmName && <p className="mt-1 text-xs text-ink/60">{t('recommend.farmFilled', { name: farmName })}</p>}
          </div>
        )}
        <Field id="r-month" label={t('recommend.month')}>
          <select id="r-month" className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="any">{t('recommend.anyMonth')}</option>
            {MONTHS.map((m) => <option key={m} value={m}>{monthName(m)}</option>)}
          </select>
        </Field>
        <Field id="r-soil" label={t('recommend.soil')}><select id="r-soil" className="input" value={soil} onChange={manual(setSoil)}>{SOILS.map((s) => <option key={s} value={s}>{t(`recommend.soil_${s}`)}</option>)}</select></Field>
        <Field id="r-water" label={t('recommend.water')}><select id="r-water" className="input" value={water} onChange={manual(setWater)}>{WATER.map((w) => <option key={w} value={w}>{t(`recommend.water_${w}`)}</option>)}</select></Field>
      </form>

      <h2 className="mb-3 mt-8 text-xl font-semibold">{t('recommend.results')}</h2>
      <ErrorBox>{error}</ErrorBox>
      {!crops && !error && <Loading />}
      {crops && crops.length === 0 && <Empty>{t('recommend.none')}</Empty>}
      {crops && crops.length > 0 && (
        <>
          <div role="tablist" aria-label={t('recommend.results')} className="mb-2 flex flex-wrap gap-2">
            {['all', ...CATEGORIES].filter((c) => c === 'all' || counts[c] > 0).map((c) => (
              <button key={c} role="tab" aria-selected={category === c} onClick={() => setCategory(c)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium ${category === c ? 'border-forest bg-forest text-white' : 'border-earth/25 bg-white text-ink/80 hover:bg-leaf-light'}`}>
                {t(`recommend.cat_${c}`)} <span className="opacity-70">({c === 'all' ? crops.length : counts[c]})</span>
              </button>
            ))}
          </div>
          <p className="mb-4 text-xs text-ink/55">{t('recommend.showing', { n: shown.length })}</p>
        </>
      )}
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => setOpen(c)} className="card flex h-full w-full flex-col overflow-hidden p-0 text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-leaf">
              <SmartImage folder="crops" name={c.image || 'vegetables'} alt="" className="aspect-[4/3] w-full" />
              <span className="flex flex-1 flex-col p-3 text-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-forest">{t(`recommend.cat_${c.category}`)}</span>
                <span className="text-base font-semibold leading-snug">{t(cropKey(c.id))}</span>
                <span className="mt-1 text-xs text-ink/65"><Duration days={c.days} /> &middot; {t(`recommend.need_${c.water}`)}</span>
                <span className="mt-1 text-xs text-ink/80">{t('recommend.legendSow')}: {monthsText(c.sow, monthName)}</span>
                <span className="mt-auto pt-2 text-xs font-semibold text-forest underline">{t('recommend.moreInfo')} →</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      {open && <CropDetail crop={open} soil={soil} onClose={close} />}
    </div>
  );
}
