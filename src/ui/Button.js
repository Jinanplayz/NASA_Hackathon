import Phaser from 'phaser';
import { COLORS, CSS } from '../core/constants.js';
import { Sfx } from '../core/Sfx.js';
import { txt } from './text.js';
import { drawIcon } from './icons.js';

const VARIANTS = {
  primary: { fill: COLORS.cyan, hover: 0x7fe0ff, text: CSS.dark, icon: COLORS.bg, stroke: null },
  success: { fill: COLORS.green, hover: 0x6ff0b6, text: CSS.dark, icon: COLORS.bg, stroke: null },
  warn: { fill: COLORS.orange, hover: 0xffb877, text: CSS.dark, icon: COLORS.bg, stroke: null },
  danger: { fill: COLORS.red, hover: 0xff9090, text: CSS.dark, icon: COLORS.bg, stroke: null },
  secondary: { fill: COLORS.panel2, hover: 0x26357a, text: CSS.text, icon: COLORS.white, stroke: COLORS.stroke },
  ghost: { fill: 0x0b1230, hover: 0x18214d, text: CSS.text, icon: COLORS.white, stroke: 0x3a4a92, fillAlpha: 0.75 }
};

export class Button extends Phaser.GameObjects.Container {
  constructor(scene, x, y, opts = {}) {
    super(scene, x, y);
    this.opts = {
      width: 220,
      height: 64,
      label: '',
      icon: null,
      iconSize: 26,
      variant: 'primary',
      size: 24,
      radius: 18,
      onClick: null,
      sound: 'click',
      focus: true,
      ...opts
    };
    const o = this.opts;
    this.enabled = true;
    this.pressed = false;
    this.hovered = false;

    this.bg = scene.add.graphics();
    this.add(this.bg);
    this.iconG = scene.add.graphics();
    this.add(this.iconG);
    this.labelText = txt(scene, 0, 0, o.label, { size: o.size, weight: 700, origin: 0.5, scale: o.scaleText ?? false, align: 'center' });
    this.add(this.labelText);

    this.setSize(o.width, o.height);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerover', () => {
      if (!this.enabled) return;
      this.hovered = true;
      this.redraw();
    });
    this.on('pointerout', () => {
      this.hovered = false;
      this.pressed = false;
      this.redraw();
      this.setScale(1);
    });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.pressed = true;
      this.setScale(0.96);
    });
    this.on('pointerup', () => {
      const was = this.pressed;
      this.pressed = false;
      this.setScale(1);
      if (was) this.activate();
    });

    this.redraw();
    scene.add.existing(this);
    if (o.focus && scene.focus) scene.focus.add(this);
  }

  redraw() {
    const o = this.opts;
    const v = VARIANTS[o.variant] || VARIANTS.primary;
    const w = o.width, h = o.height;
    const fill = o.color ?? (this.hovered ? v.hover : v.fill);
    this.bg.clear();
    const a = this.enabled ? 1 : 0.4;
    // soft shadow
    this.bg.fillStyle(0x000000, 0.25 * a);
    this.bg.fillRoundedRect(-w / 2, -h / 2 + 4, w, h, o.radius);
    this.bg.fillStyle(fill, (v.fillAlpha ?? 1) * a);
    this.bg.fillRoundedRect(-w / 2, -h / 2, w, h, o.radius);
    // top highlight
    this.bg.fillStyle(0xffffff, 0.12 * a);
    this.bg.fillRoundedRect(-w / 2 + 4, -h / 2 + 3, w - 8, h * 0.42, { tl: o.radius - 4, tr: o.radius - 4, bl: 6, br: 6 });
    if (v.stroke || o.stroke) {
      this.bg.lineStyle(2, o.stroke ?? v.stroke, a);
      this.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, o.radius);
    }
    this.iconG.clear();
    const hasLabel = !!o.label;
    if (o.icon) {
      const iconColor = o.iconColor ?? v.icon;
      const ix = hasLabel ? -w / 2 + 18 + o.iconSize / 2 : 0;
      drawIcon(this.iconG, o.icon, ix, 0, o.iconSize, iconColor, a);
      this.labelText.setX(hasLabel ? (o.iconSize + 10) / 2 : 0);
    } else {
      this.labelText.setX(0);
    }
    // changing a text's colour or size redraws it, so only do it when something changed
    const color = o.textColor ?? v.text;
    if (this.labelText.style.color !== color) this.labelText.setColor(color);
    this.labelText.setAlpha(a);
    this.fitLabel();
  }

  // shrink long labels so they never spill out of the button
  fitLabel() {
    const o = this.opts;
    const key = `${o.label}|${o.width}|${o.size}|${o.icon ? o.iconSize : 0}`;
    if (key === this._fitted) return;
    this._fitted = key;
    const room = o.width - (o.icon && o.label ? o.iconSize + 44 : 28);
    let size = o.size;
    this.labelText.setFontSize(size);
    while (this.labelText.width > room && size > 12) {
      size -= 1;
      this.labelText.setFontSize(size);
    }
  }

  activate() {
    if (!this.enabled || !this.visible) return;
    if (this.opts.sound) Sfx.play(this.opts.sound);
    if (this.opts.onClick) this.opts.onClick(this);
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.input) this.input.cursor = on ? 'pointer' : 'default';
    this.redraw();
    return this;
  }

  setLabel(label) {
    this.opts.label = label;
    this.labelText.setText(label);
    this.redraw();
    return this;
  }

  setVariant(variant) {
    this.opts.variant = variant;
    this.redraw();
    return this;
  }

  setIcon(icon) {
    this.opts.icon = icon;
    this.redraw();
    return this;
  }

  pulse() {
    if (this._pulse) return this;
    this._pulse = this.scene.tweens.add({ targets: this, scale: 1.06, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    return this;
  }

  stopPulse() {
    if (this._pulse) {
      this._pulse.stop();
      this._pulse = null;
      this.setScale(1);
    }
    return this;
  }

  destroy(fromScene) {
    if (this.scene && this.scene.focus) this.scene.focus.remove(this);
    super.destroy(fromScene);
  }
}

export function iconButton(scene, x, y, icon, onClick, opts = {}) {
  return new Button(scene, x, y, { width: 58, height: 58, icon, iconSize: 26, variant: 'ghost', radius: 16, onClick, ...opts });
}
