// Bloomguard art replacement system.
//
// Any character, portrait or world background listed in sprites/sprites.json is drawn from your own
// image files instead of the built-in code art. Anything not listed keeps the code art, so artwork
// can be added one piece at a time. The developer Art Studio (dev/art-studio.html, `npm run studio`)
// previews images live, normalises their size and writes the matching JSON. It is not part of the app.
//
// Manifest entry formats (per character):
//   "thornling": "thornling.png"                                  single image
//   "thornling": { "idle": ["t_idle1.png", "t_idle2.png"], "fps": 6,
//                  "attack": "t_attack.png", "hurt": "t_hurt.png",
//                  "scale": 1.0, "offsetX": 0, "offsetY": 0, "flip": false }
// Groups: guardians, rotlings, portraits (wren, moss), backgrounds (lawn per world id), ui.
export const GROUPS = ['guardians', 'rotlings', 'portraits', 'backgrounds', 'ui'];
const ENTRIES = Object.fromEntries(GROUPS.map((g) => [g, {}]));
const OVERRIDES = Object.fromEntries(GROUPS.map((g) => [g, {}]));
let ready = false;
let bypass = false;
// Force the built-in code art (used by the Art Studio to show both side by side).
export function setBypass(v) { bypass = !!v; }

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

let BASE = '';
async function buildEntry(group, spec) {
  const o = typeof spec === 'string' ? { idle: spec } : { ...spec };
  const list = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
  const load = async (files) => (await Promise.all(list(files).map((f) => loadImage(`${BASE}sprites/${group}/${f}`)))).filter(Boolean);
  const idle = await load(o.idle || o.image);
  if (!idle.length) return null;
  return {
    idle,
    attack: (await load(o.attack))[0] || null,
    hurt: (await load(o.hurt))[0] || null,
    fps: o.fps || 6,
    scale: o.scale ?? 1,
    offsetX: o.offsetX || 0,
    offsetY: o.offsetY || 0,
    flip: !!o.flip,
  };
}

// `base` lets the developer Art Studio (dev/art-studio.html) load the game's sprites from ../www/.
export async function loadSprites(base = '') {
  BASE = base;
  try {
    const res = await fetch(`${BASE}sprites/sprites.json`, { cache: 'no-cache' });
    if (res.ok) {
      const manifest = await res.json();
      const jobs = [];
      for (const group of GROUPS) {
        for (const [key, spec] of Object.entries(manifest[group] || {})) {
          if (key.startsWith('_')) continue;
          jobs.push(buildEntry(group, spec).then((e) => { if (e) ENTRIES[group][key] = e; }));
        }
      }
      await Promise.all(jobs);
    }
  } catch (e) { /* no manifest: code art only */ }
  ready = true;
}

// Live override used by the Art Studio preview (not saved to disk).
export function setOverride(group, key, entry) {
  if (entry) OVERRIDES[group][key] = entry; else delete OVERRIDES[group][key];
}
export function entryFor(group, key) { return bypass ? null : OVERRIDES[group][key] || ENTRIES[group][key] || null; }
export function sprite(group, key) { const e = entryFor(group, key); return e ? e.idle[0] : null; }
export function spritesReady() { return ready; }
export function listLoaded() {
  const out = {};
  for (const g of GROUPS) out[g] = Object.keys({ ...ENTRIES[g], ...OVERRIDES[g] });
  return out;
}

// Pick the right frame for the moment: attack/hurt poses override the idle loop.
export function frameFor(entry, t, { attacking = false, hurt = false } = {}) {
  if (hurt && entry.hurt) return entry.hurt;
  if (attacking && entry.attack) return entry.attack;
  return entry.idle[Math.floor(t * entry.fps) % entry.idle.length];
}

// Draws an image anchored at bottom-centre (x, y), fitted to `height` px tall, with the entry's tuning.
export function drawEntry(ctx, entry, img, x, y, height, { flip = false, alpha = 1, sx = 1, sy = 1, rot = 0 } = {}) {
  const h = height * entry.scale;
  const k = h / img.height;
  const w = img.width * k;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x + entry.offsetX * height, y + entry.offsetY * height);
  ctx.rotate(rot);
  ctx.scale((flip !== entry.flip ? -1 : 1) * sx, sy);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
}

// Backwards-compatible helper for simple images.
export function drawSprite(ctx, img, x, y, height, opts = {}) {
  drawEntry(ctx, { scale: 1, offsetX: 0, offsetY: 0, flip: false }, img, x, y, height, opts);
}
