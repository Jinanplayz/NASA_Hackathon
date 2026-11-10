// The mission report card: one 1600 x 900 picture with the ship, its patch, its scores and a
// chart. The game shows it, and the player can save it (or share it) as a PNG.
import { roundRect, circle, linear } from '../../art/core.js';
import { starPoints } from '../../ui/icons.js';
import { drawCraft, drawPatch, drawRadar } from './labArt.js';
import { TESTS, FLIGHT } from './labState.js';

export const CARD_W = 1600, CARD_H = 900;
const FONT = 'Lexend, "Segoe UI", system-ui, sans-serif';

function text(ctx, str, x, y, { size = 24, weight = 700, color = '#f4f6ff', align = 'left', max } = {}) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  let s = String(str);
  // shrink long names to fit
  if (max) {
    let sz = size;
    while (ctx.measureText(s).width > max && sz > 12) {
      sz -= 1;
      ctx.font = `${weight} ${sz}px ${FONT}`;
    }
  }
  ctx.fillText(s, x, y);
}

function star(ctx, x, y, r, fill) {
  ctx.beginPath();
  starPoints(x, y, r, r * 0.45, 5).forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function bar(ctx, x, y, w, label, value) {
  text(ctx, label, x, y, { size: 20, color: '#aab3d9' });
  text(ctx, `${value}`, x + w, y, { size: 20, weight: 800, align: 'right' });
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, x, y + 10, w, 14, 7);
  ctx.fill();
  ctx.fillStyle = value >= 80 ? '#3ddc97' : value >= 55 ? '#ffd166' : '#ff6b6b';
  roundRect(ctx, x, y + 10, Math.max(14, (w * value) / 100), 14, 7);
  ctx.fill();
}

// fs: finalScore(); s: Lab.s; words: { labels (report), axes, places, missionName, badgeNames, notes }
export function reportCanvas(fs, s, words) {
  const c = document.createElement('canvas');
  c.width = CARD_W;
  c.height = CARD_H;
  const ctx = c.getContext('2d');
  const R = words.labels || {};
  const d = fs.d;

  // background
  ctx.fillStyle = linear(ctx, 0, 0, 0, CARD_H, [[0, '#0d1a45'], [1, '#05081a']]);
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 160; i++) {
    circle(ctx, rnd() * CARD_W, rnd() * CARD_H, rnd() < 0.1 ? 2 : 1);
    ctx.fill();
  }
  ctx.strokeStyle = '#4fd1ff';
  ctx.lineWidth = 4;
  roundRect(ctx, 14, 14, CARD_W - 28, CARD_H - 28, 30);
  ctx.stroke();

  // left: the patch, the names and the ship
  ctx.save();
  ctx.translate(48, 44);
  drawPatch(ctx, d.patch, 190, { mission: d.mission, missionName: d.missionName, shipName: d.name, design: d });
  ctx.restore();
  text(ctx, (R.title || 'Mission Report').toUpperCase(), 262, 92, { size: 26, weight: 800, color: '#4fd1ff' });
  text(ctx, d.name, 262, 148, { size: 50, weight: 800, color: '#ffd166', max: 520 });
  text(ctx, `${d.missionName} · ${words.place || ''}`, 262, 192, { size: 26, color: '#f4f6ff', max: 520 });
  ctx.fillStyle = 'rgba(79,209,255,0.08)';
  roundRect(ctx, 40, 260, 740, 520, 26);
  ctx.fill();
  ctx.save();
  ctx.translate(80, 290);
  drawCraft(ctx, d, 660, 460);
  ctx.restore();

  // middle: stars, grade and points, and the chart
  for (let i = 0; i < 5; i++) {
    const full = fs.stars >= i + 1, half = !full && fs.stars >= i + 0.5;
    star(ctx, 870 + i * 64, 100, 28, full ? '#ffd166' : '#2a3566');
    if (half) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(870 + i * 64 - 30, 60, 30, 80);
      ctx.clip();
      star(ctx, 870 + i * 64, 100, 28, '#ffd166');
      ctx.restore();
    }
  }
  ctx.fillStyle = '#ffd166';
  circle(ctx, 1250, 98, 48);
  ctx.fill();
  text(ctx, fs.grade, 1250, 118, { size: 54, weight: 800, color: '#070b1d', align: 'center' });
  text(ctx, `${fs.points.toLocaleString('en-US')} ${R.points || 'points'}`, 838, 178, { size: 32, weight: 800 });
  const axes = ['launch', 'power', 'comms', 'protection', 'arrival', 'science'];
  drawRadar(ctx, 1010, 470, 165, axes.map((k) => fs.r.axes[k]), axes.map((k) => (words.axes || {})[k] || k), { size: 20 });

  // right: tests and flight
  const phases = R.phases || {};
  text(ctx, (R.tests || 'Tests').toUpperCase(), 1270, 240, { size: 22, weight: 800, color: '#4fd1ff' });
  TESTS.forEach((k, i) => bar(ctx, 1270, 280 + i * 54, 280, phases[k] || k, s.tests[k] ?? 0));
  text(ctx, (R.flight || 'Flight').toUpperCase(), 1270, 460, { size: 22, weight: 800, color: '#4fd1ff' });
  FLIGHT.forEach((k, i) => bar(ctx, 1270, 500 + i * 54, 280, phases[k] || k, s.flight[k] ?? 0));

  // bottom: badges and a few facts
  const badges = fs.badges.map((b) => (R.badgeNames || {})[b] || b);
  let bx = 830;
  badges.slice(0, 4).forEach((b) => {
    ctx.font = `800 18px ${FONT}`;
    const w = ctx.measureText(b).width + 56;
    ctx.fillStyle = '#1b2a63';
    roundRect(ctx, bx, 768, w, 44, 22);
    ctx.fill();
    star(ctx, bx + 22, 790, 11, '#ffd166');
    text(ctx, b, bx + 40, 797, { size: 18, weight: 800 });
    bx += w + 12;
  });
  text(ctx, `${R.quiz || 'First-try answers'}: ${fs.quizRight}   ·   ${R.credits || 'Credits left'}: ${s.credits}`, 830, 742, { size: 20, color: '#aab3d9' });
  text(ctx, R.made || 'Made with Star Sailors', 48, 852, { size: 20, color: '#aab3d9' });
  text(ctx, new Date().toLocaleDateString(), CARD_W - 48, 852, { size: 20, color: '#aab3d9', align: 'right' });
  return c;
}

// "Star Sailor 1" -> star-sailors-star-sailor-1.png
const fileName = (name) => `star-sailors-${(name || 'mission').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mission'}.png`;

// Saves the picture as a PNG file.
export function savePicture(canvas, name) {
  const file = fileName(name);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return resolve(false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve(true);
    }, 'image/png');
  });
}

// Whether this device can share a picture (phones and tablets mostly).
export function canSharePicture() {
  try {
    const f = new File([new Blob([''], { type: 'image/png' })], 'x.png', { type: 'image/png' });
    return !!(navigator.canShare && navigator.canShare({ files: [f] }));
  } catch {
    return false;
  }
}

export function sharePicture(canvas, name, title) {
  return new Promise((resolve) => {
    canvas.toBlob(async (blob) => {
      try {
        const file = new File([blob], fileName(name), { type: 'image/png' });
        await navigator.share({ files: [file], title });
        resolve(true);
      } catch {
        resolve(false);
      }
    }, 'image/png');
  });
}
