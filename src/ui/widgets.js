import Phaser from 'phaser';
import { W, H, FULL, COLORS, CSS, DEPTH } from '../core/constants.js';
import { Settings } from '../core/Settings.js';
import { Speech } from '../core/Speech.js';
import { Sfx } from '../core/Sfx.js';
import { txt } from './text.js';
import { Button } from './Button.js';
import { starPoints } from './icons.js';

export function panel(scene, x, y, w, h, o = {}) {
  const g = scene.add.graphics();
  drawPanel(g, x, y, w, h, o);
  return g;
}

export function drawPanel(g, x, y, w, h, o = {}) {
  const r = o.radius ?? 20;
  if (o.shadow !== false) {
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(x, y + 6, w, h, r);
  }
  g.fillStyle(o.fill ?? COLORS.panel, o.alpha ?? 0.94);
  g.fillRoundedRect(x, y, w, h, r);
  if (o.stroke !== null) {
    g.lineStyle(o.strokeWidth ?? 2, o.stroke ?? COLORS.stroke, o.strokeAlpha ?? 1);
    g.strokeRoundedRect(x, y, w, h, r);
  }
  return g;
}

// A short message that slides in at the top of the screen and disappears by itself.
export function toast(scene, message, o = {}) {
  const color = o.color ?? COLORS.cyan;
  const y = o.y ?? 96;
  // only one message at a time in the same spot
  scene._toasts = scene._toasts || {};
  const prev = scene._toasts[y];
  if (prev && prev.active) prev.destroy();
  // the text always wraps inside the box (at most 840 wide), so it can never spill out
  const t = txt(scene, 0, 0, message, { size: o.size ?? 22, weight: 600, wrap: Math.min(o.wrap ?? 760, 840 - 56), align: 'center', origin: 0.5 });
  const w = t.width + 56, h = t.height + 28;
  const g = scene.add.graphics();
  g.fillStyle(0x0b1230, 0.95);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2 > 28 ? 22 : h / 2);
  g.lineStyle(3, color, 1);
  g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2 > 28 ? 22 : h / 2);
  const c = scene.add.container(o.x ?? W / 2, y - 30, [g, t]).setDepth(DEPTH.toast).setAlpha(0);
  scene._toasts[y] = c;
  scene.tweens.add({ targets: c, y, alpha: 1, duration: 260, ease: 'Back.easeOut' });
  if (o.sound !== false) Sfx.play(o.sound || 'chime');
  // speak: true reads the message; a string or list of strings reads that instead
  if (o.speak) Speech.say(o.speak === true ? message : o.speak);
  scene.time.delayedCall(o.duration ?? 3200, () => {
    if (!c.active) return;
    scene.tweens.add({ targets: c, alpha: 0, y: y - 20, duration: 260, onComplete: () => c.destroy() });
  });
  return c;
}

export class ProgressBar {
  constructor(scene, x, y, w, h, o = {}) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.color = o.color ?? COLORS.green;
    this.value = 0;
    this.shown = 0;
    this.g = scene.add.graphics().setDepth(o.depth ?? DEPTH.ui);
    this.draw();
  }
  set(v, instant = false) {
    this.value = Phaser.Math.Clamp(v, 0, 1);
    if (instant) {
      this.shown = this.value;
      this.draw();
      return;
    }
    if (this.tw) this.tw.stop();
    this.tw = this.scene.tweens.addCounter({
      from: this.shown,
      to: this.value,
      duration: 250,
      onUpdate: (tw) => {
        this.shown = tw.getValue();
        this.draw();
      }
    });
  }
  draw() {
    const { g, x, y, w, h } = this;
    g.clear();
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(x, y, w, h, h / 2);
    if (this.shown > 0.001) {
      g.fillStyle(this.color, 1);
      g.fillRoundedRect(x, y, Math.max(h, w * this.shown), h, h / 2);
      g.fillStyle(0xffffff, 0.25);
      g.fillRoundedRect(x + 3, y + 2, Math.max(h - 6, w * this.shown - 6), h * 0.35, h * 0.2);
    }
    g.lineStyle(2, 0xffffff, 0.25);
    g.strokeRoundedRect(x, y, w, h, h / 2);
  }
  setDepth(d) {
    this.g.setDepth(d);
    return this;
  }
  destroy() {
    this.g.destroy();
  }
}

export function starsRow(scene, x, y, count, max = 3, size = 44) {
  const g = scene.add.graphics();
  for (let i = 0; i < max; i++) {
    const cx = x + (i - (max - 1) / 2) * (size + 10);
    g.fillStyle(i < count ? COLORS.yellow : 0x2a3566, 1);
    g.fillPoints(starPoints(cx, y, size / 2, size / 4.4, 5), true);
  }
  return g;
}

// A pop-up box with a title, text and buttons. Resolves with the chosen button's value.
export function dialog(scene, o = {}) {
  return new Promise((resolve) => {
    const root = scene.add.container(0, 0).setDepth(DEPTH.modal);
    const dim = scene.add.rectangle(W / 2, H / 2, FULL.w, FULL.h, 0x000000, 0.6).setInteractive();
    root.add(dim);
    const w = o.width ?? 760;
    const title = o.title ? txt(scene, W / 2, 0, o.title, { size: o.titleSize ?? 40, weight: 800, origin: [0.5, 0], color: o.titleColor ?? CSS.yellow, align: 'center', wrap: w - 60 }) : null;
    const body = o.text ? txt(scene, W / 2, 0, o.text, { size: 24, origin: [0.5, 0], align: 'center', wrap: w - 80 }) : null;
    const starH = o.stars != null ? 70 : 0;
    const btnH = 70;
    let h = 50 + (title ? title.height + 16 : 0) + starH + (body ? body.height + 20 : 0) + btnH + 30;
    const top = H / 2 - h / 2;
    const bg = panel(scene, W / 2 - w / 2, top, w, h, { fill: COLORS.panel, stroke: o.color ?? COLORS.cyan, strokeWidth: 3, radius: 26 });
    root.add(bg);
    let cy = top + 36;
    if (title) {
      title.setY(cy);
      root.add(title);
      cy += title.height + 16;
    }
    if (o.stars != null) {
      root.add(starsRow(scene, W / 2, cy + 26, o.stars, 3, 52));
      cy += starH;
    }
    if (body) {
      body.setY(cy);
      root.add(body);
      cy += body.height + 20;
    }
    const buttons = o.buttons ?? [{ label: 'OK', value: true }];
    const bw = Math.min(260, (w - 60) / buttons.length - 16);
    const made = [];
    const close = (value) => {
      if (scene.focus) scene.focus.clearTrap();
      made.forEach((b) => b.destroy());
      root.destroy();
      resolve(value);
    };
    buttons.forEach((b, i) => {
      const bx = W / 2 + (i - (buttons.length - 1) / 2) * (bw + 16);
      const btn = new Button(scene, bx, cy + 36, { width: bw, height: 62, label: b.label, variant: b.variant ?? (i === buttons.length - 1 ? 'primary' : 'secondary'), icon: b.icon, onClick: () => close(b.value) });
      btn.setDepth(DEPTH.modal + 1);
      btn._dialog = root;
      made.push(btn);
    });
    if (scene.focus) scene.focus.setTrap((item) => item._dialog === root);
    root.setAlpha(0);
    scene.tweens.add({ targets: root, alpha: 1, duration: 200 });
    made.forEach((b) => {
      b.setAlpha(0);
      scene.tweens.add({ targets: b, alpha: 1, duration: 200 });
    });
    if (o.speak !== false && (o.title || o.text)) Speech.say(Array.isArray(o.speak) || typeof o.speak === 'string' ? o.speak : [o.title, o.text]);
  });
}

// On/off switch used in the settings screen.
export class Toggle extends Phaser.GameObjects.Container {
  constructor(scene, x, y, value, onChange) {
    super(scene, x, y);
    this.value = value;
    this.onChange = onChange;
    this.enabled = true;
    this.g = scene.add.graphics();
    this.add(this.g);
    this.setSize(84, 44);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerup', () => this.activate());
    this.draw();
    scene.add.existing(this);
    if (scene.focus) scene.focus.add(this);
  }
  activate() {
    this.value = !this.value;
    Sfx.play('switch');
    this.draw();
    if (this.onChange) this.onChange(this.value);
  }
  draw() {
    const g = this.g;
    g.clear();
    g.fillStyle(this.value ? COLORS.green : 0x3a4470, 1);
    g.fillRoundedRect(-42, -22, 84, 44, 22);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(this.value ? 20 : -20, 0, 17);
  }
  destroy(fromScene) {
    if (this.scene && this.scene.focus) this.scene.focus.remove(this);
    super.destroy(fromScene);
  }
}

// Draggable slider (0..1). Keyboard: focus it and press ENTER to step up.
export class Slider extends Phaser.GameObjects.Container {
  constructor(scene, x, y, width, value, onChange, steps = 10) {
    super(scene, x, y);
    this.w = width;
    this.value = value;
    this.onChange = onChange;
    this.steps = steps;
    this.enabled = true;
    this.g = scene.add.graphics();
    this.add(this.g);
    this.setSize(width + 40, 50);
    this.setInteractive({ useHandCursor: true, draggable: false });
    const setFromPointer = (p) => {
      const local = p.worldX - (this.x - this.w / 2) - (this.parentContainer ? this.parentContainer.x : 0);
      this.set(Phaser.Math.Clamp(local / this.w, 0, 1));
    };
    this.on('pointerdown', (p) => {
      this.dragging = true;
      setFromPointer(p);
    });
    scene.input.on('pointermove', (p) => {
      if (this.dragging && p.isDown) setFromPointer(p);
    });
    scene.input.on('pointerup', () => {
      if (this.dragging) Sfx.play('click');
      this.dragging = false;
    });
    this.draw();
    scene.add.existing(this);
    if (scene.focus) scene.focus.add(this);
  }
  set(v) {
    this.value = v;
    this.draw();
    if (this.onChange) this.onChange(v);
  }
  activate() {
    let v = Math.round(this.value * this.steps) + 1;
    if (v > this.steps) v = 0;
    this.set(v / this.steps);
    Sfx.play('click');
  }
  draw() {
    const g = this.g, w = this.w;
    g.clear();
    g.fillStyle(0x3a4470, 1);
    g.fillRoundedRect(-w / 2, -6, w, 12, 6);
    g.fillStyle(COLORS.cyan, 1);
    g.fillRoundedRect(-w / 2, -6, Math.max(12, w * this.value), 12, 6);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(-w / 2 + w * this.value, 0, 16);
  }
  destroy(fromScene) {
    if (this.scene && this.scene.focus) this.scene.focus.remove(this);
    super.destroy(fromScene);
  }
}

export function shake(scene, target, amount = 10) {
  const x0 = target.x;
  scene.tweens.add({
    targets: target,
    x: { from: x0 - amount, to: x0 + amount },
    duration: 50,
    yoyo: true,
    repeat: 3,
    onComplete: () => target.setX(x0)
  });
}

export function cameraShake(scene, duration = 200, intensity = 0.006) {
  if (Settings.get('reducedMotion')) return;
  scene.cameras.main.shake(duration, intensity);
}

// Floating "+1", "Nice!" style text.
export function floatText(scene, x, y, str, color = CSS.green, size = 28) {
  const t = txt(scene, x, y, str, { size, weight: 800, origin: 0.5, color, stroke: '#070b1d', strokeThickness: 6 }).setDepth(DEPTH.toast);
  scene.tweens.add({ targets: t, y: y - 60, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  return t;
}

// A bouncing arrow that points at something (the game's "indicator").
export function pointerArrow(scene, x, y, dir = 'down', color = COLORS.yellow) {
  const g = scene.add.graphics().setDepth(DEPTH.ui + 50);
  g.fillStyle(color, 1);
  g.lineStyle(4, 0x070b1d, 1);
  const pts = {
    down: [[-18, -34], [18, -34], [18, -12], [30, -12], [0, 16], [-30, -12], [-18, -12]],
    up: [[-18, 34], [18, 34], [18, 12], [30, 12], [0, -16], [-30, 12], [-18, 12]],
    left: [[34, -18], [34, 18], [12, 18], [12, 30], [-16, 0], [12, -30], [12, -18]],
    right: [[-34, -18], [-34, 18], [-12, 18], [-12, 30], [16, 0], [-12, -30], [-12, -18]]
  }[dir].map(([a, b]) => ({ x: a, y: b }));
  g.fillPoints(pts, true);
  g.strokePoints(pts, true);
  g.setPosition(x, y);
  const axis = dir === 'down' || dir === 'up' ? 'y' : 'x';
  const sign = dir === 'down' || dir === 'right' ? 1 : -1;
  const bounce = (bx, by) => scene.tweens.add({ targets: g, [axis]: (axis === 'y' ? by : bx) + 12 * sign, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  g._tw = bounce(x, y);
  // Move the arrow to point at something else.
  g.pointTo = (nx, ny) => {
    if (g._tw) g._tw.stop();
    g.setPosition(nx, ny);
    g._tw = bounce(nx, ny);
  };
  return g;
}
