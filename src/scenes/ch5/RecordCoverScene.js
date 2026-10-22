import Phaser from 'phaser';
import { COLORS, CSS, DEPTH, shuffle, seeded } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame, starsFor, draggable } from '../common/kit.js';
import { txt, fitText } from '../../ui/text.js';
import { toast, shake } from '../../ui/widgets.js';

// The Golden Record's cover: four science drawings explain how to play the record and where
// it came from. Match each meaning card to its drawing (drag it, or tap a card then a drawing).
const COVER = { x: 70, y: 112, s: 500 };
const LAYOUT = { play: [0, 0], pictures: [1, 0], map: [0, 1], clock: [1, 1] };

export class RecordCoverScene extends BaseScene {
  constructor() {
    super('RecordCover');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 120 });
    this.state = 'intro';
    this.mistakes = 0;
    this.selected = null;
    this.parts = this.T('parts', []);

    // the gold cover with its four drawings
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(COVER.x + 6, COVER.y + 10, COVER.s, COVER.s, 18);
    g.fillGradientStyle(0xc9963c, 0xe8c27a, 0xa8742e, 0xd8ad52, 1);
    g.fillRoundedRect(COVER.x, COVER.y, COVER.s, COVER.s, 18);
    txt(this, COVER.x + COVER.s / 2, COVER.y - 24, this.T('coverTitle', ''), { size: 18, weight: 800, color: CSS.yellow, origin: 0.5, scale: false });
    const q = COVER.s / 2;
    this.zones = {};
    Object.entries(LAYOUT).forEach(([id, [cx, cy]]) => {
      const x = COVER.x + cx * q + q / 2, y = COVER.y + cy * q + q / 2;
      const d = this.add.graphics();
      this.drawDiagram(d, id, x, y, q * 0.8);
      const ring = this.add.graphics();
      const zone = this.add.zone(x, y, q - 10, q - 10).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.selected && this.match(this.selected, id));
      const tag = txt(this, x, y + q / 2 - 22, '', { size: 14, weight: 800, color: '#3a2508', origin: 0.5, align: 'center', wrap: q - 20, scale: false });
      this.zones[id] = { x, y, ring, done: false, tag };
    });

    // the meaning cards, in a mixed-up order
    this.cards = shuffle(this.parts).map((p, k) => {
      const c = this.card(p, 900, 190 + k * 122);
      draggable(this, c, {
        onDrop: (x, y) => {
          const z = Object.entries(this.zones).find(([, zz]) => Math.abs(x - zz.x) < q / 2 && Math.abs(y - zz.y) < q / 2);
          return z ? this.match(c, z[0]) : false;
        },
        onTap: () => this.select(c)
      });
      return c;
    });
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  // simple versions of the real drawings, in white lines like the engraving
  drawDiagram(g, id, x, y, s) {
    g.lineStyle(3, 0xfff8e0, 0.95);
    g.fillStyle(0xfff8e0, 0.95);
    if (id === 'play') {
      g.strokeCircle(x - s * 0.08, y - s * 0.08, s * 0.32);
      g.strokeCircle(x - s * 0.08, y - s * 0.08, s * 0.06);
      g.lineBetween(x + s * 0.34, y - s * 0.38, x + s * 0.02, y + s * 0.06);
      g.fillRect(x - s * 0.02, y + s * 0.02, s * 0.1, s * 0.06);
      // side view of the record and the needle
      g.strokeRect(x - s * 0.4, y + s * 0.34, s * 0.64, s * 0.04);
      g.lineBetween(x + s * 0.1, y + s * 0.3, x + s * 0.3, y + s * 0.22);
      for (let i = 0; i < 6; i++) g.fillRect(x - s * 0.4 + i * s * 0.07, y - s * 0.44, s * 0.04, i % 2 ? s * 0.06 : s * 0.03);
    } else if (id === 'pictures') {
      const pts = [];
      for (let i = 0; i <= 24; i++) pts.push(new Phaser.Math.Vector2(x - s * 0.42 + (i / 24) * s * 0.84, y - s * 0.3 + (i % 2 ? -1 : 1) * s * 0.05 * (1 + (i % 3))));
      g.strokePoints(pts, false);
      for (let r = 0; r < 4; r++) g.lineBetween(x - s * 0.25, y + r * s * 0.08, x + s * 0.25, y + r * s * 0.08 + s * 0.02);
      g.strokeRect(x - s * 0.18, y - s * 0.12, s * 0.36, s * 0.36);
      g.strokeCircle(x, y + s * 0.06, s * 0.08);
    } else if (id === 'map') {
      const rnd = seeded(14);
      for (let i = 0; i < 14; i++) {
        const a = rnd() * Math.PI * 2, l = s * (0.15 + rnd() * 0.32);
        g.lineBetween(x, y, x + Math.cos(a) * l, y + Math.sin(a) * l);
        g.lineBetween(x + Math.cos(a) * l * 0.7 - Math.sin(a) * 4, y + Math.sin(a) * l * 0.7 + Math.cos(a) * 4, x + Math.cos(a) * l * 0.7 + Math.sin(a) * 4, y + Math.sin(a) * l * 0.7 - Math.cos(a) * 4);
      }
      g.fillCircle(x, y, 5);
    } else {
      // two hydrogen atoms joined by a line
      [[-0.2, 0], [0.2, 0]].forEach(([dx]) => {
        g.strokeCircle(x + dx * s, y - s * 0.05, s * 0.13);
        g.fillCircle(x + dx * s, y - s * 0.05, 4);
        g.fillCircle(x + dx * s + s * 0.13, y - s * 0.05, 4);
      });
      g.lineBetween(x - s * 0.07, y - s * 0.05, x + s * 0.07, y - s * 0.05);
      g.lineBetween(x - s * 0.2, y + s * 0.12, x + s * 0.2, y + s * 0.12);
      g.lineBetween(x - s * 0.2, y + s * 0.09, x - s * 0.2, y + s * 0.15);
      g.lineBetween(x + s * 0.2, y + s * 0.09, x + s * 0.2, y + s * 0.15);
    }
  }

  card(p, x, y) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const draw = (stroke, fill = COLORS.panel) => {
      g.clear();
      g.fillStyle(fill, 1);
      g.fillRoundedRect(-200, -48, 400, 96, 16);
      g.lineStyle(3, stroke, 1);
      g.strokeRoundedRect(-200, -48, 400, 96, 16);
    };
    draw(COLORS.stroke);
    const t = txt(this, 0, 0, p.name, { size: 22, weight: 800, origin: 0.5, align: 'center', wrap: 370, scale: false });
    fitText(t, 370, 84, 14);
    c.add([g, t]);
    c.setSize(400, 96);
    c.part = p;
    c.draw = draw;
    return c;
  }

  select(c) {
    if (this.state !== 'play' || !c.enabled) return;
    if (this.selected && this.selected !== c) this.selected.draw(COLORS.stroke);
    this.selected = c;
    c.draw(COLORS.yellow, 0x2a2410);
    Sfx.play('select');
    Object.values(this.zones).forEach((z) => {
      z.ring.clear();
      if (z.done) return;
      z.ring.lineStyle(4, COLORS.yellow, 0.8);
      z.ring.strokeRoundedRect(z.x - 118, z.y - 118, 236, 236, 14);
    });
  }

  match(c, id) {
    if (this.state !== 'play' || !c.enabled) return false;
    const z = this.zones[id];
    if (!z || z.done) return false;
    Object.values(this.zones).forEach((zz) => zz.ring.clear());
    if (c.part.id !== id) {
      this.mistakes++;
      Sfx.play('error');
      shake(this, c, 8);
      toast(this, this.T('wrong', 'Not that one!'), { y: 660, color: COLORS.orange, sound: false, speak: true, duration: 2400 });
      c.draw(COLORS.stroke);
      this.selected = null;
      c.goHome();
      return true;
    }
    z.done = true;
    c.enabled = false;
    c.disableInteractive();
    this.focus.remove(c);
    this.selected = null;
    Sfx.play('snap');
    z.tag.setText(c.part.name);
    z.ring.lineStyle(4, COLORS.green, 1);
    z.ring.strokeRoundedRect(z.x - 118, z.y - 118, 236, 236, 14);
    c.draw(COLORS.green, 0x123a2c);
    this.tweens.add({ targets: c, alpha: 0.5, duration: 300 });
    toast(this, c.part.info, { y: 660, sound: false, duration: 4200 });
    Speech.say([c.part.name, c.part.info]);
    if (Object.values(this.zones).every((zz) => zz.done)) this.win();
    return true;
  }

  async win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    await new Promise((r) => this.time.delayedCall(1200, r));
    if (this._leaving) return;
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    finishGame(this, { stars: starsFor(this.mistakes, 0, 2) });
  }
}
