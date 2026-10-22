// Chapter 7 (James Webb Space Telescope): Webb and its gold mirror, Hubble, the Ariane 5
// rocket, galaxies and stars, and OSIRIS-REx with the asteroid Bennu.
import { seeded } from '../core/constants.js';
import { makeTex, roundRect, circle, poly, radial, linear, blob } from './core.js';

// the 18 mirror segments: two rings of hexagons around an empty centre (axial coordinates)
export const MIRROR_CELLS = (() => {
  const out = [];
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      const s = -q - r;
      const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
      if (ring === 1 || ring === 2) out.push({ q, r });
    }
  }
  return out;
})();

// centre of a flat-topped hexagon of radius R
export function hexCenter(q, r, R) {
  return { x: 1.5 * R * q, y: Math.sqrt(3) * R * (r + q / 2) };
}

export function hexPath(c, x, y, R) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push([x + Math.cos(a) * R, y + Math.sin(a) * R]);
  }
  poly(c, pts);
}

function goldHex(c, x, y, R) {
  hexPath(c, x, y, R * 0.94);
  c.fillStyle = linear(c, x - R, y - R, x + R, y + R, [[0, '#fff1b8'], [0.45, '#e2b54a'], [1, '#9a6a1a']]);
  c.fill();
  c.strokeStyle = 'rgba(80,50,10,0.6)';
  c.lineWidth = Math.max(1, R * 0.06);
  c.stroke();
}

function drawMirror(c, cx, cy, R) {
  MIRROR_CELLS.forEach(({ q, r }) => {
    const p = hexCenter(q, r, R);
    goldHex(c, cx + p.x, cy + p.y, R);
  });
}

// Webb, seen from the front: gold mirror on top of its five-layer sunshield
function drawJwst(c, w, h) {
  const cx = w / 2;
  // sunshield (five thin layers, seen at an angle)
  for (let k = 4; k >= 0; k--) {
    const off = k * 5;
    c.fillStyle = k === 0 ? linear(c, 0, h * 0.62, 0, h * 0.95, [[0, '#d9cff5'], [1, '#7a68b8']]) : `rgba(${150 - k * 12},${130 - k * 10},${200 - k * 10},0.9)`;
    poly(c, [[w * 0.02, h * 0.78 + off], [cx, h * 0.6 + off], [w * 0.98, h * 0.78 + off], [cx, h * 0.96 + off * 0.2]]);
    c.fill();
  }
  // the tower that holds the mirror up
  c.fillStyle = '#5d6475';
  c.fillRect(cx - 8, h * 0.5, 16, h * 0.18);
  // the mirror: 18 gold hexagons
  const R = w * 0.06;
  drawMirror(c, cx, h * 0.34, R);
  // the secondary mirror on its three struts
  c.strokeStyle = '#2b2f38';
  c.lineWidth = 3;
  [[cx, h * 0.34 - R * 4.4], [cx - R * 3.6, h * 0.34 + R * 2.4], [cx + R * 3.6, h * 0.34 + R * 2.4]].forEach(([x, y]) => {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(cx, h * 0.3);
    c.stroke();
  });
  c.fillStyle = '#e2b54a';
  circle(c, cx, h * 0.3, R * 0.55);
  c.fill();
  c.strokeStyle = '#2b2f38';
  c.lineWidth = 2;
  c.stroke();
}

// Hubble: a silver tube with two solar panel wings
function drawHubble(c, w, h) {
  const cy = h / 2;
  // solar panels
  [-1, 1].forEach((k) => {
    c.fillStyle = '#1e2a5c';
    c.fillRect(w * 0.3, cy + k * h * 0.28 - h * 0.08, w * 0.5, h * 0.16);
    c.strokeStyle = '#4f6bd8';
    c.lineWidth = 1;
    for (let i = 1; i < 8; i++) {
      c.beginPath();
      c.moveTo(w * (0.3 + i * 0.0625), cy + k * h * 0.28 - h * 0.08);
      c.lineTo(w * (0.3 + i * 0.0625), cy + k * h * 0.28 + h * 0.08);
      c.stroke();
    }
    c.fillStyle = '#9aa1ae';
    c.fillRect(w * 0.53, cy + k * h * 0.12, 4, k * h * 0.08);
  });
  // body
  c.fillStyle = linear(c, 0, cy - h * 0.14, 0, cy + h * 0.14, [[0, '#f4f6fb'], [0.5, '#b9c0cc'], [1, '#7d8496']]);
  roundRect(c, w * 0.08, cy - h * 0.14, w * 0.8, h * 0.28, 8);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    c.beginPath();
    c.moveTo(w * (0.08 + i * 0.13), cy - h * 0.14);
    c.lineTo(w * (0.08 + i * 0.13), cy + h * 0.14);
    c.stroke();
  }
  // the open door at the front
  c.fillStyle = '#c9ced8';
  c.save();
  c.translate(w * 0.08, cy - h * 0.14);
  c.rotate(-0.6);
  c.fillRect(-w * 0.12, -4, w * 0.12, 8);
  c.restore();
  c.fillStyle = '#1d2029';
  c.beginPath();
  c.ellipse(w * 0.08, cy, w * 0.02, h * 0.13, 0, 0, Math.PI * 2);
  c.fill();
}

// Ariane 5: a white core stage with two big side boosters
function drawAriane(c, w, h) {
  const cx = w / 2;
  // boosters
  [-1, 1].forEach((k) => {
    const x = cx + k * w * 0.3;
    c.fillStyle = linear(c, x - w * 0.12, 0, x + w * 0.12, 0, [[0, '#9aa1ae'], [0.4, '#f4f6fb'], [1, '#8a91a3']]);
    roundRect(c, x - w * 0.12, h * 0.42, w * 0.24, h * 0.5, 6);
    c.fill();
    poly(c, [[x - w * 0.12, h * 0.43], [x, h * 0.36], [x + w * 0.12, h * 0.43]]);
    c.fill();
    c.fillStyle = '#3a3f4b';
    poly(c, [[x - w * 0.09, h * 0.92], [x + w * 0.09, h * 0.92], [x + w * 0.11, h * 0.98], [x - w * 0.11, h * 0.98]]);
    c.fill();
  });
  // core stage and upper stage
  c.fillStyle = linear(c, cx - w * 0.2, 0, cx + w * 0.2, 0, [[0, '#b9c0cc'], [0.45, '#ffffff'], [1, '#9aa1ae']]);
  c.fillRect(cx - w * 0.2, h * 0.2, w * 0.4, h * 0.72);
  c.fillStyle = '#3a3f4b';
  c.fillRect(cx - w * 0.2, h * 0.32, w * 0.4, h * 0.012);
  // the fairing (where Webb rides, folded up)
  c.fillStyle = linear(c, cx - w * 0.22, 0, cx + w * 0.22, 0, [[0, '#c9ced8'], [0.45, '#ffffff'], [1, '#aab1c0']]);
  c.beginPath();
  c.moveTo(cx - w * 0.22, h * 0.21);
  c.lineTo(cx - w * 0.22, h * 0.08);
  c.quadraticCurveTo(cx - w * 0.2, 0, cx, 0);
  c.quadraticCurveTo(cx + w * 0.2, 0, cx + w * 0.22, h * 0.08);
  c.lineTo(cx + w * 0.22, h * 0.21);
  c.closePath();
  c.fill();
  c.fillStyle = '#2a4dbb';
  c.fillRect(cx - w * 0.04, h * 0.5, w * 0.08, h * 0.12);
  c.fillStyle = '#3a3f4b';
  poly(c, [[cx - w * 0.1, h * 0.92], [cx + w * 0.1, h * 0.92], [cx + w * 0.14, h], [cx - w * 0.14, h]]);
  c.fill();
}

// a spiral galaxy seen face-on
function spiralGalaxy(c, s, hue = [255, 220, 170]) {
  const cx = s / 2, cy = s / 2;
  c.fillStyle = radial(c, cx, cy, 0, s * 0.48, [[0, 'rgba(255,250,235,1)'], [0.18, `rgba(${hue[0]},${hue[1]},${hue[2]},0.8)`], [0.6, 'rgba(120,140,255,0.18)'], [1, 'rgba(0,0,0,0)']]);
  c.fillRect(0, 0, s, s);
  const rnd = seeded(81);
  for (let arm = 0; arm < 2; arm++) {
    for (let i = 0; i < 160; i++) {
      const t = i / 160;
      const a = arm * Math.PI + t * Math.PI * 2.4;
      const rr = s * 0.05 + t * s * 0.4;
      const x = cx + Math.cos(a) * rr + (rnd() - 0.5) * s * 0.05;
      const y = cy + Math.sin(a) * rr + (rnd() - 0.5) * s * 0.05;
      c.fillStyle = rnd() < 0.2 ? 'rgba(255,170,200,0.8)' : 'rgba(190,210,255,0.55)';
      circle(c, x, y, s * (0.004 + rnd() * 0.008));
      c.fill();
    }
  }
}

// Bennu: a small asteroid shaped like a spinning top, covered in boulders
function drawBennu(c, s) {
  const cx = s / 2, cy = s / 2;
  c.fillStyle = radial(c, cx - s * 0.12, cy - s * 0.12, s * 0.05, s * 0.5, [[0, '#8a847c'], [1, '#2e2b28']]);
  c.beginPath();
  c.moveTo(cx, cy - s * 0.42);
  c.quadraticCurveTo(cx + s * 0.36, cy - s * 0.32, cx + s * 0.46, cy);
  c.quadraticCurveTo(cx + s * 0.36, cy + s * 0.32, cx, cy + s * 0.42);
  c.quadraticCurveTo(cx - s * 0.36, cy + s * 0.32, cx - s * 0.46, cy);
  c.quadraticCurveTo(cx - s * 0.36, cy - s * 0.32, cx, cy - s * 0.42);
  c.fill();
  c.save();
  c.clip();
  const rnd = seeded(82);
  for (let i = 0; i < 40; i++) {
    c.fillStyle = rnd() < 0.5 ? 'rgba(20,18,16,0.55)' : 'rgba(200,190,175,0.35)';
    blob(c, s * (0.1 + rnd() * 0.8), s * (0.15 + rnd() * 0.7), s * (0.01 + rnd() * 0.04), rnd, 8, 0.4);
    c.fill();
  }
  c.restore();
}

// OSIRIS-REx with its sampling arm reaching out
function drawOsirisRex(c, w, h) {
  const cx = w * 0.45, cy = h / 2;
  // solar panels
  [-1, 1].forEach((k) => {
    c.fillStyle = '#1e2a5c';
    c.fillRect(cx + k * w * 0.16 - (k < 0 ? w * 0.28 : 0), cy - h * 0.1, w * 0.28, h * 0.2);
  });
  c.fillStyle = linear(c, cx - w * 0.15, 0, cx + w * 0.15, 0, [[0, '#a8782a'], [0.5, '#f0c96a'], [1, '#a8782a']]);
  roundRect(c, cx - w * 0.15, cy - h * 0.2, w * 0.3, h * 0.4, 6);
  c.fill();
  c.fillStyle = '#e9ecf2';
  c.beginPath();
  c.ellipse(cx, cy - h * 0.28, w * 0.12, h * 0.07, 0, 0, Math.PI * 2);
  c.fill();
  // the sampling arm (TAGSAM)
  c.strokeStyle = '#c9ced8';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(cx + w * 0.1, cy + h * 0.18);
  c.lineTo(cx + w * 0.3, cy + h * 0.42);
  c.stroke();
  c.fillStyle = '#9aa1ae';
  circle(c, cx + w * 0.31, cy + h * 0.44, h * 0.05);
  c.fill();
}

export function buildCh7Art(scene) {
  makeTex(scene, 'jwst', 320, 280, (c, w, h) => drawJwst(c, w, h));
  makeTex(scene, 'jwstMirror', 260, 260, (c, w) => drawMirror(c, w / 2, w / 2, w * 0.1));
  makeTex(scene, 'hubble', 260, 140, (c, w, h) => drawHubble(c, w, h));
  makeTex(scene, 'ariane5', 90, 520, (c, w, h) => drawAriane(c, w, h));
  makeTex(scene, 'galaxySpiral', 160, 160, (c, w) => spiralGalaxy(c, w));
  makeTex(scene, 'galaxyRed', 90, 90, (c, w) => {
    c.fillStyle = radial(c, w / 2, w / 2, 0, w * 0.45, [[0, 'rgba(255,190,140,1)'], [0.35, 'rgba(230,90,40,0.8)'], [1, 'rgba(120,20,10,0)']]);
    c.fillRect(0, 0, w, w);
  });
  makeTex(scene, 'starYellow', 90, 90, (c, w) => {
    c.fillStyle = radial(c, w / 2, w / 2, 0, w * 0.45, [[0, 'rgba(255,255,240,1)'], [0.25, 'rgba(255,230,150,0.9)'], [1, 'rgba(255,200,80,0)']]);
    c.fillRect(0, 0, w, w);
  });
  makeTex(scene, 'bennu', 140, 140, (c, w) => drawBennu(c, w));
  makeTex(scene, 'osirisRex', 180, 140, (c, w, h) => drawOsirisRex(c, w, h));
}
