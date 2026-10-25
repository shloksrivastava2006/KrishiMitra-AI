import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-4xl font-bold">Page not found</h1>
      <p className="mt-3 text-ink/70">The address you opened does not exist. Check the link or go back to the homepage.</p>
      <Link to="/" className="btn-primary mt-6">Go to homepage</Link>
    </div>
  );
}
