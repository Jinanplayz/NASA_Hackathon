import { COLORS, CSS, DEPTH } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { playIntro, finishGame, starsFor, InfoPanel } from '../common/kit.js';
import { WebbDiagram, PARTS } from '../common/webbDiagram.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { toast, shake } from '../../ui/widgets.js';

// Webb's sunshield is as big as a tennis court and its mirror is 6.5 m wide, but the rocket's
// nose cone is only 5.4 m wide. Fold it up like origami! Some parts have to fold before others.
const NEEDS = { tower: ['shield'], pallets: ['shield', 'tower'] };
const DX = 400, DY = 470, S = 0.78;
const FAIR = { w: 150, h: 330 };

export class FairingFoldScene extends BaseScene {
  constructor() {
    super('FairingFold');
  }

  create() {
    this.setupStage();
    blueprint(this);
    this.state = 'intro';
    this.mistakes = 0;
    this.busy = false;
    this.webb = new WebbDiagram(this, DX, DY, S, 0);
    // the rocket's nose cone (where Webb has to fit)
    this.fairG = this.add.graphics().setDepth(DEPTH.ui - 6);
    this.drawFairing(0);
    txt(this, DX, DY + 168, this.T('fairingLabel', 'The rocket nose cone: 5.4 m wide'), { size: 16, weight: 800, color: CSS.cyan, origin: 0.5, scale: false });

    // tap areas on the drawing
    this.zones = [];
    this.makeZones();

    // the list of parts (the same as tapping the drawing)
    const names = this.T('parts', {});
    this.info = new InfoPanel(this, 780, 96, 460, 170, { title: this.T('panelTitle', 'Fold it up!'), text: this.T('panelText', ''), size: 17 });
    this.btns = ['wings', 'secondary', 'shield', 'tower', 'pallets', 'antenna', 'solar'].map((p, i) => {
      const b = new Button(this, 895 + (i % 2) * 230, 310 + Math.floor(i / 2) * 76, { width: 216, height: 62, size: 17, label: names[p] || p, variant: 'secondary', onClick: () => this.fold(p) });
      b.part = p;
      return b;
    });
    this.fitText = txt(this, 1010, 640, '', { size: 18, weight: 800, origin: 0.5, align: 'center', scale: false });
    this.updateFit();
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  drawFairing(close) {
    const g = this.fairG;
    g.clear();
    const x = DX - FAIR.w / 2, y = DY - FAIR.h + 90;
    g.lineStyle(3, COLORS.cyan, 0.9);
    // dashed outline: straight sides and a rounded nose
    for (let yy = y + 60; yy < y + FAIR.h; yy += 16) {
      g.lineBetween(x, yy, x, Math.min(yy + 8, y + FAIR.h));
      g.lineBetween(x + FAIR.w, yy, x + FAIR.w, Math.min(yy + 8, y + FAIR.h));
    }
    g.beginPath();
    g.arc(DX, y + 60, FAIR.w / 2, Math.PI, 0);
    g.strokePath();
    if (close > 0) {
      // the two halves of the nose cone closing around Webb
      g.fillStyle(0xe9ecf2, 1);
      g.fillRect(x - 200 * (1 - close), y + 60, FAIR.w / 2, FAIR.h - 60);
      g.fillRect(x + FAIR.w / 2 + 200 * (1 - close), y + 60, FAIR.w / 2, FAIR.h - 60);
      g.slice(DX - 200 * (1 - close), y + 60, FAIR.w / 2, Math.PI, Math.PI * 1.5);
      g.fillPath();
      g.slice(DX + 200 * (1 - close), y + 60, FAIR.w / 2, Math.PI * 1.5, Math.PI * 2);
      g.fillPath();
    }
  }

  makeZones() {
    this.zones.forEach((z) => z.destroy());
    this.zones = this.webb.hitAreas().map((a) => {
      const z = this.add.zone(a.x, a.y, a.w, a.h).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => this.fold(a.part === 'sunshield' ? (this.webb.f.shield < 1 ? 'shield' : 'pallets') : a.part));
      return z;
    });
  }

  updateFit() {
    const sz = this.webb.size();
    const wide = sz.w > FAIR.w + 4, tall = sz.h > FAIR.h - 20;
    this.fitText.setText(wide ? this.T('tooWide', 'Too wide for the rocket!') : tall ? this.T('tooTall', 'Too tall: lower the tower!') : this.T('fits', 'It fits!'));
    this.fitText.setColor(wide || tall ? '#ff9a9a' : '#9dffcf');
  }

  async fold(part) {
    if (this.state !== 'play' || this.busy) return;
    if (this.webb.f[part] >= 1) return;
    const missing = (NEEDS[part] || []).filter((p) => this.webb.f[p] < 1);
    const names = this.T('parts', {});
    if (missing.length) {
      this.mistakes++;
      Sfx.play('error');
      const b = this.btns.find((k) => k.part === part);
      if (b) shake(this, b, 6);
      const why = this.T('blocked', {})[part] || `First fold: ${missing.map((p) => names[p] || p).join(', ')}`;
      toast(this, why, { y: 690, color: COLORS.orange, sound: false, speak: true, duration: 2600 });
      return;
    }
    this.busy = true;
    Sfx.play('whoosh');
    this.webb.hi = null;
    await this.webb.animate(part, 1);
    this.busy = false;
    if (this._leaving) return;
    const b = this.btns.find((k) => k.part === part);
    if (b) b.setEnabled(false).setVariant('success');
    this.makeZones();
    this.updateFit();
    const facts = this.T('facts', {});
    if (facts[part]) this.info.show(names[part] || part, facts[part]);
    if (PARTS.every((p) => this.webb.f[p] >= 1)) this.win();
  }

  async win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    await new Promise((r) => this.tweens.addCounter({ from: 0, to: 1, duration: 1200, ease: 'Sine.easeInOut', onUpdate: (tw) => this.drawFairing(tw.getValue()), onComplete: r }));
    if (this._leaving) return;
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    finishGame(this, { stars: starsFor(this.mistakes, 0, 2) });
  }
}
