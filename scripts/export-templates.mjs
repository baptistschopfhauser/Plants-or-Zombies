// Exports a 512 px transparent PNG template of every character's built-in code art into
// art-templates/, with the correct size and bottom-centre anchor. Artists paint original
// replacements over these. Usage: node scripts/export-templates.mjs
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const www = path.join(root, 'www');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(www, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(www) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
const shots = await page.evaluate(async () => {
  const art = await import('./js/art.js');
  const { GUARDIANS, ROTLINGS } = await import('./js/data.js');
  const sp = await import('./js/sprites.js');
  sp.setBypass(true);
  const out = [];
  const make = (draw) => { const c = document.createElement('canvas'); c.width = 512; c.height = 512; draw(c.getContext('2d')); return c.toDataURL('image/png'); };
  for (const k of Object.keys(GUARDIANS)) out.push(['guardians', k, make((ctx) => art.drawGuardian(ctx, k, 256, 500, 430, 0.3, {}))]);
  for (const k of Object.keys(ROTLINGS)) {
    const d = ROTLINGS[k];
    out.push(['rotlings', k, make((ctx) => art.drawRotling(ctx, { k, x: 280, y: 500, def: d, seed: 1, shell: d.shell || 0, shield: d.shield || 0, hurt: 0 }, d.boss ? 230 : d.big ? 290 : d.small ? 560 : 340, 0.3))]);
  }
  for (const k of ['wren', 'moss']) out.push(['portraits', k, make((ctx) => art.drawPortrait(ctx, k, 256, 500, 560, 0.3))]);
  return out;
});
for (const [group, key, url] of shots) {
  const dir = path.join(root, 'art-templates', group);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${key}.png`), Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close();
server.close();
console.log(`exported ${shots.length} templates to art-templates/`);
