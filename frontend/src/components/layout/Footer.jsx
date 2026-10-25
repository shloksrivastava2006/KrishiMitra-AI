import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-16 bg-forest-dark text-white/80">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <p translate="no" className="flex items-center gap-2 font-display text-lg font-bold text-white"><Sprout className="h-5 w-5 text-leaf" aria-hidden="true" /> KrishiMitra AI</p>
          <p className="mt-3 text-sm">Practical tools for Indian farmers. Advice from this site supports, and does not replace, your local agriculture officer.</p>
        </div>
        <div>
          <h2 className="font-sans text-sm font-semibold text-white">Explore</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/features">Features</Link></li>
            <li><Link to="/calculators">Calculators</Link></li>
            <li><Link to="/marketplace">Marketplace</Link></li>
            <li><Link to="/rentals">Equipment rental</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-sans text-sm font-semibold text-white">Support</h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/about">About us</Link></li>
            <li><Link to="/privacy">Privacy policy</Link></li>
            <li><Link to="/terms">Terms of use</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="font-sans text-sm font-semibold text-white">Contact</h2>
          <p className="mt-3 text-sm">Add your support email and phone number here before launch.</p>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs">&copy; {new Date().getFullYear()} KrishiMitra AI</p>
    </footer>
  );
}
