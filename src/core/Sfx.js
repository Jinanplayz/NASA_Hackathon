// All sound effects and the background music are made with the Web Audio API,
// so the game needs no audio downloads. Custom audio files can still be used
// for narration (see Speech.js).

import { Settings } from './Settings.js';

let ctx = null;
let master, sfxBus, musicBus;
let noiseBuf = null;
const loops = new Set();
let music = null;
let paused = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = Settings.get('sfxVolume');
  sfxBus.connect(master);
  musicBus = ctx.createGain();
  musicBus.gain.value = Settings.get('musicVolume');
  musicBus.connect(master);

  // 2 seconds of white noise, reused for whooshes, rumbles and static.
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  Settings.on((key, value) => {
    if (key === 'sfxVolume') sfxBus.gain.setTargetAtTime(value, ctx.currentTime, 0.05);
    if (key === 'musicVolume') musicBus.gain.setTargetAtTime(value, ctx.currentTime, 0.1);
  });
  return ctx;
}

// Browsers only allow audio after the player touches/clicks something.
function unlock() {
  const c = ensure();
  if (!c) return;
  const go = () => wantedTheme && setTheme(wantedTheme);
  if (c.state === 'suspended') c.resume().then(go).catch(() => {});
  else go();
}
['pointerdown', 'keydown', 'touchend'].forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));

function now() {
  return ctx.currentTime;
}

function env(gainNode, t, attack, peak, decay, sustain = 0.0001) {
  const g = gainNode.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(0.0001, t);
  g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + attack + decay);
}

function tone({ freq = 440, to = null, type = 'sine', attack = 0.005, decay = 0.15, vol = 0.3, delay = 0, bus = sfxBus, detune = 0 }) {
  const t = now() + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.detune.value = detune;
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
  env(g, t, attack, vol, decay);
  o.connect(g).connect(bus);
  o.start(t);
  o.stop(t + attack + decay + 0.05);
}

function noise({ attack = 0.005, decay = 0.2, vol = 0.3, filter = 'bandpass', freq = 1000, to = null, q = 1, delay = 0 }) {
  const t = now() + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, t);
  if (to) f.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
  f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, attack, vol, decay);
  src.connect(f).connect(g).connect(sfxBus);
  src.start(t, Math.random());
  src.stop(t + attack + decay + 0.05);
}

const SOUNDS = {
  click: () => tone({ freq: 700, to: 950, type: 'triangle', decay: 0.07, vol: 0.18 }),
  hover: () => tone({ freq: 1400, type: 'sine', decay: 0.03, vol: 0.04 }),
  select: () => {
    tone({ freq: 520, type: 'triangle', decay: 0.08, vol: 0.18 });
    tone({ freq: 780, type: 'triangle', decay: 0.1, vol: 0.14, delay: 0.06 });
  },
  success: () => {
    [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', decay: 0.18, vol: 0.2, delay: i * 0.07 }));
  },
  bigSuccess: () => {
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone({ freq: f, type: 'triangle', decay: 0.35, vol: 0.18, delay: i * 0.08 }));
    [523, 659, 784].forEach((f) => tone({ freq: f, type: 'sine', attack: 0.05, decay: 1.2, vol: 0.1, delay: 0.5 }));
  },
  error: () => {
    tone({ freq: 250, type: 'triangle', decay: 0.12, vol: 0.2 });
    tone({ freq: 190, type: 'triangle', decay: 0.18, vol: 0.2, delay: 0.12 });
  },
  snap: () => {
    noise({ decay: 0.05, vol: 0.25, freq: 2500, q: 0.8 });
    tone({ freq: 180, to: 90, type: 'sine', decay: 0.12, vol: 0.35 });
  },
  whoosh: () => noise({ attack: 0.08, decay: 0.45, vol: 0.25, freq: 300, to: 2400, q: 1.2 }),
  hit: () => {
    tone({ freq: 140, to: 50, type: 'sine', decay: 0.25, vol: 0.45 });
    noise({ decay: 0.2, vol: 0.25, filter: 'lowpass', freq: 900 });
  },
  pickup: () => {
    tone({ freq: 1320, type: 'sine', decay: 0.25, vol: 0.15 });
    tone({ freq: 1760, type: 'sine', decay: 0.3, vol: 0.1, delay: 0.05 });
  },
  beep: () => tone({ freq: 1000, type: 'square', attack: 0.002, decay: 0.12, vol: 0.06 }),
  tick: () => tone({ freq: 880, type: 'square', attack: 0.002, decay: 0.05, vol: 0.06 }),
  puff: () => noise({ decay: 0.18, vol: 0.3, filter: 'highpass', freq: 1500 }),
  static: () => noise({ attack: 0.01, decay: 0.3, vol: 0.12, freq: 3000, q: 0.5 }),
  chime: () => {
    tone({ freq: 880, type: 'sine', decay: 0.6, vol: 0.12 });
    tone({ freq: 1320, type: 'sine', decay: 0.5, vol: 0.06, delay: 0.02 });
  },
  alarm: () => {
    for (let i = 0; i < 3; i++) {
      tone({ freq: 950, type: 'square', attack: 0.005, decay: 0.1, vol: 0.06, delay: i * 0.26 });
      tone({ freq: 720, type: 'square', attack: 0.005, decay: 0.1, vol: 0.06, delay: i * 0.26 + 0.13 });
    }
  },
  splash: () => {
    noise({ attack: 0.01, decay: 0.8, vol: 0.4, filter: 'lowpass', freq: 3000, to: 300 });
    tone({ freq: 90, to: 45, decay: 0.4, vol: 0.3 });
  },
  radio: () => tone({ freq: 1500, type: 'sine', attack: 0.002, decay: 0.07, vol: 0.12 }),
  powerUp: () => tone({ freq: 200, to: 900, type: 'sawtooth', attack: 0.01, decay: 0.35, vol: 0.06 }),
  switch: () => {
    noise({ decay: 0.03, vol: 0.3, freq: 4000 });
    tone({ freq: 300, type: 'square', decay: 0.03, vol: 0.05 });
  },
  inflate: () => noise({ attack: 0.2, decay: 0.5, vol: 0.2, freq: 400, to: 1600, q: 2 }),
  ignition: () => {
    noise({ attack: 0.3, decay: 2.5, vol: 0.5, filter: 'lowpass', freq: 250, to: 120 });
    tone({ freq: 55, to: 40, attack: 0.2, decay: 2.5, vol: 0.35 });
  },
  fanfare: () => {
    const seq = [523, 523, 659, 784, 659, 784, 1047];
    seq.forEach((f, i) => tone({ freq: f, type: 'triangle', decay: 0.22, vol: 0.18, delay: i * 0.12 }));
    [523, 659, 784, 1047].forEach((f) => tone({ freq: f, type: 'sine', attack: 0.05, decay: 1.6, vol: 0.08, delay: 0.9 }));
  },
  type: () => tone({ freq: 1800 + Math.random() * 400, type: 'sine', decay: 0.015, vol: 0.02 })
};

// A continuous rocket/engine rumble whose loudness can be changed while playing.
function makeRumble({ freq = 220, vol = 0.3 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = 0.0001;
  src.connect(f).connect(g).connect(sfxBus);
  src.start();
  const handle = {
    level: 0,
    set(level, pitch = null) {
      handle.level = level;
      if (paused) return;
      g.gain.setTargetAtTime(Math.max(0.0001, level * vol), now(), 0.08);
      if (pitch) f.frequency.setTargetAtTime(pitch, now(), 0.1);
    },
    stop() {
      try {
        g.gain.setTargetAtTime(0.0001, now(), 0.1);
        src.stop(now() + 0.5);
      } catch {
        /* already stopped */
      }
      loops.delete(handle);
    },
    _mute(m) {
      g.gain.setTargetAtTime(m ? 0.0001 : Math.max(0.0001, handle.level * vol), now(), 0.05);
    }
  };
  loops.add(handle);
  return handle;
}

// ---------- background music ----------
// Soft, low ambient pads made on the fly. Each kind of screen has its own mood;
// switching screens cross-fades to the new one.
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
const THEMES = {
  menu: { bar: 8, cutoff: 1100, wave: 'triangle', level: 0.45, sparkle: 0.5,
    chords: [[48, 60, 64, 67, 71], [45, 57, 60, 64, 67], [41, 53, 57, 60, 64], [43, 55, 59, 62, 64]] },
  story: { bar: 9, cutoff: 900, wave: 'triangle', level: 0.4, sparkle: 0.3,
    chords: [[41, 57, 60, 64], [40, 55, 60, 64], [38, 57, 60, 62], [34, 53, 58, 62]] },
  lab: { bar: 6, cutoff: 1250, wave: 'triangle', level: 0.38, arp: 0.42,
    chords: [[38, 57, 60, 64, 65], [43, 57, 60, 62, 65], [36, 55, 59, 62, 64], [33, 55, 60, 64, 59]] },
  sky: { bar: 6, cutoff: 1500, wave: 'triangle', level: 0.4, arp: 0.55, sparkle: 0.3,
    chords: [[36, 55, 60, 62, 64], [43, 55, 59, 62, 67], [45, 55, 60, 64], [41, 57, 60, 67]] },
  space: { bar: 12, cutoff: 750, wave: 'sine', level: 0.5, sparkle: 0.7,
    chords: [[36, 43, 51, 62], [32, 44, 51, 55, 60], [29, 41, 48, 55, 56], [31, 43, 50, 55, 60]] },
  tension: { bar: 8, cutoff: 650, wave: 'triangle', level: 0.42, pulse: 0.86,
    chords: [[33, 45, 52, 57, 60], [29, 41, 53, 57, 60], [26, 38, 50, 53, 57], [28, 40, 52, 56, 59]] },
  moon: { bar: 12, cutoff: 800, wave: 'sine', level: 0.5, sparkle: 0.45,
    chords: [[36, 43, 55, 62], [34, 41, 53, 60], [31, 38, 50, 57], [33, 40, 52, 59]] },
  ocean: { bar: 9, cutoff: 1000, wave: 'triangle', level: 0.4, waves: true, sparkle: 0.15,
    chords: [[38, 50, 57, 61, 64], [35, 50, 54, 57, 62], [31, 50, 55, 59, 62], [33, 49, 52, 57, 61]] },
  triumph: { bar: 4, cutoff: 1800, wave: 'triangle', level: 0.4, arp: 0.25, sparkle: 0.3,
    chords: [[36, 55, 60, 64, 67], [41, 57, 60, 65, 69], [43, 55, 59, 62, 67], [36, 52, 60, 64, 72]] }
};
const PENT = [72, 74, 76, 79, 81, 84];
let wantedTheme = null;
let ducked = false; // quieter while Captain Nova speaks
let hushed = false; // silent while a NASA film plays
const musicLevel = (level) => (hushed ? 0.0001 : ducked ? level * 0.35 : level);

function startTheme(name) {
  const th = THEMES[name] || THEMES.story;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = th.cutoff;
  const out = ctx.createGain();
  out.gain.value = 0.0001;
  // a gentle echo gives the pads some space
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.33;
  const fb = ctx.createGain();
  fb.gain.value = 0.28;
  const wet = ctx.createGain();
  wet.gain.value = 0.22;
  filter.connect(out);
  filter.connect(delay);
  delay.connect(fb).connect(delay);
  delay.connect(wet).connect(out);
  out.connect(musicBus);
  out.gain.setTargetAtTime(musicLevel(th.level), now(), 1.2);

  let i = 0;
  let chord = th.chords[0];
  const running = () => ctx.state === 'running';
  const playChord = () => {
    if (!running()) return;
    chord = th.chords[i % th.chords.length];
    i++;
    const t = now();
    const len = th.bar + 1.5;
    const peak = 0.14 / Math.sqrt(chord.length);
    chord.forEach((m, k) => {
      [-5, 5].forEach((det) => {
        const o = ctx.createOscillator();
        o.type = k === 0 ? 'sine' : th.wave;
        o.frequency.value = midi(m);
        o.detune.value = det;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(peak, t + th.bar * 0.3);
        g.gain.setValueAtTime(peak, t + th.bar * 0.75);
        g.gain.exponentialRampToValueAtTime(0.0001, t + len);
        o.connect(g).connect(filter);
        o.start(t);
        o.stop(t + len + 0.1);
      });
    });
    if (th.sparkle) {
      for (let k = 0; k < 3; k++) {
        if (Math.random() < th.sparkle) tone({ freq: midi(PENT[Math.floor(Math.random() * PENT.length)]), type: 'sine', attack: 0.01, decay: 1.6, vol: 0.035, delay: 0.8 + k * (th.bar / 3) + Math.random(), bus: filter });
      }
    }
    if (th.waves) {
      // soft sea swell
      const src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'lowpass';
      bp.frequency.setValueAtTime(300, t);
      bp.frequency.linearRampToValueAtTime(900, t + th.bar * 0.45);
      bp.frequency.linearRampToValueAtTime(300, t + th.bar);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.1, t + th.bar * 0.45);
      g.gain.exponentialRampToValueAtTime(0.0001, t + th.bar);
      src.connect(bp).connect(g).connect(out);
      src.start(t, Math.random());
      src.stop(t + th.bar + 0.1);
    }
  };
  const timers = [setInterval(playChord, th.bar * 1000)];
  if (th.arp) {
    let step = 0;
    timers.push(
      setInterval(() => {
        if (!running()) return;
        const upper = chord.slice(1);
        const m = upper[step % upper.length] + 12;
        step++;
        tone({ freq: midi(m), type: 'sine', attack: 0.005, decay: 0.5, vol: 0.03, bus: filter });
      }, th.arp * 1000)
    );
  }
  if (th.pulse) {
    timers.push(
      setInterval(() => {
        if (!running()) return;
        tone({ freq: midi(chord[0] + 12), type: 'sine', attack: 0.01, decay: 0.35, vol: 0.08, bus: filter });
      }, th.pulse * 1000)
    );
  }
  playChord();
  return {
    name,
    stop() {
      timers.forEach(clearInterval);
      out.gain.setTargetAtTime(0.0001, now(), 0.6);
      setTimeout(() => out.disconnect(), 3000);
    },
    update() {
      out.gain.setTargetAtTime(musicLevel(th.level), now(), hushed ? 0.15 : 0.4);
    }
  };
}

function setTheme(name) {
  wantedTheme = name;
  if (!ctx || ctx.state !== 'running') return; // starts after the first tap/click
  if (music && music.name === name) return;
  if (music) music.stop();
  music = startTheme(name);
}

export const Sfx = {
  play(name) {
    if (!ensure() || paused) return;
    if (ctx.state === 'suspended') ctx.resume();
    const fn = SOUNDS[name];
    if (fn) {
      try {
        fn();
      } catch {
        /* never let a sound crash the game */
      }
    }
  },
  rumble(opts) {
    if (!ensure()) return { set() {}, stop() {} };
    return makeRumble(opts);
  },
  stopLoops() {
    [...loops].forEach((l) => l.stop());
  },
  setPaused(p) {
    paused = p;
    loops.forEach((l) => l._mute(p));
  },
  // Background mood for the current screen: menu, story, lab, sky, space, tension, moon, ocean, triumph.
  setMusic(name) {
    wantedTheme = name;
    if (ctx) setTheme(name); // otherwise it starts on the first tap/click
  },
  startMusic() {
    this.setMusic(wantedTheme || 'menu');
  },
  stopMusic() {
    wantedTheme = null;
    if (music) music.stop();
    music = null;
  },
  duckMusic(on) {
    ducked = on;
    if (music) music.update();
  },
  // Silences the music while a NASA film (which has its own sound) is playing.
  hushMusic(on) {
    hushed = on;
    if (music) music.update();
  },
  get context() {
    return ctx;
  }
};
