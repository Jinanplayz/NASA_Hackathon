import Phaser from 'phaser';
import { W, H, FULL, COLORS, CSS, DEPTH, seeded, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame } from '../common/kit.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { drawPanel, floatText, toast } from '../../ui/widgets.js';
import { drawIcon } from '../../ui/icons.js';

// The family portrait (February 14, 1990): look around a wide, dark sky and find the six
// planets Voyager 1 photographed - tiny dots, with Earth hidden in a beam of sunlight.
const SKY_W = 2400, SKY_H = 1300;
const PLANETS = {
  neptune: { x: 320, y: 840, r: 3, color: 0x6f9bff },
  uranus: { x: 560, y: 470, r: 3, color: 0xa8f0f0 },
  saturn: { x: 900, y: 720, r: 4, color: 0xe8d6a8 },
  jupiter: { x: 1170, y: 520, r: 5, color: 0xf2e2c6 },
  venus: { x: 1560, y: 590, r: 4, color: 0xffffff },
  earth: { x: 1990, y: 820, r: 3, color: 0x9fd8ff }
};
const SUN = { x: 1760, y: 660 };

export class FamilyPortraitScene extends BaseScene {
  constructor() {
    super('FamilyPortrait');
  }

  create() {
    this.setupStage({ bg: 0x000000 });
    this.state = 'intro';
    this.found = new Set();
    this.taps = 0;
    this.lastFind = 0;
    this.list = this.T('planets', []);
    this.reach = this.relaxed ? 44 : 30;

    // the wide sky (dragged around)
    this.sky = this.add.container(-560, -330);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 1);
    g.fillRect(0, 0, SKY_W, SKY_H);
    const rnd = seeded(31);
    for (let i = 0; i < 700; i++) {
      g.fillStyle(0xffffff, 0.15 + rnd() * 0.5);
      g.fillCircle(rnd() * SKY_W, rnd() * SKY_H, rnd() < 0.05 ? 1.4 : 0.8);
    }
    // beams of sunlight scattered inside the camera
    const beams = this.add.graphics();
    [[1640, 0.06], [1760, 0.1], [1990, 0.08], [2140, 0.05]].forEach(([x, a]) => {
      beams.fillStyle(0xffe9c0, a);
      beams.fillRect(x - 40, 0, 80, SKY_H);
      beams.fillStyle(0xffe9c0, a * 0.8);
      beams.fillRect(x - 14, 0, 28, SKY_H);
    });
    const sun = this.add.image(SUN.x, SUN.y, 'softDot').setDisplaySize(520, 520).setTint(0xfff1c8).setAlpha(0.85);
    const core = this.add.image(SUN.x, SUN.y, 'sun').setDisplaySize(260, 260);
    this.sky.add([g, beams, sun, core]);
    Object.entries(PLANETS).forEach(([, p]) => {
      const d = this.add.graphics();
      d.fillStyle(p.color, 0.35);
      d.fillCircle(p.x, p.y, p.r * 2.4);
      d.fillStyle(p.color, 1);
      d.fillCircle(p.x, p.y, p.r);
      this.sky.add(d);
    });
    this.marks = this.add.graphics();
    this.hintRing = this.add.graphics();
    this.sky.add([this.marks, this.hintRing]);

    // a crosshair in the middle (for keyboard players: arrows move the view, SPACE looks)
    const ch = this.add.graphics().setDepth(DEPTH.ui);
    ch.lineStyle(2, 0xffffff, 0.35);
    ch.strokeCircle(W / 2 - 120, H / 2, 26);

    // the list of planets
    const lg = this.add.graphics().setDepth(DEPTH.ui);
    drawPanel(lg, 1010, 96, 250, 400, { fill: COLORS.panel, radius: 18, stroke: COLORS.cyan, strokeWidth: 3 });
    txt(this, 1135, 116, this.T('listTitle', 'Find the planets'), { size: 18, weight: 800, color: CSS.yellow, origin: [0.5, 0], scale: false }).setDepth(DEPTH.ui);
    this.checks = this.add.graphics().setDepth(DEPTH.ui);
    this.rows = this.list.map((pl, i) => txt(this, 1070, 168 + i * 52, pl.name, { size: 20, weight: 700, scale: false }).setDepth(DEPTH.ui));
    this.drawList();
    this.hintBtn = new Button(this, 1135, 540, { width: 220, height: 60, label: this.T('hintLabel', 'Hint'), icon: 'info', variant: 'secondary', onClick: () => this.hint() }).setDepth(DEPTH.ui);

    // drag to look around; tap to look closer
    this.input.on('pointerdown', (p, over) => {
      if (over.length) return;
      this.drag = { x: p.worldX, y: p.worldY, sx: this.sky.x, sy: this.sky.y, moved: false };
    });
    this.input.on('pointermove', (p) => {
      const d = this.drag;
      if (!d || !p.isDown) return;
      if (Math.hypot(p.worldX - d.x, p.worldY - d.y) > 10) d.moved = true;
      if (d.moved) this.moveSky(d.sx + p.worldX - d.x, d.sy + p.worldY - d.y);
    });
    this.input.on('pointerup', (p) => {
      const d = this.drag;
      this.drag = null;
      if (d && !d.moved) this.look(p.worldX, p.worldY);
    });
    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT');
      this.input.keyboard.on('keydown-SPACE', () => this.look(W / 2 - 120, H / 2));
    }
    playIntro(this).then((ok) => {
      if (ok) {
        this.state = 'play';
        this.lastFind = this.time.now;
      }
    });
  }

  moveSky(x, y) {
    this.sky.x = clamp(x, FULL.x + FULL.w - SKY_W, FULL.x);
    this.sky.y = clamp(y, FULL.y + FULL.h - SKY_H, FULL.y);
  }

  drawList() {
    const g = this.checks;
    g.clear();
    this.list.forEach((pl, i) => {
      const y = 180 + i * 52, done = this.found.has(pl.id);
      g.fillStyle(done ? COLORS.green : 0x2a3566, 1);
      g.fillCircle(1044, y, 13);
      if (done) drawIcon(g, 'check', 1044, y, 16, COLORS.bg);
      this.rows[i].setColor(done ? CSS.green : CSS.text);
    });
  }

  look(x, y) {
    if (this.state !== 'play') return;
    this.taps++;
    const sx = x - this.sky.x, sy = y - this.sky.y;
    const hit = this.list.find((pl) => !this.found.has(pl.id) && PLANETS[pl.id] && Math.hypot(PLANETS[pl.id].x - sx, PLANETS[pl.id].y - sy) < this.reach);
    if (!hit) {
      Sfx.play('click');
      toast(this, this.T('nothing', 'Just stars there.'), { y: 100, sound: false, duration: 1200, size: 18 });
      return;
    }
    const p = PLANETS[hit.id];
    this.found.add(hit.id);
    this.lastFind = this.time.now;
    this.hintRing.clear();
    Sfx.play('success');
    this.marks.lineStyle(2, COLORS.green, 0.9);
    this.marks.strokeCircle(p.x, p.y, 18);
    floatText(this, x, y - 30, hit.name, CSS.green, 24);
    toast(this, hit.fact, { y: 100, sound: false, duration: 2600 });
    Speech.say(hit.fact);
    this.drawList();
    if (this.found.size >= this.list.length) this.win();
  }

  hint() {
    if (this.state !== 'play') return;
    const next = this.list.find((pl) => !this.found.has(pl.id));
    if (!next) return;
    const p = PLANETS[next.id];
    this.hintRing.clear();
    this.hintRing.lineStyle(4, COLORS.yellow, 0.9);
    this.hintRing.strokeCircle(p.x, p.y, 46);
    this.hintRing.setAlpha(1);
    this.tweens.killTweensOf(this.hintRing);
    this.tweens.add({ targets: this.hintRing, alpha: 0.2, duration: 500, yoyo: true, repeat: 5 });
    // glide the view towards it
    this.tweens.add({ targets: this.sky, x: clamp(W / 2 - 120 - p.x, FULL.x + FULL.w - SKY_W, FULL.x), y: clamp(H / 2 - p.y, FULL.y + FULL.h - SKY_H, FULL.y), duration: 700, ease: 'Sine.easeInOut' });
    toast(this, this.T('hint', ''), { y: 100, sound: false, duration: 2000 });
  }

  async win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    // fly over to Earth for the big reveal
    const e = PLANETS.earth;
    this.tweens.add({ targets: this.sky, x: clamp(W / 2 - 120 - e.x, FULL.x + FULL.w - SKY_W, FULL.x), y: clamp(H / 2 - e.y, FULL.y + FULL.h - SKY_H, FULL.y), duration: 1200, ease: 'Sine.easeInOut' });
    await new Promise((r) => this.time.delayedCall(1300, r));
    if (this._leaving) return;
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    finishGame(this, { stars: this.taps <= 12 ? 3 : this.taps <= 24 ? 2 : 1 });
  }

  update(time, delta) {
    if (this.state !== 'play') return;
    const dt = Math.min(0.05, delta / 1000);
    if (this.keys) {
      const k = this.keys, v = 500 * dt;
      this.moveSky(this.sky.x + (k.LEFT.isDown ? v : 0) - (k.RIGHT.isDown ? v : 0), this.sky.y + (k.UP.isDown ? v : 0) - (k.DOWN.isDown ? v : 0));
    }
    // stuck for a while? show a hint by itself
    if (time - this.lastFind > 30000) {
      this.lastFind = time;
      this.hint();
    }
  }
}
