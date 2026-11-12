import { COLORS, CSS, DEPTH, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, GoalBar, idleHint } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { RoundBox, ProgressBar, Slider, toast, floatText } from '../../ui/widgets.js';
import { Lab, rate, powerAt, commsAt } from './labState.js';
import { shipImage, endStep } from './labKit.js';

// Test Your Knowledge, flight 5: the way home.
//   A crew capsule comes home: heat shield forward, the right entry angle, then parachutes.
//   A robot sends its data home instead: keep the antenna on Earth while the data trickles in
//   (fast with a big dish, slow with a small antenna far away or little power).
const WATCH_CREW = ['noShieldHome', 'noChutesHome', 'noLifeSupport'];
const WATCH_ROBOT = ['weakSignal', 'noComms', 'solarDim', 'batteriesFlat', 'fuelCellsShort'];

export class LabHomeScene extends BaseScene {
  constructor() {
    super('LabHome');
  }

  create() {
    // (Phaser reuses this scene object on every visit, so start from a clean slate)
    this.finished = false;
    this.playedAny = false;
    Lab.ensureShip();
    const d = Lab.design();
    this.d = d;
    this.crew = d.body === 'crewCapsule';
    this.setupStage({ music: this.crew ? 'tension' : 'space' });
    starfield(this, { count: 160 });
    this.state = 'intro';
    this.scores = [];
    this.L = this.T('labels', {});
    this.goal = new GoalBar(this);
    if (this.crew) this.crewSetup();
    else this.robotSetup();
    idleHint(this, () => (this.hintAt ? this.hintAt() : null), { delay: 4000 });
    playIntro(this, this.crew ? 'crewIntro' : 'robotIntro').then((ok) => {
      if (!ok) return;
      this.goal.set(this.T('task', { title: 'The way home', help: '' }), { speak: false });
      if (this.crew) this.entryStart();
      else this.sendStart();
    });
  }

  // ===================== crew: re-entry and splashdown =====================
  crewSetup() {
    img(this, 640, 880, 'earthBig', 1.1);
    this.capsule = this.add.container(640, 300).setDepth(5);
    this.plasma = this.add.image(0, 20, 'softDot').setDisplaySize(240, 240).setTint(0xff7a30).setAlpha(0);
    this.capsule.add([this.plasma, shipImage(this, 0, 0, 0.55)]);
    this.add.existing(new RoundBox(this)).draw(40, 176, 360, 260, { fill: 0x0b1230, alpha: 0.9, radius: 18, stroke: COLORS.stroke, strokeWidth: 3 }).setDepth(DEPTH.ui - 1);
    this.info = txt(this, 62, 196, '', { size: 18, weight: 800, scale: false, wrap: 316, lineSpacing: 4 }).setDepth(DEPTH.ui);
  }

  entryStart() {
    if (!this.d.entry.includes('heatShield')) {
      this.scores.push(15);
      return this.guide.say(this.T('noShield', ''), { modal: true }).then(() => this.finish());
    }
    // pick the entry angle: too steep burns, too shallow skips off the air
    this.state = 'angle';
    this.playedAny = true;
    this.info.setText(this.L.angle || 'Entry angle');
    this.angle = 0.5;
    this.angleG = this.add.graphics().setDepth(DEPTH.ui);
    this.slider = new Slider(this, 220, 360, 300, 0.5, (v) => (this.angle = v), 20).setDepth(DEPTH.ui);
    this.lockBtn = new Button(this, 1040, 640, { width: 280, height: 64, size: 22, icon: 'check', label: this.L.lock || 'Lock it in', variant: 'success', onClick: () => this.lockAngle() });
    this.hintAt = () => ({ x: this.lockBtn.x, y: this.lockBtn.y - 44 });
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-LEFT', () => this.state === 'angle' && this.slider.set(clamp(this.angle - 0.05, 0, 1)));
      this.input.keyboard.on('keydown-RIGHT', () => this.state === 'angle' && this.slider.set(clamp(this.angle + 0.05, 0, 1)));
    }
  }

  lockAngle() {
    if (this.state !== 'angle') return;
    // the green zone is the middle of the slider
    const err = Math.abs(this.angle - 0.55);
    const ok = err < 0.1;
    this.scores.push(ok ? 100 : Math.max(20, 100 - (err - 0.1) * 250));
    const line = ok ? '' : this.angle > 0.65 ? this.L.steep || 'Too steep' : this.L.shallow || 'Too shallow';
    if (line) toast(this, line, { x: 640, y: 160, color: COLORS.orange, sound: false });
    this.slider.destroy();
    this.lockBtn.destroy();
    this.angleG.clear();
    this.state = 'plunge';
    Sfx.play('whoosh');
    this.tweens.add({ targets: this.plasma, alpha: 0.8, duration: 600 });
    this.tweens.add({
      targets: this.capsule,
      y: 380,
      duration: 3000,
      onComplete: () => {
        this.tweens.add({ targets: this.plasma, alpha: 0, duration: 600 });
        this.chuteStart();
      }
    });
  }

  chuteStart() {
    if (!this.d.entry.includes('parachutes')) {
      this.scores.push(20);
      return this.guide.say(this.T('noChutes', ''), { modal: true }).then(() => this.finish());
    }
    this.state = 'chute';
    this.h = 1;
    this.info.setText(this.L.height || 'Height');
    this.hBar = new ProgressBar(this, 62, 240, 316, 26, { color: COLORS.cyan });
    this.zone = this.add.rectangle(62 + 316 * 0.3, 253, 316 * 0.2, 34, COLORS.green, 0.45).setOrigin(0, 0.5).setDepth(DEPTH.ui);
    Speech.say(this.T('chutesNow', ''));
    this.chuteBtn = new Button(this, 1040, 640, { width: 280, height: 64, size: 22, icon: 'up', label: this.L.chutes || 'Parachutes', variant: 'warn', onClick: () => this.openChutes() });
    if (!this.reducedMotion) this.chuteBtn.pulse();
    this.hintAt = () => (this.h < 0.55 ? { x: this.chuteBtn.x, y: this.chuteBtn.y - 44 } : null);
    if (this.input.keyboard) this.input.keyboard.on('keydown-SPACE', () => this.openChutes());
  }

  openChutes() {
    if (this.state !== 'chute') return;
    this.state = 'drift';
    this.chuteBtn.stopPulse().setEnabled(false);
    const ok = this.h >= 0.3 && this.h <= 0.5;
    this.scores.push(ok ? 100 : Math.max(25, 100 - Math.min(Math.abs(this.h - 0.3), Math.abs(this.h - 0.5)) * 220));
    Sfx.play('whoosh');
    const chute = img(this, 0, -110, 'mainChute', 0.7).setScale(0.05);
    this.capsule.add(chute);
    this.tweens.add({ targets: chute, scale: 0.7 / 2, duration: 600, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: this.capsule,
      y: 560,
      duration: 2200,
      onComplete: () => {
        Sfx.play('splash');
        Speech.say(this.T('splashdown', ''));
        floatText(this, 640, 470, this.T('splashdown', 'Splashdown!'), CSS.green, 30);
        this.time.delayedCall(1600, () => this.finish());
      }
    });
  }

  // ===================== robot: send the data home =====================
  robotSetup() {
    this.add.existing(new RoundBox(this)).draw(40, 176, 1200, 400, { fill: 0x070b1d, alpha: 0.6, radius: 20, stroke: COLORS.stroke, strokeWidth: 2, shadow: false });
    this.ship = shipImage(this, 160, 420, 0.5);
    this.earth = img(this, 900, 300, 'earthSmall', 0.3);
    this.beam = this.add.graphics();
    this.sentBar = new ProgressBar(this, 60, 610, 700, 26, { color: COLORS.green });
    txt(this, 60, 584, this.L.data || 'Data sent', { size: 16, weight: 800, color: CSS.cyan, scale: false });
    this.sigText = txt(this, 800, 612, '', { size: 18, weight: 800, scale: false });
    txt(this, 640, 690, this.L.drag || 'Drag to aim at Earth', { size: 15, weight: 700, color: CSS.dim, origin: 0.5, scale: false });
    this.aim = { x: 900, y: 300 };
  }

  sendStart() {
    this.state = 'send';
    this.t = 0;
    this.sent = 0;
    this.maxRate = (commsAt(this.d.comms, this.d.mission) / 100) * clamp(powerAt(this.d.power, this.d.mission) / 100, 0.3, 1);
    this.input.on('pointermove', (p) => p.isDown && (this.aim = { x: p.worldX, y: p.worldY }));
    this.input.on('pointerdown', (p) => (this.aim = { x: p.worldX, y: p.worldY }));
    if (this.input.keyboard) this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN');
    if (this.maxRate < 0.5) this.time.delayedCall(2500, () => Speech.say(this.T('slowData', '')));
    this.hintAt = () => ({ x: this.earth.x, y: this.earth.y - 50 });
  }

  update(time, delta) {
    if (this.state === 'angle') this.drawAngle();
    if (this.state === 'chute') {
      const dt = Math.min(0.05, delta / 1000);
      this.h = Math.max(0, this.h - dt * 0.09 * (this.relaxed ? 0.8 : 1));
      this.hBar.set(this.h, true);
      this.capsule.y = 380 + (1 - this.h) * 160;
      if (this.h <= 0.02) this.openChutes();
    }
    if (this.state !== 'send') return;
    const dt = Math.min(0.05, delta / 1000);
    this.t += dt;
    // Earth drifts across the sky
    this.earth.setPosition(780 + Math.sin(this.t * 0.45) * 330, 320 + Math.sin(this.t * 0.7) * 110);
    if (this.keys) {
      this.aim.x += ((this.keys.RIGHT.isDown ? 1 : 0) - (this.keys.LEFT.isDown ? 1 : 0)) * 360 * dt;
      this.aim.y += ((this.keys.DOWN.isDown ? 1 : 0) - (this.keys.UP.isDown ? 1 : 0)) * 360 * dt;
    }
    const dist = Math.hypot(this.aim.x - this.earth.x, this.aim.y - this.earth.y);
    const aimed = clamp(1 - dist / 130, 0, 1);
    const rateNow = aimed * this.maxRate;
    this.sent = Math.min(1, this.sent + rateNow * dt * 0.075);
    this.sentBar.set(this.sent, true);
    this.sigText.setText(`${this.L.signal || 'Signal'}: ${Math.round(rateNow * 100)}%`).setColor(rateNow > 0.5 ? CSS.green : rateNow > 0.2 ? CSS.yellow : CSS.red);
    const g = this.beam;
    g.clear();
    g.fillStyle(COLORS.cyan, 0.15 + aimed * 0.2);
    const ang = Math.atan2(this.aim.y - 420, this.aim.x - 160);
    g.fillTriangle(180, 410, 180 + Math.cos(ang - 0.12) * 900, 410 + Math.sin(ang - 0.12) * 900, 180 + Math.cos(ang + 0.12) * 900, 410 + Math.sin(ang + 0.12) * 900);
    g.fillStyle(COLORS.yellow, 1);
    g.fillCircle(this.aim.x, this.aim.y, 8);
    if (this.sent >= 1 || this.t > 26) this.sendEnd();
  }

  drawAngle() {
    // the edge of Earth's air, with the green zone and the chosen path
    const g = this.angleG;
    g.clear();
    const cx = 220, cy = 300;
    g.lineStyle(10, 0x2a3566, 1);
    g.beginPath();
    g.arc(cx, cy, 90, Math.PI * 0.05, Math.PI * 0.45);
    g.strokePath();
    g.lineStyle(10, COLORS.green, 0.9);
    g.beginPath();
    g.arc(cx, cy, 90, Math.PI * (0.05 + 0.4 * 0.45), Math.PI * (0.05 + 0.4 * 0.65));
    g.strokePath();
    const a = Math.PI * (0.05 + 0.4 * this.angle);
    const ok = Math.abs(this.angle - 0.55) < 0.1;
    g.lineStyle(5, ok ? COLORS.green : COLORS.yellow, 1);
    g.lineBetween(cx, cy, cx + Math.cos(a) * 100, cy + Math.sin(a) * 100);
  }

  sendEnd() {
    this.state = 'done';
    this.beam.clear();
    this.scores.push(this.sent * 100);
    Sfx.play(this.sent >= 1 ? 'bigSuccess' : 'click');
    if (this.sent >= 1) Speech.say(this.T('dataDone', ''));
    this.time.delayedCall(1200, () => this.finish());
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    const skill = this.scores.length ? this.scores.reduce((a, b) => a + b, 0) / this.scores.length : 30;
    const r = rate(this.d);
    const axis = this.crew ? r.axes.protection : r.axes.comms;
    endStep(this, 'flight', 'home', skill * 0.6 + axis * 0.4, this.crew ? WATCH_CREW : WATCH_ROBOT, { none: this.crew && !this.playedAny });
  }
}

