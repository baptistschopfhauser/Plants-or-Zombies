// Bloomguard — animated cutscenes (intro movie, ending + credits). Everything is drawn live in code.
import { WORLDS, ROTLINGS } from './data.js';
import { drawBackdrop, makeDecor, drawPortrait, drawRotling, drawGuardian, tint } from './art.js';

const W = 1280, H = 720;
const TAU = Math.PI * 2;
const ease = (k) => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
const lerp = (a, b, k) => a + (b - a) * k;

const decorCache = {};
function decorFor(world) {
  if (!decorCache[world.id]) decorCache[world.id] = makeDecor(world, { W, H, BX: 0, BY: 430, BR: W, BB: H });
  return decorCache[world.id];
}

// A world landscape: sky + scenery + rolling ground. `blight` 0..1 tints it toward rot.
function landscape(ctx, world, t, blight = 0, offsetX = 0) {
  ctx.save();
  ctx.translate(offsetX, 0);
  drawBackdrop(ctx, world, t, { W, H, BY: 430 }, decorFor(world));
  const g = ctx.createLinearGradient(0, 420, 0, H);
  g.addColorStop(0, world.ground[0]); g.addColorStop(1, tint(world.ground[1], -0.25));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(0, 440);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 430 + Math.sin(x * 0.006 + 1) * 14);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
  // flowers / grass strokes
  for (let i = 0; i < 60; i++) {
    const x = (i * 97) % W, y = 470 + ((i * 53) % 230);
    ctx.strokeStyle = 'rgba(20,60,20,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 9); ctx.moveTo(x + 3, y); ctx.lineTo(x + 5, y - 8); ctx.stroke();
    if (i % 4 === 0 && blight < 0.5) { ctx.fillStyle = ['#ff7eb6', '#fff', '#ffd23a', '#9be7ff'][i % 4 === 0 ? (i / 4) % 4 : 0]; ctx.beginPath(); ctx.arc(x + 6, y - 6, 4, 0, TAU); ctx.fill(); }
  }
  if (blight > 0) {
    ctx.fillStyle = `rgba(70,20,70,${blight * 0.55})`;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(200,80,200,${blight * 0.5})`; ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(W - i * 170, H); ctx.quadraticCurveTo(W - i * 170 - 60, 520 + Math.sin(t + i) * 20, W - i * 170 - 20, 430); ctx.stroke(); }
  }
  ctx.restore();
}

export function drawHearthseed(ctx, x, y, r, t, power = 1) {
  ctx.save();
  const p = 0.5 + 0.5 * Math.sin(t * 2.4);
  const glow = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * (3 + p) * power);
  glow.addColorStop(0, `rgba(255,240,170,${0.8 * power})`);
  glow.addColorStop(0.4, `rgba(255,200,90,${0.35 * power})`);
  glow.addColorStop(1, 'rgba(255,180,60,0)');
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.arc(x, y, r * 4 * power + 1, 0, TAU); ctx.fill();
  // rays
  ctx.strokeStyle = `rgba(255,240,180,${0.35 * power})`;
  ctx.lineWidth = 3;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + t * 0.3;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r * 1.4); ctx.lineTo(x + Math.cos(a) * r * (2.4 + p), y + Math.sin(a) * r * (2.4 + p)); ctx.stroke();
  }
  // seed body
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.2);
  ctx.bezierCurveTo(x + r * 1.1, y - r * 0.6, x + r * 0.9, y + r, x, y + r * 1.05);
  ctx.bezierCurveTo(x - r * 0.9, y + r, x - r * 1.1, y - r * 0.6, x, y - r * 1.2);
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, power > 0.4 ? '#fff6c0' : '#8a7a5a'); g.addColorStop(1, power > 0.4 ? '#ffb430' : '#4a3a2a');
  ctx.fillStyle = g; ctx.fill();
  ctx.strokeStyle = '#5a3a10'; ctx.lineWidth = Math.max(2, r * 0.08); ctx.stroke();
  // sprout curl
  ctx.strokeStyle = '#4f9e3d'; ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.beginPath(); ctx.moveTo(x, y - r * 1.15); ctx.quadraticCurveTo(x + r * 0.5, y - r * 1.9, x + r * 0.2, y - r * 1.6); ctx.stroke();
  ctx.fillStyle = '#7fd05a';
  ctx.beginPath(); ctx.ellipse(x + r * 0.45, y - r * 1.75, r * 0.32, r * 0.16, -0.5, 0, TAU); ctx.fill();
  ctx.restore();
}

function caption(ctx, text, k) {
  if (!text) return;
  const shown = text.slice(0, Math.floor(text.length * Math.min(1, k * 1.8)));
  ctx.save();
  ctx.globalAlpha = Math.min(1, k * 6, (1 - k) * 8);
  const g = ctx.createLinearGradient(0, H - 150, 0, H);
  g.addColorStop(0, 'rgba(10,6,4,0)'); g.addColorStop(1, 'rgba(10,6,4,0.85)');
  ctx.fillStyle = g; ctx.fillRect(0, H - 170, W, 170);
  ctx.font = 'italic 700 30px Georgia, "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff4d8';
  ctx.shadowColor = '#000'; ctx.shadowBlur = 8;
  wrap(ctx, shown, W / 2, H - 92, 1000, 40);
  ctx.restore();
}
function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; }
  lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + (i - (lines.length - 1) / 2) * lh));
}
function letterbox(ctx, k = 1) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, 60 * k);
  ctx.fillRect(0, H - 40 * k, W, 40 * k);
}
function fade(ctx, a) { if (a > 0) { ctx.fillStyle = `rgba(0,0,0,${Math.min(1, a)})`; ctx.fillRect(0, 0, W, H); } }
function petals(ctx, t, n = 40, color = '#ffb6e6') {
  for (let i = 0; i < n; i++) {
    const x = ((i * 137 + t * (30 + (i % 5) * 12)) % (W + 40)) - 20;
    const y = ((i * 89 + t * (40 + (i % 7) * 10)) % (H + 40)) - 20;
    ctx.fillStyle = i % 3 ? color : '#fff2a8';
    ctx.beginPath(); ctx.ellipse(x, y, 6, 3, t * 2 + i, 0, TAU); ctx.fill();
  }
}
function greenhouse(ctx, x, y, s, t, lit = true) {
  ctx.save();
  ctx.translate(x, y);
  // frame
  ctx.fillStyle = 'rgba(210,240,250,0.55)';
  ctx.strokeStyle = '#5a3d22'; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-s, 0); ctx.lineTo(-s, -s * 0.8); ctx.lineTo(0, -s * 1.3); ctx.lineTo(s, -s * 0.8); ctx.lineTo(s, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.lineWidth = 3;
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * s * 0.4, 0); ctx.lineTo(i * s * 0.4, -s * 0.8 - (2 - Math.abs(i)) * s * 0.2); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-s, -s * 0.45); ctx.lineTo(s, -s * 0.45); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillRect(-s * 0.85, -s * 0.75, s * 0.12, s * 0.5);
  // door + lantern
  ctx.fillStyle = '#7a5532'; ctx.fillRect(-s * 0.18, -s * 0.42, s * 0.36, s * 0.42);
  if (lit) {
    const p = 0.5 + 0.5 * Math.sin(t * 4);
    ctx.shadowColor = '#ffcf5a'; ctx.shadowBlur = 30 + p * 20;
    ctx.fillStyle = '#ffd25a'; ctx.beginPath(); ctx.roundRect(s * 0.26, -s * 0.5, s * 0.1, s * 0.12, 4); ctx.fill();
    ctx.shadowBlur = 0;
  }
  // plants inside
  for (let i = 0; i < 5; i++) { ctx.fillStyle = ['#6fbf4a', '#7fd05a', '#5aa83a'][i % 3]; ctx.beginPath(); ctx.arc(-s * 0.75 + i * s * 0.37, -s * 0.12, s * 0.09, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// ---------------- scene scripts ----------------
const INTRO = [
  {
    dur: 6.5, text: 'Long ago, every garden in the land drew its life from a single, glowing seed: the Hearthseed.',
    draw(ctx, t, k) {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#0b0d2a'); sky.addColorStop(1, '#2a2050');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + 0.7 * Math.abs(Math.sin(t + i))})`; ctx.fillRect((i * 173) % W, (i * 97) % 500, 2, 2); }
      // ancient pedestal
      ctx.fillStyle = '#5a5470'; ctx.beginPath(); ctx.moveTo(560, 640); ctx.lineTo(720, 640); ctx.lineTo(690, 470); ctx.lineTo(590, 470); ctx.fill();
      ctx.fillStyle = '#6e6888'; ctx.fillRect(570, 455, 140, 22);
      ctx.strokeStyle = '#8f88b0'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(640, 560, 20 + i * 14, Math.PI, 0); ctx.stroke(); }
      const s = 1 + ease(k) * 0.15;
      drawHearthseed(ctx, 640, 380 + Math.sin(t * 1.5) * 10, 34 * s, t, ease(k * 2));
      fade(ctx, 1 - k * 4);
    },
  },
  {
    dur: 7, text: 'Its warm light kept the greenhouse, the marsh, the orchards, the peaks and the deep caverns in bloom.',
    draw(ctx, t, k) {
      const worlds = WORLDS.slice(0, 5);
      const pos = ease(k) * (worlds.length - 1);
      const i = Math.floor(pos), f = pos - i;
      landscape(ctx, worlds[i], t, 0, -f * W);
      if (worlds[i + 1]) landscape(ctx, worlds[i + 1], t, 0, (1 - f) * W);
      drawHearthseed(ctx, 640, 120, 16, t, 0.8);
      const gs = ['glowcap', 'thornling', 'frostbell', 'hivebloom', 'prismbud'];
      gs.forEach((g, j) => drawGuardian(ctx, g, 260 + j * 190, 620 + Math.sin(t * 3 + j) * 4, 120, t + j, { seed: j }));
    },
  },
  {
    dur: 7.5, text: 'Until one night, the Rot Monarch crept out of the Rotheart... and stole it.',
    draw(ctx, t, k) {
      ctx.fillStyle = '#120818'; ctx.fillRect(0, 0, W, H);
      landscape(ctx, WORLDS[0], t, 0.4 + k * 0.4);
      const m = ROTLINGS.monarch;
      const mx = lerp(1500, 860, ease(k * 1.6));
      drawRotling(ctx, { k: 'monarch', x: mx, y: 640, def: m, seed: 3, shell: 0, shield: 0, hurt: 0, eating: k > 0.55 }, 230, t);
      const grab = ease((k - 0.55) * 3);
      const sx = lerp(520, mx - 150, grab), sy = lerp(330, 420, grab);
      drawHearthseed(ctx, sx, sy, 22, t, 1 - grab * 0.7);
      // shadowy tendril reaching for the seed
      if (k > 0.35) {
        ctx.strokeStyle = 'rgba(120,40,110,0.85)'; ctx.lineWidth = 14; ctx.lineCap = 'round';
        const reach = ease((k - 0.35) * 3);
        ctx.beginPath(); ctx.moveTo(mx - 120, 520); ctx.quadraticCurveTo(lerp(mx - 120, sx, 0.5), 300, lerp(mx - 120, sx, reach), lerp(520, sy, reach)); ctx.stroke();
      }
      ctx.fillStyle = `rgba(0,0,0,${0.3 + Math.sin(t * 7) * 0.05})`; ctx.fillRect(0, 0, W, H);
      letterbox(ctx, ease(k * 4));
    },
  },
  {
    dur: 6.5, text: 'Without the Hearthseed, the blight began to spread, and Rotlings crawled out of every shadow.',
    draw(ctx, t, k) {
      landscape(ctx, WORLDS[1], t, ease(k));
      const kinds = ['grub', 'skitter', 'shieldbug', 'spore', 'grub', 'crystalback', 'skitter', 'brute'];
      kinds.forEach((kk, i) => {
        const x = W + 80 + i * 150 - t * 0 - ease(k) * 1100 - (i % 2) * 40;
        drawRotling(ctx, { k: kk, x, y: 560 + (i % 3) * 55, def: ROTLINGS[kk], seed: i, shell: ROTLINGS[kk].shell || 0, shield: ROTLINGS[kk].shield || 0, hurt: 0 }, 110, t + i);
      });
      // purple wave sweeping left
      const wx = W - ease(k) * (W + 300);
      const g = ctx.createLinearGradient(wx - 200, 0, wx + 200, 0);
      g.addColorStop(0, 'rgba(80,20,80,0)'); g.addColorStop(1, 'rgba(80,20,80,0.6)');
      ctx.fillStyle = g; ctx.fillRect(wx - 200, 0, W + 400, H);
      letterbox(ctx);
    },
  },
  {
    dur: 8.5, text: 'But Grandma Ada\'s old greenhouse still had one lantern burning... and a brand new gardener at its door.',
    draw(ctx, t, k) {
      const dawn = { ...WORLDS[0], sky: ['#ffb68a', '#ffe9c8'] };
      landscape(ctx, dawn, t, 0.15);
      greenhouse(ctx, 860, 600, 210, t, true);
      const wx = lerp(-120, 600, ease(k * 1.4));
      const walking = k < 0.7;
      drawPortrait(ctx, 'wren', wx, 640 - (walking ? Math.abs(Math.sin(t * 9)) * 10 : 0), 220, t, false);
      // Moss waking up beside the door
      const wake = ease((k - 0.6) * 3);
      drawPortrait(ctx, 'moss', 1080, 650 - wake * 10, 200, t + 1, false);
      if (wake > 0.5) {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(1020, 470, 26, 22, 0, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#2a1a14'; ctx.font = '800 30px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', 1020, 482);
      }
      letterbox(ctx, 1 - ease(k * 2) * 0.6);
    },
  },
  {
    dur: 5, text: '',
    draw(ctx, t, k) {
      landscape(ctx, WORLDS[0], t, 0);
      petals(ctx, t, 50);
      const s = 0.6 + ease(k * 2) * 0.4;
      ctx.save();
      ctx.translate(W / 2, 300);
      ctx.scale(s, s);
      ctx.font = '800 150px "Trebuchet MS", sans-serif'; ctx.textAlign = 'center';
      ctx.lineJoin = 'round'; ctx.lineWidth = 26; ctx.strokeStyle = '#2f6b25'; ctx.strokeText('Bloomguard', 0, 0);
      ctx.fillStyle = '#ffffff'; ctx.fillText('Bloomguard', 0, 0);
      ctx.font = 'italic 700 34px Georgia, serif'; ctx.fillStyle = '#fff4d8'; ctx.lineWidth = 6; ctx.strokeStyle = '#2a1a14';
      ctx.strokeText('Recover the Hearthseed', 0, 70); ctx.fillText('Recover the Hearthseed', 0, 70);
      ctx.restore();
      drawPortrait(ctx, 'wren', 470, 690, 200, t);
      drawPortrait(ctx, 'moss', 820, 690, 180, t + 1);
      fade(ctx, (k - 0.85) * 6);
    },
  },
];

const ENDING = [
  {
    dur: 7, text: 'Back in Grandma Ada\'s greenhouse, Wren planted the Hearthseed where it belonged.',
    draw(ctx, t, k) {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#cfe9f2'); sky.addColorStop(1, '#f2fbff');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      // inside the greenhouse: panes
      ctx.strokeStyle = 'rgba(120,150,160,0.6)'; ctx.lineWidth = 4;
      for (let x = 0; x < W; x += 160) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 470); ctx.stroke(); }
      ctx.fillStyle = '#8a6440'; ctx.fillRect(0, 470, W, 250);
      ctx.fillStyle = '#b8643a'; ctx.beginPath(); ctx.moveTo(560, 470); ctx.lineTo(720, 470); ctx.lineTo(700, 560); ctx.lineTo(580, 560); ctx.fill();
      const drop = ease(k * 1.6);
      drawHearthseed(ctx, 640, lerp(320, 460, drop), 26, t, 0.6 + ease((k - 0.6) * 3) * 1.2);
      drawPortrait(ctx, 'wren', 430, 640, 230, t, false);
      drawPortrait(ctx, 'moss', 880, 650, 200, t + 1, false);
      if (k > 0.6) { ctx.fillStyle = `rgba(255,250,210,${ease((k - 0.6) * 2.5) * 0.9})`; ctx.fillRect(0, 0, W, H); }
    },
  },
  ...WORLDS.map((w, i) => ({
    dur: 3.2, text: ['Light raced across the land.', 'The marsh fireflies danced again.', 'The orchards bloomed.', 'Spring returned to the peaks.', 'The caverns sparkled.', 'Even the Rotheart began to grow flowers.'][i],
    draw(ctx, t, k) {
      landscape(ctx, w, t, 1 - ease(k * 1.5));
      const wx = lerp(-200, W + 200, ease(k * 1.5));
      const g = ctx.createLinearGradient(wx - 250, 0, wx, 0);
      g.addColorStop(0, 'rgba(255,250,200,0)'); g.addColorStop(1, 'rgba(255,250,200,0.55)');
      ctx.fillStyle = g; ctx.fillRect(wx - 250, 0, 250, H);
      if (k > 0.5) petals(ctx, t, 20, '#ffe0f0');
    },
  })),
  {
    dur: 7, text: 'Wren, Moss and every guardian celebrated until the stars came out.',
    draw(ctx, t, k) {
      landscape(ctx, { ...WORLDS[0], sky: ['#5a6ac8', '#ffb6a0'] }, t, 0);
      const gs = ['glowcap', 'thornling', 'frostbell', 'barkwall', 'hivebloom', 'twinbud', 'prismbud', 'emberroot'];
      gs.forEach((g, i) => drawGuardian(ctx, g, 120 + i * 150, 690 - Math.abs(Math.sin(t * 5 + i)) * 30, 120, t + i, { seed: i }));
      drawPortrait(ctx, 'wren', 560, 560 - Math.abs(Math.sin(t * 4)) * 20, 200, t, true);
      drawPortrait(ctx, 'moss', 760, 570, 180, t + 1, true);
      petals(ctx, t, 60);
      // fireworks of glow
      for (let i = 0; i < 4; i++) {
        const ft = (t * 0.7 + i * 0.25) % 1;
        const fx = 200 + i * 290, fy = 260 - ft * 80;
        for (let j = 0; j < 12; j++) { const a = (j / 12) * TAU; ctx.fillStyle = `rgba(255,${200 + i * 10},120,${1 - ft})`; ctx.beginPath(); ctx.arc(fx + Math.cos(a) * ft * 90, fy + Math.sin(a) * ft * 90, 4, 0, TAU); ctx.fill(); }
      }
    },
  },
  {
    dur: 22, text: '',
    draw(ctx, t, k) {
      ctx.fillStyle = '#120c1a'; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 100; i++) { ctx.fillStyle = `rgba(255,255,255,${0.2 + 0.6 * Math.abs(Math.sin(t * 0.5 + i))})`; ctx.fillRect((i * 173) % W, (i * 97) % H, 2, 2); }
      const lines = [
        ['Bloomguard', 72], ['', 30], ['~ The End ~', 40], ['', 40],
        ['Starring', 28], ['Wren, the gardener', 34], ['Moss, the tortoise', 34], ['18 brave guardians', 34], ['', 30],
        ['And the villains', 28], ['The Rot Monarch', 34], ['Mother Husk · Bogmaw · Cinderhusk', 30], ['Rimefang · Gloomwyrm', 30], ['', 30],
        ['Story, art, music and code', 28], ['Made with love by the Bloomguard team', 32], ['Every image and sound is created in code', 26], ['', 30],
        ['Special thanks', 28], ['You, for playing!', 38], ['', 50],
        ['The blight still lurks in the shadows...', 28], ['Endless Bloom awaits.', 34],
      ];
      let y = H + 40 - k * 2100;
      ctx.textAlign = 'center';
      for (const [txt, size] of lines) {
        ctx.font = `${size > 50 ? '800' : '700'} ${size}px "Trebuchet MS", sans-serif`;
        ctx.fillStyle = size > 50 ? '#d9ffb0' : size === 28 ? '#ffd23a' : '#fff4d8';
        ctx.fillText(txt, W / 2, y);
        y += size + 22;
      }
      drawHearthseed(ctx, 140, 560, 22, t, 1);
      drawGuardian(ctx, 'glowcap', 1140, 650, 110, t, {});
    },
  },
];

// ---------------- player ----------------
export function playCinema(which, host, onDone) {
  const scenes = which === 'ending' ? ENDING : INTRO;
  const total = scenes.reduce((a, s) => a + s.dur, 0);
  const wrapEl = document.createElement('div');
  wrapEl.className = 'cinema';
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const skip = document.createElement('button');
  skip.className = 'cinema-skip';
  skip.textContent = 'Skip ⏭';
  skip.setAttribute('aria-label', 'Skip cutscene');
  wrapEl.append(cv, skip);
  host.append(wrapEl);
  const ctx = cv.getContext('2d');
  let raf;
  let done = false;
  const t0 = performance.now();
  const finish = () => {
    if (done) return;
    done = true;
    cancelAnimationFrame(raf);
    wrapEl.classList.add('out');
    setTimeout(() => { wrapEl.remove(); onDone && onDone(); }, 350);
  };
  skip.addEventListener('click', (e) => { e.stopPropagation(); finish(); });
  const frame = () => {
    raf = requestAnimationFrame(frame);
    const t = (performance.now() - t0) / 1000;
    if (t >= total) { finish(); return; }
    let acc = 0;
    for (const s of scenes) {
      if (t < acc + s.dur) {
        const k = (t - acc) / s.dur;
        ctx.save();
        s.draw(ctx, t, k);
        ctx.restore();
        caption(ctx, s.text, k);
        // scene cross-fade
        fade(ctx, Math.max(0, 1 - (t - acc) * 3, 1 - (acc + s.dur - t) * 3) * 0.9);
        break;
      }
      acc += s.dur;
    }
  };
  frame();
  return { skip: finish, duration: total };
}
