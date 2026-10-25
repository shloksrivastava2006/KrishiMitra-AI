// Turns a saved Crop Doctor result into what the dashboard shows. Pure functions, so they can be tested without a browser.
// Older saved checks (and the built-in basic guidance) do not have every new field, so each one has a fallback.
const FROM_LIKELIHOOD = { high: 85, medium: 55, low: 30 };

export function viewOf(r = {}) {
  const causes = r.possibleCauses || [];
  const top = causes[0];
  const some = (a) => (Array.isArray(a) && a.length ? a : null);
  const confidence = Number.isFinite(r.confidence) ? r.confidence : (top ? FROM_LIKELIHOOD[top.likelihood] ?? null : null);
  return {
    name: r.diseaseName || top?.name || null,
    confidence,
    plant: r.plant || null, plantPart: r.plantPart || null, type: r.diseaseType || top?.category || null, scientificName: r.scientificName || null,
    overview: r.overview || r.summary || '',
    symptoms: some(r.symptoms) || causes.map((c) => c.signs).filter(Boolean).slice(0, 5),
    causes: some(r.causes) || causes.map((c) => c.name),
    treatment: some(r.treatment) || r.nextSteps || [],
    prevention: r.prevention || [],
    note: r.importantNote || '',
    questions: r.questions || [], getHelpIf: r.getHelpIf || '',
    followUps: r.followUps || [],
  };
}

export const confidenceTone = (n) => (n >= 75 ? 'bg-leaf-light text-forest' : n >= 50 ? 'bg-gold-light text-earth' : 'bg-earth-light text-ink/80');

// Plain text for the Share button: the main points, no photo, no personal data.
export function shareText(r, crop = '') {
  const v = viewOf(r);
  const block = (title, items) => (items.length ? [`${title}:`, ...items.map((i) => `- ${i}`), ''] : []);
  return [
    `KrishiMitra AI Crop Doctor${crop || v.plant ? ` (${crop || v.plant})` : ''}`,
    v.name ? `${v.name}${v.confidence != null ? ` - ${v.confidence}%` : ''}` : '', r.summary || '', '',
    ...block('Symptoms', v.symptoms), ...block('Causes', v.causes), ...block('Treatment', v.treatment), ...block('Prevention', v.prevention),
    'AI first look, not a confirmed diagnosis. Ask your local agriculture officer or KVK.',
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n').trim();
}

// Quick symptom chips: the key is the dictionary key, the id never changes.
export const CHIPS = ['yellow', 'brown', 'white', 'curl', 'wilt', 'black', 'root', 'stunted', 'fruit', 'other'];

// Appends a phrase to what the farmer already wrote, once, within the length limit.
export function addPhrase(text, phrase, max = 600) {
  const t = String(text || '').trim();
  if (!phrase || t.toLowerCase().includes(phrase.toLowerCase())) return t;
  const next = t ? `${t.replace(/[.,;\s]+$/, '')}, ${phrase}` : phrase;
  return [...next].slice(0, max).join('');
}
