// Helpers for painting textures with the Canvas 2D API at startup.
// Textures are painted TEX times larger than their "logical" size and displayed
// at 1/TEX scale, so they stay sharp on high-resolution screens.

import { TEX } from '../core/constants.js';

// density: how many texture pixels per logical pixel (soft effects like smoke keep a fixed 2).
export function makeTex(scene, key, w, h, draw, density = TEX) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const ct = scene.textures.createCanvas(key, Math.ceil(w * density), Math.ceil(h * density));
  const ctx = ct.getContext();
  ctx.save();
  ctx.scale(density, density);
  draw(ctx, w, h);
  ctx.restore();
  ct.refresh();
  return ct;
}

// Adds an art image at its logical size.
export function img(scene, x, y, key, scale = 1) {
  return scene.add.image(x, y, key).setScale(scale / TEX);
}

// Logical (display) size of a texture.
export function texSize(scene, key) {
  const f = scene.textures.getFrame(key);
  return { w: f.width / TEX, h: f.height / TEX };
}

// Scale an image so it fits inside a box (logical px).
export function fitImage(image, maxW, maxH) {
  const f = image.frame;
  const s = Math.min(maxW / f.width, maxH / f.height);
  image.setScale(s);
  return image;
}

// ---------- colour helpers ----------
export function rgb(hex) {
  const n = typeof hex === 'number' ? hex : parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex, a = 1) {
  const [r, g, b] = rgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

export function shadeHex(hex, amt) {
  const [r, g, b] = rgb(hex);
  const f = (c) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

// Horizontal gradient that makes a flat shape look like a lit cylinder.
export function cylGrad(ctx, x, w, base, strength = 1) {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, shadeHex(base, -0.45 * strength));
  g.addColorStop(0.3, shadeHex(base, 0.3 * strength));
  g.addColorStop(0.55, shadeHex(base, 0.05));
  g.addColorStop(1, shadeHex(base, -0.55 * strength));
  return g;
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
}

export function poly(ctx, pts) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

// Smooth random blob (continents, rocks, clouds).
export function blob(ctx, cx, cy, r, rnd, points = 12, rough = 0.35) {
  const pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const rr = r * (1 - rough + rnd() * rough * 2);
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  ctx.beginPath();
  for (let i = 0; i <= points; i++) {
    const p0 = pts[i % points];
    const p1 = pts[(i + 1) % points];
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.quadraticCurveTo(p0[0], p0[1], mx, my);
  }
  ctx.closePath();
}

export function radial(ctx, x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}

export function linear(ctx, x0, y0, x1, y1, stops) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, c]) => g.addColorStop(o, c));
  return g;
}
