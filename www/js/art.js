// Procedural vector art for Bloomguard. Every character is an original design drawn in code,
// so the game ships with no third-party image assets.

const TAU = Math.PI * 2;

function eyes(ctx, x, y, gap, r, look = 0.4, blink = false) {
  for (const s of [-1, 1]) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    if (blink) ctx.ellipse(x + s * gap, y, r, r * 0.15, 0, 0, TAU);
    else ctx.arc(x + s * gap, y, r, 0, TAU);
    ctx.fill();
    if (!blink) {
      ctx.fillStyle = '#1d1a2b';
      ctx.beginPath();
      ctx.arc(x + s * gap + r * look, y + r * 0.1, r * 0.55, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x + s * gap + r * look + r * 0.2, y - r * 0.2, r * 0.18, 0, TAU);
      ctx.fill();
    }
  }
}

function shadow(ctx, x, y, w) {
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(x, y, w, w * 0.28, 0, 0, TAU);
  ctx.fill();
}

function leaf(ctx, x, y, len, w, ang, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, -w, len, 0);
  ctx.quadraticCurveTo(len * 0.5, w, 0, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(len * 0.9, 0);
  ctx.stroke();
  ctx.restore();
}

function stars(ctx, x, y, level) {
  for (let i = 1; i < level; i++) {
    const sx = x - (level - 2) * 7 + (i - 1) * 14;
    ctx.fillStyle = '#ffe14d';
    ctx.strokeStyle = '#a86f00';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const r = k % 2 ? 3 : 7;
      const a = -Math.PI / 2 + (k * Math.PI) / 5;
      ctx.lineTo(sx + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// s = tile size in px; (x, y) = bottom-centre of the tile.
export function drawGuardian(ctx, type, x, y, s, t, o = {}) {
  const bob = Math.sin(t * 3 + (o.seed || 0)) * s * 0.02;
  const blink = (t + (o.seed || 0)) % 4 < 0.12;
  const sq = o.fire ? 1 - o.fire * 0.12 : 1;
  ctx.save();
  if (o.hurt) ctx.filter = 'brightness(1.8)';
  shadow(ctx, x, y - s * 0.05, s * 0.32);
  switch (type) {
    case 'glowcap': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2.5 + (o.seed || 0));
      ctx.fillStyle = '#f3e6c8';
      ctx.beginPath();
      ctx.roundRect(x - s * 0.12, y - s * 0.45 + bob, s * 0.24, s * 0.4, s * 0.08);
      ctx.fill();
      ctx.shadowColor = '#ffd84a';
      ctx.shadowBlur = 10 + pulse * 18;
      ctx.fillStyle = '#ffbf3a';
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.48 + bob, s * 0.36, s * 0.24, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(255,255,200,${0.6 + pulse * 0.4})`;
      for (const [dx, dy, r] of [[-0.18, -0.6, 0.06], [0.05, -0.66, 0.07], [0.2, -0.55, 0.05], [-0.04, -0.54, 0.04]]) {
        ctx.beginPath();
        ctx.arc(x + dx * s, y + dy * s + bob, r * s, 0, TAU);
        ctx.fill();
      }
      eyes(ctx, x, y - s * 0.3 + bob, s * 0.06, s * 0.045, 0.3, blink);
      break;
    }
    case 'thornling': {
      leaf(ctx, x - s * 0.05, y - s * 0.12, s * 0.28, s * 0.08, Math.PI + 0.5, '#4f9e3d');
      leaf(ctx, x + s * 0.05, y - s * 0.12, s * 0.28, s * 0.08, -0.5, '#4f9e3d');
      ctx.fillStyle = '#6fcf5a';
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.38 + bob, s * 0.24 * sq, s * 0.27 / sq, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#e9ffd8';
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI * 0.95 + (i / 8) * Math.PI * 0.9;
        const bx = x + Math.cos(a) * s * 0.24, by = y - s * 0.38 + bob + Math.sin(a) * s * 0.27;
        ctx.beginPath();
        ctx.moveTo(bx - Math.sin(a) * 4, by + Math.cos(a) * 4);
        ctx.lineTo(bx + Math.cos(a) * s * 0.08, by + Math.sin(a) * s * 0.08);
        ctx.lineTo(bx + Math.sin(a) * 4, by - Math.cos(a) * 4);
        ctx.fill();
      }
      eyes(ctx, x + s * 0.04, y - s * 0.42 + bob, s * 0.07, s * 0.055, 0.5, blink);
      ctx.fillStyle = '#2b5a20';
      ctx.beginPath();
      ctx.arc(x + s * 0.12, y - s * 0.3 + bob, s * 0.035 * (1 + (o.fire || 0)), 0, TAU);
      ctx.fill();
      break;
    }
    case 'barkwall': {
      const dmg = o.hpFrac !== undefined ? o.hpFrac : 1;
      ctx.fillStyle = '#8a5a2e';
      ctx.beginPath();
      ctx.roundRect(x - s * 0.3, y - s * 0.7, s * 0.6, s * 0.66, s * 0.1);
      ctx.fill();
      ctx.fillStyle = '#d9b07a';
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.7, s * 0.3, s * 0.08, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#a77d4c';
      ctx.lineWidth = 2;
      for (const r of [0.2, 0.12, 0.05]) {
        ctx.beginPath();
        ctx.ellipse(x, y - s * 0.7, s * r, s * r * 0.27, 0, 0, TAU);
        ctx.stroke();
      }
      ctx.strokeStyle = '#6b4220';
      ctx.lineWidth = 2;
      for (const dx of [-0.2, -0.05, 0.15]) {
        ctx.beginPath();
        ctx.moveTo(x + dx * s, y - s * 0.6);
        ctx.lineTo(x + dx * s + 3, y - s * 0.1);
        ctx.stroke();
      }
      if (dmg < 0.66) {
        ctx.strokeStyle = '#3d220c';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x + s * 0.1, y - s * 0.68);
        ctx.lineTo(x, y - s * 0.5);
        ctx.lineTo(x + s * 0.08, y - s * 0.38);
        ctx.stroke();
      }
      if (dmg < 0.33) {
        ctx.beginPath();
        ctx.moveTo(x - s * 0.28, y - s * 0.3);
        ctx.lineTo(x - s * 0.12, y - s * 0.24);
        ctx.lineTo(x - s * 0.18, y - s * 0.1);
        ctx.stroke();
      }
      eyes(ctx, x, y - s * 0.45, s * 0.09, s * 0.06, 0.4, blink || dmg < 0.33);
      ctx.strokeStyle = '#3d220c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y - s * 0.28, s * 0.06, dmg < 0.5 ? Math.PI * 1.15 : 0.2, dmg < 0.5 ? Math.PI * 1.85 : Math.PI - 0.2);
      ctx.stroke();
      break;
    }
    case 'puffball': {
      const armed = o.armed;
      const k = armed ? 1 + Math.sin(t * 6) * 0.04 : 0.6;
      ctx.fillStyle = armed ? '#c58df0' : '#9b7bb0';
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.2 * k, s * 0.26 * k, s * 0.2 * k, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (const [dx, dy] of [[-0.1, -0.28], [0.08, -0.32], [0.14, -0.2], [-0.15, -0.16]]) {
        ctx.beginPath();
        ctx.arc(x + dx * s * k, y + dy * s * k, s * 0.03, 0, TAU);
        ctx.fill();
      }
      if (armed) eyes(ctx, x, y - s * 0.22, s * 0.06, s * 0.04, 0.5, blink);
      else {
        ctx.strokeStyle = '#4b3560';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - s * 0.08, y - s * 0.14);
        ctx.lineTo(x - s * 0.02, y - s * 0.14);
        ctx.moveTo(x + s * 0.02, y - s * 0.14);
        ctx.lineTo(x + s * 0.08, y - s * 0.14);
        ctx.stroke();
      }
      break;
    }
    case 'frostbell': {
      ctx.strokeStyle = '#3f8f6a';
      ctx.lineWidth = s * 0.04;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.05);
      ctx.quadraticCurveTo(x - s * 0.15, y - s * 0.5, x + s * 0.02, y - s * 0.78 + bob);
      ctx.stroke();
      leaf(ctx, x - s * 0.05, y - s * 0.18, s * 0.22, s * 0.07, Math.PI + 0.3, '#57b083');
      const bx = x + s * 0.06, by = y - s * 0.62 + bob;
      ctx.fillStyle = '#9fe6ff';
      ctx.beginPath();
      ctx.moveTo(bx - s * 0.08, by - s * 0.14);
      ctx.quadraticCurveTo(bx - s * 0.12, by + s * 0.05, bx - s * 0.26 * sq, by + s * 0.2);
      ctx.lineTo(bx + s * 0.26 * sq, by + s * 0.2);
      ctx.quadraticCurveTo(bx + s * 0.12, by + s * 0.05, bx + s * 0.08, by - s * 0.14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e8fbff';
      ctx.beginPath();
      ctx.arc(bx, by + s * 0.22, s * 0.05, 0, TAU);
      ctx.fill();
      eyes(ctx, bx, by + s * 0.02, s * 0.06, s * 0.04, 0.5, blink);
      break;
    }
    case 'mossmender': {
      const pulse = 0.5 + 0.5 * Math.sin(t * 2);
      ctx.fillStyle = `rgba(120,255,190,${0.12 + pulse * 0.12})`;
      ctx.beginPath();
      ctx.arc(x, y - s * 0.3, s * (0.42 + pulse * 0.05), 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3ea57a';
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU;
        const r = s * (i % 2 ? 0.26 : 0.3);
        ctx.lineTo(x + Math.cos(a) * r, y - s * 0.3 + bob + Math.sin(a) * r * 0.85);
      }
      ctx.fill();
      ctx.fillStyle = '#7ff0c0';
      ctx.beginPath();
      ctx.arc(x, y - s * 0.3 + bob, s * 0.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - s * 0.02, y - s * 0.56 + bob, s * 0.04, s * 0.1);
      ctx.fillRect(x - s * 0.05, y - s * 0.53 + bob, s * 0.1, s * 0.04);
      eyes(ctx, x, y - s * 0.32 + bob, s * 0.07, s * 0.045, 0.2, blink);
      break;
    }
    case 'lanceleaf': {
      for (const [a, c] of [[-1.9, '#8fc23f'], [-1.25, '#b5e655'], [-1.55, '#a2d84a']]) {
        leaf(ctx, x, y - s * 0.08, s * 0.6, s * 0.08, a + bob * 0.01, c);
      }
      ctx.fillStyle = '#7aa832';
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.2, s * 0.17, s * 0.15, 0, 0, TAU);
      ctx.fill();
      eyes(ctx, x + s * 0.03, y - s * 0.22, s * 0.06, s * 0.045, 0.5, blink);
      break;
    }
    case 'stormseed': {
      const zap = Math.sin(t * 20) > 0.6;
      ctx.fillStyle = '#665c2c';
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.28 + bob, s * 0.2, s * 0.26, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ffe95c';
      ctx.beginPath();
      ctx.moveTo(x + s * 0.02, y - s * 0.5 + bob);
      ctx.lineTo(x - s * 0.08, y - s * 0.28 + bob);
      ctx.lineTo(x + s * 0.01, y - s * 0.28 + bob);
      ctx.lineTo(x - s * 0.04, y - s * 0.08 + bob);
      ctx.lineTo(x + s * 0.1, y - s * 0.34 + bob);
      ctx.lineTo(x + s * 0.02, y - s * 0.34 + bob);
      ctx.closePath();
      ctx.fill();
      if (zap) {
        ctx.strokeStyle = '#fff6a8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - s * 0.22, y - s * 0.5);
        ctx.lineTo(x - s * 0.3, y - s * 0.6);
        ctx.moveTo(x + s * 0.22, y - s * 0.48);
        ctx.lineTo(x + s * 0.32, y - s * 0.56);
        ctx.stroke();
      }
      break;
    }
    case 'emberroot': {
      ctx.fillStyle = '#7a3b1f';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.3, y - s * 0.02);
      ctx.quadraticCurveTo(x - s * 0.1, y - s * 0.12, x - s * 0.05, y - s * 0.35);
      ctx.lineTo(x + s * 0.05, y - s * 0.35);
      ctx.quadraticCurveTo(x + s * 0.1, y - s * 0.12, x + s * 0.3, y - s * 0.02);
      ctx.fill();
      const fl = Math.sin(t * 9) * s * 0.02;
      ctx.fillStyle = '#ff6a2a';
      ctx.beginPath();
      ctx.moveTo(x - s * 0.18, y - s * 0.35);
      ctx.quadraticCurveTo(x - s * 0.2, y - s * 0.7 + fl, x, y - s * 0.82 - fl);
      ctx.quadraticCurveTo(x + s * 0.2, y - s * 0.7 + fl, x + s * 0.18, y - s * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd25a';
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.48, s * 0.1, s * 0.15 + fl, 0, 0, TAU);
      ctx.fill();
      eyes(ctx, x, y - s * 0.42, s * 0.06, s * 0.04, 0.4, blink);
      break;
    }
    case 'twinbud': {
      ctx.strokeStyle = '#3f8f3a';
      ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.05);
      ctx.lineTo(x, y - s * 0.3);
      ctx.moveTo(x, y - s * 0.3);
      ctx.lineTo(x - s * 0.15, y - s * 0.5);
      ctx.moveTo(x, y - s * 0.3);
      ctx.lineTo(x + s * 0.15, y - s * 0.5);
      ctx.stroke();
      for (const dx of [-0.15, 0.15]) {
        const bx = x + dx * s, by = y - s * 0.55 + bob * (dx > 0 ? 1 : -1);
        ctx.fillStyle = '#ff7eb6';
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU + t * 0.5;
          ctx.beginPath();
          ctx.ellipse(bx + Math.cos(a) * s * 0.09, by + Math.sin(a) * s * 0.09, s * 0.07, s * 0.045, a, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#ffd6e8';
        ctx.beginPath();
        ctx.arc(bx, by, s * 0.08, 0, TAU);
        ctx.fill();
        eyes(ctx, bx, by, s * 0.035, s * 0.025, 0.5, blink);
      }
      break;
    }
  }
  ctx.restore();
  if (o.level > 1) stars(ctx, x, y - s * 0.02, o.level);
}

// Rotlings are blobby blight creatures. `e` is the live entity.
export function drawRotling(ctx, e, s, t) {
  const x = e.x, y = e.y;
  const wob = Math.sin(t * (e.eating ? 14 : 6) + e.seed) * 0.06;
  const scale = e.def.boss ? 1.9 : e.def.big ? 1.35 : 1;
  const r = s * 0.27 * scale;
  ctx.save();
  if (e.hurt > 0) ctx.filter = 'brightness(2)';
  if (e.burrowed) {
    ctx.fillStyle = '#5a3d22';
    ctx.beginPath();
    ctx.ellipse(x, y - 4, s * 0.25, s * 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#7a5532';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x - s * 0.15 + i * s * 0.1, y - 8 - Math.abs(Math.sin(t * 8 + i)) * 6, 4, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  const flyY = e.def.flying ? -s * 0.35 + Math.sin(t * 4 + e.seed) * 6 : 0;
  shadow(ctx, x, y - s * 0.05, r * (e.def.flying ? 0.6 : 1));
  const cy = y - r + flyY;
  let body = e.def.color;
  if (e.slow > 0) body = '#8fb7e0';
  if (e.def.flying) {
    const flap = Math.sin(t * 22 + e.seed);
    ctx.fillStyle = 'rgba(200,190,255,0.8)';
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x + sgn * r * 0.2, cy - r * 0.6, r * 0.9, r * 0.35 * (0.4 + Math.abs(flap)), sgn * 0.6, 0, TAU);
      ctx.fill();
    }
  }
  // body
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(x, cy, r * (1 + wob), r * (1 - wob), 0, 0, TAU);
  ctx.fill();
  // drips
  ctx.fillStyle = 'rgba(40,20,50,0.35)';
  for (let i = 0; i < 3; i++) {
    const dx = (i - 1) * r * 0.5;
    ctx.beginPath();
    ctx.ellipse(x + dx, cy + r * 0.75, r * 0.12, r * 0.25 + Math.sin(t * 3 + i + e.seed) * 2, 0, 0, TAU);
    ctx.fill();
  }
  // spots
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.arc(x + r * 0.3, cy - r * 0.4, r * 0.2, 0, TAU);
  ctx.arc(x + r * 0.55, cy + r * 0.1, r * 0.1, 0, TAU);
  ctx.fill();
  if (e.shell > 0) {
    ctx.fillStyle = '#8f9c6c';
    ctx.strokeStyle = '#4d573a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(x + r * 0.2, cy - r * 0.2, r * 0.95, r * 0.8, 0, Math.PI * 0.9, Math.PI * 2.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - r * 0.3, cy - r * 0.9);
    ctx.lineTo(x + r * 0.1, cy - r * 0.1);
    ctx.moveTo(x + r * 0.5, cy - r * 0.95);
    ctx.lineTo(x + r * 0.5, cy - r * 0.1);
    ctx.stroke();
    if (e.shell < e.def.shell * 0.5) {
      ctx.strokeStyle = '#2b301f';
      ctx.beginPath();
      ctx.moveTo(x + r * 0.9, cy - r * 0.5);
      ctx.lineTo(x + r * 0.6, cy - r * 0.3);
      ctx.lineTo(x + r * 0.75, cy - r * 0.1);
      ctx.stroke();
    }
  }
  if (e.def.boss) {
    ctx.fillStyle = '#c9a3ff';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, cy - r * 0.8);
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(x - r * 0.5 + i * r * 0.25 + r * 0.125, cy - r * (i % 2 ? 1.1 : 1.4));
      ctx.lineTo(x - r * 0.5 + (i + 1) * r * 0.25, cy - r * 0.85);
    }
    ctx.closePath();
    ctx.fill();
  }
  if (e.def.big) {
    ctx.fillStyle = '#7f9a52';
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(x - r * 0.6 + i * r * 0.3, cy - r * 0.85, r * 0.18, 0, TAU);
      ctx.fill();
    }
  }
  if (e.def.spawnOnDeath) {
    ctx.fillStyle = '#e3b6f0';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x - r * 0.4 + i * r * 0.27, cy + Math.sin(i * 2) * r * 0.3, r * 0.1, 0, TAU);
      ctx.fill();
    }
  }
  // one big eye looking left + mouth
  const ex = x - r * 0.35, ey = cy - r * 0.15;
  ctx.fillStyle = '#f6f0c8';
  ctx.beginPath();
  ctx.arc(ex, ey, r * 0.3, 0, TAU);
  ctx.fill();
  ctx.fillStyle = e.def.boss ? '#ff3b6b' : '#c62f4a';
  ctx.beginPath();
  ctx.arc(ex - r * 0.1, ey, r * 0.15, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2a1430';
  const open = e.eating ? Math.abs(Math.sin(t * 14)) : 0.2;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.55, cy + r * 0.35, r * 0.2, r * 0.08 + r * 0.15 * open, 0, 0, TAU);
  ctx.fill();
  // little legs
  if (!e.def.flying) {
    ctx.fillStyle = 'rgba(30,15,35,0.6)';
    for (let i = 0; i < 3; i++) {
      const lx = x - r * 0.5 + i * r * 0.5;
      ctx.fillRect(lx, y - s * 0.08 + Math.sin(t * 10 + i * 2 + e.seed) * 2, 4 * scale, s * 0.07);
    }
  }
  ctx.restore();
}

export function drawLantern(ctx, x, y, lit, t) {
  ctx.save();
  ctx.fillStyle = '#4a3a2a';
  ctx.fillRect(x - 2, y - 40, 4, 40);
  ctx.fillStyle = '#2d2418';
  ctx.fillRect(x - 12, y - 64, 24, 6);
  ctx.fillStyle = lit ? `rgba(255,210,90,${0.85 + Math.sin(t * 5) * 0.1})` : '#3a3a3a';
  if (lit) {
    ctx.shadowColor = '#ffcf5a';
    ctx.shadowBlur = 20;
  }
  ctx.beginPath();
  ctx.roundRect(x - 10, y - 58, 20, 20, 4);
  ctx.fill();
  ctx.restore();
}

export function drawGlowMote(ctx, x, y, t, size = 22) {
  ctx.save();
  ctx.shadowColor = '#ffe27a';
  ctx.shadowBlur = 20;
  const g = ctx.createRadialGradient(x, y, 2, x, y, size);
  g.addColorStop(0, '#fffbe0');
  g.addColorStop(0.5, '#ffd84a');
  g.addColorStop(1, 'rgba(255,190,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = t * 2 + (i * Math.PI) / 2;
    ctx.moveTo(x + Math.cos(a) * size * 0.4, y + Math.sin(a) * size * 0.4);
    ctx.lineTo(x + Math.cos(a) * size * 0.8, y + Math.sin(a) * size * 0.8);
  }
  ctx.stroke();
  ctx.restore();
}
