// Bloomguard — menus, screen flow and Android integration.
import { GUARDIANS, ROTLINGS, ENEMY_INFO, WORLDS, LEVELS, MAX_LOADOUT } from './data.js';
import { Game } from './game.js';
import { drawGuardian, drawRotling } from './art.js';
import { sfx, startMusic, stopMusic, setAudio, unlockAudio } from './audio.js';
import * as store from './save.js';
import { initGamepad } from './gamepad.js';

const desktop = window.bloomDesktop || null;

let data = store.load();
setAudio({ sfx: data.settings.sfx, music: data.settings.music });

const $ = (s) => document.querySelector(s);
const ui = $('#ui');
const canvas = $('#game');
let game = null;
let screen = 'title';
let pendingLevel = 0;

function persist() { store.save(data); }

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), (e) => { unlockAudio(); v(e); });
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k != null) n.append(k.nodeType ? k : document.createTextNode(k));
  return n;
}

function portrait(type, size = 90, isEnemy = false) {
  const c = el('canvas', { width: size * 2, height: size * 2, class: 'portrait' });
  c.style.width = c.style.height = size + 'px';
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  if (isEnemy) {
    const def = ROTLINGS[type];
    const s = def.boss ? size * 0.5 : def.big ? size * 0.7 : size * 0.95;
    drawRotling(ctx, { x: size / 2 + 4, y: size - 6 + (def.flying ? 20 : 0), def, seed: 1, shell: def.shell || 0, hurt: 0 }, s, 0.3);
  } else {
    drawGuardian(ctx, type, size / 2, size - 6, size * 0.95, 0.3, {});
  }
  return c;
}

function show(name, ...args) {
  screen = name;
  ui.innerHTML = '';
  ui.className = 'screen-' + name;
  ui.hidden = false;
  SCREENS[name](...args);
}

function stopGame() {
  if (game) { game.destroy(); game = null; }
  canvas.hidden = true;
}

const SCREENS = {
  title() {
    stopGame();
    startMusic(0);
    const anyProgress = data.unlockedLevel > 0;
    ui.append(
      el('div', { class: 'title-wrap' },
        el('h1', { class: 'logo' }, 'Bloomguard'),
        el('p', { class: 'tagline' }, 'Guard the greenhouse. Light the lanterns. Hold back the blight.'),
        el('div', { class: 'title-art' }, portrait('thornling', 110), portrait('glowcap', 110), portrait('frostbell', 110), portrait('grub', 110, true)),
        el('div', { class: 'menu' },
          el('button', { class: 'big', onclick: () => { sfx('click'); show('map'); } }, anyProgress ? 'Continue' : 'Play'),
          el('button', { onclick: () => { sfx('click'); show('guide'); } }, 'Field Guide'),
          el('button', { onclick: () => { sfx('click'); show('settings'); } }, 'Settings'),
          desktop ? el('button', { onclick: () => desktop.quit() }, 'Quit') : null,
        ),
      ),
    );
  },

  map() {
    stopGame();
    startMusic(0);
    const worlds = WORLDS.map((w, wi) => {
      const lv = LEVELS.map((l, i) => ({ l, i })).filter(({ l }) => l.world === wi);
      return el('section', { class: `world world-${wi}` },
        el('h2', {}, w.name),
        el('div', { class: 'levels' },
          lv.map(({ l, i }) => {
            const locked = i > data.unlockedLevel;
            const st = data.stars[i] || 0;
            return el('button', {
              class: `level ${locked ? 'locked' : ''} ${l.boss ? 'boss' : ''}`,
              disabled: locked ? '' : false,
              'aria-label': `Level ${i + 1}${locked ? ' (locked)' : ''}`,
              onclick: () => { sfx('click'); pendingLevel = i; show('loadout'); },
            },
            el('span', { class: 'num' }, l.boss ? '♛' : String((i % 5) + 1)),
            el('span', { class: 'stars' }, locked ? '🔒' : '★'.repeat(st) + '☆'.repeat(3 - st)));
          }),
        ),
      );
    });
    const endlessUnlocked = data.unlockedLevel >= 10;
    ui.append(
      el('div', { class: 'topbar' },
        el('button', { class: 'back', onclick: () => { sfx('click'); show('title'); } }, '‹ Back'),
        el('h1', {}, 'Choose a Level'),
        el('span', { class: 'total' }, `★ ${Object.values(data.stars).reduce((a, b) => a + b, 0)} / ${LEVELS.length * 3}`),
      ),
      el('div', { class: 'map-scroll' }, worlds,
        el('section', { class: 'world endless' },
          el('h2', {}, 'Endless Bloom'),
          el('p', {}, endlessUnlocked ? `How long can you last? Best: ${data.endlessBest} waves` : 'Clear Moonlit Marsh to unlock.'),
          el('button', { class: 'big', disabled: endlessUnlocked ? false : '', onclick: () => { sfx('click'); pendingLevel = 'endless'; show('loadout'); } }, 'Play Endless'),
        ),
      ),
    );
  },

  loadout() {
    const owned = data.guardians.filter((k) => GUARDIANS[k]);
    let chosen = data.loadout.filter((k) => owned.includes(k)).slice(0, MAX_LOADOUT);
    if (!chosen.length) chosen = owned.slice(0, MAX_LOADOUT);
    // Quick start: if you own few guardians, take them all.
    if (owned.length <= MAX_LOADOUT && chosen.length < owned.length) chosen = owned.slice();
    const lvl = pendingLevel === 'endless' ? null : LEVELS[pendingLevel];
    const pool = lvl ? lvl.pool.concat(lvl.boss ? ['king'] : []) : Object.keys(ROTLINGS);
    const grid = el('div', { class: 'cards' });
    const info = el('div', { class: 'card-info' }, 'Tap guardians to add or remove them.');
    const count = el('span', { class: 'count' });
    const start = el('button', { class: 'big go' }, 'Start!');
    function refresh() {
      grid.innerHTML = '';
      for (const k of owned) {
        const d = GUARDIANS[k];
        const on = chosen.includes(k);
        grid.append(el('button', {
          class: `card ${on ? 'on' : ''}`,
          'aria-pressed': on ? 'true' : 'false',
          onclick: () => {
            sfx('click');
            if (on) chosen = chosen.filter((x) => x !== k);
            else if (chosen.length < MAX_LOADOUT) chosen.push(k);
            info.textContent = `${d.name} (${d.cost} Glow): ${d.desc}`;
            refresh();
          },
        }, portrait(k, 74), el('span', { class: 'cost' }, String(d.cost)), el('span', { class: 'name' }, d.name)));
      }
      count.textContent = `${chosen.length}/${MAX_LOADOUT}`;
      start.disabled = chosen.length === 0;
    }
    start.addEventListener('click', () => {
      unlockAudio();
      sfx('click');
      data.loadout = chosen.slice();
      persist();
      show('play', pendingLevel, chosen);
    });
    refresh();
    ui.append(
      el('div', { class: 'topbar' },
        el('button', { class: 'back', onclick: () => { sfx('click'); show('map'); } }, '‹ Back'),
        el('h1', {}, lvl ? `${WORLDS[lvl.world].name} ${(pendingLevel % 5) + 1}` : 'Endless Bloom'),
        count,
      ),
      el('div', { class: 'loadout' },
        el('div', { class: 'col' }, el('h3', {}, 'Your guardians'), grid, info),
        el('div', { class: 'col side' },
          el('h3', {}, 'Rotlings ahead'),
          el('div', { class: 'enemies' }, pool.map((k) => el('div', { class: 'enemy', title: ENEMY_INFO[k] }, portrait(k, 60, true), el('span', {}, ROTLINGS[k].name)))),
          start,
        ),
      ),
    );
  },

  play(level, loadout) {
    ui.hidden = true;
    ui.innerHTML = '';
    canvas.hidden = false;
    startMusic(level === 'endless' ? 2 : LEVELS[level].world);
    game = new Game(canvas, {
      level, loadout, autoCollect: data.settings.autoCollect,
      onPause: () => pause(),
      onEnd: (res) => onEnd(level, loadout, res),
    });
  },

  result(res, level, loadout) {
    stopMusic();
    const box = el('div', { class: 'modal' });
    if (res.endless) {
      const best = res.waves > data.endlessBest;
      if (best) { data.endlessBest = res.waves; persist(); }
      box.append(el('h2', {}, 'The blight broke through'), el('p', { class: 'big-num' }, `${res.waves} waves`), el('p', {}, best ? 'New personal best!' : `Best: ${data.endlessBest} waves`));
    } else if (res.won) {
      const lv = LEVELS[level];
      box.append(el('h2', {}, 'Garden saved!'), el('p', { class: 'stars-big' }, '★'.repeat(res.stars) + '☆'.repeat(3 - res.stars)));
      if (res.newGuardian) {
        const g = GUARDIANS[res.newGuardian];
        box.append(el('div', { class: 'unlock' }, portrait(res.newGuardian, 100), el('div', {}, el('strong', {}, `New guardian: ${g.name}`), el('p', {}, g.desc))));
      }
      if (res.autoCollectUnlocked) box.append(el('p', { class: 'note' }, 'Unlocked: Auto-collect Glow (toggle in Settings).'));
      if (res.endlessUnlocked) box.append(el('p', { class: 'note' }, 'Unlocked: Endless Bloom mode!'));
      if (level === LEVELS.length - 1) box.append(el('p', { class: 'note' }, 'You have cleansed every garden. Thank you for playing!'));
      void lv;
    } else {
      box.append(el('h2', {}, 'The lanterns went dark…'), el('p', {}, 'Try a different mix of guardians, or upgrade the ones in danger.'));
    }
    const nextExists = !res.endless && res.won && level + 1 < LEVELS.length;
    box.append(el('div', { class: 'menu row' },
      el('button', { onclick: () => { sfx('click'); show('map'); } }, 'Map'),
      el('button', { onclick: () => { sfx('click'); show('play', level, loadout); } }, 'Retry'),
      nextExists ? el('button', { class: 'big', onclick: () => { sfx('click'); pendingLevel = level + 1; show('loadout'); } }, 'Next') : null,
    ));
    ui.append(box);
  },

  guide() {
    stopGame();
    const owned = new Set(data.guardians);
    const body = el('div', { class: 'guide' });
    const detail = el('div', { class: 'guide-detail' }, 'Tap an entry to read about it.');
    const gList = el('div', { class: 'guide-list' }, Object.entries(GUARDIANS).map(([k, g]) => owned.has(k)
      ? el('button', { class: 'entry', onclick: () => { sfx('click'); detail.innerHTML = ''; detail.append(portrait(k, 120), el('h3', {}, g.name), el('p', {}, g.desc), el('p', { class: 'stat' }, `Cost ${g.cost} · Health ${g.hp} · Recharge ${g.recharge}s`)); } }, portrait(k, 60), g.name)
      : el('div', { class: 'entry locked' }, '?')));
    const eList = el('div', { class: 'guide-list' }, Object.entries(ROTLINGS).map(([k, r]) => el('button', { class: 'entry', onclick: () => { sfx('click'); detail.innerHTML = ''; detail.append(portrait(k, 120, true), el('h3', {}, r.name), el('p', {}, ENEMY_INFO[k]), el('p', { class: 'stat' }, `Health ${r.hp + (r.shell || 0)} · Speed ${r.speed}`)); } }, portrait(k, 60, true), r.name)));
    body.append(el('div', { class: 'col' }, el('h3', {}, 'Guardians'), gList, el('h3', {}, 'Rotlings'), eList), detail);
    ui.append(el('div', { class: 'topbar' }, el('button', { class: 'back', onclick: () => { sfx('click'); show('title'); } }, '‹ Back'), el('h1', {}, 'Field Guide'), el('span')), body);
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
      el('div', { class: 'topbar' }, el('button', { class: 'back', onclick: () => { sfx('click'); show('title'); } }, '‹ Back'), el('h1', {}, 'Settings'), el('span')),
      el('div', { class: 'settings' },
        toggle('sfx', 'Sound effects'),
        toggle('music', 'Music'),
        desktop ? el('label', { class: 'toggle' },
          el('input', { type: 'checkbox', id: 'fs-toggle', onchange: (e) => desktop.setFullscreen(e.target.checked) }),
          el('span', {}, 'Fullscreen (F11)')) : null,
        toggle('autoCollect', data.unlockedLevel >= 5 ? 'Auto-collect Glow' : 'Auto-collect Glow (clear Dawn Greenhouse to unlock)', data.unlockedLevel >= 5),
        el('button', { class: 'danger', onclick: () => {
          if (confirm('Erase all progress? This cannot be undone.')) { data = store.reset(); persist(); show('settings'); }
        } }, 'Reset progress'),
        el('p', { class: 'small' }, 'Bloomguard stores progress only on this device. No ads, no tracking, no accounts.'),
        el('p', { class: 'small' }, 'Version 1.0.0 · All art and sound generated in code.'),
        el('p', { class: 'small' }, 'Controller: stick moves the cursor · A select · B back · Start pause · X speed · Y Bloom'),
      ),
    );
    if (desktop) desktop.isFullscreen().then((v) => { const c = document.getElementById('fs-toggle'); if (c) c.checked = v; });
  },
};

function onEnd(level, loadout, res) {
  if (!res.endless && res.won) {
    data.stars[level] = Math.max(data.stars[level] || 0, res.stars);
    const lv = LEVELS[level];
    if (lv.reward && !data.guardians.includes(lv.reward)) {
      data.guardians.push(lv.reward);
      if (data.loadout.length < MAX_LOADOUT) data.loadout.push(lv.reward);
      res.newGuardian = lv.reward;
    }
    if (level + 1 > data.unlockedLevel) {
      data.unlockedLevel = Math.min(LEVELS.length - 1, level + 1);
      if (level === LEVELS.length - 1) data.unlockedLevel = LEVELS.length; // all clear
      if (level === 4) res.autoCollectUnlocked = true;
      if (level === 9) res.endlessUnlocked = true;
    }
    persist();
  }
  stopGame();
  show('result', res, level, loadout);
}

function pause() {
  if (!game || game.ended) return;
  game.paused = true;
  ui.hidden = false;
  ui.className = 'screen-pause';
  ui.innerHTML = '';
  const resume = () => { sfx('click'); ui.hidden = true; ui.innerHTML = ''; screen = 'play'; if (game) game.paused = false; };
  screen = 'pause';
  ui.append(el('div', { class: 'modal' },
    el('h2', {}, 'Paused'),
    el('div', { class: 'menu' },
      el('button', { class: 'big', onclick: resume }, 'Resume'),
      el('button', { onclick: () => { sfx('click'); const lvl = game.endless ? 'endless' : game.levelIndex; const lo = game.loadout; show('play', lvl, lo); } }, 'Restart'),
      el('button', { onclick: () => { sfx('click'); show('map'); } }, 'Quit to map'),
    ),
  ));
  ui._resume = resume;
}

// Android hardware back button + app lifecycle (Capacitor), with graceful web fallback.
function handleBack() {
  if (screen === 'play') pause();
  else if (screen === 'pause') ui._resume && ui._resume();
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
  if (e.key === ' ' && screen === 'play' && game) { game.speed = game.speed === 1 ? 2 : 1; }
});

initGamepad({
  back: handleBack,
  pause: () => { if (screen === 'play') pause(); else if (screen === 'pause') ui._resume && ui._resume(); },
  speed: () => { if (screen === 'play' && game) game.speed = game.speed === 1 ? 2 : 1; },
  bloom: () => { if (screen === 'play' && game) game.triggerBloom(); },
});
window.addEventListener('keydown', (e) => {
  if ((e.key === 'b' || e.key === 'B') && screen === 'play' && game) game.triggerBloom();
  if ((e.key === 'p' || e.key === 'P') && screen === 'play') pause();
});

if ('serviceWorker' in navigator && location.protocol === 'https:' && !window.Capacitor && !desktop) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

// Test hook (used by automated smoke tests only)
window.__bloomguard = { get game() { return game; }, show, get data() { return data; } };

show('title');
