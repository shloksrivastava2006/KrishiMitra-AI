import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, Calculator, Search, ShoppingCart, Store, ScanSearch, CalendarCheck, ChevronDown, Landmark, LayoutDashboard, LogOut, Menu, Package, Settings, ShieldCheck, Sprout, Tractor, User, Users, Wallet, Wheat, Wrench, X } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { useCart } from '../../features/market/CartContext.jsx';
import { useToast } from '../common/Toast.jsx';
import LanguageSelect from '../common/LanguageSelect.jsx';
import { CATEGORIES, catKey } from '../../features/market/format.js';
import { navActive } from './navActive.js';

// The green bar under the header. Crop Doctor is a farmer tool: guests see it too (they are asked to log in), other roles do not.
const barLinks = (role) => [
  { to: '/', key: 'nav.home' },
  { to: '/marketplace', key: 'nav.marketplace' },
  { to: '/marketplace?type=produce', key: 'shop.navFresh' },
  { to: '/rentals', key: 'nav.rentals' },
  ...(!role || role === 'farmer' ? [{ to: '/disease', key: 'nav.cropDoctor' }] : []),
  { to: '/recommend', key: 'recommend.title' },
  { to: '/calculators', key: 'nav.calculators' },
  { to: '/weather', key: 'nav.weather' },
  { to: '/mandi', key: 'nav.mandi' },
];

// Everything the site offers, in three columns. Opened by the three-line button. Hiding items is only a convenience; the server checks access.
const siteGroups = (user, t) => {
  const role = user?.role;
  const market = [
    { to: '/marketplace', label: t('nav.marketplace') },
    { to: '/marketplace?type=produce', label: t('shop.navFresh') },
    ...['seeds', 'fertilizers', 'bio-pesticides', 'organic', 'machinery'].map((c) => ({ to: `/marketplace?type=inputs&category=${c}`, label: t(catKey(c)) })),
    { to: '/rentals', label: t('nav.rentals') },
    ...(role !== 'admin' && role !== 'vendor' ? [{ to: '/cart', label: t('nav.cart') }] : []),
  ];
  const tools = [
    { to: '/recommend', label: t('recommend.title') },
    ...(!role || role === 'farmer' ? [{ to: '/disease', label: t('nav.cropDoctor') }] : []),
    { to: '/calculators/seed-calculator', label: t('nav.seedCalculator') },
    { to: '/calculators/land-calculator', label: t('nav.landCalculator') },
    { to: '/calculators/fertilizer-calculator', label: t('nav.fertilizerCalculator') },
    { to: '/calculators', label: t('nav.calculators') },
    { to: '/weather', label: t('nav.weather') },
    { to: '/irrigation', label: t('nav.irrigation') },
    { to: '/mandi', label: t('nav.mandi') },
  ];
  const account = user
    ? accountItems(role).map((i) => ({ to: i.to, label: t(i.key) }))
    : [{ to: '/login', label: t('shop.login') }, { to: '/register', label: t('shop.becomeFarmer') }, { to: '/register', state: { tab: 'seller' }, label: t('shop.becomeVendor') }, { to: '/register', state: { tab: 'customer' }, label: t('shop.becomeCustomer') }];
  return [
    { title: t('shop.menuMarket'), links: market },
    { title: t('shop.menuTools'), links: tools },
    { title: user ? t('shop.menuAccount') : t('shop.menuJoin'), links: account },
  ];
};

// One menu definition per role. Hiding items is only a convenience; the backend enforces access.
const accountItems = (role) => {
  if (role === 'admin') {
    return [
      { to: '/admin', key: 'nav.adminPanel', icon: ShieldCheck },
      { to: '/admin/users', key: 'admin.users', icon: Users },
      { to: '/profile', key: 'nav.profile', icon: User },
      { to: '/notifications', key: 'nav.notifications', icon: Bell },
    ];
  }
  const shared = [
    { to: '/my-orders', key: 'nav.myOrders', icon: Package },
    { to: '/my-bookings', key: 'nav.myBookings', icon: CalendarCheck },
    { to: '/notifications', key: 'nav.notifications', icon: Bell },
    { to: '/profile', key: 'nav.profile', icon: User },
  ];
  const selling = [{ to: '/my-products', key: 'nav.myProducts', icon: Store }, { to: '/my-sales', key: 'nav.mySales', icon: Package }];
  if (role === 'vendor') {
    return [
      { to: '/seller', key: 'seller.nav_dashboard', icon: LayoutDashboard },
      { to: '/seller/products', key: 'seller.nav_myProducts', icon: Store },
      { to: '/seller/orders', key: 'seller.nav_orders', icon: Package },
      { to: '/seller/rentals', key: 'seller.nav_rentals', icon: Tractor },
      { to: '/seller/earnings', key: 'seller.nav_earnings', icon: Wallet },
      { to: '/seller/notifications', key: 'nav.notifications', icon: Bell },
      { to: '/seller/profile', key: 'seller.nav_profile', icon: User },
    ];
  }
  if (role === 'customer') return [{ to: '/customer', key: 'customer.nav_dashboard', icon: LayoutDashboard }, ...shared];
  if (role !== 'farmer') return shared;
  const sellProduce = { to: '/sell-produce', key: 'nav.sellProduce', icon: Sprout };
  return [
    { to: '/my-overview', key: 'nav.overview', icon: LayoutDashboard },
    { to: '/my-farm', key: 'nav.myFarm', icon: Tractor },
    { to: '/my-crops', key: 'nav.myCrops', icon: Wheat },
    { to: '/disease', key: 'nav.cropDoctor', icon: ScanSearch },
    { to: '/my-calculations', key: 'nav.myCalculations', icon: Calculator },
    sellProduce,
    ...selling,
    { to: '/my-analytics', key: 'seller.nav_analytics', icon: BarChart3 },
    { to: '/my-earnings', key: 'seller.nav_earnings', icon: Wallet },
    { to: '/my-payout', key: 'payout.nav', icon: Landmark },
    { to: '/my-equipment', key: 'payout.navEquipment', icon: Wrench },
    ...shared,
    { to: '/my-settings', key: 'seller.nav_settings', icon: Settings },
  ];
};

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [allOpen, setAllOpen] = useState(false);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const menuRef = useRef(null);
  const allRef = useRef(null);
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const { notify } = useToast();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const items = user ? accountItems(user.role) : [];
  const links = barLinks(user?.role);
  const groups = siteGroups(user, t);
  const isActive = (l) => navActive(l.to, location.pathname, location.search);

  // Close either dropdown on outside click or Escape.
  useEffect(() => {
    if (!menuOpen && !allOpen) return undefined;
    const onDown = (e) => {
      if (menuOpen && menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (allOpen && allRef.current && !allRef.current.contains(e.target)) setAllOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') { setMenuOpen(false); setAllOpen(false); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [menuOpen, allOpen]);

  const handleLogout = async () => {
    setMenuOpen(false); setOpen(false); setAllOpen(false);
    await logout();
    navigate('/', { replace: true });
    notify(t('auth.logoutSuccess'));
  };

  const search = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (cat) p.set('category', cat);
    setOpen(false);
    navigate(`/marketplace${p.toString() ? `?${p}` : ''}`);
  };

  const cartLink = user?.role !== 'admin' && user?.role !== 'vendor' && (
    <Link to="/cart" className="relative p-1 text-ink/70 hover:text-forest" aria-label={`${t('nav.cart')} (${count})`}>
      <ShoppingCart className="h-6 w-6" aria-hidden="true" />
      {count > 0 && <span className="absolute -right-1.5 -top-1.5 min-w-[1.1rem] rounded-full bg-gold px-1 text-center text-[10px] font-bold text-forest-dark">{count}</span>}
    </Link>
  );

  const searchForm = (
    <form onSubmit={search} role="search" aria-label={t('shop.searchLabel')} className="flex w-full overflow-hidden rounded-lg border border-earth/25 bg-white focus-within:border-forest focus-within:ring-2 focus-within:ring-leaf/40">
      <label className="sr-only" htmlFor="nav-q">{t('shop.searchLabel')}</label>
      <input id="nav-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('shop.searchPlaceholder')} className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-ink placeholder:text-ink/40 focus:outline-none" />
      <label className="sr-only" htmlFor="nav-cat">{t('market.allCategories')}</label>
      <select id="nav-cat" value={cat} onChange={(e) => setCat(e.target.value)} className="hidden max-w-[10rem] border-l border-earth/20 bg-white px-2 text-sm text-ink/80 focus:outline-none sm:block">
        <option value="">{t('market.allCategories')}</option>
        {CATEGORIES.map((c) => <option key={c} value={c}>{t(catKey(c))}</option>)}
      </select>
      <button className="bg-forest px-4 text-white hover:bg-forest-light" aria-label={t('market.search')}><Search className="h-5 w-5" aria-hidden="true" /></button>
    </form>
  );

  const accountMenu = user && (
    <div className="relative" ref={menuRef}>
      <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 rounded-full border border-earth/20 bg-white py-1 pl-1 pr-3 text-sm font-medium">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-leaf-light font-semibold text-forest" aria-hidden="true">{user.name?.[0]?.toUpperCase()}</span>
        <span className="max-w-[8rem] truncate">{user.name.split(' ')[0]}</span>
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">{t('nav.account')}</span>
      </button>
      {menuOpen && (
        <ul role="menu" className="absolute right-0 mt-2 max-h-[75vh] w-60 overflow-y-auto rounded-xl border border-earth/15 bg-white py-2 shadow-lg">
          {items.map(({ to, key, icon: Icon }) => (
            <li key={to} role="none"><Link role="menuitem" to={to} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 px-4 py-2 text-sm hover:bg-leaf-light"><Icon className="h-4 w-4 text-forest" aria-hidden="true" /> {t(key)}</Link></li>
          ))}
          <li role="none" className="mt-1 border-t border-earth/15 pt-1">
            <button role="menuitem" type="button" onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm hover:bg-leaf-light"><LogOut className="h-4 w-4 text-forest" aria-hidden="true" /> {t('nav.logout')}</button>
          </li>
        </ul>
      )}
    </div>
  );

  return (
    <>
      {/* Slim top bar (desktop): what the site is, and the language menu. */}
      <div className="hidden bg-forest-dark text-xs text-white/90 md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-1.5">
          <p className="flex items-center gap-1.5"><Sprout className="h-3.5 w-3.5 text-leaf" aria-hidden="true" /> {t('shop.tagline')}</p>
          <LanguageSelect className="!text-white" />
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <nav aria-label={t('nav.main')} className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Link to="/" translate="no" className="flex shrink-0 items-center gap-2 font-display text-xl font-bold text-forest md:text-2xl">
            <Sprout className="h-7 w-7 text-leaf" aria-hidden="true" /> KrishiMitra AI
          </Link>

          <div className="mx-2 hidden max-w-2xl flex-1 lg:block">{searchForm}</div>
          <div className="flex-1 lg:hidden" />

          <div className="hidden items-center gap-4 lg:flex">
            {!user && (
              <>
                <Link to="/register" className="flex items-center gap-2 text-left text-sm leading-tight hover:text-forest">
                  <Sprout className="h-7 w-7 text-leaf" aria-hidden="true" /><span><span className="block font-semibold">{t('shop.becomeFarmer')}</span><span className="hidden text-xs text-ink/60 xl:block">{t('shop.becomeFarmerSub')}</span></span>
                </Link>
                <Link to="/register" state={{ tab: 'seller' }} className="flex items-center gap-2 text-left text-sm leading-tight hover:text-forest">
                  <Store className="h-7 w-7 text-gold" aria-hidden="true" /><span><span className="block font-semibold">{t('shop.becomeVendor')}</span><span className="hidden text-xs text-ink/60 xl:block">{t('shop.becomeVendorSub')}</span></span>
                </Link>
                <Link to="/register" state={{ tab: 'customer' }} className="flex items-center gap-2 text-left text-sm leading-tight hover:text-forest">
                  <ShoppingCart className="h-7 w-7 text-earth" aria-hidden="true" /><span><span className="block font-semibold">{t('shop.becomeCustomer')}</span><span className="hidden text-xs text-ink/60 xl:block">{t('shop.becomeCustomerSub')}</span></span>
                </Link>
              </>
            )}
            {cartLink}
            {user ? accountMenu : <Link to="/login" className="flex items-center gap-2 text-sm font-semibold hover:text-forest"><User className="h-5 w-5" aria-hidden="true" /> {t('shop.login')}</Link>}
          </div>

          <div className="flex items-center gap-3 lg:hidden">
            {cartLink}
            <button aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')} aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
          </div>
        </nav>

        {/* Search on small screens: always one tap away. */}
        <div className="px-4 pb-3 lg:hidden">{searchForm}</div>

        {/* Green bar: the three-line button opens every function of the site, then the main places in one row. */}
        <div className="hidden bg-forest text-white lg:block">
            <div className="mx-auto flex max-w-7xl items-stretch gap-1 px-4">
              <div className="relative" ref={allRef}>
                <button type="button" aria-haspopup="true" aria-expanded={allOpen} aria-label={t('shop.menuTitle')} onClick={() => setAllOpen(!allOpen)} className="flex h-full items-center bg-forest-dark px-4 hover:bg-black/30">
                  {allOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
                </button>
                {allOpen && (
                  <div className="absolute left-0 top-full z-50 grid max-h-[75vh] w-[min(60rem,calc(100vw-2rem))] gap-6 overflow-y-auto rounded-b-xl border border-earth/15 bg-white p-5 text-ink shadow-xl sm:grid-cols-3">
                    {groups.map((g) => (
                      <div key={g.title}>
                        <h2 className="mb-2 border-b border-earth/15 pb-1 font-sans text-xs font-semibold uppercase tracking-wide text-ink/55">{g.title}</h2>
                        <ul>
                          {g.links.map((l) => (
                            <li key={l.label}><Link to={l.to} state={l.state} onClick={() => setAllOpen(false)} className="block rounded-md px-2 py-1.5 text-sm hover:bg-leaf-light">{l.label}</Link></li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <ul className="flex flex-1 items-center justify-between gap-0.5 overflow-x-auto px-2">
                {links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} aria-current={isActive(l) ? 'page' : undefined} className={`block whitespace-nowrap rounded-md px-2.5 py-2.5 text-xs font-medium hover:bg-white/10 xl:text-sm ${isActive(l) ? 'bg-white/15' : ''}`}>{t(l.key)}</Link>
                  </li>
                ))}
              </ul>
            </div>
        </div>

        {open && (
          <div className="max-h-[75vh] overflow-y-auto border-t border-earth/15 bg-white px-4 py-4 lg:hidden">
            <Link to="/" onClick={() => setOpen(false)} className="block font-medium text-ink">{t('nav.home')}</Link>
            {groups.map((g) => (
              <div key={g.title} className="mt-4 border-t border-earth/15 pt-3">
                <h2 className="mb-2 font-sans text-xs font-semibold uppercase tracking-wide text-ink/55">{g.title}</h2>
                <ul className="space-y-2.5">
                  {g.links.map((l) => <li key={l.label}><Link to={l.to} state={l.state} onClick={() => setOpen(false)} className="block text-ink/80">{l.label}</Link></li>)}
                </ul>
              </div>
            ))}
            <div className="mt-4"><LanguageSelect /></div>
            <div className="mt-4 flex gap-3">
              {user ? <button type="button" className="btn-outline flex-1" onClick={handleLogout}><LogOut className="h-4 w-4" aria-hidden="true" /> {t('nav.logout')}</button> : (
                <>
                  <Link to="/login" className="btn-outline flex-1" onClick={() => setOpen(false)}>{t('nav.login')}</Link>
                  <Link to="/register" className="btn-gold flex-1" onClick={() => setOpen(false)}>{t('nav.register')}</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
