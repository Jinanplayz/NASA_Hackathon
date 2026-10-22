// Chapter 6 (Mars rovers): Mars, the rovers from Lunokhod to Perseverance, the spacecraft
// that carried them down, and Martian rocks.
import { seeded } from '../core/constants.js';
import { makeTex, roundRect, circle, poly, radial, linear, blob } from './core.js';

// ---------- Mars ----------
function mars(c, s) {
  const cx = s / 2, cy = s / 2, r = s * 0.46;
  c.fillStyle = radial(c, cx - r * 0.3, cy - r * 0.3, r * 0.1, r * 1.05, [[0, '#e8743a'], [0.6, '#c1501f'], [1, '#7a2c0e']]);
  circle(c, cx, cy, r);
  c.fill();
  c.save();
  circle(c, cx, cy, r);
  c.clip();
  const rnd = seeded(61);
  // dark markings (old lava plains)
  [[0.1, 0.05, 0.32], [-0.35, 0.25, 0.22], [0.42, -0.2, 0.18], [-0.1, 0.45, 0.2]].forEach(([dx, dy, k]) => {
    c.fillStyle = 'rgba(110,40,20,0.55)';
    blob(c, cx + dx * r, cy + dy * r, r * k, rnd, 12, 0.45);
    c.fill();
  });
  // bright dusty patches
  for (let i = 0; i < 10; i++) {
    c.fillStyle = 'rgba(255,170,110,0.18)';
    blob(c, cx + (rnd() - 0.5) * r * 1.7, cy + (rnd() - 0.5) * r * 1.7, r * (0.08 + rnd() * 0.14), rnd, 10, 0.4);
    c.fill();
  }
  // Valles Marineris, the giant canyon
  c.strokeStyle = 'rgba(90,30,12,0.7)';
  c.lineWidth = s * 0.012;
  c.beginPath();
  c.moveTo(cx - r * 0.55, cy - r * 0.02);
  c.quadraticCurveTo(cx - r * 0.1, cy - r * 0.12, cx + r * 0.35, cy + r * 0.02);
  c.stroke();
  // Olympus Mons and the Tharsis volcanoes
  [[-0.72, -0.2, 0.07], [-0.6, 0.02, 0.04], [-0.55, 0.12, 0.04], [-0.5, -0.06, 0.04]].forEach(([dx, dy, k]) => {
    c.fillStyle = 'rgba(255,190,140,0.5)';
    circle(c, cx + dx * r, cy + dy * r, r * k);
    c.fill();
    c.fillStyle = 'rgba(120,45,20,0.6)';
    circle(c, cx + dx * r, cy + dy * r, r * k * 0.35);
    c.fill();
  });
  // the north polar ice cap
  c.fillStyle = 'rgba(255,255,255,0.92)';
  c.beginPath();
  c.ellipse(cx + r * 0.05, cy - r * 0.93, r * 0.36, r * 0.16, 0, 0, Math.PI * 2);
  c.fill();
  // night side
  c.fillStyle = radial(c, cx - r * 0.35, cy - r * 0.3, r * 0.3, r * 1.15, [[0, 'rgba(0,0,0,0)'], [0.75, 'rgba(0,0,0,0.05)'], [1, 'rgba(10,0,10,0.6)']]);
  c.fillRect(0, 0, s, s);
  c.restore();
  // thin hazy atmosphere at the edge
  c.strokeStyle = 'rgba(255,170,130,0.35)';
  c.lineWidth = s * 0.012;
  circle(c, cx, cy, r + s * 0.004);
  c.stroke();
}

// ---------- shared rover parts ----------
function wheel(c, x, y, r, o = {}) {
  c.fillStyle = o.tire ?? '#3a3f4b';
  circle(c, x, y, r);
  c.fill();
  c.fillStyle = o.rim ?? '#8a91a3';
  circle(c, x, y, r * 0.72);
  c.fill();
  if (o.treads) {
    // smooth metal wheels with a darker rim, curved spokes and small grip ridges
    c.strokeStyle = 'rgba(40,44,56,0.55)';
    c.lineWidth = Math.max(1, r * 0.08);
    circle(c, x, y, r * 0.96);
    c.stroke();
    c.lineWidth = Math.max(1, r * 0.1);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      c.beginPath();
      c.moveTo(x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25);
      c.quadraticCurveTo(x + Math.cos(a + 0.5) * r * 0.5, y + Math.sin(a + 0.5) * r * 0.5, x + Math.cos(a + 0.3) * r * 0.7, y + Math.sin(a + 0.3) * r * 0.7);
      c.stroke();
    }
    c.fillStyle = 'rgba(40,44,56,0.5)';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      circle(c, x + Math.cos(a) * r * 0.86, y + Math.sin(a) * r * 0.86, r * 0.05);
      c.fill();
    }
  }
  if (o.spokes) {
    c.strokeStyle = o.spokeColor ?? '#c9ced8';
    c.lineWidth = Math.max(1, r * 0.08);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7);
      c.stroke();
    }
  }
  c.fillStyle = o.hub ?? '#c9ced8';
  circle(c, x, y, r * 0.22);
  c.fill();
}

function bar(c, x0, y0, x1, y1, wdt, col) {
  c.strokeStyle = col;
  c.lineWidth = wdt;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
}

// Curiosity or Perseverance, seen from the side and facing right.
export function drawBigRover(c, w, h, o = {}) {
  const white = o.white ?? '#e9ecf2';
  const gy = h * 0.82, r = h * 0.13;
  const xs = [w * 0.2, w * 0.47, w * 0.78];
  // rocker-bogie suspension
  bar(c, xs[0], gy, w * 0.36, h * 0.55, 5, '#aab1c0');
  bar(c, w * 0.36, h * 0.55, w * 0.6, h * 0.66, 5, '#aab1c0');
  bar(c, w * 0.6, h * 0.66, xs[1], gy, 5, '#aab1c0');
  bar(c, w * 0.6, h * 0.66, xs[2], gy, 5, '#aab1c0');
  // nuclear power source at the back, with its cooling fins
  c.save();
  c.translate(w * 0.13, h * 0.42);
  c.rotate(-0.55);
  c.fillStyle = '#4a4f5c';
  roundRect(c, -w * 0.09, -h * 0.07, w * 0.18, h * 0.14, 6);
  c.fill();
  c.fillStyle = '#6b7290';
  for (let i = 0; i < 7; i++) c.fillRect(-w * 0.08 + i * w * 0.024, -h * 0.1, w * 0.008, h * 0.2);
  c.restore();
  // body
  c.fillStyle = linear(c, 0, h * 0.4, 0, h * 0.6, [[0, white], [1, '#b9c0cc']]);
  roundRect(c, w * 0.2, h * 0.4, w * 0.58, h * 0.17, 6);
  c.fill();
  c.fillStyle = 'rgba(0,0,0,0.15)';
  c.fillRect(w * 0.2, h * 0.53, w * 0.58, h * 0.04);
  // gold-wrapped parts on the deck
  c.fillStyle = '#d8ad52';
  roundRect(c, w * 0.42, h * 0.34, w * 0.14, h * 0.07, 4);
  c.fill();
  // the round dish antenna
  c.fillStyle = '#5d6475';
  c.fillRect(w * 0.31, h * 0.3, w * 0.012, h * 0.1);
  c.fillStyle = '#c9ced8';
  c.save();
  c.translate(w * 0.315, h * 0.28);
  c.rotate(-0.3);
  c.fillRect(-w * 0.06, -h * 0.015, w * 0.12, h * 0.03);
  c.restore();
  // the mast and its head (cameras and, on Curiosity, the rock-zapping laser)
  c.fillStyle = '#c9ced8';
  c.fillRect(w * 0.7, h * 0.12, w * 0.025, h * 0.29);
  c.fillStyle = white;
  roundRect(c, w * 0.66, h * 0.05, w * 0.15, h * 0.1, 5);
  c.fill();
  c.fillStyle = '#1d2029';
  circle(c, w * 0.79, h * 0.1, h * 0.025);
  c.fill();
  circle(c, w * 0.745, h * 0.1, h * 0.018);
  c.fill();
  if (o.laser) {
    c.fillStyle = '#5d6475';
    roundRect(c, w * 0.67, h * 0.065, w * 0.05, h * 0.07, 3);
    c.fill();
  }
  // the robot arm folded in front, with its tool turret
  bar(c, w * 0.78, h * 0.47, w * 0.9, h * 0.38, 5, '#9aa1ae');
  bar(c, w * 0.9, h * 0.38, w * 0.92, h * 0.58, 5, '#9aa1ae');
  c.fillStyle = o.turret ?? '#6b7290';
  circle(c, w * 0.925, h * 0.62, h * 0.06);
  c.fill();
  c.fillStyle = '#c9ced8';
  c.fillRect(w * 0.915, h * 0.66, w * 0.02, h * 0.07);
  // wheels
  xs.forEach((x) => wheel(c, x, gy, r, { tire: o.tire ?? '#c9ced8', rim: o.rimColor ?? '#aab1c0', hub: '#5d6475', treads: true }));
}

// Spirit or Opportunity: a smaller rover with big solar-panel wings.
function drawMer(c, w, h) {
  const gy = h * 0.84, r = h * 0.09;
  const xs = [w * 0.22, w * 0.5, w * 0.78];
  bar(c, xs[0], gy, w * 0.38, h * 0.62, 4, '#aab1c0');
  bar(c, w * 0.38, h * 0.62, w * 0.62, h * 0.7, 4, '#aab1c0');
  bar(c, w * 0.62, h * 0.7, xs[1], gy, 4, '#aab1c0');
  bar(c, w * 0.62, h * 0.7, xs[2], gy, 4, '#aab1c0');
  // gold body
  c.fillStyle = linear(c, 0, h * 0.5, 0, h * 0.66, [[0, '#f0c96a'], [1, '#a8782a']]);
  roundRect(c, w * 0.28, h * 0.52, w * 0.46, h * 0.13, 4);
  c.fill();
  // the solar panel deck and wings (dark blue cells)
  c.fillStyle = '#1e2a5c';
  poly(c, [[w * 0.02, h * 0.5], [w * 0.98, h * 0.5], [w * 0.94, h * 0.45], [w * 0.06, h * 0.45]]);
  c.fill();
  c.strokeStyle = '#4f6bd8';
  c.lineWidth = 1;
  for (let i = 1; i < 12; i++) {
    const x = w * (0.06 + i * 0.074);
    c.beginPath();
    c.moveTo(x, h * 0.455);
    c.lineTo(x - 2, h * 0.495);
    c.stroke();
  }
  c.fillStyle = '#c9ced8';
  c.fillRect(w * 0.02, h * 0.495, w * 0.96, h * 0.012);
  // mast with the two-eyed camera head
  c.fillStyle = '#c9ced8';
  c.fillRect(w * 0.66, h * 0.14, w * 0.025, h * 0.32);
  c.fillStyle = '#e9ecf2';
  roundRect(c, w * 0.6, h * 0.07, w * 0.16, h * 0.1, 4);
  c.fill();
  c.fillStyle = '#1d2029';
  circle(c, w * 0.635, h * 0.12, h * 0.025);
  c.fill();
  circle(c, w * 0.725, h * 0.12, h * 0.025);
  c.fill();
  // dish antenna
  c.fillStyle = '#9aa1ae';
  c.fillRect(w * 0.35, h * 0.33, w * 0.012, h * 0.12);
  c.fillStyle = '#e9ecf2';
  c.beginPath();
  c.ellipse(w * 0.355, h * 0.32, w * 0.06, h * 0.035, -0.2, 0, Math.PI * 2);
  c.fill();
  // arm with its rock grinder
  bar(c, w * 0.74, h * 0.6, w * 0.86, h * 0.66, 3, '#9aa1ae');
  c.fillStyle = '#6b7290';
  circle(c, w * 0.88, h * 0.69, h * 0.04);
  c.fill();
  xs.forEach((x) => wheel(c, x, gy, r, { tire: '#c9ced8', rim: '#9aa1ae', hub: '#5d6475', spokes: true, spokeColor: '#6b7290' }));
}

// Sojourner, the first Mars rover: the size of a microwave oven.
function drawSojourner(c, w, h) {
  const gy = h * 0.8, r = h * 0.12;
  const xs = [w * 0.2, w * 0.5, w * 0.8];
  bar(c, xs[0], gy, w * 0.35, h * 0.55, 3, '#aab1c0');
  bar(c, w * 0.35, h * 0.55, w * 0.65, h * 0.6, 3, '#aab1c0');
  bar(c, w * 0.65, h * 0.6, xs[1], gy, 3, '#aab1c0');
  bar(c, w * 0.65, h * 0.6, xs[2], gy, 3, '#aab1c0');
  c.fillStyle = linear(c, 0, h * 0.42, 0, h * 0.58, [[0, '#f0c96a'], [1, '#a8782a']]);
  roundRect(c, w * 0.25, h * 0.42, w * 0.5, h * 0.15, 3);
  c.fill();
  c.fillStyle = '#1e2a5c';
  c.fillRect(w * 0.12, h * 0.36, w * 0.76, h * 0.07);
  c.fillStyle = '#c9ced8';
  c.fillRect(w * 0.12, h * 0.43, w * 0.76, h * 0.02);
  // radio antenna
  bar(c, w * 0.3, h * 0.37, w * 0.3, h * 0.05, 2, '#d7dbe3');
  c.fillStyle = '#1d2029';
  circle(c, w * 0.76, h * 0.5, h * 0.03);
  c.fill();
  xs.forEach((x) => wheel(c, x, gy, r, { tire: '#c9ced8', rim: '#9aa1ae', hub: '#5d6475', spokes: true, spokeColor: '#6b7290' }));
}

// Sojourner from above (for driving on a map). Front is to the right.
function drawSojournerTop(c, s) {
  c.fillStyle = '#c9ced8';
  [[0.2, 0.08], [0.5, 0.08], [0.8, 0.08], [0.2, 0.92], [0.5, 0.92], [0.8, 0.92]].forEach(([x, y]) => {
    roundRect(c, s * x - s * 0.09, s * y - s * 0.07, s * 0.18, s * 0.14, 3);
    c.fill();
  });
  c.fillStyle = '#1e2a5c';
  roundRect(c, s * 0.1, s * 0.18, s * 0.8, s * 0.64, 4);
  c.fill();
  c.strokeStyle = '#4f6bd8';
  c.lineWidth = 1;
  for (let i = 1; i < 6; i++) {
    c.beginPath();
    c.moveTo(s * (0.1 + i * 0.133), s * 0.2);
    c.lineTo(s * (0.1 + i * 0.133), s * 0.8);
    c.stroke();
  }
  // a little arrow on the nose so you can see which way it faces
  c.fillStyle = '#ffd166';
  poly(c, [[s * 0.98, s * 0.5], [s * 0.82, s * 0.36], [s * 0.82, s * 0.64]]);
  c.fill();
}

// The Soviet Lunokhod 1 rover (1970): a tub on eight wheels with a solar-panel lid.
function drawLunokhod(c, w, h) {
  const gy = h * 0.82, r = h * 0.11;
  // the open lid (solar cells on the inside)
  c.save();
  c.translate(w * 0.2, h * 0.38);
  c.rotate(-0.9);
  c.fillStyle = '#1e2a5c';
  c.fillRect(-w * 0.02, -h * 0.03, w * 0.5, h * 0.06);
  c.fillStyle = '#9aa1ae';
  c.fillRect(-w * 0.02, h * 0.02, w * 0.5, h * 0.02);
  c.restore();
  // the tub
  c.fillStyle = linear(c, 0, h * 0.36, 0, h * 0.68, [[0, '#d7dbe3'], [1, '#7d8496']]);
  c.beginPath();
  c.moveTo(w * 0.12, h * 0.38);
  c.lineTo(w * 0.88, h * 0.38);
  c.quadraticCurveTo(w * 0.86, h * 0.68, w * 0.72, h * 0.68);
  c.lineTo(w * 0.28, h * 0.68);
  c.quadraticCurveTo(w * 0.14, h * 0.68, w * 0.12, h * 0.38);
  c.fill();
  c.fillStyle = '#5d6475';
  c.fillRect(w * 0.12, h * 0.36, w * 0.76, h * 0.04);
  // TV camera eyes on the front and antennas
  c.fillStyle = '#1d2029';
  circle(c, w * 0.8, h * 0.48, h * 0.035);
  c.fill();
  circle(c, w * 0.72, h * 0.48, h * 0.035);
  c.fill();
  bar(c, w * 0.55, h * 0.37, w * 0.62, h * 0.08, 2, '#c9ced8');
  bar(c, w * 0.45, h * 0.37, w * 0.38, h * 0.12, 2, '#c9ced8');
  c.fillStyle = '#c9ced8';
  c.beginPath();
  c.moveTo(w * 0.66, h * 0.37);
  c.lineTo(w * 0.74, h * 0.2);
  c.lineTo(w * 0.78, h * 0.24);
  c.closePath();
  c.fill();
  [0.2, 0.4, 0.6, 0.8].forEach((k) => wheel(c, w * k, gy, r, { tire: '#5d6475', rim: '#9aa1ae', hub: '#3a3f4b', spokes: true, spokeColor: '#c9ced8' }));
}

// The Apollo Lunar Roving Vehicle with two astronauts aboard, facing right.
function seatedAstronaut(c, x, y, s) {
  // backpack
  c.fillStyle = '#d7dbe3';
  roundRect(c, x - s * 0.55, y - s * 1.25, s * 0.35, s * 0.8, 4);
  c.fill();
  // body and legs
  c.fillStyle = '#f4f6fb';
  roundRect(c, x - s * 0.25, y - s * 1.2, s * 0.55, s * 0.95, 6);
  c.fill();
  roundRect(c, x - s * 0.1, y - s * 0.4, s * 0.85, s * 0.3, 6);
  c.fill();
  roundRect(c, x + s * 0.55, y - s * 0.4, s * 0.25, s * 0.6, 5);
  c.fill();
  // arm on the controls
  roundRect(c, x + s * 0.05, y - s * 0.95, s * 0.6, s * 0.22, 5);
  c.fill();
  // helmet with gold visor
  c.fillStyle = '#f4f6fb';
  circle(c, x + s * 0.02, y - s * 1.45, s * 0.33);
  c.fill();
  c.fillStyle = '#d8ad52';
  c.beginPath();
  c.ellipse(x + s * 0.14, y - s * 1.45, s * 0.2, s * 0.22, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#c0392b';
  c.fillRect(x - s * 0.22, y - s * 1.15, s * 0.1, s * 0.12);
}

function drawLrv(c, w, h) {
  const gy = h * 0.78, r = h * 0.17;
  // chassis
  c.fillStyle = '#9aa1ae';
  c.fillRect(w * 0.12, h * 0.6, w * 0.78, h * 0.06);
  c.fillStyle = '#c9ced8';
  roundRect(c, w * 0.2, h * 0.5, w * 0.5, h * 0.12, 3);
  c.fill();
  // seats with the astronauts
  seatedAstronaut(c, w * 0.32, h * 0.6, h * 0.22);
  seatedAstronaut(c, w * 0.55, h * 0.6, h * 0.22);
  // control console
  c.fillStyle = '#6b7290';
  c.fillRect(w * 0.7, h * 0.4, w * 0.04, h * 0.2);
  // umbrella-shaped dish antenna and TV camera on the front
  bar(c, w * 0.82, h * 0.62, w * 0.82, h * 0.2, 2, '#c9ced8');
  c.fillStyle = '#e9e2cc';
  c.beginPath();
  c.moveTo(w * 0.74, h * 0.18);
  c.quadraticCurveTo(w * 0.82, h * 0.02, w * 0.92, h * 0.12);
  c.lineTo(w * 0.83, h * 0.22);
  c.closePath();
  c.fill();
  c.fillStyle = '#d8ad52';
  roundRect(c, w * 0.85, h * 0.42, w * 0.05, h * 0.1, 2);
  c.fill();
  // wire-mesh wheels under orange fenders
  [w * 0.2, w * 0.82].forEach((x) => {
    wheel(c, x, gy, r, { tire: '#8a91a3', rim: '#b9c0cc', hub: '#5d6475', spokes: true, spokeColor: '#5d6475' });
    c.strokeStyle = '#d98a3a';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(x, gy, r * 1.15, Math.PI * 1.1, Math.PI * 1.9);
    c.stroke();
  });
}

// Mariner 4 (1965): an eight-sided body, four solar panels and a dish.
function drawMariner4(c, s) {
  const cx = s / 2, cy = s / 2;
  // solar panels in an X, each with a small vane at the tip
  for (let i = 0; i < 4; i++) {
    c.save();
    c.translate(cx, cy);
    c.rotate(Math.PI / 4 + (i * Math.PI) / 2);
    c.fillStyle = '#1e2a5c';
    c.fillRect(s * 0.1, -s * 0.06, s * 0.3, s * 0.12);
    c.strokeStyle = '#4f6bd8';
    c.lineWidth = 1;
    for (let k = 1; k < 5; k++) {
      c.beginPath();
      c.moveTo(s * (0.1 + k * 0.06), -s * 0.06);
      c.lineTo(s * (0.1 + k * 0.06), s * 0.06);
      c.stroke();
    }
    c.fillStyle = '#c9ced8';
    c.fillRect(s * 0.4, -s * 0.045, s * 0.07, s * 0.09);
    c.restore();
  }
  // the body
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    pts.push([cx + Math.cos(a) * s * 0.13, cy + Math.sin(a) * s * 0.13]);
  }
  c.fillStyle = linear(c, cx - s * 0.13, 0, cx + s * 0.13, 0, [[0, '#a8782a'], [0.5, '#f0c96a'], [1, '#a8782a']]);
  poly(c, pts);
  c.fill();
  // the dish antenna on top
  c.fillStyle = '#e9ecf2';
  c.beginPath();
  c.ellipse(cx, cy - s * 0.02, s * 0.09, s * 0.06, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#9aa1ae';
  c.lineWidth = 1.5;
  c.stroke();
  // the camera underneath and the long antenna mast
  bar(c, cx, cy - s * 0.04, cx + s * 0.02, s * 0.06, 2, '#c9ced8');
  c.fillStyle = '#1d2029';
  circle(c, cx + s * 0.05, cy + s * 0.08, s * 0.025);
  c.fill();
}

// Pathfinder's airbags: a ball of puffy lobes around the lander.
function drawAirbag(c, s) {
  const cx = s / 2, cy = s / 2, R = s * 0.45;
  c.fillStyle = 'rgba(0,0,0,0.2)';
  circle(c, cx + 2, cy + 3, R);
  c.fill();
  const lobes = [];
  for (let ring = 0; ring < 3; ring++) {
    const n = ring === 0 ? 1 : ring === 1 ? 6 : 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.3;
      const d = ring * R * 0.36;
      lobes.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * (ring === 2 ? 0.3 : 0.36)]);
    }
  }
  lobes.reverse().forEach(([x, y, r]) => {
    c.fillStyle = radial(c, x - r * 0.3, y - r * 0.3, r * 0.1, r, [[0, '#fbf6ea'], [1, '#c9bfa8']]);
    circle(c, x, y, r);
    c.fill();
    c.strokeStyle = 'rgba(120,100,70,0.35)';
    c.lineWidth = 1;
    c.stroke();
  });
}

// The Pathfinder lander with its petals open and Sojourner on the ramp.
function drawPathfinder(c, w, h) {
  const gy = h * 0.85;
  c.fillStyle = '#c9bfa8';
  c.beginPath();
  c.ellipse(w * 0.5, gy, w * 0.48, h * 0.08, 0, 0, Math.PI * 2);
  c.fill();
  // three petals (solar cells)
  c.fillStyle = '#1e2a5c';
  poly(c, [[w * 0.08, gy], [w * 0.32, gy - h * 0.08], [w * 0.45, gy - h * 0.05], [w * 0.3, gy + h * 0.04]]);
  c.fill();
  poly(c, [[w * 0.92, gy], [w * 0.68, gy - h * 0.08], [w * 0.55, gy - h * 0.05], [w * 0.7, gy + h * 0.04]]);
  c.fill();
  c.fillStyle = '#d8ad52';
  roundRect(c, w * 0.4, gy - h * 0.16, w * 0.2, h * 0.12, 3);
  c.fill();
  // the camera on its mast
  c.fillStyle = '#c9ced8';
  c.fillRect(w * 0.49, gy - h * 0.62, w * 0.02, h * 0.48);
  c.fillStyle = '#e9ecf2';
  roundRect(c, w * 0.45, gy - h * 0.72, w * 0.1, h * 0.12, 3);
  c.fill();
  c.fillStyle = '#1d2029';
  circle(c, w * 0.475, gy - h * 0.66, h * 0.025);
  c.fill();
  circle(c, w * 0.525, gy - h * 0.66, h * 0.025);
  c.fill();
  // little Sojourner on the ramp
  c.save();
  c.translate(w * 0.7, gy - h * 0.2);
  c.rotate(0.2);
  drawSojourner(c, w * 0.16, h * 0.22);
  c.restore();
}

// The sky crane: the rocket-powered descent stage that lowered Curiosity and Perseverance.
function drawDescentStage(c, w, h) {
  // frame
  c.fillStyle = '#9aa1ae';
  c.fillRect(w * 0.08, h * 0.38, w * 0.84, h * 0.12);
  c.fillStyle = '#d8ad52';
  roundRect(c, w * 0.3, h * 0.2, w * 0.4, h * 0.22, 5);
  c.fill();
  // fuel tanks
  [0.18, 0.82].forEach((k) => {
    c.fillStyle = radial(c, w * k - 6, h * 0.3, 2, h * 0.2, [[0, '#ffffff'], [1, '#9aa1ae']]);
    circle(c, w * k, h * 0.34, h * 0.18);
    c.fill();
  });
  // engines pointing down and outwards at the corners
  [[0.1, -0.35], [0.26, -0.15], [0.74, 0.15], [0.9, 0.35]].forEach(([k, a]) => {
    c.save();
    c.translate(w * k, h * 0.52);
    c.rotate(a);
    c.fillStyle = '#5d6475';
    poly(c, [[-w * 0.025, 0], [w * 0.025, 0], [w * 0.04, h * 0.3], [-w * 0.04, h * 0.3]]);
    c.fill();
    c.restore();
  });
  // the reel the cables come out of
  c.fillStyle = '#3a3f4b';
  circle(c, w * 0.5, h * 0.5, h * 0.06);
  c.fill();
}

// Ingenuity, the Mars helicopter (no rotors: those are drawn separately so they can spin).
function drawIngenuity(c, w, h) {
  const cx = w / 2;
  // legs
  bar(c, cx - w * 0.08, h * 0.62, cx - w * 0.3, h * 0.96, 2, '#c9ced8');
  bar(c, cx + w * 0.08, h * 0.62, cx + w * 0.3, h * 0.96, 2, '#c9ced8');
  bar(c, cx - w * 0.04, h * 0.64, cx - w * 0.12, h * 0.98, 2, '#9aa1ae');
  bar(c, cx + w * 0.04, h * 0.64, cx + w * 0.12, h * 0.98, 2, '#9aa1ae');
  // body (a small box wrapped in insulation)
  c.fillStyle = linear(c, cx - w * 0.12, 0, cx + w * 0.12, 0, [[0, '#a8782a'], [0.5, '#f0e2b8'], [1, '#a8782a']]);
  roundRect(c, cx - w * 0.12, h * 0.48, w * 0.24, h * 0.18, 4);
  c.fill();
  // mast
  c.fillStyle = '#9aa1ae';
  c.fillRect(cx - 2, h * 0.08, 4, h * 0.42);
  // solar panel on top
  c.fillStyle = '#1e2a5c';
  c.fillRect(cx - w * 0.16, h * 0.02, w * 0.32, h * 0.05);
  // the two rotor hubs
  c.fillStyle = '#5d6475';
  roundRect(c, cx - 6, h * 0.2, 12, 7, 2);
  c.fill();
  roundRect(c, cx - 6, h * 0.34, 12, 7, 2);
  c.fill();
}

// A Martian parachute (orange and white) and the backshell it pulls.
function drawMarsChute(c, w, h) {
  const g = 12;
  for (let i = 0; i < g; i++) {
    c.fillStyle = i % 2 ? '#f4f6fb' : '#ff8a3d';
    const a0 = Math.PI + (i / g) * Math.PI, a1 = Math.PI + ((i + 1) / g) * Math.PI;
    c.beginPath();
    c.moveTo(w / 2, h * 0.9);
    c.ellipse(w / 2, h * 0.9, w * 0.48, h * 0.85, 0, a0, a1);
    c.closePath();
    c.fill();
  }
  // the gap between the disk and the band
  c.strokeStyle = 'rgba(7,11,29,0.55)';
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(w / 2, h * 0.9, w * 0.36, h * 0.64, 0, Math.PI, Math.PI * 2);
  c.stroke();
}

function drawBackshell(c, w, h) {
  c.fillStyle = linear(c, 0, 0, w, 0, [[0, '#9aa1ae'], [0.45, '#f4f6fb'], [1, '#8a91a3']]);
  poly(c, [[w * 0.32, 0], [w * 0.68, 0], [w, h * 0.85], [0, h * 0.85]]);
  c.fill();
  c.fillStyle = '#7a4a2a';
  roundRect(c, 0, h * 0.82, w, h * 0.18, 4);
  c.fill();
}

// ---------- rocks ----------
function marsRock(c, w, h, seed, o = {}) {
  const rnd = seeded(seed);
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath();
  c.ellipse(w / 2, h * 0.9, w * 0.45, h * 0.08, 0, 0, Math.PI * 2);
  c.fill();
  c.save();
  if (o.sharp) {
    poly(c, [[w * 0.05, h * 0.9], [w * 0.22, h * 0.35], [w * 0.36, h * 0.6], [w * 0.5, h * 0.05], [w * 0.64, h * 0.5], [w * 0.78, h * 0.25], [w * 0.95, h * 0.9]]);
  } else {
    blob(c, w / 2, h * 0.58, Math.min(w, h) * 0.42, rnd, 10, 0.18);
  }
  c.fillStyle = linear(c, 0, 0, 0, h, [[0, o.light ?? '#c46a3a'], [1, o.dark ?? '#6e2e14']]);
  c.fill();
  c.clip();
  if (o.layers) {
    c.strokeStyle = 'rgba(255,220,180,0.35)';
    c.lineWidth = 2;
    for (let y = h * 0.25; y < h; y += h * 0.1) {
      c.beginPath();
      c.moveTo(0, y);
      c.quadraticCurveTo(w / 2, y - h * 0.05, w, y + h * 0.02);
      c.stroke();
    }
  }
  if (o.spots) {
    for (let i = 0; i < 8; i++) {
      c.fillStyle = 'rgba(30,30,40,0.6)';
      circle(c, w * (0.25 + rnd() * 0.5), h * (0.4 + rnd() * 0.4), 2 + rnd() * 3);
      c.fill();
    }
  }
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.beginPath();
  c.ellipse(w * 0.38, h * 0.35, w * 0.16, h * 0.08, -0.4, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

// ---------- Martian scenery (tiles that repeat sideways without a seam) ----------
export function hillsTile(c, w, h, color, amp, seed, base = 0.55) {
  const rnd = seeded(seed);
  const waves = [1, 2, 3, 5, 8].map((k) => ({ k, a: (amp * (0.5 + rnd())) / k, p: rnd() * Math.PI * 2 }));
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) {
    const y = h * base - waves.reduce((sum, wv) => sum + Math.sin((x / w) * Math.PI * 2 * wv.k + wv.p) * wv.a, 0);
    c.lineTo(x, y);
  }
  c.lineTo(w, h);
  c.closePath();
  c.fill();
}

export function groundTile(c, w, h, top, bottom, seed, dark = 'rgba(70,25,10,0.45)', light = 'rgba(255,200,160,0.25)') {
  c.fillStyle = linear(c, 0, 0, 0, h, [[0, top], [1, bottom]]);
  c.fillRect(0, 0, w, h);
  const rnd = seeded(seed);
  for (let i = 0; i < 180; i++) {
    const x = rnd() * w, y = 4 + rnd() * (h - 4), r = 1 + rnd() * 3 * (0.4 + y / h);
    c.fillStyle = rnd() < 0.55 ? dark : light;
    // drawn again past the edges so the tile repeats without a seam
    [x, x - w, x + w].forEach((xx) => {
      c.beginPath();
      c.ellipse(xx, y, r * 1.4, r, 0, 0, Math.PI * 2);
      c.fill();
    });
  }
}

// three rocks to choose from for drilling
function rockWithVeins(c, w, h) {
  marsRock(c, w, h, 76, { layers: true, light: '#c8865a', dark: '#6e3a20' });
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = 2;
  [[0.25, 0.45, 0.5, 0.62], [0.4, 0.35, 0.7, 0.55], [0.3, 0.7, 0.62, 0.78]].forEach(([x0, y0, x1, y1]) => {
    c.beginPath();
    c.moveTo(w * x0, h * y0);
    c.quadraticCurveTo(w * (x0 + x1) / 2, h * (y0 + y1) / 2 - 6, w * x1, h * y1);
    c.stroke();
  });
}

function pebbles(c, w, h) {
  const rnd = seeded(77);
  c.fillStyle = 'rgba(0,0,0,0.2)';
  c.beginPath();
  c.ellipse(w / 2, h * 0.9, w * 0.46, h * 0.08, 0, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < 26; i++) {
    const x = w * (0.12 + rnd() * 0.76), y = h * (0.45 + rnd() * 0.42), r = 4 + rnd() * 8;
    c.fillStyle = linear(c, 0, y - r, 0, y + r, [[0, ['#d08a5a', '#b9734a', '#9a5a3a'][i % 3]], [1, '#5a2a14']]);
    circle(c, x, y, r);
    c.fill();
  }
}

function rockOnSlope(c, w, h) {
  c.fillStyle = '#9a5634';
  poly(c, [[0, h], [0, h * 0.85], [w, h * 0.35], [w, h]]);
  c.fill();
  c.save();
  c.translate(w * 0.5, h * 0.55);
  c.rotate(-0.45);
  c.translate(-w * 0.35, -h * 0.4);
  marsRock(c, w * 0.7, h * 0.55, 78, { light: '#b06a40', dark: '#5a2a14' });
  c.restore();
}

export function buildCh6Art(scene) {
  makeTex(scene, 'drillRockVeins', 140, 100, (c, w, h) => rockWithVeins(c, w, h));
  makeTex(scene, 'drillPebbles', 140, 100, (c, w, h) => pebbles(c, w, h));
  makeTex(scene, 'drillSlope', 140, 100, (c, w, h) => rockOnSlope(c, w, h));
  makeTex(scene, 'marsHillsFar', 1024, 220, (c, w, h) => hillsTile(c, w, h, '#b9734a', 55, 11), 1);
  makeTex(scene, 'marsHillsNear', 1024, 200, (c, w, h) => hillsTile(c, w, h, '#a65a32', 32, 12), 1);
  makeTex(scene, 'marsGround', 512, 520, (c, w, h) => groundTile(c, w, h, '#c4693a', '#7a3418', 13), 1);
  makeTex(scene, 'mars', 300, 300, (c, w) => mars(c, w));
  makeTex(scene, 'curiosity', 280, 190, (c, w, h) => drawBigRover(c, w, h, { laser: true }));
  makeTex(scene, 'perseverance', 280, 190, (c, w, h) => drawBigRover(c, w, h, { white: '#f6f7fa', tire: '#d7dbe3', turret: '#9aa1ae' }));
  makeTex(scene, 'merRover', 240, 160, (c, w, h) => drawMer(c, w, h));
  makeTex(scene, 'sojourner', 120, 80, (c, w, h) => drawSojourner(c, w, h));
  makeTex(scene, 'sojournerTop', 64, 64, (c, w) => drawSojournerTop(c, w));
  makeTex(scene, 'lunokhod', 180, 120, (c, w, h) => drawLunokhod(c, w, h));
  makeTex(scene, 'lrv', 240, 140, (c, w, h) => drawLrv(c, w, h));
  makeTex(scene, 'mariner4', 200, 200, (c, w) => drawMariner4(c, w));
  makeTex(scene, 'airbagBall', 130, 130, (c, w) => drawAirbag(c, w));
  makeTex(scene, 'pathfinder', 260, 120, (c, w, h) => drawPathfinder(c, w, h));
  makeTex(scene, 'descentStage', 220, 90, (c, w, h) => drawDescentStage(c, w, h));
  makeTex(scene, 'ingenuity', 120, 110, (c, w, h) => drawIngenuity(c, w, h));
  makeTex(scene, 'marsChute', 170, 90, (c, w, h) => drawMarsChute(c, w, h));
  makeTex(scene, 'backshell', 90, 56, (c, w, h) => drawBackshell(c, w, h));
  makeTex(scene, 'marsRock', 100, 70, (c, w, h) => marsRock(c, w, h, 71));
  makeTex(scene, 'marsRockLayered', 110, 80, (c, w, h) => marsRock(c, w, h, 72, { layers: true, light: '#d08050' }));
  makeTex(scene, 'marsRockSharp', 90, 70, (c, w, h) => marsRock(c, w, h, 73, { sharp: true, light: '#8a5a44', dark: '#3a2418' }));
  makeTex(scene, 'marsRockSpots', 100, 74, (c, w, h) => marsRock(c, w, h, 74, { spots: true, light: '#d9785a', dark: '#7a3018' }));
  makeTex(scene, 'moonRock', 90, 64, (c, w, h) => marsRock(c, w, h, 75, { light: '#b9b4ac', dark: '#5d5850' }));
}
