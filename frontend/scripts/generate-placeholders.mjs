// Generates local SVG illustrations used as fallbacks until real photographs are added.
// Run: node scripts/generate-placeholders.mjs
// To use real photos, drop e.g. public/images/hero/wheat-field.jpg next to the .svg; SmartImage prefers the .jpg.
import { mkdirSync, writeFileSync } from 'node:fs';

const write = (path, svg) => writeFileSync(`public/images/${path}`, svg);
['hero', 'crops', 'products', 'equipment'].forEach((d) => mkdirSync(`public/images/${d}`, { recursive: true }));

const rows = (color, y0, count, step, h) =>
  Array.from({ length: count }, (_, i) => `<path d="M-50 ${y0 + i * step} Q 400 ${y0 + i * step - h} 850 ${y0 + i * step + h / 2}" stroke="${color}" stroke-width="${6 + i * 1.5}" fill="none" opacity="${0.35 + i * 0.07}"/>`).join('');

const scene = (sky1, sky2, field, rowColor, sun = '#F6D365') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">
<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky1}"/><stop offset="1" stop-color="${sky2}"/></linearGradient></defs>
<rect width="1600" height="900" fill="url(#s)"/><circle cx="1250" cy="230" r="90" fill="${sun}" opacity=".9"/>
<path d="M0 480 Q 400 400 800 470 T 1600 450 V900 H0Z" fill="${field}"/>
<g transform="scale(2 1.6) translate(0 150)">${rows(rowColor, 80, 8, 38, 40)}</g></svg>`;

const hero = {
  'wheat-field': ['#9CC9E8', '#F3E3B0', '#D9A93A', '#B8841C'],
  'paddy-field': ['#A8D8EA', '#DCEFD0', '#5BA83C', '#2F7A2A'],
  'mustard-field': ['#BFE0F0', '#FFF3C4', '#E8C21A', '#C99A0A'],
  'vegetable-farm': ['#B5DCEB', '#E3F1D8', '#3F8F3F', '#256B2E'],
  'drip-irrigation': ['#A9D3EA', '#E8F3DE', '#4C9A45', '#1B4D2E'],
};
for (const [name, c] of Object.entries(hero)) write(`hero/${name}.svg`, scene(...c));

const crops = {
  wheat: '#D9A93A', rice: '#8DBB4A', maize: '#E8C547', mustard: '#E8C21A', sugarcane: '#4E9B4B',
  pulses: '#A97C50', tomato: '#D8432F', potato: '#B58B5A', onion: '#B05A8C', vegetables: '#3F8F3F', fruits: '#E5732B',
  chickpea: '#C8A165', 'pigeon-pea': '#B9893F', soybean: '#9DB84A', peas: '#6FB04F',
};
for (const [name, color] of Object.entries(crops)) {
  write(`crops/${name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="${color}" opacity=".25"/><circle cx="400" cy="300" r="150" fill="${color}"/><path d="M400 450 V180 M400 300 Q 330 260 300 200 M400 300 Q 470 260 500 200" stroke="#1B4D2E" stroke-width="12" fill="none" stroke-linecap="round"/></svg>`);
}

const tile = (dir, names, color) => names.forEach((n) =>
  write(`${dir}/${n}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="${color}" opacity=".2"/><rect x="250" y="170" width="300" height="260" rx="28" fill="${color}"/></svg>`));
tile('products', ['seeds', 'fertilizer', 'biopesticide', 'organic'], '#5BA83C');
tile('equipment', ['tractor', 'rotavator', 'sprayer', 'solar-pump'], '#7A5230');
console.log('Placeholders generated');
