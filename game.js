'use strict';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width;
const H = canvas.height;

const COLS = 9;
const ROWS = 5;
const CELL_W = 90;
const CELL_H = 104;
const LAWN_X = 100;
const LAWN_Y = 112;
const LAWN_W = COLS * CELL_W;
const LAWN_H = ROWS * CELL_H;
const RIGHT_X = LAWN_X + LAWN_W;
const TOPBAR_H = 100;
const BOTTOM_Y = LAWN_Y + LAWN_H;

const G = {
  state: 'menu',
  levelIndex: -1,
  endless: false,
  level: null,
  seedList: [],
  time: 0,
  sun: 150,
  grid: [],
  zombies: [],
  projectiles: [],
  suns: [],
  particles: [],
  floaters: [],
  rings: [],
  mowers: [],
  cooldowns: {},
  wave: 0,
  nextWaveT: 0,
  totalZombies: 0,
  spawnedZombies: 0,
  killed: 0,
  mowersLost: 0,
  selectedSeed: null,
  shovel: false,
  mouse: { x: -1, y: -1 },
  message: null,
  messageT: 0,
  banner: null,
  bannerT: 0,
  skySunT: 4,
  over: false,
  won: false,
  overT: 0,
  buttons: [],
  shake: 0,
  hoverPacket: -1,
  save: { completed: {}, unlocked: [], settings: { mute: false, speed: 1 } }
};

const SAVE_KEY = 'gg_save_v2';
function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (s && s.settings && s.completed) G.save = s;
  } catch (e) { }
}
function persist() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.save)); } catch (e) { }
}
loadSave();

let AC = null;
function audio() {
  if (!AC) {
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; }
  }
  return AC;
}
function beep(freq, dur, type, vol, slide) {
  if (G.save.settings.mute) return;
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
function rowY(row) { return LAWN_Y + row * CELL_H + CELL_H * 0.68; }
function colOfZombie(z) { return Math.floor((z.x - 16 - LAWN_X) / CELL_W); }

function setMessage(t) { G.message = t; G.messageT = 2.4; }
function setBanner(t, big) { G.banner = t; G.bannerT = big ? 3.2 : 2.0; G.bannerBig = !!big; }

function addParticles(x, y, n, color, spd, size, grav) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const v = rand(spd * 0.3, spd);
    G.particles.push({
      x: x, y: y,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v - spd * 0.3,
      life: rand(0.4, 0.9), maxLife: 0.9,
      color: color, size: rand(size * 0.5, size), grav: grav === undefined ? 300 : grav
    });
  }
}
function addFloater(x, y, text, color) {
  G.floaters.push({ x: x, y: y, vy: -40, life: 1.1, text: text, color: color || '#fff' });
}

function resetField() {
  G.time = 0;
  G.grid = [];
  for (let r = 0; r < ROWS; r++) G.grid.push(new Array(COLS).fill(null));
  G.zombies = [];
  G.projectiles = [];
  G.suns = [];
  G.particles = [];
  G.floaters = [];
  G.rings = [];
  G.mowers = [];
  for (let r = 0; r < ROWS; r++) G.mowers.push({ x: LAWN_X - 40, used: false, active: false });
  G.wave = 0;
  G.spawnedZombies = 0;
  G.killed = 0;
  G.mowersLost = 0;
  G.selectedSeed = null;
  G.shovel = false;
  G.message = null;
  G.messageT = 0;
  G.banner = null;
  G.bannerT = 0;
  G.skySunT = 5;
  G.over = false;
  G.won = false;
  G.overT = 0;
  G.shake = 0;
  G.hoverPacket = -1;
  G.cooldowns = {};
  for (const k of SEED_ORDER) G.cooldowns[k] = 0;
}

function waveCount(w) {
  const L = G.level;
  if (L.endless) {
    if (w % 10 === 0) return 12 + w;
    return Math.min(2 + Math.floor(w * 0.9), 10);
  }
  if (w === L.waves) return L.finalCount;
  return Math.max(1, Math.round(w * L.waveSize + (G.levelIndex >= 0 ? G.levelIndex * 0.5 : 0)));
}

function wavePool(w) {
  const L = G.level;
  if (L.endless) {
    const pool = ['shambler', 'shambler', 'pylonhead'];
    if (w >= 3) pool.push('dasher');
    if (w >= 5) pool.push('pylonhead', 'tinhead', 'howler');
    if (w >= 8) pool.push('screenback', 'leaper', 'tinhead');
    if (w >= 11) pool.push('rusher', 'goliath');
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
  G.seedList = G.level.seeds.slice();
  resetField();
  G.sun = G.level.startSun;
  G.nextWaveT = 20;
  buildTotals();
  G.state = 'playing';
}

function startEndless() {
  G.levelIndex = -1;
  G.endless = true;
  G.level = { name: 'Endless Yard', endless: true, day: true, waveInterval: 11, startSun: 150, skyEvery: 9 };
  const unlocked = ['sunbloom', 'spitter', 'acorn'];
  for (const k of G.save.unlocked) if (unlocked.indexOf(k) < 0) unlocked.push(k);
  G.seedList = unlocked;
  resetField();
  G.sun = G.level.startSun;
  G.nextWaveT = 20;
  G.totalZombies = Infinity;
  G.state = 'playing';
}

function restart() {
  if (G.endless) startEndless();
  else startLevel(G.levelIndex);
}

function levelUnlocked(i) {
  if (i === 0) return true;
  return !!G.save.completed[i - 1];
}

function spawnZombie(typeKey, row) {
  const t = ZOMBIE_TYPES[typeKey];
  G.zombies.push({
    type: typeKey,
    row: row,
    x: RIGHT_X + rand(40, 330),
    hp: t.hp,
    maxHp: t.hp + (t.armor || 0),
    armor: t.armor || 0,
    armorMax: t.armor || 0,
    speed: t.speed * rand(0.92, 1.08),
    dmg: t.dmg,
    slowT: 0,
    eating: null,
    dead: false,
    dying: 0,
    big: !!t.big,
    jumped: false,
    enraged: false,
    leapT: 0,
    phase: rand(0, 6.28)
  });
}

function spawnWave() {
  G.wave++;
  const w = G.wave;
  const count = waveCount(w);
  const pool = wavePool(w);
  for (let i = 0; i < count; i++) spawnZombie(choice(pool), irand(0, ROWS - 1));
  G.spawnedZombies += count;
  const finalWave = !G.endless && w === G.level.waves;
  if (finalWave) {
    setBanner('FINAL WAVE!', true);
    setMessage('A huge wave is approaching!');
    beep(110, 0.6, 'sawtooth', 0.07, 50);
  } else {
    setBanner('Wave ' + w, false);
    if (w % 5 === 0) beep(440, 0.15, 'square', 0.04);
  }
}

function zombieAhead(p) {
  for (const z of G.zombies) {
    if (!z.dead && z.row === p.row && z.x > p.x - 12) return true;
  }
  return false;
}

function firstZombieInRow(row, minX) {
  let best = null;
  for (const z of G.zombies) {
    if (z.dead || z.row !== row || z.x <= minX) continue;
    if (!best || z.x < best.x) best = z;
  }
  return best;
}

function fireProjectile(p, def) {
  if (def.arc) {
    const target = firstZombieInRow(p.row, p.x);
    if (!target) return;
    const tx = target.x + 24;
    G.projectiles.push({
      kind: 'melon', row: p.row,
      x: p.x + 34, y: rowY(p.row) - 12, x0: p.x + 34, tx: tx,
      dmg: def.dmg, splash: def.splash || 0, dead: false
    });
    p.recoil = 0.25;
    beep(240, 0.12, 'triangle', 0.04, 120);
  } else {
    const burst = def.burst || 1;
    for (let i = 0; i < burst; i++) {
      G.projectiles.push({
        kind: 'pea', row: p.row,
        x: p.x + 28 + i * 16, y: p.y - 8,
        dmg: def.dmg, slow: def.slow || 0, dead: false
      });
    }
    p.recoil = 0.12;
    beep(520, 0.05, 'square', 0.02, 330);
  }
}

function damageZombie(z, dmg, slow) {
  if (z.dead) return;
  if (z.armor > 0) {
    z.armor -= dmg;
    if (z.armor < 0) { z.hp += z.armor; z.armor = 0; addFloater(z.x, rowY(z.row) - 60, 'crack!', '#ffd23f'); }
  } else {
    z.hp -= dmg;
  }
  if (slow) z.slowT = Math.max(z.slowT, slow);
  addParticles(z.x, rowY(z.row) - 30, 3, slow ? '#bfeaff' : '#9adf6a', 90, 4, 200);
  if (z.hp <= 0) {
    z.dead = true;
    z.dying = 0.7;
    G.killed++;
    addParticles(z.x, rowY(z.row) - 30, 14, '#8aa06a', 160, 5, 300);
    beep(200, 0.08, 'triangle', 0.03, 90);
  }
}

function explodeAt(r, c, dmg, radius) {
  const ctr = cellCenter(r, c);
  G.rings.push({ x: ctr.x, y: ctr.y, r: 12, a: 1 });
  G.shake = Math.max(G.shake, radius > 0 ? 10 : 6);
  addParticles(ctr.x, ctr.y, 26, '#ff9a3c', 260, 7, 250);
  addParticles(ctr.x, ctr.y, 12, '#ffe08a', 180, 5, 200);
  for (const z of G.zombies) {
    if (z.dead) continue;
    const zc = colOfZombie(z);
    if (Math.abs(z.row - r) <= radius && Math.abs(zc - c) <= radius) damageZombie(z, dmg, 0);
  }
  beep(70, 0.5, 'sawtooth', 0.09, 30);
}

function clearLane(r, dmg) {
  for (let i = 0; i < 14; i++) {
    addParticles(LAWN_X + rand(0, LAWN_W), rowY(r) + rand(-20, 10), 3, i % 2 ? '#ff9a3c' : '#ffd23f', 120, 6, -60);
  }
  G.rings.push({ x: LAWN_X + LAWN_W / 2, y: rowY(r), r: 20, a: 1, wide: true });
  G.shake = Math.max(G.shake, 12);
  for (const z of G.zombies) {
    if (!z.dead && z.row === r) damageZombie(z, dmg, 0);
  }
  beep(80, 0.7, 'sawtooth', 0.09, 35);
}

function spawnSunAt(x, y, value, night) {
  G.suns.push({ x: x + rand(-8, 8), y: y - 26, vy: 0, targetY: y - 26, value: value, life: 10, sky: false, got: false, fly: false, night: !!night });
}

function tryPlace(row, col) {
  const key = G.selectedSeed;
  if (!key || G.seedList.indexOf(key) < 0) return;
  const def = PLANT_TYPES[key];
  if (G.grid[row][col]) { beep(140, 0.08, 'square', 0.03, 90); return; }
  if (G.cooldowns[key] > G.time) { beep(140, 0.08, 'square', 0.03, 90); return; }
  if (G.sun < def.cost) { beep(140, 0.08, 'square', 0.03, 90); return; }
  const ctr = cellCenter(row, col);
  G.grid[row][col] = {
    type: key, row: row, col: col, x: ctr.x, y: ctr.y,
    hp: def.hp, maxHp: def.hp,
    sunT: def.sunEvery ? def.sunEvery * 0.5 : 0,
    shootT: 0.5,
    armT: def.armDelay || 0,
    armed: false,
    state: 'ready',
    chewT: 0,
    recoil: 0
  };
  G.sun -= def.cost;
  G.cooldowns[key] = G.time + def.cd;
  addParticles(ctr.x, ctr.y, 8, '#c8e89a', 120, 5, 250);
  beep(220, 0.09, 'square', 0.04, 140);
}

function winGame() {
  if (G.over) return;
  G.over = true;
  G.won = true;
  G.overT = 0;
  G.state = 'over';
  if (!G.endless && G.levelIndex >= 0) {
    const stars = G.mowersLost === 0 ? 2 : 1;
    const prev = G.save.completed[G.levelIndex] || 0;
    if (stars > prev) G.save.completed[G.levelIndex] = stars;
    for (const k of G.level.seeds) {
      if (G.save.unlocked.indexOf(k) < 0) G.save.unlocked.push(k);
    }
    persist();
  }
  beep(523, 0.12, 'square', 0.05);
  setTimeout(function () { beep(659, 0.12, 'square', 0.05); }, 130);
  setTimeout(function () { beep(784, 0.22, 'square', 0.05); }, 260);
  setTimeout(function () { beep(1046, 0.3, 'square', 0.05); }, 400);
}

function loseGame() {
  if (G.over) return;
  G.over = true;
  G.won = false;
  G.overT = 0;
  G.state = 'over';
  G.shake = 14;
  beep(300, 0.3, 'sawtooth', 0.07, 120);
  setTimeout(function () { beep(200, 0.3, 'sawtooth', 0.07, 80); }, 250);
  setTimeout(function () { beep(120, 0.5, 'sawtooth', 0.07, 50); }, 500);
}

function update(dt) {
  G.time += dt;
  if (G.messageT > 0) G.messageT -= dt;
  if (G.bannerT > 0) G.bannerT -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 22);

  const night = G.level && !G.level.day;
  G.skySunT -= dt;
  if (G.skySunT <= 0) {
    G.skySunT = G.level.skyEvery * rand(0.8, 1.2);
    G.suns.push({
      x: rand(LAWN_X + 30, RIGHT_X - 30), y: LAWN_Y - 34, vy: 36,
      targetY: rand(LAWN_Y + 50, LAWN_Y + LAWN_H - 50),
      value: 25, life: 9, sky: true, got: false, fly: false, night: night
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
      if (p.recoil > 0) p.recoil -= dt;
      if (p.type === 'sunbloom') {
        p.sunT -= dt;
        if (p.sunT <= 0) {
          p.sunT = def.sunEvery;
          spawnSunAt(p.x, p.y, def.sunAmount, night);
          beep(880, 0.08, 'sine', 0.03);
        }
      } else if (p.type === 'spitter' || p.type === 'doublespitter' || p.type === 'fern' || p.type === 'melonlob') {
        p.shootT -= dt;
        if (p.shootT <= 0 && zombieAhead(p)) {
          p.shootT = def.rate;
          fireProjectile(p, def);
        }
      } else if (p.type === 'thistle') {
        for (const z of G.zombies) {
          if (z.dead || z.row !== r || colOfZombie(z) !== c) continue;
          damageZombie(z, def.dps * dt, 0);
        }
      } else if (p.type === 'tubertrap') {
        if (!p.armed) {
          p.armT -= dt;
          if (p.armT <= 0) { p.armed = true; beep(660, 0.1, 'sine', 0.04, 880); }
        } else {
          for (const z of G.zombies) {
            if (z.dead || z.row !== r || colOfZombie(z) !== c) continue;
            G.grid[r][c] = null;
            explodeAt(r, c, def.dmg, def.radius);
            break;
          }
        }
      } else if (p.type === 'blastcap') {
        p.armT -= dt;
        if (p.armT <= 0) {
          G.grid[r][c] = null;
          explodeAt(r, c, def.dmg, def.radius);
        }
      } else if (p.type === 'blazereed') {
        p.armT -= dt;
        if (p.armT <= 0) {
          G.grid[r][c] = null;
          clearLane(r, def.dmg);
        }
      } else if (p.type === 'gnasher') {
        if (p.state === 'chewing') {
          p.chewT -= dt;
          if (p.chewT <= 0) { p.state = 'ready'; addFloater(p.x, p.y - 50, 'ready', '#9adf6a'); }
        } else {
          for (const z of G.zombies) {
            if (z.dead || z.row !== r || colOfZombie(z) !== c) continue;
            z.dead = true;
            z.dying = 0.5;
            G.killed++;
            p.state = 'chewing';
            p.chewT = def.chew;
            addParticles(p.x, p.y - 20, 16, '#c94f6d', 180, 5, 250);
            addFloater(p.x, p.y - 56, 'CHOMP!', '#ff8a7a');
            beep(160, 0.2, 'sawtooth', 0.06, 60);
            break;
          }
        }
      }
    }
  }

  for (const pr of G.projectiles) {
    if (pr.dead) continue;
    if (pr.kind === 'pea') {
      pr.x += 340 * dt;
      for (const z of G.zombies) {
        if (z.dead || z.row !== pr.row) continue;
        if (Math.abs(z.x - pr.x) < 22) {
          damageZombie(z, pr.dmg, pr.slow);
          pr.dead = true;
          beep(320, 0.04, 'triangle', 0.02);
          break;
        }
      }
      if (pr.x > W + 30) pr.dead = true;
    } else if (pr.kind === 'melon') {
      pr.x += 300 * dt;
      let hit = null;
      for (const z of G.zombies) {
        if (z.dead || z.row !== pr.row) continue;
        if (Math.abs(z.x - pr.x) < 26) { hit = z; break; }
      }
      if (hit || pr.x >= pr.tx) {
        pr.dead = true;
        const ir = pr.row;
        const ic = clamp(Math.floor((pr.x - LAWN_X) / CELL_W), 0, COLS - 1);
        explodeAt(ir, ic, pr.dmg, 1);
        for (const z of G.zombies) {
          if (z.dead || z.row !== pr.row || colOfZombie(z) !== ic) continue;
          damageZombie(z, pr.splash, 0);
        }
      }
    }
  }
  G.projectiles = G.projectiles.filter(function (p) { return !p.dead; });

  for (const z of G.zombies) {
    if (z.dead) {
      if (z.dying > 0) z.dying -= dt;
      continue;
    }
    if (z.slowT > 0) z.slowT -= dt;
    if (z.leapT > 0) z.leapT -= dt;
    const t = ZOMBIE_TYPES[z.type];
    if (t.enrage && !z.enraged && z.armor <= 0 && z.hp < (z.maxHp - z.armorMax) * 0.5) {
      z.enraged = true;
      z.speed *= t.enrage;
      addFloater(z.x, rowY(z.row) - 70, 'ENRAGED!', '#ff6a5a');
      beep(180, 0.15, 'sawtooth', 0.05, 320);
    }
    const col = colOfZombie(z);
    const plant = (col >= 0 && col < COLS) ? G.grid[z.row][col] : null;
    if (plant && t.leap && !z.jumped) {
      z.jumped = true;
      z.leapT = 0.45;
      z.x -= CELL_W + 6;
      addFloater(z.x, rowY(z.row) - 70, 'boing!', '#9adf6a');
      beep(500, 0.12, 'square', 0.04, 700);
    } else if (plant) {
      plant.hp -= z.dmg * dt;
      z.eating = plant;
      if (plant.hp <= 0) {
        G.grid[z.row][col] = null;
        z.eating = null;
        addParticles(z.x - 10, rowY(z.row) - 20, 10, '#b08a5a', 140, 5, 250);
        if (PLANT_TYPES[plant.type].diverte) {
          const oldRow = z.row;
          let nr = oldRow;
          while (nr === oldRow) nr = irand(0, ROWS - 1);
          z.row = nr;
          setMessage('The zombie changed lanes!');
          addFloater(z.x, rowY(nr) - 70, 'diverted!', '#d8b8e8');
          beep(700, 0.12, 'sine', 0.05, 900);
        } else {
          beep(180, 0.1, 'sawtooth', 0.03, 100);
        }
      }
    } else {
      z.eating = null;
      const slow = z.slowT > 0 ? 0.5 : 1;
      z.x -= z.speed * slow * dt;
    }
    const m = G.mowers[z.row];
    if (m && !m.used && !m.active && z.x < LAWN_X + 8) {
      m.active = true;
      G.mowersLost++;
      setMessage('Lawn mower!');
      G.shake = Math.max(G.shake, 8);
      addParticles(m.x + 20, rowY(z.row), 12, '#c8c8c8', 160, 4, 200);
      beep(90, 0.4, 'sawtooth', 0.08, 40);
    }
    if (m && z.x < LAWN_X - 26 && !m.active) loseGame();
  }
  G.zombies = G.zombies.filter(function (z) { return z.dead ? z.dying > 0 : true; });

  for (let ri = 0; ri < ROWS; ri++) {
    const m = G.mowers[ri];
    if (!m.active) continue;
    m.x += 560 * dt;
    if (Math.floor(G.time * 20) % 2 === 0) addParticles(m.x - 14, rowY(ri) + 6, 1, '#a8a8a8', 60, 3, 100);
    for (const z of G.zombies) {
      if (z.dead || z.row !== ri) continue;
      if (Math.abs(z.x - m.x) < 36) {
        z.dead = true;
        z.dying = 0.4;
        G.killed++;
        addParticles(z.x, rowY(ri) - 30, 10, '#8aa06a', 150, 5, 250);
      }
    }
    if (m.x > W + 60) { m.active = false; m.used = true; }
  }

  for (const s of G.suns) {
    if (s.fly) {
      const dx = 65 - s.x, dy = 50 - s.y;
      const d = Math.hypot(dx, dy);
      if (d < 24) {
        s.got = true;
        G.sun += s.value;
        addFloater(70, 60, '+' + s.value, '#ffd23f');
        beep(660, 0.06, 'sine', 0.04, 990);
      } else {
        s.x += dx / d * 620 * dt;
        s.y += dy / d * 620 * dt;
      }
    } else if (s.sky) {
      s.y += s.vy * dt;
      if (s.y >= s.targetY) { s.y = s.targetY; s.sky = false; }
    }
    if (!s.fly && s.life > 0) s.life -= dt;
  }
  G.suns = G.suns.filter(function (s) { return s.life > 0 && !s.got; });

  for (const p of G.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.grav * dt;
  }
  G.particles = G.particles.filter(function (p) { return p.life > 0; });
  for (const f of G.floaters) { f.life -= dt; f.y += f.vy * dt; }
  G.floaters = G.floaters.filter(function (f) { return f.life > 0; });
  for (const e of G.rings) { e.r += (e.wide ? 900 : 420) * dt; e.a -= 1.8 * dt; }
  G.rings = G.rings.filter(function (e) { return e.a > 0; });

  if (!G.over && !G.endless && G.wave >= G.level.waves && !G.zombies.some(function (z) { return !z.dead; })) winGame();
  if (G.over) G.overT += dt;
}

function handleClick(x, y) {
  for (let i = G.buttons.length - 1; i >= 0; i--) {
    const b = G.buttons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.action(); return; }
  }
  if (G.state !== 'playing') return;
  for (const s of G.suns) {
    if (Math.hypot(s.x - x, s.y - y) < 38) { s.fly = true; return; }
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

function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: (cx - r.left) * (W / r.width), y: (cy - r.top) * (H / r.height) };
}
canvas.addEventListener('mousemove', function (e) {
  const p = canvasPos(e);
  G.mouse.x = p.x;
  G.mouse.y = p.y;
});
canvas.addEventListener('click', function (e) {
  audio();
  const p = canvasPos(e);
  G.mouse.x = p.x;
  G.mouse.y = p.y;
  handleClick(p.x, p.y);
});
canvas.addEventListener('touchstart', function (e) {
  e.preventDefault();
  audio();
  const p = canvasPos(e);
  G.mouse.x = p.x;
  G.mouse.y = p.y;
  handleClick(p.x, p.y);
}, { passive: false });
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' || e.code === 'Space') {
    if (G.state === 'playing') { G.state = 'paused'; e.preventDefault(); }
    else if (G.state === 'paused') G.state = 'playing';
    return;
  }
  if (G.state !== 'playing') return;
  const digitKeys = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal'];
  const di = digitKeys.indexOf(e.code);
  if (di >= 0 && di < G.seedList.length) { G.selectedSeed = G.seedList[di]; G.shovel = false; }
  if (e.code === 'KeyS') { G.shovel = !G.shovel; if (G.shovel) G.selectedSeed = null; }
});

let last = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  if (G.state === 'playing') update(dt * G.save.settings.speed);
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
