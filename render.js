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
    ctx.fillStyle = 'rgba(160,170,210,0.9)';
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
  return { x: 132 + i * 82, y: 10, w: 76, h: 80 };
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
  ctx.fillStyle = def.body;
  ctx.beginPath(); ctx.arc(x + 17, y + 20, 12, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = def.dark;
  ctx.beginPath(); ctx.arc(x + 17, y + 20, 5.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a2a12';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const nameLines = wrapText(def.name, 12);
  ctx.fillText(nameLines[0], x + 33, y + 16);
  if (nameLines[1]) ctx.fillText(nameLines[1], x + 33, y + 26);
  drawSunIcon(x + 39, y + 40, 6.5, false);
  ctx.fillText(String(def.cost), x + 50, y + 44);
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
  const lines = wrapText(def.desc, 34);
  const bw = 260, bh = 34 + lines.length * 14;
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
  ctx.fillText(def.name + '  —  ' + def.cost + ' sun', bx + 10, by + 20);
  ctx.fillStyle = '#d8e8c8';
  ctx.font = '12px sans-serif';
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], bx + 10, by + 38 + i * 14);
}

function drawTopbar() {
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(0, 0, W, TOPBAR_H);
  ctx.fillStyle = '#54331a';
  ctx.fillRect(0, TOPBAR_H - 6, W, 6);
  ctx.fillStyle = '#f3e2b3';
  rr(10, 10, 110, 80, 8);
  ctx.fill();
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = 2;
  ctx.stroke();
  const night = G.level && !G.level.day;
  drawSunIcon(36, 50, 16, night);
  ctx.fillStyle = '#3a2a12';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(G.sun), 62, 51);
  G.hoverPacket = -1;
  for (let i = 0; i < G.seedList.length; i++) drawPacket(i);
  const sh = { x: 1118, y: 10, w: 56, h: 80 };
  ctx.fillStyle = G.shovel ? '#ffe9a8' : '#d8c49a';
  rr(sh.x, sh.y, sh.w, sh.h, 6);
  ctx.fill();
  ctx.strokeStyle = '#8a6a3a';
  ctx.lineWidth = G.shovel ? 3 : 1.5;
  ctx.stroke();
  ctx.fillStyle = '#7a6a4a';
  ctx.fillRect(sh.x + 24, sh.y + 14, 8, 34);
  ctx.fillStyle = '#4a4a4a';
  rr(sh.x + 16, sh.y + 46, 24, 16, 4);
  ctx.fill();
  ctx.fillStyle = '#3a2a12';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SHOVEL', sh.x + sh.w / 2, sh.y + sh.h - 8);
  G.buttons.push({ x: sh.x, y: sh.y, w: sh.w, h: sh.h, action: function () { G.shovel = !G.shovel; if (G.shovel) G.selectedSeed = null; } });
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
  ctx.fillText('Keys 1-9,0,-,= select seed · S shovel · Esc/Space pause · click sun to collect', 14, BOTTOM_Y + 44);
  const wtext = G.endless ? 'Endless — Wave ' + G.wave : 'Wave ' + Math.min(G.wave, G.level.waves) + ' / ' + G.level.waves;
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(wtext, 470, BOTTOM_Y + 22);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  rr(470, BOTTOM_Y + 34, 380, 18, 9);
  ctx.fill();
  let frac;
  if (G.endless) frac = (G.wave % 10) / 10;
  else frac = G.totalZombies ? clamp(G.killed / G.totalZombies, 0, 1) : 0;
  if (frac > 0) {
    ctx.fillStyle = '#ffd23f';
    rr(472, BOTTOM_Y + 36, 376 * frac, 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = '#d8e8c8';
  ctx.font = '12px sans-serif';
  ctx.fillText('stopped ' + G.killed, 860, BOTTOM_Y + 22);
  const by = BOTTOM_Y + 14, bh = 60;
  button(880, by, 64, bh, 'II', function () { G.state = 'paused'; }, { font: 'bold 20px sans-serif' });
  button(952, by, 72, bh, G.save.settings.speed + 'x', function () {
    G.save.settings.speed = G.save.settings.speed === 1 ? 2 : 1;
    persist();
  }, { font: 'bold 18px sans-serif' });
  button(1032, by, 64, bh, G.save.settings.mute ? '✕' : '♪', function () {
    G.save.settings.mute = !G.save.settings.mute;
    persist();
  }, { font: 'bold 20px sans-serif' });
  button(1104, by, 80, bh, 'Menu', function () { G.state = 'menu'; }, { font: 'bold 15px sans-serif' });
}

function drawPlant(p) {
  const def = PLANT_TYPES[p.type];
  const wob = Math.sin(G.time * 3 + p.col * 1.7 + p.row) * 2;
  const rec = (p.recoil || 0) * 40;
  const x = p.x + wob * 0.4;
  const y = p.y;
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath(); ctx.ellipse(p.x, y + 34, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
  if (p.type === 'sunbloom') {
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
  } else if (p.type === 'spitter' || p.type === 'doublespitter' || p.type === 'fern') {
    const big = p.type === 'doublespitter';
    const hr = big ? 19 : 16;
    ctx.strokeStyle = '#2f7a2a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x, y + 8); ctx.stroke();
    ctx.fillStyle = def.leaf;
    ctx.beginPath(); ctx.ellipse(x - 9, y + 24, 9, 4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.body;
    ctx.beginPath(); ctx.arc(x - 2, y, hr, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.dark;
    rr(x + 6 - rec, y - 6, 20, 12, 6);
    ctx.fill();
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
      ctx.fillStyle = '#8a6a42';
      ctx.beginPath(); ctx.ellipse(x, y + 18, 20, 12, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#6e5230';
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
  if (p.hp < p.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 22, y - 44, 44, 5);
    ctx.fillStyle = p.hp / p.maxHp > 0.4 ? '#5ad14a' : '#e0483e';
    ctx.fillRect(x - 21, y - 43, 42 * clamp(p.hp / p.maxHp, 0, 1), 3);
  }
}

function drawZombie(z) {
  const t = ZOMBIE_TYPES[z.type];
  const s = z.big ? 1.5 : 1;
  const wob = Math.sin(G.time * 6 + z.phase) * 2;
  const x = z.x;
  let y = rowY(z.row) + wob * 0.4;
  if (z.leapT > 0) y -= Math.sin(Math.PI * (1 - z.leapT / 0.45)) * 34;
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
  if (t.bucket) {
    if (hasArmor) {
      ctx.fillStyle = '#9aa0a6';
      rr(x - 12 * s + wob * 0.3, y - 58 * s, 24 * s, 18 * s, 4 * s);
      ctx.fill();
      ctx.strokeStyle = '#6a7076'; ctx.lineWidth = 2; ctx.stroke();
    }
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
  const blink = !s.fly && s.life < 2 ? (Math.floor(G.time * 6) % 2 === 0 ? 0.35 : 1) : 1;
  ctx.globalAlpha = blink;
  drawSunIcon(s.x, s.y, s.fly ? 12 : 17, s.night);
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

function drawGame() {
  const night = G.level && !G.level.day;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  if (night) { sky.addColorStop(0, '#0e1a3a'); sky.addColorStop(0.55, '#1c2f4a'); sky.addColorStop(1, '#22331f'); }
  else { sky.addColorStop(0, '#aee2ff'); sky.addColorStop(0.55, '#cfe8a8'); sky.addColorStop(1, '#7ec850'); }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
  if (night) {
    for (let i = 0; i < 60; i++) {
      const sx = (i * 211) % W;
      const sy = (i * 137) % (LAWN_Y - 10);
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + (i % 5) * 0.14) + ')';
      ctx.fillRect(sx, sy, 2, 2);
    }
    drawSunIcon(W - 70, 52, 26, true);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 4; i++) {
      const cx = ((G.time * 12 + i * 340) % (W + 200)) - 100;
      const cy = 30 + i * 22;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 34, 12, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 24, cy + 4, 24, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 24, cy + 5, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (night) ctx.fillStyle = (r + c) % 2 ? '#2a4a38' : '#315540';
      else ctx.fillStyle = (r + c) % 2 ? '#6fbf44' : '#7ecf52';
      ctx.fillRect(LAWN_X + c * CELL_W, LAWN_Y + r * CELL_H, CELL_W, CELL_H);
    }
  }
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
      const ok = !G.grid[cell.row][cell.col] && G.sun >= def.cost && G.cooldowns[G.selectedSeed] <= G.time;
      ctx.fillStyle = ok ? 'rgba(255,255,255,0.3)' : 'rgba(255,60,60,0.28)';
      ctx.fillRect(LAWN_X + cell.col * CELL_W, LAWN_Y + cell.row * CELL_H, CELL_W, CELL_H);
      ctx.strokeStyle = ok ? '#fff' : '#e0483e';
      ctx.lineWidth = 2;
      ctx.strokeRect(LAWN_X + cell.col * CELL_W + 1, LAWN_Y + cell.row * CELL_H + 1, CELL_W - 2, CELL_H - 2);
      ctx.globalAlpha = 0.55;
      drawPlant({ type: G.selectedSeed, row: cell.row, col: cell.col, x: cellCenter(cell.row, cell.col).x, y: cellCenter(cell.row, cell.col).y, hp: 1, maxHp: 1, armT: 99, armed: true, state: 'ready', recoil: 0 });
      ctx.globalAlpha = 1;
    }
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = G.grid[r][c];
      if (p) drawPlant(p);
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

  drawTopbar();
  drawBottombar();

  if (G.banner && G.bannerT > 0) {
    const big = G.bannerBig;
    ctx.globalAlpha = clamp(G.bannerT, 0, 1);
    ctx.font = 'bold ' + (big ? 54 : 34) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const tw = ctx.measureText(G.banner).width;
    ctx.fillStyle = big ? 'rgba(120,10,10,0.75)' : 'rgba(0,0,0,0.55)';
    rr(W / 2 - tw / 2 - 24, LAWN_Y + 60, tw + 48, big ? 76 : 52, 12);
    ctx.fill();
    ctx.fillStyle = big ? '#ffd8d0' : '#ffe9a8';
    ctx.fillText(G.banner, W / 2, LAWN_Y + 60 + (big ? 38 : 26));
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

function drawMenu() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#7ec8ff');
  g.addColorStop(0.55, '#a8e06a');
  g.addColorStop(1, '#4a9a3a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 50; i++) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.arc((i * 173) % W, (i * 97) % (H * 0.5), 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.font = 'bold 66px sans-serif';
  ctx.fillText('GARDEN GUARDIANS', W / 2 + 4, 158 + 4);
  ctx.fillStyle = '#2c4a1e';
  ctx.font = 'bold 66px sans-serif';
  ctx.fillText('GARDEN GUARDIANS', W / 2, 158);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#33501f';
  ctx.fillText('An original lane-defense game — defend your yard from the shambling horde.', W / 2, 215);
  drawSunIcon(W / 2 - 330, 152, 28, false);
  drawSunIcon(W / 2 + 330, 152, 28, false);
  drawPlant({ type: 'sunbloom', row: 0, col: 0, x: 180, y: 330, hp: 1, maxHp: 1, armT: 99, armed: true, state: 'ready', recoil: 0 });
  drawZombie({ type: 'shambler', row: 0, x: W - 180, hp: 200, maxHp: 200, armor: 0, armorMax: 0, speed: 0, dmg: 0, dead: false, dying: 0, phase: 1, leapT: 0, slowT: 0, eating: null });
  button(W / 2 - 150, 280, 300, 54, 'Adventure', function () { G.state = 'levels'; });
  button(W / 2 - 150, 346, 300, 54, 'Endless Yard', function () { startEndless(); });
  button(W / 2 - 150, 412, 300, 54, 'Almanac', function () { G.state = 'almanac'; });
  button(W / 2 - 150, 478, 300, 54, 'How to Play', function () { G.state = 'help'; });
  button(W - 130, H - 64, 110, 44, G.save.settings.mute ? 'Sound: off' : 'Sound: on', function () {
    G.save.settings.mute = !G.save.settings.mute;
    persist();
  }, { font: 'bold 13px sans-serif' });
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.font = '13px sans-serif';
  ctx.fillText('All code, art and names are original · runs entirely in your browser · v2', W / 2, H - 26);
}

function drawLevels() {
  ctx.fillStyle = '#22351c';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8f0dc';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Adventure', W / 2, 62);
  const cards = LEVELS.map(function (L, i) { return { level: i, L: L }; });
  cards.push({ endless: true });
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const col = i % 3;
    const rowi = Math.floor(i / 3);
    const x = 50 + col * 400;
    const y = 110 + rowi * 165;
    const w = 380, h = 145;
    if (card.endless) {
      button(x, y, w, h, '', function () { startEndless(); }, { bg: '#3a5a8a' });
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('Endless Yard', x + w / 2, y + 44);
      ctx.font = '15px sans-serif';
      ctx.fillStyle = '#cfe0ff';
      const unlockedN = Math.max(3, G.save.unlocked.length + 3);
      ctx.fillText('Survive as long as you can · ' + unlockedN + ' seed packets', x + w / 2, y + 80);
      ctx.fillStyle = '#9fc0e8';
      ctx.fillText('best: wave ' + (G.save.bestEndless || 0), x + w / 2, y + 108);
    } else {
      const locked = !levelUnlocked(card.level);
      const stars = G.save.completed[card.level] || 0;
      button(x, y, w, h, '', function () {
        if (!levelUnlocked(card.level)) { beep(140, 0.1, 'square', 0.04, 90); return; }
        startLevel(card.level);
      }, { bg: locked ? '#4a4a42' : (card.L.day ? '#8a5a33' : '#3a4a7a') });
      ctx.fillStyle = locked ? '#9a9a8a' : '#fff';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(card.L.name, x + w / 2, y + 40);
      ctx.font = '14px sans-serif';
      ctx.fillStyle = locked ? '#9a9a8a' : '#e8d8b8';
      ctx.fillText((card.L.day ? 'Day' : 'Night') + ' · ' + card.L.waves + ' waves · ' + card.L.seeds.length + ' seed packets', x + w / 2, y + 72);
      if (locked) {
        ctx.fillStyle = '#c8c8b8';
        ctx.font = '16px sans-serif';
        ctx.fillText('Complete the previous level to unlock', x + w / 2, y + 106);
      } else {
        ctx.fillStyle = '#ffd23f';
        ctx.font = '22px sans-serif';
        ctx.fillText(stars === 2 ? '★★' : stars === 1 ? '★☆' : '☆☆', x + w / 2, y + 108);
      }
    }
  }
  button(W / 2 - 90, H - 66, 180, 46, 'Back', function () { G.state = 'menu'; });
}

function drawAlmanac() {
  ctx.fillStyle = '#1d2b1a';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8f0dc';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('Almanac', W / 2, 46);
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd23f';
  ctx.fillText('Plants', 40, 92);
  for (let i = 0; i < SEED_ORDER.length; i++) {
    const key = SEED_ORDER[i];
    const def = PLANT_TYPES[key];
    const col = i % 6;
    const rowi = Math.floor(i / 6);
    const x = 40 + col * 205;
    const y = 110 + rowi * 130;
    const w = 195, h = 118;
    ctx.fillStyle = '#2c4226';
    rr(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = '#4a6a3a';
    ctx.stroke();
    const locked = G.save.unlocked.indexOf(key) < 0 && G.seedList.indexOf(key) < 0;
    ctx.fillStyle = def.body;
    ctx.beginPath(); ctx.arc(x + 26, y + 28, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = locked ? '#8a8a7a' : '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(locked ? '???' : def.name, x + 48, y + 24);
    ctx.fillStyle = '#9ab88a';
    ctx.font = '11px sans-serif';
    ctx.fillText(locked ? 'undiscovered' : def.cost + ' sun · recharge ' + def.cd + 's', x + 48, y + 40);
    ctx.fillStyle = locked ? '#7a8a6a' : '#c8d8b8';
    const lines = wrapText(locked ? 'Win levels to unlock this packet.' : def.desc, 30);
    for (let li = 0; li < Math.min(3, lines.length); li++) ctx.fillText(lines[li], x + 10, y + 62 + li * 15);
  }
  ctx.fillStyle = '#ff8a7a';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Zombies', 40, 392);
  for (let i = 0; i < ZOMBIE_ORDER.length; i++) {
    const key = ZOMBIE_ORDER[i];
    const def = ZOMBIE_TYPES[key];
    const col = i % 5;
    const rowi = Math.floor(i / 5);
    const x = 40 + col * 245;
    const y = 410 + rowi * 130;
    const w = 235, h = 118;
    ctx.fillStyle = '#33261f';
    rr(x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = '#6a4a3a';
    ctx.stroke();
    ctx.fillStyle = def.skin;
    ctx.beginPath(); ctx.arc(x + 26, y + 28, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = def.shirt;
    rr(x + 14, y + 40, 24, 22, 4);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(def.name, x + 50, y + 24);
    ctx.fillStyle = '#d8b8a8';
    ctx.font = '11px sans-serif';
    ctx.fillText('HP ' + (def.hp + (def.armor || 0)) + (def.armor ? ' (+' + def.armor + ' armor)' : '') + ' · speed ' + def.speed, x + 50, y + 40);
    ctx.fillStyle = '#e8c8b8';
    const lines = wrapText(def.desc, 36);
    for (let li = 0; li < Math.min(3, lines.length); li++) ctx.fillText(lines[li], x + 10, y + 62 + li * 15);
  }
  button(W / 2 - 90, H - 60, 180, 44, 'Back', function () { G.state = 'menu'; });
}

function drawHelp() {
  ctx.fillStyle = '#22351c';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8f0dc';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = 'bold 36px sans-serif';
  ctx.fillText('How to Play', 80, 70);
  ctx.font = '17px sans-serif';
  const lines = [
    'Goal: stop the horde from reaching your house on the left. Each lane has one mower as a last resort.',
    '',
    '• Sun (or moonlight at night) falls from the sky — click it to collect. Sunblooms produce extra sun.',
    '• Click a seed packet (keys 1-9, 0, -, =), then click a lawn tile to plant. Packets cost sun and recharge.',
    '• Shooters: Seed Spitter, Double Spitter (2 seeds), Frost Fern (slows), Melon Lob (lobbed splash).',
    '• Defense: Acorn Wall blocks. Thistle Pad hurts zombies standing on it. Tuber Trap is a contact mine.',
    '• Explosives: Blastcap (3x3), Blaze Reed (clears the whole lane).',
    '• Tricks: Diverter Onion changes the eater\'s lane when eaten. Gnasher swallows one zombie whole.',
    '• Zombie quirks: Pylonhead/Tinhead/Screenback wear armor first. Leaper vaults over one plant.',
    '   Howler speeds up when hurt. Dasher and Rusher are fast. Goliath is a walking fortress.',
    '• Win a level to unlock its seed packets for Endless mode and to earn stars (2 stars if no mower is lost).',
    '',
    'Keys: 1-9,0,-,= select seed · S shovel (click a plant to remove) · Esc/Space pause · bottom bar: speed, sound, menu.'
  ];
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], 80, 112 + i * 33);
  button(W / 2 - 90, H - 64, 180, 46, 'Back', function () { G.state = 'menu'; });
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
