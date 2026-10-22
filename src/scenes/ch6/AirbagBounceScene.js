import Phaser from 'phaser';
import { W, COLORS, CSS, DEPTH, seeded, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame, starsFor } from '../common/kit.js';
import { marsBackdrop } from '../common/mars.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { toast, cameraShake, floatText } from '../../ui/widgets.js';

// Mars Pathfinder (1997) landed inside a ball of airbags. First be its landing computer:
// blow up the airbags, fire the braking rockets, then cut the cord. Then the ball drops and
// bounces across the rocks: nudge it away from the sharp ones, until it rolls to a stop.
const GROUND = 600;
const BALL_R = 52;
const GRAV = 420, BOUNCE = 0.88, PUSH = 380;
const STEPS = [
  { key: 'inflate', at: [420, 260] },
  { key: 'rockets', at: [130, 80] },
  { key: 'cut', at: [40, 12] }
];

export class AirbagBounceScene extends BaseScene {
  constructor() {
    super('AirbagBounce');
  }

  create() {
    this.setupStage({ bg: 0xb9845c });
    this.state = 'intro';
    this.mistakes = 0;
    this.rips = 0;
    this.bounces = 0;
    this.step = 0;
    this.alt = 600; // metres
    this.fall = 60; // metres per second while on the parachute
    this.camX = 0;
    this.push = 0;
    this.shadow = null;
    this.off = 540;
    this.scenery = marsBackdrop(this, GROUND, { sunX: 300, sunY: 110 });

    // sharp rocks to avoid, and smooth ones that are fine
    const rnd = seeded(97);
    this.rocks = [];
    this.world = this.add.container(0, 0);
    for (let x = 700; x < 4600; x += 230 + rnd() * 200) {
      const sharp = rnd() < 0.58;
      const r = img(this, x, GROUND + 6, sharp ? 'marsRockSharp' : 'marsRock', sharp ? 0.7 + rnd() * 0.3 : 0.5 + rnd() * 0.3).setOrigin(0.5, 0.9);
      this.world.add(r);
      this.rocks.push({ x, w: r.displayWidth * 0.8, sharp, view: r });
    }

    // descending: parachute, backshell and the lander on its long cord
    this.rig = this.add.container(W / 2 - 120, 150);
    this.chute = img(this, 0, -100, 'marsChute', 0.9);
    this.shell = img(this, 0, 10, 'backshell', 0.8);
    this.cord = this.add.graphics();
    this.ball = img(this, 0, 150, 'airbagBall', 0.38);
    this.flames = this.add.container(0, 30);
    [-24, 24].forEach((dx) => {
      const f = this.add.image(dx, 0, 'flame').setOrigin(0.5, 0).setScale(0.18, 0.35).setBlendMode(Phaser.BlendModes.ADD);
      this.flames.add(f);
    });
    this.flames.setVisible(false);
    this.rig.add([this.cord, this.chute, this.shell, this.flames, this.ball]);
    this.drawCord();

    // HUD
    this.altText = txt(this, 60, 100, '', { size: 26, weight: 800, color: '#ffffff', scale: false, stroke: '#3a1a0a', strokeThickness: 6 }).setDepth(DEPTH.ui);
    this.infoText = txt(this, 60, 140, '', { size: 18, weight: 700, color: '#ffffff', scale: false, stroke: '#3a1a0a', strokeThickness: 5 }).setDepth(DEPTH.ui);
    this.actBtn = new Button(this, W - 180, 640, { width: 300, height: 76, size: 26, label: this.T('inflateLabel', 'Inflate airbags'), icon: 'next', variant: 'warn', onClick: () => this.act() });
    // steering buttons for the bounce (hold them)
    this.leftBtn = this.holdButton(110, 640, 'left', -1);
    this.rightBtn = this.holdButton(270, 640, 'right', 1);
    this.input.on('pointerup', () => (this.push = 0));
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.act());
      this.input.keyboard.on('keydown-LEFT', () => (this.push = -1));
      this.input.keyboard.on('keydown-RIGHT', () => (this.push = 1));
      this.input.keyboard.on('keyup-LEFT', () => this.push < 0 && (this.push = 0));
      this.input.keyboard.on('keyup-RIGHT', () => this.push > 0 && (this.push = 0));
    }
    this.setSteer(false);
    this.updateHud();
    playIntro(this).then((ok) => {
      if (ok) this.state = 'descent';
    });
  }

  holdButton(x, y, icon, dir) {
    const b = new Button(this, x, y, { width: 140, height: 76, icon, variant: 'secondary', sound: null });
    b.off('pointerup');
    b.on('pointerdown', () => (this.push = dir));
    b.activate = () => {
      this.push = dir;
      this.time.delayedCall(300, () => this.push === dir && (this.push = 0));
    };
    return b;
  }

  setSteer(on) {
    this.leftBtn.setVisible(on).setEnabled(on);
    this.rightBtn.setVisible(on).setEnabled(on);
    this.actBtn.setVisible(!on).setEnabled(!on);
  }

  drawCord() {
    const g = this.cord;
    g.clear();
    g.lineStyle(2, 0xf4f6fb, 0.9);
    g.lineBetween(-60, -70, 0, 0);
    g.lineBetween(60, -70, 0, 0);
    if (this.ball.parentContainer === this.rig) g.lineBetween(0, 30, 0, this.ball.y - this.ball.displayHeight / 2);
  }

  updateHud() {
    if (this.state === 'bounce' || this.state === 'won') {
      this.altText.setText(`${this.T('bouncesLabel', 'Bounces')}: ${this.bounces}`);
      this.infoText.setText(this.T('steerHint', '◀ slow down   ▶ speed up: miss the sharp rocks!'));
      return;
    }
    this.altText.setText(`${this.T('altLabel', 'Height')}: ${Math.max(0, Math.round(this.alt))} m`);
    const s = STEPS[this.step];
    this.infoText.setText(s ? this.T(s.key + 'Hint', '') : '');
  }

  act() {
    if (this.state !== 'descent') return;
    const s = STEPS[this.step];
    if (!s) return;
    if (this.alt > s.at[0]) {
      this.mistakes++;
      Sfx.play('error');
      toast(this, this.T(s.key + 'Early', 'Too early!'), { y: 210, color: COLORS.orange, sound: false, speak: true, duration: 2200 });
      return;
    }
    this.doStep(s);
  }

  doStep(s) {
    this.step++;
    if (s.key === 'inflate') {
      Sfx.play('inflate');
      this.tweens.add({ targets: this.ball, scale: this.ball.scale * 2.15, duration: 900, ease: 'Back.easeOut', onUpdate: () => this.drawCord() });
      this.actBtn.setLabel(this.T('rocketsLabel', 'Fire rockets'));
    } else if (s.key === 'rockets') {
      Sfx.play('ignition');
      this.flames.setVisible(true);
      this.tweens.add({ targets: this, fall: 6, duration: 1500 });
      this.actBtn.setLabel(this.T('cutLabel', 'Cut the cord'));
    } else if (s.key === 'cut') {
      this.drop();
    }
    this.updateHud();
  }

  // the ball falls free and starts bouncing
  drop() {
    Sfx.play('whoosh');
    const m = this.rig.getWorldTransformMatrix();
    const p = m.transformPoint(this.ball.x, this.ball.y);
    this.rig.remove(this.ball);
    this.ball.setPosition(p.x, p.y).setDepth(5);
    // its shadow on the ground helps to see where it will come down
    this.shadow = this.add.ellipse(p.x, GROUND + 6, 110, 18, 0x3a1608, 0.35).setDepth(4);
    this.drawCord();
    this.bx = p.x;
    this.by = p.y;
    this.vx = 210;
    this.vy = 120;
    this.state = 'bounce';
    this.setSteer(true);
    // the backshell and parachute fly away with the last of their rockets
    this.tweens.add({ targets: this.rig, x: this.rig.x - 500, y: -200, duration: 2600, ease: 'Quad.easeIn' });
    this.updateHud();
  }

  hitGround() {
    this.bounces++;
    const rock = this.rocks.find((r) => Math.abs(r.x - this.bx) < r.w / 2 + BALL_R * 0.4);
    if (rock && rock.sharp && !rock.hit && this.vy > 160) {
      rock.hit = true;
      this.rips++;
      this.mistakes++;
      Sfx.play('hit');
      cameraShake(this, 250, 0.01);
      floatText(this, this.bx - this.camX, GROUND - 140, this.T('ripLabel', 'Rip!'), CSS.red, 32);
      this.ball.setTint(0xffd0c0);
      this.time.delayedCall(300, () => this.ball.clearTint());
    } else {
      Sfx.play('puff');
    }
    this.vy = -Math.abs(this.vy) * BOUNCE;
    this.vx *= 0.95;
  }

  async settle() {
    this.state = 'won';
    this.setSteer(false);
    this.actBtn.setVisible(false);
    Sfx.play('inflate');
    // the airbags pull in and the petals open, with Sojourner on board
    const lander = img(this, this.ball.x, GROUND + 8, 'pathfinder', 1.15).setOrigin(0.5, 0.85).setAlpha(0).setDepth(5);
    this.tweens.add({ targets: this.ball, scale: this.ball.scale * 0.6, alpha: 0, duration: 900 });
    this.tweens.add({ targets: lander, alpha: 1, duration: 900, delay: 500 });
    await new Promise((r) => this.time.delayedCall(1700, r));
    if (this._leaving) return;
    Sfx.play('bigSuccess');
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    finishGame(this, { stars: starsFor(this.mistakes, 1, 3) });
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    if (this.state === 'descent') {
      this.alt -= this.fall * dt;
      this.chute.y = -100 + Math.sin(time / 400) * 3;
      this.rig.angle = Math.sin(time / 700) * 3;
      // the computer steps in if you wait too long
      const s = STEPS[this.step];
      if (s && this.alt < s.at[1]) {
        this.mistakes++;
        toast(this, this.T(s.key + 'Late', 'Too late! The computer did it for you.'), { y: 210, color: COLORS.orange, sound: false, speak: true, duration: 2200 });
        this.doStep(s);
      }
      this.off = clamp(this.alt, 0, 600) * 0.9;
      this.updateHud();
    } else if (this.state === 'bounce') {
      this.vx += this.push * PUSH * dt * (this.by < GROUND - BALL_R - 2 ? 1 : 0.3);
      // the ball keeps rolling forwards: steering only speeds it up or slows it down
      this.vx = clamp(this.vx, this.vy === 0 ? 0 : 50, 330);
      this.vy += GRAV * dt;
      this.bx += this.vx * dt;
      this.by += this.vy * dt;
      if (this.by >= GROUND - BALL_R && this.vy > 0) {
        this.by = GROUND - BALL_R;
        if (this.vy > 70) this.hitGround();
        else {
          this.vy = 0;
          this.vx *= 0.97;
        }
      }
      this.ball.rotation += (this.vx * dt) / BALL_R;
      if (this.vy === 0 && Math.abs(this.vx) < 12) this.settle();
    }
    // the view follows the ball
    if (this.state === 'bounce' || this.state === 'won') {
      const want = this.bx - W / 2 + 120;
      this.camX += (Math.max(0, want) - this.camX) * Math.min(1, dt * 4);
      this.ball.setPosition(this.bx - this.camX, this.by);
      if (this.shadow) {
        const k = clamp(1 - (GROUND - BALL_R - this.by) / 500, 0.3, 1);
        this.shadow.setPosition(this.ball.x, GROUND + 6 + this.off).setScale(k).setAlpha(this.state === 'won' ? 0 : 0.2 + k * 0.25);
      }
      this.world.x = -this.camX;
      this.scenery.scroll(this.camX);
      this.off = Math.max(0, this.off - 240 * dt);
      this.updateHud();
    }
    // the ground comes up as the height drops
    const sc = this.scenery;
    sc.ground.y = GROUND + sc.ground.height / 2 + this.off;
    sc.near.y = GROUND - 66 + this.off * 0.6;
    sc.far.y = GROUND - 92 + this.off * 0.35;
    this.world.y = this.off;
  }
}
