import { W, COLORS, CSS, clamp, shuffle } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { playIntro, GoalBar, idleHint } from '../common/kit.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { RoundBox, ProgressBar, Slider, shake, toast } from '../../ui/widgets.js';
import { Lab, SUN, powerAt, commsAt } from './labState.js';
import { shipImage, endStep } from './labKit.js';

// Test Your Knowledge, test 3: unfold and switch on. First the folded parts unfold, in the right
// order (locks, then power, then the antenna, then the instruments, then landing gear). Then the
// power test, with lamps as bright as the Sun at the destination, and the signal test: aim the
// antenna at Earth from that far away.
const PX = 640, PW = 610; // the right-hand panel
const RANK = { locks: 0, power: 1, comms: 2, science: 3, landing: 4 };
const WATCH = ['noPower', 'batteriesFlat', 'solarDim', 'fuelCellsShort', 'noComms', 'weakSignal'];

export class LabSystemsScene extends BaseScene {
  constructor() {
    super('LabSystems');
  }

  create() {
    this.setupStage({ bg: 0x0a1230, music: 'lab' });
    blueprint(this);
    Lab.ensureShip();
    this.state = 'intro';
    this.d = Lab.design();
    this.mistakes = 0;
    this.goal = new GoalBar(this);
    this.L = this.T('labels', {});
    this.add.image(300, 410, 'softDot').setDisplaySize(380, 300).setTint(0x3a5bd8).setAlpha(0.3);
    this.ship = shipImage(this, 300, 410, 1.2);
    this.add.existing(new RoundBox(this)).draw(PX, 176, PW, 524, { fill: 0x0b1230, alpha: 0.92, radius: 20, stroke: COLORS.stroke, strokeWidth: 3 });
    this.panel = this.add.container(0, 0);
    this.widgets = [];
    this.steps = this.makeSteps();
    idleHint(this, () => {
      if (this.state === 'order') {
        const b = this.widgets.find((w) => w.step && !w.done);
        return b ? { x: b.x - 160, y: b.y } : null;
      }
      if (this.state === 'power' && this.powerBtn) return { x: this.powerBtn.x, y: this.powerBtn.y - 40 };
      return null;
    }, { delay: 9000 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.orderPart();
    });
  }

  // the unfolding steps this particular ship needs
  makeSteps() {
    const s = this.T('steps', {});
    const d = this.d;
    const list = [{ id: 'locks', cat: 'locks' }];
    if (d.power) list.push({ id: d.power, cat: 'power' });
    if (d.comms) list.push({ id: d.comms, cat: 'comms' });
    if (d.science.length) list.push({ id: 'science', cat: 'science' });
    d.entry.filter((e) => ['landingLegs', 'airbags', 'parachutes', 'skyCrane'].includes(e)).forEach((e) => list.push({ id: e, cat: 'landing' }));
    return list.map((x) => ({ ...x, label: s[x.id] || x.id }));
  }

  clearPanel() {
    this.panel.removeAll(true);
    this.widgets.forEach((w) => w.destroy());
    this.widgets = [];
  }

  // ---------- 1. unfolding order ----------
  orderPart() {
    this.state = 'order';
    this.goal.set(this.T('task', { title: 'Unfold and switch on!', help: '' }));
    this.panel.add(txt(this, PX + 24, 194, this.L.order || 'Unfolding order', { size: 20, weight: 800, color: CSS.cyan, scale: false }));
    const list = shuffle(this.steps.slice());
    const two = list.length > 6;
    list.forEach((st, i) => {
      const col = two ? i % 2 : 0, row = two ? Math.floor(i / 2) : i;
      const w = two ? 288 : 520;
      const b = new Button(this, PX + 24 + w / 2 + col * (w + 10), 256 + row * 66, { width: w, height: 56, size: 18, label: st.label, variant: 'secondary', radius: 16, onClick: () => this.tapStep(b) });
      b.step = st;
      this.widgets.push(b);
    });
  }

  tapStep(b) {
    if (this.state !== 'order' || b.done) return;
    const next = Math.min(...this.widgets.filter((w) => w.step && !w.done).map((w) => RANK[w.step.cat]));
    if (RANK[b.step.cat] !== next) {
      // jammed: explain what has to happen first
      this.mistakes++;
      Sfx.play('error');
      shake(this, b, 8);
      const expected = Object.keys(RANK).find((k) => RANK[k] === next);
      const hint = (this.T('orderHints', {}) || {})[expected] || '';
      toast(this, `${this.L.jam || 'Jammed!'} ${hint}`, { x: W / 2, y: 140, color: COLORS.orange, sound: false, duration: 3800, wrap: 760 });
      Speech.say(hint);
      return;
    }
    b.done = true;
    b.setVariant('success').setEnabled(false);
    Sfx.play('powerUp');
    Speech.say(b.step.label);
    this.tweens.add({ targets: this.ship, scale: this.ship.scale * 1.06, duration: 140, yoyo: true });
    if (this.widgets.every((w) => !w.step || w.done)) this.time.delayedCall(700, () => this.powerPart());
  }

  // ---------- 2. power ----------
  powerPart() {
    this.state = 'power';
    this.clearPanel();
    const sun = Math.round(SUN[this.d.mission] * 100);
    this.panel.add(txt(this, PX + 24, 194, this.T('powerIntro', ''), { size: 18, weight: 700, scale: false, wrap: PW - 48 }));
    this.panel.add(txt(this, PX + 24, 280, `${this.L.lamps || 'Lamp brightness'}: ${sun}%`, { size: 20, weight: 800, color: CSS.yellow, scale: false }));
    this.lampBar = new ProgressBar(this, PX + 24, 316, PW - 48, 22, { color: COLORS.yellow });
    this.lampBar.set(SUN[this.d.mission]);
    this.panel.add(txt(this, PX + 24, 360, this.L.power || 'Power made', { size: 18, weight: 800, color: CSS.cyan, scale: false }));
    this.powerBar = new ProgressBar(this, PX + 24, 392, PW - 48, 30, { color: COLORS.green });
    // the line showing how much power the ship needs
    const need = this.add.rectangle(PX + 24 + (PW - 48) * 0.6, 407, 4, 46, COLORS.red);
    this.panel.add([need, txt(this, PX + 24 + (PW - 48) * 0.6, 436, this.L.need || 'Power needed', { size: 14, weight: 700, color: CSS.red, origin: [0.5, 0], scale: false })]);
    this.powerText = txt(this, PX + 24, 476, '', { size: 22, weight: 800, scale: false, wrap: PW - 48 });
    this.panel.add(this.powerText);
    Speech.say(this.T('powerIntro', ''), { wait: true });
    this.powerBtn = new Button(this, PX + PW / 2, 620, { width: 300, height: 60, size: 22, icon: 'play', label: this.L.switchOn || 'Switch on!', variant: 'success', onClick: () => this.switchOn() });
    this.widgets.push(this.powerBtn, { destroy: () => this.lampBar.destroy() }, { destroy: () => this.powerBar.destroy() });
  }

  switchOn() {
    if (this.state !== 'power') return;
    this.state = 'powering';
    this.powerBtn.setEnabled(false);
    Sfx.play('powerUp');
    const p = powerAt(this.d.power, this.d.mission) / 100;
    this.powerBar.color = p >= 0.6 ? COLORS.green : COLORS.red;
    this.powerBar.set(p);
    this.time.delayedCall(900, () => {
      const good = p >= 0.6;
      const line = good ? this.T('powerGood', '') : this.T('powerLow', '');
      this.powerText.setText(line).setColor(good ? CSS.green : CSS.red);
      Speech.say(line);
      Sfx.play(good ? 'success' : 'error');
      this.time.delayedCall(2200, () => this.signalPart());
    });
  }

  // ---------- 3. signal ----------
  signalPart() {
    this.state = 'signal';
    this.clearPanel();
    this.panel.add(txt(this, PX + 24, 194, this.T('signalIntro', ''), { size: 17, weight: 700, scale: false, wrap: PW - 48 }));
    Speech.say(this.T('signalIntro', ''), { wait: true });
    // a strip of sky with Earth drifting across it, and the antenna's beam
    this.sky = { x: PX + 40, y: 300, w: PW - 80 };
    this.skyG = this.add.graphics();
    this.earth = this.add.image(0, 330, 'earthSmall').setScale(0.25);
    this.panel.add([this.skyG, this.earth]);
    this.aim = 0.5;
    this.slider = new Slider(this, PX + PW / 2, 470, PW - 120, 0.5, (v) => (this.aim = v), 20);
    this.panel.add(txt(this, PX + PW / 2, 506, this.L.aim || 'Drag to aim at Earth', { size: 15, weight: 700, color: CSS.dim, origin: [0.5, 0], scale: false }));
    this.panel.add(txt(this, PX + 24, 548, this.L.signal || 'Signal at Earth', { size: 18, weight: 800, color: CSS.cyan, scale: false }));
    this.signalBar = new ProgressBar(this, PX + 24, 580, PW - 48, 26, { color: COLORS.green });
    this.lockBar = new ProgressBar(this, PX + 24, 620, PW - 48, 10, { color: COLORS.yellow });
    this.widgets.push(this.slider, { destroy: () => this.signalBar.destroy() }, { destroy: () => this.lockBar.destroy() });
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-LEFT', () => this.state === 'signal' && this.slider.set(clamp(this.aim - 0.04, 0, 1)));
      this.input.keyboard.on('keydown-RIGHT', () => this.state === 'signal' && this.slider.set(clamp(this.aim + 0.04, 0, 1)));
    }
    this.st = 0;
    this.lock = 0;
    this.best = 0;
  }

  update(time, delta) {
    if (this.state !== 'signal') return;
    const dt = Math.min(0.05, delta / 1000);
    this.st += dt;
    // Earth drifts slowly back and forth
    const target = 0.5 + Math.sin(this.st * 0.55) * 0.38;
    const { x, w } = this.sky;
    this.earth.x = x + target * w;
    const g = this.skyG;
    g.clear();
    g.fillStyle(0x070b1d, 1);
    g.fillRoundedRect(x - 20, 260, w + 40, 130, 14);
    const bx = x + this.aim * w;
    g.fillStyle(COLORS.cyan, 0.22);
    g.fillTriangle(bx, 384, bx - 34, 270, bx + 34, 270);
    g.lineStyle(2, COLORS.cyan, 0.9);
    g.lineBetween(bx, 384, bx, 270);
    // signal: how well it's aimed, but never more than the antenna can do from there
    const aimed = clamp(1 - Math.abs(this.aim - target) / 0.16, 0, 1);
    const max = commsAt(this.d.comms, this.d.mission) / 100;
    const s = aimed * max;
    this.signalBar.color = s >= 0.6 ? COLORS.green : s >= 0.3 ? COLORS.yellow : COLORS.red;
    this.signalBar.set(s, true);
    this.best = Math.max(this.best, s);
    if (aimed > 0.7) this.lock += dt;
    this.lockBar.set(this.lock / 3, true);
    if (this.lock >= 3 || this.st > 22) this.finishSignal();
  }

  finishSignal() {
    this.state = 'done';
    const max = commsAt(this.d.comms, this.d.mission) / 100;
    const good = max >= 0.6;
    const line = good ? this.T('signalGood', '') : this.T('signalWeak', '');
    Speech.say(line);
    toast(this, line, { x: PX + PW / 2, y: 660, color: good ? COLORS.green : COLORS.red, sound: false, duration: 2000 });
    const order = Math.max(0, 100 - this.mistakes * 20);
    const aimScore = this.lock >= 3 ? 100 : (this.lock / 3) * 100;
    const score = order * 0.4 + powerAt(this.d.power, this.d.mission) * 0.25 + commsAt(this.d.comms, this.d.mission) * 0.2 + aimScore * 0.15;
    this.time.delayedCall(1800, () => endStep(this, 'test', 'systems', score, WATCH));
  }
}
