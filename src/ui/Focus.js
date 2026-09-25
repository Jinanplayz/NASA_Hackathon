import Phaser from 'phaser';
import { COLORS, DEPTH } from '../core/constants.js';

// Keyboard access for every button: TAB / SHIFT+TAB moves a yellow focus ring,
// ENTER presses the focused button. Mouse and touch players never see the ring.
export class FocusManager {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.current = null;
    this.showing = false;
    this.trap = null;
    this.ring = scene.add.graphics().setDepth(DEPTH.focus);
    const kb = scene.input.keyboard;
    if (kb) {
      kb.addCapture('TAB');
      kb.on('keydown-TAB', (e) => this.move(e.shiftKey ? -1 : 1));
      kb.on('keydown-ENTER', () => this.activate());
    }
    scene.input.on('pointerdown', () => this.hideRing());
    scene.events.on('postupdate', this.draw, this);
    scene.events.once('shutdown', () => {
      scene.events.off('postupdate', this.draw, this);
      this.items = [];
    });
  }

  add(item) {
    if (!this.items.includes(item)) this.items.push(item);
  }

  remove(item) {
    this.items = this.items.filter((i) => i !== item);
    if (this.current === item) this.current = null;
  }

  // Only let focus move among items accepted by fn (used by pop-up dialogs).
  setTrap(fn) {
    this.trap = fn;
    this.current = null;
  }

  clearTrap() {
    this.trap = null;
  }

  isShown(obj) {
    let o = obj;
    while (o) {
      if (!o.visible || !o.active || o.alpha === 0) return false;
      o = o.parentContainer;
    }
    return true;
  }

  // Containers report the bounds of their children, which is too small for our
  // buttons, so use the container's own size instead.
  boundsOf(item) {
    if (item.type === 'Container' && item.width && item.height) {
      const m = item.getWorldTransformMatrix();
      const w = item.width * Math.abs(m.scaleX), h = item.height * Math.abs(m.scaleY);
      return new Phaser.Geom.Rectangle(m.tx - w / 2, m.ty - h / 2, w, h);
    }
    return item.getBounds();
  }

  candidates() {
    return this.items
      .filter((i) => i.enabled !== false && this.isShown(i) && (!this.trap || this.trap(i)))
      .sort((a, b) => {
        const ba = this.boundsOf(a), bb = this.boundsOf(b);
        if (Math.abs(ba.centerY - bb.centerY) > 30) return ba.centerY - bb.centerY;
        return ba.centerX - bb.centerX;
      });
  }

  move(dir) {
    const list = this.candidates();
    if (!list.length) return;
    let i = list.indexOf(this.current);
    i = i < 0 ? (dir > 0 ? 0 : list.length - 1) : (i + dir + list.length) % list.length;
    this.current = list[i];
    this.showing = true;
    if (this.current.onFocus) this.current.onFocus();
  }

  activate() {
    if (!this.showing || !this.current) return;
    if (this.candidates().includes(this.current) && this.current.activate) this.current.activate();
  }

  focus(item) {
    this.current = item;
  }

  hideRing() {
    this.showing = false;
    this.ring.clear();
    this.ringAt = null;
  }

  // Runs every frame, but only redraws the ring when it has to move or disappear.
  draw() {
    if (!this.showing || !this.current || !this.isShown(this.current)) {
      if (this.ringAt) this.hideRing();
      return;
    }
    const b = this.boundsOf(this.current);
    const at = `${Math.round(b.x)},${Math.round(b.y)},${Math.round(b.width)},${Math.round(b.height)}`;
    if (at === this.ringAt) return;
    this.ringAt = at;
    this.ring.clear();
    this.ring.lineStyle(4, COLORS.yellow, 1);
    this.ring.strokeRoundedRect(b.x - 6, b.y - 6, b.width + 12, b.height + 12, 14);
  }
}
