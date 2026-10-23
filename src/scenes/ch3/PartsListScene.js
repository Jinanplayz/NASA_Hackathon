import { COLORS, CSS, TEX } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { txt, fitText } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { shake, roundBox, RoundBox } from '../../ui/widgets.js';
import { drawIcon } from '../../ui/icons.js';

// Match the Apollo 11 checklist. Any part can be picked, but the rocket only
// "passes" when exactly the right parts are chosen; wrong ones explain why they'd fail.
const LX = 24, LY = 84, LW = 330, LH = 616;
const GX = 372, GY = 86, COLS = 5, CW = 168, CH = 132, GAPX = 9, GAPY = 8;

export class PartsListScene extends BaseScene {
  constructor() {
    super('PartsList');
  }

  create() {
    this.setupStage();
    // (Phaser reuses this screen when it is played again: start from a clean slate)
    this.checking = false;
    blueprint(this);
    this.parts = this.T('parts', []);
    this.correct = this.parts.filter((p) => p.correct);
    this.selected = new Set();

    // checklist
    const lg = roundBox(this, LX, LY, LW, LH, { fill: 0x0e1840, radius: 22, stroke: COLORS.cyan });
    txt(this, LX + 22, LY + 18, this.T('listTitle', 'Mission checklist'), { size: 24, weight: 800, color: CSS.yellow, scale: false });
    txt(this, LX + 22, LY + 52, this.T('listHint', 'Find these parts:'), { size: 15, color: CSS.dim, scale: false });
    this.listRows = this.correct.map((p, i) => {
      const y = LY + 92 + i * 52;
      const box = this.add.existing(new RoundBox(this));
      const tick = this.add.graphics();
      const t = txt(this, LX + 64, y, p.name, { size: 18, weight: 600, wrap: LW - 84, scale: false });
      fitText(t, LW - 84, 44, 13);
      t.setY(y + 18 - t.height / 2);
      return { p, box, tick, t, y };
    });
    this.drawList();

    // parts grid
    this.cards = this.parts.map((p, i) => this.makeCard(p, i));

    this.checkBtn = new Button(this, 1110, 612, {
      width: 270,
      height: 66,
      size: 22,
      label: this.T('checkLabel', 'Check my rocket'),
      icon: 'check',
      variant: 'success',
      onClick: () => this.check()
    });
    this.countText = txt(this, 830, 612, '', { size: 18, weight: 700, origin: [1, 0.5], scale: false, color: CSS.dim });
    this.updateCount();

    this.guide.sequence(this.T('intro', []), { modal: true, width: 800 });
  }

  makeCard(p, i) {
    const col = i % COLS, row = Math.floor(i / COLS);
    const x = GX + col * (CW + GAPX) + CW / 2;
    const y = GY + row * (CH + GAPY) + CH / 2;
    const c = this.add.container(x, y);
    const g = new RoundBox(this);
    const im = this.add.image(0, -14, p.card).setScale(0.7 / TEX);
    const name = txt(this, 0, CH / 2 - 22, p.name, { size: 15, weight: 700, origin: 0.5, align: 'center', wrap: CW - 12, scale: false });
    fitText(name, CW - 10, 38, 11);
    const mark = this.add.graphics();
    c.add([g, im, name, mark]);
    c.setSize(CW, CH).setInteractive({ useHandCursor: true });
    Object.assign(c, { part: p, g, mark, enabled: true, activate: () => this.toggle(c) });
    c.on('pointerup', () => this.toggle(c));
    c.on('pointerover', () => this.drawCard(c, true));
    c.on('pointerout', () => this.drawCard(c, false));
    this.focus.add(c);
    this.drawCard(c);
    return c;
  }

  drawCard(c, hover = false, state = '') {
    const sel = this.selected.has(c.part.id);
    const g = c.g;
    g.draw(-CW / 2, -CH / 2, CW, CH, {
      fill: state === 'wrong' ? 0x3a1420 : sel ? 0x1b3a6b : hover ? 0x22306b : COLORS.panel,
      alpha: 1,
      radius: 14,
      stroke: state === 'wrong' ? COLORS.red : sel ? COLORS.cyan : COLORS.stroke,
      strokeWidth: sel || state ? 4 : 2,
      shadowY: 4
    });
    c.mark.clear();
    if (state === 'wrong') {
      c.mark.fillStyle(COLORS.red, 1);
      c.mark.fillCircle(CW / 2 - 18, -CH / 2 + 18, 13);
      drawIcon(c.mark, 'close', CW / 2 - 18, -CH / 2 + 18, 14, COLORS.bg);
    } else if (sel) {
      c.mark.fillStyle(COLORS.cyan, 1);
      c.mark.fillCircle(CW / 2 - 18, -CH / 2 + 18, 13);
      drawIcon(c.mark, 'check', CW / 2 - 18, -CH / 2 + 18, 16, COLORS.bg);
    }
  }

  drawList() {
    this.listRows.forEach((r) => {
      const on = this.selected.has(r.p.id);
      r.box.draw(LX + 22, r.y + 4, 30, 30, { fill: on ? COLORS.green : 0x1b275a, alpha: 1, radius: 8, stroke: on ? COLORS.green : COLORS.stroke, shadow: false });
      r.tick.clear();
      if (on) drawIcon(r.tick, 'check', LX + 37, r.y + 19, 20, COLORS.bg);
      r.t.setColor(on ? CSS.green : CSS.text);
    });
  }

  toggle(c) {
    const id = c.part.id;
    if (this.selected.has(id)) {
      this.selected.delete(id);
      Sfx.play('click');
    } else {
      this.selected.add(id);
      Sfx.play('select');
      this.tweens.add({ targets: c, scale: 1.06, duration: 100, yoyo: true });
    }
    this.drawCard(c);
    this.drawList();
    this.updateCount();
  }

  updateCount() {
    this.countText.setText(`${this.selected.size} ${this.T('selectedLabel', 'parts chosen')}`);
  }

  async check() {
    if (this.checking) return;
    this.checking = true;
    const wrong = this.parts.filter((p) => !p.correct && this.selected.has(p.id));
    const missing = this.correct.filter((p) => !this.selected.has(p.id));
    if (wrong.length) {
      Sfx.play('error');
      wrong.forEach((p) => {
        const c = this.cards.find((k) => k.part.id === p.id);
        this.drawCard(c, false, 'wrong');
        shake(this, c, 6);
      });
      const lines = [this.T('wrongIntro', 'These parts would make the mission fail:')].concat(wrong.map((p) => ({ text: `${p.name}: ${p.why}`, speak: [p.name, p.why] })));
      await this.guide.sequence(lines, { width: 820 });
      wrong.forEach((p) => {
        const c = this.cards.find((k) => k.part.id === p.id);
        this.drawCard(c);
      });
    } else if (missing.length) {
      Sfx.play('error');
      missing.forEach((p) => {
        const row = this.listRows.find((r) => r.p.id === p.id);
        this.tweens.add({ targets: row.t, alpha: 0.2, duration: 150, yoyo: true, repeat: 3 });
      });
      const missingText = this.T('missingText', 'You still need:');
      await this.guide.say({ text: `${missingText} ${missing.map((p) => p.name).join(', ')}.`, speak: [missingText, ...missing.map((p) => p.name)] }, { width: 820 });
    } else {
      Sfx.play('bigSuccess');
      this.cards.forEach((c) => c.disableInteractive());
      for (const p of this.correct) {
        const c = this.cards.find((k) => k.part.id === p.id);
        this.tweens.add({ targets: c, scale: 1.08, duration: 160, yoyo: true });
      }
      await this.guide.say(this.T('doneLine', ''), { nextLabel: this.T('continue', Content.ui('continue', 'Continue')), width: 820 });
      this.done();
      return;
    }
    this.checking = false;
  }
}
