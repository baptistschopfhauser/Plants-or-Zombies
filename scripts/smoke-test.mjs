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

// Real UI clicks: title -> story -> map -> loadout -> play
await page.click('text=New Adventure');
await page.waitForSelector('.cinema-skip');
await page.waitForTimeout(2500); // let the intro movie render a few scenes
await page.click('.cinema-skip');
await page.waitForSelector('.skip');
await page.click('.skip');
await page.click('.node >> nth=0');
await page.click('text=Start!');
await page.waitForTimeout(500);
// tap a card and a tile through real pointer events on the canvas
const box = await page.locator('#game').boundingBox();
const sx = box.width / 1280, sy = box.height / 720;
const cardW = await page.evaluate(() => window.__bloomguard.game.cardW);
await page.mouse.click(box.x + (124 + cardW / 2) * sx, box.y + 50 * sy); // glowcap card
await page.mouse.click(box.x + (150 + 56) * sx, box.y + (122 + 118 * 2 + 60) * sy); // row 2 col 0
const placed = await page.evaluate(() => !!window.__bloomguard.game.grid[2][0]);
if (!placed) errors.push('pointer placement failed');

const results = await page.evaluate(async () => {
  const { LEVELS, GUARDIANS, loadoutSlots } = await import('./js/data.js');
  const { Game } = await import('./js/game.js');
  const canvas = document.getElementById('game');
  const out = [];

  function simulate(level, loadout, bot, maxSec = 1100) {
    return new Promise((resolve) => {
      let ended = null;
      const g = new Game(canvas, { level, loadout, autoCollect: true, onEnd: (r) => { ended = r; } });
      cancelAnimationFrame(g.raf); g._loop = () => {}; // drive manually
      g.hint = -1;
      let t = 0;
      let err = null;
      try {
        while (!g.ended && t < maxSec) {
          if (bot) bot(g);
          const L = g.lanterns;
          g.update(1 / 60);
          if (Math.floor(t * 60) % 600 === 0) g.render();
          if (g.lanterns < L && !g.snap) g.snap = `t${g.time | 0} ` + g.enemies.map((e) => `${e.k}@${e.row}:${e.x | 0}`).join(' ') + ' | ' + g.grid.map((r) => r.map((x) => (x ? x.type.slice(0, 2) : '..')).join('')).join('/');
          t += 1 / 60;
        }
      } catch (e) { err = e.message + ' ' + (e.stack || '').split('\n')[1]; }
      const res = { level, won: !err && !!(g.result && g.result.won), stars: g.result ? g.result.stars : 0, why: g.result && !g.result.won ? g.result.reason : '', lanterns: g.lanterns, wave: g.wave, time: Math.round(t), kills: g.stats.kills, overs: g.stats.overblooms, snap: g.snap, err };
      g.destroy();
      resolve(res);
    });
  }

  function makeBot(loadout) {
    const idx = (k) => loadout.indexOf(k);
    return (g) => {
      const lo = g.loadout;
      const ix = (k) => lo.indexOf(k);
      const can = (k) => ix(k) >= 0 && g.cooldowns[ix(k)] <= 0 && g.glow >= GUARDIANS[k].cost;
      const rows = g.activeRows;
      // break ice and mine crystals that are in our building area
      for (const r of rows) for (let c = 0; c < 6; c++) { const t = g.tiles[r][c]; if ((t.frozen || t.crystal) && Math.random() < 0.05) g.tapTile(r, c); }
      const threat = rows.slice().sort((a, b) => {
        const ea = g.enemies.filter((e) => e.row === a).reduce((s, e) => s + e.hp, 0);
        const eb = g.enemies.filter((e) => e.row === b).reduce((s, e) => s + e.hp, 0);
        return eb - ea;
      });
      // Wildseeds: overbloom the strongest attacker in the most threatened row
      if (g.seeds > 0 && g.enemies.length) {
        for (const r of threat) for (let c = 0; c < 6; c++) {
          const o = g.grid[r][c];
          if (o && GUARDIANS[o.type] && GUARDIANS[o.type].over && ['shooter', 'lobber', 'homing', 'melee'].includes(GUARDIANS[o.type].kind)) { g.useSeedOn(r, c); return; }
        }
      }
      const prod = ['glowcap', 'sporelamp'].find((k) => ix(k) >= 0);
      const producers = rows.reduce((s, r) => s + [0, 1].filter((c) => g.grid[r][c] && GUARDIANS[g.grid[r][c].type] && GUARDIANS[g.grid[r][c].type].kind === 'producer').length, 0);
      const defenders = rows.reduce((s, r) => s + [2, 3, 4].filter((c) => g.grid[r][c]).length, 0);
      const wantProducers = Math.min(rows.length * (rows.length < 5 ? 1 : 2), 3 + defenders);
      if (prod && producers < wantProducers && can(prod)) {
        for (const c of [0, 1]) for (const r of threat) if (!g.grid[r][c] && g.plantable(r, c)) { g.place(ix(prod), r, c); return; }
      }
      const emergency = g.enemies.find((e) => e.x < 150 + 112 * 3 && !e.def.boss);
      if (emergency && can('stormseed')) { const c = Math.max(0, Math.floor((emergency.x - 150) / 112) - 1); if (!g.grid[emergency.row][c] && g.plantable(emergency.row, c)) { g.place(ix('stormseed'), emergency.row, c); return; } }
      const shooters = ['twinbud', 'emberroot', 'hivebloom', 'lanceleaf', 'frostbell', 'thornling', 'pollenpuff', 'vinewhip'];
      // coverage first: every lane gets one attacker before any lane gets extras
      for (const r of threat) {
        if ([2, 3, 4].some((c) => g.grid[r][c])) continue;
        for (const c of [2, 3, 4]) {
          if (!g.plantable(r, c)) continue;
          const k = ['thornling', ...shooters].find((x) => can(x));
          if (k) { g.place(ix(k), r, c); return; }
          break;
        }
        if (g.goal === 'budget') return; // save up for this lane
      }
      for (const r of threat) {
        for (const c of [2, 3, 4]) {
          if (g.grid[r][c] || !g.plantable(r, c)) continue;
          for (const k of shooters) if (can(k)) { g.place(ix(k), r, c); return; }
          break;
        }
        const wall = ['barkwall', 'boulderbud'].find((k) => can(k));
        if (wall && !g.grid[r][6] && g.plantable(r, 6) && g.enemies.some((e) => e.row === r)) { g.place(ix(wall), r, 6); return; }
        if (!g.grid[r][5] && g.plantable(r, 5) && can('mossmender') && g.grid[r][4]) { g.place(ix('mossmender'), r, 5); return; }
      }
      if (g.glow > 400) {
        for (const r of threat) for (const c of [2, 3, 4]) {
          const o = g.grid[r][c];
          if (o && o.level < 3 && can(o.type) && ['shooter', 'lobber', 'homing'].includes(GUARDIANS[o.type].kind)) { g.place(ix(o.type), r, c); return; }
        }
      }
      void idx;
    };
  }

  const owned = ['glowcap', 'thornling'];
  const pri = ['glowcap', 'thornling', 'twinbud', 'emberroot', 'hivebloom', 'barkwall', 'lanceleaf', 'mossmender', 'frostbell', 'stormseed', 'boulderbud', 'sporelamp', 'vinewhip'];
  const only = window.__onlyLevels;
  for (let i = 0; i < LEVELS.length; i++) {
    if (only && !only.includes(i)) { if (LEVELS[i].reward) owned.push(LEVELS[i].reward); continue; }
    const loadout = pri.filter((k) => owned.includes(k)).slice(0, loadoutSlots(i));
    let r = await simulate(i, loadout, makeBot(loadout));
    for (let a = 0; a < 2 && !r.won && !r.err; a++) { r = await simulate(i, loadout, makeBot(loadout)); r.retried = a + 1; }
    r.loadout = loadout.length;
    out.push(r);
    if (LEVELS[i].reward) owned.push(LEVELS[i].reward);
  }
  out.push({ idle: true, ...(await simulate(2, ['glowcap', 'thornling'], null)) });
  // Pot Luck: break pots left-to-right, plant whatever we find right behind the pot line
  const { POTLUCK, dailyLevel } = await import('./js/data.js');
  const potBot = (g) => {
    if (g.loadout.length) {
      // put each find into the lane that needs it most: enemies present first, then the emptiest lane
      const need = (r) => g.enemies.filter((e) => e.row === r).length * 10 - [0, 1, 2, 3].filter((c) => g.grid[r][c]).length;
      const rows = g.activeRows.slice().sort((a, b) => need(b) - need(a));
      for (const r of rows) for (const c of [3, 2, 1, 0]) if (!g.grid[r][c] && g.plantable(r, c)) { g.place(0, r, c); return; }
    }
    if (g.enemies.length > 2 || Math.random() > 0.02) return;
    for (let c = 4; c < 9; c++) for (const r of g.activeRows) if (g.tiles[r][c].pot) { g.tapTile(r, c); return; }
  };
  for (let i = 0; i < POTLUCK.length; i++) {
    let r = await simulate({ ...POTLUCK[i], mode: 'potluck', potIndex: i }, [], potBot);
    for (let a = 0; a < 2 && !r.won && !r.err; a++) r = await simulate({ ...POTLUCK[i], mode: 'potluck', potIndex: i }, [], potBot);
    out.push({ potluck: i, ...r });
  }
  // Daily challenges for a week of dates
  const dlo = ['glowcap', 'thornling', 'twinbud', 'emberroot', 'hivebloom', 'barkwall', 'lanceleaf', 'mossmender'];
  for (let d = 1; d <= 7; d++) {
    const lvl = dailyLevel(`2026-12-0${d}`, 36);
    let r = await simulate(lvl, dlo, makeBot(dlo));
    for (let a = 0; a < 2 && !r.won && !r.err; a++) r = await simulate(lvl, dlo, makeBot(dlo));
    out.push({ daily: `${lvl.goal}/${lvl.mods.join('+')}`, ...r });
  }
  const lo = ['glowcap', 'thornling', 'twinbud', 'emberroot', 'hivebloom', 'barkwall', 'lanceleaf', 'mossmender'];
  out.push({ endless: true, ...(await simulate('endless', lo, makeBot(lo), 1500)) });
  return out;
});

// Controller: mock a gamepad, steer the cursor onto the "Map" button with the stick and press A
await page.evaluate(() => window.__bloomguard.show('title'));
const target = await page.locator('.sign:has-text("Lexicon")').boundingBox();
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
if (!(await page.locator('.lexicon').count())) errors.push('gamepad A-press did not open the Lexicon');

// Exercise menus
await page.evaluate(() => window.__bloomguard.show('guide'));
await page.click('.lex-card >> nth=0'); await page.click('.tabs button >> nth=1'); await page.click('.tabs button >> nth=2');
for (const s of ['settings', 'grove', 'trophies', 'store', 'nursery', 'daily', 'minigames', 'extras', 'studio', 'title']) { await page.evaluate((s) => window.__bloomguard.show(s), s); await page.waitForTimeout(150); }
// store: buy and equip a hat
await page.evaluate(() => { window.__bloomguard.data.acorns = 5000; window.__bloomguard.show('store'); });
await page.click('.items .item >> nth=1 >> button');
if (!(await page.evaluate(() => Object.values(window.__bloomguard.data.equipped).some((e) => e && e.hat)))) errors.push('store purchase/equip failed');
// nursery: plant a seed
await page.evaluate(() => window.__bloomguard.show('nursery'));
await page.click('.nursery-slot >> nth=0 >> button');
if (!(await page.evaluate(() => !!window.__bloomguard.data.nursery.pots[0]))) errors.push('nursery planting failed');
// bonk mini-game runs, then quit
await page.evaluate(() => window.__bloomguard.show('minigames'));
await page.click('.mg-card:has-text("Bonk") >> button');
await page.waitForTimeout(1500);
await page.click('.cinema-skip');
// ending movie renders
await page.evaluate(() => window.__bloomguard.show('extras'));
await page.evaluate(() => { window.__bloomguard.data.seenEnding = true; window.__bloomguard.show('extras'); });
await page.click('text=Watch the ending');
await page.waitForTimeout(3000);
await page.click('.cinema-skip');
await page.waitForTimeout(500);
for (let w = 0; w < 6; w++) await page.evaluate((w) => { window.__bloomguard.mapWorld = w; window.__bloomguard.show('map'); }, w);
await page.waitForTimeout(200);

console.table(results.map(({ snap, ...r }) => r));
for (const r of results) if (r.snap && !r.won) console.log(r.level, r.snap);
await browser.close();
server.close();
const fails = [];
for (const r of results) {
  if (r.potluck !== undefined) { if (r.err) fails.push(`engine error in Pot Luck ${r.potluck + 1}: ${r.err}`); else if (!r.won) fails.push(`bot lost Pot Luck ${r.potluck + 1}`); continue; }
  if (r.daily) { if (r.err) fails.push(`engine error in daily ${r.daily}: ${r.err}`); else if (!r.won) fails.push(`bot lost daily ${r.daily}`); continue; }
  if (r.idle) { if (r.won) fails.push('idle player won level 3'); if (r.err) fails.push('engine error (idle): ' + r.err); }
  else if (r.endless) { if (r.err) fails.push('engine error (endless): ' + r.err); else if (r.wave < 8) fails.push(`endless bot only reached wave ${r.wave}`); }
  else if (r.err) fails.push(`engine error on level ${r.level + 1}: ${r.err}`);
  else if (!r.won) fails.push(`bot lost level ${r.level + 1}`);
}
if (errors.length) fails.push(...errors.map((e) => 'page error: ' + e));
if (fails.length) { console.error('FAIL\n' + fails.join('\n')); process.exit(1); }
console.log('All smoke tests passed');
