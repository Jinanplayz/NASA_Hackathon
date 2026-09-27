import { W, H, COLORS, CSS, TEX } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { txt, fitText } from '../../ui/text.js';
import { drawPanel, shake, floatText } from '../../ui/widgets.js';
import { starPoints } from '../../ui/icons.js';

// Click around the (lying-down) Saturn V to discover the research behind five parts,
// then rate how hard each was to make. Wrong answers are pointed out straight away.
const CX = 640, CY = 236, S = 2.2;
const PY = 404;

export class ResearchScene extends BaseScene {
  constructor() {
    super('Research');
  }

  create() {
    this.setupStage();
    // (Phaser reuses this screen when it is played again: start from a clean slate)
    this.busy = false;
    this.current = null;
    blueprint(this);
    this.items = this.T('items', []);
    this.cats = this.T('categories', []);
    this.rated = {};
    this.current = null;

    txt(this, CX, 104, this.T('rocketLabel', 'Saturn V (lying on its side, like the real ones in museums)'), { size: 16, color: CSS.dim, origin: 0.5, scale: false });
    this.add.image(CX, CY, 'saturnV').setAngle(90).setScale(S / TEX);

    // hotspots
    this.spots = this.items.map((it) => {
      const x = CX + (250 - it.at) * S;
      const below = String(it.side).startsWith('below');
      const dx = it.side === 'belowFar' ? 92 : it.dx || 0;
      const mx = x + dx, my = below ? CY + 112 : CY - 112;
      const line = this.add.graphics();
      line.lineStyle(2, COLORS.yellow, 0.7);
      line.lineBetween(x, CY + (below ? 20 : -20), mx, my + (below ? -24 : 24));
      line.fillStyle(COLORS.yellow, 1);
      line.fillCircle(x, CY + (below ? 14 : -14), 4);
      const glow = this.add.image(mx, my, 'softDot').setTint(COLORS.yellow).setDisplaySize(90, 90).setAlpha(0.5);
      this.tweens.add({ targets: glow, alpha: 0.15, scale: glow.scale * 1.3, duration: 700, yoyo: true, repeat: -1 });
      const c = this.add.container(mx, my);
      const g = this.add.graphics();
      const label = txt(this, 0, below ? 40 : -40, it.name, { size: 14, weight: 700, origin: 0.5, scale: false, stroke: '#070b1d', strokeThickness: 4, align: 'center', wrap: 150 });
      c.add([g, label]);
      c.setSize(56, 56).setInteractive({ useHandCursor: true });
      Object.assign(c, { item: it, g, glow, enabled: true, activate: () => this.open(it) });
      c.on('pointerup', () => this.open(it));
      this.focus.add(c);
      this.drawSpot(c);
      return c;
    });

    // info panel
    const pg = this.add.graphics();
    drawPanel(pg, 24, PY, 764, H - PY - 14, { fill: COLORS.panel, radius: 20 });
    drawPanel(pg, 800, PY, 456, H - PY - 14, { fill: 0x0e1840, radius: 20 });
    this.title = txt(this, 48, PY + 18, '', { size: 26, weight: 800, color: CSS.yellow, scale: false });
    this.facts = this.add.container(48, PY + 62);
    this.hint = txt(this, 406, PY + 140, this.T('panelHint', ''), { size: 22, color: CSS.dim, origin: 0.5, align: 'center', wrap: 640 });
    this.feedback = txt(this, 48, H - 70, '', { size: 18, weight: 700, wrap: 716, scale: false });
    txt(this, 1028, PY + 24, this.T('chooseLabel', 'How hard was it to make?'), { size: 19, weight: 800, color: CSS.cyan, origin: 0.5, scale: false });
    this.catBtns = this.cats.map((cat, i) => this.makeCatButton(cat, 1028, PY + 92 + i * 88));
    this.setCatsEnabled(false);
    this.progress = txt(this, W - 30, 96, '', { size: 16, weight: 700, color: CSS.dim, origin: [1, 0.5], scale: false });
    this.updateProgress();

    this.guide.sequence(this.T('intro', []), { modal: true });
  }

  drawSpot(c) {
    const r = this.rated[c.item.id];
    const g = c.g;
    g.clear();
    g.fillStyle(0x000000, 0.35);
    g.fillCircle(0, 3, 26);
    const cat = r ? this.cats.find((k) => k.id === r) : null;
    g.fillStyle(r ? COLORS.green : this.current === c.item ? COLORS.cyan : COLORS.yellow, 1);
    g.fillCircle(0, 0, 24);
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeCircle(0, 0, 24);
    if (cat) {
      for (let k = 0; k < cat.stars; k++) {
        g.fillStyle(0x070b1d, 1);
        g.fillPoints(starPoints((k - (cat.stars - 1) / 2) * 13, 0, 7, 3, 5), true);
      }
      c.glow.setVisible(false);
    } else {
      g.fillStyle(0x070b1d, 1);
      g.fillCircle(0, -6, 4);
      g.fillRoundedRect(-3, 0, 6, 12, 2);
    }
  }

  makeCatButton(cat, x, y) {
    const w = 424, h = 78;
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const stars = this.add.graphics();
    for (let k = 0; k < 3; k++) {
      stars.fillStyle(k < cat.stars ? COLORS.yellow : 0x2a3566, 1);
      stars.fillPoints(starPoints(-w / 2 + 30 + k * 26, -8, 11, 5, 5), true);
    }
    const name = txt(this, -w / 2 + 112, -h / 2 + 12, cat.name, { size: 21, weight: 800, scale: false });
    const desc = txt(this, -w / 2 + 112, -h / 2 + 40, cat.desc, { size: 15, color: CSS.dim, wrap: w - 124, scale: false });
    fitText(desc, w - 124, 34, 11);
    c.add([g, stars, name, desc]);
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    Object.assign(c, { cat, g, w, h, enabled: true, activate: () => this.answer(c) });
    c.on('pointerover', () => this.drawCat(c, 'hover'));
    c.on('pointerout', () => this.drawCat(c));
    c.on('pointerup', () => this.answer(c));
    this.focus.add(c);
    this.drawCat(c);
    return c;
  }

  drawCat(c, state = '') {
    const g = c.g;
    const { w, h } = c;
    g.clear();
    const fill = state === 'right' ? 0x14432c : state === 'wrong' ? 0x4a1624 : state === 'hover' && c.enabled ? 0x26357a : COLORS.panel2;
    g.fillStyle(fill, c.enabled ? 1 : 0.5);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    g.lineStyle(state === 'right' || state === 'wrong' ? 4 : 2, state === 'right' ? COLORS.green : state === 'wrong' ? COLORS.red : COLORS.stroke, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
  }

  setCatsEnabled(on) {
    this.catBtns.forEach((b) => {
      b.enabled = on;
      b.setAlpha(on ? 1 : 0.55);
      this.drawCat(b);
    });
  }

  open(it) {
    if (this.busy) return;
    this.current = it;
    Sfx.play('select');
    this.spots.forEach((s) => this.drawSpot(s));
    this.hint.setVisible(false);
    this.title.setText(it.name);
    this.facts.removeAll(true);
    let y = 0;
    it.facts.forEach((f) => {
      const dot = this.add.circle(8, y + 12, 5, COLORS.cyan);
      const t = txt(this, 24, y, f, { size: 19, wrap: 690, lineSpacing: 4 });
      this.facts.add([dot, t]);
      y += t.height + 10;
    });
    this.feedback.setText('');
    const done = !!this.rated[it.id];
    this.setCatsEnabled(!done);
    if (done) {
      const cat = this.cats.find((k) => k.id === this.rated[it.id]);
      this.feedback.setText(`${cat.name}: ${it.explain}`).setColor(CSS.green);
    }
    Speech.say([it.name, ...it.facts, done ? '' : this.T('chooseLabel', '')]);
  }

  answer(btn) {
    const it = this.current;
    if (!it || !btn.enabled || this.busy) return;
    if (btn.cat.id === it.answer) {
      this.busy = true;
      Sfx.play('success');
      this.rated[it.id] = it.answer;
      this.drawCat(btn, 'right');
      this.feedback.setText(`${this.T('rightPrefix', 'Correct!')} ${it.explain}`).setColor(CSS.green);
      Speech.say([this.T('rightPrefix', 'Correct!'), it.explain]);
      const spot = this.spots.find((s) => s.item === it);
      this.drawSpot(spot);
      floatText(this, spot.x, spot.y - 30, '★'.repeat(btn.cat.stars), CSS.yellow, 26);
      this.updateProgress();
      this.time.delayedCall(700, () => {
        this.busy = false;
        this.setCatsEnabled(false);
        if (Object.keys(this.rated).length >= this.items.length) this.finish();
      });
    } else {
      Sfx.play('error');
      this.drawCat(btn, 'wrong');
      shake(this, btn, 6);
      btn.enabled = false;
      btn.setAlpha(0.55);
      const correct = this.cats.find((k) => k.id === it.answer);
      const msg = `${this.T('wrongPrefix', 'Not quite.')} ${it.explain}`;
      this.feedback.setText(msg).setColor(CSS.orange);
      Speech.say([this.T('wrongPrefix', 'Not quite.'), it.explain]);
      // point at the right answer
      const right = this.catBtns.find((b) => b.cat === correct);
      this.tweens.add({ targets: right, scale: 1.05, duration: 180, yoyo: true, repeat: 2 });
    }
  }

  updateProgress() {
    this.progress.setText(`${Object.keys(this.rated).length} / ${this.items.length} ${this.T('ratedLabel', 'rated')}`);
  }

  async finish() {
    Sfx.play('bigSuccess');
    await this.guide.say(this.T('doneLine', ''), { nextLabel: Content.ui('continue', 'Continue') });
    this.done();
  }
}
