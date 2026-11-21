'use strict';

G.chapterIndex = 0;

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
  txt('Store', W / 2, 64, 'bold 34px ' + FONT, '#2c4a1e', 'center', 'middle', false);
  panel(W / 2 + 130, 30, 220, 56, 'rgba(247,232,192,0.95)', '#c8860a');
  drawCoinIcon(W / 2 + 158, 58, 14);
  txt('x ' + G.save.coins, W / 2 + 182, 59, 'bold 22px ' + FONT, '#7a4a00', 'left', 'middle', false);
  txt('Earn coins by stopping zombies, clearing waves and winning levels.', W / 2, 112, '15px ' + FONT, '#3c5a2c', 'center', 'middle', false);
  for (let i = 0; i < STORE_ITEMS.length; i++) {
    const it = STORE_ITEMS[i];
    const col = i % 5;
    const rowi = Math.floor(i / 5);
    const x = 30 + col * 246;
    const y = 140 + rowi * 250;
    const w = 232, h = 232;
    const owned = hasItem(it.id);
    panel(x, y, w, h, owned ? 'rgba(52,80,44,0.97)' : 'rgba(42,36,22,0.97)', owned ? '#7ac86a' : '#c8860a');
    txt(it.icon, x + w / 2, y + 44, '36px ' + FONT, '#fff', 'center', 'middle', false);
    txt(it.name, x + w / 2, y + 86, 'bold 16px ' + FONT, '#ffe9c8', 'center', 'middle');
    const lines = wrapText(it.desc, 26);
    ctx.font = '12px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d8e8c8';
    for (let li = 0; li < Math.min(3, lines.length); li++) ctx.fillText(lines[li], x + w / 2, y + 112 + li * 15);
    if (owned) {
      box(x + w / 2 - 46, y + h - 66, 92, 34, 8, '#3f7a30', INK, 2);
      txt('OWNED ✓', x + w / 2, y + h - 48, 'bold 15px ' + FONT, '#d8ffd0', 'center', 'middle');
    } else {
      const afford = G.save.coins >= it.price;
      button(x + 18, y + h - 66, w - 36, 34, '', function () {
        if (buyItem(it.id)) { beep(880, 0.1, 'square', 0.05); setTimeout(function () { beep(1174, 0.12, 'square', 0.05); }, 100); }
        else beep(140, 0.1, 'square', 0.04, 90);
      }, { bg: afford ? '#c8860a' : '#6a5a44', bgDark: afford ? '#a06a00' : '#554733', bgHover: '#e0a020' });
      drawCoinIcon(x + w / 2 - 34, y + h - 49, 9);
      txt(String(it.price), x + w / 2 - 20, y + h - 48, 'bold 16px ' + FONT, '#fff', 'left', 'middle');
    }
  }
  button(W / 2 - 90, H - 72, 180, 44, 'Back', function () { G.state = 'menu'; }, { font: 'bold 17px ' + FONT });
}

function drawGreenhouse() {
  screenBg(false);
  txt('Greenhouse', W / 2, 64, 'bold 34px ' + FONT, '#2c4a1e', 'center', 'middle', false);
  panel(W / 2 + 130, 30, 220, 56, 'rgba(247,232,192,0.95)', '#c8860a');
  drawCoinIcon(W / 2 + 158, 58, 14);
  txt('x ' + G.save.coins, W / 2 + 182, 59, 'bold 22px ' + FONT, '#7a4a00', 'left', 'middle', false);
  const hx = W / 2 - 260, hy = 150, hw = 520, hh = 380;
  ctx.fillStyle = '#6e5230';
  ctx.fillRect(hx - 20, hy + hh - 30, hw + 40, 30);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(hx - 20, hy + hh - 30, hw + 40, 30);
  ctx.fillStyle = '#8a6a42';
  ctx.fillRect(hx, hy + 60, hw, hh - 90);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.strokeRect(hx, hy + 60, hw, hh - 90);
  ctx.fillStyle = 'rgba(170,215,255,0.28)';
  ctx.fillRect(hx + 8, hy + 68, hw - 16, hh - 106);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(hx + 30, hy + hh - 44);
  ctx.lineTo(hx + 110, hy + 68);
  ctx.lineTo(hx + 150, hy + 68);
  ctx.lineTo(hx + 70, hy + hh - 44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a6a42';
  ctx.beginPath();
  ctx.moveTo(hx - 14, hy + 62);
  ctx.lineTo(hx + hw / 2, hy);
  ctx.lineTo(hx + hw + 14, hy + 62);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
  ctx.fillStyle = 'rgba(170,215,255,0.28)';
  ctx.beginPath();
  ctx.moveTo(hx + 6, hy + 60);
  ctx.lineTo(hx + hw / 2, hy + 8);
  ctx.lineTo(hx + hw - 6, hy + 60);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8a6a42'; ctx.lineWidth = 4;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(hx + i * hw / 4, hy + 60); ctx.lineTo(hx + i * hw / 4, hy + hh - 30); ctx.stroke();
  }
  ctx.beginPath(); ctx.moveTo(hx, hy + 60); ctx.lineTo(hx, hy + hh - 30); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(hx + hw, hy + 60); ctx.lineTo(hx + hw, hy + hh - 30); ctx.stroke();
  const stage = greenhouseStage();
  const planted = !!G.save.greenhouse.plantedAt;
  const potX = hx + hw / 2, potY = hy + hh - 70;
  ctx.fillStyle = '#a0522d';
  ctx.beginPath();
  ctx.moveTo(potX - 40, potY);
  ctx.lineTo(potX + 40, potY);
  ctx.lineTo(potX + 30, potY + 34);
  ctx.lineTo(potX - 30, potY + 34);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
  if (planted) {
    const sc = 0.45 + stage * 0.16;
    ctx.save();
    ctx.translate(potX, potY);
    ctx.scale(sc, sc);
    ctx.translate(-potX, -potY);
    miniPlant('sunbloom', potX, potY - 10);
    ctx.restore();
    if (stage >= 4) {
      const bob = Math.sin(G.time * 3) * 4;
      drawCoinIcon(potX + 55, potY - 60 + bob, 14);
      txt('+' + GREENHOUSE_YIELD, potX + 55, potY - 30 + bob, 'bold 15px ' + FONT, '#ffd23f', 'center', 'middle');
    }
  } else {
    txt('empty pot', potX, potY - 30, '15px ' + FONT, 'rgba(0,0,0,0.4)', 'center', 'middle', false);
  }
  const frac = planted ? clamp((Date.now() - G.save.greenhouse.plantedAt) / GREENHOUSE_GROW_MS, 0, 1) : 0;
  txt(planted ? (stage >= 4 ? 'Ready to harvest!' : 'Growing… stage ' + stage + '/4') : 'Plant a coin crop — it grows in real time (3 min)', W / 2, hy + hh + 40, 'bold 17px ' + FONT, planted && stage >= 4 ? '#2c6a1e' : '#3c5a2c', 'center', 'middle', false);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(W / 2 - 200, hy + hh + 62, 400, 18, 9);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = '#7ac86a';
    rr(W / 2 - 198, hy + hh + 64, 396 * frac, 14, 7);
    ctx.fill();
  }
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; rr(W / 2 - 200, hy + hh + 62, 400, 18, 9); ctx.stroke();
  if (!planted) {
    const afford = G.save.coins >= GREENHOUSE_COST;
    button(W / 2 - 140, hy + hh + 96, 280, 52, '', function () {
      if (plantGreenhouse()) beep(660, 0.1, 'sine', 0.05, 990);
      else beep(140, 0.1, 'square', 0.04, 90);
    }, { bg: afford ? '#c8860a' : '#6a5a44', bgDark: afford ? '#a06a00' : '#554733' });
    drawCoinIcon(W / 2 - 96, hy + hh + 122, 10);
    txt('Plant seed (' + GREENHOUSE_COST + 'c)', W / 2 - 80, hy + hh + 123, 'bold 16px ' + FONT, '#fff', 'left', 'middle');
  } else if (stage >= 4) {
    button(W / 2 - 140, hy + hh + 96, 280, 52, '', function () {
      const y = harvestGreenhouse();
      if (y) { beep(880, 0.12, 'square', 0.05); setTimeout(function () { beep(1174, 0.15, 'square', 0.05); }, 110); }
    }, { bg: '#3f7a30', bgDark: '#2c5a20', bgHover: '#4f9a40' });
    drawCoinIcon(W / 2 - 90, hy + hh + 122, 10);
    txt('Harvest (+' + GREENHOUSE_YIELD + 'c)', W / 2 - 74, hy + hh + 123, 'bold 16px ' + FONT, '#fff', 'left', 'middle');
  } else {
    button(W / 2 - 140, hy + hh + 96, 280, 52, 'Growing… ' + Math.ceil((GREENHOUSE_GROW_MS - (Date.now() - G.save.greenhouse.plantedAt)) / 1000) + 's left', function () { beep(140, 0.08, 'square', 0.03, 90); }, { bg: '#6a5a44', bgDark: '#554733', font: 'bold 15px ' + FONT });
  }
  button(W / 2 - 90, H - 72, 180, 44, 'Back', function () { G.state = 'menu'; }, { font: 'bold 17px ' + FONT });
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
    const locked = G.save.unlocked.indexOf(key) < 0 && G.seedList.indexOf(key) < 0 && !hasItem('early_' + key);
    circ(x + 22, y + 23, 14, 'rgba(255,255,255,0.12)', INK, 1.5);
    miniPlant(key, x + 22, y + 22);
    txt(locked ? '???' : def.name, x + 42, y + 20, 'bold 11px ' + FONT, locked ? '#8a8a7a' : '#fff');
    txt(locked ? 'undiscovered' : def.cost + ' sun · ' + def.cd + 's' + (def.water ? ' · water' : ''), x + 42, y + 35, '10px ' + FONT, '#9ab88a');
    const lines = wrapText(locked ? 'Win levels or buy it in the store.' : def.desc, 24);
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
