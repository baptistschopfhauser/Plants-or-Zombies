// Bloomguard — menus, story, progression and platform integration.
import {
  GUARDIANS, ROTLINGS, ENEMY_INFO, WORLDS, LEVELS, LEVELS_PER_WORLD, ACHIEVEMENTS, MAX_RANK, RANK_COST, loadoutSlots,
  HATS, SKINS, BOOSTS, MODIFIERS, POTLUCK, dailyLevel, todayKey, LORE, ROLES, BOSS_TITLES, COSMETICS_ENABLED,
} from './data.js';
import { Game } from './game.js';
import { drawGuardian, drawRotling, drawPortrait, drawBackdrop, makeDecor, drawClouds, drawGroundDetails, drawCrystal } from './art.js';
import { playCinema } from './cinema.js';
import { playBonk } from './bonk.js';
import { sfx, startMusic, stopMusic, setAudio, unlockAudio } from './audio.js';
import { SPEAKERS, scene } from './story.js';
import * as store from './save.js';
import { initGamepad } from './gamepad.js';
import { loadSprites } from './sprites.js';

const desktop = window.bloomDesktop || null;
let data = store.load();
setAudio({ sfx: data.settings.sfx, music: data.settings.music });
// Cosmetics are switched off for now: refund anything bought and clear what was worn.
const cos = (g) => (COSMETICS_ENABLED ? data.equipped[g] || null : null);
let cosmeticRefund = 0;
if (!COSMETICS_ENABLED && (data.owned.hats.length || data.owned.skins.length)) {
  for (const h of data.owned.hats) cosmeticRefund += (HATS[h] || { price: 0 }).price;
  for (const k of data.owned.skins) cosmeticRefund += (SKINS[k] || { price: 0 }).price;
  data.acorns += cosmeticRefund;
  data.owned = { hats: [], skins: [] };
  data.equipped = {};
  store.save(data);
}

const $ = (s) => document.querySelector(s);
const ui = $('#ui');
const canvas = $('#game');
let game = null;
let screen = 'title';
let pendingLevel = 0;
let mapWorld = Math.min(WORLDS.length - 1, Math.floor(Math.min(data.unlockedLevel, LEVELS.length - 1) / LEVELS_PER_WORLD));

function persist() { store.save(data); }

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'style') n.style.cssText = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), (e) => { unlockAudio(); v(e); });
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : document.createTextNode(k));
  return n;
}

function potArt() {
  const c = el('canvas', { width: 180, height: 180, class: 'portrait' });
  c.style.width = c.style.height = '90px';
  const ctx = c.getContext('2d');
  ctx.translate(90, 160); ctx.scale(1.3, 1.3);
  ctx.beginPath(); ctx.moveTo(-22, -4); ctx.quadraticCurveTo(-44, -38, -24, -66); ctx.lineTo(24, -66); ctx.quadraticCurveTo(44, -38, 22, -4); ctx.closePath();
  const g = ctx.createLinearGradient(-40, 0, 40, 0); g.addColorStop(0, '#8a4a2a'); g.addColorStop(0.45, '#d0804a'); g.addColorStop(1, '#7a3e22');
  ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, -66, 27, 7, 0, 0, Math.PI * 2); ctx.fillStyle = '#a85a32'; ctx.fill(); ctx.stroke();
  for (const [a, col] of [[-0.6, '#5ab04a'], [0.6, '#6fcf5a'], [0, '#7fd05a']]) { ctx.save(); ctx.translate(0, -70); ctx.rotate(a); ctx.beginPath(); ctx.ellipse(0, -12, 7, 14, 0, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
  ctx.font = '800 30px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff4d8'; ctx.fillText('?', 0, -22);
  return c;
}

function startBonk() {
  stopGame();
  screen = 'bonk';
  ui.hidden = false;
  ui.className = 'screen-cinema';
  ui.innerHTML = '';
  startMusic(2);
  playBonk(ui, (res) => {
    const best = res.score > data.mini.bonk;
    if (best) data.mini.bonk = res.score;
    const a = res.quit ? 0 : gainAcorns(Math.floor(res.score / 15));
    persist();
    show('minigames');
    if (!res.quit) toast(`Score ${res.score}${best ? ' (new best!)' : ''} · +${a} 🌰`);
  });
}

function portrait(type, size = 90, isEnemy = false, cos = null) {
  const c = el('canvas', { width: size * 2, height: size * 2, class: 'portrait' });
  c.style.width = c.style.height = size + 'px';
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  if (isEnemy) {
    const def = ROTLINGS[type];
    const s = def.boss ? size * 0.48 : def.big ? size * 0.68 : def.small ? size * 1.3 : size * 0.9;
    drawRotling(ctx, { k: type, x: size / 2 + (def.boss ? 4 : 8), y: size - 6 + (def.flying ? 20 : 0), def, seed: 1, shell: def.shell || 0, shield: def.shield || 0, hurt: 0 }, s, 0.3);
  } else {
    drawGuardian(ctx, type, size / 2, size - 6, size * 0.95, 0.3, cos ? { hat: cos.hat, skin: cos.skin } : {});
  }
  return c;
}

function totalStars() { return Object.values(data.stars).reduce((a, b) => a + b, 0); }

function award(id) {
  if (data.achievements[id]) return null;
  data.achievements[id] = Date.now();
  persist();
  const a = ACHIEVEMENTS.find((x) => x.id === id);
  toast(`🏆 ${a.name}`);
  return a;
}

function toast(text) {
  const t = el('div', { class: 'toast' }, text);
  document.body.append(t);
  setTimeout(() => t.classList.add('show'), 20);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 2600);
}

function show(name, ...args) {
  screen = name;
  ui.innerHTML = '';
  ui.className = 'screen-' + name + ' enter';
  ui.hidden = false;
  SCREENS[name](...args);
  requestAnimationFrame(() => ui.classList.remove('enter'));
}

function stopGame() {
  if (game) { game.destroy(); game = null; }
  canvas.hidden = true;
}

function topbar(title, back, right = null) {
  return el('div', { class: 'topbar' },
    el('button', { class: 'back', onclick: () => { sfx('click'); back(); } }, '‹ Back'),
    el('h1', {}, title),
    right || el('span', { class: 'spacer' }));
}

// ---------- story (living scenes: characters walk in, react, emote) ----------
function playStory(key, lines, done) {
  if (!lines || !data.settings.story) { done(); return; }
  stopGame();
  screen = 'story';
  ui.hidden = false;
  ui.className = 'screen-story';
  ui.innerHTML = '';
  let i = 0;
  const cv = el('canvas', { width: 1280, height: 520, class: 'story-bg' });
  const box = el('div', { class: 'story-box' });
  const nameEl = el('div', { class: 'story-name' });
  const textEl = el('div', { class: 'story-text' });
  const pcv = el('canvas', { width: 360, height: 360, class: 'story-portrait' });
  box.append(pcv, el('div', { class: 'story-words' }, nameEl, textEl, el('div', { class: 'story-hint' }, 'Tap to continue ▸')));
  const skip = el('button', { class: 'skip', onclick: (e) => { e.stopPropagation(); finish(); } }, 'Skip ›');
  ui.append(cv, box, skip);
  const world = WORLDS[Math.min(WORLDS.length - 1, Math.floor(pendingLevelForStory / LEVELS_PER_WORLD))];
  const decor = makeDecor(world, { W: 1280, H: 520, BX: 0, BY: 360, BR: 1280, BB: 520 });
  const boss = lines.map(([w]) => SPEAKERS[w].rotling).find(Boolean);
  let typed = 0;
  let lineT = 0;
  let raf;
  const t0 = performance.now();
  let lastNow = t0;
  const ease = (k) => (k < 0 ? 0 : k > 1 ? 1 : 1 - Math.pow(1 - k, 3));
  function emote(ctx, x, y, sym, k) {
    if (!sym || k > 2.2) return;
    const pop = Math.min(1, k * 5);
    ctx.save();
    ctx.translate(x, y - Math.sin(Math.min(1, k * 3) * Math.PI) * 10);
    ctx.scale(pop, pop);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(0, 0, 30, 26, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, 22); ctx.lineTo(-16, 38); ctx.lineTo(4, 24); ctx.fill(); ctx.stroke();
    ctx.font = '800 30px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = sym === '💢' ? '#e0304a' : sym === '♥' ? '#ff5a8a' : '#2a1a14';
    ctx.fillText(sym, 0, 2);
    ctx.restore();
  }
  function render(now) {
    raf = requestAnimationFrame(render);
    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    const t = (now - t0) / 1000;
    lineT += dt;
    const ctx = cv.getContext('2d');
    drawBackdrop(ctx, world, t, { W: 1280, H: 520, BY: 360 }, decor);
    if (['dawn', 'orchard', 'frost'].includes(world.id)) drawClouds(ctx, 1280, 40, t);
    const g = ctx.createLinearGradient(0, 360, 0, 520);
    g.addColorStop(0, world.ground[0]); g.addColorStop(1, world.ground[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 360, 1280, 160);
    const [who, text, sym] = lines[i];
    typed = Math.min(text.length, typed + 1.3);
    textEl.textContent = text.slice(0, Math.floor(typed));
    const talking = typed < text.length;
    const pctx = pcv.getContext('2d');
    pctx.clearRect(0, 0, 360, 360);
    const sp = SPEAKERS[who];
    if (sp.rotling) drawRotling(pctx, { k: sp.rotling, x: 190, y: 330, def: ROTLINGS[sp.rotling], seed: 1, shell: 0, shield: 0, hurt: 0, eating: talking }, 150, t);
    else drawPortrait(pctx, who, 180, 340, 400, t, talking);
    // heroes walk in from the left; the speaker hops forward and the listener dims
    const enter = ease(t / 1.2);
    const actor = (name, baseX, baseY, size, delay) => {
      const k = ease((t - delay) / 1.1);
      const x = -150 + (baseX + 150) * k;
      const walking = k < 1;
      const isSpeaker = who === name;
      const hop = walking ? Math.abs(Math.sin(t * 9)) * 10 : isSpeaker && talking ? Math.abs(Math.sin(t * 6)) * 6 : 0;
      ctx.save();
      if (!isSpeaker && !walking) ctx.globalAlpha = 0.8;
      const sc = isSpeaker ? 1.06 : 1;
      ctx.translate(x, baseY); ctx.scale(sc, sc); ctx.translate(-x, -baseY);
      drawPortrait(ctx, name, x, baseY - hop, size, t + delay, isSpeaker && talking);
      ctx.restore();
      if (isSpeaker) emote(ctx, x + size * 0.32, baseY - size * 0.8, sym, lineT);
    };
    actor('wren', 430, 372, 200, 0);
    actor('moss', 600, 376, 180, 0.25);
    if (boss) {
      const def = ROTLINGS[boss];
      const beaten = key.startsWith('post');
      const k = ease((t - 0.4) / 1.4);
      const bx = 1400 - 470 * k;
      const shake = !beaten && who === boss && talking ? Math.sin(t * 40) * 3 : 0;
      drawRotling(ctx, { k: boss, x: bx + shake, y: 378, def, seed: 2, shell: 0, shield: 0, hurt: 0, eating: who === boss && talking, dying: beaten ? 0.55 : undefined, confused: beaten ? 1 : 0 }, 110, t);
      if (who === boss) emote(ctx, bx - 80, 200, sym, lineT);
    }
    void enter;
  }
  function showLine() {
    const [who] = lines[i];
    const sp = SPEAKERS[who];
    nameEl.textContent = sp.name;
    nameEl.style.color = sp.color;
    typed = 0;
    lineT = 0;
  }
  function next() {
    const text = lines[i][1];
    if (typed < text.length) { typed = text.length; return; }
    sfx('click');
    i++;
    if (i >= lines.length) finish();
    else showLine();
  }
  let finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    ui.removeEventListener('click', next);
    data.seenStory[key] = true;
    persist();
    done();
  }
  ui._storyNext = next;
  ui.addEventListener('click', next);
  showLine();
  raf = requestAnimationFrame(render);
}
let pendingLevelForStory = 0;

function withStory(kind, level, done) {
  const key = `${kind}-${level}`;
  const lines = scene(kind, level);
  pendingLevelForStory = level;
  if (lines && !data.seenStory[key]) playStory(key, lines, done);
  else done();
}

function playMovie(which, done) {
  stopGame();
  stopMusic();
  screen = 'cinema';
  ui.hidden = false;
  ui.className = 'screen-cinema';
  ui.innerHTML = '';
  const c = playCinema(which, ui, () => { done(); });
  ui._skipCinema = c.skip;
  startMusic(which === 'ending' ? 0 : 1);
}

function gainAcorns(n) {
  const v = Math.round(n * (data.boosts.luckyclover ? 1.25 : 1));
  data.acorns += v;
  return v;
}

function currencyBar() {
  return el('div', { class: 'chips' },
    el('span', { class: 'chip acorn', title: 'Acorns' }, `🌰 ${data.acorns}`),
    el('span', { class: 'chip petal', title: 'Petals' }, `🌸 ${data.petals}`),
    el('span', { class: 'chip star', title: 'Stars' }, `★ ${totalStars()}`));
}

// Illustrated landmarks for each world on the level map.
function drawLandmarks(ctx, world, t) {
  const id = world.id;
  ctx.save();
  if (id === 'dawn') {
    // Grandma Ada's greenhouse in the corner
    ctx.translate(1120, 470);
    ctx.fillStyle = 'rgba(215,240,250,0.9)'; ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-90, 60); ctx.lineTo(-90, -10); ctx.lineTo(0, -60); ctx.lineTo(90, -10); ctx.lineTo(90, 60); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 2; for (let x = -60; x <= 60; x += 30) { ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, -25 + Math.abs(x) * 0.3); ctx.stroke(); }
    ctx.fillStyle = `rgba(255,210,90,${0.8 + Math.sin(t * 4) * 0.15})`; ctx.fillRect(40, 10, 14, 18);
  } else if (id === 'marsh') {
    ctx.fillStyle = 'rgba(40,80,90,0.7)';
    ctx.beginPath(); ctx.ellipse(1080, 480, 170, 50, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(200,240,255,0.25)'; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(1080, 480, 60 + i * 40 + Math.sin(t + i) * 4, 14 + i * 10, 0, 0, Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < 6; i++) { const x = 330 + i * 150; ctx.fillStyle = `rgba(220,255,140,${0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i))})`; ctx.beginPath(); ctx.arc(x + Math.sin(t + i) * 20, 260 + (i % 3) * 60, 4, 0, Math.PI * 2); ctx.fill(); }
  } else if (id === 'frost') {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [x, y, w] of [[200, 520, 90], [700, 540, 120], [1120, 500, 110]]) { ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.25, 0, Math.PI, 0); ctx.fill(); }
    for (let i = 0; i < 40; i++) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc((i * 137 + t * 20) % 1280, (i * 71 + t * 30) % 560, 2, 0, Math.PI * 2); ctx.fill(); }
  } else if (id === 'caverns') {
    for (const [x, y, s] of [[160, 540, 120], [640, 560, 90], [1110, 530, 140]]) drawCrystal(ctx, x, y, s, t);
  } else if (id === 'rotheart') {
    for (const [x, y, w] of [[260, 500, 110], [760, 520, 140], [1100, 470, 90]]) {
      const g = ctx.createRadialGradient(x, y, 0, x, y, w);
      g.addColorStop(0, 'rgba(120,30,110,0.6)'); g.addColorStop(1, 'rgba(120,30,110,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

// Animated illustrated scene behind the main menu.
function menuScene(cv) {
  const ctx = cv.getContext('2d');
  const world = WORLDS[0];
  const decor = makeDecor(world, { W: 1280, H: 720, BX: 0, BY: 360, BR: 1280, BB: 720 });
  const t0 = performance.now();
  let mx = 0, my = 0;
  cv.parentElement.addEventListener('pointermove', (e) => { mx = e.clientX / window.innerWidth - 0.5; my = e.clientY / window.innerHeight - 0.5; });
  const guards = ['glowcap', 'thornling', 'frostbell', 'hivebloom', 'barkwall'];
  const frame = () => {
    if (!cv.isConnected) return;
    requestAnimationFrame(frame);
    const t = (performance.now() - t0) / 1000;
    drawBackdrop(ctx, world, t, { W: 1280, H: 720, BY: 360 }, decor);
    // sun rays
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.translate(1050, 110);
    for (let i = 0; i < 10; i++) { ctx.rotate(Math.PI / 5); ctx.fillStyle = '#fff6c0'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -40 - Math.sin(t + i) * 10); ctx.lineTo(900, 40); ctx.fill(); }
    ctx.restore();
    drawClouds(ctx, 1280, 60, t);
    const layer = (color, base, amp, f, off, par) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(-60, 720);
      for (let x = -60; x <= 1340; x += 20) ctx.lineTo(x + mx * par, base + my * par * 0.4 + Math.sin(x * f + off) * amp);
      ctx.lineTo(1340, 720); ctx.closePath(); ctx.fill();
    };
    layer('#a8d8a0', 380, 26, 0.006, 1, 10);
    layer('#8cc77f', 430, 20, 0.009, 3, 20);
    layer('#6db54f', 500, 14, 0.012, 5, 34);
    // greenhouse on the left hill
    ctx.save(); ctx.translate(mx * 26, my * 10);
    ctx.fillStyle = 'rgba(215,240,250,0.85)'; ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(60, 520); ctx.lineTo(60, 400); ctx.lineTo(190, 330); ctx.lineTo(320, 400); ctx.lineTo(320, 520); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 3; for (let x = 100; x < 320; x += 44) { ctx.beginPath(); ctx.moveTo(x, 520); ctx.lineTo(x, 380); ctx.stroke(); }
    ctx.fillStyle = `rgba(255,210,90,${0.8 + Math.sin(t * 4) * 0.15})`; ctx.shadowColor = '#ffcf5a'; ctx.shadowBlur = 30; ctx.fillRect(250, 430, 20, 26); ctx.shadowBlur = 0;
    ctx.restore();
    // path
    ctx.fillStyle = '#d8b880';
    ctx.beginPath(); ctx.moveTo(320, 520); ctx.quadraticCurveTo(640, 560, 760, 720); ctx.lineTo(560, 720); ctx.quadraticCurveTo(520, 580, 320, 540); ctx.fill();
    // guardians lined along the front
    guards.forEach((g, i) => {
      const eq = cos(g) || {};
      drawGuardian(ctx, g, 120 + i * 120 + mx * 44, 690 + my * 8, 120, t + i, { seed: i * 2, hat: eq.hat, skin: eq.skin });
    });
    drawPortrait(ctx, 'wren', 470 + mx * 44, 600, 170, t);
    drawPortrait(ctx, 'moss', 360 + mx * 44, 612, 150, t + 1);
    // Rotlings peeking from bushes on the right
    for (const [i, k] of ['grub', 'skitter', 'shieldbug'].entries()) {
      const peek = Math.max(0, Math.sin(t * 0.8 + i * 2.1));
      const bx = 1010 + i * 90 + mx * 44, by = 610 + i * 30;
      drawRotling(ctx, { k, x: bx, y: by + 70 - peek * 60, def: ROTLINGS[k], seed: i, shell: ROTLINGS[k].shell || 0, shield: ROTLINGS[k].shield || 0, hurt: 0 }, 100, t);
      ctx.fillStyle = '#4f9e3d';
      for (const [dx, r] of [[-40, 34], [0, 42], [40, 34]]) { ctx.beginPath(); ctx.arc(bx + dx, by + 28, r, Math.PI, 0); ctx.fill(); }
      ctx.fillStyle = '#5ab04a'; ctx.fillRect(bx - 74, by + 26, 148, 40);
    }
    // drifting petals
    for (let i = 0; i < 28; i++) {
      const x = ((i * 137 + t * (25 + (i % 5) * 9)) % 1340) - 30, y = ((i * 89 + t * (30 + (i % 7) * 8)) % 760) - 20;
      ctx.fillStyle = i % 3 ? 'rgba(255,182,230,0.85)' : 'rgba(255,242,168,0.85)';
      ctx.beginPath(); ctx.ellipse(x, y, 6, 3, t * 2 + i, 0, Math.PI * 2); ctx.fill();
    }
  };
  frame();
}

// ---------- screens ----------
const SCREENS = {
  title() {
    stopGame();
    startMusic(0);
    const anyProgress = data.unlockedLevel > 0;
    const bg = el('canvas', { width: 1280, height: 720, class: 'menu-bg' });
    const sign = (label, icon, fn, cls = '') => el('button', { class: `sign ${cls}`, onclick: () => { sfx('click'); fn(); } }, el('span', { class: 'ico' }, icon), label);
    const dailyDone = data.daily.last === todayKey();
    ui.append(
      bg,
      el('div', { class: 'menu-top' }, currencyBar()),
      el('div', { class: 'menu-logo' },
        el('h1', { class: 'logo' }, 'Bloomguard'),
        el('p', { class: 'tagline' }, 'Recover the Hearthseed · Light the lanterns · Hold back the blight')),
      el('div', { class: 'menu-signs' },
        sign(anyProgress ? 'Continue Adventure' : 'New Adventure', '🌱', () => {
          if (!data.seenIntro) playMovie('intro', () => { data.seenIntro = true; persist(); withStory('pre', 0, () => show('map')); });
          else if (!anyProgress) withStory('pre', 0, () => show('map'));
          else show('map');
        }, 'big'),
        el('div', { class: 'sign-grid' },
          sign(dailyDone ? 'Daily ✓' : 'Daily Challenge', '📅', () => show('daily'), dailyDone ? '' : 'glow'),
          sign('Mini-games', '🎲', () => show('minigames')),
          sign('Zen Nursery', '🪴', () => show('nursery')),
          sign('Store', '🛍', () => show('store')),
          sign('Grove', '🌿', () => show('grove')),
          sign('Trophies', '🏆', () => show('trophies')),
          sign('Lexicon', '📖', () => show('guide')),
          sign('Extras', '🎬', () => show('extras')),
          sign('Settings', '⚙', () => show('settings')),
          desktop ? sign('Quit', '🚪', () => desktop.quit()) : null,
        ),
      ),
    );
    menuScene(bg);
  },

  extras() {
    stopGame();
    ui.append(topbar('Extras', () => show('title')),
      el('div', { class: 'panel extras' },
        el('button', { class: 'big', onclick: () => { sfx('click'); playMovie('intro', () => show('extras')); } }, '🎬 Watch the intro movie'),
        el('button', { class: 'big', disabled: data.seenEnding ? false : '', onclick: () => { sfx('click'); playMovie('ending', () => show('extras')); } }, data.seenEnding ? '🎬 Watch the ending' : '🔒 Ending (defeat the Rot Monarch)'),
        el('button', { onclick: () => { data.seenStory = {}; persist(); toast('Story scenes will play again'); } }, '📜 Replay story scenes'),
        el('p', { class: 'small' }, 'Bloomguard: every character, scene, sound and song is original and generated in code.')));
  },

  daily() {
    stopGame();
    const key = todayKey();
    const lvl = dailyLevel(key, data.unlockedLevel);
    const done = data.daily.last === key;
    const world = WORLDS[lvl.world];
    const reward = Math.min(200, 80 + data.daily.streak * 10);
    const goalText = { defend: 'Keep the lanterns lit.', sprouts: 'Protect the sprouts!', budget: 'No Glow income: start rich, spend wisely.' }[lvl.goal];
    ui.append(topbar('Daily Challenge', () => show('title'), currencyBar()),
      el('div', { class: 'panel daily' },
        el('div', { class: 'daily-head' },
          el('div', {}, el('h2', {}, key), el('p', {}, `${world.name} · ${lvl.waves} waves`), el('p', { class: 'goal-line' }, goalText)),
          el('div', { class: 'streak' }, el('span', { class: 'flame' }, '🔥'), el('strong', {}, String(data.daily.streak)), el('small', {}, 'day streak'))),
        el('h3', {}, 'Today\'s twists'),
        el('div', { class: 'mods' }, lvl.mods.map((m) => el('div', { class: 'mod' }, el('strong', {}, MODIFIERS[m].name), el('small', {}, MODIFIERS[m].desc)))),
        el('h3', {}, 'Rotlings'),
        el('div', { class: 'enemies' }, lvl.pool.map((k) => el('div', { class: 'enemy' }, portrait(k, 56, true), el('span', {}, ROTLINGS[k].name)))),
        el('p', { class: 'reward' }, done ? 'Completed today! Come back tomorrow for a new challenge (you can still replay for fun).' : `Reward: 🌰 ${reward} Acorns · keep your streak going!`),
        el('button', { class: 'big', onclick: () => { sfx('click'); pendingLevel = lvl; show('loadout'); } }, done ? 'Play again' : 'Start!')));
  },

  minigames() {
    stopGame();
    const cards = POTLUCK.map((p, i) => {
      const unlocked = i === 0 || data.unlockedLevel >= i * 12;
      const best = data.mini.potluck[i];
      return el('div', { class: `mg-card ${unlocked ? '' : 'locked'}` },
        el('div', { class: 'mg-art' }, potArt()),
        el('h3', {}, p.name),
        el('p', {}, 'Smash clay pots to find guardians, but some hide Rotlings! Plant your finds for free.'),
        el('p', { class: 'small' }, best ? '✓ Cleared' : `Reward: 🌰 ${p.reward}`),
        el('button', { disabled: unlocked ? false : '', onclick: () => { sfx('click'); show('play', { ...p, mode: 'potluck', potIndex: i }, []); } }, unlocked ? 'Play' : `🔒 Reach level ${i * 12 + 1}`));
    });
    cards.push(el('div', { class: 'mg-card' },
      el('div', { class: 'mg-art' }, portrait('grub', 90, true)),
      el('h3', {}, 'Bonk the Blight'),
      el('p', {}, 'Rotlings pop out of burrows: bonk them fast for combos, but never bonk a sprout!'),
      el('p', { class: 'small' }, `Best: ${data.mini.bonk}`),
      el('button', { onclick: () => { sfx('click'); startBonk(); } }, 'Play')));
    ui.append(topbar('Mini-games', () => show('title'), currencyBar()), el('div', { class: 'mg-grid' }, cards));
  },

  nursery() {
    stopGame();
    const potsCount = 4 + 2 * (data.boosts.nurserypot || 0);
    while (data.nursery.pots.length < potsCount) data.nursery.pots.push(null);
    const GROW_MS = 8 * 60 * 1000;
    const grid = el('div', { class: 'nursery' });
    const chips = currencyBar();
    const bar = topbar('Zen Nursery', () => { clearInterval(timer); show('title'); }, chips);
    const stageOf = (p) => Math.min(1, (Date.now() - p.planted + p.water * 2 * 60 * 1000) / GROW_MS);
    function refresh() {
      grid.innerHTML = '';
      data.nursery.pots.slice(0, potsCount).forEach((p, i) => {
        const cv = el('canvas', { width: 320, height: 320, class: 'npot' });
        const k = p ? stageOf(p) : 0;
        const label = !p ? 'Empty pot' : k >= 1 ? `${GUARDIANS[p.type].name} is ready!` : `${GUARDIANS[p.type].name}: ${Math.ceil((1 - k) * GROW_MS / 60000)} min`;
        const btns = [];
        if (!p) btns.push(el('button', { disabled: data.acorns >= 15 ? false : '', onclick: () => {
          if (data.acorns < 15) return;
          data.acorns -= 15;
          const opts = data.guardians.filter((g) => GUARDIANS[g].over);
          data.nursery.pots[i] = { type: opts[Math.floor(Math.random() * opts.length)], planted: Date.now(), water: 0 };
          sfx('plant'); persist(); refresh(); chips.replaceWith(currencyBar());
        } }, 'Plant seed · 🌰 15'));
        else if (k >= 1) btns.push(el('button', { class: 'big', onclick: () => {
          const a = gainAcorns(40 + Math.floor(Math.random() * 25));
          data.petals += 10;
          data.nursery.pots[i] = null;
          sfx('upgrade'); toast(`Harvest: +${a} 🌰 +10 🌸`); persist(); refresh();
          bar.replaceWith(topbar('Zen Nursery', () => { clearInterval(timer); show('title'); }, currencyBar()));
        } }, 'Harvest'));
        else btns.push(el('button', { disabled: p.water < 2 ? false : '', onclick: () => { p.water++; sfx('collect'); persist(); refresh(); } }, p.water < 2 ? `Water (${2 - p.water} left)` : 'Watered ✓'));
        grid.append(el('div', { class: 'nursery-slot' }, cv, el('strong', {}, label), ...btns));
        drawPot(cv, p, k);
      });
    }
    function drawPot(cv, p, k) {
      const ctx = cv.getContext('2d');
      const t = performance.now() / 1000;
      ctx.clearRect(0, 0, 320, 320);
      const g = ctx.createRadialGradient(160, 140, 20, 160, 160, 200);
      g.addColorStop(0, 'rgba(255,240,200,0.35)'); g.addColorStop(1, 'rgba(255,240,200,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 320, 320);
      if (p) {
        ctx.save();
        const sc = 0.3 + k * 0.7;
        ctx.translate(160, 232); ctx.scale(sc, sc); ctx.translate(-160, -232);
        if (k < 0.33) drawGuardian(ctx, 'sprout', 160, 232, 220, t, {});
        else drawGuardian(ctx, p.type, 160, 232, 220, t, { seed: 3 });
        ctx.restore();
        if (k >= 1) for (let i = 0; i < 6; i++) { const a = t * 2 + i; ctx.fillStyle = '#fff6a8'; ctx.beginPath(); ctx.arc(160 + Math.cos(a) * 90, 140 + Math.sin(a * 1.3) * 60, 4, 0, Math.PI * 2); ctx.fill(); }
        if (p.water) { ctx.fillStyle = 'rgba(80,160,255,0.8)'; for (let i = 0; i < p.water; i++) { ctx.beginPath(); ctx.ellipse(250 + i * 18, 60, 6, 9, 0, 0, Math.PI * 2); ctx.fill(); } }
      }
      // pot
      ctx.beginPath(); ctx.moveTo(90, 230); ctx.lineTo(230, 230); ctx.lineTo(210, 310); ctx.lineTo(110, 310); ctx.closePath();
      const pg = ctx.createLinearGradient(90, 0, 230, 0);
      pg.addColorStop(0, '#9a4e2a'); pg.addColorStop(0.5, '#d88a52'); pg.addColorStop(1, '#8a4222');
      ctx.fillStyle = pg; ctx.fill(); ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.roundRect(80, 220, 160, 22, 8); ctx.fillStyle = '#b8643a'; ctx.fill(); ctx.stroke();
    }
    const timer = setInterval(() => { if (screen !== 'nursery') { clearInterval(timer); return; } refresh(); }, 5000);
    ui.append(bar, el('p', { class: 'sub' }, 'Plant seeds, water them twice to speed them up, and harvest Acorns and petals. Seeds keep growing even while you play!'), grid);
    refresh();
  },

  store() {
    stopGame();
    let tab = COSMETICS_ENABLED ? 'hats' : 'boosts';
    const owned = data.guardians.filter((g) => GUARDIANS[g]);
    let sel = owned.includes('thornling') ? 'thornling' : owned[0];
    const body = el('div', { class: 'store' });
    const preview = el('canvas', { width: 360, height: 360, class: 'store-preview' });
    let chips = currencyBar();
    const bar = el('div', { class: 'topbar' }, el('button', { class: 'back', onclick: () => { sfx('click'); show('title'); } }, '‹ Back'), el('h1', {}, 'Acorn Store'), chips);
    const t0 = performance.now();
    const anim = () => {
      if (!preview.isConnected) return;
      requestAnimationFrame(anim);
      const ctx = preview.getContext('2d');
      ctx.clearRect(0, 0, 360, 360);
      const g = ctx.createRadialGradient(180, 200, 20, 180, 200, 200);
      g.addColorStop(0, '#fff6d8'); g.addColorStop(1, '#e8d6ae');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 360, 360);
      ctx.fillStyle = '#7cc65b'; ctx.beginPath(); ctx.ellipse(180, 320, 150, 34, 0, 0, Math.PI * 2); ctx.fill();
      const eq = cos(sel) || {};
      drawGuardian(ctx, sel, 180, 320, 250, (performance.now() - t0) / 1000, { hat: eq.hat, skin: eq.skin, seed: 1 });
    };
    function render() {
      body.innerHTML = '';
      const nc = currencyBar(); chips.replaceWith(nc); chips = nc;
      const eq = COSMETICS_ENABLED ? data.equipped[sel] || (data.equipped[sel] = {}) : {};
      const tabs = el('div', { class: 'tabs' }, (COSMETICS_ENABLED ? ['hats', 'skins', 'boosts'] : ['boosts']).map((k) => el('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; sfx('click'); render(); } }, { hats: '🎩 Hats', skins: '🎨 Skins', boosts: '⚡ Boosts' }[k])));
      const items = el('div', { class: 'items' });
      if (tab === 'boosts') {
        for (const [k, b] of Object.entries(BOOSTS)) {
          const have = data.boosts[k] || 0;
          items.append(el('div', { class: 'item wide' },
            el('div', {}, el('strong', {}, `${b.name} ${have ? '★'.repeat(have) : ''}`), el('small', {}, b.desc)),
            have >= b.max ? el('span', { class: 'maxed' }, 'OWNED') : el('button', { disabled: data.acorns >= b.price ? false : '', onclick: () => {
              if (data.acorns < b.price) return;
              data.acorns -= b.price; data.boosts[k] = have + 1; sfx('upgrade'); persist(); render();
            } }, `🌰 ${b.price}`)));
        }
      } else {
        const cat = tab === 'hats' ? HATS : SKINS;
        const ownList = data.owned[tab];
        const slot = tab === 'hats' ? 'hat' : 'skin';
        items.append(el('div', { class: `item ${!eq[slot] ? 'equipped' : ''}` }, el('strong', {}, 'None'), el('button', { onclick: () => { eq[slot] = null; persist(); render(); } }, !eq[slot] ? 'Equipped' : 'Equip')));
        for (const [k, it] of Object.entries(cat)) {
          const has = ownList.includes(k);
          const on = eq[slot] === k;
          const thumb = el('canvas', { width: 120, height: 120, class: 'thumb' });
          const tctx = thumb.getContext('2d');
          drawGuardian(tctx, sel, 60, 112, 100, 0.3, { [slot]: k });
          items.append(el('div', { class: `item ${on ? 'equipped' : ''}` }, thumb, el('strong', {}, it.name),
            has ? el('button', { onclick: () => { eq[slot] = on ? null : k; sfx('click'); persist(); render(); } }, on ? 'Equipped ✓' : 'Equip')
              : el('button', { disabled: data.acorns >= it.price ? false : '', onclick: () => {
                if (data.acorns < it.price) return;
                data.acorns -= it.price; ownList.push(k); eq[slot] = k; sfx('upgrade'); persist(); render();
              } }, `🌰 ${it.price}`)));
        }
      }
      const picker = el('div', { class: 'picker' }, owned.map((g) => el('button', { class: g === sel ? 'on' : '', title: GUARDIANS[g].name, onclick: () => { sel = g; sfx('click'); render(); } }, portrait(g, 46, false, cos(g)))));
      if (COSMETICS_ENABLED) body.append(el('div', { class: 'store-left' }, preview, el('h3', {}, GUARDIANS[sel].name), picker), el('div', { class: 'store-right' }, tabs, items));
      else body.append(el('div', { class: 'store-right' }, items));
    }
    ui.append(bar, el('p', { class: 'sub' }, COSMETICS_ENABLED ? 'Earn Acorns from levels, daily challenges, mini-games and the Nursery. Cosmetics are bought once and can be worn by any guardian.' : 'Earn Acorns from levels, daily challenges, mini-games and the Nursery, and spend them on permanent boosts.'), body);
    render();
    anim();
  },

  map() {
    stopGame();
    const wi = mapWorld;
    const world = WORLDS[wi];
    startMusic(wi);
    const first = wi * LEVELS_PER_WORLD;
    const worldUnlocked = first <= data.unlockedLevel;
    const scene = el('div', { class: 'map-scene' });
    const bg = el('canvas', { width: 1280, height: 560, class: 'map-bg' });
    scene.append(bg);
    // winding path positions (percent)
    const pts = [[10, 72], [25, 40], [41, 66], [57, 34], [72, 62], [88, 38]];
    const pathSvg = `<svg viewBox="0 0 100 100" preserveAspectRatio="none" class="map-path"><path d="M ${pts.map(([x, y]) => `${x} ${y}`).join(' L ')}" /></svg>`;
    scene.insertAdjacentHTML('beforeend', pathSvg);
    for (let j = 0; j < LEVELS_PER_WORLD; j++) {
      const i = first + j;
      const lv = LEVELS[i];
      const locked = i > data.unlockedLevel;
      const st = data.stars[i] || 0;
      const icon = lv.boss ? '♛' : lv.goal === 'sprouts' ? '🌱' : lv.goal === 'budget' ? '💰' : lv.goal === 'given' ? '🎁' : String(j + 1);
      scene.append(el('button', {
        class: `node ${locked ? 'locked' : ''} ${lv.boss ? 'boss' : ''} ${i === data.unlockedLevel ? 'current' : ''}`,
        style: `left:${pts[j][0]}%;top:${pts[j][1]}%`,
        disabled: locked ? '' : false,
        'aria-label': `Level ${j + 1}${locked ? ' (locked)' : ''}`,
        onclick: () => { sfx('click'); pendingLevel = i; withStory('pre', i, () => show('loadout')); },
      },
      el('span', { class: 'num' }, locked ? '🔒' : icon),
      el('span', { class: 'stars' }, locked ? '' : '★'.repeat(st) + '☆'.repeat(3 - st))));
    }
    if (!worldUnlocked) scene.append(el('div', { class: 'world-lock' }, `🔒 Clear ${WORLDS[wi - 1].name} to travel here`));
    const worldStars = Array.from({ length: LEVELS_PER_WORLD }, (_, j) => data.stars[first + j] || 0).reduce((a, b) => a + b, 0);
    ui.append(
      el('div', { class: 'topbar' },
        el('button', { class: 'back', onclick: () => { sfx('click'); show('title'); } }, '‹ Back'),
        el('div', { class: 'world-nav' },
          el('button', { class: 'arrow', disabled: wi === 0 ? '' : false, 'aria-label': 'Previous world', onclick: () => { sfx('click'); mapWorld--; show('map'); } }, '‹'),
          el('div', { class: 'world-title' }, el('h1', {}, `${wi + 1}. ${world.name}`), el('small', {}, world.blurb)),
          el('button', { class: 'arrow', disabled: wi === WORLDS.length - 1 ? '' : false, 'aria-label': 'Next world', onclick: () => { sfx('click'); mapWorld++; show('map'); } }, '›'),
        ),
        el('span', { class: 'total' }, `★ ${worldStars}/18 · 🌸 ${data.petals}`),
      ),
      scene,
      el('div', { class: 'map-foot' },
        el('span', { class: 'rule' }, `World rule: ${world.rule}`),
        el('button', { onclick: () => { sfx('click'); show('grove'); } }, '🌿 Grove'),
        el('button', { class: 'endless', disabled: data.unlockedLevel >= 12 ? false : '', title: 'Clear Moonlit Marsh to unlock', onclick: () => { sfx('click'); pendingLevel = 'endless'; show('loadout'); } }, `∞ Endless (best ${data.endlessBest})`),
      ),
    );
    const ctx = bg.getContext('2d');
    const decor = makeDecor(world, { W: 1280, H: 560, BX: 0, BY: 200, BR: 1280, BB: 560 });
    const groundDecor = makeDecor(world, { W: 1280, H: 560, BX: 20, BY: 215, BR: 1260, BB: 550 });
    const t0 = performance.now();
    const frame = () => {
      if (screen !== 'map' || !bg.isConnected) return;
      requestAnimationFrame(frame);
      const t = (performance.now() - t0) / 1000;
      drawBackdrop(ctx, world, t, { W: 1280, H: 560, BY: 200 }, decor);
      const g = ctx.createLinearGradient(0, 200, 0, 560);
      g.addColorStop(0, world.ground[0]); g.addColorStop(1, world.ground[1]);
      ctx.fillStyle = g;
      ctx.fillRect(0, 196, 1280, 364);
      drawGroundDetails(ctx, world, null, groundDecor, t);
      drawLandmarks(ctx, world, t);
    };
    frame();
  },

  loadout() {
    const isObj = typeof pendingLevel === 'object';
    const lvl = pendingLevel === 'endless' ? null : isObj ? pendingLevel : LEVELS[pendingLevel];
    const slots = loadoutSlots(data.unlockedLevel);
    const given = lvl && lvl.goal === 'given';
    const budget = lvl && lvl.goal === 'budget';
    const owned = data.guardians.filter((k) => GUARDIANS[k]);
    const allowed = (k) => !(budget && GUARDIANS[k].kind === 'producer');
    let chosen = given ? lvl.given.slice() : data.loadout.filter((k) => owned.includes(k) && allowed(k)).slice(0, slots);
    const pickable = owned.filter(allowed);
    if (!given && pickable.length <= slots) chosen = pickable.slice();
    const pool = lvl ? lvl.pool.concat(lvl.boss ? [lvl.boss] : []) : ['grub', 'skitter', 'shieldbug', 'crystalback', 'brute', 'monarch'];
    const grid = el('div', { class: 'cards' });
    const info = el('div', { class: 'card-info' }, given ? 'This level gives you a fixed set of guardians.' : 'Tap guardians to add or remove them.');
    const count = el('span', { class: 'count' });
    const start = el('button', { class: 'big go' }, 'Start!');
    function refresh() {
      grid.innerHTML = '';
      const list = given ? lvl.given : owned;
      for (const k of list) {
        const d = GUARDIANS[k];
        const on = chosen.includes(k);
        const ok = allowed(k);
        const roleCol = (ROLES[d.kind] || { color: '#8a8a8a' }).color;
        grid.append(el('button', {
          class: `card ${on ? 'on' : ''} ${ok ? '' : 'banned'}`,
          style: `--role:${roleCol}`,
          'aria-pressed': on ? 'true' : 'false',
          disabled: ok ? false : '',
          onclick: () => {
            sfx('click');
            info.textContent = `${d.name} (${d.cost} Glow): ${d.desc}${d.over ? ' Overbloom: ' + d.over : ''}`;
            if (given) return;
            if (on) chosen = chosen.filter((x) => x !== k);
            else if (chosen.length < slots) chosen.push(k);
            refresh();
          },
        }, portrait(k, 70), el('span', { class: 'cost' }, String(d.cost)), el('span', { class: 'name' }, d.name),
        data.ranks[k] ? el('span', { class: 'rank' }, '✦'.repeat(data.ranks[k])) : null));
      }
      count.textContent = `${chosen.length}/${given ? lvl.given.length : slots}`;
      start.disabled = chosen.length === 0;
    }
    start.addEventListener('click', () => {
      unlockAudio(); sfx('click');
      if (!given) { data.loadout = chosen.slice(); persist(); }
      show('play', pendingLevel, chosen);
    });
    refresh();
    const goalLine = !lvl ? 'Survive as many waves as you can. The world changes every 8 waves!'
      : { defend: 'Keep the lanterns lit.', sprouts: 'Keep the lanterns lit AND protect the sprouts in the first column.', budget: 'No Glow income! You start with plenty. Spend it wisely.', given: 'Win with the guardians provided.' }[lvl.goal];
    const ch = lvl && lvl.challenge;
    const chText = ch ? (ch.maxPlants ? `Plant at most ${ch.maxPlants} guardians` : ch.noLoss ? 'Don\'t lose a single guardian' : `Spend at most ${ch.spend} Glow`) : '';
    ui.append(
      topbar(isObj ? 'Daily Challenge' : lvl ? `${WORLDS[lvl.world].name} ${(pendingLevel % LEVELS_PER_WORLD) + 1}` : 'Endless Bloom', () => show(isObj ? 'daily' : 'map'), count),
      el('div', { class: 'loadout' },
        el('div', { class: 'col' }, el('h3', {}, given ? 'Your guardians for this level' : 'Choose your guardians'), grid, info),
        el('div', { class: 'col side' },
          el('div', { class: 'goal' }, el('strong', {}, 'Goal: '), goalLine,
            lvl ? el('div', { class: 'stargoals' }, '★ Win · ★ Keep all lanterns lit · ★ ' + chText) : null,
            lvl ? el('div', { class: 'rule' }, WORLDS[lvl.world].rule) : null,
            lvl && lvl.mods ? el('div', { class: 'stargoals' }, 'Twists: ' + lvl.mods.map((m) => MODIFIERS[m].name).join(' · ')) : null),
          el('h3', {}, 'Rotlings ahead'),
          el('div', { class: 'enemies' }, pool.map((k) => el('div', { class: `enemy ${ROTLINGS[k].boss ? 'boss' : ''}`, title: ENEMY_INFO[k] }, portrait(k, 56, true), el('span', {}, ROTLINGS[k].name)))),
          start,
        ),
      ),
    );
  },

  play(level, loadout) {
    stopGame(); // never leave a previous game running (e.g. Pause → Restart)
    ui.hidden = true;
    ui.innerHTML = '';
    canvas.hidden = false;
    const lv = level === 'endless' ? null : typeof level === 'object' ? level : LEVELS[level];
    startMusic(lv ? lv.world : 5);
    game = new Game(canvas, {
      level, loadout, autoCollect: data.settings.autoCollect, ranks: data.ranks,
      cosmetics: COSMETICS_ENABLED ? data.equipped : {}, boosts: data.boosts,
      onPause: () => pause(),
      onEnd: (res) => onEnd(level, loadout, res),
    });
  },

  result(res, level, loadout) {
    stopMusic();
    const box = el('div', { class: 'modal' });
    const custom = typeof level === 'object';
    if (custom && res.won) {
      box.append(el('h2', {}, res.potluck ? `${res.potluck.name} cleared!` : 'Daily Challenge complete!'));
      if (!res.potluck) box.append(el('div', { class: 'starrow' }, res.starList.map((s2, i) => el('div', { class: `stargoal ${s2 ? 'got' : ''}` }, el('span', { class: 'big-star' }, s2 ? '★' : '☆'), el('small', {}, ['Victory', 'All lanterns lit', 'Challenge'][i])))));
      box.append(el('p', { class: 'petals' }, `+${res.acorns || 0} 🌰 Acorns`));
      for (const n of res.notes || []) box.append(el('p', { class: 'note' }, n));
    } else if (custom) {
      box.append(el('h2', {}, 'The lanterns went dark…'), el('p', {}, res.reason || ''));
    } else if (res.endless) {
      box.append(el('h2', {}, 'The blight broke through'), el('p', { class: 'big-num' }, `${res.waves} waves`),
        el('p', {}, res.newBest ? 'New personal best!' : `Best: ${data.endlessBest} waves`), el('p', { class: 'petals' }, `+${res.petals} 🌸`));
    } else if (res.won) {
      box.append(el('h2', {}, LEVELS[level].boss ? `${ROTLINGS[LEVELS[level].boss].name} defeated!` : 'Garden saved!'));
      box.append(el('div', { class: 'starrow' }, res.starList.map((s, i) => el('div', { class: `stargoal ${s ? 'got' : ''}` },
        el('span', { class: 'big-star' }, s ? '★' : '☆'), el('small', {}, ['Victory', 'All lanterns lit', 'Challenge'][i])))));
      box.append(el('p', { class: 'petals' }, `+${res.petals} 🌸 petals · +${res.acorns} 🌰 Acorns`));
      if (res.newGuardian) {
        const g = GUARDIANS[res.newGuardian];
        box.append(el('div', { class: 'unlock' }, portrait(res.newGuardian, 96), el('div', {}, el('strong', {}, `New guardian: ${g.name}`), el('p', {}, g.desc))));
      }
      for (const n of res.notes || []) box.append(el('p', { class: 'note' }, n));
    } else {
      box.append(el('h2', {}, 'The lanterns went dark…'), el('p', {}, res.reason || ''), el('p', {}, 'Try a different mix of guardians, upgrade them in the Grove, or save Wildseeds for emergencies.'));
    }
    const nextExists = !custom && !res.endless && res.won && level + 1 < LEVELS.length;
    const home = custom ? (res.potluck ? 'minigames' : 'daily') : 'map';
    box.append(el('div', { class: 'menu row' },
      el('button', { onclick: () => { sfx('click'); show(home); } }, custom ? 'Back' : 'Map'),
      el('button', { onclick: () => { sfx('click'); show('play', level, loadout); } }, 'Retry'),
      nextExists ? el('button', { class: 'big', onclick: () => { sfx('click'); pendingLevel = level + 1; mapWorld = Math.floor((level + 1) / LEVELS_PER_WORLD); withStory('pre', level + 1, () => show('loadout')); } }, 'Next ›') : null,
    ));
    ui.append(box);
  },

  grove() {
    stopGame();
    const list = el('div', { class: 'grove' });
    const petals = el('span', { class: 'total' }, `🌸 ${data.petals}`);
    function refresh() {
      list.innerHTML = '';
      petals.textContent = `🌸 ${data.petals}`;
      for (const k of Object.keys(GUARDIANS)) {
        const owned = data.guardians.includes(k);
        const g = GUARDIANS[k];
        const rank = data.ranks[k] || 0;
        const cost = RANK_COST[rank];
        list.append(el('div', { class: `grove-item ${owned ? '' : 'locked'}` },
          owned ? portrait(k, 72) : el('div', { class: 'qmark' }, '?'),
          el('div', { class: 'grove-info' },
            el('strong', {}, owned ? g.name : '???'),
            el('div', { class: 'pips' }, Array.from({ length: MAX_RANK }, (_, i) => el('span', { class: i < rank ? 'pip on' : 'pip' }))),
            el('small', {}, owned ? `Rank ${rank}: +${rank * 10}% power & health` : 'Not found yet')),
          owned && rank < MAX_RANK ? el('button', {
            disabled: data.petals >= cost ? false : '',
            onclick: () => {
              if (data.petals < cost) return;
              data.petals -= cost;
              data.ranks[k] = rank + 1;
              sfx('upgrade');
              if (data.ranks[k] >= MAX_RANK) award('rank');
              persist();
              refresh();
            },
          }, `Grow · ${cost} 🌸`) : owned ? el('span', { class: 'maxed' }, 'MAX') : null));
      }
    }
    refresh();
    ui.append(topbar('The Grove', () => show(game ? 'map' : 'title'), petals),
      el('p', { class: 'sub' }, 'Moss tends your guardians between battles. Spend petals from victories to permanently strengthen them.'),
      list);
  },

  trophies() {
    stopGame();
    const got = ACHIEVEMENTS.filter((a) => data.achievements[a.id]).length;
    ui.append(topbar('Trophies', () => show('title'), el('span', { class: 'total' }, `${got}/${ACHIEVEMENTS.length}`)),
      el('div', { class: 'trophies' }, ACHIEVEMENTS.map((a) => el('div', { class: `trophy ${data.achievements[a.id] ? 'got' : ''}` },
        el('span', { class: 'cup' }, data.achievements[a.id] ? '🏆' : '🔒'), el('div', {}, el('strong', {}, a.name), el('small', {}, a.desc))))));
  },

  guide() {
    stopGame();
    const owned = new Set(data.guardians);
    const seen = new Set();
    for (let i = 0; i <= Math.min(data.unlockedLevel, LEVELS.length - 1); i++) {
      LEVELS[i].pool.forEach((k) => seen.add(k));
      if (LEVELS[i].boss && i < data.unlockedLevel) seen.add(LEVELS[i].boss);
    }
    let tab = 'guardians';
    let sel = 'glowcap';
    const detail = el('div', { class: 'lex-detail' });
    const grid = el('div', { class: 'lex-grid' });
    const big = el('canvas', { width: 440, height: 440, class: 'lex-portrait' });
    const tabsEl = el('div', { class: 'tabs' });
    const isBoss = (k) => !!ROTLINGS[k] && !!ROTLINGS[k].boss;
    const lists = {
      guardians: Object.keys(GUARDIANS),
      rotlings: Object.keys(ROTLINGS).filter((k) => !isBoss(k)),
      bosses: Object.keys(ROTLINGS).filter(isBoss),
    };
    const known = (k) => (GUARDIANS[k] ? owned.has(k) : seen.has(k));
    const statBar = (label, v, color) => el('div', { class: 'stat-row' }, el('span', {}, label),
      el('div', { class: 'stat-bar' }, el('i', { style: `width:${Math.round(Math.max(0.06, Math.min(1, v)) * 100)}%;background:${color}` })));
    function renderDetail() {
      detail.innerHTML = '';
      const add = (...k) => detail.append(...k.filter(Boolean));
      const g = GUARDIANS[sel];
      const r = ROTLINGS[sel];
      const [lore, tip] = LORE[sel] || ['', ''];
      if (!known(sel)) {
        add(big, el('h2', {}, '???'), el('p', {}, GUARDIANS[sel] ? 'Unlock this guardian on your adventure to learn about it.' : 'Meet this Rotling in battle to learn about it.'));
        return;
      }
      add(big);
      if (g) {
        const role = ROLES[g.kind] || { name: g.kind, color: '#888' };
        const dps = g.damage && g.interval ? g.damage / g.interval : g.cloudDps ? 40 : g.dps || g.heal || (g.amount ? 0 : 20);
        add(
          el('div', { class: 'lex-title' }, el('h2', {}, g.name), el('span', { class: 'role', style: `background:${role.color}` }, role.name)),
          el('div', { class: 'lex-stats' },
            el('div', { class: 'stat-pills' }, el('span', {}, `✦ Cost ${g.cost}`), el('span', {}, `⏱ Recharge ${g.recharge}s`), el('span', {}, `❤ Health ${g.hp}`)),
            statBar('Toughness', Math.log10(g.hp) / Math.log10(4000), '#e0526a'),
            statBar(g.kind === 'producer' ? 'Glow' : 'Power', g.kind === 'producer' ? g.amount / 30 : dps / 40, g.kind === 'producer' ? '#ffcf3a' : '#ff8a3a'),
            statBar('Recharge', 1 - g.recharge / 36, '#5ab0ff')),
          el('p', { class: 'desc' }, g.desc),
          g.over ? el('p', { class: 'over' }, el('strong', {}, '🌱 Overbloom: '), g.over) : null,
          el('p', { class: 'lore' }, '“' + lore + '”'),
          el('p', { class: 'tip' }, el('strong', {}, 'Tip: '), tip));
      } else {
        add(
          el('div', { class: 'lex-title' }, el('h2', {}, r.name), el('span', { class: 'role', style: `background:${r.boss ? '#c0408a' : '#7a5a9a'}` }, r.boss ? 'Boss' : 'Rotling')),
          r.boss ? el('p', { class: 'boss-title' }, BOSS_TITLES[sel] || '') : null,
          el('div', { class: 'lex-stats' },
            el('div', { class: 'stat-pills' }, el('span', {}, `❤ Health ${r.hp + (r.shell || 0) + (r.shield || 0)}`), el('span', {}, `➤ Speed ${r.speed}`), el('span', {}, `🦷 Bite ${r.dps}/s`)),
            statBar('Toughness', Math.log10(r.hp + (r.shell || 0) + (r.shield || 0)) / Math.log10(14000), '#e0526a'),
            statBar('Speed', r.speed / 46, '#5ab0ff'),
            statBar('Bite', r.dps / 700, '#ff8a3a')),
          el('p', { class: 'desc' }, ENEMY_INFO[sel]),
          el('p', { class: 'lore' }, '“' + lore + '”'),
          el('p', { class: 'tip' }, el('strong', {}, 'How to beat it: '), tip));
      }
    }
    function renderGrid() {
      grid.innerHTML = '';
      tabsEl.innerHTML = '';
      for (const [k, label] of [['guardians', '🌱 Guardians'], ['rotlings', '🐛 Rotlings'], ['bosses', '♛ Bosses']]) {
        const n = lists[k].filter(known).length;
        tabsEl.append(el('button', { class: tab === k ? 'on' : '', onclick: () => { tab = k; sel = lists[k][0]; sfx('click'); renderGrid(); renderDetail(); } }, `${label} ${n}/${lists[k].length}`));
      }
      for (const k of lists[tab]) {
        const ok = known(k);
        const card = el('button', { class: `lex-card ${k === sel ? 'on' : ''} ${ok ? '' : 'locked'}`, onclick: () => { sel = k; sfx('click'); renderGrid(); renderDetail(); } });
        const pc = portrait(k, 64, !GUARDIANS[k], GUARDIANS[k] ? cos(k) : null);
        if (!ok) pc.classList.add('silhouette');
        card.append(pc, el('span', {}, ok ? (GUARDIANS[k] || ROTLINGS[k]).name : '???'));
        grid.append(card);
      }
    }
    // animated big portrait on a themed backdrop
    const t0 = performance.now();
    const anim = () => {
      if (!big.isConnected) { if (screen === 'guide') requestAnimationFrame(anim); return; }
      requestAnimationFrame(anim);
      const ctx = big.getContext('2d');
      const t = (performance.now() - t0) / 1000;
      ctx.clearRect(0, 0, 440, 440);
      const isG = !!GUARDIANS[sel];
      const bg = ctx.createRadialGradient(220, 200, 20, 220, 220, 260);
      bg.addColorStop(0, isG ? '#fff6d2' : '#e8d8f2'); bg.addColorStop(1, isG ? '#9fd88a' : '#6a4a8a');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.roundRect(0, 0, 440, 440, 40); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.15; ctx.translate(220, 230);
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(320, -30); ctx.lineTo(320, 30); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = isG ? '#6fbf4a' : '#4a3a5a';
      ctx.beginPath(); ctx.ellipse(220, 392, 170, 34, 0, 0, Math.PI * 2); ctx.fill();
      if (!known(sel)) ctx.filter = 'brightness(0)';
      if (isG) { const eq = cos(sel) || {}; drawGuardian(ctx, sel, 220, 392, 290, t, { hat: eq.hat, skin: eq.skin, seed: 2 }); }
      else { const d = ROTLINGS[sel]; drawRotling(ctx, { k: sel, x: 240, y: 392 + (d.flying ? 40 : 0), def: d, seed: 2, shell: d.shell || 0, shield: d.shield || 0, hurt: 0 }, d.boss ? 150 : d.big ? 210 : d.small ? 400 : 270, t); }
      ctx.filter = 'none';
    };
    ui.append(topbar('Lexicon', () => show('title'), currencyBar()),
      el('div', { class: 'lexicon' }, el('div', { class: 'lex-left panel' }, detail), el('div', { class: 'lex-right' }, tabsEl, grid)));
    renderGrid();
    renderDetail();
    anim();
  },

  settings() {
    stopGame();
    const toggle = (key, label, enabled = true) => el('label', { class: `toggle ${enabled ? '' : 'disabled'}` },
      el('input', { type: 'checkbox', checked: data.settings[key] ? '' : false, disabled: enabled ? false : '', onchange: (e) => {
        data.settings[key] = e.target.checked;
        setAudio({ sfx: data.settings.sfx, music: data.settings.music });
        if (key === 'music' && e.target.checked) startMusic(0);
        persist();
      } }), el('span', {}, label));
    ui.append(
      topbar('Settings', () => show('title')),
      el('div', { class: 'settings' },
        toggle('sfx', 'Sound effects'),
        toggle('music', 'Music'),
        toggle('story', 'Show story scenes'),
        desktop ? el('label', { class: 'toggle' },
          el('input', { type: 'checkbox', id: 'fs-toggle', onchange: (e) => desktop.setFullscreen(e.target.checked) }),
          el('span', {}, 'Fullscreen (F11)')) : null,
        toggle('autoCollect', data.unlockedLevel >= 6 ? 'Auto-collect Glow, fireflies and Wildseeds' : 'Auto-collect (clear Dawn Greenhouse to unlock)', data.unlockedLevel >= 6),
        el('button', { onclick: () => { data.seenStory = {}; persist(); toast('Story scenes will play again'); } }, 'Replay story scenes'),
        el('button', { class: 'danger', onclick: () => {
          if (confirm('Erase all progress? This cannot be undone.')) { data = store.reset(); persist(); show('settings'); }
        } }, 'Reset progress'),
        el('p', { class: 'small' }, 'Bloomguard stores progress only on this device. No ads, no tracking, no accounts.'),
        el('p', { class: 'small' }, 'Controller: stick moves the cursor · A select · B back · Start pause · X speed · Y Wildseed'),
        el('p', { class: 'small' }, 'Version 3.3.0 · All art and sound generated in code.'),
      ),
    );
    if (desktop) desktop.isFullscreen().then((v) => { const c = document.getElementById('fs-toggle'); if (c) c.checked = v; });
  },
};

function onEnd(level, loadout, res) {
  const s = res.stats;
  data.totals.kills += s.kills;
  data.totals.planted += s.planted;
  data.totals.overblooms += s.overblooms;
  res.notes = [];
  let petals = 0;
  let acorns = 0;
  const custom = typeof level === 'object';
  if (custom) {
    if (res.won && res.potluck) {
      const i = res.potluck.potIndex;
      acorns = data.mini.potluck[i] ? Math.round(res.potluck.reward / 3) : res.potluck.reward;
      data.mini.potluck[i] = true;
    } else if (res.won && res.daily) {
      if (data.daily.last !== res.daily) {
        const yesterday = todayKey(new Date(Date.now() - 86400000));
        data.daily.streak = data.daily.last === yesterday ? data.daily.streak + 1 : 1;
        data.daily.best = Math.max(data.daily.best, data.daily.streak);
        acorns = Math.min(200, 80 + (data.daily.streak - 1) * 10);
        data.daily.last = res.daily;
        res.notes.push(`🔥 Streak: ${data.daily.streak} day${data.daily.streak > 1 ? 's' : ''}!`);
      } else acorns = 10;
    }
    res.acorns = gainAcorns(acorns);
    persist();
    stopGame();
    show('result', res, level, loadout);
    return;
  }
  if (res.endless) {
    res.newBest = res.waves > data.endlessBest;
    if (res.newBest) data.endlessBest = res.waves;
    petals = res.waves * 2;
    acorns = res.waves * 3;
    if (res.waves >= 20) award('endless');
  } else if (res.won) {
    const prev = data.starGoals[level] || [false, false, false];
    const merged = prev.map((v, i) => v || res.starList[i]);
    const newStars = merged.filter(Boolean).length - prev.filter(Boolean).length;
    data.starGoals[level] = merged;
    data.stars[level] = merged.filter(Boolean).length;
    petals = (prev[0] ? 5 : 15) + newStars * 10 + (LEVELS[level].boss && !prev[0] ? 25 : 0);
    acorns = (prev[0] ? 8 : 25) + newStars * 10 + (LEVELS[level].boss && !prev[0] ? 50 : 0);
    const lv = LEVELS[level];
    if (lv.reward && !data.guardians.includes(lv.reward)) {
      data.guardians.push(lv.reward);
      if (data.loadout.length < loadoutSlots(data.unlockedLevel)) data.loadout.push(lv.reward);
      res.newGuardian = lv.reward;
    }
    if (level + 1 > data.unlockedLevel) {
      const before = loadoutSlots(data.unlockedLevel);
      data.unlockedLevel = level + 1;
      if (loadoutSlots(data.unlockedLevel) > before) res.notes.push(`Your loadout grew to ${loadoutSlots(data.unlockedLevel)} slots!`);
      if (level === 5) res.notes.push('Unlocked: Auto-collect (toggle in Settings).');
      if (level === 11) res.notes.push('Unlocked: Endless Bloom mode!');
      if ((level + 1) % LEVELS_PER_WORLD === 0 && level + 1 < LEVELS.length) res.notes.push(`New world unlocked: ${WORLDS[(level + 1) / LEVELS_PER_WORLD].name}!`);
    }
    award('first');
    if (data.stars[level] === 3) award('perfect');
    if (totalStars() >= 60) award('starry');
    const bossIdx = ['grubmother', 'bogmaw', 'cinderhusk', 'rimefang', 'gloomwyrm', 'monarch'].indexOf(lv.boss);
    if (bossIdx >= 0) award('boss' + (bossIdx + 1));
    if (Object.keys(GUARDIANS).every((k) => data.guardians.includes(k))) award('collector');
  }
  if (s.threeStar) award('star3');
  if (data.totals.overblooms >= 25) award('over');
  if (data.totals.kills >= 2000) award('kills');
  if (data.totals.planted >= 500) award('planted');
  res.petals = petals;
  data.petals += petals;
  res.acorns = gainAcorns(acorns);
  persist();
  stopGame();
  const after = () => show('result', res, level, loadout);
  if (!res.endless && res.won) {
    withStory('post', level, () => {
      if (level === LEVELS.length - 1 && !data.seenEnding) playMovie('ending', () => { data.seenEnding = true; persist(); after(); });
      else after();
    });
  } else after();
}

function pause() {
  if (!game || game.ended) return;
  game.paused = true;
  ui.hidden = false;
  ui.className = 'screen-pause';
  ui.innerHTML = '';
  const resume = () => { sfx('click'); ui.hidden = true; ui.innerHTML = ''; screen = 'play'; if (game) game.paused = false; };
  screen = 'pause';
  const lvl = game.endless ? null : game.level;
  ui.append(el('div', { class: 'modal' },
    el('h2', {}, 'Paused'),
    lvl ? el('p', { class: 'small-dark' }, WORLDS[lvl.world].rule) : null,
    el('div', { class: 'menu' },
      el('button', { class: 'big', onclick: resume }, 'Resume'),
      el('button', { onclick: () => { sfx('click'); const l = game.opts.level; const lo = game.opts.loadout; show('play', l, lo); } }, 'Restart'),
      el('button', { onclick: () => { sfx('click'); show(typeof game.opts.level === 'object' ? (game.potluck ? 'minigames' : 'daily') : 'map'); } }, 'Quit'),
    ),
  ));
  ui._resume = resume;
}

function handleBack() {
  if (screen === 'play') pause();
  else if (screen === 'pause') ui._resume && ui._resume();
  else if (screen === 'story') ui._storyNext && ui._storyNext();
  else if (screen === 'cinema') ui._skipCinema && ui._skipCinema();
  else if (screen === 'bonk') return;
  else if (screen === 'title') {
    const App = window.Capacitor?.Plugins?.App;
    if (App) App.exitApp();
  } else if (screen === 'loadout' || screen === 'result') show('map');
  else show('title');
}
const CapApp = window.Capacitor?.Plugins?.App;
if (CapApp) {
  CapApp.addListener('backButton', handleBack);
  CapApp.addListener('appStateChange', ({ isActive }) => { if (!isActive && screen === 'play') pause(); });
}
document.addEventListener('visibilitychange', () => { if (document.hidden && screen === 'play') pause(); });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') handleBack();
  if (screen !== 'play' || !game) return;
  if (e.key === ' ') { e.preventDefault(); game.speed = game.speed === 1 ? 2 : 1; }
  if (e.key === 'w' || e.key === 'W') game.toggleSeedMode();
  if (e.key === 'p' || e.key === 'P') pause();
  const n = parseInt(e.key, 10);
  if (n >= 1 && n <= game.loadout.length) game.selectCard(n - 1);
});

initGamepad({
  back: handleBack,
  pause: () => { if (screen === 'play') pause(); else if (screen === 'pause') ui._resume && ui._resume(); },
  speed: () => { if (screen === 'play' && game) game.speed = game.speed === 1 ? 2 : 1; },
  bloom: () => { if (screen === 'play' && game) game.toggleSeedMode(); },
});

if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.Capacitor && !desktop) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Test hook (used by automated smoke tests only)
window.__bloomguard = { get game() { return game; }, show, get data() { return data; }, set mapWorld(v) { mapWorld = v; } };

loadSprites().finally(() => { show('title'); if (cosmeticRefund) toast(`Cosmetics removed: refunded ${cosmeticRefund} 🌰`); });
