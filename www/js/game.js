// Bloomguard — core game engine (simulation, input and rendering on a 1280x720 logical canvas).
import { COLS, ROWS, GUARDIANS, ROTLINGS, WORLDS, LEVELS, LANTERNS, UPGRADE_MAX, BOSS_TITLES } from './data.js';
import {
  drawGuardian, drawRotling, drawLantern, drawGlowMote, drawWildseed, drawFirefly, drawCrystal, drawBee, drawBoulder,
  drawBackdrop, drawGroundDetails, makeDecor, makeBoardTexture, drawClouds,
} from './art.js';
import { sfx } from './audio.js';
import { entryFor } from './sprites.js';

export const W = 1280, H = 720;
const BX = 150, BY = 122, TW = 112, TH = 118;
const BOARD_R = BX + COLS * TW;
const BOARD_B = BY + ROWS * TH;
const CARD_X = 124, CARD_H = 100, CARD_Y = 6, CARD_GAP = 6;
const STEP = 1 / 60;
const NON_BOSS = ['grub', 'swarm', 'skitter', 'shellback', 'moth', 'shieldbug', 'burrower', 'rotcrab', 'spitter', 'spore', 'emberbeast', 'frostcrawler', 'crystalback', 'rotpriest', 'brute'];
const BOSSES = ['grubmother', 'bogmaw', 'cinderhusk', 'rimefang', 'gloomwyrm', 'monarch'];

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const colX = (c) => BX + c * TW + TW / 2;
const rowY = (r) => BY + (r + 1) * TH - 10;
const pow = (lvl) => Math.pow(1.45, lvl - 1);
const hpMul = (lvl) => Math.pow(1.35, lvl - 1);

export class Game {
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts;
    this.ranks = opts.ranks || {};
    this.endless = opts.level === 'endless';
    this.custom = typeof opts.level === 'object' && opts.level !== null;
    this.levelIndex = this.endless ? -1 : this.custom ? -2 : opts.level;
    this.level = this.endless
      ? { world: 0, waves: Infinity, pool: ['grub', 'skitter'], budget: 4, goal: 'defend', endless: true }
      : this.custom ? { ...opts.level } : LEVELS[opts.level];
    this.potluck = this.level.mode === 'potluck';
    this.mods = new Set(this.level.mods || []);
    if (this.mods.has('frenzy')) this.level.waves += 2;
    this.boosts = opts.boosts || {};
    this.cosmetics = opts.cosmetics || {};
    this.maxSeeds = 3 + (this.boosts.pouch || 0);
    this.goal = this.potluck ? 'potluck' : this.level.goal || 'defend';
    this.setWorld(this.level.world);
    this.activeRows = this.level.rows || [0, 1, 2, 3, 4];
    this.loadout = this.potluck ? [] : (this.goal === 'given' ? this.level.given : opts.loadout).slice();
    if (this.goal === 'budget') this.loadout = this.loadout.filter((k) => GUARDIANS[k].kind !== 'producer');
    this._layoutCards();
    this.autoCollect = !!opts.autoCollect;

    this.time = 0;
    this.glow = (this.level.startGlow || (this.world.mech === 'night' || this.world.mech === 'crystal' ? 200 : 150)) + 50 * (this.boosts.headstart || 0);
    if (this.potluck) this.glow = 0;
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.tiles = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ frozen: 0, crystal: false, scorch: 0, warn: 0, blight: false, cleanse: 0 })));
    this.enemies = [];
    this.corpses = [];
    this.shots = [];
    this.spits = [];
    this.boulders = [];
    this.motes = [];
    this.pickups = [];
    this.fireflies = [];
    this.particles = [];
    this.weather = [];
    this.texts = [];
    this.clouds = [];
    this.bolts = [];
    this.strikes = [];
    this.lanterns = this.level.lanterns || LANTERNS;
    this.seeds = this.boosts.lanternoil ? 1 : 0;
    this.seedMeter = 0;
    this.seedMode = false;
    this.empower = 0;
    this.blizzard = 0;
    this.speed = 1;
    this.paused = false;
    this.ended = false;
    this.selected = -1;
    this.shovel = false;
    this.hover = null;
    this.banner = null;
    this.shake = 0;
    this.gust = 0;
    this.stats = { kills: 0, planted: 0, lost: 0, spent: 0, overblooms: 0, threeStar: false };
    this.cooldowns = this.loadout.map((k) => (GUARDIANS[k].recharge >= 20 ? GUARDIANS[k].recharge * 0.5 : 0));

    this.wave = 0;
    this.spawnQueue = [];
    this.nextWave = this.levelIndex === 0 ? 22 : 24;
    this.hint = this.levelIndex === 0 ? 0 : -1;
    this.timers = { sky: 5, firefly: 4, ember: 20, blizzard: 26, crystal: 18, blight: 28, gust: 18 };

    this._setupWorldTiles();
    if (this.potluck) this._setupPots();
    this.boardTex = makeBoardTexture(this.world, COLS, ROWS, TW, TH, this.activeRows);
    if (this.goal === 'sprouts') {
      const rows = [this.activeRows[0], this.activeRows[Math.floor(this.activeRows.length / 2)], this.activeRows[this.activeRows.length - 1]];
      for (const r of new Set(rows)) this.grid[r][0] = this._makeGuardian('sprout', r, 0);
    }

    this._loop = this._loop.bind(this);
    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);
    this._onResize = this.resize.bind(this);
    canvas.addEventListener('pointerdown', this._onDown);
    canvas.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
    window.addEventListener('resize', this._onResize);
    this.resize();
    this.last = performance.now();
    this.acc = 0;
    this.raf = requestAnimationFrame(this._loop);
    const goalText = { sprouts: 'Protect the sprouts!', budget: 'No Glow income: spend wisely!', given: 'Use the guardians you are given!', potluck: 'Smash the pots! Plant what you find.' }[this.goal];
    const title = this.endless ? 'Endless Bloom' : this.potluck ? this.level.name : this.level.daily ? 'Daily Challenge' : `${this.world.name} ${(this.levelIndex % 6) + 1}`;
    this.showBanner(`${title}${goalText ? ' — ' + goalText : ''}`, 3);
  }

  setWorld(i) {
    this.worldIndex = i;
    this.world = WORLDS[i];
    this.decor = makeDecor(this.world, { W, H, BX, BY, BR: BOARD_R, BB: BOARD_B });
    if (this.activeRows) this.boardTex = makeBoardTexture(this.world, COLS, ROWS, TW, TH, this.activeRows);
  }

  _layoutCards() {
    this.cardW = Math.min(96, Math.floor((W - CARD_X - 160 - 96 - 14 - 130) / Math.max(1, this.loadout.length)) - CARD_GAP);
  }
  costOf(type) {
    if (this.potluck) return 0;
    return Math.round(GUARDIANS[type].cost * (this.mods.has('thrifty') ? 0.8 : 1));
  }

  _setupPots() {
    const L = this.level;
    const spots = [];
    for (const r of this.activeRows) for (let c = 4; c < COLS; c++) spots.push([r, c]);
    spots.sort(() => Math.random() - 0.5);
    const chosen = spots.slice(0, Math.min(L.pots, spots.length));
    const n = chosen.length;
    const rots = Math.round(n * L.rotChance);
    const golds = 2;
    chosen.forEach(([r, c], i) => {
      let content;
      if (i < golds) content = { type: 'seed' };
      else if (i < golds + rots) content = { type: 'rot', k: pick(L.pool) };
      else content = { type: 'guard', k: pick(L.guardians) };
      this.tiles[r][c].pot = { content, gold: i < golds, wobble: 0, seed: Math.random() * 10 };
    });
    // make sure the player can always open a few guardians first: the left-most column of pots are guardians
    for (const r of this.activeRows) { const t = this.tiles[r][4]; if (t.pot && !t.pot.gold) t.pot.content = { type: 'guard', k: pick(L.guardians) }; }
    this.level.waves = 0;
    this.potsLeft = n;
  }

  breakPot(r, c) {
    const t = this.tiles[r][c];
    if (!t.pot) return false;
    const { content } = t.pot;
    t.pot = null;
    this.potsLeft--;
    this.puff(colX(c), rowY(r) - 30, '#c07a4a', 18, 200);
    sfx('boom');
    if (content.type === 'rot') {
      this.spawnEnemy(content.k, r, colX(c));
      for (const e of this.enemies) if (e.row === r && Math.abs(e.x - colX(c)) < 40) e.stun = 0.6;
      this.floatText(colX(c), rowY(r) - 80, 'Eek!', '#ffb0d0');
    } else if (content.type === 'guard') {
      this.loadout.push(content.k);
      this.cooldowns.push(0);
      this._layoutCards();
      this.floatText(colX(c), rowY(r) - 80, GUARDIANS[content.k].name + '!', '#c8ff9a');
      sfx('upgrade');
    } else {
      this.pickups.push({ x: colX(c), y: rowY(r) - 50, t: 0, taken: false });
    }
    return true;
  }

  _setupWorldTiles() {
    const free = () => {
      const out = [];
      for (const r of this.activeRows) for (let c = 1; c < COLS; c++) {
        const t = this.tiles[r][c];
        if (!this.grid[r][c] && !t.frozen && !t.crystal) out.push([r, c]);
      }
      return out;
    };
    if (this.world.mech === 'frost') {
      const f = free().filter(([, c]) => c >= 2);
      for (let i = 0; i < 6 && f.length; i++) { const [r, c] = f.splice(Math.floor(Math.random() * f.length), 1)[0]; this.tiles[r][c].frozen = 3; }
    }
    if (this.world.mech === 'crystal') {
      const f = free().filter(([, c]) => c >= 1 && c <= 7);
      for (let i = 0; i < 5 && f.length; i++) { const [r, c] = f.splice(Math.floor(Math.random() * f.length), 1)[0]; this.tiles[r][c].crystal = true; }
    }
    this._free = free;
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.canvas.removeEventListener('pointerdown', this._onDown);
    this.canvas.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    window.removeEventListener('resize', this._onResize);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    const cw = Math.round(W * scale), ch = Math.round(H * scale);
    this.canvas.style.width = cw + 'px';
    this.canvas.style.height = ch + 'px';
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    this.ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  }

  // ---------- helpers ----------
  rank(type) { return 1 + 0.1 * (this.ranks[type] || 0); }
  boostAt(g) {
    let b = 1 + (this.empower > 0 ? 0.35 : 0);
    for (let r = g.r - 1; r <= g.r + 1; r++) for (let c = g.c - 1; c <= g.c + 1; c++) {
      const o = this.grid[r] && this.grid[r][c];
      if (o && o !== g && o.type === 'prismbud') b += GUARDIANS.prismbud.boost * pow(o.level);
    }
    return b;
  }
  power(g, base) { return base * pow(g.level) * this.rank(g.type) * this.boostAt(g); }
  plantable(r, c) {
    const t = this.tiles[r][c];
    return this.activeRows.includes(r) && !t.frozen && !t.crystal && !t.pot && t.scorch <= 0;
  }
  _makeGuardian(type, r, c) {
    const def = GUARDIANS[type] || { hp: 300 };
    const hp = def.hp * this.rank(type) * (this.mods && this.mods.has('fragile') ? 0.7 : 1);
    return {
      type, r, c, x: colX(c), y: rowY(r) + 2, level: 1, hp, maxHp: hp, born: 0,
      timer: def.firstDelay ?? def.interval ?? 0, armed: false, arm: def.armTime || 0,
      fire: 0, hurt: 0, seed: Math.random() * 10, fuse: 0.6, frozen: 0, over: 0, storm: 0, volleys: 0,
    };
  }

  // ---------- input ----------
  _pos(ev) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
  }
  _tile(p) {
    if (p.x < BX || p.x >= BOARD_R || p.y < BY || p.y >= BOARD_B) return null;
    return { c: Math.floor((p.x - BX) / TW), r: Math.floor((p.y - BY) / TH) };
  }
  _shovelX() { return CARD_X + this.loadout.length * (this.cardW + CARD_GAP) + 4; }
  _seedBtn() { const x = this._shovelX() + 96 + 12; return { x, w: Math.max(90, Math.min(160, W - 160 - x)), y: CARD_Y, h: CARD_H }; }

  _onDown(ev) {
    if (this.ended) return;
    const p = this._pos(ev);
    this.hover = p;
    if (p.y < CARD_Y + CARD_H + 4) {
      if (p.x > W - 76) { this.opts.onPause && this.opts.onPause(); sfx('click'); return; }
      if (p.x > W - 152) { this.speed = this.speed === 1 ? 2 : 1; sfx('click'); return; }
      const sb = this._seedBtn();
      if (p.x > sb.x && p.x < sb.x + sb.w) { this.toggleSeedMode(); return; }
      const sx = this._shovelX();
      if (p.x > sx && p.x < sx + 96) { this.shovel = !this.shovel; this.selected = -1; this.seedMode = false; sfx('click'); return; }
      for (let i = 0; i < this.loadout.length; i++) {
        const cx = CARD_X + i * (this.cardW + CARD_GAP);
        if (p.x > cx && p.x < cx + this.cardW) { this.selectCard(i); return; }
      }
      return;
    }
    this.dragFromCard = false;
    if (this.paused) return;
    for (const f of this.fireflies) if (!f.taken && Math.hypot(f.x - p.x, f.y - p.y) < 44) { this.catchFirefly(f); return; }
    for (const s of this.pickups) if (!s.taken && Math.hypot(s.x - p.x, s.y - p.y) < 44) { this.collectSeed(s); return; }
    for (const m of this.motes) if (!m.taken && Math.hypot(m.x - p.x, m.y - p.y) < 46) { this.collect(m); return; }
    const t = this._tile(p);
    if (t && this.selected < 0 && !this.shovel && !this.seedMode) this.tapTile(t.r, t.c);
  }
  _onMove(ev) { this.hover = this._pos(ev); }
  _onUp(ev) {
    if (this.ended || this.paused) return;
    const p = this._pos(ev);
    this.dragFromCard = false;
    const t = this._tile(p);
    if (!t) return;
    if (this.seedMode) { this.useSeedOn(t.r, t.c); return; }
    if (this.shovel) { this.dig(t.r, t.c); return; }
    if (this.selected >= 0) this.place(this.selected, t.r, t.c);
  }

  selectCard(i) {
    this.shovel = false;
    this.seedMode = false;
    if (this.selected === i) { this.selected = -1; return; }
    if (this.cooldowns[i] > 0 || this.glow < this.costOf(this.loadout[i])) { sfx('deny'); this.selected = -1; return; }
    this.selected = i;
    this.dragFromCard = true;
    sfx('click');
  }

  toggleSeedMode() {
    if (this.seeds <= 0) { sfx('deny'); this.floatText(this._seedBtn().x + 60, CARD_Y + CARD_H + 26, 'No Wildseeds yet', '#ffb0b0'); return; }
    this.seedMode = !this.seedMode;
    this.selected = -1;
    this.shovel = false;
    sfx('click');
  }

  tapTile(r, c) {
    const t = this.tiles[r][c];
    if (t.pot) return this.breakPot(r, c);
    if (t.frozen > 0) {
      t.frozen--;
      this.puff(colX(c), rowY(r) - 40, '#e8fbff', 8);
      sfx('hit');
      if (t.frozen === 0) { this.floatText(colX(c), rowY(r) - 60, 'Thawed!', '#bdf0ff'); sfx('collect'); }
      return true;
    }
    if (t.crystal) {
      t.crystal = false;
      this.puff(colX(c), rowY(r) - 40, '#d6a8ff', 16, 180);
      this.spawnMote(colX(c), rowY(r) - 60, 50, true);
      sfx('collect');
      return true;
    }
    return false;
  }

  dig(r, c) {
    const g = this.grid[r][c];
    if (g && g.type !== 'sprout') {
      this.glow += Math.floor(GUARDIANS[g.type].cost * 0.25 * g.level);
      this.grid[r][c] = null;
      this.puff(g.x, g.y - 30, '#a0703f', 10);
      sfx('plant');
    }
    this.shovel = false;
  }

  place(i, r, c) {
    const type = this.loadout[i];
    const def = GUARDIANS[type];
    if (!this.plantable(r, c)) { sfx('deny'); return false; }
    const cost = this.costOf(type);
    if (this.cooldowns[i] > 0 || this.glow < cost) { sfx('deny'); this.selected = -1; return false; }
    const existing = this.grid[r][c];
    if (existing) {
      const upgradable = existing.type === type && existing.level < UPGRADE_MAX && def.kind !== 'trap' && def.kind !== 'instant';
      if (!upgradable) { sfx('deny'); return false; }
      existing.level++;
      existing.maxHp = def.hp * hpMul(existing.level) * this.rank(type) * (existing.armor ? 2 : 1);
      existing.hp = existing.maxHp;
      this.puff(existing.x, existing.y - 40, '#ffe14d', 18);
      this.floatText(existing.x, existing.y - 90, `Level ${existing.level}!`, '#ffe14d');
      if (existing.level === 3) this.stats.threeStar = true;
      sfx('upgrade');
    } else {
      this.grid[r][c] = this._makeGuardian(type, r, c);
      this.puff(colX(c), rowY(r) - 30, '#ffffff', 6, 90);
      this.puff(colX(c), rowY(r) - 10, '#7a5532', 10);
      sfx('plant');
    }
    this.stats.planted++;
    this.stats.spent += cost;
    this.glow -= cost;
    if (this.potluck) { this.loadout.splice(i, 1); this.cooldowns.splice(i, 1); this._layoutCards(); }
    else this.cooldowns[i] = def.recharge;
    this.selected = -1;
    if (this.hint === 0) this.hint = 1;
    return true;
  }

  collect(m) { m.taken = true; m.tx = 60; m.ty = 44; sfx('collect'); if (this.hint === 1) this.hint = 2; }
  catchFirefly(f) {
    f.taken = true;
    this.motes.push({ x: f.x, y: f.y, value: 20, t: 0, life: 10, taken: true, tx: 60, ty: 44, vy: 0, floorY: f.y, fromG: true });
    sfx('collect');
  }
  collectSeed(s) {
    s.taken = true;
    if (this.seeds < this.maxSeeds) { this.seeds++; this.floatText(s.x, s.y - 30, 'Wildseed!', '#a8ff7a'); }
    else { this.glow += 50; this.floatText(s.x, s.y - 30, '+50 Glow', '#ffe9a0'); }
    sfx('upgrade');
    if (this.hint === -1 && this.levelIndex <= 1 && !this._seedHinted) { this._seedHinted = true; this.hint = 3; this._hintTimer = this.time + 7; }
  }

  useSeedOn(r, c) {
    const g = this.grid[r][c];
    this.seedMode = false;
    if (!g || g.type === 'sprout' || !GUARDIANS[g.type].over) { sfx('deny'); return false; }
    this.seeds--;
    this.overbloom(g);
    return true;
  }

  overbloom(g) {
    const def = GUARDIANS[g.type];
    this.stats.overblooms++;
    g.over = 1.6;
    sfx('bloom');
    this.puff(g.x, g.y - 40, '#a8ff7a', 26, 200);
    this.floatText(g.x, g.y - 100, 'OVERBLOOM!', '#a8ff7a');
    const rowEnemies = (r) => this.enemies.filter((e) => e.row === r && !e.dead && !e.burrowed && !e.diving);
    switch (g.type) {
      case 'glowcap': for (let i = 0; i < 3; i++) this.spawnMote(g.x + (i - 1) * 30, g.y - 70, 50, true); break;
      case 'sporelamp': for (let i = 0; i < 2; i++) this.spawnMote(g.x + (i - 0.5) * 30, g.y - 70, 50, true); break;
      case 'thornling': g.storm = 1.5; break;
      case 'twinbud': g.volleys = 5; break;
      case 'barkwall': if (!g.armor) { g.armor = true; g.maxHp *= 2; } g.hp = g.maxHp; break;
      case 'boulderbud': this.boulders.push({ row: g.r, x: g.x, dmg: def.roll * pow(g.level) * this.rank(g.type), hit: new Set() }); g.hp = g.maxHp; sfx('boom'); break;
      case 'puffball': g.big = true; g.armed = true; break;
      case 'frostbell': for (const e of rowEnemies(g.r)) { if (!e.def.frostproof) e.frozenTime = 5; this.damage(e, 40, 'storm'); } sfx('frost'); break;
      case 'vinewhip':
        for (const e of this.enemies) if (!e.burrowed && !e.diving && Math.hypot(e.x - g.x, (e.row - g.r) * TH) < TW * 1.7) this.damage(e, this.power(g, 600), 'melee');
        this.shake = 0.3;
        break;
      case 'mossmender': for (const row of this.grid) for (const o of row) if (o) { o.hp = o.maxHp; o.frozen = 0; } for (const row of this.tiles) for (const t of row) t.blight = false; break;
      case 'rootsnare': for (const e of rowEnemies(g.r)) if (!e.def.flying) e.snared = e.def.boss ? 2 : 5; break;
      case 'lanceleaf':
        for (let r = g.r - 1; r <= g.r + 1; r++) if (this.activeRows.includes(r)) this.shots.push({ kind: 'lance', big: true, row: r, x: g.x + 20, y: rowY(r) - TH * 0.45, dmg: this.power(g, 200), pierce: true, hit: new Set() });
        break;
      case 'pollenpuff': for (const e of this.enemies) { if (e.def.boss) e.stun = Math.max(e.stun, 1); else e.confused = 4; } break;
      case 'hivebloom': for (let i = 0; i < 14; i++) this.shots.push(this._bee(g, i * 0.03)); break;
      case 'emberroot': {
        const targets = this.enemies.filter((e) => !e.burrowed && !e.diving).sort(() => Math.random() - 0.5).slice(0, 8);
        for (const e of targets) this._lob(g, e.x, e.row, 2, 0.5 + Math.random() * 0.4);
        break;
      }
      case 'bramblemat': for (const e of this.enemies) if (!e.diving && Math.hypot(e.x - g.x, (e.row - g.r) * TH) < TW * 1.9) this.damage(e, this.power(g, 400), 'ground'); this.puff(g.x, g.y - 10, '#e8ffb0', 30, 240); break;
      case 'prismbud': this.empower = 8; break;
    }
  }

  showBanner(text, dur = 2) { this.banner = { text, t: dur, dur }; }
  floatText(x, y, text, color = '#fff') { this.texts.push({ x, y, text, color, t: 1.2 }); }
  puff(x, y, color, n = 8, spd = 120) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = rand(spd * 0.3, spd);
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, t: rand(0.4, 0.8), max: 0.8, color, r: rand(2, 5) });
    }
  }
  spawnMote(x, y, value, fromGuardian) {
    this.motes.push({ x, y, value, t: 0, life: 10, taken: false, vy: fromGuardian ? -60 : 40, floorY: fromGuardian ? y + 40 : rand(BY + 60, BOARD_B - 40), fromG: fromGuardian });
  }
  _bee(g, delay = 0) {
    return { kind: 'bee', x: g.x, y: g.y - 70, vx: rand(-60, 60), vy: -160, dmg: this.power(g, GUARDIANS.hivebloom.damage), life: 5, delay, target: null };
  }
  _lob(g, tx, row, dmgMul = 1, dur = 0.8) {
    const def = GUARDIANS.emberroot;
    this.shots.push({
      kind: 'ember', row, x0: g.x, y0: g.y - 70, tx, ty: rowY(row) - 20, t: 0, dur,
      dmg: this.power(g, def.damage) * dmgMul, splash: def.splash * TW, burnDps: this.power(g, def.burnDps), burnTime: def.burnTime,
    });
  }

  // ---------- waves ----------
  _launchWave() {
    const n = this.wave;
    const total = this.level.waves;
    const isLast = !this.endless && n === total - 1;
    const isBig = isLast || (n + 1) % (this.endless ? 5 : 4) === 0;
    let budget;
    if (this.endless) {
      budget = 1 + n * 1.2;
      this.level.pool = NON_BOSS.slice(0, Math.min(NON_BOSS.length, 2 + Math.floor(n / 2)));
      const wi = Math.floor(n / 8) % WORLDS.length;
      if (wi !== this.worldIndex) { this.setWorld(wi); this._setupWorldTiles(); this.showBanner(`Welcome to ${this.world.name}!`, 2); }
    } else {
      budget = Math.max(1, this.level.budget * (0.12 + 0.88 * Math.pow(n / Math.max(1, total - 1), 1.25)));
    }
    if (isBig) budget *= 1.7;
    const list = [];
    if (isLast && this.level.boss) list.push(this.level.boss);
    if (this.endless && n > 0 && n % 10 === 9) list.push(BOSSES[Math.floor(n / 10) % BOSSES.length]);
    let guard = 0;
    while (budget > 0.5 && guard++ < 200) {
      const opts = this.level.pool.filter((k) => ROTLINGS[k].cost <= budget + 0.5);
      if (!opts.length) break;
      const k = Math.random() < 0.35 ? opts[opts.length - 1] : pick(opts);
      list.push(k);
      budget -= ROTLINGS[k].cost;
    }
    if (this.mods.has('swarming') && n >= 1) list.push('swarm');
    const spread = isBig ? 4 : 7;
    const carrier = n >= 1 ? Math.floor(Math.random() * list.length) : -1;
    list.forEach((k, i) => this.spawnQueue.push({ k, carries: i === carrier && !ROTLINGS[k].boss, at: this.time + (ROTLINGS[k].boss ? 3 : (i / list.length) * spread + rand(0, 1.5)) }));
    this.wave++;
    if (isLast) this.showBanner(this.level.boss ? `${ROTLINGS[this.level.boss].name} approaches!` : 'Final wave!', 2.5);
    else if (isBig) this.showBanner('A big wave is coming!', 2.5);
    if (isBig || isLast) sfx('wave');
    this.nextWave = this.time + (isBig ? 34 : 26);
  }

  spawnEnemy(k, row, x, carries = false) {
    const def = ROTLINGS[k];
    const r = row ?? (def.boss ? this.activeRows[Math.floor(this.activeRows.length / 2)] : pick(this.activeRows));
    const hpScale = (this.endless ? 1 + this.wave * 0.04 : 1) * (this.mods.has('tough') ? 1.4 : 1);
    if (def.boss && !this.cine) { this.cine = { t: 2.8, max: 2.8, k }; sfx('wave'); }
    const count = def.group || 1;
    for (let i = 0; i < count; i++) {
      this.enemies.push({
        k, def, row: r, x: (x ?? BOARD_R + rand(30, 70)) + i * 26, y: rowY(r),
        hp: def.hp * hpScale, maxHp: def.hp * hpScale, shell: def.shell || 0, shield: def.shield || 0, speed: def.speed * (this.mods.has('swift') ? 1.3 : 1),
        slow: 0, burn: 0, burnDps: 0, hurt: 0, eating: false, seed: Math.random() * 10,
        burrowed: !!def.burrow, stun: 0, summon: def.every || 8, confused: 0, snared: 0, frozenTime: 0,
        spitTimer: def.ranged ? def.ranged.interval : 0, carries: carries && i === 0, diving: 0,
      });
    }
  }

  damage(e, amt, src = 'shot') {
    if (e.dead || e.diving > 0) return;
    const d = e.def;
    if (d.armor && (src === 'shot' || src === 'bee')) amt *= d.armor;
    if (d.fireproof && src === 'fire') amt *= 0.5;
    if (e.shield > 0 && (src === 'shot' || src === 'lance')) {
      const s = Math.min(e.shield, amt);
      e.shield -= s;
      if (e.shield <= 0) this.puff(e.x - 30, e.y - 40, '#6f9a3a', 12);
      if (src === 'shot') { e.hurt = 0.05; return; }
      amt -= s * 0.5;
    }
    if (e.shell > 0 && src !== 'storm' && src !== 'cloud' && src !== 'fire') {
      const s = Math.min(e.shell, amt);
      e.shell -= s;
      amt -= s;
      if (e.shell <= 0) { this.puff(e.x, e.y - 40, '#8f9c6c', 12); e.speed *= 1.45; }
    }
    e.hp -= amt;
    e.hurt = 0.08;
    if (!e.def.boss && !e.def.big && amt > 15) e.kb = Math.min(6, (e.kb || 0) + 2);
    if (e.hp <= 0) this.kill(e);
  }

  kill(e) {
    if (e.dead) return;
    e.dead = true;
    this.stats.kills++;
    this.corpses.push({ ...e, dying: 1 });
    this.seedMeter += (e.def.boss ? 100 : 4 + e.def.cost * 3) * (this.mods.has('bounty') ? 2 : 1);
    while (this.seedMeter >= 100) {
      this.seedMeter -= 100;
      if (this.seeds < this.maxSeeds) { this.seeds++; this.floatText(this._seedBtn().x + 60, CARD_Y + CARD_H + 26, '+1 Wildseed', '#a8ff7a'); sfx('upgrade'); }
    }
    this.puff(e.x, e.y - 30, e.def.color, e.def.boss ? 40 : 14, e.def.boss ? 260 : 140);
    sfx('die');
    if (e.carries) this.pickups.push({ x: e.x, y: e.y - 50, t: 0, taken: false });
    if (e.def.spawnOnDeath) {
      const rows = this.activeRows.filter((r) => Math.abs(r - e.row) <= 1);
      for (let i = 0; i < e.def.spawnOnDeath; i++) this.spawnEnemy('grub', pick(rows), e.x + rand(-20, 30));
    }
    if (e.def.explode) {
      for (const row of this.grid) for (const g of row) if (g && Math.hypot(g.x - e.x, (g.r - e.row) * TH) < TW * 1.1) this.hurtGuardian(g, e.def.explode);
      this.puff(e.x, e.y - 30, '#ff8a4c', 20, 220);
      sfx('boom');
    }
    if (e.def.boss) { this.shake = 0.8; sfx('boom'); }
    if (this.goal !== 'budget' && Math.random() < 0.12) this.spawnMote(e.x, e.y - 40, 15, true);
  }

  hurtGuardian(g, amt) {
    g.hp -= amt;
    g.hurt = 0.08;
  }

  // ---------- main loop ----------
  _loop(now) {
    this.raf = requestAnimationFrame(this._loop);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.rt = (this.rt || 0) + dt;
    if (!this.paused && !this.ended) {
      this.acc += dt * this.speed;
      let steps = 0;
      while (this.acc >= STEP && steps < 12) { this.update(STEP); this.acc -= STEP; steps++; }
    }
    this.render();
  }

  update(dt) {
    if (this.cine) {
      this.cine.t -= dt;
      if (this.cine.t <= 0) this.cine = null;
      this.time += dt * 0.15;
      for (const row of this.grid) for (const g of row) if (g && g.born < 1) g.born = Math.min(1, g.born + dt * 2.2);
      return;
    }
    this.time += dt;
    const mech = this.world.mech;
    const income = this.goal !== 'budget' && !this.potluck;

    for (let i = 0; i < this.cooldowns.length; i++) this.cooldowns[i] = Math.max(0, this.cooldowns[i] - dt);
    if (this.empower > 0) this.empower -= dt;
    const T = this.timers;

    // ----- world mechanics -----
    const skyEvery = { day: [8, 11], ember: [9, 12], frost: [12, 15], blight: [11, 13] }[mech];
    if (income && !this.potluck && skyEvery && this.time >= T.sky) {
      T.sky = this.time + rand(...skyEvery) * (this.mods.has('glowrain') ? 0.5 : 1);
      this.spawnMote(rand(BX + 40, BOARD_R - 40), BY - 20, 25, false);
    }
    if (income && mech === 'night' && this.time >= T.firefly) {
      T.firefly = this.time + rand(6, 9);
      const fromLeft = Math.random() < 0.5;
      this.fireflies.push({ x: fromLeft ? BX - 20 : BOARD_R + 20, y: rand(BY + 40, BOARD_B - 60), dir: fromLeft ? 1 : -1, t: 0, seed: Math.random() * 10 });
    }
    if (mech === 'ember') {
      if (this.time >= T.gust) {
        T.gust = this.time + rand(16, 24);
        this.gust = 1.2;
        this.showBanner('Gust of wind!', 1.2);
        for (const m of this.motes) if (!m.taken && !m.fromG) m.blown = true;
      }
      if (this.time >= T.ember) {
        T.ember = this.time + rand(16, 22);
        for (let i = 0; i < 2; i++) { const r = pick(this.activeRows), c = Math.floor(rand(0, COLS)); this.strikes.push({ r, c, t: 2, kind: 'ember', dmg: 150 }); }
      }
    }
    if (this.gust > 0) {
      this.gust -= dt;
      for (const e of this.enemies) if (!e.def.boss && !e.burrowed) e.x = Math.min(BOARD_R + 40, e.x + 55 * dt);
    }
    if (mech === 'frost') {
      if (this.time >= T.blizzard) {
        T.blizzard = this.time + rand(24, 30);
        this.blizzard = 5;
        this.showBanner('Blizzard! Guardians slow down', 1.6);
        const f = this._free().filter(([, c]) => c >= 3);
        if (f.length) { const [r, c] = pick(f); this.tiles[r][c].frozen = 3; }
      }
    }
    if (this.blizzard > 0) this.blizzard -= dt;
    if (mech === 'crystal' && this.time >= T.crystal) {
      T.crystal = this.time + rand(16, 20);
      let count = 0;
      for (const row of this.tiles) for (const t of row) if (t.crystal) count++;
      const f = this._free().filter(([, c]) => c >= 1 && c <= 7);
      if (count < 6 && f.length) { const [r, c] = pick(f); this.tiles[r][c].crystal = true; this.puff(colX(c), rowY(r) - 30, '#d6a8ff', 10); }
    }
    if (mech === 'blight' && this.time >= T.blight) {
      T.blight = this.time + 16;
      this.spreadBlight();
    }
    for (const row of this.tiles) for (const t of row) { if (t.scorch > 0) t.scorch -= dt; }

    // strikes (ember rain / boss fireballs)
    for (const s of this.strikes) {
      s.t -= dt;
      if (s.t <= 0 && !s.done) {
        s.done = true;
        const g = this.grid[s.r][s.c];
        if (g) this.hurtGuardian(g, s.dmg);
        this.tiles[s.r][s.c].scorch = s.kind === 'boss' ? 8 : 10;
        this.puff(colX(s.c), rowY(s.r) - 20, '#ff8a4c', 18, 200);
        this.shake = Math.max(this.shake, 0.2);
        sfx('boom');
      }
    }
    this.strikes = this.strikes.filter((s) => !s.done);

    // ----- waves -----
    if (!this.potluck && this.wave < this.level.waves) {
      const fieldClear = this.enemies.length === 0 && this.spawnQueue.length === 0;
      if (fieldClear && this.wave > 0 && this.nextWave - this.time > 4) this.nextWave = this.time + 4;
      if (this.time >= this.nextWave) this._launchWave();
    }
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      const q = this.spawnQueue[i];
      if (this.time >= q.at) { this.spawnEnemy(q.k, undefined, undefined, q.carries); this.spawnQueue.splice(i, 1); }
    }

    // ----- guardians -----
    const rateMul = this.blizzard > 0 ? 0.5 : 1;
    for (const row of this.grid) for (let c = 0; c < COLS; c++) {
      const g = row[c];
      if (!g) continue;
      const def = GUARDIANS[g.type] || {};
      g.hurt = Math.max(0, g.hurt - dt);
      g.fire = Math.max(0, g.fire - dt * 5);
      if (g.born < 1) g.born = Math.min(1, g.born + dt * 2.2);
      if (g.over > 0) g.over -= dt;
      const tile = this.tiles[g.r][g.c];
      if (tile.blight) g.hp -= 12 * dt;
      if (g.hp <= 0) {
        row[c] = null;
        this.puff(g.x, g.y - 30, def.color || '#8fe06a', 12);
        if (g.type === 'boulderbud') {
          this.boulders.push({ row: g.r, x: g.x, dmg: def.roll * pow(g.level) * this.rank(g.type), hit: new Set() });
          sfx('boom');
        } else if (g.type === 'sprout') {
          this.finish(false, 'A sprout was eaten!');
          return;
        }
        this.stats.lost++;
        continue;
      }
      if (g.frozen > 0) { g.frozen -= dt; continue; }
      const rate = rateMul;
      switch (def.kind) {
        case 'producer':
          if (!income) break;
          g.timer -= dt;
          if (g.timer <= 0) {
            g.timer = def.interval;
            const night = this.world.mech === 'night' || this.world.mech === 'crystal';
            const amt = def.amount * (night && def.nightBonus ? def.nightBonus : night ? 1.2 : 1) * pow(g.level) * this.rank(g.type);
            this.spawnMote(g.x + rand(-15, 15), g.y - 70, Math.round(amt), true);
          }
          break;
        case 'shooter': {
          const rows = def.spread ? [g.r - 1, g.r, g.r + 1].filter((r) => this.activeRows.includes(r)) : [g.r];
          const fireNow = () => {
            g.fire = 1;
            for (const r of rows) {
              this.shots.push({
                kind: def.projectile, row: r, x: g.x + 20, y: rowY(r) - TH * 0.45,
                dmg: this.power(g, def.damage), slow: def.slow, slowTime: def.slowTime, confuse: def.confuse, pierce: def.pierce, hit: new Set(),
              });
            }
          };
          if (g.storm > 0) {
            g.storm -= dt;
            g.stormT = (g.stormT || 0) - dt;
            if (g.stormT <= 0) { g.stormT = 0.05; fireNow(); sfx('shoot'); }
            break;
          }
          if (g.volleys > 0) {
            g.stormT = (g.stormT || 0) - dt;
            if (g.stormT <= 0) { g.stormT = 0.15; g.volleys--; fireNow(); sfx('shoot'); }
            break;
          }
          g.timer -= dt * rate;
          if (g.timer <= 0 && rows.some((r) => this._targetAhead(r, g.x))) {
            g.timer = def.interval;
            fireNow();
            sfx(def.projectile === 'frost' ? 'frost' : 'shoot');
          }
          break;
        }
        case 'homing':
          g.timer -= dt * rate;
          if (g.timer <= 0 && this.enemies.some((e) => !e.burrowed && !e.diving && e.x < BOARD_R + 20)) {
            g.timer = def.interval;
            g.fire = 1;
            this.shots.push(this._bee(g));
            sfx('shoot');
          }
          break;
        case 'melee': {
          g.timer -= dt * rate;
          if (g.timer <= 0) {
            const hits = this.enemies.filter((e) => e.row === g.r && !e.burrowed && !e.diving && e.x > g.x - 20 && e.x < g.x + def.reach * TW);
            if (hits.length) {
              g.timer = def.interval;
              g.fire = 1;
              for (const e of hits) this.damage(e, this.power(g, def.damage), 'melee');
              sfx('hit');
              this.puff(g.x + TW * 0.6, g.y - 40, '#8fe06a', 6);
            }
          }
          break;
        }
        case 'snare': {
          g.timer -= dt * rate;
          if (g.timer <= 0) {
            let best = null;
            for (const e of this.enemies) {
              if (e.row !== g.r || e.burrowed || e.diving || e.def.flying || e.snared > 0 || e.x < g.x - 10 || e.x > g.x + def.range * TW) continue;
              if (!best || e.x < best.x) best = e;
            }
            if (best) {
              g.timer = def.interval;
              g.fire = 1;
              best.snared = def.hold * (best.def.boss ? 0.4 : 1) * (1 + 0.1 * (g.level - 1));
              this.damage(best, this.power(g, def.damage) * def.hold, 'melee');
              sfx('chomp');
            }
          }
          break;
        }
        case 'lobber': {
          g.timer -= dt * rate;
          if (g.timer <= 0) {
            const tgt = this._targetAhead(g.r, g.x);
            if (tgt) {
              g.timer = def.interval;
              g.fire = 1;
              this._lob(g, Math.max(g.x + 40, tgt.x - tgt.speed * 0.8), g.r);
              sfx('shoot');
            }
          }
          break;
        }
        case 'healer': {
          const h = def.heal * pow(g.level) * this.rank(g.type) * dt;
          for (let r = g.r - 1; r <= g.r + 1; r++) for (let cc = g.c - 1; cc <= g.c + 1; cc++) {
            const o = this.grid[r] && this.grid[r][cc];
            if (o) o.hp = Math.min(o.maxHp, o.hp + h);
            const t = this.tiles[r] && this.tiles[r][cc];
            if (t && t.blight) { t.cleanse += dt; if (t.cleanse > 4) { t.blight = false; t.cleanse = 0; this.puff(colX(cc), rowY(r) - 20, '#7ff0c0', 10); } }
          }
          break;
        }
        case 'ground':
          for (const e of this.enemies) {
            if (e.row === g.r && !e.burrowed && !e.diving && !e.def.flying && Math.abs(e.x - g.x) < TW * 0.55) this.damage(e, this.power(g, def.dps) * dt, 'ground');
          }
          break;
        case 'trap':
          if (!g.armed) { g.arm -= dt; if (g.arm <= 0) { g.armed = true; this.puff(g.x, g.y - 20, '#c58df0', 6); } }
          else if (this.enemies.some((e) => e.row === g.r && !e.burrowed && !e.def.flying && Math.abs(e.x - g.x) < TW * 0.55)) {
            const k = g.big ? 1.6 : 1;
            this.clouds.push({ x: g.x, y: g.y - 30, r: def.cloudRadius * TW * k, t: def.cloudTime, max: def.cloudTime, dps: def.cloudDps * k * this.rank(g.type), row: g.r });
            row[c] = null;
            sfx('boom');
            this.puff(g.x, g.y - 30, '#c58df0', 24, 200);
          }
          break;
        case 'instant':
          g.fuse -= dt;
          if (g.fuse <= 0) {
            row[c] = null;
            for (const e of this.enemies) if (Math.abs(e.row - g.r) <= def.rows) this.damage(e, def.damage * this.rank(g.type), 'storm');
            for (let r = g.r - def.rows; r <= g.r + def.rows; r++) if (this.activeRows.includes(r)) this.bolts.push({ row: r, t: 0.4 });
            this.shake = 0.3;
            sfx('zap');
          }
          break;
      }
    }

    // ----- projectiles -----
    for (const p of this.shots) {
      if (p.kind === 'ember') {
        p.t += dt;
        const k = p.t / p.dur;
        p.x = p.x0 + (p.tx - p.x0) * k;
        p.y = p.y0 + (p.ty - p.y0) * k - Math.sin(k * Math.PI) * 140;
        if (k >= 1) {
          p.done = true;
          for (const e of this.enemies) {
            if (e.row === p.row && !e.burrowed && !e.diving && Math.abs(e.x - p.tx) < p.splash) {
              this.damage(e, p.dmg, 'fire');
              if (!e.def.fireproof) { e.burn = p.burnTime; e.burnDps = p.burnDps; }
            }
          }
          this.puff(p.tx, p.ty, '#ff8a4c', 12, 160);
        }
        continue;
      }
      if (p.kind === 'bee') {
        if (p.delay > 0) { p.delay -= dt; continue; }
        p.life -= dt;
        if (!p.target || p.target.dead || p.target.burrowed || p.target.diving) {
          let best = null;
          for (const e of this.enemies) if (!e.dead && !e.burrowed && !e.diving && e.x < BOARD_R + 30 && (!best || e.x < best.x)) best = e;
          p.target = best;
        }
        if (!p.target || p.life <= 0) { p.done = !p.target && p.life < 4 ? true : p.life <= 0; if (!p.target) { p.vy -= 200 * dt; p.x += p.vx * dt; p.y += p.vy * dt; } continue; }
        const tx = p.target.x, ty = p.target.y - (p.target.def.flying ? 70 : 35);
        const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
        p.vx += (dx / d) * 1600 * dt; p.vy += (dy / d) * 1600 * dt;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 460) { p.vx *= 460 / sp; p.vy *= 460 / sp; }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (d < 26) { this.damage(p.target, p.dmg, 'bee'); p.done = true; this.puff(p.x, p.y, '#ffcc33', 4, 60); }
        continue;
      }
      p.x += 560 * dt;
      if (p.x > W + 20) { p.done = true; continue; }
      for (const e of this.enemies) {
        if (e.dead || e.row !== p.row || e.burrowed || e.diving || p.hit.has(e)) continue;
        const reach = 32 * (e.def.boss ? 1.6 : e.def.big ? 1.25 : e.def.small ? 0.7 : 1) + (e.shield > 0 ? 34 : 0);
        if (p.x >= e.x - reach && p.x <= e.x + reach + 20) {
          this.damage(e, p.dmg, p.kind === 'lance' ? 'lance' : 'shot');
          if (p.slow && !e.def.frostproof) e.slow = Math.max(e.slow, p.slowTime);
          if (p.confuse && !e.def.boss && !(e.shield > 0)) e.confused = Math.max(e.confused, p.confuse);
          sfx('hit');
          this.puff(p.x, p.y, { frost: '#bdf0ff', pollen: '#fff1a8' }[p.kind] || '#cfffb0', 3, 60);
          if (p.pierce) p.hit.add(e);
          else { p.done = true; break; }
        }
      }
    }
    this.shots = this.shots.filter((p) => !p.done);

    // enemy spit
    for (const s of this.spits) {
      s.x -= 300 * dt;
      if (s.x < BX - 20) { s.done = true; continue; }
      const c = Math.floor((s.x - BX) / TW);
      const g = c >= 0 && c < COLS ? this.grid[s.row][c] : null;
      if (g && g.type !== 'bramblemat' && s.x < g.x + 20) { this.hurtGuardian(g, s.dmg); s.done = true; this.puff(s.x, s.y, '#b7e06a', 8); }
    }
    this.spits = this.spits.filter((s) => !s.done);

    // rolling boulders
    for (const b of this.boulders) {
      b.x += 420 * dt;
      if (b.x > W + 60) { b.done = true; continue; }
      for (const e of this.enemies) {
        if (e.row === b.row && !e.burrowed && !e.diving && !e.def.flying && !b.hit.has(e) && Math.abs(e.x - b.x) < 40) {
          b.hit.add(e);
          this.damage(e, b.dmg, 'storm');
          this.shake = 0.15;
        }
      }
    }
    this.boulders = this.boulders.filter((b) => !b.done);

    for (const cl of this.clouds) {
      cl.t -= dt;
      for (const e of this.enemies) {
        if (!e.burrowed && !e.diving && Math.abs(e.row - cl.row) <= 1 && Math.hypot(e.x - cl.x, (e.row - cl.row) * TH) < cl.r) this.damage(e, cl.dps * dt, 'cloud');
      }
    }
    this.clouds = this.clouds.filter((c) => c.t > 0);
    for (const b of this.bolts) b.t -= dt;
    this.bolts = this.bolts.filter((b) => b.t > 0);

    // ----- enemies -----
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = e.def;
      e.hurt = Math.max(0, e.hurt - dt);
      if (e.kb > 0) { e.x += e.kb * 0.5; e.kb = Math.max(0, e.kb - dt * 30); }
      if (e.burn > 0) { e.burn -= dt; this.damage(e, e.burnDps * dt, 'fire'); if (Math.random() < 0.2) this.puff(e.x, e.y - 40, '#ff8a4c', 1, 30); }
      if (e.dead) continue;
      if (d.heals) {
        for (const o of this.enemies) if (o !== e && !o.dead && Math.hypot(o.x - e.x, (o.row - e.row) * TH) < TW * 1.5) o.hp = Math.min(o.maxHp, o.hp + d.heals * dt);
        if (Math.random() < 0.05) this.puff(e.x, e.y - 60, '#a0ff78', 2, 40);
      }
      if (d.boss) this._bossAct(e, dt);
      if (e.diving > 0) continue;
      if (e.frozenTime > 0) { e.frozenTime -= dt; continue; }
      if (e.stun > 0) { e.stun -= dt; continue; }
      if (e.snared > 0) { e.snared -= dt; continue; }
      const slowK = e.slow > 0 && !d.frostproof ? 0.5 : 1;
      if (e.slow > 0) e.slow -= dt;
      if (e.confused > 0) {
        e.confused -= dt;
        e.eating = false;
        e.x = Math.min(BOARD_R + 30, e.x + e.speed * 0.8 * dt);
        continue;
      }
      // ranged attackers
      if (d.ranged) {
        let target = null;
        for (let c = COLS - 1; c >= 0; c--) {
          const g = this.grid[e.row][c];
          if (g && g.type !== 'bramblemat' && g.x < e.x && e.x - g.x <= d.ranged.range * TW && e.x < BOARD_R) { target = g; break; }
        }
        if (target) {
          e.eating = false;
          e.spitTimer -= dt;
          e.spitCharge = 1 - Math.max(0, e.spitTimer) / d.ranged.interval;
          if (e.spitTimer <= 0) {
            e.spitTimer = d.ranged.interval;
            this.spits.push({ row: e.row, x: e.x - 30, y: e.y - 30, dmg: d.ranged.damage });
            sfx('chomp');
          }
          continue;
        }
      }
      e.eating = false;
      if (!d.flying) {
        const fx = e.x - TW * 0.3;
        const c = Math.floor((fx - BX) / TW);
        const g = c >= 0 && c < COLS ? this.grid[e.row][c] : null;
        const walkOver = g && g.type === 'bramblemat' && !d.crushes;
        if (g && !walkOver && fx < g.x + TW * 0.2) {
          if (e.burrowed) {
            e.burrowed = false;
            e.x = g.x - TW * 0.75;
            e.stun = 2.5;
            this.puff(e.x, e.y - 10, '#7a5532', 14);
          } else if (!(g.type === 'puffball' && g.armed)) {
            e.eating = true;
            g.hp -= d.dps * dt * slowK;
            g.hurt = 0.05;
            if (d.freezes) g.frozen = Math.max(g.frozen, 1.5);
            if (Math.random() < 0.08) sfx('chomp');
          }
        }
      }
      if (!e.eating) e.x -= e.speed * slowK * dt;
      if (e.x < BX - 30) {
        e.dead = true;
        this.lanterns--;
        this.lostLantern = true;
        this.shake = 0.5;
        sfx('lantern');
        if (this.lanterns <= 0) { this.finish(false, 'The last lantern went dark…'); return; }
        this.showBanner('A Lantern went dark!', 1.5);
        for (const o of this.enemies) if (!o.dead && !o.def.boss) { o.x = Math.min(BOARD_R + 30, o.x + TW * 1.2); o.stun = 1.5; }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    // ----- pickups -----
    for (const m of this.motes) {
      m.t += dt;
      if (m.taken) {
        m.x += (m.tx - m.x) * Math.min(1, dt * 8);
        m.y += (m.ty - m.y) * Math.min(1, dt * 8);
        if (Math.hypot(m.tx - m.x, m.ty - m.y) < 12) { m.done = true; this.glow += m.value; }
        continue;
      }
      if (m.blown) { m.x += 500 * dt; m.y -= 40 * dt; if (m.x > W + 40) m.done = true; continue; }
      if (m.fromG) { m.vy += 160 * dt; if (m.y < m.floorY || m.vy < 0) m.y += m.vy * dt; }
      else if (m.y < m.floorY) m.y += 45 * dt;
      if (this.autoCollect && m.t > 1.2) this.collect(m);
      else if (m.t > m.life) m.done = true;
    }
    this.motes = this.motes.filter((m) => !m.done);
    for (const f of this.fireflies) {
      f.t += dt;
      f.x += f.dir * 55 * dt;
      f.y += Math.sin(f.t * 2 + f.seed) * 40 * dt;
      if (this.autoCollect && f.t > 2 && !f.taken) this.catchFirefly(f);
      if (f.x < BX - 60 || f.x > BOARD_R + 60) f.done = true;
    }
    this.fireflies = this.fireflies.filter((f) => !f.done && !f.taken);
    for (const s of this.pickups) {
      s.t += dt;
      if (this.autoCollect && s.t > 1.5 && !s.taken) this.collectSeed(s);
      if (s.t > 12) s.done = true;
    }
    this.pickups = this.pickups.filter((s) => !s.done && !s.taken);

    // ----- fx -----
    for (const p of this.particles) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; }
    this.particles = this.particles.filter((p) => p.t > 0);
    for (const c of this.corpses) c.dying -= dt * 2.5;
    this.corpses = this.corpses.filter((c) => c.dying > 0);
    for (const t of this.texts) { t.t -= dt; t.y -= 30 * dt; }
    this.texts = this.texts.filter((t) => t.t > 0);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    this.shake = Math.max(0, this.shake - dt);
    this._updateWeather(dt);

    if (this.potluck) { if (this.potsLeft <= 0 && this.enemies.length === 0) this.finish(true); }
    else if (!this.endless && this.wave >= this.level.waves && this.enemies.length === 0 && this.spawnQueue.length === 0) this.finish(true);
  }

  spreadBlight(nearX, nearRow) {
    let count = 0;
    const cands = [];
    for (const r of this.activeRows) for (let c = 2; c < COLS; c++) {
      const t = this.tiles[r][c];
      if (t.blight) { count++; continue; }
      const adj = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].some(([rr, cc]) => this.tiles[rr] && this.tiles[rr][cc] && this.tiles[rr][cc].blight);
      const near = nearX !== undefined ? Math.abs(colX(c) - nearX) < TW * 1.5 && Math.abs(r - nearRow) <= 1 : false;
      if (adj || c === COLS - 1 || near) cands.push([r, c]);
    }
    if (count >= 10 || !cands.length) return;
    const [r, c] = pick(cands);
    this.tiles[r][c].blight = true;
    this.tiles[r][c].cleanse = 0;
    this.puff(colX(c), rowY(r) - 20, '#b04a9a', 10);
  }

  _bossAct(e, dt) {
    const d = e.def;
    if (e.diving > 0) {
      e.diving -= dt;
      if (e.diving <= 0) {
        const rows = this.activeRows.filter((r) => r !== e.row);
        e.row = pick(rows.length ? rows : this.activeRows);
        e.y = rowY(e.row);
        this.puff(e.x, e.y - 20, '#4b4f8a', 26, 220);
        this.shake = 0.4;
        sfx('boom');
      }
      return;
    }
    e.summon -= dt;
    if (e.summon > 0) return;
    e.summon = d.every * (d.boss === 'monarch' && e.hp < e.maxHp * 0.5 ? 0.8 : 1);
    switch (d.boss) {
      case 'summon':
      case 'mud':
        for (let i = 0; i < 2; i++) this.spawnEnemy(d.summon, pick(this.activeRows), e.x - 30);
        break;
      case 'monarch':
        for (let i = 0; i < (e.hp < e.maxHp * 0.5 ? 2 : 1); i++) this.spawnEnemy(d.summon, pick(this.activeRows), e.x - 30);
        if (e.hp < e.maxHp * 0.5) { this.spreadBlight(e.x, e.row); this.spreadBlight(e.x, e.row); }
        break;
      case 'fire': {
        const targets = [];
        for (const row of this.grid) for (const g of row) if (g && g.type !== 'sprout') targets.push(g);
        const g = targets.length ? pick(targets) : null;
        const r = g ? g.r : pick(this.activeRows), c = g ? g.c : Math.floor(rand(0, 6));
        this.strikes.push({ r, c, t: 1.5, kind: 'boss', dmg: 320 });
        break;
      }
      case 'freeze': {
        const cols = [];
        for (let c = 0; c < COLS; c++) if (this.grid.some((row) => row[c])) cols.push(c);
        if (cols.length) {
          const c = pick(cols);
          for (const row of this.grid) if (row[c]) row[c].frozen = 4;
          this.puff(colX(c), BY + 200, '#bdf0ff', 30, 260);
          this.showBanner('Rimefang freezes a column!', 1.2);
          sfx('frost');
        }
        break;
      }
      case 'dive':
        e.diving = 2;
        this.puff(e.x, e.y - 20, '#4b4f8a', 20, 200);
        break;
    }
  }

  _updateWeather(dt) {
    const mech = this.world.mech;
    const want = { day: 10, night: 0, ember: 30, frost: this.blizzard > 0 ? 120 : 40, crystal: 18, blight: 28 }[mech] || 0;
    while (this.weather.length < want) {
      this.weather.push({ x: rand(0, W), y: rand(-H, 0), vx: 0, vy: 0, s: rand(0.5, 1.5), k: Math.random() });
    }
    if (this.weather.length > want) this.weather.length = want;
    for (const p of this.weather) {
      if (mech === 'frost') { p.vx = (this.blizzard > 0 ? -160 : -20) * p.s; p.vy = 60 * p.s; }
      else if (mech === 'ember') { p.vx = 30 * p.s; p.vy = -40 * p.s; }
      else if (mech === 'day') { p.vx = 25 * p.s; p.vy = 30 * p.s; }
      else { p.vx = Math.sin(this.time + p.k * 10) * 15; p.vy = -12 * p.s; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.y > H + 10) { p.y = -10; p.x = rand(0, W); }
      if (p.y < -12) { p.y = H + 5; p.x = rand(0, W); }
      if (p.x < -12) p.x = W + 5;
      if (p.x > W + 12) p.x = -5;
    }
  }

  _targetAhead(r, x) {
    let best = null;
    for (const e of this.enemies) {
      if (e.row === r && !e.burrowed && !e.diving && !e.dead && e.x > x - 10 && e.x < BOARD_R + 20) if (!best || e.x < best.x) best = e;
    }
    return best;
  }

  finish(won, reason = '') {
    if (this.ended) return;
    this.ended = true;
    sfx(won ? 'win' : 'lose');
    const ch = this.level.challenge || {};
    let challengeMet = false;
    if (ch.maxPlants) challengeMet = this.stats.planted <= ch.maxPlants;
    else if (ch.noLoss) challengeMet = this.stats.lost === 0;
    else if (ch.spend) challengeMet = this.stats.spent <= ch.spend;
    const starList = won ? [true, this.lanterns === (this.level.lanterns || LANTERNS), challengeMet] : [false, false, false];
    const waves = this.endless ? Math.max(0, this.wave - 1) : this.wave;
    const res = { won, reason, stars: starList.filter(Boolean).length, starList, waves, endless: this.endless, stats: this.stats, boss: this.level.boss, daily: this.level.daily, potluck: this.potluck ? this.level : null };
    this.result = res;
    setTimeout(() => this.opts.onEnd && this.opts.onEnd(res), 900);
  }

  // ---------- render ----------
  render() {
    const ctx = this.ctx;
    const t = this.time;
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-6, 6) * this.shake, rand(-6, 6) * this.shake);
    drawBackdrop(ctx, this.world, t, { W, H, BX, BY, BR: BOARD_R, BB: BOARD_B }, this.decor);
    if (['day', 'ember', 'frost'].includes(this.world.mech)) drawClouds(ctx, W, 18, t, this.world.mech === 'ember' ? 'rgba(255,220,190,0.55)' : 'rgba(255,255,255,0.75)');
    this._drawHome(ctx, t);
    this._drawBoard(ctx, t);

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const g = this.grid[r][c];
        if (!g) continue;
        drawGuardian(ctx, g.type, g.x, g.y, TW, t, {
          level: g.level, fire: g.fire, armed: g.armed, hurt: g.hurt > 0, seed: g.seed, hpFrac: g.hp / g.maxHp,
          frozen: g.frozen > 0, over: g.over, armor: g.armor, hurtLevel: 1 - g.hp / g.maxHp, born: g.born,
          hat: this.cosmetics[g.type] && this.cosmetics[g.type].hat, skin: this.cosmetics[g.type] && this.cosmetics[g.type].skin,
        });
        if (g.hp < g.maxHp) this._bar(ctx, g.x - 30, g.y - 4, 60, g.hp / g.maxHp, '#6fdc5a');
        if (g.frozen > 0) { ctx.fillStyle = 'rgba(190,240,255,0.35)'; ctx.fillRect(g.x - TW / 2 + 6, g.y - TH + 14, TW - 12, TH - 16); }
      }
      for (const c of this.corpses) if (c.row === r) drawRotling(ctx, c, TW, t);
      for (const e of this.enemies) {
        if (e.row !== r) continue;
        if (e.diving > 0) { ctx.fillStyle = 'rgba(40,30,60,0.5)'; ctx.beginPath(); ctx.ellipse(e.x, e.y - 4, 60, 14, 0, 0, Math.PI * 2); ctx.fill(); continue; }
        drawRotling(ctx, e, TW, t);
        if (!e.burrowed && (e.hp < e.maxHp || e.def.boss)) {
          const w = e.def.boss ? 150 : 50;
          const sc = e.def.boss ? 1.55 : e.def.big ? 1.25 : e.def.small ? 0.62 : 1;
          const top = e.y - TW * 0.33 * sc * (e.def.crab ? 1.6 : 2.55) - (e.def.flying ? 44 : 0) - 10;
          this._bar(ctx, e.x - w / 2, top, w, e.hp / e.maxHp, '#e0526a');
          if (e.def.boss) this._text(ctx, e.def.name, e.x, top - 6, 16, '#ffd0e8', 'center');
        }
      }
    }
    for (const b of this.boulders) drawBoulder(ctx, b.x, rowY(b.row), TW, t);
    for (const b of this.bolts) {
      ctx.strokeStyle = `rgba(255,250,170,${b.t / 0.4})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      const y = rowY(b.row) - TH * 0.4;
      ctx.moveTo(BX, y);
      for (let x = BX; x < BOARD_R + 60; x += 40) ctx.lineTo(x, y + rand(-18, 18));
      ctx.stroke();
    }
    for (const cl of this.clouds) {
      const a = Math.min(1, (cl.t / cl.max) * 1.5);
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = `rgba(190,120,240,${0.22 * a})`;
        ctx.beginPath();
        ctx.arc(cl.x + Math.cos(i + t) * cl.r * 0.5, cl.y + Math.sin(i * 2 + t) * cl.r * 0.35, cl.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this._drawShots(ctx, t);

    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.t / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // placement ghost
    if ((this.selected >= 0 || this.shovel || this.seedMode) && this.hover) {
      const tile = this._tile(this.hover);
      if (tile && this.activeRows.includes(tile.r)) {
        const ok = this.seedMode ? !!this.grid[tile.r][tile.c] : this.shovel ? true : this.plantable(tile.r, tile.c);
        ctx.fillStyle = this.seedMode ? 'rgba(140,255,90,0.3)' : this.shovel ? 'rgba(255,80,80,0.25)' : ok ? 'rgba(255,255,255,0.25)' : 'rgba(255,60,60,0.3)';
        ctx.fillRect(BX + tile.c * TW, BY + tile.r * TH, TW, TH);
        if (this.selected >= 0 && ok) {
          ctx.globalAlpha = 0.5;
          drawGuardian(ctx, this.loadout[this.selected], colX(tile.c), rowY(tile.r) + 2, TW, t, {});
          ctx.globalAlpha = 1;
        }
      }
    }

    for (const f of this.fireflies) drawFirefly(ctx, f.x, f.y, t + f.seed);
    for (const s of this.pickups) {
      ctx.save(); ctx.shadowColor = '#8bff5a'; ctx.shadowBlur = 20;
      drawWildseed(ctx, s.x, s.y + Math.sin(t * 3) * 5, 18, t);
      ctx.restore();
      if (s.t > 9 && Math.sin(t * 20) > 0) { ctx.globalAlpha = 0.3; drawWildseed(ctx, s.x, s.y, 18, t); ctx.globalAlpha = 1; }
    }
    for (const m of this.motes) {
      ctx.globalAlpha = !m.taken && m.life - m.t < 2 ? (Math.sin(m.t * 20) > 0 ? 1 : 0.3) : 1;
      drawGlowMote(ctx, m.x, m.y, t, m.value > 25 ? 28 : m.value < 25 ? 17 : 22);
    }
    ctx.globalAlpha = 1;
    this._drawWeather(ctx, t);
    for (const tx of this.texts) {
      ctx.globalAlpha = clamp(tx.t, 0, 1);
      this._text(ctx, tx.text, tx.x, tx.y, 22, tx.color, 'center');
    }
    ctx.globalAlpha = 1;
    if (this.empower > 0) { ctx.fillStyle = `rgba(214,168,255,${0.08 + Math.sin(t * 8) * 0.04})`; ctx.fillRect(0, BY, W, H - BY); }
    // storybook lighting: warm key light from the top-left
    const light = ctx.createRadialGradient(BX + 120, BY - 60, 40, BX + 300, BY + 120, 900);
    const nightish = ['night', 'crystal', 'blight'].includes(this.world.mech);
    light.addColorStop(0, nightish ? 'rgba(160,180,255,0.12)' : 'rgba(255,240,190,0.18)');
    light.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = light; ctx.fillRect(0, BY, W, H - BY);
    if (this.world.mech === 'night' || this.world.mech === 'crystal') {
      const v = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 800);
      v.addColorStop(0, 'rgba(0,0,20,0)'); v.addColorStop(1, 'rgba(0,0,20,0.45)');
      ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();

    this._drawHud(ctx, t);
    if (this.cine) this._drawCinematic(ctx, t);

    if (this.banner) {
      const a = clamp(Math.min(this.banner.t, this.banner.dur - this.banner.t) * 3, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(20,10,30,0.6)';
      ctx.fillRect(0, H / 2 - 50, W, 100);
      this._text(ctx, this.banner.text, W / 2, H / 2 + 16, this.banner.text.length > 40 ? 36 : 46, '#fff4c8', 'center');
      ctx.globalAlpha = 1;
    }
    if (this.hint >= 0 && this.hint < 4) {
      const msgs = [
        'Pick a guardian card at the top, then pick a tile to plant it.',
        'Grab the floating Glow motes to collect energy. Plant Glowcaps for more!',
        'Tip: drop the same card on a guardian to upgrade it (up to 3 stars)!',
        'Wildseed! Tap the seed button, then a guardian, to trigger its OVERBLOOM.',
      ];
      if (this.hint === 2 && !this._hintTimer) this._hintTimer = this.time + 8;
      if (this._hintTimer && this.time > this._hintTimer) { this.hint = -1; this._hintTimer = 0; }
      ctx.fillStyle = 'rgba(20,10,30,0.75)';
      ctx.beginPath(); ctx.roundRect(W / 2 - 450, H - 58, 900, 46, 12); ctx.fill();
      this._text(ctx, msgs[this.hint] || '', W / 2, H - 27, 20, '#fff', 'center');
    }
  }

  _drawCinematic(ctx, t) {
    const c = this.cine;
    const k = 1 - c.t / c.max;
    const inK = Math.min(1, k * 4), outK = Math.min(1, c.t * 4);
    const a = Math.min(inK, outK);
    ctx.save();
    ctx.fillStyle = `rgba(10,4,14,${0.6 * a})`;
    ctx.fillRect(0, 0, W, H);
    // letterbox
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, 90 * a);
    ctx.fillRect(0, H - 90 * a, W, 90 * a);
    const def = ROTLINGS[c.k];
    const bx = W - 380 + (1 - Math.min(1, k * 2.2)) * 520 + (Math.random() - 0.5) * (k > 0.35 && k < 0.6 ? 10 : 0);
    ctx.globalAlpha = a;
    drawRotling(ctx, { k: c.k, x: bx, y: H - 110, def, seed: 1, shell: 0, shield: 0, hurt: 0, eating: k > 0.3 && k < 0.7 }, 210, t * 6);
    // name card
    const cardX = 80 - (1 - Math.min(1, Math.max(0, k - 0.05) * 7)) * 700;
    ctx.fillStyle = 'rgba(40,10,40,0.85)';
    ctx.beginPath(); ctx.moveTo(cardX, 250); ctx.lineTo(cardX + 620, 250); ctx.lineTo(cardX + 580, 400); ctx.lineTo(cardX - 40, 400); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ff6ad5'; ctx.lineWidth = 4; ctx.stroke();
    this._text(ctx, 'BOSS', cardX + 30, 292, 24, '#ff9ad5');
    this._text(ctx, def.name.toUpperCase(), cardX + 30, 350, 52, '#fff4c8');
    this._text(ctx, BOSS_TITLES[c.k] || '', cardX + 30, 386, 22, '#ffd0e8');
    ctx.restore();
  }

  _drawHome(ctx, t) {
    const night = ['night', 'crystal', 'blight'].includes(this.world.mech);
    ctx.fillStyle = this.world.ground[1];
    ctx.fillRect(-20, BY - 10, W + 40, H - BY + 30);
    // greenhouse
    const g = ctx.createLinearGradient(0, BY, 0, H);
    g.addColorStop(0, night ? '#2a3550' : '#d8f0f8'); g.addColorStop(1, night ? '#1c2540' : '#b8dcea');
    ctx.fillStyle = g;
    ctx.fillRect(-20, BY - 10, 105, H - BY + 30);
    ctx.strokeStyle = night ? '#4c5f8a' : '#8cb4c4';
    ctx.lineWidth = 3;
    for (let y = BY; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(-20, y); ctx.lineTo(85, y); ctx.stroke(); }
    for (let x = 10; x < 85; x += 36) { ctx.beginPath(); ctx.moveTo(x, BY - 10); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 4; i++) ctx.fillRect(14 + i * 4, BY + 20 + i * 140, 6, 80);
    // hanging pots inside
    for (let i = 0; i < 3; i++) {
      const px = 30 + i * 22, py = BY + 60 + i * 180;
      ctx.fillStyle = '#b8643a'; ctx.beginPath(); ctx.moveTo(px - 9, py); ctx.lineTo(px + 9, py); ctx.lineTo(px + 6, py + 12); ctx.lineTo(px - 6, py + 12); ctx.fill();
      ctx.fillStyle = '#6fbf4a'; ctx.beginPath(); ctx.arc(px, py - 3, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#6b4a2a';
    ctx.fillRect(85, BY - 10, 12, H - BY + 30);
    const total = this.level.lanterns || LANTERNS;
    for (let i = 0; i < total; i++) drawLantern(ctx, 122, BY + 170 + i * 170 - (total === 1 ? -170 : 0), i < this.lanterns, t + i);
  }

  _drawBoard(ctx, t) {
    const lawnArt = entryFor('backgrounds', this.world.id);
    if (lawnArt) ctx.drawImage(lawnArt.idle[0], BX, BY, BOARD_R - BX, BOARD_B - BY);
    else ctx.drawImage(this.boardTex, BX, BY);
    drawGroundDetails(ctx, this.world, null, this.decor, t);
    // wooden garden frame with an inner soft shadow
    ctx.save();
    const ig = ctx.createLinearGradient(0, BY, 0, BY + 26);
    ig.addColorStop(0, 'rgba(0,0,0,0.28)'); ig.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ig; ctx.fillRect(BX, BY, BOARD_R - BX, 26);
    ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 6;
    ctx.strokeRect(BX - 3, BY - 1, BOARD_R - BX + 6, BOARD_B - BY + 6);
    ctx.strokeStyle = 'rgba(255,220,170,0.25)'; ctx.lineWidth = 2;
    ctx.strokeRect(BX - 5, BY - 3, BOARD_R - BX + 10, BOARD_B - BY + 10);
    ctx.restore();
    // short picket fence where the Rotlings come in
    const fenceDark = ['night', 'crystal', 'blight'].includes(this.world.mech);
    for (let r = 0; r < ROWS; r++) {
      for (const yy of [BY + r * TH + 18, BY + r * TH + 74]) {
        ctx.fillStyle = fenceDark ? '#5a4a6a' : '#e8dcc0';
        ctx.beginPath(); ctx.moveTo(BOARD_R + 4, yy); ctx.lineTo(BOARD_R + 10, yy - 10); ctx.lineTo(BOARD_R + 16, yy); ctx.lineTo(BOARD_R + 16, yy + 34); ctx.lineTo(BOARD_R + 4, yy + 34); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = 'rgba(40,24,12,0.6)'; ctx.lineWidth = 2; ctx.stroke();
      }
    }
    // tile states
    for (const r of this.activeRows) for (let c = 0; c < COLS; c++) {
      const tile = this.tiles[r][c];
      const x = BX + c * TW, y = BY + r * TH;
      if (tile.blight) {
        const p = 0.5 + 0.5 * Math.sin(t * 2 + c + r);
        ctx.fillStyle = `rgba(110,30,100,${0.45 + p * 0.1})`;
        ctx.fillRect(x + 4, y + 4, TW - 8, TH - 8);
        ctx.strokeStyle = 'rgba(255,90,200,0.5)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 10, y + TH - 20); ctx.quadraticCurveTo(x + TW / 2, y + 20, x + TW - 10, y + TH - 30); ctx.stroke();
        if (tile.cleanse > 0) this._bar(ctx, x + 20, y + 8, TW - 40, tile.cleanse / 4, '#7ff0c0');
      }
      if (tile.scorch > 0) {
        ctx.fillStyle = `rgba(40,20,10,${Math.min(0.6, tile.scorch / 4)})`;
        ctx.beginPath(); ctx.ellipse(x + TW / 2, y + TH - 30, TW * 0.4, TH * 0.22, 0, 0, Math.PI * 2); ctx.fill();
        if (Math.random() < 0.1) this.puff(x + TW / 2 + rand(-30, 30), y + TH - 30, '#ff8a4c', 1, 20);
      }
      if (tile.frozen > 0) {
        ctx.fillStyle = 'rgba(200,240,255,0.85)';
        ctx.beginPath(); ctx.roundRect(x + 8, y + 10, TW - 16, TH - 18, 10); ctx.fill();
        ctx.strokeStyle = '#7fb8d8'; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x + 24, y + 24); ctx.lineTo(x + 50, y + 44); ctx.moveTo(x + 60, y + 30); ctx.lineTo(x + 80, y + 70); ctx.stroke();
        for (let i = 0; i < tile.frozen; i++) { ctx.fillStyle = '#4a7a9a'; ctx.beginPath(); ctx.arc(x + TW / 2 - 14 + i * 14, y + TH - 22, 4, 0, Math.PI * 2); ctx.fill(); }
      }
      if (tile.crystal) drawCrystal(ctx, x + TW / 2, y + TH - 10, TW, t);
      if (tile.pot) this._drawPot(ctx, x + TW / 2, y + TH - 12, tile.pot, t);
    }
    for (const s of this.strikes) {
      const x = colX(s.c), y = rowY(s.r) - 20;
      const k = 1 - s.t / 2;
      ctx.strokeStyle = `rgba(255,${s.kind === 'boss' ? 60 : 120},40,${0.5 + Math.sin(t * 20) * 0.3})`;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 40 - k * 15, 0, Math.PI * 2); ctx.stroke();
      // falling ember
      ctx.fillStyle = '#ff8a4c';
      ctx.beginPath(); ctx.arc(x + (1 - k) * 80, y - (1 - k) * 300, 12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(BOARD_R, BY, W - BOARD_R, ROWS * TH);
  }

  _drawPot(ctx, x, y, pot, t) {
    // an original clay seed-pot with a leafy lid; glazed gold pots hold Wildseeds
    const wob = Math.sin(t * 3 + pot.seed) * 0.03;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(wob);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(0, 0, 34, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-22, -4); ctx.quadraticCurveTo(-44, -38, -24, -66); ctx.lineTo(24, -66); ctx.quadraticCurveTo(44, -38, 22, -4); ctx.closePath();
    const g = ctx.createLinearGradient(-40, 0, 40, 0);
    if (pot.gold) { g.addColorStop(0, '#b8862a'); g.addColorStop(0.45, '#ffe27a'); g.addColorStop(1, '#a8761a'); }
    else { g.addColorStop(0, '#8a4a2a'); g.addColorStop(0.45, '#d0804a'); g.addColorStop(1, '#7a3e22'); }
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 3; ctx.stroke();
    // painted band of little sprouts
    ctx.strokeStyle = pot.gold ? '#fff6c0' : '#f4d6a8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-34, -30); ctx.lineTo(34, -30); ctx.stroke();
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 12, -30); ctx.quadraticCurveTo(i * 12 + 4, -40, i * 12 + 6, -42); ctx.stroke(); }
    // rim + leafy lid
    ctx.beginPath(); ctx.ellipse(0, -66, 27, 7, 0, 0, Math.PI * 2); ctx.fillStyle = pot.gold ? '#e0b84a' : '#a85a32'; ctx.fill(); ctx.stroke();
    for (const [a, c] of [[-0.6, '#5ab04a'], [0.6, '#6fcf5a'], [0, '#7fd05a']]) {
      ctx.save(); ctx.translate(0, -70); ctx.rotate(a);
      ctx.beginPath(); ctx.ellipse(0, -12, 7, 14, 0, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
    if (pot.gold) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 4); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-14, -48, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  _drawShots(ctx, t) {
    for (const p of this.shots) {
      if (p.kind === 'thorn') {
        ctx.fillStyle = '#e9ffd8'; ctx.strokeStyle = '#3a7a2a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x + 14, p.y); ctx.lineTo(p.x - 8, p.y - 5); ctx.lineTo(p.x - 8, p.y + 5); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else if (p.kind === 'frost') {
        ctx.fillStyle = '#d9f7ff'; ctx.shadowColor = '#7fd8ff'; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(p.x, p.y, 9, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      } else if (p.kind === 'pollen') {
        for (let i = 0; i < 4; i++) { ctx.fillStyle = 'rgba(255,230,120,0.8)'; ctx.beginPath(); ctx.arc(p.x - i * 7, p.y + Math.sin(t * 10 + i) * 4, 6 - i, 0, Math.PI * 2); ctx.fill(); }
      } else if (p.kind === 'lance') {
        const k = p.big ? 2 : 1;
        ctx.fillStyle = p.big ? '#d8ff7a' : '#b5e655'; ctx.strokeStyle = '#3a6a1a'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p.x + 30 * k, p.y); ctx.quadraticCurveTo(p.x, p.y - 10 * k, p.x - 30 * k, p.y); ctx.quadraticCurveTo(p.x, p.y + 10 * k, p.x + 30 * k, p.y); ctx.fill(); ctx.stroke();
      } else if (p.kind === 'ember') {
        ctx.fillStyle = '#ff8a4c'; ctx.shadowColor = '#ff5a1a'; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      } else if (p.kind === 'bee' && !(p.delay > 0)) {
        drawBee(ctx, p.x, p.y, 70, t);
      }
    }
    for (const s of this.spits) {
      ctx.fillStyle = '#b7e06a'; ctx.strokeStyle = '#4a6a1a'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(s.x, s.y, 11, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }

  _drawWeather(ctx, t) {
    const mech = this.world.mech;
    for (const p of this.weather) {
      if (mech === 'frost') { ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(p.x, p.y, 2 + p.s, 0, Math.PI * 2); ctx.fill(); }
      else if (mech === 'ember') { ctx.fillStyle = `rgba(255,${120 + p.k * 100},60,${0.5 + 0.4 * Math.sin(t * 5 + p.k * 9)})`; ctx.fillRect(p.x, p.y, 3, 3); }
      else if (mech === 'day') { ctx.fillStyle = 'rgba(255,190,220,0.7)'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 4, 2, t + p.k * 6, 0, Math.PI * 2); ctx.fill(); }
      else if (mech === 'crystal') { ctx.fillStyle = `rgba(214,168,255,${0.3 + 0.5 * Math.abs(Math.sin(t * 2 + p.k * 9))})`; ctx.fillRect(p.x, p.y, 2, 2); }
      else if (mech === 'blight') { ctx.fillStyle = 'rgba(200,120,220,0.45)'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5 * p.s, 0, Math.PI * 2); ctx.fill(); }
    }
    if (this.blizzard > 0) { ctx.fillStyle = 'rgba(220,240,255,0.18)'; ctx.fillRect(0, 0, W, H); }
  }

  _drawHud(ctx, t) {
    const HB = CARD_Y + CARD_H + 10;
    // wooden planter-box tray
    const hudG = ctx.createLinearGradient(0, 0, 0, HB);
    hudG.addColorStop(0, '#8a5a30'); hudG.addColorStop(0.55, '#6b4122'); hudG.addColorStop(1, '#4a2c14');
    ctx.fillStyle = hudG;
    ctx.fillRect(0, 0, W, HB);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 2;
    for (let y = 14; y < HB; y += 22) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(300, y + 4, 700, y - 4, W, y + 2); ctx.stroke(); }
    ctx.fillStyle = '#3a2210'; ctx.fillRect(0, HB - 4, W, 4);
    ctx.fillStyle = '#b07a44'; ctx.fillRect(0, HB - 7, W, 3);
    // leafy vines draped along the bottom edge of the tray
    for (let i = 0; i < 26; i++) {
      const lx = i * 52 + (i % 2) * 18, ly = HB - 2 + (i % 3) * 3;
      ctx.save(); ctx.translate(lx, ly); ctx.rotate(0.5 + Math.sin(t * 1.5 + i) * 0.08 + (i % 2) * 2.2);
      ctx.fillStyle = i % 2 ? '#5fb84a' : '#4f9e3d';
      ctx.beginPath(); ctx.ellipse(8, 0, 9, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    // Glow badge
    const gx = 60, gy = 52;
    ctx.fillStyle = '#2a180a';
    ctx.beginPath(); ctx.arc(gx, gy, 46, 0, Math.PI * 2); ctx.fill();
    const bg = ctx.createRadialGradient(gx - 10, gy - 14, 4, gx, gy, 44);
    bg.addColorStop(0, '#fff6c8'); bg.addColorStop(0.5, '#f0c050'); bg.addColorStop(1, '#a8701a');
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(gx, gy, 41, 0, Math.PI * 2); ctx.fill();
    drawGlowMote(ctx, gx, gy - 10, t, 24);
    ctx.fillStyle = 'rgba(40,22,8,0.8)';
    ctx.beginPath(); ctx.roundRect(gx - 40, gy + 16, 80, 26, 13); ctx.fill();
    this._text(ctx, String(this.glow), gx, gy + 37, 22, '#ffe9a0', 'center');
    if (this.potluck && !this.loadout.length) this._text(ctx, 'Tap pots on the right to break them!', CARD_X + 10, CARD_Y + 58, 20, '#fff4c8');

    const ROLE_COL = { producer: '#f4b324', shooter: '#5cb84a', lobber: '#e8743a', homing: '#e8a03a', melee: '#3f9a6a', wall: '#a8743c', trap: '#a46ad0', instant: '#e0c030', healer: '#3fb8a0', snare: '#9a7a40', ground: '#6a9a3a', buff: '#a888e8' };
    const cw = this.cardW;
    for (let i = 0; i < this.loadout.length; i++) {
      const k = this.loadout[i];
      const def = GUARDIANS[k];
      const sel = this.selected === i;
      const x = CARD_X + i * (cw + CARD_GAP), y = CARD_Y + (sel ? -4 : 2);
      const ch = CARD_H - 4;
      const cost = this.costOf(k);
      const ready = this.cooldowns[i] <= 0 && this.glow >= cost;
      const rc = ROLE_COL[def.kind] || '#8a8a8a';
      // card body with role colour
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.roundRect(x + 2, y + 4, cw, ch, 12); ctx.fill();
      const cg = ctx.createLinearGradient(0, y, 0, y + ch);
      cg.addColorStop(0, '#fffaf0'); cg.addColorStop(1, '#efe0bc');
      ctx.fillStyle = cg;
      ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 12); ctx.fill();
      // portrait window
      const pg = ctx.createRadialGradient(x + cw / 2, y + 30, 4, x + cw / 2, y + 40, cw * 0.7);
      pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.5, rc); pg.addColorStop(1, '#2a1a10');
      ctx.save();
      ctx.beginPath(); ctx.roundRect(x + 5, y + 5, cw - 10, ch - 32, 9); ctx.clip();
      ctx.fillStyle = pg; ctx.fillRect(x, y, cw, ch);
      ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff';
      for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.moveTo(x + cw / 2, y + 30); ctx.arc(x + cw / 2, y + 30, cw, j * 1.26 + t * 0.2, j * 1.26 + 0.4 + t * 0.2); ctx.fill(); }
      ctx.globalAlpha = 1;
      drawGuardian(ctx, k, x + cw / 2, y + ch - 30, Math.min(78, cw * 0.86), t, { hat: this.cosmetics[k] && this.cosmetics[k].hat, skin: this.cosmetics[k] && this.cosmetics[k].skin, seed: i });
      ctx.restore();
      // cost pill
      ctx.fillStyle = '#3a2210';
      ctx.beginPath(); ctx.roundRect(x + 6, y + ch - 25, cw - 12, 21, 10); ctx.fill();
      drawGlowMote(ctx, x + 18, y + ch - 14.5, t, 9);
      this._text(ctx, this.potluck ? 'FREE' : String(cost), x + cw / 2 + 7, y + ch - 8, 17, ready ? '#ffe9a0' : '#d0a080', 'center');
      // cooldown sweep
      if (!ready) {
        ctx.fillStyle = 'rgba(20,10,30,0.45)';
        ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 12); ctx.fill();
        if (this.cooldowns[i] > 0) {
          const f = this.cooldowns[i] / def.recharge;
          const cx = x + cw / 2, cy = y + (ch - 28) / 2 + 4;
          ctx.fillStyle = 'rgba(0,0,0,0.45)';
          ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, cw * 0.75, -Math.PI / 2, -Math.PI / 2 + f * Math.PI * 2); ctx.closePath(); ctx.fill();
          this._text(ctx, String(Math.ceil(this.cooldowns[i])), cx, cy + 9, 24, '#fff', 'center');
        }
      }
      ctx.strokeStyle = sel ? '#fff27a' : '#3a2210';
      ctx.lineWidth = sel ? 4 : 2.5;
      ctx.beginPath(); ctx.roundRect(x, y, cw, ch, 12); ctx.stroke();
      if (sel) { ctx.save(); ctx.shadowColor = '#ffe27a'; ctx.shadowBlur = 18; ctx.stroke(); ctx.restore(); }
      // hotkey number
      ctx.fillStyle = 'rgba(42,24,10,0.75)';
      ctx.beginPath(); ctx.arc(x + 12, y + 12, 9, 0, Math.PI * 2); ctx.fill();
      this._text(ctx, String(i + 1), x + 12, y + 17, 12, '#fff', 'center', false);
    }
    // trowel badge
    const sx = this._shovelX();
    this._roundBadge(ctx, sx + 48, CARD_Y + 44, 40, this.shovel ? '#ffb0a0' : '#d8c8a8');
    ctx.save();
    ctx.translate(sx + 48, CARD_Y + 44); ctx.rotate(-0.7);
    ctx.fillStyle = '#7a4a24'; ctx.fillRect(-5, 4, 10, 26);
    const tg = ctx.createLinearGradient(-16, -30, 16, 0); tg.addColorStop(0, '#eef4f8'); tg.addColorStop(1, '#8a98a4');
    ctx.fillStyle = tg; ctx.beginPath(); ctx.moveTo(-15, 4); ctx.quadraticCurveTo(0, -40, 15, 4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    this._text(ctx, 'Dig', sx + 48, CARD_Y + CARD_H - 4, 16, '#fff4d8', 'center');

    // Wildseed panel
    const b = this._seedBtn();
    const active = this.seedMode;
    const sg = ctx.createLinearGradient(0, b.y, 0, b.y + b.h);
    sg.addColorStop(0, active ? '#eaffc8' : this.seeds > 0 ? '#4f8a32' : '#3a2a1a'); sg.addColorStop(1, active ? '#b8f07a' : this.seeds > 0 ? '#2f5a1e' : '#22160c');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.roundRect(b.x, b.y + 4, b.w, b.h - 10, 16); ctx.fill();
    ctx.strokeStyle = this.seeds > 0 ? '#c8ff8a' : '#5a4a3a'; ctx.lineWidth = 3; ctx.stroke();
    if (this.seeds > 0 && !active) { ctx.save(); ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 4); ctx.shadowColor = '#a8ff7a'; ctx.shadowBlur = 16; ctx.stroke(); ctx.restore(); }
    for (let i = 0; i < this.maxSeeds; i++) {
      ctx.globalAlpha = i < this.seeds ? 1 : 0.22;
      drawWildseed(ctx, b.x + 22 + i * ((b.w - 44) / Math.max(1, this.maxSeeds - 1)), b.y + 36, 12, t + i);
    }
    ctx.globalAlpha = 1;
    this._bar(ctx, b.x + 12, b.y + b.h - 22, b.w - 24, this.seedMeter / 100, '#a8ff7a');
    this._text(ctx, active ? 'Pick a guardian!' : 'Wildseeds', b.x + b.w / 2, b.y + b.h - 28, 14, active ? '#2a4a10' : '#fff', 'center', !active);

    if (this.potluck) this._text(ctx, `Pots left: ${this.potsLeft}`, W - 90, CARD_Y + CARD_H + 36, 18, '#fff', 'center');
    else if (this.endless) this._text(ctx, `Wave ${this.wave}`, W - 80, CARD_Y + CARD_H + 36, 18, '#fff', 'center');
    else this._drawFlagBar(ctx, t);
    if (this.level.challenge && !this.endless) {
      const ch = this.level.challenge;
      const txt = ch.maxPlants ? `★ Plant ≤ ${ch.maxPlants} (${this.stats.planted})` : ch.noLoss ? `★ Lose no guardians${this.stats.lost ? ' ✗' : ''}` : `★ Spend ≤ ${ch.spend} (${this.stats.spent})`;
      ctx.fillStyle = 'rgba(30,18,10,0.7)';
      ctx.font = '800 15px "Trebuchet MS", sans-serif';
      const tw = ctx.measureText(txt).width;
      ctx.beginPath(); ctx.roundRect(W - tw - 26, H - 32, tw + 18, 26, 13); ctx.fill();
      this._text(ctx, txt, W - 17, H - 13, 15, '#fff4c8', 'right');
    }
    // speed + pause: glossy round buttons
    this._roundBadge(ctx, W - 114, CARD_Y + 50, 30, this.speed === 2 ? '#ffd23a' : '#e8dcc0');
    ctx.fillStyle = '#3d2816';
    for (let j = 0; j < (this.speed === 2 ? 2 : 1); j++) {
      const ox = W - 122 + j * 12 - (this.speed === 2 ? 4 : -2);
      ctx.beginPath(); ctx.moveTo(ox, CARD_Y + 38); ctx.lineTo(ox + 14, CARD_Y + 50); ctx.lineTo(ox, CARD_Y + 62); ctx.closePath(); ctx.fill();
    }
    this._roundBadge(ctx, W - 42, CARD_Y + 50, 30, '#e8dcc0');
    ctx.fillStyle = '#3d2816';
    ctx.beginPath(); ctx.roundRect(W - 52, CARD_Y + 37, 7, 26, 3); ctx.roundRect(W - 39, CARD_Y + 37, 7, 26, 3); ctx.fill();
  }

  _roundBadge(ctx, x, y, r, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.arc(x + 1, y + 4, r, 0, Math.PI * 2); ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, color); g.addColorStop(1, '#8a6a40');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a2210'; ctx.lineWidth = 3; ctx.stroke();
  }

  _drawFlagBar(ctx, t) {
    const x = W - 300, y = CARD_Y + CARD_H + 22, w = 280, h = 18;
    const total = this.level.waves;
    const prog = Math.min(1, (this.wave - 1 + Math.min(1, Math.max(0, 1 - (this.nextWave - this.time) / 26))) / total);
    ctx.fillStyle = 'rgba(30,18,10,0.75)';
    ctx.beginPath(); ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 12); ctx.fill();
    const g = ctx.createLinearGradient(x + w, 0, x, 0);
    g.addColorStop(0, '#ff6a8a'); g.addColorStop(1, '#ffd23a');
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 9); ctx.fill();
    // progress grows from right (where Rotlings come from) to left
    const pw = w * Math.max(0, prog);
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x + w - pw, y, pw, h, 9); ctx.fill();
    for (let i = 1; i <= total; i++) {
      const big = i === total || i % 4 === 0;
      if (!big) continue;
      const fx = x + w - (i / total) * w;
      ctx.fillStyle = '#4a2a1a'; ctx.fillRect(fx - 1, y - 14, 3, h + 14);
      ctx.fillStyle = i <= this.wave ? '#ff6a8a' : '#e8d6ae';
      ctx.beginPath(); ctx.moveTo(fx + 2, y - 14); ctx.lineTo(fx + 18, y - 9); ctx.lineTo(fx + 2, y - 4); ctx.fill();
    }
    // creeping Rotling head marker
    const hx = x + w - pw;
    ctx.fillStyle = '#8a6a9c';
    ctx.beginPath(); ctx.arc(hx, y + h / 2, 12, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#f6f0c8'; ctx.beginPath(); ctx.arc(hx - 3, y + h / 2 - 2, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c62f4a'; ctx.beginPath(); ctx.arc(hx - 4, y + h / 2 - 2, 2.5, 0, Math.PI * 2); ctx.fill();
    this._text(ctx, `Wave ${Math.min(this.wave, total)}/${total}`, x + w / 2, y + h + 22, 15, '#fff', 'center');
  }

  _bar(ctx, x, y, w, frac, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x, y, w, 7);
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, (w - 2) * clamp(frac, 0, 1), 5);
  }

  _text(ctx, s, x, y, size, color, align = 'left', outline = true) {
    ctx.font = `800 ${size}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
    ctx.textAlign = align;
    if (outline) {
      ctx.lineWidth = Math.max(3, size / 6);
      ctx.strokeStyle = 'rgba(30,15,10,0.85)';
      ctx.lineJoin = 'round';
      ctx.strokeText(s, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(s, x, y);
  }
}
