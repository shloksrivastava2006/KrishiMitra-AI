const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
export const inr = (n) => money.format(n);
export const catKey = (c) => `market.cat_${String(c).replace(/-/g, '_')}`;
export const imageName = (c) => ({ seeds: 'seeds', fertilizers: 'fertilizer', 'bio-pesticides': 'biopesticide' }[c] || 'organic');
export const LICENCE_CATS = ['seeds', 'fertilizers', 'bio-pesticides'];
// Keep these in step with backend/services/marketRules.js. A listing is "produce" purely because of its category.
export const PRODUCE_CATS = ['grains-pulses', 'vegetables', 'fruits', 'oilseeds', 'spices', 'flowers', 'farm-other'];
export const INPUT_CATS = ['seeds', 'fertilizers', 'bio-pesticides', 'organic', 'machinery', 'solar', 'other'];
export const CATEGORIES = [...INPUT_CATS.slice(0, 4), ...PRODUCE_CATS, ...INPUT_CATS.slice(4)];
export const isProduce = (c) => PRODUCE_CATS.includes(c);
export const GRADES = ['A', 'B', 'C'];
export const UNITS = ['kg', 'quintal', 'packet', 'bag', 'litre', 'piece', 'dozen', 'bunch'];
// Picture shown when a listing has no photo of its own (bundled illustrations only).
export const placeholderFor = (c) => ({ vegetables: ['crops', 'vegetables'], fruits: ['crops', 'fruits'], 'grains-pulses': ['crops', 'pulses'], oilseeds: ['crops', 'mustard'] }[c]
  || ['products', imageName(c)]);
export const badgeClass = (tone) => ({ ok: 'bg-leaf-light text-forest', warn: 'bg-gold-light text-earth', bad: 'bg-red-50 text-red-800', info: 'bg-earth-light text-ink/80' }[tone]);
export const orderTone = (s) => ({ delivered: 'ok', placed: 'info', confirmed: 'info', shipped: 'info', awaiting_payment: 'warn', cancelled: 'bad' }[s] || 'info');
