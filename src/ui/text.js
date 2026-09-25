import { FONT, CSS, RES } from '../core/constants.js';
import { Settings } from '../core/Settings.js';

// Creates a crisp text object. Options:
// size, color, weight, align, wrap (px), origin, stroke, shadow, scale (false = ignore "large text" setting)
export function txt(scene, x, y, str, o = {}) {
  const scaleMul = o.scale === false ? 1 : Settings.textScale();
  const size = Math.round((o.size || 24) * scaleMul);
  const style = {
    fontFamily: FONT,
    fontSize: size + 'px',
    color: o.color || CSS.text,
    fontStyle: String(o.weight || 400),
    align: o.align || 'left',
    lineSpacing: o.lineSpacing ?? Math.round(size * 0.22),
    resolution: RES
  };
  if (o.wrap) style.wordWrap = { width: o.wrap, useAdvancedWrap: true };
  if (o.stroke) {
    style.stroke = o.stroke;
    style.strokeThickness = o.strokeThickness || 5;
  }
  if (o.shadow) style.shadow = { offsetX: 0, offsetY: 2, color: '#000000', blur: 8, fill: true, stroke: true };
  if (o.fixedWidth) style.fixedWidth = o.fixedWidth;
  const t = scene.add.text(x, y, str ?? '', style);
  if (o.origin !== undefined) {
    if (Array.isArray(o.origin)) t.setOrigin(o.origin[0], o.origin[1]);
    else t.setOrigin(o.origin);
  }
  return t;
}

// Shrinks a text object's font until it fits inside maxW x maxH.
export function fitText(t, maxW, maxH, minSize = 14) {
  let size = parseInt(t.style.fontSize, 10);
  while (size > minSize && (t.height > maxH || (maxW && t.width > maxW))) {
    size -= 1;
    t.setFontSize(size);
  }
  return t;
}
