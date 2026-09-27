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

// Screens wider than 16:9 (phones) or taller (tablets) show extra background around the
// 1280 x 720 stage instead of black bars. Buttons and text stay on the stage; backgrounds are
// drawn this much bigger on every side (enough for screens from about 1.2:1 to 2.4:1).
export const BLEED_X = 240;
export const BLEED_Y = 180;
export const FULL = { x: -BLEED_X, y: -BLEED_Y, w: W + BLEED_X * 2, h: H + BLEED_Y * 2 };

export let RES = 1;
// The canvas size in pixels: the stage plus whatever extra background the screen's shape shows.
export const VIEW = { w: W, h: H };

// Canvas pixels per layout pixel. It matches the screen pixels the game actually covers, so
// the browser never has to stretch the picture (which makes it blurry). Up to 3x (a 4K
// screen); 1.5x with "Sharp graphics" turned off. Updated when the window changes (core/Display.js).
export function computeRes() {
  const dpr = window.devicePixelRatio || 1;
  const box = document.getElementById('game');
  let w = (box && box.clientWidth) || window.innerWidth;
  let h = (box && box.clientHeight) || window.innerHeight;
  // not laid out yet (e.g. opened in a background tab): assume 16:9 until the window has a
  // real size (the game re-fits itself as soon as it does, see core/Display.js)
  if (!(w > 0 && h > 0)) {
    w = W;
    h = H;
  }
  // how much of the world fits the screen's shape: all of the stage, plus extra background
  const aspect = Math.min(FULL.w / H, Math.max(W / FULL.h, w / h));
  const viewW = aspect >= W / H ? H * aspect : W;
  const viewH = aspect >= W / H ? H : W / aspect;
  const max = Settings.get('sharp') === false ? 1.5 : 3;
  RES = Math.min(max, Math.max(1, Math.min(w / viewW, h / viewH) * dpr));
  VIEW.w = Math.round(viewW * RES);
  VIEW.h = Math.round(viewH * RES);
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
