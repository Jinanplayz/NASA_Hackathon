import { W, H, COLORS, seeded } from '../../core/constants.js';
import { Settings } from '../../core/Settings.js';

// Deep-space backdrop with twinkling stars.
export function starfield(scene, o = {}) {
  const rnd = seeded(o.seed ?? 5);
  const depth = o.depth ?? 0;
  const g = scene.add.graphics().setDepth(depth);
  if (o.gradient !== false) {
    g.fillGradientStyle(o.top ?? 0x0a1030, o.top ?? 0x0a1030, o.bottom ?? 0x03050f, o.bottom ?? 0x03050f, 1);
    g.fillRect(0, 0, W, H);
  }
  const count = o.count ?? 160;
  for (let i = 0; i < count; i++) {
    const x = rnd() * W, y = rnd() * (o.height ?? H);
    const r = rnd() < 0.1 ? 1.8 : rnd() < 0.5 ? 1.1 : 0.7;
    g.fillStyle(0xffffff, 0.35 + rnd() * 0.6);
    g.fillCircle(x, y, r);
  }
  const twinkles = [];
  if (!Settings.get('reducedMotion') && o.twinkle !== false) {
    for (let i = 0; i < 18; i++) {
      const s = scene.add.image(rnd() * W, rnd() * (o.height ?? H), 'sparkle').setScale(0.12 + rnd() * 0.12).setDepth(depth).setAlpha(0);
      scene.tweens.add({ targets: s, alpha: 0.9, duration: 800 + rnd() * 1200, yoyo: true, repeat: -1, delay: rnd() * 3000, ease: 'Sine.easeInOut' });
      twinkles.push(s);
    }
  }
  return { g, twinkles };
}

// A panel-style "blueprint" grid background (used by building screens).
export function blueprint(scene, o = {}) {
  const g = scene.add.graphics().setDepth(o.depth ?? 0);
  g.fillGradientStyle(0x0d1a45, 0x0d1a45, 0x070b1d, 0x070b1d, 1);
  g.fillRect(0, 0, W, H);
  g.lineStyle(1, 0x2a4a9a, 0.25);
  for (let x = 0; x <= W; x += 40) g.lineBetween(x, 0, x, H);
  for (let y = 0; y <= H; y += 40) g.lineBetween(0, y, W, y);
  g.lineStyle(1, 0x2a4a9a, 0.45);
  for (let x = 0; x <= W; x += 200) g.lineBetween(x, 0, x, H);
  for (let y = 0; y <= H; y += 200) g.lineBetween(0, y, W, y);
  return g;
}

export function glowCircle(scene, x, y, r, color = COLORS.cyan, alpha = 0.35) {
  const img = scene.add.image(x, y, 'softDot').setTint(color).setAlpha(alpha);
  img.setDisplaySize(r * 2, r * 2);
  return img;
}
