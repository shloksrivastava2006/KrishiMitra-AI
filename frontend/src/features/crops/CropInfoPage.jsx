import SmartImage from '../../components/common/SmartImage.jsx';
import { crops } from '../../constants/content.js';

export default function CropInfoPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="text-3xl font-bold">Crop information</h1>
      <p className="mt-2 max-w-xl text-ink/70">Typical sowing seasons vary by region and variety. Check with your local agriculture office.</p>
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {crops.map((c) => (
          <article key={c.id} className="overflow-hidden rounded-xl border border-earth/15 bg-white">
            <SmartImage folder="crops" name={c.id} alt={`${c.name} crop`} className="aspect-[4/3] w-full" />
            <div className="p-3"><h2 className="font-semibold">{c.name}</h2><p className="text-xs text-ink/65">{c.season}</p></div>
          </article>
        ))}
      </div>
    </div>
  );
}
