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
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    // eslint-disable-next-line no-new-func
    new Function('ctx', 'art', 'w', 'h', body)(ctx, art, w, h);
    return c.toDataURL('image/png');
  }, { w, h, body });
  fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
  await page.close();
}

const ICON = `
  const g = ctx.createRadialGradient(w/2, h*0.4, w*0.05, w/2, h/2, w*0.75);
  g.addColorStop(0, '#b8f08a'); g.addColorStop(0.6, '#4f9e3d'); g.addColorStop(1, '#1f4d1a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255,230,120,0.25)';
  for (let i = 0; i < 14; i++) { ctx.beginPath(); ctx.arc((i*97)%w, (i*53)%h, w*0.02, 0, 7); ctx.fill(); }
  art.drawGuardian(ctx, 'thornling', w/2, h*0.86, w*1.05, 0.3, {});
`;
const FG = `
  ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.clearRect(0,0,w,h);
  art.drawGuardian(ctx, 'thornling', w/2, h*0.80, w*0.85, 0.3, {});
`;
const BG = `ctx.fillStyle = '#4f9e3d'; ctx.fillRect(0,0,w,h);`;

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
await page.waitForTimeout(400);
await page.screenshot({ path: out('store/screenshots/1-title.png') });
await page.evaluate(() => {
  const d = window.__bloomguard.data;
  d.unlockedLevel = 9; d.guardians = ['glowcap', 'thornling', 'barkwall', 'puffball', 'frostbell', 'mossmender', 'lanceleaf', 'stormseed', 'emberroot'];
  d.stars = { 0: 3, 1: 3, 2: 2, 3: 3, 4: 3, 5: 2, 6: 3, 7: 1, 8: 2 };
  window.__bloomguard.show('map');
});
await page.waitForTimeout(300);
await page.screenshot({ path: out('store/screenshots/2-map.png') });
for (const [lvl, name, lo] of [[3, '3-greenhouse', ['glowcap', 'thornling', 'frostbell', 'barkwall', 'mossmender', 'puffball']], [8, '4-marsh', ['glowcap', 'thornling', 'emberroot', 'lanceleaf', 'barkwall', 'frostbell']]]) {
  await page.evaluate(({ lvl, lo }) => window.__bloomguard.show('play', lvl, lo), { lvl, lo });
  await page.evaluate(({ lo }) => {
    const g = window.__bloomguard.game;
    g.hint = -1;
    g.glow = 9999;
    for (const r of g.activeRows) for (let c = 0; c < 5; c++) {
      const i = c === 0 ? 0 : c === 4 ? 4 : (r + c) % 3 + 1;
      g.cooldowns.fill(0); g.place(i % lo.length, r, c);
    }
    g.place(0, 2, 0); g.place(0, 2, 0);
    g.glow = 375; g.bloom = 100;
    g.nextWave = 0;
  }, { lo });
  await page.waitForTimeout(9000);
  await page.evaluate(() => { const g = window.__bloomguard.game; g.nextWave = 0; });
  await page.waitForTimeout(9000);
  await page.screenshot({ path: out(`store/screenshots/${name}.png`) });
}
await browser.close();
server.close();
console.log('assets written');
