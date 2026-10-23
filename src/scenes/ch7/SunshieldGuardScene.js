import Phaser from 'phaser';
import { COLORS, CSS } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame, starsFor, InfoPanel, GoalBar, idleHint } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { ProgressBar, toast, floatText } from '../../ui/widgets.js';

// Webb must always keep its sunshield between the Sun and the telescope, so it can only look
// at the parts of the sky that are well away from the Sun (the green zones). As Webb travels
// around the Sun during the year, the zones move, so different targets come into view.
// Tap a target when it's in a green zone to observe it.
const CX = 450, CY = 430, RING = 220;
const ZONE = [85, 135]; // allowed angles from the Sun, in degrees
const YEAR = 70; // seconds for one trip around the Sun

export class SunshieldGuardScene extends BaseScene {
  constructor() {
    super('SunshieldGuard');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 160 });
    this.state = 'intro';
    this.mistakes = 0;
    this.t = 0;
    this.observing = null;
    this.observed = 0;
    this.sunAngle = Math.PI; // the Sun starts on the left

    this.zoneG = this.add.graphics();
    const ring = this.add.graphics();
    ring.lineStyle(2, 0xffffff, 0.15);
    ring.strokeCircle(CX, CY, RING);
    this.sun = this.add.image(0, 0, 'softDot').setScale(1.6).setTint(0xffd27a).setBlendMode(Phaser.BlendModes.ADD);
    this.sunCore = img(this, 0, 0, 'sun', 0.35);
    this.webb = img(this, CX, CY, 'jwst', 0.3);
    this.beam = this.add.graphics();
    this.okRings = this.add.graphics();

    // the targets around the sky
    const list = this.T('targets', []);
    this.targets = list.map((t, i) => {
      const a = (i / list.length) * Math.PI * 2 + 0.3;
      const x = CX + Math.cos(a) * RING, y = CY + Math.sin(a) * RING;
      const c = this.add.container(x, y);
      const icon = img(this, 0, 0, t.art, t.scale ?? 0.4);
      const name = txt(this, 0, 36, t.name, { size: 14, weight: 800, color: '#ffffff', origin: 0.5, scale: false, stroke: '#070b1d', strokeThickness: 4 });
      c.add([icon, name]);
      c.setSize(80, 80);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', () => this.pick(c));
      c.activate = () => this.pick(c);
      this.focus.add(c);
      c.a = a;
      c.info = t;
      c.done = false;
      return c;
    });

    // HUD
    this.info = new InfoPanel(this, 790, 176, 450, 250, { title: '', text: '', size: 18 });
    this.info.g.setVisible(false);
    this.goal = new GoalBar(this);
    txt(this, 820, 460, this.T('yearLabel', 'Time of year'), { size: 16, weight: 800, color: CSS.cyan, scale: false });
    this.yearBar = new ProgressBar(this, 820, 488, 390, 14, { color: COLORS.cyan });
    this.obsLabel = txt(this, 820, 520, '', { size: 18, weight: 800, color: CSS.green, scale: false });
    this.obsBar = new ProgressBar(this, 820, 548, 390, 16, { color: COLORS.green });
    this.updateHud();
    this.drawSky();
    // stuck? point at a target in the green zone
    idleHint(this, () => {
      if (this.state !== 'play' || this.observing) return null;
      const t = this.targets.find((k) => !k.done && this.allowed(k.a));
      return t ? { x: t.x, y: t.y - 50 } : null;
    }, { delay: 6000 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'play';
      this.goal.set(this.T('task', { title: 'Observe 8 targets!', help: "Webb can only look where it's green. Tap a target when it's in a green zone." }), { count: `0 / ${this.targets.length}` });
    });
  }

  // angle between a sky direction and the Sun, in degrees
  sunDistance(a) {
    let d = Math.abs(Phaser.Math.Angle.Wrap(a - this.sunAngle));
    return Phaser.Math.RadToDeg(d);
  }

  allowed(a) {
    const d = this.sunDistance(a);
    return d >= ZONE[0] && d <= ZONE[1];
  }

  drawSky() {
    const g = this.zoneG;
    g.clear();
    // the two green zones where Webb can look
    [1, -1].forEach((k) => {
      const a0 = this.sunAngle + k * Phaser.Math.DegToRad(ZONE[0]);
      const a1 = this.sunAngle + k * Phaser.Math.DegToRad(ZONE[1]);
      g.fillStyle(COLORS.green, 0.16);
      g.slice(CX, CY, RING + 40, Math.min(a0, a1), Math.max(a0, a1), false);
      g.fillPath();
    });
    // the no-go zone facing the Sun
    g.fillStyle(COLORS.red, 0.1);
    g.slice(CX, CY, RING + 40, this.sunAngle - Phaser.Math.DegToRad(ZONE[0]), this.sunAngle + Phaser.Math.DegToRad(ZONE[0]), false);
    g.fillPath();
    const sx = CX + Math.cos(this.sunAngle) * (RING + 62), sy = CY + Math.sin(this.sunAngle) * (RING + 62);
    this.sun.setPosition(sx, sy);
    this.sunCore.setPosition(sx, sy);
    // targets in a green zone light up with a ring
    const rg = this.okRings;
    rg.clear();
    this.targets.forEach((t) => {
      const ok = !t.done && this.allowed(t.a);
      t.setAlpha(t.done ? 0.35 : ok ? 1 : 0.5);
      if (ok) {
        rg.lineStyle(4, COLORS.green, 0.6 + Math.sin(this.time.now / 200) * 0.3);
        rg.strokeCircle(t.x, t.y, 40);
      }
    });
  }

  updateHud() {
    if (this.goal && this.state === 'play') this.goal.setCount(`${this.observed} / ${this.targets.length}`);
    this.yearBar.set(Math.min(1, this.t / YEAR), true);
  }

  pick(c) {
    if (this.state !== 'play' || c.done || this.observing) return;
    if (!this.allowed(c.a)) {
      this.mistakes++;
      Sfx.play('error');
      const near = this.sunDistance(c.a) < ZONE[0];
      toast(this, near ? this.T('tooNearSun', 'Not now! Sunlight would hit the telescope. Wait until it moves into a green zone.') : this.T('tooFarSun', "Webb can't tip that far back. Wait until it moves into a green zone."), { y: 660, color: COLORS.orange, sound: false, speak: true, duration: 2600 });
      return;
    }
    this.observing = c;
    this.obsT = 0;
    this.obsLabel.setText(`${this.T('observingLabel', 'Observing')}: ${c.info.name}`);
    Sfx.play('select');
  }

  targetDone(c) {
    c.done = true;
    this.observing = null;
    this.observed++;
    this.obsLabel.setText('');
    this.obsBar.set(0, true);
    Sfx.play('success');
    floatText(this, c.x, c.y - 50, '✓', CSS.green, 30);
    this.info.g.setVisible(true);
    this.info.show(c.info.name, c.info.fact);
    Speech.say(c.info.fact);
    this.updateHud();
    if (this.observed >= this.targets.length) this.win();
  }

  async win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    await new Promise((r) => this.time.delayedCall(1500, r));
    if (this._leaving) return;
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    finishGame(this, { stars: starsFor(this.mistakes, 1, 3) });
  }

  update(time, delta) {
    if (this.state !== 'play') return;
    const dt = Math.min(delta, 50) / 1000;
    this.t += dt * (this.relaxed ? 0.8 : 1);
    // over a year, the Sun's direction goes once all the way round
    this.sunAngle = Math.PI + (this.t / YEAR) * Math.PI * 2;
    if (this.t > YEAR * 1.5) this.t -= YEAR;
    this.drawSky();
    this.updateHud();
    // Webb turns to face what it's observing
    const g = this.beam;
    g.clear();
    if (this.observing) {
      const c = this.observing;
      this.webb.rotation = Phaser.Math.Angle.RotateTo(this.webb.rotation, c.a + Math.PI / 2, dt * 3);
      g.lineStyle(3, COLORS.green, 0.6);
      g.lineBetween(CX, CY, c.x, c.y);
      if (!this.allowed(c.a)) {
        // it drifted out of the safe zone before we finished
        this.observing = null;
        this.obsLabel.setText('');
        this.obsBar.set(0, true);
        toast(this, this.T('lostTarget', 'It moved out of the green zone. Try again later!'), { y: 660, color: COLORS.orange, sound: false, duration: 2000 });
        return;
      }
      this.obsT += dt;
      this.obsBar.set(this.obsT / 3, true);
      if (this.obsT >= 3) this.targetDone(c);
    }
  }
}
