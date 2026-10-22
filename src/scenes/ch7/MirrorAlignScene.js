import Phaser from 'phaser';
import { COLORS, CSS, DEPTH, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame, draggable, InfoPanel } from '../common/kit.js';
import { MIRROR_CELLS, hexCenter } from '../../art/ch7.js';
import { txt } from '../../ui/text.js';
import { Slider, drawPanel, ProgressBar, floatText } from '../../ui/widgets.js';

// When Webb first looked at a star, each of its 18 mirror segments made its own blurry copy
// of it. Engineers nudged the segments with tiny motors until all 18 copies sat on top of each
// other, then focused them into one sharp star. Do the same!
const V = { x: 60, y: 96, w: 700, h: 560 };
const C = { x: V.x + V.w / 2, y: V.y + V.h / 2 };

export class MirrorAlignScene extends BaseScene {
  constructor() {
    super('MirrorAlign');
  }

  create() {
    this.setupStage({ bg: 0x020308 });
    this.state = 'intro';
    this.stacked = 0;
    this.focusT = 0;
    this.focusTime = 0;
    const g = this.add.graphics();
    drawPanel(g, V.x - 8, V.y - 8, V.w + 16, V.h + 16, { fill: 0x000000, radius: 12, stroke: 0x46516b, strokeWidth: 3 });
    txt(this, V.x + 12, V.y + V.h - 28, this.T('cameraLabel', "Webb's camera"), { size: 14, weight: 800, color: '#8b93a8', scale: false });
    // the target in the middle
    this.target = this.add.graphics();
    this.target.lineStyle(2, COLORS.green, 0.7);
    this.target.strokeCircle(C.x, C.y, 34);
    this.target.lineBetween(C.x - 46, C.y, C.x - 26, C.y);
    this.target.lineBetween(C.x + 26, C.y, C.x + 46, C.y);
    this.target.lineBetween(C.x, C.y - 46, C.x, C.y - 26);
    this.target.lineBetween(C.x, C.y + 26, C.x, C.y + 46);

    // 18 blurry copies of the star, spread out in the pattern of the mirror segments
    const rnd = Phaser.Math.RND;
    this.dots = MIRROR_CELLS.map(({ q, r }, i) => {
      const p = hexCenter(q, r, 62);
      const x = C.x + p.x * 1.05 + rnd.between(-18, 18), y = C.y + p.y * 1.05 + rnd.between(-18, 18);
      const c = this.add.container(x, y);
      const glow = this.add.image(0, 0, 'softDot').setScale(0.55).setTint(0xcfe0ff).setAlpha(0.8).setBlendMode(Phaser.BlendModes.ADD);
      const n = txt(this, 0, 22, String(i + 1), { size: 12, weight: 800, color: '#8b93a8', origin: 0.5, scale: false });
      c.add([glow, n]);
      c.setSize(54, 54);
      c.done = false;
      draggable(this, c, {
        onDrop: (px, py) => (Math.hypot(px - C.x, py - C.y) < 60 ? this.stack(c) : false),
        onTap: () => this.stack(c)
      });
      return c;
    });

    this.info = new InfoPanel(this, 800, 96, 440, 290, { title: this.T('panelTitle', 'Line up the mirrors'), text: this.T('panelText', ''), size: 18 });
    this.countText = txt(this, 1020, 420, '', { size: 20, weight: 800, color: CSS.yellow, origin: 0.5, scale: false });
    // focus controls (used once the copies are stacked)
    this.focusLabel = txt(this, 1020, 480, this.T('focusLabel', 'Focus'), { size: 18, weight: 800, color: CSS.cyan, origin: 0.5, scale: false }).setVisible(false);
    this.slider = new Slider(this, 1020, 530, 380, 0, (v) => this.setFocus(v), 50);
    this.slider.setVisible(false);
    this.sharpBar = new ProgressBar(this, 830, 590, 380, 14, { color: COLORS.green });
    this.sharpBar.g.setVisible(false);
    this.sharpText = txt(this, 1020, 620, '', { size: 16, weight: 700, color: CSS.dim, origin: [0.5, 0], scale: false }).setVisible(false);
    this.best = 0.35 + Math.random() * 0.4;
    this.updateCount();
    playIntro(this).then((ok) => {
      if (ok) this.state = 'stack';
    });
  }

  updateCount() {
    this.countText.setText(`${this.T('stackedLabel', 'Copies lined up')}: ${this.stacked} / 18`);
  }

  stack(c) {
    if (this.state !== 'stack' || c.done) return false;
    c.done = true;
    c.enabled = false;
    c.disableInteractive();
    this.focus.remove(c);
    this.tweens.killTweensOf(c);
    // the tiny motors move the segment a little at a time
    this.tweens.add({ targets: c, x: C.x, y: C.y, duration: 500, ease: 'Sine.easeInOut', onComplete: () => c.list[1].setVisible(false) });
    Sfx.play('tick');
    this.stacked++;
    this.updateCount();
    const facts = this.T('facts', []);
    const k = [6, 12].indexOf(this.stacked);
    if (k >= 0 && facts[k]) this.info.show(this.T('panelTitle', 'Line up the mirrors'), facts[k]);
    if (this.stacked >= 18) this.time.delayedCall(700, () => this.startFocus());
    return true;
  }

  startFocus() {
    if (this._leaving) return;
    this.state = 'focus';
    Sfx.play('success');
    // all 18 copies on top of each other: one bright but still blurry star
    this.dots.forEach((d) => d.setVisible(false));
    this.star = this.add.container(C.x, C.y);
    this.blur = this.add.image(0, 0, 'softDot').setTint(0xe6efff).setBlendMode(Phaser.BlendModes.ADD);
    this.spikes = this.add.graphics();
    this.star.add([this.blur, this.spikes]);
    this.focusLabel.setVisible(true);
    this.slider.setVisible(true);
    this.sharpBar.g.setVisible(true);
    this.sharpText.setVisible(true);
    this.info.show(this.T('focusTitle', 'Now focus!'), this.T('focusText', ''));
    Speech.say(this.T('focusText', ''));
    this.setFocus(0);
  }

  setFocus(v) {
    if (this.state !== 'focus') return;
    const err = Math.abs(v - this.best);
    const sharp = clamp(1 - err / 0.5, 0, 1);
    this.sharp = sharp;
    this.blur.setScale(0.25 + (1 - sharp) * 2.2).setAlpha(0.35 + sharp * 0.6);
    // the sharper it gets, the more the six (plus two) spikes show
    const g = this.spikes;
    g.clear();
    const len = sharp * sharp * 140;
    g.lineStyle(2, 0xffffff, sharp * 0.9);
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 2;
      g.lineBetween(0, 0, Math.cos(a) * len, Math.sin(a) * len);
    }
    g.lineStyle(1.5, 0xffffff, sharp * 0.6);
    g.lineBetween(-len * 0.6, 0, len * 0.6, 0);
    this.sharpBar.set(sharp, true);
    this.sharpText.setText(sharp > 0.94 ? this.T('sharpYes', 'Super sharp! Hold it there...') : sharp > 0.7 ? this.T('sharpClose', 'Getting closer!') : this.T('sharpNo', 'Still blurry...'));
  }

  async win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    floatText(this, C.x, C.y - 160, '✓', CSS.green, 40);
    this.tweens.add({ targets: this.star, scale: 1.15, duration: 400, yoyo: true });
    await new Promise((r) => this.time.delayedCall(1200, r));
    if (this._leaving) return;
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    finishGame(this, { stars: this.focusTime < 25 ? 3 : 2 });
  }

  update(time, delta) {
    if (this.state !== 'focus') return;
    const dt = Math.min(delta, 50) / 1000;
    this.focusTime += dt;
    this.star.rotation = 0;
    if (this.sharp > 0.94) {
      this.focusT += dt;
      if (this.focusT > 1.2) this.win();
    } else this.focusT = 0;
  }
}
