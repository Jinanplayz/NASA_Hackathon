import { W, H, FULL, COLORS, seeded } from '../../core/constants.js';
import { Settings } from '../../core/Settings.js';

// Deep-space backdrop with twinkling stars. It covers the whole screen, including the extra
// background that wide or tall screens show around the stage.
export function starfield(scene, o = {}) {
  const rnd = seeded(o.seed ?? 5);
  const depth = o.depth ?? 0;
  const g = scene.add.graphics().setDepth(depth);
  const top = FULL.y, bottom = o.height ?? FULL.y + FULL.h;
  if (o.gradient !== false) {
    g.fillGradientStyle(o.top ?? 0x0a1030, o.top ?? 0x0a1030, o.bottom ?? 0x03050f, o.bottom ?? 0x03050f, 1);
    g.fillRect(FULL.x, FULL.y, FULL.w, FULL.h);
  }
  // the same density of stars as on the stage
  const count = Math.round(((o.count ?? 160) * FULL.w * (bottom - top)) / (W * H));
  for (let i = 0; i < count; i++) {
    const x = FULL.x + rnd() * FULL.w, y = top + rnd() * (bottom - top);
    const r = rnd() < 0.1 ? 1.8 : rnd() < 0.5 ? 1.1 : 0.7;
    g.fillStyle(0xffffff, 0.35 + rnd() * 0.6);
    g.fillCircle(x, y, r);
  }
  const twinkles = [];
  if (!Settings.get('reducedMotion') && o.twinkle !== false) {
    for (let i = 0; i < 26; i++) {
      const s = scene.add.image(FULL.x + rnd() * FULL.w, top + rnd() * (bottom - top), 'sparkle').setScale(0.12 + rnd() * 0.12).setDepth(depth).setAlpha(0);
      scene.tweens.add({ targets: s, alpha: 0.9, duration: 800 + rnd() * 1200, yoyo: true, repeat: -1, delay: rnd() * 3000, ease: 'Sine.easeInOut' });
      twinkles.push(s);
    }
  }
  return { g, twinkles };
}

// A panel-style "blueprint" grid background (used by building screens).
export function blueprint(scene, o = {}) {
  const g = scene.add.graphics().setDepth(o.depth ?? 0);
  const { x: x0, y: y0, w: fw, h: fh } = FULL;
  g.fillGradientStyle(0x0d1a45, 0x0d1a45, 0x070b1d, 0x070b1d, 1);
  g.fillRect(x0, y0, fw, fh);
  // grid lines line up with the stage (0, 40, 80...) and carry on into the extra background
  const grid = (step, alpha) => {
    g.lineStyle(1, 0x2a4a9a, alpha);
    for (let x = Math.ceil(x0 / step) * step; x <= x0 + fw; x += step) g.lineBetween(x, y0, x, y0 + fh);
    for (let y = Math.ceil(y0 / step) * step; y <= y0 + fh; y += step) g.lineBetween(x0, y, x0 + fw, y);
  };
  grid(40, 0.25);
  grid(200, 0.45);
  return g;
}

export function glowCircle(scene, x, y, r, color = COLORS.cyan, alpha = 0.35) {
  const img = scene.add.image(x, y, 'softDot').setTint(color).setAlpha(alpha);
  img.setDisplaySize(r * 2, r * 2);
  return img;
}
