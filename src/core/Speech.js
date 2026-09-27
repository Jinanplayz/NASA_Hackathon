// Narration. For every line, in this order:
//   1. a voice file named in the config ("audio": "audio/my-line.mp3"), if any
//   2. the pre-recorded Captain Nova voice (content/voice/manifest.json, made by `npm run voices`)
//   3. the browser's built-in text-to-speech, as a last resort
// Every spoken line is always shown on screen too (captions for everyone).

import { Settings } from './Settings.js';
import { Sfx } from './Sfx.js';
import { Content } from './Content.js';
import { speechParts, voiceKey } from './voiceText.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
let voice = null;
let token = 0;
let watchdog = null;
let cancelCurrent = null;
// Pausing: a recorded line stops where it is and carries on from there; a browser-voice
// sentence is stopped and said again from its start (browsers can't reliably pause speech).
let paused = false;
let pausedTTS = false;
let current = null; // the recorded line playing now: { el, arm }
let resumeWaiters = [];

function whenResumed() {
  return paused ? new Promise((r) => resumeWaiters.push(r)) : Promise.resolve();
}

// ---------- browser voice (fallback) ----------
// Prefer calm, natural-sounding female English voices when the device has them.
const PREFERRED = [
  /Aria Online \(Natural\)/i,
  /Jenny Online \(Natural\)/i,
  /(Natural|Neural)\).*English/i,
  /Samantha|Ava|Allison|Susan/i,
  /Google US English/i,
  /Zira/i,
  /Google UK English Female/i
];

function pickVoice() {
  if (!synth) return;
  const voices = synth.getVoices().filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
  if (!voices.length) return;
  for (const re of PREFERRED) {
    const v = voices.find((x) => re.test(x.name));
    if (v) {
      voice = v;
      return;
    }
  }
  voice = voices.find((v) => v.lang === 'en-US') || voices[0];
}

if (synth) {
  pickVoice();
  synth.onvoiceschanged = pickVoice;
}

// Chrome stops long utterances after ~15 seconds, so the browser voice speaks sentence by sentence.
function sentences(text) {
  const parts = text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [text];
  return parts.map((s) => s.trim()).filter(Boolean);
}

export function estimateMs(text) {
  const rate = Settings.get('voiceRate') || 1;
  const t = speechParts(text).map((p) => p.text).join(' ');
  return Math.max(1800, (t.length * 66) / rate + 500);
}

function speakTTS(text, my) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      cancelCurrent = null;
      resolve(pausedTTS ? 'paused' : ok);
    };
    cancelCurrent = () => done(false);
    // Safety net in case the browser never reports that speaking ended.
    clearTimeout(watchdog);
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
      watchdog = setTimeout(() => done(true), estimateMs(text));
      return;
    }
    watchdog = setTimeout(() => done(true), estimateMs(text) * 1.8 + 2500);
    if (!voice) pickVoice();
    const parts = sentences(text);
    synth.cancel();
    // A tiny delay avoids a Chrome bug where speak() right after cancel() is ignored.
    setTimeout(() => {
      if (settled) return; // paused or stopped in the meantime
      if (my !== token) return done(false);
      parts.forEach((p, i) => {
        const u = new SpeechSynthesisUtterance(p);
        if (voice) u.voice = voice;
        u.lang = voice ? voice.lang : 'en-US';
        u.rate = (Settings.get('voiceRate') || 1) * 0.95;
        u.pitch = 1;
        if (i === parts.length - 1) {
          u.onend = () => done(true);
          u.onerror = () => done(false);
        }
        synth.speak(u);
      });
    }, 60);
  });
}

// ---------- recorded voice ----------
// Two reusable <audio> players: one plays while the other loads the next piece.
// Reusing them (instead of creating new ones) keeps iPhones and iPads happy.
const players = typeof Audio !== 'undefined' ? [new Audio(), new Audio()] : [];
players.forEach((p) => {
  p.preload = 'auto';
  p.preservesPitch = true;
  p.webkitPreservesPitch = true;
});
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
let unlocked = false;

function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  players.forEach((p) => {
    if (p.src) return;
    p.src = SILENT;
    // only pause if a real line hasn't already started on this player
    p.play().then(() => p.src === SILENT && p.pause()).catch(() => {});
  });
}
if (typeof window !== 'undefined') {
  ['pointerdown', 'keydown', 'touchend'].forEach((ev) => window.addEventListener(ev, unlockAudio, { passive: true }));
}

const reportedMissing = new Set();
function recordingFor(part) {
  const files = Content.voice && Content.voice.files;
  const f = files && files[voiceKey(part)];
  if (files && !f && !reportedMissing.has(part)) {
    // Helps the team spot lines that need `npm run voices` after editing the text.
    reportedMissing.add(part);
    console.info('[voice] no recording yet, using the browser voice for:', part);
  }
  return f ? `content/${f}` : null;
}

function absolute(url) {
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return url;
  }
}

function preload(url) {
  if (!url || !players.length) return;
  const abs = absolute(url);
  if (players.some((p) => p.src === abs)) return;
  const idle = players.find((p) => p.paused) || players[1];
  idle.src = url;
  idle.load();
}

function playFile(url, my) {
  return new Promise((resolve) => {
    if (!players.length) return resolve(false);
    const abs = absolute(url);
    const el = players.find((p) => p.src === abs) || players.find((p) => p.paused) || players[0];
    let settled = false;
    let safety = null;
    const cleanup = () => {
      el.onended = null;
      el.onerror = null;
      el.onloadedmetadata = null;
      clearTimeout(safety);
      if (current && current.el === el) current = null;
    };
    const done = (ok) => {
      if (settled) return;
      settled = true;
      cleanup();
      cancelCurrent = null;
      resolve(ok);
    };
    cancelCurrent = () => {
      el.pause();
      done(false);
    };
    if (el.src !== abs) el.src = url;
    el.playbackRate = Settings.get('voiceRate') || 1;
    el.onended = () => done(true);
    el.onerror = () => done(false);
    // never get stuck if "ended" doesn't arrive
    const arm = () => {
      clearTimeout(safety);
      if (paused) return;
      const secs = isFinite(el.duration) ? (el.duration - (el.currentTime || 0)) / el.playbackRate : 30;
      safety = setTimeout(() => done(true), secs * 1000 + 3000);
    };
    const hold = () => clearTimeout(safety);
    current = { el, arm, hold };
    safety = setTimeout(() => done(true), 35000);
    if (el.readyState >= 1) arm();
    else el.onloadedmetadata = arm;
    try {
      el.currentTime = 0;
    } catch {
      /* not loaded yet */
    }
    el.play().catch(() => done(false));
    if (my !== token) done(false);
  });
}

export const Speech = {
  // text can be a string or a list of pieces (spoken one after another). Pieces made with
  // live('...') (numbers that change every game) always use the browser voice.
  // Returns a promise that resolves when everything has been said (or was stopped).
  say(text, { audio = null, force = false } = {}) {
    this.stop();
    const my = ++token;
    const parts = speechParts(text);
    if (!parts.length || (!Settings.get('readAloud') && !force)) return Promise.resolve(false);

    Sfx.duckMusic(true);
    return (async () => {
      let ok = true;
      // browser voice, said again from the start of the sentence if a pause cut it off
      const tts = async (text) => {
        for (;;) {
          await whenResumed();
          if (my !== token) return false;
          const r = await speakTTS(text, my);
          if (r !== 'paused') return r;
        }
      };
      if (audio) {
        ok = await playFile(audio, my);
        if (!ok && my === token) ok = await tts(parts.map((p) => p.text).join(' '));
      } else {
        const files = parts.map((p) => (p.live ? null : recordingFor(p.text)));
        for (let i = 0; i < parts.length; i++) {
          await whenResumed();
          if (my !== token) return false;
          // start this piece, then quietly load the next one while it plays
          const playing = files[i] ? playFile(files[i], my) : null;
          preload(files[i + 1]);
          const played = playing ? await playing : false;
          if (my !== token) return false;
          // live numbers, or a missing/failed recording: use the browser voice for this piece
          if (!played) ok = (await tts(parts[i].text)) && ok;
        }
      }
      if (my === token) Sfx.duckMusic(false);
      return my === token && ok;
    })();
  },

  // Pause and carry on later (the pause button and the pause menu).
  pause() {
    if (paused) return;
    paused = true;
    if (current) {
      current.hold();
      current.el.pause();
    } else if (cancelCurrent && synth) {
      // a browser-voice sentence: stop it now and say it again when resumed
      pausedTTS = true;
      cancelCurrent();
      try {
        synth.cancel();
      } catch {
        /* ignore */
      }
      pausedTTS = false;
    }
  },

  resume() {
    if (!paused) return;
    paused = false;
    if (current) {
      current.el.play().catch(() => {});
      current.arm();
    }
    const waiters = resumeWaiters;
    resumeWaiters = [];
    waiters.forEach((r) => r());
  },

  get paused() {
    return paused;
  },

  stop() {
    token++;
    // anything waiting for a resume just finishes (it sees the new token)
    paused = false;
    const waiters = resumeWaiters;
    resumeWaiters = [];
    waiters.forEach((r) => r());
    clearTimeout(watchdog);
    if (cancelCurrent) cancelCurrent();
    cancelCurrent = null;
    if (synth) {
      try {
        synth.cancel();
      } catch {
        /* ignore */
      }
    }
    players.forEach((p) => {
      if (!p.paused) p.pause();
    });
    Sfx.duckMusic(false);
  },

  // true when the recorded Captain Nova voice is installed
  get hasRecordings() {
    return !!(Content.voice && Content.voice.files && Object.keys(Content.voice.files).length);
  },

  get available() {
    return !!synth || this.hasRecordings;
  }
};
