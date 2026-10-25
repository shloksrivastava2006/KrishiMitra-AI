import { Link } from 'react-router-dom';
import { BadgeCheck, Layers, ShieldCheck, ShoppingCart, Sprout, Store, Wallet } from 'lucide-react';
import HeroSlider from './HeroSlider.jsx';
import HomeCategories from './HomeCategories.jsx';
import HomeProducts from './HomeProducts.jsx';
import HomeWeather from './HomeWeather.jsx';
import SmartImage from '../../components/common/SmartImage.jsx';
import FeatureGrid from './FeatureGrid.jsx';
import { crops } from '../../constants/content.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { dashboardFor } from '../auth/authHelpers.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';

const steps = [
  { title: 'Add your farm', text: 'Enter land area, soil and water source once.' },
  { title: 'Record your crops', text: 'Track sowing dates, growth stage and harvest dates.' },
  { title: 'Use the tools', text: 'Calculate fertilizer, check plants and plan irrigation.' },
  { title: 'Buy and rent', text: 'Find inputs and rent machinery.' },
];

// Four plain facts about how the marketplace works, taken from the app's own rules (no promises about prices or delivery times).
const facts = [
  { icon: Layers, title: 'shop.f1t', text: 'shop.f1x' },
  { icon: Sprout, title: 'shop.f2t', text: 'shop.f2x' },
  { icon: Wallet, title: 'shop.f3t', text: 'shop.f3x' },
  { icon: BadgeCheck, title: 'shop.f4t', text: 'shop.f4x' },
];

export default function HomePage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const dashboard = dashboardFor(user);
  const dashboardLabel = user?.role === 'admin' ? t('nav.adminPanel') : user?.role === 'vendor' ? t('seller.nav_dashboard') : user?.role === 'customer' ? t('customer.nav_dashboard') : t('farmer.openDashboard');
  return (
    <>
      <div className="mx-auto grid max-w-7xl gap-6 px-4 pt-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-8">
          <HeroSlider />

          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {facts.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-3 rounded-xl border border-earth/15 bg-white p-4">
                <span className="rounded-lg bg-leaf-light p-2.5 text-forest"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <span><span className="block text-sm font-semibold">{t(title)}</span><span className="mt-0.5 block text-xs text-ink/65">{t(text)}</span></span>
              </li>
            ))}
          </ul>

          <HomeCategories />
          <HomeProducts />
        </div>

        <aside className="min-w-0 space-y-6" aria-label={t('shop.wTitle')}>
          <HomeWeather />

          <section className="card bg-gradient-to-br from-leaf-light to-white">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><ShieldCheck className="h-5 w-5 text-forest" aria-hidden="true" /> {t('shop.commTitle')}</h2>
            <p className="mt-2 text-sm text-ink/75">{t('shop.commText')}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {dashboard
                ? <Link to={dashboard} className="btn-primary">{dashboardLabel}</Link>
                : (
                  <>
                    <Link to="/register" className="btn-outline bg-white"><Sprout className="h-4 w-4" aria-hidden="true" /> {t('shop.becomeFarmer')}</Link>
                    <Link to="/register" state={{ tab: 'seller' }} className="btn-primary"><Store className="h-4 w-4" aria-hidden="true" /> {t('shop.becomeVendor')}</Link>
                    <Link to="/register" state={{ tab: 'customer' }} className="btn-outline bg-white"><ShoppingCart className="h-4 w-4" aria-hidden="true" /> {t('shop.becomeCustomer')}</Link>
                  </>
                )}
            </div>
          </section>
        </aside>
      </div>

      <section id="features" className="mx-auto max-w-7xl scroll-mt-32 px-4 pt-16">
        <h2 className="max-w-2xl text-3xl font-bold">Tools for the decisions a farm season depends on</h2>
        <FeatureGrid />
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-4">
        <h2 className="text-3xl font-bold">How it works</h2>
        <ol className="mt-8 grid gap-5 md:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-xl bg-earth-light p-5">
              <span className="font-display text-2xl font-bold text-earth">{i + 1}</span>
              <h3 className="mt-2 font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-ink/75">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="crops" className="mx-auto mt-16 max-w-7xl scroll-mt-32 px-4">
        <h2 className="text-3xl font-bold">Crop recommendation</h2>
        <p className="mt-2 max-w-xl text-ink/70">Typical sowing seasons vary by region and variety. Tap a crop for its full guide, or <Link to="/recommend" className="font-semibold text-forest underline">get recommendations for your soil and month</Link>.</p>
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {crops.map((c) => (
            <Link key={c.id} to={`/recommend?crop=${c.id}`} className="block overflow-hidden rounded-xl border border-earth/15 bg-white transition-shadow hover:shadow-md">
              <SmartImage folder="crops" name={c.id} alt={`${c.name} crop`} className="aspect-[4/3] w-full" />
              <div className="p-3">
                <h3 className="font-semibold">{c.name}</h3>
                <p className="text-xs text-ink/65">{c.season}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-7xl px-4">
        <div className="rounded-2xl bg-forest p-8 text-white md:flex md:items-center md:justify-between">
          {dashboard ? (
            <>
              <div>
                <h2 className="text-2xl font-bold !text-white">{t('farmer.homeCtaTitle')}</h2>
                <p className="mt-2 max-w-xl text-white/80">{t('farmer.homeCtaText')}</p>
              </div>
              <Link to={dashboard} className="btn-gold mt-5 md:mt-0">{dashboardLabel}</Link>
            </>
          ) : (
            <>
              <div>
                <h2 className="text-2xl font-bold !text-white">Start with your own farm records</h2>
                <p className="mt-2 max-w-xl text-white/80">Free to register as a farmer, seller or customer. Your records stay private to your account.</p>
              </div>
              <Link to="/register" className="btn-gold mt-5 md:mt-0">Create an account</Link>
            </>
          )}
        </div>
      </section>
    </>
  );
}
