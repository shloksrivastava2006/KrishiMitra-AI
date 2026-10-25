import { Link } from 'react-router-dom';

// Honest stand-in for modules that are planned but not built yet.
export default function PagePlaceholder({ title, description }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-3 text-ink/70">{description || 'This section is not built yet.'}</p>
      <Link to="/" className="btn-outline mt-6">Back to home</Link>
    </div>
  );
}
