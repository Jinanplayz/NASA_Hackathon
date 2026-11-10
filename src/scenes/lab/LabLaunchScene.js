import Phaser from 'phaser';
import { W, H, FULL, COLORS, CSS, DEPTH, clamp, lerpColor } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, GoalBar, idleHint } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { RoundBox, ProgressBar, toast, cameraShake } from '../../ui/widgets.js';
import { Lab, rate } from './labState.js';
import { rocketImage, endStep } from './labKit.js';

// Test Your Knowledge, flight 1: launch. Steer the rocket to follow the guide as it tips over
// towards orbit, and drop each stage when its fuel runs out. A ship too heavy for its rocket
// struggles: Mission Control has to help, and the launch scores less.
const RX = 520, RY = 470; // where the rocket sits on screen
const ORBIT = 200; // km
const BURN = { smallRocket: [15, 13], mediumRocket: [9, 11, 10], heavyRocket: [11, 10, 9] };
const WATCH = ['tooHeavy'];

export class LabLaunchScene extends BaseScene {
  constructor() {
    super('LabLaunch');
  }

  create() {
    this.setupStage({ bg: 0x6a8fd8, music: 'tension' });
    Lab.ensureShip();
    this.state = 'intro';
    const d = Lab.design();
    const r = rate(d);
    this.ratio = r.ratio;
    this.burns = (BURN[d.rocket] || BURN.mediumRocket).slice();
    this.stage = 0;
    this.fuel = 1;
    this.alt = 0;
    this.speed = 0;
    this.tilt = 0;
    this.steer = 0;
    this.onPath = 0;
    this.flying = 0;
    this.stagingScores = [];
    this.waitStage = -1;
    this.helped = false;
    this.L = this.T('labels', {});
    this.goal = new GoalBar(this);

    // sky (it darkens as the rocket climbs), clouds, stars and the launch pad
    this.skyRect = this.add.rectangle(W / 2, H / 2, FULL.w, FULL.h, 0x6a8fd8);
    this.starLayer = this.add.container(0, 0).setAlpha(0);
    for (let i = 0; i < 90; i++) this.starLayer.add(this.add.circle(FULL.x + Math.random() * FULL.w, FULL.y + Math.random() * FULL.h, Math.random() < 0.1 ? 2 : 1, 0xffffff, 0.8));
    this.clouds = [];
    for (let i = 0; i < 6; i++) this.clouds.push(img(this, Math.random() * W, -100 - i * 260, `cloud${i % 3}`, 1 + Math.random()).setAlpha(0.8));
    this.ground = this.add.container(0, 0);
    const pad = this.add.graphics();
    pad.fillStyle(0x2f6b3a, 1);
    pad.fillRect(FULL.x, RY + 10, FULL.w, 400);
    pad.fillStyle(0x6b7385, 1);
    pad.fillRect(RX - 110, RY - 4, 220, 18);
    pad.fillStyle(0xb8402f, 1);
    pad.fillRect(RX + 90, RY - 300, 16, 300);
    this.ground.add(pad);

    // the guide (where the rocket should point) and the rocket
    this.ghost = this.add.graphics().setDepth(4);
    this.rocket = rocketImage(this, RX, RY, 0.66, false).setDepth(5);
    this.flame = this.add.image(RX, RY, 'flame').setOrigin(0.5, 0).setScale(0.5, 0.8).setBlendMode(Phaser.BlendModes.ADD).setDepth(4).setVisible(false);

    // readouts
    this.add.existing(new RoundBox(this)).draw(860, 176, 390, 300, { fill: 0x0b1230, alpha: 0.88, radius: 18, stroke: COLORS.stroke, strokeWidth: 3 }).setDepth(DEPTH.ui - 1);
    this.altText = txt(this, 884, 196, '', { size: 22, weight: 800, scale: false }).setDepth(DEPTH.ui);
    this.speedText = txt(this, 884, 232, '', { size: 18, weight: 700, color: CSS.dim, scale: false }).setDepth(DEPTH.ui);
    txt(this, 884, 274, this.L.onPath || 'On path', { size: 16, weight: 800, color: CSS.cyan, scale: false }).setDepth(DEPTH.ui);
    this.pathBar = new ProgressBar(this, 884, 300, 342, 20, { color: COLORS.green });
    txt(this, 884, 340, this.L.stage || 'Stage', { size: 16, weight: 800, color: CSS.cyan, scale: false }).setDepth(DEPTH.ui);
    this.stageLights = this.burns.map((_, i) => this.add.circle(906 + i * 44, 384, 15, 0x3a4470).setStrokeStyle(3, 0x0b1230).setDepth(DEPTH.ui));
    this.fuelBar = new ProgressBar(this, 884, 420, 342, 18, { color: COLORS.orange });

    // controls
    this.launchBtn = new Button(this, RX, 650, { width: 320, height: 70, size: 28, icon: 'play', label: this.L.launch || 'Launch', variant: 'success', onClick: () => this.countdown() });
    this.leftBtn = new Button(this, 920, 560, { width: 150, height: 70, size: 20, icon: 'back', label: '', variant: 'primary' });
    this.rightBtn = new Button(this, 1090, 560, { width: 150, height: 70, size: 20, icon: 'next', label: '', variant: 'primary' });
    this.stageBtn = new Button(this, 1005, 650, { width: 320, height: 64, size: 24, icon: 'skip', label: this.L.stage || 'Stage', variant: 'warn', onClick: () => this.dropStage() });
    [this.leftBtn, this.rightBtn].forEach((b, i) => {
      b.on('pointerdown', () => (this.steer = i ? 1 : -1));
      b.on('pointerup', () => (this.steer = 0));
      b.on('pointerout', () => (this.steer = 0));
      b.opts.onClick = null;
    });
    this.setControls(false);
    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,A,D');
      this.input.keyboard.on('keydown-SPACE', () => (this.state === 'ready' ? this.countdown() : this.dropStage()));
    }
    this.readouts();
    idleHint(this, () => {
      if (this.state === 'ready') return { x: this.launchBtn.x, y: this.launchBtn.y - 44 };
      if (this.state === 'fly' && this.waitStage >= 0) return { x: this.stageBtn.x, y: this.stageBtn.y - 42 };
      return null;
    }, { delay: 2500 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'ready';
      this.goal.set(this.T('task', { title: 'Launch!', help: '' }));
      if (!this.reducedMotion) this.launchBtn.pulse();
    });
  }

  setControls(on) {
    [this.leftBtn, this.rightBtn, this.stageBtn].forEach((b) => b.setVisible(on));
    this.launchBtn.setVisible(!on);
  }

  countdown() {
    if (this.state !== 'ready') return;
    this.state = 'countdown';
    this.launchBtn.stopPulse().setEnabled(false);
    const big = txt(this, RX, 300, '3', { size: 120, weight: 800, color: CSS.yellow, origin: 0.5, stroke: '#070b1d', strokeThickness: 10, scale: false }).setDepth(DEPTH.toast);
    [3, 2, 1].forEach((n, i) =>
      this.time.delayedCall(i * 800, () => {
        big.setText(String(n)).setScale(1.4);
        this.tweens.add({ targets: big, scale: 1, duration: 300 });
        Sfx.play('beep');
      })
    );
    this.time.delayedCall(2400, () => {
      big.destroy();
      this.setControls(true);
      this.state = 'fly';
      this.flame.setVisible(true);
      Sfx.play('ignition');
      Sfx.rumble({ freq: 50, vol: 0.25 });
      Speech.say(this.T('liftoff', 'Liftoff!'));
      toast(this, this.T('liftoff', 'Liftoff!'), { x: RX, y: 210, color: COLORS.orange, sound: false, duration: 1400 });
    });
  }

  // how far over the rocket should be tipped at this height (degrees from straight up)
  guideTilt() {
    return clamp(this.alt / ORBIT, 0, 1) * 70;
  }

  dropStage() {
    if (this.state !== 'fly' || this.waitStage < 0) return;
    const late = (this.time.now - this.waitStage) / 1000;
    this.stagingScores.push(clamp(100 - Math.max(0, late - 0.6) * 30, 0, 100));
    this.waitStage = -1;
    this.stageLights[this.stage].setFillStyle(COLORS.green);
    Sfx.play('hit');
    if (!this.reducedMotion) cameraShake(this, 200, 0.006);
    // the empty stage falls away
    const spent = this.add.rectangle(RX, RY + 20, 40, 90, 0xd9dee8).setDepth(3).setAngle(this.tilt);
    this.tweens.add({ targets: spent, y: RY + 380, x: RX - 60, angle: this.tilt - 40, alpha: 0, duration: 1600, onComplete: () => spent.destroy() });
    this.stage++;
    this.fuel = 1;
    this.stageBtn.stopPulse();
    if (this.stage < this.burns.length) {
      this.flame.setVisible(true);
      Sfx.play('ignition');
    }
  }

  update(time, delta) {
    if (this.state !== 'fly') return;
    const dt = Math.min(0.05, delta / 1000);
    this.flying += dt;
    // steering
    let s = this.steer;
    if (this.keys) s += (this.keys.RIGHT.isDown || this.keys.D.isDown ? 1 : 0) - (this.keys.LEFT.isDown || this.keys.A.isDown ? 1 : 0);
    // a little wind nudges the rocket, so it needs steering
    const wind = Math.sin(this.flying * 0.9) * 4 + Math.sin(this.flying * 2.3) * 2;
    this.tilt = clamp(this.tilt + (clamp(s, -1, 1) * 32 + wind * (this.relaxed ? 0.5 : 1)) * dt, -20, 90);
    const target = this.guideTilt();
    const on = Math.abs(this.tilt - target) < (this.relaxed ? 12 : 8);
    if (on) this.onPath += dt;

    // thrust while a stage has fuel; too heavy a ship climbs slowly
    const burning = this.stage < this.burns.length && this.fuel > 0;
    if (burning) {
      this.fuel = Math.max(0, this.fuel - dt / this.burns[this.stage]);
      if (this.fuel === 0) {
        // this stage is empty: time to drop it
        this.flame.setVisible(false);
        this.waitStage = this.time.now;
        Speech.say(this.T('stageNow', 'Stage now!'));
        if (!this.reducedMotion) this.stageBtn.pulse();
        Sfx.play('alarm');
      }
    }
    // speed in km/h: a full-power stage adds about 1,000 km/h every second
    const power = burning ? Math.min(1.25, this.ratio) : 0;
    const accel = burning ? 1000 * power - (power < 1 ? 350 : 0) : -150;
    this.speed = clamp(this.speed + accel * (on ? 1 : 0.8) * dt, 0, 30000);
    this.alt = Math.max(0, this.alt + (this.speed / 3600) * dt * 1.8 * Math.cos((this.tilt * Math.PI) / 360));

    // a ship heavier than the rocket can carry stalls: Mission Control adds a booster
    if (this.ratio < 1 && !this.helped && (this.alt > ORBIT * 0.45 || this.flying > 14)) {
      this.helped = true;
      Speech.say(this.T('tooHeavyLine', ''));
      toast(this, this.T('tooHeavyLine', ''), { x: RX, y: 150, color: COLORS.orange, sound: false, duration: 4500, wrap: 700 });
      this.ratio = 1.1;
    }

    this.draw(target, on);
    if (this.stage >= this.burns.length && this.alt >= ORBIT * 0.98) this.finish();
    else if (this.stage >= this.burns.length) this.alt += dt * 12; // coasting up the last bit
  }

  draw(target, on) {
    const k = clamp(this.alt / ORBIT, 0, 1);
    this.skyRect.setFillStyle(lerpColor(0x6a8fd8, 0x03050f, Math.min(1, k * 1.6)));
    this.starLayer.setAlpha(clamp((k - 0.35) * 2, 0, 1));
    // the ground and clouds slide away underneath
    this.ground.y = Math.min(900, this.alt * 30);
    this.clouds.forEach((c) => {
      c.y += Math.min(14, this.speed / 900);
      if (c.y > H + 120) {
        c.y = -120;
        c.x = Math.random() * W;
      }
      c.setAlpha(0.8 * (1 - k * 1.5));
    });
    this.rocket.setAngle(this.tilt);
    this.flame.setPosition(RX - Math.sin((this.tilt * Math.PI) / 180) * 2, RY).setAngle(this.tilt).setScale(0.45 + Math.random() * 0.1, 0.7 + Math.random() * 0.2);
    // the guide: a ghost rocket outline pointing where it should go
    const g = this.ghost;
    g.clear();
    const a = (target * Math.PI) / 180;
    g.lineStyle(4, on ? COLORS.green : COLORS.yellow, 0.8);
    g.lineBetween(RX, RY - 10, RX + Math.sin(a) * 300, RY - 10 - Math.cos(a) * 300);
    g.fillStyle(on ? COLORS.green : COLORS.yellow, 0.9);
    g.fillCircle(RX + Math.sin(a) * 300, RY - 10 - Math.cos(a) * 300, 10);
    this.readouts();
  }

  readouts() {
    this.altText.setText(`${this.L.altitude || 'Height'}: ${Math.round(this.alt)} km`);
    this.speedText.setText(`${this.L.speed || 'Speed'}: ${Math.round(this.speed).toLocaleString('en-US')} km/h`);
    this.pathBar.set(this.flying ? this.onPath / this.flying : 0, true);
    this.fuelBar.set(this.stage < this.burns.length ? this.fuel : 0, true);
    if (this.stage < this.burns.length) this.stageLights[this.stage].setFillStyle(this.waitStage >= 0 ? COLORS.red : COLORS.yellow);
  }

  finish() {
    this.state = 'done';
    Sfx.stopLoops();
    this.flame.setVisible(false);
    this.ghost.clear();
    this.setControls(false);
    this.launchBtn.setVisible(false);
    const path = this.flying ? (this.onPath / this.flying) * 100 : 0;
    const staging = this.stagingScores.length ? this.stagingScores.reduce((a, b) => a + b, 0) / this.stagingScores.length : 100;
    const skill = path * 0.65 + staging * 0.35;
    const axis = rate(Lab.design()).axes.launch;
    let score = skill * 0.5 + axis * 0.5;
    if (this.helped) score = Math.min(score, 45);
    Speech.say(this.T('orbitLine', ''));
    this.guide.say(this.T('orbitLine', ''), { modal: true }).then(() => endStep(this, 'flight', 'launch', score, WATCH));
  }
}
