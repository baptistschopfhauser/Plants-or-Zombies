// Bloomguard — menus, story, progression and platform integration.
import { GUARDIANS, ROTLINGS, ENEMY_INFO, WORLDS, LEVELS, LEVELS_PER_WORLD, ACHIEVEMENTS, MAX_RANK, RANK_COST, loadoutSlots } from './data.js';
import { Game } from './game.js';
import { drawGuardian, drawRotling, drawPortrait, drawBackdrop, makeDecor } from './art.js';
import { sfx, startMusic, stopMusic, setAudio, unlockAudio } from './audio.js';
import { SPEAKERS, scene } from './story.js';
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

function portrait(type, size = 90, isEnemy = false) {
  const c = el('canvas', { width: size * 2, height: size * 2, class: 'portrait' });
  c.style.width = c.style.height = size + 'px';
  const ctx = c.getContext('2d');
  ctx.scale(2, 2);
  if (isEnemy) {
    const def = ROTLINGS[type];
    const s = def.boss ? size * 0.48 : def.big ? size * 0.68 : def.small ? size * 1.3 : size * 0.9;
    drawRotling(ctx, { k: type, x: size / 2 + (def.boss ? 4 : 8), y: size - 6 + (def.flying ? 20 : 0), def, seed: 1, shell: def.shell || 0, shield: def.shield || 0, hurt: 0 }, s, 0.3);
  } else {
    drawGuardian(ctx, type, size / 2, size - 6, size * 0.95, 0.3, {});
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
  ui.className = 'screen-' + name;
  ui.hidden = false;
  SCREENS[name](...args);
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

// ---------- story ----------
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
  let typed = 0;
  let raf;
  const t0 = performance.now();
  function render() {
    raf = requestAnimationFrame(render);
    const t = (performance.now() - t0) / 1000;
    const ctx = cv.getContext('2d');
    drawBackdrop(ctx, world, t, { W: 1280, H: 520, BY: 360 }, decor);
    ctx.fillStyle = world.ground[0];
    ctx.fillRect(0, 360, 1280, 160);
    const [who, text] = lines[i];
    typed = Math.min(text.length, typed + 1.2);
    textEl.textContent = text.slice(0, Math.floor(typed));
    const pctx = pcv.getContext('2d');
    pctx.clearRect(0, 0, 360, 360);
    const sp = SPEAKERS[who];
    if (sp.rotling) {
      const def = ROTLINGS[sp.rotling];
      drawRotling(pctx, { k: sp.rotling, x: 190, y: 330, def, seed: 1, shell: 0, shield: 0, hurt: 0, eating: typed < text.length }, 150, t);
    } else {
      drawPortrait(pctx, who, 180, 340, 400, t, typed < text.length);
    }
    // the two heroes standing on the horizon, and the boss across from them when one is in the scene
    drawPortrait(ctx, 'wren', 430, 372, 200, t, who === 'wren' && typed < text.length);
    drawPortrait(ctx, 'moss', 600, 376, 180, t + 1, who === 'moss' && typed < text.length);
    const boss = lines.map(([w]) => SPEAKERS[w].rotling).find(Boolean);
    if (boss) {
      const def = ROTLINGS[boss];
      const beaten = key.startsWith('post');
      drawRotling(ctx, { k: boss, x: 930, y: 378, def, seed: 2, shell: 0, shield: 0, hurt: 0, eating: who !== 'wren' && who !== 'moss' && typed < text.length, dying: beaten ? 0.55 : undefined }, 110, t);
    }
  }
  function showLine() {
    const [who] = lines[i];
    const sp = SPEAKERS[who];
    nameEl.textContent = sp.name;
    nameEl.style.color = sp.color;
    typed = 0;
  }
  function next() {
    const text = lines[i][1];
    if (typed < text.length) { typed = text.length; return; }
    sfx('click');
    i++;
    if (i >= lines.length) finish();
    else showLine();
  }
  function finish() {
    cancelAnimationFrame(raf);
    ui.removeEventListener('click', next);
    data.seenStory[key] = true;
    persist();
    done();
  }
  ui._storyNext = next;
  ui.addEventListener('click', next);
  showLine();
  render();
}
let pendingLevelForStory = 0;

function withStory(kind, level, done) {
  const key = `${kind}-${level}`;
  const lines = scene(kind, level);
  pendingLevelForStory = level;
  if (lines && !data.seenStory[key]) playStory(key, lines, done);
  else done();
}

// ---------- screens ----------
const SCREENS = {
  title() {
    stopGame();
    startMusic(0);
    const anyProgress = data.unlockedLevel > 0;
    const art = el('canvas', { width: 1100, height: 300, class: 'title-scene' });
    ui.append(
      el('div', { class: 'title-wrap' },
        el('h1', { class: 'logo' }, 'Bloomguard'),
        el('p', { class: 'tagline' }, 'Recover the Hearthseed. Light the lanterns. Hold back the blight.'),
        art,
        el('div', { class: 'menu' },
          el('button', { class: 'big', onclick: () => { sfx('click'); if (!anyProgress) withStory('pre', 0, () => show('map')); else show('map'); } }, anyProgress ? 'Continue' : 'New Adventure'),
          el('div', { class: 'menu row' },
            el('button', { onclick: () => { sfx('click'); show('grove'); } }, '🌿 Grove'),
            el('button', { onclick: () => { sfx('click'); show('guide'); } }, '📖 Field Guide'),
            el('button', { onclick: () => { sfx('click'); show('trophies'); } }, '🏆 Trophies'),
            el('button', { onclick: () => { sfx('click'); show('settings'); } }, '⚙ Settings'),
          ),
          desktop ? el('button', { onclick: () => desktop.quit() }, 'Quit') : null,
        ),
      ),
    );
    // animated title scene: guardians facing Rotlings
    const t0 = performance.now();
    const world = WORLDS[0];
    const decor = makeDecor(world, { W: 1100, H: 300, BX: 0, BY: 170, BR: 1100, BB: 300 });
    const actors = [['glowcap', 120], ['thornling', 240], ['frostbell', 360], ['hivebloom', 480]];
    const foes = [['grub', 720], ['shieldbug', 840], ['crystalback', 970]];
    const frame = () => {
      if (screen !== 'title' || !art.isConnected) return;
      requestAnimationFrame(frame);
      const t = (performance.now() - t0) / 1000;
      const ctx = art.getContext('2d');
      ctx.clearRect(0, 0, 1100, 300);
      const g = ctx.createLinearGradient(0, 170, 0, 300);
      g.addColorStop(0, '#7cc65b'); g.addColorStop(1, '#4f9e3d');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(550, 300, 620, 130, 0, Math.PI, 0); ctx.fill();
      for (const [k, x] of actors) drawGuardian(ctx, k, x, 280, 120, t, { seed: x });
      for (const [k, x] of foes) drawRotling(ctx, { k, x: x + Math.sin(t + x) * 6, y: 282, def: ROTLINGS[k], seed: x, shell: ROTLINGS[k].shell || 0, shield: ROTLINGS[k].shield || 0, hurt: 0 }, 120, t);
      drawPortrait(ctx, 'wren', 600, 285, 170, t);
      void decor;
    };
    frame();
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
      ctx.save(); ctx.translate(0, 0);
      for (const d of decor.decor) { d.y = Math.max(d.y, 210); }
      ctx.restore();
    };
    frame();
  },

  loadout() {
    const lvl = pendingLevel === 'endless' ? null : LEVELS[pendingLevel];
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
        grid.append(el('button', {
          class: `card ${on ? 'on' : ''} ${ok ? '' : 'banned'}`,
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
      topbar(lvl ? `${WORLDS[lvl.world].name} ${(pendingLevel % LEVELS_PER_WORLD) + 1}` : 'Endless Bloom', () => show('map'), count),
      el('div', { class: 'loadout' },
        el('div', { class: 'col' }, el('h3', {}, given ? 'Your guardians for this level' : 'Choose your guardians'), grid, info),
        el('div', { class: 'col side' },
          el('div', { class: 'goal' }, el('strong', {}, 'Goal: '), goalLine,
            lvl ? el('div', { class: 'stargoals' }, '★ Win · ★ Keep all lanterns lit · ★ ' + chText) : null,
            lvl ? el('div', { class: 'rule' }, WORLDS[lvl.world].rule) : null),
          el('h3', {}, 'Rotlings ahead'),
          el('div', { class: 'enemies' }, pool.map((k) => el('div', { class: `enemy ${ROTLINGS[k].boss ? 'boss' : ''}`, title: ENEMY_INFO[k] }, portrait(k, 56, true), el('span', {}, ROTLINGS[k].name)))),
          start,
        ),
      ),
    );
  },

  play(level, loadout) {
    ui.hidden = true;
    ui.innerHTML = '';
    canvas.hidden = false;
    startMusic(level === 'endless' ? 5 : LEVELS[level].world);
    game = new Game(canvas, {
      level, loadout, autoCollect: data.settings.autoCollect, ranks: data.ranks,
      onPause: () => pause(),
      onEnd: (res) => onEnd(level, loadout, res),
    });
  },

  result(res, level, loadout) {
    stopMusic();
    const box = el('div', { class: 'modal' });
    if (res.endless) {
      box.append(el('h2', {}, 'The blight broke through'), el('p', { class: 'big-num' }, `${res.waves} waves`),
        el('p', {}, res.newBest ? 'New personal best!' : `Best: ${data.endlessBest} waves`), el('p', { class: 'petals' }, `+${res.petals} 🌸`));
    } else if (res.won) {
      box.append(el('h2', {}, LEVELS[level].boss ? `${ROTLINGS[LEVELS[level].boss].name} defeated!` : 'Garden saved!'));
      box.append(el('div', { class: 'starrow' }, res.starList.map((s, i) => el('div', { class: `stargoal ${s ? 'got' : ''}` },
        el('span', { class: 'big-star' }, s ? '★' : '☆'), el('small', {}, ['Victory', 'All lanterns lit', 'Challenge'][i])))));
      box.append(el('p', { class: 'petals' }, `+${res.petals} 🌸 petals`));
      if (res.newGuardian) {
        const g = GUARDIANS[res.newGuardian];
        box.append(el('div', { class: 'unlock' }, portrait(res.newGuardian, 96), el('div', {}, el('strong', {}, `New guardian: ${g.name}`), el('p', {}, g.desc))));
      }
      for (const n of res.notes || []) box.append(el('p', { class: 'note' }, n));
    } else {
      box.append(el('h2', {}, 'The lanterns went dark…'), el('p', {}, res.reason || ''), el('p', {}, 'Try a different mix of guardians, upgrade them in the Grove, or save Wildseeds for emergencies.'));
    }
    const nextExists = !res.endless && res.won && level + 1 < LEVELS.length;
    box.append(el('div', { class: 'menu row' },
      el('button', { onclick: () => { sfx('click'); show('map'); } }, 'Map'),
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
    const seenFoes = new Set();
    for (let i = 0; i <= Math.min(data.unlockedLevel, LEVELS.length - 1); i++) { LEVELS[i].pool.forEach((k) => seenFoes.add(k)); if (LEVELS[i].boss && i < data.unlockedLevel) seenFoes.add(LEVELS[i].boss); }
    const detail = el('div', { class: 'guide-detail' }, 'Tap an entry to read about it.');
    const showG = (k, g) => { sfx('click'); detail.innerHTML = ''; detail.append(portrait(k, 120), el('h3', {}, g.name), el('p', {}, g.desc), g.over ? el('p', { class: 'over' }, '🌱 Overbloom: ' + g.over) : null, el('p', { class: 'stat' }, `Cost ${g.cost} · Health ${g.hp} · Recharge ${g.recharge}s`)); };
    const showR = (k, r) => { sfx('click'); detail.innerHTML = ''; detail.append(portrait(k, 120, true), el('h3', {}, r.name), el('p', {}, ENEMY_INFO[k]), el('p', { class: 'stat' }, `Health ${r.hp + (r.shell || 0) + (r.shield || 0)} · Speed ${r.speed}`)); };
    const gList = el('div', { class: 'guide-list' }, Object.entries(GUARDIANS).map(([k, g]) => owned.has(k) ? el('button', { class: 'entry', onclick: () => showG(k, g) }, portrait(k, 60), g.name) : el('div', { class: 'entry locked' }, '?')));
    const eList = el('div', { class: 'guide-list' }, Object.entries(ROTLINGS).map(([k, r]) => seenFoes.has(k) ? el('button', { class: 'entry', onclick: () => showR(k, r) }, portrait(k, 60, true), r.name) : el('div', { class: 'entry locked' }, '?')));
    ui.append(topbar('Field Guide', () => show('title')),
      el('div', { class: 'guide' }, el('div', { class: 'col' }, el('h3', {}, 'Guardians'), gList, el('h3', {}, 'Rotlings'), eList), detail));
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
        el('p', { class: 'small' }, 'Version 2.0.0 · All art and sound generated in code.'),
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
  if (res.endless) {
    res.newBest = res.waves > data.endlessBest;
    if (res.newBest) data.endlessBest = res.waves;
    petals = res.waves * 2;
    if (res.waves >= 20) award('endless');
  } else if (res.won) {
    const prev = data.starGoals[level] || [false, false, false];
    const merged = prev.map((v, i) => v || res.starList[i]);
    const newStars = merged.filter(Boolean).length - prev.filter(Boolean).length;
    data.starGoals[level] = merged;
    data.stars[level] = merged.filter(Boolean).length;
    petals = (prev[0] ? 5 : 15) + newStars * 10 + (LEVELS[level].boss && !prev[0] ? 25 : 0);
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
  persist();
  stopGame();
  if (!res.endless && res.won) withStory('post', level, () => show('result', res, level, loadout));
  else show('result', res, level, loadout);
}

function pause() {
  if (!game || game.ended) return;
  game.paused = true;
  ui.hidden = false;
  ui.className = 'screen-pause';
  ui.innerHTML = '';
  const resume = () => { sfx('click'); ui.hidden = true; ui.innerHTML = ''; screen = 'play'; if (game) game.paused = false; };
  screen = 'pause';
  const lvl = game.endless ? null : LEVELS[game.levelIndex];
  ui.append(el('div', { class: 'modal' },
    el('h2', {}, 'Paused'),
    lvl ? el('p', { class: 'small-dark' }, WORLDS[lvl.world].rule) : null,
    el('div', { class: 'menu' },
      el('button', { class: 'big', onclick: resume }, 'Resume'),
      el('button', { onclick: () => { sfx('click'); const l = game.endless ? 'endless' : game.levelIndex; const lo = game.opts.loadout; show('play', l, lo); } }, 'Restart'),
      el('button', { onclick: () => { sfx('click'); show('map'); } }, 'Quit to map'),
    ),
  ));
  ui._resume = resume;
}

function handleBack() {
  if (screen === 'play') pause();
  else if (screen === 'pause') ui._resume && ui._resume();
  else if (screen === 'story') ui._storyNext && ui._storyNext();
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

show('title');
