import { Link } from 'react-router-dom';
import { Calculator, Ruler, Sprout, Wallet } from 'lucide-react';

// The list of calculators. Each one opens on its own page and only does what its name says.
const TOOLS = [
  { to: '/calculators/seed-calculator', title: 'Seed calculator (Beej matra)', text: 'How many kg of seed your land needs, with the source of each seed rate shown.', icon: Sprout },
  { to: '/calculators/land-calculator', title: 'Land calculator', text: 'State-wise: convert acre, hectare and your state\'s local units such as bigha, kanal, guntha and nali.', icon: Ruler },
  { to: '/calculators/fertilizer-calculator', title: 'Fertilizer and water calculator (Khad aur sinchai)', text: 'Crop-wise and state-wise: how much fertilizer, when to put each dose, and when to give water, from the ICAR advisories.', icon: Calculator },
  { to: '/my-expenses', title: 'Farm expenses and profit/loss', text: 'Write down what you spend and what you earn. See profit or loss for each crop and where your money goes.', icon: Wallet },
];

export default function CalculatorsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Farming calculators</h1>
      <p className="mt-2 max-w-2xl text-ink/70">Pick a calculator. Results use the numbers you enter. They are calculations, not agronomic advice.</p>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {TOOLS.map(({ to, title, text, icon: Icon }) => (
          <li key={to}>
            <Link to={to} className="card flex h-full gap-4 hover:shadow-md">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-leaf-light text-forest"><Icon className="h-6 w-6" aria-hidden="true" /></span>
              <span><span className="block text-lg font-semibold">{title}</span><span className="mt-1 block text-sm text-ink/70">{text}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
