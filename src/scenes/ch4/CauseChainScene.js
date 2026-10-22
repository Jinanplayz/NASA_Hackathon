import { W, COLORS, CSS, DEPTH, shuffle } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { playIntro, finishGame, starsFor, draggable } from '../common/kit.js';
import { txt, fitText } from '../../ui/text.js';
import { toast, shake } from '../../ui/widgets.js';

// The investigation: put the chain of small problems (years apart) in the right order,
// from the first one to the explosion. Tap a card to put it in the next empty spot,
// or drag it to a spot.
const CW = 164, CH = 196, GAP = 8;
const SLOT_Y = 230, PILE_Y = 500;

export class CauseChainScene extends BaseScene {
  constructor() {
    super('CauseChain');
  }

  create() {
    this.setupStage();
    blueprint(this);
    this.state = 'intro';
    this.mistakes = 0;
    this.cardsCfg = this.T('cards', []);
    const n = this.cardsCfg.length;
    this.x0 = W / 2 - (n * CW + (n - 1) * GAP) / 2 + CW / 2;

    txt(this, W / 2, 104, this.T('chainTitle', 'What happened, in order'), { size: 22, weight: 800, color: CSS.yellow, origin: 0.5, scale: false });
    txt(this, W / 2, PILE_Y - CH / 2 - 26, this.T('pileTitle', 'Clues'), { size: 18, weight: 800, color: CSS.cyan, origin: 0.5, scale: false });

    // the empty spots, joined by arrows
    const g = this.add.graphics();
    this.slots = this.cardsCfg.map((c, i) => {
      const x = this.x0 + i * (CW + GAP);
      g.lineStyle(3, 0x3a4a92, 1);
      g.strokeRoundedRect(x - CW / 2, SLOT_Y - CH / 2, CW, CH, 14);
      g.fillStyle(0x0b1230, 0.6);
      g.fillRoundedRect(x - CW / 2, SLOT_Y - CH / 2, CW, CH, 14);
      txt(this, x, SLOT_Y, String(i + 1), { size: 46, weight: 800, color: '#2a3566', origin: 0.5, scale: false });
      if (i < n - 1) {
        g.fillStyle(COLORS.cyan, 0.6);
        const ax = x + CW / 2 + GAP / 2;
        g.fillTriangle(ax - 4, SLOT_Y - 9, ax - 4, SLOT_Y + 9, ax + 6, SLOT_Y);
      }
      return { x, y: SLOT_Y, card: null };
    });

    // the shuffled clue cards
    this.cards = shuffle(this.cardsCfg.map((c, i) => ({ ...c, order: i }))).map((c, k) => {
      const card = this.makeCard(c, this.x0 + k * (CW + GAP), PILE_Y);
      draggable(this, card, {
        onDrop: (x, y) => {
          const slot = this.slots.find((s) => Math.abs(x - s.x) < CW / 2 + GAP && Math.abs(y - s.y) < CH / 2);
          return slot ? this.place(card, this.slots.indexOf(slot)) : false;
        },
        onTap: () => this.place(card, this.slots.findIndex((s) => !s.card))
      });
      return card;
    });

    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  makeCard(c, x, y) {
    const card = this.add.container(x, y);
    const g = this.add.graphics();
    const draw = (stroke, fill = 0x141d42) => {
      g.clear();
      g.fillStyle(0x000000, 0.3);
      g.fillRoundedRect(-CW / 2, -CH / 2 + 5, CW, CH, 14);
      g.fillStyle(fill, 1);
      g.fillRoundedRect(-CW / 2, -CH / 2, CW, CH, 14);
      g.lineStyle(3, stroke, 1);
      g.strokeRoundedRect(-CW / 2, -CH / 2, CW, CH, 14);
    };
    draw(0x2e3f85);
    const t = txt(this, 0, 0, c.text, { size: 15, origin: 0.5, align: 'center', wrap: CW - 18, scale: false, lineSpacing: 3 });
    fitText(t, CW - 18, CH - 18, 10);
    card.add([g, t]);
    card.setSize(CW, CH);
    card.cfg = c;
    card.draw = draw;
    return card;
  }

  place(card, slotIndex) {
    if (this.state !== 'play' || slotIndex < 0) return false;
    const slot = this.slots[slotIndex];
    if (!slot || slot.card) return false;
    if (card.cfg.order !== slotIndex) {
      this.mistakes++;
      Sfx.play('error');
      shake(this, card, 8);
      toast(this, this.T('wrongPlace', 'Not quite!'), { y: 660, color: COLORS.orange, sound: false, speak: true, duration: 2400 });
      card.goHome();
      return true;
    }
    slot.card = card;
    card.enabled = false;
    card.disableInteractive();
    this.focus.remove(card);
    card.draw(COLORS.green, 0x123a2c);
    Sfx.play('snap');
    this.tweens.add({ targets: card, x: slot.x, y: slot.y, duration: 260, ease: 'Back.easeOut' });
    Speech.say(card.cfg.text);
    if (this.slots.every((s) => s.card)) this.win();
    return true;
  }

  async win() {
    this.state = 'won';
    this.time.delayedCall(400, () => Sfx.play('bigSuccess'));
    // the chain lights up, link by link
    this.slots.forEach((s, i) => this.time.delayedCall(i * 160, () => {
      this.tweens.add({ targets: s.card, scale: 1.06, duration: 140, yoyo: true });
      Sfx.play('tick');
    }));
    await new Promise((r) => this.time.delayedCall(this.slots.length * 160 + 400, r));
    if (this._leaving) return;
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'bottom' });
    if (r === null) return;
    finishGame(this, { stars: starsFor(this.mistakes, 1, 3) });
  }
}
