// Simple vector icons drawn with Phaser Graphics (no image files needed).

const P = (x, y) => ({ x, y });

export function drawIcon(g, name, cx, cy, s, color = 0xffffff, alpha = 1) {
  const r = s / 2;
  g.fillStyle(color, alpha);
  g.lineStyle(Math.max(2, s * 0.12), color, alpha);
  switch (name) {
    case 'menu': {
      const w = s * 0.8, t = s * 0.13;
      for (let i = -1; i <= 1; i++) g.fillRoundedRect(cx - w / 2, cy + i * s * 0.3 - t / 2, w, t, t / 2);
      break;
    }
    case 'pause': {
      const w = s * 0.22, h = s * 0.8;
      g.fillRoundedRect(cx - s * 0.3, cy - h / 2, w, h, 3);
      g.fillRoundedRect(cx + s * 0.08, cy - h / 2, w, h, 3);
      break;
    }
    case 'play':
      g.fillTriangle(cx - r * 0.55, cy - r * 0.75, cx - r * 0.55, cy + r * 0.75, cx + r * 0.8, cy);
      break;
    case 'next':
      g.strokePoints([P(cx - r * 0.3, cy - r * 0.6), P(cx + r * 0.35, cy), P(cx - r * 0.3, cy + r * 0.6)], false);
      break;
    case 'back':
      g.strokePoints([P(cx + r * 0.3, cy - r * 0.6), P(cx - r * 0.35, cy), P(cx + r * 0.3, cy + r * 0.6)], false);
      break;
    case 'up':
      g.fillTriangle(cx, cy - r * 0.8, cx - r * 0.75, cy + r * 0.1, cx + r * 0.75, cy + r * 0.1);
      g.fillRect(cx - r * 0.25, cy, r * 0.5, r * 0.75);
      break;
    case 'down':
      g.fillTriangle(cx, cy + r * 0.8, cx - r * 0.75, cy - r * 0.1, cx + r * 0.75, cy - r * 0.1);
      g.fillRect(cx - r * 0.25, cy - r * 0.75, r * 0.5, r * 0.75);
      break;
    case 'left':
      g.fillTriangle(cx - r * 0.8, cy, cx + r * 0.1, cy - r * 0.75, cx + r * 0.1, cy + r * 0.75);
      g.fillRect(cx, cy - r * 0.25, r * 0.75, r * 0.5);
      break;
    case 'right':
      g.fillTriangle(cx + r * 0.8, cy, cx - r * 0.1, cy - r * 0.75, cx - r * 0.1, cy + r * 0.75);
      g.fillRect(cx - r * 0.75, cy - r * 0.25, r * 0.75, r * 0.5);
      break;
    case 'close':
      g.lineBetween(cx - r * 0.55, cy - r * 0.55, cx + r * 0.55, cy + r * 0.55);
      g.lineBetween(cx + r * 0.55, cy - r * 0.55, cx - r * 0.55, cy + r * 0.55);
      break;
    case 'check':
      g.strokePoints([P(cx - r * 0.6, cy), P(cx - r * 0.15, cy + r * 0.45), P(cx + r * 0.65, cy - r * 0.5)], false);
      break;
    case 'star':
      g.fillPoints(starPoints(cx, cy, r, r * 0.45, 5), true);
      break;
    case 'home':
      g.fillTriangle(cx, cy - r * 0.85, cx - r * 0.9, cy - r * 0.05, cx + r * 0.9, cy - r * 0.05);
      g.fillRect(cx - r * 0.6, cy - r * 0.1, r * 1.2, r * 0.85);
      break;
    case 'speaker':
    case 'speakerOff': {
      g.fillPoints([P(cx - r * 0.8, cy - r * 0.3), P(cx - r * 0.4, cy - r * 0.3), P(cx + r * 0.05, cy - r * 0.75), P(cx + r * 0.05, cy + r * 0.75), P(cx - r * 0.4, cy + r * 0.3), P(cx - r * 0.8, cy + r * 0.3)], true);
      g.lineStyle(Math.max(2, s * 0.09), color, alpha);
      if (name === 'speaker') {
        g.beginPath();
        g.arc(cx + r * 0.1, cy, r * 0.45, -0.8, 0.8);
        g.strokePath();
        g.beginPath();
        g.arc(cx + r * 0.1, cy, r * 0.8, -0.8, 0.8);
        g.strokePath();
      } else {
        g.lineBetween(cx + r * 0.35, cy - r * 0.35, cx + r * 0.9, cy + r * 0.35);
        g.lineBetween(cx + r * 0.9, cy - r * 0.35, cx + r * 0.35, cy + r * 0.35);
      }
      break;
    }
    case 'lock':
      g.fillRoundedRect(cx - r * 0.65, cy - r * 0.1, r * 1.3, r * 0.95, 4);
      g.lineStyle(Math.max(2, s * 0.12), color, alpha);
      g.beginPath();
      g.arc(cx, cy - r * 0.15, r * 0.42, Math.PI, 0);
      g.strokePath();
      break;
    case 'replay':
      g.beginPath();
      g.arc(cx, cy, r * 0.6, -Math.PI * 0.35, Math.PI * 1.4);
      g.strokePath();
      g.fillTriangle(cx + r * 0.25, cy - r * 0.85, cx + r * 0.75, cy - r * 0.45, cx + r * 0.2, cy - r * 0.25);
      break;
    case 'fullscreen': {
      const a = r * 0.75, b = r * 0.35;
      g.strokePoints([P(cx - a, cy - b), P(cx - a, cy - a), P(cx - b, cy - a)], false);
      g.strokePoints([P(cx + b, cy - a), P(cx + a, cy - a), P(cx + a, cy - b)], false);
      g.strokePoints([P(cx + a, cy + b), P(cx + a, cy + a), P(cx + b, cy + a)], false);
      g.strokePoints([P(cx - b, cy + a), P(cx - a, cy + a), P(cx - a, cy + b)], false);
      break;
    }
    case 'skip':
      g.fillTriangle(cx - r * 0.8, cy - r * 0.6, cx - r * 0.8, cy + r * 0.6, cx - r * 0.1, cy);
      g.fillTriangle(cx - r * 0.1, cy - r * 0.6, cx - r * 0.1, cy + r * 0.6, cx + r * 0.6, cy);
      g.fillRect(cx + r * 0.6, cy - r * 0.6, r * 0.18, r * 1.2);
      break;
    case 'info':
      g.fillCircle(cx, cy - r * 0.45, r * 0.14);
      g.fillRoundedRect(cx - r * 0.12, cy - r * 0.15, r * 0.24, r * 0.8, 2);
      break;
    case 'sliders':
      for (let i = -1; i <= 1; i++) {
        g.lineStyle(Math.max(2, s * 0.08), color, alpha);
        g.lineBetween(cx - r * 0.8, cy + i * r * 0.55, cx + r * 0.8, cy + i * r * 0.55);
        g.fillCircle(cx + [-0.35, 0.3, -0.05][i + 1] * r * 1.6, cy + i * r * 0.55, r * 0.2);
      }
      break;
    case 'restart':
      g.beginPath();
      g.arc(cx, cy, r * 0.6, Math.PI * 0.2, Math.PI * 1.9);
      g.strokePath();
      g.fillTriangle(cx + r * 0.62, cy - r * 0.62, cx + r * 0.75, cy + r * 0.05, cx + r * 0.1, cy - r * 0.2);
      break;
    case 'hand':
      g.fillRoundedRect(cx - r * 0.18, cy - r * 0.9, r * 0.36, r * 1.1, r * 0.18);
      g.fillRoundedRect(cx - r * 0.55, cy - r * 0.1, r * 1.1, r * 0.95, r * 0.3);
      break;
    default:
      g.fillCircle(cx, cy, r * 0.5);
  }
}

export function starPoints(cx, cy, outer, inner, n = 5, rot = -Math.PI / 2) {
  const pts = [];
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / n;
    pts.push(P(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr));
  }
  return pts;
}
