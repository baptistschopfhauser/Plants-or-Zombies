'use strict';

G.chapterIndex = 0;
G.almanacTab = 'plants';

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

function screenBg(night) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  if (night) { g.addColorStop(0, '#101c38'); g.addColorStop(0.6, '#1c2f3a'); g.addColorStop(1, '#1d2b1a'); }
  else { g.addColorStop(0, '#8ecdf5'); g.addColorStop(0.55, '#b8e08a'); g.addColorStop(1, '#4a9a3a'); }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (night) {
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + (i % 5) * 0.14) + ')';
      ctx.fillRect((i * 173) % W, (i * 97) % (H * 0.6), 2, 2);
    }
    drawSunIcon(W - 90, 80, 30, true);
  } else {
    drawSunIcon(90, 80, 32, false);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 3; i++) {
      const cx = ((G.time * 14 + i * 430) % (W + 260)) - 130;
      ctx.beginPath();
      ctx.ellipse(cx, 90 + i * 36, 42, 14, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 28, 95 + i * 36, 26, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = night ? '#2c4430' : '#3c7a30';
  ctx.fillRect(0, H - 130, W, 130);
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = night ? ((r + c) % 2 ? '#28402a' : '#2e4a30') : ((r + c) % 2 ? '#478c38' : '#529a42');
      ctx.fillRect(c * (W / COLS), H - 130 + r * 65, W / COLS, 65);
    }
  }
}

function drawMenu() {
  screenBg(false);
  const mz = { type: 'shambler', row: 0, x: W - ((G.time * 46) % (W + 300)) + 60, hp: 200, maxHp: 200, armor: 0, armorMax: 0, speed: 0, dmg: 0, dead: false, dying: 0, phase: 1, leapT: 0, slowT: 0, eating: null, flying: false, summonT: 99 };
  drawZombieAt(mz, H - 92);
  miniPlant('sunbloom', 180, 430);
  miniPlant('gnasher', 300, 430);
  miniPlant('melonlob', W - 300, 430);
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
  drawCoinIcon(W - 130, 60, 14);
  txt('x ' + G.save.coins, W - 108, 61, 'bold 20px ' + FONT, '#7a4a00', 'left', 'middle', false);
  const bx1 = W / 2 - 290, bx2 = W / 2 + 20, bw = 270, bh = 56;
  button(bx1, 292, bw, bh, 'Adventure', function () { G.state = 'chapters'; }, { font: 'bold 19px ' + FONT });
  button(bx2, 292, bw, bh, 'Endless Yard', function () { startEndless(); }, { font: 'bold 19px ' + FONT, bg: '#3a5a8a', bgDark: '#2a4266' });
  button(bx1, 358, bw, bh, 'Store', function () { G.state = 'store'; }, { font: 'bold 19px ' + FONT, bg: '#8a6a2a', bgDark: '#6b4f1c' });
  button(bx2, 358, bw, bh, 'Greenhouse', function () { G.state = 'greenhouse'; }, { font: 'bold 19px ' + FONT, bg: '#3a7a4a', bgDark: '#2a5a36' });
  button(bx1, 424, bw, bh, 'Almanac', function () { G.state = 'almanac'; }, { font: 'bold 19px ' + FONT });
  button(bx2, 424, bw, bh, 'How to Play', function () { G.state = 'help'; }, { font: 'bold 19px ' + FONT });
  const d = G.save.settings.difficulty;
  button(W / 2 - 170, 496, 340, 50, 'Difficulty: ' + d.charAt(0).toUpperCase() + d.slice(1), function () {
    const order = ['easy', 'normal', 'hard'];
    G.save.settings.difficulty = order[(order.indexOf(G.save.settings.difficulty) + 1) % order.length];
    persist();
    beep(500, 0.06, 'sine', 0.03);
  }, { font: 'bold 17px ' + FONT, bg: d === 'hard' ? '#8a3a2a' : d === 'easy' ? '#4a7a3a' : '#8a5a33', bgDark: d === 'hard' ? '#6a2a1e' : d === 'easy' ? '#3a5a2c' : '#6b4423' });
  button(W - 160, H - 200, 140, 48, G.save.settings.mute ? 'Sound: off' : 'Sound: on', function () {
    G.save.settings.mute = !G.save.settings.mute;
    persist();
  }, { font: 'bold 14px ' + FONT });
  txt('All code, art and names are original · runs in your browser · v7 · achievements ' + G.save.achievements.length + '/' + ACHIEVEMENTS.length + ' · levels won ' + Object.keys(G.save.completed).length + '/' + LEVELS.length, W / 2, H - 16, '13px ' + FONT, 'rgba(0,0,0,0.5)', 'center', 'middle', false);
}

function drawChapters() {
  screenBg(false);
  txt('Adventure — choose a chapter', W / 2, 70, 'bold 34px ' + FONT, '#2c4a1e', 'center', 'middle', false);
  drawCoinIcon(W - 130, 66, 13);
  txt('x ' + G.save.coins, W - 108, 67, 'bold 18px ' + FONT, '#7a4a00', 'left', 'middle', false);
  for (let i = 0; i < CHAPTERS.length; i++) {
    const ch = CHAPTERS[i];
    const x = 90 + i * 380;
    const y = 130;
    const w = 350, h = 330;
    const locked = !levelUnlocked(ch.levels[0]);
    const stars = ch.levels.reduce(function (a, li) { return a + (G.save.completed[li] || 0); }, 0);
    const maxStars = ch.levels.length * 2;
    const done = ch.levels.filter(function (li) { return G.save.completed[li]; }).length;
    button(x, y, w, h, '', function () {
      if (locked) { beep(140, 0.1, 'square', 0.04, 90); return; }
      G.chapterIndex = i;
      G.state = 'chapterLevels';
    }, { bg: locked ? '#5a5a52' : (ch.pool ? '#2a5a8a' : ch.day ? '#8a5a33' : '#3a4a7a'), bgDark: locked ? '#45453f' : '#5d3a1c' });
    ctx.globalAlpha = locked ? 0.7 : 1;
    txt(ch.icon, x + w / 2, y + 70, '54px ' + FONT, '#fff', 'center', 'middle', false);
    txt(ch.name, x + w / 2, y + 140, 'bold 24px ' + FONT, '#ffe9c8', 'center', 'middle');
    txt(ch.title, x + w / 2, y + 172, '18px ' + FONT, '#fff', 'center', 'middle');
    txt(ch.levels.length + ' levels · ' + (ch.pool ? 'Pool' : ch.day ? 'Day' : 'Night'), x + w / 2, y + 204, '14px ' + FONT, '#e8d8b8', 'center', 'middle');
    txt(stars + ' / ' + maxStars + ' ★', x + w / 2, y + 242, 'bold 18px ' + FONT, '#ffd23f', 'center', 'middle');
    txt(locked ? 'locked — finish the previous chapter' : done + ' / ' + ch.levels.length + ' levels won', x + w / 2, y + 282, '14px ' + FONT, locked ? '#c8c8b8' : '#c8e8b8', 'center', 'middle');
    ctx.globalAlpha = 1;
  }
  const ex = 90 + 3 * 380, ey = 130, ew = 350, eh = 330;
  button(ex, ey, ew, eh, '', function () { startEndless(); }, { bg: '#5a3a7a', bgDark: '#452a5e' });
  txt('♾️', ex + ew / 2, ey + 70, '54px ' + FONT, '#fff', 'center', 'middle', false);
  txt('Endless', ex + ew / 2, ey + 140, 'bold 24px ' + FONT, '#ffe9c8', 'center', 'middle');
  txt('Yard', ex + ew / 2, ey + 172, '18px ' + FONT, '#fff', 'center', 'middle');
  txt('boss every 10th wave', ex + ew / 2, ey + 204, '14px ' + FONT, '#e0d0f0', 'center', 'middle');
  txt('best: wave ' + (G.save.bestEndless || 0), ex + ew / 2, ey + 252, 'bold 18px ' + FONT, '#c8b8e8', 'center', 'middle');
  button(W / 2 - 90, H - 80, 180, 44, 'Back', function () { G.state = 'menu'; }, { font: 'bold 17px ' + FONT });
}

function drawChapterLevels() {
  const ch = CHAPTERS[G.chapterIndex] || CHAPTERS[0];
  screenBg(!ch.day);
  txt(ch.icon + '  ' + ch.name + ' — ' + ch.title, W / 2, 64, 'bold 32px ' + FONT, '#fff', 'center', 'middle');
  for (let i = 0; i < ch.levels.length; i++) {
    const li = ch.levels[i];
    const L = LEVELS[li];
    const x = 55 + i * 245;
    const y = 140;
    const w = 230, h = 380;
    const locked = !levelUnlocked(li);
    const stars = G.save.completed[li] || 0;
    button(x, y, w, h, '', function () {
      if (!levelUnlocked(li)) { beep(140, 0.1, 'square', 0.04, 90); return; }
      startLevel(li);
    }, { bg: locked ? '#5a5a52' : (L.biome === 'pool' ? '#2a5a8a' : L.day ? '#8a5a33' : '#3a4a7a'), bgDark: locked ? '#45453f' : '#5d3a1c' });
    txt(L.name, x + w / 2, y + 46, 'bold 19px ' + FONT, locked ? '#b8b8a8' : '#fff', 'center', 'middle');
    txt(L.boss ? '👑 boss' : (L.day ? '☀️ day' : '🌙 night') + (L.biome === 'pool' ? ' · 🏊' : ''), x + w / 2, y + 82, '16px ' + FONT, '#ffe9c8', 'center', 'middle');
    txt(stars === 2 ? '★★' : stars === 1 ? '★☆' : '☆☆', x + w / 2, y + 130, '30px ' + FONT, '#ffd23f', 'center', 'middle');
    txt(L.waves + ' waves', x + w / 2, y + 180, '14px ' + FONT, '#e8d8b8', 'center', 'middle');
    txt(L.seeds.length + ' seed packets', x + w / 2, y + 206, '14px ' + FONT, '#e8d8b8', 'center', 'middle');
    txt(L.startSun + ' starting sun', x + w / 2, y + 232, '13px ' + FONT, '#c8a878', 'center', 'middle');
    if (locked) txt('locked', x + w / 2, y + 300, 'bold 16px ' + FONT, '#ff8a7a', 'center', 'middle');
    else {
      miniPlant(L.seeds[Math.min(2, L.seeds.length - 1)], x + 55, y + 300);
      miniPlant(L.seeds[L.seeds.length - 1], x + 175, y + 300);
    }
  }
  button(W / 2 - 90, H - 80, 180, 44, 'Back', function () { G.state = 'chapters'; }, { font: 'bold 17px ' + FONT });
}

function drawStore() {
  screenBg(false);
  ctx.fillStyle = 'rgba(60,38,18,0.94)';
  ctx.fillRect(0, 0, W, 96);
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(0, 96, W, 5);
  txt('\uD83D\uDED2  Store', 30, 52, 'bold 34px ' + FONT, '#ffe9c8', 'left', 'middle');
  txt('Permanent upgrades — buy once, keep forever', 330, 56, '15px ' + FONT, '#d8b888', 'left', 'middle');
  panel(W - 264, 18, 234, 60, 'rgba(247,232,192,0.96)', '#c8860a');
  drawCoinIcon(W - 234, 48, 15);
  txt('x ' + G.save.coins, W - 208, 49, 'bold 22px ' + FONT, '#7a4a00', 'left', 'middle', false);
  for (let i = 0; i < STORE_ITEMS.length; i++) {
    const it = STORE_ITEMS[i];
    const col = i % 5;
    const rowi = Math.floor(i / 5);
    const x = 30 + col * 246;
    const y = 122 + rowi * 268;
    const w = 232, h = 250;
    const owned = hasItem(it.id);
    const hover = G.mouse.x >= x && G.mouse.x <= x + w && G.mouse.y >= y && G.mouse.y <= y + h;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    rr(x + 3, y + 4, w, h, 12);
    ctx.fill();
    const cg = ctx.createLinearGradient(0, y, 0, y + h);
    if (owned) { cg.addColorStop(0, '#3c6034'); cg.addColorStop(1, '#2c4a26'); }
    else { cg.addColorStop(0, '#4a3a24'); cg.addColorStop(1, '#33270f'); }
    ctx.fillStyle = cg;
    rr(x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = owned ? '#7ac86a' : hover ? '#ffd23f' : '#c8860a';
    ctx.lineWidth = hover && !owned ? 3 : 2;
    ctx.stroke();
    circ(x + w / 2, y + 48, 30, 'rgba(255,255,255,0.1)', INK, 2);
    txt(it.icon, x + w / 2, y + 50, '34px ' + FONT, '#fff', 'center', 'middle', false);
    txt(it.name, x + w / 2, y + 100, 'bold 17px ' + FONT, '#ffe9c8', 'center', 'middle');
    const lines = wrapText(it.desc, 24);
    ctx.font = '12px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c8d8b8';
    for (let li = 0; li < Math.min(3, lines.length); li++) ctx.fillText(lines[li], x + w / 2, y + 128 + li * 16);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x + 20, y + 186); ctx.lineTo(x + w - 20, y + 186); ctx.stroke();
    if (owned) {
      box(x + w / 2 - 52, y + h - 54, 104, 38, 9, '#3f7a30', INK, 2);
      txt('\u2713 OWNED', x + w / 2, y + h - 34, 'bold 15px ' + FONT, '#d8ffd0', 'center', 'middle');
    } else {
      const afford = G.save.coins >= it.price;
      button(x + 16, y + h - 54, w - 32, 38, '', function () {
        if (buyItem(it.id)) { beep(880, 0.1, 'square', 0.05); setTimeout(function () { beep(1174, 0.12, 'square', 0.05); }, 100); }
        else beep(140, 0.1, 'square', 0.04, 90);
      }, { bg: afford ? '#c8860a' : '#5a4a38', bgDark: afford ? '#a06a00' : '#463a2c', bgHover: '#e0a020' });
      drawCoinIcon(x + w / 2 - 42, y + h - 35, 10);
      txt(String(it.price), x + w / 2 - 26, y + h - 34, 'bold 17px ' + FONT, '#fff', 'left', 'middle');
    }
  }
  txt('Earn coins by stopping zombies, clearing waves cleanly and winning levels.', W / 2, H - 116, '14px ' + FONT, '#3c5a2c', 'center', 'middle', false);
  button(W / 2 - 90, H - 90, 180, 44, 'Back', function () { G.state = 'menu'; }, { font: 'bold 17px ' + FONT });
}
function drawGreenhouse() {
  screenBg(false);
  ctx.fillStyle = '#2e6028';
  ctx.beginPath(); ctx.ellipse(W / 2 - 420, H - 118, 420, 90, 0, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#35702e';
  ctx.beginPath(); ctx.ellipse(W / 2 + 430, H - 118, 460, 100, 0, Math.PI, 0); ctx.fill();
  txt('Greenhouse', W / 2, 62, 'bold 34px ' + FONT, '#2c4a1e', 'center', 'middle', false);
  panel(W - 264, 30, 234, 60, 'rgba(247,232,192,0.96)', '#c8860a');
  drawCoinIcon(W - 234, 60, 15);
  txt('x ' + G.save.coins, W - 208, 61, 'bold 22px ' + FONT, '#7a4a00', 'left', 'middle', false);
  const hx = W / 2 - 280, hy = 150, hw = 560, hh = 370;
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath(); ctx.ellipse(hx + hw / 2, hy + hh + 8, hw / 2 + 30, 16, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(hx - 24, hy + hh - 36, hw + 48, 36);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(hx - 24, hy + hh - 36, hw + 48, 36);
  ctx.fillStyle = '#7a5228';
  ctx.fillRect(hx, hy + 70, hw, hh - 106);
  ctx.fillStyle = 'rgba(170,215,255,0.24)';
  ctx.fillRect(hx + 6, hy + 76, hw - 12, hh - 118);
  ctx.fillStyle = '#7a5228';
  ctx.beginPath();
  ctx.moveTo(hx - 18, hy + 72);
  ctx.lineTo(hx + hw / 2, hy - 6);
  ctx.lineTo(hx + hw + 18, hy + 72);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(170,215,255,0.24)';
  ctx.beginPath();
  ctx.moveTo(hx + 4, hy + 70);
  ctx.lineTo(hx + hw / 2, hy + 4);
  ctx.lineTo(hx + hw - 4, hy + 70);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(hx - 18, hy + 72);
  ctx.lineTo(hx + hw / 2, hy - 6);
  ctx.lineTo(hx + hw + 18, hy + 72);
  ctx.closePath();
  ctx.stroke();
  ctx.strokeRect(hx, hy + 70, hw, hh - 106);
  ctx.strokeStyle = '#7a5228'; ctx.lineWidth = 5;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(hx + i * hw / 4, hy + 72); ctx.lineTo(hx + i * hw / 4, hy + hh - 36); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(hx, hy + 130); ctx.lineTo(hx + hw, hy + 130); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hx + hw * 0.72, hy + 70); ctx.lineTo(hx + hw * 0.72, hy + hh - 36); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hx + hw * 0.72, hy + 200); ctx.lineTo(hx + hw, hy + 200); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(hx + 40, hy + hh - 50); ctx.lineTo(hx + 150, hy + 84); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hx + 80, hy + hh - 50); ctx.lineTo(hx + 185, hy + 88); ctx.stroke();
  ctx.fillStyle = '#4a3420';
  ctx.fillRect(hx + 30, hy + hh - 76, hw - 60, 40);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 2; ctx.strokeRect(hx + 30, hy + hh - 76, hw - 60, 40);
  const stage = greenhouseStage();
  const planted = !!G.save.greenhouse.plantedAt;
  const potX = hx + hw / 2, potY = hy + hh - 96;
  if (planted) {
    const sc = 0.32 + stage * 0.2;
    ctx.save();
    ctx.translate(potX, potY + 20);
    ctx.scale(sc, sc);
    ctx.translate(-potX, -(potY + 20));
    miniPlant('sunbloom', potX, potY);
    ctx.restore();
    if (stage >= 4) {
      for (let i = 0; i < 6; i++) {
        const a = G.time * 1.5 + i * 1.05;
        const sx = potX + Math.cos(a) * (50 + i * 8);
        const sy = potY - 50 + Math.sin(a * 1.3) * (30 + i * 5);
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(G.time * 3 + i));
        circ(sx, sy, 3, '#ffe98a', '#c8860a', 1);
      }
      ctx.globalAlpha = 1;
      const bob = Math.sin(G.time * 3) * 5;
      drawCoinIcon(potX + 70, potY - 70 + bob, 15);
      txt('+' + GREENHOUSE_YIELD, potX + 70, potY - 40 + bob, 'bold 16px ' + FONT, '#ffd23f', 'center', 'middle');
    }
  } else {
    ctx.fillStyle = '#5a4228';
    ctx.beginPath(); ctx.ellipse(potX, potY + 22, 26, 10, 0, 0, Math.PI * 2); ctx.fill();
    txt('empty soil', potX, potY - 14, '14px ' + FONT, 'rgba(0,0,0,0.45)', 'center', 'middle', false);
  }
  const frac = planted ? clamp((Date.now() - G.save.greenhouse.plantedAt) / GREENHOUSE_GROW_MS, 0, 1) : 0;
  txt(planted ? (stage >= 4 ? 'Ready to harvest!' : 'Growing… stage ' + stage + ' of 4') : 'Plant a coin crop — it grows in real time, even while you play (about 3 minutes)', W / 2, hy + hh + 42, 'bold 17px ' + FONT, planted && stage >= 4 ? '#2c6a1e' : '#3c5a2c', 'center', 'middle', false);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(W / 2 - 220, hy + hh + 62, 440, 20, 10);
  ctx.fill();
  if (frac > 0) {
    const pg = ctx.createLinearGradient(W / 2 - 220, 0, W / 2 + 220, 0);
    pg.addColorStop(0, '#7ac86a'); pg.addColorStop(1, '#4f9a40');
    ctx.fillStyle = pg;
    rr(W / 2 - 218, hy + hh + 64, 436 * frac, 16, 8);
    ctx.fill();
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 2; rr(W / 2 - 220, hy + hh + 62, 440, 20, 10); ctx.stroke();
  if (!planted) {
    const afford = G.save.coins >= GREENHOUSE_COST;
    button(W / 2 - 160, hy + hh + 100, 320, 54, '', function () {
      if (plantGreenhouse()) beep(660, 0.1, 'sine', 0.05, 990);
      else beep(140, 0.1, 'square', 0.04, 90);
    }, { bg: afford ? '#c8860a' : '#6a5a44', bgDark: afford ? '#a06a00' : '#554733', bgHover: '#e0a020' });
    drawCoinIcon(W / 2 - 108, hy + hh + 127, 11);
    txt('Plant coin crop (' + GREENHOUSE_COST + 'c)', W / 2 - 90, hy + hh + 128, 'bold 17px ' + FONT, '#fff', 'left', 'middle');
  } else if (stage >= 4) {
    button(W / 2 - 160, hy + hh + 100, 320, 54, '', function () {
      const y = harvestGreenhouse();
      if (y) { beep(880, 0.12, 'square', 0.05); setTimeout(function () { beep(1174, 0.15, 'square', 0.05); }, 110); }
    }, { bg: '#3f7a30', bgDark: '#2c5a20', bgHover: '#4f9a40' });
    drawCoinIcon(W / 2 - 100, hy + hh + 127, 11);
    txt('Harvest (+' + GREENHOUSE_YIELD + 'c)', W / 2 - 82, hy + hh + 128, 'bold 17px ' + FONT, '#fff', 'left', 'middle');
  } else {
    const left = Math.max(0, Math.ceil((GREENHOUSE_GROW_MS - (Date.now() - G.save.greenhouse.plantedAt)) / 1000));
    button(W / 2 - 160, hy + hh + 100, 320, 54, 'Growing… ' + left + 's to go', function () { beep(140, 0.08, 'square', 0.03, 90); }, { bg: '#6a5a44', bgDark: '#554733', font: 'bold 16px ' + FONT });
  }
  button(W / 2 - 90, H - 70, 180, 44, 'Back', function () { G.state = 'menu'; }, { font: 'bold 17px ' + FONT });
}
function drawAlmanac() {
  ctx.fillStyle = '#16241a';
  ctx.fillRect(0, 0, W, H);
  const hg = ctx.createLinearGradient(0, 0, 0, 110);
  hg.addColorStop(0, '#2c4a26');
  hg.addColorStop(1, '#1d2f18');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, W, 110);
  ctx.fillStyle = '#0f1c10';
  ctx.fillRect(0, 110, W, 4);
  txt('Almanac', 30, 58, 'bold 32px ' + FONT, '#ffe9c8', 'left', 'middle');
  const tabY = 24, tabW = 200, tabH = 52;
  button(W / 2 - 10 - tabW, tabY, tabW, tabH, '\uD83C\uDF3F Plants (' + SEED_ORDER.length + ')', function () { G.almanacTab = 'plants'; }, { font: 'bold 17px ' + FONT, bg: G.almanacTab === 'plants' ? '#c8860a' : '#4a3a24', bgDark: G.almanacTab === 'plants' ? '#a06a00' : '#33270f' });
  button(W / 2 + 10, tabY, tabW, tabH, '\uD83E\uDDDF Zombies (' + ZOMBIE_ORDER.length + ')', function () { G.almanacTab = 'zombies'; }, { font: 'bold 17px ' + FONT, bg: G.almanacTab === 'zombies' ? '#a03828' : '#4a3a24', bgDark: G.almanacTab === 'zombies' ? '#7a2a1c' : '#33270f' });
  drawCoinIcon(W - 250, 56, 13);
  txt('x ' + G.save.coins, W - 228, 57, 'bold 17px ' + FONT, '#ffd23f', 'left', 'middle');
  if (G.almanacTab === 'plants') {
    for (let i = 0; i < SEED_ORDER.length; i++) {
      const key = SEED_ORDER[i];
      const def = PLANT_TYPES[key];
      const col = i % 6;
      const rowi = Math.floor(i / 6);
      const x = 22 + col * 208;
      const y = 132 + rowi * 168;
      const w = 196, h = 152;
      const locked = G.save.unlocked.indexOf(key) < 0 && G.seedList.indexOf(key) < 0 && !hasItem('early_' + key);
      const hover = G.mouse.x >= x && G.mouse.x <= x + w && G.mouse.y >= y && G.mouse.y <= y + h;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      rr(x + 3, y + 4, w, h, 12);
      ctx.fill();
      const cg = ctx.createLinearGradient(0, y, 0, y + h);
      cg.addColorStop(0, '#2e4a2a');
      cg.addColorStop(1, '#203420');
      ctx.fillStyle = cg;
      rr(x, y, w, h, 12);
      ctx.fill();
      ctx.strokeStyle = locked ? '#555' : hover ? '#ffd23f' : '#5a8a4a';
      ctx.lineWidth = hover && !locked ? 3 : 2;
      ctx.stroke();
      circ(x + 34, y + 36, 24, 'rgba(255,255,255,0.1)', INK, 2);
      miniPlant(key, x + 34, y + 34);
      txt(locked ? '???' : def.name, x + 66, y + 28, 'bold 14px ' + FONT, locked ? '#8a8a7a' : '#fff');
      txt(locked ? 'not discovered yet' : def.cost + ' sun · recharge ' + def.cd + 's' + (def.water ? ' · water only' : ''), x + 66, y + 48, '11px ' + FONT, '#9ab88a');
      const lines = wrapText(locked ? 'Win levels or buy early access in the Store.' : def.desc, 30);
      ctx.font = '11px ' + FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = locked ? '#7a8a6a' : '#c8d8b8';
      for (let li = 0; li < Math.min(5, lines.length); li++) ctx.fillText(lines[li], x + 12, y + 76 + li * 15);
    }
  } else {
    for (let i = 0; i < ZOMBIE_ORDER.length; i++) {
      const key = ZOMBIE_ORDER[i];
      const def = ZOMBIE_TYPES[key];
      const col = i % 5;
      const rowi = Math.floor(i / 5);
      const x = 22 + col * 248;
      const y = 132 + rowi * 168;
      const w = 236, h = 152;
      const hover = G.mouse.x >= x && G.mouse.x <= x + w && G.mouse.y >= y && G.mouse.y <= y + h;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      rr(x + 3, y + 4, w, h, 12);
      ctx.fill();
      const cg = ctx.createLinearGradient(0, y, 0, y + h);
      cg.addColorStop(0, '#4a2e24');
      cg.addColorStop(1, '#33201a');
      ctx.fillStyle = cg;
      rr(x, y, w, h, 12);
      ctx.fill();
      ctx.strokeStyle = hover ? '#ffd23f' : '#8a5a44';
      ctx.lineWidth = hover ? 3 : 2;
      ctx.stroke();
      circ(x + 34, y + 36, 24, def.skin, INK, 2);
      box(x + 22, y + 48, 24, 20, 4, def.shirt, INK, 2);
      txt(def.name, x + 66, y + 28, 'bold 14px ' + FONT, '#fff');
      txt('HP ' + (def.hp + (def.armor || 0)) + (def.armor ? ' (+' + def.armor + ' armor)' : '') + ' · speed ' + def.speed + ' · dmg ' + def.dmg, x + 66, y + 48, '11px ' + FONT, '#d8b8a8');
      const lines = wrapText(def.desc, 36);
      ctx.font = '11px ' + FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#e8c8b8';
      for (let li = 0; li < Math.min(5, lines.length); li++) ctx.fillText(lines[li], x + 12, y + 76 + li * 15);
    }
  }
  const earned = ACHIEVEMENTS.filter(function (a) { return G.save.achievements.indexOf(a.id) >= 0; });
  panel(22, H - 108, W - 44, 56, 'rgba(30,42,24,0.95)', '#c8860a');
  txt('Achievements ' + earned.length + '/' + ACHIEVEMENTS.length, 42, H - 80, 'bold 16px ' + FONT, '#ffd23f', 'left', 'middle');
  txt(earned.length ? earned.map(function (a) { return a.name; }).join(' · ') : 'none yet — play to earn them!', 240, H - 80, '13px ' + FONT, '#c8d8b8', 'left', 'middle');
  button(W - 210, H - 102, 180, 46, 'Back', function () { G.state = 'menu'; }, { font: 'bold 16px ' + FONT });
}
function drawHelp() {
  ctx.fillStyle = '#1d2b1a';
  ctx.fillRect(0, 0, W, H);
  txt('How to Play', 70, 58, 'bold 32px ' + FONT, '#ffe9c8');
  const lines = [
    'Goal: stop the horde from reaching your house on the left. Each lane has one mower as a last resort.',
    '',
    '• Adventure is split into chapters — win levels in order to unlock the next ones (and new seed packets).',
    '• Sun (or moonlight at night) falls from the sky — click it to collect. Sunbloom / Sun Shroom produce extra sun.',
    '• Click a seed packet, then click a lawn tile to plant — the packet is used up after one planting (keys 1-9,0,-,=).',
    '• Shooters level up with kills (5 / 15 kills → Lv2 / Lv3): more damage, faster fire, ★ above the plant.',
    '• Pool chapters: middle lanes are water — Lotus Pad first, then anything on top, or Reed Shooter directly.',
    '• Earn coins 🪙 for every zombie, wave bonus and level win. Spend them in the Store on permanent upgrades,',
    '   or plant a coin crop in the Greenhouse (grows in real time, harvest for +40c).',
    '• Zombies each look different: cones/buckets/screens/tubes are armor, Leaper vaults, Howler enrages,',
    '   Flyer floats then lands, Ducky swims, Imps are tiny and fast, the crowned Boss throws Imps.',
    '• Clearing a wave cleanly grants +50 sun and +10 coins. 2★ for a flawless (no mower) win.',
    '• Difficulty (menu): easy / normal / hard. Everything is saved in your browser.',
    '',
    'Keys: 1-9,0,-,= select seed · S shovel · Esc/Space pause · bottom bar: shovel, pause, speed, sound, menu.'
  ];
  ctx.font = '15px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#e8f0dc';
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], 70, 96 + i * 30);
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
  panel(W / 2 - 300, H / 2 - 250, 600, 440, 'rgba(24,32,18,0.97)', G.won ? '#c8860a' : '#a03828');
  if (G.won) {
    txt('Yard Defended!', W / 2, H / 2 - 180, 'bold 48px ' + FONT, '#ffe9a8', 'center', 'middle');
    txt(G.mowersLost === 0 ? '★★  flawless — no mower lost!' : '★', W / 2, H / 2 - 122, '30px ' + FONT, '#ffd23f', 'center', 'middle');
    txt('Time ' + tstr + ' · zombies stopped ' + G.killed + ' / ' + G.totalZombies, W / 2, H / 2 - 72, '18px ' + FONT, '#d8e8c8', 'center', 'middle');
    drawCoinIcon(W / 2 - 60, H / 2 - 38, 10);
    txt('+50 coins · new seed packets unlocked!', W / 2 - 42, H / 2 - 37, '16px ' + FONT, '#ffd23f', 'left', 'middle');
    const hasNext = !G.endless && G.levelIndex + 1 < LEVELS.length;
    if (hasNext) button(W / 2 - 130, H / 2 + 20, 260, 54, 'Next Level', function () { startLevel(G.levelIndex + 1); }, { font: 'bold 18px ' + FONT });
    else button(W / 2 - 130, H / 2 + 20, 260, 54, 'Replay', function () { restart(); }, { font: 'bold 18px ' + FONT });
    button(W / 2 - 130, H / 2 + 88, 260, 54, 'Menu', function () { G.state = 'menu'; }, { font: 'bold 18px ' + FONT });
  } else {
    txt('The horde overran your garden!', W / 2, H / 2 - 170, 'bold 40px ' + FONT, '#ff8a7a', 'center', 'middle');
    if (G.endless) {
      txt('You survived ' + G.wave + ' waves and stopped ' + G.killed + ' zombies in ' + tstr + '.', W / 2, H / 2 - 100, '18px ' + FONT, '#d8e8c8', 'center', 'middle');
      if (G.wave > (G.save.bestEndless || 0)) { G.save.bestEndless = G.wave; persist(); }
      txt('Best: wave ' + G.save.bestEndless + '  ·  +' + G.wave * 2 + ' coins', W / 2, H / 2 - 64, '16px ' + FONT, '#c8b8e8', 'center', 'middle');
    } else {
      txt('Zombies stopped: ' + G.killed + ' / ' + G.totalZombies + ' · time ' + tstr, W / 2, H / 2 - 90, '18px ' + FONT, '#d8e8c8', 'center', 'middle');
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
  else if (G.state === 'chapters') drawChapters();
  else if (G.state === 'chapterLevels') drawChapterLevels();
  else if (G.state === 'store') drawStore();
  else if (G.state === 'greenhouse') drawGreenhouse();
  else if (G.state === 'almanac') drawAlmanac();
  else if (G.state === 'help') drawHelp();
  else {
    drawGame();
    if (G.state === 'paused') drawPause();
    else if (G.state === 'over') drawOver();
  }
  ctx.restore();
}
