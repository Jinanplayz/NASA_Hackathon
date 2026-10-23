import { W, COLORS, CSS, shuffle } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { playIntro, finishGame, starsFor, draggable, GoalBar, idleHint, bake } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt, fitText } from '../../ui/text.js';
import { toast, shake, RoundBox } from '../../ui/widgets.js';

// The investigation: put the chain of small problems (years apart) in the right order, like a
// comic strip, from the first one to the explosion. Each picture card reads itself out loud when
// it's picked up; drag it to its spot, or tap it to try the next empty spot.
const CW = 224, CH = 220, GAP = 14;
const SLOT_Y = 300, PILE_Y = 566;

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
    this.goal = new GoalBar(this);

    // the empty spots of the story, joined by arrows
    const g = this.add.graphics();
    this.slots = this.cardsCfg.map((c, i) => {
      const x = this.x0 + i * (CW + GAP);
      g.fillStyle(0x0b1230, 0.6);
      g.fillRoundedRect(x - CW / 2, SLOT_Y - CH / 2, CW, CH, 16);
      g.lineStyle(3, 0x3a4a92, 1);
      g.strokeRoundedRect(x - CW / 2, SLOT_Y - CH / 2, CW, CH, 16);
      txt(this, x, SLOT_Y, String(i + 1), { size: 60, weight: 800, color: '#2a3566', origin: 0.5, scale: false });
      if (i < n - 1) {
        g.fillStyle(COLORS.cyan, 0.8);
        const ax = x + CW / 2 + GAP / 2;
        g.fillTriangle(ax - 5, SLOT_Y - 11, ax - 5, SLOT_Y + 11, ax + 7, SLOT_Y);
      }
      return { x, y: SLOT_Y, card: null };
    });
    bake(this, g, this.x0 - CW / 2 - 4, SLOT_Y - CH / 2 - 4, n * (CW + GAP) - GAP + 8, CH + 8);
    txt(this, this.x0 - CW / 2, SLOT_Y - CH / 2 - 26, this.T('firstLabel', 'First'), { size: 18, weight: 800, color: CSS.cyan, scale: false });
    txt(this, this.x0 + (n - 1) * (CW + GAP) + CW / 2, SLOT_Y - CH / 2 - 26, this.T('lastLabel', 'Last'), { size: 18, weight: 800, color: CSS.cyan, origin: [1, 0], scale: false });

    // the shuffled picture cards
    this.cards = shuffle(this.cardsCfg.map((c, i) => ({ ...c, order: i }))).map((c, k) => {
      const card = this.makeCard(c, this.x0 + k * (CW + GAP), PILE_Y);
      draggable(this, card, {
        onGrab: () => this.state === 'play' && Speech.say(c.text),
        onDrop: (x, y) => {
          const slot = this.slots.find((s) => Math.abs(x - s.x) < CW / 2 + GAP && Math.abs(y - s.y) < CH / 2 + 20);
          return slot ? this.place(card, this.slots.indexOf(slot)) : false;
        },
        onTap: () => this.place(card, this.slots.findIndex((s) => !s.card))
      });
      return card;
    });

    // stuck? point at the card that comes next
    idleHint(this, () => {
      if (this.state !== 'play') return null;
      const next = this.slots.findIndex((s) => !s.card);
      const card = this.cards.find((k) => k.enabled && k.cfg.order === next);
      return card ? { x: card.x, y: card.y - CH / 2 - 4 } : null;
    }, { delay: 10000 });

    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'play';
      this.goal.set(this.T('task', { title: 'Put the story in order!', help: 'Drag each picture to its spot, from the first problem to the explosion.' }), { count: this.countText() });
    });
  }

  countText() {
    return `${this.slots.filter((s) => s.card).length} / ${this.slots.length}`;
  }

  makeCard(c, x, y) {
    const card = this.add.container(x, y);
    const g = new RoundBox(this);
    const draw = (stroke, fill = 0x141d42) => g.draw(-CW / 2, -CH / 2, CW, CH, { fill, alpha: 1, radius: 16, stroke, strokeWidth: 3, shadowY: 5 });
    draw(0x2e3f85);
    const pic = img(this, 0, -CH / 2 + 66, c.art, 1.25);
    const t = txt(this, 0, 32, c.text, { size: 17, weight: 600, origin: [0.5, 0], align: 'center', wrap: CW - 22, scale: false, lineSpacing: 2 });
    fitText(t, CW - 22, CH / 2 - 40, 12);
    t.setY(CH / 2 - 14 - t.height);
    card.add([g, pic, t]);
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
      toast(this, this.T('wrongPlace', 'Not quite!'), { y: 676, color: COLORS.orange, sound: false, speak: true, duration: 2400 });
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
    this.goal.setCount(this.countText());
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
