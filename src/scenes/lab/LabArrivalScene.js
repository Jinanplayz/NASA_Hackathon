import Phaser from 'phaser';
import { W, H, FULL, COLORS, CSS, DEPTH, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, GoalBar, idleHint } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { RoundBox, ProgressBar, cameraShake, floatText } from '../../ui/widgets.js';
import { Lab, rate } from './labState.js';
import { shipImage, endStep } from './labKit.js';

// Test Your Knowledge, flight 3: arriving. What happens depends on where the ship is going:
//   Moon: a powered landing on the flat spot (needs landing legs).
//   Mars: three steps: keep the heat shield forward, open the parachute at the right moment,
//         then touch down with the sky crane, airbags or legs.
//   Jupiter: fire the engine at the right moment to be captured into orbit, not fly past.
// Missing parts are explained, and the step is skipped with a lower score.
const WATCH = ['noLegs', 'chutesMoon', 'noShieldMars', 'noChutesMars', 'noTouchdown', 'noFuelOrbit', 'noVault', 'noLandJupiter', 'airbagsCrew'];

export class LabArrivalScene extends BaseScene {
  constructor() {
    super('LabArrival');
  }

  create() {
    // (Phaser reuses this scene object on every visit, so start from a clean slate)
    this.finished = false;
    this.playedAny = false; // did any part of the landing get played (not just skipped)?
    this.steerBtns = null;
    this.wg = null;
    this.cutWait = 0;
    Lab.ensureShip();
    const d = Lab.design();
    this.d = d;
    this.m = d.mission;
    this.setupStage({ bg: this.m === 'mars' ? 0x2a1208 : 0x03050f, music: 'tension' });
    this.state = 'intro';
    this.scores = [];
    this.L = this.T('labels', {});
    this.has = (id) => [...d.entry, ...d.support, ...d.extras].includes(id);
    this.goal = new GoalBar(this);
    this.held = false;
    this.side = 0;
    // hold-to-use button (thrust / burn / lower) and its keyboard key
    // (above the scenery, which is drawn after these)
    this.holdBtn = new Button(this, 1060, 640, { width: 300, height: 70, size: 24, icon: 'up', label: '', variant: 'warn' }).setVisible(false).setDepth(DEPTH.ui);
    this.holdBtn.on('pointerdown', () => (this.held = true));
    this.holdBtn.on('pointerup', () => (this.held = false));
    this.holdBtn.on('pointerout', () => (this.held = false));
    this.holdBtn.opts.onClick = null;
    this.tapBtn = new Button(this, 1060, 640, { width: 300, height: 70, size: 24, icon: 'check', label: '', variant: 'success', onClick: () => this.tap() }).setVisible(false).setDepth(DEPTH.ui);
    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys('LEFT,RIGHT,A,D,SPACE,UP');
      this.input.keyboard.on('keydown-ENTER', () => this.tapBtn.visible && this.tap());
    }
    idleHint(this, () => {
      if (this.tapBtn.visible && this.wantTap) return { x: this.tapBtn.x, y: this.tapBtn.y - 44 };
      return null;
    }, { delay: 3000 });

    if (this.m === 'moon') this.moonSetup();
    else if (this.m === 'mars') this.marsSetup();
    else this.jupiterSetup();
    playIntro(this, `${this.m}Intro`).then((ok) => {
      if (!ok) return;
      this.begin();
    });
  }

  holding() {
    return this.held || (this.keys && (this.keys.SPACE.isDown || this.keys.UP.isDown));
  }
  steering() {
    if (!this.keys) return this.side;
    return clamp(this.side + (this.keys.RIGHT.isDown || this.keys.D.isDown ? 1 : 0) - (this.keys.LEFT.isDown || this.keys.A.isDown ? 1 : 0), -1, 1);
  }
  showHold(label, icon = 'up') {
    this.tapBtn.setVisible(false);
    this.holdBtn.setLabel(label).setVisible(true);
    this.holdBtn.opts.icon = icon;
    this.holdBtn.redraw();
  }
  showTap(label, icon = 'check') {
    this.holdBtn.setVisible(false);
    this.held = false;
    this.tapBtn.setLabel(label).setEnabled(true).setVisible(true);
    this.tapBtn.opts.icon = icon;
    this.tapBtn.redraw();
    this.wantTap = true;
    if (!this.reducedMotion) this.tapBtn.pulse();
  }
  hideButtons() {
    this.holdBtn.setVisible(false);
    this.tapBtn.stopPulse().setVisible(false);
    this.held = false;
    this.wantTap = false;
  }
  // a pair of steering buttons (moon landing, heat shield)
  steerButtons(on) {
    if (!this.steerBtns) {
      this.steerBtns = [-1, 1].map((s) => {
        const b = new Button(this, s < 0 ? 640 : 780, 640, { width: 120, height: 70, icon: s < 0 ? 'back' : 'next', label: '', variant: 'primary' }).setDepth(DEPTH.ui);
        b.on('pointerdown', () => (this.side = s));
        b.on('pointerup', () => (this.side = 0));
        b.on('pointerout', () => (this.side = 0));
        b.opts.onClick = null;
        return b;
      });
    }
    this.steerBtns.forEach((b) => b.setVisible(on));
  }

  // the task bar for this phase (from the "tasks" block)
  setTask(id) {
    this.playedAny = true; // every phase the player plays sets its task
    const t = (this.T('tasks', {}) || {})[id];
    if (t) this.goal.set(t);
  }

  // a missing part: explain it, and move on with a low score
  skip(lineKey, score) {
    this.state = 'skip';
    this.hideButtons();
    this.steerButtons(false);
    this.scores.push(score);
    return this.guide.say(this.T(lineKey, ''), { modal: true });
  }

  // ===================== Moon: powered landing =====================
  moonSetup() {
    starfield(this, { count: 140 });
    img(this, 1100, 150, 'earthSmall', 0.5);
    this.groundY = 560;
    const g = this.add.graphics();
    g.fillStyle(0x8d919c, 1);
    g.fillRect(FULL.x, this.groundY, FULL.w, 400);
    g.fillStyle(0x6f737d, 1);
    [[120, 18], [330, 26], [760, 22], [1000, 30], [1180, 16]].forEach(([x, r]) => g.fillEllipse(x, this.groundY + 30, r * 3, r));
    this.padX = 560 + Math.random() * 220;
    g.fillStyle(0xb8bcc6, 1);
    g.fillRect(this.padX - 70, this.groundY - 4, 140, 8);
    this.padLights = [-70, 70].map((dx) => this.add.circle(this.padX + dx, this.groundY - 8, 6, COLORS.green));
    this.lander = shipImage(this, 360, 150, 0.36).setDepth(5);
    this.flame = this.add.image(0, 0, 'flame').setOrigin(0.5, 0).setScale(0.3, 0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(4).setVisible(false);
    this.readout = txt(this, 40, 186, '', { size: 18, weight: 800, scale: false, lineSpacing: 6 }).setDepth(DEPTH.ui);
    this.fuel = 1;
    this.fuelBar = new ProgressBar(this, 40, 270, 220, 18, { color: COLORS.orange });
    this.vx = 40;
    this.vy = 0;
  }

  // ===================== Mars: entry, parachute, touchdown =====================
  marsSetup() {
    this.add.rectangle(W / 2, H / 2, FULL.w, FULL.h, 0x120a10);
    starfield(this, { count: 80 });
    this.limb = img(this, W / 2, 1140, 'mars', 4.2);
    this.marsSky = this.add.rectangle(W / 2, H / 2, FULL.w, FULL.h, 0xd08a5a, 0);
    this.groundY = 600;
    this.ground = this.add.graphics();
    this.ground.fillStyle(0x8a4424, 1);
    this.ground.fillRect(FULL.x, this.groundY, FULL.w, 400);
    this.ground.setVisible(false);
    this.capsule = this.add.container(560, 330).setDepth(5);
    this.plasma = this.add.image(0, 0, 'softDot').setDisplaySize(260, 260).setTint(0xff7a30).setAlpha(0);
    // robots ride down inside a capsule; a crew capsule is a capsule already
    this.entryImg = this.d.body === 'crewCapsule' ? shipImage(this, 0, 0, 0.5) : img(this, 0, 0, 'backshell', 1.4);
    this.capsule.add([this.plasma, this.entryImg]);
    this.arrow = this.add.graphics().setDepth(6);
    this.meter = new ProgressBar(this, 40, 220, 280, 22, { color: COLORS.orange });
    this.meterLabel = txt(this, 40, 190, '', { size: 18, weight: 800, scale: false }).setDepth(DEPTH.ui);
  }

  // ===================== Jupiter: orbit insertion =====================
  jupiterSetup() {
    starfield(this, { count: 160 });
    this.jx = 900;
    this.jy = 400;
    this.add.image(this.jx, this.jy, 'softDot').setDisplaySize(620, 620).setTint(0xffc890).setAlpha(0.25);
    img(this, this.jx, this.jy, 'jupiterBig', 0.62);
    // the radiation belt
    const belt = this.add.graphics();
    belt.lineStyle(26, 0xb15cff, 0.18);
    belt.strokeEllipse(this.jx, this.jy, 640, 300);
    this.probe = shipImage(this, 100, 160, 0.28).setDepth(5);
    this.flame = this.add.image(0, 0, 'flame').setOrigin(0.5, 0).setScale(0.22, 0.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(4).setVisible(false);
    this.add.existing(new RoundBox(this)).draw(30, 176, 330, 210, { fill: 0x0b1230, alpha: 0.9, radius: 18, stroke: COLORS.stroke, strokeWidth: 3 }).setDepth(DEPTH.ui - 1);
    txt(this, 52, 192, this.L.speed || 'Speed', { size: 16, weight: 800, color: CSS.cyan, scale: false }).setDepth(DEPTH.ui);
    this.speedG = this.add.graphics().setDepth(DEPTH.ui);
    txt(this, 52, 262, this.L.green || 'Green zone: captured', { size: 14, weight: 700, color: CSS.green, scale: false }).setDepth(DEPTH.ui);
    txt(this, 52, 290, this.L.radiation || 'Radiation', { size: 16, weight: 800, color: CSS.purple, scale: false }).setDepth(DEPTH.ui);
    this.radBar = new ProgressBar(this, 52, 316, 286, 16, { color: COLORS.purple });
    txt(this, 52, 340, this.L.fuel || 'Fuel', { size: 16, weight: 800, color: CSS.orange, scale: false }).setDepth(DEPTH.ui);
    this.fuelBar = new ProgressBar(this, 52, 364, 286, 12, { color: COLORS.orange });
    this.tries = 0;
  }

  begin() {
    if (this.m === 'moon') {
      if (!this.has('landingLegs')) {
        // nothing to land with: it maps the surface from orbit instead
        this.tweens.add({ targets: this.lander, x: 1100, duration: 4000 });
        return this.skip('noLegs', 30).then(() => this.finish());
      }
      this.state = 'land';
      this.setTask('moon');
      this.showHold(this.L.thrust || 'Thrust');
      this.steerButtons(true);
    } else if (this.m === 'mars') {
      if (!this.has('heatShield')) return this.skip('noShield', 15).then(() => this.finish());
      this.entryStart();
    } else {
      this.jupiterStart();
    }
  }

  tap() {
    if (!this.tapBtn.visible || !this.wantTap) return;
    this.wantTap = false;
    this.tapBtn.stopPulse().setEnabled(false);
    if (this.state === 'chute') this.openChute();
    else if (this.state === 'airbags') this.inflate();
    else if (this.state === 'crane') this.cutCables();
  }

  // ---------- Moon ----------
  moonUpdate(dt) {
    const s = this.steering();
    const thrust = this.holding() && this.fuel > 0;
    this.vy += (26 - (thrust ? 62 : 0)) * dt;
    this.vx += s * 38 * dt;
    if ((thrust || s) && this.fuel > 0) this.fuel = Math.max(0, this.fuel - dt * (thrust ? 0.06 : 0.03) * (this.relaxed ? 0.7 : 1));
    this.lander.x = clamp(this.lander.x + this.vx * dt, 60, W - 60);
    this.lander.y += this.vy * dt;
    this.flame.setVisible(thrust).setPosition(this.lander.x, this.lander.y + 36).setScale(0.28, 0.32 + Math.random() * 0.12);
    this.fuelBar.set(this.fuel, true);
    const down = this.vy / 15, side = this.vx / 15;
    const safe = this.relaxed ? 3.5 : 2.5;
    this.readout.setText(`${this.L.speed || 'Speed'}: ${down.toFixed(1)} m/s ${Math.abs(down) <= safe ? '✓' : '!'}\n${this.L.height || 'Height'}: ${Math.max(0, Math.round((this.groundY - 40 - this.lander.y) / 4))} m`).setColor(Math.abs(down) <= safe ? CSS.green : CSS.orange);
    if (this.lander.y >= this.groundY - 40) {
      this.lander.y = this.groundY - 40;
      this.flame.setVisible(false);
      const onPad = Math.abs(this.lander.x - this.padX) < 70;
      const soft = Math.max(0, 1 - Math.max(0, down - safe) / 4);
      const level = Math.max(0, 1 - Math.max(0, Math.abs(side) - 1.5) / 3);
      const score = (soft * 0.55 + level * 0.15 + (onPad ? 0.3 : 0.05)) * 100;
      Sfx.play(score > 60 ? 'bigSuccess' : 'hit');
      if (score < 50 && !this.reducedMotion) cameraShake(this, 300, 0.01);
      this.state = 'done';
      this.hideButtons();
      this.steerButtons(false);
      this.scores.push(score);
      Speech.say(this.T('landed', ''));
      floatText(this, this.lander.x, this.lander.y - 60, this.T('landed', 'Touchdown!'), CSS.green, 30);
      this.time.delayedCall(1500, () => this.finish());
    }
  }

  // ---------- Mars ----------
  entryStart() {
    this.state = 'entry';
    this.setTask('entry');
    this.et = 0;
    this.good = 0;
    this.angle = 40;
    this.meterLabel.setText(this.L.heat || 'Heat');
    this.steerButtons(true);
  }

  entryUpdate(dt) {
    this.et += dt;
    // the air pushes the capsule around; keep the shield (its bottom) facing the way it falls
    const push = Math.sin(this.et * 1.3) * 22 + Math.sin(this.et * 3.1) * 8;
    this.angle = clamp(this.angle + (this.steering() * 60 + push * (this.relaxed ? 0.5 : 1)) * dt, -90, 90);
    this.capsule.setAngle(this.angle);
    const ok = Math.abs(this.angle) < (this.relaxed ? 22 : 15);
    if (ok) this.good += dt;
    this.plasma.setAlpha(0.35 + Math.sin(this.et * 20) * 0.1);
    this.meter.set(Math.min(1, this.et / 12), true);
    const g = this.arrow;
    g.clear();
    g.lineStyle(4, ok ? COLORS.green : COLORS.red, 0.9);
    g.lineBetween(560, 150, 560, 230);
    g.fillStyle(ok ? COLORS.green : COLORS.red, 0.9);
    g.fillTriangle(560, 250, 548, 228, 572, 228);
    if (this.et >= 12) {
      this.scores.push((this.good / 12) * 100);
      g.clear();
      this.steerButtons(false);
      this.tweens.add({ targets: this.plasma, alpha: 0, duration: 600 });
      this.capsule.setAngle(0);
      this.chuteStart();
    }
  }

  chuteStart() {
    this.meterLabel.setText(this.L.speed || 'Speed');
    this.ground.setVisible(true);
    this.tweens.add({ targets: this.limb, alpha: 0, duration: 1200 });
    this.tweens.add({ targets: this.marsSky, fillAlpha: 0.9, duration: 1500 });
    this.speed = 1;
    this.window = [0.38, 0.55];
    this.wg = this.wg || this.add.graphics().setDepth(DEPTH.ui);
    this.wg.clear();
    this.wg.fillStyle(COLORS.green, 0.6);
    this.wg.fillRect(40 + 280 * this.window[0], 214, 280 * (this.window[1] - this.window[0]), 34);
    if (!this.has('parachutes')) return this.skip('noChute', 20).then(() => this.touchStart());
    this.state = 'chute';
    this.setTask('chute');
    this.showTap(this.L.chute || 'Parachute', 'up');
  }

  chuteUpdate(dt) {
    this.speed = Math.max(0, this.speed - dt * 0.09 * (this.relaxed ? 0.8 : 1));
    this.meter.set(this.speed, true);
    this.capsule.y = Math.min(this.capsule.y + dt * 10, 400);
    if (this.speed <= 0.1 && this.state === 'chute') {
      // too late
      this.wantTap = false;
      this.openChute();
    }
  }

  openChute() {
    const inWin = this.speed >= this.window[0] && this.speed <= this.window[1];
    const score = inWin ? 100 : Math.max(20, 100 - Math.min(Math.abs(this.speed - this.window[0]), Math.abs(this.speed - this.window[1])) * 260);
    this.scores.push(score);
    this.hideButtons();
    Sfx.play('whoosh');
    const chute = img(this, 0, -120, 'marsChute', 0.6).setScale(0.05);
    this.capsule.add(chute);
    this.tweens.add({ targets: chute, scale: 0.6 / 2, duration: 600, ease: 'Back.easeOut' });
    Speech.say(this.T('chuteNow', ''));
    this.state = 'wait';
    this.time.delayedCall(1800, () => this.touchStart());
  }

  touchStart() {
    this.hideButtons();
    const system = this.has('skyCrane') ? 'crane' : this.has('airbags') ? 'airbags' : this.has('landingLegs') ? 'legs' : null;
    this.system = system;
    if (!system) {
      return this.skip('noTouchdown', 20).then(() => {
        this.tweens.add({ targets: this.capsule, y: this.groundY - 40, duration: 900, ease: 'Quad.easeIn', onComplete: () => this.finish() });
      });
    }
    this.h = 1;
    this.meterLabel.setText(this.L.height || 'Height');
    this.wg.clear();
    this.setTask(system);
    // out of the shell: the ship itself comes down now
    this.entryImg.destroy();
    this.entryImg = shipImage(this, 0, 0, 0.5);
    this.capsule.add(this.entryImg);
    if (system === 'crane') {
      this.state = 'crane';
      this.cable = this.add.graphics().setDepth(4);
      this.showHold(this.L.lower || 'Hold to lower', 'down');
      this.time.delayedCall(400, () => Speech.say(this.T('lowerNow', '')));
    } else if (system === 'airbags') {
      this.state = 'airbags';
      this.window = [0.18, 0.4];
      this.wg.fillStyle(COLORS.green, 0.6);
      this.wg.fillRect(40 + 280 * this.window[0], 214, 280 * (this.window[1] - this.window[0]), 34);
      this.showTap(this.L.inflate || 'Inflate airbags', 'star');
    } else {
      this.state = 'legs';
      this.vy = 30;
      this.showHold(this.L.thrust || 'Thrust');
    }
  }

  touchUpdate(dt) {
    if (this.state === 'crane') {
      // lower steadily; cut the cables right as the wheels touch
      if (this.holding()) this.h = Math.max(0, this.h - dt * 0.22);
      this.meter.set(this.h, true);
      const y = 300 + (1 - this.h) * (this.groundY - 340);
      this.capsule.y = y;
      this.cable.clear();
      this.cable.lineStyle(2, 0xffffff, 0.8);
      this.cable.lineBetween(this.capsule.x, 240, this.capsule.x, y - 20);
      if (this.h <= 0.04 && !this.wantTap) this.showTap(this.L.cut || 'Cut cables', 'close');
      if (this.wantTap) this.cutWait = (this.cutWait || 0) + dt;
      if (this.cutWait > 4) this.cutCables();
    } else if (this.state === 'airbags') {
      this.h = Math.max(0, this.h - dt * 0.12);
      this.meter.set(this.h, true);
      this.capsule.y = 300 + (1 - this.h) * (this.groundY - 340);
      if (this.h <= 0 && this.wantTap) this.inflate(true);
    } else if (this.state === 'legs') {
      if (this.holding()) this.vy -= 60 * dt;
      this.vy += 24 * dt;
      this.capsule.y += this.vy * dt;
      this.h = clamp(1 - (this.capsule.y - 300) / (this.groundY - 340), 0, 1);
      this.meter.set(this.h, true);
      if (this.capsule.y >= this.groundY - 40) {
        const soft = Math.max(0, 1 - Math.max(0, this.vy / 15 - 2.5) / 4);
        this.landed(soft * 100);
      }
    }
  }

  cutCables() {
    if (this.state !== 'crane') return;
    const score = clamp(100 - this.h * 400 - Math.max(0, (this.cutWait || 0) - 1.5) * 15, 30, 100);
    this.cable.clear();
    this.landed(score);
  }

  inflate(late = false) {
    if (this.state !== 'airbags') return;
    const inWin = !late && this.h >= this.window[0] && this.h <= this.window[1];
    const score = late ? 30 : inWin ? 100 : 60;
    Sfx.play('inflate');
    Speech.say(this.T('inflateNow', ''));
    const bag = this.add.circle(0, 0, 70, 0xf4f0e4, 0.85);
    this.capsule.addAt(bag, 0);
    this.state = 'bounce';
    this.hideButtons();
    // bounce to a stop
    this.tweens.add({
      targets: this.capsule,
      y: this.groundY - 70,
      duration: 700,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        bag.destroy();
        this.landed(score);
      }
    });
  }

  landed(score) {
    this.state = 'done';
    this.hideButtons();
    this.scores.push(score);
    this.capsule.y = Math.min(this.capsule.y, this.groundY - 40);
    Sfx.play(score > 60 ? 'bigSuccess' : 'hit');
    Speech.say(this.T('landed', ''));
    floatText(this, this.capsule.x, this.capsule.y - 80, this.T('landed', 'Touchdown!'), CSS.green, 30);
    this.time.delayedCall(1500, () => this.finish());
  }

  // ---------- Jupiter ----------
  jupiterStart() {
    this.state = 'approach';
    this.setTask('jupiter');
    this.jt = 0;
    this.speed = 1;
    this.rad = 0;
    this.fuel = this.has('extraFuel') ? 1 : 0.62;
    this.burnScore = null;
    this.showHold(this.L.burn || 'Hold to burn', 'down');
  }

  jupiterUpdate(dt) {
    this.jt += dt;
    // swing in towards Jupiter and around it (a curve the probe follows)
    const k = Math.min(1, this.jt / 14);
    const a = Math.PI * (1.15 + k * 1.1);
    const r = 380 - Math.sin(k * Math.PI) * 170 - (this.speed < 0.3 ? 60 : 0);
    const x = this.jx + Math.cos(a) * r * 1.4, y = this.jy + Math.sin(a) * r * 0.8;
    this.probe.setPosition(x, y);
    const burning = this.holding() && this.fuel > 0 && k > 0.25 && k < 0.85;
    if (burning) {
      this.speed = Math.max(0, this.speed - dt * 0.09);
      this.fuel = Math.max(0, this.fuel - dt * 0.12);
    }
    this.flame.setVisible(burning).setPosition(x + 14, y).setAngle(-90);
    // radiation builds up near Jupiter (less behind a radiation vault)
    const near = Math.max(0, 1 - (r - 210) / 170);
    this.rad = Math.min(1, this.rad + dt * near * 0.06 * (this.has('radiationVault') ? 0.35 : 1));
    this.radBar.set(this.rad, true);
    this.fuelBar.set(this.fuel, true);
    const g = this.speedG;
    g.clear();
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(52, 220, 286, 34, 10);
    g.fillStyle(COLORS.green, 0.55);
    g.fillRect(52 + 286 * 0.35, 220, 286 * 0.15, 34);
    g.fillStyle(0xffffff, 1);
    g.fillRect(52 + 286 * this.speed - 3, 214, 6, 46);
    if (k >= 1) this.jupiterEnd();
  }

  jupiterEnd() {
    this.hideButtons();
    this.flame.setVisible(false);
    const captured = this.speed >= 0.33 && this.speed <= 0.52;
    this.tries++;
    if (!captured && this.tries < 2) {
      // one more go: swing around and try again
      this.state = 'retry';
      Sfx.play('error');
      this.guide.say(this.T(this.speed > 0.52 ? 'flewPast' : 'tooLow', ''), { modal: true }).then(() => this.jupiterStart());
      return;
    }
    const acc = captured ? 100 : Math.max(20, 100 - Math.min(Math.abs(this.speed - 0.35), Math.abs(this.speed - 0.5)) * 300);
    this.scores.push(acc * (1 - this.rad * 0.5) - (this.tries > 1 ? 10 : 0));
    this.state = 'done';
    Sfx.play(captured ? 'bigSuccess' : 'hit');
    Speech.say(this.T('captured', ''));
    // settle into orbit
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 2600,
      onUpdate: (tw) => {
        const a = tw.getValue() * Math.PI * 2;
        this.probe.setPosition(this.jx + Math.cos(a) * 330, this.jy + Math.sin(a) * 170);
      },
      onComplete: () => this.finish()
    });
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    if (this.state === 'land') this.moonUpdate(dt);
    else if (this.state === 'entry') this.entryUpdate(dt);
    else if (this.state === 'chute') this.chuteUpdate(dt);
    else if (['crane', 'airbags', 'legs'].includes(this.state)) this.touchUpdate(dt);
    else if (this.state === 'approach') this.jupiterUpdate(dt);
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    const skill = this.scores.length ? this.scores.reduce((a, b) => a + b, 0) / this.scores.length : 30;
    const axis = rate(this.d).axes.arrival;
    endStep(this, 'flight', 'arrival', skill * 0.55 + axis * 0.45, WATCH, { none: !this.playedAny });
  }
}
