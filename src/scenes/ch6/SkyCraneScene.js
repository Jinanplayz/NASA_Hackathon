import Phaser from 'phaser';
import { W, FULL, COLORS, CSS, DEPTH, clamp, seeded } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame, starsFor, GoalBar, idleHint } from '../common/kit.js';
import { marsBackdrop } from '../common/mars.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { toast, cameraShake, floatText, roundBox } from '../../ui/widgets.js';

// Curiosity (2012) was too heavy for airbags, so it was lowered to the ground on cables from a
// rocket-powered "sky crane". Steer the crane over the safe, flat spot and keep the rover from
// swinging, then cut the cables the moment its wheels touch down.
const GROUND = 640;
const ROPE = 150; // cable length when fully lowered
const ROVER_H = 128; // from the cable hook to the bottom of the wheels
const G = 320, ACC = 260, DESCENT = 14;
const START_Y = 180; // where the crane starts (below the task bar)
const SPOTS = [[640, 860], [880, 1080], [380, 600]];

export class SkyCraneScene extends BaseScene {
  constructor() {
    super('SkyCrane');
  }

  create() {
    this.setupStage({ bg: 0xb9845c });
    this.state = 'intro';
    this.mistakes = 0;
    this.attempt = 0;
    this.move = 0;
    this.scenery = marsBackdrop(this, GROUND, { sunX: 1100, sunY: 100 });
    // Mount Sharp, the big mountain in the middle of Gale Crater
    const mt = this.add.graphics();
    mt.fillStyle(0x9a5634, 1);
    mt.beginPath();
    mt.moveTo(560, GROUND - 40);
    mt.lineTo(860, GROUND - 330);
    mt.lineTo(940, GROUND - 300);
    mt.lineTo(1060, GROUND - 360);
    mt.lineTo(1500, GROUND - 40);
    mt.closePath();
    mt.fillPath();
    mt.setDepth(0.5);
    this.scenery.near.setDepth(0.6);
    this.scenery.ground.setDepth(0.7);
    this.mtLabel = txt(this, 1000, GROUND - 380, this.T('mountLabel', 'Mount Sharp'), { size: 15, weight: 800, color: '#ffffff', origin: 0.5, scale: false, stroke: '#3a1a0a', strokeThickness: 5 }).setDepth(1);

    // the ground: the safe spot and rocks everywhere else
    this.groundLayer = this.add.container(0, 0).setDepth(2);
    this.zoneG = this.add.graphics().setDepth(1.5);
    this.zoneLabel = txt(this, 0, GROUND + 36, this.T('safeLabel', 'Safe spot'), { size: 16, weight: 800, color: '#ffffff', origin: 0.5, scale: false, stroke: '#1d4a2a', strokeThickness: 5 }).setDepth(DEPTH.ui);

    // the sky crane with Curiosity hanging underneath
    this.cables = this.add.graphics().setDepth(5);
    this.stage = img(this, 0, 0, 'descentStage', 0.9).setDepth(6);
    this.flames = this.add.container(0, 0).setDepth(5);
    [-80, -34, 34, 80].forEach((dx) => {
      const f = this.add.image(dx, 30, 'flame').setOrigin(0.5, 0).setScale(0.16, 0.3).setBlendMode(Phaser.BlendModes.ADD);
      this.flames.add(f);
    });
    this.rover = img(this, 0, 0, 'curiosity', 0.75).setOrigin(0.5, 0.1).setDepth(4);
    this.dust = this.add.particles(0, 0, 'softDot', { speed: { min: 60, max: 180 }, angle: { min: 180, max: 360 }, lifespan: 900, scale: { start: 0.25, end: 0.6 }, alpha: { start: 0.45, end: 0 }, tint: 0xd09060, frequency: 40, emitting: false }).setDepth(3);

    // HUD: the task, and the height and swing just under it (clear of the landing spot)
    this.goal = new GoalBar(this);
    const hg = roundBox(this, 400, 172, 480, 54, { fill: 0x0b1230, radius: 16, alpha: 0.88 }).setDepth(DEPTH.ui - 1);
    this.altText = txt(this, 424, 199, '', { size: 21, weight: 800, color: '#ffffff', origin: [0, 0.5], scale: false }).setDepth(DEPTH.ui);
    this.swingText = txt(this, 856, 199, '', { size: 20, weight: 800, color: '#ffffff', origin: [1, 0.5], scale: false }).setDepth(DEPTH.ui);
    this.leftBtn = this.holdButton(110, 650, 'left', -1);
    this.rightBtn = this.holdButton(270, 650, 'right', 1);
    this.cutBtn = new Button(this, W - 180, 650, { width: 300, height: 76, size: 26, label: this.T('cutLabel', 'Cut the cables!'), icon: 'close', variant: 'danger', onClick: () => this.cut() }).setDepth(DEPTH.ui);
    this.cutBtn.setVisible(false).setEnabled(false);
    this.input.on('pointerup', () => (this.move = 0));
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-LEFT', () => (this.move = -1));
      this.input.keyboard.on('keydown-RIGHT', () => (this.move = 1));
      this.input.keyboard.on('keyup-LEFT', () => this.move < 0 && (this.move = 0));
      this.input.keyboard.on('keyup-RIGHT', () => this.move > 0 && (this.move = 0));
      this.input.keyboard.on('keydown-SPACE', () => this.cut());
    }
    this.setup();
    // stuck? point at the arrow that steers towards the safe spot (or at Cut)
    idleHint(this, () => {
      if (this.state === 'landed') return { x: this.cutBtn.x, y: this.cutBtn.y - 44 };
      if (this.state !== 'fly' || this.move) return null;
      const mid = (this.spot[0] + this.spot[1]) / 2;
      if (Math.abs(this.sx - mid) < 70) return null;
      const b = mid > this.sx ? this.rightBtn : this.leftBtn;
      return { x: b.x, y: b.y - 46 };
    }, { delay: 2500 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'fly';
      this.goal.set(this.T('task', { title: 'Lower Curiosity onto the green spot!', help: 'Hold the arrows to steer. Move gently, so it doesn\'t swing.' }));
    });
  }

  holdButton(x, y, icon, dir) {
    const b = new Button(this, x, y, { width: 140, height: 76, icon, variant: 'secondary', sound: null }).setDepth(DEPTH.ui);
    b.off('pointerup');
    b.on('pointerdown', () => (this.move = dir));
    b.activate = () => {
      this.move = dir;
      this.time.delayedCall(300, () => this.move === dir && (this.move = 0));
    };
    return b;
  }

  // a new try: the crane starts high up, away from the safe spot
  setup() {
    this.spot = SPOTS[this.attempt % SPOTS.length];
    this.sx = this.spot[0] > 600 ? 260 : 1020;
    this.sy = START_Y;
    this.vx = 0;
    this.ax = 0;
    this.theta = 0;
    this.omega = 0;
    this.rope = 20;
    this.wind = 0;
    this.windT = 2;
    this.touch = 0;
    this.stage.setAngle(0).setAlpha(1);
    this.rover.setAngle(0);
    this.flames.setVisible(true);
    // the safe spot (flat) and rocks everywhere else
    this.groundLayer.removeAll(true);
    const rnd = seeded(40 + this.attempt);
    for (let x = FULL.x + 40; x < FULL.x + FULL.w; x += 70 + rnd() * 70) {
      if (x > this.spot[0] - 50 && x < this.spot[1] + 50) continue;
      this.groundLayer.add(img(this, x, GROUND + 10, 'marsRockSharp', 0.5 + rnd() * 0.4).setOrigin(0.5, 0.9));
    }
    const g = this.zoneG;
    g.clear();
    g.fillStyle(COLORS.green, 0.25);
    g.fillRect(this.spot[0], GROUND - 4, this.spot[1] - this.spot[0], 24);
    g.lineStyle(3, COLORS.green, 0.9);
    for (let x = this.spot[0]; x < this.spot[1]; x += 24) g.lineBetween(x, GROUND - 4, x + 12, GROUND - 4);
    this.zoneLabel.setPosition((this.spot[0] + this.spot[1]) / 2, GROUND + 36);
    this.cutBtn.setVisible(false).setEnabled(false);
    this.leftBtn.setVisible(true);
    this.rightBtn.setVisible(true);
  }

  hook() {
    return { x: this.sx + Math.sin(this.theta) * this.rope, y: this.sy + 30 + Math.cos(this.theta) * this.rope };
  }

  draw() {
    this.stage.setPosition(this.sx, this.sy);
    this.flames.setPosition(this.sx, this.sy);
    const h = this.hook();
    this.rover.setPosition(h.x, h.y).setRotation(this.state === 'landed' || this.state === 'done' ? 0 : -this.theta * 0.6);
    const g = this.cables;
    g.clear();
    if (this.state !== 'done') {
      g.lineStyle(2, 0xf4f6fb, 0.95);
      g.lineBetween(this.sx - 20, this.sy + 28, h.x - 40, h.y + 4);
      g.lineBetween(this.sx, this.sy + 30, h.x, h.y);
      g.lineBetween(this.sx + 20, this.sy + 28, h.x + 40, h.y + 4);
    }
    const alt = Math.max(0, (GROUND - (h.y + ROVER_H)) / 14);
    this.altText.setText(`${this.T('altLabel', 'Height')}: ${alt.toFixed(1)} m`);
    const swing = Math.abs(this.theta);
    this.swingText.setText(`${this.T('swingLabel', 'Swing')}: ${swing < 0.12 ? this.T('swingOk', 'steady') : swing < 0.3 ? this.T('swingSome', 'a little') : this.T('swingBad', 'too much!')}`);
    this.swingText.setColor(swing < 0.12 ? '#9dffcf' : swing < 0.3 ? '#ffe08a' : '#ff9a9a');
  }

  touchdown() {
    const h = this.hook();
    const onSpot = h.x - 75 > this.spot[0] - 30 && h.x + 75 < this.spot[1] + 30;
    const steady = Math.abs(this.theta) < 0.3;
    if (!onSpot || !steady) {
      this.mistakes++;
      Sfx.play('hit');
      cameraShake(this, 300, 0.01);
      this.state = 'crashed';
      const msg = !onSpot ? this.T('missSpot', 'Ouch! The wheels came down on rocks. Try again!') : this.T('tooSwingy', 'Bump! The rover was swinging too much. Try again!');
      toast(this, msg, { y: 250, color: COLORS.orange, sound: false, speak: true, duration: 2600 });
      this.time.delayedCall(2400, () => {
        if (this._leaving) return;
        this.attempt++;
        this.setup();
        this.state = 'fly';
        this.goal.set(this.T('task', { title: 'Lower Curiosity onto the green spot!' }), { speak: false });
      });
      return;
    }
    // wheels down! now cut the cables, quick
    this.state = 'landed';
    this.theta = 0;
    Sfx.play('puff');
    this.dust.setPosition(h.x, GROUND - 4);
    this.dust.explode(14);
    this.cutBtn.setVisible(true).setEnabled(true).pulse();
    this.leftBtn.setVisible(false);
    this.rightBtn.setVisible(false);
    this.goal.set(this.T('cutTask', { title: 'Wheels down! Cut the cables!', help: 'Press the red button, quick!' }));
    this.cutTimer = this.time.delayedCall(this.relaxed ? 3500 : 2500, () => {
      if (this.state !== 'landed') return;
      this.mistakes++;
      toast(this, this.T('cutLate', 'Too slow! The crane started to drag the rover. The computer cut the cables.'), { y: 250, color: COLORS.orange, sound: false, speak: true, duration: 2600 });
      this.tweens.add({ targets: this.rover, x: this.rover.x + 20, duration: 200, yoyo: true });
      this.cut(true);
    });
  }

  async cut(auto = false) {
    if (this.state !== 'landed') return;
    this.state = 'done';
    if (this.cutTimer) this.cutTimer.remove();
    this.cutBtn.setVisible(false).setEnabled(false).stopPulse();
    Sfx.play('snap');
    if (!auto) floatText(this, this.sx, this.sy - 70, this.T('cutText', 'Snip!'), CSS.yellow, 34);
    this.draw();
    // the crane flies away and crash-lands far away, so it can't hit the rover
    Sfx.play('ignition');
    const dir = this.sx > W / 2 ? 1 : -1;
    this.tweens.add({ targets: this.stage, angle: dir * 35, duration: 600 });
    this.tweens.add({ targets: [this.stage, this.flames], x: this.sx + dir * 900, y: this.sy - 220, duration: 2600, ease: 'Quad.easeIn' });
    this.time.delayedCall(2600, () => {
      if (this._leaving) return;
      // a puff of dust far away on the horizon
      const p = this.add.image(dir > 0 ? 1220 : 60, GROUND - 120, 'smoke').setScale(0.2).setAlpha(0.8).setTint(0xd09060).setDepth(1);
      this.tweens.add({ targets: p, scale: 1.2, alpha: 0, y: p.y - 60, duration: 2200, onComplete: () => p.destroy() });
      Sfx.play('hit');
    });
    await new Promise((r) => this.time.delayedCall(3200, r));
    if (this._leaving) return;
    Sfx.play('bigSuccess');
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    finishGame(this, { stars: starsFor(this.mistakes, 0, 2) });
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    if (this.state === 'fly') {
      // lowering the rover on its cables, then the whole thing sinks slowly
      this.rope = Math.min(ROPE, this.rope + 50 * dt);
      this.sy += DESCENT * dt * (this.relaxed ? 0.8 : 1);
      // gusts of wind
      this.windT -= dt;
      if (this.windT <= 0) {
        this.windT = 1.5 + Math.random() * 2;
        this.wind = (Math.random() - 0.5) * (this.relaxed ? 80 : 130);
      }
      const ax = this.move * ACC + this.wind - this.vx * 0.9;
      this.vx += ax * dt;
      this.sx = clamp(this.sx + this.vx * dt, 140, W - 140);
      // the rover swings like a pendulum when the crane speeds up or slows down
      const L = Math.max(40, this.rope);
      const alpha = -(G / L) * Math.sin(this.theta) - (ax / L) * Math.cos(this.theta) - this.omega * 0.35;
      this.omega += alpha * dt;
      this.theta = clamp(this.theta + this.omega * dt, -1, 1);
      this.flames.list.forEach((f) => f.setScale(0.16, 0.26 + Math.random() * 0.1));
      const h = this.hook();
      this.dust.emitting = GROUND - this.sy < 260;
      this.dust.setPosition(this.sx, GROUND - 4);
      if (h.y + ROVER_H >= GROUND) this.touchdown();
    } else {
      this.dust.emitting = false;
    }
    if (this.state !== 'done') this.draw();
  }
}
