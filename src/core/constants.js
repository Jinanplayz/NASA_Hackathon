// Shared constants. The whole game is designed on a 1280 x 720 "logical" stage.
// The real canvas is RES times bigger so text and shapes stay crisp on
// high-resolution phones and big monitors; every scene zooms its camera by RES.

import { Settings } from './Settings.js';

export const W = 1280;
export const H = 720;

// Screen pixels per layout pixel when the game fills the whole screen.
function fullScreenPixels() {
  const dpr = window.devicePixelRatio || 1;
  const long = Math.max(window.screen?.width || W, window.screen?.height || H);
  const short = Math.min(window.screen?.width || W, window.screen?.height || H);
  return Math.min(long / W, short / H) * dpr;
}

// Art textures are painted TEX times larger than their logical size and shown scaled down
// (see art/core.js): 3x on big high-resolution screens (4K monitors, retina laptops), otherwise 2x.
export const TEX = Settings.get('sharp') !== false && fullScreenPixels() > 2.25 ? 3 : 2;

export let RES = 1;

// Canvas pixels per layout pixel. It matches the screen pixels the game actually covers, so
// the browser never has to stretch the picture (which makes it blurry). Up to 3x (a 4K
// screen); 1.5x with "Sharp graphics" turned off. Updated when the window changes (core/Display.js).
export function computeRes() {
  const dpr = window.devicePixelRatio || 1;
  const box = document.getElementById('game');
  const w = (box && box.clientWidth) || window.innerWidth;
  const h = (box && box.clientHeight) || window.innerHeight;
  const max = Settings.get('sharp') === false ? 1.5 : 3;
  const res = Math.min(max, Math.max(1, Math.min(w / W, h / H) * dpr));
  RES = Math.round(W * res) / W; // a whole number of canvas pixels
  return RES;
}

export const COLORS = {
  bg: 0x070b1d,
  bg2: 0x0e1533,
  panel: 0x141d42,
  panel2: 0x1b275a,
  stroke: 0x2e3f85,
  white: 0xf4f6ff,
  dim: 0xaab3d9,
  cyan: 0x4fd1ff,
  blue: 0x3b82f6,
  orange: 0xff9f43,
  green: 0x3ddc97,
  red: 0xff6b6b,
  yellow: 0xffd166,
  purple: 0xa78bfa,
  pink: 0xff7eb6,
  black: 0x000000
};

export const CSS = {
  text: '#f4f6ff',
  dim: '#aab3d9',
  cyan: '#4fd1ff',
  orange: '#ff9f43',
  green: '#3ddc97',
  red: '#ff6b6b',
  yellow: '#ffd166',
  purple: '#a78bfa',
  pink: '#ff7eb6',
  dark: '#070b1d'
};

export const FONT = 'Lexend, "Segoe UI", system-ui, -apple-system, sans-serif';

export const DEPTH = {
  bg: 0,
  world: 10,
  fx: 50,
  ui: 500,
  hud: 800,
  guide: 900,
  modal: 1000,
  toast: 1100,
  focus: 2000
};

export function hex(c) {
  return '#' + c.toString(16).padStart(6, '0');
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function lerpColor(c1, c2, t) {
  const r1 = (c1 >> 16) & 255, g1 = (c1 >> 8) & 255, b1 = c1 & 255;
  const r2 = (c2 >> 16) & 255, g2 = (c2 >> 8) & 255, b2 = c2 & 255;
  const r = Math.round(lerp(r1, r2, t)), g = Math.round(lerp(g1, g2, t)), b = Math.round(lerp(b1, b2, t));
  return (r << 16) | (g << 8) | b;
}

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Small deterministic random generator so procedural art looks the same every time.
export function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const isTouch = () => window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window;
