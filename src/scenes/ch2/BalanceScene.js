import Phaser from 'phaser';
import { W, FULL, COLORS, CSS, DEPTH, clamp } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { dialog, ProgressBar, roundBox } from '../../ui/widgets.js';

// Timing game: a marker slides along a bar. Tap when it is inside the green zone to
// fire a tiny thruster puff that pushes the drifting satellite back onto its orbit.
const BAR_X = 280, BAR_W = 720, BAR_Y = 574, BAR_H = 40;
const ORBIT_Y = 300, SAT_X = 560;
const MAX_DRIFT = 170;

export class BalanceScene extends BaseScene {
  constructor() {
    super('Balance');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 170 });
    this.goal = this.T('goal', 5);
    this.hitsDone = 0;
    this.misses = 0;
    this.drift = 0;
    this.driftDir = 1;
    this.markerT = 0;
    this.markerDir = 1;
    this.speed = this.relaxed ? 0.42 : 0.62; // bar-widths per second
    this.zoneW = this.relaxed ? 0.2 : 0.15;
    this.zoneX = 0.5;
    this.state = 'intro';
    this.cooldown = 0;

    // Earth below and the orbit line
    const g = this.add.graphics();
    g.fillStyle(0x7fc4ff, 0.18);
    g.fillCircle(W / 2, 2080, 1560);
    g.fillStyle(0x2f7fd8, 1);
    g.fillCircle(W / 2, 2080, 1540);
    g.fillStyle(0x3e9e57, 0.9);
    g.fillEllipse(420, 560, 300, 50);
    g.fillEllipse(980, 575, 260, 40);
    g.lineStyle(3, COLORS.green, 0.7);
    for (let x = FULL.x + 4; x < W - 180; x += 26) g.lineBetween(x, ORBIT_Y, x + 14, ORBIT_Y);
    txt(this, 60, ORBIT_Y - 26, this.T('orbitLabel', 'Correct orbit'), { size: 16, weight: 700, color: CSS.green, scale: false });

    // danger zones
    const dz = this.add.graphics();
    dz.fillStyle(COLORS.red, 0.08);
    dz.fillRect(FULL.x, ORBIT_Y - MAX_DRIFT - 40, W - 170 - FULL.x, 40);
    dz.fillRect(FULL.x, ORBIT_Y + MAX_DRIFT, W - 170 - FULL.x, 40);

    this.sat = img(this, SAT_X, ORBIT_Y, 'explorer1', 0.55).setAngle(90).setDepth(DEPTH.world + 2);
    this.puffs = this.add.particles(0, 0, 'softDot', {
      speed: { min: 80, max: 160 },
      lifespan: 600,
      scale: { start: 0.35, end: 0 },
      alpha: { start: 0.9, end: 0 },
      tint: 0xdff4ff,
      emitting: false
    }).setDepth(DEPTH.world + 3);

    // drift meter
    const mx = W - 110;
    roundBox(this, mx - 60, 110, 120, 380, { fill: 0x0b1230, radius: 18 });
    const mg = this.add.graphics();
    txt(this, mx, 130, this.T('driftLabel', 'Drift'), { size: 16, weight: 800, color: CSS.cyan, origin: 0.5, scale: false });
    mg.fillStyle(0x3a4470, 1);
    mg.fillRoundedRect(mx - 10, 160, 20, 300, 10);
    mg.fillStyle(COLORS.green, 0.9);
    mg.fillRect(mx - 10, 290, 20, 40);
    this.driftMarker = this.add.triangle(mx + 24, 310, 0, 0, 16, -9, 16, 9, COLORS.yellow).setDepth(DEPTH.ui);
    this.meterX = mx;

    // successes
    this.progress = new ProgressBar(this, BAR_X, 520, BAR_W, 16, { color: COLORS.yellow });
    this.progressLabel = txt(this, BAR_X, 494, '', { size: 18, weight: 700, scale: false });

    // timing bar
    this.bar = this.add.graphics().setDepth(DEPTH.ui);
    this.marker = this.add.rectangle(0, BAR_Y + BAR_H / 2, 10, BAR_H + 24, 0xffffff).setDepth(DEPTH.ui + 1);
    this.feedback = txt(this, W / 2, 440, '', { size: 30, weight: 800, origin: 0.5, scale: false, stroke: '#070b1d', strokeThickness: 6 }).setDepth(DEPTH.toast);

    this.puffBtn = new Button(this, W / 2, 668, {
      width: 300,
      height: 64,
      label: this.T('puffLabel', 'Fire thruster!'),
      icon: 'hand',
      variant: 'warn',
      sound: null,
      onClick: () => this.tap()
    });
    this.input.on('pointerdown', (p, over) => {
      if (!over.length && p.worldY > 80) this.tap();
    });
    if (this.input.keyboard) this.input.keyboard.on('keydown-SPACE', () => this.tap());

    this.drawBar();
    this.updateProgress();
    this.guide.sequence(this.T('intro', []), { modal: true, position: 'top', lastLabel: Content.ui('play', 'Play') }).then((r) => {
      if (r !== null) this.state = 'play';
    });
  }

  drawBar() {
    const g = this.bar;
    g.clear();
    g.fillStyle(0x000000, 0.5);
    g.fillRoundedRect(BAR_X - 6, BAR_Y - 6, BAR_W + 12, BAR_H + 12, 14);
    g.fillStyle(0x3a4470, 1);
    g.fillRoundedRect(BAR_X, BAR_Y, BAR_W, BAR_H, 10);
    const zx = BAR_X + (this.zoneX - this.zoneW / 2) * BAR_W;
    g.fillStyle(COLORS.green, 1);
    g.fillRoundedRect(zx, BAR_Y, this.zoneW * BAR_W, BAR_H, 8);
    g.lineStyle(3, 0xffffff, 0.9);
    g.strokeRoundedRect(zx, BAR_Y, this.zoneW * BAR_W, BAR_H, 8);
  }

  updateProgress() {
    this.progress.set(this.hitsDone / this.goal);
    this.progressLabel.setText(`${this.T('progressLabel', 'Good puffs')}: ${this.hitsDone} / ${this.goal}`);
  }

  tap() {
    if (this.state !== 'play' || this.cooldown > 0) return;
    this.cooldown = 0.25;
    const inZone = Math.abs(this.markerT - this.zoneX) <= this.zoneW / 2 + 0.01;
    // puff from the side opposite to the drift
    const side = this.drift >= 0 ? 1 : -1;
    Sfx.play('puff');
    if (inZone) {
      this.hitsDone++;
      this.drift *= 0.25;
      this.puffs.explode(16, this.sat.x, this.sat.y + side * 18);
      this.flash(this.T('good', 'Perfect puff!'), CSS.green);
      Sfx.play('success');
      this.speed *= 1.1;
      this.zoneW = Math.max(this.relaxed ? 0.14 : 0.09, this.zoneW * 0.9);
      this.zoneX = Phaser.Math.FloatBetween(0.15, 0.85);
      this.driftDir = Math.random() < 0.5 ? -1 : 1;
      this.drawBar();
      this.updateProgress();
      if (this.hitsDone >= this.goal) this.win();
    } else {
      this.misses++;
      this.drift += this.driftDir * 22;
      this.puffs.explode(6, this.sat.x, this.sat.y + side * 18);
      const early = (this.markerDir > 0 && this.markerT < this.zoneX) || (this.markerDir < 0 && this.markerT > this.zoneX);
      this.flash(early ? this.T('early', 'A little too early!') : this.T('late', 'A little too late!'), CSS.orange);
      Sfx.play('error');
    }
  }

  flash(text, color) {
    this.feedback.setText(text).setColor(color).setAlpha(1).setScale(0.8);
    this.tweens.killTweensOf(this.feedback);
    this.tweens.add({ targets: this.feedback, scale: 1, duration: 200, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.feedback, alpha: 0, duration: 400, delay: 800 });
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.state !== 'play') {
      this.sat.angle = 90 + Math.sin(time / 600) * 4;
      return;
    }
    // marker bounces back and forth
    this.markerT += this.markerDir * this.speed * dt;
    if (this.markerT > 1) {
      this.markerT = 1;
      this.markerDir = -1;
    } else if (this.markerT < 0) {
      this.markerT = 0;
      this.markerDir = 1;
    }
    this.marker.x = BAR_X + this.markerT * BAR_W;

    // satellite drifts & wobbles more the further it goes
    this.drift += this.driftDir * (this.relaxed ? 9 : 15) * dt;
    const wob = 6 + Math.abs(this.drift) * 0.25;
    this.sat.y = ORBIT_Y + this.drift;
    this.sat.angle = 90 + Math.sin(time / 180) * wob;
    const k = clamp(this.drift / MAX_DRIFT, -1, 1);
    this.driftMarker.y = 310 + k * 150;
    this.driftMarker.fillColor = Math.abs(k) > 0.7 ? COLORS.red : Math.abs(k) > 0.4 ? COLORS.orange : COLORS.yellow;

    if (Math.abs(this.drift) > MAX_DRIFT) this.tooFar();
  }

  async tooFar() {
    this.state = 'paused';
    Sfx.play('alarm');
    await this.guide.say(this.T('tooFar', "Oh no, it drifted too far! Let's bring it back and try again."), { modal: true, position: 'top', nextLabel: Content.ui('tryAgain', 'Try again') });
    this.drift = 0;
    this.hitsDone = Math.max(0, this.hitsDone - 1);
    this.updateProgress();
    this.state = 'play';
  }

  win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    this.tweens.add({ targets: this.sat, y: ORBIT_Y, angle: 90, duration: 800, ease: 'Sine.easeOut' });
    const stars = this.misses <= 2 ? 3 : this.misses <= 5 ? 2 : 1;
    this.time.delayedCall(900, () => {
      dialog(this, {
        title: this.T('resultTitle', 'Steady as can be!'),
        stars,
        text: this.T('resultText', ''),
        buttons: [
          { label: Content.ui('tryAgain', 'Try again'), value: 'retry', variant: 'secondary', icon: 'restart' },
          { label: Content.ui('continue', 'Continue'), value: 'next', icon: 'next' }
        ],
        width: 820
      }).then((v) => {
        if (v === 'retry') this.scene.restart(this.payload);
        else this.done(stars);
      });
    });
  }
}
