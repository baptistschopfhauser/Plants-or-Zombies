// Optional painted artwork. Anything listed in sprites/sprites.json replaces the code-drawn art;
// everything else keeps using the built-in procedural drawings.
const IMAGES = { guardians: {}, rotlings: {}, ui: {} };
let ready = false;

export async function loadSprites() {
  try {
    const res = await fetch('sprites/sprites.json', { cache: 'no-cache' });
    if (!res.ok) return;
    const manifest = await res.json();
    const jobs = [];
    for (const group of ['guardians', 'rotlings', 'ui']) {
      for (const [key, file] of Object.entries(manifest[group] || {})) {
        jobs.push(new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { IMAGES[group][key] = img; resolve(); };
          img.onerror = () => resolve();
          img.src = `sprites/${group}/${file}`;
        }));
      }
    }
    await Promise.all(jobs);
  } catch (e) { /* no sprites: code art only */ }
  ready = true;
}

export function sprite(group, key) { return IMAGES[group][key] || null; }
export function spritesReady() { return ready; }

// Draws an image anchored at bottom-centre (x, y), fitted to `height` px tall.
export function drawSprite(ctx, img, x, y, height, { flip = false, alpha = 1 } = {}) {
  const k = height / img.height;
  const w = img.width * k;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -height, w, height);
  ctx.restore();
}
