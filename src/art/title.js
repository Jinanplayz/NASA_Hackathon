// Pictures for the title screen: a ringed planet and a floating astronaut made of separate
// pieces (body, arms, legs) so the arms and legs can move.
import { makeTex, circle, radial, linear, roundRect } from './core.js';

// A blue planet with a glowing, tilted ring.
function drawRingPlanet(c, w, h) {
  const cx = w / 2, cy = h / 2, r = h * 0.3;
  const tilt = -0.32;
  const ring = (front) => {
    c.save();
    c.translate(cx, cy);
    c.rotate(tilt);
    c.beginPath();
    // the back half of the ring is above the planet's middle, the front half below
    c.ellipse(0, 0, w * 0.44, h * 0.13, 0, front ? 0 : Math.PI, front ? Math.PI : Math.PI * 2);
    c.lineWidth = h * 0.05;
    c.strokeStyle = 'rgba(120, 220, 255, 0.35)';
    c.stroke();
    c.lineWidth = h * 0.022;
    c.strokeStyle = '#7fe3ff';
    c.stroke();
    c.restore();
  };
  // soft glow
  c.fillStyle = radial(c, cx, cy, r * 0.8, r * 1.7, [[0, 'rgba(90,160,255,0.35)'], [1, 'rgba(90,160,255,0)']]);
  c.fillRect(0, 0, w, h);
  ring(false);
  c.save();
  circle(c, cx, cy, r);
  c.clip();
  c.fillStyle = radial(c, cx - r * 0.4, cy - r * 0.45, r * 0.1, r * 1.3, [[0, '#8fd0ff'], [0.45, '#2f6fe0'], [1, '#12245e']]);
  c.fillRect(cx - r, cy - r, r * 2, r * 2);
  // bands
  c.globalAlpha = 0.35;
  [[-0.45, 0.14, '#b6e4ff'], [-0.1, 0.1, '#1b3f9e'], [0.25, 0.16, '#6fb6ff'], [0.55, 0.08, '#1b3f9e']].forEach(([y, t, col]) => {
    c.fillStyle = col;
    c.save();
    c.translate(cx, cy + y * r);
    c.rotate(tilt * 0.6);
    c.fillRect(-r * 1.2, 0, r * 2.4, t * r);
    c.restore();
  });
  c.globalAlpha = 1;
  c.restore();
  ring(true);
}

// The astronaut's body: helmet with a dark shiny visor, backpack, suit and chest panel.
function drawAstroBody(c, w, h) {
  const cx = w * 0.5;
  // backpack
  c.fillStyle = linear(c, 0, 0, w, 0, [[0, '#9aa6bf'], [1, '#6f7c98']]);
  roundRect(c, cx - w * 0.36, h * 0.36, w * 0.72, h * 0.42, 14);
  c.fill();
  // body
  c.fillStyle = linear(c, 0, h * 0.4, 0, h, [[0, '#ffffff'], [1, '#c9d0de']]);
  roundRect(c, cx - w * 0.3, h * 0.42, w * 0.6, h * 0.5, 22);
  c.fill();
  // chest panel
  c.fillStyle = '#e4e9f2';
  roundRect(c, cx - w * 0.16, h * 0.55, w * 0.32, h * 0.16, 8);
  c.fill();
  c.fillStyle = '#4fd1ff';
  circle(c, cx - w * 0.07, h * 0.63, w * 0.035);
  c.fill();
  c.fillStyle = '#ff6b6b';
  circle(c, cx + w * 0.02, h * 0.63, w * 0.03);
  c.fill();
  c.fillStyle = '#ffd166';
  circle(c, cx + w * 0.09, h * 0.63, w * 0.03);
  c.fill();
  // belt
  c.fillStyle = '#8f99b3';
  c.fillRect(cx - w * 0.3, h * 0.79, w * 0.6, h * 0.035);
  // neck ring
  c.fillStyle = '#8f99b3';
  c.beginPath();
  c.ellipse(cx, h * 0.43, w * 0.26, h * 0.035, 0, 0, Math.PI * 2);
  c.fill();
  // helmet
  c.fillStyle = radial(c, cx - w * 0.14, h * 0.14, w * 0.04, w * 0.42, [[0, '#ffffff'], [1, '#c3cad8']]);
  circle(c, cx, h * 0.25, w * 0.36);
  c.fill();
  // visor: dark and glossy, with the reflection of the stars
  c.fillStyle = linear(c, 0, h * 0.1, 0, h * 0.4, [[0, '#1b2f7a'], [0.6, '#101a48'], [1, '#2a1f63']]);
  c.beginPath();
  c.ellipse(cx + w * 0.02, h * 0.26, w * 0.27, h * 0.13, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(160, 220, 255, 0.55)';
  c.beginPath();
  c.ellipse(cx - w * 0.1, h * 0.215, w * 0.08, h * 0.03, -0.5, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255, 255, 255, 0.8)';
  circle(c, cx + w * 0.12, h * 0.3, w * 0.02);
  c.fill();
  // ear light
  c.fillStyle = '#4fd1ff';
  circle(c, cx + w * 0.34, h * 0.24, w * 0.035);
  c.fill();
}

// An arm (shoulder at the top middle) ending in a glove.
function drawAstroArm(c, w, h) {
  const cx = w / 2;
  c.fillStyle = linear(c, 0, 0, w, 0, [[0, '#ffffff'], [1, '#c9d0de']]);
  roundRect(c, cx - w * 0.3, 0, w * 0.6, h * 0.78, w * 0.3);
  c.fill();
  c.fillStyle = '#8f99b3';
  c.fillRect(cx - w * 0.3, h * 0.66, w * 0.6, h * 0.06);
  // glove
  c.fillStyle = '#e8ecf4';
  circle(c, cx, h * 0.84, w * 0.36);
  c.fill();
}

// A leg (hip at the top middle) with a chunky boot.
function drawAstroLeg(c, w, h) {
  const cx = w / 2;
  c.fillStyle = linear(c, 0, 0, w, 0, [[0, '#ffffff'], [1, '#c9d0de']]);
  roundRect(c, cx - w * 0.32, 0, w * 0.64, h * 0.78, w * 0.3);
  c.fill();
  c.fillStyle = '#8f99b3';
  c.fillRect(cx - w * 0.32, h * 0.6, w * 0.64, h * 0.06);
  // boot
  c.fillStyle = '#5d6b8a';
  roundRect(c, cx - w * 0.4, h * 0.72, w * 0.86, h * 0.26, 8);
  c.fill();
}

export function buildTitleArt(scene) {
  makeTex(scene, 'ringPlanet', 260, 180, (c, w, h) => drawRingPlanet(c, w, h));
  makeTex(scene, 'astroBody', 120, 150, (c, w, h) => drawAstroBody(c, w, h));
  makeTex(scene, 'astroArm', 30, 58, (c, w, h) => drawAstroArm(c, w, h));
  makeTex(scene, 'astroLeg', 32, 60, (c, w, h) => drawAstroLeg(c, w, h));
}
