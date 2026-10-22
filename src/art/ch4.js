// Chapter 4 (Apollo 13): things on board, the 'mailbox' air filter, batteries,
// and the service module before and after the explosion.
import { makeTex, roundRect, circle, poly, radial, linear } from './core.js';
import { drawSM } from './craft.js';

// The service module standing up (engine at the bottom). The damaged one has the panel
// over oxygen tank 2 blown away, showing torn insulation and wiring inside.
function serviceModule(c, w, h, damaged) {
  drawSM(c, 0, 0, w, h);
  if (!damaged) return;
  c.fillStyle = '#1a1612';
  poly(c, [[w * 0.18, h * 0.12], [w * 0.62, h * 0.08], [w * 0.7, h * 0.72], [w * 0.22, h * 0.76]]);
  c.fill();
  c.fillStyle = '#8a6a3a';
  for (let i = 0; i < 9; i++) {
    const x = w * (0.24 + ((i * 37) % 40) / 100), y = h * (0.18 + ((i * 53) % 50) / 100);
    c.fillRect(x, y, w * 0.08, h * 0.03);
  }
  c.strokeStyle = '#c9a26b';
  c.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    c.beginPath();
    c.moveTo(w * 0.3, h * (0.2 + i * 0.09));
    c.quadraticCurveTo(w * 0.5, h * (0.25 + i * 0.08), w * 0.62, h * (0.18 + i * 0.1));
    c.stroke();
  }
  // jagged edges of the torn skin
  c.fillStyle = '#d7dbe3';
  poly(c, [[w * 0.62, h * 0.08], [w * 0.68, h * 0.2], [w * 0.64, h * 0.3], [w * 0.7, h * 0.42], [w * 0.66, h * 0.55], [w * 0.72, h * 0.72], [w * 0.75, h * 0.72], [w * 0.75, h * 0.06]]);
  c.fill();
}

// ---------- things the crew carried into Aquarius ----------
function crew(c) {
  [[30, '#eef1f7'], [50, '#dfe5ef'], [70, '#eef1f7']].forEach(([x, suit], i) => {
    const y = i === 1 ? 46 : 52;
    c.fillStyle = suit;
    roundRect(c, x - 13, y + 8, 26, 34, 10);
    c.fill();
    c.fillStyle = '#ffffff';
    circle(c, x, y, 13);
    c.fill();
    c.fillStyle = '#1b2a5c';
    roundRect(c, x - 8, y - 6, 16, 11, 5);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)';
    circle(c, x - 3, y - 3, 2);
    c.fill();
  });
}

function checklist(c) {
  c.fillStyle = '#7a5a2e';
  roundRect(c, 22, 14, 56, 74, 6);
  c.fill();
  c.fillStyle = '#f5ecd6';
  roundRect(c, 26, 18, 48, 66, 4);
  c.fill();
  c.fillStyle = '#9aa1ae';
  roundRect(c, 40, 10, 20, 12, 3);
  c.fill();
  for (let i = 0; i < 6; i++) {
    c.fillStyle = '#3ddc97';
    c.fillRect(31, 28 + i * 9, 5, 5);
    c.fillStyle = '#7d8597';
    c.fillRect(40, 29 + i * 9, 28 - (i % 3) * 5, 3);
  }
}

function food(c) {
  c.fillStyle = '#d7dbe3';
  roundRect(c, 24, 22, 52, 62, 8);
  c.fill();
  c.fillStyle = '#ff9f43';
  roundRect(c, 24, 22, 52, 16, 8);
  c.fill();
  c.fillStyle = '#c0452f';
  circle(c, 40, 58, 7);
  c.fill();
  c.fillStyle = '#e8c27a';
  circle(c, 56, 62, 9);
  c.fill();
  c.fillStyle = '#4f9d52';
  circle(c, 48, 72, 6);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.2)';
  c.lineWidth = 2;
  roundRect(c, 24, 22, 52, 62, 8);
  c.stroke();
}

function water(c) {
  c.fillStyle = 'rgba(160,215,255,0.85)';
  c.beginPath();
  c.moveTo(50, 14);
  c.bezierCurveTo(78, 44, 78, 84, 50, 86);
  c.bezierCurveTo(22, 84, 22, 44, 50, 14);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.beginPath();
  c.ellipse(41, 56, 6, 14, -0.3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#4fd1ff';
  c.fillRect(46, 8, 8, 10);
}

function squareFilter(c, x = 22, y = 22, s = 56) {
  c.fillStyle = '#8b93a8';
  roundRect(c, x, y, s, s, 6);
  c.fill();
  c.fillStyle = '#b48a5a';
  c.fillRect(x + 6, y + 6, s - 12, s - 12);
  c.strokeStyle = '#6b7290';
  c.lineWidth = 2;
  for (let i = 1; i < 4; i++) {
    c.beginPath();
    c.moveTo(x + 6 + ((s - 12) * i) / 4, y + 6);
    c.lineTo(x + 6 + ((s - 12) * i) / 4, y + s - 6);
    c.moveTo(x + 6, y + 6 + ((s - 12) * i) / 4);
    c.lineTo(x + s - 6, y + 6 + ((s - 12) * i) / 4);
    c.stroke();
  }
}

function flashlight(c) {
  c.fillStyle = linear(c, 0, 40, 0, 60, [[0, '#d7dbe3'], [1, '#6b7290']]);
  roundRect(c, 18, 40, 50, 20, 6);
  c.fill();
  c.fillStyle = '#9aa1ae';
  poly(c, [[66, 36], [80, 30], [80, 70], [66, 64]]);
  c.fill();
  c.fillStyle = 'rgba(255,240,170,0.55)';
  poly(c, [[80, 32], [98, 18], [98, 82], [80, 68]]);
  c.fill();
  c.fillStyle = '#ff6b6b';
  c.fillRect(34, 36, 10, 6);
}

function heatShieldIcon(c) {
  c.fillStyle = radial(c, 50, 70, 4, 50, [[0, '#a8662e'], [1, '#5a3418']]);
  c.beginPath();
  c.ellipse(50, 62, 38, 18, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#c9ced8';
  poly(c, [[18, 58], [36, 22], [64, 22], [82, 58]]);
  c.fill();
}

function chute(c) {
  c.fillStyle = '#ff7a2f';
  c.beginPath();
  c.arc(50, 46, 34, Math.PI, 0);
  c.fill();
  c.fillStyle = '#f4f6ff';
  c.beginPath();
  c.moveTo(50, 46);
  c.arc(50, 46, 34, Math.PI * 1.25, Math.PI * 1.5);
  c.fill();
  c.beginPath();
  c.moveTo(50, 46);
  c.arc(50, 46, 34, Math.PI * 1.75, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#dfe5ef';
  c.lineWidth = 1.5;
  [16, 33, 50, 67, 84].forEach((x) => {
    c.beginPath();
    c.moveTo(x, 46);
    c.lineTo(50, 84);
    c.stroke();
  });
}

function rockBox(c) {
  c.fillStyle = '#9aa1ae';
  roundRect(c, 18, 30, 64, 46, 6);
  c.fill();
  c.fillStyle = '#c9ced8';
  roundRect(c, 18, 26, 64, 12, 4);
  c.fill();
  c.fillStyle = '#5d6475';
  c.fillRect(44, 34, 12, 8);
  c.strokeStyle = '#6b7290';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(18, 52);
  c.lineTo(82, 52);
  c.stroke();
}

// ---------- the 'mailbox' build ----------
function roundFilter(c) {
  c.fillStyle = '#8b93a8';
  circle(c, 50, 50, 32);
  c.fill();
  c.fillStyle = '#b48a5a';
  circle(c, 50, 50, 25);
  c.fill();
  c.strokeStyle = '#6b7290';
  c.lineWidth = 2;
  for (let r = 8; r < 25; r += 7) {
    circle(c, 50, 50, r);
    c.stroke();
  }
}

function cardboard(c) {
  c.fillStyle = '#c9a26b';
  poly(c, [[18, 26], [80, 18], [84, 74], [22, 82]]);
  c.fill();
  c.fillStyle = '#b08850';
  c.fillRect(30, 40, 40, 4);
  c.fillRect(30, 52, 30, 4);
  c.fillStyle = '#7a5a2e';
  c.font = '700 10px Lexend, sans-serif';
  c.fillText('FLIGHT PLAN', 28, 34);
}

function bag(c) {
  c.fillStyle = 'rgba(220,235,255,0.55)';
  poly(c, [[24, 18], [76, 18], [84, 84], [16, 84]]);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.9)';
  c.lineWidth = 2;
  poly(c, [[24, 18], [76, 18], [84, 84], [16, 84]]);
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.6)';
  c.beginPath();
  c.moveTo(34, 30);
  c.lineTo(30, 72);
  c.stroke();
}

function tape(c) {
  c.fillStyle = '#9aa1ae';
  circle(c, 50, 50, 32);
  c.fill();
  c.fillStyle = '#c9ced8';
  circle(c, 50, 50, 28);
  c.fill();
  c.fillStyle = '#e8d9b0';
  circle(c, 50, 50, 14);
  c.fill();
  c.fillStyle = '#9aa1ae';
  poly(c, [[74, 66], [96, 80], [90, 90], [70, 74]]);
  c.fill();
}

function hose(c) {
  c.strokeStyle = '#eef1f7';
  c.lineWidth = 16;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(16, 80);
  c.bezierCurveTo(10, 30, 70, 70, 82, 22);
  c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.15)';
  c.lineWidth = 2;
  for (let t = 0.1; t < 1; t += 0.12) {
    const x = (1 - t) ** 3 * 16 + 3 * (1 - t) ** 2 * t * 10 + 3 * (1 - t) * t * t * 70 + t ** 3 * 82;
    const y = (1 - t) ** 3 * 80 + 3 * (1 - t) ** 2 * t * 30 + 3 * (1 - t) * t * t * 70 + t ** 3 * 22;
    circle(c, x, y, 7);
    c.stroke();
  }
  c.fillStyle = '#4fd1ff';
  roundRect(c, 72, 10, 20, 16, 4);
  c.fill();
}

function spoon(c) {
  c.fillStyle = '#c9ced8';
  c.beginPath();
  c.ellipse(34, 34, 14, 20, -0.7, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#c9ced8';
  c.lineWidth = 7;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(42, 44);
  c.lineTo(80, 84);
  c.stroke();
}

function camera(c) {
  c.fillStyle = '#2b2f38';
  roundRect(c, 14, 30, 72, 48, 8);
  c.fill();
  c.fillStyle = '#c9ced8';
  roundRect(c, 20, 24, 24, 10, 3);
  c.fill();
  c.fillStyle = '#111';
  circle(c, 52, 54, 18);
  c.fill();
  c.fillStyle = radial(c, 48, 50, 2, 14, [[0, '#7fc4ff'], [1, '#1b2a5c']]);
  circle(c, 52, 54, 13);
  c.fill();
}

// The big build on the workbench, one layer per step (all drawn on the same 300 x 300 frame).
function buildFilter(c) {
  c.fillStyle = 'rgba(0,0,0,0.25)';
  roundRect(c, 70, 84, 170, 170, 14);
  c.fill();
  squareFilter(c, 66, 76, 168);
}

function buildCardboard(c) {
  c.fillStyle = '#c9a26b';
  poly(c, [[52, 64], [248, 64], [248, 88], [52, 88]]);
  c.fill();
  poly(c, [[52, 236], [248, 236], [248, 258], [52, 258]]);
  c.fill();
  c.fillStyle = '#b08850';
  c.fillRect(52, 84, 196, 4);
}

function buildBag(c) {
  c.fillStyle = 'rgba(220,235,255,0.35)';
  poly(c, [[40, 54], [260, 54], [270, 272], [30, 272]]);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = 3;
  poly(c, [[40, 54], [260, 54], [270, 272], [30, 272]]);
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.5)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(70, 70);
  c.lineTo(60, 250);
  c.moveTo(230, 74);
  c.lineTo(244, 240);
  c.stroke();
}

function buildTape(c) {
  c.fillStyle = 'rgba(205,210,220,0.95)';
  [[36, 110, 228, 20], [36, 190, 228, 20], [96, 50, 20, 226], [186, 50, 20, 226]].forEach(([x, y, w, h]) => c.fillRect(x, y, w, h));
  c.fillStyle = 'rgba(255,255,255,0.3)';
  [[36, 112, 228, 5], [36, 192, 228, 5]].forEach(([x, y, w, h]) => c.fillRect(x, y, w, h));
}

function buildHose(c) {
  c.strokeStyle = '#eef1f7';
  c.lineWidth = 26;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(150, 262);
  c.bezierCurveTo(150, 296, 230, 300, 284, 280);
  c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.15)';
  c.lineWidth = 2;
  for (let x = 170; x < 280; x += 16) {
    c.beginPath();
    c.moveTo(x, 270);
    c.lineTo(x, 300);
    c.stroke();
  }
}

// ---------- batteries for the cable puzzle ----------
function battery(c, w, h, body) {
  c.fillStyle = body;
  roundRect(c, 6, 14, w - 12, h - 20, 10);
  c.fill();
  c.fillStyle = '#c9ced8';
  roundRect(c, w / 2 - 12, 4, 24, 12, 3);
  c.fill();
  c.fillStyle = '#ffd166';
  poly(c, [[w / 2 + 4, 24], [w / 2 - 12, h / 2 + 6], [w / 2, h / 2 + 6], [w / 2 - 6, h - 16], [w / 2 + 12, h / 2 - 4], [w / 2, h / 2 - 4]]);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.3)';
  c.lineWidth = 2;
  roundRect(c, 6, 14, w - 12, h - 20, 10);
  c.stroke();
}

export function buildCh4Art(scene) {
  const icon = (key, fn) => makeTex(scene, key, 100, 100, (c) => fn(c));
  icon('liCrew', crew);
  icon('liChecklist', checklist);
  icon('liFood', food);
  icon('liWater', water);
  icon('liFilter', (c) => squareFilter(c));
  icon('liFlashlight', flashlight);
  icon('liShield', heatShieldIcon);
  icon('liChute', chute);
  icon('liRockBox', rockBox);
  icon('scFilter', (c) => squareFilter(c));
  icon('scCardboard', cardboard);
  icon('scBag', bag);
  icon('scTape', tape);
  icon('scHose', hose);
  icon('scRound', roundFilter);
  icon('scSpoon', spoon);
  icon('scCamera', camera);
  const layer = (key, fn) => makeTex(scene, key, 300, 300, (c) => fn(c));
  layer('scBuildFilter', buildFilter);
  layer('scBuildCardboard', buildCardboard);
  layer('scBuildBag', buildBag);
  layer('scBuildTape', buildTape);
  layer('scBuildHose', buildHose);
  makeTex(scene, 'batteryLM', 90, 96, (c, w, h) => battery(c, w, h, '#a8803a'));
  makeTex(scene, 'batteryCM', 90, 96, (c, w, h) => battery(c, w, h, '#6b7290'));
  makeTex(scene, 'smIntact', 60, 110, (c, w, h) => serviceModule(c, w, h, false));
  makeTex(scene, 'smDamaged', 60, 110, (c, w, h) => serviceModule(c, w, h, true));
}
