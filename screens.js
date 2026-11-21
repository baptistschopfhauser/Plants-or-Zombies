'use strict';

function drawZombieAt(z, yOverride) {
  const t = ZOMBIE_TYPES[z.type];
  const wob = Math.sin(G.time * 6 + z.phase) * 2;
  const x = z.x;
  const y = yOverride + wob * 0.5;
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(x, yOverride + 8, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
  const legSwing = Math.sin(G.time * 8 + z.phase) * 4;
  ctx.fillStyle = '#3d4450';
  ctx.fillRect(x - 10 + legSwing * 0.5, y - 6, 8, 8);
  ctx.fillRect(x + 2 - legSwing * 0.5, y - 6, 8, 8);
  box(x - 11 + legSwing * 0.5, y - 2, 9, 5, 2, '#2a2f38', INK, 1.5);
  box(x + 1 - legSwing * 0.5, y - 2, 9, 5, 2, '#2a2f38', INK, 1.5);
  rr(x - 14, y - 26, 28, 26, 6);
  shape(t.shirt, INK, 2.5);
  circ(x + wob * 0.3, y - 36, 12, t.skin, INK, 2.5);
  circ(x - 4 + wob * 0.3, y - 38, 2.4, '#fff');
  circ(x + 5 + wob * 0.3, y - 38, 2.4, '#fff');
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(x - 4 + wob * 0.3, y - 38, 1.4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5 + wob * 0.3, y - 38, 1.4, 0, Math.PI * 2); ctx.fill();
}

function panel(x, y, w, h, bg, border) {
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(x + 4, y + 5, w, h, 14);
  ctx.fill();
  ctx.fillStyle = bg || 'rgba(28,38,20,0.96)';
  rr(x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = border || '#4a6a3a';
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawMenu() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#7ec8ff');
  g.addColorStop(0.45, '#a8e06a');
  g.addColorStop(0.78, '#4a9a3a');
  g.addColorStop(1, '#357028');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc((i * 173) % W, (i * 97) % (H * 0.4), 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  drawSunIcon(90, 70, 34, false);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 3; i++) {
    const cx = ((G.time * 16 + i * 420) % (W + 260)) - 130;
    ctx.beginPath();
    ctx.ellipse(cx, 110 + i * 34, 40, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 28, 115 + i * 34, 26, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#3c7a30';
  ctx.fillRect(0, H - 160, W, 160);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = (r + c) % 2 ? '#478c38' : '#529a42';
      ctx.fillRect(c * (W / COLS), H - 160 + r * 80, W / COLS, 80);
    }
  }
  ctx.fillStyle = '#6e4520';
  for (let i = 0; i < 16; i++) box(i * 84 + 20, H - 160, 10, 42, 3, '#7a5228', INK, 2);
  const mz = { type: 'shambler', row: 0, x: W - ((G.time * 46) % (W + 300)) + 60, hp: 200, maxHp: 200, armor: 0, armorMax: 0, speed: 0, dmg: 0, dead: false, dying: 0, phase: 1, leapT: 0, slowT: 0, eating: null, flying: false, summonT: 99 };
  drawZombieAt(mz, H - 92);
  miniPlant('sunbloom', 180, 420);
  miniPlant('gnasher', 300, 420);
  miniPlant('melonlob', 1010, 420);
  const tg = ctx.createLinearGradient(0, 120, 0, 210);
  tg.addColorStop(0, '#4a8a2a');
  tg.addColorStop(1, '#2c4a1e');
  ctx.font = 'bold 76px ' + FONT;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillText('GARDEN GUARDIANS', W / 2 + 5, 186 + 5);
  ctx.fillStyle = tg;
  ctx.fillText('GARDEN GUARDIANS', W / 2, 186);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.strokeText('GARDEN GUARDIANS', W / 2, 186);
  txt('An original lane-defense game — defend your yard from the shambling horde.', W / 2, 248, '21px ' + FONT, '#2c4a1e', 'center', 'middle', false);
  button(W / 2 - 170, 292, 340, 58, 'Adventure', function () { G.state = 'levels'; }, { font: 'bold 20px ' + FONT });
  button(W / 2 - 170, 360, 340, 58, 'Endless Yard', function () { startEndless(); }, { font: 'bold 20px ' + FONT });
  button(W / 2 - 170, 428, 340, 58, 'Almanac', function () { G.state = 'almanac'; }, { font: 'bold 20px ' + FONT });
  button(W / 2 - 170, 496, 340, 58, 'How to Play', function () { G.state = 'help'; }, { font: 'bold 20px ' + FONT });
  const d = G.save.settings.difficulty;
  button(W / 2 - 170, 564, 340, 50, 'Difficulty: ' + d.charAt(0).toUpperCase() + d.slice(1), function () {
    const order = ['easy', 'normal', 'hard'];
    G.save.settings.difficulty = order[(order.indexOf(G.save.settings.difficulty) + 1) % order.length];
    persist();
    beep(500, 0.06, 'sine', 0.03);
  }, { font: 'bold 17px ' + FONT, bg: d === 'hard' ? '#8a3a2a' : d === 'easy' ? '#4a7a3a' : '#8a5a33', bgDark: d === 'hard' ? '#6a2a1e' : d === 'easy' ? '#3a5a2c' : '#6b4423' });
  button(W - 160, H - 215, 140, 48, G.save.settings.mute ? 'Sound: off' : 'Sound: on', function () {
    G.save.settings.mute = !G.save.settings.mute;
    persist();
  }, { font: 'bold 14px ' + FONT });
  txt('All code, art and names are original · runs entirely in your browser · v5 · achievements ' + G.save.achievements.length + '/' + ACHIEVEMENTS.length + ' · levels won ' + Object.keys(G.save.completed).length + '/' + LEVELS.length, W / 2, H - 16, '13px ' + FONT, 'rgba(0,0,0,0.5)', 'center', 'middle', false);
}

function drawLevels() {
  ctx.fillStyle = '#1d2b1a';
  ctx.fillRect(0, 0, W, H);
  const tg = ctx.createLinearGradient(0, 0, 0, 70);
  tg.addColorStop(0, '#3c6a2c');
  tg.addColorStop(1, '#22351c');
  ctx.fillStyle = tg;
  ctx.fillRect(0, 0, W, 70);
  txt('Adventure — ' + LEVELS.length + ' levels', W / 2, 40, 'bold 32px ' + FONT, '#ffe9c8', 'center', 'middle');
  const cards = LEVELS.map(function (L, i) { return { level: i, L: L }; });
  cards.push({ endless: true });
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const col = i % 3;
    const rowi = Math.floor(i / 3);
    const x = 40 + col * 408;
    const y = 84 + rowi * 134;
    const w = 388, h = 122;
    if (card.endless) {
      button(x, y, w, h, '', function () { startEndless(); }, { bg: '#3a5a8a', bgDark: '#2a4266', bgHover: '#4a6a9a' });
      txt('Endless Yard', x + w / 2, y + 36, 'bold 22px ' + FONT, '#fff', 'center', 'middle');
      txt('Survive as long as you can · boss every 10th wave', x + w / 2, y + 66, '13px ' + FONT, '#cfe0ff', 'center', 'middle');
      txt('best: wave ' + (G.save.bestEndless || 0), x + w / 2, y + 94, '13px ' + FONT, '#9fc0e8', 'center', 'middle');
    } else {
      const locked = !levelUnlocked(card.level);
      const stars = G.save.completed[card.level] || 0;
      const bg = locked ? '#4a4a42' : (card.L.biome === 'pool' ? '#2a5a8a' : (card.L.day ? '#8a5a33' : '#3a4a7a'));
      button(x, y, w, h, '', function () {
        if (!levelUnlocked(card.level)) { beep(140, 0.1, 'square', 0.04, 90); return; }
        startLevel(card.level);
      }, { bg: bg, bgDark: locked ? '#3a3a34' : '#5d3a1c' });
      txt(card.L.name + (card.L.boss ? ' \uD83D\uDC51' : '') + (card.L.biome === 'pool' ? ' \uD83C\uDF0A' : ''), x + w / 2, y + 34, 'bold 20px ' + FONT, locked ? '#9a9a8a' : '#fff', 'center', 'middle');
      txt((card.L.day ? 'Day' : 'Night') + (card.L.biome === 'pool' ? ' · Pool' : '') + ' · ' + card.L.waves + ' waves · ' + card.L.seeds.length + ' packets', x + w / 2, y + 62, '12px ' + FONT, locked ? '#9a9a8a' : '#e8d8b8', 'center', 'middle');
      if (locked) {
        txt('Complete the previous level to unlock', x + w / 2, y + 92, '14px ' + FONT, '#c8c8b8', 'center', 'middle');
      } else {
        txt(stars === 2 ? '\u2605\u2605' : stars === 1 ? '\u2605\u2606' : '\u2606\u2606', x + w / 2, y + 94, '22px ' + FONT, '#ffd23f', 'center', 'middle');
      }
    }
  }
  button(W / 2 - 90, H - 54, 180, 42, 'Back', function () { G.state = 'menu'; }, { font: 'bold 17px ' + FONT });
}

function drawAlmanac() {
  ctx.fillStyle = '#1d2b1a';
  ctx.fillRect(0, 0, W, H);
  txt('Almanac', W / 2, 40, 'bold 32px ' + FONT, '#ffe9c8', 'center', 'middle');
  txt('Plants (' + SEED_ORDER.length + ')', 20, 76, 'bold 18px ' + FONT, '#ffd23f');
  for (let i = 0; i < SEED_ORDER.length; i++) {
    const key = SEED_ORDER[i];
    const def = PLANT_TYPES[key];
    const col = i % 9;
    const rowi = Math.floor(i / 9);
    const x = 14 + col * 139;
    const y = 88 + rowi * 126;
    const w = 131, h = 114;
    panel(x, y, w, h, '#2c4226', '#4a6a3a');
    const locked = G.save.unlocked.indexOf(key) < 0 && G.seedList.indexOf(key) < 0;
    circ(x + 22, y + 23, 14, 'rgba(255,255,255,0.12)', INK, 1.5);
    miniPlant(key, x + 22, y + 22);
    txt(locked ? '???' : def.name, x + 42, y + 20, 'bold 11px ' + FONT, locked ? '#8a8a7a' : '#fff');
    txt(locked ? 'undiscovered' : def.cost + ' sun · ' + def.cd + 's' + (def.water ? ' · water' : ''), x + 42, y + 35, '10px ' + FONT, '#9ab88a');
    const lines = wrapText(locked ? 'Win levels to unlock this packet.' : def.desc, 24);
    ctx.font = '10px ' + FONT;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = locked ? '#7a8a6a' : '#c8d8b8';
    for (let li = 0; li < Math.min(4, lines.length); li++) ctx.fillText(lines[li], x + 7, y + 56 + li * 13);
  }
  txt('Zombies (' + ZOMBIE_ORDER.length + ')', 20, 358, 'bold 18px ' + FONT, '#ff8a7a');
  for (let i = 0; i < ZOMBIE_ORDER.length; i++) {
    const key = ZOMBIE_ORDER[i];
    const def = ZOMBIE_TYPES[key];
    const col = i % 7;
    const rowi = Math.floor(i / 7);
    const x = 20 + col * 181;
    const y = 370 + rowi * 126;
    const w = 173, h = 114;
    panel(x, y, w, h, '#33261f', '#6a4a3a');
    circ(x + 22, y + 25, 13, def.skin, INK, 2);
    box(x + 12, y + 36, 20, 18, 4, def.shirt, INK, 2);
    txt(def.name, x + 40, y + 20, 'bold 11px ' + FONT, '#fff');
    txt('HP ' + (def.hp + (def.armor || 0)) + (def.armor ? ' (+' + def.armor + ')' : '') + ' · spd ' + def.speed, x + 40, y + 35, '10px ' + FONT, '#d8b8a8');
    const lines = wrapText(def.desc, 30);
    ctx.font = '10px ' + FONT;
    ctx.fillStyle = '#e8c8b8';
    for (let li = 0; li < Math.min(4, lines.length); li++) ctx.fillText(lines[li], x + 7, y + 56 + li * 13);
  }
  const earnedNames = ACHIEVEMENTS.filter(function (a) { return G.save.achievements.indexOf(a.id) >= 0; }).map(function (a) { return a.name; });
  txt('Achievements ' + G.save.achievements.length + '/' + ACHIEVEMENTS.length + (earnedNames.length ? ': ' + earnedNames.join(', ') : ''), 20, H - 86, 'bold 14px ' + FONT, '#ffd23f');
  button(W / 2 - 90, H - 64, 180, 44, 'Back', function () { G.state = 'menu'; }, { font: 'bold 16px ' + FONT });
}

function drawHelp() {
  ctx.fillStyle = '#1d2b1a';
  ctx.fillRect(0, 0, W, H);
  txt('How to Play', 70, 62, 'bold 32px ' + FONT, '#ffe9c8');
  const lines = [
    'Goal: stop the horde from reaching your house on the left. Each lane has one mower as a last resort.',
    '',
    '• Sun (or moonlight at night) falls from the sky — click it to collect. Sunbloom / Sun Shroom produce extra sun.',
    '• Click a seed packet (keys 1-9, 0, -, = for the first 12), then click a lawn tile to plant. Packets cost sun and recharge.',
    '• Shooters level up with kills (5 / 15 kills → Lv2 / Lv3): more damage, faster fire, ★ above the plant.',
    '• Shooters: Seed Spitter, Puff Spitter (short range), Double Spitter, Split Spitter (both ways), Frost Fern (slow),',
    '   Melon Lob (3x3 splash), Reed Shooter (water only).',
    '• Pool levels: the middle lanes are water. Plant a Lotus Pad first, then anything on top — or Reed Shooter directly.',
    '• Defense: Acorn Wall, Thistle Pad (contact damage), Tuber Trap (mine). Explosives: Blastcap (3x3), Blaze Reed (lane).',
    '• Tricks: Blover gusts its lane every 12s. Diverter Onion changes the eater\'s lane. Gnasher swallows one zombie whole.',
    '• Zombies: Pylonhead/Tinhead/Screenback/Ducky wear armor. Leaper vaults one plant. Howler enrages at half HP.',
    '   Balloon Flyer floats over plants then lands. The Yard Boss (crown levels, every 10th endless wave) throws Imps.',
    '• Clearing a wave cleanly grants +50 sun. Win levels to unlock seed packets; 2★ for a flawless (no mower) win.',
    '• Difficulty (menu): easy / normal / hard — changes enemy HP, speed and sunfall. Everything is saved in your browser.',
    '',
    'Keys: 1-9,0,-,= select seed · S shovel · Esc/Space pause · bottom bar: shovel, pause, speed, sound, menu.'
  ];
  ctx.font = '15px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#e8f0dc';
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], 70, 100 + i * 30);
  button(W / 2 - 90, H - 60, 180, 46, 'Back', function () { G.state = 'menu'; }, { font: 'bold 16px ' + FONT });
}

function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  panel(W / 2 - 220, H / 2 - 190, 440, 330, 'rgba(28,38,20,0.97)', '#c8860a');
  txt('Paused', W / 2, H / 2 - 130, 'bold 46px ' + FONT, '#ffe9a8', 'center', 'middle');
  button(W / 2 - 120, H / 2 - 70, 240, 54, 'Resume', function () { G.state = 'playing'; }, { font: 'bold 18px ' + FONT });
  button(W / 2 - 120, H / 2 + 2, 240, 54, 'Restart', function () { restart(); }, { font: 'bold 18px ' + FONT });
  button(W / 2 - 120, H / 2 + 74, 240, 54, 'Menu', function () { G.state = 'menu'; }, { font: 'bold 18px ' + FONT });
}

function drawOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(0, 0, W, H);
  const secs = Math.floor(G.time);
  const tstr = Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2);
  panel(W / 2 - 300, H / 2 - 240, 600, 420, 'rgba(24,32,18,0.97)', G.won ? '#c8860a' : '#a03828');
  if (G.won) {
    txt('Yard Defended!', W / 2, H / 2 - 170, 'bold 48px ' + FONT, '#ffe9a8', 'center', 'middle');
    txt(G.mowersLost === 0 ? '\u2605\u2605  flawless — no mower lost!' : '\u2605', W / 2, H / 2 - 112, '30px ' + FONT, '#ffd23f', 'center', 'middle');
    txt('Time ' + tstr + ' · zombies stopped ' + G.killed + ' / ' + G.totalZombies, W / 2, H / 2 - 62, '18px ' + FONT, '#d8e8c8', 'center', 'middle');
    txt('New seed packets unlocked!', W / 2, H / 2 - 32, '15px ' + FONT, '#9adf6a', 'center', 'middle');
    const hasNext = !G.endless && G.levelIndex + 1 < LEVELS.length;
    if (hasNext) button(W / 2 - 130, H / 2 + 20, 260, 54, 'Next Level', function () { startLevel(G.levelIndex + 1); }, { font: 'bold 18px ' + FONT });
    else button(W / 2 - 130, H / 2 + 20, 260, 54, 'Replay', function () { restart(); }, { font: 'bold 18px ' + FONT });
    button(W / 2 - 130, H / 2 + 88, 260, 54, 'Menu', function () { G.state = 'menu'; }, { font: 'bold 18px ' + FONT });
  } else {
    txt('The horde overran your garden!', W / 2, H / 2 - 160, 'bold 40px ' + FONT, '#ff8a7a', 'center', 'middle');
    if (G.endless) {
      txt('You survived ' + G.wave + ' waves and stopped ' + G.killed + ' zombies in ' + tstr + '.', W / 2, H / 2 - 90, '18px ' + FONT, '#d8e8c8', 'center', 'middle');
      if (G.wave > (G.save.bestEndless || 0)) { G.save.bestEndless = G.wave; persist(); }
      txt('Best: wave ' + G.save.bestEndless, W / 2, H / 2 - 56, '16px ' + FONT, '#9fc0e8', 'center', 'middle');
    } else {
      txt('Zombies stopped: ' + G.killed + ' / ' + G.totalZombies + ' · time ' + tstr, W / 2, H / 2 - 80, '18px ' + FONT, '#d8e8c8', 'center', 'middle');
    }
    button(W / 2 - 130, H / 2 + 20, 260, 54, 'Try Again', function () { restart(); }, { font: 'bold 18px ' + FONT });
    button(W / 2 - 130, H / 2 + 88, 260, 54, 'Menu', function () { G.state = 'menu'; }, { font: 'bold 18px ' + FONT });
  }
}

function render() {
  G.buttons = [];
  ctx.save();
  if (G.shake > 0.3) ctx.translate(rand(-G.shake, G.shake), rand(-G.shake, G.shake));
  ctx.clearRect(-30, -30, W + 60, H + 60);
  if (G.state === 'menu') drawMenu();
  else if (G.state === 'levels') drawLevels();
  else if (G.state === 'almanac') drawAlmanac();
  else if (G.state === 'help') drawHelp();
  else {
    drawGame();
    if (G.state === 'paused') drawPause();
    else if (G.state === 'over') drawOver();
  }
  ctx.restore();
}
