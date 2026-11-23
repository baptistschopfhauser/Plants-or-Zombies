// "Bonk the Blight": an original tap-reaction mini-game. Rotlings pop out of burrows; bonk them,
// but never bonk the sprouts. Golden grubs are worth extra. 45 seconds, combos multiply score.
import { ROTLINGS } from './data.js';
import { drawRotling, drawGuardian, drawBackdrop, makeDecor } from './art.js';
import { WORLDS } from './data.js';
import { sfx } from './audio.js';

const W = 1280, H = 720;
const HOLES = [];
for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) HOLES.push({ x: 260 + c * 255 + (r % 2) * 60, y: 330 + r * 140 });

export function playBonk(host, onEnd) {
  const wrap = document.createElement('div');
  wrap.className = 'bonk';
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const quit = document.createElement('button');
  quit.className = 'cinema-skip';
  quit.textContent = 'Quit';
  wrap.append(cv, quit);
  host.append(wrap);
  const ctx = cv.getContext('2d');
  const world = WORLDS[0];
  const decor = makeDecor(world, { W, H, BX: 0, BY: 230, BR: W, BB: H });
  const state = { t: 0, left: 45, score: 0, combo: 0, best: 0, pops: [], next: 0.6, fx: [], over: false };
  let last = performance.now();
  let raf;

  function spawn() {
    const free = HOLES.map((h, i) => i).filter((i) => !state.pops.some((p) => p.hole === i));
    if (!free.length) return;
    const hole = free[Math.floor(Math.random() * free.length)];
    const roll = Math.random();
    const kind = roll < 0.18 ? 'sprout' : roll < 0.26 ? 'golden' : roll < 0.4 ? 'shellback' : roll < 0.55 ? 'skitter' : 'grub';
    const speedUp = 1 - Math.min(0.45, state.t / 90);
    state.pops.push({ hole, kind, t: 0, life: (kind === 'skitter' ? 0.8 : 1.3) * speedUp, hits: kind === 'shellback' ? 2 : 1, bonked: 0 });
  }

  function pos(ev) {
    const r = cv.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * W, y: ((ev.clientY - r.top) / r.height) * H };
  }
  function onDown(ev) {
    if (state.over) return;
    const p = pos(ev);
    let hit = false;
    for (const pop of state.pops) {
      if (pop.bonked) continue;
      const h = HOLES[pop.hole];
      const up = Math.min(1, pop.t / 0.18, (pop.life - pop.t) / 0.18);
      if (up < 0.3) continue;
      if (Math.abs(p.x - h.x) < 70 && p.y < h.y + 20 && p.y > h.y - 140) {
        hit = true;
        if (pop.kind === 'sprout') {
          state.combo = 0; state.score = Math.max(0, state.score - 30); pop.bonked = 1;
          state.fx.push({ x: h.x, y: h.y - 90, text: '-30 Ouch!', color: '#ff8a8a', t: 1 });
          sfx('deny');
        } else {
          pop.hits--;
          sfx('hit');
          if (pop.hits <= 0) {
            pop.bonked = 1;
            state.combo++;
            state.best = Math.max(state.best, state.combo);
            const base = pop.kind === 'golden' ? 60 : pop.kind === 'shellback' ? 25 : 10;
            const gain = base * (1 + Math.floor(state.combo / 5));
            state.score += gain;
            state.fx.push({ x: h.x, y: h.y - 90, text: `+${gain}${state.combo >= 5 ? ' x' + (1 + Math.floor(state.combo / 5)) : ''}`, color: pop.kind === 'golden' ? '#ffe27a' : '#fff', t: 1 });
            sfx(pop.kind === 'golden' ? 'upgrade' : 'die');
          } else {
            state.fx.push({ x: h.x, y: h.y - 90, text: 'Crack!', color: '#cfe0a0', t: 0.6 });
          }
        }
        state.fx.push({ x: p.x, y: p.y, star: true, t: 0.3 });
        break;
      }
    }
    if (!hit) { state.combo = 0; }
  }
  cv.addEventListener('pointerdown', onDown);

  function finish(early) {
    if (state.over) return;
    state.over = true;
    cancelAnimationFrame(raf);
    cv.removeEventListener('pointerdown', onDown);
    wrap.remove();
    onEnd({ score: state.score, combo: state.best, quit: early });
  }
  quit.addEventListener('click', () => finish(true));

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.t += dt;
    state.left -= dt;
    if (state.left <= 0) { finish(false); return; }
    state.next -= dt;
    if (state.next <= 0) { spawn(); if (Math.random() < Math.min(0.5, state.t / 60)) spawn(); state.next = Math.max(0.35, 0.9 - state.t / 70); }
    for (const p of state.pops) { p.t += dt * (p.bonked ? 3 : 1); if (!p.bonked && p.t >= p.life && p.kind !== 'sprout') state.combo = 0; }
    state.pops = state.pops.filter((p) => p.t < p.life);
    for (const f of state.fx) { f.t -= dt; if (!f.star) f.y -= 40 * dt; }
    state.fx = state.fx.filter((f) => f.t > 0);

    // ---- draw ----
    drawBackdrop(ctx, world, state.t, { W, H, BY: 230 }, decor);
    const g = ctx.createLinearGradient(0, 220, 0, H);
    g.addColorStop(0, '#7cc65b'); g.addColorStop(1, '#4f9e3d');
    ctx.fillStyle = g; ctx.fillRect(0, 220, W, H);
    for (let i = 0; i < 80; i++) { ctx.strokeStyle = 'rgba(30,70,20,0.3)'; ctx.lineWidth = 2; const x = (i * 97) % W, y = 240 + (i * 53) % 480; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y - 8); ctx.stroke(); }
    for (const [i, h] of HOLES.entries()) {
      ctx.fillStyle = '#3a2614';
      ctx.beginPath(); ctx.ellipse(h.x, h.y, 72, 22, 0, 0, Math.PI * 2); ctx.fill();
      const pop = state.pops.find((p) => p.hole === i);
      if (pop) {
        const up = Math.max(0, Math.min(1, pop.t / 0.18, (pop.life - pop.t) / 0.18));
        ctx.save();
        ctx.beginPath(); ctx.rect(h.x - 120, h.y - 220, 240, 220); ctx.clip();
        const yy = h.y + 100 - up * 100;
        if (pop.kind === 'sprout') drawGuardian(ctx, 'sprout', h.x, yy, 170, state.t, {});
        else {
          const k = pop.kind === 'golden' ? 'grub' : pop.kind;
          const def = pop.kind === 'golden' ? { ...ROTLINGS.grub, color: '#f0c03a' } : ROTLINGS[k];
          drawRotling(ctx, { k, x: h.x, y: yy, def, seed: i, shell: pop.hits > 1 ? 1 : 0, shield: 0, hurt: pop.bonked ? 0.1 : 0, confused: pop.bonked ? 1 : 0 }, 150, state.t);
        }
        ctx.restore();
      }
      ctx.fillStyle = '#5a3d22';
      ctx.beginPath(); ctx.ellipse(h.x, h.y + 6, 76, 16, 0, 0, Math.PI); ctx.fill();
    }
    for (const f of state.fx) {
      if (f.star) { ctx.strokeStyle = `rgba(255,255,200,${f.t / 0.3})`; ctx.lineWidth = 5; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(f.x + Math.cos(a) * 14, f.y + Math.sin(a) * 14); ctx.lineTo(f.x + Math.cos(a) * 34, f.y + Math.sin(a) * 34); ctx.stroke(); } continue; }
      text(f.text, f.x, f.y, 34, f.color, 'center');
    }
    ctx.fillStyle = 'rgba(40,26,18,0.85)';
    ctx.beginPath(); ctx.roundRect(20, 16, 420, 70, 16); ctx.fill();
    text(`Score ${state.score}`, 40, 64, 36, '#ffe9a0');
    text(`${Math.ceil(state.left)}s`, 380, 64, 36, state.left < 10 ? '#ff8a8a' : '#fff', 'center');
    if (state.combo >= 3) text(`Combo ${state.combo}!`, W / 2, 70, 40, '#a8ff7a', 'center');
    text('Bonk Rotlings! Never bonk the sprouts.', W / 2, H - 24, 24, '#fff4c8', 'center');
  }
  function text(s, x, y, size, color, align = 'left') {
    ctx.font = `800 ${size}px "Trebuchet MS", sans-serif`;
    ctx.textAlign = align; ctx.lineJoin = 'round';
    ctx.lineWidth = size / 5; ctx.strokeStyle = 'rgba(30,15,10,0.9)'; ctx.strokeText(s, x, y);
    ctx.fillStyle = color; ctx.fillText(s, x, y);
  }
  raf = requestAnimationFrame(frame);
  return { finish };
}
