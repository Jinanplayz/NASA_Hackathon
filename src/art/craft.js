// Spacecraft and spacecraft parts, painted with Canvas 2D.
// Each draw function paints inside the box (x, y, w, h) with the nose pointing up.

import { makeTex, cylGrad, roundRect, circle, poly, radial, linear, blob } from './core.js';
import { seeded } from '../core/constants.js';

const WHITE = '#eef1f7';
const DARK = '#1d2029';

function frustum(c, cx, yTop, yBot, wTop, wBot, fill) {
  c.fillStyle = fill;
  poly(c, [[cx - wTop / 2, yTop], [cx + wTop / 2, yTop], [cx + wBot / 2, yBot], [cx - wBot / 2, yBot]]);
  c.fill();
}

function cylinder(c, cx, y, w, h, base, strength = 1) {
  c.fillStyle = cylGrad(c, cx - w / 2, w, base, strength);
  c.fillRect(cx - w / 2, y, w, h);
}

function nozzle(c, cx, y, wTop, wBot, h, color = '#3b3f4a') {
  c.fillStyle = cylGrad(c, cx - wBot / 2, wBot, color);
  poly(c, [[cx - wTop / 2, y], [cx + wTop / 2, y], [cx + wBot / 2, y + h], [cx - wBot / 2, y + h]]);
  c.fill();
}

function verticalText(c, text, x, y, size, color) {
  c.save();
  c.translate(x, y);
  c.rotate(-Math.PI / 2);
  c.fillStyle = color;
  c.font = `700 ${size}px Lexend, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 0, 0);
  c.restore();
}

// ---------------- Mercury-Redstone (Freedom 7) ----------------
export function drawRedstone(c, x, y, w, h) {
  const cx = x + w / 2, bw = w * 0.72;
  const bodyBot = y + h * 0.93;
  cylinder(c, cx, y, bw, bodyBot - y, WHITE);
  // adapter ring & bands
  c.fillStyle = '#8f96a6';
  c.fillRect(cx - bw / 2, y, bw, h * 0.012);
  c.fillStyle = DARK;
  c.fillRect(cx - bw / 2, y + h * 0.11, bw, h * 0.008);
  c.fillRect(cx - bw / 2, y + h * 0.3, bw, h * 0.006);
  verticalText(c, 'UNITED STATES', cx + bw * 0.12, y + h * 0.55, Math.max(5, bw * 0.2), '#2a2f3a');
  // fins
  c.fillStyle = DARK;
  poly(c, [[cx - bw / 2, bodyBot - h * 0.13], [cx - w / 2, bodyBot], [cx - bw / 2, bodyBot]]);
  c.fill();
  poly(c, [[cx + bw / 2, bodyBot - h * 0.13], [cx + w / 2, bodyBot], [cx + bw / 2, bodyBot]]);
  c.fill();
  c.fillRect(cx - bw * 0.06, bodyBot - h * 0.12, bw * 0.12, h * 0.12);
  nozzle(c, cx, bodyBot, bw * 0.45, bw * 0.62, h * 0.07);
}

export function drawMercuryCapsule(c, x, y, w, h) {
  const cx = x + w / 2;
  // recovery / antenna section
  cylinder(c, cx, y + h * 0.04, w * 0.36, h * 0.24, '#555b69');
  c.fillStyle = '#6a7182';
  c.beginPath();
  c.ellipse(cx, y + h * 0.05, w * 0.18, h * 0.05, 0, Math.PI, 0);
  c.fill();
  // conical body
  const grad = cylGrad(c, cx - w * 0.47, w * 0.94, '#3d4350');
  frustum(c, cx, y + h * 0.27, y + h * 0.9, w * 0.42, w * 0.94, grad);
  // shingles
  c.strokeStyle = 'rgba(255,255,255,0.14)';
  c.lineWidth = Math.max(0.6, h * 0.012);
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    const yy = y + h * (0.27 + 0.63 * t);
    const ww = w * (0.42 + 0.52 * t);
    c.beginPath();
    c.moveTo(cx - ww / 2, yy);
    c.lineTo(cx + ww / 2, yy);
    c.stroke();
  }
  // window
  c.fillStyle = '#7fd4ff';
  poly(c, [[cx - w * 0.09, y + h * 0.42], [cx + w * 0.09, y + h * 0.42], [cx + w * 0.12, y + h * 0.56], [cx - w * 0.12, y + h * 0.56]]);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.6)';
  c.fillRect(cx - w * 0.07, y + h * 0.44, w * 0.04, h * 0.1);
  // base rim
  c.fillStyle = '#8c93a3';
  c.fillRect(cx - w * 0.47, y + h * 0.88, w * 0.94, h * 0.05);
}

export function drawHeatShield(c, x, y, w, h) {
  const cx = x + w / 2;
  c.fillStyle = radial(c, cx - w * 0.2, y, 2, w * 0.6, [[0, '#e0a060'], [1, '#8a4f22']]);
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + w, y);
  c.quadraticCurveTo(cx, y + h * 2, x, y);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.3)';
  c.lineWidth = 1;
  c.stroke();
}

export function drawRetroPack(c, x, y, w, h) {
  const cx = x + w / 2, r = Math.min(h * 0.42, w * 0.16);
  // straps
  c.strokeStyle = '#2a2d36';
  c.lineWidth = Math.max(1, h * 0.12);
  c.beginPath();
  c.moveTo(x + w * 0.05, y + h * 0.1);
  c.lineTo(x + w * 0.95, y + h * 0.1);
  c.stroke();
  [-1, 0, 1].forEach((k) => {
    const sx = cx + k * r * 2.1;
    c.fillStyle = radial(c, sx - r * 0.35, y + h * 0.4, 1, r * 1.2, [[0, '#ffffff'], [1, '#8d95a5']]);
    circle(c, sx, y + h * 0.5, r);
    c.fill();
    c.fillStyle = '#3b3f4a';
    c.fillRect(sx - r * 0.35, y + h * 0.5 + r * 0.8, r * 0.7, h * 0.18);
  });
}

export function drawParachutePack(c, x, y, w, h) {
  const cx = x + w / 2;
  cylinder(c, cx, y + h * 0.18, w * 0.8, h * 0.82, '#5d6475');
  c.fillStyle = '#7b8397';
  c.beginPath();
  c.ellipse(cx, y + h * 0.2, w * 0.4, h * 0.2, 0, Math.PI, 0);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.3)';
  c.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    c.beginPath();
    c.moveTo(cx - w * 0.4, y + h * (0.2 + i * 0.2));
    c.lineTo(cx + w * 0.4, y + h * (0.2 + i * 0.2));
    c.stroke();
  }
  // parachute peeking out
  c.fillStyle = '#ff9f43';
  c.fillRect(cx - w * 0.12, y + h * 0.02, w * 0.24, h * 0.12);
}

export function drawEscapeTower(c, x, y, w, h, color = '#e0452b') {
  const cx = x + w / 2;
  const topY = y + h * 0.36, botY = y + h;
  const wTop = w * 0.3, wBot = w * 0.92;
  c.strokeStyle = color;
  c.lineWidth = Math.max(1, w * 0.07);
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(cx - wBot / 2, botY);
  c.lineTo(cx - wTop / 2, topY);
  c.moveTo(cx + wBot / 2, botY);
  c.lineTo(cx + wTop / 2, topY);
  c.stroke();
  // cross bracing
  c.lineWidth = Math.max(0.8, w * 0.045);
  const n = 6;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const y0 = botY - (botY - topY) * t0, y1 = botY - (botY - topY) * t1;
    const w0 = wBot - (wBot - wTop) * t0, w1 = wBot - (wBot - wTop) * t1;
    c.beginPath();
    c.moveTo(cx - w0 / 2, y0);
    c.lineTo(cx + w1 / 2, y1);
    c.moveTo(cx + w0 / 2, y0);
    c.lineTo(cx - w1 / 2, y1);
    c.stroke();
  }
  // escape rocket motor
  cylinder(c, cx, y + h * 0.08, w * 0.34, h * 0.3, '#d9dde6');
  c.fillStyle = '#d9dde6';
  poly(c, [[cx - w * 0.17, y + h * 0.08], [cx, y], [cx + w * 0.17, y + h * 0.08]]);
  c.fill();
  c.fillStyle = color;
  c.fillRect(cx - w * 0.17, y + h * 0.3, w * 0.34, h * 0.03);
}

export function drawMercuryRedstone(c, x, y, w, h, withBooster = true) {
  const s = h / (withBooster ? 500 : 182);
  const cx = x + w / 2;
  const part = (fn, pw, py, ph) => fn(c, cx - (pw * s) / 2, y + py * s, pw * s, ph * s);
  part(drawEscapeTower, 22, 0, 96);
  part(drawParachutePack, 18, 94, 22);
  part(drawMercuryCapsule, 44, 112, 58);
  part(drawHeatShield, 42, 164, 6);
  part(drawRetroPack, 34, 168, 13);
  if (withBooster) part(drawRedstone, 60, 180, 320);
}

// ---------------- Explorer 1 & Juno I ----------------
export function drawExplorer1(c, x, y, w, h) {
  // vertical, nose up. w is the diameter.
  const cx = x + w / 2;
  const noseH = h * 0.14, instH = h * 0.46, motorH = h * 0.36;
  c.fillStyle = cylGrad(c, cx - w / 2, w, '#e8ebf2');
  poly(c, [[cx, y], [cx + w / 2, y + noseH], [cx - w / 2, y + noseH]]);
  c.fill();
  cylinder(c, cx, y + noseH, w, instH, '#eef1f7');
  c.fillStyle = '#23324f';
  for (let i = 0; i < 6; i++) c.fillRect(cx - w / 2, y + noseH + instH * (0.08 + i * 0.15), w, instH * 0.06);
  cylinder(c, cx, y + noseH + instH, w, motorH, '#9aa1ae');
  nozzle(c, cx, y + noseH + instH + motorH, w * 0.5, w * 0.8, h * 0.04, '#4a4f5c');
  // whip antennas
  c.strokeStyle = '#cfd6e2';
  c.lineWidth = Math.max(1, w * 0.08);
  const jy = y + noseH + instH;
  c.beginPath();
  c.moveTo(cx - w / 2, jy);
  c.lineTo(cx - w * 3.2, jy - h * 0.05);
  c.moveTo(cx + w / 2, jy);
  c.lineTo(cx + w * 3.2, jy - h * 0.05);
  c.stroke();
}

export function drawJuno(c, x, y, w, h) {
  const cx = x + w / 2, bw = w * 0.62;
  // Explorer 1 on top
  drawExplorer1(c, cx - bw * 0.12, y, bw * 0.24, h * 0.16);
  // spinning "tub" of upper-stage rockets
  cylinder(c, cx, y + h * 0.15, bw * 0.72, h * 0.13, '#565c6b');
  c.fillStyle = '#c9a442';
  c.fillRect(cx - bw * 0.36, y + h * 0.2, bw * 0.72, h * 0.012);
  frustum(c, cx, y + h * 0.28, y + h * 0.31, bw * 0.72, bw, cylGrad(c, cx - bw / 2, bw, WHITE));
  // main stage
  const top = y + h * 0.31, bot = y + h * 0.94;
  cylinder(c, cx, top, bw, bot - top, WHITE);
  c.fillStyle = DARK;
  for (let i = 0; i < 4; i++) c.fillRect(cx - bw / 2, top + (bot - top) * (0.05 + i * 0.07), bw / 2, (bot - top) * 0.035);
  verticalText(c, 'UNITED STATES', cx + bw * 0.1, top + (bot - top) * 0.62, Math.max(5, bw * 0.2), '#2a2f3a');
  c.fillStyle = DARK;
  poly(c, [[cx - bw / 2, bot - h * 0.1], [cx - w / 2, bot], [cx - bw / 2, bot]]);
  c.fill();
  poly(c, [[cx + bw / 2, bot - h * 0.1], [cx + w / 2, bot], [cx + bw / 2, bot]]);
  c.fill();
  nozzle(c, cx, bot, bw * 0.45, bw * 0.62, h * 0.06);
}

// Upper stages of Juno I (the spinning "tub") with Explorer 1 on top.
export function drawJunoTop(c, x, y, w, h) {
  const cx = x + w / 2;
  drawExplorer1(c, cx - w * 0.18, y, w * 0.36, h * 0.55);
  cylinder(c, cx, y + h * 0.52, w, h * 0.42, '#565c6b');
  c.fillStyle = '#c9a442';
  c.fillRect(cx - w / 2, y + h * 0.66, w, h * 0.04);
  nozzle(c, cx, y + h * 0.94, w * 0.5, w * 0.7, h * 0.06, '#3b3f4a');
}

// ---------------- Apollo / Saturn V ----------------
export function drawLES(c, x, y, w, h) {
  drawEscapeTower(c, x, y, w, h, '#c9452f');
}

export function drawCM(c, x, y, w, h, opts = {}) {
  const cx = x + w / 2;
  const top = y + h * 0.06, base = y + h * 0.84;
  const g = cylGrad(c, cx - w / 2, w, opts.cover ? '#f2f3f6' : '#dfe3ea', 0.8);
  frustum(c, cx, top, base, w * 0.18, w, g);
  c.fillStyle = opts.cover ? '#f2f3f6' : '#cfd4dd';
  c.beginPath();
  c.ellipse(cx, top, w * 0.09, h * 0.05, 0, Math.PI, 0);
  c.fill();
  if (!opts.cover) {
    // windows
    c.fillStyle = '#28324a';
    c.fillRect(cx - w * 0.2, y + h * 0.42, w * 0.1, h * 0.1);
    c.fillRect(cx + w * 0.1, y + h * 0.42, w * 0.1, h * 0.1);
    c.fillStyle = '#7fd4ff';
    c.fillRect(cx - w * 0.19, y + h * 0.43, w * 0.04, h * 0.05);
    // hatch lines
    c.strokeStyle = 'rgba(0,0,0,0.15)';
    c.lineWidth = 1;
    c.strokeRect(cx - w * 0.08, y + h * 0.5, w * 0.16, h * 0.18);
  }
  // heat shield
  c.fillStyle = opts.hot ? '#ff8a3d' : '#6b4a33';
  c.beginPath();
  c.moveTo(x, base);
  c.lineTo(x + w, base);
  c.quadraticCurveTo(cx, y + h * 1.05, x, base);
  c.closePath();
  c.fill();
}

export function drawSM(c, x, y, w, h) {
  const cx = x + w / 2;
  cylinder(c, cx, y, w, h * 0.86, '#d7dbe3', 0.9);
  c.strokeStyle = 'rgba(80,90,110,0.35)';
  c.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    c.beginPath();
    c.moveTo(cx - w / 2 + (w * i) / 6, y + h * 0.1);
    c.lineTo(cx - w / 2 + (w * i) / 6, y + h * 0.8);
    c.stroke();
  }
  // RCS quad
  c.fillStyle = '#3b3f4a';
  c.fillRect(cx - w * 0.52, y + h * 0.18, w * 0.08, h * 0.16);
  c.fillRect(cx + w * 0.44, y + h * 0.18, w * 0.08, h * 0.16);
  nozzle(c, cx, y + h * 0.86, w * 0.3, w * 0.55, h * 0.14, '#2f323b');
}

export function drawLM(c, x, y, w, h) {
  const cx = x + w / 2;
  const rnd = seeded(12);
  // legs
  c.strokeStyle = '#b7b9bf';
  c.lineWidth = Math.max(1.2, w * 0.035);
  const legTop = y + h * 0.55, footY = y + h * 0.95;
  [[-1, 0.5], [1, 0.5]].forEach(([s]) => {
    c.beginPath();
    c.moveTo(cx + s * w * 0.3, legTop);
    c.lineTo(cx + s * w * 0.48, footY);
    c.moveTo(cx + s * w * 0.3, y + h * 0.78);
    c.lineTo(cx + s * w * 0.46, footY - h * 0.06);
    c.stroke();
    c.fillStyle = '#9ea1a8';
    c.beginPath();
    c.ellipse(cx + s * w * 0.46, footY, w * 0.07, h * 0.025, 0, 0, Math.PI * 2);
    c.fill();
  });
  // descent stage (gold foil)
  c.fillStyle = linear(c, x, 0, x + w, 0, [[0, '#8c6512'], [0.35, '#f2c74a'], [0.6, '#d9a42a'], [1, '#7d5a10']]);
  poly(c, [[cx - w * 0.32, y + h * 0.5], [cx + w * 0.32, y + h * 0.5], [cx + w * 0.36, y + h * 0.58], [cx + w * 0.32, y + h * 0.76], [cx - w * 0.32, y + h * 0.76], [cx - w * 0.36, y + h * 0.58]]);
  c.fill();
  for (let i = 0; i < 12; i++) {
    c.fillStyle = `rgba(255,240,180,${0.15 + rnd() * 0.25})`;
    c.fillRect(cx - w * 0.3 + rnd() * w * 0.58, y + h * (0.52 + rnd() * 0.22), w * 0.05, h * 0.03);
  }
  // ladder
  c.strokeStyle = '#d0d2d8';
  c.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    c.beginPath();
    c.moveTo(cx - w * 0.05, y + h * (0.77 + i * 0.045));
    c.lineTo(cx + w * 0.05, y + h * (0.77 + i * 0.045));
    c.stroke();
  }
  // ascent stage
  c.fillStyle = linear(c, x, 0, x + w, 0, [[0, '#7c808a'], [0.4, '#d8dbe1'], [1, '#6b6f78']]);
  poly(c, [[cx - w * 0.3, y + h * 0.5], [cx - w * 0.33, y + h * 0.3], [cx - w * 0.2, y + h * 0.15], [cx + w * 0.18, y + h * 0.12], [cx + w * 0.32, y + h * 0.26], [cx + w * 0.3, y + h * 0.5]]);
  c.fill();
  c.fillStyle = '#23262e';
  poly(c, [[cx - w * 0.2, y + h * 0.22], [cx - w * 0.06, y + h * 0.2], [cx - w * 0.08, y + h * 0.32], [cx - w * 0.22, y + h * 0.32]]);
  c.fill();
  c.fillStyle = '#3a3e48';
  c.fillRect(cx + w * 0.05, y + h * 0.36, w * 0.14, h * 0.12);
  // RCS thrusters & antenna
  c.fillStyle = '#23262e';
  c.fillRect(cx - w * 0.4, y + h * 0.3, w * 0.07, h * 0.04);
  c.fillRect(cx + w * 0.33, y + h * 0.3, w * 0.07, h * 0.04);
  c.strokeStyle = '#d0d2d8';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(cx + w * 0.1, y + h * 0.12);
  c.lineTo(cx + w * 0.16, y + h * 0.03);
  c.stroke();
  c.fillStyle = '#e8e8ea';
  circle(c, cx + w * 0.17, y + h * 0.03, w * 0.04);
  c.fill();
}

export function drawLMAscent(c, x, y, w, h) {
  drawLM(c, x, y - h * 0.05, w, h * 1.9);
}

function drawSaturnStage(c, cx, y, w, h, kind) {
  cylinder(c, cx, y, w, h, WHITE, 0.9);
  c.fillStyle = DARK;
  if (kind === 'sic') {
    c.fillRect(cx, y + h * 0.55, w / 2, h * 0.45);
    c.fillRect(cx - w / 2, y + h * 0.02, w, h * 0.04);
    verticalText(c, 'USA', cx - w * 0.2, y + h * 0.3, Math.max(5, w * 0.2), '#1d2029');
  } else if (kind === 'sii') {
    c.fillRect(cx - w / 2, y, w, h * 0.04);
    c.fillRect(cx - w / 2, y + h * 0.96, w, h * 0.04);
  } else if (kind === 's4b') {
    c.fillRect(cx, y + h * 0.7, w / 2, h * 0.3);
  }
}

export function drawSaturnV(c, x, y, w, h) {
  const s = h / 500;
  const cx = x + w / 2;
  const W1 = 44 * s, W3 = 29 * s, WS = 18 * s;
  drawLES(c, cx - 9 * s, y, 18 * s, 44 * s);
  drawCM(c, cx - WS / 2, y + 42 * s, WS, 16 * s, { cover: true });
  drawSM(c, cx - (WS * 0.95) / 2, y + 57 * s, WS * 0.95, 30 * s);
  frustum(c, cx, y + 86 * s, y + 124 * s, WS, W3, cylGrad(c, cx - W3 / 2, W3, WHITE, 0.9));
  cylinder(c, cx, y + 124 * s, W3, 4 * s, '#9aa1ae');
  drawSaturnStage(c, cx, y + 128 * s, W3, 76 * s, 's4b');
  frustum(c, cx, y + 204 * s, y + 212 * s, W3, W1, cylGrad(c, cx - W1 / 2, W1, WHITE, 0.9));
  drawSaturnStage(c, cx, y + 212 * s, W1, 106 * s, 'sii');
  cylinder(c, cx, y + 318 * s, W1, 8 * s, '#c8ccd5');
  drawSaturnStage(c, cx, y + 326 * s, W1, 162 * s, 'sic');
  // fins & engines
  c.fillStyle = DARK;
  poly(c, [[cx - W1 / 2, y + 460 * s], [cx - w / 2, y + 492 * s], [cx - W1 / 2, y + 490 * s]]);
  c.fill();
  poly(c, [[cx + W1 / 2, y + 460 * s], [cx + w / 2, y + 492 * s], [cx + W1 / 2, y + 490 * s]]);
  c.fill();
  [-0.32, 0, 0.32].forEach((k) => nozzle(c, cx + k * W1, y + 488 * s, 8 * s, 13 * s, 12 * s, '#2c2f37'));
}

// Apollo spacecraft on its way to the Moon (horizontal, pointing right).
export function drawCsmLm(c, x, y, w, h) {
  c.save();
  c.translate(x + w / 2, y + h / 2);
  c.rotate(Math.PI / 2);
  // now drawing in a vertical box of size h (wide) x w (tall), nose up
  const vw = h, vh = w;
  const ox = -vw / 2, oy = -vh / 2;
  const d = vw * 0.5;
  // LM on top (upside down: descent stage at top)
  c.save();
  c.translate(0, oy + vh * 0.22);
  c.scale(1, -1);
  drawLM(c, -vw * 0.45, -vh * 0.22, vw * 0.9, vh * 0.44);
  c.restore();
  drawCM(c, -d / 2, oy + vh * 0.43, d, vh * 0.15);
  drawSM(c, -d / 2, oy + vh * 0.58, d, vh * 0.42);
  c.restore();
}

// Just the canopy (no cords): its bottom edge is the bottom of the picture.
export function drawCanopy(c, x, y, w, h, gores = 8) {
  const cx = x + w / 2, top = y + 2, rim = y + h - 3;
  for (let i = 0; i < gores; i++) {
    const a0 = Math.PI + (i / gores) * Math.PI, a1 = Math.PI + ((i + 1) / gores) * Math.PI;
    c.fillStyle = i % 2 ? '#ffffff' : '#ff7a2f';
    c.beginPath();
    c.moveTo(cx, rim);
    c.ellipse(cx, rim, w * 0.48, rim - top, 0, a0, a1);
    c.closePath();
    c.fill();
  }
  // a soft shadow along the rim gives the canopy some depth
  c.strokeStyle = 'rgba(0,0,0,0.18)';
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(cx, rim, w * 0.48, 3, 0, 0, Math.PI);
  c.stroke();
}

export function drawParachute(c, x, y, w, h, gores = 8) {
  const cx = x + w / 2, top = y + h * 0.05, rim = y + h * 0.45;
  for (let i = 0; i < gores; i++) {
    const a0 = Math.PI + (i / gores) * Math.PI, a1 = Math.PI + ((i + 1) / gores) * Math.PI;
    c.fillStyle = i % 2 ? '#ffffff' : '#ff7a2f';
    c.beginPath();
    c.moveTo(cx, rim);
    c.ellipse(cx, rim, w * 0.48, rim - top, 0, a0, a1);
    c.closePath();
    c.fill();
  }
  c.strokeStyle = 'rgba(255,255,255,0.7)';
  c.lineWidth = 1;
  for (let i = 0; i <= gores; i++) {
    const a = Math.PI + (i / gores) * Math.PI;
    c.beginPath();
    c.moveTo(cx + Math.cos(a) * w * 0.48, rim + Math.sin(a) * (rim - top) * 0);
    c.lineTo(cx, y + h);
    c.stroke();
  }
}

// ---------------- misc Chapter 1 distractors ----------------
export function drawSolarPanels(c, x, y, w, h) {
  const cx = x + w / 2, cy = y + h / 2;
  c.fillStyle = '#c7cfdc';
  c.fillRect(cx - w * 0.06, cy - h * 0.08, w * 0.12, h * 0.16);
  [-1, 1].forEach((s) => {
    const px = s < 0 ? x : cx + w * 0.08;
    const pw = w * 0.42;
    c.fillStyle = '#1f47b8';
    c.fillRect(px, cy - h * 0.2, pw, h * 0.4);
    c.strokeStyle = '#8fb3ff';
    c.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      c.beginPath();
      c.moveTo(px + (pw * i) / 5, cy - h * 0.2);
      c.lineTo(px + (pw * i) / 5, cy + h * 0.2);
      c.stroke();
    }
    c.beginPath();
    c.moveTo(px, cy);
    c.lineTo(px + pw, cy);
    c.stroke();
  });
}

export function drawShuttleWings(c, x, y, w, h) {
  const cx = x + w / 2;
  c.fillStyle = '#f2f3f6';
  poly(c, [[cx, y + h * 0.1], [x + w * 0.02, y + h * 0.9], [x + w * 0.98, y + h * 0.9]]);
  c.fill();
  c.fillStyle = '#1d2029';
  poly(c, [[x + w * 0.02, y + h * 0.9], [x + w * 0.2, y + h * 0.72], [x + w * 0.8, y + h * 0.72], [x + w * 0.98, y + h * 0.9]]);
  c.fill();
  c.fillStyle = '#d6dae2';
  c.fillRect(cx - w * 0.08, y + h * 0.1, w * 0.16, h * 0.8);
}

export function drawLandingLegs(c, x, y, w, h) {
  const cx = x + w / 2;
  c.fillStyle = linear(c, x, 0, x + w, 0, [[0, '#8c6512'], [0.4, '#f2c74a'], [1, '#7d5a10']]);
  c.fillRect(cx - w * 0.25, y + h * 0.1, w * 0.5, h * 0.35);
  c.strokeStyle = '#b7b9bf';
  c.lineWidth = 3;
  [-1, 1].forEach((s) => {
    c.beginPath();
    c.moveTo(cx + s * w * 0.22, y + h * 0.3);
    c.lineTo(cx + s * w * 0.45, y + h * 0.88);
    c.stroke();
    c.fillStyle = '#9ea1a8';
    c.beginPath();
    c.ellipse(cx + s * w * 0.45, y + h * 0.9, w * 0.08, h * 0.04, 0, 0, Math.PI * 2);
    c.fill();
  });
}

export function drawRoverWheels(c, x, y, w, h) {
  const r = Math.min(w, h) * 0.22;
  [[x + w * 0.28, y + h * 0.62], [x + w * 0.72, y + h * 0.62]].forEach(([wx, wy]) => {
    c.fillStyle = '#2a2d36';
    circle(c, wx, wy, r);
    c.fill();
    c.strokeStyle = '#c7a45a';
    c.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.beginPath();
      c.moveTo(wx, wy);
      c.lineTo(wx + Math.cos(a) * r * 0.9, wy + Math.sin(a) * r * 0.9);
      c.stroke();
    }
    c.fillStyle = '#9aa1ae';
    circle(c, wx, wy, r * 0.25);
    c.fill();
  });
  c.fillStyle = '#9aa1ae';
  c.fillRect(x + w * 0.2, y + h * 0.36, w * 0.6, h * 0.08);
}

export function drawDishAntenna(c, x, y, w, h) {
  const cx = x + w / 2;
  c.fillStyle = '#9aa1ae';
  c.fillRect(cx - w * 0.05, y + h * 0.55, w * 0.1, h * 0.4);
  c.fillRect(cx - w * 0.25, y + h * 0.9, w * 0.5, h * 0.08);
  c.fillStyle = radial(c, cx - w * 0.1, y + h * 0.3, 2, w * 0.5, [[0, '#ffffff'], [1, '#aeb6c4']]);
  c.beginPath();
  c.ellipse(cx, y + h * 0.35, w * 0.45, h * 0.28, -0.4, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#6b7385';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(cx, y + h * 0.35);
  c.lineTo(cx + w * 0.25, y + h * 0.12);
  c.stroke();
}

export function drawJetEngine(c, x, y, w, h) {
  const cy = y + h / 2;
  c.fillStyle = linear(c, 0, y + h * 0.2, 0, y + h * 0.8, [[0, '#6b7385'], [0.4, '#dfe3ea'], [1, '#4c5364']]);
  roundRect(c, x + w * 0.1, y + h * 0.25, w * 0.8, h * 0.5, h * 0.2);
  c.fill();
  c.fillStyle = '#2a2d36';
  c.beginPath();
  c.ellipse(x + w * 0.14, cy, w * 0.06, h * 0.22, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#9aa1ae';
  c.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    c.beginPath();
    c.moveTo(x + w * 0.14, cy);
    c.lineTo(x + w * 0.14 + Math.cos(a) * w * 0.05, cy + Math.sin(a) * h * 0.2);
    c.stroke();
  }
  c.fillStyle = '#3b3f4a';
  c.fillRect(x + w * 0.85, y + h * 0.35, w * 0.1, h * 0.3);
}

export function drawMoonBuggy(c, x, y, w, h) {
  drawRoverWheels(c, x, y + h * 0.1, w, h * 0.9);
  c.fillStyle = '#d4d7de';
  c.fillRect(x + w * 0.15, y + h * 0.35, w * 0.7, h * 0.1);
  c.fillStyle = '#9aa1ae';
  c.fillRect(x + w * 0.3, y + h * 0.18, w * 0.08, h * 0.2);
  c.fillRect(x + w * 0.55, y + h * 0.18, w * 0.08, h * 0.2);
  c.fillStyle = '#c7cfdc';
  c.beginPath();
  c.ellipse(x + w * 0.72, y + h * 0.12, w * 0.12, h * 0.08, -0.3, 0, Math.PI * 2);
  c.fill();
}

export function drawSaturnVMini(c, x, y, w, h) {
  drawSaturnV(c, x, y, w, h);
}

// ---------------- recovery, helicopter, ship ----------------
function drawHeli(c, w, h) {
  const cx = w / 2;
  c.fillStyle = '#9aa7c2';
  c.fillRect(cx - 4, h * 0.45, 8, h * 0.45);
  c.fillStyle = '#5b6b8c';
  c.beginPath();
  c.ellipse(cx, h * 0.33, w * 0.2, h * 0.24, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#9fd8ff';
  c.beginPath();
  c.ellipse(cx, h * 0.18, w * 0.12, h * 0.08, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#5b6b8c';
  c.fillRect(cx - 12, h * 0.86, 24, 5);
  c.fillStyle = '#ffffff';
  c.font = `700 ${w * 0.14}px Lexend, sans-serif`;
  c.textAlign = 'center';
  c.fillText('66', cx, h * 0.42);
}

export function buildCraftArt(scene) {
  makeTex(scene, 'mercuryRedstone', 60, 500, (c, w, h) => drawMercuryRedstone(c, 0, 0, w, h, true));
  makeTex(scene, 'freedom7', 46, 182, (c, w, h) => drawMercuryRedstone(c, 0, 0, w, h, false));
  makeTex(scene, 'mercuryCapsuleSolo', 60, 76, (c, w, h) => {
    drawMercuryCapsule(c, 4, 0, w - 8, h - 14);
    drawHeatShield(c, 6, h - 16, w - 12, 6);
  });
  makeTex(scene, 'redstoneOnly', 60, 320, (c, w, h) => drawRedstone(c, 0, 0, w, h));
  makeTex(scene, 'juno', 50, 330, (c, w, h) => drawJuno(c, 0, 0, w, h));
  makeTex(scene, 'junoTop', 24, 96, (c, w, h) => drawJunoTop(c, 0, 0, w, h));
  makeTex(scene, 'explorer1', 40, 200, (c, w, h) => drawExplorer1(c, 12, 0, 16, h));
  makeTex(scene, 'saturnV', 64, 500, (c, w, h) => drawSaturnV(c, 0, 0, w, h));
  makeTex(scene, 'csmLm', 240, 84, (c, w, h) => drawCsmLm(c, 0, 0, w, h));
  makeTex(scene, 'lm', 96, 90, (c, w, h) => drawLM(c, 0, 0, w, h));
  makeTex(scene, 'lmAscent', 70, 56, (c, w, h) => drawLMAscent(c, 0, 0, w, h));
  makeTex(scene, 'cm', 70, 60, (c, w, h) => drawCM(c, 0, 0, w, h));
  makeTex(scene, 'cmHot', 70, 60, (c, w, h) => drawCM(c, 0, 0, w, h, { hot: true }));
  makeTex(scene, 'mainChute', 110, 120, (c, w, h) => drawParachute(c, 0, 0, w, h, 10));
  makeTex(scene, 'drogue', 50, 70, (c, w, h) => drawParachute(c, 0, 0, w, h, 6));
  makeTex(scene, 'mainCanopy', 110, 56, (c, w, h) => drawCanopy(c, 0, 0, w, h, 10));
  makeTex(scene, 'drogueCanopy', 50, 30, (c, w, h) => drawCanopy(c, 0, 0, w, h, 6));
  makeTex(scene, 'vostok', 90, 60, (c) => {
    // Vostok: ball-shaped cabin + cone-shaped equipment module
    c.fillStyle = cylGrad(c, 44, 42, '#9aa1ae');
    poly(c, [[48, 30], [86, 14], [86, 46]]);
    c.fill();
    c.fillStyle = radial(c, 22, 22, 3, 30, [[0, '#f0f0f0'], [1, '#8d8f96']]);
    circle(c, 30, 30, 24);
    c.fill();
    c.fillStyle = '#2a2d36';
    circle(c, 24, 24, 5);
    c.fill();
  });
  makeTex(scene, 'sputnik', 100, 70, (c) => {
    c.strokeStyle = '#d8dde6';
    c.lineWidth = 2;
    [[96, 62], [98, 44], [80, 68], [70, 66]].forEach(([x, y]) => {
      c.beginPath();
      c.moveTo(24, 24);
      c.lineTo(x, y);
      c.stroke();
    });
    c.fillStyle = radial(c, 18, 16, 2, 24, [[0, '#ffffff'], [1, '#8b93a3']]);
    circle(c, 24, 24, 20);
    c.fill();
  });
  makeTex(scene, 'heli', 80, 110, (c, w, h) => drawHeli(c, w, h));
  makeTex(scene, 'rotor', 130, 130, (c) => {
    c.fillStyle = 'rgba(200,210,230,0.18)';
    circle(c, 65, 65, 62);
    c.fill();
    c.fillStyle = 'rgba(40,45,60,0.85)';
    for (let i = 0; i < 5; i++) {
      c.save();
      c.translate(65, 65);
      c.rotate((i / 5) * Math.PI * 2);
      c.fillRect(-3, -62, 6, 62);
      c.restore();
    }
  });
  makeTex(scene, 'hornet', 380, 86, (c) => {
    c.fillStyle = '#5d6676';
    poly(c, [[10, 43], [40, 8], [330, 6], [376, 30], [376, 58], [330, 80], [40, 78]]);
    c.fill();
    c.fillStyle = '#48505e';
    c.fillRect(40, 16, 290, 54);
    c.strokeStyle = '#f4f6ff';
    c.setLineDash([12, 10]);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(50, 43);
    c.lineTo(320, 43);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#3a404b';
    c.fillRect(230, 66, 60, 12);
    c.fillStyle = '#f4f6ff';
    c.font = '700 20px Lexend, sans-serif';
    c.fillText('12', 80, 36);
  });
  makeTex(scene, 'cmTop', 56, 56, (c) => {
    c.fillStyle = radial(c, 22, 22, 2, 30, [[0, '#ffffff'], [1, '#9aa1ae']]);
    circle(c, 28, 28, 26);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 1.5;
    circle(c, 28, 28, 16);
    c.stroke();
    circle(c, 28, 28, 7);
    c.stroke();
  });
  makeTex(scene, 'collar', 84, 84, (c) => {
    c.strokeStyle = '#f5a623';
    c.lineWidth = 12;
    circle(c, 42, 42, 34);
    c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.beginPath();
      c.moveTo(42 + Math.cos(a) * 28, 42 + Math.sin(a) * 28);
      c.lineTo(42 + Math.cos(a) * 40, 42 + Math.sin(a) * 40);
      c.stroke();
    }
  });
  makeTex(scene, 'uprightBag', 30, 30, (c) => {
    c.fillStyle = radial(c, 11, 11, 2, 16, [[0, '#ffffff'], [1, '#c9ced8']]);
    circle(c, 15, 15, 13);
    c.fill();
  });
  makeTex(scene, 'swimmer', 18, 28, (c) => {
    c.fillStyle = '#1d2029';
    circle(c, 9, 6, 5);
    c.fill();
    c.fillRect(4, 10, 10, 14);
    c.fillStyle = '#ff9f43';
    c.fillRect(4, 12, 10, 6);
  });
  makeTex(scene, 'raft', 60, 34, (c) => {
    c.fillStyle = '#ff7a2f';
    roundRect(c, 2, 2, 56, 30, 14);
    c.fill();
    c.fillStyle = '#ffb27a';
    roundRect(c, 10, 8, 40, 18, 8);
    c.fill();
  });

  // ---------- build pieces (same proportions as the full Mercury-Redstone stack) ----------
  makeTex(scene, 'bp_redstone', 60, 320, (c, w, h) => drawRedstone(c, 0, 0, w, h));
  makeTex(scene, 'bp_retroPack', 34, 13, (c, w, h) => drawRetroPack(c, 0, 0, w, h));
  makeTex(scene, 'bp_heatShield', 42, 8, (c, w, h) => drawHeatShield(c, 0, 0, w, 6));
  makeTex(scene, 'bp_capsule', 44, 58, (c, w, h) => drawMercuryCapsule(c, 0, 0, w, h));
  makeTex(scene, 'bp_parachutePack', 18, 22, (c, w, h) => drawParachutePack(c, 0, 0, w, h));
  makeTex(scene, 'bp_escapeTower', 22, 96, (c, w, h) => drawEscapeTower(c, 0, 0, w, h));

  // ---------- cards for the builder / parts list ----------
  const card = (key, fn, pw, ph) =>
    makeTex(scene, key, 120, 120, (c) => {
      const s = Math.min(104 / pw, 104 / ph);
      fn(c, 60 - (pw * s) / 2, 60 - (ph * s) / 2, pw * s, ph * s);
    });
  card('card_redstone', drawRedstone, 60, 320);
  card('card_escapeTower', drawEscapeTower, 22, 96);
  card('card_capsule', drawMercuryCapsule, 44, 58);
  card('card_heatShield', (c, x, y, w, h) => drawHeatShield(c, x, y + h * 0.3, w, h * 0.35), 44, 24);
  card('card_retroPack', (c, x, y, w, h) => drawRetroPack(c, x, y + h * 0.2, w, h * 0.6), 44, 18);
  card('card_parachutePack', drawParachutePack, 22, 28);
  card('card_solarPanels', drawSolarPanels, 100, 60);
  card('card_shuttleWings', drawShuttleWings, 90, 80);
  card('card_landingLegs', drawLandingLegs, 80, 80);
  card('card_roverWheels', drawRoverWheels, 90, 60);
  card('card_dishAntenna', drawDishAntenna, 80, 90);
  card('card_saturnV', drawSaturnVMini, 64, 500);
  // Apollo
  card('card_sic', (c, x, y, w, h) => {
    drawSaturnStage(c, x + w / 2, y, w * 0.72, h * 0.9, 'sic');
    [-0.24, 0, 0.24].forEach((k) => nozzle(c, x + w / 2 + k * w, y + h * 0.9, w * 0.12, w * 0.18, h * 0.1, '#2c2f37'));
  }, 44, 90);
  card('card_sii', (c, x, y, w, h) => drawSaturnStage(c, x + w / 2, y, w, h, 'sii'), 44, 70);
  card('card_s4b', (c, x, y, w, h) => drawSaturnStage(c, x + w / 2, y, w, h, 's4b'), 29, 60);
  card('card_iu', (c, x, y, w, h) => {
    cylinder(c, x + w / 2, y + h * 0.3, w, h * 0.4, '#b9bec9');
    c.fillStyle = '#23262e';
    for (let i = 0; i < 6; i++) c.fillRect(x + w * (0.1 + i * 0.14), y + h * 0.4, w * 0.08, h * 0.2);
  }, 60, 30);
  card('card_lm', drawLM, 96, 90);
  card('card_sm', drawSM, 36, 60);
  card('card_cm', drawCM, 60, 52);
  card('card_les', drawLES, 22, 96);
  card('card_jetEngine', drawJetEngine, 100, 60);
  card('card_moonBuggy', drawMoonBuggy, 100, 70);
  card('card_explorer1', drawExplorer1, 20, 200);
  card('card_freedom7', (c, x, y, w, h) => drawMercuryRedstone(c, x, y, w, h, true), 60, 500);
}

export { drawHeli, blob };
