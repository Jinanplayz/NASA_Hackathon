// Guide portrait, astronaut, Moon samples, tools, Explorer 1 parts and system icons.
import { seeded } from '../core/constants.js';
import { makeTex, circle, blob, radial, linear, roundRect, poly, cylGrad } from './core.js';

function drawGuide(c, s, talking) {
  const cx = s / 2, cy = s / 2;
  c.save();
  circle(c, cx, cy, s / 2 - 1);
  c.clip();
  // suit shoulders
  c.fillStyle = linear(c, 0, s * 0.7, 0, s, [[0, '#ffffff'], [1, '#c9d0de']]);
  c.beginPath();
  c.ellipse(cx, s * 1.02, s * 0.46, s * 0.3, 0, 0, Math.PI * 2);
  c.fill();
  // mission patch + flag stripe
  c.fillStyle = '#4fd1ff';
  circle(c, cx - s * 0.24, s * 0.86, s * 0.055);
  c.fill();
  c.fillStyle = '#ff6b6b';
  c.fillRect(cx + s * 0.16, s * 0.83, s * 0.12, s * 0.035);
  // neck ring
  c.fillStyle = '#8f99b3';
  c.beginPath();
  c.ellipse(cx, s * 0.76, s * 0.25, s * 0.06, 0, 0, Math.PI * 2);
  c.fill();
  // helmet shell
  c.fillStyle = radial(c, cx - s * 0.12, s * 0.28, s * 0.05, s * 0.4, [[0, '#ffffff'], [1, '#c3cad8']]);
  circle(c, cx, s * 0.45, s * 0.33);
  c.fill();
  // visor opening
  c.fillStyle = '#1b2448';
  c.beginPath();
  c.ellipse(cx, s * 0.47, s * 0.24, s * 0.21, 0, 0, Math.PI * 2);
  c.fill();
  // face
  c.fillStyle = '#b97a4f';
  c.beginPath();
  c.ellipse(cx, s * 0.5, s * 0.17, s * 0.18, 0, 0, Math.PI * 2);
  c.fill();
  // hair
  c.fillStyle = '#2b1d16';
  c.beginPath();
  c.ellipse(cx, s * 0.36, s * 0.17, s * 0.08, 0, Math.PI, 0);
  c.fill();
  c.fillRect(cx - s * 0.17, s * 0.35, s * 0.34, s * 0.035);
  // eyes
  c.fillStyle = '#1b1b24';
  circle(c, cx - s * 0.065, s * 0.47, s * 0.022);
  c.fill();
  circle(c, cx + s * 0.065, s * 0.47, s * 0.022);
  c.fill();
  c.fillStyle = '#ffffff';
  circle(c, cx - s * 0.058, s * 0.462, s * 0.007);
  c.fill();
  circle(c, cx + s * 0.072, s * 0.462, s * 0.007);
  c.fill();
  // brows
  c.strokeStyle = '#2b1d16';
  c.lineWidth = s * 0.012;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(cx - s * 0.095, s * 0.428);
  c.lineTo(cx - s * 0.04, s * 0.422);
  c.moveTo(cx + s * 0.04, s * 0.422);
  c.lineTo(cx + s * 0.095, s * 0.428);
  c.stroke();
  // cheeks
  c.fillStyle = 'rgba(255,120,120,0.25)';
  circle(c, cx - s * 0.1, s * 0.53, s * 0.025);
  c.fill();
  circle(c, cx + s * 0.1, s * 0.53, s * 0.025);
  c.fill();
  // mouth
  if (talking) {
    c.fillStyle = '#5a1f1f';
    c.beginPath();
    c.ellipse(cx, s * 0.575, s * 0.04, s * 0.03, 0, 0, Math.PI * 2);
    c.fill();
  } else {
    c.strokeStyle = '#5a1f1f';
    c.lineWidth = s * 0.014;
    c.beginPath();
    c.arc(cx, s * 0.54, s * 0.05, 0.25 * Math.PI, 0.75 * Math.PI);
    c.stroke();
  }
  // visor glass reflection
  c.fillStyle = 'rgba(160,220,255,0.18)';
  c.beginPath();
  c.ellipse(cx, s * 0.47, s * 0.24, s * 0.21, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.45)';
  c.beginPath();
  c.ellipse(cx - s * 0.13, s * 0.37, s * 0.05, s * 0.025, -0.7, 0, Math.PI * 2);
  c.fill();
  // helmet lights
  c.fillStyle = '#ffd166';
  circle(c, cx - s * 0.28, s * 0.4, s * 0.025);
  c.fill();
  c.restore();
}

function drawMoonwalker(c, w, h) {
  const cx = w / 2;
  // backpack
  c.fillStyle = '#d9dde6';
  roundRect(c, cx - w * 0.36, h * 0.2, w * 0.24, h * 0.34, 4);
  c.fill();
  // legs
  c.fillStyle = '#eef1f7';
  roundRect(c, cx - w * 0.16, h * 0.56, w * 0.14, h * 0.36, 4);
  c.fill();
  roundRect(c, cx + w * 0.02, h * 0.56, w * 0.14, h * 0.36, 4);
  c.fill();
  c.fillStyle = '#9aa1ae';
  c.fillRect(cx - w * 0.18, h * 0.9, w * 0.18, h * 0.07);
  c.fillRect(cx, h * 0.9, w * 0.18, h * 0.07);
  // body
  c.fillStyle = linear(c, cx - w * 0.2, 0, cx + w * 0.22, 0, [[0, '#c9d0de'], [0.5, '#ffffff'], [1, '#c9d0de']]);
  roundRect(c, cx - w * 0.2, h * 0.24, w * 0.4, h * 0.36, 8);
  c.fill();
  c.fillStyle = '#4fd1ff';
  c.fillRect(cx - w * 0.08, h * 0.32, w * 0.16, h * 0.06);
  // arms
  c.fillStyle = '#eef1f7';
  roundRect(c, cx + w * 0.16, h * 0.27, w * 0.12, h * 0.28, 5);
  c.fill();
  // helmet
  c.fillStyle = '#ffffff';
  circle(c, cx, h * 0.15, w * 0.2);
  c.fill();
  c.fillStyle = linear(c, 0, h * 0.08, 0, h * 0.22, [[0, '#f7d774'], [1, '#b8860b']]);
  c.beginPath();
  c.ellipse(cx + w * 0.04, h * 0.15, w * 0.14, h * 0.07, 0, 0, Math.PI * 2);
  c.fill();
}

// Moon samples
function drawBasalt(c, w, h, seed) {
  const rnd = seeded(seed);
  c.fillStyle = radial(c, w * 0.4, h * 0.35, 2, w * 0.6, [[0, '#6d6d72'], [1, '#2e2e33']]);
  blob(c, w / 2, h / 2, Math.min(w, h) * 0.42, rnd, 10, 0.25);
  c.fill();
  // small gas-bubble holes (vesicles)
  for (let i = 0; i < 9; i++) {
    c.fillStyle = 'rgba(10,10,12,0.8)';
    circle(c, w * (0.28 + rnd() * 0.44), h * (0.28 + rnd() * 0.44), 1.2 + rnd() * 1.6);
    c.fill();
  }
}

function drawBreccia(c, w, h, seed) {
  const rnd = seeded(seed);
  c.fillStyle = '#8b8780';
  blob(c, w / 2, h / 2, Math.min(w, h) * 0.42, rnd, 9, 0.3);
  c.fill();
  c.save();
  blob(c, w / 2, h / 2, Math.min(w, h) * 0.42, seeded(seed), 9, 0.3);
  c.clip();
  const cols = ['#d8d4cc', '#4a4744', '#b5aea2', '#e9e4da', '#6c665e'];
  for (let i = 0; i < 12; i++) {
    c.fillStyle = cols[i % cols.length];
    const x = w * (0.15 + rnd() * 0.7), y = h * (0.15 + rnd() * 0.7), r = 3 + rnd() * 6;
    poly(c, [[x - r, y], [x, y - r * 0.8], [x + r, y - r * 0.2], [x + r * 0.4, y + r]]);
    c.fill();
  }
  c.restore();
}

function drawSoilBag(c, w, h) {
  c.fillStyle = '#e8ecf3';
  roundRect(c, w * 0.18, h * 0.18, w * 0.64, h * 0.74, 8);
  c.fill();
  c.fillStyle = '#7a7a7e';
  roundRect(c, w * 0.24, h * 0.5, w * 0.52, h * 0.36, 6);
  c.fill();
  const rnd = seeded(3);
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(40,40,45,${0.3 + rnd() * 0.4})`;
    c.fillRect(w * (0.26 + rnd() * 0.48), h * (0.52 + rnd() * 0.32), 1.2, 1.2);
  }
  c.fillStyle = '#b8c0cf';
  c.fillRect(w * 0.18, h * 0.18, w * 0.64, h * 0.08);
  c.fillStyle = '#1d2029';
  c.font = `700 ${w * 0.12}px Lexend, sans-serif`;
  c.textAlign = 'center';
  c.fillText('SRC', w / 2, h * 0.42);
}

function drawCoreTube(c, w, h) {
  c.fillStyle = cylGrad(c, w * 0.3, w * 0.4, '#c7cfdc');
  c.fillRect(w * 0.3, h * 0.06, w * 0.4, h * 0.88);
  c.fillStyle = '#6a6a6e';
  c.fillRect(w * 0.36, h * 0.3, w * 0.28, h * 0.6);
  c.fillStyle = '#ff9f43';
  c.fillRect(w * 0.26, h * 0.04, w * 0.48, h * 0.06);
}

function drawFoil(c, w, h) {
  c.strokeStyle = '#9aa1ae';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(w * 0.2, h * 0.05);
  c.lineTo(w * 0.2, h * 0.98);
  c.stroke();
  c.fillStyle = linear(c, w * 0.22, 0, w * 0.95, 0, [[0, '#f5f7fa'], [0.5, '#bfc6d2'], [1, '#eef1f5']]);
  c.fillRect(w * 0.22, h * 0.08, w * 0.72, h * 0.5);
  c.strokeStyle = 'rgba(0,0,0,0.15)';
  c.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    c.beginPath();
    c.moveTo(w * 0.22, h * (0.08 + i * 0.1));
    c.lineTo(w * 0.94, h * (0.08 + i * 0.1));
    c.stroke();
  }
}

function drawFilm(c, w, h) {
  c.fillStyle = '#2a2d36';
  roundRect(c, w * 0.12, h * 0.18, w * 0.76, h * 0.64, 6);
  c.fill();
  c.fillStyle = '#c7cfdc';
  roundRect(c, w * 0.18, h * 0.26, w * 0.64, h * 0.3, 4);
  c.fill();
  c.fillStyle = '#ff6b6b';
  c.fillRect(w * 0.18, h * 0.62, w * 0.2, h * 0.1);
  c.fillStyle = '#1d2029';
  c.font = `700 ${w * 0.14}px Lexend, sans-serif`;
  c.textAlign = 'center';
  c.fillText('FILM', w / 2, h * 0.47);
}

// Tools for the repair mini-game
function drawPen(c, w, h) {
  c.fillStyle = '#2d6be4';
  roundRect(c, w * 0.18, h * 0.3, w * 0.7, h * 0.4, h * 0.15);
  c.fill();
  c.fillStyle = '#1d2029';
  poly(c, [[w * 0.18, h * 0.32], [w * 0.05, h * 0.5], [w * 0.18, h * 0.68]]);
  c.fill();
  c.fillStyle = '#e8ecf3';
  c.fillRect(w * 0.7, h * 0.26, w * 0.2, h * 0.48);
  c.fillStyle = '#ffffff';
  c.fillRect(w * 0.3, h * 0.36, w * 0.3, h * 0.06);
}

function drawScrewdriver(c, w, h) {
  c.fillStyle = cylGrad(c, 0, w, '#c7cfdc');
  c.fillRect(w * 0.05, h * 0.44, w * 0.5, h * 0.12);
  c.fillStyle = '#e5484d';
  roundRect(c, w * 0.52, h * 0.28, w * 0.44, h * 0.44, h * 0.18);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.3)';
  c.fillRect(w * 0.56, h * 0.32, w * 0.36, h * 0.08);
}

function drawHammer(c, w, h) {
  c.fillStyle = '#a0703c';
  roundRect(c, w * 0.1, h * 0.44, w * 0.7, h * 0.12, 4);
  c.fill();
  c.fillStyle = '#6b7385';
  roundRect(c, w * 0.72, h * 0.18, w * 0.2, h * 0.64, 4);
  c.fill();
}

function drawTape(c, w, h) {
  c.fillStyle = '#c9ced8';
  circle(c, w / 2, h / 2, Math.min(w, h) * 0.4);
  c.fill();
  c.fillStyle = '#6b7385';
  circle(c, w / 2, h / 2, Math.min(w, h) * 0.18);
  c.fill();
  c.fillStyle = '#1d2029';
  circle(c, w / 2, h / 2, Math.min(w, h) * 0.12);
  c.fill();
}

// Explorer 1 parts (horizontal, sized for the assembly screen)
function drawExMotor(c, w, h) {
  const g = linear(c, 0, h * 0.1, 0, h * 0.9, [[0, '#6f7684'], [0.35, '#d9dde6'], [1, '#555c6a']]);
  c.fillStyle = g;
  c.fillRect(w * 0.1, h * 0.1, w * 0.9, h * 0.8);
  c.fillStyle = '#3d424e';
  poly(c, [[w * 0.1, h * 0.25], [0, h * 0.12], [0, h * 0.88], [w * 0.1, h * 0.75]]);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.2)';
  c.lineWidth = 1.5;
  for (let i = 1; i < 5; i++) {
    c.beginPath();
    c.moveTo(w * (0.1 + i * 0.18), h * 0.1);
    c.lineTo(w * (0.1 + i * 0.18), h * 0.9);
    c.stroke();
  }
  c.fillStyle = '#1d2029';
  c.font = `700 ${h * 0.2}px Lexend, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('ROCKET MOTOR', w * 0.55, h * 0.5);
}

function drawExBatteries(c, w, h) {
  for (let i = 0; i < 4; i++) {
    const x = w * (0.06 + i * 0.23);
    c.fillStyle = linear(c, 0, h * 0.1, 0, h * 0.9, [[0, '#8a6d1f'], [0.4, '#f2c74a'], [1, '#6e5516']]);
    roundRect(c, x, h * 0.12, w * 0.19, h * 0.76, 4);
    c.fill();
    c.fillStyle = '#3b3f4a';
    c.fillRect(x + w * 0.06, h * 0.06, w * 0.07, h * 0.08);
  }
  c.fillStyle = '#ff6b6b';
  c.font = `800 ${h * 0.3}px Lexend, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('+', w * 0.155, h * 0.5);
}

function drawExTransmitter(c, w, h) {
  c.fillStyle = '#1f6f4a';
  roundRect(c, w * 0.05, h * 0.1, w * 0.9, h * 0.8, 5);
  c.fill();
  c.strokeStyle = '#ffd166';
  c.lineWidth = 1.2;
  for (let i = 0; i < 5; i++) {
    c.beginPath();
    c.moveTo(w * 0.1, h * (0.2 + i * 0.14));
    c.lineTo(w * 0.9, h * (0.2 + i * 0.14));
    c.stroke();
  }
  c.fillStyle = '#e8ecf3';
  for (let i = 0; i < 3; i++) {
    roundRect(c, w * (0.15 + i * 0.26), h * 0.28, w * 0.14, h * 0.44, 4);
    c.fill();
  }
  c.fillStyle = '#ff6b6b';
  circle(c, w * 0.88, h * 0.2, h * 0.07);
  c.fill();
}

function drawExCosmic(c, w, h) {
  c.fillStyle = 'rgba(180,230,255,0.45)';
  roundRect(c, w * 0.05, h * 0.2, w * 0.9, h * 0.6, h * 0.3);
  c.fill();
  c.strokeStyle = '#cfefff';
  c.lineWidth = 2;
  roundRect(c, w * 0.05, h * 0.2, w * 0.9, h * 0.6, h * 0.3);
  c.stroke();
  c.strokeStyle = '#ffd166';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(w * 0.08, h * 0.5);
  c.lineTo(w * 0.92, h * 0.5);
  c.stroke();
  c.fillStyle = '#6b7385';
  c.fillRect(0, h * 0.35, w * 0.08, h * 0.3);
  c.fillRect(w * 0.92, h * 0.35, w * 0.08, h * 0.3);
}

function drawExMicro(c, w, h) {
  c.strokeStyle = '#ffb347';
  c.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    c.beginPath();
    c.moveTo(w * (0.1 + i * 0.13), h * 0.04);
    c.lineTo(w * (0.1 + i * 0.13), h * 0.96);
    c.stroke();
  }
  c.strokeStyle = 'rgba(255,179,71,0.5)';
  c.beginPath();
  c.moveTo(w * 0.05, h * 0.04);
  c.lineTo(w * 0.95, h * 0.04);
  c.moveTo(w * 0.05, h * 0.96);
  c.lineTo(w * 0.95, h * 0.96);
  c.stroke();
  // little microphone that "hears" dust hits
  c.fillStyle = '#23324f';
  circle(c, w * 0.5, h * 0.5, w * 0.2);
  c.fill();
  c.fillStyle = '#4fd1ff';
  circle(c, w * 0.5, h * 0.5, w * 0.1);
  c.fill();
}

function drawExAntennas(c, w, h) {
  c.strokeStyle = '#1d2a5c';
  c.lineWidth = 7;
  c.lineCap = 'round';
  const whips = () => {
    c.beginPath();
    c.moveTo(w * 0.5, h * 0.5);
    c.lineTo(w * 0.1, h * 0.02);
    c.moveTo(w * 0.5, h * 0.5);
    c.lineTo(w * 0.1, h * 0.98);
    c.moveTo(w * 0.5, h * 0.5);
    c.lineTo(w * 0.35, h * 0.1);
    c.moveTo(w * 0.5, h * 0.5);
    c.lineTo(w * 0.35, h * 0.9);
    c.stroke();
  };
  whips();
  c.strokeStyle = '#e8eef8';
  c.lineWidth = 4;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(w * 0.5, h * 0.5);
  c.lineTo(w * 0.1, h * 0.02);
  c.moveTo(w * 0.5, h * 0.5);
  c.lineTo(w * 0.1, h * 0.98);
  c.moveTo(w * 0.5, h * 0.5);
  c.lineTo(w * 0.35, h * 0.1);
  c.moveTo(w * 0.5, h * 0.5);
  c.lineTo(w * 0.35, h * 0.9);
  c.stroke();
  c.fillStyle = '#9aa1ae';
  circle(c, w * 0.5, h * 0.5, 6);
  c.fill();
}

function drawExNose(c, w, h) {
  c.fillStyle = linear(c, 0, 0, 0, h, [[0, '#9aa1ae'], [0.35, '#ffffff'], [1, '#8d95a5']]);
  poly(c, [[0, h * 0.02], [w, h * 0.5], [0, h * 0.98]]);
  c.fill();
  c.fillStyle = '#23324f';
  poly(c, [[w * 0.2, h * 0.12], [w * 0.3, h * 0.17], [w * 0.3, h * 0.83], [w * 0.2, h * 0.88]]);
  c.fill();
}

// Icons for the 8 spacecraft systems
function sysIcon(c, s, kind) {
  const cx = s / 2, cy = s / 2;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  switch (kind) {
    case 'propulsion':
      c.fillStyle = '#9aa1ae';
      poly(c, [[cx - 12, 14], [cx + 12, 14], [cx + 22, 52], [cx - 22, 52]]);
      c.fill();
      c.fillStyle = linear(c, 0, 52, 0, 88, [[0, '#fff3b0'], [0.5, '#ff9f43'], [1, 'rgba(255,90,40,0)']]);
      c.beginPath();
      c.moveTo(cx - 20, 52);
      c.quadraticCurveTo(cx, 110, cx + 20, 52);
      c.fill();
      break;
    case 'guidance':
      c.strokeStyle = '#4fd1ff';
      c.lineWidth = 5;
      c.beginPath();
      c.ellipse(cx, cy, 34, 34, 0, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = '#a78bfa';
      c.beginPath();
      c.ellipse(cx, cy, 34, 14, 0.6, 0, Math.PI * 2);
      c.stroke();
      c.strokeStyle = '#ffd166';
      c.beginPath();
      c.ellipse(cx, cy, 12, 34, 0.6, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = '#fff';
      circle(c, cx, cy, 7);
      c.fill();
      break;
    case 'attitude':
      c.fillStyle = '#9aa1ae';
      roundRect(c, cx - 14, cy - 14, 28, 28, 5);
      c.fill();
      c.fillStyle = 'rgba(200,230,255,0.9)';
      [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
        c.beginPath();
        c.ellipse(cx + dx * 30, cy + dy * 30, dx ? 12 : 7, dy ? 12 : 7, 0, 0, Math.PI * 2);
        c.fill();
      });
      break;
    case 'power':
      c.fillStyle = '#3ddc97';
      roundRect(c, cx - 22, cy - 30, 44, 64, 8);
      c.fill();
      c.fillStyle = '#9aa1ae';
      c.fillRect(cx - 8, cy - 38, 16, 8);
      c.fillStyle = '#ffd166';
      poly(c, [[cx + 4, cy - 22], [cx - 12, cy + 4], [cx - 1, cy + 4], [cx - 5, cy + 24], [cx + 12, cy - 4], [cx + 1, cy - 4]]);
      c.fill();
      break;
    case 'comms':
      c.fillStyle = '#e8ecf3';
      c.beginPath();
      c.ellipse(cx - 8, cy + 6, 26, 14, -0.8, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#9aa1ae';
      c.fillRect(cx - 12, cy + 16, 8, 24);
      c.strokeStyle = '#4fd1ff';
      c.lineWidth = 4;
      for (let i = 1; i <= 3; i++) {
        c.beginPath();
        c.arc(cx + 2, cy - 4, i * 10, -Math.PI / 2, 0);
        c.stroke();
      }
      break;
    case 'life':
      c.fillStyle = linear(c, cx - 20, 0, cx + 20, 0, [[0, '#2f7fd8'], [0.5, '#7fc4ff'], [1, '#1f5fb0']]);
      roundRect(c, cx - 20, cy - 26, 40, 58, 18);
      c.fill();
      c.fillStyle = '#9aa1ae';
      c.fillRect(cx - 6, cy - 36, 12, 12);
      c.fillStyle = '#fff';
      c.font = '800 20px Lexend, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('O₂', cx, cy + 4);
      break;
    case 'thermal':
      c.fillStyle = linear(c, 0, cy - 30, 0, cy + 34, [[0, '#ffd166'], [1, '#ff6b3d']]);
      c.beginPath();
      c.moveTo(cx, cy - 34);
      c.lineTo(cx + 28, cy - 22);
      c.quadraticCurveTo(cx + 28, cy + 18, cx, cy + 34);
      c.quadraticCurveTo(cx - 28, cy + 18, cx - 28, cy - 22);
      c.closePath();
      c.fill();
      c.strokeStyle = '#fff';
      c.lineWidth = 3;
      for (let i = -1; i <= 1; i++) {
        c.beginPath();
        c.moveTo(cx + i * 10, cy + 14);
        c.quadraticCurveTo(cx + i * 10 - 6, cy, cx + i * 10, cy - 10);
        c.stroke();
      }
      break;
    case 'recovery':
      c.fillStyle = '#ff7a2f';
      c.beginPath();
      c.ellipse(cx, cy - 6, 34, 24, 0, Math.PI, 0);
      c.fill();
      c.fillStyle = '#fff';
      c.beginPath();
      c.moveTo(cx, cy - 6);
      c.ellipse(cx, cy - 6, 34, 24, 0, Math.PI * 1.33, Math.PI * 1.66);
      c.fill();
      c.strokeStyle = '#dfe5ef';
      c.lineWidth = 2;
      [-34, -12, 12, 34].forEach((dx) => {
        c.beginPath();
        c.moveTo(cx + dx, cy - 6);
        c.lineTo(cx, cy + 26);
        c.stroke();
      });
      c.fillStyle = '#9aa1ae';
      poly(c, [[cx - 8, cy + 24], [cx + 8, cy + 24], [cx + 12, cy + 38], [cx - 12, cy + 38]]);
      c.fill();
      break;
    default:
      break;
  }
}

export function buildItemArt(scene) {
  makeTex(scene, 'guide', 124, 124, (c, w) => drawGuide(c, w, false));
  makeTex(scene, 'guideTalk', 124, 124, (c, w) => drawGuide(c, w, true));
  makeTex(scene, 'guideBig', 300, 300, (c, w) => drawGuide(c, w, false));
  makeTex(scene, 'moonwalker', 52, 90, (c, w, h) => drawMoonwalker(c, w, h));

  [0, 1, 2].forEach((i) => makeTex(scene, 'basalt' + i, 70, 56, (c, w, h) => drawBasalt(c, w, h, 80 + i)));
  [0, 1].forEach((i) => makeTex(scene, 'breccia' + i, 70, 58, (c, w, h) => drawBreccia(c, w, h, 90 + i)));
  makeTex(scene, 'soilBag', 60, 70, (c, w, h) => drawSoilBag(c, w, h));
  makeTex(scene, 'coreTube', 40, 90, (c, w, h) => drawCoreTube(c, w, h));
  makeTex(scene, 'foil', 60, 90, (c, w, h) => drawFoil(c, w, h));
  makeTex(scene, 'film', 64, 52, (c, w, h) => drawFilm(c, w, h));

  makeTex(scene, 'toolPen', 130, 40, (c, w, h) => drawPen(c, w, h));
  makeTex(scene, 'toolScrewdriver', 130, 40, (c, w, h) => drawScrewdriver(c, w, h));
  makeTex(scene, 'toolHammer', 130, 50, (c, w, h) => drawHammer(c, w, h));
  makeTex(scene, 'toolTape', 70, 70, (c, w, h) => drawTape(c, w, h));

  makeTex(scene, 'exMotor', 300, 70, (c, w, h) => drawExMotor(c, w, h));
  makeTex(scene, 'exBatteries', 90, 56, (c, w, h) => drawExBatteries(c, w, h));
  makeTex(scene, 'exTransmitter', 90, 56, (c, w, h) => drawExTransmitter(c, w, h));
  makeTex(scene, 'exCosmic', 120, 44, (c, w, h) => drawExCosmic(c, w, h));
  makeTex(scene, 'exMicro', 56, 84, (c, w, h) => drawExMicro(c, w, h));
  makeTex(scene, 'exAntennas', 60, 240, (c, w, h) => drawExAntennas(c, w, h));
  makeTex(scene, 'exNose', 110, 70, (c, w, h) => drawExNose(c, w, h));

  ['propulsion', 'guidance', 'attitude', 'power', 'comms', 'life', 'thermal', 'recovery'].forEach((k) =>
    makeTex(scene, 'sys_' + k, 96, 96, (c, s) => sysIcon(c, s, k))
  );
}
