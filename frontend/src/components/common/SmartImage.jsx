import { useState } from 'react';

// Tries the real photograph first (.jpg), then the bundled illustration (.svg), then a neutral block.
export default function SmartImage({ folder, name, alt, className = '', eager = false }) {
  const [stage, setStage] = useState(0);
  const sources = [`/images/${folder}/${name}.jpg`, `/images/${folder}/${name}.svg`];
  if (stage >= sources.length) return <div role="img" aria-label={alt} className={`bg-earth-light ${className}`} />;
  return (
    <img
      src={sources[stage]}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      onError={() => setStage((s) => s + 1)}
      className={`object-cover ${className}`}
    />
  );
}
