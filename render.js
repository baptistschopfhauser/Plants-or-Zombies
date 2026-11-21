'use strict';

const FONT = "'Fredoka','Trebuchet MS','Comic Sans MS',sans-serif";

function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const INK = 'rgba(24,32,14,0.85)';

function shape(fill, outline, lw) {
  ctx.fillStyle = fill;
  ctx.fill();
  if (outline) {
    ctx.strokeStyle = outline;
    ctx.lineWidth = lw || 2;
    ctx.stroke();
  }
}
function circ(x, y, r, fill, outline, lw) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  shape(fill, outline, lw);
}
function box(x, y, w, h, r, fill, outline, lw) {
  rr(x, y, w, h, r);
  shape(fill, outline, lw);
}
function txt(s, x, y, font, color, align, baseline, shadow) {
  ctx.font = font;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = baseline || 'alphabetic';
  if (shadow !== false) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillText(s, x + 2, y + 2);
  }
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

function button(x, y, w, h, label, action, opts) {
  opts = opts || {};
  const hover = G.mouse.x >= x && G.mouse.x <= x + w && G.mouse.y >= y && G.mouse.y <= y + h;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(x + 3, y + 4, w, h, 10);
  ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, hover ? (opts.bgHover || '#a06a3e') : (opts.bg || '#8a5a33'));
  g.addColorStop(1, opts.bgDark || '#6b4423');
  ctx.fillStyle = g;
  rr(x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  txt(label, x + w / 2, y + h / 2 + 1, opts.font || ('bold 16px ' + FONT), opts.fg || '#fff', 'center', 'middle');
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
    const mg = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.2);
    mg.addColorStop(0, 'rgba(220,228,255,0.35)');
    mg.addColorStop(1, 'rgba(220,228,255,0)');
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(x, y, r * 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8ecff';
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(140,150,190,0.9)';
    ctx.beginPath(); ctx.arc(x + r * 0.4, y - r * 0.3, r * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#cfd6f5';
    ctx.beginPath(); ctx.arc(x - r * 0.2, y + r * 0.2, r * 0.16, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + r * 0.1, y - r * 0.5, r * 0.1, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const sg = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 2.4);
  sg.addColorStop(0, 'rgba(255,210,63,0.5)');
  sg.addColorStop(1, 'rgba(255,210,63,0)');
  ctx.fillStyle = sg;
  ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, Math.PI * 2); ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(G.time * 0.6);
  ctx.strokeStyle = '#f5b81e';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.beginPath();
    ctx.moveTo(r + 3, 0);
    ctx.lineTo(r + 10, 0);
    ctx.stroke();
  }
  ctx.restore();
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
  g.addColorStop(0, '#ffe98a');
  g.addColorStop(1, '#f5b81e');
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = '#c8860a';
  ctx.lineWidth = 2;
  ctx.stroke();
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
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(x + 2, y + 3, w, h, 8);
  ctx.fill();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  if (sel) { g.addColorStop(0, '#ffedb0'); g.addColorStop(1, '#f0d488'); }
  else if (hover) { g.addColorStop(0, '#f8ecd0'); g.addColorStop(1, '#e8d0a0'); }
  else { g.addColorStop(0, '#f3e2b3'); g.addColorStop(1, '#dcc48e'); }
  ctx.fillStyle = g;
  rr(x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = sel ? '#c8860a' : INK;
  ctx.lineWidth = sel ? 3 : 1.5;
  ctx.stroke();
  circ(x + 19, y + 19, 14, 'rgba(255,255,255,0.55)', INK, 1.5);
  miniPlant(key, x + 19, y + 18);
  const nameLines = wrapText(def.name, 12);
  txt(nameLines[0], x + 38, y + 15, 'bold 9px ' + FONT, '#3a2a12');
  if (nameLines[1]) txt(nameLines[1], x + 38, y + 25, 'bold 9px ' + FONT, '#3a2a12');
  box(x + 36, y + 32, w - 44, 18, 9, 'rgba(255,244,200,0.9)', INK, 1);
  drawSunIcon(x + 45, y + 41, 6, false);
  txt(String(def.cost), x + 54, y + 45, 'bold 11px ' + FONT, '#7a4a10');
  const rem = G.cooldowns[key] - G.time;
  if (rem > 0) {
    const frac = clamp(rem / def.cd, 0, 1);
    ctx.fillStyle = 'rgba(30,20,10,0.6)';
    ctx.fillRect(x + 1, y + h - 1 - (h - 2) * frac, w - 2, (h - 2) * frac);
    txt(String(Math.ceil(rem)), x + w / 2, y + h / 2 + 4, 'bold 16px ' + FONT, '#fff', 'center', 'middle');
  }
  if (G.sun < def.cost) {
    ctx.fillStyle = 'rgba(60,60,60,0.35)';
    rr(x, y, w, h, 8);
    ctx.fill();
  }
  if (sel) {
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 2;
    rr(x - 2, y - 2, w + 4, h + 4, 10);
    ctx.stroke();
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
  const bw = 280, bh = 38 + lines.length * 15;
  const bx = clamp(rc.x + rc.w / 2 - bw / 2, 8, W - bw - 8);
  const by = TOPBAR_H + 8;
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(bx + 3, by + 3, bw, bh, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(24,18,8,0.95)';
  rr(bx, by, bw, bh, 10);
  ctx.fill();
  ctx.strokeStyle = '#c8860a';
  ctx.lineWidth = 2;
  ctx.stroke();
  txt(def.name + '  —  ' + def.cost + ' sun', bx + 12, by + 22, 'bold 14px ' + FONT, '#ffe9a8');
  ctx.fillStyle = '#d8e8c8';
  ctx.font = '12px ' + FONT;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], bx + 12, by + 42 + i * 15);
}

function drawTopbar() {
  const g = ctx.createLinearGradient(0, 0, 0, TOPBAR_H);
  g.addColorStop(0, '#7d5230');
  g.addColorStop(1, '#5d3a1c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, TOPBAR_H);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 8; i++) ctx.fillRect(0, 12 + i * 20, W, 2);
  ctx.fillStyle = '#3a2410';
  ctx.fillRect(0, TOPBAR_H - 6, W, 6);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  rr(13, 13, 110, 150, 10);
  ctx.fill();
  const cg = ctx.createLinearGradient(0, 10, 0, 160);
  cg.addColorStop(0, '#f7e8c0');
  cg.addColorStop(1, '#e0c890');
  ctx.fillStyle = cg;
  rr(10, 10, 110, 150, 10);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  const night = G.level && !G.level.day;
  const pulse = 1 + Math.sin(G.time * 4) * 0.05;
  drawSunIcon(65, 52, 20 * pulse, night);
  txt(String(G.sun), 65, 122, 'bold 30px ' + FONT, '#5a3a10', 'center', 'middle');
  G.hoverPacket = -1;
  for (let i = 0; i < G.seedList.length; i++) drawPacket(i);
  const rx = W - 16;
  txt(G.level ? G.level.name : '', rx, 30, 'bold 17px ' + FONT, '#ffe9c8', 'right', 'middle');
  const d = G.save.settings.difficulty;
  const biome = G.level && G.level.biome === 'pool' ? ' · Pool' : (night ? ' · Night' : ' · Day');
  txt('Difficulty: ' + d.charAt(0).toUpperCase() + d.slice(1) + biome, rx, 54, '13px ' + FONT, '#d8b888', 'right', 'middle');
  const wtext = G.endless ? 'Endless — Wave ' + G.wave : 'Wave ' + Math.min(G.wave, G.level.waves) + ' / ' + G.level.waves;
  txt(wtext + '   stopped ' + G.killed, rx, 76, 'bold 13px ' + FONT, '#ffe9a8', 'right', 'middle');
  let frac;
  if (G.endless) frac = (G.wave % 10) / 10;
  else frac = G.totalZombies ? clamp(G.killed / G.totalZombies, 0, 1) : 0;
  const bx = W - 236, bw = 220, by = 86;
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  rr(bx, by, bw, 14, 7);
  ctx.fill();
  if (frac > 0) {
    const fg = ctx.createLinearGradient(0, by, 0, by + 14);
    fg.addColorStop(0, '#ffe27a');
    fg.addColorStop(1, '#f5b81e');
    ctx.fillStyle = fg;
    rr(bx + 2, by + 2, (bw - 4) * frac, 10, 5);
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  rr(bx, by, bw, 14, 7);
  ctx.stroke();
  const fx = bx + bw - 2;
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(fx, by - 8); ctx.lineTo(fx, by + 14); ctx.stroke();
  ctx.fillStyle = '#e0483e';
  ctx.beginPath(); ctx.moveTo(fx, by - 8); ctx.lineTo(fx - 14, by - 3); ctx.lineTo(fx, by + 2); ctx.closePath(); ctx.fill();
  const hx = bx + 2 + (bw - 4) * frac;
  circ(hx, by + 7, 6, '#8aa06a', INK, 1.5);
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(hx - 2, by + 5, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(hx + 2, by + 5, 1.2, 0, Math.PI * 2); ctx.fill();
  txt('kills ' + G.save.stats.kills + ' · planted ' + G.save.stats.plants + ' · sun ' + G.save.stats.sun, rx, 112, '12px ' + FONT, '#d8b888', 'right', 'middle');
  drawCoinIcon(rx - 64, 134, 7);
  txt('x ' + G.save.coins, rx, 134, 'bold 13px ' + FONT, '#ffd23f', 'right', 'middle');
  txt('achievements ' + G.save.achievements.length + '/' + ACHIEVEMENTS.length, rx, 156, '12px ' + FONT, '#d8b888', 'right', 'middle');
  drawTooltip();
}

function drawBottombar() {
  const g = ctx.createLinearGradient(0, BOTTOM_Y, 0, H);
  g.addColorStop(0, '#5d3a1c');
  g.addColorStop(1, '#452a12');
  ctx.fillStyle = g;
  ctx.fillRect(0, BOTTOM_Y, W, H - BOTTOM_Y);
  ctx.fillStyle = '#2e1a0a';
  ctx.fillRect(0, BOTTOM_Y, W, 5);
  txt('Keys 1-9,0,-,= select seed · S shovel · Esc/Space pause · click sun to collect', 14, BOTTOM_Y + 30, '13px ' + FONT, '#e8d0a8', 'left', 'middle');
  txt('Shooter plants level up with kills (5/15 → Lv3)', 14, BOTTOM_Y + 58, '12px ' + FONT, '#c8a878', 'left', 'middle');
  txt('stopped ' + G.killed + (G.endless ? ' · wave ' + G.wave : ''), 14, BOTTOM_Y + 86, '12px ' + FONT, '#c8a878', 'left', 'middle');
  const by = BOTTOM_Y + 24, bh = 56;
  button(620, by, 92, bh, G.shovel ? 'Shovel ✓' : 'Shovel (S)', function () { G.shovel = !G.shovel; if (G.shovel) G.selectedSeed = null; }, { font: 'bold 13px ' + FONT, bg: G.shovel ? '#c8860a' : '#8a5a33', bgHover: G.shovel ? '#e0a020' : '#a06a3e' });
  button(720, by, 60, bh, 'II', function () { G.state = 'paused'; }, { font: 'bold 20px ' + FONT });
  button(788, by, 68, bh, G.save.settings.speed + 'x', function () {
    G.save.settings.speed = G.save.settings.speed === 1 ? 2 : 1;
    persist();
  }, { font: 'bold 18px ' + FONT });
  button(864, by, 60, bh, G.save.settings.mute ? '✕' : '♪', function () {
    G.save.settings.mute = !G.save.settings.mute;
    persist();
  }, { font: 'bold 20px ' + FONT });
  button(932, by, 76, bh, 'Menu', function () { G.state = 'menu'; }, { font: 'bold 15px ' + FONT });
  txt('Garden Guardians v5', W - 14, BOTTOM_Y + 92, '12px ' + FONT, '#a8875e', 'right', 'middle');
}
function drawPlant(p) {
  const def = PLANT_TYPES[p.type];
  const sway = Math.sin(G.time * 2.2 + p.col * 1.7 + p.row) * 3;
  const rec = (p.recoil || 0) * 40;
  const x = p.x + sway * 0.5;
  const y = p.y;
  const scale = p.type === 'sunshroom' ? (p.grown ? 1 : 0.55) : 1;
  const pop = p.born !== undefined ? clamp((G.time - p.born) * 5, 0, 1) : 1;
  const popScale = 0.4 + 0.6 * (1 - Math.pow(1 - pop, 3));
  ctx.save();
  ctx.translate(x, y + 34);
  ctx.scale(scale * popScale, scale * popScale);
  ctx.translate(-x, -(y + 34));
  if (def.pad) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(p.x, y + 30, 28, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x, y + 12, 30, 16, 0, 0, Math.PI * 2);
    shape(def.body, INK, 2.5);
    ctx.fillStyle = def.dark;
    ctx.beginPath();
    ctx.moveTo(x + 26, y + 12);
    ctx.lineTo(x + 8, y + 3);
    ctx.lineTo(x + 8, y + 21);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.ellipse(x - 9, y + 7, 12, 5, -0.2, 0, Math.PI * 2); ctx.stroke();
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(p.x, y + 34, 23, 7, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (p.type === 'sunbloom' || p.type === 'sunshroom') {
    ctx.strokeStyle = '#2f7a2a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x, y + 2); ctx.stroke();
    ctx.fillStyle = def.leaf;
    ctx.beginPath(); ctx.ellipse(x - 11, y + 22, 10, 4.5, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + 11, y + 24, 10, 4.5, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + sway * 0.02;
      circ(x + Math.cos(a) * 16, y - 2 + Math.sin(a) * 16, 8.5, def.body, '#c8860a', 1.5);
    }
    circ(x, y - 2, 9.5, def.dark, INK, 2);
    ctx.fillStyle = '#2a1c08';
    ctx.beginPath(); ctx.arc(x - 3.5, y - 4, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 3.5, y - 4, 1.7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a1c08'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x, y + 0.5, 3.5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(x - 6, y - 7, 1.6, 0, Math.PI * 2); ctx.fill();
    if (p.type === 'sunshroom' && !p.grown) {
      txt(Math.ceil(p.growT) + 's', x, y - 36, 'bold 11px ' + FONT, '#fff', 'center', 'middle');
    }
  } else if (p.type === 'spitter' || p.type === 'puff' || p.type === 'doublespitter' || p.type === 'fern' || p.type === 'splitspitter' || p.type === 'reed') {
    const big = p.type === 'doublespitter';
    const small = p.type === 'puff';
    const hr = big ? 19 : small ? 12 : 16;
    ctx.strokeStyle = '#2f7a2a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x, y + 8); ctx.stroke();
    ctx.fillStyle = def.leaf;
    ctx.beginPath(); ctx.ellipse(x - 9, y + 24, 9, 4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
    circ(x - 2, y, hr, def.body, INK, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.ellipse(x - 7, y - 6, hr * 0.35, hr * 0.22, -0.5, 0, Math.PI * 2); ctx.fill();
    box(x + 6 - rec, y - 6, 20, 12, 6, def.dark, INK, 2);
    if (p.type === 'splitspitter') box(x - 26 + rec, y - 6, 20, 12, 6, def.dark, INK, 2);
    if (big) box(x + 4 - rec, y - 18, 18, 9, 4, def.dark, INK, 2);
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
      ctx.strokeStyle = def.dark; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x - 10, y + 26); ctx.lineTo(x - 14, y + 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 8, y + 26); ctx.lineTo(x + 12, y + 4); ctx.stroke();
    }
    circ(x - 8, y - 5, 3, '#12222e');
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(x - 8.8, y - 5.8, 1, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'melonlob') {
    box(x - 24, y + 16, 48, 14, 4, '#7a5a34', INK, 2.5);
    ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    const armA = -0.9 + (p.recoil > 0 ? -p.recoil * 2.2 : Math.sin(G.time * 2 + p.col) * 0.08);
    ctx.beginPath(); ctx.moveTo(x, y + 16);
    ctx.lineTo(x + Math.cos(armA) * 34, y + 16 + Math.sin(armA) * 34);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(x - 2, y - 4, 20, 0, Math.PI * 2);
    shape(def.body, INK, 2.5);
    ctx.strokeStyle = def.dark; ctx.lineWidth = 3;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(x - 2, y - 4, 20, 20, i * 0.5, -1.2, 1.2);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(x - 8, y - 12, 7, 4, -0.5, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'acorn') {
    ctx.beginPath(); ctx.ellipse(x, y + 8, 20, 24, 0, 0, Math.PI * 2);
    shape(def.body, INK, 2.5);
    ctx.beginPath(); ctx.ellipse(x, y - 12, 20, 10, 0, Math.PI, 0);
    shape(def.dark, INK, 2.5);
    ctx.strokeStyle = def.dark; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - 20); ctx.lineTo(x + 4, y - 29); ctx.stroke();
    ctx.fillStyle = '#2a1c08';
    ctx.beginPath(); ctx.arc(x - 6, y + 4, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 6, y + 4, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.arc(x - 6.8, y + 3.2, 0.9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5.2, y + 3.2, 0.9, 0, Math.PI * 2); ctx.fill();
    if (p.hp < p.maxHp * 0.5) {
      ctx.strokeStyle = '#4a2c12'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 12, y - 6); ctx.lineTo(x - 4, y + 2); ctx.lineTo(x - 10, y + 12); ctx.stroke();
    }
  } else if (p.type === 'thistle') {
    ctx.beginPath(); ctx.ellipse(x, y + 26, 24, 8, 0, 0, Math.PI * 2);
    shape(def.leaf, INK, 2);
    for (let i = 0; i < 9; i++) {
      const a = i / 9 * Math.PI * 2 + sway * 0.02;
      const len = 20 + (i % 3) * 5;
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.lineTo(x + Math.cos(a) * len, y + 8 + Math.sin(a) * len);
      ctx.lineTo(x + Math.cos(a + 0.3) * len * 0.55, y + 8 + Math.sin(a + 0.3) * len * 0.55);
      ctx.closePath();
      shape(i % 2 ? def.body : def.dark, INK, 1.5);
    }
    circ(x, y + 8, 6, '#e8d8ff', INK, 1.5);
  } else if (p.type === 'tubertrap') {
    if (!p.armed) {
      ctx.fillStyle = terrain(p.row, p.col) === 'water' ? '#6a5a3a' : '#8a6a42';
      ctx.beginPath(); ctx.ellipse(x, y + 18, 20, 12, 0, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#5a4a2e';
      ctx.beginPath(); ctx.ellipse(x + 6, y + 12, 6, 3, 0.4, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.ellipse(x, y + 8, 17, 20, 0, 0, Math.PI * 2);
      shape(def.body, INK, 2.5);
      ctx.fillStyle = def.dark;
      ctx.beginPath(); ctx.ellipse(x - 6, y + 2, 4, 7, -0.3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a1c08';
      ctx.beginPath(); ctx.arc(x - 4, y - 2, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 5, y - 2, 2.4, 0, Math.PI * 2); ctx.fill();
      const blink = Math.floor(G.time * 2) % 2 === 0;
      if (blink) circ(x, y - 26, 4.5, '#ffd23f', '#c8860a', 1.5);
    }
  } else if (p.type === 'blastcap') {
    const danger = p.armT < 0.5;
    circ(x, y + 4, 17, danger && Math.floor(G.time * 10) % 2 === 0 ? '#fff' : def.body, INK, 2.5);
    ctx.strokeStyle = '#5a3a1a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.quadraticCurveTo(x + 9, y - 24, x + 13, y - 20); ctx.stroke();
    circ(x + 13, y - 20, 4, '#ffd23f', '#c8860a', 1.5);
    circ(x - 5, y, 4.5, def.dark, INK, 1.5);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(x - 7, y - 4, 4, 3, -0.6, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'blazereed') {
    ctx.strokeStyle = '#2f7a2a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x, y - 6); ctx.stroke();
    const flame = 1 - clamp(p.armT / (PLANT_TYPES.blazereed.armDelay || 1), 0, 1);
    ctx.beginPath(); ctx.ellipse(x, y - 10, 7, 12, 0, 0, Math.PI * 2);
    shape(def.body, INK, 2);
    const fs = 6 + flame * 16;
    circ(x, y - 24 - flame * 6, fs * 0.6, '#ff9a3c', '#c85a10', 1.5);
    circ(x, y - 24 - flame * 6, fs * 0.32, '#ffd23f');
  } else if (p.type === 'blover') {
    ctx.strokeStyle = '#2f7a2a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x, y + 6); ctx.stroke();
    const spin = G.time * 6 + p.col;
    for (let i = 0; i < 4; i++) {
      const a = spin + i / 4 * Math.PI * 2;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 14, y - 4 + Math.sin(a) * 14, 11, 5, a, 0, Math.PI * 2);
      shape(i % 2 ? def.body : def.dark, INK, 1.5);
    }
    circ(x, y - 4, 4.5, '#2a1c08');
    txt(Math.ceil(p.blowT) + 's', x, y - 34, 'bold 11px ' + FONT, '#fff', 'center', 'middle');
  } else if (p.type === 'onion') {
    ctx.strokeStyle = '#2f7a2a'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + 28); ctx.lineTo(x, y + 14); ctx.stroke();
    circ(x, y, 17, def.body, INK, 2.5);
    ctx.strokeStyle = def.dark; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 5.5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#2a1c08';
    ctx.beginPath(); ctx.arc(x - 5, y - 3, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 5, y - 3, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a1c08'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(x, y + 3, 4, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(x - 8, y - 8, 5, 3, -0.5, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'gnasher') {
    ctx.strokeStyle = '#2f7a2a'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y + 30); ctx.lineTo(x, y + 6); ctx.stroke();
    const open = p.state === 'chewing' ? (Math.sin(G.time * 14) * 0.5 + 0.5) * 0.9 + 0.1 : 0.35;
    circ(x, y - 8, 19, def.body, INK, 2.5);
    ctx.fillStyle = '#5a1220';
    ctx.beginPath();
    ctx.moveTo(x - 16, y - 8);
    ctx.arc(x, y - 8, 17, Math.PI * (0.5 - open * 0.4), Math.PI * (0.5 + open * 0.4), false);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.stroke();
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
    ctx.beginPath(); ctx.arc(x - 6, y - 20, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 6, y - 20, 2.8, 0, Math.PI * 2); ctx.fill();
    if (p.state === 'chewing') {
      txt(Math.ceil(p.chewT) + 's', x, y - 36, 'bold 12px ' + FONT, '#ffe9a8', 'center', 'middle');
    }
  }
  drawPlantAccent(p, x, y, def, sway);
  if (p.level > 1) {
    txt('★'.repeat(p.level - 1), x, y - 54, 'bold 14px ' + FONT, '#ffd23f', 'center', 'middle');
  }
  if (!def.pad && p.hp < p.maxHp) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 22, y - 48, 44, 6);
    ctx.fillStyle = p.hp / p.maxHp > 0.4 ? '#5ad14a' : '#e0483e';
    ctx.fillRect(x - 21, y - 47, 42 * clamp(p.hp / p.maxHp, 0, 1), 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 22, y - 48, 44, 6);
  }
  ctx.restore();
}
function drawZombie(z) {
  const t = ZOMBIE_TYPES[z.type];
  let s = z.big ? 1.5 : 1;
  if (t.scale) s *= t.scale;
  const wob = Math.sin(G.time * 6 + z.phase) * 2;
  const x = z.x;
  let y = rowY(z.row) + wob * 0.5;
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
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(x, rowY(z.row) + 8 * s, 20 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
  const legSwing = Math.sin(G.time * 8 + z.phase) * 4 * s;
  ctx.fillStyle = '#3d4450';
  ctx.fillRect(x - 10 * s + legSwing * 0.5, y - 6 * s, 8 * s, 8 * s);
  ctx.fillRect(x + 2 * s - legSwing * 0.5, y - 6 * s, 8 * s, 8 * s);
  ctx.fillStyle = '#2a2f38';
  box(x - 11 * s + legSwing * 0.5, y - 2 * s, 9 * s, 5 * s, 2, '#2a2f38', INK, 1.5);
  box(x + 1 * s - legSwing * 0.5, y - 2 * s, 9 * s, 5 * s, 2, '#2a2f38', INK, 1.5);
  if (t.ring && terrain(z.row, colOfZombie(z)) === 'water') {
    ctx.strokeStyle = '#e8a03c'; ctx.lineWidth = 6 * s;
    ctx.beginPath(); ctx.ellipse(x, y + 2 * s, 18 * s, 7 * s, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.ellipse(x, y + 2 * s, 18 * s, 7 * s, 0, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
  }
  rr(x - 14 * s, y - 26 * s, 28 * s, 26 * s, 6 * s);
  shape(t.shirt, INK, 2.5);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y - 26 * s + 6 * s);
  ctx.lineTo(x + 14 * s, y - 26 * s + 6 * s);
  ctx.lineTo(x + 14 * s, y - 26 * s);
  ctx.lineTo(x - 14 * s, y - 26 * s);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#7a2a2a';
  ctx.beginPath();
  ctx.moveTo(x - 3 * s, y - 26 * s);
  ctx.lineTo(x + 3 * s, y - 26 * s);
  ctx.lineTo(x, y - 18 * s);
  ctx.closePath();
  ctx.fill();
  if (z.eating) {
    ctx.strokeStyle = t.skin;
    ctx.lineWidth = 5 * s;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 8 * s, y - 20 * s); ctx.lineTo(x - 22 * s, y - 27 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 8 * s, y - 20 * s); ctx.lineTo(x + 22 * s, y - 27 * s); ctx.stroke();
  } else {
    ctx.strokeStyle = t.skin;
    ctx.lineWidth = 5 * s;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 12 * s, y - 20 * s); ctx.lineTo(x - 18 * s, y - 8 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 12 * s, y - 20 * s); ctx.lineTo(x + 18 * s, y - 8 * s); ctx.stroke();
  }
  if (t.leap) {
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 3.5 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 10 * s, y - 18 * s); ctx.lineTo(x + 26 * s, y - 52 * s); ctx.stroke();
  }
  if (t.shield && z.armor > 0) {
    box(x - 21 * s, y - 30 * s, 10 * s, 30 * s, 2 * s, '#b8c4cc', INK, 2);
    ctx.strokeStyle = '#7a8894'; ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(x - 21 * s, y - 30 * s + i * 6 * s); ctx.lineTo(x - 11 * s, y - 30 * s + i * 6 * s); ctx.stroke();
    }
  }
  circ(x + wob * 0.3, y - 36 * s, 12 * s, t.skin, INK, 2.5);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath(); ctx.ellipse(x - 5 * s + wob * 0.3, y - 42 * s, 4 * s, 2.5 * s, -0.5, 0, Math.PI * 2); ctx.fill();
  if (z.flying) {
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.moveTo(x + wob * 0.3, y - 46 * s); ctx.lineTo(x + wob * 0.3, y - 78 * s); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(x + wob * 0.3, y - 92 * s, 13 * s, 15 * s, 0, 0, Math.PI * 2);
    shape('#e05a7a', INK, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(x - 4 * s + wob * 0.3, y - 97 * s, 4 * s, 6 * s, -0.5, 0, Math.PI * 2); ctx.fill();
  }
  const hasArmor = z.armor > 0;
  if (t.cone) {
    if (hasArmor) {
      ctx.beginPath();
      ctx.moveTo(x - 11 * s + wob * 0.3, y - 42 * s);
      ctx.lineTo(x + 11 * s + wob * 0.3, y - 42 * s);
      ctx.lineTo(x + wob * 0.3, y - 64 * s);
      ctx.closePath();
      shape('#e8862e', INK, 2.5);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 11 * s + wob * 0.3, y - 50 * s, 22 * s, 4 * s);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.ellipse(x - 4 * s + wob * 0.3, y - 58 * s, 3 * s, 6 * s, 0.3, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(x + 16 * s, y - 44 * s);
      ctx.lineTo(x + 30 * s, y - 40 * s);
      ctx.lineTo(x + 16 * s, y - 36 * s);
      ctx.closePath();
      shape('#c86a1e', INK, 2);
    }
  }
  if (t.bucket && hasArmor) {
    const bg = ctx.createLinearGradient(x - 12 * s, y - 58 * s, x + 12 * s, y - 40 * s);
    bg.addColorStop(0, '#c8cdd4');
    bg.addColorStop(0.5, '#9aa0a6');
    bg.addColorStop(1, '#7a8087');
    rr(x - 12 * s + wob * 0.3, y - 58 * s, 24 * s, 18 * s, 4 * s);
    shape(bg, INK, 2.5);
    ctx.strokeStyle = '#6a7076'; ctx.lineWidth = 2; ctx.stroke();
  }
  if (t.helmet) {
    ctx.beginPath(); ctx.arc(x + wob * 0.3, y - 40 * s, 12 * s, Math.PI, 0);
    shape('#5a6a8a', INK, 2.5);
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(x - 2 * s + wob * 0.3, y - 52 * s, 4 * s, 14 * s);
  }
  if (z.type === 'howler') {
    box(x + 8 * s, y - 24 * s, 12 * s, 14 * s, 2, '#e8e8e0', INK, 1.5);
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 10 * s, y - 20 * s); ctx.lineTo(x + 18 * s, y - 20 * s); ctx.stroke();
  }
  drawZombieExtras(z, t, x, y, s, wob);
  const eyeCol = z.enraged ? '#e02a1a' : '#1a1a1a';
  circ(x - 4 * s + wob * 0.3, y - 38 * s, 2.4 * s, '#fff');
  circ(x + 5 * s + wob * 0.3, y - 38 * s, 2.4 * s, '#fff');
  ctx.fillStyle = eyeCol;
  ctx.beginPath(); ctx.arc(x - 4 * s + wob * 0.3, y - 38 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 5 * s + wob * 0.3, y - 38 * s, 1.4 * s, 0, Math.PI * 2); ctx.fill();
  if (z.enraged) {
    ctx.strokeStyle = '#7a1010'; ctx.lineWidth = 1.8 * s;
    ctx.beginPath(); ctx.moveTo(x - 7 * s + wob * 0.3, y - 43 * s); ctx.lineTo(x - 1 * s + wob * 0.3, y - 40 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 8 * s + wob * 0.3, y - 43 * s); ctx.lineTo(x + 2 * s + wob * 0.3, y - 40 * s); ctx.stroke();
  }
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
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 22 * s, y - 60 * s, 44 * s, 6);
    if (z.armorMax > 0) {
      ctx.fillStyle = '#c8c8d8';
      ctx.fillRect(x - 21 * s, y - 59 * s, 42 * s * clamp(z.armor / z.armorMax, 0, 1), 4);
    }
    ctx.fillStyle = '#e0483e';
    const bodyMax = z.maxHp - z.armorMax;
    ctx.fillRect(x - 21 * s, y - 59 * s, 42 * s * clamp(z.hp / bodyMax, 0, 1), 4);
  }
  ctx.restore();
}

function drawMower(m, ri) {
  if (m.used) return;
  const y = rowY(ri);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(m.x, y + 10, 23, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#7a1f16'; ctx.lineWidth = 4.5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(m.x + 12, y - 14); ctx.lineTo(m.x + 27, y - 31); ctx.stroke();
  box(m.x - 18, y - 22, 38, 22, 5, '#c23b2e', INK, 2.5);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(m.x - 14, y - 19, 12, 5);
  box(m.x - 6, y - 33, 15, 13, 3, '#7a1f16', INK, 2);
  circ(m.x - 10, y - 1, 6.5, '#222', INK, 2);
  circ(m.x + 11, y - 1, 6.5, '#222', INK, 2);
  ctx.fillStyle = '#555';
  ctx.beginPath(); ctx.arc(m.x - 10, y - 1, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(m.x + 11, y - 1, 2, 0, Math.PI * 2); ctx.fill();
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
    const g = ctx.createRadialGradient(pr.x - 2, pr.y - 2, 1, pr.x, pr.y, 7);
    g.addColorStop(0, pr.slow ? '#fff' : '#b8f09a');
    g.addColorStop(1, pr.slow ? '#7fc8f0' : '#3fae4a');
    circ(pr.x, pr.y, 6.5, g, INK, 1.5);
  } else {
    const prog = clamp((pr.x - pr.x0) / Math.max(1, pr.tx - pr.x0), 0, 1);
    const yy = pr.y - Math.sin(Math.PI * prog) * 100;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.ellipse(pr.x, pr.y + 14, 10, 4, 0, 0, Math.PI * 2); ctx.fill();
    circ(pr.x, yy, 14, '#4da83e', INK, 2.5);
    ctx.strokeStyle = '#2e6b26'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(pr.x, yy, 14, -0.7, 0.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(pr.x, yy, 14, Math.PI - 0.7, Math.PI + 0.7); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.ellipse(pr.x - 5, yy - 6, 5, 3, -0.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBossBar() {
  const boss = G.zombies.find(function (z) { return !z.dead && z.type === 'boss'; });
  if (!boss) return;
  const bw = 420, bx = LAWN_X + LAWN_W / 2 - bw / 2, by = LAWN_Y + 10;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(bx - 8 + 3, by - 8 + 3, bw + 16, 36, 10);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  rr(bx - 8, by - 8, bw + 16, 36, 10);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#5a1010';
  rr(bx, by, bw, 16, 8);
  ctx.fill();
  const fg = ctx.createLinearGradient(0, by, 0, by + 16);
  fg.addColorStop(0, '#ff6a5a');
  fg.addColorStop(1, '#c82a1a');
  ctx.fillStyle = fg;
  rr(bx + 2, by + 2, (bw - 4) * clamp(boss.hp / boss.maxHp, 0, 1), 12, 6);
  ctx.fill();
  txt('YARD BOSS', bx + bw / 2, by + 9, 'bold 13px ' + FONT, '#ffd8d0', 'center', 'middle');
}

function drawLawnTiles(night) {
  const pool = G.level && G.level.biome === 'pool';
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const px = LAWN_X + c * CELL_W, py = LAWN_Y + r * CELL_H;
      if (pool && terrain(r, c) === 'water') {
        const wg = ctx.createLinearGradient(0, py, 0, py + CELL_H);
        if (night) { wg.addColorStop(0, '#1f4266'); wg.addColorStop(1, '#163452'); }
        else { wg.addColorStop(0, '#54b4e8'); wg.addColorStop(1, '#3a8ec8'); }
        ctx.fillStyle = wg;
        ctx.fillRect(px, py, CELL_W, CELL_H);
        ctx.strokeStyle = night ? 'rgba(180,220,255,0.3)' : 'rgba(255,255,255,0.4)';
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
        const stripe = ctx.createLinearGradient(px, py, px, py + CELL_H);
        if (r % 2 === 0) { stripe.addColorStop(0, 'rgba(255,255,255,0.10)'); stripe.addColorStop(1, 'rgba(255,255,255,0)'); }
        else { stripe.addColorStop(0, 'rgba(0,0,0,0)'); stripe.addColorStop(1, 'rgba(0,0,0,0.08)'); }
        ctx.fillStyle = stripe;
        ctx.fillRect(px, py, CELL_W, CELL_H);
        const h = (r * 9 + c) * 2654435761 % 100 / 100;
        if (h < 0.3 && terrain(r, c) === 'grass') {
          const fx = px + 12 + h * 200 % (CELL_W - 24);
          const fy = py + CELL_H - 12 - (h * 37 % 10);
          ctx.strokeStyle = night ? '#3a6a4a' : '#4a9a3a';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx - 2, fy - 6); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + 2, fy - 7); ctx.stroke();
          if (h < 0.12) circ(fx + 4, fy - 8, 2.5, h < 0.06 ? '#ffd23f' : '#ff8ac2');
        }
      }
    }
  }
}

function drawHouse(night) {
  ctx.fillStyle = night ? '#4a3826' : '#8a5a33';
  ctx.fillRect(0, LAWN_Y, LAWN_X, LAWN_H);
  ctx.fillStyle = night ? '#8a6f4d' : '#c9a06a';
  ctx.fillRect(14, LAWN_Y + 50, 70, LAWN_H - 100);
  ctx.strokeStyle = 'rgba(90,58,30,0.5)';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 10; i++) {
    ctx.beginPath();
    ctx.moveTo(14, LAWN_Y + 50 + i * ((LAWN_H - 100) / 10));
    ctx.lineTo(84, LAWN_Y + 50 + i * ((LAWN_H - 100) / 10));
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(14, LAWN_Y + 50, 70, LAWN_H - 100);
  ctx.fillStyle = night ? '#5a2a3a' : '#a33b2a';
  ctx.beginPath();
  ctx.moveTo(6, LAWN_Y + 56);
  ctx.lineTo(49, LAWN_Y + 6);
  ctx.lineTo(92, LAWN_Y + 56);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 1.5;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(6 + i * 8.5, LAWN_Y + 56 - i * 2);
    ctx.lineTo(49, LAWN_Y + 6 + i * 12.5);
    ctx.stroke();
  }
  box(66, LAWN_Y + 18, 12, 16, 2, '#7a4a3a', INK, 2);
  ctx.fillStyle = '#5a3a1e';
  ctx.fillRect(38, LAWN_Y + LAWN_H - 122, 24, 72);
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(38, LAWN_Y + LAWN_H - 122, 24, 72);
  circ(56, LAWN_Y + LAWN_H - 82, 2, '#ffd23f', INK, 1);
  const win = night ? '#9ab8d8' : '#aee2ff';
  box(22, LAWN_Y + 70, 20, 20, 2, win, INK, 2);
  box(58, LAWN_Y + 70, 20, 20, 2, win, INK, 2);
  ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(32, LAWN_Y + 70); ctx.lineTo(32, LAWN_Y + 90); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(22, LAWN_Y + 80); ctx.lineTo(42, LAWN_Y + 80); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(68, LAWN_Y + 70); ctx.lineTo(68, LAWN_Y + 90); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(58, LAWN_Y + 80); ctx.lineTo(78, LAWN_Y + 80); ctx.stroke();
  ctx.fillStyle = '#6a4a2a';
  ctx.fillRect(30, LAWN_Y + LAWN_H - 128, 40, 6);
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
      const sy = 174 + (i * 137) % 6;
      ctx.fillStyle = 'rgba(255,255,255,' + (0.3 + (i % 5) * 0.14) + ')';
      ctx.fillRect(sx, sy, 2, 2);
    }
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 4; i++) {
      const cx = ((G.time * 12 + i * 340) % (W + 200)) - 100;
      const cy = 174 + (i % 2) * 5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 34, 10, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 24, cy + 3, 24, 8, 0, 0, Math.PI * 2);
      ctx.ellipse(cx - 24, cy + 4, 22, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  drawLawnTiles(night);
  ctx.strokeStyle = '#5a3a1e';
  ctx.lineWidth = 7;
  ctx.strokeRect(LAWN_X - 4, LAWN_Y - 4, LAWN_W + 8, LAWN_H + 8);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(LAWN_X - 1, LAWN_Y - 1, LAWN_W + 2, LAWN_H + 2);
  const dirt = ctx.createLinearGradient(RIGHT_X, 0, W, 0);
  if (night) { dirt.addColorStop(0, '#2a2118'); dirt.addColorStop(1, '#171008'); }
  else { dirt.addColorStop(0, '#9a7a4a'); dirt.addColorStop(1, '#6e5230'); }
  ctx.fillStyle = dirt;
  ctx.fillRect(RIGHT_X, LAWN_Y, W - RIGHT_X, LAWN_H);
  ctx.fillStyle = night ? 'rgba(0,0,0,0.25)' : 'rgba(60,40,16,0.2)';
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.ellipse(RIGHT_X + 30 + (i * 67) % (W - RIGHT_X - 40), LAWN_Y + 40 + (i * 167) % (LAWN_H - 80), 18 + (i % 3) * 8, 8 + (i % 2) * 4, i, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#6e4520';
  for (let i = 0; i <= LAWN_H / 52; i++) {
    box(RIGHT_X - 5, LAWN_Y + i * 52, 12, 36, 3, '#7a5228', INK, 2);
  }
  box(RIGHT_X - 7, LAWN_Y + 16, 16, 6, 2, '#8a6234', INK, 1.5);
  box(RIGHT_X - 7, LAWN_Y + LAWN_H - 42, 16, 6, 2, '#8a6234', INK, 1.5);
  drawHouse(night);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(LAWN_X - 4, LAWN_Y, 4, LAWN_H);

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
      ctx.fillStyle = ok ? 'rgba(255,255,255,0.35)' : 'rgba(255,60,60,0.3)';
      ctx.fillRect(LAWN_X + cell.col * CELL_W, LAWN_Y + cell.row * CELL_H, CELL_W, CELL_H);
      ctx.strokeStyle = ok ? '#fff' : '#e0483e';
      ctx.lineWidth = 2.5;
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
    ctx.lineWidth = 6;
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
    txt(f.text, f.x, f.y, 'bold 15px ' + FONT, f.color, 'center', 'middle');
  }
  ctx.globalAlpha = 1;

  const fog = ctx.createLinearGradient(RIGHT_X + 30, 0, W, 0);
  fog.addColorStop(0, 'rgba(10,20,8,0)');
  fog.addColorStop(1, night ? 'rgba(4,8,16,0.8)' : 'rgba(22,32,12,0.7)');
  ctx.fillStyle = fog;
  ctx.fillRect(RIGHT_X + 30, LAWN_Y, W - RIGHT_X - 30, LAWN_H);

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
    const fs = big ? 54 : 34;
    const tw = ctx.measureText(G.banner).width;
    ctx.font = 'bold ' + fs + 'px ' + FONT;
    const bw2 = tw + 56, bh2 = big ? 84 : 58;
    const bx2 = W / 2 - bw2 / 2, by2 = LAWN_Y + 120;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    rr(bx2 + 4, by2 + 5, bw2, bh2, 14);
    ctx.fill();
    ctx.fillStyle = big ? 'rgba(140,16,16,0.88)' : 'rgba(20,16,8,0.82)';
    rr(bx2, by2, bw2, bh2, 14);
    ctx.fill();
    ctx.strokeStyle = big ? '#ffd8d0' : '#c8860a';
    ctx.lineWidth = 3;
    ctx.stroke();
    txt(G.banner, W / 2, by2 + bh2 / 2 + 1, 'bold ' + fs + 'px ' + FONT, big ? '#ffd8d0' : '#ffe9a8', 'center', 'middle');
    ctx.globalAlpha = 1;
  }
  if (G.message && G.messageT > 0) {
    ctx.font = 'bold 18px ' + FONT;
    const tw = ctx.measureText(G.message).width;
    const bx = LAWN_X + LAWN_W / 2 - tw / 2 - 16, by = LAWN_Y + LAWN_H - 48;
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    rr(bx, by, tw + 32, 32, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,233,168,0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    txt(G.message, LAWN_X + LAWN_W / 2, by + 17, 'bold 18px ' + FONT, '#ffe9a8', 'center', 'middle');
  }
}
function drawCoinIcon(x, y, r) {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
  g.addColorStop(0, '#ffe98a');
  g.addColorStop(1, '#e0a020');
  circ(x, y, r, g, '#a06a00', 2);
  ctx.strokeStyle = '#a06a00';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, Math.PI * 2); ctx.stroke();
  txt('C', x, y + 1, 'bold ' + Math.round(r * 1.2) + 'px ' + FONT, '#a06a00', 'center', 'middle', false);
}

function drawZombieExtras(z, t, x, y, s, wob) {
  const hx = x + wob * 0.3;
  if (z.type === 'shambler') {
    ctx.strokeStyle = '#4a3a28'; ctx.lineWidth = 2.5 * s; ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(hx + i * 5 * s, y - 47 * s); ctx.lineTo(hx + i * 7 * s, y - 54 * s); ctx.stroke();
    }
  }
  if (t.sweatband) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(hx - 12 * s, y - 45 * s, 24 * s, 5 * s);
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.strokeRect(hx - 12 * s, y - 45 * s, 24 * s, 5 * s);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 30 * s, y - 30 * s); ctx.lineTo(x - 44 * s, y - 33 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 30 * s, y - 22 * s); ctx.lineTo(x - 46 * s, y - 22 * s); ctx.stroke();
  }
  if (t.headband) {
    ctx.fillStyle = '#e0483e';
    ctx.fillRect(hx - 12 * s, y - 44 * s, 24 * s, 4 * s);
    ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(hx - 12 * s, y - 44 * s, 24 * s, 4 * s);
  }
  if (t.howl && !z.eating) {
    ctx.fillStyle = '#5a1220';
    ctx.beginPath(); ctx.ellipse(hx, y - 27 * s, 5 * s, 6 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (t.pads) {
    ctx.fillStyle = '#3a4a6a';
    ctx.beginPath(); ctx.arc(x - 16 * s, y - 28 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 16 * s, y - 28 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5 * s; ctx.stroke();
  }
  if (t.crown) {
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(hx - 10 * s, y - 47 * s);
    ctx.lineTo(hx - 10 * s, y - 58 * s);
    ctx.lineTo(hx - 5 * s, y - 52 * s);
    ctx.lineTo(hx, y - 61 * s);
    ctx.lineTo(hx + 5 * s, y - 52 * s);
    ctx.lineTo(hx + 10 * s, y - 58 * s);
    ctx.lineTo(hx + 10 * s, y - 47 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c8860a'; ctx.lineWidth = 1.5 * s; ctx.stroke();
  }
  if (t.club) {
    ctx.strokeStyle = '#7a5a34'; ctx.lineWidth = 5 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 14 * s, y - 16 * s); ctx.lineTo(x + 30 * s, y - 44 * s); ctx.stroke();
    ctx.fillStyle = '#8a6a42';
    ctx.beginPath(); ctx.arc(x + 32 * s, y - 48 * s, 7 * s, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5 * s; ctx.stroke();
    ctx.fillStyle = '#555';
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2;
      ctx.beginPath(); ctx.arc(x + 32 * s + Math.cos(a) * 7 * s, y - 48 * s + Math.sin(a) * 7 * s, 2 * s, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (t.horns) {
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.moveTo(hx - 10 * s, y - 46 * s);
    ctx.lineTo(hx - 16 * s, y - 56 * s);
    ctx.lineTo(hx - 5 * s, y - 49 * s);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx + 10 * s, y - 46 * s);
    ctx.lineTo(hx + 16 * s, y - 56 * s);
    ctx.lineTo(hx + 5 * s, y - 49 * s);
    ctx.closePath(); ctx.fill();
  }
  if (t.fork) {
    ctx.strokeStyle = '#9a9a9a'; ctx.lineWidth = 2.5 * s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 12 * s, y - 10 * s); ctx.lineTo(x + 22 * s, y - 40 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 18 * s, y - 45 * s); ctx.lineTo(x + 26 * s, y - 45 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 20 * s, y - 49 * s); ctx.lineTo(x + 24 * s, y - 41 * s); ctx.stroke();
  }
  if (t.beak) {
    ctx.fillStyle = '#f5b81e';
    ctx.beginPath();
    ctx.moveTo(hx - 4 * s, y - 32 * s);
    ctx.lineTo(hx + 10 * s, y - 30 * s);
    ctx.lineTo(hx - 4 * s, y - 27 * s);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#c8860a'; ctx.lineWidth = 1 * s; ctx.stroke();
  }
  if (t.boss) {
    ctx.strokeStyle = '#7a1010'; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.moveTo(hx - 8 * s, y - 44 * s); ctx.lineTo(hx - 1 * s, y - 40 * s); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(hx + 8 * s, y - 44 * s); ctx.lineTo(hx + 1 * s, y - 40 * s); ctx.stroke();
  }
}

function drawPlantAccent(p, x, y, def, sway) {
  if (p.type === 'spitter') {
    ctx.fillStyle = def.leaf;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(x + i * 5, y - 17 - Math.abs(i) * 2, 4, 7, i * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (p.type === 'puff') {
    ctx.fillStyle = 'rgba(255,150,170,0.7)';
    ctx.beginPath(); ctx.arc(x - 12, y + 2, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 4, y + 3, 3.5, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'doublespitter') {
    ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x - 13, y - 15); ctx.lineTo(x - 4, y - 11); ctx.stroke();
  } else if (p.type === 'fern') {
    ctx.fillStyle = '#dff3ff';
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 8, y + 13);
      ctx.lineTo(x + i * 8 - 2, y + 20);
      ctx.lineTo(x + i * 8 + 2, y + 20);
      ctx.closePath(); ctx.fill();
    }
  } else if (p.type === 'melonlob') {
    ctx.strokeStyle = def.dark; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 2, y - 24); ctx.quadraticCurveTo(x + 8, y - 34, x + 14, y - 26); ctx.stroke();
    ctx.fillStyle = def.leaf;
    ctx.beginPath(); ctx.ellipse(x + 14, y - 26, 5, 2.5, 0.4, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'acorn') {
    ctx.strokeStyle = def.dark; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x - 16, y + 12); ctx.lineTo(x + 16, y + 12); ctx.stroke();
  } else if (p.type === 'thistle') {
    ctx.fillStyle = '#d8b8ff';
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * 5, y + 8 + Math.sin(a) * 5, 4, 2, a, 0, Math.PI * 2); ctx.fill();
    }
  } else if (p.type === 'blastcap') {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + 2, y - 2); ctx.lineTo(x + 9, y + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 9, y - 2); ctx.lineTo(x + 2, y + 5); ctx.stroke();
  } else if (p.type === 'blover') {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x - 26, y - 4, 8, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - 35, y - 4, 12, Math.PI * 0.6, Math.PI * 1.4); ctx.stroke();
  } else if (p.type === 'onion') {
    ctx.fillStyle = 'rgba(160,200,255,0.9)';
    ctx.beginPath(); ctx.ellipse(x + 12, y + 8, 2.5, 4, 0.3, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'gnasher') {
    ctx.fillStyle = def.dark;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(x + i * 7 - 3, y - 26);
      ctx.lineTo(x + i * 7 + 3, y - 26);
      ctx.lineTo(x + i * 7, y - 33);
      ctx.closePath(); ctx.fill();
    }
  } else if (p.type === 'splitspitter') {
    ctx.fillStyle = '#e0483e';
    ctx.beginPath();
    ctx.moveTo(x - 2, y - 18); ctx.lineTo(x + 6, y - 18); ctx.lineTo(x + 2, y - 25);
    ctx.closePath(); ctx.fill();
  } else if (p.type === 'reed') {
    ctx.fillStyle = '#7a4a2a';
    ctx.beginPath(); ctx.ellipse(x + 2, y - 18, 4, 9, 0.1, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'sunbloom') {
    ctx.fillStyle = '#c8860a';
    ctx.beginPath(); ctx.arc(x - 2, y + 3, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 3, y + 5, 1.2, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'sunshroom' && p.grown) {
    ctx.fillStyle = def.leaf;
    ctx.beginPath(); ctx.ellipse(x - 10, y - 14, 7, 3, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x + 10, y - 12, 7, 3, 0.6, 0, Math.PI * 2); ctx.fill();
  } else if (p.type === 'tubertrap' && p.armed) {
    ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 8, y - 6); ctx.lineTo(x - 2, y - 3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 9, y - 6); ctx.lineTo(x + 3, y - 3); ctx.stroke();
  }
}
