// Draws a proper illustration for every crop and every shop/equipment tile (replaces the plain circle placeholders).
// Run from the frontend folder:  node scripts/generate-illustrations.mjs
// Real photographs still win: SmartImage tries public/images/<folder>/<name>.jpg first, so drop a .jpg with the same name
// next to the .svg to use a photo for that crop or tile. The hero scenes are left as they are.
import { mkdirSync, writeFileSync } from 'node:fs';

['crops', 'products', 'equipment'].forEach((d) => mkdirSync(`public/images/${d}`, { recursive: true }));
const write = (path, svg) => writeFileSync(`public/images/${path}.svg`, svg);

// Small repeatable random numbers so every run draws the same picture.
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const DK = '#1B4D2E'; const GR = '#4C9A45'; const GL = '#7DBB5A';
const f = (n) => Math.round(n * 10) / 10;
const el = (cx, cy, rx, ry, fill, rot = 0, extra = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}" ${rot ? `transform="rotate(${rot} ${f(cx)} ${f(cy)})"` : ''} ${extra}/>`;
const circ = (cx, cy, r, fill, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}" ${extra}/>`;
const line = (x1, y1, x2, y2, stroke, w, extra = '') => `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" fill="none" ${extra}/>`;
const curve = (d, stroke, w, extra = '') => `<path d="${d}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" fill="none" ${extra}/>`;
// A leaf pointing along +x from (x, y), turned by rot degrees.
const leaf = (x, y, len, w, rot, fill = GR, vein = true) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${rot})"><path d="M0 0 Q${f(len / 2)} ${-w} ${len} 0 Q${f(len / 2)} ${w} 0 0Z" fill="${fill}"/>${vein ? `<path d="M4 0 L${len - 8} 0" stroke="${DK}" stroke-width="2" opacity=".35"/>` : ''}</g>`;
const star = (cx, cy, r, fill, n = 5) => Array.from({ length: n }, (_, i) => leaf(cx, cy, r, r * 0.28, (360 / n) * i - 90, fill, false)).join('');

const scene = (tint, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="${tint}" opacity=".22"/><ellipse cx="400" cy="520" rx="230" ry="24" fill="#000" opacity=".08"/>${body}</svg>`;

// A grain ear standing at (x, y), pointing up, with pairs of grains and optional awns.
const ear = (x, y, len, rot, grain, dark, awn = 0) => {
  const n = Math.floor(len / 22); let s = `<g transform="translate(${x} ${y}) rotate(${rot})">`;
  for (let i = 0; i < n; i++) {
    const yy = -i * 22;
    s += el(-10, yy, 7, 13, i % 2 ? grain : dark, -28) + el(10, yy, 7, 13, i % 2 ? dark : grain, 28);
    if (awn) s += line(-10, yy - 8, -22, yy - 8 - awn, dark, 2) + line(10, yy - 8, 22, yy - 8 - awn, dark, 2);
  }
  s += el(0, -n * 22 + 6, 7, 14, grain);
  if (awn) s += line(0, -n * 22 - 6, 0, -n * 22 - 6 - awn * 1.3, dark, 2);
  return `${s}</g>`;
};
// A pod lying along +x from (x, y), with round seeds inside.
const pod = (x, y, len, rot, podFill, seedFill, n, seedR = 19, podW = 30) => {
  let s = `<g transform="translate(${x} ${y}) rotate(${rot})">${el(len / 2, 0, len / 2, podW, podFill)}${el(len / 2, 0, len / 2 - 8, podW - 8, 'rgba(255,255,255,.18)')}`;
  for (let i = 0; i < n; i++) s += circ(len / 2 + (i - (n - 1) / 2) * (seedR * 2 + 2), 0, seedR, seedFill) + circ(len / 2 + (i - (n - 1) / 2) * (seedR * 2 + 2) - 5, -6, seedR * 0.3, 'rgba(255,255,255,.35)');
  return `${s}</g>`;
};
const dots = (cx, cy, rx, ry, n, r, colors, seed) => { const R = rng(seed); let s = ''; for (let i = 0; i < n; i++) { const a = R() * 6.283; const d = Math.sqrt(R()); s += circ(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, r * (0.8 + R() * 0.4), colors[i % colors.length]); } return s; };

const crops = {
  wheat: ['#D9A93A', () => [-70, 0, 70].map((dx, i) => curve(`M${400 + dx} 505 Q${400 + dx * 1.2} 380 ${400 + dx * 1.5} ${280 - i % 2 * 20}`, DK, 7)).join('')
    + leaf(330, 500, 120, 22, -62) + leaf(470, 500, 120, 22, -118) + ear(330 - 0 + 0, 300, 190, -9, '#E3B23C', '#B8841C', 26) + ear(400, 260 + 0, 190, 0, '#E3B23C', '#B8841C', 26) + ear(480 + 20, 300, 190, 10, '#E3B23C', '#B8841C', 26)],
  barley: ['#C9A24B', () => [-60, 0, 60].map((dx) => curve(`M${400 + dx} 505 Q${400 + dx} 400 ${400 + dx * 1.3} 300`, DK, 6)).join('')
    + leaf(340, 505, 120, 20, -65) + leaf(460, 505, 120, 20, -115) + ear(322, 320, 170, -6, '#D8B24E', '#8B6A1E', 40) + ear(400, 300, 170, 0, '#D8B24E', '#8B6A1E', 40) + ear(482, 320, 170, 6, '#D8B24E', '#8B6A1E', 40)],
  rice: ['#8DBB4A', () => {
    let s = leaf(300, 510, 260, 26, -70, GR) + leaf(500, 510, 260, 26, -110, GR) + leaf(400, 515, 230, 22, -90, GL);
    for (const [x0, bend, rot] of [[330, -1, 0], [470, 1, 0]]) {
      s += curve(`M${x0} 510 Q${x0} 200 ${x0 + bend * 120} 170 Q${x0 + bend * 190} 170 ${x0 + bend * 195} 270`, DK, 6);
      for (let i = 0; i < 22; i++) { const t = i / 21; const gx = x0 + bend * (120 + 75 * t) + (i % 2 ? 9 : -9); const gy = 170 + 100 * t * t + (i % 2) * 6; s += el(gx, gy, 7, 14, i % 3 ? '#E4C75A' : '#D2AE3A', bend * -10); }
    }
    return s;
  }],
  maize: ['#E8C547', () => {
    let s = leaf(400, 520, 270, 38, -125, GR) + leaf(400, 520, 270, 38, -55, GR);
    const R = rng(7); s += `<g transform="rotate(-8 400 300)">${el(400, 300, 78, 168, '#F2C230')}`;
    for (let r = 0; r < 13; r++) for (let c = 0; c < 5; c++) s += el(400 + (c - 2) * 24 + (r % 2) * 6, 170 + r * 20, 10, 10, R() > 0.12 ? '#F7D454' : '#E3A81C');
    s += '</g>' + leaf(400, 520, 220, 34, -100, GL) + leaf(400, 520, 190, 30, -80, GL);
    s += leaf(400, 220, 70, 8, -150, '#C9A36B', false) + leaf(400, 220, 70, 8, -120, '#C9A36B', false);
    return s;
  }],
  mustard: ['#E8C21A', () => {
    let s = curve('M400 515 Q395 400 400 250', DK, 9) + curve('M400 400 Q330 360 300 300', DK, 6) + curve('M400 360 Q470 330 505 270', DK, 6) + curve('M400 300 Q350 260 345 210', DK, 5) + curve('M400 270 Q450 240 460 195', DK, 5);
    s += leaf(398, 470, 110, 20, -150) + leaf(402, 440, 110, 20, -30);
    const flower = (x, y, r = 13) => [0, 90, 180, 270].map((a) => el(x + Math.cos((a + 45) * Math.PI / 180) * r, y + Math.sin((a + 45) * Math.PI / 180) * r, r * 0.8, r * 0.8, '#F4D21C')).join('') + circ(x, y, r * 0.4, '#C28A0A');
    for (const [x, y] of [[400, 235], [388, 262], [415, 290], [300, 290], [320, 312], [290, 325], [505, 262], [488, 290], [345, 200], [360, 228], [460, 185], [446, 214], [478, 240]]) s += flower(x, y);
    return s;
  }],
  sugarcane: ['#4E9B4B', () => {
    let s = '';
    for (const [x, tilt, h] of [[330, -4, 400], [400, 0, 430], [470, 4, 400]]) {
      s += `<g transform="rotate(${tilt} ${x} 520)"><rect x="${x - 17}" y="${520 - h}" width="34" height="${h}" rx="12" fill="#6E4B8A"/>`;
      for (let y = 520 - h + 30; y < 520; y += 60) s += `<rect x="${x - 19}" y="${y}" width="38" height="8" rx="4" fill="#4A2F63"/>` + el(x - 6, y + 28, 3, 20, 'rgba(255,255,255,.25)');
      s += '</g>';
    }
    s += leaf(400, 110, 190, 24, -150, GR) + leaf(400, 110, 190, 24, -30, GR) + leaf(400, 110, 160, 20, -110, GL) + leaf(400, 110, 160, 20, -70, GL);
    return s;
  }],
  pulses: ['#A97C50', () => pod(250, 330, 300, -14, '#7FA64A', '#A97C50', 4) + pod(260, 420, 290, 8, '#8BB153', '#B58A5C', 4) + leaf(520, 250, 110, 26, -50, GR) + leaf(540, 300, 110, 26, 40, GR, false)],
  tomato: ['#D8432F', () => {
    let s = curve('M250 160 Q400 100 560 190', DK, 8) + leaf(560, 190, 90, 22, 30, GR) + leaf(250, 160, 90, 22, -150, GR);
    for (const [x, y, r] of [[330, 340, 120], [490, 380, 100]]) {
      s += curve(`M${x} ${y - r + 10} Q${x} 200 ${x < 400 ? 330 : 470} 160`, DK, 6) + circ(x, y, r, '#D8432F') + el(x - r * 0.35, y - r * 0.3, r * 0.22, r * 0.12, 'rgba(255,255,255,.35)', -35) + star(x, y - r + 12, r * 0.45, GR);
    }
    return s;
  }],
  potato: ['#B58B5A', () => {
    let s = '';
    for (const [x, y, rx, ry, rot] of [[320, 350, 120, 82, -18], [500, 400, 110, 76, 12], [410, 270, 100, 70, 24]]) {
      s += el(x, y, rx, ry, '#C79C63', rot) + el(x - 20, y - 18, rx * 0.5, ry * 0.3, 'rgba(255,255,255,.22)', rot);
      s += dots(x, y, rx * 0.65, ry * 0.55, 6, 5, ['#8A6238'], x);
    }
    return s;
  }],
  onion: ['#B05A8C', () => {
    let s = curve('M400 150 Q380 90 340 60', GR, 12) + curve('M400 150 Q420 90 470 55', GR, 12) + curve('M400 150 L400 90', GR, 12);
    s += `<path d="M400 150 C300 220 230 300 250 400 C270 480 340 510 400 510 C460 510 530 480 550 400 C570 300 500 220 400 150Z" fill="#B05A8C"/>`;
    for (const dx of [-80, -40, 0, 40, 80]) s += curve(`M400 160 Q${400 + dx * 1.8} 330 ${400 + dx} 505`, '#8B3F6B', 4, 'opacity=".5"');
    s += el(340, 330, 20, 60, 'rgba(255,255,255,.25)', 15) + [-24, -8, 8, 24].map((dx) => line(400 + dx, 512, 400 + dx * 1.6, 550, '#C9B89A', 3)).join('');
    return s;
  }],
  chickpea: ['#C8A165', () => pod(280, 300, 240, -10, '#A8B26A', '#D1AE6E', 2, 26) + dots(330, 430, 130, 55, 11, 26, ['#D1AE6E', '#C59A55'], 3).replace(/<circle/g, '<circle stroke="#9C7A3C" stroke-width="3"')
    + leaf(560, 220, 100, 22, -30, GR) + leaf(560, 260, 100, 22, 20, GR, false)],
  'pigeon-pea': ['#B9893F', () => pod(230, 250, 300, -12, '#9DAF4E', '#D9A441', 4, 22) + pod(250, 360, 320, 10, '#A8B957', '#C9923A', 5, 22) + pod(300, 460, 260, -6, '#9DAF4E', '#D9A441', 4, 20) + leaf(580, 200, 110, 26, -40, GR)],
  soybean: ['#9DB84A', () => {
    let s = curve('M400 520 Q380 400 400 200', DK, 8) + leaf(398, 480, 140, 28, -150) + leaf(402, 440, 140, 28, -28);
    for (const [x, y, r] of [[330, 340, -30], [470, 300, 25], [330, 250, -20]]) s += `<g transform="translate(${x} ${y}) rotate(${r})">${el(0, 0, 60, 30, '#B7C06A')}${[-26, 0, 26].map((dx) => circ(dx, 0, 17, '#E2D58A')).join('')}${dots(0, 0, 50, 20, 24, 2, ['#9AA24E'], x)}</g>`;
    return s;
  }],
  peas: ['#6FB04F', () => pod(210, 300, 380, -6, '#5FA143', '#9BD35A', 6, 30, 44) + leaf(570, 180, 120, 28, -35, GR) + leaf(190, 190, 120, 28, -150, GR) + curve('M600 420 Q650 470 610 520 Q580 540 560 500', DK, 6)],
  groundnut: ['#C8A165', () => {
    let s = '';
    for (const [x, y, rot, sc] of [[300, 330, -25, 1.1], [470, 300, 30, 1], [420, 430, -8, 1.1]]) {
      s += `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${sc})">${el(-42, 0, 55, 42, '#D4B27A')}${el(42, 0, 55, 42, '#D4B27A')}${el(0, 0, 24, 34, '#D4B27A')}${dots(0, 0, 90, 28, 22, 3, ['#A67C3F'], x)}${line(-95, 0, 95, 0, 'rgba(120,80,30,.25)', 2)}</g>`;
    }
    return s + leaf(520, 190, 110, 24, -35, GR) + leaf(520, 190, 110, 24, -95, GR);
  }],
  cotton: ['#E6E0D6', () => {
    let s = curve('M250 520 Q300 330 400 240 Q480 170 560 150', '#6B4B2A', 10) + curve('M330 400 Q380 360 470 360', '#6B4B2A', 7);
    s += leaf(330, 430, 130, 30, -150) + leaf(500, 230, 130, 30, -120);
    for (const [x, y] of [[420, 250], [480, 370], [330, 330]]) {
      s += star(x, y + 20, 70, '#6B4B2A', 4) + [[0, -20], [-30, 0], [30, 0], [-16, 28], [16, 28], [0, 4]].map(([dx, dy]) => circ(x + dx, y + dy, 30, '#FDFCF8', 'stroke="#D9D2C5" stroke-width="3"')).join('');
    }
    return s;
  }],
  bajra: ['#B8A97A', () => {
    let s = leaf(330, 515, 260, 26, -72, GR) + leaf(470, 515, 260, 26, -108, GR) + curve('M400 515 L400 200', DK, 8);
    s += el(400, 190, 48, 135, '#9C9462', 0) + dots(400, 190, 40, 120, 90, 9, ['#B7AE7C', '#8F8858', '#CFC592'], 5);
    return s;
  }],
  jowar: ['#C0553A', () => {
    let s = leaf(320, 515, 250, 26, -68, GR) + leaf(480, 515, 250, 26, -112, GR) + curve('M400 515 L400 300', DK, 9);
    s += el(400, 220, 85, 105, '#B6472E') + dots(400, 220, 78, 98, 70, 16, ['#C9573A', '#D8704A', '#A83D28'], 11) + el(370, 170, 20, 34, 'rgba(255,255,255,.2)', 20);
    return s;
  }],
  ragi: ['#8B5A3A', () => {
    let s = leaf(320, 515, 240, 24, -68, GR) + leaf(480, 515, 240, 24, -112, GR) + curve('M400 515 L400 330', DK, 9);
    for (const a of [-70, -35, 0, 35, 70]) s += `<g transform="translate(400 330) rotate(${a})">${curve('M0 0 Q-20 -90 8 -170', '#8B5A3A', 26)}${dots(-4, -90, 10, 70, 22, 6, ['#A5714C', '#6F4429'], a + 100)}</g>`;
    return s;
  }],
  moong: ['#7FB05B', () => pod(240, 290, 330, -10, '#6FA14A', '#7FB84E', 6, 17, 24) + pod(240, 380, 340, 6, '#7DAE55', '#8BC456', 6, 17, 24) + dots(350, 470, 120, 30, 16, 17, ['#7FB84E', '#6FA14A'], 2) + leaf(600, 200, 110, 26, -40, GR)],
  urad: ['#3E3A36', () => pod(240, 290, 330, -10, '#5C5A44', '#2B2825', 6, 17, 24) + pod(240, 380, 340, 6, '#6A684C', '#3A3632', 6, 17, 24) + dots(350, 470, 120, 30, 16, 17, ['#2B2825', '#403B36'], 4) + leaf(600, 200, 110, 26, -40, GR)],
  sesame: ['#D8C79A', () => {
    let s = curve('M400 520 Q395 400 400 180', DK, 9) + leaf(398, 490, 120, 24, -150) + leaf(402, 460, 120, 24, -30);
    for (const [y, rot] of [[400, 0], [330, 180], [260, 0]]) s += `<g transform="translate(400 ${y})">${[-1, 1].map((d) => `<g transform="scale(${d} 1) rotate(${rot ? -20 : 20})">${el(46, 0, 40, 18, '#9DB04E')}${line(10, 0, 80, 0, '#6F8030', 3)}</g>`).join('')}</g>`;
    s += star(400, 160, 40, '#FFFFFF', 5) + circ(400, 160, 10, '#E8D58A');
    s += dots(300, 500, 40, 14, 14, 6, ['#F3EAD0', '#E0D2A8'], 1);
    return s;
  }],
  okra: ['#5AA24A', () => {
    let s = '';
    for (const [x, y, rot] of [[300, 480, -62], [400, 500, -90], [500, 480, -118]]) {
      s += `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 -26 Q150 -34 300 0 Q150 34 0 26Z" fill="#5FAE4C"/>${[-12, 0, 12].map((dy) => `<path d="M10 ${dy} Q150 ${dy * 1.2} 285 0" stroke="#3F8A35" stroke-width="3" fill="none"/>`).join('')}<path d="M0 -26 Q-30 0 0 26Z" fill="${DK}"/></g>`;
    }
    return s + leaf(250, 200, 120, 28, -20) + leaf(560, 200, 120, 28, -160, GR, false);
  }],
  lentil: ['#D9803A', () => dots(400, 330, 210, 120, 120, 17, ['#D9803A', '#C46A28', '#E8955A', '#B85A20'], 8).replace(/<circle/g, '<circle stroke="#9A4A18" stroke-width="2"') + leaf(300, 190, 90, 20, -30, GR) + leaf(500, 180, 90, 20, -150, GR)],
  vegetables: ['#3F8F3F', () => {
    let s = `<g transform="translate(260 330) rotate(-30)"><path d="M0 -40 L240 -8 Q250 0 240 8 L0 40Z" fill="#F08A24"/>${[60, 120, 180].map((x) => line(x, -26, x + 4, 26, '#C96D10', 4)).join('')}</g>` + leaf(210, 270, 70, 14, -150, GR, false) + leaf(215, 285, 70, 14, -175, GR, false) + leaf(220, 300, 70, 14, 160, GR, false);
    s += circ(560, 330, 65, '#D8432F') + star(560, 270, 40, GR);
    s += curve('M420 520 L420 430', '#9BC46A', 30) + dots(420, 390, 80, 60, 24, 34, ['#3F8F3F', '#4C9A45', '#35793A'], 9);
    return s;
  }],
  fruits: ['#E5732B', () => {
    let s = circ(300, 340, 105, '#D8432F') + el(250, 290, 28, 14, 'rgba(255,255,255,.3)', -35) + curve('M300 240 Q305 200 320 180', '#6B4B2A', 8) + leaf(320, 195, 70, 18, -20, GR);
    s += circ(500, 380, 90, '#F08A24') + el(465, 345, 24, 12, 'rgba(255,255,255,.3)', -35) + star(500, 295, 22, GR, 5);
    s += `<g transform="translate(560 220) rotate(30)"><path d="M0 0 Q70 -50 140 0 Q120 40 0 40Z" fill="#F2D250"/></g>`;
    return s;
  }],
  cauliflower: ['#A8C86A', () => {
    let s = leaf(400, 480, 250, 60, -150, GR) + leaf(400, 480, 250, 60, -30, GR) + leaf(400, 480, 220, 50, -125, GL) + leaf(400, 480, 220, 50, -55, GL);
    s += dots(400, 340, 135, 100, 46, 46, ['#F4EFE0', '#EAE3CF', '#FFFFFF'], 2).replace(/<circle/g, '<circle stroke="#D9D0B8" stroke-width="3"');
    return s;
  }],
  cabbage: ['#8FBF5A', () => {
    let s = leaf(400, 500, 280, 70, -160, '#4C9A45') + leaf(400, 500, 280, 70, -20, '#4C9A45');
    s += circ(400, 330, 160, '#8FC25A') + circ(400, 330, 118, '#A6D070');
    for (const a of [0, 60, 120]) s += `<path d="M400 330 Q${400 + 90 * Math.cos(a)} ${330 - 130} ${400 + 150 * Math.cos(a + 1)} ${330 - 80}" stroke="#6BA03E" stroke-width="5" fill="none"/>`;
    s += curve('M300 330 Q400 250 500 330', '#6BA03E', 5) + curve('M310 380 Q400 320 490 380', '#6BA03E', 5) + el(350, 270, 40, 20, 'rgba(255,255,255,.25)', -30);
    return s;
  }],
  spinach: ['#2F7A3A', () => {
    let s = '';
    for (const [x, rot, len] of [[400, -90, 330], [370, -108, 300], [430, -72, 300], [340, -125, 260], [460, -55, 260]]) s += curve(`M400 530 L${400 + Math.cos(rot * Math.PI / 180) * 120} ${530 + Math.sin(rot * Math.PI / 180) * 120}`, '#B7D17A', 8) + leaf(400 + Math.cos(rot * Math.PI / 180) * 110, 530 + Math.sin(rot * Math.PI / 180) * 110, len * 0.55, 60, rot, '#2F8F3F');
    return s;
  }],
  carrot: ['#F08A24', () => {
    let s = '';
    for (const [x, rot, len] of [[330, 70, 300], [420, 90, 340], [510, 110, 300]]) {
      s += `<g transform="translate(${x} 230) rotate(${rot - 90})">`;
      s += leaf(0, 0, 90, 14, -100, GR, false) + leaf(0, 0, 90, 14, -80, GR, false) + leaf(0, 0, 80, 14, -120, GL, false) + leaf(0, 0, 80, 14, -60, GL, false);
      s += `<path d="M-32 0 L32 0 L0 ${len}Z" fill="#F28A1E"/>${[60, 120, 180, 240].map((y) => line(-24 + y * 0.06, y, 24 - y * 0.06, y, '#C96D10', 3)).join('')}</g>`;
    }
    return s;
  }],
  brinjal: ['#6B3F8F', () => {
    let s = leaf(250, 190, 120, 28, -10) + leaf(560, 190, 120, 28, 170, GR, false);
    s += `<path d="M330 190 C230 260 210 440 300 500 C360 540 440 490 450 400 C455 330 440 230 400 190Z" fill="#5B2F80"/>${el(290, 380, 18, 90, 'rgba(255,255,255,.22)', 8)}`;
    s += star(365, 205, 70, GR, 5) + circ(365, 205, 14, '#3F7A35') + curve('M365 190 Q380 140 420 120', DK, 9);
    return s;
  }],
  chilli: ['#D8432F', () => {
    let s = '';
    for (const [x, y, rot, col, dk] of [[250, 220, 12, '#D8432F', '#A82A1C'], [330, 270, -4, '#4FA33F', '#2F7A2A']]) s += `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0 C150 -30 300 40 410 250 C300 130 160 70 0 50Z" fill="${col}"/><path d="M10 14 C150 -6 280 50 390 235" stroke="rgba(255,255,255,.3)" stroke-width="6" fill="none"/>${circ(0, 25, 28, dk)}${curve('M-8 20 Q-50 10 -70 -30', DK, 10)}</g>`;
    return s;
  }],
  watermelon: ['#D8432F', () => {
    let s = `<path d="M150 330 A250 250 0 0 0 650 330Z" fill="#2F8F3F"/><path d="M175 330 A225 225 0 0 0 625 330Z" fill="#CDE8B0"/><path d="M195 330 A205 205 0 0 0 605 330Z" fill="#E2483A"/>`;
    s += `<path d="M160 330 L640 330" stroke="#CDE8B0" stroke-width="10"/>`;
    for (const [x, y, r] of [[300, 380, -25], [380, 420, 10], [470, 400, -15], [550, 380, 25], [420, 360, 20], [340, 440, -10], [510, 440, 15]]) s += el(x, y, 8, 14, '#2B1B14', r);
    s += `<path d="M150 330 A250 250 0 0 0 650 330" stroke="#1F6B2B" stroke-width="3" fill="none" opacity=".6"/>`;
    return s;
  }],
  'bottle-gourd': ['#9CC96B', () => `<path d="M400 120 C380 120 370 140 372 170 C374 230 330 260 300 340 C270 430 330 505 400 505 C470 505 530 430 500 340 C470 260 426 230 428 170 C430 140 420 120 400 120Z" fill="#B7DA86"/>${el(345, 380, 18, 70, 'rgba(255,255,255,.3)', 8)}${curve('M400 125 Q420 80 470 70', '#6F8F3C', 9)}${leaf(470, 70, 100, 24, -20)}`],
  banana: ['#F2D250', () => {
    let s = curve('M400 130 Q380 100 340 90', '#6B8F3C', 18);
    for (let i = 0; i < 6; i++) { const x = 330 + i * 28; s += `<g transform="translate(${x} 150) rotate(${-14 + i * 6})"><path d="M0 0 C-60 120 -40 280 40 400 C60 420 90 410 80 380 C20 280 30 120 40 0Z" fill="#F4D633"/><path d="M0 0 C-60 120 -40 280 40 400" stroke="#D1AD14" stroke-width="3" fill="none"/>${el(62, 394, 10, 14, '#5C4415', 30)}</g>`; }
    return s;
  }],
  papaya: ['#F08A24', () => leaf(300, 210, 130, 34, -150) + leaf(500, 200, 130, 34, -30, GR) + curve('M400 150 L400 110', '#6B8F3C', 14) + `<path d="M400 150 C300 150 250 300 270 400 C290 490 360 520 400 520 C440 520 510 490 530 400 C550 300 500 150 400 150Z" fill="#F29A2E"/><path d="M400 150 C330 160 300 230 290 320 C330 230 360 190 400 150Z" fill="#9CC04A" opacity=".8"/>${el(330, 360, 20, 90, 'rgba(255,255,255,.25)', 10)}`],
  mango: ['#F2B31C', () => leaf(520, 160, 160, 34, -20) + leaf(250, 160, 150, 32, -160, GR) + curve('M420 200 Q430 140 470 120', '#6B4B2A', 10) + `<path d="M400 200 C300 180 220 280 250 400 C275 490 380 540 470 500 C560 460 590 330 540 260 C500 205 450 215 400 200Z" fill="#F2B31C"/><path d="M470 500 C560 460 590 330 540 260 C560 340 540 430 440 480Z" fill="#E8762A" opacity=".75"/>${el(320, 320, 24, 70, 'rgba(255,255,255,.3)', 25)}`],
  guava: ['#9FC94E', () => {
    let s = leaf(260, 170, 120, 28, -20) + leaf(560, 170, 120, 28, -160, GR, false);
    s += circ(320, 360, 125, '#A8D058') + el(280, 310, 30, 16, 'rgba(255,255,255,.3)', -35) + star(320, 450, 30, '#6B8F3C', 4) + curve('M320 240 Q330 200 350 180', '#6B4B2A', 8);
    s += circ(520, 400, 100, '#E8A0A8') + circ(520, 400, 100, 'none', 'stroke="#A8D058" stroke-width="14"') + dots(520, 400, 55, 55, 26, 5, ['#F3E3A0'], 6);
    return s;
  }],
};
// the recommendation list uses "pea" as the crop id
crops.pea = crops.peas;
for (const [name, [tint, draw]] of Object.entries(crops)) write(`crops/${name}`, scene(tint, draw()));

// ---------- shop categories and equipment ----------
const tile = (dir, name, tint, body) => write(`${dir}/${name}`, scene(tint, body));
tile('products', 'seeds', '#5BA83C', `<path d="M240 190 L560 190 L560 520 L240 520Z" fill="#F7F2E4" stroke="#C9BFA0" stroke-width="6"/><path d="M240 190 L270 160 L300 190 L330 160 L360 190 L390 160 L420 190 L450 160 L480 190 L510 160 L540 190 L560 190" fill="#E4D9B8" stroke="#C9BFA0" stroke-width="5"/>`
  + `<rect x="240" y="330" width="320" height="110" fill="#5BA83C" opacity=".9"/>` + curve('M400 420 L400 340', '#fff', 8) + leaf(400, 360, 60, 16, -150, '#fff', false) + leaf(400, 350, 60, 16, -30, '#fff', false)
  + dots(400, 245, 90, 28, 10, 9, ['#B8842F', '#8A5E1E'], 3));
tile('products', 'fertilizer', '#5BA83C', `<path d="M250 210 Q230 360 245 510 L555 510 Q570 360 550 210 Q470 240 400 225 Q330 240 250 210Z" fill="#E9DDBB" stroke="#B8A671" stroke-width="6"/><path d="M290 210 Q300 150 340 120 L460 120 Q500 150 510 210 Q400 235 290 210Z" fill="#D9C99A" stroke="#B8A671" stroke-width="6"/><path d="M335 135 Q400 170 465 135" stroke="#8A7440" stroke-width="8" fill="none"/>`
  + `<rect x="290" y="300" width="220" height="120" rx="14" fill="#2A6B43"/><text x="400" y="380" font-family="Arial, sans-serif" font-size="70" font-weight="700" text-anchor="middle" fill="#fff">NPK</text>`);
tile('products', 'biopesticide', '#5BA83C', `<rect x="300" y="270" width="200" height="250" rx="34" fill="#E8F3DE" stroke="#2A6B43" stroke-width="7"/><rect x="330" y="210" width="140" height="70" rx="14" fill="#2A6B43"/><rect x="360" y="150" width="80" height="70" rx="10" fill="#1B4D2E"/><path d="M440 170 L560 150 L565 190 L440 205Z" fill="#1B4D2E"/><path d="M450 280 Q540 290 510 360 L490 330Z" fill="#7DBB5A"/>`
  + leaf(400, 480, 100, 36, -90, '#5BA83C') + curve('M400 470 L400 400', DK, 5) + [[580, 160], [600, 195], [585, 225]].map(([x, y]) => circ(x, y, 7, '#9CCAE6')).join(''));
tile('products', 'organic', '#5BA83C', `<path d="M170 510 Q400 380 630 510Z" fill="#7A5230"/><path d="M230 510 Q400 420 570 510Z" fill="#5E3E22"/>` + dots(400, 470, 130, 22, 22, 6, ['#8B6B3F', '#4A2F18'], 5)
  + curve('M400 440 L400 280', DK, 10) + leaf(400, 330, 160, 50, -35, '#5BA83C') + leaf(400, 300, 150, 46, -145, '#7DBB5A') + leaf(400, 260, 110, 34, -60, '#4C9A45') + circ(400, 190, 0, 'none'));
tile('products', 'produce', '#E5A33B', `<path d="M180 330 L620 330 L570 510 L230 510Z" fill="#B98A4E" stroke="#8A6330" stroke-width="6"/>${[250, 330, 410, 490, 560].map((x) => line(x, 335, x - 10, 505, '#8A6330', 5)).join('')}<path d="M170 330 L630 330" stroke="#8A6330" stroke-width="16" stroke-linecap="round"/>`
  + circ(310, 290, 62, '#D8432F') + star(310, 238, 32, GR) + circ(430, 270, 70, '#F08A24') + circ(530, 300, 55, '#7DBB5A') + leaf(250, 250, 90, 18, -120, GR, false) + curve('M380 330 L350 200', '#F28A1E', 24) + leaf(350, 200, 60, 12, -120, GR, false));
const wheel = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2B2B2B"/><circle cx="${x}" cy="${y}" r="${r * 0.55}" fill="#E3A81C"/><circle cx="${x}" cy="${y}" r="${r * 0.15}" fill="#444"/>`;
tile('equipment', 'tractor', '#7A5230', `<rect x="250" y="320" width="320" height="110" rx="20" fill="#2A8F3F"/><rect x="520" y="350" width="120" height="80" rx="14" fill="#2A8F3F"/><rect x="540" y="290" width="14" height="70" fill="#444"/><path d="M270 320 L270 210 L400 210 L430 320Z" fill="#E8F3F8" stroke="#1B4D2E" stroke-width="10"/><rect x="255" y="195" width="170" height="22" rx="8" fill="#1B4D2E"/>` + wheel(320, 450, 90) + wheel(580, 480, 55));
tile('equipment', 'rotavator', '#7A5230', `<rect x="230" y="220" width="340" height="40" rx="10" fill="#C0392B"/><rect x="380" y="150" width="40" height="80" fill="#7A7A7A"/><rect x="230" y="260" width="30" height="190" fill="#7A7A7A"/><rect x="540" y="260" width="30" height="190" fill="#7A7A7A"/><rect x="250" y="400" width="300" height="50" rx="24" fill="#444"/>`
  + [270, 310, 350, 390, 430, 470, 510].map((x, i) => `<path d="M${x} 450 q${i % 2 ? -22 : 22} 40 0 60" stroke="#E3A81C" stroke-width="12" fill="none" stroke-linecap="round"/>`).join(''));
tile('equipment', 'sprayer', '#7A5230', `<path d="M280 180 Q280 140 330 140 L430 140 Q480 140 480 180 L480 440 Q480 490 430 490 L330 490 Q280 490 280 440Z" fill="#F2C230" stroke="#C99A0A" stroke-width="7"/><rect x="340" y="100" width="80" height="45" rx="10" fill="#444"/><rect x="310" y="240" width="140" height="22" rx="8" fill="rgba(255,255,255,.5)"/>`
  + curve('M480 220 Q560 220 560 300 L560 400', '#333', 12) + `<rect x="540" y="400" width="40" height="70" rx="8" fill="#444"/>` + [[610, 440], [635, 480], [600, 490]].map(([x, y]) => circ(x, y, 8, '#9CCAE6')).join(''));
tile('equipment', 'solar-pump', '#7A5230', `<g transform="rotate(-12 400 230)"><rect x="210" y="130" width="380" height="190" rx="10" fill="#1F4E8C" stroke="#C9D3DE" stroke-width="10"/>${[0, 1, 2].map((i) => line(210, 193 + i * 63, 590, 193 + i * 63, '#C9D3DE', 5)).join('')}${[1, 2, 3, 4].map((i) => line(210 + i * 76, 130, 210 + i * 76, 320, '#C9D3DE', 5)).join('')}</g>`
  + curve('M400 300 L400 400', '#555', 12) + `<rect x="330" y="400" width="140" height="100" rx="18" fill="#C0392B"/><rect x="470" y="440" width="100" height="26" fill="#7A7A7A"/>` + [[610, 450], [630, 490]].map(([x, y]) => circ(x, y, 9, '#7EC2EA')).join('') + circ(300, 140, 40, '#F6D365'));
console.log('Illustrations generated');
