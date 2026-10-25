import { Link } from 'react-router-dom';
import SmartImage from '../../components/common/SmartImage.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { catKey } from '../market/format.js';

// Every tile leads to something that exists: the marketplace filters or the rentals page. Pictures are the bundled illustrations.
const tiles = (t) => [
  { to: '/marketplace?type=inputs&category=seeds', label: t(catKey('seeds')), img: ['products', 'seeds'] },
  { to: '/marketplace?type=inputs&category=fertilizers', label: t(catKey('fertilizers')), img: ['products', 'fertilizer'] },
  { to: '/marketplace?type=inputs&category=bio-pesticides', label: t(catKey('bio-pesticides')), img: ['products', 'biopesticide'] },
  { to: '/marketplace?type=produce', label: t('shop.navFresh'), img: ['products', 'produce'] },
  { to: '/marketplace?type=inputs&category=machinery', label: t(catKey('machinery')), img: ['equipment', 'tractor'] },
  { to: '/marketplace?type=inputs&category=organic', label: t(catKey('organic')), img: ['products', 'organic'] },
  { to: '/rentals', label: t('nav.rentals'), img: ['equipment', 'rotavator'] },
];

export default function HomeCategories() {
  const { t } = useI18n();
  return (
    <section aria-labelledby="home-cats">
      <div className="flex items-end justify-between gap-3">
        <h2 id="home-cats" className="text-xl font-bold">{t('shop.catTitle')}</h2>
        <Link to="/marketplace" className="text-sm font-semibold text-forest hover:underline">{t('shop.catAll')} →</Link>
      </div>
      <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {tiles(t).map((c) => (
          <li key={c.to}>
            <Link to={c.to} className="flex h-full flex-col items-center gap-2 rounded-xl border border-earth/15 bg-white p-3 text-center text-sm font-medium transition-shadow hover:shadow-md">
              <SmartImage folder={c.img[0]} name={c.img[1]} alt="" className="h-16 w-16 rounded-lg object-contain" />
              <span>{c.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
