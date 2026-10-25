import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SmartImage from '../../components/common/SmartImage.jsx';
import { heroSlides } from '../../constants/content.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { dashboardFor } from '../auth/authHelpers.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';

const INTERVAL_MS = 4500;

// The banner at the top of the home page. Photos are the bundled farming pictures.
export default function HeroSlider() {
  const { user } = useAuth();
  const { t } = useI18n();
  const dashboard = dashboardFor(user);
  const dashboardLabel = user?.role === 'admin' ? t('nav.adminPanel') : user?.role === 'vendor' ? t('seller.nav_dashboard') : user?.role === 'customer' ? t('customer.nav_dashboard') : t('farmer.openDashboard');
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = (i) => setIndex((i + heroSlides.length) % heroSlides.length);

  // Auto-advance, but stop while the user hovers or focuses so they can read and use the controls.
  useEffect(() => {
    if (paused) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % heroSlides.length), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <section
      aria-roledescription="carousel" aria-label={t('shop.heroLabel')}
      className="relative h-72 overflow-hidden rounded-2xl bg-forest-dark md:h-[22rem]"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
    >
      {heroSlides.map((slide, i) => (
        <div key={slide.id} aria-hidden={i !== index} className={`absolute inset-0 transition-opacity duration-700 ${i === index ? 'opacity-100' : 'opacity-0'}`}>
          <SmartImage folder="hero" name={slide.id} alt={slide.alt} eager={i === 0} className="h-full w-full" />
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-r from-forest-dark/90 via-forest-dark/55 to-transparent" />

      <div className="relative flex h-full flex-col justify-center px-6 md:px-14">
        <h1 className="max-w-md text-3xl font-bold leading-tight text-white md:text-5xl">{t('shop.heroTitle')}</h1>
        <p className="mt-3 max-w-md text-sm text-white/90 md:text-base">{t('shop.heroSub')}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/marketplace" className="btn-gold">{t('shop.shopNow')}</Link>
          {dashboard
            ? <Link to={dashboard} className="btn bg-white text-forest hover:bg-leaf-light">{dashboardLabel}</Link>
            : <a href="#features" className="btn bg-white text-forest hover:bg-leaf-light">{t('shop.exploreMore')}</a>}
        </div>
      </div>

      <button onClick={() => go(index - 1)} aria-label={t('shop.prev')} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-forest shadow hover:bg-white"><ChevronLeft className="h-5 w-5" /></button>
      <button onClick={() => go(index + 1)} aria-label={t('shop.next')} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 text-forest shadow hover:bg-white"><ChevronRight className="h-5 w-5" /></button>
      <div className="absolute bottom-4 left-6 flex gap-2 md:left-14">
        {heroSlides.map((s, i) => (
          <button key={s.id} onClick={() => go(i)} aria-label={t('shop.goTo', { n: i + 1 })} aria-current={i === index}
            className={`h-2.5 rounded-full transition-all ${i === index ? 'w-6 bg-gold' : 'w-2.5 bg-white/70'}`} />
        ))}
      </div>
    </section>
  );
}
