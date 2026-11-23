import { SKINS } from './data.js';
// Procedural vector art for Bloomguard. Every character, creature and backdrop is an original
// design drawn in code, so the game ships with no third-party image assets.

const TAU = Math.PI * 2;
const INK = '#2a1a14';
void SKINS;

// ---------- fast recolouring ----------
// Canvas `ctx.filter` is extremely slow (hundreds of ms per frame), so skins, hit flashes and frost
// are done by transforming every colour as it is set on the context while a character is drawn.
const PROTO = CanvasRenderingContext2D.prototype;
const DESC = {};
for (const k of ['fillStyle', 'strokeStyle', 'shadowColor']) DESC[k] = Object.getOwnPropertyDescriptor(PROTO, k);
let activeXF = null;
let xfKey = '';
let xfPaused = false;
const xfCache = new Map();

function parseColor(c) {
  if (c[0] === '#') {
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const m = /rgba?\(([^)]+)\)/.exec(c);
  if (!m) return null;
  const p = m[1].split(',').map((x) => parseFloat(x));
  return [p[0], p[1], p[2], p[3] === undefined ? 1 : p[3]];
}
function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const f = (t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
}
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const XF = {
  hurt: ([h, s, l]) => [h, s * 0.8, l + (1 - l) * 0.55],
  frozen: ([h, s, l]) => [195, clamp01(s * 0.5 + 0.2), clamp01(l * 0.7 + 0.3)],
  golden: ([h, s, l]) => (s > 0.12 ? [44 + (h % 20) - 10, clamp01(s * 0.7 + 0.45), clamp01(l * 0.95 + 0.06)] : [h, s, l]),
  frost: ([h, s, l]) => (s > 0.12 ? [h + 165, s * 0.75, clamp01(l * 1.1)] : [h, s, l]),
  midnight: ([h, s, l]) => (s > 0.12 ? [h + 215, clamp01(s * 1.2), l * 0.72] : [h, s, l]),
  sakura: ([h, s, l]) => (s > 0.12 ? [330 + (h % 40) - 20, clamp01(s * 0.9 + 0.1), clamp01(l * 1.05)] : [h, s, l]),
  ember: ([h, s, l]) => (s > 0.12 ? [12 + (h % 30), clamp01(s * 1.3), l] : [h, s, l]),
};
function xfColor(v) {
  if (!activeXF || xfPaused || typeof v !== 'string') return v;
  const key = xfKey + v;
  let out = xfCache.get(key);
  if (out === undefined) {
    const c = parseColor(v);
    if (!c) out = v;
    else {
      let hsl = rgb2hsl(c[0], c[1], c[2]);
      for (const f of activeXF) hsl = f(hsl);
      const [r, g, b] = hsl2rgb(hsl[0], clamp01(hsl[1]), clamp01(hsl[2]));
      out = `rgba(${r | 0},${g | 0},${b | 0},${c[3]})`;
    }
    if (xfCache.size > 6000) xfCache.clear();
    xfCache.set(key, out);
  }
  return out;
}
function wrapGrad(g) { const add = g.addColorStop.bind(g); g.addColorStop = (o, c) => add(o, xfColor(c)); return g; }
// Draw `fn` with the named colour transforms applied (e.g. ['sakura', 'hurt']).
export function withXF(ctx, names, fn) {
  const fns = names.map((n) => XF[n]).filter(Boolean);
  if (!fns.length) { fn(); return; }
  const outer = !Object.prototype.hasOwnProperty.call(ctx, 'fillStyle');
  const prev = activeXF, prevKey = xfKey;
  if (outer) {
    for (const k of Object.keys(DESC)) Object.defineProperty(ctx, k, { configurable: true, get() { return DESC[k].get.call(ctx); }, set(v) { DESC[k].set.call(ctx, xfColor(v)); } });
    ctx.createLinearGradient = (...a) => wrapGrad(PROTO.createLinearGradient.apply(ctx, a));
    ctx.createRadialGradient = (...a) => wrapGrad(PROTO.createRadialGradient.apply(ctx, a));
  }
  activeXF = prev ? prev.concat(fns) : fns;
  xfKey = (prevKey ? prevKey + '+' : '') + names.join('+') + '|';
  try { fn(); } finally {
    activeXF = prev; xfKey = prevKey;
    if (outer) { for (const k of Object.keys(DESC)) delete ctx[k]; delete ctx.createLinearGradient; delete ctx.createRadialGradient; }
  }
}
// where each guardian's head top is: [dx, dy, head width] as fractions of tile size
const HEAD = {
  glowcap: [0, -0.73, 0.5], sporelamp: [0, -0.62, 0.3], thornling: [0.02, -0.66, 0.36], barkwall: [0, -0.77, 0.5],
  puffball: [0, -0.42, 0.34], frostbell: [0.06, -0.77, 0.24], vinewhip: [0, -0.54, 0.34], mossmender: [0, -0.62, 0.4],
  rootsnare: [0, -0.36, 0.3], lanceleaf: [0, -0.36, 0.28], stormseed: [0, -0.55, 0.3], pollenpuff: [0, -0.76, 0.32],
  hivebloom: [0, -0.73, 0.34], emberroot: [0, -0.86, 0.28], bramblemat: [0, -0.2, 0.24], twinbud: [-0.16, -0.66, 0.18],
  boulderbud: [0, -0.62, 0.44], prismbud: [0, -0.77, 0.3],
};

// ---------- colour + shape helpers ----------
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function tint(h, amt) {
  const [r, g, b] = hexToRgb(h);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
// shaded radial fill: light from top-left
function shadeFill(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, tint(color, 0.35));
  g.addColorStop(0.55, color);
  g.addColorStop(1, tint(color, -0.3));
  return g;
}
function outline(ctx, s, w = 0.028) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, s * w);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}
function blob(ctx, x, y, rx, ry, color, s, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fillStyle = shadeFill(ctx, x, y, Math.max(rx, ry), color);
  ctx.fill();
  outline(ctx, s);
}
function circle(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}
function shine(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.55, -0.6, 0, TAU);
  ctx.fill();
}

function eyes(ctx, x, y, gap, r, look = 0.4, blink = false, mood = 'happy') {
  for (const s of [-1, 1]) {
    const ex = x + s * gap;
    if (blink) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.5, r * 0.35);
      ctx.beginPath();
      ctx.moveTo(ex - r, y);
      ctx.quadraticCurveTo(ex, y + r * 0.5, ex + r, y);
      ctx.stroke();
      continue;
    }
    circle(ctx, ex, y, r, '#fff');
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, r * 0.22);
    ctx.stroke();
    circle(ctx, ex + r * look, y + r * 0.1, r * 0.55, '#1d1a2b');
    circle(ctx, ex + r * look + r * 0.2, y - r * 0.18, r * 0.2, '#fff');
    if (mood === 'angry') {
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.5, r * 0.4);
      ctx.beginPath();
      ctx.moveTo(ex - r * 1.1, y - r * (s < 0 ? 1.5 : 1.0));
      ctx.lineTo(ex + r * 1.1, y - r * (s < 0 ? 1.0 : 1.5));
      ctx.stroke();
    }
  }
}
function smile(ctx, x, y, w, open = 0) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, w * 0.25);
  ctx.beginPath();
  ctx.arc(x, y - w * 0.3, w, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.stroke();
  if (open > 0) {
    ctx.fillStyle = '#7a2a2a';
    ctx.beginPath();
    ctx.ellipse(x, y + w * 0.4, w * 0.5, w * 0.4 * open, 0, 0, TAU);
    ctx.fill();
  }
}
function cheeks(ctx, x, y, gap, r) {
  ctx.fillStyle = 'rgba(255,110,130,0.45)';
  for (const s of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + s * gap, y, r, r * 0.6, 0, 0, TAU); ctx.fill(); }
}
function shadow(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.28, 0, 0, TAU);
  ctx.fill();
}
function leaf(ctx, x, y, len, w, ang, color, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -w, len, 0);
  ctx.quadraticCurveTo(len * 0.5, w, 0, 0);
  const g = ctx.createLinearGradient(0, -w, 0, w);
  g.addColorStop(0, tint(color, 0.25));
  g.addColorStop(1, tint(color, -0.2));
  ctx.fillStyle = g;
  ctx.fill();
  outline(ctx, s, 0.02);
  ctx.strokeStyle = 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(len * 0.1, 0);
  ctx.lineTo(len * 0.85, 0);
  ctx.stroke();
  ctx.restore();
}
function stem(ctx, x1, y1, cx, cy, x2, y2, w, color = '#3f8f3a') {
  ctx.strokeStyle = INK;
  ctx.lineWidth = w + 3;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
}
function pot(ctx, x, y, s) {
  // little clay mound every guardian sits in
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.04, s * 0.26, s * 0.08, 0, 0, TAU);
  ctx.fillStyle = '#6b4a2e';
  ctx.fill();
  ctx.fillStyle = '#8a6440';
  ctx.beginPath();
  ctx.ellipse(x, y - s * 0.06, s * 0.2, s * 0.045, 0, 0, TAU);
  ctx.fill();
}
function star(ctx, x, y, r, fill = '#ffe14d') {
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const rr = k % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (k * Math.PI) / 5;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = '#a86f00';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}
function levelStars(ctx, x, y, level) {
  for (let i = 1; i < level; i++) star(ctx, x - (level - 2) * 8 + (i - 1) * 16, y, 7);
}

// ---------- guardians ----------
// s = tile size in px; (x, y) = bottom-centre of the tile.
export function drawGuardian(ctx, type, x, y, s, t, o = {}) {
  const names = [];
  if (o.skin && XF[o.skin]) names.push(o.skin);
  if (o.frozen) names.push('frozen');
  if (o.hurt) names.push('hurt');
  if (names.length) withXF(ctx, names, () => drawGuardianInner(ctx, type, x, y, s, t, o));
  else drawGuardianInner(ctx, type, x, y, s, t, o);
}

function drawGuardianInner(ctx, type, x, y, s, t, o) {
  const seed = o.seed || 0;
  const bob = Math.sin(t * 3 + seed) * s * 0.018;
  const sway = Math.sin(t * 2 + seed) * 0.05;
  const blink = (t + seed) % 4 < 0.12;
  const sq = o.fire ? 1 - o.fire * 0.12 : 1;
  const mood = o.hurtLevel > 0.6 ? 'angry' : 'happy';
  ctx.save();
  if (type !== 'bramblemat') shadow(ctx, x, y - s * 0.05, s * 0.3);
  // storybook squash & stretch: gentle breathing + elastic pop when planted
  const pop = o.born !== undefined ? Math.min(1, o.born) : 1;
  const elastic = pop < 1 ? 1 - Math.cos(pop * Math.PI * 2.5) * (1 - pop) * 0.6 : 1;
  const breathe = Math.sin(t * 2.2 + seed) * 0.022;
  ctx.translate(x, y);
  ctx.scale((1 + breathe) * elastic * (pop < 1 ? 0.4 + pop * 0.6 : 1), (1 - breathe) * elastic);
  ctx.translate(-x, -y);
  if (!['bramblemat', 'barkwall', 'boulderbud', 'puffball'].includes(type)) pot(ctx, x, y, s);
  switch (type) {
    case 'glowcap': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.5 + seed);
      ctx.beginPath();
      ctx.roundRect(x - s * 0.12, y - s * 0.46 + bob, s * 0.24, s * 0.4, s * 0.08);
      ctx.fillStyle = shadeFill(ctx, x, y - s * 0.3, s * 0.2, '#f6ead0');
      ctx.fill(); outline(ctx, s);
      ctx.shadowColor = '#ffd84a';
      ctx.shadowBlur = 10 + pulse * 18;
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.48 + bob, s * 0.37, s * 0.26, 0, Math.PI, 0);
      ctx.quadraticCurveTo(x, y - s * 0.4 + bob, x - s * 0.37, y - s * 0.48 + bob);
      ctx.fillStyle = shadeFill(ctx, x, y - s * 0.6, s * 0.35, '#ffb330');
      ctx.fill();
      ctx.shadowBlur = 0;
      outline(ctx, s);
      for (const [dx, dy, r] of [[-0.2, -0.58, 0.06], [0.05, -0.66, 0.07], [0.22, -0.54, 0.05], [-0.05, -0.53, 0.04]]) {
        circle(ctx, x + dx * s, y + dy * s + bob, r * s, `rgba(255,255,210,${0.65 + pulse * 0.35})`);
      }
      eyes(ctx, x, y - s * 0.3 + bob, s * 0.06, s * 0.045, 0.3, blink, mood);
      cheeks(ctx, x, y - s * 0.24 + bob, s * 0.09, s * 0.025);
      break;
    }
    case 'sporelamp': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + seed);
      stem(ctx, x, y - s * 0.06, x - s * 0.08, y - s * 0.25, x, y - s * 0.38 + bob, s * 0.05, '#4a7a8a');
      ctx.shadowColor = '#9be7ff';
      ctx.shadowBlur = 12 + pulse * 16;
      blob(ctx, x, y - s * 0.44 + bob, s * 0.17, s * 0.15, '#9be7ff', s);
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.55 + bob, s * 0.2, s * 0.07, 0, Math.PI, 0);
      ctx.fillStyle = '#3f6f86';
      ctx.fill(); outline(ctx, s);
      eyes(ctx, x, y - s * 0.44 + bob, s * 0.05, s * 0.035, 0.3, blink, mood);
      for (let i = 0; i < 3; i++) {
        const a = t * 1.5 + i * 2.1 + seed;
        circle(ctx, x + Math.cos(a) * s * 0.25, y - s * 0.5 + Math.sin(a * 1.3) * s * 0.12, s * 0.015, 'rgba(190,240,255,0.9)');
      }
      break;
    }
    case 'thornling': {
      leaf(ctx, x - s * 0.04, y - s * 0.1, s * 0.28, s * 0.08, Math.PI + 0.5 + sway, '#4f9e3d', s);
      leaf(ctx, x + s * 0.04, y - s * 0.1, s * 0.28, s * 0.08, -0.5 - sway, '#4f9e3d', s);
      const cy = y - s * 0.38 + bob;
      ctx.fillStyle = '#f0ffe0';
      for (let i = 0; i < 11; i++) {
        const a = -Math.PI * 1.0 + (i / 10) * Math.PI * 1.1;
        const bx = x + Math.cos(a) * s * 0.23, by = cy + Math.sin(a) * s * 0.26;
        ctx.beginPath();
        ctx.moveTo(bx - Math.sin(a) * 5, by + Math.cos(a) * 5);
        ctx.lineTo(bx + Math.cos(a) * s * 0.09, by + Math.sin(a) * s * 0.09);
        ctx.lineTo(bx + Math.sin(a) * 5, by - Math.cos(a) * 5);
        ctx.fill();
        ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
      }
      blob(ctx, x, cy, s * 0.24 * sq, s * 0.27 / sq, '#6fcf5a', s);
      shine(ctx, x - s * 0.1, cy - s * 0.14, s * 0.05);
      eyes(ctx, x + s * 0.04, cy - s * 0.04, s * 0.075, s * 0.055, 0.5, blink, mood);
      ctx.beginPath();
      ctx.ellipse(x + s * 0.15, cy + s * 0.09, s * 0.035 * (1 + (o.fire || 0)), s * 0.03 * (1 + (o.fire || 0)), 0, 0, TAU);
      ctx.fillStyle = '#2b5a20'; ctx.fill();
      break;
    }
    case 'barkwall': {
      const dmg = o.hpFrac !== undefined ? o.hpFrac : 1;
      ctx.beginPath();
      ctx.roundRect(x - s * 0.3, y - s * 0.7, s * 0.6, s * 0.66, s * 0.1);
      const g = ctx.createLinearGradient(x - s * 0.3, 0, x + s * 0.3, 0);
      g.addColorStop(0, '#6e4422'); g.addColorStop(0.4, '#9a6a3c'); g.addColorStop(1, '#5e3a1c');
      ctx.fillStyle = g; ctx.fill(); outline(ctx, s);
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.7, s * 0.3, s * 0.08, 0, 0, TAU);
      ctx.fillStyle = '#e0b882'; ctx.fill(); outline(ctx, s, 0.02);
      ctx.strokeStyle = '#a77d4c'; ctx.lineWidth = 2;
      for (const r of [0.2, 0.12, 0.05]) { ctx.beginPath(); ctx.ellipse(x, y - s * 0.7, s * r, s * r * 0.27, 0, 0, TAU); ctx.stroke(); }
      ctx.strokeStyle = '#4b2c12'; ctx.lineWidth = 2;
      for (const dx of [-0.2, -0.05, 0.15]) { ctx.beginPath(); ctx.moveTo(x + dx * s, y - s * 0.6); ctx.lineTo(x + dx * s + 3, y - s * 0.1); ctx.stroke(); }
      // moss tuft + sprout on top
      circle(ctx, x - s * 0.18, y - s * 0.68, s * 0.06, '#6fbf4a');
      circle(ctx, x - s * 0.1, y - s * 0.7, s * 0.05, '#7fd05a');
      leaf(ctx, x + s * 0.1, y - s * 0.74, s * 0.12, s * 0.04, -1.2, '#6fcf5a', s);
      if (o.armor) {
        ctx.strokeStyle = 'rgba(120,220,120,0.9)'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.roundRect(x - s * 0.33, y - s * 0.74, s * 0.66, s * 0.72, s * 0.12); ctx.stroke();
      }
      if (dmg < 0.66) { ctx.strokeStyle = '#2d1606'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + s * 0.1, y - s * 0.68); ctx.lineTo(x, y - s * 0.5); ctx.lineTo(x + s * 0.08, y - s * 0.38); ctx.stroke(); }
      if (dmg < 0.33) { ctx.beginPath(); ctx.moveTo(x - s * 0.28, y - s * 0.3); ctx.lineTo(x - s * 0.12, y - s * 0.24); ctx.lineTo(x - s * 0.18, y - s * 0.1); ctx.stroke(); }
      eyes(ctx, x, y - s * 0.45, s * 0.09, s * 0.06, 0.4, blink || dmg < 0.33, dmg < 0.5 ? 'angry' : 'happy');
      ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y - s * 0.28 + (dmg < 0.5 ? s * 0.06 : 0), s * 0.06, dmg < 0.5 ? Math.PI * 1.15 : 0.2, dmg < 0.5 ? Math.PI * 1.85 : Math.PI - 0.2);
      ctx.stroke();
      break;
    }
    case 'puffball': {
      const armed = o.armed;
      const k = armed ? 1 + Math.sin(t * 6) * 0.04 : 0.6;
      if (!armed) {
        ctx.fillStyle = '#6b4a2e';
        ctx.beginPath(); ctx.ellipse(x, y - s * 0.05, s * 0.22, s * 0.07, 0, 0, TAU); ctx.fill();
      }
      blob(ctx, x, y - s * 0.2 * k, s * 0.26 * k, s * 0.2 * k, armed ? '#c58df0' : '#9b7bb0', s);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      for (const [dx, dy] of [[-0.1, -0.28], [0.08, -0.32], [0.14, -0.2], [-0.15, -0.16]]) circle(ctx, x + dx * s * k, y + dy * s * k, s * 0.028, 'rgba(255,255,255,0.5)');
      if (armed) {
        eyes(ctx, x, y - s * 0.22, s * 0.065, s * 0.045, 0.5, blink, 'angry');
        const tick = Math.sin(t * 8) > 0;
        circle(ctx, x + s * 0.2, y - s * 0.38, s * 0.03, tick ? '#ff4a6a' : '#7a3040');
      } else {
        ctx.strokeStyle = INK; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - s * 0.08, y - s * 0.14); ctx.lineTo(x - s * 0.02, y - s * 0.14); ctx.moveTo(x + s * 0.02, y - s * 0.14); ctx.lineTo(x + s * 0.08, y - s * 0.14); ctx.stroke();
        ctx.font = `${Math.round(s * 0.12)}px sans-serif`; ctx.fillStyle = '#fff'; ctx.fillText('z', x + s * 0.14, y - s * 0.3 - Math.sin(t * 2) * 4);
      }
      break;
    }
    case 'frostbell': {
      stem(ctx, x, y - s * 0.06, x - s * 0.15, y - s * 0.5, x + s * 0.02, y - s * 0.78 + bob, s * 0.04, '#3f8f6a');
      leaf(ctx, x - s * 0.04, y - s * 0.2, s * 0.22, s * 0.07, Math.PI + 0.3 + sway, '#57b083', s);
      leaf(ctx, x + s * 0.02, y - s * 0.32, s * 0.18, s * 0.06, -0.4 - sway, '#57b083', s);
      const bx = x + s * 0.06, by = y - s * 0.62 + bob;
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.08, by - s * 0.14);
      ctx.quadraticCurveTo(bx - s * 0.12, by + s * 0.05, bx - s * 0.27 * sq, by + s * 0.2);
      ctx.quadraticCurveTo(bx, by + s * 0.26, bx + s * 0.27 * sq, by + s * 0.2);
      ctx.quadraticCurveTo(bx + s * 0.12, by + s * 0.05, bx + s * 0.08, by - s * 0.14);
      ctx.closePath();
      ctx.fillStyle = shadeFill(ctx, bx, by, s * 0.25, '#9fe6ff');
      ctx.fill(); outline(ctx, s);
      circle(ctx, bx, by + s * 0.24, s * 0.05, '#e8fbff');
      ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
      // icicles
      ctx.fillStyle = '#e8fbff';
      for (const dx of [-0.18, 0.18]) { ctx.beginPath(); ctx.moveTo(bx + dx * s - 3, by + s * 0.19); ctx.lineTo(bx + dx * s + 3, by + s * 0.19); ctx.lineTo(bx + dx * s, by + s * 0.28); ctx.fill(); }
      eyes(ctx, bx, by + s * 0.03, s * 0.06, s * 0.04, 0.5, blink, mood);
      break;
    }
    case 'vinewhip': {
      const lash = o.fire || 0;
      for (const [a, len] of [[-0.6 - lash * 0.8, 0.55], [-0.2 - lash * 0.4, 0.45]]) {
        ctx.save();
        ctx.translate(x, y - s * 0.35);
        ctx.rotate(a + Math.sin(t * 3 + seed) * 0.1);
        stem(ctx, 0, 0, s * len * 0.5, -s * 0.15, s * len, 0, s * 0.05, '#3fae6a');
        leaf(ctx, s * len, 0, s * 0.12, s * 0.05, 0.3, '#5fcf7a', s);
        ctx.restore();
      }
      blob(ctx, x, y - s * 0.3 + bob, s * 0.2, s * 0.22, '#3fae6a', s);
      for (let i = 0; i < 5; i++) circle(ctx, x - s * 0.12 + i * s * 0.06, y - s * 0.5 + bob + (i % 2) * 4, s * 0.025, '#e8ffb0');
      eyes(ctx, x + s * 0.03, y - s * 0.34 + bob, s * 0.07, s * 0.05, 0.6, blink, 'angry');
      smile(ctx, x + s * 0.03, y - s * 0.2 + bob, s * 0.05, lash);
      break;
    }
    case 'mossmender': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2);
      ctx.fillStyle = `rgba(120,255,190,${0.1 + pulse * 0.12})`;
      ctx.beginPath(); ctx.arc(x, y - s * 0.3, s * (0.44 + pulse * 0.05), 0, TAU); ctx.fill();
      ctx.beginPath();
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU + t * 0.3;
        const r = s * (i % 2 ? 0.25 : 0.31);
        ctx.lineTo(x + Math.cos(a) * r, y - s * 0.32 + bob + Math.sin(a) * r * 0.85);
      }
      ctx.closePath();
      ctx.fillStyle = '#3ea57a'; ctx.fill(); outline(ctx, s);
      blob(ctx, x, y - s * 0.32 + bob, s * 0.2, s * 0.19, '#7ff0c0', s);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - s * 0.025, y - s * 0.6 + bob, s * 0.05, s * 0.13);
      ctx.fillRect(x - s * 0.065, y - s * 0.56 + bob, s * 0.13, s * 0.05);
      eyes(ctx, x, y - s * 0.34 + bob, s * 0.07, s * 0.045, 0.2, blink, mood);
      smile(ctx, x, y - s * 0.24 + bob, s * 0.04);
      break;
    }
    case 'rootsnare': {
      const grab = o.fire || 0;
      for (let i = 0; i < 4; i++) {
        const a = -Math.PI / 2 + (i - 1.5) * 0.45 + Math.sin(t * 2 + i) * 0.1;
        ctx.save(); ctx.translate(x, y - s * 0.15); ctx.rotate(a);
        stem(ctx, 0, 0, s * 0.15, s * 0.1 * (i % 2 ? 1 : -1), s * (0.32 + grab * 0.2), 0, s * 0.035, '#8a6d3b');
        ctx.restore();
      }
      blob(ctx, x, y - s * 0.2, s * 0.2, s * 0.15, '#a0804a', s);
      eyes(ctx, x, y - s * 0.22, s * 0.07, s * 0.045, 0.6, blink, 'angry');
      break;
    }
    case 'lanceleaf': {
      for (const [a, c] of [[-1.95, '#8fc23f'], [-1.2, '#b5e655'], [-1.57, '#a2d84a']]) leaf(ctx, x, y - s * 0.08, s * 0.6, s * 0.08, a + sway * 0.5, c, s);
      blob(ctx, x, y - s * 0.2, s * 0.17, s * 0.15, '#7aa832', s);
      eyes(ctx, x + s * 0.03, y - s * 0.22, s * 0.06, s * 0.045, 0.5, blink, 'angry');
      break;
    }
    case 'stormseed': {
      const zap = Math.sin(t * 20) > 0.6;
      blob(ctx, x, y - s * 0.28 + bob, s * 0.2, s * 0.26, '#665c2c', s);
      ctx.beginPath();
      ctx.moveTo(x + s * 0.02, y - s * 0.5 + bob); ctx.lineTo(x - s * 0.08, y - s * 0.28 + bob); ctx.lineTo(x + s * 0.01, y - s * 0.28 + bob);
      ctx.lineTo(x - s * 0.04, y - s * 0.08 + bob); ctx.lineTo(x + s * 0.1, y - s * 0.34 + bob); ctx.lineTo(x + s * 0.02, y - s * 0.34 + bob);
      ctx.closePath(); ctx.fillStyle = '#ffe95c'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
      if (zap) {
        ctx.strokeStyle = '#fff6a8'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(x - s * 0.22, y - s * 0.5); ctx.lineTo(x - s * 0.3, y - s * 0.6); ctx.moveTo(x + s * 0.22, y - s * 0.48); ctx.lineTo(x + s * 0.32, y - s * 0.56); ctx.stroke();
      }
      break;
    }
    case 'pollenpuff': {
      // a dandelion seed-clock: a fluffy white globe of seed filaments with a sniffly little face
      stem(ctx, x, y - s * 0.06, x + s * 0.06, y - s * 0.26, x, y - s * 0.34 + bob, s * 0.035, '#6a9a4a');
      leaf(ctx, x, y - s * 0.12, s * 0.2, s * 0.05, Math.PI + 0.3 + sway, '#5ab04a', s);
      leaf(ctx, x, y - s * 0.16, s * 0.16, s * 0.045, -0.4 - sway, '#5ab04a', s);
      const cx = x, cy = y - s * 0.52 + bob, R = s * 0.22 * (1 + (o.fire || 0) * 0.15);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.05, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * TAU + Math.sin(t + i) * 0.03;
        const ex = cx + Math.cos(a) * R, ey = cy + Math.sin(a) * R;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.35, cy + Math.sin(a) * R * 0.35); ctx.lineTo(ex, ey); ctx.stroke();
        // tiny parachute tufts
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(a + 0.5) * 5, ey + Math.sin(a + 0.5) * 5);
        ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(a - 0.5) * 5, ey + Math.sin(a - 0.5) * 5); ctx.stroke();
      }
      blob(ctx, cx, cy, R * 0.42, R * 0.4, '#d8cfae', s * 0.8);
      eyes(ctx, cx, cy - R * 0.06, R * 0.17, R * 0.1, 0.4, blink || (o.fire || 0) > 0.5, mood);
      circle(ctx, cx, cy + R * 0.16, R * 0.08, '#e88a8a');
      // drifting seeds
      for (let i = 0; i < 2; i++) {
        const k = (t * 0.4 + i * 0.5 + seed) % 1;
        const dx = cx + R + k * s * 0.3, dy = cy - k * s * 0.25 + Math.sin(k * 8) * 4;
        ctx.strokeStyle = `rgba(255,255,255,${1 - k})`;
        ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx - 4, dy + 6); ctx.moveTo(dx - 4, dy); ctx.lineTo(dx + 4, dy); ctx.stroke();
      }
      break;
    }
    case 'hivebloom': {
      stem(ctx, x, y - s * 0.06, x - s * 0.06, y - s * 0.25, x, y - s * 0.32, s * 0.05);
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.48 + bob, s * 0.2, s * 0.24, 0, 0, TAU);
      ctx.fillStyle = shadeFill(ctx, x, y - s * 0.48, s * 0.22, '#ffb84a'); ctx.fill(); outline(ctx, s);
      ctx.strokeStyle = '#b06a14'; ctx.lineWidth = 2.5;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(x, y - s * 0.48 + bob + i * s * 0.08, s * 0.2 * Math.cos(i * 0.35), s * 0.02, 0, 0, Math.PI); ctx.stroke(); }
      circle(ctx, x, y - s * 0.42 + bob, s * 0.05, '#4a2a0a');
      eyes(ctx, x, y - s * 0.55 + bob, s * 0.065, s * 0.04, 0.4, blink, mood);
      for (let i = 0; i < 2; i++) {
        const a = t * 4 + i * Math.PI;
        drawBee(ctx, x + Math.cos(a) * s * 0.3, y - s * 0.6 + Math.sin(a * 1.4) * s * 0.1, s * 0.45, t);
      }
      break;
    }
    case 'emberroot': {
      ctx.beginPath();
      ctx.moveTo(x - s * 0.3, y - s * 0.02);
      ctx.quadraticCurveTo(x - s * 0.1, y - s * 0.12, x - s * 0.05, y - s * 0.35);
      ctx.lineTo(x + s * 0.05, y - s * 0.35);
      ctx.quadraticCurveTo(x + s * 0.1, y - s * 0.12, x + s * 0.3, y - s * 0.02);
      ctx.fillStyle = '#7a3b1f'; ctx.fill(); outline(ctx, s);
      const fl = Math.sin(t * 9) * s * 0.02;
      ctx.beginPath();
      ctx.moveTo(x - s * 0.18, y - s * 0.35);
      ctx.quadraticCurveTo(x - s * 0.22, y - s * 0.7 + fl, x, y - s * 0.84 - fl);
      ctx.quadraticCurveTo(x + s * 0.22, y - s * 0.7 + fl, x + s * 0.18, y - s * 0.35);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, y - s * 0.84, 0, y - s * 0.35);
      g.addColorStop(0, '#ffd25a'); g.addColorStop(1, '#ff5a1a');
      ctx.fillStyle = g; ctx.shadowColor = '#ff6a2a'; ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0; outline(ctx, s);
      ctx.beginPath(); ctx.ellipse(x, y - s * 0.5, s * 0.1, s * 0.15 + fl, 0, 0, TAU); ctx.fillStyle = '#fff0a0'; ctx.fill();
      eyes(ctx, x, y - s * 0.46, s * 0.06, s * 0.04, 0.4, blink, 'angry');
      break;
    }
    case 'bramblemat': {
      ctx.fillStyle = '#4a3a1a';
      ctx.beginPath(); ctx.ellipse(x, y - s * 0.08, s * 0.44, s * 0.12, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#7a9a3a'; ctx.lineWidth = s * 0.035;
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.moveTo(x - s * 0.4 + i * s * 0.13, y - s * 0.05);
        ctx.quadraticCurveTo(x - s * 0.34 + i * s * 0.13, y - s * 0.2, x - s * 0.28 + i * s * 0.13, y - s * 0.07);
        ctx.stroke();
      }
      ctx.fillStyle = '#e8ffb0';
      for (let i = 0; i < 9; i++) {
        const sx = x - s * 0.38 + i * s * 0.095, sy = y - s * 0.12 - (i % 2) * s * 0.06;
        ctx.beginPath(); ctx.moveTo(sx - 3, sy + 4); ctx.lineTo(sx, sy - 7 - Math.abs(Math.sin(t * 3 + i)) * 2); ctx.lineTo(sx + 3, sy + 4); ctx.fill();
      }
      eyes(ctx, x, y - s * 0.12, s * 0.05, s * 0.03, 0.5, blink, 'angry');
      break;
    }
    case 'twinbud': {
      stem(ctx, x, y - s * 0.06, x, y - s * 0.2, x, y - s * 0.3, s * 0.05);
      stem(ctx, x, y - s * 0.3, x - s * 0.1, y - s * 0.36, x - s * 0.16, y - s * 0.5, s * 0.04);
      stem(ctx, x, y - s * 0.3, x + s * 0.1, y - s * 0.36, x + s * 0.16, y - s * 0.5, s * 0.04);
      for (const dx of [-0.16, 0.16]) {
        const bx = x + dx * s, by = y - s * 0.56 + bob * (dx > 0 ? 1 : -1);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU + t * 0.5;
          blob(ctx, bx + Math.cos(a) * s * 0.09, by + Math.sin(a) * s * 0.09, s * 0.07, s * 0.045, '#ff7eb6', s * 0.6, a);
        }
        blob(ctx, bx, by, s * 0.08, s * 0.08, '#ffd6e8', s * 0.7);
        eyes(ctx, bx, by, s * 0.035, s * 0.025, 0.5, blink, mood);
      }
      break;
    }
    case 'boulderbud': {
      const dmg = o.hpFrac !== undefined ? o.hpFrac : 1;
      blob(ctx, x, y - s * 0.32, s * 0.32, s * 0.3, '#9a9488', s);
      ctx.fillStyle = 'rgba(60,55,50,0.3)';
      circle(ctx, x + s * 0.12, y - s * 0.2, s * 0.05, 'rgba(60,55,50,0.3)');
      circle(ctx, x - s * 0.15, y - s * 0.45, s * 0.04, 'rgba(60,55,50,0.3)');
      leaf(ctx, x + s * 0.02, y - s * 0.6, s * 0.16, s * 0.05, -1.4 + sway, '#6fcf5a', s);
      leaf(ctx, x - s * 0.02, y - s * 0.6, s * 0.14, s * 0.05, -1.9 + sway, '#5ab04a', s);
      if (dmg < 0.5) { ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x - s * 0.1, y - s * 0.58); ctx.lineTo(x - s * 0.02, y - s * 0.42); ctx.lineTo(x - s * 0.12, y - s * 0.3); ctx.stroke(); }
      eyes(ctx, x, y - s * 0.34, s * 0.09, s * 0.055, 0.4, blink, dmg < 0.5 ? 'angry' : 'happy');
      smile(ctx, x, y - s * 0.2, s * 0.05);
      break;
    }
    case 'prismbud': {
      stem(ctx, x, y - s * 0.06, x + s * 0.06, y - s * 0.3, x, y - s * 0.4, s * 0.04, '#6a8a9a');
      const pulse = 0.5 + 0.5 * Math.sin(t * 3 + seed);
      ctx.save();
      ctx.translate(x, y - s * 0.55 + bob);
      ctx.rotate(t * 0.4);
      ctx.shadowColor = '#d6a8ff'; ctx.shadowBlur = 8 + pulse * 14;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx.lineTo(Math.cos(a) * s * 0.2, Math.sin(a) * s * 0.2); }
      ctx.closePath();
      ctx.fillStyle = shadeFill(ctx, 0, 0, s * 0.2, '#d6a8ff'); ctx.fill(); ctx.shadowBlur = 0; outline(ctx, s);
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * s * 0.2, Math.sin(a) * s * 0.2); ctx.stroke(); }
      ctx.restore();
      eyes(ctx, x, y - s * 0.55 + bob, s * 0.055, s * 0.035, 0.3, blink, mood);
      break;
    }
    case 'sprout': {
      stem(ctx, x, y - s * 0.06, x - s * 0.03, y - s * 0.15, x, y - s * 0.25 + bob, s * 0.03);
      leaf(ctx, x, y - s * 0.24 + bob, s * 0.14, s * 0.06, -0.5 + sway, '#8fe06a', s);
      leaf(ctx, x, y - s * 0.24 + bob, s * 0.14, s * 0.06, Math.PI + 0.5 - sway, '#8fe06a', s);
      ctx.fillStyle = 'rgba(255,240,150,0.5)';
      ctx.beginPath(); ctx.arc(x, y - s * 0.24, s * 0.2 + Math.sin(t * 2) * 3, 0, TAU); ctx.fill();
      break;
    }
  }
  if (o.hat && HEAD[type]) {
    const [dx, dy, hw] = HEAD[type];
    xfPaused = true;
    drawHat(ctx, o.hat, x + dx * s, y + dy * s + bob, hw * s, t);
    xfPaused = false;
  }
  ctx.restore();
  if (o.level > 1) levelStars(ctx, x, y - s * 0.02, o.level);
  if (o.over > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, o.over);
    ctx.strokeStyle = '#8bff5a'; ctx.lineWidth = 4;
    ctx.shadowColor = '#8bff5a'; ctx.shadowBlur = 20;
    ctx.beginPath(); ctx.ellipse(x, y - s * 0.35, s * 0.42, s * 0.45, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
}

export function drawBee(ctx, x, y, s, t) {
  const flap = Math.abs(Math.sin(t * 30));
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath(); ctx.ellipse(x - 2, y - s * 0.07, s * 0.06, s * 0.04 * flap + 1, -0.4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + 3, y - s * 0.07, s * 0.06, s * 0.04 * flap + 1, 0.4, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y, s * 0.07, s * 0.05, 0, 0, TAU);
  ctx.fillStyle = '#ffcc33'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.fillStyle = INK; ctx.fillRect(x - 1.5, y - s * 0.045, 3, s * 0.09);
}

// ---------- rotlings ----------
// Rotlings are blobby blight creatures with one big eye. `e` is the live entity.
export function drawRotling(ctx, e, s, t) {
  if (e.hurt > 0) withXF(ctx, ['hurt'], () => drawRotlingInner(ctx, e, s, t));
  else if (e.frozenTime > 0) withXF(ctx, ['frozen'], () => drawRotlingInner(ctx, e, s, t));
  else drawRotlingInner(ctx, e, s, t);
}

function drawRotlingInner(ctx, e, s, t) {
  const d = e.def;
  const x = e.x, y = e.y;
  const wob = Math.sin(t * (e.eating ? 14 : 6) + e.seed) * 0.06;
  const scale = d.boss ? 1.9 : d.big ? 1.35 : d.small ? 0.6 : 1;
  const r = s * 0.27 * scale;
  ctx.save();
  if (e.dying) { ctx.globalAlpha = Math.max(0, e.dying); }
  if (e.burrowed) {
    ctx.fillStyle = '#5a3d22';
    ctx.beginPath(); ctx.ellipse(x, y - 4, s * 0.25 * scale, s * 0.08, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 4; i++) circle(ctx, x - s * 0.15 + i * s * 0.1, y - 8 - Math.abs(Math.sin(t * 8 + i)) * 6, 4, '#7a5532');
    ctx.restore();
    return;
  }
  const flyY = d.flying ? -s * 0.35 + Math.sin(t * 4 + e.seed) * 6 : 0;
  const hop = e.confused > 0 ? Math.abs(Math.sin(t * 10)) * 6 : 0;
  shadow(ctx, x, y - s * 0.05, r * (d.flying ? 0.6 : 1));
  const cy = y - r + flyY - hop;
  let body = d.color;
  if (e.slow > 0) body = '#8fb7e0';
  // wings
  if (d.flying) {
    const flap = Math.sin(t * 22 + e.seed);
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + sgn * r * 0.2, cy - r * 0.6, r * 0.9, r * 0.35 * (0.4 + Math.abs(flap)), sgn * 0.6, 0, TAU);
      ctx.fillStyle = 'rgba(210,200,255,0.8)'; ctx.fill(); outline(ctx, s, 0.015);
    }
  }
  // boss-specific back pieces
  if (d.boss === 'fire') {
    for (let i = 0; i < 5; i++) {
      const fx = x - r * 0.6 + i * r * 0.3, fl = Math.sin(t * 9 + i) * r * 0.1;
      ctx.beginPath(); ctx.moveTo(fx - r * 0.15, cy - r * 0.7); ctx.quadraticCurveTo(fx, cy - r * 1.5 + fl, fx + r * 0.15, cy - r * 0.7);
      ctx.fillStyle = i % 2 ? '#ffb43a' : '#ff6a2a'; ctx.fill();
    }
  }
  if (d.boss === 'freeze') {
    ctx.fillStyle = '#e8fbff';
    for (let i = 0; i < 5; i++) { const fx = x - r * 0.7 + i * r * 0.35; ctx.beginPath(); ctx.moveTo(fx - r * 0.1, cy - r * 0.7); ctx.lineTo(fx, cy - r * 1.35 - (i % 2) * r * 0.2); ctx.lineTo(fx + r * 0.1, cy - r * 0.7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  // body
  ctx.beginPath();
  if (d.boss === 'dive') {
    // serpent coils
    for (let i = 3; i >= 1; i--) blob(ctx, x + r * 0.55 * i, cy + r * 0.35, r * 0.45, r * 0.4, tint(body, -0.1 * i), s);
  }
  ctx.beginPath();
  ctx.ellipse(x, cy, r * (1 + wob), r * (1 - wob), 0, 0, TAU);
  ctx.fillStyle = shadeFill(ctx, x, cy, r, body);
  ctx.fill();
  outline(ctx, s, d.boss ? 0.04 : 0.028);
  // drips
  ctx.fillStyle = 'rgba(40,20,50,0.35)';
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(x + (i - 1) * r * 0.5, cy + r * 0.8, r * 0.1, r * 0.2 + Math.sin(t * 3 + i + e.seed) * 2, 0, 0, TAU);
    ctx.fill();
  }
  // texture spots
  circle(ctx, x + r * 0.3, cy - r * 0.4, r * 0.18, 'rgba(255,255,255,0.12)');
  circle(ctx, x + r * 0.55, cy + r * 0.1, r * 0.1, 'rgba(255,255,255,0.12)');
  circle(ctx, x + r * 0.1, cy + r * 0.4, r * 0.08, 'rgba(0,0,0,0.12)');

  // ---- accessories per kind ----
  const k = e.k;
  if (e.shell > 0) {
    ctx.beginPath();
    ctx.ellipse(x + r * 0.2, cy - r * 0.2, r * 0.95, r * 0.8, 0, Math.PI * 0.9, Math.PI * 2.1);
    ctx.closePath();
    ctx.fillStyle = shadeFill(ctx, x, cy - r * 0.5, r, '#8f9c6c'); ctx.fill(); outline(ctx, s, 0.03);
    ctx.strokeStyle = '#4d573a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - r * 0.3, cy - r * 0.9); ctx.lineTo(x + r * 0.1, cy - r * 0.1); ctx.moveTo(x + r * 0.5, cy - r * 0.95); ctx.lineTo(x + r * 0.5, cy - r * 0.1); ctx.stroke();
    if (e.shell < d.shell * 0.5) { ctx.strokeStyle = '#2b301f'; ctx.beginPath(); ctx.moveTo(x + r * 0.9, cy - r * 0.5); ctx.lineTo(x + r * 0.6, cy - r * 0.3); ctx.lineTo(x + r * 0.75, cy - r * 0.1); ctx.stroke(); }
  }
  if (k === 'spitter') {
    // swollen throat sac
    blob(ctx, x - r * 0.55, cy + r * 0.25, r * 0.35 * (1 + (e.spitCharge || 0) * 0.4), r * 0.3 * (1 + (e.spitCharge || 0) * 0.4), '#b7e06a', s);
  }
  if (k === 'emberbeast') {
    for (let i = 0; i < 4; i++) { const fl = Math.sin(t * 10 + i) * r * 0.08; ctx.beginPath(); ctx.moveTo(x - r * 0.5 + i * r * 0.32, cy - r * 0.8); ctx.quadraticCurveTo(x - r * 0.35 + i * r * 0.32, cy - r * 1.35 + fl, x - r * 0.2 + i * r * 0.32, cy - r * 0.8); ctx.fillStyle = '#ffb43a'; ctx.fill(); }
    ctx.strokeStyle = '#ffd25a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + r * 0.1, cy - r * 0.3); ctx.lineTo(x + r * 0.4, cy + r * 0.1); ctx.lineTo(x + r * 0.2, cy + r * 0.4); ctx.stroke();
  }
  if (k === 'frostcrawler') {
    ctx.fillStyle = '#e8fbff';
    for (let i = 0; i < 4; i++) { const fx = x - r * 0.5 + i * r * 0.33; ctx.beginPath(); ctx.moveTo(fx - 4, cy - r * 0.85); ctx.lineTo(fx, cy - r * 1.3); ctx.lineTo(fx + 4, cy - r * 0.85); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.stroke(); }
  }
  if (k === 'crystalback') {
    for (let i = 0; i < 4; i++) {
      const fx = x - r * 0.6 + i * r * 0.38, h = r * (0.6 + (i % 2) * 0.3);
      ctx.beginPath(); ctx.moveTo(fx - r * 0.14, cy - r * 0.7); ctx.lineTo(fx, cy - r * 0.7 - h); ctx.lineTo(fx + r * 0.14, cy - r * 0.7); ctx.closePath();
      ctx.fillStyle = i % 2 ? '#b9c8ff' : '#d6a8ff'; ctx.fill(); outline(ctx, s, 0.02);
    }
  }
  if (k === 'rotpriest') {
    // hood + staff with a rotten bloom
    ctx.beginPath(); ctx.moveTo(x - r * 0.9, cy - r * 0.1); ctx.quadraticCurveTo(x, cy - r * 1.9, x + r * 0.9, cy - r * 0.1); ctx.quadraticCurveTo(x, cy - r * 0.9, x - r * 0.9, cy - r * 0.1);
    ctx.fillStyle = '#3d2a4a'; ctx.fill(); outline(ctx, s, 0.02);
    ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - r * 1.05, y - 4); ctx.lineTo(x - r * 1.05, cy - r * 1.3); ctx.stroke();
    const p = 0.5 + 0.5 * Math.sin(t * 4);
    circle(ctx, x - r * 1.05, cy - r * 1.4, r * 0.22, `rgba(160,255,120,${0.5 + p * 0.4})`);
  }
  if (d.big) { for (let i = 0; i < 5; i++) circle(ctx, x - r * 0.6 + i * r * 0.3, cy - r * 0.85, r * 0.18, '#7f9a52'); }
  if (d.spawnOnDeath) { for (let i = 0; i < 4; i++) circle(ctx, x - r * 0.4 + i * r * 0.27, cy + Math.sin(i * 2) * r * 0.3, r * 0.1, '#e3b6f0'); }
  if (d.boss === 'summon' || d.boss === 'mud') {
    // swollen sacs / moss beard
    for (let i = 0; i < 6; i++) blob(ctx, x - r * 0.6 + i * r * 0.25, cy + r * 0.55, r * 0.14, r * 0.18, d.boss === 'mud' ? '#6a8a5a' : '#c9a3d8', s * 0.5);
  }
  if (d.boss === 'monarch') {
    ctx.beginPath();
    ctx.moveTo(x - r * 0.6, cy - r * 0.75);
    for (let i = 0; i < 5; i++) { ctx.lineTo(x - r * 0.6 + i * r * 0.3 + r * 0.15, cy - r * (i % 2 ? 1.15 : 1.5)); ctx.lineTo(x - r * 0.6 + (i + 1) * r * 0.3, cy - r * 0.85); }
    ctx.closePath();
    ctx.fillStyle = '#c9a3ff'; ctx.fill(); outline(ctx, s, 0.025);
    // the stolen Hearthseed glows in its chest
    const p = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.shadowColor = '#ffe27a'; ctx.shadowBlur = 20 + p * 20;
    circle(ctx, x + r * 0.2, cy + r * 0.35, r * 0.16, '#ffe27a');
    ctx.shadowBlur = 0;
    // cape
    ctx.fillStyle = 'rgba(120,30,90,0.6)';
    ctx.beginPath(); ctx.moveTo(x + r * 0.5, cy - r * 0.5); ctx.quadraticCurveTo(x + r * 1.6, cy + r * 0.2, x + r * 1.1, y - 2); ctx.lineTo(x + r * 0.6, y - 2); ctx.fill();
  }

  // ---- face: one big eye looking left + mouth ----
  const ex = x - r * 0.35, ey = cy - r * 0.15;
  circle(ctx, ex, ey, r * 0.3, '#f6f0c8');
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, r * 0.05); ctx.stroke();
  const pupilX = e.confused > 0 ? ex + Math.cos(t * 12) * r * 0.1 : ex - r * 0.1;
  circle(ctx, pupilX, ey + (e.confused > 0 ? Math.sin(t * 12) * r * 0.1 : 0), r * 0.15, d.boss ? '#ff3b6b' : '#c62f4a');
  circle(ctx, pupilX - r * 0.04, ey - r * 0.05, r * 0.05, '#fff');
  // brow
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.beginPath(); ctx.moveTo(ex - r * 0.35, ey - r * 0.35); ctx.lineTo(ex + r * 0.3, ey - r * 0.25); ctx.stroke();
  const open = e.eating ? Math.abs(Math.sin(t * 14)) : 0.2;
  ctx.fillStyle = '#2a1430';
  ctx.beginPath(); ctx.ellipse(x - r * 0.55, cy + r * 0.38, r * 0.22, r * 0.08 + r * 0.16 * open, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f6f0c8';
  ctx.beginPath(); ctx.moveTo(x - r * 0.7, cy + r * 0.3); ctx.lineTo(x - r * 0.65, cy + r * 0.42); ctx.lineTo(x - r * 0.6, cy + r * 0.3); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - r * 0.48, cy + r * 0.3); ctx.lineTo(x - r * 0.43, cy + r * 0.42); ctx.lineTo(x - r * 0.38, cy + r * 0.3); ctx.fill();

  // shield held in front
  if (e.shield > 0) {
    ctx.save();
    ctx.translate(x - r * 1.05, cy + r * 0.1);
    ctx.rotate(-0.1 + Math.sin(t * 3 + e.seed) * 0.05);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.28, r * 0.95, 0, 0, TAU);
    ctx.fillStyle = shadeFill(ctx, 0, 0, r * 0.9, e.shield < d.shield * 0.5 ? '#9a8a4a' : '#6f9a3a'); ctx.fill(); outline(ctx, s, 0.03);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -r * 0.9); ctx.lineTo(0, r * 0.9); ctx.stroke();
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(0, i * r * 0.3); ctx.lineTo(-r * 0.22, i * r * 0.3 - r * 0.15); ctx.stroke(); }
    ctx.restore();
  }
  // legs
  if (!d.flying && d.boss !== 'dive') {
    ctx.fillStyle = 'rgba(30,15,35,0.7)';
    for (let i = 0; i < 3; i++) ctx.fillRect(x - r * 0.5 + i * r * 0.5, y - s * 0.08 * scale + Math.sin(t * 10 + i * 2 + e.seed) * 2, 4 * scale, s * 0.07 * Math.min(scale, 1.3));
  }
  // carried Wildseed
  if (e.carries) {
    const p = 0.5 + 0.5 * Math.sin(t * 5);
    ctx.shadowColor = '#8bff5a'; ctx.shadowBlur = 10 + p * 10;
    drawWildseed(ctx, x + r * 0.4, cy - r * 1.0, r * 0.35, t);
    ctx.shadowBlur = 0;
  }
  if (e.snared > 0) {
    ctx.strokeStyle = '#8a6d3b'; ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - r * 0.8, y - 2); ctx.quadraticCurveTo(x, cy + r * (0.2 - i * 0.3), x + r * 0.8, y - 2); ctx.stroke(); }
  }
  if (e.confused > 0) {
    for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; star(ctx, x + Math.cos(a) * r * 0.6, cy - r * 1.1 + Math.sin(a) * r * 0.15, 5, '#fff1a8'); }
  }
  ctx.restore();
}

// ---------- props + effects ----------
export function drawWildseed(ctx, x, y, size, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 3) * 0.2);
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.9, -size * 0.2, 0, size);
  ctx.quadraticCurveTo(-size * 0.9, -size * 0.2, 0, -size);
  const g = ctx.createLinearGradient(0, -size, 0, size);
  g.addColorStop(0, '#d8ff9a'); g.addColorStop(1, '#3fae3a');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, size * 0.12); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = Math.max(1, size * 0.1);
  ctx.beginPath(); ctx.moveTo(0, -size * 0.6); ctx.quadraticCurveTo(size * 0.25, 0, 0, size * 0.6); ctx.stroke();
  ctx.restore();
}

export function drawLantern(ctx, x, y, lit, t) {
  ctx.save();
  ctx.fillStyle = '#3a2c1e'; ctx.fillRect(x - 3, y - 44, 6, 44);
  ctx.fillStyle = '#2d2418';
  ctx.beginPath(); ctx.moveTo(x - 15, y - 64); ctx.lineTo(x, y - 76); ctx.lineTo(x + 15, y - 64); ctx.fill();
  ctx.fillStyle = lit ? `rgba(255,210,90,${0.85 + Math.sin(t * 5) * 0.1})` : '#3a3a3a';
  if (lit) { ctx.shadowColor = '#ffcf5a'; ctx.shadowBlur = 26; }
  ctx.beginPath(); ctx.roundRect(x - 12, y - 64, 24, 24, 5); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y - 64); ctx.lineTo(x, y - 40); ctx.moveTo(x - 12, y - 52); ctx.lineTo(x + 12, y - 52); ctx.stroke();
  ctx.restore();
}

export function drawGlowMote(ctx, x, y, t, size = 22) {
  ctx.save();
  ctx.shadowColor = '#ffe27a'; ctx.shadowBlur = 20;
  const g = ctx.createRadialGradient(x, y, 2, x, y, size);
  g.addColorStop(0, '#fffbe0'); g.addColorStop(0.5, '#ffd84a'); g.addColorStop(1, 'rgba(255,190,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, size, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = t * 2 + (i * Math.PI) / 2;
    ctx.moveTo(x + Math.cos(a) * size * 0.4, y + Math.sin(a) * size * 0.4);
    ctx.lineTo(x + Math.cos(a) * size * 0.8, y + Math.sin(a) * size * 0.8);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawFirefly(ctx, x, y, t) {
  ctx.save();
  const p = 0.5 + 0.5 * Math.sin(t * 8);
  ctx.shadowColor = '#c8ff6a'; ctx.shadowBlur = 18 + p * 14;
  circle(ctx, x, y, 7 + p * 3, `rgba(220,255,140,${0.7 + p * 0.3})`);
  ctx.shadowBlur = 0;
  circle(ctx, x - 6, y - 2, 4, '#3a3a2a');
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.beginPath(); ctx.ellipse(x - 6, y - 8, 6, 3 * Math.abs(Math.sin(t * 25)) + 1, -0.5, 0, TAU); ctx.fill();
  ctx.restore();
}

export function drawCrystal(ctx, x, y, s, t) {
  ctx.save();
  const p = 0.5 + 0.5 * Math.sin(t * 2 + x);
  ctx.shadowColor = '#d6a8ff'; ctx.shadowBlur = 10 + p * 14;
  for (const [dx, h, w, c] of [[-0.14, 0.5, 0.1, '#b9a0ff'], [0.12, 0.42, 0.09, '#e0c8ff'], [0, 0.65, 0.12, '#d6a8ff']]) {
    ctx.beginPath();
    ctx.moveTo(x + dx * s - w * s, y - s * 0.05);
    ctx.lineTo(x + dx * s - w * s * 0.6, y - h * s * 0.8);
    ctx.lineTo(x + dx * s, y - h * s);
    ctx.lineTo(x + dx * s + w * s * 0.6, y - h * s * 0.8);
    ctx.lineTo(x + dx * s + w * s, y - s * 0.05);
    ctx.closePath();
    ctx.fillStyle = shadeFill(ctx, x + dx * s, y - h * s * 0.5, s * 0.3, c);
    ctx.fill();
    ctx.shadowBlur = 0;
    outline(ctx, s, 0.02);
  }
  ctx.restore();
}

export function drawBoulder(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y - s * 0.3);
  ctx.rotate(t * 8);
  blob(ctx, 0, 0, s * 0.3, s * 0.28, '#9a9488', s);
  ctx.strokeStyle = 'rgba(60,55,50,0.5)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, s * 0.15, 0, 2); ctx.stroke();
  ctx.restore();
}

// ---------- story portraits ----------
export function drawPortrait(ctx, who, x, y, size, t, talking = false) {
  const s = size;
  const mouth = talking ? Math.abs(Math.sin(t * 14)) : 0;
  const blink = t % 3.5 < 0.12;
  ctx.save();
  if (who === 'wren') {
    // hair
    blob(ctx, x, y - s * 0.42, s * 0.3, s * 0.28, '#8a4a2a', s);
    // face
    blob(ctx, x, y - s * 0.38, s * 0.24, s * 0.25, '#ffd8b8', s);
    // freckles + cheeks
    for (const [dx, dy] of [[-0.12, -0.33], [-0.09, -0.3], [0.1, -0.33], [0.13, -0.3]]) circle(ctx, x + dx * s, y + dy * s, s * 0.008, '#c0704a');
    cheeks(ctx, x, y - s * 0.3, s * 0.13, s * 0.035);
    eyes(ctx, x, y - s * 0.41, s * 0.085, s * 0.04, 0.1, blink);
    smile(ctx, x, y - s * 0.26, s * 0.05, mouth);
    // straw hat with a flower
    ctx.beginPath(); ctx.ellipse(x, y - s * 0.58, s * 0.42, s * 0.08, -0.05, 0, TAU);
    ctx.fillStyle = shadeFill(ctx, x, y - s * 0.58, s * 0.4, '#f0cf6a'); ctx.fill(); outline(ctx, s, 0.012);
    ctx.beginPath(); ctx.ellipse(x, y - s * 0.66, s * 0.22, s * 0.13, 0, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = shadeFill(ctx, x, y - s * 0.7, s * 0.2, '#f0cf6a'); ctx.fill(); outline(ctx, s, 0.012);
    ctx.fillStyle = '#4a9a5a'; ctx.fillRect(x - s * 0.22, y - s * 0.64, s * 0.44, s * 0.04);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; circle(ctx, x + s * 0.16 + Math.cos(a) * s * 0.035, y - s * 0.64 + Math.sin(a) * s * 0.035, s * 0.025, '#ff7eb6'); }
    circle(ctx, x + s * 0.16, y - s * 0.64, s * 0.02, '#ffe14d');
    // overalls
    ctx.beginPath(); ctx.roundRect(x - s * 0.26, y - s * 0.12, s * 0.52, s * 0.14, s * 0.06);
    ctx.fillStyle = '#4a7ac0'; ctx.fill(); outline(ctx, s, 0.012);
  } else if (who === 'moss') {
    // shell with a tiny garden on top
    ctx.beginPath(); ctx.ellipse(x + s * 0.08, y - s * 0.22, s * 0.36, s * 0.26, 0, Math.PI, 0); ctx.closePath();
    ctx.fillStyle = shadeFill(ctx, x, y - s * 0.3, s * 0.35, '#7a6a3a'); ctx.fill(); outline(ctx, s, 0.012);
    ctx.strokeStyle = '#5a4a24'; ctx.lineWidth = 2;
    for (const dx of [-0.12, 0.08, 0.28]) { ctx.beginPath(); ctx.arc(x + dx * s, y - s * 0.24, s * 0.09, Math.PI, 0); ctx.stroke(); }
    blob(ctx, x + s * 0.08, y - s * 0.47, s * 0.26, s * 0.06, '#6fbf4a', s * 0.5);
    for (let i = 0; i < 4; i++) {
      stem(ctx, x - s * 0.08 + i * s * 0.1, y - s * 0.48, x - s * 0.08 + i * s * 0.1, y - s * 0.55, x - s * 0.06 + i * s * 0.1, y - s * 0.6, 2);
      circle(ctx, x - s * 0.06 + i * s * 0.1, y - s * 0.61, s * 0.025, ['#ffd23a', '#ff7eb6', '#7fd8ff', '#fff'][i]);
    }
    // head
    blob(ctx, x - s * 0.3, y - s * 0.22, s * 0.15, s * 0.13, '#9bbf7a', s);
    eyes(ctx, x - s * 0.33, y - s * 0.26, s * 0.05, s * 0.03, -0.3, blink);
    // spectacles
    ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x - s * 0.38, y - s * 0.26, s * 0.04, 0, TAU); ctx.arc(x - s * 0.28, y - s * 0.26, s * 0.04, 0, TAU); ctx.stroke();
    smile(ctx, x - s * 0.33, y - s * 0.16, s * 0.035, mouth);
    ctx.fillStyle = '#9bbf7a';
    for (const dx of [-0.2, 0.32]) { ctx.beginPath(); ctx.ellipse(x + dx * s, y - s * 0.04, s * 0.06, s * 0.05, 0, 0, TAU); ctx.fill(); }
  }
  ctx.restore();
}

// ---------- world backdrops ----------
// Draws the scenery behind the board for a world. `L` is the layout: { W, H, BX, BY, BR, BB, home }.
export function drawBackdrop(ctx, world, t, L, cache) {
  const { W, H, BY } = L;
  const g = ctx.createLinearGradient(0, 0, 0, BY + 40);
  g.addColorStop(0, world.sky[0]); g.addColorStop(1, world.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, W + 40, BY + 60);
  const id = world.id;
  if (id === 'marsh' || id === 'caverns' || id === 'rotheart') {
    for (const [x, y, k] of cache.stars) {
      ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * Math.abs(Math.sin(t * 0.8 + k * 10))})`;
      ctx.fillRect(x, y * BY / 120, 2, 2);
    }
  }
  if (id === 'dawn' || id === 'orchard') {
    ctx.save();
    ctx.shadowColor = id === 'dawn' ? '#fff3a0' : '#ff8a3a'; ctx.shadowBlur = 40;
    circle(ctx, W * 0.82, BY * 0.35, 26, id === 'dawn' ? '#fff3a0' : '#ffb36b');
    ctx.restore();
  }
  if (id === 'marsh') {
    ctx.save(); ctx.shadowColor = '#e8f0ff'; ctx.shadowBlur = 30;
    circle(ctx, W * 0.8, BY * 0.38, 22, '#f0f4ff'); ctx.restore();
    circle(ctx, W * 0.8 + 8, BY * 0.38 - 5, 18, world.sky[0]);
  }
  // distant silhouettes
  const hill = (color, amp, base, freq, off) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(-20, BY + 10);
    for (let x = -20; x <= W + 20; x += 20) ctx.lineTo(x, base + Math.sin(x * freq + off) * amp + Math.sin(x * freq * 2.7 + off) * amp * 0.3);
    ctx.lineTo(W + 20, BY + 10); ctx.closePath(); ctx.fill();
  };
  if (id === 'dawn') { hill('#a8d8a0', 10, BY - 18, 0.01, 1); hill('#8cc77f', 8, BY - 6, 0.014, 3); }
  if (id === 'marsh') { hill('#22304a', 8, BY - 16, 0.012, 2); hill('#2a3a4a', 6, BY - 6, 0.02, 5); }
  if (id === 'orchard') {
    hill('#c9784a', 10, BY - 16, 0.01, 4);
    for (let i = 0; i < 9; i++) { const tx = 140 + i * 125; ctx.fillStyle = '#5a3a2a'; ctx.fillRect(tx - 3, BY - 40, 6, 32); circle(ctx, tx, BY - 46, 18, '#8a5a2a'); circle(ctx, tx - 8, BY - 44, 3, '#ff6a2a'); circle(ctx, tx + 7, BY - 50, 3, '#ff6a2a'); }
  }
  if (id === 'frost') {
    ctx.fillStyle = '#c8d8ec';
    ctx.beginPath(); ctx.moveTo(-20, BY);
    for (let i = 0; i < 8; i++) { ctx.lineTo(i * 180 + 90, BY - 60 - (i % 3) * 14); ctx.lineTo(i * 180 + 180, BY); }
    ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 8; i++) { const px = i * 180 + 90, py = BY - 60 - (i % 3) * 14; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 18, py + 18); ctx.lineTo(px + 18, py + 18); ctx.fill(); }
  }
  if (id === 'caverns') {
    ctx.fillStyle = '#1a1230';
    for (let i = 0; i < 16; i++) { const sx = i * 85 + 20; ctx.beginPath(); ctx.moveTo(sx - 18, -5); ctx.lineTo(sx, 30 + (i % 3) * 18); ctx.lineTo(sx + 18, -5); ctx.fill(); }
  }
  if (id === 'rotheart') {
    ctx.strokeStyle = 'rgba(255,90,200,0.35)'; ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(i * 230, 0); ctx.quadraticCurveTo(i * 230 + 60, BY * 0.6 + Math.sin(t + i) * 8, i * 230 + 20, BY); ctx.stroke(); }
  }
}

// Decorative ground details drawn over the grass between rows (stable per seed).
export function drawGroundDetails(ctx, world, L, cache, t) {
  for (const d of cache.decor) {
    const { x, y, kind } = d;
    if (kind === 'flower') {
      const c = d.color;
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU; circle(ctx, x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.5, c); }
      circle(ctx, x, y, 2, '#ffe14d');
    } else if (kind === 'tuft') {
      ctx.strokeStyle = 'rgba(30,60,20,0.35)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 6, y - 7); ctx.moveTo(x, y); ctx.lineTo(x, y - 9); ctx.moveTo(x + 4, y); ctx.lineTo(x + 6, y - 7); ctx.stroke();
    } else if (kind === 'pebble') {
      ctx.fillStyle = 'rgba(80,70,60,0.35)'; ctx.beginPath(); ctx.ellipse(x, y, 4, 2.5, 0, 0, TAU); ctx.fill();
    } else if (kind === 'reed') {
      ctx.strokeStyle = 'rgba(40,70,50,0.6)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.sin(t + x) * 3, y - 10, x + 2, y - 18); ctx.stroke();
      ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x, y - 22, 3, 7);
    } else if (kind === 'snow') {
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.ellipse(x, y, 7, 3, 0, 0, TAU); ctx.fill();
    } else if (kind === 'gem') {
      ctx.fillStyle = `rgba(214,168,255,${0.4 + 0.3 * Math.sin(t * 2 + x)})`; ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 3, y); ctx.lineTo(x, y + 3); ctx.lineTo(x - 3, y); ctx.fill();
    } else if (kind === 'vein') {
      ctx.strokeStyle = 'rgba(160,40,140,0.3)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.quadraticCurveTo(x, y - 5, x + 10, y + 2); ctx.stroke();
    } else if (kind === 'leafpile') {
      ctx.fillStyle = 'rgba(200,90,40,0.5)'; ctx.beginPath(); ctx.ellipse(x, y, 5, 2.5, 0.6, 0, TAU); ctx.fill();
    }
  }
}

export function makeDecor(world, L) {
  const rnd = mulberry(world.id.length * 7919 + 13);
  const kinds = {
    dawn: ['flower', 'tuft', 'tuft', 'pebble'], marsh: ['reed', 'tuft', 'pebble'], orchard: ['leafpile', 'tuft', 'pebble'],
    frost: ['snow', 'snow', 'pebble'], caverns: ['gem', 'pebble'], rotheart: ['vein', 'pebble', 'tuft'],
  }[world.id];
  const colors = ['#ff7eb6', '#fff', '#c58df0', '#7fd8ff'];
  const decor = [];
  for (let i = 0; i < 70; i++) {
    decor.push({ x: L.BX + rnd() * (L.BR - L.BX), y: L.BY + rnd() * (L.BB - L.BY), kind: kinds[Math.floor(rnd() * kinds.length)], color: colors[Math.floor(rnd() * 4)] });
  }
  const stars = [];
  for (let i = 0; i < 70; i++) stars.push([rnd() * L.W, rnd() * 120, rnd()]);
  return { decor, stars };
}

function mulberry(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- cosmetics ----------
// (x, y) = top-centre of the head, w = head width.
export function drawHat(ctx, hat, x, y, w, t = 0) {
  ctx.save();
  ctx.lineJoin = 'round';
  const o = (lw = 0.06) => { ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.5, w * lw); ctx.stroke(); };
  switch (hat) {
    case 'straw': {
      ctx.beginPath(); ctx.ellipse(x, y + w * 0.05, w * 0.85, w * 0.16, 0, 0, TAU);
      ctx.fillStyle = shadeFill(ctx, x, y, w * 0.8, '#f0cf6a'); ctx.fill(); o();
      ctx.beginPath(); ctx.ellipse(x, y - w * 0.08, w * 0.45, w * 0.3, 0, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = shadeFill(ctx, x, y - w * 0.2, w * 0.4, '#f0cf6a'); ctx.fill(); o();
      ctx.fillStyle = '#e05a7a'; ctx.fillRect(x - w * 0.45, y - w * 0.1, w * 0.9, w * 0.08);
      circle(ctx, x + w * 0.3, y - w * 0.1, w * 0.08, '#fff'); circle(ctx, x + w * 0.3, y - w * 0.1, w * 0.035, '#ffd23a');
      break;
    }
    case 'beanie': {
      ctx.beginPath(); ctx.ellipse(x, y + w * 0.02, w * 0.52, w * 0.42, 0, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = shadeFill(ctx, x, y - w * 0.2, w * 0.5, '#e05a5a'); ctx.fill(); o();
      ctx.beginPath(); ctx.roundRect(x - w * 0.55, y - w * 0.04, w * 1.1, w * 0.16, w * 0.06); ctx.fillStyle = '#f4e7c8'; ctx.fill(); o();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 2;
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * w * 0.18, y - w * 0.05); ctx.lineTo(x + i * w * 0.12, y - w * 0.32); ctx.stroke(); }
      circle(ctx, x, y - w * 0.45, w * 0.13, '#f4e7c8'); ctx.beginPath(); ctx.arc(x, y - w * 0.45, w * 0.13, 0, TAU); o();
      break;
    }
    case 'flowerclip': {
      const cx = x + w * 0.32, cy = y + w * 0.02;
      for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + 0.3; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * w * 0.12, cy + Math.sin(a) * w * 0.12, w * 0.1, w * 0.07, a, 0, TAU); ctx.fillStyle = '#ff9ad5'; ctx.fill(); o(0.03); }
      circle(ctx, cx, cy, w * 0.07, '#ffe14d');
      break;
    }
    case 'party': {
      ctx.beginPath(); ctx.moveTo(x - w * 0.3, y + w * 0.04); ctx.lineTo(x + w * 0.05, y - w * 0.75); ctx.lineTo(x + w * 0.3, y + w * 0.04); ctx.closePath();
      ctx.fillStyle = shadeFill(ctx, x, y - w * 0.3, w * 0.5, '#7fd8ff'); ctx.fill(); o();
      ctx.save(); ctx.clip();
      for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#ffd23a' : '#ff7eb6'; ctx.fillRect(x - w * 0.4, y - w * 0.15 - i * w * 0.2, w * 0.8, w * 0.07); }
      ctx.restore();
      circle(ctx, x + w * 0.05, y - w * 0.78, w * 0.08, '#ffd23a');
      break;
    }
    case 'crown': {
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i / 6) * Math.PI;
        ctx.save(); ctx.translate(x + Math.cos(a) * w * 0.45, y + Math.sin(a) * w * 0.12); ctx.rotate(a + Math.PI / 2);
        ctx.beginPath(); ctx.ellipse(0, -w * 0.12, w * 0.07, w * 0.16, 0, 0, TAU);
        ctx.fillStyle = i % 2 ? '#5ab04a' : '#7fd05a'; ctx.fill(); o(0.03); ctx.restore();
      }
      circle(ctx, x, y - w * 0.2, w * 0.06, '#ff7eb6');
      break;
    }
    case 'tophat': {
      ctx.beginPath(); ctx.ellipse(x, y + w * 0.03, w * 0.62, w * 0.12, 0, 0, TAU); ctx.fillStyle = '#2a2430'; ctx.fill(); o();
      ctx.beginPath(); ctx.roundRect(x - w * 0.36, y - w * 0.62, w * 0.72, w * 0.64, w * 0.06);
      ctx.fillStyle = shadeFill(ctx, x, y - w * 0.4, w * 0.5, '#3a3440'); ctx.fill(); o();
      ctx.fillStyle = '#c0392b'; ctx.fillRect(x - w * 0.36, y - w * 0.16, w * 0.72, w * 0.1);
      break;
    }
    case 'wizard': {
      ctx.beginPath(); ctx.ellipse(x, y + w * 0.03, w * 0.7, w * 0.14, 0, 0, TAU); ctx.fillStyle = '#4a3a9a'; ctx.fill(); o();
      ctx.beginPath(); ctx.moveTo(x - w * 0.4, y); ctx.quadraticCurveTo(x - w * 0.1, y - w * 0.6, x + w * 0.35, y - w * 0.95); ctx.quadraticCurveTo(x + w * 0.1, y - w * 0.45, x + w * 0.4, y); ctx.closePath();
      ctx.fillStyle = shadeFill(ctx, x, y - w * 0.4, w * 0.6, '#5a48b8'); ctx.fill(); o();
      for (const [sx, sy] of [[-0.1, -0.25], [0.12, -0.5], [0.05, -0.15]]) star(ctx, x + sx * w, y + sy * w, w * 0.07, '#ffe14d');
      break;
    }
    case 'headphones': {
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(3, w * 0.12);
      ctx.beginPath(); ctx.arc(x, y + w * 0.35, w * 0.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      ctx.strokeStyle = '#ff7eb6'; ctx.lineWidth = Math.max(2, w * 0.07);
      ctx.beginPath(); ctx.arc(x, y + w * 0.35, w * 0.5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      for (const sd of [-1, 1]) { ctx.beginPath(); ctx.roundRect(x + sd * w * 0.5 - w * 0.11, y + w * 0.12, w * 0.22, w * 0.3, w * 0.08); ctx.fillStyle = '#3a3440'; ctx.fill(); o(); }
      const k = Math.sin(t * 6) > 0;
      ctx.fillStyle = '#2a1a14'; ctx.font = `${Math.round(w * 0.3)}px sans-serif`; ctx.fillText(k ? '♪' : '♫', x + w * 0.6, y - w * 0.2);
      break;
    }
    case 'chef': {
      ctx.beginPath(); ctx.roundRect(x - w * 0.34, y - w * 0.22, w * 0.68, w * 0.26, w * 0.04); ctx.fillStyle = '#fff'; ctx.fill(); o();
      for (const [cx, r] of [[-0.22, 0.2], [0, 0.26], [0.22, 0.2]]) { ctx.beginPath(); ctx.arc(x + cx * w, y - w * 0.32, r * w, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill(); o(0.04); }
      ctx.beginPath(); ctx.roundRect(x - w * 0.34, y - w * 0.22, w * 0.68, w * 0.12, 0); ctx.fillStyle = '#fff'; ctx.fill();
      break;
    }
    case 'acornhelm': {
      ctx.beginPath(); ctx.ellipse(x, y + w * 0.02, w * 0.56, w * 0.42, 0, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = shadeFill(ctx, x, y - w * 0.2, w * 0.5, '#9a6a3c'); ctx.fill(); o();
      ctx.strokeStyle = 'rgba(60,30,10,0.5)'; ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x, y + w * 0.02, w * (0.15 + i * 0.12), Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
      ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = Math.max(2, w * 0.08);
      ctx.beginPath(); ctx.moveTo(x, y - w * 0.4); ctx.quadraticCurveTo(x + w * 0.05, y - w * 0.6, x + w * 0.15, y - w * 0.62); ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

// ---------- storybook ground texture ----------
// Pre-renders the lawn for a world once (cheap to draw every frame afterwards).
export function makeBoardTexture(world, cols, rows, tw, th, activeRows) {
  const c = document.createElement('canvas');
  c.width = cols * tw; c.height = rows * th;
  const ctx = c.getContext('2d');
  const rnd = mulberry(world.id.length * 131 + 7);
  const [a, b] = world.ground;
  for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
    const x = col * tw, y = r * th;
    const active = activeRows.includes(r);
    const base = active ? ((r + col) % 2 ? a : b) : (r + col) % 2 ? '#8b6b4a' : '#7f6143';
    const g = ctx.createRadialGradient(x + tw * 0.45, y + th * 0.4, 4, x + tw / 2, y + th / 2, tw * 0.75);
    g.addColorStop(0, tint(base, 0.08)); g.addColorStop(1, tint(base, -0.1));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, tw, th);
    // painterly blotches
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
      ctx.beginPath(); ctx.ellipse(x + rnd() * tw, y + rnd() * th, 8 + rnd() * 18, 5 + rnd() * 10, rnd() * 3, 0, TAU); ctx.fill();
    }
    // grass blades / texture strokes
    const blade = active ? tint(base, -0.28) : 'rgba(60,40,20,0.4)';
    ctx.strokeStyle = blade; ctx.lineWidth = 1.4;
    for (let i = 0; i < (active ? 26 : 10); i++) {
      const bx = x + rnd() * tw, by = y + 8 + rnd() * (th - 8), h = 4 + rnd() * 7;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + 1, by - h * 0.6, bx + (rnd() - 0.5) * 5, by - h); ctx.stroke();
    }
    if (active) {
      ctx.strokeStyle = tint(base, 0.2); ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) { const bx = x + rnd() * tw, by = y + rnd() * th; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 1, by - 5); ctx.stroke(); }
    }
    // soft tile edges
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, tw - 2, th - 2);
  }
  // row hedge shadows
  for (let r = 0; r < rows; r++) { ctx.fillStyle = 'rgba(0,0,0,0.07)'; ctx.fillRect(0, r * th + th - 5, cols * tw, 5); }
  return c;
}

export function drawClouds(ctx, W, top, t, color = 'rgba(255,255,255,0.8)') {
  for (let i = 0; i < 5; i++) {
    const x = ((i * 310 + t * (8 + i * 3)) % (W + 300)) - 150, y = top + (i % 3) * 22;
    ctx.fillStyle = color;
    for (const [dx, dy, r] of [[0, 0, 22], [24, -8, 26], [52, 0, 20], [30, 8, 22]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, TAU); ctx.fill(); }
  }
}
