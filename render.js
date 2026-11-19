'use strict';

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
  ctx.strokeStyle = '#3a2410';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = opts.fg || '#fff';
  ctx.font = opts.font || 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  G.buttons.push({ x: x, y: y, w: w, h: h, action: action });
}

function wrapText(text, maxChars) {
  const words = String(text).split(' ');
  const lines = [];
  let line = '';
  for (const wd of words) {
    if ((line + ' ' + wd).trim().length > maxChars) { lines.push(line.trim()); line = wd; }
    else line += ' ' + wd;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function drawSunIcon(x, y, r, moon) {
  if (moon) {
    ctx.fillStyle = '#e8ecff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(140,150,190,0.9)';
    ctx.beginPath(); ctx.arc(x + r * 0.4, y - r * 0.3, r * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cfd6f5';
    ctx.beginPath(); ctx.arc(x - r * 0.2, y + r * 0.2, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.1, y - r * 0.5, r * 0.1, 0, Math.PI * 2); ctx.fill();
    return;
  }
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
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e0a91e';
  ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.55, 0, Math.PI * 2); ctx.fill();
}

function packetRect(i) {
  const col = i % 9;
  const rowi = Math.floor(i / 9);
  return { x: 132 + col * 82, y: 10 + rowi * 84, w: 76, h: 80 };
}

function miniPlant(key, x, y) {
  ctx.save();
  ctx.translate(x, y + 12);
  ctx.scale(0.62, 0.62);
  ctx.translate(-x, -(y + 12));
  drawPlant({ type: key, row: 0, col: 0, x: x, y: y + 12, hp: 1, maxHp: 1, armT: 99, blowT: 99, growT: 99, grown: true, armed: true, state: 'ready', recoil: 0, xp: 0, level: 1, born: 0 });
  ctx.restore();
}

function drawPacket(i) {
  const key = G.seedList[i];
  const def = PLANT_TYPES[key];
  const rc = packetRect(i);
  const x = rc.x, y = rc.y, w = rc.w, h = rc.h;
  const sel = G.selectedSeed === key;
  const hover = G.mouse.x >= x && G.mouse.x <= x + w && G.mouse.y >= y && G.mouse.y <= y + h;
  if (hover) G.hoverPacket = i;
  ctx.fillStyle = sel ? '#ffe9a8' : hover ? '#f8ecd0' : '#f3e2b3';
  rr(x, y, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = sel ? '#c8860a' : '#8a6a3a';
  ctx.lineWidth = sel ? 3 : 1.5;
  ctx.stroke();
  miniPlant(key, x + 19, y + 18);
  ctx.fillStyle = '#3a2a12';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const nameLines = wrapText(def.name, 12);
  ctx.fillText(nameLines[0], x + 38, y + 14);
  if (nameLines[1]) ctx.fillText(nameLines[1], x + 38, y + 24);
  drawSunIcon(x + 44, y + 38, 6.5, false);
  ctx.fillText(String(def.cost), x + 55, y + 42);
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
  G.buttons.push({
    x: x, y: y, w: w, h: h,
    action: function () { G.selectedSeed = key; G.shovel = false; beep(600, 0.04, 'sine', 0.02); }
  });
}

function drawTooltip() {
  if (G.hoverPacket < 0 || G.hoverPacket >= G.seedList.length) return;
  if (G.state !== 'playing' && G.state !== 'paused') return;
  const key = G.seedList[G.hoverPacket];
  const def = PLANT_TYPES[key];
  const rc = packetRect(G.hoverPacket);
  const lines = wrapText(def.desc, 36);
  const bw = 280, bh = 36 + lines.length * 14;
  const bx = clamp(rc.x + rc.w / 2 - bw / 2, 8, W - bw - 8);
  const by = TOPBAR_H + 8;
  ctx.fillStyle = 'rgba(20,14,6,0.92)';
  rr(bx, by, bw, bh, 8);
  ctx.fill();
  ctx.strokeStyle = '#c8860a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(def.name + '  —  ' + def.cost + ' sun', bx + 10, by + 21);
  ctx.fillStyle = '#d8e8c8';
  ctx.font = '12px sans-serif';
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], bx + 10, by + 39 + i * 14);
}

function drawTopbar() {
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(0, 0, W, TOPBAR_H);
  ctx.fillStyle = '#54331a';
  ctx.fillRect(0, TOPBAR_H - 6, W, 6);
  ctx.fillStyle = '#f3e2b3';
  rr(10, 10, 110, 150, 8);
  ctx.fill();
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 2;
  ctx.stroke();
  const night = G.level && !G.level.day;
  drawSunIcon(65, 55, 20, night);
  ctx.fillStyle = '#3a2a12';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(G.sun), 65, 115);
  G.hoverPacket = -1;
  for (let i = 0; i < G.seedList.length; i++) drawPacket(i);
  ctx.fillStyle = '#e8d0a8';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText((G.level ? G.level.name : ''), W - 16, 36);
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#c8a878';
  const d = G.save.settings.difficulty;
  const biome = G.level && G.level.biome === 'pool' ? ' · Pool' : (night ? ' · Night' : ' · Day');
  ctx.fillText('Difficulty: ' + d.charAt(0).toUpperCase() + d.slice(1) + biome, W - 16, 62);
  ctx.fillText('kills ' + G.save.stats.kills + ' · planted ' + G.save.stats.plants + ' · sun ' + G.save.stats.sun, W - 16, 88);
  ctx.fillText('achievements ' + G.save.achievements.length + '/' + ACHIEVEMENTS.length, W - 16, 114);
  drawTooltip();
}

function drawBottombar() {
  ctx.fillStyle = '#54331a';
  ctx.fillRect(0, BOTTOM_Y, W, H - BOTTOM_Y);
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(0, BOTTOM_Y, W, 5);
  ctx.fillStyle = '#d8e8c8';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('Keys 1-9,0,-,= select seed · S shovel · Esc/Space pause · click sun to collect', 14, BOTTOM_Y + 26);
  const wtext = G.endless ? 'Endless — Wave ' + G.wave : 'Wave ' + Math.min(G.wave, G.level.waves) + ' / ' + G.level.waves;
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(wtext, 14, BOTTOM_Y + 52);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  rr(14, BOTTOM_Y + 62, 340, 18, 9);
  ctx.fill();
  let frac;
  if (G.endless) frac = (G.wave % 10) / 10;
  else frac = G.totalZombies ? clamp(G.killed / G.totalZombies, 0, 1) : 0;
  if (frac > 0) {
    ctx.fillStyle = '#ffd23f';
    rr(16, BOTTOM_Y + 64, 336 * frac, 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = '#d8e8c8';
  ctx.font = '12px sans-serif';
  ctx.fillText('stopped ' + G.killed + ' · shooters level up with kills (5/15)', 14, BOTTOM_Y + 96);
  const by = BOTTOM_Y + 24, bh = 56;
  const shLabel = G.shovel ? 'Shovel ✓' : 'Shovel (S)';
  button(620, by, 92, bh, shLabel, function () { G.shovel = !G.shovel; if (G.shovel) G.selectedSeed = null; }, { font: 'bold 13px sans-serif', bg: G.shovel ? '#c8860a' : '#8a5a33' });
  button(720, by, 60, bh, 'II', function () { G.state = 'paused'; }, { font: 'bold 20px sans-serif' });
  button(788, by, 68, bh, G.save.settings.speed + 'x', function () {
    G.save.settings.speed = G.save.settings.speed === 1 ? 2 : 1;
    persist();
  }, { font: 'bold 18px sans-serif' });
  button(864, by, 60, bh, G.save.settings.mute ? '✕' : '♪', function () {
    G.save.settings.mute = !G.save.settings.mute;
    persist();
  }, { font: 'bold 20px sans-serif' });
  button(932, by, 76, bh, 'Menu', function () { G.state = 'menu'; }, { font: 'bold 15px sans-serif' });
  ctx.fillStyle = '#c8a878';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('Garden Guardians v4', W - 14, BOTTOM_Y + 96);
}

function drawPlant(p) {
  const def = PLANT_TYPES[p.type];
  const wob = Math.sin(G.time * 3 + p.col * 1.7 + p.row) * 2;
  const rec = (p.recoil || 0) * 40;
  const x = p.x + wob * 0.4;
  const y = p.y;
  const scale = p.type === 'sunshroom' ? (p.grown ? 1 : 0.55) : 1;
  const pop = p.born !== undefined ? clamp((G.time - p.born) * 5, 0, 1) : 1;
  const popScale = 0.4 + 0.6 * (1 - Math.pow(1 - pop, 3));
  ctx.save();
  ctx.translate(x, y + 34);
  ctx.scale(scale * popScale, scale * popScale);
  ctx.translate(-x, -(y + 34));
  if (def.pad) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(p.x, y + 30, 26, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.body;
    ctx.beginPath(); ctx.ellipse(x, y + 12, 30, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.dark;
    ctx.beginPath();
    ctx.moveTo(x + 26, y + 12);
    ctx.lineTo(x + 8, y + 4);
    ctx.lineTo(x + 8, y + 20);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(x - 8, y + 8, 12, 5, -0.2, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(p.x, y + 34, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (p.type === 'sunbloom' || p.type === 'sunshroom') {
    ctx.strokeStyle = '#2f7a2a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x, y + 2); ctx.stroke();
    ctx.fillStyle = def.leaf;
    ctx.beginPath(); ctx.ellipse(x - 11, y + 22, 10, 4.5, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 11, y + 24, 10, 4.5, 0.5, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + wob * 0.03;
      ctx.fillStyle = def.body;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * 16, y - 2 + Math.sin(a) * 16, 8.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = def.dark;
    ctx.beginPath(); ctx.arc(x, y - 2, 9.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a2a12';
    ctx.beginPath(); ctx.arc(x - 3.5, y - 4, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 3.5, y - 4, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a2a12'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
    if (p.type === 'sunshroom' && !p.grown) {
      ctx.fillStyle = '#3a2a12';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(p.growT) + 's', x, y - 34);
    }
  } else if (p.type === 'spitter' || p.type === 'puff' || p.type === 'doublespitter' || p.type === 'fern' || p.type === 'splitspitter' || p.type === 'reed') {
    const big = p.type === 'doublespitter';
    const small = p.type === 'puff';
    const hr = big ? 19 : small ? 12 : 16;
    ctx.strokeStyle = '#2f7a2a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x, y + 8); ctx.stroke();
    ctx.fillStyle = def.leaf;
    ctx.beginPath(); ctx.ellipse(x - 9, y + 24, 9, 4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.body;
    ctx.beginPath(); ctx.arc(x - 2, y, hr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.dark;
    rr(x + 6 - rec, y - 6, 20, 12, 6);
    ctx.fill();
    if (p.type === 'splitspitter') {
      ctx.fillStyle = def.dark;
      rr(x - 26 + rec, y - 6, 20, 12, 6);
      ctx.fill();
    }
    if (big) {
      ctx.fillStyle = def.dark;
      rr(x + 4 - rec, y - 18, 18, 9, 4);
      ctx.fill();
    }
    if (p.type === 'fern') {
      ctx.strokeStyle = '#eaf7ff'; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(x - 2, y);
        ctx.lineTo(x - 2 + Math.cos(a) * 10, y + Math.sin(a) * 10);
        ctx.stroke();
      }
    }
    if (p.type === 'reed') {
      ctx.strokeStyle = def.dark; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 10, y + 26); ctx.lineTo(x - 14, y + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 8, y + 26); ctx.lineTo(x + 12, y + 4); ctx.stroke();
    }
    ctx.fillStyle = '#12222e';
    ctx.beginPath(); ctx.arc(x - 8, y - 5, 3, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'melonlob') {
    ctx.fillStyle = '#7a5a34';
    rr(x - 24, y + 16, 48, 14, 4);
    ctx.fill();
    ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 5;
    const armA = -0.9 + (p.recoil > 0 ? -p.recoil * 2.2 : Math.sin(G.time * 2 + p.col) * 0.08);
    ctx.beginPath(); ctx.moveTo(x, y + 16);
    ctx.lineTo(x + Math.cos(armA) * 34, y + 16 + Math.sin(armA) * 34);
    ctx.stroke();
    ctx.fillStyle = def.body;
    ctx.beginPath(); ctx.arc(x - 2, y - 4, 20, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = def.dark; ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(x - 2, y - 4, 20, 20, i * 0.5, -1.2, 1.2);
      ctx.stroke();
    }
  } else if (p.type === 'acorn') {
    ctx.fillStyle = def.body;
    ctx.beginPath(); ctx.ellipse(x, y + 8, 20, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.dark;
    ctx.beginPath(); ctx.ellipse(x, y - 12, 20, 10, 0, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = def.dark; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + 4, y - 29); ctx.stroke();
    ctx.fillStyle = '#3a2a12';
    ctx.beginPath(); ctx.arc(x - 6, y + 4, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 6, y + 4, 2.2, 0, Math.PI * 2); ctx.fill();
    if (p.hp < p.maxHp * 0.5) {
      ctx.strokeStyle = '#4a2c12'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 12, y - 6); ctx.lineTo(x - 4, y + 2); ctx.lineTo(x - 10, y + 12); ctx.stroke();
    }
  } else if (p.type === 'thistle') {
    ctx.fillStyle = def.leaf;
    ctx.beginPath(); ctx.ellipse(x, y + 26, 24, 8, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + wob * 0.02;
      const len = 20 + (i % 3) * 5;
      ctx.fillStyle = i % 2 ? def.body : def.dark;
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.lineTo(x + Math.cos(a) * len, y + 8 + Math.sin(a) * len);
      ctx.lineTo(x + Math.cos(a + 0.3) * len * 0.55, y + 8 + Math.sin(a + 0.3) * len * 0.55);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#e8d8ff';
    ctx.beginPath(); ctx.arc(x, y + 8, 6, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'tubertrap') {
    if (!p.armed) {
      ctx.fillStyle = terrain(p.row, p.col) === 'water' ? '#6a5a3a' : '#8a6a42';
      ctx.beginPath(); ctx.ellipse(x, y + 18, 20, 12, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#5a4a2e';
      ctx.beginPath(); ctx.ellipse(x + 6, y + 12, 6, 3, 0.4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.fillStyle = def.body;
      ctx.beginPath(); ctx.ellipse(x, y + 8, 17, 20, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = def.dark;
      ctx.beginPath(); ctx.ellipse(x - 6, y + 2, 4, 7, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#3a2a12';
      ctx.beginPath(); ctx.arc(x - 4, y - 2, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 5, y - 2, 2.2, 0, Math.PI * 2); ctx.fill();
      const blink = Math.floor(G.time * 2) % 2 === 0;
      if (blink) {
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.arc(x, y - 26, 4, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (p.type === 'blastcap') {
    const danger = p.armT < 0.5;
    ctx.fillStyle = danger && Math.floor(G.time * 10) % 2 === 0 ? '#fff' : def.body;
    ctx.beginPath(); ctx.arc(x, y + 4, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.quadraticCurveTo(x + 9, y - 24, x + 13, y - 20); ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(x + 13, y - 20, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.dark;
    ctx.beginPath(); ctx.arc(x - 5, y, 4, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'blazereed') {
    ctx.strokeStyle = '#2f7a2a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x, y - 6); ctx.stroke();
    const flame = 1 - clamp(p.armT / (PLANT_TYPES.blazereed.armDelay || 1), 0, 1);
    ctx.fillStyle = def.body;
    ctx.beginPath(); ctx.ellipse(x, y - 10, 7, 12, 0, 0, Math.PI * 2); ctx.fill();
    const fs = 6 + flame * 16;
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath(); ctx.arc(x, y - 24 - flame * 6, fs * 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(x, y - 24 - flame * 6, fs * 0.32, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'blover') {
    ctx.strokeStyle = '#2f7a2a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x, y + 6); ctx.stroke();
    const spin = G.time * 6 + p.col;
    for (let i = 0; i < 4; i++) {
      const a = spin + i / 4 * Math.PI * 2;
      ctx.fillStyle = i % 2 ? def.body : def.dark;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 14, y - 4 + Math.sin(a) * 14, 11, 5, a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#3a2a12';
    ctx.beginPath(); ctx.arc(x, y - 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(Math.ceil(p.blowT) + 's', x, y - 32);
  } else if (p.type === 'onion') {
    ctx.strokeStyle = '#2f7a2a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x, y + 14); ctx.stroke();
    ctx.fillStyle = def.body;
    ctx.beginPath(); ctx.arc(x, y, 17, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = def.dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#3a2a12';
    ctx.beginPath(); ctx.arc(x - 5, y - 3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5, y - 3, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3a2a12'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y + 3, 4, 0.2, Math.PI - 0.2); ctx.stroke();
  } else if (p.type === 'gnasher') {
    ctx.strokeStyle = '#2f7a2a'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x, y + 30); ctx.lineTo(x, y + 6); ctx.stroke();
    const open = p.state === 'chewing' ? (Math.sin(G.time * 14) * 0.5 + 0.5) * 0.9 + 0.1 : 0.35;
    ctx.fillStyle = def.body;
    ctx.beginPath(); ctx.arc(x, y - 8, 19, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5a1220';
    ctx.beginPath();
    ctx.moveTo(x - 16, y - 8);
    ctx.arc(x, y - 8, 17, Math.PI * (0.5 - open * 0.4), Math.PI * (0.5 + open * 0.4), false);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 9 - 3, y - 8 - 12);
      ctx.lineTo(x + i * 9 + 3, y - 8 - 12);
      ctx.lineTo(x + i * 9, y - 8 - 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#12222e';
    ctx.beginPath(); ctx.arc(x - 6, y - 20, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 6, y - 20, 2.6, 0, Math.PI * 2); ctx.fill();
    if (p.state === 'chewing') {
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(Math.ceil(p.chewT) + 's', x, y - 34);
    }
  }
  if (p.level > 1) {
    ctx.fillStyle = '#ffd23f';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★'.repeat(p.level - 1), x, y - 52);
  }
  if (!def.pad && p.hp < p.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 22, y - 46, 44, 5);
    ctx.fillStyle = p.hp / p.maxHp > 0.4 ? '#5ad14a' : '#e0483e';
    ctx.fillRect(x - 21, y - 45, 42 * clamp(p.hp / p.maxHp, 0, 1), 3);
  }
  ctx.restore();
}
function drawZombie(z) {
  const t = ZOMBIE_TYPES[z.type];
  let s = z.big ? 1.5 : 1;
  if (t.scale) s *= t.scale;
  const wob = Math.sin(G.time * 6 + z.phase) * 2;
  const x = z.x;
  let y = rowY(z.row) + wob * 0.4;
  if (z.leapT > 0) y -= Math.sin(Math.PI * (1 - z.leapT / 0.45)) * 34;
  if (z.flying) y -= 74;
  ctx.save();
  if (z.dying > 0) {
    const f = 1 - z.dying / 0.7;
    ctx.globalAlpha = 1 - f * 0.7;
    ctx.translate(x, y + 6 * s);
    ctx.rotate(-f * Math.PI / 2 * 0.9);
    ctx.translate(-x, -(y + 6 * s));
  }
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(x, rowY(z.row) + 8 * s, 20 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
  const legSwing = Math.sin(G.time * 8 + z.phase) * 4 * s;
  ctx.fillStyle = '#3d4450';
  ctx.fillRect(x - 10 * s + legSwing * 0.5, y - 4 * s, 8 * s, 10 * s);
  ctx.fillRect(x + 2 * s - legSwing * 0.5, y - 4 * s, 8 * s, 10 * s);
  if (t.ring && terrain(z.row, colOfZombie(z)) === 'water') {
    ctx.strokeStyle = '#e8a03c'; ctx.lineWidth = 5 * s;
    ctx.beginPath(); ctx.ellipse(x, y + 2 * s, 18 * s, 7 * s, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.ellipse(x, y + 2 * s, 18 * s, 7 * s, 0, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
  }
  ctx.fillStyle = t.shirt;
  rr(x - 14 * s, y - 26 * s, 28 * s, 26 * s, 6 * s);
  ctx.fill();
  if (z.eating) {
    ctx.strokeStyle = t.skin;
    ctx.lineWidth = 5 * s;
    ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 20 * s); ctx.lineTo(x - 22 * s, y - 26 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 8 * s, y - 20 * s); ctx.lineTo(x + 22 * s, y - 26 * s); ctx.stroke();
  }
  if (t.leap) {
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3 * s;
    ctx.beginPath(); ctx.moveTo(x + 10 * s, y - 18 * s); ctx.lineTo(x + 26 * s, y - 52 * s); ctx.stroke();
  }
  if (t.shield && z.armor > 0) {
    ctx.fillStyle = '#b8c4cc';
    rr(x - 20 * s, y - 30 * s, 10 * s, 30 * s, 2 * s);
    ctx.fill();
    ctx.strokeStyle = '#7a8894'; ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(x - 20 * s, y - 30 * s + i * 6 * s); ctx.lineTo(x - 10 * s, y - 30 * s + i * 6 * s); ctx.stroke();
    }
  }
  ctx.fillStyle = t.skin;
  ctx.beginPath(); ctx.arc(x + wob * 0.3, y - 36 * s, 12 * s, 0, Math.PI * 2); ctx.fill();
  if (z.flying) {
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.moveTo(x + wob * 0.3, y - 46 * s); ctx.lineTo(x + wob * 0.3, y - 78 * s); ctx.stroke();
    ctx.fillStyle = '#e05a7a';
    ctx.beginPath(); ctx.ellipse(x + wob * 0.3, y - 92 * s, 13 * s, 15 * s, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(x - 4 * s + wob * 0.3, y - 97 * s, 4 * s, 6 * s, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  const hasArmor = z.armor > 0;
  if (t.cone) {
    if (hasArmor) {
      ctx.fillStyle = '#e8862e';
      ctx.beginPath();
      ctx.moveTo(x - 11 * s + wob * 0.3, y - 42 * s);
      ctx.lineTo(x + 11 * s + wob * 0.3, y - 42 * s);
      ctx.lineTo(x + wob * 0.3, y - 64 * s);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 11 * s + wob * 0.3, y - 50 * s, 22 * s, 4 * s);
    } else {
      ctx.fillStyle = '#c86a1e';
      ctx.beginPath();
      ctx.moveTo(x + 16 * s, y - 44 * s);
      ctx.lineTo(x + 30 * s, y - 40 * s);
      ctx.lineTo(x + 16 * s, y - 36 * s);
      ctx.closePath(); ctx.fill();
    }
  }
  if (t.bucket && hasArmor) {
    ctx.fillStyle = '#9aa0a6';
    rr(x - 12 * s + wob * 0.3, y - 58 * s, 24 * s, 18 * s, 4 * s);
    ctx.fill();
    ctx.strokeStyle = '#6a7076'; ctx.lineWidth = 2; ctx.stroke();
  }
  if (t.helmet) {
    ctx.fillStyle = '#5a6a8a';
    ctx.beginPath(); ctx.arc(x + wob * 0.3, y - 40 * s, 12 * s, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(x - 2 * s + wob * 0.3, y - 52 * s, 4 * s, 14 * s);
  }
  if (z.type === 'howler') {
    ctx.fillStyle = '#e8e8e0';
    rr(x + 8 * s, y - 24 * s, 12 * s, 14 * s, 2);
    ctx.fill();
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 10 * s, y - 20 * s); ctx.lineTo(x + 18 * s, y - 20 * s); ctx.stroke();
  }
  ctx.fillStyle = z.enraged ? '#e02a1a' : '#1a1a1a';
  ctx.beginPath(); ctx.arc(x - 4 * s + wob * 0.3, y - 38 * s, 2.2 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5 * s + wob * 0.3, y - 38 * s, 2.2 * s, 0, Math.PI * 2); ctx.fill();
  if (z.eating) {
    ctx.strokeStyle = '#5a1a1a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x + wob * 0.3, y - 30 * s, 4.5 * s, 0, Math.PI); ctx.stroke();
  }
  if (z.slowT > 0) {
    ctx.fillStyle = 'rgba(120,200,255,0.3)';
    ctx.beginPath(); ctx.arc(x + wob * 0.3, y - 30 * s, 16 * s, 0, Math.PI * 2); ctx.fill();
  }
  if (z.flash > 0 && !z.dead) {
    ctx.fillStyle = 'rgba(255,255,255,' + clamp(z.flash * 6, 0, 0.7) + ')';
    ctx.beginPath(); ctx.arc(x + wob * 0.3, y - 28 * s, 18 * s, 0, Math.PI * 2); ctx.fill();
  }
  if (!z.dead && (z.hp < z.maxHp - z.armorMax || z.armor < z.armorMax)) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 22 * s, y - 58 * s, 44 * s, 5);
    if (z.armorMax > 0) {
      ctx.fillStyle = '#c8c8d8';
      ctx.fillRect(x - 21 * s, y - 57 * s, 42 * s * clamp(z.armor / z.armorMax, 0, 1), 3);
    }
    ctx.fillStyle = '#e0483e';
    const bodyMax = z.maxHp - z.armorMax;
    ctx.fillRect(x - 21 * s, y - 57 * s, 42 * s * clamp(z.hp / bodyMax, 0, 1), 3);
  }
  ctx.restore();
}

function drawMower(m, ri) {
  if (m.used) return;
  const y = rowY(ri);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(m.x, y + 10, 22, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7a1f16'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(m.x + 12, y - 14); ctx.lineTo(m.x + 26, y - 30); ctx.stroke();
  ctx.fillStyle = '#c23b2e';
  rr(m.x - 18, y - 22, 38, 22, 5);
  ctx.fill();
  ctx.fillStyle = '#7a1f16';
  rr(m.x - 6, y - 33, 15, 13, 3);
  ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(m.x - 10, y - 1, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(m.x + 11, y - 1, 6.5, 0, Math.PI * 2); ctx.fill();
}

function drawSunToken(s) {
  const pulse = 1 + Math.sin(G.time * 4) * 0.06;
  const blink = !s.fly && s.life < 2 ? (Math.floor(G.time * 6) % 2 === 0 ? 0.35 : 1) : 1;
  ctx.globalAlpha = blink;
  drawSunIcon(s.x, s.y, (s.fly ? 12 : 17) * pulse, s.night);
  ctx.globalAlpha = 1;
}

function drawProjectile(pr) {
  if (pr.kind === 'pea') {
    ctx.fillStyle = pr.slow ? '#bfeaff' : '#3fae4a';
    ctx.beginPath(); ctx.arc(pr.x, pr.y, 6.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = pr.slow ? '#fff' : '#9adf6a';
    ctx.beginPath(); ctx.arc(pr.x - 2, pr.y - 2, 2.5, 0, Math.PI * 2); ctx.fill();
  } else {
    const prog = clamp((pr.x - pr.x0) / Math.max(1, pr.tx - pr.x0), 0, 1);
    const yy = pr.y - Math.sin(Math.PI * prog) * 100;
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath(); ctx.ellipse(pr.x, pr.y + 14, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4da83e';
    ctx.beginPath(); ctx.arc(pr.x, yy, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2e6b26'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(pr.x, yy, 14, -0.7, 0.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(pr.x, yy, 14, Math.PI - 0.7, Math.PI + 0.7); ctx.stroke();
  }
}

function drawBossBar() {
  const boss = G.zombies.find(function (z) { return !z.dead && z.type === 'boss'; });
  if (!boss) return;
  const bw = 420, bx = LAWN_X + LAWN_W / 2 - bw / 2, by = LAWN_Y + 10;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  rr(bx - 8, by - 8, bw + 16, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#5a1010';
  rr(bx, by, bw, 16, 8);
  ctx.fill();
  ctx.fillStyle = '#e0483e';
  rr(bx + 2, by + 2, (bw - 4) * clamp(boss.hp / boss.maxHp, 0, 1), 12, 6);
  ctx.fill();
  ctx.fillStyle = '#ffd8d0';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('YARD BOSS', bx + bw / 2, by + 9);
}

function drawLawnTiles(night) {
  const pool = G.level && G.level.biome === 'pool';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const px = LAWN_X + c * CELL_W, py = LAWN_Y + r * CELL_H;
      if (pool && terrain(r, c) === 'water') {
        const wg = ctx.createLinearGradient(0, py, 0, py + CELL_H);
        if (night) { wg.addColorStop(0, '#1a3a5a'); wg.addColorStop(1, '#14304e'); }
        else { wg.addColorStop(0, '#4aa8e0'); wg.addColorStop(1, '#3a8ec8'); }
        ctx.fillStyle = wg;
        ctx.fillRect(px, py, CELL_W, CELL_H);
        ctx.strokeStyle = night ? 'rgba(180,220,255,0.25)' : 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 2;
        for (let wline = 0; wline < 3; wline++) {
          const wy = py + 20 + wline * 30 + Math.sin(G.time * 2 + c * 0.8 + wline) * 4;
          ctx.beginPath();
          ctx.moveTo(px + 6, wy);
          ctx.quadraticCurveTo(px + CELL_W / 2, wy - 6, px + CELL_W - 6, wy);
          ctx.stroke();
        }
      } else {
        if (night) ctx.fillStyle = (r + c) % 2 ? '#2a4a38' : '#315540';
        else ctx.fillStyle = (r + c) % 2 ? '#6fbf44' : '#7ecf52';
        ctx.fillRect(px, py, CELL_W, CELL_H);
        ctx.fillStyle = r % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
        ctx.fillRect(px, py, CELL_W, CELL_H);
      }
    }
  }
}

function drawGame() {
  const night = G.level && !G.level.day;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  if (night) { sky.addColorStop(0, '#0e1a3a'); sky.addColorStop(0.5, '#1c2f4a'); sky.addColorStop(1, '#22331f'); }
  else { sky.addColorStop(0, '#aee2ff'); sky.addColorStop(0.5, '#cfe8a8'); sky.addColorStop(1, '#7ec850'); }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  if (night) {
    for (let i = 0; i < 70; i++) {
      const sx = (i * 211) % W;
      const sy = (i * 137) % (LAWN_Y - 10);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + (i % 5) * 0.14) + ')';
      ctx.fillRect(sx, sy, 2, 2);
    }
    drawSunIcon(W - 70, 60, 26, true);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 4; i++) {
      const cx = ((G.time * 12 + i * 340) % (W + 200)) - 100;
      const cy = 40 + i * 30;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 34, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 24, cy + 4, 24, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 24, cy + 5, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drawLawnTiles(night);
  ctx.fillStyle = night ? '#18242e' : '#8a6a3a';
  ctx.fillRect(RIGHT_X, LAWN_Y, W - RIGHT_X, LAWN_H);
  ctx.fillStyle = night ? 'rgba(10,18,26,0.5)' : 'rgba(60,40,16,0.25)';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(RIGHT_X + 40 + i * 55, LAWN_Y + 50 + (i * 167) % (LAWN_H - 100), 30, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#6e4520';
  for (let i = 0; i <= LAWN_H / 52; i++) {
    ctx.fillRect(RIGHT_X - 4, LAWN_Y + i * 52, 10, 34);
  }
  ctx.fillRect(RIGHT_X - 6, LAWN_Y + 18, 14, 5);
  ctx.fillRect(RIGHT_X - 6, LAWN_Y + LAWN_H - 40, 14, 5);
  ctx.fillStyle = night ? '#4a3826' : '#8a5a33';
  ctx.fillRect(0, LAWN_Y, LAWN_X, LAWN_H);
  ctx.fillStyle = night ? '#8a6f4d' : '#c9a06a';
  ctx.fillRect(14, LAWN_Y + 50, 70, LAWN_H - 100);
  ctx.fillStyle = night ? '#5a2a3a' : '#a33b2a';
  ctx.beginPath();
  ctx.moveTo(6, LAWN_Y + 54);
  ctx.lineTo(49, LAWN_Y + 8);
  ctx.lineTo(92, LAWN_Y + 54);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(38, LAWN_Y + LAWN_H - 120, 24, 70);
  ctx.fillStyle = night ? '#9ab8d8' : '#aee2ff';
  ctx.fillRect(22, LAWN_Y + 70, 20, 20);
  ctx.fillRect(58, LAWN_Y + 70, 20, 20);
  ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 2;
  ctx.strokeRect(22, LAWN_Y + 70, 20, 20);
  ctx.strokeRect(58, LAWN_Y + 70, 20, 20);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(LAWN_X - 3, LAWN_Y, 4, LAWN_H);

  for (let ri = 0; ri < ROWS; ri++) drawMower(G.mowers[ri], ri);

  if (G.state === 'playing' && G.selectedSeed && !G.shovel) {
    const cell = cellFromXY(G.mouse.x, G.mouse.y);
    if (cell) {
      const def = PLANT_TYPES[G.selectedSeed];
      const terr = terrain(cell.row, cell.col);
      const padHere = !!G.pads[cell.row][cell.col];
      let ok = !G.grid[cell.row][cell.col] && G.sun >= def.cost && G.cooldowns[G.selectedSeed] <= G.time;
      if (terr === 'water') ok = ok && (def.water || padHere) && !(def.pad && padHere);
      else ok = ok && !def.water;
      ctx.fillStyle = ok ? 'rgba(255,255,255,0.3)' : 'rgba(255,60,60,0.28)';
      ctx.fillRect(LAWN_X + cell.col * CELL_W, LAWN_Y + cell.row * CELL_H, CELL_W, CELL_H);
      ctx.strokeStyle = ok ? '#fff' : '#e0483e';
      ctx.lineWidth = 2;
      ctx.strokeRect(LAWN_X + cell.col * CELL_W + 1, LAWN_Y + cell.row * CELL_H + 1, CELL_W - 2, CELL_H - 2);
      ctx.globalAlpha = 0.55;
      const ctr = cellCenter(cell.row, cell.col);
      drawPlant({ type: G.selectedSeed, row: cell.row, col: cell.col, x: ctr.x, y: ctr.y, hp: 1, maxHp: 1, armT: 99, blowT: 99, growT: 99, grown: true, armed: true, state: 'ready', recoil: 0, xp: 0, level: 1, born: 0 });
      ctx.globalAlpha = 1;
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (G.pads[r][c]) drawPlant(G.pads[r][c]);
      if (G.grid[r][c]) drawPlant(G.grid[r][c]);
    }
  }
  const sorted = G.zombies.slice().sort(function (a, b) { return a.row - b.row; });
  for (const z of sorted) drawZombie(z);
  for (const pr of G.projectiles) drawProjectile(pr);
  for (const e of G.rings) {
    ctx.globalAlpha = clamp(e.a, 0, 1);
    ctx.strokeStyle = '#ff9a3c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    if (e.wide) ctx.ellipse(e.x, e.y, e.r, e.r * 0.25, 0, 0, Math.PI * 2);
    else ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  for (const p of G.particles) {
    ctx.globalAlpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const s of G.suns) drawSunToken(s);
  for (const f of G.floaters) {
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.fillStyle = f.color;
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 0.95);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  drawTopbar();
  drawBossBar();
  drawBottombar();

  if (G.banner && G.bannerT > 0) {
    const big = G.bannerBig;
    ctx.globalAlpha = clamp(G.bannerT, 0, 1);
    ctx.font = 'bold ' + (big ? 54 : 34) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(G.banner).width;
    ctx.fillStyle = big ? 'rgba(120,10,10,0.75)' : 'rgba(0,0,0,0.55)';
    rr(W / 2 - tw / 2 - 24, LAWN_Y + 120, tw + 48, big ? 76 : 52, 12);
    ctx.fill();
    ctx.fillStyle = big ? '#ffd8d0' : '#ffe9a8';
    ctx.fillText(G.banner, W / 2, LAWN_Y + 120 + (big ? 38 : 26));
    ctx.globalAlpha = 1;
  }
  if (G.message && G.messageT > 0) {
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(G.message).width;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    rr(LAWN_X + LAWN_W / 2 - tw / 2 - 14, LAWN_Y + LAWN_H - 46, tw + 28, 30, 9);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(G.message, LAWN_X + LAWN_W / 2, LAWN_Y + LAWN_H - 30);
  }
}
function drawZombieAt(z, yOverride) {
  const t = ZOMBIE_TYPES[z.type];
  const wob = Math.sin(G.time * 6 + z.phase) * 2;
  const x = z.x;
  const y = yOverride + wob * 0.4;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(x, yOverride + 8, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
  const legSwing = Math.sin(G.time * 8 + z.phase) * 4;
  ctx.fillStyle = '#3d4450';
  ctx.fillRect(x - 10 + legSwing * 0.5, y - 4, 8, 10);
  ctx.fillRect(x + 2 - legSwing * 0.5, y - 4, 8, 10);
  ctx.fillStyle = t.shirt;
  rr(x - 14, y - 26, 28, 26, 6);
  ctx.fill();
  ctx.fillStyle = t.skin;
  ctx.beginPath(); ctx.arc(x + wob * 0.3, y - 36, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(x - 4 + wob * 0.3, y - 38, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5 + wob * 0.3, y - 38, 2.2, 0, Math.PI * 2); ctx.fill();
}

function drawMenu() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#7ec8ff');
  g.addColorStop(0.5, '#a8e06a');
  g.addColorStop(0.78, '#4a9a3a');
  g.addColorStop(1, '#3a7a2e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 60; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc((i * 173) % W, (i * 97) % (H * 0.45), 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 3; i++) {
    const cx = ((G.time * 16 + i * 420) % (W + 260)) - 130;
    ctx.beginPath();
    ctx.ellipse(cx, 70 + i * 36, 40, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 28, 75 + i * 36, 26, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#3c7a30';
  ctx.fillRect(0, H - 150, W, 150);
  ctx.fillStyle = '#478c38';
  ctx.fillRect(0, H - 150, W, 18);
  ctx.fillStyle = '#6e4520';
  for (let i = 0; i < 16; i++) ctx.fillRect(i * 84 + 20, H - 150, 10, 40);
  const mz = { type: 'shambler', row: 0, x: W - ((G.time * 46) % (W + 300)) + 60, hp: 200, maxHp: 200, armor: 0, armorMax: 0, speed: 0, dmg: 0, dead: false, dying: 0, phase: 1, leapT: 0, slowT: 0, eating: null, flying: false, summonT: 99 };
  drawZombieAt(mz, H - 78);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const tg = ctx.createLinearGradient(0, 110, 0, 200);
  tg.addColorStop(0, '#3f7a22');
  tg.addColorStop(1, '#2c4a1e');
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText('GARDEN GUARDIANS', W / 2 + 4, 178 + 4);
  ctx.fillStyle = tg;
  ctx.font = 'bold 72px sans-serif';
  ctx.fillText('GARDEN GUARDIANS', W / 2, 178);
  ctx.font = '21px sans-serif';
  ctx.fillStyle = '#33501f';
  ctx.fillText('An original lane-defense game — defend your yard from the shambling horde.', W / 2, 242);
  drawSunIcon(W / 2 - 380, 172, 28, false);
  drawSunIcon(W / 2 + 380, 172, 28, false);
  miniPlant('sunbloom', 200, 400);
  miniPlant('gnasher', 330, 400);
  button(W / 2 - 160, 300, 320, 56, 'Adventure', function () { G.state = 'levels'; });
  button(W / 2 - 160, 366, 320, 56, 'Endless Yard', function () { startEndless(); });
  button(W / 2 - 160, 432, 320, 56, 'Almanac', function () { G.state = 'almanac'; });
  button(W / 2 - 160, 498, 320, 56, 'How to Play', function () { G.state = 'help'; });
  const d = G.save.settings.difficulty;
  button(W / 2 - 160, 564, 320, 48, 'Difficulty: ' + d.charAt(0).toUpperCase() + d.slice(1), function () {
    const order = ['easy', 'normal', 'hard'];
    G.save.settings.difficulty = order[(order.indexOf(G.save.settings.difficulty) + 1) % order.length];
    persist();
    beep(500, 0.06, 'sine', 0.03);
  }, { font: 'bold 16px sans-serif', bg: d === 'hard' ? '#8a3a2a' : d === 'easy' ? '#4a7a3a' : '#8a5a33' });
  button(W - 150, H - 200, 130, 46, G.save.settings.mute ? 'Sound: off' : 'Sound: on', function () {
    G.save.settings.mute = !G.save.settings.mute;
    persist();
  }, { font: 'bold 13px sans-serif' });
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.font = '13px sans-serif';
  ctx.fillText('All code, art and names are original · runs entirely in your browser · v4 · achievements ' + G.save.achievements.length + '/' + ACHIEVEMENTS.length + ' · levels won ' + Object.keys(G.save.completed).length + '/' + LEVELS.length, W / 2, H - 18);
}

function drawLevels() {
  ctx.fillStyle = '#22351c';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8f0dc';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Adventure — ' + LEVELS.length + ' levels', W / 2, 42);
  const cards = LEVELS.map(function (L, i) { return { level: i, L: L }; });
  cards.push({ endless: true });
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const col = i % 3;
    const rowi = Math.floor(i / 3);
    const x = 40 + col * 408;
    const y = 72 + rowi * 134;
    const w = 388, h = 122;
    if (card.endless) {
      button(x, y, w, h, '', function () { startEndless(); }, { bg: '#3a5a8a' });
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('Endless Yard', x + w / 2, y + 36);
      ctx.font = '13px sans-serif';
      ctx.fillStyle = '#cfe0ff';
      ctx.fillText('Survive as long as you can · boss every 10th wave', x + w / 2, y + 66);
      ctx.fillStyle = '#9fc0e8';
      ctx.fillText('best: wave ' + (G.save.bestEndless || 0), x + w / 2, y + 94);
    } else {
      const locked = !levelUnlocked(card.level);
      const stars = G.save.completed[card.level] || 0;
      button(x, y, w, h, '', function () {
        if (!levelUnlocked(card.level)) { beep(140, 0.1, 'square', 0.04, 90); return; }
        startLevel(card.level);
      }, { bg: locked ? '#4a4a42' : (card.L.biome === 'pool' ? '#2a5a8a' : (card.L.day ? '#8a5a33' : '#3a4a7a')) });
      ctx.fillStyle = locked ? '#9a9a8a' : '#fff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(card.L.name + (card.L.boss ? ' \uD83D\uDC51' : '') + (card.L.biome === 'pool' ? ' \uD83C\uDF0A' : ''), x + w / 2, y + 34);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = locked ? '#9a9a8a' : '#e8d8b8';
      ctx.fillText((card.L.day ? 'Day' : 'Night') + (card.L.biome === 'pool' ? ' · Pool' : '') + ' · ' + card.L.waves + ' waves · ' + card.L.seeds.length + ' packets', x + w / 2, y + 62);
      if (locked) {
        ctx.fillStyle = '#c8c8b8';
        ctx.font = '14px sans-serif';
        ctx.fillText('Complete the previous level to unlock', x + w / 2, y + 92);
      } else {
        ctx.fillStyle = '#ffd23f';
        ctx.font = '20px sans-serif';
        ctx.fillText(stars === 2 ? '★★' : stars === 1 ? '★☆' : '☆☆', x + w / 2, y + 94);
      }
    }
  }
  button(W / 2 - 90, H - 52, 180, 40, 'Back', function () { G.state = 'menu'; });
}

function drawAlmanac() {
  ctx.fillStyle = '#1d2b1a';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8f0dc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText('Almanac', W / 2, 38);
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('Plants (' + SEED_ORDER.length + ')', 20, 74);
  for (let i = 0; i < SEED_ORDER.length; i++) {
    const key = SEED_ORDER[i];
    const def = PLANT_TYPES[key];
    const col = i % 9;
    const rowi = Math.floor(i / 9);
    const x = 14 + col * 139;
    const y = 86 + rowi * 126;
    const w = 131, h = 114;
    ctx.fillStyle = '#2c4226';
    rr(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = '#4a6a3a';
    ctx.stroke();
    const locked = G.save.unlocked.indexOf(key) < 0 && G.seedList.indexOf(key) < 0;
    miniPlant(key, x + 22, y + 22);
    ctx.fillStyle = locked ? '#8a8a7a' : '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(locked ? '???' : def.name, x + 42, y + 20);
    ctx.fillStyle = '#9ab88a';
    ctx.font = '10px sans-serif';
    ctx.fillText(locked ? 'undiscovered' : def.cost + ' sun · ' + def.cd + 's' + (def.water ? ' · water' : ''), x + 42, y + 34);
    ctx.fillStyle = locked ? '#7a8a6a' : '#c8d8b8';
    const lines = wrapText(locked ? 'Win levels to unlock this packet.' : def.desc, 24);
    for (let li = 0; li < Math.min(4, lines.length); li++) ctx.fillText(lines[li], x + 7, y + 54 + li * 13);
  }
  ctx.fillStyle = '#ff8a7a';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Zombies (' + ZOMBIE_ORDER.length + ')', 20, 356);
  for (let i = 0; i < ZOMBIE_ORDER.length; i++) {
    const key = ZOMBIE_ORDER[i];
    const def = ZOMBIE_TYPES[key];
    const col = i % 7;
    const rowi = Math.floor(i / 7);
    const x = 20 + col * 181;
    const y = 368 + rowi * 126;
    const w = 173, h = 114;
    ctx.fillStyle = '#33261f';
    rr(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = '#6a4a3a';
    ctx.stroke();
    ctx.fillStyle = def.skin;
    ctx.beginPath(); ctx.arc(x + 22, y + 24, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.shirt;
    rr(x + 12, y + 34, 20, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(def.name, x + 40, y + 20);
    ctx.fillStyle = '#d8b8a8';
    ctx.font = '10px sans-serif';
    ctx.fillText('HP ' + (def.hp + (def.armor || 0)) + (def.armor ? ' (+' + def.armor + ')' : '') + ' · spd ' + def.speed, x + 40, y + 34);
    ctx.fillStyle = '#e8c8b8';
    const lines = wrapText(def.desc, 30);
    for (let li = 0; li < Math.min(4, lines.length); li++) ctx.fillText(lines[li], x + 7, y + 54 + li * 13);
  }
  ctx.fillStyle = '#ffd23f';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  const earnedNames = ACHIEVEMENTS.filter(function (a) { return G.save.achievements.indexOf(a.id) >= 0; }).map(function (a) { return a.name; });
  ctx.fillText('Achievements ' + G.save.achievements.length + '/' + ACHIEVEMENTS.length + (earnedNames.length ? ': ' + earnedNames.join(', ') : ''), 20, H - 84);
  button(W / 2 - 90, H - 62, 180, 42, 'Back', function () { G.state = 'menu'; });
}

function drawHelp() {
  ctx.fillStyle = '#22351c';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8f0dc';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 32px sans-serif';
  ctx.fillText('How to Play', 70, 60);
  ctx.font = '15px sans-serif';
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
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], 70, 96 + i * 30);
  button(W / 2 - 90, H - 58, 180, 44, 'Back', function () { G.state = 'menu'; });
}

function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 46px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Paused', W / 2, H / 2 - 110);
  button(W / 2 - 120, H / 2 - 50, 240, 52, 'Resume', function () { G.state = 'playing'; });
  button(W / 2 - 120, H / 2 + 14, 240, 52, 'Restart', function () { restart(); });
  button(W / 2 - 120, H / 2 + 78, 240, 52, 'Menu', function () { G.state = 'menu'; });
}

function drawOver() {
  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const secs = Math.floor(G.time);
  const tstr = Math.floor(secs / 60) + ':' + ('0' + secs % 60).slice(-2);
  if (G.won) {
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 50px sans-serif';
    ctx.fillText('Yard Defended!', W / 2, H / 2 - 140);
    ctx.fillStyle = '#ffd23f';
    ctx.font = '34px sans-serif';
    ctx.fillText(G.mowersLost === 0 ? '★★  flawless — no mower lost!' : '★', W / 2, H / 2 - 88);
    ctx.font = '19px sans-serif';
    ctx.fillStyle = '#d8e8c8';
    ctx.fillText('Time ' + tstr + ' · zombies stopped ' + G.killed + ' / ' + G.totalZombies + ' · new seed packets unlocked!', W / 2, H / 2 - 44);
    const hasNext = !G.endless && G.levelIndex + 1 < LEVELS.length;
    if (hasNext) button(W / 2 - 130, H / 2 + 10, 260, 52, 'Next Level', function () { startLevel(G.levelIndex + 1); });
    else button(W / 2 - 130, H / 2 + 10, 260, 52, 'Replay', function () { restart(); });
    button(W / 2 - 130, H / 2 + 76, 260, 52, 'Menu', function () { G.state = 'menu'; });
  } else {
    ctx.fillStyle = '#ff8a7a';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('The horde overran your garden!', W / 2, H / 2 - 140);
    ctx.font = '19px sans-serif';
    ctx.fillStyle = '#d8e8c8';
    if (G.endless) {
      ctx.fillText('You survived ' + G.wave + ' waves and stopped ' + G.killed + ' zombies in ' + tstr + '.', W / 2, H / 2 - 80);
      if (G.wave > (G.save.bestEndless || 0)) { G.save.bestEndless = G.wave; persist(); }
      ctx.fillText('Best: wave ' + G.save.bestEndless, W / 2, H / 2 - 48);
    } else {
      ctx.fillText('Zombies stopped: ' + G.killed + ' / ' + G.totalZombies + ' · time ' + tstr, W / 2, H / 2 - 64);
    }
    button(W / 2 - 130, H / 2 + 10, 260, 52, 'Try Again', function () { restart(); });
    button(W / 2 - 130, H / 2 + 76, 260, 52, 'Menu', function () { G.state = 'menu'; });
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
