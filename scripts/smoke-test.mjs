// Headless smoke + balance test. A simple bot plays every level through the real engine.
// Usage: node scripts/smoke-test.mjs   (exit code 1 on any failure)
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const www = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'www');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(www, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(www) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
await page.waitForTimeout(300);

// Real UI clicks: title -> map -> loadout -> play
await page.click('text=Play');
await page.click('.level >> nth=0');
await page.click('text=Start!');
await page.waitForTimeout(500);
// tap a card and a tile through real pointer events on the canvas
const box = await page.locator('#game').boundingBox();
const sx = box.width / 1280, sy = box.height / 720;
await page.mouse.click(box.x + (124 + 48) * sx, box.y + 50 * sy); // glowcap card
await page.mouse.click(box.x + (150 + 56) * sx, box.y + (122 + 118 * 2 + 60) * sy); // row 2 col 0
const placed = await page.evaluate(() => !!window.__bloomguard.game.grid[2][0]);
if (!placed) errors.push('pointer placement failed');

const results = await page.evaluate(async () => {
  const { LEVELS, GUARDIANS } = await import('./js/data.js');
  const { Game } = await import('./js/game.js');
  const canvas = document.getElementById('game');
  const out = [];

  function simulate(level, loadout, bot, maxSec = 900) {
    return new Promise((resolve) => {
      let ended = null;
      const g = new Game(canvas, { level, loadout, autoCollect: true, onEnd: (r) => { ended = r; } });
      cancelAnimationFrame(g.raf); g._loop = () => {}; // drive manually
      g.hint = -1;
      let t = 0;
      while (!g.ended && t < maxSec) {
        if (bot) bot(g);
        const L = g.lanterns;
        g.update(1 / 60);
        if (g.lanterns < L && !g.snap) g.snap = `t${g.time | 0} ` + g.enemies.map((e) => `${e.k}@${e.row}:${e.x | 0}`).join(' ') + ' | ' + g.grid.map((r) => r.map((x) => (x ? x.type.slice(0, 2) : '..')).join('')).join('/');
        t += 1 / 60;
      }
      const res = { level, won: g.ended && g.lanterns > 0, lanterns: g.lanterns, wave: g.wave, time: Math.round(t), kills: g.kills, snap: g.snap };
      g.destroy();
      resolve(res);
    });
  }

  // Bot: economy first, then fill columns with shooters/walls by priority, upgrade later.
  function makeBot(loadout) {
    const idx = (k) => loadout.indexOf(k);
    return (g) => {
      if (g.bloom >= 100) g.triggerBloom();
      const can = (k) => idx(k) >= 0 && g.cooldowns[idx(k)] <= 0 && g.glow >= GUARDIANS[k].cost;
      const rows = g.activeRows;
      // threatened row first
      const threat = rows.slice().sort((a, b) => {
        const ea = g.enemies.filter((e) => e.row === a).reduce((s, e) => s + e.hp, 0);
        const eb = g.enemies.filter((e) => e.row === b).reduce((s, e) => s + e.hp, 0);
        return eb - ea;
      });
      const producers = rows.reduce((s, r) => s + (g.grid[r][0] ? 1 : 0) + (g.grid[r][1] ? 1 : 0), 0);
      const defenders = rows.reduce((s, r) => s + [2, 3, 4].filter((c) => g.grid[r][c]).length, 0);
      const wantProducers = Math.min(rows.length * (rows.length < 5 ? 1 : 2), 3 + defenders);
      if (producers < wantProducers && can('glowcap')) {
        for (const c of [0, 1]) for (const r of threat) if (!g.grid[r][c]) { g.place(idx('glowcap'), r, c); return; }
      }
      const emergency = g.enemies.find((e) => e.x < 150 + 112 * 3 && !e.def.boss);
      if (emergency && can('stormseed')) { g.place(idx('stormseed'), emergency.row, Math.max(0, Math.floor((emergency.x - 150) / 112) - 1)); return; }
      const shooters = ['twinbud', 'emberroot', 'lanceleaf', 'frostbell', 'thornling'];
      for (const r of threat) {
        for (const c of [2, 3, 4]) {
          if (g.grid[r][c]) continue;
          for (const k of shooters) if (can(k)) { g.place(idx(k), r, c); return; }
          break;
        }
        if (!g.grid[r][6] && g.enemies.some((e) => e.row === r) && can('barkwall')) { g.place(idx('barkwall'), r, 6); return; }
        if (!g.grid[r][5] && can('mossmender') && g.grid[r][4]) { g.place(idx('mossmender'), r, 5); return; }
      }
      // upgrade shooters when rich
      if (g.glow > 400) {
        for (const r of threat) for (const c of [2, 3, 4]) {
          const o = g.grid[r][c];
          if (o && o.level < 3 && can(o.type) && GUARDIANS[o.type].kind === 'shooter') { g.place(idx(o.type), r, c); return; }
        }
      }
    };
  }

  const owned = ['glowcap', 'thornling'];
  for (let i = 0; i < LEVELS.length; i++) {
    const pri = ['glowcap', 'twinbud', 'emberroot', 'lanceleaf', 'frostbell', 'thornling', 'barkwall', 'stormseed', 'mossmender'];
    const loadout = pri.filter((k) => owned.includes(k)).slice(0, 6);
    let r = await simulate(i, loadout, makeBot(loadout));
    if (!r.won) { const retry = await simulate(i, loadout, makeBot(loadout)); retry.retried = true; r = retry; }
    r.loadout = loadout.join(',');
    out.push(r);
    if (LEVELS[i].reward) owned.push(LEVELS[i].reward);
  }
  // idle player must lose
  out.push({ idle: true, ...(await simulate(2, ['glowcap', 'thornling'], null)) });
  // endless survives some waves with a bot
  const lo = ['glowcap', 'twinbud', 'emberroot', 'lanceleaf', 'frostbell', 'barkwall'];
  out.push({ endless: true, ...(await simulate('endless', lo, makeBot(lo), 1500)) });
  return out;
});

// Controller: mock a gamepad, steer the cursor onto the "Map" button with the stick and press A
await page.evaluate(() => window.__bloomguard.show('title'));
const target = await page.locator('text=Field Guide').boundingBox();
await page.evaluate(({ tx, ty }) => {
  const pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
  navigator.getGamepads = () => [pad];
  window.__pad = pad;
  window.__padTarget = { tx, ty };
}, { tx: target.x + target.width / 2, ty: target.y + target.height / 2 });
// push the stick toward the target until the cursor is on it
for (let i = 0; i < 200; i++) {
  const done = await page.evaluate(() => {
    const c = document.getElementById('pad-cursor');
    if (!c) return false;
    const m = /translate\(([\d.]+)px, ([\d.]+)px\)/.exec(c.style.transform);
    if (!m) return false;
    const [x, y] = [parseFloat(m[1]), parseFloat(m[2])];
    const { tx, ty } = window.__padTarget;
    const dx = tx - x, dy = ty - y;
    window.__pad.axes[0] = Math.abs(dx) > 8 ? Math.sign(dx) * 0.6 : 0;
    window.__pad.axes[1] = Math.abs(dy) > 8 ? Math.sign(dy) * 0.6 : 0;
    return Math.abs(dx) <= 8 && Math.abs(dy) <= 8;
  });
  if (done) break;
  await page.waitForTimeout(16);
}
await page.evaluate(() => { window.__pad.axes = [0, 0, 0, 0]; window.__pad.buttons[0].pressed = true; });
await page.waitForTimeout(80);
await page.evaluate(() => { window.__pad.buttons[0].pressed = false; });
await page.waitForTimeout(80);
if (!(await page.locator('.guide').count())) errors.push('gamepad A-press did not open the Field Guide');

// Exercise menus
await page.evaluate(() => window.__bloomguard.show('guide'));
await page.click('.guide-list .entry >> nth=0');
await page.evaluate(() => window.__bloomguard.show('settings'));
await page.evaluate(() => window.__bloomguard.show('map'));

console.table(results.map(({ snap, ...r }) => r));
for (const r of results) if (r.snap && !r.won) console.log(r.level, r.snap);
await browser.close();
server.close();
const fails = [];
for (const r of results) {
  if (r.idle) { if (r.won) fails.push('idle player won level 3'); }
  else if (r.endless) { if (r.wave < 8) fails.push(`endless bot only reached wave ${r.wave}`); }
  else if (!r.won) fails.push(`bot lost level ${r.level + 1}`);
}
if (errors.length) fails.push(...errors.map((e) => 'page error: ' + e));
if (fails.length) { console.error('FAIL\n' + fails.join('\n')); process.exit(1); }
console.log('All smoke tests passed');
