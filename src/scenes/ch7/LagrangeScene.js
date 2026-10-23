import Phaser from 'phaser';
import { COLORS, CSS, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame, starsFor, GoalBar, idleHint } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { toast, floatText, roundBox } from '../../ui/widgets.js';

// Webb's home is L2, a spot 1.5 million km from Earth on the side away from the Sun.
// Earth's gravity slows Webb down all the way there, and Webb can only push itself AWAY from
// the Sun (pointing its thrusters at the Sun would face the hot side the wrong way), so it can
// never brake. It launched a little too slow on purpose: give it gentle pushes so it arrives
// at L2 just as it slows to a stop. Too fast, and it sails right past!
const X0 = 210, X1 = 1060, LINE_Y = 330; // Earth and L2 on screen
const G = 0.0032; // how much gravity slows Webb (distance units per second²)
const SMALL = 0.006, BIG = 0.02;
const FUEL = 24;

export class LagrangeScene extends BaseScene {
  constructor() {
    super('Lagrange');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 150 });
    this.state = 'intro';
    this.mistakes = 0;
    this.reset();

    // the Sun (far to the left), Earth with the Moon, and L2
    this.add.image(-120, LINE_Y, 'softDot').setScale(4).setTint(0xffd27a).setAlpha(0.5);
    img(this, X0, LINE_Y, 'earthSmall', 0.75);
    const moonOrbit = this.add.graphics();
    moonOrbit.lineStyle(1, 0xffffff, 0.25);
    moonOrbit.strokeCircle(X0, LINE_Y, 70);
    this.moon = img(this, X0 + 70, LINE_Y, 'moonSmall', 0.25);
    const g = this.add.graphics();
    g.lineStyle(2, COLORS.cyan, 0.3);
    for (let x = X0 + 60; x < X1 + 120; x += 18) g.lineBetween(x, LINE_Y, x + 9, LINE_Y);
    g.lineStyle(3, COLORS.green, 0.9);
    g.strokeCircle(X1, LINE_Y, 26);
    txt(this, X1, LINE_Y - 50, 'L2', { size: 24, weight: 800, color: CSS.green, origin: 0.5, scale: false });
    txt(this, (X0 + X1) / 2, LINE_Y + 40, this.T('distLabel', '1.5 million km (about 4 times as far as the Moon)'), { size: 16, weight: 700, color: CSS.dim, origin: 0.5, scale: false });
    txt(this, 60, LINE_Y - 90, this.T('sunLabel', '← The Sun'), { size: 16, weight: 800, color: CSS.yellow, scale: false });
    this.webb = img(this, X0, LINE_Y, 'jwst', 0.2);
    this.flame = this.add.image(0, 0, 'flame').setOrigin(0.5, 0).setScale(0.16, 0.22).setRotation(Math.PI / 2).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);

    // the speed gauge: your speed, and the "just right" speed to stop exactly at L2
    const gx = 110, gy = 450, gw = 680;
    const pg = roundBox(this, gx - 30, gy - 40, gw + 60, 150, { fill: COLORS.panel, radius: 18, stroke: COLORS.stroke, strokeWidth: 3 });
    txt(this, gx, gy - 28, this.T('speedLabel', 'Speed'), { size: 18, weight: 800, color: CSS.cyan, scale: false });
    this.gauge = { x: gx, y: gy, w: gw };
    this.gaugeG = this.add.graphics();
    this.idealText = txt(this, gx + gw, gy - 28, this.T('idealLabel', 'Green zone: just right to stop at L2'), { size: 15, weight: 700, color: CSS.green, origin: [1, 0], scale: false });
    this.statusText = txt(this, gx + gw / 2, gy + 70, '', { size: 22, weight: 800, origin: 0.5, scale: false });
    this.dayText = txt(this, 1220, 186, '', { size: 22, weight: 800, color: CSS.yellow, origin: [1, 0], scale: false });
    this.fuelText = txt(this, 1220, 220, '', { size: 18, weight: 700, color: CSS.text, origin: [1, 0], scale: false });
    this.goal = new GoalBar(this);

    this.smallBtn = new Button(this, 1010, 470, { width: 280, height: 66, size: 22, label: this.T('smallLabel', 'Small push'), icon: 'next', variant: 'primary', onClick: () => this.push(SMALL, 1) });
    this.bigBtn = new Button(this, 1010, 556, { width: 280, height: 66, size: 22, label: this.T('bigLabel', 'Big push'), icon: 'skip', variant: 'warn', onClick: () => this.push(BIG, 3) });
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.push(SMALL, 1));
      this.input.keyboard.on('keydown-B', () => this.push(BIG, 3));
    }
    this.draw();
    // too slow? point at Small push
    idleHint(this, () => (this.state === 'fly' && this.v - this.ideal() < -0.015 ? { x: this.smallBtn.x, y: this.smallBtn.y - 40 } : null), { delay: 2500 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'fly';
      this.goal.set(this.T('task', { title: 'Coast to L2!', help: "Tap a push button to keep the speed bar in the green zone. Not too fast: Webb can't brake!" }));
    });
  }

  reset() {
    this.x = 0; // 0 = Earth, 1 = L2
    this.v = 0.062; // launched a little slow
    this.t = 0;
    this.fuel = FUEL;
  }

  ideal() {
    return Math.sqrt(Math.max(0, 2 * G * (1 - this.x)));
  }

  push(dv, cost) {
    if (this.state !== 'fly') return;
    if (this.fuel < cost) {
      Sfx.play('error');
      toast(this, this.T('noFuel', 'Not enough fuel for that push!'), { y: 640, color: COLORS.orange, sound: false, duration: 1500 });
      return;
    }
    this.fuel -= cost;
    this.v += dv;
    Sfx.play(cost > 1 ? 'ignition' : 'puff');
    this.flame.setVisible(true);
    this.time.delayedCall(cost > 1 ? 500 : 250, () => this.flame.setVisible(false));
  }

  draw() {
    const { x, y, w } = this.gauge;
    const g = this.gaugeG;
    g.clear();
    const max = 0.12;
    const px = (v) => x + clamp(v / max, 0, 1) * w;
    g.fillStyle(0x0b1230, 1);
    g.fillRoundedRect(x, y, w, 30, 10);
    // the green zone is just right; past it there's no way to slow down
    const ideal = this.ideal();
    g.fillStyle(COLORS.green, 0.45);
    g.fillRect(px(ideal - 0.015), y - 6, px(ideal + 0.008) - px(ideal - 0.015), 42);
    g.fillStyle(COLORS.red, 0.25);
    g.fillRect(px(ideal + 0.008), y, x + w - px(ideal + 0.008), 30);
    g.fillStyle(COLORS.cyan, 0.85);
    g.fillRoundedRect(x, y + 6, Math.max(4, px(Math.max(0, this.v)) - x), 18, 8);
    g.lineStyle(4, COLORS.green, 1);
    g.lineBetween(px(ideal), y - 6, px(ideal), y + 36);
    const diff = this.v - ideal;
    this.statusText.setText(diff > 0.008 ? this.T('tooFast', 'Too fast! You will shoot past L2...') : diff < -0.015 ? this.T('tooSlow', 'Too slow: give it a push!') : this.T('justRight', 'Just right!'));
    this.statusText.setColor(diff > 0.008 ? '#ff9a9a' : diff < -0.015 ? '#ffe08a' : '#9dffcf');
    this.dayText.setText(`${this.T('dayLabel', 'Day')} ${Math.min(30, Math.floor(this.t * 1.2))}`);
    this.fuelText.setText(`${this.T('fuelLabel', 'Fuel')}: ${this.fuel} / ${FUEL}`);
    const sx = X0 + this.x * (X1 - X0);
    this.webb.setPosition(sx, LINE_Y - 4);
    this.flame.setPosition(sx - 34, LINE_Y + 6);
  }

  async fail(msg) {
    this.state = 'between';
    this.mistakes++;
    Sfx.play('error');
    toast(this, msg, { y: 640, color: COLORS.orange, sound: false, speak: true, duration: 3000 });
    await new Promise((r) => this.time.delayedCall(3000, r));
    if (this._leaving) return;
    this.reset();
    this.state = 'fly';
  }

  async arrive() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    // Webb settles into its big loop around L2 (a "halo orbit")
    this.add.ellipse(X1, LINE_Y, 120, 60).setStrokeStyle(3, COLORS.green, 0.9);
    this.tweens.addCounter({ from: Math.PI, to: Math.PI * 3, duration: 4000, repeat: -1, onUpdate: (tw) => {
      const a = tw.getValue();
      this.webb.setPosition(X1 + Math.cos(a) * 60, LINE_Y + Math.sin(a) * 30);
    } });
    floatText(this, X1, LINE_Y - 90, '✓', CSS.green, 40);
    await new Promise((r) => this.time.delayedCall(1500, r));
    if (this._leaving) return;
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    finishGame(this, { stars: starsFor(this.mistakes, 0, 1) });
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    this.moon.setPosition(X0 + Math.cos(time / 2000) * 70, LINE_Y + Math.sin(time / 2000) * 70);
    if (this.state !== 'fly') return;
    this.t += dt;
    // gravity slows Webb down; past L2 it would drift away
    this.v += (this.x < 1 ? -G * (this.relaxed ? 0.85 : 1) : G) * dt;
    this.x += this.v * dt;
    if (this.x >= 0.96 && Math.abs(this.v) < 0.012) return this.arrive();
    if (this.x > 1.03) return this.fail(this.T('overshoot', 'Too fast! Webb shot past L2, and it can\'t brake. Let\'s try that again.'));
    if (this.x < 0) return this.fail(this.T('fellBack', 'Too slow! Webb fell back towards Earth. Give it more pushes.'));
    this.draw();
  }
}
