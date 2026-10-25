import { Link } from 'react-router-dom';
import { Droplets, ListChecks, Calculator, ClipboardList, Wallet, CloudSun, Leaf, ScanSearch, ShoppingBasket, Sprout, Tractor } from 'lucide-react';
import { features } from '../../constants/content.js';

// Icon chosen by title keyword so adding a feature never shifts other icons.
const iconFor = (f) => (f.icon === 'seed' ? Sprout : f.icon === 'seed-market' ? ShoppingBasket : f.icon === 'rental' ? Tractor : f.icon === 'money' ? Wallet : f.icon === 'water' ? Droplets : f.icon === 'tasks' ? ListChecks : /disease/i.test(f.title) ? ScanSearch : /crop rec/i.test(f.title) ? Leaf
  : /calculator/i.test(f.title) ? Calculator : /records/i.test(f.text) ? ClipboardList : /weather/i.test(f.title) ? CloudSun : ClipboardList);

export default function FeatureGrid() {
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((f) => {
        const Icon = iconFor(f);
        return (
          <Link key={f.title} to={f.to} className="card group transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between">
              <span className="rounded-lg bg-leaf-light p-2.5 text-forest"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              {f.status === 'soon' && <span className="rounded-full bg-gold-light px-2.5 py-0.5 text-xs font-medium text-earth">Coming soon</span>}
            </div>
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-1 text-sm text-ink/70">{f.text}</p>
          </Link>
        );
      })}
    </div>
  );
}
