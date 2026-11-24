// Bloomguard audio: every sound and every tune is synthesized at runtime with WebAudio.
// No recorded audio and no existing music: melodies are generated from the game's own chord
// progressions, so everything is original.
let ac = null;
let master = null;   // -> compressor -> speakers
let sfxBus = null;
let musicBus = null;
let reverbIn = null; // shared small-room reverb send
const state = { sfx: true, music: true };

function makeImpulse(c, seconds = 1.6, decay = 3) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    comp.connect(ac.destination);
    master = ac.createGain(); master.gain.value = 0.8; master.connect(comp);
    sfxBus = ac.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    musicBus = ac.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    const conv = ac.createConvolver(); conv.buffer = makeImpulse(ac);
    reverbIn = ac.createGain(); reverbIn.gain.value = 0.25;
    reverbIn.connect(conv); conv.connect(master);
  }
  if (ac.state === 'suspended' && ac.resume) { try { const pr = ac.resume(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) { /* not resumable yet */ } }
  return ac;
}

// ---------- building blocks ----------
// A voice with an attack/decay envelope, optional pitch glide, filter and reverb send.
function voice({ freq, type = 'sine', dur = 0.2, vol = 0.3, attack = 0.005, glide = 0, glideTime, filter, q = 1, when = 0, bus, verb = 0, detune = 0 }) {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator();
  o.type = type;
  o.detune.value = detune;
  o.frequency.setValueAtTime(freq, t);
  if (glide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + glide), t + (glideTime || dur));
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = o;
  if (filter) {
    const f = c.createBiquadFilter();
    f.type = filter.type || 'lowpass';
    f.frequency.setValueAtTime(filter.freq, t);
    if (filter.to) f.frequency.exponentialRampToValueAtTime(filter.to, t + dur);
    f.Q.value = q;
    node.connect(f); node = f;
  }
  node.connect(g);
  g.connect(bus || sfxBus);
  if (verb) { const s = c.createGain(); s.gain.value = verb; g.connect(s); s.connect(reverbIn); }
  o.start(t);
  o.stop(t + dur + 0.05);
}

let noiseBuf = null;
function noiseHit({ dur = 0.1, vol = 0.3, type = 'lowpass', freq = 1200, to, q = 0.8, when = 0, bus, verb = 0, attack = 0.002 }) {
  const c = ctx();
  if (!c) return;
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime + when;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(bus || sfxBus);
  if (verb) { const s = c.createGain(); s.gain.value = verb; g.connect(s); s.connect(reverbIn); }
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.05);
}
const bell = (freq, when = 0, vol = 0.12, dur = 0.6) => {
  voice({ freq, dur, vol, when, verb: 0.5 });
  voice({ freq: freq * 2.76, dur: dur * 0.5, vol: vol * 0.35, when, verb: 0.5 });
  voice({ freq: freq * 5.4, dur: dur * 0.25, vol: vol * 0.15, when, verb: 0.4 });
};

// ---------- sound effects ----------
const SFX = {
  click: () => { voice({ freq: 1100, dur: 0.035, vol: 0.12, type: 'triangle' }); noiseHit({ dur: 0.02, vol: 0.06, type: 'highpass', freq: 3000 }); },
  plant: () => {
    voice({ freq: 220, glide: -120, dur: 0.16, vol: 0.32, type: 'sine' });
    noiseHit({ dur: 0.12, vol: 0.18, type: 'lowpass', freq: 900, to: 300 });
    bell(1318, 0.06, 0.05, 0.35);
  },
  shoot: () => voice({ freq: 540 + Math.random() * 60, glide: -220, dur: 0.07, vol: 0.09, type: 'triangle', filter: { freq: 2500 } }),
  frost: () => { bell(1568, 0, 0.07, 0.5); bell(2350, 0.03, 0.04, 0.4); },
  hit: () => noiseHit({ dur: 0.05, vol: 0.13, type: 'bandpass', freq: 900 + Math.random() * 400, q: 1.5 }),
  collect: () => { bell(1319, 0, 0.11, 0.4); bell(1976, 0.07, 0.1, 0.5); },
  chomp: () => { noiseHit({ dur: 0.05, vol: 0.09, type: 'bandpass', freq: 420, q: 3 }); noiseHit({ dur: 0.05, vol: 0.07, type: 'bandpass', freq: 380, q: 3, when: 0.07 }); },
  die: () => {
    voice({ freq: 520, glide: -400, dur: 0.18, vol: 0.18, type: 'sine' });
    noiseHit({ dur: 0.18, vol: 0.12, type: 'lowpass', freq: 1400, to: 200, q: 2 });
  },
  boom: () => {
    voice({ freq: 90, glide: -50, dur: 0.55, vol: 0.45, type: 'sine' });
    noiseHit({ dur: 0.6, vol: 0.35, type: 'lowpass', freq: 2200, to: 120, verb: 0.3 });
  },
  zap: () => {
    noiseHit({ dur: 0.35, vol: 0.3, type: 'highpass', freq: 2500, verb: 0.3 });
    voice({ freq: 1800, glide: -1500, dur: 0.3, vol: 0.12, type: 'sawtooth', filter: { freq: 4000 } });
    voice({ freq: 70, dur: 0.4, vol: 0.3, type: 'sine', when: 0.02 });
  },
  lantern: () => {
    voice({ freq: 330, glide: -180, dur: 0.9, vol: 0.18, type: 'triangle', verb: 0.6 });
    voice({ freq: 165, glide: -90, dur: 1.1, vol: 0.16, type: 'sine', verb: 0.4 });
  },
  wave: () => {
    // a short rising horn call made from filtered saw waves
    [[220, 0], [277, 0.16], [330, 0.32]].forEach(([f, w]) => {
      voice({ freq: f, dur: 0.42, vol: 0.12, type: 'sawtooth', attack: 0.04, when: w, filter: { freq: 900 }, verb: 0.3 });
      voice({ freq: f * 1.005, dur: 0.42, vol: 0.08, type: 'sawtooth', attack: 0.04, when: w, filter: { freq: 900 }, detune: 8 });
    });
    voice({ freq: 55, dur: 0.7, vol: 0.3, type: 'sine', when: 0.32 });
  },
  win: () => {
    [523, 659, 784, 1047].forEach((f, i) => bell(f, i * 0.11, 0.13, 0.7));
    [262, 330, 392].forEach((f) => voice({ freq: f, dur: 1.4, vol: 0.07, type: 'triangle', attack: 0.05, when: 0.45, verb: 0.5 }));
  },
  lose: () => {
    [392, 349, 311, 262].forEach((f, i) => voice({ freq: f, dur: 0.6, vol: 0.12, type: 'triangle', when: i * 0.22, verb: 0.5, filter: { freq: 1600 } }));
    voice({ freq: 98, dur: 1.4, vol: 0.18, type: 'sine', when: 0.66 });
  },
  upgrade: () => [784, 988, 1175, 1568].forEach((f, i) => bell(f, i * 0.055, 0.08, 0.45)),
  bloom: () => {
    // shimmering chord swell + rising whoosh
    [392, 494, 587, 784, 988].forEach((f, i) => {
      voice({ freq: f, dur: 1.1, vol: 0.06, type: 'triangle', attack: 0.12, when: i * 0.03, verb: 0.7 });
      voice({ freq: f, dur: 1.1, vol: 0.04, type: 'sine', attack: 0.12, when: i * 0.03, detune: 12, verb: 0.7 });
    });
    noiseHit({ dur: 0.7, vol: 0.14, type: 'bandpass', freq: 600, to: 6000, q: 1.2, attack: 0.25 });
  },
  deny: () => voice({ freq: 180, glide: -40, dur: 0.14, vol: 0.12, type: 'square', filter: { freq: 700 } }),
};

const lastPlay = {};
export function sfx(name) {
  if (!state.sfx || !SFX[name]) return;
  const now = performance.now();
  const gap = name === 'shoot' || name === 'hit' ? 45 : 35;
  if (lastPlay[name] && now - lastPlay[name] < gap) return; // avoid stacking identical sounds
  lastPlay[name] = now;
  try { SFX[name](); } catch (e) { /* audio unavailable */ }
}

// ---------- music ----------
// Each world has its own key, mode, tempo, progression and timbres. A seeded melody walks over
// the notes of the current chord, so the tunes are generated, original and loop seamlessly.
const MODES = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], lydian: [0, 2, 4, 6, 7, 9, 11] };
const SONGS = [
  { root: 60, mode: 'major', bpm: 104, prog: [0, 4, 5, 3], lead: 'triangle', pad: 'triangle', swing: 0.08, seed: 3 },  // Dawn Greenhouse
  { root: 57, mode: 'dorian', bpm: 84, prog: [0, 3, 6, 4], lead: 'sine', pad: 'sine', swing: 0.04, seed: 11 },         // Moonlit Marsh
  { root: 62, mode: 'minor', bpm: 116, prog: [0, 5, 2, 6], lead: 'square', pad: 'triangle', swing: 0.0, seed: 7 },     // Ember Orchard
  { root: 64, mode: 'lydian', bpm: 92, prog: [0, 1, 4, 5], lead: 'sine', pad: 'triangle', swing: 0.05, seed: 19 },     // Frostpeak Terraces
  { root: 55, mode: 'dorian', bpm: 96, prog: [0, 6, 3, 4], lead: 'triangle', pad: 'sine', swing: 0.0, seed: 23 },      // Crystal Caverns
  { root: 53, mode: 'minor', bpm: 122, prog: [0, 5, 3, 4], lead: 'sawtooth', pad: 'sawtooth', swing: 0.0, seed: 31 },  // The Rotheart
];
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
let sched = null;

export function startMusic(world = 0) {
  stopMusic();
  if (!state.music) return;
  const c = ctx();
  if (!c) return;
  const song = SONGS[world % SONGS.length];
  const scale = MODES[song.mode];
  const deg = (d) => song.root + scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  const beat = 60 / song.bpm;
  let rnd = song.seed;
  const rand = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
  // compose a 4-bar melody once per song (8 eighth notes per bar), then loop it with variation
  const melody = [];
  for (let bar = 0; bar < 4; bar++) {
    let d = song.prog[bar] + 7;
    for (let i = 0; i < 8; i++) {
      if (rand() < (i % 2 ? 0.45 : 0.15)) { melody.push(null); continue; }
      d += [0, 2, -2, 1, -1, 4][Math.floor(rand() * 6)];
      d = Math.max(song.prog[bar] + 5, Math.min(song.prog[bar] + 12, d));
      melody.push(d);
    }
  }
  let step = 0;
  let next = c.currentTime + 0.1;
  const play = (fn) => { if (state.music && !document.hidden) fn(); };
  sched = setInterval(() => {
    while (next < c.currentTime + 0.25) {
      const when = next - c.currentTime;
      const bar = Math.floor(step / 8) % 4;
      const chordDeg = song.prog[bar];
      const i8 = step % 8;
      const swing = i8 % 2 ? song.swing * beat : 0;
      play(() => {
        // pad chord at the start of each bar
        if (i8 === 0) for (const k of [0, 2, 4]) voice({ freq: midi(deg(chordDeg + k)), dur: beat * 4.2, vol: 0.045, type: song.pad, attack: beat * 0.6, when, bus: musicBus, verb: 0.6, filter: { freq: 1400 } });
        // bass on beats 1 and 3, a passing note on the "and" of 4
        if (i8 === 0 || i8 === 4) voice({ freq: midi(deg(chordDeg) - 24), dur: beat * 1.6, vol: 0.16, type: 'triangle', when, bus: musicBus, filter: { freq: 500 } });
        if (i8 === 7) voice({ freq: midi(deg(chordDeg + 4) - 24), dur: beat * 0.5, vol: 0.1, type: 'triangle', when, bus: musicBus, filter: { freq: 500 } });
        // soft percussion
        if (i8 === 0 || i8 === 4) voice({ freq: 70, glide: -35, dur: 0.18, vol: 0.18, when, bus: musicBus });
        if (i8 % 2 === 1) noiseHit({ dur: 0.04, vol: 0.035, type: 'highpass', freq: 7000, when: when + swing, bus: musicBus });
        if (i8 === 4 && world % 2 === 0) noiseHit({ dur: 0.12, vol: 0.05, type: 'bandpass', freq: 1800, q: 0.8, when, bus: musicBus });
        // melody (rests every other phrase so it breathes)
        const phrase = Math.floor(step / 32) % 2;
        const m = melody[step % 32];
        if (m != null && !(phrase === 1 && i8 > 5)) voice({ freq: midi(deg(m)), dur: beat * 0.9, vol: song.lead === 'square' || song.lead === 'sawtooth' ? 0.03 : 0.07, type: song.lead, attack: 0.01, when: when + swing, bus: musicBus, verb: 0.35, filter: { freq: 2600 } });
      });
      next += beat / 2;
      step++;
    }
  }, 60);
}
export function stopMusic() {
  if (sched) clearInterval(sched);
  sched = null;
}
export function setAudio(opts) { Object.assign(state, opts); if (!state.music) stopMusic(); }
export function unlockAudio() { ctx(); }
