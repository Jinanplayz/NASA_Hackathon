// Chapter 5 (Voyager): giant planets and moons, Voyager, its rocket, the Golden Record
// and the things that are (or aren't) on it.
import { seeded } from '../core/constants.js';
import { makeTex, roundRect, circle, poly, radial, linear, blob } from './core.js';

// ---------- planets & moons ----------
function banded(c, s, bands, opts = {}) {
  const cx = s / 2, cy = s / 2, r = s * 0.47;
  c.save();
  circle(c, cx, cy, r);
  c.clip();
  let y = cy - r;
  const total = bands.reduce((n, b) => n + b[1], 0);
  bands.forEach(([col, k]) => {
    const h = (k / total) * r * 2;
    c.fillStyle = col;
    c.fillRect(cx - r, y, r * 2, h + 1);
    y += h;
  });
  // soft wavy streaks inside the bands
  const rnd = seeded(opts.seed ?? 3);
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.08})`;
    c.beginPath();
    c.ellipse(cx - r + rnd() * r * 2, cy - r + rnd() * r * 2, r * (0.1 + rnd() * 0.3), r * 0.02, 0, 0, Math.PI * 2);
    c.fill();
  }
  if (opts.spot) {
    c.fillStyle = '#c0573a';
    c.beginPath();
    c.ellipse(cx + r * 0.3, cy + r * 0.32, r * 0.2, r * 0.11, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,190,150,0.5)';
    c.beginPath();
    c.ellipse(cx + r * 0.28, cy + r * 0.3, r * 0.1, r * 0.05, 0, 0, Math.PI * 2);
    c.fill();
  }
  // shading towards the night side
  c.fillStyle = radial(c, cx - r * 0.35, cy - r * 0.3, r * 0.2, r * 1.15, [[0, 'rgba(255,255,255,0.08)'], [0.6, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,15,0.6)']]);
  c.fillRect(cx - r, cy - r, r * 2, r * 2);
  c.restore();
}

function jupiter(c, s) {
  banded(c, s, [['#d9c7a8', 1], ['#b8875a', 1.2], ['#ecdcc0', 1.4], ['#a86d43', 1.1], ['#f1e2c6', 1.6], ['#b07a4e', 1.2], ['#e3cfae', 1.3], ['#9c6a45', 1], ['#d8c3a2', 1]], { spot: true, seed: 5 });
}

function saturnPlanet(c, s) {
  banded(c, s, [['#e8d6a8', 1], ['#d9bd84', 1.2], ['#f0e0b8', 1.4], ['#cfae74', 1], ['#ead7ad', 1.3], ['#c9a46c', 1], ['#e6d2a2', 1]], { seed: 9 });
}

function ringSaturn(c, w, h, front) {
  const cx = w / 2, cy = h / 2;
  const rings = [[0.95, '#d8c49a', 0.55], [0.86, '#efe0bc', 0.85], [0.78, '#7a6a4e', 0.5], [0.72, '#e2cf9f', 0.8], [0.62, '#c9b27c', 0.45]];
  c.save();
  // only the front half (below the planet's middle) or the back half
  c.beginPath();
  if (front) c.rect(0, cy, w, h - cy);
  else c.rect(0, 0, w, cy);
  c.clip();
  rings.forEach(([k, col, a]) => {
    c.strokeStyle = col;
    c.globalAlpha = a;
    c.lineWidth = w * 0.035;
    c.beginPath();
    c.ellipse(cx, cy, (w / 2) * k, (h / 2) * k * 0.62, -0.08, 0, Math.PI * 2);
    c.stroke();
  });
  c.restore();
}

function saturn(c, w, h) {
  ringSaturn(c, w, h, false);
  const s = h * 0.9;
  c.save();
  c.translate(w / 2 - s / 2, h / 2 - s / 2);
  saturnPlanet(c, s);
  c.restore();
  ringSaturn(c, w, h, true);
}

function iceGiant(c, s, a, b) {
  const cx = s / 2, cy = s / 2, r = s * 0.46;
  c.fillStyle = radial(c, cx - r * 0.3, cy - r * 0.35, r * 0.1, r * 1.1, [[0, a], [1, b]]);
  circle(c, cx, cy, r);
  c.fill();
}

function moon(c, s, base, spots, seed, opts = {}) {
  const cx = s / 2, cy = s / 2, r = s * 0.45;
  c.fillStyle = radial(c, cx - r * 0.3, cy - r * 0.3, r * 0.1, r * 1.05, [[0, base[0]], [1, base[1]]]);
  circle(c, cx, cy, r);
  c.fill();
  c.save();
  circle(c, cx, cy, r);
  c.clip();
  const rnd = seeded(seed);
  for (let i = 0; i < spots.n; i++) {
    c.fillStyle = spots.colors[i % spots.colors.length];
    blob(c, cx + (rnd() - 0.5) * r * 1.8, cy + (rnd() - 0.5) * r * 1.8, r * (0.05 + rnd() * spots.size), rnd, 10, 0.35);
    c.fill();
  }
  if (opts.cracks) {
    c.strokeStyle = 'rgba(140,80,40,0.7)';
    c.lineWidth = s * 0.012;
    for (let i = 0; i < 12; i++) {
      c.beginPath();
      c.moveTo(cx + (rnd() - 0.5) * r * 2, cy + (rnd() - 0.5) * r * 2);
      c.quadraticCurveTo(cx + (rnd() - 0.5) * r * 2, cy + (rnd() - 0.5) * r * 2, cx + (rnd() - 0.5) * r * 2, cy + (rnd() - 0.5) * r * 2);
      c.stroke();
    }
  }
  c.fillStyle = radial(c, cx - r * 0.3, cy - r * 0.3, r * 0.3, r * 1.1, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,15,0.55)']]);
  c.fillRect(0, 0, s, s);
  c.restore();
}

// Earth seen from above the North Pole: the Arctic ice in the middle, land around it.
function earthPole(c, s) {
  const cx = s / 2, r = s * 0.46;
  c.fillStyle = radial(c, cx - r * 0.2, cx - r * 0.2, r * 0.1, r * 1.05, [[0, '#4f9cf0'], [0.7, '#1f62c8'], [1, '#0c3580']]);
  circle(c, cx, cx, r);
  c.fill();
  c.save();
  circle(c, cx, cx, r);
  c.clip();
  const rnd = seeded(41);
  const land = ['#4f9d52', '#3f8c47', '#6aa85a'];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rnd() * 0.4, d = r * (0.45 + rnd() * 0.3);
    c.fillStyle = land[i % 3];
    blob(c, cx + Math.cos(a) * d, cx + Math.sin(a) * d, r * (0.14 + rnd() * 0.12), rnd, 14, 0.4);
    c.fill();
  }
  c.fillStyle = 'rgba(245,250,255,0.95)';
  blob(c, cx, cx, r * 0.24, rnd, 14, 0.25);
  c.fill();
  for (let i = 0; i < 18; i++) {
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.ellipse(cx + (rnd() - 0.5) * r * 1.6, cx + (rnd() - 0.5) * r * 1.6, r * (0.06 + rnd() * 0.1), r * 0.025, rnd() * 3, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  c.strokeStyle = 'rgba(170,225,255,0.8)';
  c.lineWidth = s * 0.008;
  circle(c, cx, cx, r);
  c.stroke();
}

function sun(c, s) {
  const cx = s / 2, r = s / 2;
  c.fillStyle = radial(c, cx, cx, 0, r, [[0, '#fffbe8'], [0.25, '#ffe9a0'], [0.45, 'rgba(255,200,90,0.55)'], [1, 'rgba(255,160,60,0)']]);
  c.fillRect(0, 0, s, s);
}

// ---------- Voyager (side view: dish on top, booms to the sides) ----------
export function drawVoyager(c, w, h) {
  const cx = w * 0.5, top = h * 0.12;
  // magnetometer boom (long and thin) going up-left
  c.strokeStyle = '#c9ced8';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(cx, h * 0.5);
  c.lineTo(w * 0.02, h * 0.02);
  c.stroke();
  // RTG boom (left) with three power units
  c.strokeStyle = '#9aa1ae';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(cx - w * 0.08, h * 0.62);
  c.lineTo(w * 0.12, h * 0.8);
  c.stroke();
  for (let i = 0; i < 3; i++) {
    c.fillStyle = '#3b3f4a';
    roundRect(c, w * (0.12 + i * 0.07) - 7, h * (0.79 - i * 0.05) - 9, 16, 18, 3);
    c.fill();
    c.fillStyle = '#6b7290';
    for (let k = 0; k < 4; k++) c.fillRect(w * (0.12 + i * 0.07) - 9 + k * 5, h * (0.79 - i * 0.05) - 11, 2, 22);
  }
  // science boom (right) with the scan platform and cameras
  c.strokeStyle = '#9aa1ae';
  c.beginPath();
  c.moveTo(cx + w * 0.08, h * 0.6);
  c.lineTo(w * 0.86, h * 0.72);
  c.stroke();
  c.fillStyle = '#5d6475';
  roundRect(c, w * 0.83, h * 0.66, w * 0.1, h * 0.14, 3);
  c.fill();
  c.fillStyle = '#1d2029';
  circle(c, w * 0.9, h * 0.73, h * 0.035);
  c.fill();
  // the body (a ten-sided box)
  c.fillStyle = linear(c, cx - w * 0.1, 0, cx + w * 0.1, 0, [[0, '#6b7290'], [0.5, '#c9ced8'], [1, '#5d6475']]);
  poly(c, [[cx - w * 0.1, h * 0.5], [cx + w * 0.1, h * 0.5], [cx + w * 0.11, h * 0.66], [cx - w * 0.11, h * 0.66]]);
  c.fill();
  c.fillStyle = '#d8ad52';
  c.fillRect(cx - w * 0.09, h * 0.54, w * 0.18, h * 0.04);
  // the big dish antenna
  c.fillStyle = linear(c, 0, top, 0, h * 0.5, [[0, '#ffffff'], [1, '#c9ced8']]);
  c.beginPath();
  c.moveTo(cx - w * 0.3, h * 0.42);
  c.quadraticCurveTo(cx, h * 0.62, cx + w * 0.3, h * 0.42);
  c.quadraticCurveTo(cx, h * 0.36, cx - w * 0.3, h * 0.42);
  c.fill();
  c.strokeStyle = '#9aa1ae';
  c.lineWidth = 1.5;
  c.stroke();
  // feed on struts
  c.beginPath();
  c.moveTo(cx - w * 0.12, h * 0.44);
  c.lineTo(cx, top + h * 0.14);
  c.lineTo(cx + w * 0.12, h * 0.44);
  c.stroke();
  c.fillStyle = '#eef1f7';
  roundRect(c, cx - 5, top + h * 0.08, 10, 12, 3);
  c.fill();
  // the Golden Record on the side
  c.fillStyle = '#d8ad52';
  circle(c, cx + w * 0.07, h * 0.6, h * 0.035);
  c.fill();
}

// ---------- Titan IIIE - Centaur ----------
function drawTitan(c, w, h) {
  const cx = w / 2, cw = w * 0.34;
  // the two solid rocket boosters
  [-1, 1].forEach((s) => {
    const x = cx + s * (cw / 2 + w * 0.12);
    c.fillStyle = linear(c, x - w * 0.12, 0, x + w * 0.12, 0, [[0, '#9aa1ae'], [0.4, '#f4f6ff'], [1, '#8b93a8']]);
    c.fillRect(x - w * 0.12, h * 0.42, w * 0.24, h * 0.5);
    poly(c, [[x - w * 0.12, h * 0.42], [x, h * 0.36], [x + w * 0.12, h * 0.42]]);
    c.fill();
    c.fillStyle = '#1d2029';
    for (let k = 0; k < 4; k++) c.fillRect(x - w * 0.12, h * (0.5 + k * 0.1), w * 0.24, h * 0.012);
    c.fillStyle = '#3b3f4a';
    poly(c, [[x - w * 0.07, h * 0.92], [x + w * 0.07, h * 0.92], [x + w * 0.1, h * 0.98], [x - w * 0.1, h * 0.98]]);
    c.fill();
  });
  // the core stage
  c.fillStyle = linear(c, cx - cw / 2, 0, cx + cw / 2, 0, [[0, '#a8803a'], [0.45, '#e8c27a'], [1, '#8a6a2e']]);
  c.fillRect(cx - cw / 2, h * 0.3, cw, h * 0.66);
  c.fillStyle = '#3b3f4a';
  poly(c, [[cx - cw * 0.3, h * 0.96], [cx + cw * 0.3, h * 0.96], [cx + cw * 0.38, h], [cx - cw * 0.38, h]]);
  c.fill();
  // Centaur and Voyager inside the tall white nose shroud
  c.fillStyle = linear(c, cx - cw / 2, 0, cx + cw / 2, 0, [[0, '#c9ced8'], [0.45, '#ffffff'], [1, '#b9bec9']]);
  c.fillRect(cx - cw / 2, h * 0.08, cw, h * 0.22);
  poly(c, [[cx - cw / 2, h * 0.08], [cx, 0], [cx + cw / 2, h * 0.08]]);
  c.fill();
  c.fillStyle = '#1d2029';
  c.fillRect(cx - cw / 2, h * 0.295, cw, h * 0.008);
}

// ---------- the Golden Record ----------
function goldenRecord(c, s) {
  const cx = s / 2, r = s * 0.48;
  c.fillStyle = radial(c, cx - r * 0.3, cx - r * 0.3, r * 0.1, r, [[0, '#ffe7a0'], [0.5, '#d8ad52'], [1, '#9c7a2e']]);
  circle(c, cx, cx, r);
  c.fill();
  c.strokeStyle = 'rgba(120,90,30,0.35)';
  c.lineWidth = 1;
  for (let k = r * 0.38; k < r * 0.96; k += 4) {
    circle(c, cx, cx, k);
    c.stroke();
  }
  c.fillStyle = 'rgba(255,255,255,0.25)';
  c.beginPath();
  c.moveTo(cx, cx);
  c.arc(cx, cx, r, -2.4, -1.9);
  c.fill();
  c.fillStyle = '#b48a3a';
  circle(c, cx, cx, r * 0.32);
  c.fill();
  c.fillStyle = '#1d2029';
  circle(c, cx, cx, r * 0.04);
  c.fill();
}

// ---------- things for the Golden Record game ----------
function icon(c, fn) {
  fn(c);
}
const ICONS = {
  grGreeting: (c) => {
    c.fillStyle = '#4fd1ff';
    roundRect(c, 10, 18, 80, 50, 14);
    c.fill();
    poly(c, [[26, 66], [40, 66], [24, 84]]);
    c.fill();
    c.fillStyle = '#070b1d';
    c.font = '800 20px Lexend, sans-serif';
    c.textAlign = 'center';
    c.fillText('Hello!', 50, 50);
  },
  grWhale: (c) => {
    c.fillStyle = '#3b6fb6';
    c.beginPath();
    c.ellipse(46, 56, 34, 18, -0.1, 0, Math.PI * 2);
    c.fill();
    poly(c, [[76, 50], [94, 34], [90, 54], [96, 70]]);
    c.fill();
    c.fillStyle = '#eef1f7';
    c.beginPath();
    c.ellipse(42, 64, 22, 7, -0.1, 0, Math.PI);
    c.fill();
    c.fillStyle = '#070b1d';
    circle(c, 26, 52, 3);
    c.fill();
    c.strokeStyle = '#9fd8ff';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(36, 36);
    c.quadraticCurveTo(34, 20, 26, 14);
    c.moveTo(36, 36);
    c.quadraticCurveTo(40, 20, 48, 14);
    c.stroke();
  },
  grThunder: (c) => {
    c.fillStyle = '#9aa1ae';
    circle(c, 36, 40, 18);
    circle(c, 58, 34, 22);
    circle(c, 74, 46, 15);
    c.fill();
    c.fillRect(30, 40, 52, 18);
    c.fillStyle = '#ffd166';
    poly(c, [[52, 54], [40, 76], [52, 74], [44, 94], [64, 66], [52, 68], [60, 54]]);
    c.fill();
    c.fillStyle = '#4fd1ff';
    [[30, 70], [72, 70], [80, 84]].forEach(([x, y]) => {
      c.beginPath();
      c.ellipse(x, y, 3, 6, 0, 0, Math.PI * 2);
      c.fill();
    });
  },
  grBaby: (c) => {
    c.fillStyle = '#f2c9a0';
    circle(c, 50, 46, 26);
    c.fill();
    c.fillStyle = '#070b1d';
    circle(c, 41, 44, 3);
    circle(c, 59, 44, 3);
    c.fill();
    c.beginPath();
    c.ellipse(50, 58, 7, 5, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#ff9fb6';
    roundRect(c, 26, 70, 48, 22, 10);
    c.fill();
    c.fillStyle = '#4fd1ff';
    c.beginPath();
    c.ellipse(36, 52, 3, 6, 0, 0, Math.PI * 2);
    c.fill();
  },
  grGuitar: (c) => {
    c.fillStyle = '#c0452f';
    circle(c, 38, 64, 20);
    circle(c, 54, 50, 15);
    c.fill();
    c.fillStyle = '#1d2029';
    circle(c, 44, 60, 6);
    c.fill();
    c.strokeStyle = '#8a5a2e';
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(56, 48);
    c.lineTo(86, 16);
    c.stroke();
    c.fillStyle = '#ffd166';
    c.font = '800 22px Lexend, sans-serif';
    c.fillText('♪', 64, 70);
    c.fillText('♫', 76, 46);
  },
  grKiss: (c) => {
    c.fillStyle = '#e8456b';
    c.beginPath();
    c.moveTo(14, 50);
    c.quadraticCurveTo(32, 26, 50, 40);
    c.quadraticCurveTo(68, 26, 86, 50);
    c.quadraticCurveTo(50, 84, 14, 50);
    c.fill();
    c.strokeStyle = '#9e2a46';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(18, 50);
    c.quadraticCurveTo(50, 58, 82, 50);
    c.stroke();
  },
  grPhotos: (c) => {
    [[24, 24, -0.15, '#dfe5ef'], [30, 28, 0.08, '#ffffff']].forEach(([x, y, a, col]) => {
      c.save();
      c.translate(x + 26, y + 22);
      c.rotate(a);
      c.fillStyle = col;
      c.fillRect(-28, -24, 56, 48);
      c.restore();
    });
    c.fillStyle = '#3b82f6';
    c.fillRect(34, 32, 42, 26);
    c.fillStyle = '#3ddc97';
    poly(c, [[34, 58], [48, 42], [60, 52], [68, 44], [76, 58]]);
    c.fill();
    c.fillStyle = '#ffd166';
    circle(c, 66, 38, 4);
    c.fill();
  },
  grMap: (c) => {
    c.strokeStyle = '#ffd166';
    c.lineWidth = 2;
    const rnd = seeded(14);
    for (let i = 0; i < 14; i++) {
      const a = rnd() * Math.PI * 2, l = 14 + rnd() * 30;
      c.beginPath();
      c.moveTo(50, 50);
      c.lineTo(50 + Math.cos(a) * l, 50 + Math.sin(a) * l);
      c.stroke();
    }
    c.fillStyle = '#ffffff';
    circle(c, 50, 50, 5);
    c.fill();
  },
  grPhone: (c) => {
    c.fillStyle = '#1d2029';
    roundRect(c, 30, 12, 40, 76, 8);
    c.fill();
    c.fillStyle = '#4fd1ff';
    roundRect(c, 34, 20, 32, 58, 4);
    c.fill();
    c.fillStyle = '#9aa1ae';
    circle(c, 50, 83, 2.5);
    c.fill();
  },
  grDino: (c) => {
    c.fillStyle = '#efe6cf';
    c.save();
    c.translate(50, 50);
    c.rotate(-0.6);
    c.fillRect(-28, -7, 56, 14);
    [-30, 30].forEach((x) => {
      circle(c, x, -8, 10);
      circle(c, x, 8, 10);
      c.fill();
    });
    c.restore();
  },
  grPizza: (c) => {
    c.fillStyle = '#e8b04a';
    poly(c, [[50, 88], [14, 22], [86, 22]]);
    c.fill();
    c.fillStyle = '#c4762f';
    roundRect(c, 12, 14, 76, 12, 6);
    c.fill();
    c.fillStyle = '#c0392b';
    [[40, 40], [58, 40], [50, 58]].forEach(([x, y]) => {
      circle(c, x, y, 6);
      c.fill();
    });
  },
  grGame: (c) => {
    c.fillStyle = '#5d6475';
    roundRect(c, 12, 32, 76, 40, 18);
    c.fill();
    c.fillStyle = '#1d2029';
    c.fillRect(24, 48, 18, 6);
    c.fillRect(30, 42, 6, 18);
    c.fillStyle = '#ff6b6b';
    circle(c, 66, 46, 5);
    c.fill();
    c.fillStyle = '#3ddc97';
    circle(c, 76, 56, 5);
    c.fill();
  }
};

export function buildCh5Art(scene) {
  makeTex(scene, 'jupiter', 300, 300, (c, w) => jupiter(c, w));
  makeTex(scene, 'jupiterBig', 640, 640, (c, w) => jupiter(c, w));
  makeTex(scene, 'saturn', 420, 220, (c, w, h) => saturn(c, w, h));
  makeTex(scene, 'saturnFace', 300, 300, (c, w) => saturnPlanet(c, w));
  makeTex(scene, 'uranus', 120, 120, (c, w) => iceGiant(c, w, '#d6f6f6', '#5fb0c0'));
  makeTex(scene, 'neptune', 120, 120, (c, w) => iceGiant(c, w, '#7fa8ff', '#1f3c9c'));
  makeTex(scene, 'io', 120, 120, (c, w) => moon(c, w, ['#f8e7a0', '#c9a03a'], { n: 26, size: 0.12, colors: ['#e2a33a', '#7a4a1e', '#fff4c0', '#c46a2a'] }, 21));
  makeTex(scene, 'europa', 120, 120, (c, w) => moon(c, w, ['#f4efe2', '#bfae96'], { n: 6, size: 0.15, colors: ['#e8dcc4'] }, 22, { cracks: true }));
  makeTex(scene, 'ganymede', 120, 120, (c, w) => moon(c, w, ['#b8ad9e', '#6e6455'], { n: 14, size: 0.22, colors: ['#8a7e6c', '#d8d0c2'] }, 23));
  makeTex(scene, 'callisto', 120, 120, (c, w) => moon(c, w, ['#7d7468', '#3b352e'], { n: 40, size: 0.05, colors: ['#d8d0c2', '#a69d90'] }, 24));
  makeTex(scene, 'titan', 140, 140, (c, w) => {
    iceGiant(c, w, '#f0b860', '#a8602a');
    c.fillStyle = 'rgba(255,200,120,0.35)';
    circle(c, w / 2, w / 2, w * 0.49);
    c.fill();
  });
  makeTex(scene, 'sun', 220, 220, (c, w) => sun(c, w));
  makeTex(scene, 'earthPole', 400, 400, (c, w) => earthPole(c, w));
  makeTex(scene, 'voyager', 220, 160, (c, w, h) => drawVoyager(c, w, h));
  makeTex(scene, 'titan3e', 80, 500, (c, w, h) => drawTitan(c, w, h));
  makeTex(scene, 'goldenRecordDisc', 260, 260, (c, w) => goldenRecord(c, w));
  Object.entries(ICONS).forEach(([key, fn]) => makeTex(scene, key, 100, 100, (c) => icon(c, fn)));
}
