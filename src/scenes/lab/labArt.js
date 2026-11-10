// Pictures for the Test Your Knowledge mode: the player's own spacecraft (any mix of parts, in
// their colours), its rocket, its mission patch and the report chart. They're drawn with the
// Canvas 2D API, so the very same drawings appear in the game (as textures) and in the picture
// the player saves.
import { TEX } from '../../core/constants.js';
import { cylGrad, roundRect, circle, poly, radial, linear, shadeHex, rgba } from '../../art/core.js';
import { starPoints } from '../../ui/icons.js';

// the paint box (names are in the content file)
export const PAINT = {
  white: '#e9edf5',
  silver: '#a9b2c3',
  gold: '#e3b341',
  red: '#e0473f',
  orange: '#ff9f43',
  yellow: '#ffd166',
  green: '#3ddc97',
  teal: '#2ec4b6',
  blue: '#3b82f6',
  navy: '#1b2a63',
  purple: '#8b5cf6',
  pink: '#ff7eb6',
  black: '#2a2e38'
};
export const PATTERNS = ['solid', 'stripes', 'checker', 'stars'];
export const SHAPES = ['circle', 'shield', 'hexagon', 'diamond'];
export const EMBLEMS = ['rocket', 'planet', 'star', 'orbit', 'comet', 'ship'];
const paint = (name, fallback = '#e9edf5') => PAINT[name] || fallback;

// ---------- the spacecraft ----------
// Drawn in a 300 x 250 box around (0, 0), scaled to fit w x h.
const BODY = {
  // where things attach: sides, top, bottom, and four spots for instruments
  crewCapsule: { top: [0, -60], left: [-56, 18], right: [56, 18], bottom: [0, 40], width: 124, slots: [[-40, -14], [40, -14], [-62, 34], [62, 34]] },
  rover: { top: [0, -14], left: [-64, 2], right: [64, 2], bottom: [0, 64], width: 128, slots: [[46, -14], [-34, -14], [70, 14], [-70, 14]] },
  probe: { top: [0, -38], left: [-40, 0], right: [40, 0], bottom: [0, 38], width: 80, slots: [[-26, -38], [26, -38], [40, 26], [-40, 26]] }
};

function bodyPath(ctx, type) {
  if (type === 'crewCapsule') {
    poly(ctx, [[-17, -56], [17, -56], [62, 36], [-62, 36]]);
  } else if (type === 'rover') {
    roundRect(ctx, -64, -14, 128, 34, 8);
  } else {
    poly(ctx, [[-22, -38], [22, -38], [40, -16], [40, 16], [22, 38], [-22, 38], [-40, 16], [-40, -16]]);
  }
}

// a solar panel: a dark blue grid in a thin frame
function panel(ctx, x, y, w, h, angle = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = linear(ctx, 0, -h / 2, 0, h / 2, [[0, '#2f5fb8'], [1, '#13285e']]);
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = 'rgba(160,200,255,0.55)';
  ctx.lineWidth = 1;
  const cols = Math.max(2, Math.round(w / 14)), rows = Math.max(2, Math.round(h / 12));
  for (let i = 1; i < cols; i++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + (w * i) / cols, -h / 2);
    ctx.lineTo(-w / 2 + (w * i) / cols, h / 2);
    ctx.stroke();
  }
  for (let j = 1; j < rows; j++) {
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h / 2 + (h * j) / rows);
    ctx.lineTo(w / 2, -h / 2 + (h * j) / rows);
    ctx.stroke();
  }
  ctx.strokeStyle = '#c9d2e3';
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  ctx.restore();
}

function strut(ctx, x0, y0, x1, y1, width = 3, color = '#9aa3b5') {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

function drawPower(ctx, d, b) {
  const [lx, ly] = b.left, [rx, ry] = b.right;
  switch (d.power) {
    case 'solar':
      if (d.body === 'rover') {
        panel(ctx, 0, -20, 150, 12);
      } else {
        strut(ctx, lx, ly, lx - 18, ly);
        strut(ctx, rx, ry, rx + 18, ry);
        panel(ctx, lx - 52, ly, 68, 40);
        panel(ctx, rx + 52, ry, 68, 40);
      }
      break;
    case 'solarWings':
      // three huge wings, like Juno's (the third one points away from us)
      strut(ctx, lx, ly, lx - 12, ly);
      strut(ctx, rx, ry, rx + 12, ry);
      panel(ctx, -14, b.top[1] - 34, 26, 64, -0.5);
      panel(ctx, lx - 54, ly, 84, 28);
      panel(ctx, rx + 54, ry, 84, 28);
      break;
    case 'rtg': {
      // a finned cylinder on a short boom, slightly behind and below
      const x = lx - 30, y = ly + 30;
      strut(ctx, lx, ly + 6, x + 8, y - 8, 4);
      rtgShape(ctx, x, y, -0.6);
      break;
    }
    case 'fuelCells':
      [[rx + 6, ry + 20], [rx + 20, ry + 8], [rx + 18, ry + 28]].forEach(([x, y]) => {
        ctx.fillStyle = radial(ctx, x - 3, y - 3, 1, 11, [[0, '#ffffff'], [1, '#aab3c4']]);
        circle(ctx, x, y, 9);
        ctx.fill();
      });
      break;
    case 'batteries':
      [-1, 1].forEach((s) => {
        ctx.fillStyle = '#2d6cdf';
        roundRect(ctx, s * 18 - 9, (b.bottom[1] + b.top[1]) / 2 + 2, 18, 12, 3);
        ctx.fill();
        ctx.fillStyle = '#cfe0ff';
        ctx.fillRect(s * 18 - 2, (b.bottom[1] + b.top[1]) / 2 - 1, 4, 3);
      });
      break;
    default:
  }
}

function rtgShape(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = '#596274';
  for (let i = 0; i < 6; i++) ctx.fillRect(-16, -18 + i * 7, 32, 3);
  ctx.fillStyle = cylGrad(ctx, -9, 18, '#8d96a8');
  roundRect(ctx, -9, -22, 18, 44, 5);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,140,60,0.75)';
  circle(ctx, 0, 0, 3);
  ctx.fill();
  ctx.restore();
}

function drawComms(ctx, d, b, topBusy) {
  if (!d.comms) return;
  // the capsule keeps its top for the parachutes, so its antenna goes on a side boom
  const side = d.body === 'crewCapsule' || topBusy;
  const [ax, ay] = side ? [b.right[0] - 6, b.right[1] - 30] : b.top;
  if (d.comms === 'dish') {
    const x = side ? ax + 30 : ax, y = side ? ay - 34 : ay - 26;
    strut(ctx, ax, ay, x, y + 8, 3);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(side ? -0.5 : 0);
    ctx.fillStyle = linear(ctx, -34, 0, 34, 0, [[0, '#cdd4e2'], [0.5, '#ffffff'], [1, '#9aa3b5']]);
    ctx.beginPath();
    ctx.ellipse(0, 0, 34, 12, 0, Math.PI, 0, true);
    ctx.lineTo(34, 0);
    ctx.ellipse(0, 0, 34, 6, 0, 0, Math.PI, false);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#7d8699';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    strut(ctx, 0, 2, 0, -18, 2, '#c9d2e3');
    ctx.fillStyle = '#ffd166';
    circle(ctx, 0, -19, 3);
    ctx.fill();
    ctx.restore();
  } else {
    const x = ax + (side ? 18 : 22), y = ay - 34;
    strut(ctx, ax, ay, x, y, 2.5, '#c9d2e3');
    ctx.fillStyle = '#e9edf5';
    poly(ctx, [[x - 6, y + 2], [x + 6, y + 2], [x, y - 12]]);
    ctx.fill();
  }
}

function drawEntry(ctx, d, b) {
  const [bx, by] = b.bottom;
  const w = b.width;
  if (d.entry.includes('landingLegs')) {
    [-1, 1].forEach((s) => {
      const x0 = s * (w / 2 - 12), y0 = by - 6;
      const x1 = s * (w / 2 + 16), y1 = by + 44;
      strut(ctx, x0, y0, x1, y1, 4, '#b8c0cf');
      strut(ctx, x0 - s * 18, y0 + 2, x1, y1 - 10, 2.5, '#8f98aa');
      ctx.fillStyle = '#c9d2e3';
      ctx.beginPath();
      ctx.ellipse(x1, y1 + 2, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    // the landing engine between the legs
    ctx.fillStyle = '#6b7385';
    poly(ctx, [[bx - 9, by], [bx + 9, by], [bx + 14, by + 16], [bx - 14, by + 16]]);
    ctx.fill();
  }
  if (d.entry.includes('heatShield')) {
    const hw = w / 2 + 6;
    ctx.fillStyle = linear(ctx, 0, by - 2, 0, by + 12, [[0, '#7a4b2a'], [1, '#3b2414']]);
    ctx.beginPath();
    ctx.moveTo(-hw, by - 2);
    ctx.quadraticCurveTo(0, by + 18, hw, by - 2);
    ctx.lineTo(hw, by - 6);
    ctx.lineTo(-hw, by - 6);
    ctx.closePath();
    ctx.fill();
  }
  if (d.entry.includes('airbags')) {
    for (let i = 0; i < 5; i++) {
      const x = -w / 2 + 10 + ((w - 20) * i) / 4, y = by + 20 + (i % 2) * 8;
      ctx.fillStyle = 'rgba(244,240,228,0.92)';
      circle(ctx, x, y, 17);
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,150,130,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 17, -0.6, 1.2);
      ctx.stroke();
    }
  }
}

// the sky crane hangs the spacecraft on cables from a rocket-powered frame above it
function drawSkyCrane(ctx, b) {
  const y = b.top[1] - 70;
  [-34, 0, 34].forEach((x) => strut(ctx, x * 0.6, y + 10, x, b.top[1] + 2, 1.2, 'rgba(230,235,245,0.85)'));
  ctx.fillStyle = cylGrad(ctx, -48, 96, '#c9cfd9');
  roundRect(ctx, -48, y - 10, 96, 20, 6);
  ctx.fill();
  [-56, 56].forEach((x) => {
    ctx.fillStyle = '#8f98aa';
    roundRect(ctx, x - 8, y - 14, 16, 24, 4);
    ctx.fill();
    ctx.fillStyle = '#4a5160';
    poly(ctx, [[x - 6, y + 10], [x + 6, y + 10], [x + 8, y + 20], [x - 8, y + 20]]);
    ctx.fill();
  });
}

function drawChutePack(ctx, b) {
  const [x, y] = b.top;
  ctx.fillStyle = cylGrad(ctx, x - 14, 28, '#e9edf5');
  roundRect(ctx, x - 14, y - 16, 28, 18, 5);
  ctx.fill();
  ctx.fillStyle = '#e0473f';
  ctx.fillRect(x - 14, y - 10, 28, 5);
}

function drawInstrument(ctx, id, x, y, side) {
  ctx.save();
  ctx.translate(x, y);
  if (side < 0) ctx.scale(-1, 1);
  switch (id) {
    case 'camera':
      strut(ctx, 0, 0, 0, -34, 3, '#c9d2e3');
      ctx.fillStyle = '#e9edf5';
      roundRect(ctx, -10, -46, 22, 14, 4);
      ctx.fill();
      ctx.fillStyle = '#16304f';
      circle(ctx, 8, -39, 4.5);
      ctx.fill();
      ctx.fillStyle = '#4fd1ff';
      circle(ctx, 9, -40, 1.6);
      ctx.fill();
      break;
    case 'spectrometer':
      ctx.fillStyle = '#d9dee8';
      roundRect(ctx, -2, -12, 20, 16, 4);
      ctx.fill();
      ctx.fillStyle = '#8b5cf6';
      circle(ctx, 14, -4, 5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      circle(ctx, 15, -6, 1.5);
      ctx.fill();
      break;
    case 'drill':
      strut(ctx, 0, 0, 18, 10, 4, '#b8c0cf');
      strut(ctx, 18, 10, 26, 26, 4, '#b8c0cf');
      ctx.fillStyle = '#6b7385';
      roundRect(ctx, 20, 24, 12, 10, 3);
      ctx.fill();
      ctx.fillStyle = '#c9d2e3';
      poly(ctx, [[23, 34], [29, 34], [26, 46]]);
      ctx.fill();
      break;
    case 'magnetometer':
      strut(ctx, 0, 0, 58, -10, 2, '#c9d2e3');
      ctx.fillStyle = '#ffd166';
      roundRect(ctx, 54, -15, 12, 10, 3);
      ctx.fill();
      break;
    case 'weatherStation':
      strut(ctx, 0, 0, 0, -26, 2, '#c9d2e3');
      ctx.strokeStyle = '#e9edf5';
      ctx.lineWidth = 2;
      [-8, 8].forEach((dx) => {
        ctx.beginPath();
        ctx.moveTo(0, -26);
        ctx.lineTo(dx, -26);
        ctx.stroke();
        ctx.fillStyle = '#ff9f43';
        circle(ctx, dx, -26, 3);
        ctx.fill();
      });
      break;
    case 'seismometer':
      ctx.fillStyle = radial(ctx, 4, -2, 1, 14, [[0, '#ffffff'], [1, '#b8c0cf']]);
      ctx.beginPath();
      ctx.arc(8, 6, 11, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e3b341';
      ctx.fillRect(-3, 6, 22, 3);
      break;
    default:
  }
  ctx.restore();
}

// pattern painted on the body in the trim colour
function drawPattern(ctx, pattern, trim) {
  ctx.fillStyle = trim;
  if (pattern === 'stripes') {
    for (let x = -120; x < 120; x += 26) {
      poly(ctx, [[x, 60], [x + 10, 60], [x + 50, -70], [x + 40, -70]]);
      ctx.fill();
    }
  } else if (pattern === 'checker') {
    for (let j = 0; j < 8; j++) for (let i = 0; i < 9; i++) if ((i + j) % 2 === 0) ctx.fillRect(-80 + i * 18, -70 + j * 18, 18, 18);
  } else if (pattern === 'stars') {
    [[-30, -10], [0, 10], [26, -16], [-14, 22], [36, 18]].forEach(([x, y]) => {
      ctx.beginPath();
      starPoints(x, y, 6, 2.6, 5).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
    });
  }
}

export function drawCraft(ctx, d, w, h) {
  const b = BODY[d.body] || BODY.probe;
  const k = Math.min(w / 300, h / 250);
  const col = paint(d.paint && d.paint.body);
  const trim = paint(d.paint && d.paint.trim, '#ff9f43');
  const support = d.support || [], entry = d.entry || [], science = (d.science || []).slice(0, 4);
  const crane = entry.includes('skyCrane');
  const chutes = entry.includes('parachutes');
  ctx.save();
  ctx.translate(w / 2, h / 2 + (crane ? 22 : 0));
  ctx.scale(k * (crane ? 0.86 : 1), k * (crane ? 0.86 : 1));

  // behind the body
  if (crane) drawSkyCrane(ctx, b);
  if (support.includes('lifeSupport')) {
    [[-30, 30], [30, 30]].forEach(([x, y]) => {
      ctx.fillStyle = radial(ctx, x - 4, y - 4, 1, 16, [[0, '#ffffff'], [1, '#9fb0c8']]);
      circle(ctx, x, y + (d.body === 'rover' ? -6 : 4), 14);
      ctx.fill();
    });
  }
  drawPower(ctx, d, b);

  // rover wheels and suspension
  if (d.body === 'rover') {
    strut(ctx, -50, 20, 0, 34, 4, '#8f98aa');
    strut(ctx, 0, 34, 50, 20, 4, '#8f98aa');
    [-50, 0, 50].forEach((x) => {
      ctx.fillStyle = '#3a3f4b';
      circle(ctx, x, 46, 15);
      ctx.fill();
      ctx.fillStyle = '#9aa1ae';
      circle(ctx, x, 46, 6);
      ctx.fill();
    });
  }

  // the body, with its paint
  ctx.save();
  bodyPath(ctx, d.body);
  ctx.fillStyle = cylGrad(ctx, -64, 128, col, 0.8);
  ctx.fill();
  ctx.clip();
  drawPattern(ctx, d.paint && d.paint.pattern, rgba(trim, 0.85));
  if (support.includes('insulation')) {
    // a wrap of crinkly gold foil around the lower part
    const fy = d.body === 'crewCapsule' ? 6 : d.body === 'rover' ? 2 : 4;
    ctx.fillStyle = linear(ctx, 0, fy, 0, fy + 40, [[0, '#f2cf6b'], [1, '#b8862a']]);
    ctx.fillRect(-80, fy, 160, 60);
    ctx.strokeStyle = 'rgba(255,245,200,0.7)';
    ctx.lineWidth = 1;
    for (let x = -76; x < 76; x += 9) {
      ctx.beginPath();
      ctx.moveTo(x, fy);
      ctx.lineTo(x + 5, fy + 14);
      ctx.lineTo(x - 2, fy + 34);
      ctx.stroke();
    }
  }
  // a band of the trim colour, and shading
  ctx.fillStyle = trim;
  if (d.body === 'crewCapsule') ctx.fillRect(-70, 22, 140, 8);
  else if (d.body === 'rover') ctx.fillRect(-70, 10, 140, 6);
  else ctx.fillRect(-50, 20, 100, 6);
  ctx.restore();
  ctx.strokeStyle = shadeHex(col, -0.5);
  ctx.lineWidth = 2;
  bodyPath(ctx, d.body);
  ctx.stroke();

  // windows / details
  if (d.body === 'crewCapsule') {
    [-14, 14].forEach((x) => {
      ctx.fillStyle = '#16304f';
      roundRect(ctx, x - 7, -24, 14, 12, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(79,209,255,0.6)';
      ctx.fillRect(x - 4, -22, 3, 4);
    });
    ctx.fillStyle = '#9aa3b5';
    ctx.fillRect(-10, -62, 20, 7);
  } else if (d.body === 'probe') {
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(-22, -38, 6, 76);
  }
  if (support.includes('radiationVault')) {
    ctx.fillStyle = linear(ctx, 0, -14, 0, 14, [[0, '#9aa1ae'], [1, '#5c6474']]);
    roundRect(ctx, -18, -16 + (d.body === 'rover' ? 4 : 0), 36, 26, 4);
    ctx.fill();
    ctx.fillStyle = '#3a3f4b';
    [[-13, -11], [13, -11], [-13, 5], [13, 5]].forEach(([x, y]) => {
      circle(ctx, x, y + (d.body === 'rover' ? 4 : 0), 1.8);
      ctx.fill();
    });
  }

  drawEntry(ctx, d, b);
  if (chutes) drawChutePack(ctx, b);
  drawComms(ctx, d, b, chutes || crane);

  // instruments, each in its own spot
  const order = ['camera', 'weatherStation', 'magnetometer', 'spectrometer', 'drill', 'seismometer'];
  science
    .slice()
    .sort((a, c) => order.indexOf(a) - order.indexOf(c))
    .forEach((id, i) => {
      const [x, y] = b.slots[i];
      drawInstrument(ctx, id, x, y, x < 0 ? -1 : 1);
    });
  ctx.restore();
}

// ---------- the rocket ----------
const ROCKETS = {
  smallRocket: { stages: [{ h: 150, w: 34, fins: true, engines: 1 }, { h: 64, w: 28 }], boosters: 0 },
  mediumRocket: { stages: [{ h: 210, w: 42, engines: 1 }, { h: 84, w: 36 }], boosters: 2 },
  heavyRocket: { stages: [{ h: 190, w: 60, fins: true, engines: 5 }, { h: 130, w: 56 }, { h: 76, w: 44 }], boosters: 0 }
};

// Draws the rocket standing up, base at the bottom of the w x h box. flame: draw the exhaust.
export function drawRocket(ctx, d, w, h, { flame = false } = {}) {
  const spec = ROCKETS[d.rocket] || ROCKETS.smallRocket;
  const col = paint(d.paint && d.paint.body);
  const trim = paint(d.paint && d.paint.trim, '#ff9f43');
  const crew = d.body === 'crewCapsule';
  const payloadH = crew ? 96 : 80;
  const total = spec.stages.reduce((s, st) => s + st.h, 0) + payloadH + (flame ? 60 : 16);
  const k = Math.min(h / total, w / 130);
  ctx.save();
  ctx.translate(w / 2, h - (flame ? 60 : 16) * k);
  ctx.scale(k, k);
  if (flame) {
    const base = spec.stages[0].w;
    ctx.fillStyle = radial(ctx, 0, 30, 4, 70, [[0, 'rgba(255,255,220,1)'], [0.35, 'rgba(255,190,80,0.95)'], [1, 'rgba(255,90,30,0)']]);
    ctx.beginPath();
    ctx.ellipse(0, 34, base * 0.55, 62, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // side boosters
  if (spec.boosters) {
    [-1, 1].forEach((s) => {
      const x = s * (spec.stages[0].w / 2 + 9);
      ctx.fillStyle = cylGrad(ctx, x - 9, 18, '#e9edf5');
      ctx.fillRect(x - 9, -120, 18, 120);
      ctx.fillStyle = cylGrad(ctx, x - 9, 18, '#c9d2e3');
      poly(ctx, [[x - 9, -120], [x + 9, -120], [x, -140]]);
      ctx.fill();
      ctx.fillStyle = '#4a5160';
      poly(ctx, [[x - 6, 0], [x + 6, 0], [x + 8, 10], [x - 8, 10]]);
      ctx.fill();
    });
  }
  let y = 0;
  spec.stages.forEach((st, i) => {
    const top = y - st.h;
    // engine bells under the first stage
    if (i === 0) {
      const n = st.engines || 1;
      for (let e = 0; e < n; e++) {
        const ex = n === 1 ? 0 : -st.w / 2 + 8 + ((st.w - 16) * e) / (n - 1);
        ctx.fillStyle = '#3a3f4b';
        poly(ctx, [[ex - 5, 0], [ex + 5, 0], [ex + 8, 12], [ex - 8, 12]]);
        ctx.fill();
      }
    }
    ctx.fillStyle = cylGrad(ctx, -st.w / 2, st.w, i === 0 ? col : '#e9edf5');
    ctx.fillRect(-st.w / 2, top, st.w, st.h);
    // trim bands and, on the first stage, the pattern
    ctx.save();
    ctx.beginPath();
    ctx.rect(-st.w / 2, top, st.w, st.h);
    ctx.clip();
    if (i === 0) drawPattern(ctx, d.paint && d.paint.pattern, rgba(trim, 0.75));
    ctx.restore();
    ctx.fillStyle = trim;
    ctx.fillRect(-st.w / 2, top + 6, st.w, 6);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-st.w / 2, top, st.w, 2);
    if (st.fins) {
      [-1, 1].forEach((s) => {
        ctx.fillStyle = trim;
        poly(ctx, [[s * st.w / 2, -40], [s * (st.w / 2 + 22), 4], [s * st.w / 2, 0]]);
        ctx.fill();
      });
    }
    y = top;
  });
  // what's on top
  const topW = spec.stages[spec.stages.length - 1].w;
  if (crew) {
    ctx.fillStyle = cylGrad(ctx, -topW / 2, topW, '#c9d2e3');
    poly(ctx, [[-topW / 2, y], [topW / 2, y], [8, y - 40], [-8, y - 40]]);
    ctx.fill();
    // launch escape tower
    strut(ctx, 0, y - 40, 0, y - 86, 3, '#e0473f');
    ctx.fillStyle = '#e0473f';
    poly(ctx, [[-5, y - 82], [5, y - 82], [0, y - 96]]);
    ctx.fill();
  } else {
    ctx.fillStyle = cylGrad(ctx, -topW / 2 - 3, topW + 6, col);
    ctx.beginPath();
    ctx.moveTo(-topW / 2 - 3, y);
    ctx.lineTo(-topW / 2 - 3, y - 34);
    ctx.quadraticCurveTo(-topW / 2, y - 76, 0, y - 80);
    ctx.quadraticCurveTo(topW / 2, y - 76, topW / 2 + 3, y - 34);
    ctx.lineTo(topW / 2 + 3, y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = trim;
    ctx.fillRect(-topW / 2 - 3, y - 14, topW + 6, 5);
  }
  ctx.restore();
}

// ---------- the mission patch ----------
function shapePath(ctx, shape, r) {
  if (shape === 'shield') {
    ctx.beginPath();
    ctx.moveTo(-r * 0.86, -r * 0.8);
    ctx.lineTo(r * 0.86, -r * 0.8);
    ctx.lineTo(r * 0.86, r * 0.1);
    ctx.quadraticCurveTo(r * 0.8, r * 0.7, 0, r);
    ctx.quadraticCurveTo(-r * 0.8, r * 0.7, -r * 0.86, r * 0.1);
    ctx.closePath();
  } else if (shape === 'hexagon') {
    poly(ctx, Array.from({ length: 6 }, (_, i) => [Math.cos((i / 6) * Math.PI * 2 - Math.PI / 2) * r, Math.sin((i / 6) * Math.PI * 2 - Math.PI / 2) * r]));
  } else if (shape === 'diamond') {
    poly(ctx, [[0, -r], [r, 0], [0, r], [-r, 0]]);
  } else {
    circle(ctx, 0, 0, r);
  }
}

const PLANET_COLORS = { moon: ['#d9dbe2', '#8d919c'], mars: ['#e8794a', '#8a3416'], jupiter: ['#e8c9a0', '#9c6b43'] };

function drawEmblem(ctx, emblem, r, mission, d) {
  ctx.save();
  if (emblem === 'planet' || emblem === 'orbit') {
    const [a, b] = PLANET_COLORS[mission] || PLANET_COLORS.mars;
    const pr = emblem === 'orbit' ? r * 0.34 : r * 0.42;
    ctx.fillStyle = radial(ctx, -pr * 0.35, -pr * 0.35, 1, pr * 1.2, [[0, a], [1, b]]);
    circle(ctx, 0, 0, pr);
    ctx.fill();
    if (mission === 'jupiter') {
      ctx.save();
      circle(ctx, 0, 0, pr);
      ctx.clip();
      ctx.fillStyle = 'rgba(140,80,40,0.45)';
      [-0.4, 0, 0.35].forEach((t) => ctx.fillRect(-pr, t * pr, pr * 2, pr * 0.16));
      ctx.restore();
    }
    if (emblem === 'orbit') {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = r * 0.04;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.62, r * 0.22, -0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      circle(ctx, r * 0.57, -r * 0.25, r * 0.06);
      ctx.fill();
    }
  } else if (emblem === 'star') {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    starPoints(0, 0, r * 0.5, r * 0.22, 5).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  } else if (emblem === 'comet') {
    ctx.fillStyle = linear(ctx, -r * 0.6, r * 0.4, r * 0.2, -r * 0.2, [[0, 'rgba(79,209,255,0)'], [1, 'rgba(160,230,255,0.95)']]);
    poly(ctx, [[-r * 0.6, r * 0.5], [r * 0.12, -r * 0.3], [r * 0.32, -r * 0.08]]);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    circle(ctx, r * 0.24, -r * 0.2, r * 0.13);
    ctx.fill();
  } else if (emblem === 'ship' && d) {
    ctx.translate(-r * 0.62, -r * 0.52);
    drawCraft(ctx, d, r * 1.24, r * 1.04);
  } else {
    // a rocket climbing to the upper right
    ctx.rotate(0.6);
    ctx.fillStyle = '#e9edf5';
    roundRect(ctx, -r * 0.11, -r * 0.42, r * 0.22, r * 0.68, r * 0.06);
    ctx.fill();
    ctx.fillStyle = '#e0473f';
    poly(ctx, [[-r * 0.11, -r * 0.42], [r * 0.11, -r * 0.42], [0, -r * 0.62]]);
    ctx.fill();
    poly(ctx, [[-r * 0.11, r * 0.1], [-r * 0.24, r * 0.3], [-r * 0.11, r * 0.26]]);
    ctx.fill();
    poly(ctx, [[r * 0.11, r * 0.1], [r * 0.24, r * 0.3], [r * 0.11, r * 0.26]]);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,190,80,0.95)';
    poly(ctx, [[-r * 0.08, r * 0.27], [r * 0.08, r * 0.27], [0, r * 0.5]]);
    ctx.fill();
  }
  ctx.restore();
}

// letters spaced along a circle (top: reads left to right over the top; bottom: under it)
function arcText(ctx, text, r, top, size) {
  ctx.font = `800 ${size}px Lexend, "Segoe UI", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width + size * 0.08);
  const total = widths.reduce((a, b) => a + b, 0);
  let a = (top ? -Math.PI / 2 : Math.PI / 2) + ((top ? -1 : 1) * total) / r / 2;
  chars.forEach((c, i) => {
    const step = widths[i] / r;
    a += (top ? 1 : -1) * (step / 2);
    ctx.save();
    ctx.translate(Math.cos(a) * r, Math.sin(a) * r);
    ctx.rotate(a + (top ? Math.PI / 2 : -Math.PI / 2));
    ctx.fillText(c, 0, 0);
    ctx.restore();
    a += (top ? 1 : -1) * (step / 2);
  });
}

// The round (or shield-shaped...) badge, filling a size x size box.
export function drawPatch(ctx, p, size, { mission = 'mars', missionName = '', shipName = '', design = null } = {}) {
  const r = size / 2 - 2;
  const bg = paint(p.color, '#1b2a63');
  const ring = p.color === 'gold' || p.color === 'yellow' ? '#1b2a63' : '#ffd166';
  ctx.save();
  ctx.translate(size / 2, size / 2);
  shapePath(ctx, p.shape, r);
  ctx.fillStyle = ring;
  ctx.fill();
  shapePath(ctx, p.shape, r * 0.9);
  ctx.fillStyle = radial(ctx, -r * 0.3, -r * 0.3, 2, r, [[0, shadeHex(bg, 0.25)], [1, shadeHex(bg, -0.3)]]);
  ctx.fill();
  // a few stars
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  [[-0.45, -0.1], [0.42, 0.18], [-0.2, 0.42], [0.3, -0.42], [0.05, 0.5]].forEach(([x, y]) => {
    circle(ctx, x * r, y * r, r * 0.018);
    ctx.fill();
  });
  shapePath(ctx, p.shape, r * 0.9);
  ctx.save();
  ctx.clip();
  drawEmblem(ctx, p.emblem, r, mission, design);
  ctx.restore();
  // names around the edge
  ctx.fillStyle = '#ffffff';
  const fs = Math.max(9, r * 0.15);
  if (missionName) arcText(ctx, missionName.toUpperCase().slice(0, 22), r * 0.74, true, fs);
  if (shipName) arcText(ctx, shipName.toUpperCase().slice(0, 22), r * 0.74, false, fs);
  ctx.restore();
}

// ---------- the report chart ----------
// values: list of 0-100 numbers, labels: their names. Draws a six-sided "spider" chart.
export function drawRadar(ctx, cx, cy, r, values, labels, { fill = 'rgba(79,209,255,0.35)', line = '#4fd1ff', text = '#e9edf5', size = 18 } = {}) {
  const n = values.length;
  const at = (i, f) => [cx + Math.cos((i / n) * Math.PI * 2 - Math.PI / 2) * r * f, cy + Math.sin((i / n) * Math.PI * 2 - Math.PI / 2) * r * f];
  ctx.save();
  const shape = values.map((v, i) => at(i, Math.max(0.04, v / 100)));
  // the ship's shape first, then the grid over it (so a near-perfect ship still reads as a chart)
  poly(ctx, shape);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,210,240,0.4)';
  ctx.lineWidth = 1.5;
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    poly(ctx, Array.from({ length: n }, (_, i) => at(i, f)));
    ctx.stroke();
  });
  for (let i = 0; i < n; i++) {
    const [x, y] = at(i, 1);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.stroke();
  }
  poly(ctx, shape);
  ctx.strokeStyle = line;
  ctx.lineWidth = 3;
  ctx.stroke();
  // a dot on each corner
  ctx.fillStyle = line;
  shape.forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = text;
  ctx.font = `700 ${size}px Lexend, "Segoe UI", sans-serif`;
  ctx.textBaseline = 'middle';
  labels.forEach((l, i) => {
    const [x, y] = at(i, 1.2);
    ctx.textAlign = Math.abs(x - cx) < 4 ? 'center' : x < cx ? 'right' : 'left';
    ctx.fillText(l, x, y);
  });
  ctx.restore();
}

// ---------- part icons (for the workshop cards) ----------
const PLAIN = { body: 'white', trim: 'orange', pattern: 'solid' };
const blank = (o) => ({ body: 'probe', power: null, comms: null, support: [], entry: [], science: [], extras: [], paint: PLAIN, ...o });
// a pretend spacecraft body around (0, 0) for parts that attach to one
const HUB = { top: [0, 18], left: [-14, 0], right: [14, 0], bottom: [0, -6], width: 60, slots: [] };

// Draws one part on its own, filling a size x size box.
export function drawPartIcon(ctx, id, size) {
  ctx.save();
  ctx.scale(size / 200, size / 200);
  ctx.translate(100, 100);
  const hub = () => {
    ctx.fillStyle = cylGrad(ctx, -16, 32, '#c9d2e3');
    roundRect(ctx, -16, -16, 32, 32, 6);
    ctx.fill();
  };
  if (['crewCapsule', 'rover', 'probe'].includes(id)) {
    ctx.scale(1.5, 1.5);
    ctx.translate(-100, -96);
    drawCraft(ctx, blank({ body: id }), 200, 200);
  } else if (['smallRocket', 'mediumRocket', 'heavyRocket'].includes(id)) {
    ctx.translate(-100, -100);
    drawRocket(ctx, blank({ rocket: id }), 200, 200);
  } else if (id === 'rtg') {
    ctx.scale(2.2, 2.2);
    rtgShape(ctx, 0, 0, -0.5);
  } else if (['batteries', 'solar', 'solarWings', 'fuelCells'].includes(id)) {
    const zoom = { batteries: 3.4, fuelCells: 2.6, solar: 0.9, solarWings: 0.72 }[id];
    ctx.scale(zoom, zoom);
    if (id === 'fuelCells') ctx.translate(-29, -19);
    if (id === 'batteries') ctx.translate(0, -6);
    if (id !== 'fuelCells' && id !== 'batteries') hub();
    drawPower(ctx, blank({ power: id }), { ...HUB, top: [0, -10], bottom: [0, 10] });
  } else if (id === 'smallAntenna' || id === 'dish') {
    ctx.scale(2, 2);
    ctx.translate(-4, 18);
    drawComms(ctx, blank({ comms: id }), HUB, false);
  } else if (id === 'lifeSupport') {
    [[-28, 10], [28, 10]].forEach(([x, y]) => {
      ctx.fillStyle = radial(ctx, x - 8, y - 8, 2, 34, [[0, '#ffffff'], [1, '#9fb0c8']]);
      circle(ctx, x, y, 30);
      ctx.fill();
    });
    strut(ctx, -28, -26, 28, -26, 6, '#8f98aa');
    ctx.fillStyle = '#3ddc97';
    circle(ctx, 0, -30, 12);
    ctx.fill();
  } else if (id === 'insulation') {
    ctx.fillStyle = linear(ctx, -50, -50, 50, 50, [[0, '#f6d77a'], [1, '#b8862a']]);
    roundRect(ctx, -54, -46, 108, 92, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,245,200,0.8)';
    ctx.lineWidth = 2;
    for (let x = -48; x < 50; x += 14) {
      ctx.beginPath();
      ctx.moveTo(x, -46);
      ctx.lineTo(x + 8, -10);
      ctx.lineTo(x - 2, 20);
      ctx.lineTo(x + 6, 46);
      ctx.stroke();
    }
  } else if (id === 'radiationVault') {
    ctx.fillStyle = linear(ctx, 0, -44, 0, 44, [[0, '#a9b0bd'], [1, '#596274']]);
    roundRect(ctx, -54, -44, 108, 88, 10);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    circle(ctx, 0, 0, 22);
    ctx.fill();
    ctx.fillStyle = '#2a2e38';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 18, (i * 2 * Math.PI) / 3 - 0.5, (i * 2 * Math.PI) / 3 + 0.5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#ffd166';
    circle(ctx, 0, 0, 5);
    ctx.fill();
  } else if (id === 'heatShield') {
    ctx.fillStyle = linear(ctx, 0, -20, 0, 30, [[0, '#8a5530'], [1, '#3b2414']]);
    ctx.beginPath();
    ctx.moveTo(-70, -16);
    ctx.quadraticCurveTo(0, 50, 70, -16);
    ctx.lineTo(70, -26);
    ctx.lineTo(-70, -26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,140,60,0.5)';
    ctx.fillRect(-60, -22, 120, 4);
  } else if (id === 'parachutes') {
    // a striped canopy on its lines
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = i % 2 ? '#e9edf5' : '#e0473f';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 66, Math.PI + (i * Math.PI) / 6, Math.PI + ((i + 1) * Math.PI) / 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(233,237,245,0.8)';
    ctx.lineWidth = 2;
    [-66, -33, 0, 33, 66].forEach((x) => {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(0, 62);
      ctx.stroke();
    });
    ctx.fillStyle = '#c9d2e3';
    roundRect(ctx, -10, 56, 20, 16, 4);
    ctx.fill();
  } else if (id === 'landingLegs') {
    ctx.scale(1.4, 1.4);
    ctx.translate(0, -18);
    hub();
    drawEntry(ctx, blank({ entry: ['landingLegs'] }), { ...HUB, bottom: [0, 16], width: 40 });
  } else if (id === 'airbags') {
    [[-26, -20], [26, -20], [0, 8], [-34, 22], [34, 22], [0, -40]].forEach(([x, y]) => {
      ctx.fillStyle = 'rgba(244,240,228,0.95)';
      circle(ctx, x, y, 26);
      ctx.fill();
      ctx.strokeStyle = 'rgba(160,150,130,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 26, -0.6, 1.2);
      ctx.stroke();
    });
  } else if (id === 'skyCrane') {
    ctx.scale(1.3, 1.3);
    drawSkyCrane(ctx, { top: [0, 50] });
  } else if (id === 'extraFuel') {
    [-24, 24].forEach((x) => {
      ctx.fillStyle = cylGrad(ctx, x - 20, 40, '#ff9f43');
      roundRect(ctx, x - 20, -56, 40, 112, 18);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(x - 20, -10, 40, 6);
    });
  } else if (id === 'starTracker') {
    ctx.fillStyle = '#d9dee8';
    roundRect(ctx, -30, -6, 50, 40, 8);
    ctx.fill();
    ctx.fillStyle = '#16304f';
    circle(ctx, 16, 14, 14);
    ctx.fill();
    ctx.fillStyle = '#ffd166';
    [[30, -46, 10], [54, -18, 7], [-4, -50, 6]].forEach(([x, y, r]) => {
      ctx.beginPath();
      starPoints(x, y, r, r * 0.45, 5).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.fill();
    });
  } else {
    // a science instrument, drawn big and centred
    const [z, ox, oy] = { camera: [2.6, -1, 23], spectrometer: [3.8, -8, 4], drill: [2.8, -16, -22], magnetometer: [2.4, -30, 5], weatherStation: [3.4, 0, 13], seismometer: [4.4, -8, -2] }[id] || [2.4, 0, 0];
    ctx.scale(z, z);
    drawInstrument(ctx, id, ox, oy, 1);
  }
  ctx.restore();
}

// ---------- textures for the game ----------
// A texture for a drawing, named after what's in it, so a changed ship gets a new picture while
// screens still showing the old one keep working.
function keyFor(prefix, obj) {
  const s = JSON.stringify(obj);
  let hsh = 0;
  for (let i = 0; i < s.length; i++) hsh = (hsh * 31 + s.charCodeAt(i)) | 0;
  return `${prefix}_${(hsh >>> 0).toString(36)}`;
}
function canvasTexture(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) return key;
  const t = scene.textures.createCanvas(key, Math.ceil(w * TEX), Math.ceil(h * TEX));
  const ctx = t.getContext();
  ctx.save();
  ctx.scale(TEX, TEX);
  draw(ctx);
  ctx.restore();
  t.refresh();
  return key;
}
const craftParts = (d) => ({ body: d.body, power: d.power, comms: d.comms, support: d.support, entry: d.entry, science: d.science, paint: d.paint });

// the spacecraft, 300 x 250 at scale 1
export function craftTexture(scene, d) {
  const key = keyFor('labCraft', craftParts(d));
  return canvasTexture(scene, key, 300, 250, (ctx) => drawCraft(ctx, d, 300, 250));
}
// the rocket with the spacecraft on top, 130 x 480 at scale 1
export function rocketTexture(scene, d, flame = false) {
  const key = keyFor('labRocket', { r: d.rocket, crew: d.body === 'crewCapsule', p: d.paint, flame });
  return canvasTexture(scene, key, 130, 480, (ctx) => drawRocket(ctx, d, 130, 480, { flame }));
}
// a part on its own, 100 x 100 at scale 1
export function partTexture(scene, id) {
  return canvasTexture(scene, `labPart_${id}`, 100, 100, (ctx) => drawPartIcon(ctx, id, 100));
}
// the mission patch, 240 x 240 at scale 1
export function patchTexture(scene, d) {
  const key = keyFor('labPatch', { p: d.patch, m: d.mission, n: d.missionName, s: d.name, c: d.patch.emblem === 'ship' ? craftParts(d) : 0 });
  return canvasTexture(scene, key, 240, 240, (ctx) => drawPatch(ctx, d.patch, 240, { mission: d.mission, missionName: d.missionName, shipName: d.name, design: d }));
}
