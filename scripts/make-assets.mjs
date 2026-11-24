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

// App icon: the glowing Hearthseed cradled by two leaves on a forest-green badge (original design).
const EMBLEM = `
  const cx = w / 2, cy = h * 0.5;
  // two big cradling leaves
  const leafShape = (dir) => {
    ctx.save(); ctx.translate(cx, cy + h * 0.17); ctx.scale(dir, 1); ctx.rotate(-0.5);
    ctx.beginPath(); ctx.moveTo(0, 0);
    ctx.bezierCurveTo(w * 0.08, -h * 0.16, w * 0.3, -h * 0.17, w * 0.38, -h * 0.02);
    ctx.bezierCurveTo(w * 0.28, h * 0.08, w * 0.08, h * 0.07, 0, 0);
    const g = ctx.createLinearGradient(0, -h * 0.15, 0, h * 0.06);
    g.addColorStop(0, '#9be86a'); g.addColorStop(1, '#2f8a2a');
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(20,70,20,0.45)'; ctx.lineWidth = w * 0.008;
    ctx.beginPath(); ctx.moveTo(w * 0.02, -h * 0.005); ctx.quadraticCurveTo(w * 0.2, -h * 0.07, w * 0.35, -h * 0.02); ctx.stroke();
    ctx.restore();
  };
  leafShape(-1); leafShape(1);
  cinema.drawHearthseed(ctx, cx, cy - h * 0.03, w * 0.14, 0.6, 1.1);
  // sparkles
  ctx.fillStyle = '#fffbe0';
  for (const [sx, sy, r] of [[0.24, 0.26, 0.022], [0.78, 0.3, 0.018], [0.7, 0.18, 0.012], [0.3, 0.68, 0.012], [0.74, 0.66, 0.015]]) {
    ctx.save(); ctx.translate(w * sx, h * sy); ctx.beginPath();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const rr = i % 2 ? r * 0.35 : r; ctx.lineTo(Math.cos(a) * w * rr, Math.sin(a) * w * rr); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
`;
const BADGE = `
  const g = ctx.createRadialGradient(w / 2, h * 0.45, w * 0.04, w / 2, h / 2, w * 0.75);
  g.addColorStop(0, '#3f8f4a'); g.addColorStop(0.55, '#1f5a34'); g.addColorStop(1, '#0d2a1a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  const halo = ctx.createRadialGradient(w / 2, h * 0.48, 0, w / 2, h * 0.48, w * 0.42);
  halo.addColorStop(0, 'rgba(255,220,120,0.55)'); halo.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
  // ring of tiny leaves
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    ctx.save(); ctx.translate(w / 2 + Math.cos(a) * w * 0.44, h / 2 + Math.sin(a) * h * 0.44); ctx.rotate(a + Math.PI / 2);
    ctx.fillStyle = i % 2 ? 'rgba(120,200,90,0.55)' : 'rgba(90,170,70,0.55)';
    ctx.beginPath(); ctx.ellipse(0, 0, w * 0.035, w * 0.016, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
`;
const ICON = BADGE + EMBLEM;
const FG = `ctx.clearRect(0, 0, w, h); ctx.save(); ctx.translate(w * 0.17, h * 0.17); ctx.scale(0.66, 0.66);` + EMBLEM + `ctx.restore();`;
const BG = BADGE;

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
