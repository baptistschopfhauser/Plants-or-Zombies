// Bloomguard Art Studio — a developer tool (not shipped in the app).
// Run `npm run studio` and open the printed URL. It reuses the game's own drawing code to show the
// built-in art next to your artwork at real in-game size, normalises your images to the standard
// size and anchor, and writes the sprites.json entry.
import { GUARDIANS, ROTLINGS, WORLDS } from '../www/js/data.js';
import { drawGuardian, drawRotling, drawPortrait } from '../www/js/art.js';
import { loadSprites, setOverride, setBypass, entryFor } from '../www/js/sprites.js';

const $ = (id) => document.getElementById(id);
const CHAR_H = 512;                    // standard character sprite height
const LAWN_W = 1008, LAWN_H = 590;     // 9 × 5 tiles of 112 × 118 px
const lists = {
  guardians: Object.keys(GUARDIANS),
  rotlings: Object.keys(ROTLINGS),
  portraits: ['wren', 'moss'],
  backgrounds: WORLDS.map((w) => w.id),
};
const label = (g, k) => (GUARDIANS[k] ? GUARDIANS[k].name : ROTLINGS[k] ? ROTLINGS[k].name : g === 'backgrounds' ? WORLDS.find((w) => w.id === k).name : k[0].toUpperCase() + k.slice(1));

let group = 'guardians';
let key = lists.guardians[0];
const tuning = { scale: 1, offsetX: 0, offsetY: 0, fps: 6, flip: false };
let src = { idle: [], attack: null };   // raw images the developer picked
let norm = null;                        // normalised canvases, ready for export

// ---------- image helpers ----------
const readImg = (file) => new Promise((res) => {
  const img = new Image();
  img.onload = () => res({ img, name: file.name });
  img.onerror = () => res(null);
  img.src = URL.createObjectURL(file);
});
function opaqueBox(img) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (d[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  return x1 < 0 ? { x0: 0, y0: 0, x1: img.width - 1, y1: img.height - 1 } : { x0, y0, x1, y1 };
}
// One shared crop for every frame (so animations don't jitter), scaled to CHAR_H, feet on the bottom edge.
function normaliseCharacters(images) {
  const boxes = images.map(opaqueBox);
  const box = boxes.reduce((a, b) => ({ x0: Math.min(a.x0, b.x0), y0: Math.min(a.y0, b.y0), x1: Math.max(a.x1, b.x1), y1: Math.max(a.y1, b.y1) }));
  const cw = box.x1 - box.x0 + 1, ch = box.y1 - box.y0 + 1;
  const k = (CHAR_H - 8) / ch;
  const outW = Math.max(64, Math.ceil(cw * k) + 16);
  return images.map((img) => {
    const c = document.createElement('canvas');
    c.width = outW; c.height = CHAR_H;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, box.x0, box.y0, cw, ch, (outW - cw * k) / 2, CHAR_H - ch * k, cw * k, ch * k);
    return c;
  });
}
function normaliseLawn(img) {
  const c = document.createElement('canvas');
  c.width = LAWN_W; c.height = LAWN_H;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, LAWN_W, LAWN_H);
  return c;
}
const download = (canvas, name) => { const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = name; a.click(); };

// ---------- state → preview + JSON ----------
function fileNames() {
  if (group === 'backgrounds') return { idle: [`${key}-lawn.png`] };
  const idle = src.idle.length > 1 ? src.idle.map((_, i) => `${key}_idle${i + 1}.png`) : [`${key}.png`];
  return { idle, attack: src.attack ? `${key}_attack.png` : null };
}
function apply() {
  if (!src.idle.length) {
    norm = null;
    setOverride(group, key, null);
    $('json').value = '';
    $('status').textContent = entryFor(group, key)
      ? 'This one already uses artwork from sprites.json (shown on the right).'
      : 'Using built-in code art. Drop a PNG on the preview or pick files below.';
  } else {
    if (group === 'backgrounds') norm = { idle: [normaliseLawn(src.idle[0].img)], attack: null };
    else {
      const all = normaliseCharacters([...src.idle.map((f) => f.img), ...(src.attack ? [src.attack.img] : [])]);
      norm = { idle: all.slice(0, src.idle.length), attack: src.attack ? all[all.length - 1] : null };
    }
    setOverride(group, key, { idle: norm.idle, attack: norm.attack, hurt: null, ...tuning });
    const n = fileNames();
    const spec = { idle: n.idle.length > 1 ? n.idle : n.idle[0] };
    if (n.attack) spec.attack = n.attack;
    for (const k of ['scale', 'offsetX', 'offsetY']) if (tuning[k] !== (k === 'scale' ? 1 : 0)) spec[k] = tuning[k];
    if (n.idle.length > 1) spec.fps = tuning.fps;
    if (tuning.flip) spec.flip = true;
    const simple = Object.keys(spec).length === 1 && typeof spec.idle === 'string';
    $('json').value = `"${key}": ${JSON.stringify(simple ? spec.idle : spec)}`;
    $('status').textContent = `Previewing your art, normalised to ${group === 'backgrounds' ? `${LAWN_W} × ${LAWN_H}` : `${CHAR_H} px tall`}. Export it, put the file(s) in www/sprites/${group}/, and paste the JSON line into the "${group}" section of sprites.json.`;
  }
  $('normBtn').disabled = !norm;
  $('copyBtn').disabled = !norm;
}
function select(g, k) {
  setOverride(group, key, null);
  group = g; key = k;
  src = { idle: [], attack: null };
  Object.assign(tuning, { scale: 1, offsetX: 0, offsetY: 0, fps: 6, flip: false });
  $('flip').checked = false;
  buildSliders();
  renderLists();
  apply();
}
function renderLists() {
  const tabs = $('tabs'); tabs.innerHTML = '';
  for (const [g, txt] of [['guardians', '🌱 Guardians'], ['rotlings', '🐛 Rotlings'], ['portraits', '🙂 Portraits'], ['backgrounds', '🖼 Lawns']]) {
    const b = document.createElement('button');
    b.textContent = txt; if (g === group) b.className = 'on';
    b.onclick = () => select(g, lists[g][0]);
    tabs.append(b);
  }
  const list = $('list'); list.innerHTML = '';
  for (const k of lists[group]) {
    const b = document.createElement('button');
    b.textContent = label(group, k) + (entryFor(group, k) ? ' ✓' : '');
    if (k === key) b.className = 'on';
    b.onclick = () => select(group, k);
    list.append(b);
  }
}
function buildSliders() {
  const box = $('sliders'); box.innerHTML = '';
  if (group === 'backgrounds') return;
  for (const [txt, k, min, max, step] of [['Scale', 'scale', 0.4, 2, 0.05], ['Move X', 'offsetX', -0.6, 0.6, 0.01], ['Move Y', 'offsetY', -0.6, 0.6, 0.01], ['Anim fps', 'fps', 1, 24, 1]]) {
    const lab = document.createElement('label'); lab.className = 'slider';
    const inp = Object.assign(document.createElement('input'), { type: 'range', min, max, step, value: tuning[k] });
    const out = document.createElement('span'); out.textContent = tuning[k];
    inp.oninput = () => { tuning[k] = parseFloat(inp.value); out.textContent = tuning[k]; apply(); };
    lab.append(txt + ' ', inp, out);
    box.append(lab);
  }
}
async function useFiles(fileList, slot) {
  const got = (await Promise.all([...fileList].map(readImg))).filter(Boolean);
  if (!got.length) { $('status').textContent = 'That file could not be read as an image.'; return; }
  if (slot === 'attack') src.attack = got[0];
  else src.idle = got.sort((a, b) => a.name.localeCompare(b.name));
  apply();
}

// ---------- controls ----------
$('idleIn').onchange = (e) => useFiles(e.target.files, 'idle');
$('atkIn').onchange = (e) => useFiles(e.target.files, 'attack');
$('flip').onchange = (e) => { tuning.flip = e.target.checked; apply(); };
$('view').addEventListener('dragover', (e) => e.preventDefault());
$('view').addEventListener('drop', (e) => { e.preventDefault(); useFiles(e.dataTransfer.files, 'idle'); });
$('copyBtn').onclick = () => { $('json').select(); navigator.clipboard && navigator.clipboard.writeText($('json').value); $('status').textContent = 'JSON copied: paste it into www/sprites/sprites.json.'; };
$('normBtn').onclick = () => {
  if (!norm) return;
  const n = fileNames();
  norm.idle.forEach((c, i) => download(c, n.idle[i]));
  if (norm.attack) download(norm.attack, n.attack);
  $('status').textContent = `Exported ${n.idle.length + (n.attack ? 1 : 0)} file(s) ready for www/sprites/${group}/.`;
};
$('tplBtn').onclick = () => {
  const c = document.createElement('canvas');
  if (group === 'backgrounds') {
    c.width = LAWN_W; c.height = LAWN_H;
    const ctx = c.getContext('2d');
    const w = WORLDS.find((x) => x.id === key);
    for (let r = 0; r < 5; r++) for (let col = 0; col < 9; col++) { ctx.fillStyle = (r + col) % 2 ? w.ground[0] : w.ground[1]; ctx.fillRect(col * 112, r * 118, 112, 118); }
    download(c, `${key}-lawn-template.png`);
    return;
  }
  c.width = 512; c.height = CHAR_H;
  const ctx = c.getContext('2d');
  setBypass(true);
  if (group === 'guardians') drawGuardian(ctx, key, 256, 500, 430, 0.3, {});
  else if (group === 'rotlings') { const d = ROTLINGS[key]; drawRotling(ctx, { k: key, x: 280, y: 500, def: d, seed: 1, shell: d.shell || 0, shield: d.shield || 0, hurt: 0 }, d.boss ? 230 : d.big ? 290 : d.small ? 560 : 340, 0.3); }
  else drawPortrait(ctx, key, 256, 500, 560, 0.3);
  setBypass(false);
  download(c, `${key}-template.png`);
};

// ---------- live preview at real in-game size ----------
const TILE_W = 112, TILE_H = 118, S = 1.7;
const t0 = performance.now();
function frame() {
  requestAnimationFrame(frame);
  const t = (performance.now() - t0) / 1000;
  const ctx = $('view').getContext('2d');
  ctx.clearRect(0, 0, 900, 420);
  const g = ctx.createLinearGradient(0, 0, 0, 420); g.addColorStop(0, '#9fd8ff'); g.addColorStop(1, '#e9f7ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 900, 420);
  ctx.font = '800 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.55)';
  if (group === 'backgrounds') {
    const w = WORLDS.find((x) => x.id === key);
    const e = entryFor('backgrounds', key);
    const bw = 4.5 * TILE_W * 1.6, bh = 2.25 * TILE_H * 1.6;
    if (e) ctx.drawImage(e.idle[0], 0, 0, e.idle[0].width / 2, e.idle[0].height / 2.22, 60, 40, bw, bh);
    else for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) { ctx.fillStyle = (r + c) % 2 ? w.ground[0] : w.ground[1]; ctx.fillRect(60 + c * TILE_W * 1.6, 40 + r * TILE_H * 1.6, TILE_W * 1.6, TILE_H * 1.6); }
    return;
  }
  const tw = TILE_W * S, th = TILE_H * S;
  for (let i = 0; i < 2; i++) {
    const x0 = 60 + i * (tw + 220), y0 = 120;
    ctx.fillStyle = i ? '#74c04c' : '#8ad35e'; ctx.fillRect(x0, y0, tw, th);
    ctx.setLineDash([8, 6]); ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(x0, y0, tw, th); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(i ? 'Your art' : 'Built-in code art', x0 + tw / 2, y0 - 10);
    const ax = x0 + tw / 2, ay = y0 + th - (group === 'rotlings' ? 10 : 8) * S;
    if (i === 0) setBypass(true);
    if (i === 1 && !entryFor(group, key)) { ctx.fillText('drop a PNG here', ax, ay - 80); continue; }
    if (group === 'guardians') drawGuardian(ctx, key, ax, ay, TILE_W * S, t, { fire: Math.sin(t * 2) > 0.9 ? 1 : 0 });
    else if (group === 'rotlings') { const d = ROTLINGS[key]; drawRotling(ctx, { k: key, x: ax, y: ay, def: d, seed: 1, shell: d.shell || 0, shield: d.shield || 0, hurt: 0, eating: Math.sin(t) > 0.5 }, TILE_W * S, t); }
    else drawPortrait(ctx, key, ax, ay, 220, t, Math.sin(t * 2) > 0);
    setBypass(false);
    ctx.fillStyle = '#ff3b6b'; ctx.beginPath(); ctx.arc(ax, ay, 5, 0, Math.PI * 2); ctx.fill();
  }
}

await loadSprites('../www/');
buildSliders();
renderLists();
apply();
frame();
