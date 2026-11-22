// Bloomguard — core game engine (logic + rendering on a 1280x720 logical canvas).
import { COLS, ROWS, GUARDIANS, ROTLINGS, WORLDS, LEVELS, LANTERNS, UPGRADE_MAX } from './data.js';
import { drawGuardian, drawRotling, drawLantern, drawGlowMote } from './art.js';
import { sfx } from './audio.js';

export const W = 1280, H = 720;
const BX = 150, BY = 122, TW = 112, TH = 118;
const BOARD_R = BX + COLS * TW;
const CARD_X = 124, CARD_W = 96, CARD_H = 100, CARD_Y = 6, CARD_GAP = 6;
const STEP = 1 / 60;

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
    this.endless = opts.level === 'endless';
    this.levelIndex = this.endless ? -1 : opts.level;
    this.level = this.endless
      ? { world: 2, waves: Infinity, pool: ['grub', 'skitter'], budget: 4, endless: true }
      : LEVELS[opts.level];
    this.world = WORLDS[this.level.world];
    this.activeRows = this.level.rows || [0, 1, 2, 3, 4];
    this.loadout = opts.loadout.slice();
    this.autoCollect = !!opts.autoCollect;

    this.time = 0;
    this.glow = this.level.startGlow || (this.level.world === 1 ? 175 : 150);
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.enemies = [];
    this.shots = [];
    this.motes = [];
    this.particles = [];
    this.texts = [];
    this.clouds = [];
    this.bolts = [];
    this.lanterns = LANTERNS;
    this.bloom = 0;
    this.bloomActive = 0;
    this.speed = 1;
    this.paused = false;
    this.ended = false;
    this.selected = -1;
    this.shovel = false;
    this.hover = null;
    this.banner = null;
    this.kills = 0;
    this.shake = 0;
    this.gust = 0;
    this.nextGust = 18;
    this.cooldowns = this.loadout.map((k) => (GUARDIANS[k].recharge >= 20 ? GUARDIANS[k].recharge * 0.5 : 0));

    this.wave = 0; // waves fully launched so far
    this.spawnQueue = [];
    this.nextWave = this.levelIndex === 0 ? 22 : 24;
    this.nextSky = 5;
    this.hint = this.levelIndex === 0 ? 0 : -1;

    this.stars = [];
    for (let i = 0; i < 60; i++) this.stars.push([Math.random() * W, Math.random() * BY, Math.random()]);

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
    this.showBanner(this.endless ? 'Endless Bloom' : `${this.world.name} — Level ${(this.levelIndex % 5) + 1}`, 2.5);
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
    const vw = window.innerWidth, vh = window.innerHeight;
    const scale = Math.min(vw / W, vh / H);
    this.scale = scale;
    const cw = Math.round(W * scale), ch = Math.round(H * scale);
    this.canvas.style.width = cw + 'px';
    this.canvas.style.height = ch + 'px';
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    this.ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
  }

  // ---------- input ----------
  _pos(ev) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
  }
  _tile(p) {
    if (p.x < BX || p.x >= BOARD_R || p.y < BY || p.y >= BY + ROWS * TH) return null;
    return { c: Math.floor((p.x - BX) / TW), r: Math.floor((p.y - BY) / TH) };
  }
  _onDown(ev) {
    if (this.ended) return;
    const p = this._pos(ev);
    this.hover = p;
    this.pointerDown = true;
    // HUD buttons
    if (p.y < CARD_Y + CARD_H + 4) {
      if (p.x > W - 76) { this.opts.onPause && this.opts.onPause(); sfx('click'); return; }
      if (p.x > W - 152) { this.speed = this.speed === 1 ? 2 : 1; sfx('click'); return; }
      const bx = this._bloomBtn();
      if (p.x > bx.x && p.x < bx.x + bx.w) { this.triggerBloom(); return; }
      const sx = this._shovelX();
      if (p.x > sx && p.x < sx + CARD_W) { this.shovel = !this.shovel; this.selected = -1; sfx('click'); return; }
      for (let i = 0; i < this.loadout.length; i++) {
        const cx = CARD_X + i * (CARD_W + CARD_GAP);
        if (p.x > cx && p.x < cx + CARD_W) {
          this.shovel = false;
          if (this.selected === i) { this.selected = -1; return; }
          const g = GUARDIANS[this.loadout[i]];
          if (this.cooldowns[i] > 0 || this.glow < g.cost) { sfx('deny'); this.selected = -1; return; }
          this.selected = i;
          this.dragFromCard = true;
          sfx('click');
          return;
        }
      }
      return;
    }
    this.dragFromCard = false;
    if (this.paused) return;
    // collect glow
    for (const m of this.motes) {
      if (!m.taken && Math.hypot(m.x - p.x, m.y - p.y) < 46) { this.collect(m); return; }
    }
  }
  _onMove(ev) {
    this.hover = this._pos(ev);
  }
  _onUp(ev) {
    if (this.ended || this.paused) return;
    const p = this._pos(ev);
    const wasDrag = this.dragFromCard;
    this.dragFromCard = false;
    const t = this._tile(p);
    if (!t) { if (wasDrag && p.y < CARD_Y + CARD_H + 4) return; return; }
    if (this.shovel) {
      const g = this.grid[t.r][t.c];
      if (g) {
        this.glow += Math.floor(GUARDIANS[g.type].cost * 0.25 * g.level);
        this.grid[t.r][t.c] = null;
        this.puff(g.x, g.y - 30, '#a0703f', 10);
        sfx('plant');
      }
      this.shovel = false;
      return;
    }
    if (this.selected >= 0) this.place(this.selected, t.r, t.c);
  }

  _shovelX() { return CARD_X + this.loadout.length * (CARD_W + CARD_GAP) + 4; }
  _bloomBtn() { const x = this._shovelX() + CARD_W + 14; return { x, w: Math.min(220, W - 160 - x), y: CARD_Y, h: CARD_H }; }

  place(i, r, c) {
    const type = this.loadout[i];
    const def = GUARDIANS[type];
    if (!this.activeRows.includes(r)) { sfx('deny'); return; }
    if (this.cooldowns[i] > 0 || this.glow < def.cost) { sfx('deny'); this.selected = -1; return; }
    const existing = this.grid[r][c];
    if (existing) {
      const upgradable = existing.type === type && existing.level < UPGRADE_MAX && def.kind !== 'trap' && def.kind !== 'instant';
      if (!upgradable) { sfx('deny'); return; }
      existing.level++;
      existing.maxHp = def.hp * hpMul(existing.level);
      existing.hp = existing.maxHp;
      this.puff(existing.x, existing.y - 40, '#ffe14d', 18);
      this.floatText(existing.x, existing.y - 90, `Level ${existing.level}!`, '#ffe14d');
      sfx('upgrade');
    } else {
      this.grid[r][c] = {
        type, r, c, x: colX(c), y: rowY(r) + 2, level: 1,
        hp: def.hp, maxHp: def.hp, timer: def.firstDelay ?? def.interval ?? 0,
        armed: false, arm: def.armTime || 0, fire: 0, hurt: 0, seed: Math.random() * 10, fuse: 0.6,
      };
      this.puff(colX(c), rowY(r) - 10, '#7a5532', 10);
      sfx('plant');
    }
    this.glow -= def.cost;
    this.cooldowns[i] = def.recharge;
    this.selected = -1;
    if (this.hint === 0) this.hint = 1;
  }

  collect(m) {
    m.taken = true;
    m.tx = 60; m.ty = 50;
    sfx('collect');
    if (this.hint === 1) this.hint = 2;
  }

  triggerBloom() {
    if (this.bloom < 100 || this.bloomActive > 0) { sfx('deny'); return; }
    this.bloom = 0;
    this.bloomActive = 6;
    sfx('bloom');
    this.showBanner('BLOOM BURST!', 1.5);
    for (const row of this.grid) for (const g of row) if (g) {
      g.hp = Math.min(g.maxHp, g.hp + g.maxHp * 0.3);
      if (GUARDIANS[g.type].kind === 'producer') this.spawnMote(g.x, g.y - 60, GUARDIANS[g.type].amount, true);
      this.puff(g.x, g.y - 40, '#ffb6e6', 8);
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
    this.motes.push({
      x, y, value, t: 0, life: 10, taken: false,
      vy: fromGuardian ? -60 : 40, floorY: fromGuardian ? y + 40 : rand(BY + 60, BY + ROWS * TH - 40), fromG: fromGuardian,
    });
  }

  // ---------- waves ----------
  _waveCount() { return this.level.waves; }
  _launchWave() {
    const n = this.wave;
    const total = this._waveCount();
    const isLast = !this.endless && n === total - 1;
    const isBig = isLast || (n + 1) % (this.endless ? 5 : 4) === 0;
    let budget;
    if (this.endless) {
      budget = 1 + n * 1.2;
      const all = ['grub', 'skitter', 'shellback', 'moth', 'burrower', 'spore', 'brute'];
      this.level.pool = all.slice(0, Math.min(all.length, 2 + Math.floor(n / 2)));
    } else {
      budget = Math.max(1, this.level.budget * (0.12 + 0.88 * Math.pow(n / Math.max(1, total - 1), 1.25)));
    }
    if (isBig) budget *= 1.7;
    const list = [];
    if (isLast && this.level.boss) list.push('king');
    if (this.endless && n > 0 && n % 10 === 9) list.push('king');
    let guard = 0;
    while (budget > 0.5 && guard++ < 200) {
      const opts = this.level.pool.filter((k) => ROTLINGS[k].cost <= budget + 0.5);
      if (!opts.length) break;
      // weight toward the newest enemies a little
      const k = Math.random() < 0.35 ? opts[opts.length - 1] : pick(opts);
      list.push(k);
      budget -= ROTLINGS[k].cost;
    }
    const spread = isBig ? 4 : 7;
    list.forEach((k, i) => this.spawnQueue.push({ k, at: this.time + (k === 'king' ? 3 : (i / list.length) * spread + rand(0, 1.5)) }));
    this.wave++;
    if (isLast) this.showBanner('Final wave!', 2.5);
    else if (isBig) this.showBanner('A big wave is coming!', 2.5);
    if (isBig || isLast) sfx('wave');
    this.nextWave = this.time + (isBig ? 34 : 26);
  }

  spawnEnemy(k, row, x) {
    const def = ROTLINGS[k];
    const r = row ?? (def.boss ? this.activeRows[Math.floor(this.activeRows.length / 2)] : pick(this.activeRows));
    const hpScale = this.endless ? 1 + this.wave * 0.04 : 1;
    this.enemies.push({
      k, def, row: r, x: x ?? BOARD_R + rand(30, 70), y: rowY(r),
      hp: def.hp * hpScale, maxHp: def.hp * hpScale, shell: def.shell || 0, speed: def.speed,
      slow: 0, burn: 0, burnDps: 0, hurt: 0, eating: false, seed: Math.random() * 10,
      burrowed: !!def.burrow, stun: 0, summon: 8,
    });
  }

  damage(e, amt, opts = {}) {
    if (e.dead) return;
    if (this.bloomActive > 0) amt *= 1.25;
    if (e.shell > 0 && !opts.ignoreShell) {
      const s = Math.min(e.shell, amt);
      e.shell -= s;
      amt -= s;
      if (e.shell <= 0) { this.puff(e.x, e.y - 40, '#8f9c6c', 12); e.speed *= 1.45; }
    }
    e.hp -= amt;
    e.hurt = 0.08;
    if (e.hp <= 0) this.kill(e);
  }

  kill(e) {
    if (e.dead) return;
    e.dead = true;
    this.kills++;
    this.bloom = Math.min(100, this.bloom + (e.def.boss ? 100 : 5 + e.def.cost * 4));
    this.puff(e.x, e.y - 30, e.def.color, e.def.boss ? 40 : 14, e.def.boss ? 260 : 140);
    sfx('die');
    if (e.def.spawnOnDeath) {
      for (let i = 0; i < e.def.spawnOnDeath; i++) {
        const rows = this.activeRows.filter((r) => Math.abs(r - e.row) <= 1);
        this.spawnEnemy('grub', pick(rows), e.x + rand(-20, 30));
      }
    }
    if (e.def.boss) { this.shake = 0.6; sfx('boom'); }
    // Occasionally drop a little glow
    if (Math.random() < 0.12) this.spawnMote(e.x, e.y - 40, 15, true);
  }

  // ---------- update ----------
  _loop(now) {
    this.raf = requestAnimationFrame(this._loop);
    let dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused && !this.ended) {
      this.acc += dt * this.speed;
      let steps = 0;
      while (this.acc >= STEP && steps < 12) { this.update(STEP); this.acc -= STEP; steps++; }
    }
    this.render();
  }

  update(dt) {
    this.time += dt;
    const night = this.world.weather === 'night';

    // cooldowns
    for (let i = 0; i < this.cooldowns.length; i++) this.cooldowns[i] = Math.max(0, this.cooldowns[i] - dt);
    if (this.bloomActive > 0) this.bloomActive -= dt;

    // sky glow
    if (!night && this.time >= this.nextSky) {
      this.nextSky = this.time + rand(8, 11);
      this.spawnMote(rand(BX + 40, BOARD_R - 40), BY - 20, 25, false);
    }

    // wind gusts (Ember Orchard): push Rotlings back, but blow away loose glow
    if (this.world.weather === 'wind') {
      if (this.time >= this.nextGust) {
        this.nextGust = this.time + rand(16, 24);
        this.gust = 1.2;
        this.showBanner('Gust of wind!', 1.2);
        for (const m of this.motes) if (!m.taken && !m.fromG) m.blown = true;
      }
    }
    if (this.gust > 0) {
      this.gust -= dt;
      for (const e of this.enemies) if (!e.def.boss && !e.burrowed) e.x = Math.min(BOARD_R + 40, e.x + 55 * dt);
    }

    // waves
    if (this.wave < this._waveCount()) {
      const fieldClear = this.enemies.length === 0 && this.spawnQueue.length === 0;
      // cleared the field early? the next wave comes sooner
      if (fieldClear && this.wave > 0 && this.nextWave - this.time > 4) this.nextWave = this.time + 4;
      if (this.time >= this.nextWave) this._launchWave();
    }
    for (let i = this.spawnQueue.length - 1; i >= 0; i--) {
      if (this.time >= this.spawnQueue[i].at) { this.spawnEnemy(this.spawnQueue[i].k); this.spawnQueue.splice(i, 1); }
    }

    // guardians
    const rate = this.bloomActive > 0 ? 3 : 1;
    for (const row of this.grid) for (let c = 0; c < COLS; c++) {
      const g = row[c];
      if (!g) continue;
      const def = GUARDIANS[g.type];
      g.hurt = Math.max(0, g.hurt - dt);
      g.fire = Math.max(0, g.fire - dt * 5);
      if (g.hp <= 0) { row[c] = null; this.puff(g.x, g.y - 30, def.color, 12); continue; }
      switch (def.kind) {
        case 'producer':
          g.timer -= dt;
          if (g.timer <= 0) {
            g.timer = def.interval;
            this.spawnMote(g.x + rand(-15, 15), g.y - 70, Math.round(def.amount * (night ? 1.2 : 1) * pow(g.level)), true);
          }
          break;
        case 'shooter': {
          g.timer -= dt * rate;
          const rows = def.spread ? [g.r - 1, g.r, g.r + 1].filter((r) => this.activeRows.includes(r)) : [g.r];
          if (g.timer <= 0 && rows.some((r) => this._targetAhead(r, g.x))) {
            g.timer = def.interval;
            g.fire = 1;
            for (const r of rows) {
              this.shots.push({
                kind: def.projectile, row: r, x: g.x + 20, y: rowY(r) - TH * 0.45, sy: g.y - TH * 0.45, vy: 0,
                dmg: def.damage * pow(g.level), slow: def.slow, slowTime: def.slowTime, pierce: def.pierce, hit: new Set(),
              });
            }
            sfx(def.projectile === 'frost' ? 'frost' : 'shoot');
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
              const tx = Math.max(g.x + 40, tgt.x - tgt.speed * 0.8);
              this.shots.push({ kind: 'ember', row: g.r, x0: g.x, y0: g.y - 70, tx, ty: rowY(g.r) - 20, t: 0, dur: 0.8,
                dmg: def.damage * pow(g.level), splash: def.splash * TW, burnDps: def.burnDps * pow(g.level), burnTime: def.burnTime });
              sfx('shoot');
            }
          }
          break;
        }
        case 'healer': {
          const h = def.heal * pow(g.level) * dt;
          for (const row2 of this.grid) for (const o of row2) {
            if (o && Math.abs(o.r - g.r) <= 1 && Math.abs(o.c - g.c) <= 1) o.hp = Math.min(o.maxHp, o.hp + h);
          }
          break;
        }
        case 'trap':
          if (!g.armed) { g.arm -= dt; if (g.arm <= 0) { g.armed = true; this.puff(g.x, g.y - 20, '#c58df0', 6); } }
          else if (this.enemies.some((e) => e.row === g.r && !e.burrowed && !e.def.flying && Math.abs(e.x - g.x) < TW * 0.55)) {
            this.clouds.push({ x: g.x, y: g.y - 30, r: def.cloudRadius * TW, t: def.cloudTime, max: def.cloudTime, dps: def.cloudDps, row: g.r });
            row[c] = null;
            sfx('boom');
            this.puff(g.x, g.y - 30, '#c58df0', 24, 200);
          }
          break;
        case 'instant':
          g.fuse -= dt;
          if (g.fuse <= 0) {
            row[c] = null;
            for (const e of this.enemies) if (Math.abs(e.row - g.r) <= def.rows) this.damage(e, def.damage, { ignoreShell: true });
            for (let r = g.r - def.rows; r <= g.r + def.rows; r++) if (this.activeRows.includes(r)) this.bolts.push({ row: r, t: 0.4 });
            this.shake = 0.3;
            sfx('zap');
          }
          break;
      }
    }

    // projectiles
    for (const p of this.shots) {
      if (p.kind === 'ember') {
        p.t += dt;
        const k = p.t / p.dur;
        p.x = p.x0 + (p.tx - p.x0) * k;
        p.y = p.y0 + (p.ty - p.y0) * k - Math.sin(k * Math.PI) * 140;
        if (k >= 1) {
          p.done = true;
          for (const e of this.enemies) {
            if (e.row === p.row && !e.burrowed && Math.abs(e.x - p.tx) < p.splash) {
              this.damage(e, p.dmg);
              e.burn = p.burnTime; e.burnDps = p.burnDps;
            }
          }
          this.puff(p.tx, p.ty, '#ff8a4c', 12, 160);
        }
        continue;
      }
      p.x += 560 * dt;
      if (p.x > W + 20) { p.done = true; continue; }
      for (const e of this.enemies) {
        if (e.dead || e.row !== p.row || e.burrowed || p.hit.has(e)) continue;
        const reach = 26 * (e.def.boss ? 1.9 : e.def.big ? 1.35 : 1);
        if (p.x >= e.x - reach && p.x <= e.x + reach + 20) {
          this.damage(e, p.dmg);
          if (p.slow) e.slow = Math.max(e.slow, p.slowTime);
          sfx('hit');
          this.puff(p.x, p.y, p.kind === 'frost' ? '#bdf0ff' : '#cfffb0', 3, 60);
          if (p.pierce) p.hit.add(e);
          else { p.done = true; break; }
        }
      }
    }
    this.shots = this.shots.filter((p) => !p.done);

    // clouds
    for (const cl of this.clouds) {
      cl.t -= dt;
      for (const e of this.enemies) {
        if (!e.burrowed && Math.abs(e.row - cl.row) <= 1 && Math.hypot(e.x - cl.x, (e.row - cl.row) * TH) < cl.r) this.damage(e, cl.dps * dt, { ignoreShell: true });
      }
    }
    this.clouds = this.clouds.filter((c) => c.t > 0);
    for (const b of this.bolts) b.t -= dt;
    this.bolts = this.bolts.filter((b) => b.t > 0);

    // enemies
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.hurt = Math.max(0, e.hurt - dt);
      if (e.burn > 0) { e.burn -= dt; this.damage(e, e.burnDps * dt, { ignoreShell: true }); if (Math.random() < 0.2) this.puff(e.x, e.y - 40, '#ff8a4c', 1, 30); }
      if (e.dead) continue;
      if (e.stun > 0) { e.stun -= dt; continue; }
      const slowK = e.slow > 0 ? 0.5 : 1;
      if (e.slow > 0) e.slow -= dt;
      if (e.def.boss) {
        e.summon -= dt;
        if (e.summon <= 0) { e.summon = 9; this.spawnEnemy('skitter', pick(this.activeRows), e.x - 40); }
      }
      // find guardian in front
      e.eating = false;
      if (!e.def.flying) {
        const fx = e.x - TW * 0.3;
        const c = Math.floor((fx - BX) / TW);
        const g = c >= 0 && c < COLS ? this.grid[e.row][c] : null;
        if (g && fx < g.x + TW * 0.2) {
          if (e.burrowed) {
            e.burrowed = false;
            e.x = g.x - TW * 0.75;
            e.stun = 2.5; // dazed after surfacing
            this.puff(e.x, e.y - 10, '#7a5532', 14);
          } else if (!(g.type === 'puffball' && g.armed)) {
            e.eating = true;
            g.hp -= e.def.dps * dt * (e.slow > 0 ? 0.5 : 1);
            g.hurt = 0.05;
            if (Math.random() < 0.08) sfx('chomp');
          }
        }
      }
      if (!e.eating) e.x -= e.speed * slowK * dt;
      if (e.x < BX - 30) {
        e.dead = true;
        e.escaped = true;
        this.lanterns--;
        this.shake = 0.5;
        sfx('lantern');
        if (this.lanterns <= 0) { this.finish(false); return; }
        this.showBanner('A Lantern went dark!', 1.5);
        // the dying lantern's flare knocks every Rotling back
        for (const o of this.enemies) if (!o.dead && !o.def.boss) { o.x = Math.min(BOARD_R + 30, o.x + TW * 1.2); o.stun = 1.5; }
      }
    }
    this.enemies = this.enemies.filter((e) => !e.dead);

    // glow motes
    for (const m of this.motes) {
      m.t += dt;
      if (m.taken) {
        m.x += (m.tx - m.x) * Math.min(1, dt * 8);
        m.y += (m.ty - m.y) * Math.min(1, dt * 8);
        if (Math.hypot(m.tx - m.x, m.ty - m.y) < 12) { m.done = true; this.glow += m.value; }
        continue;
      }
      if (m.blown) { m.x += 500 * dt; m.y -= 40 * dt; if (m.x > W + 40) m.done = true; continue; }
      if (m.fromG) {
        m.vy += 160 * dt;
        if (m.y < m.floorY || m.vy < 0) m.y += m.vy * dt;
      } else if (m.y < m.floorY) m.y += 45 * dt;
      if (this.autoCollect && m.t > 1.2) this.collect(m);
      else if (m.t > m.life) m.done = true;
    }
    this.motes = this.motes.filter((m) => !m.done);

    // fx
    for (const p of this.particles) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 200 * dt; }
    this.particles = this.particles.filter((p) => p.t > 0);
    for (const t of this.texts) { t.t -= dt; t.y -= 30 * dt; }
    this.texts = this.texts.filter((t) => t.t > 0);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    this.shake = Math.max(0, this.shake - dt);

    // win check
    if (!this.endless && this.wave >= this._waveCount() && this.enemies.length === 0 && this.spawnQueue.length === 0) {
      this.finish(true);
    }
  }

  _targetAhead(r, x) {
    let best = null;
    for (const e of this.enemies) {
      if (e.row === r && !e.burrowed && !e.dead && e.x > x - 10 && e.x < BOARD_R + 20) {
        if (!best || e.x < best.x) best = e;
      }
    }
    return best;
  }

  finish(won) {
    if (this.ended) return;
    this.ended = true;
    sfx(won ? 'win' : 'lose');
    const stars = won ? (this.lanterns === LANTERNS ? 3 : this.lanterns === 2 ? 2 : 1) : 0;
    const waves = this.endless ? Math.max(0, this.wave - 1) : this.wave;
    setTimeout(() => this.opts.onEnd && this.opts.onEnd({ won, stars, waves, endless: this.endless, kills: this.kills }), 900);
  }

  // ---------- render ----------
  render() {
    const ctx = this.ctx;
    const t = this.time + (this.paused ? 0 : 0);
    ctx.save();
    if (this.shake > 0) ctx.translate(rand(-6, 6) * this.shake, rand(-6, 6) * this.shake);
    this._drawBackground(ctx, t);
    this._drawBoard(ctx, t);

    // entities sorted by row for depth
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const g = this.grid[r][c];
        if (!g) continue;
        drawGuardian(ctx, g.type, g.x, g.y, TW, t, { level: g.level, fire: g.fire, armed: g.armed, hurt: g.hurt > 0, seed: g.seed, hpFrac: g.hp / g.maxHp });
        if (g.hp < g.maxHp) this._bar(ctx, g.x - 30, g.y - 4, 60, g.hp / g.maxHp, '#6fdc5a');
      }
      for (const e of this.enemies) {
        if (e.row !== r) continue;
        drawRotling(ctx, e, TW, t);
        if (!e.burrowed && (e.hp < e.maxHp || e.def.boss)) {
          const w = e.def.boss ? 140 : 50;
          this._bar(ctx, e.x - w / 2, e.y - (e.def.boss ? 125 : e.def.big ? 90 : 70) - (e.def.flying ? 40 : 0), w, e.hp / e.maxHp, '#e0526a');
        }
      }
    }

    // bolts
    for (const b of this.bolts) {
      ctx.strokeStyle = `rgba(255,250,170,${b.t / 0.4})`;
      ctx.lineWidth = 6;
      ctx.beginPath();
      const y = rowY(b.row) - TH * 0.4;
      ctx.moveTo(BX, y);
      for (let x = BX; x < BOARD_R + 60; x += 40) ctx.lineTo(x, y + rand(-18, 18));
      ctx.stroke();
    }

    // clouds
    for (const cl of this.clouds) {
      const a = Math.min(1, cl.t / cl.max * 1.5);
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = `rgba(190,120,240,${0.22 * a})`;
        ctx.beginPath();
        ctx.arc(cl.x + Math.cos(i + t) * cl.r * 0.5, cl.y + Math.sin(i * 2 + t) * cl.r * 0.35, cl.r * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // projectiles
    for (const p of this.shots) {
      if (p.kind === 'thorn') {
        ctx.fillStyle = '#e9ffd8';
        ctx.strokeStyle = '#3a7a2a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x + 14, p.y);
        ctx.lineTo(p.x - 8, p.y - 5);
        ctx.lineTo(p.x - 8, p.y + 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.kind === 'frost') {
        ctx.fillStyle = '#d9f7ff';
        ctx.shadowColor = '#7fd8ff';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (p.kind === 'lance') {
        ctx.fillStyle = '#b5e655';
        ctx.beginPath();
        ctx.moveTo(p.x + 30, p.y);
        ctx.quadraticCurveTo(p.x, p.y - 10, p.x - 30, p.y);
        ctx.quadraticCurveTo(p.x, p.y + 10, p.x + 30, p.y);
        ctx.fill();
      } else if (p.kind === 'ember') {
        ctx.fillStyle = '#ff8a4c';
        ctx.shadowColor = '#ff5a1a';
        ctx.shadowBlur = 16;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // particles
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.t / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // placement ghost
    if ((this.selected >= 0 || this.shovel) && this.hover) {
      const tile = this._tile(this.hover);
      if (tile && this.activeRows.includes(tile.r)) {
        ctx.fillStyle = this.shovel ? 'rgba(255,80,80,0.25)' : 'rgba(255,255,255,0.25)';
        ctx.fillRect(BX + tile.c * TW, BY + tile.r * TH, TW, TH);
        if (!this.shovel) {
          ctx.globalAlpha = 0.5;
          drawGuardian(ctx, this.loadout[this.selected], colX(tile.c), rowY(tile.r) + 2, TW, t, {});
          ctx.globalAlpha = 1;
        }
      }
    }

    // glow motes (above everything on the field)
    for (const m of this.motes) {
      const fade = !m.taken && m.life - m.t < 2 ? (Math.sin(m.t * 20) > 0 ? 1 : 0.3) : 1;
      ctx.globalAlpha = fade;
      drawGlowMote(ctx, m.x, m.y, t, m.value > 25 ? 28 : m.value < 25 ? 17 : 22);
    }
    ctx.globalAlpha = 1;

    for (const tx of this.texts) {
      ctx.globalAlpha = clamp(tx.t, 0, 1);
      this._text(ctx, tx.text, tx.x, tx.y, 22, tx.color, 'center');
    }
    ctx.globalAlpha = 1;

    if (this.bloomActive > 0) {
      ctx.fillStyle = `rgba(255,150,220,${0.08 + Math.sin(t * 8) * 0.04})`;
      ctx.fillRect(0, BY, W, H - BY);
    }
    ctx.restore();

    this._drawHud(ctx, t);

    if (this.banner) {
      const a = clamp(Math.min(this.banner.t, this.banner.dur - this.banner.t) * 3, 0, 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(20,10,30,0.55)';
      ctx.fillRect(0, H / 2 - 50, W, 100);
      this._text(ctx, this.banner.text, W / 2, H / 2 + 16, 48, '#fff4c8', 'center');
      ctx.globalAlpha = 1;
    }

    if (this.hint >= 0 && this.hint < 3) {
      const msgs = [
        'Tap a guardian card at the top, then tap a glowing tile to plant it.',
        'Tap the floating Glow motes to collect energy. Plant Glowcaps for more!',
        'Tip: drop the same card on a guardian to upgrade it. Fill the Bloom meter for a Burst!',
      ];
      if (this.hint === 2 && !this._hintTimer) this._hintTimer = this.time + 8;
      if (this._hintTimer && this.time > this._hintTimer) this.hint = 3;
      ctx.fillStyle = 'rgba(20,10,30,0.7)';
      ctx.beginPath();
      ctx.roundRect(W / 2 - 430, H - 58, 860, 46, 12);
      ctx.fill();
      this._text(ctx, msgs[this.hint] || '', W / 2, H - 27, 20, '#fff', 'center');
    }
  }

  _drawBackground(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, BY);
    g.addColorStop(0, this.world.sky[0]);
    g.addColorStop(1, this.world.sky[1]);
    ctx.fillStyle = g;
    ctx.fillRect(-20, -20, W + 40, BY + 20);
    if (this.world.weather === 'night') {
      for (const [x, y, k] of this.stars) {
        ctx.fillStyle = `rgba(255,255,255,${0.4 + 0.6 * Math.abs(Math.sin(t + k * 10))})`;
        ctx.fillRect(x, y, 2, 2);
      }
    }
    ctx.fillStyle = this.world.ground[1];
    ctx.fillRect(-20, BY - 10, W + 40, H - BY + 30);
    // greenhouse on the left
    ctx.fillStyle = this.world.weather === 'night' ? '#2a3550' : '#cfe9f2';
    ctx.fillRect(-20, BY - 10, 105, H - BY + 30);
    ctx.strokeStyle = this.world.weather === 'night' ? '#4c5f8a' : '#9cc4d4';
    ctx.lineWidth = 3;
    for (let y = BY; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(-20, y); ctx.lineTo(85, y); ctx.stroke(); }
    for (let x = 10; x < 85; x += 36) { ctx.beginPath(); ctx.moveTo(x, BY - 10); ctx.lineTo(x, H); ctx.stroke(); }
    ctx.fillStyle = '#7a5a3a';
    ctx.fillRect(85, BY - 10, 10, H - BY + 30);
    // lanterns
    for (let i = 0; i < LANTERNS; i++) drawLantern(ctx, 120, BY + 170 + i * 170, i < this.lanterns, t + i);
  }

  _drawBoard(ctx) {
    for (let r = 0; r < ROWS; r++) {
      const active = this.activeRows.includes(r);
      for (let c = 0; c < COLS; c++) {
        const x = BX + c * TW, y = BY + r * TH;
        if (!active) {
          ctx.fillStyle = (r + c) % 2 ? '#8b6b4a' : '#7f6143';
        } else {
          const [a, b] = this.world.ground;
          ctx.fillStyle = (r + c) % 2 ? a : b;
        }
        ctx.fillRect(x, y, TW, TH);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(BOARD_R, BY, W - BOARD_R, ROWS * TH);
    if (this.world.weather === 'night') {
      ctx.fillStyle = 'rgba(10,15,50,0.25)';
      ctx.fillRect(BX, BY, BOARD_R - BX, ROWS * TH);
    }
  }

  _drawHud(ctx, t) {
    ctx.fillStyle = 'rgba(40,26,18,0.88)';
    ctx.fillRect(0, 0, W, CARD_Y + CARD_H + 8);
    ctx.fillStyle = '#6b4a2e';
    ctx.fillRect(0, CARD_Y + CARD_H + 6, W, 4);
    // glow counter
    drawGlowMote(ctx, 58, 40, t, 26);
    this._text(ctx, String(this.glow), 58, 94, 26, '#ffe9a0', 'center');
    // cards
    for (let i = 0; i < this.loadout.length; i++) {
      const k = this.loadout[i];
      const def = GUARDIANS[k];
      const x = CARD_X + i * (CARD_W + CARD_GAP), y = CARD_Y;
      const ready = this.cooldowns[i] <= 0 && this.glow >= def.cost;
      ctx.fillStyle = this.selected === i ? '#fff3b0' : '#f4e7c8';
      ctx.beginPath();
      ctx.roundRect(x, y, CARD_W, CARD_H, 10);
      ctx.fill();
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(x, y, CARD_W, CARD_H, 10);
      ctx.clip();
      drawGuardian(ctx, k, x + CARD_W / 2, y + 74, 84, t, {});
      ctx.restore();
      ctx.fillStyle = 'rgba(40,26,18,0.75)';
      ctx.fillRect(x, y + CARD_H - 24, CARD_W, 24);
      this._text(ctx, String(def.cost), x + CARD_W / 2, y + CARD_H - 5, 19, '#ffe9a0', 'center');
      if (!ready) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(x, y, CARD_W, CARD_H);
        if (this.cooldowns[i] > 0) {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(x, y, CARD_W, CARD_H * (this.cooldowns[i] / def.recharge));
        }
      }
      ctx.strokeStyle = this.selected === i ? '#ffd23a' : '#3d2816';
      ctx.lineWidth = this.selected === i ? 4 : 2;
      ctx.beginPath();
      ctx.roundRect(x, y, CARD_W, CARD_H, 10);
      ctx.stroke();
    }
    // shovel (trowel)
    const sx = this._shovelX();
    ctx.fillStyle = this.shovel ? '#ffd0c0' : '#c9b79a';
    ctx.beginPath();
    ctx.roundRect(sx, CARD_Y, CARD_W, CARD_H, 10);
    ctx.fill();
    ctx.save();
    ctx.translate(sx + CARD_W / 2, CARD_Y + 46);
    ctx.rotate(-0.7);
    ctx.fillStyle = '#7a4a24';
    ctx.fillRect(-5, 2, 10, 34);
    ctx.fillStyle = '#b8c3cc';
    ctx.beginPath();
    ctx.moveTo(-16, 2);
    ctx.quadraticCurveTo(0, -46, 16, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    this._text(ctx, 'Dig up', sx + CARD_W / 2, CARD_Y + CARD_H - 6, 18, '#3d2816', 'center', false);

    // bloom meter
    const b = this._bloomBtn();
    if (b.w > 60) {
      const full = this.bloom >= 100 && this.bloomActive <= 0;
      ctx.fillStyle = '#2a1a10';
      ctx.beginPath();
      ctx.roundRect(b.x, b.y + 14, b.w, b.h - 28, 14);
      ctx.fill();
      const fillW = (b.w - 8) * (this.bloomActive > 0 ? this.bloomActive / 6 : this.bloom / 100);
      ctx.fillStyle = full ? `hsl(${(t * 120) % 360},90%,70%)` : '#ff9ad5';
      ctx.beginPath();
      ctx.roundRect(b.x + 4, b.y + 18, Math.max(0, fillW), b.h - 36, 10);
      ctx.fill();
      this._text(ctx, full ? 'TAP: BLOOM!' : this.bloomActive > 0 ? 'BLOOMING' : 'Bloom', b.x + b.w / 2, b.y + b.h / 2 + 8, 20, '#fff', 'center');
    }

    // wave progress
    const label = this.endless ? `Wave ${this.wave}` : `Wave ${Math.min(this.wave, this.level.waves)}/${this.level.waves}`;
    this._text(ctx, label, W - 80, CARD_Y + CARD_H + 32, 18, '#fff', 'center');
    // speed + pause
    ctx.fillStyle = this.speed === 2 ? '#ffd23a' : '#c9b79a';
    ctx.beginPath(); ctx.roundRect(W - 148, CARD_Y + 22, 66, 60, 12); ctx.fill();
    this._text(ctx, this.speed === 2 ? '2x' : '1x', W - 115, CARD_Y + 62, 28, '#3d2816', 'center', false);
    ctx.fillStyle = '#c9b79a';
    ctx.beginPath(); ctx.roundRect(W - 74, CARD_Y + 22, 66, 60, 12); ctx.fill();
    ctx.fillStyle = '#3d2816';
    ctx.fillRect(W - 52, CARD_Y + 36, 8, 32);
    ctx.fillRect(W - 38, CARD_Y + 36, 8, 32);
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
