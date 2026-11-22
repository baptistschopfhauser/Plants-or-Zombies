// All sound is synthesized at runtime with WebAudio — no recorded audio assets.
let ac = null;
let master = null;
let musicGain = null;
let musicTimer = null;
const state = { sfx: true, music: true };

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.5;
    master.connect(ac.destination);
    musicGain = ac.createGain();
    musicGain.gain.value = 0.12;
    musicGain.connect(master);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function tone(freq, dur, type = 'sine', vol = 0.3, slide = 0, dest = null, when = 0) {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(dest || master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.3, freq = 1200) {
  const c = ctx();
  if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start();
}

const SFX = {
  plant: () => { tone(320, 0.12, 'triangle', 0.25, 200); noise(0.08, 0.15, 800); },
  shoot: () => tone(700, 0.06, 'square', 0.05, -300),
  frost: () => { tone(1400, 0.15, 'sine', 0.08); tone(2100, 0.2, 'sine', 0.05); },
  hit: () => noise(0.05, 0.12, 2000),
  collect: () => { tone(880, 0.08, 'sine', 0.15); tone(1320, 0.12, 'sine', 0.12, 0, null, 0.06); },
  boom: () => { noise(0.5, 0.5, 600); tone(90, 0.4, 'sawtooth', 0.2, -50); },
  zap: () => { noise(0.3, 0.35, 4000); tone(1800, 0.25, 'sawtooth', 0.12, -1500); },
  chomp: () => tone(140, 0.07, 'square', 0.06, -40),
  die: () => tone(260, 0.25, 'triangle', 0.15, -180),
  lantern: () => { tone(200, 0.5, 'sawtooth', 0.2, -120); },
  wave: () => { tone(220, 0.3, 'sawtooth', 0.15); tone(277, 0.3, 'sawtooth', 0.12, 0, null, 0.15); tone(330, 0.5, 'sawtooth', 0.12, 0, null, 0.3); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.35, 'triangle', 0.2, 0, null, i * 0.12)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.4, 'triangle', 0.2, 0, null, i * 0.18)),
  click: () => tone(600, 0.04, 'sine', 0.12),
  upgrade: () => [660, 880, 1100].forEach((f, i) => tone(f, 0.12, 'square', 0.08, 0, null, i * 0.06)),
  bloom: () => { [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.5, 'sine', 0.15, 0, null, i * 0.05)); noise(0.6, 0.15, 3000); },
  deny: () => tone(150, 0.15, 'square', 0.08),
};

let lastPlay = {};
export function sfx(name) {
  if (!state.sfx || !SFX[name]) return;
  const now = performance.now();
  if (lastPlay[name] && now - lastPlay[name] < 35) return; // avoid stacking identical sounds
  lastPlay[name] = now;
  try { SFX[name](); } catch (e) { /* audio unavailable */ }
}

// Small generative tune: pentatonic arpeggios over a slow bass, varied per world.
const SCALES = [
  [261.6, 293.7, 329.6, 392, 440],
  [220, 261.6, 293.7, 329.6, 392],
  [246.9, 293.7, 329.6, 370, 440],
];
export function startMusic(world = 0) {
  stopMusic();
  if (!state.music) return;
  const c = ctx();
  if (!c) return;
  const scale = SCALES[world % SCALES.length];
  let step = 0;
  musicTimer = setInterval(() => {
    if (!state.music || document.hidden) return;
    const n = scale[(step * 3 + (step >> 2)) % scale.length] * (step % 8 < 4 ? 1 : 2);
    tone(n, 0.35, 'triangle', 0.25, 0, musicGain);
    if (step % 4 === 0) tone(scale[(step >> 2) % 3] / 2, 1.2, 'sine', 0.4, 0, musicGain);
    step++;
  }, 300);
}
export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}
export function setAudio(opts) { Object.assign(state, opts); if (!state.music) stopMusic(); }
export function unlockAudio() { ctx(); }
