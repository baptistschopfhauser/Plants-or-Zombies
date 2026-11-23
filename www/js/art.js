import { sprite, drawSprite } from './sprites.js';
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
  glowcap: [0, -0.74, 0.46], sporelamp: [0, -0.62, 0.3], thornling: [0.02, -0.66, 0.36], barkwall: [0, -0.77, 0.5],
  puffball: [0, -0.42, 0.34], frostbell: [0.06, -0.77, 0.24], vinewhip: [0, -0.54, 0.34], mossmender: [0, -0.62, 0.4],
  rootsnare: [0, -0.36, 0.3], lanceleaf: [0, -0.36, 0.28], stormseed: [0, -0.55, 0.3], pollenpuff: [0, -0.76, 0.32],
  hivebloom: [0, -0.73, 0.34], emberroot: [0, -0.86, 0.28], bramblemat: [0, -0.31, 0.14], twinbud: [0, -0.74, 0.26],
  boulderbud: [0, -0.62, 0.44], prismbud: [0, -0.77, 0.3],
};

// ---------- colour + shape helpers ----------
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function tint(h, amt) {
  let r, g, b;
  if (h[0] === '#') [r, g, b] = hexToRgb(h);
  else { const m = /rgba?\(([^)]+)\)/.exec(h); [r, g, b] = m ? m[1].split(',').map(Number) : [128, 128, 128]; }
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}
// toon shading: bright key light from the top-left, a warm core and a deep shadow edge
function shadeFill(ctx, x, y, r, color) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.02, x - r * 0.05, y - r * 0.05, r * 1.15);
  g.addColorStop(0, tint(color, 0.62));
  g.addColorStop(0.22, tint(color, 0.3));
  g.addColorStop(0.55, tint(color, 0.06));
  g.addColorStop(0.85, tint(color, -0.18));
  g.addColorStop(1, tint(color, -0.34));
  return g;
}
let lineColor = null;
// coloured outlines read softer and richer than flat black ones
// no heavy outlines: just a thin, soft edge in a darker shade of the shape's own colour
function outline(ctx, s, w = 0.032) {
  ctx.save();
  ctx.globalAlpha *= lineColor ? 0.45 : 0.28;
  ctx.strokeStyle = lineColor || INK;
  ctx.lineWidth = Math.max(1, s * w * 0.32);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.restore();
}
function inkFor(color) { return tint(color, -0.5); }
function blob(ctx, x, y, rx, ry, color, s, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fillStyle = shadeFill(ctx, x, y, Math.max(rx, ry), color);
  ctx.fill();
  lineColor = inkFor(color);
  outline(ctx, s);
  lineColor = null;
  glossy(ctx, x, y, rx, ry, rot);
}
// specular highlight + rim light, the "polished toy" look
function glossy(ctx, x, y, rx, ry, rot = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  const hg = ctx.createRadialGradient(-rx * 0.35, -ry * 0.5, 0, -rx * 0.35, -ry * 0.5, rx * 0.45);
  hg.addColorStop(0, 'rgba(255,255,255,0.55)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(-rx * 0.35, -ry * 0.5, rx * 0.45, ry * 0.3, -0.4, 0, TAU); ctx.fill();
  // soft ambient shadow at the base
  const ag = ctx.createRadialGradient(0, ry * 0.85, 0, 0, ry * 0.85, rx * 0.9);
  ag.addColorStop(0, 'rgba(0,0,0,0.14)'); ag.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = ag;
  ctx.beginPath(); ctx.ellipse(0, ry * 0.8, rx * 0.9, ry * 0.3, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = Math.max(1.5, Math.min(rx, ry) * 0.09);
  ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.84, ry * 0.84, 0, Math.PI * 0.15, Math.PI * 0.55); ctx.stroke();
  ctx.restore();
}
function circle(ctx, x, y, r, fill) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}
function shine(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.55, -0.6, 0, TAU);
  ctx.fill();
}

// big glossy cartoon eyes with lids, two highlights and expressive brows
function eyes(ctx, x, y, gap, r, look = 0.4, blink = false, mood = 'happy') {
  r *= 1.18;
  for (const s of [-1, 1]) {
    const ex = x + s * gap * 1.06;
    if (blink) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.8, r * 0.32);
      ctx.beginPath();
      ctx.moveTo(ex - r, y);
      ctx.quadraticCurveTo(ex, y + r * 0.55, ex + r, y);
      ctx.stroke();
      continue;
    }
    ctx.beginPath();
    ctx.ellipse(ex, y, r * 0.92, r * 1.08, 0, 0, TAU);
    const g = ctx.createRadialGradient(ex - r * 0.3, y - r * 0.4, r * 0.1, ex, y, r * 1.1);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.75, '#f4f2ec'); g.addColorStop(1, '#cfcbc0');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(40,25,20,0.35)'; ctx.lineWidth = Math.max(1, r * 0.08); ctx.stroke();
    const px = ex + r * look * 0.8, py = y + r * 0.12;
    ctx.beginPath(); ctx.ellipse(px, py, r * 0.56, r * 0.66, 0, 0, TAU);
    const pg = ctx.createRadialGradient(px, py - r * 0.2, r * 0.05, px, py, r * 0.66);
    pg.addColorStop(0, '#3a3450'); pg.addColorStop(1, '#0f0c18');
    ctx.fillStyle = pg; ctx.fill();
    circle(ctx, px + r * 0.2, py - r * 0.26, r * 0.22, '#fff');
    circle(ctx, px - r * 0.18, py + r * 0.24, r * 0.09, 'rgba(255,255,255,0.85)');
    // upper lid shading
    ctx.save();
    ctx.beginPath(); ctx.ellipse(ex, y, r * 0.92, r * 1.08, 0, 0, TAU); ctx.clip();
    ctx.fillStyle = 'rgba(60,40,40,0.16)';
    ctx.fillRect(ex - r, y - r * 1.1, r * 2, r * 0.45);
    ctx.restore();
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.8, r * 0.34);
    ctx.beginPath();
    if (mood === 'angry') {
      ctx.moveTo(ex - r * 1.05, y - r * (s < 0 ? 1.55 : 1.05));
      ctx.lineTo(ex + r * 1.05, y - r * (s < 0 ? 1.05 : 1.55));
    } else {
      ctx.moveTo(ex - r * 0.75, y - r * 1.4);
      ctx.quadraticCurveTo(ex, y - r * 1.75, ex + r * 0.75, y - r * 1.4);
    }
    ctx.stroke();
  }
}
function smile(ctx, x, y, w, open = 0) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.8, w * 0.28);
  ctx.lineCap = 'round';
  if (open > 0.05) {
    ctx.beginPath();
    ctx.moveTo(x - w, y - w * 0.2);
    ctx.quadraticCurveTo(x, y + w * (0.9 + open * 0.6), x + w, y - w * 0.2);
    ctx.closePath();
    ctx.fillStyle = '#6a1e26'; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff8a9a';
    ctx.beginPath(); ctx.ellipse(x, y + w * 0.45 * (1 + open * 0.5), w * 0.45, w * 0.22, 0, 0, TAU); ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.arc(x, y - w * 0.3, w, 0.22 * Math.PI, 0.78 * Math.PI);
  ctx.stroke();
}
function cheeks(ctx, x, y, gap, r) {
  for (const s of [-1, 1]) {
    const g = ctx.createRadialGradient(x + s * gap, y, 0, x + s * gap, y, r * 1.4);
    g.addColorStop(0, 'rgba(255,100,130,0.55)'); g.addColorStop(1, 'rgba(255,100,130,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x + s * gap, y, r * 1.4, r, 0, 0, TAU); ctx.fill();
  }
}
function shadow(ctx, x, y, w) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, w);
  g.addColorStop(0, 'rgba(0,0,0,0.32)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.3, 0, 0, TAU);
  ctx.fill();
}
// veined two-tone leaf with a coloured outline
function leaf(ctx, x, y, len, w, ang, color, s) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.bezierCurveTo(len * 0.25, -w * 1.2, len * 0.75, -w * 1.1, len, 0);
  ctx.bezierCurveTo(len * 0.75, w * 0.9, len * 0.25, w * 1.0, 0, 0);
  const g = ctx.createLinearGradient(0, -w, 0, w);
  g.addColorStop(0, tint(color, 0.38));
  g.addColorStop(0.5, color);
  g.addColorStop(1, tint(color, -0.3));
  ctx.fillStyle = g;
  ctx.fill();
  lineColor = inkFor(color);
  outline(ctx, s, 0.022);
  lineColor = null;
  ctx.strokeStyle = tint(color, -0.35);
  ctx.lineWidth = Math.max(1, s * 0.01);
  ctx.beginPath();
  ctx.moveTo(len * 0.05, 0);
  ctx.quadraticCurveTo(len * 0.5, -w * 0.12, len * 0.9, 0);
  for (let i = 1; i <= 3; i++) {
    const vx = len * (0.2 + i * 0.18);
    ctx.moveTo(vx, -w * 0.05); ctx.lineTo(vx + len * 0.12, -w * 0.55);
    ctx.moveTo(vx, w * 0.02); ctx.lineTo(vx + len * 0.12, w * 0.45);
  }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.beginPath(); ctx.moveTo(len * 0.2, -w * 0.55); ctx.quadraticCurveTo(len * 0.5, -w * 0.85, len * 0.75, -w * 0.5); ctx.stroke();
  ctx.restore();
}
function stem(ctx, x1, y1, cx, cy, x2, y2, w, color = '#3f8f3a') {
  ctx.lineCap = 'round';
  ctx.strokeStyle = tint(color, -0.3);
  ctx.lineWidth = w + 1.5;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.quadraticCurveTo(cx, cy, x2, y2); ctx.stroke();
  ctx.strokeStyle = tint(color, 0.35);
  ctx.lineWidth = Math.max(1, w * 0.3);
  ctx.beginPath(); ctx.moveTo(x1 - w * 0.2, y1); ctx.quadraticCurveTo(cx - w * 0.2, cy, x2 - w * 0.2, y2); ctx.stroke();
}
// every rooted guardian grows from a little tuft of splayed leaves
function pot(ctx, x, y, s) {
  const c = '#5fb84a';
  leaf(ctx, x - s * 0.02, y - s * 0.05, s * 0.24, s * 0.07, Math.PI - 0.18, c, s);
  leaf(ctx, x + s * 0.02, y - s * 0.05, s * 0.24, s * 0.07, 0.18, c, s);
  leaf(ctx, x - s * 0.01, y - s * 0.04, s * 0.17, s * 0.06, Math.PI + 0.45, tint(c, -0.1), s);
  leaf(ctx, x + s * 0.01, y - s * 0.04, s * 0.17, s * 0.06, -0.45, tint(c, -0.1), s);
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
  const img = sprite('guardians', type);
  if (img) {
    const seed0 = o.seed || 0;
    const pop = o.born !== undefined ? Math.min(1, o.born) : 1;
    const breathe = Math.sin(t * 2.2 + seed0) * 0.025;
    const squash = o.fire ? 1 - o.fire * 0.1 : 1;
    shadow(ctx, x, y - s * 0.05, s * 0.32);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale((1 + breathe) / squash * (0.4 + 0.6 * pop), (1 - breathe) * squash * pop);
    drawSprite(ctx, img, 0, 0, s * 0.95);
    ctx.restore();
    if (o.hat && HEAD[type]) { const [dx, dy, hw] = HEAD[type]; drawHat(ctx, o.hat, x + dx * s, y + dy * s, hw * s, t); }
    if (o.level > 1) levelStars(ctx, x, y - s * 0.02, o.level);
    return;
  }
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
  const big = 1.3;
  ctx.scale(big * (1 + breathe) * elastic * (pop < 1 ? 0.4 + pop * 0.6 : 1), big * (1 - breathe) * elastic);
  ctx.translate(-x, -y);
  if (!['bramblemat', 'barkwall', 'boulderbud', 'puffball'].includes(type)) pot(ctx, x, y, s);
  switch (type) {
    case 'glowcap': {
      // a cluster of three bioluminescent amber mushrooms; the face lives on the biggest cap
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.5 + seed);
      const cap = (cx, cy, rw, rh, stemH, col) => {
        ctx.beginPath(); ctx.roundRect(cx - rw * 0.18, cy, rw * 0.36, stemH, rw * 0.12);
        ctx.fillStyle = shadeFill(ctx, cx, cy + stemH / 2, rw * 0.3, '#fff2d8'); ctx.fill();
        lineColor = '#8a6a40'; outline(ctx, s, 0.022); lineColor = null;
        ctx.save(); ctx.shadowColor = '#ffd84a'; ctx.shadowBlur = 8 + pulse * 16;
        ctx.beginPath(); ctx.moveTo(cx - rw, cy + rh * 0.15);
        ctx.bezierCurveTo(cx - rw * 0.95, cy - rh * 1.25, cx + rw * 0.95, cy - rh * 1.25, cx + rw, cy + rh * 0.15);
        ctx.quadraticCurveTo(cx, cy + rh * 0.45, cx - rw, cy + rh * 0.15);
        const g = ctx.createLinearGradient(0, cy - rh, 0, cy + rh * 0.3);
        g.addColorStop(0, tint(col, 0.5)); g.addColorStop(0.6, col); g.addColorStop(1, tint(col, -0.25));
        ctx.fillStyle = g; ctx.fill(); ctx.restore();
        lineColor = inkFor(col); outline(ctx, s, 0.026); lineColor = null;
        // glowing gill rim
        ctx.strokeStyle = `rgba(255,250,200,${0.6 + pulse * 0.4})`; ctx.lineWidth = Math.max(1.5, s * 0.012);
        ctx.beginPath(); ctx.moveTo(cx - rw * 0.85, cy + rh * 0.12); ctx.quadraticCurveTo(cx, cy + rh * 0.38, cx + rw * 0.85, cy + rh * 0.12); ctx.stroke();
        glossy(ctx, cx, cy - rh * 0.45, rw * 0.8, rh * 0.6);
      };
      cap(x - s * 0.2, y - s * 0.3 + bob * 0.5, s * 0.11, s * 0.09, s * 0.22, '#ffd060');
      cap(x + s * 0.21, y - s * 0.26 + bob * 0.5, s * 0.09, s * 0.075, s * 0.18, '#ffc040');
      cap(x, y - s * 0.5 + bob, s * 0.25, s * 0.2, s * 0.42, '#ffb030');
      // floating spores of light
      for (let i = 0; i < 4; i++) { const k = (t * 0.35 + i * 0.25 + seed) % 1; circle(ctx, x - s * 0.25 + i * s * 0.16, y - s * 0.62 - k * s * 0.3, s * 0.018 * (1 - k), `rgba(255,240,160,${1 - k})`); }
      eyes(ctx, x, y - s * 0.54 + bob, s * 0.075, s * 0.045, 0.3, blink, mood);
      smile(ctx, x, y - s * 0.43 + bob, s * 0.035);
      cheeks(ctx, x, y - s * 0.46 + bob, s * 0.13, s * 0.025);
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
      // a plump bud made of overlapping leaf-scales, each tipped with a pale thorn
      const cy = y - s * 0.4 + bob;
      const rx = s * 0.25 * sq, ry = s * 0.3 / sq;
      leaf(ctx, x - s * 0.06, y - s * 0.12, s * 0.26, s * 0.08, Math.PI + 0.55 + sway, '#4f9e3d', s);
      leaf(ctx, x + s * 0.06, y - s * 0.12, s * 0.26, s * 0.08, -0.55 - sway, '#4f9e3d', s);
      ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, TAU);
      ctx.fillStyle = shadeFill(ctx, x, cy, ry, '#6fcf5a'); ctx.fill();
      ctx.save(); ctx.clip();
      // rows of scales, back to front, shaded so they read as layered
      for (let row = 0; row < 4; row++) {
        const ry0 = cy - ry * 0.85 + row * ry * 0.48;
        const n = 4 + (row % 2);
        for (let i = 0; i < n; i++) {
          const sx = x - rx * 1.05 + (i + (row % 2 ? 0 : 0.5)) * (rx * 2.1 / n);
          const g = ctx.createLinearGradient(0, ry0 - ry * 0.3, 0, ry0 + ry * 0.25);
          g.addColorStop(0, tint('#7fd86a', 0.25)); g.addColorStop(1, tint('#4fa83e', -0.15));
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(sx, ry0, rx * 0.34, ry * 0.3, 0, 0, Math.PI);
          ctx.quadraticCurveTo(sx, ry0 - ry * 0.55, sx + rx * 0.34, ry0); ctx.fill();
          ctx.strokeStyle = 'rgba(40,90,30,0.35)'; ctx.lineWidth = Math.max(1, s * 0.008); ctx.stroke();
        }
      }
      ctx.restore();
      glossy(ctx, x, cy, rx, ry);
      // thorn tips around the rim
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI * 1.05 + (i / 11) * Math.PI * 1.1;
        const bx = x + Math.cos(a) * rx * 0.98, by = cy + Math.sin(a) * ry * 0.98;
        const len = s * (0.07 + (i % 2) * 0.025);
        const g = ctx.createLinearGradient(bx, by, bx + Math.cos(a) * len, by + Math.sin(a) * len);
        g.addColorStop(0, '#d8f0b0'); g.addColorStop(1, '#fffbe8');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(bx - Math.sin(a) * s * 0.022, by + Math.cos(a) * s * 0.022);
        ctx.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len);
        ctx.lineTo(bx + Math.sin(a) * s * 0.022, by - Math.cos(a) * s * 0.022);
        ctx.fill();
      }
      // face low on the bud, with a little round spout for spitting thorns
      eyes(ctx, x - s * 0.01, cy + ry * 0.05, s * 0.08, s * 0.055, 0.5, blink, mood);
      const spit = o.fire || 0;
      ctx.beginPath(); ctx.ellipse(x + s * 0.14, cy + ry * 0.42, s * (0.04 + spit * 0.02), s * (0.035 + spit * 0.02), 0, 0, TAU);
      ctx.fillStyle = '#2b5a20'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + s * 0.14, cy + ry * 0.4, s * 0.025, s * 0.012, 0, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fill();
      cheeks(ctx, x - s * 0.01, cy + ry * 0.3, s * 0.13, s * 0.022);
      break;
    }
    case 'barkwall': {
      // a gnarled old stump on root feet, with layered bark plates, shelf fungi and a mossy crown
      const dmg = o.hpFrac !== undefined ? o.hpFrac : 1;
      // root feet
      for (const [dx, a] of [[-0.24, 2.6], [-0.1, 2.0], [0.12, 1.1], [0.26, 0.5]]) {
        ctx.strokeStyle = '#5a361a'; ctx.lineWidth = s * 0.06; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + dx * s * 0.6, y - s * 0.12); ctx.quadraticCurveTo(x + dx * s, y - s * 0.04, x + dx * s + Math.cos(a) * s * 0.08, y - s * 0.02); ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(x - s * 0.3, y - s * 0.08);
      ctx.bezierCurveTo(x - s * 0.36, y - s * 0.35, x - s * 0.28, y - s * 0.62, x - s * 0.27, y - s * 0.72);
      ctx.lineTo(x + s * 0.28, y - s * 0.74);
      ctx.bezierCurveTo(x + s * 0.3, y - s * 0.6, x + s * 0.37, y - s * 0.35, x + s * 0.31, y - s * 0.08);
      ctx.quadraticCurveTo(x, y - s * 0.02, x - s * 0.3, y - s * 0.08);
      ctx.closePath();
      const g = ctx.createLinearGradient(x - s * 0.34, 0, x + s * 0.34, 0);
      g.addColorStop(0, '#5a3418'); g.addColorStop(0.35, '#a8743e'); g.addColorStop(0.6, '#8a5a2e'); g.addColorStop(1, '#4a2a12');
      ctx.fillStyle = g; ctx.fill();
      ctx.save(); ctx.clip();
      // bark plates
      for (let i = 0; i < 6; i++) {
        const px = x - s * 0.3 + i * s * 0.11;
        ctx.strokeStyle = 'rgba(40,20,8,0.45)'; ctx.lineWidth = s * 0.012;
        ctx.beginPath(); ctx.moveTo(px, y - s * 0.74); ctx.bezierCurveTo(px + s * 0.03, y - s * 0.5, px - s * 0.03, y - s * 0.3, px + s * 0.01, y - s * 0.05); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,220,170,0.15)'; ctx.lineWidth = s * 0.008;
        ctx.beginPath(); ctx.moveTo(px + s * 0.02, y - s * 0.72); ctx.bezierCurveTo(px + s * 0.05, y - s * 0.5, px - s * 0.01, y - s * 0.3, px + s * 0.03, y - s * 0.06); ctx.stroke();
      }
      ctx.restore();
      // cut top with growth rings
      ctx.beginPath(); ctx.ellipse(x, y - s * 0.735, s * 0.28, s * 0.075, 0, 0, TAU);
      const tg = ctx.createRadialGradient(x - s * 0.05, y - s * 0.75, 2, x, y - s * 0.735, s * 0.28);
      tg.addColorStop(0, '#f2d0a0'); tg.addColorStop(1, '#c8965a');
      ctx.fillStyle = tg; ctx.fill();
      ctx.strokeStyle = 'rgba(120,70,30,0.5)'; ctx.lineWidth = 1.5;
      for (const r of [0.2, 0.13, 0.06]) { ctx.beginPath(); ctx.ellipse(x + s * 0.01, y - s * 0.735, s * r, s * r * 0.26, 0, 0, TAU); ctx.stroke(); }
      // mossy crown + a sprout
      for (let i = 0; i < 6; i++) circle(ctx, x - s * 0.24 + i * s * 0.07, y - s * 0.71 + Math.sin(i * 1.7) * s * 0.01, s * 0.045, i % 2 ? '#7fd05a' : '#5fb84a');
      leaf(ctx, x + s * 0.1, y - s * 0.76, s * 0.14, s * 0.045, -1.2, '#6fcf5a', s);
      // shelf fungi on the side
      for (const [fy, fw] of [[-0.42, 0.11], [-0.32, 0.08]]) {
        ctx.beginPath(); ctx.ellipse(x + s * 0.3, y + fy * s, s * fw, s * 0.035, 0.15, Math.PI, 0); ctx.closePath();
        ctx.fillStyle = shadeFill(ctx, x + s * 0.3, y + fy * s, s * fw, '#e8c27a'); ctx.fill();
      }
      if (o.armor) { ctx.strokeStyle = 'rgba(120,230,120,0.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(x, y - s * 0.4, s * 0.38, s * 0.42, 0, 0, TAU); ctx.stroke(); }
      if (dmg < 0.66) { ctx.strokeStyle = '#2d1606'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + s * 0.12, y - s * 0.72); ctx.lineTo(x + s * 0.02, y - s * 0.55); ctx.lineTo(x + s * 0.1, y - s * 0.42); ctx.stroke(); }
      if (dmg < 0.33) { ctx.beginPath(); ctx.moveTo(x - s * 0.28, y - s * 0.3); ctx.lineTo(x - s * 0.12, y - s * 0.24); ctx.lineTo(x - s * 0.18, y - s * 0.1); ctx.stroke(); }
      // carved, sleepy face
      eyes(ctx, x - s * 0.01, y - s * 0.47, s * 0.095, s * 0.06, 0.4, blink || dmg < 0.33, dmg < 0.5 ? 'angry' : 'happy');
      ctx.strokeStyle = '#3a1e0a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y - s * 0.3 + (dmg < 0.5 ? s * 0.06 : 0), s * 0.065, dmg < 0.5 ? Math.PI * 1.15 : 0.2, dmg < 0.5 ? Math.PI * 1.85 : Math.PI - 0.2);
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
      // a drooping frost-blue bell with curled petal tips, glowing inside, with a snowflake clapper
      stem(ctx, x, y - s * 0.06, x - s * 0.16, y - s * 0.5, x + s * 0.02, y - s * 0.8 + bob, s * 0.045, '#3f8f6a');
      leaf(ctx, x - s * 0.04, y - s * 0.22, s * 0.24, s * 0.075, Math.PI + 0.3 + sway, '#5fb890', s);
      leaf(ctx, x + s * 0.02, y - s * 0.34, s * 0.2, s * 0.065, -0.4 - sway, '#5fb890', s);
      const bx = x + s * 0.06, by = y - s * 0.62 + bob;
      // inner glow
      const ig = ctx.createRadialGradient(bx, by + s * 0.16, 2, bx, by + s * 0.16, s * 0.26);
      ig.addColorStop(0, 'rgba(220,250,255,0.9)'); ig.addColorStop(1, 'rgba(160,220,255,0)');
      ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(bx, by + s * 0.16, s * 0.26, 0, TAU); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.07, by - s * 0.16);
      ctx.bezierCurveTo(bx - s * 0.12, by - s * 0.02, bx - s * 0.17, by + s * 0.12, bx - s * 0.29 * sq, by + s * 0.2);
      ctx.quadraticCurveTo(bx - s * 0.22, by + s * 0.17, bx - s * 0.17, by + s * 0.21);
      ctx.quadraticCurveTo(bx - s * 0.08, by + s * 0.17, bx, by + s * 0.22);
      ctx.quadraticCurveTo(bx + s * 0.08, by + s * 0.17, bx + s * 0.17, by + s * 0.21);
      ctx.quadraticCurveTo(bx + s * 0.22, by + s * 0.17, bx + s * 0.29 * sq, by + s * 0.2);
      ctx.bezierCurveTo(bx + s * 0.17, by + s * 0.12, bx + s * 0.12, by - s * 0.02, bx + s * 0.07, by - s * 0.16);
      ctx.closePath();
      const bg = ctx.createLinearGradient(bx - s * 0.25, by - s * 0.15, bx + s * 0.25, by + s * 0.22);
      bg.addColorStop(0, '#eafcff'); bg.addColorStop(0.45, '#9fe2ff'); bg.addColorStop(1, '#4fa8e0');
      ctx.fillStyle = bg; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = Math.max(1, s * 0.01);
      for (const dx of [-0.1, 0, 0.1]) { ctx.beginPath(); ctx.moveTo(bx + dx * s * 0.4, by - s * 0.12); ctx.quadraticCurveTo(bx + dx * s, by + s * 0.05, bx + dx * s * 1.6, by + s * 0.19); ctx.stroke(); }
      glossy(ctx, bx, by + s * 0.03, s * 0.16, s * 0.16);
      // snowflake clapper
      const cx = bx, cyy = by + s * 0.26;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1.5, s * 0.012);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI + t; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * s * 0.04, cyy + Math.sin(a) * s * 0.04); ctx.lineTo(cx - Math.cos(a) * s * 0.04, cyy - Math.sin(a) * s * 0.04); ctx.stroke(); }
      eyes(ctx, bx, by + s * 0.04, s * 0.058, s * 0.04, 0.5, blink, mood);
      smile(ctx, bx, by + s * 0.12, s * 0.025);
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
      // a honey-gold hive bud on a leafy collar: hexagon cells, a round door and dripping honey
      stem(ctx, x, y - s * 0.06, x - s * 0.06, y - s * 0.22, x, y - s * 0.3, s * 0.05);
      for (const a of [Math.PI + 0.35, -0.35, Math.PI + 0.9, -0.9]) leaf(ctx, x, y - s * 0.3, s * 0.18, s * 0.06, a, '#5ab04a', s);
      const hx = x, hy = y - s * 0.5 + bob;
      ctx.beginPath();
      ctx.moveTo(hx, hy - s * 0.27);
      ctx.bezierCurveTo(hx + s * 0.2, hy - s * 0.27, hx + s * 0.25, hy + s * 0.05, hx + s * 0.17, hy + s * 0.2);
      ctx.quadraticCurveTo(hx, hy + s * 0.28, hx - s * 0.17, hy + s * 0.2);
      ctx.bezierCurveTo(hx - s * 0.25, hy + s * 0.05, hx - s * 0.2, hy - s * 0.27, hx, hy - s * 0.27);
      ctx.closePath();
      ctx.fillStyle = shadeFill(ctx, hx, hy, s * 0.24, '#ffb84a'); ctx.fill();
      ctx.save(); ctx.clip();
      ctx.strokeStyle = 'rgba(160,90,20,0.45)'; ctx.lineWidth = Math.max(1, s * 0.01);
      const hr = s * 0.045;
      for (let row = -4; row <= 4; row++) for (let col = -4; col <= 4; col++) {
        const cx = hx + col * hr * 1.75 + (row % 2 ? hr * 0.87 : 0), cy = hy + row * hr * 1.5;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; ctx.lineTo(cx + Math.cos(a) * hr, cy + Math.sin(a) * hr); }
        ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
      glossy(ctx, hx, hy, s * 0.2, s * 0.24);
      // honey drips
      for (const [dx, k] of [[-0.12, 0.3], [0.09, 0.7]]) {
        const dr = ((t * 0.4 + k) % 1);
        ctx.fillStyle = 'rgba(255,190,40,0.95)';
        ctx.beginPath(); ctx.ellipse(hx + dx * s, hy + s * 0.2 + dr * s * 0.06, s * 0.022, s * 0.03 + dr * s * 0.02, 0, 0, TAU); ctx.fill();
      }
      // round door + face
      ctx.beginPath(); ctx.ellipse(hx, hy + s * 0.1, s * 0.055, s * 0.045, 0, 0, TAU); ctx.fillStyle = '#4a2a0a'; ctx.fill();
      eyes(ctx, hx, hy - s * 0.07, s * 0.07, s * 0.045, 0.4, blink, mood);
      cheeks(ctx, hx, hy + s * 0.02, s * 0.12, s * 0.022);
      for (let i = 0; i < 2; i++) {
        const a = t * 4 + i * Math.PI;
        drawBee(ctx, x + Math.cos(a) * s * 0.32, y - s * 0.62 + Math.sin(a * 1.4) * s * 0.1, s * 0.45, t);
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
      // a thorny bramble wreath with berries; a tiny sprout peeks out of the middle
      const cx = x, cy = y - s * 0.1;
      ctx.fillStyle = 'rgba(40,25,10,0.35)';
      ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.02, s * 0.42, s * 0.12, 0, 0, TAU); ctx.fill();
      for (let ring = 0; ring < 2; ring++) {
        ctx.strokeStyle = ring ? '#7a4a2a' : '#5a3418'; ctx.lineWidth = s * (ring ? 0.035 : 0.05);
        ctx.beginPath();
        for (let i = 0; i <= 40; i++) {
          const a = (i / 40) * TAU;
          const rr = 1 + Math.sin(a * 5 + ring * 2) * 0.08;
          const px = cx + Math.cos(a) * s * 0.36 * rr, py = cy + Math.sin(a) * s * 0.1 * rr;
          if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.stroke();
      }
      // thorns
      ctx.fillStyle = '#f4e8c8'; ctx.strokeStyle = '#4a2a10'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU;
        const px = cx + Math.cos(a) * s * 0.37, py = cy + Math.sin(a) * s * 0.105;
        const up = Math.abs(Math.sin(t * 3 + i)) * s * 0.01;
        ctx.beginPath(); ctx.moveTo(px - s * 0.018, py); ctx.lineTo(px, py - s * 0.065 - up); ctx.lineTo(px + s * 0.018, py); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      // berries + leaves on the wreath
      for (const [a, c] of [[0.5, '#d0304a'], [2.2, '#d0304a'], [3.8, '#7a3ab0'], [5.2, '#d0304a']]) blob(ctx, cx + Math.cos(a) * s * 0.34, cy + Math.sin(a) * s * 0.1, s * 0.032, s * 0.03, c, s * 0.5);
      for (const a of [1.2, 3.0, 4.6]) leaf(ctx, cx + Math.cos(a) * s * 0.34, cy + Math.sin(a) * s * 0.1, s * 0.1, s * 0.035, a - 1.2, '#5ab04a', s);
      // little sprout guard in the middle
      stem(ctx, cx, cy, cx - s * 0.02, cy - s * 0.08, cx, cy - s * 0.14 + bob, s * 0.025);
      blob(ctx, cx, cy - s * 0.17 + bob, s * 0.065, s * 0.06, '#8fe06a', s * 0.6);
      eyes(ctx, cx, cy - s * 0.175 + bob, s * 0.026, s * 0.018, 0.5, blink, 'angry');
      break;
    }
    case 'twinbud': {
      // a closed tulip-like bud with two curling vine nozzles that aim up and down the field
      const aim = o.fire || 0;
      stem(ctx, x, y - s * 0.06, x + s * 0.04, y - s * 0.22, x, y - s * 0.32, s * 0.05);
      for (const sg of [-1, 1]) {
        ctx.save();
        ctx.translate(x + s * 0.06, y - s * 0.34);
        ctx.rotate(sg * (0.75 - aim * 0.15));
        stem(ctx, 0, 0, s * 0.12, -sg * s * 0.1, s * 0.26, 0, s * 0.032, '#4f9e3d');
        blob(ctx, s * 0.28, 0, s * 0.055, s * 0.045, '#7fd05a', s * 0.7);
        circle(ctx, s * 0.32, 0, s * 0.018, '#2a4a1a');
        ctx.restore();
      }
      const bx = x, by = y - s * 0.52 + bob;
      ctx.beginPath();
      ctx.moveTo(bx, by + s * 0.2);
      ctx.bezierCurveTo(bx - s * 0.24, by + s * 0.18, bx - s * 0.22, by - s * 0.12, bx - s * 0.12, by - s * 0.2);
      ctx.lineTo(bx - s * 0.06, by - s * 0.1); ctx.lineTo(bx, by - s * 0.24); ctx.lineTo(bx + s * 0.06, by - s * 0.1); ctx.lineTo(bx + s * 0.12, by - s * 0.2);
      ctx.bezierCurveTo(bx + s * 0.22, by - s * 0.12, bx + s * 0.24, by + s * 0.18, bx, by + s * 0.2);
      ctx.closePath();
      ctx.fillStyle = shadeFill(ctx, bx, by, s * 0.22, '#ff6fa8'); ctx.fill();
      lineColor = inkFor('#ff6fa8'); outline(ctx, s); lineColor = null;
      ctx.strokeStyle = tint('#ff6fa8', -0.3); ctx.lineWidth = Math.max(1, s * 0.01);
      ctx.beginPath(); ctx.moveTo(bx, by - s * 0.2); ctx.lineTo(bx, by + s * 0.18); ctx.stroke();
      glossy(ctx, bx, by, s * 0.18, s * 0.18);
      leaf(ctx, bx - s * 0.02, by + s * 0.18, s * 0.16, s * 0.05, Math.PI + 0.6, '#5ab04a', s);
      leaf(ctx, bx + s * 0.02, by + s * 0.18, s * 0.16, s * 0.05, -0.6, '#5ab04a', s);
      eyes(ctx, bx, by + s * 0.02, s * 0.065, s * 0.04, 0.5, blink, mood);
      smile(ctx, bx, by + s * 0.12, s * 0.03, aim);
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
  const img = sprite('rotlings', e.k);
  if (img && !e.burrowed) {
    const d = e.def;
    const scale = d.boss ? 1.55 : d.big ? 1.25 : d.small ? 0.62 : 1;
    const walk = e.eating ? Math.sin(t * 14) * 0.05 : Math.sin(t * 8 + e.seed) * 0.04;
    shadow(ctx, e.x, e.y - s * 0.04, s * 0.3 * scale);
    ctx.save();
    if (e.dying !== undefined) ctx.globalAlpha = Math.max(0, e.dying);
    ctx.translate(e.x, e.y + (d.flying ? -s * 0.38 : 0));
    ctx.rotate(walk);
    drawSprite(ctx, img, 0, 0, s * 0.85 * scale);
    ctx.restore();
    return;
  }
  // Original "Rotling" design: an upright, lumpy rot-gourd creature with one huge eye, crooked teeth,
  // stubby legs, noodle arms and moss + tiny toadstools sprouting from its head.
  const d = e.def;
  const x = e.x, y = e.y;
  const scale = d.boss ? 1.55 : d.big ? 1.25 : d.small ? 0.62 : 1;
  const r = s * 0.33 * scale;
  const walk = e.eating ? 0 : t * (d.speed > 30 ? 13 : 8) + e.seed;
  const chew = e.eating ? Math.abs(Math.sin(t * 14 + e.seed)) : 0.15;
  ctx.save();
  if (e.dying !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, e.dying));
  if (e.burrowed) {
    ctx.fillStyle = '#5a3d22';
    ctx.beginPath(); ctx.ellipse(x, y - 4, s * 0.28 * scale, s * 0.09, 0, 0, TAU); ctx.fill();
    for (let i = 0; i < 5; i++) blob(ctx, x - s * 0.2 + i * s * 0.1, y - 9 - Math.abs(Math.sin(t * 8 + i)) * 7, 5, 4, '#8a6040', s * 0.4);
    ctx.restore();
    return;
  }
  if (d.crab) { drawRotCrab(ctx, e, s, t, x, y, r, walk, chew); ctx.restore(); return; }
  const flyY = d.flying ? -s * 0.38 + Math.sin(t * 4 + e.seed) * 7 : 0;
  const hop = e.confused > 0 ? Math.abs(Math.sin(t * 10)) * 7 : 0;
  shadow(ctx, x, y - s * 0.04, r * (d.flying ? 0.7 : 1.25));
  const base = y + flyY - hop;              // feet level
  const bodyB = base - r * 0.35;            // bottom of body
  const bodyT = base - r * 2.35;            // top of head
  const cx = x + Math.sin(walk) * r * 0.05; // body sways
  let body = d.color;
  if (e.slow > 0) body = '#8fb7e0';
  const ink = inkFor(body);

  // ---- wings (Blightmoth) ----
  if (d.flying) {
    const flap = Math.sin(t * 22 + e.seed);
    for (const sg of [1, -1]) {
      ctx.save();
      ctx.translate(cx + sg * r * 0.25, bodyT + r * 0.9);
      ctx.rotate(sg * (0.5 + flap * 0.35));
      ctx.beginPath(); ctx.ellipse(sg * r * 0.7, -r * 0.2, r * 0.95, r * 0.5, 0, 0, TAU);
      const wg = ctx.createRadialGradient(sg * r * 0.5, -r * 0.3, 2, sg * r * 0.7, -r * 0.2, r);
      wg.addColorStop(0, 'rgba(240,230,255,0.95)'); wg.addColorStop(1, 'rgba(160,140,220,0.75)');
      ctx.fillStyle = wg; ctx.fill();
      lineColor = '#4a3a7a'; outline(ctx, s, 0.018); lineColor = null;
      circle(ctx, sg * r * 0.85, -r * 0.25, r * 0.16, 'rgba(120,60,160,0.6)');
      ctx.restore();
    }
  }
  // ---- legs (walk cycle) ----
  if (!d.flying && d.boss !== 'dive') {
    for (const sg of [-1, 1]) {
      const ph = Math.sin(walk + (sg > 0 ? Math.PI : 0));
      const lx = cx + sg * r * 0.38, ly = bodyB;
      const fx = lx + ph * r * 0.22, fy = base - Math.max(0, -ph) * r * 0.12;
      ctx.lineCap = 'round';
      ctx.strokeStyle = tint(body, -0.55); ctx.lineWidth = r * 0.32;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(fx, fy - r * 0.08); ctx.stroke();
      ctx.strokeStyle = tint(body, -0.3); ctx.lineWidth = r * 0.22;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(fx, fy - r * 0.08); ctx.stroke();
      blob(ctx, fx - r * 0.06, fy - r * 0.05, r * 0.24, r * 0.12, '#4a3428', s * 0.6);
    }
  }
  // ---- back pieces ----
  if (d.boss === 'fire' || e.k === 'emberbeast') {
    const n = d.boss ? 6 : 4;
    for (let i = 0; i < n; i++) {
      const fx = cx - r * 0.7 + (i / (n - 1)) * r * 1.4, fl = Math.sin(t * 10 + i) * r * 0.12;
      ctx.beginPath(); ctx.moveTo(fx - r * 0.18, bodyT + r * 0.45); ctx.quadraticCurveTo(fx, bodyT - r * 0.55 + fl, fx + r * 0.18, bodyT + r * 0.45);
      const fg = ctx.createLinearGradient(0, bodyT - r * 0.5, 0, bodyT + r * 0.4);
      fg.addColorStop(0, '#fff1a0'); fg.addColorStop(0.5, '#ffb43a'); fg.addColorStop(1, '#ff5a1a');
      ctx.fillStyle = fg; ctx.fill();
    }
  }
  if (d.boss === 'dive') {
    for (let i = 3; i >= 1; i--) blob(ctx, cx + r * 0.62 * i, base - r * 0.55, r * 0.55, r * 0.45, tint(body, -0.08 * i), s);
  }
  // ---- body: a lumpy gourd ----
  const w = r * 1.0;
  ctx.beginPath();
  ctx.moveTo(cx, bodyT);
  ctx.bezierCurveTo(cx + w * 0.75, bodyT - r * 0.02, cx + w * 1.15, bodyT + r * 1.1, cx + w * 1.0, bodyB - r * 0.35);
  ctx.bezierCurveTo(cx + w * 0.95, bodyB + r * 0.05, cx + w * 0.4, bodyB + r * 0.12, cx, bodyB + r * 0.1);
  ctx.bezierCurveTo(cx - w * 0.4, bodyB + r * 0.12, cx - w * 0.95, bodyB + r * 0.05, cx - w * 1.0, bodyB - r * 0.35);
  ctx.bezierCurveTo(cx - w * 1.15, bodyT + r * 1.1, cx - w * 0.75, bodyT - r * 0.02, cx, bodyT);
  ctx.closePath();
  const midY = (bodyT + bodyB) / 2;
  ctx.fillStyle = shadeFill(ctx, cx, midY, r * 1.2, body);
  ctx.fill();
  ctx.save(); ctx.clip();
  // belly patch + rot blotches + cracks
  ctx.fillStyle = tint(body, 0.25);
  ctx.globalAlpha = 0.45;
  ctx.beginPath(); ctx.ellipse(cx - r * 0.15, bodyB - r * 0.55, r * 0.6, r * 0.45, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
  for (const [dx, dy, rr] of [[0.45, -1.5, 0.16], [0.65, -0.9, 0.12], [-0.6, -1.7, 0.1], [0.2, -0.5, 0.08]]) circle(ctx, cx + dx * r, bodyB + dy * r, rr * r, tint(body, -0.25));
  ctx.strokeStyle = tint(body, -0.45); ctx.lineWidth = Math.max(1, r * 0.04);
  ctx.beginPath(); ctx.moveTo(cx + r * 0.75, bodyT + r * 0.8); ctx.lineTo(cx + r * 0.55, bodyT + r * 1.05); ctx.lineTo(cx + r * 0.7, bodyT + r * 1.3); ctx.stroke();
  // drips of goo at the bottom
  ctx.fillStyle = tint(body, -0.4);
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(cx + (i - 1) * r * 0.5, bodyB - r * 0.05, r * 0.08, r * 0.16 + Math.sin(t * 3 + i + e.seed) * r * 0.04, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
  lineColor = ink; outline(ctx, s, d.boss ? 0.042 : 0.032); lineColor = null;
  glossy(ctx, cx, midY, r * 0.95, r * 1.0);

  // ---- head growths: moss + tiny toadstools ----
  ctx.fillStyle = '#6a8a4a';
  for (let i = 0; i < 5; i++) circle(ctx, cx - r * 0.45 + i * r * 0.22, bodyT + r * 0.12 + Math.sin(i * 2) * r * 0.04, r * 0.15, i % 2 ? '#7a9a52' : '#5f7d40');
  if (!d.boss && e.k !== 'crystalback' && e.k !== 'frostcrawler' && e.k !== 'rotpriest') {
    for (const [dx, h, cc] of [[0.25, 0.42, '#d9584a'], [-0.18, 0.3, '#e8c27a']]) {
      const mx = cx + dx * r, my = bodyT + r * 0.12;
      ctx.fillStyle = '#f0e6d0'; ctx.fillRect(mx - r * 0.04, my - h * r, r * 0.08, h * r);
      ctx.beginPath(); ctx.ellipse(mx, my - h * r, r * 0.18, r * 0.11, 0, Math.PI, 0); ctx.closePath();
      ctx.fillStyle = cc; ctx.fill(); lineColor = inkFor(cc); outline(ctx, s, 0.012); lineColor = null;
      circle(ctx, mx - r * 0.06, my - h * r - r * 0.05, r * 0.03, '#fff');
    }
  }

  // ---- kind-specific gear ----
  const k = e.k;
  if (e.shell > 0) {
    ctx.beginPath();
    ctx.ellipse(cx + r * 0.35, midY - r * 0.1, r * 0.95, r * 1.05, 0.15, -Math.PI * 0.55, Math.PI * 0.6);
    ctx.closePath();
    ctx.fillStyle = shadeFill(ctx, cx + r * 0.4, midY - r * 0.4, r, '#8f9c6c'); ctx.fill();
    lineColor = '#3d4628'; outline(ctx, s, 0.035); lineColor = null;
    ctx.strokeStyle = '#5d6a3a'; ctx.lineWidth = r * 0.06;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx + r * 0.35, midY - r * 0.1, r * (0.35 + i * 0.25), -1.2, 1.1); ctx.stroke(); }
    if (e.shell < d.shell * 0.5) { ctx.strokeStyle = '#1e2410'; ctx.lineWidth = r * 0.05; ctx.beginPath(); ctx.moveTo(cx + r * 1.0, midY - r * 0.6); ctx.lineTo(cx + r * 0.7, midY - r * 0.3); ctx.lineTo(cx + r * 0.9, midY); ctx.stroke(); }
    glossy(ctx, cx + r * 0.45, midY - r * 0.2, r * 0.8, r * 0.9);
  }
  if (k === 'spitter') blob(ctx, cx - r * 0.55, bodyB - r * 0.7, r * 0.36 * (1 + (e.spitCharge || 0) * 0.45), r * 0.3 * (1 + (e.spitCharge || 0) * 0.45), '#b7e06a', s);
  if (k === 'frostcrawler' || d.boss === 'freeze') {
    const n = d.boss ? 6 : 4;
    for (let i = 0; i < n; i++) {
      const fx = cx - r * 0.6 + (i / (n - 1)) * r * 1.2, h = r * (0.45 + (i % 2) * 0.3);
      ctx.beginPath(); ctx.moveTo(fx - r * 0.12, bodyT + r * 0.25); ctx.lineTo(fx, bodyT - h + r * 0.2); ctx.lineTo(fx + r * 0.12, bodyT + r * 0.25); ctx.closePath();
      ctx.fillStyle = shadeFill(ctx, fx, bodyT, h, '#d8f6ff'); ctx.fill(); lineColor = '#3a6a8a'; outline(ctx, s, 0.015); lineColor = null;
    }
  }
  if (k === 'crystalback') {
    for (let i = 0; i < 4; i++) {
      const fx = cx - r * 0.55 + i * r * 0.38, h = r * (0.7 + (i % 2) * 0.35);
      ctx.beginPath(); ctx.moveTo(fx - r * 0.16, bodyT + r * 0.35); ctx.lineTo(fx - r * 0.1, bodyT - h + r * 0.4); ctx.lineTo(fx, bodyT - h + r * 0.2); ctx.lineTo(fx + r * 0.1, bodyT - h + r * 0.4); ctx.lineTo(fx + r * 0.16, bodyT + r * 0.35); ctx.closePath();
      ctx.fillStyle = shadeFill(ctx, fx, bodyT - h * 0.4, h, i % 2 ? '#b9c8ff' : '#d6a8ff'); ctx.fill(); lineColor = '#4a3a8a'; outline(ctx, s, 0.016); lineColor = null;
    }
  }
  if (k === 'rotpriest') {
    ctx.beginPath(); ctx.moveTo(cx - r * 1.1, bodyB - r * 0.6); ctx.quadraticCurveTo(cx - r * 0.2, bodyT - r * 0.9, cx + r * 1.1, bodyB - r * 0.6); ctx.quadraticCurveTo(cx, bodyT + r * 0.7, cx - r * 1.1, bodyB - r * 0.6);
    ctx.fillStyle = shadeFill(ctx, cx, bodyT, r * 1.2, '#4a2f5c'); ctx.fill(); lineColor = '#1e1028'; outline(ctx, s, 0.025); lineColor = null;
    ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = r * 0.12;
    ctx.beginPath(); ctx.moveTo(cx - r * 1.25, base); ctx.lineTo(cx - r * 1.25, bodyT - r * 0.5); ctx.stroke();
    const p = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.save(); ctx.shadowColor = '#a0ff78'; ctx.shadowBlur = 14 + p * 10;
    blob(ctx, cx - r * 1.25, bodyT - r * 0.65, r * 0.22, r * 0.22, '#a0ff78', s * 0.6);
    ctx.restore();
  }
  if (d.big) {
    for (let i = 0; i < 6; i++) blob(ctx, cx - r * 0.75 + i * r * 0.3, bodyT + r * 0.15 + (i % 2) * r * 0.08, r * 0.2, r * 0.17, i % 2 ? '#7f9a52' : '#6a8a44', s * 0.6);
    // stone fists
  }
  if (d.spawnOnDeath) for (let i = 0; i < 5; i++) blob(ctx, cx - r * 0.5 + i * r * 0.25, midY + Math.sin(i * 2.3) * r * 0.45, r * 0.1, r * 0.1, '#e3b6f0', s * 0.4);
  if (d.boss === 'summon' || d.boss === 'mud') for (let i = 0; i < 6; i++) blob(ctx, cx - r * 0.7 + i * r * 0.28, bodyB - r * 0.35, r * 0.15, r * 0.2, d.boss === 'mud' ? '#6a8a5a' : '#c9a3d8', s * 0.5);
  if (d.boss === 'monarch') {
    ctx.fillStyle = 'rgba(120,30,90,0.75)';
    ctx.beginPath(); ctx.moveTo(cx + r * 0.6, bodyT + r * 0.6); ctx.quadraticCurveTo(cx + r * 1.9, midY, cx + r * 1.3, base); ctx.lineTo(cx + r * 0.6, base); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.65, bodyT + r * 0.25);
    for (let i = 0; i < 5; i++) { ctx.lineTo(cx - r * 0.65 + i * r * 0.26 + r * 0.13, bodyT - r * (i % 2 ? 0.25 : 0.6)); ctx.lineTo(cx - r * 0.65 + (i + 1) * r * 0.26, bodyT + r * 0.1); }
    ctx.closePath();
    ctx.fillStyle = shadeFill(ctx, cx, bodyT, r * 0.7, '#e0b8ff'); ctx.fill(); lineColor = '#4a2a6a'; outline(ctx, s, 0.025); lineColor = null;
    const p = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.save(); ctx.shadowColor = '#ffe27a'; ctx.shadowBlur = 22 + p * 20;
    blob(ctx, cx + r * 0.25, midY + r * 0.35, r * 0.17, r * 0.2, '#ffe27a', s * 0.6);
    ctx.restore();
  }
  if (d.boss && d.boss !== 'monarch' && d.boss !== 'fire' && d.boss !== 'freeze') {
    for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sg * r * 0.35, bodyT + r * 0.2); ctx.quadraticCurveTo(cx + sg * r * 0.7, bodyT - r * 0.6, cx + sg * r * 0.95, bodyT - r * 0.45); ctx.lineTo(cx + sg * r * 0.55, bodyT + r * 0.3); ctx.fillStyle = '#e8dcc0'; ctx.fill(); lineColor = '#4a3a2a'; outline(ctx, s, 0.02); lineColor = null; }
  }

  // ---- face: big eye looking left, heavy brow, crooked toothy mouth ----
  const ex = cx - r * 0.3, ey = bodyT + r * 0.78;
  const er = r * 0.36;
  ctx.beginPath(); ctx.ellipse(ex, ey, er * 1.05, er, 0, 0, TAU);
  const eg = ctx.createRadialGradient(ex - er * 0.3, ey - er * 0.3, 1, ex, ey, er * 1.1);
  eg.addColorStop(0, '#fffbe6'); eg.addColorStop(0.8, '#f0e6b8'); eg.addColorStop(1, '#c8b88a');
  ctx.fillStyle = eg; ctx.fill();
  ctx.strokeStyle = 'rgba(40,20,20,0.35)'; ctx.lineWidth = Math.max(1, r * 0.03); ctx.stroke();
  // blood-shot veins
  ctx.strokeStyle = 'rgba(200,60,70,0.55)'; ctx.lineWidth = Math.max(1, r * 0.02);
  for (let i = 0; i < 3; i++) { const a = 0.4 + i * 0.5; ctx.beginPath(); ctx.moveTo(ex + Math.cos(a) * er, ey + Math.sin(a) * er); ctx.lineTo(ex + Math.cos(a) * er * 0.55, ey + Math.sin(a) * er * 0.55); ctx.stroke(); }
  const conf = e.confused > 0;
  const px = conf ? ex + Math.cos(t * 12) * er * 0.3 : ex - er * 0.32, py = conf ? ey + Math.sin(t * 12) * er * 0.3 : ey + er * 0.05;
  const iris = d.boss ? '#ff3b6b' : e.k === 'frostcrawler' ? '#3ab0ff' : e.k === 'emberbeast' ? '#ff9a1a' : '#d0384e';
  circle(ctx, px, py, er * 0.5, iris);
  circle(ctx, px, py, er * 0.25, '#14080c');
  circle(ctx, px - er * 0.15, py - er * 0.18, er * 0.13, '#fff');
  // brow + droopy lid
  ctx.fillStyle = tint(body, -0.3);
  ctx.beginPath(); ctx.moveTo(ex - er * 1.2, ey - er * 0.55); ctx.quadraticCurveTo(ex, ey - er * 1.25, ex + er * 1.15, ey - er * 0.85); ctx.lineTo(ex + er * 1.0, ey - er * 0.45); ctx.quadraticCurveTo(ex, ey - er * 0.5, ex - er * 1.2, ey - er * 0.2); ctx.closePath(); ctx.fill();

  // mouth
  const mx0 = cx - r * 0.78, my0 = bodyT + r * 1.42;
  const mw = r * 0.62, mh = r * (0.12 + chew * 0.32);
  ctx.beginPath(); ctx.moveTo(mx0, my0); ctx.quadraticCurveTo(mx0 + mw * 0.5, my0 + mh * 2.2, mx0 + mw, my0 - r * 0.04); ctx.quadraticCurveTo(mx0 + mw * 0.5, my0 + mh * 0.3, mx0, my0); ctx.closePath();
  ctx.fillStyle = '#3a1222'; ctx.fill();
  ctx.fillStyle = '#f6f0c8';
  for (let i = 0; i < 4; i++) {
    const tx = mx0 + mw * (0.15 + i * 0.22), ty = my0 + mh * 0.35 - Math.abs(i - 1.5) * r * 0.02;
    ctx.beginPath(); ctx.moveTo(tx - r * 0.05, ty - r * 0.02); ctx.lineTo(tx + (i % 2 ? 0.02 : -0.01) * r, ty + r * (0.1 + (i % 2) * 0.05)); ctx.lineTo(tx + r * 0.05, ty - r * 0.02); ctx.fill();
  }
  // drool
  const dr = (t * 0.7 + e.seed) % 1;
  ctx.fillStyle = 'rgba(190,230,140,0.85)';
  ctx.beginPath(); ctx.ellipse(mx0 + mw * 0.3, my0 + mh + dr * r * 0.4, r * 0.04, r * 0.06 + dr * r * 0.06, 0, 0, TAU); ctx.fill();

  // ---- arms (noodly, reaching toward the garden) ----
  if (d.boss !== 'dive') {
    for (const [sg, off] of [[1, 0], [-1, Math.PI]]) {
      const swing = e.eating ? Math.sin(t * 14 + off) * 0.6 : Math.sin(walk + off) * 0.35;
      const ax = cx + (sg > 0 ? -r * 0.85 : r * 0.7), ay = midY + r * 0.05;
      const hx = ax - r * (0.65 + (sg > 0 ? 0.15 : -0.35)) , hy = ay + r * 0.15 + swing * r * 0.4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = ink; ctx.lineWidth = r * 0.24;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + hx) / 2, ay - r * 0.25, hx, hy); ctx.stroke();
      ctx.strokeStyle = tint(body, -0.12); ctx.lineWidth = r * 0.15;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo((ax + hx) / 2, ay - r * 0.25, hx, hy); ctx.stroke();
      blob(ctx, hx, hy, r * 0.15, r * 0.13, tint(body, -0.05), s * 0.5);
      if (d.big || d.boss) for (let f = 0; f < 3; f++) { ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = Math.max(1.5, r * 0.04); ctx.beginPath(); ctx.moveTo(hx - r * 0.1, hy - r * 0.05 + f * r * 0.07); ctx.lineTo(hx - r * 0.24, hy - r * 0.08 + f * r * 0.09); ctx.stroke(); }
    }
  }

  // ---- shield held in front ----
  if (e.shield > 0) {
    ctx.save();
    ctx.translate(cx - r * 1.2, midY + r * 0.1);
    ctx.rotate(-0.08 + Math.sin(t * 3 + e.seed) * 0.05);
    ctx.beginPath(); ctx.ellipse(0, 0, r * 0.32, r * 1.05, 0, 0, TAU);
    ctx.fillStyle = shadeFill(ctx, 0, 0, r, e.shield < d.shield * 0.5 ? '#a8944a' : '#6f9a3a'); ctx.fill();
    lineColor = '#2a3a10'; outline(ctx, s, 0.035); lineColor = null;
    ctx.strokeStyle = 'rgba(30,50,10,0.45)'; ctx.lineWidth = Math.max(1.5, r * 0.04);
    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(0, i * r * 0.32); ctx.lineTo(-r * 0.25, i * r * 0.32 - r * 0.16); ctx.stroke(); }
    if (e.shield < d.shield * 0.5) { ctx.strokeStyle = '#3a2a10'; ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.4); ctx.lineTo(-r * 0.1, -r * 0.1); ctx.lineTo(r * 0.12, r * 0.15); ctx.stroke(); }
    glossy(ctx, 0, 0, r * 0.28, r * 0.9);
    ctx.restore();
  }
  // carried Wildseed
  if (e.carries) {
    ctx.save();
    const p = 0.5 + 0.5 * Math.sin(t * 5);
    ctx.shadowColor = '#8bff5a'; ctx.shadowBlur = 10 + p * 10;
    drawWildseed(ctx, cx + r * 0.55, bodyT - r * 0.25, r * 0.32, t);
    ctx.restore();
  }
  if (e.snared > 0) {
    ctx.strokeStyle = '#8a6d3b'; ctx.lineWidth = Math.max(3, r * 0.12);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - r * 0.9, base); ctx.quadraticCurveTo(cx, midY + r * (0.6 - i * 0.4), cx + r * 0.9, base); ctx.stroke(); }
  }
  if (e.confused > 0) for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; star(ctx, cx + Math.cos(a) * r * 0.7, bodyT - r * 0.25 + Math.sin(a) * r * 0.15, Math.max(4, r * 0.15), '#fff1a8'); }
  ctx.restore();
}

// Original "Rot Crab": a wide mossy shell, six scuttling legs, one oversized claw, one big stalk eye.
function drawRotCrab(ctx, e, s, t, x, y, r, walk, chew) {
  const body = e.slow > 0 ? '#8fb7e0' : e.def.color;
  const ink = inkFor(body);
  const sc = Math.sin(walk * 1.4) * r * 0.06;
  shadow(ctx, x, y - s * 0.04, r * 1.5);
  const cy = y - r * 0.75 + sc * 0.3;
  // legs
  for (let i = 0; i < 3; i++) for (const sg of [-1, 1]) {
    const ph = Math.sin(walk * 1.4 + i * 2 + (sg > 0 ? 1 : 0));
    const lx = x + sg * r * (0.5 + i * 0.25), ly = cy + r * 0.2;
    const kx = lx + sg * r * 0.45, ky = ly - r * 0.15 + ph * r * 0.08;
    const fx = kx + sg * r * 0.15 + ph * r * 0.1, fy = y - r * 0.05;
    ctx.lineCap = 'round';
    ctx.strokeStyle = ink; ctx.lineWidth = r * 0.17;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.strokeStyle = tint(body, -0.1); ctx.lineWidth = r * 0.1;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
  }
  // small back claw
  blob(ctx, x + r * 0.95, cy - r * 0.35, r * 0.2, r * 0.15, body, s * 0.6);
  // shell
  ctx.beginPath();
  ctx.moveTo(x - r * 1.2, cy + r * 0.25);
  ctx.bezierCurveTo(x - r * 1.25, cy - r * 0.95, x + r * 1.25, cy - r * 0.95, x + r * 1.2, cy + r * 0.25);
  ctx.quadraticCurveTo(x, cy + r * 0.55, x - r * 1.2, cy + r * 0.25);
  ctx.closePath();
  ctx.fillStyle = shadeFill(ctx, x, cy - r * 0.2, r * 1.2, body); ctx.fill();
  ctx.save(); ctx.clip();
  for (const [dx, dy, rr] of [[-0.5, -0.3, 0.16], [0.3, -0.45, 0.12], [0.7, -0.05, 0.1], [-0.1, 0.05, 0.09]]) circle(ctx, x + dx * r, cy + dy * r, rr * r, tint(body, -0.22));
  ctx.restore();
  lineColor = ink; outline(ctx, s, 0.032); lineColor = null;
  glossy(ctx, x, cy - r * 0.25, r * 1.05, r * 0.6);
  // moss + toadstool on the shell
  for (let i = 0; i < 5; i++) circle(ctx, x - r * 0.4 + i * r * 0.2, cy - r * 0.68 + Math.sin(i * 2) * r * 0.04, r * 0.13, i % 2 ? '#7a9a52' : '#5f7d40');
  ctx.fillStyle = '#f0e6d0'; ctx.fillRect(x + r * 0.22, cy - r * 1.02, r * 0.07, r * 0.3);
  ctx.beginPath(); ctx.ellipse(x + r * 0.255, cy - r * 1.02, r * 0.16, r * 0.1, 0, Math.PI, 0); ctx.closePath();
  ctx.fillStyle = '#d9584a'; ctx.fill(); lineColor = inkFor('#d9584a'); outline(ctx, s, 0.012); lineColor = null;
  // stalk eye (looking toward the garden)
  const ex = x - r * 0.45, ey = cy - r * 1.05 + Math.sin(t * 3 + e.seed) * r * 0.05;
  ctx.strokeStyle = ink; ctx.lineWidth = r * 0.14;
  ctx.beginPath(); ctx.moveTo(x - r * 0.35, cy - r * 0.55); ctx.quadraticCurveTo(x - r * 0.5, cy - r * 0.8, ex, ey + r * 0.2); ctx.stroke();
  ctx.strokeStyle = tint(body, 0.1); ctx.lineWidth = r * 0.08;
  ctx.beginPath(); ctx.moveTo(x - r * 0.35, cy - r * 0.55); ctx.quadraticCurveTo(x - r * 0.5, cy - r * 0.8, ex, ey + r * 0.2); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(ex, ey, r * 0.3, r * 0.28, 0, 0, TAU);
  ctx.fillStyle = '#fffbe6'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.8, r * 0.06); ctx.stroke();
  const conf = e.confused > 0;
  const px = conf ? ex + Math.cos(t * 12) * r * 0.1 : ex - r * 0.1;
  circle(ctx, px, ey + r * 0.02, r * 0.14, '#d0384e');
  circle(ctx, px, ey + r * 0.02, r * 0.07, '#14080c');
  circle(ctx, px - r * 0.05, ey - r * 0.04, r * 0.04, '#fff');
  ctx.fillStyle = tint(body, -0.3);
  ctx.beginPath(); ctx.ellipse(ex, ey - r * 0.2, r * 0.32, r * 0.12, -0.2, Math.PI, 0); ctx.fill();
  // mouth
  ctx.fillStyle = '#2a0f1e';
  ctx.beginPath(); ctx.ellipse(x - r * 0.75, cy + r * 0.08, r * 0.2, r * (0.05 + chew * 0.12), 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f6f0c8';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x - r * 0.9 + i * r * 0.12, cy + r * 0.04); ctx.lineTo(x - r * 0.86 + i * r * 0.12, cy + r * 0.13); ctx.lineTo(x - r * 0.82 + i * r * 0.12, cy + r * 0.04); ctx.fill(); }
  // the big snapping claw
  const snap = e.eating ? Math.abs(Math.sin(t * 12)) : 0.3 + Math.sin(t * 2 + e.seed) * 0.15;
  const ax = x - r * 1.1, ay = cy - r * 0.05;
  ctx.strokeStyle = ink; ctx.lineWidth = r * 0.2;
  ctx.beginPath(); ctx.moveTo(x - r * 0.9, cy + r * 0.1); ctx.quadraticCurveTo(ax, ay + r * 0.2, ax - r * 0.25, ay - r * 0.2); ctx.stroke();
  ctx.save();
  ctx.translate(ax - r * 0.45, ay - r * 0.35);
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.42, r * 0.3, -0.4, 0, TAU);
  ctx.fillStyle = shadeFill(ctx, 0, 0, r * 0.42, body); ctx.fill(); lineColor = ink; outline(ctx, s, 0.03); lineColor = null;
  glossy(ctx, 0, 0, r * 0.38, r * 0.26, -0.4);
  ctx.rotate(-0.4 - snap * 0.5);
  ctx.beginPath(); ctx.moveTo(-r * 0.25, -r * 0.05); ctx.quadraticCurveTo(-r * 0.75, -r * 0.35, -r * 0.6, r * 0.05); ctx.quadraticCurveTo(-r * 0.45, -r * 0.05, -r * 0.25, r * 0.02); ctx.closePath();
  ctx.fillStyle = tint(body, 0.1); ctx.fill(); lineColor = ink; outline(ctx, s, 0.025); lineColor = null;
  ctx.restore();
  if (e.carries) { ctx.save(); ctx.shadowColor = '#8bff5a'; ctx.shadowBlur = 14; drawWildseed(ctx, x + r * 0.6, cy - r * 1.15, r * 0.3, t); ctx.restore(); }
  if (e.confused > 0) for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; star(ctx, x + Math.cos(a) * r * 0.7, cy - r * 1.3 + Math.sin(a) * r * 0.15, Math.max(4, r * 0.15), '#fff1a8'); }
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
    // painterly blotches (subtle)
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.03)';
      ctx.beginPath(); ctx.ellipse(x + rnd() * tw, y + rnd() * th, 8 + rnd() * 18, 5 + rnd() * 10, rnd() * 3, 0, TAU); ctx.fill();
    }
    // grass blades / texture strokes
    const blade = active ? tint(base, -0.16) : 'rgba(60,40,20,0.3)';
    ctx.strokeStyle = blade; ctx.lineWidth = 1.2;
    for (let i = 0; i < (active ? 9 : 6); i++) {
      const bx = x + rnd() * tw, by = y + 8 + rnd() * (th - 8), h = 4 + rnd() * 7;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx + 1, by - h * 0.6, bx + (rnd() - 0.5) * 5, by - h); ctx.stroke();
    }
    if (active) {
      ctx.strokeStyle = tint(base, 0.2); ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) { const bx = x + rnd() * tw, by = y + rnd() * th; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + 1, by - 5); ctx.stroke(); }
    }
    // soft tile edges

  }
  // mowed stripes + row hedge shadows
  for (let r = 0; r < rows; r++) {
    if (activeRows.includes(r)) {
      ctx.fillStyle = r % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.035)';
      ctx.fillRect(0, r * th, cols * tw, th);

    }
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(0, r * th + th - 5, cols * tw, 5);
  }
  return c;
}

export function drawClouds(ctx, W, top, t, color = 'rgba(255,255,255,0.8)') {
  for (let i = 0; i < 5; i++) {
    const x = ((i * 310 + t * (8 + i * 3)) % (W + 300)) - 150, y = top + (i % 3) * 22;
    ctx.fillStyle = color;
    for (const [dx, dy, r] of [[0, 0, 22], [24, -8, 26], [52, 0, 20], [30, 8, 22]]) { ctx.beginPath(); ctx.arc(x + dx, y + dy, r, 0, TAU); ctx.fill(); }
  }
}
