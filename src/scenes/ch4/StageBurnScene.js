import Phaser from 'phaser';
import { W, H, FULL, COLORS, CSS, DEPTH, clamp, lerpColor } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame, starsFor, GoalBar, idleHint } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { toast, cameraShake, roundBox } from '../../ui/widgets.js';

// Hold BURN to fire the engines and let go when the speed bar is in the green zone.
// On the second stage the centre engine shuts down early (as it really did on Apollo 13),
// so the other engines have to burn for longer.
const MX = 1030, MY = 214, MW = 80, MH = 370; // speed meter
const ROCKET_X = 470, ROCKET_Y = 330;

export class StageBurnScene extends BaseScene {
  constructor() {
    super('StageBurn');
  }

  create() {
    this.setupStage({ bg: 0x0b1840 });
    this.state = 'intro';
    this.engineOutHappened = false;
    this.stage = 0;
    this.mistakes = 0;
    this.holding = false;
    this.rumble = null;

    // sky turning black with height
    this.skyG = this.add.graphics();
    this.drawSky(0);
    this.stars = this.add.tileSprite(W / 2, H / 2, FULL.w, FULL.h, 'starsTile').setAlpha(0);
    // the rocket (tilted over: it is flying sideways to reach orbit speed)
    this.rocket = this.add.container(ROCKET_X, ROCKET_Y).setAngle(62).setDepth(2);
    this.body = img(this, 0, 0, 'saturnV', 0.62).setOrigin(0.5, 0);
    this.cropTo(0.636);
    this.flames = [];
    this.flameBox = this.add.container(0, 0);
    this.rocket.add([this.flameBox, this.body]);
    this.rocket.y -= this.body.displayHeight * 0.3;
    this.trail = this.add.particles(0, 0, 'smoke', { speed: { min: 30, max: 80 }, angle: { min: 140, max: 160 }, lifespan: 1300, scale: { start: 0.25, end: 1.2 }, alpha: { start: 0.45, end: 0 }, frequency: 50, emitting: false }).setDepth(1);

    // engine lights
    this.engineG = this.add.graphics().setDepth(DEPTH.ui);
    this.engineLabel = txt(this, 60, 186, this.T('enginesLabel', 'Engines'), { size: 16, weight: 800, color: CSS.cyan, scale: false }).setDepth(DEPTH.ui);
    this.goal = new GoalBar(this);

    // speed meter
    const mg = roundBox(this, MX - 130, MY - 46, MW + 180, MH + 92, { fill: 0x0b1230, radius: 18 }).setDepth(DEPTH.ui - 1);
    txt(this, MX + MW / 2, MY - 24, this.T('speedLabel', 'Speed'), { size: 20, weight: 800, color: CSS.cyan, origin: 0.5, scale: false }).setDepth(DEPTH.ui);
    this.meterG = this.add.graphics().setDepth(DEPTH.ui);
    this.needle = this.add.triangle(0, 0, 0, 0, 24, -13, 24, 13, COLORS.yellow).setDepth(DEPTH.ui + 1);
    this.zoneText = txt(this, MX - 14, 0, this.T('targetLabel', 'Let go here!'), { size: 17, weight: 800, color: CSS.green, origin: [1, 0.5], align: 'right', wrap: 100, scale: false }).setDepth(DEPTH.ui);
    this.feedback = txt(this, W / 2 - 100, 548, '', { size: 28, weight: 800, origin: 0.5, align: 'center', wrap: 640, scale: false, stroke: '#070b1d', strokeThickness: 6 }).setDepth(DEPTH.toast);

    // the BURN button: hold it down
    this.burnBtn = new Button(this, W / 2 - 100, 640, { width: 320, height: 84, size: 34, label: this.T('burnLabel', 'BURN'), icon: 'up', variant: 'warn', sound: null });
    this.burnBtn.off('pointerup');
    this.burnBtn.on('pointerdown', () => this.setHold(true));
    this.input.on('pointerup', () => {
      this.burnBtn.setScale(1);
      this.setHold(false);
    });
    this.burnBtn.activate = () => this.setHold(!this.holding); // keyboard: ENTER toggles
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.setHold(true));
      this.input.keyboard.on('keyup-SPACE', () => this.setHold(false));
    }

    this.setupStageData(0);
    idleHint(this, () => (this.state === 'burn' && !this.holding ? { x: this.burnBtn.x, y: this.burnBtn.y - 46 } : null), { delay: 5000 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'burn';
      this.goal.set(this.T('task', { title: 'Hold BURN!', help: 'Let go when the speed bar reaches the green zone.' }), { count: this.stageName });
    });
  }

  cropTo(frac) {
    const f = this.body.frame;
    this.body.setCrop(0, 0, f.width, f.height * frac);
    this.cropFrac = frac;
  }

  drawSky(t) {
    const top = lerpColor(0x1c3f8a, 0x02040d, t), bottom = lerpColor(0x6ea8e8, 0x0b1033, t);
    this.skyG.clear();
    this.skyG.fillGradientStyle(top, top, bottom, bottom, 1);
    this.skyG.fillRect(FULL.x, FULL.y, FULL.w, FULL.h);
  }

  setupStageData(i) {
    const st = this.T('stages', [])[i] || {};
    this.stage = i;
    this.engines = st.engines ?? 1;
    this.engineOutDone = !st.engineOut;
    this.speed = 0;
    this.burnTime = 0;
    // green zone and the planned cutoff (where it would have ended with all engines working)
    this.zone = i === 0 ? [0.74, 0.84] : [0.76, 0.85];
    this.zone = this.relaxed ? [this.zone[0] - 0.03, this.zone[1] + 0.03] : this.zone;
    this.accel = (i === 0 ? 0.13 : 0.12) * (this.relaxed ? 0.8 : 1);
    this.stageName = st.name || '';
    if (i > 0) this.goal.setCount(this.stageName);
    // flames: one per engine
    this.flameBox.removeAll(true);
    const bottom = this.body.displayHeight * this.cropFrac;
    const n = this.engines;
    const spread = Math.min(this.body.displayWidth * 0.7, 30);
    this.flames = [];
    for (let k = 0; k < n; k++) {
      const x = n === 1 ? 0 : k === 0 ? 0 : (k <= 2 ? -1 : 1) * spread * (k % 2 ? 0.55 : 0.25);
      const f = this.add.image(x, bottom - 4, 'flame').setOrigin(0.5, 0).setScale(0.32, 0.5).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
      this.flameBox.add(f);
      this.flames.push(f);
    }
    this.drawMeter();
    this.drawEngines();
  }

  drawEngines() {
    const g = this.engineG;
    g.clear();
    const n = this.T('stages', [])[this.stage]?.engines ?? 1;
    for (let k = 0; k < n; k++) {
      const out = k === 0 && this.engineOutDone && n === 5 && this.stage === 0 && this.engineOutHappened;
      const x = 74 + k * 34, y = 224;
      g.fillStyle(0x000000, 0.4);
      g.fillCircle(x, y + 2, 13);
      g.fillStyle(out ? 0x3a3f4b : this.holding ? COLORS.orange : 0x6b7290, 1);
      g.fillCircle(x, y, 12);
      if (out) {
        g.lineStyle(3, COLORS.red, 1);
        g.lineBetween(x - 8, y - 8, x + 8, y + 8);
        g.lineBetween(x + 8, y - 8, x - 8, y + 8);
      }
    }
  }

  drawMeter() {
    const g = this.meterG;
    g.clear();
    g.fillStyle(0x1b2348, 1);
    g.fillRoundedRect(MX, MY, MW, MH, 14);
    const yOf = (v) => MY + MH - v * MH;
    g.fillStyle(COLORS.green, 0.9);
    g.fillRect(MX, yOf(this.zone[1]), MW, (this.zone[1] - this.zone[0]) * MH);
    // speed so far (turns green inside the zone)
    const inZone = this.speed >= this.zone[0];
    g.fillStyle(inZone ? 0xb6ffd9 : COLORS.cyan, 0.75);
    g.fillRect(MX + 10, yOf(this.speed), MW - 20, this.speed * MH);
    g.lineStyle(3, 0xffffff, 0.4);
    g.strokeRoundedRect(MX, MY, MW, MH, 14);
    this.needle.setPosition(MX + MW + 14, yOf(this.speed));
    this.zoneText.setY(yOf((this.zone[0] + this.zone[1]) / 2));
  }

  setHold(on) {
    if (this.state !== 'burn') on = false;
    if (on === this.holding) return;
    this.holding = on;
    this.flames.forEach((f, k) => f.setVisible(on && !(k === 0 && this.engineOutHappened && this.stage === 0)));
    this.trail.emitting = on;
    if (on) {
      if (!this.rumble) this.rumble = Sfx.rumble({ freq: 60, vol: 0.18 });
      this.rumble.set(0.8);
    } else if (this.rumble) this.rumble.set(0);
    this.drawEngines();
    if (!on && this.state === 'burn') this.released();
  }

  released() {
    if (this.speed <= 0.02) return;
    if (this.speed < this.zone[0]) {
      this.mistakes++;
      this.flash(this.T('tooSoon', 'Not fast enough yet! Hold BURN again.'), CSS.orange);
      Sfx.play('error');
      return;
    }
    // let go inside the green zone
    this.stageDone();
  }

  flash(text, color) {
    Speech.say(text);
    this.feedback.setText(text).setColor(color).setAlpha(1).setScale(0.85);
    this.tweens.killTweensOf(this.feedback);
    this.tweens.add({ targets: this.feedback, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.feedback, alpha: 0, duration: 400, delay: 1600 });
  }

  async engineOut() {
    this.engineOutHappened = true;
    this.engineOutDone = true;
    this.state = 'event';
    this.setHold(false);
    Sfx.play('alarm');
    cameraShake(this, 300, 0.008);
    this.drawEngines();
    const r = await this.guide.say(this.T('engineOut', 'The centre engine shut down early!'), { modal: true, position: 'top' });
    if (r === null) return;
    this.state = 'burn';
  }

  async stageDone() {
    this.state = 'event';
    this.setHold(false);
    Sfx.play('success');
    if (this.stage === 0) {
      // the second stage falls away and the third stage takes over
      const lower = img(this, 0, 0, 'saturnV', 0.62).setOrigin(0.5, 0);
      const f = lower.frame;
      lower.setCrop(0, f.height * 0.408, f.width, f.height * (0.636 - 0.408));
      this.rocket.addAt(lower, 1);
      this.cropTo(0.408);
      Sfx.play('whoosh');
      this.tweens.add({ targets: lower, y: 140, angle: -15, alpha: 0, duration: 1600, ease: 'Quad.easeIn', onComplete: () => lower.destroy() });
      const r = await this.guide.say(this.T('stage2Done', ''), { modal: true, position: 'top' });
      if (r === null) return;
      await this.guide.say(this.T('stage3Intro', ''), { modal: true, position: 'top' });
      this.setupStageData(1);
      this.state = 'burn';
    } else {
      this.state = 'won';
      Sfx.play('bigSuccess');
      const r = await this.guide.say(this.T('stage3Done', ''), { modal: true, position: 'top' });
      if (r === null) return;
      finishGame(this, { stars: starsFor(this.mistakes, 0, 2) });
    }
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    const climb = clamp((this.stage + this.speed) / 2, 0, 1);
    this.drawSky(0.45 + climb * 0.55);
    this.stars.setAlpha(0.2 + climb * 0.8);
    this.stars.tilePositionX += (this.holding ? 70 : 20) * dt;
    this.stars.tilePositionY -= (this.holding ? 30 : 8) * dt;
    this.rocket.x = ROCKET_X + Math.sin(time / 90) * (this.holding ? 1.5 : 0.4);
    // exhaust trail from the engines (the bottom of the rocket, turned with it)
    const a = Phaser.Math.DegToRad(this.rocket.angle);
    const len = this.body.displayHeight * this.cropFrac;
    this.trail.setPosition(this.rocket.x - Math.sin(a) * len, this.rocket.y + Math.cos(a) * len);
    if (this.holding) this.flames.forEach((f) => f.setScale(0.32 + Math.random() * 0.06, 0.5 + Math.random() * 0.15));

    if (this.state !== 'burn') return;
    if (this.holding) {
      // fewer engines: slower speed-up
      const working = this.stage === 0 && this.engineOutHappened ? 0.72 : 1;
      this.speed += this.accel * working * dt;
      this.burnTime += dt;
      if (this.stage === 0 && !this.engineOutDone && this.speed >= 0.42) this.engineOut();
      if (this.speed > this.zone[1]) {
        // engines cut off a bit late
        this.mistakes++;
        this.speed = this.zone[1];
        this.flash(this.T('over', 'A little too fast!'), CSS.orange);
        this.stageDone();
      }
    } else if (this.speed > 0) {
      this.speed = Math.max(0, this.speed - 0.01 * dt); // gravity slowly takes a little back
    }
    this.drawMeter();
  }

  onShutdown() {
    if (this.rumble) this.rumble.stop();
  }
}
