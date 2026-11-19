'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const COLS = 9;
const ROWS = 5;
const CELL_W = 80;
const CELL_H = 96;
const LAWN_X = 90;
const LAWN_Y = 100;
const LAWN_W = COLS * CELL_W;
const LAWN_H = ROWS * CELL_H;
const RIGHT_X = LAWN_X + LAWN_W;
const TOPBAR_H = 86;

const G = {
  state: 'menu',
  levelIndex: -1,
  endless: false,
  level: null,
  time: 0,
  sun: 150,
  grid: [],
  zombies: [],
  peas: [],
  suns: [],
  explosions: [],
  mowers: [],
  cooldowns: {},
  wave: 0,
  nextWaveT: 0,
  totalZombies: 0,
  spawnedZombies: 0,
  killed: 0,
  selectedSeed: null,
  shovel: false,
  mouse: { x: -1, y: -1 },
  message: null,
  messageT: 0,
  skySunT: 4,
  over: false,
  won: false,
  overT: 0,
  buttons: [],
  completed: []
};

try { G.completed = JSON.parse(localStorage.getItem('gg_completed') || '[]'); } catch (e) { G.completed = []; }

let AC = null;
function audio() {
  if (!AC) {
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
  }
  return AC;
}
function beep(freq, dur, type, vol, slide) {
  const ac = audio();
  if (!ac) return;
  try {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, ac.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), ac.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.04, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
  } catch (e) { }
}

function rand(a, b) { return a + Math.random() * (b - a); }
function irand(a, b) { return Math.floor(rand(a, b + 1)); }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function cellFromXY(x, y) {
  if (x < LAWN_X || x >= LAWN_X + LAWN_W || y < LAWN_Y || y >= LAWN_Y + LAWN_H) return null;
  return { col: Math.floor((x - LAWN_X) / CELL_W), row: Math.floor((y - LAWN_Y) / CELL_H) };
}
function cellCenter(row, col) {
  return { x: LAWN_X + col * CELL_W + CELL_W / 2, y: LAWN_Y + row * CELL_H + CELL_H / 2 };
}
function rowY(row) { return LAWN_Y + row * CELL_H + CELL_H * 0.66; }

function setMessage(t) { G.message = t; G.messageT = 2.6; }

function resetField() {
  G.time = 0;
  G.grid = [];
  for (let r = 0; r < ROWS; r++) G.grid.push(new Array(COLS).fill(null));
  G.zombies = [];
  G.peas = [];
  G.suns = [];
  G.explosions = [];
  G.mowers = [];
  for (let r = 0; r < ROWS; r++) G.mowers.push({ x: LAWN_X - 38, used: false, active: false });
  G.wave = 0;
  G.spawnedZombies = 0;
  G.killed = 0;
  G.selectedSeed = null;
  G.shovel = false;
  G.message = null;
  G.messageT = 0;
  G.skySunT = 4;
  G.over = false;
  G.won = false;
  G.overT = 0;
  G.cooldowns = {};
  for (const k of SEED_ORDER) G.cooldowns[k] = 0;
}

function waveCount(w) {
  const L = G.level;
  if (L.endless) {
    if (w % 10 === 0) return 10 + w;
    return Math.min(2 + Math.floor(w * 0.9), 9);
  }
  if (w === L.waves) return L.finalCount;
  return Math.max(1, Math.round(w * L.waveSize + (G.levelIndex >= 0 ? G.levelIndex : 0)));
}

function wavePool(w) {
  const L = G.level;
  if (L.endless) {
    const pool = ['shambler', 'shambler', 'cone'];
    if (w >= 3) pool.push('sprinter');
    if (w >= 5) pool.push('cone', 'bucket');
    if (w >= 8) pool.push('brute', 'bucket');
    return pool;
  }
  return L.pool;
}

function buildTotals() {
  let total = 0;
  for (let w = 1; w <= G.level.waves; w++) total += waveCount(w);
  G.totalZombies = total;
}

function startLevel(i) {
  G.levelIndex = i;
  G.endless = false;
  G.level = LEVELS[i];
  resetField();
  G.sun = G.level.startSun;
  G.nextWaveT = 18;
  buildTotals();
  G.state = 'playing';
}

function startEndless() {
  G.levelIndex = -1;
  G.endless = true;
  G.level = { name: 'Endless Yard', endless: true, waveInterval: 11, startSun: 150, skyEvery: 8 };
  resetField();
  G.sun = G.level.startSun;
  G.nextWaveT = 18;
  G.totalZombies = Infinity;
  G.state = 'playing';
}

function restart() {
  if (G.endless) startEndless();
  else startLevel(G.levelIndex);
}

function spawnZombie(typeKey, row) {
  const t = ZOMBIE_TYPES[typeKey];
  G.zombies.push({
    type: typeKey,
    row: row,
    x: RIGHT_X + rand(30, 150),
    hp: t.hp,
    maxHp: t.hp,
    speed: t.speed * rand(0.9, 1.1),
    dmg: t.dmg,
    slowT: 0,
    eating: null,
    dead: false,
    big: !!t.big
  });
}

function spawnWave() {
  G.wave++;
  const w = G.wave;
  const count = waveCount(w);
  const pool = wavePool(w);
  for (let i = 0; i < count; i++) {
    spawnZombie(choice(pool), irand(0, ROWS - 1));
  }
  G.spawnedZombies += count;
  const finalWave = !G.endless && w === G.level.waves;
  if (finalWave) {
    setMessage('A huge wave is approaching!');
    beep(120, 0.5, 'sawtooth', 0.06, 60);
  } else if (w % 5 === 0) {
    setMessage('Wave ' + w + ' incoming');
  }
}

function zombieAhead(p) {
  for (const z of G.zombies) {
    if (z.row === p.row && z.x > p.x - 10) return true;
  }
  return false;
}

function firePea(p, def) {
  G.peas.push({ row: p.row, x: p.x + 26, y: p.y - 6, dmg: def.dmg, slow: !!def.slow, dead: false });
}

function spawnSunAt(x, y, value) {
  G.suns.push({ x: x + rand(-8, 8), y: y - 24, vy: 0, targetY: y - 24, value: value, life: 10, sky: false, got: false });
}

function explode(p, r, c) {
  const def = PLANT_TYPES[p.type];
  const ctr = cellCenter(r, c);
  G.explosions.push({ x: ctr.x, y: ctr.y, r: 10, a: 1 });
  for (const z of G.zombies) {
    const zc = Math.floor((z.x - LAWN_X) / CELL_W);
    if (Math.abs(z.row - r) <= 1 && Math.abs(zc - c) <= 1) z.hp -= def.dmg;
  }
  G.grid[r][c] = null;
  beep(70, 0.5, 'sawtooth', 0.09, 30);
}

function tryPlace(row, col) {
  const key = G.selectedSeed;
  if (!key) return;
  const def = PLANT_TYPES[key];
  if (G.grid[row][col]) { beep(140, 0.08, 'square', 0.03, 90); return; }
  if (G.cooldowns[key] > G.time) { beep(140, 0.08, 'square', 0.03, 90); return; }
  if (G.sun < def.cost) { beep(140, 0.08, 'square', 0.03, 90); return; }
  const ctr = cellCenter(row, col);
  G.grid[row][col] = {
    type: key, row: row, col: col, x: ctr.x, y: ctr.y,
    hp: def.hp, maxHp: def.hp,
    sunT: def.sunEvery ? def.sunEvery * 0.5 : 0,
    shootT: 0.4,
    armT: def.arm || 0
  };
  G.sun -= def.cost;
  G.cooldowns[key] = G.time + def.cd;
  beep(220, 0.09, 'square', 0.04, 140);
}

function winGame() {
  if (G.over) return;
  G.over = true;
  G.won = true;
  G.overT = 0;
  G.state = 'over';
  if (!G.endless && G.levelIndex >= 0) {
    if (G.completed.indexOf(G.levelIndex) < 0) {
      G.completed.push(G.levelIndex);
      try { localStorage.setItem('gg_completed', JSON.stringify(G.completed)); } catch (e) { }
    }
  }
  beep(523, 0.12, 'square', 0.05);
  setTimeout(function () { beep(659, 0.12, 'square', 0.05); }, 130);
  setTimeout(function () { beep(784, 0.22, 'square', 0.05); }, 260);
}

function loseGame() {
  if (G.over) return;
  G.over = true;
  G.won = false;
  G.overT = 0;
  G.state = 'over';
  beep(300, 0.3, 'sawtooth', 0.07, 120);
  setTimeout(function () { beep(200, 0.3, 'sawtooth', 0.07, 80); }, 250);
  setTimeout(function () { beep(120, 0.5, 'sawtooth', 0.07, 50); }, 500);
}

function update(dt) {
  G.time += dt;
  if (G.messageT > 0) G.messageT -= dt;

  G.skySunT -= dt;
  if (G.skySunT <= 0) {
    G.skySunT = G.level.skyEvery * rand(0.8, 1.2);
    G.suns.push({
      x: rand(LAWN_X + 20, RIGHT_X - 20), y: LAWN_Y - 30, vy: 34,
      targetY: rand(LAWN_Y + 40, LAWN_Y + LAWN_H - 40),
      value: 25, life: 9, sky: true, got: false
    });
  }

  if (!G.over && G.time >= G.nextWaveT && (G.endless || G.wave < G.level.waves)) {
    spawnWave();
    G.nextWaveT = G.time + (G.level.waveInterval || 11) * rand(0.9, 1.1);
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = G.grid[r][c];
      if (!p) continue;
      const def = PLANT_TYPES[p.type];
      if (p.type === 'sunbloom') {
        p.sunT -= dt;
        if (p.sunT <= 0) {
          p.sunT = def.sunEvery;
          spawnSunAt(p.x, p.y, def.sunAmount);
          beep(880, 0.08, 'sine', 0.03);
        }
      } else if (p.type === 'spitter' || p.type === 'fern') {
        p.shootT -= dt;
        if (p.shootT <= 0 && zombieAhead(p)) {
          p.shootT = def.rate;
          firePea(p, def);
          beep(500, 0.05, 'square', 0.02, 320);
        }
      } else if (p.type === 'blastcap') {
        p.armT -= dt;
        if (p.armT <= 0) explode(p, r, c);
      }
    }
  }

  for (const pea of G.peas) {
    pea.x += 320 * dt;
    for (const z of G.zombies) {
      if (z.dead || z.row !== pea.row) continue;
      if (Math.abs(z.x - pea.x) < 22) {
        z.hp -= pea.dmg;
        if (pea.slow) z.slowT = 5;
        pea.dead = true;
        beep(320, 0.04, 'triangle', 0.02);
        break;
      }
    }
  }
  G.peas = G.peas.filter(function (p) { return !p.dead && p.x < W + 20; });

  for (const z of G.zombies) {
    if (z.dead) continue;
    if (z.slowT > 0) z.slowT -= dt;
    const front = z.x - 14;
    const col = Math.floor((front - LAWN_X) / CELL_W);
    const plant = (col >= 0 && col < COLS && z.row >= 0 && z.row < ROWS) ? G.grid[z.row][col] : null;
    if (plant) {
      plant.hp -= z.dmg * dt;
      z.eating = plant;
      if (plant.hp <= 0) {
        G.grid[z.row][col] = null;
        z.eating = null;
        beep(180, 0.1, 'sawtooth', 0.03, 100);
      }
    } else {
      z.eating = null;
      const slow = z.slowT > 0 ? 0.5 : 1;
      z.x -= z.speed * slow * dt;
    }
    if (z.hp <= 0) { z.dead = true; G.killed++; }
    const m = G.mowers[z.row];
    if (m && !m.used && !m.active && z.x < LAWN_X + 8) {
      m.active = true;
      setMessage('Lawn mower!');
      beep(90, 0.4, 'sawtooth', 0.08, 40);
    }
    if (m && z.x < LAWN_X - 24 && !m.active) loseGame();
  }
  G.zombies = G.zombies.filter(function (z) { return !z.dead; });

  for (let ri = 0; ri < ROWS; ri++) {
    const m = G.mowers[ri];
    if (!m.active) continue;
    m.x += 520 * dt;
    for (const z of G.zombies) {
      if (z.dead || z.row !== ri) continue;
      if (Math.abs(z.x - m.x) < 34) { z.hp = 0; z.dead = true; G.killed++; }
    }
    if (m.x > W + 60) { m.active = false; m.used = true; }
  }

  for (const s of G.suns) {
    if (s.sky) {
      s.y += s.vy * dt;
      if (s.y >= s.targetY) { s.y = s.targetY; s.sky = false; }
    }
    if (s.life > 0) s.life -= dt;
  }
  G.suns = G.suns.filter(function (s) { return s.life > 0 && !s.got; });

  for (const e of G.explosions) { e.r += 260 * dt; e.a -= 1.6 * dt; }
  G.explosions = G.explosions.filter(function (e) { return e.a > 0; });

  if (!G.over && !G.endless && G.wave >= G.level.waves && G.zombies.length === 0) winGame();
  if (G.over) G.overT += dt;
}

function handleClick(x, y) {
  for (let i = G.buttons.length - 1; i >= 0; i--) {
    const b = G.buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.action(); return; }
  }
  if (G.state !== 'playing') return;
  for (const s of G.suns) {
    if (Math.hypot(s.x - x, s.y - y) < 34) {
      s.got = true;
      G.sun += s.value;
      beep(660, 0.06, 'sine', 0.04, 990);
      return;
    }
  }
  const cell = cellFromXY(x, y);
  if (G.shovel) {
    if (cell && G.grid[cell.row][cell.col]) {
      G.grid[cell.row][cell.col] = null;
      beep(150, 0.08, 'square', 0.03, 80);
    }
    G.shovel = false;
    return;
  }
  if (cell && G.selectedSeed) { tryPlace(cell.row, cell.col); return; }
  G.selectedSeed = null;
}

canvas.addEventListener('mousemove', function (e) {
  const r = canvas.getBoundingClientRect();
  G.mouse.x = (e.clientX - r.left) * (W / r.width);
  G.mouse.y = (e.clientY - r.top) * (H / r.height);
});
canvas.addEventListener('click', function () {
  audio();
  handleClick(G.mouse.x, G.mouse.y);
});
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    if (G.state === 'playing') G.state = 'paused';
    else if (G.state === 'paused') G.state = 'playing';
    return;
  }
  if (G.state !== 'playing') return;
  if (e.key >= '1' && e.key <= '5') { G.selectedSeed = SEED_ORDER[+e.key - 1]; G.shovel = false; }
  if (e.key === 's' || e.key === 'S') { G.shovel = !G.shovel; if (G.shovel) G.selectedSeed = null; }
  if (e.key === ' ') e.preventDefault();
});

function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function button(x, y, w, h, label, action, opts) {
  opts = opts || {};
  ctx.fillStyle = opts.bg || '#8a5a33';
  rr(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = '#4a2f18';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = opts.fg || '#fff';
  ctx.font = opts.font || 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  G.buttons.push({ x: x, y: y, w: w, h: h, action: action });
}

function drawSunIcon(x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(G.time * 0.6);
  ctx.strokeStyle = '#ffd23f';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(r + 2, 0);
    ctx.lineTo(r + 8, 0);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e0a91e';
  ctx.beginPath();
  ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function drawPacket(i) {
  const key = SEED_ORDER[i];
  const def = PLANT_TYPES[key];
  const x = 128 + i * 98, y = 6, w = 92, h = 74;
  const sel = G.selectedSeed === key;
  ctx.fillStyle = sel ? '#ffe9a8' : '#f3e2b3';
  rr(x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = sel ? '#c8860a' : '#8a6a3a';
  ctx.lineWidth = sel ? 3 : 1.5;
  ctx.stroke();
  ctx.fillStyle = def.body;
  ctx.beginPath();
  ctx.arc(x + 20, y + 22, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = def.dark;
  ctx.beginPath();
  ctx.arc(x + 20, y + 22, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2a12';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(def.name, x + 38, y + 20);
  drawSunIcon(x + 44, y + 34, 7);
  ctx.fillText(String(def.cost), x + 56, y + 38);
  ctx.font = '9px sans-serif';
  ctx.fillStyle = '#6a5638';
  const words = def.desc.split(' ');
  let line = '';
  let ly = y + 52;
  for (const wd of words) {
    if ((line + ' ' + wd).length > 16) { ctx.fillText(line, x + 6, ly); ly += 10; line = wd; }
    else line = line ? line + ' ' + wd : wd;
  }
  if (line) ctx.fillText(line, x + 6, ly);
  const rem = G.cooldowns[key] - G.time;
  if (rem > 0) {
    const frac = clamp(rem / def.cd, 0, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x + 1, y + h - 1 - (h - 2) * frac, w - 2, (h - 2) * frac);
  }
  if (G.sun < def.cost) {
    ctx.fillStyle = 'rgba(60,60,60,0.35)';
    rr(x, y, w, h, 6);
    ctx.fill();
  }
}

function drawTopbar() {
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(0, 0, W, TOPBAR_H);
  ctx.fillStyle = '#54331a';
  ctx.fillRect(0, TOPBAR_H - 6, W, 6);
  ctx.fillStyle = '#f3e2b3';
  rr(10, 8, 108, 70, 8);
  ctx.fill();
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawSunIcon(36, 43, 15);
  ctx.fillStyle = '#3a2a12';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(G.sun), 60, 44);
  for (let i = 0; i < SEED_ORDER.length; i++) drawPacket(i);
  const shX = 622, shY = 6, shW = 60, shH = 74;
  ctx.fillStyle = G.shovel ? '#ffe9a8' : '#d8c49a';
  rr(shX, shY, shW, shH, 6);
  ctx.fill();
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = G.shovel ? 3 : 1.5;
  ctx.stroke();
  ctx.fillStyle = '#7a6a4a';
  ctx.fillRect(shX + 26, shY + 12, 8, 34);
  ctx.fillStyle = '#4a4a4a';
  rr(shX + 18, shY + 44, 24, 16, 4);
  ctx.fill();
  ctx.fillStyle = '#3a2a12';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Shovel (S)', shX + shW / 2, shY + shH - 8);
  G.buttons.push({ x: shX, y: shY, w: shW, h: shH, action: function () { G.shovel = !G.shovel; if (G.shovel) G.selectedSeed = null; } });
  button(690, 6, 60, 74, 'II', function () { G.state = 'paused'; }, { font: 'bold 22px sans-serif' });
  button(758, 6, 78, 74, 'Menu', function () { G.state = 'menu'; }, { font: 'bold 14px sans-serif' });
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  rr(844, 40, 146, 16, 8);
  ctx.fill();
  let frac;
  if (G.endless) frac = (G.wave % 10) / 10;
  else frac = G.totalZombies ? clamp(G.killed / G.totalZombies, 0, 1) : 0;
  if (frac > 0) {
    ctx.fillStyle = '#ffd23f';
    rr(846, 42, 142 * frac, 12, 6);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const wtext = G.endless ? 'Wave ' + G.wave : 'Wave ' + Math.min(G.wave, G.level.waves) + '/' + G.level.waves;
  ctx.fillText(wtext, 844, 32);
}

function drawPlant(p) {
  const def = PLANT_TYPES[p.type];
  const wob = Math.sin(G.time * 3 + p.col * 1.7 + p.row) * 2;
  const x = p.x + wob * 0.4;
  const y = p.y;
  if (p.type === 'sunbloom') {
    ctx.strokeStyle = '#2f7a2a';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y + 26); ctx.lineTo(x, y + 2); ctx.stroke();
    ctx.fillStyle = def.leaf;
    ctx.beginPath(); ctx.ellipse(x - 10, y + 20, 9, 4, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 10, y + 22, 9, 4, 0.5, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + wob * 0.03;
      ctx.fillStyle = def.body;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * 15, y - 4 + Math.sin(a) * 15, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = def.dark;
    ctx.beginPath(); ctx.arc(x, y - 4, 9, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'spitter' || p.type === 'fern') {
    ctx.strokeStyle = '#2f7a2a';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y + 26); ctx.lineTo(x, y + 6); ctx.stroke();
    ctx.fillStyle = def.leaf;
    ctx.beginPath(); ctx.ellipse(x - 8, y + 22, 8, 3.5, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.body;
    ctx.beginPath(); ctx.arc(x - 2, y - 2, 16, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.dark;
    rr(x + 8, y - 8, 18, 12, 6);
    ctx.fill();
    ctx.fillStyle = '#123';
    ctx.beginPath(); ctx.arc(x - 8, y - 8, 3, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'acorn') {
    ctx.fillStyle = def.body;
    ctx.beginPath(); ctx.ellipse(x, y + 6, 18, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.dark;
    ctx.beginPath(); ctx.ellipse(x, y - 10, 18, 9, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = def.dark;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x + 4, y - 26); ctx.stroke();
  } else if (p.type === 'blastcap') {
    const danger = p.armT < 0.5;
    ctx.strokeStyle = '#2f7a2a';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y + 24); ctx.lineTo(x, y + 10); ctx.stroke();
    ctx.fillStyle = danger && Math.floor(G.time * 10) % 2 === 0 ? '#fff' : def.body;
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, y - 16); ctx.quadraticCurveTo(x + 8, y - 26, x + 12, y - 22); ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(x + 12, y - 22, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.dark;
    ctx.beginPath(); ctx.arc(x - 5, y - 5, 4, 0, Math.PI * 2); ctx.fill();
  }
  if (p.hp < p.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 20, y - 40, 40, 5);
    ctx.fillStyle = p.hp / p.maxHp > 0.4 ? '#5ad14a' : '#e0483e';
    ctx.fillRect(x - 19, y - 39, 38 * clamp(p.hp / p.maxHp, 0, 1), 3);
  }
}

function drawZombie(z) {
  const t = ZOMBIE_TYPES[z.type];
  const s = z.big ? 1.55 : 1;
  const wob = Math.sin(G.time * 6 + z.x * 0.05) * 2;
  const x = z.x;
  const y = rowY(z.row) + wob * 0.5;
  ctx.fillStyle = t.shirt;
  rr(x - 13 * s, y - 24 * s, 26 * s, 28 * s, 6 * s);
  ctx.fill();
  ctx.fillStyle = t.skin;
  ctx.beginPath(); ctx.arc(x + wob * 0.3, y - 34 * s, 12 * s, 0, Math.PI * 2); ctx.fill();
  if (t.cone) {
    ctx.fillStyle = '#e8862e';
    ctx.beginPath();
    ctx.moveTo(x - 11 * s + wob * 0.3, y - 40 * s);
    ctx.lineTo(x + 11 * s + wob * 0.3, y - 40 * s);
    ctx.lineTo(x + wob * 0.3, y - 62 * s);
    ctx.closePath(); ctx.fill();
  }
  if (t.bucket) {
    ctx.fillStyle = '#9aa0a6';
    rr(x - 12 * s + wob * 0.3, y - 56 * s, 24 * s, 18 * s, 4 * s);
    ctx.fill();
    ctx.strokeStyle = '#6a7076';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(x - 4 * s + wob * 0.3, y - 36 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5 * s + wob * 0.3, y - 36 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
  if (z.eating) {
    ctx.strokeStyle = '#5a1a1a';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + wob * 0.3, y - 28 * s, 4 * s, 0, Math.PI); ctx.stroke();
  }
  if (z.slowT > 0) {
    ctx.fillStyle = 'rgba(120,200,255,0.35)';
    ctx.beginPath(); ctx.arc(x + wob * 0.3, y - 34 * s, 14 * s, 0, Math.PI * 2); ctx.fill();
  }
  if (z.hp < z.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 20 * s, y - 54 * s, 40 * s, 5);
    ctx.fillStyle = '#e0483e';
    ctx.fillRect(x - 19 * s, y - 53 * s, 38 * s * clamp(z.hp / z.maxHp, 0, 1), 3);
  }
}

function drawMower(m, ri) {
  if (m.used) return;
  const y = rowY(ri);
  ctx.fillStyle = '#c23b2e';
  rr(m.x - 18, y - 22, 36, 20, 5);
  ctx.fill();
  ctx.fillStyle = '#7a1f16';
  rr(m.x - 6, y - 32, 14, 12, 3);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(m.x - 10, y - 2, 6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(m.x + 10, y - 2, 6, 0, Math.PI * 2); ctx.fill();
}

function drawSunToken(s) {
  const blink = s.life < 2 ? (Math.floor(G.time * 6) % 2 === 0 ? 0.4 : 1) : 1;
  ctx.globalAlpha = blink;
  drawSunIcon(s.x, s.y, 16);
  ctx.globalAlpha = 1;
}

function drawGame() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#aee2ff');
  g.addColorStop(1, '#8ed45e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (r + c) % 2 ? '#6fbf44' : '#7ecf52';
      ctx.fillRect(LAWN_X + c * CELL_W, LAWN_Y + r * CELL_H, CELL_W, CELL_H);
    }
  }
  ctx.fillStyle = '#3f7a3a';
  ctx.fillRect(RIGHT_X, LAWN_Y, W - RIGHT_X, LAWN_H);
  ctx.fillStyle = 'rgba(20,50,20,0.35)';
  for (let i = 0; i < 5; i++) {
    ctx.beginPath();
    ctx.arc(RIGHT_X + 30 + i * 38, LAWN_Y + 60 + (i * 173) % (LAWN_H - 120), 26, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#8a5a33';
  ctx.fillRect(0, LAWN_Y, LAWN_X, LAWN_H);
  ctx.fillStyle = '#c9a06a';
  ctx.fillRect(12, LAWN_Y + 40, 64, LAWN_H - 80);
  ctx.fillStyle = '#a33b2a';
  ctx.beginPath();
  ctx.moveTo(4, LAWN_Y + 44);
  ctx.lineTo(44, LAWN_Y + 6);
  ctx.lineTo(84, LAWN_Y + 44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#6e4520';
  ctx.fillRect(34, LAWN_Y + LAWN_H - 110, 22, 60);
  ctx.fillStyle = '#aee2ff';
  ctx.fillRect(20, LAWN_Y + 60, 18, 18);
  ctx.fillRect(52, LAWN_Y + 60, 18, 18);
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.fillRect(LAWN_X - 2, LAWN_Y, 4, LAWN_H);
  for (let ri = 0; ri < ROWS; ri++) drawMower(G.mowers[ri], ri);
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = G.grid[r][c];
      if (p) drawPlant(p);
    }
  }
  const sorted = G.zombies.slice().sort(function (a, b) { return a.row - b.row; });
  for (const z of sorted) drawZombie(z);
  for (const pea of G.peas) {
    ctx.fillStyle = pea.slow ? '#bfeaff' : '#3fae4a';
    ctx.beginPath();
    ctx.arc(pea.x, pea.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const e of G.explosions) {
    ctx.globalAlpha = clamp(e.a, 0, 1);
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
  for (const s of G.suns) drawSunToken(s);
  if (G.state === 'playing') {
    const cell = cellFromXY(G.mouse.x, G.mouse.y);
    if (cell && G.selectedSeed) {
      const def = PLANT_TYPES[G.selectedSeed];
      const ok = !G.grid[cell.row][cell.col] && G.sun >= def.cost && G.cooldowns[G.selectedSeed] <= G.time;
      ctx.fillStyle = ok ? 'rgba(255,255,255,0.35)' : 'rgba(255,60,60,0.3)';
      ctx.fillRect(LAWN_X + cell.col * CELL_W, LAWN_Y + cell.row * CELL_H, CELL_W, CELL_H);
      ctx.strokeStyle = ok ? '#fff' : '#e0483e';
      ctx.lineWidth = 2;
      ctx.strokeRect(LAWN_X + cell.col * CELL_W + 1, LAWN_Y + cell.row * CELL_H + 1, CELL_W - 2, CELL_H - 2);
    }
  }
  drawTopbar();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, H - 26, W, 26);
  ctx.fillStyle = '#d8e8c8';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Keys 1-5: pick seed   S: shovel   Esc: pause   Click sun to collect', 12, H - 13);
  if (G.message && G.messageT > 0) {
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    const tw = ctx.measureText(G.message).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    rr(W / 2 - tw / 2 - 16, LAWN_Y + 14, tw + 32, 36, 10);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(G.message, W / 2, LAWN_Y + 33);
  }
}

function drawMenu() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#7ec8ff');
  g.addColorStop(0.6, '#a8e06a');
  g.addColorStop(1, '#5aa843');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc((i * 137) % W, (i * 89) % (H * 0.5), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#2c4a1e';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('GARDEN GUARDIANS', W / 2, 150);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#3a5a2a';
  ctx.fillText('An original lane-defense game: defend your yard from the shambling horde.', W / 2, 205);
  drawSunIcon(W / 2 - 260, 150, 26);
  drawSunIcon(W / 2 + 260, 150, 26);
  button(W / 2 - 130, 270, 260, 56, 'Adventure', function () { G.state = 'levels'; });
  button(W / 2 - 130, 342, 260, 56, 'Endless Yard', function () { startEndless(); });
  button(W / 2 - 130, 414, 260, 56, 'How to Play', function () { G.state = 'help'; });
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.font = '13px sans-serif';
  ctx.fillText('All code, art and names are original. Runs entirely in your browser.', W / 2, H - 30);
}

function drawLevels() {
  ctx.fillStyle = '#2c4a1e';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#d8e8c8';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Choose a Level', W / 2, 80);
  for (let i = 0; i < LEVELS.length; i++) {
    const L = LEVELS[i];
    const done = G.completed.indexOf(i) >= 0;
    const y = 150 + i * 90;
    button(W / 2 - 220, y, 440, 70, (done ? '✓ ' : '') + L.name + '  (' + L.waves + ' waves)', function (idx) { return function () { startLevel(idx); }; }(i), { font: 'bold 20px sans-serif', bg: done ? '#5a8a3a' : '#8a5a33' });
  }
  button(W / 2 - 90, H - 90, 180, 50, 'Back', function () { G.state = 'menu'; });
}

function drawHelp() {
  ctx.fillStyle = '#22351c';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8f0dc';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('How to Play', 80, 80);
  ctx.font = '18px sans-serif';
  const lines = [
    'Goal: stop the shambling horde from reaching your house on the left.',
    '',
    '• Sun falls from the sky — click it to collect. Sunblooms produce extra sun.',
    '• Click a seed packet (or press 1-5), then click a lawn tile to plant it.',
    '• Each packet costs sun and needs time to recharge before reuse.',
    '• Seed Spitter fires down its lane. Frost Fern slows zombies. Acorn Wall blocks.',
    '• Blastcap explodes a 3x3 area after a short fuse.',
    '• If a zombie reaches your house, that lane\'s mower fires once — then it\'s gone.',
    '• If a zombie gets past with no mower left, your garden is overrun.',
    '',
    'Keys: 1-5 select seed, S toggles shovel (click a plant to remove), Esc pauses.'
  ];
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], 80, 130 + i * 34);
  button(W / 2 - 90, H - 80, 180, 50, 'Back', function () { G.state = 'menu'; });
}

function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Paused', W / 2, H / 2 - 90);
  button(W / 2 - 110, H / 2 - 30, 220, 52, 'Resume', function () { G.state = 'playing'; });
  button(W / 2 - 110, H / 2 + 36, 220, 52, 'Restart', function () { restart(); });
  button(W / 2 - 110, H / 2 + 102, 220, 52, 'Menu', function () { G.state = 'menu'; });
}

function drawOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (G.won) {
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 46px sans-serif';
    ctx.fillText('Yard Defended!', W / 2, H / 2 - 120);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#d8e8c8';
    const secs = Math.floor(G.time);
    ctx.fillText('Time: ' + Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2) + '   Zombies stopped: ' + G.killed, W / 2, H / 2 - 70);
    const hasNext = !G.endless && G.levelIndex + 1 < LEVELS.length;
    if (hasNext) button(W / 2 - 120, H / 2 - 10, 240, 52, 'Next Level', function () { startLevel(G.levelIndex + 1); });
    else button(W / 2 - 120, H / 2 - 10, 240, 52, 'Replay', function () { restart(); });
    button(W / 2 - 120, H / 2 + 56, 240, 52, 'Menu', function () { G.state = 'menu'; });
  } else {
    ctx.fillStyle = '#ff8a7a';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('The horde overran your garden!', W / 2, H / 2 - 120);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#d8e8c8';
    if (G.endless) ctx.fillText('You survived ' + G.wave + ' waves and stopped ' + G.killed + ' zombies.', W / 2, H / 2 - 70);
    else ctx.fillText('Zombies stopped: ' + G.killed + ' of ' + G.totalZombies, W / 2, H / 2 - 70);
    button(W / 2 - 120, H / 2 - 10, 240, 52, 'Try Again', function () { restart(); });
    button(W / 2 - 120, H / 2 + 56, 240, 52, 'Menu', function () { G.state = 'menu'; });
  }
}

function render() {
  G.buttons = [];
  ctx.clearRect(0, 0, W, H);
  if (G.state === 'menu') drawMenu();
  else if (G.state === 'levels') drawLevels();
  else if (G.state === 'help') drawHelp();
  else {
    drawGame();
    if (G.state === 'paused') drawPause();
    else if (G.state === 'over') drawOver();
  }
}

let last = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  if (G.state === 'playing') update(dt);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
