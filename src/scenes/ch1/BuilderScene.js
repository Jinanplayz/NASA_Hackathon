import { COLORS, CSS, DEPTH, TEX } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { txt, fitText } from '../../ui/text.js';
import { pointerArrow, shake, floatText, roundBox, RoundBox } from '../../ui/widgets.js';
import { drawIcon } from '../../ui/icons.js';

// Pick the parts of Freedom 7 from a box of parts. Only the right parts can be chosen;
// a bouncing arrow guides the player, and wrong parts explain why they don't belong.
const GRID_X = 30, GRID_Y = 84, COLS = 4, CW = 196, CH = 140, GX = 12, GY = 10;
const BX = 872, BY = 84, BW = 378, BH = 616;
// where each build piece sits inside the 60 x 500 Mercury-Redstone stack
const STACK = {
  escapeTower: { y: 0, h: 96, w: 22 },
  parachutePack: { y: 94, h: 22, w: 18 },
  capsule: { y: 112, h: 58, w: 44 },
  heatShield: { y: 164, h: 8, w: 42 },
  retroPack: { y: 168, h: 13, w: 34 },
  redstone: { y: 180, h: 320, w: 60 }
};
const SCALE = 1.04;

export class BuilderScene extends BaseScene {
  constructor() {
    super('Builder');
  }

  create() {
    this.setupStage();
    // (Phaser reuses this screen when it is played again: start from a clean slate)
    this.busy = false;
    this.glowTween = null;
    blueprint(this);
    this.parts = this.T('parts', []);
    this.correct = this.parts.filter((p) => p.correct).sort((a, b) => a.order - b.order);
    this.placed = new Set();
    this.busy = false;

    // build area
    const bg = roundBox(this, BX, BY, BW, BH, { fill: 0x0b1633, radius: 22, stroke: COLORS.cyan });
    txt(this, BX + BW / 2, BY + 24, this.T('buildTitle', 'Freedom 7'), { size: 22, weight: 800, color: CSS.yellow, origin: 0.5, scale: false });
    this.progressText = txt(this, BX + BW / 2, BY + 50, '', { size: 16, color: CSS.dim, origin: 0.5, scale: false });
    this.stackCX = BX + BW / 2;
    this.stackTop = BY + 72;
    // launch pad
    const pad = this.add.graphics();
    const padY = this.stackTop + 500 * SCALE + 4;
    pad.fillStyle(0x5d6676, 1);
    pad.fillRect(this.stackCX - 110, padY, 220, 16);
    pad.fillStyle(0x3a404b, 1);
    pad.fillRect(this.stackCX - 70, padY + 16, 140, 12);
    pad.lineStyle(3, 0xb8452f, 0.8);
    const gx = this.stackCX + 70;
    pad.strokeRect(gx, this.stackTop + 80, 26, padY - this.stackTop - 80);
    for (let y = padY; y > this.stackTop + 90; y -= 22) pad.lineBetween(gx, y, gx + 26, y - 22);

    // ghost slots
    this.ghosts = {};
    this.correct.forEach((p) => {
      const pos = this.slotPos(p.id);
      const ghost = this.add.image(pos.x, pos.y, 'bp_' + p.id).setScale(SCALE / TEX).setTintFill(0x2e4a9a).setAlpha(0.55);
      this.ghosts[p.id] = ghost;
    });
    this.slotGlow = this.add.graphics();

    // catalogue
    this.cards = this.parts.map((p, i) => this.makeCard(p, i));
    this.arrow = pointerArrow(this, 0, 0, 'down').setVisible(false);

    this.updateProgress();
    this.guide.sequence(this.T('intro', []), { modal: true }).then((r) => r !== null && this.pointNext());
  }

  slotPos(id) {
    const s = STACK[id];
    return { x: this.stackCX, y: this.stackTop + (s.y + s.h / 2) * SCALE };
  }

  makeCard(p, i) {
    const col = i % COLS, row = Math.floor(i / COLS);
    const x = GRID_X + col * (CW + GX) + CW / 2;
    const y = GRID_Y + row * (CH + GY) + CH / 2;
    const c = this.add.container(x, y);
    const g = new RoundBox(this);
    const im = this.add.image(0, -14, p.card).setScale(0.8 / TEX);
    const name = txt(this, 0, CH / 2 - 24, p.name, { size: 17, weight: 700, origin: 0.5, align: 'center', wrap: CW - 16, scale: false });
    fitText(name, CW - 12, 40, 12);
    const mark = this.add.graphics();
    c.add([g, im, name, mark]);
    c.setSize(CW, CH).setInteractive({ useHandCursor: true });
    c.part = p;
    c.g = g;
    c.mark = mark;
    c.img = im;
    c.enabled = true;
    c.activate = () => this.pick(c);
    c.on('pointerover', () => !this.placed.has(p.id) && this.drawCard(c, 'hover'));
    c.on('pointerout', () => this.drawCard(c));
    c.on('pointerup', () => this.pick(c));
    this.focus.add(c);
    this.drawCard(c);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 250, delay: 60 * i });
    return c;
  }

  drawCard(c, state = '') {
    const g = c.g;
    const placed = this.placed.has(c.part.id);
    const stroke = placed ? COLORS.green : state === 'wrong' ? COLORS.red : state === 'next' ? COLORS.yellow : COLORS.stroke;
    g.draw(-CW / 2, -CH / 2, CW, CH, {
      fill: placed ? 0x10331f : state === 'hover' ? 0x22306b : COLORS.panel,
      alpha: 1,
      radius: 16,
      stroke,
      strokeWidth: state === 'next' || state === 'wrong' || placed ? 4 : 2,
      shadowY: 4
    });
    c.mark.clear();
    if (placed) {
      c.mark.fillStyle(COLORS.green, 1);
      c.mark.fillCircle(CW / 2 - 20, -CH / 2 + 20, 14);
      drawIcon(c.mark, 'check', CW / 2 - 20, -CH / 2 + 20, 18, COLORS.bg);
      c.img.setAlpha(0.35);
    } else if (state === 'wrong') {
      c.mark.fillStyle(COLORS.red, 1);
      c.mark.fillCircle(CW / 2 - 20, -CH / 2 + 20, 14);
      drawIcon(c.mark, 'close', CW / 2 - 20, -CH / 2 + 20, 16, COLORS.bg);
    }
  }

  nextPart() {
    return this.correct.find((p) => !this.placed.has(p.id));
  }

  pointNext() {
    const nxt = this.nextPart();
    this.slotGlow.clear();
    this.cards.forEach((c) => this.drawCard(c));
    if (!nxt) {
      this.arrow.setVisible(false);
      return;
    }
    const card = this.cards.find((c) => c.part.id === nxt.id);
    this.drawCard(card, 'next');
    this.arrow.setVisible(true).setDepth(DEPTH.ui + 50);
    this.arrow.pointTo(card.x, card.y - CH / 2 - 4);
    // glow on the empty slot
    const pos = this.slotPos(nxt.id);
    const s = STACK[nxt.id];
    this.slotGlow.lineStyle(3, COLORS.yellow, 1);
    this.slotGlow.strokeRoundedRect(pos.x - (s.w * SCALE) / 2 - 8, pos.y - (s.h * SCALE) / 2 - 6, s.w * SCALE + 16, s.h * SCALE + 12, 8);
    if (!this.glowTween) this.glowTween = this.tweens.add({ targets: this.slotGlow, alpha: 0.3, duration: 500, yoyo: true, repeat: -1 });
  }

  pick(c) {
    const p = c.part;
    if (this.busy || this.placed.has(p.id)) return;
    if (!p.correct) {
      Sfx.play('error');
      this.drawCard(c, 'wrong');
      shake(this, c, 8);
      const prefix = this.T('wrongPrefix', 'Not this one!');
      this.guide.say({ text: `${prefix} ${p.why}`, speak: [prefix, p.why] }, { next: false, width: 700 });
      this.time.delayedCall(900, () => this.drawCard(c));
      return;
    }
    this.busy = true;
    this.placed.add(p.id);
    Sfx.play('whoosh');
    const pos = this.slotPos(p.id);
    const piece = this.add.image(c.x, c.y - 16, 'bp_' + p.id).setScale((SCALE * 1.6) / TEX).setDepth(DEPTH.ui + 10);
    this.drawCard(c);
    this.tweens.add({
      targets: piece,
      x: pos.x,
      y: pos.y,
      scale: SCALE / TEX,
      duration: 650,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        Sfx.play('snap');
        this.ghosts[p.id].setVisible(false);
        piece.setDepth(p.id === 'heatShield' ? 3 : p.id === 'retroPack' ? 2 : 1);
        const sparks = this.add.particles(pos.x, pos.y, 'sparkle', { speed: { min: 60, max: 180 }, lifespan: 500, scale: { start: 0.25, end: 0 }, tint: [0xffd166, 0x4fd1ff], quantity: 14, emitting: false });
        sparks.setDepth(DEPTH.ui + 20).explode(14);
        floatText(this, pos.x, pos.y - 30, '+1', CSS.green);
        this.updateProgress();
        this.busy = false;
        if (this.placed.size >= this.correct.length) this.finish();
        else {
          this.guide.say({ text: `${p.name}: ${p.info}`, speak: [p.name, p.info] }, { next: false, width: 700 });
          this.pointNext();
        }
      }
    });
  }

  updateProgress() {
    this.progressText.setText(`${this.placed.size} / ${this.correct.length} ${this.T('progress', 'parts added')}`);
  }

  async finish() {
    this.arrow.setVisible(false);
    this.slotGlow.clear();
    Sfx.play('bigSuccess');
    const glow = this.add.image(this.stackCX, this.stackTop + 260, 'softDot').setTint(COLORS.yellow).setDisplaySize(260, 620).setAlpha(0).setDepth(0.5);
    this.tweens.add({ targets: glow, alpha: 0.6, duration: 500, yoyo: true, repeat: 2 });
    await this.guide.say(this.T('doneLine', ''), { nextLabel: this.T('continue', Content.ui('continue', 'Continue')), width: 700 });
    this.done();
  }
}
