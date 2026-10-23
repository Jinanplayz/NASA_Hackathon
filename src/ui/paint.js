import Phaser from 'phaser';
import { COLORS, RES, TEX } from '../core/constants.js';

// Paints a Graphics drawing once onto a new canvas texture. A Graphics redraws every one of its
// shapes on every frame, so drawings that don't change are much cheaper shown as a texture.
// x, y, w, h: the part of the drawing to keep; k: texture pixels per layout pixel.
// (It's painted on an ordinary 2D canvas, like Phaser's own Graphics.generateTexture, so the
// WebGL renderer is never switched to drawing off screen.)
export function paintTexture(scene, key, g, x, y, w, h, k) {
  const tex = scene.textures.createCanvas(key, Math.ceil(w * k), Math.ceil(h * k));
  const cam = Phaser.GameObjects.Graphics.TargetCamera;
  cam.setScene(scene);
  cam.setViewport(0, 0, tex.width, tex.height);
  // (so the area's top-left corner lands on the canvas's top-left corner, k times bigger)
  cam.scrollX = g.x * (1 - k) + x * k;
  cam.scrollY = g.y * (1 - k) + y * k;
  const sx = g.scaleX, sy = g.scaleY;
  g.setScale(sx * k, sy * k);
  g.renderCanvas(scene.sys.renderer, g, cam, null, tex.getContext(), false);
  g.setScale(sx, sy);
  // (this camera never renders a frame, so nothing else empties its list of what it drew)
  cam.renderList.length = 0;
  tex.refresh();
  return tex;
}

// Turns a drawing that never changes (a Graphics) into a picture. Phaser redraws every shape of
// a Graphics on every frame, so big static drawings (grids, maps) are much cheaper as one image.
// x, y, w, h: the area it covers. The picture is painted at the screen's resolution, keeps the
// drawing's place in front of / behind other things, and the Graphics is thrown away.
let bakes = 0;
export function bake(scene, g, x, y, w, h) {
  const k = Math.min(2, Math.max(1, RES));
  const key = `baked${++bakes}`;
  paintTexture(scene, key, g, x, y, w, h, k);
  const im = scene.add.image(x, y, key).setOrigin(0).setScale(1 / k).setDepth(g.depth);
  const holder = g.parentContainer;
  if (holder) holder.addAt(im, holder.getIndex(g));
  else scene.children.moveBelow(im, g);
  g.destroy();
  // the picture belongs to this visit of the screen only
  im.once('destroy', () => scene.textures.exists(key) && scene.textures.remove(key));
  return im;
}

// Rounded boxes (panels, cards, button shapes) shown as nine pictures: the four rounded corners,
// the four edges and the middle, with the edges and the middle stretched to the box's size.
// Each look is painted once, into a small texture that every box with that look shares whatever
// its size, so a box costs about as little as an image (a Graphics redraws on every frame).
// Options as drawPanel (widgets.js): fill, alpha, radius, stroke (null = none), strokeWidth,
// strokeAlpha, shadow (false = none), plus shadowAlpha, shadowY and highlight (the opacity of a
// light band across the top, as on buttons; it depends on the height, so those boxes only
// stretch sideways).
const MID = 2; // size of the stretchy middle
function boxLook(o) {
  return {
    r: o.radius ?? 20,
    fill: o.fill === null ? null : o.fill ?? COLORS.panel,
    alpha: o.alpha ?? 0.94,
    stroke: o.stroke === null ? null : o.stroke ?? COLORS.stroke,
    lineWidth: o.strokeWidth ?? 2,
    strokeAlpha: o.strokeAlpha ?? 1,
    shadow: o.shadow === false ? 0 : o.shadowAlpha ?? 0.3,
    shadowY: o.shadowY ?? 6,
    highlight: o.highlight ?? 0
  };
}
// w, h: the size of the painted shape; cols / rows: whether it's cut into three columns / rows
// (the ends are `end` wide and the top row `top` high, plus `pad` for the outline; the bottom
// row also holds the shadow)
function boxTexture(scene, w, h, L, pad, end, top, cols, rows) {
  const key = `box|${w}|${h}|${Object.values(L).join('|')}`;
  if (scene.textures.exists(key)) return key;
  const { r } = L;
  const g = scene.make.graphics({}, false);
  if (L.shadow) {
    g.fillStyle(0x000000, L.shadow);
    g.fillRoundedRect(0, L.shadowY, w, h, r);
  }
  if (L.fill != null) {
    g.fillStyle(L.fill, L.alpha);
    g.fillRoundedRect(0, 0, w, h, r);
  }
  if (L.highlight) {
    g.fillStyle(0xffffff, L.highlight);
    // (corner sizes limited to the band's own height, so pill shapes look right too)
    const hr = Math.max(0, Math.min(r - 4, h * 0.21));
    g.fillRoundedRect(4, 3, w - 8, h * 0.42, { tl: hr, tr: hr, bl: Math.min(6, hr), br: Math.min(6, hr) });
  }
  if (L.stroke != null) {
    g.lineStyle(L.lineWidth, L.stroke, L.strokeAlpha);
    g.strokeRoundedRect(0, 0, w, h, r);
  }
  const tex = paintTexture(scene, key, g, -pad, -pad, w + pad * 2, h + Math.max(0, L.shadowY) + pad * 2, TEX);
  g.destroy();
  // the pieces, in texture pixels: frame "cr" is column c, row r
  const cap = (end + pad) * TEX, capT = (top + pad) * TEX, mid = MID * TEX;
  const xs = cols ? [[0, cap], [cap, mid], [cap + mid, tex.width - cap - mid]] : [[0, tex.width]];
  const ys = rows ? [[0, capT], [capT, mid], [capT + mid, tex.height - capT - mid]] : [[0, tex.height]];
  xs.forEach(([x, fw], c) => ys.forEach(([y, fh], k) => tex.add(`${c}${k}`, 0, x, y, fw, fh)));
  return key;
}
// nine images to show a box with (see setBox)
export function boxParts(scene) {
  return Array.from({ length: 9 }, () => scene.make.image({ key: '__DEFAULT', add: false }).setOrigin(0).setVisible(false));
}
// Shows a box with its top-left corner at (x, y) using the nine images from boxParts.
export function setBox(parts, x, y, w, h, o = {}) {
  // (a box whose screen has closed has nothing left to draw on)
  const scene = parts[0].scene;
  if (!scene) return;
  const L = boxLook(o);
  const pad = Math.ceil(L.lineWidth / 2) + 1;
  // the rounded ends: the corners plus a little straight bit; a box smaller than two ends and the
  // stretchy middle gets a texture of its own size that way
  const end = Math.ceil(L.r + L.lineWidth / 2) + 3;
  // (the top row also holds the shadow's rounded top corners, which sit lower)
  const top = L.shadow ? Math.max(end, Math.ceil(L.r + L.shadowY) + 1) : end;
  const cols = w >= end * 2 + MID;
  const rows = h >= top + end + MID && !L.highlight;
  const key = boxTexture(scene, cols ? end * 2 + MID : w, rows ? top + end + MID : h, L, pad, end, top, cols, rows);
  // where each column / row goes, and how much it's stretched
  const xs = cols ? [[x - pad, 1 / TEX], [x + end, (w - end * 2) / (MID * TEX)], [x + w - end, 1 / TEX]] : [[x - pad, 1 / TEX]];
  const ys = rows ? [[y - pad, 1 / TEX], [y + top, (h - top - end) / (MID * TEX)], [y + h - end, 1 / TEX]] : [[y - pad, 1 / TEX]];
  parts.forEach((p, i) => {
    const c = i % 3, k = Math.floor(i / 3);
    if (c >= xs.length || k >= ys.length) p.setVisible(false);
    else p.setTexture(key, `${c}${k}`).setPosition(xs[c][0], ys[k][0]).setScale(xs[c][1], ys[k][1]).setVisible(true);
  });
}

// A rounded box as a game object; draw() takes the same arguments as drawPanel and can be called
// again to change it (a card that lights up, say).
export class RoundBox extends Phaser.GameObjects.Container {
  constructor(scene) {
    super(scene, 0, 0);
    this.parts = boxParts(scene);
    this.add(this.parts);
  }

  draw(x, y, w, h, o) {
    setBox(this.parts, x, y, w, h, o);
    return this;
  }
}
export function roundBox(scene, x, y, w, h, o) {
  return scene.add.existing(new RoundBox(scene).draw(x, y, w, h, o));
}
