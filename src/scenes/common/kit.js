// Small helpers shared by the mini-games: the guide's opening lines, the result pop-up,
// a side panel for facts, the task banner and the "do this next" arrow.
import { W, COLORS, CSS, DEPTH } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Speech } from '../../core/Speech.js';
import { txt, fitText } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { dialog, pointerArrow, RoundBox } from '../../ui/widgets.js';
// (the scenes get bake from here too)
export { bake } from '../../ui/paint.js';

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
    this.g = scene.add.existing(new RoundBox(scene)).setDepth(o.depth ?? DEPTH.ui - 2);
    this.color = o.stroke ?? COLORS.stroke;
    this.redraw(this.color);
    this.title = txt(scene, x + 20, y + 18, o.title ?? '', { size: o.titleSize ?? 22, weight: 800, color: o.titleColor ?? CSS.yellow, wrap: w - 40 }).setDepth(o.depth ?? DEPTH.ui - 2);
    this.body = txt(scene, x + 20, y + 56, o.text ?? '', { size: o.size ?? 19, wrap: w - 40, lineSpacing: 5 }).setDepth(o.depth ?? DEPTH.ui - 2);
    this.minSize = o.minSize ?? 13;
  }

  redraw(stroke) {
    this.g.draw(this.x, this.y, this.w, this.h, { fill: COLORS.panel, radius: 18, stroke, strokeWidth: 3 });
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
//   onGrab(): called when it's picked up (e.g. to read a card out loud).
// The object must already have a size (containers: setSize) so it can be grabbed.
export function draggable(scene, obj, { onDrop, onTap, onGrab, focus = true } = {}) {
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
    if (onGrab) onGrab();
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

// The task banner at the top of a mini-game (like the Apollo 11 repair screen): what to do in a
// few big words, one line of help underneath, an optional "2 / 5" counter, and a speaker button
// that reads it again. It stays on screen, so the goal is never a mystery.
// The text comes from the config ({ "title": ..., "help": ... }), so it has a recorded voice.
export class GoalBar {
  constructor(scene, o = {}) {
    this.scene = scene;
    this.w = o.w ?? 940;
    this.h = o.h ?? 78;
    this.x = o.x ?? W / 2 - this.w / 2;
    this.y = o.y ?? 80;
    this.root = scene.add.container(0, 0).setDepth(o.depth ?? DEPTH.ui + 10);
    this.g = new RoundBox(scene).draw(this.x, this.y, this.w, this.h, { fill: 0x0e1840, radius: 18, stroke: COLORS.cyan, strokeWidth: 3 });
    this.title = txt(scene, this.x + 24, this.y + 10, '', { size: 25, weight: 800, color: CSS.yellow, scale: false });
    this.help = txt(scene, this.x + 24, this.y + 44, '', { size: 18, weight: 600, scale: false });
    this.count = txt(scene, this.x + this.w - 92, this.y + this.h / 2, '', { size: 22, weight: 800, color: CSS.cyan, origin: [1, 0.5], scale: false });
    this.root.add([this.g, this.title, this.help, this.count]);
    // hear it again
    this.replay = new Button(scene, this.x + this.w - 44, this.y + this.h / 2, { width: 58, height: 58, icon: 'speaker', iconSize: 24, variant: 'ghost', radius: 16, onClick: () => this.say() });
    this.replay.setDepth(this.root.depth + 1);
    this.lines = [];
  }

  // Shows a new task. task: { title, help } (or a plain title string).
  set(task, { speak = true, count = null } = {}) {
    const t = typeof task === 'string' ? { title: task } : task || {};
    this.lines = [t.title, t.help].filter(Boolean);
    const room = this.w - 48 - (count != null ? 190 : 80);
    this.title.setText(t.title || '').setFontSize(25);
    fitText(this.title, room, 34, 17);
    this.help.setText(t.help || '').setFontSize(18);
    fitText(this.help, room, 26, 13);
    // with no help line, the title sits in the middle of the bar
    this.title.setY(t.help ? this.y + 10 : this.y + this.h / 2 - this.title.height / 2);
    this.setCount(count);
    this.scene.tweens.killTweensOf(this.root);
    this.root.setAlpha(0.3);
    this.scene.tweens.add({ targets: this.root, alpha: 1, duration: 260 });
    if (speak) this.say();
    return this;
  }

  setCount(text) {
    this.count.setText(text == null ? '' : String(text));
    return this;
  }

  say() {
    if (this.lines.length) Speech.say(this.lines);
  }

  setVisible(v) {
    this.root.setVisible(v);
    this.replay.setVisible(v);
    return this;
  }
}

// If the player hasn't touched anything for a while, a bouncing arrow points at what to do next.
// getTarget() returns { x, y, dir } (the spot to point at, and which way the arrow points) or null.
export function idleHint(scene, getTarget, { delay = 7000 } = {}) {
  let last = scene.time.now;
  let arrow = null;
  const clear = () => {
    if (arrow) arrow.destroy();
    arrow = null;
  };
  const reset = () => {
    last = scene.time.now;
    clear();
  };
  scene.input.on('pointerdown', reset);
  if (scene.input.keyboard) scene.input.keyboard.on('keydown', reset);
  scene.time.addEvent({
    delay: 400,
    loop: true,
    callback: () => {
      const g = scene.guide;
      const talking = g && g.root.visible && g.opts && (g.opts.modal || g.buttons.length);
      // (the wait starts again whenever Captain Nova has been talking)
      if (talking) last = scene.time.now;
      if (talking || scene.time.now - last < delay) return clear();
      const t = getTarget();
      if (!t) return clear();
      const dir = t.dir || 'down';
      const [ox, oy] = { down: [0, -24], up: [0, 24], left: [24, 0], right: [-24, 0] }[dir];
      const x = t.x + ox, y = t.y + oy;
      if (arrow && arrow._dir !== dir) clear();
      if (!arrow) {
        arrow = pointerArrow(scene, x, y, dir);
        arrow._dir = dir;
      } else if (Math.abs(arrow._tx - x) > 4 || Math.abs(arrow._ty - y) > 4) arrow.pointTo(x, y);
      arrow._tx = x;
      arrow._ty = y;
    }
  });
  return { reset };
}

// Stars from a number of mistakes: few mistakes = 3 stars.
export function starsFor(mistakes, ok3 = 1, ok2 = 3) {
  return mistakes <= ok3 ? 3 : mistakes <= ok2 ? 2 : 1;
}
