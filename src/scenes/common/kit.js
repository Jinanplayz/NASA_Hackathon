// Small helpers shared by the mini-games: the guide's opening lines, the result pop-up,
// and a side panel for facts.
import { COLORS, CSS, DEPTH } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { txt, fitText } from '../../ui/text.js';
import { dialog, drawPanel } from '../../ui/widgets.js';

// Captain Nova explains the game (the config's "intro" lines), with "Play" on the last line.
// Resolves true when the player is ready, false if the screen was left meanwhile.
export async function playIntro(scene, key = 'intro', o = {}) {
  const lines = scene.T(key, []);
  if (!lines.length) return true;
  const r = await scene.guide.sequence(lines, { modal: true, position: o.position ?? 'top', lastLabel: o.lastLabel ?? Content.ui('play', 'Play') });
  return r !== null && !scene._leaving;
}

// The end-of-game pop-up: stars, a message, then "Try again" or "Continue".
export function finishGame(scene, { title, text, stars = 3, retry = true, width = 820 } = {}) {
  const buttons = [];
  if (retry) buttons.push({ label: Content.ui('tryAgain', 'Try again'), value: 'retry', variant: 'secondary', icon: 'restart' });
  buttons.push({ label: Content.ui('continue', 'Continue'), value: 'next', icon: 'next' });
  return dialog(scene, { title: title ?? scene.T('resultTitle', 'Well done!'), stars, text: text ?? scene.T('resultText', ''), buttons, width }).then((v) => {
    if (v === 'retry') scene.scene.restart(scene.payload);
    else scene.done(stars);
  });
}

// A panel with a heading and a few lines of text that can be changed at any time.
export class InfoPanel {
  constructor(scene, x, y, w, h, o = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.g = scene.add.graphics().setDepth(o.depth ?? DEPTH.ui - 2);
    this.color = o.stroke ?? COLORS.stroke;
    this.redraw(this.color);
    this.title = txt(scene, x + 20, y + 18, o.title ?? '', { size: o.titleSize ?? 22, weight: 800, color: o.titleColor ?? CSS.yellow, wrap: w - 40 }).setDepth(o.depth ?? DEPTH.ui - 2);
    this.body = txt(scene, x + 20, y + 56, o.text ?? '', { size: o.size ?? 19, wrap: w - 40, lineSpacing: 5 }).setDepth(o.depth ?? DEPTH.ui - 2);
    this.minSize = o.minSize ?? 13;
  }

  redraw(stroke) {
    this.g.clear();
    drawPanel(this.g, this.x, this.y, this.w, this.h, { fill: COLORS.panel, radius: 18, stroke, strokeWidth: 3 });
  }

  show(title, text, o = {}) {
    this.title.setText(title ?? '').setColor(o.titleColor ?? CSS.yellow);
    fitText(this.title, this.w - 40, 64, 16);
    this.body.setText(text ?? '').setY(this.title.y + this.title.height + 10);
    this.body.setFontSize(o.size ?? 19);
    fitText(this.body, this.w - 40, this.y + this.h - 16 - this.body.y, this.minSize);
    this.redraw(o.stroke ?? this.color);
    if (o.flash !== false) {
      this.scene.tweens.killTweensOf([this.title, this.body]);
      this.title.setAlpha(0.2);
      this.body.setAlpha(0.2);
      this.scene.tweens.add({ targets: [this.title, this.body], alpha: 1, duration: 260 });
    }
    return this;
  }
}

// Makes a game object draggable, with a tap as an easy alternative.
//   onDrop(x, y): return true if it was dropped somewhere useful; otherwise it slides back home.
//   onTap(): a quick tap without dragging (also what ENTER does when the object is focused).
// The object must already have a size (containers: setSize) so it can be grabbed.
export function draggable(scene, obj, { onDrop, onTap, focus = true } = {}) {
  obj.setInteractive({ useHandCursor: true, draggable: true });
  scene.input.setDraggable(obj);
  obj.home = { x: obj.x, y: obj.y };
  obj.enabled = true;
  let start = null;
  obj.on('dragstart', (p) => {
    if (!obj.enabled) return;
    start = { x: p.worldX, y: p.worldY, depth: obj.depth };
    obj.setDepth(DEPTH.ui + 40);
    scene.tweens.killTweensOf(obj);
    scene.tweens.add({ targets: obj, scale: 1.08, duration: 120 });
  });
  obj.on('drag', (p, dx, dy) => {
    if (!obj.enabled || !start) return;
    obj.setPosition(dx, dy);
  });
  obj.on('dragend', (p) => {
    if (!start) return;
    const moved = Math.hypot(p.worldX - start.x, p.worldY - start.y);
    obj.setDepth(start.depth);
    start = null;
    scene.tweens.add({ targets: obj, scale: 1, duration: 120 });
    if (!obj.enabled) return;
    if (moved < 10) {
      obj.setPosition(obj.home.x, obj.home.y);
      if (onTap) onTap();
      return;
    }
    if (!(onDrop && onDrop(p.worldX, p.worldY))) obj.goHome();
  });
  obj.goHome = () => scene.tweens.add({ targets: obj, x: obj.home.x, y: obj.home.y, duration: 260, ease: 'Back.easeOut' });
  obj.activate = () => obj.enabled && onTap && onTap();
  if (focus && scene.focus) scene.focus.add(obj);
  return obj;
}

// A real NASA photo in a frame on top of the game (photo: { src, alt, credit }), with its credit
// underneath. Returns the DOM element (hide it with scene.setDomVisible) or null.
export function showPhoto(scene, photo, x, y, w, h) {
  if (!photo || !photo.src) return null;
  const el = document.createElement('div');
  el.className = 'media-frame';
  el.style.width = `${w}px`;
  el.style.height = `${h}px`;
  const im = document.createElement('img');
  im.src = Content.media(scene.chapterId, photo.src);
  im.alt = photo.alt || '';
  el.appendChild(im);
  const dom = scene.addDom(x, y, el);
  dom.pointerEvents = 'none';
  const credit = txt(scene, x + w / 2, y + h + 16, photo.credit || Content.ui('photoCredit', 'Photo: NASA'), { size: 13, color: CSS.dim, origin: 0.5, scale: false }).setDepth(DEPTH.modal - 1);
  im.onerror = () => {
    scene.setDomVisible(dom, false);
    credit.setVisible(false);
  };
  dom.credit = credit;
  return dom;
}

// Stars from a number of mistakes: few mistakes = 3 stars.
export function starsFor(mistakes, ok3 = 1, ok2 = 3) {
  return mistakes <= ok3 ? 3 : mistakes <= ok2 ? 2 : 1;
}
