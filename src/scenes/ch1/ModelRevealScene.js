import Phaser from 'phaser';
import { W, H, COLORS, CSS, DEPTH, TEX } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Speech } from '../../core/Speech.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { loadThree } from '../../three/loader.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { drawPanel } from '../../ui/widgets.js';

// Shows a finished spacecraft as a big 3D model with its key facts.
const VX = 30, VY = 84, VW = 760, VH = 600;
const PX = 810, PY = 84, PW = 440, PH = 600;

const FALLBACK_ART = { mercuryRedstone: 'mercuryRedstone', explorer1: 'explorer1', saturnV: 'saturnV' };

export class ModelRevealScene extends BaseScene {
  constructor() {
    super('ModelReveal');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 150 });
    const vg = this.add.graphics();
    drawPanel(vg, VX, VY, VW, VH, { fill: 0x0b1230, radius: 22 });
    this.add.image(VX + VW / 2, VY + VH / 2, 'softDot').setDisplaySize(700, 620).setTint(0x3a5bd8).setAlpha(0.3);
    txt(this, VX + VW / 2, VY + VH - 20, Content.ui('dragToSpin', 'Drag to spin · Scroll or pinch to zoom'), { size: 15, color: CSS.dim, origin: 0.5, scale: false });

    this.view = null;
    const here = this.stillHere();
    loadThree().then((ThreeView) => {
      if (!here()) return;
      const view = ThreeView && new ThreeView(this, VX + 8, VY + 8, VW - 16, VH - 44, { autoRotate: 0.35 });
      if (view && view.ok) {
        this.view = view;
        view.setModel(this.T('model', 'mercuryRedstone'));
      } else {
        // no 3D on this device: show the drawing instead
        const key = FALLBACK_ART[this.T('model')] || 'mercuryRedstone';
        const im = this.add.image(VX + VW / 2, VY + VH / 2, key);
        im.setScale(Math.min((VH - 80) / im.height, (VW - 80) / im.width));
      }
    });

    // facts panel
    const pg = this.add.graphics();
    drawPanel(pg, PX, PY, PW, PH, { fill: COLORS.panel, radius: 22, stroke: COLORS.cyan, strokeWidth: 3 });
    const title = txt(this, PX + 28, PY + 28, this.T('title', ''), { size: 34, weight: 800, color: CSS.yellow, wrap: PW - 56 });
    const sub = txt(this, PX + 28, title.y + title.height + 4, this.T('subtitle', ''), { size: 18, color: CSS.cyan, weight: 600, wrap: PW - 56 });
    let y = sub.y + sub.height + 24;
    this.T('stats', []).forEach((s, i) => {
      const row = this.add.graphics();
      row.fillStyle(i % 2 ? 0x18224c : 0x1d2a5c, 1);
      const lbl = txt(this, PX + 44, y + 12, s.label.toUpperCase(), { size: 14, weight: 800, color: CSS.cyan, scale: false });
      const val = txt(this, PX + 44, y + 32, s.value, { size: 20, weight: 600, wrap: PW - 90 });
      const h = 32 + val.height + 12;
      row.fillRoundedRect(PX + 28, y, PW - 56, h, 12);
      lbl.setAlpha(0);
      val.setAlpha(0);
      this.tweens.add({ targets: [lbl, val], alpha: 1, duration: 300, delay: 400 + i * 250 });
      y += h + 10;
    });

    this.continueBtn = new Button(this, PX + PW / 2, PY + PH - 50, {
      width: PW - 60,
      height: 66,
      size: 26,
      label: this.T('continue', Content.ui('continue', 'Continue')),
      icon: 'next',
      variant: 'success',
      onClick: () => this.done()
    });
    this.continueBtn.pulse();

    this.setupInput();
    Sfx.play('bigSuccess');
    Speech.say(this.T('line', ''));
  }

  setupInput() {
    const pinch = { active: false, d: 0 };
    this.input.on('pointerdown', (p) => {
      if (p.worldX > VX && p.worldX < VX + VW && p.worldY > VY && p.worldY < VY + VH) {
        this.dragging = true;
        this.last = { x: p.worldX, y: p.worldY };
        if (this.view) this.view.grab();
      }
    });
    this.input.on('pointermove', (p) => {
      const p1 = this.input.pointer1, p2 = this.input.pointer2;
      if (p1 && p2 && p1.isDown && p2.isDown) {
        const d = Phaser.Math.Distance.Between(p1.worldX, p1.worldY, p2.worldX, p2.worldY);
        if (pinch.active && this.view) this.view.zoomBy(pinch.d / Math.max(10, d));
        pinch.active = true;
        pinch.d = d;
        return;
      }
      pinch.active = false;
      if (this.dragging && p.isDown && this.view) {
        this.view.drag(p.worldX - this.last.x, p.worldY - this.last.y);
        this.last = { x: p.worldX, y: p.worldY };
      }
    });
    this.input.on('pointerup', () => {
      this.dragging = false;
      if (this.view) this.view.release();
    });
    this.input.on('wheel', (p, over, dx, dy) => {
      if (this.view) this.view.zoomBy(dy > 0 ? 1.08 : 0.93);
    });
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-LEFT', () => this.view && this.view.nudge(-30, 0));
      this.input.keyboard.on('keydown-RIGHT', () => this.view && this.view.nudge(30, 0));
      this.input.keyboard.on('keydown-UP', () => this.view && this.view.zoomBy(0.9));
      this.input.keyboard.on('keydown-DOWN', () => this.view && this.view.zoomBy(1.1));
    }
  }

  update(time, delta) {
    if (this.view) this.view.update(delta);
  }

  onShutdown() {
    if (this.view) this.view.destroy();
  }
}
