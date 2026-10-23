import { COLORS, CSS, seeded } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame, starsFor, InfoPanel, GoalBar, idleHint } from '../common/kit.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { toast, floatText, roundBox } from '../../ui/widgets.js';

// When a planet passes in front of its star, a little starlight shines through the planet's
// air. Each gas blocks its own colours of light, leaving a pattern of bumps like a barcode.
// Match the bumps to the gases' fingerprints to find out what the air is made of.
const GX = 110, GY = 228, GW = 680, GH = 250;
const MOLS = {
  water: { lines: [0.95, 1.15, 1.4, 1.9, 2.7], color: 0x4fa3ff },
  co2: { lines: [2.0, 2.7, 4.3], color: 0xc9ced8 },
  methane: { lines: [1.7, 2.3, 3.3], color: 0x3ddc97 },
  sodium: { lines: [0.59], color: 0xffd166 }
};
const ORDER = ['water', 'co2', 'methane', 'sodium'];

export class SpectrumScene extends BaseScene {
  constructor() {
    super('Spectrum');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 120 });
    this.state = 'intro';
    this.mistakes = 0;
    this.round = 0;
    this.rounds = this.T('rounds', []);
    this.picked = new Set();

    const pg = roundBox(this, GX - 70, GY - 50, GW + 110, GH + 130, { fill: 0x0b1230, radius: 18, stroke: COLORS.stroke, strokeWidth: 3 });
    this.title = txt(this, GX, GY - 36, '', { size: 20, weight: 800, color: CSS.yellow, scale: false });
    txt(this, GX - 50, GY + GH / 2, this.T('yLabel', 'Light blocked'), { size: 14, weight: 800, color: CSS.dim, origin: 0.5, scale: false }).setAngle(-90);
    txt(this, GX + GW / 2, GY + GH + 50, this.T('xLabel', 'Colour of light (wavelength, in microns)'), { size: 14, weight: 800, color: CSS.dim, origin: 0.5, scale: false });
    this.graph = this.add.graphics();
    this.overlay = this.add.graphics();
    this.ticks = [];

    // the gas cards
    const names = this.T('molecules', {});
    this.cards = ORDER.map((k, i) => {
      const x = 1040, y = 222 + i * 86;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      const t = txt(this, -170, 0, names[k] || k, { size: 19, weight: 800, origin: [0, 0.5], scale: false });
      c.add([g, t]);
      c.setSize(380, 80);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', () => this.toggle(k));
      c.activate = () => this.toggle(k);
      c.key = k;
      c.g = g;
      this.focus.add(c);
      return c;
    });
    this.okBtn = new Button(this, 1040, 604, { width: 300, height: 70, size: 24, label: this.T('checkLabel', "That's it!"), icon: 'check', variant: 'success', onClick: () => this.check() });
    this.info = new InfoPanel(this, 40, 572, 790, 124, { title: '', text: '', size: 17, titleSize: 18 });
    this.info.g.setVisible(false);
    this.goal = new GoalBar(this);
    this.loadRound(0);
    // stuck? point at a gas that belongs (or at "That's it!" once they're picked)
    idleHint(this, () => {
      if (this.state !== 'play') return null;
      const want = (this.rounds[this.round] || {}).gases || [];
      const k = want.find((g) => !this.picked.has(g));
      if (!k) return { x: this.okBtn.x, y: this.okBtn.y - 40 };
      const c = this.cards.find((cc) => cc.key === k);
      return { x: c.x - 120, y: c.y, dir: 'right' };
    }, { delay: 12000 });
    playIntro(this).then((ok) => {
      if (ok) {
        this.state = 'play';
        this.showTask();
      }
    });
  }

  showTask() {
    const rd = this.rounds[this.round] || {};
    this.goal.set({ title: this.T('taskTitle', "Read the planet's air!"), help: rd.intro || '' }, { count: `${this.round + 1} / ${this.rounds.length}`, speak: false });
    Speech.say(rd.intro || '');
  }

  x(um) {
    const r = this.range;
    return GX + ((um - r[0]) / (r[1] - r[0])) * GW;
  }

  loadRound(i) {
    this.round = i;
    const rd = this.rounds[i] || {};
    this.range = rd.range || [0.6, 2.8];
    this.picked.clear();
    this.title.setText(rd.title || '');
    this.info.g.setVisible(false);
    this.info.title.setText('');
    this.info.body.setText('');
    this.drawGraph(rd);
    this.drawCards();
    this.drawOverlay();
  }

  // the measured spectrum: a bump wherever a gas in the planet's air blocks light, plus noise
  drawGraph(rd) {
    const g = this.graph;
    g.clear();
    this.ticks.forEach((t) => t.destroy());
    this.ticks = [];
    g.lineStyle(2, 0x46516b, 1);
    g.strokeRect(GX, GY, GW, GH);
    const [a, b] = this.range;
    const step = b - a > 3 ? 0.5 : 0.25;
    for (let v = Math.ceil(a / step) * step; v <= b + 1e-6; v += step) {
      g.lineBetween(this.x(v), GY + GH, this.x(v), GY + GH + 6);
      this.ticks.push(txt(this, this.x(v), GY + GH + 10, v.toFixed(2).replace(/0$/, ''), { size: 12, color: CSS.dim, origin: [0.5, 0], scale: false }));
    }
    const lines = (rd.gases || []).flatMap((k) => MOLS[k].lines);
    const level = (um) => 0.35 + lines.reduce((s, c) => s + 0.38 * Math.exp(-(((um - c) / ((b - a) * 0.025)) ** 2)), 0);
    const rnd = seeded(50 + i0(rd));
    const pts = [];
    for (let k = 0; k <= 70; k++) {
      const um = a + (k / 70) * (b - a);
      pts.push([this.x(um), GY + GH - Math.min(0.95, level(um) + (rnd() - 0.5) * 0.08) * GH]);
    }
    g.fillStyle(0xffffff, 0.9);
    pts.forEach(([px, py]) => g.fillCircle(px, py, 3));
    g.lineStyle(3, 0x4f8cff, 0.9);
    g.beginPath();
    for (let k = 0; k <= 200; k++) {
      const um = a + (k / 200) * (b - a);
      const px = this.x(um), py = GY + GH - Math.min(0.95, level(um)) * GH;
      if (k === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    }
    g.strokePath();
  }

  drawCards() {
    this.cards.forEach((c) => {
      const on = this.picked.has(c.key);
      const col = MOLS[c.key].color;
      c.g.clear();
      c.g.fillStyle(on ? 0x1b275a : COLORS.panel, 1);
      c.g.fillRoundedRect(-190, -38, 380, 76, 14);
      c.g.lineStyle(on ? 4 : 2, on ? col : COLORS.stroke, 1);
      c.g.strokeRoundedRect(-190, -38, 380, 76, 14);
      // the gas's fingerprint, as a little barcode
      c.g.fillStyle(col, 1);
      MOLS[c.key].lines.forEach((um) => c.g.fillRect(60 + ((um - 0.5) / 4.5) * 110, -20, 4, 40));
    });
  }

  drawOverlay() {
    const g = this.overlay;
    g.clear();
    this.picked.forEach((k) => {
      const m = MOLS[k];
      m.lines.forEach((um) => {
        if (um < this.range[0] || um > this.range[1]) return;
        g.lineStyle(4, m.color, 0.55);
        g.lineBetween(this.x(um), GY + 4, this.x(um), GY + GH - 4);
      });
    });
  }

  toggle(k) {
    if (this.state !== 'play') return;
    if (this.picked.has(k)) this.picked.delete(k);
    else this.picked.add(k);
    Sfx.play('select');
    this.drawCards();
    this.drawOverlay();
  }

  async check() {
    if (this.state !== 'play') return;
    const rd = this.rounds[this.round] || {};
    const want = new Set(rd.gases || []);
    const right = want.size === this.picked.size && [...want].every((k) => this.picked.has(k));
    if (!right) {
      this.mistakes++;
      Sfx.play('error');
      const msg = this.picked.size < want.size ? this.T('needMore', 'Some bumps still have no gas to explain them.') : this.T('lookAgain', "Look again: a gas's lines must sit on top of bumps, and every bump needs a gas.");
      toast(this, msg, { x: 450, y: 520, wrap: 700, color: COLORS.orange, sound: false, speak: true, duration: 2600 });
      return;
    }
    this.state = 'between';
    Sfx.play('bigSuccess');
    floatText(this, GX + GW / 2, GY + 40, '✓', CSS.green, 40);
    this.info.g.setVisible(true);
    this.info.show(rd.title || '', rd.result || '');
    Speech.say(rd.result || '');
    await new Promise((r) => this.time.delayedCall(4200, r));
    if (this._leaving) return;
    if (this.round + 1 < this.rounds.length) {
      this.loadRound(this.round + 1);
      this.state = 'play';
      this.showTask();
      return;
    }
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    finishGame(this, { stars: starsFor(this.mistakes, 1, 3) });
  }
}

// a number for each round, so each spectrum gets its own noise
function i0(rd) {
  return (rd.title || '').length;
}
