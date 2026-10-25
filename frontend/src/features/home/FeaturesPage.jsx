import FeatureGrid from './FeatureGrid.jsx';

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">Features</h1>
      <p className="mt-2 max-w-2xl text-ink/70">Modules marked "Coming soon" are planned but not built yet.</p>
      <FeatureGrid />
    </div>
  );
}
