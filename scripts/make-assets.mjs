// Renders the app icon, adaptive-icon layers, Play Store feature graphic and screenshots
// from the game's own procedural art. Usage: node scripts/make-assets.mjs
// Requires Playwright with Chromium.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const www = path.join(root, 'www');

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(www, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(www) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
const out = (...p) => { const f = path.join(root, ...p); fs.mkdirSync(path.dirname(f), { recursive: true }); return f; };

async function renderArt(w, h, file, body) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.goto(base + 'index.html');
  const data = await page.evaluate(async ({ w, h, body }) => {
    const art = await import('./js/art.js');
    const cinema = await import('./js/cinema.js');
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    // eslint-disable-next-line no-new-func
    new Function('ctx', 'art', 'cinema', 'w', 'h', body)(ctx, art, cinema, w, h);
    return c.toDataURL('image/png');
  }, { w, h, body });
  fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
  await page.close();
}

// App icon: the Thornling on a bright sky-blue badge with a warm sun glow (original design).
const SKY = `
  const g = ctx.createRadialGradient(w * 0.5, h * 0.38, w * 0.05, w * 0.5, h * 0.5, w * 0.78);
  g.addColorStop(0, '#bfe9ff'); g.addColorStop(0.55, '#4fb4ee'); g.addColorStop(1, '#1f6fb8');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const sun = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, w * 0.42);
  sun.addColorStop(0, 'rgba(255,240,170,0.85)'); sun.addColorStop(0.5, 'rgba(255,220,120,0.35)'); sun.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const [x, y, r] of [[0.16, 0.2, 0.06], [0.24, 0.17, 0.05], [0.8, 0.24, 0.055], [0.87, 0.21, 0.045]]) { ctx.beginPath(); ctx.arc(w * x, h * y, w * r, 0, Math.PI * 2); ctx.fill(); }
  const hill = ctx.createLinearGradient(0, h * 0.78, 0, h);
  hill.addColorStop(0, '#7cc65b'); hill.addColorStop(1, '#3f8f30');
  ctx.fillStyle = hill;
  ctx.beginPath(); ctx.moveTo(0, h * 0.86); ctx.quadraticCurveTo(w * 0.5, h * 0.74, w, h * 0.86); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
`;
// Simplified, flat Thornling for the icon: round body, simple spikes, two leaves, big eyes.
const SIMPLE_THORNLING = (cx, cy, R) => `
  (() => {
    const cx = ${cx}, cy = ${cy}, R = ${R};
    // leaves
    const leaf = (dir) => {
      ctx.save(); ctx.translate(cx, cy + R * 0.95); ctx.scale(dir, 1); ctx.rotate(-0.35);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(R * 0.55, -R * 0.45, R * 1.15, -R * 0.05);
      ctx.quadraticCurveTo(R * 0.55, R * 0.3, 0, 0);
      ctx.fillStyle = '#3f9a32'; ctx.fill();
      ctx.restore();
    };
    leaf(-1); leaf(1);
    // spikes
    ctx.fillStyle = '#f4ffe0';
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 0.95 + (i / 8) * Math.PI * 0.9;
      const bx = cx + Math.cos(a) * R * 0.92, by = cy + Math.sin(a) * R * 0.98;
      ctx.beginPath();
      ctx.moveTo(bx - Math.sin(a) * R * 0.11, by + Math.cos(a) * R * 0.11);
      ctx.lineTo(bx + Math.cos(a) * R * 0.32, by + Math.sin(a) * R * 0.32);
      ctx.lineTo(bx + Math.sin(a) * R * 0.11, by - Math.cos(a) * R * 0.11);
      ctx.fill();
    }
    // body: flat green with one soft highlight
    ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.92, R, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#6fcf5a'; ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx - R * 0.32, cy - R * 0.45, R * 0.3, R * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fill();
    // eyes
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(cx + s * R * 0.3, cy - R * 0.08, R * 0.21, R * 0.25, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx + s * R * 0.3 + R * 0.06, cy - R * 0.04, R * 0.12, 0, Math.PI * 2);
      ctx.fillStyle = '#1d1a2b'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx + s * R * 0.3 + R * 0.1, cy - R * 0.1, R * 0.045, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff'; ctx.fill();
    }
    // little round spout + smile
    ctx.beginPath(); ctx.ellipse(cx + R * 0.52, cy + R * 0.38, R * 0.13, R * 0.11, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#2b5a20'; ctx.fill();
    ctx.strokeStyle = '#2b5a20'; ctx.lineWidth = R * 0.06; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx - R * 0.02, cy + R * 0.28, R * 0.17, 0.25 * Math.PI, 0.75 * Math.PI); ctx.stroke();
  })();
`;
const ICON = SKY + SIMPLE_THORNLING('w * 0.5', 'h * 0.5', 'w * 0.3');
const FG = `ctx.clearRect(0, 0, w, h);` + SIMPLE_THORNLING('w * 0.5', 'h * 0.5', 'w * 0.2');
const BG = SKY;

await renderArt(512, 512, out('www/icons/icon-512.png'), ICON);
await renderArt(192, 192, out('www/icons/icon-192.png'), ICON);
await renderArt(512, 512, out('store/icon-512.png'), ICON);
await renderArt(432, 432, out('resources/icon-foreground.png'), FG);
await renderArt(432, 432, out('resources/icon-background.png'), BG);
await renderArt(1024, 1024, out('resources/icon.png'), ICON);
await renderArt(2732, 2732, out('resources/splash.png'), `
  ctx.fillStyle = '#17100a'; ctx.fillRect(0,0,w,h);
  art.drawGuardian(ctx, 'thornling', w/2, h*0.58, w*0.3, 0.3, {});
  ctx.font = '800 160px Trebuchet MS, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#d9ffb0';
  ctx.fillText('Bloomguard', w/2, h*0.68);
`);
await renderArt(1024, 500, out('store/feature-graphic.png'), `
  const g = ctx.createLinearGradient(0,0,0,h); g.addColorStop(0,'#9fd8ff'); g.addColorStop(0.55,'#e9f7ff'); g.addColorStop(0.56,'#79c25a'); g.addColorStop(1,'#4f9e3d');
  ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
  const row = [['glowcap',90],['thornling',210],['frostbell',330],['barkwall',450]];
  for (const [k,x] of row) art.drawGuardian(ctx, k, x, 450, 130, 0.3, {});
  const mk = (k, x, extra={}) => { const def = { grub:{color:'#8a6a9c',hp:1}, shellback:{color:'#6c7a5a',shell:480,hp:1}, brute:{color:'#56634a',big:true,hp:1} }[k]; art.drawRotling(ctx, { x, y: 455, def, seed: x, shell: def.shell||0, hurt:0, ...extra }, 130, 0.5); };
  mk('grub', 700); mk('shellback', 820); mk('brute', 950);
  ctx.font = '800 92px Trebuchet MS, sans-serif'; ctx.textAlign = 'center';
  ctx.lineWidth = 14; ctx.strokeStyle = '#2f6b25'; ctx.strokeText('Bloomguard', w/2, 130);
  ctx.fillStyle = '#ffffff'; ctx.fillText('Bloomguard', w/2, 130);
  ctx.font = '800 30px Trebuchet MS, sans-serif'; ctx.lineWidth = 6; ctx.strokeStyle='#2a1a10';
  ctx.strokeText('Hold back the blight!', w/2, 180); ctx.fillStyle = '#ffe9a0'; ctx.fillText('Hold back the blight!', w/2, 180);
`);

// Steam store / library art. scene(): garden backdrop + guardians vs rotlings; logo optional.
const SCENE = (logo, transparent = false) => `
  const s = Math.min(w, h * 1.6);
  if (!${transparent}) {
    const g = ctx.createLinearGradient(0,0,0,h); g.addColorStop(0,'#9fd8ff'); g.addColorStop(0.5,'#e9f7ff'); g.addColorStop(0.52,'#79c25a'); g.addColorStop(1,'#3f7f30');
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = 'rgba(255,230,120,0.35)';
    for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc((i*173)%w, h*0.55 + (i*61)%(h*0.45), s*0.006, 0, 7); ctx.fill(); }
    const tall = h > w;
    const ts = tall ? w * 0.2 : s * 0.16, gy = h * 0.93;
    const row = ['glowcap','thornling','frostbell','barkwall','emberroot'];
    row.forEach((k, i) => art.drawGuardian(ctx, k, tall ? w * (0.1 + i * 0.2) : w*0.08 + i * ts * 0.85, tall ? h * 0.76 : gy, ts, 0.3 + i, {}));
    const defs = { grub:{color:'#8a6a9c'}, shellback:{color:'#6c7a5a',shell:480}, moth:{color:'#9d8fd1',flying:true}, brute:{color:'#56634a',big:true} };
    [['grub',0.66],['moth',0.74],['shellback',0.82],['brute',0.92]].forEach(([k,x], i) =>
      art.drawRotling(ctx, { x: tall ? w * (0.16 + i * 0.23) : w*x, y: gy, def: defs[k], seed: i*3, shell: defs[k].shell||0, hurt: 0 }, ts, 0.5));
  }
  if (${logo}) {
    const fs = Math.min(w * 0.16, h * 0.28);
    ctx.font = '800 ' + fs + 'px Trebuchet MS, sans-serif'; ctx.textAlign = 'center'; ctx.lineJoin = 'round';
    const ly = ${transparent} ? h * 0.6 : h > w ? h * 0.3 : h * 0.36;
    ctx.lineWidth = fs * 0.16; ctx.strokeStyle = '#2f6b25'; ctx.strokeText('Bloomguard', w/2, ly);
    ctx.fillStyle = '#ffffff'; ctx.fillText('Bloomguard', w/2, ly);
  }
`;
for (const [name, w, h, logo, transparent] of [
  ['header-capsule-920x430', 920, 430, true],
  ['small-capsule-462x174', 462, 174, true],
  ['main-capsule-1232x706', 1232, 706, true],
  ['vertical-capsule-748x896', 748, 896, true],
  ['library-capsule-600x900', 600, 900, true],
  ['library-hero-3840x1240', 3840, 1240, false],
  ['library-logo-1280x720', 1280, 720, true, true],
  ['page-background-1438x810', 1438, 810, false],
]) await renderArt(w, h, out(`store/steam/${name}.png`), SCENE(logo, !!transparent));
await renderArt(256, 256, out('resources/icon-256.png'), ICON);

// Store screenshots (landscape 1920x1080) driven through the real game.
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
await page.goto(base + 'index.html');
await page.waitForTimeout(600);
const shotsDir = out('store/screenshots/x');
for (const f of fs.readdirSync(path.dirname(shotsDir))) fs.unlinkSync(path.join(path.dirname(shotsDir), f));
await page.waitForTimeout(600);
await page.screenshot({ path: out('store/screenshots/1-title.png') });
await page.click('text=New Adventure');
await page.waitForTimeout(16500);
await page.screenshot({ path: out('store/screenshots/2-intro-movie.png') });
await page.click('.cinema-skip');
await page.waitForSelector('.skip');
await page.waitForTimeout(2600);
await page.screenshot({ path: out('store/screenshots/2b-story.png') });
await page.click('.skip');
await page.evaluate(() => {
  const d = window.__bloomguard.data;
  d.unlockedLevel = 16;
  d.guardians = ['glowcap', 'thornling', 'barkwall', 'puffball', 'frostbell', 'vinewhip', 'mossmender', 'sporelamp', 'rootsnare', 'lanceleaf', 'stormseed', 'pollenpuff', 'hivebloom', 'emberroot', 'bramblemat', 'twinbud'];
  d.stars = { 0: 3, 1: 3, 2: 2, 3: 3, 4: 3, 5: 2, 6: 3, 7: 1, 8: 2, 9: 3, 10: 2, 11: 3, 12: 3, 13: 2, 14: 1, 15: 3 };
  d.petals = 420;
  window.__bloomguard.mapWorld = 2;
  window.__bloomguard.show('map');
});
await page.waitForTimeout(500);
await page.screenshot({ path: out('store/screenshots/3-map.png') });
const scenes = [
  [3, '4-greenhouse', ['glowcap', 'thornling', 'frostbell', 'barkwall', 'vinewhip', 'puffball'], null],
  [10, '5-marsh', ['sporelamp', 'pollenpuff', 'hivebloom', 'rootsnare', 'lanceleaf', 'barkwall', 'thornling'], null],
  [17, '6-orchard-boss', ['glowcap', 'emberroot', 'twinbud', 'bramblemat', 'boulderbud', 'mossmender', 'thornling'], 'cinderhusk'],
  [29, '7-caverns-boss', ['sporelamp', 'lanceleaf', 'emberroot', 'rootsnare', 'boulderbud', 'mossmender', 'prismbud', 'hivebloom'], 'gloomwyrm'],
];
// cosmetics on the field for the gameplay shots
await page.evaluate(() => { const D = window.__bloomguard.data; D.equipped = { thornling: { hat: 'wizard' }, glowcap: { hat: 'straw' }, hivebloom: { hat: 'party' }, barkwall: { hat: 'acornhelm' }, emberroot: { skin: 'golden' } }; });
for (const [lvl, name, lo, boss] of scenes) {
  await page.evaluate(({ lvl, lo }) => window.__bloomguard.show('play', lvl, lo), { lvl, lo });
  await page.evaluate(() => {
    const g = window.__bloomguard.game;
    g.hint = -1; g.glow = 99999;
    const order = (r, c) => (c === 0 ? 0 : (r * 2 + c) % g.loadout.length);
    for (const r of g.activeRows) for (let c = 0; c < 5; c++) { g.cooldowns.fill(0); if (!g.grid[r][c]) g.place(order(r, c), r, c); }
    g.cooldowns.fill(0); g.place(1, 2, 2); g.cooldowns.fill(0); g.place(1, 2, 2);
    g.glow = 425; g.seeds = 2; g.seedMeter = 65; g.nextWave = 0; g.level.waves = 99;
  });
  await page.waitForTimeout(8000);
  await page.evaluate((boss) => { const g = window.__bloomguard.game; g.nextWave = 0; if (boss) g.spawnEnemy(boss); }, boss);
  await page.waitForTimeout(8000);
  await page.evaluate(() => { const g = window.__bloomguard.game; for (const row of g.grid) for (const o of row) if (o && o.type !== 'sprout' && Math.random() < 0.15) { g.overbloom(o); break; } });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out(`store/screenshots/${name}.png`) });
}
// Pot Luck mini-game
await page.evaluate(() => window.__bloomguard.show('minigames'));
await page.click('.mg-card >> nth=0 >> button');
await page.waitForTimeout(800);
await page.evaluate(() => { const g = window.__bloomguard.game; g.hint = -1; for (const r of g.activeRows) if (g.tiles[r][4].pot) g.tapTile(r, 4); for (const r of [0, 2, 4]) if (g.loadout.length) g.place(0, r, 2); });
await page.waitForTimeout(5000);
await page.screenshot({ path: out('store/screenshots/8-pot-luck.png') });
// Store
await page.evaluate(() => { const D = window.__bloomguard.data; D.acorns = 640; D.owned.hats.push('wizard', 'straw', 'party', 'acornhelm'); D.owned.skins.push('golden'); window.__bloomguard.show('store'); });
await page.waitForTimeout(800);
await page.screenshot({ path: out('store/screenshots/9-store.png') });
await browser.close();
server.close();
console.log('assets written');
