import { W, H, FULL, TEX, seeded } from '../../core/constants.js';
import { Settings } from '../../core/Settings.js';
import { makeTex } from '../../art/core.js';

// Stars (and other little dots) are round dots in a few sizes. Hundreds of circles in a Graphics
// object are slow (Phaser works out their triangles again every frame), so they're drawn as a
// Blitter instead: one small texture with a frame per size, and one cheap batch of little images.
const STAR_R = [0.7, 1.1, 1.8, 3, 4.5];
const STAR_CELL = 10;

function starTexture(scene) {
  if (scene.textures.exists('starDots')) return;
  const tex = makeTex(scene, 'starDots', STAR_CELL * STAR_R.length, STAR_CELL, (c) => {
    c.fillStyle = '#ffffff';
    STAR_R.forEach((r, i) => {
      c.beginPath();
      c.arc(i * STAR_CELL + STAR_CELL / 2, STAR_CELL / 2, r, 0, Math.PI * 2);
      c.fill();
    });
  });
  STAR_R.forEach((r, i) => tex.add(`r${i}`, 0, i * STAR_CELL * TEX, 0, STAR_CELL * TEX, STAR_CELL * TEX));
}

// Scatters dots: a list of { x, y, size, alpha, tint }, where size picks a radius from STAR_R
// (0 is the smallest). Returns the Blitter (add more with addDots, or empty it with clear()).
export function starDots(scene, stars, depth = 0) {
  starTexture(scene);
  const b = scene.add.blitter(0, 0, 'starDots').setDepth(depth).setScale(1 / TEX);
  addDots(b, stars);
  return b;
}

export function addDots(b, stars) {
  const half = (STAR_CELL * TEX) / 2;
  stars.forEach((s) => {
    const bob = b.create(s.x * TEX - half, s.y * TEX - half, `r${s.size}`);
    bob.setAlpha(s.alpha ?? 1);
    if (s.tint !== undefined) bob.tint = s.tint;
  });
  return b;
}

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
  const stars = [];
  for (let i = 0; i < count; i++) {
    const x = FULL.x + rnd() * FULL.w, y = top + rnd() * (bottom - top);
    const size = rnd() < 0.1 ? 2 : rnd() < 0.5 ? 1 : 0;
    stars.push({ x, y, size, alpha: 0.35 + rnd() * 0.6 });
  }
  const dots = starDots(scene, stars, depth);
  const twinkles = [];
  if (!Settings.get('reducedMotion') && o.twinkle !== false) {
    for (let i = 0; i < 26; i++) {
      const s = scene.add.image(FULL.x + rnd() * FULL.w, top + rnd() * (bottom - top), 'sparkle').setScale(0.12 + rnd() * 0.12).setDepth(depth).setAlpha(0);
      scene.tweens.add({ targets: s, alpha: 0.9, duration: 800 + rnd() * 1200, yoyo: true, repeat: -1, delay: rnd() * 3000, ease: 'Sine.easeInOut' });
      twinkles.push(s);
    }
  }
  return { g, dots, twinkles };
}

// A panel-style "blueprint" grid background (used by building screens).
// The grid is one 200 x 200 tile (thin lines every 40, a stronger one every 200) repeated, so it
// costs one image a frame instead of ~70 lines.
export function blueprint(scene, o = {}) {
  const depth = o.depth ?? 0;
  const g = scene.add.graphics().setDepth(depth);
  const { x: x0, y: y0, w: fw, h: fh } = FULL;
  g.fillGradientStyle(0x0d1a45, 0x0d1a45, 0x070b1d, 0x070b1d, 1);
  g.fillRect(x0, y0, fw, fh);
  if (!scene.textures.exists('gridTile')) {
    makeTex(scene, 'gridTile', 200, 200, (c) => {
      c.fillStyle = 'rgba(42,74,154,0.25)';
      for (let k = 40; k < 200; k += 40) {
        c.fillRect(k - 0.5, 0, 1, 200);
        c.fillRect(0, k - 0.5, 200, 1);
      }
      // the strong lines sit on the tile's edges (half on each side, so they meet up seamlessly)
      c.fillStyle = 'rgba(42,74,154,0.45)';
      [[0, 0, 0.5, 200], [199.5, 0, 0.5, 200], [0, 0, 200, 0.5], [0, 199.5, 200, 0.5]].forEach(([x, y, w, h]) => c.fillRect(x, y, w, h));
    });
  }
  // (starts on a multiple of 200, so the lines fall on 0, 40, 80... like the stage)
  const sx = Math.floor(x0 / 200) * 200, sy = Math.floor(y0 / 200) * 200;
  const tw = Math.ceil((x0 + fw - sx) / 200) * 200, th = Math.ceil((y0 + fh - sy) / 200) * 200;
  scene.add.tileSprite(sx, sy, tw, th, 'gridTile').setOrigin(0).setDepth(depth).setTileScale(1 / TEX);
  return g;
}
