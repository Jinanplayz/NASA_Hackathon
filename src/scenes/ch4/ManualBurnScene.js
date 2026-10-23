import Phaser from 'phaser';
import { W, COLORS, CSS, DEPTH, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { starDots } from '../common/bg.js';
import { playIntro, finishGame, GoalBar, idleHint, bake } from '../common/kit.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { ProgressBar } from '../../ui/widgets.js';

// Steering by eye: the computer is off, so keep the line between Earth's day side and
// night side inside the green band of the window for the whole 14-second burn.
// (Just up and down: the burn's shaking keeps pushing the view off.)
const WX = 560, WY = 412, WR = 214; // the window
const TOL_Y = 30; // how close counts as "on target" (px)

export class ManualBurnScene extends BaseScene {
  constructor() {
    super('ManualBurn');
  }

  create() {
    this.setupStage({ bg: 0x05070f });
    this.state = 'intro';
    this.rumble = null;
    this.burnSec = this.T('burnSeconds', 14);
    this.need = this.relaxed ? this.T('relaxedGoal', 0.55) : this.T('goal', 0.7);
    this.attempt = 0;
    this.input_ = { pitch: 0 };

    // the view outside: stars and Earth, inside a round window
    this.view = this.add.container(WX, WY);
    const stars = [];
    for (let i = 0; i < 160; i++) stars.push({ x: Phaser.Math.Between(-WR - 100, WR + 100), y: Phaser.Math.Between(-WR - 100, WR + 100), alpha: 0.3 + Math.random() * 0.6, size: Math.random() < 0.1 ? 2 : 1 });
    this.view.add(starDots(this, stars));
    this.earth = this.add.container(0, 0);
    this.drawEarth();
    this.view.add(this.earth);
    const mask = this.make.graphics({ add: false });
    mask.fillStyle(0xffffff, 1);
    mask.fillCircle(WX, WY, WR);
    this.view.setMask(mask.createGeometryMask());

    // the window frame and the crosshairs (COAS sight)
    const fr = this.add.graphics().setDepth(DEPTH.ui - 3);
    fr.fillStyle(0x1b2236, 1);
    fr.beginPath();
    fr.arc(WX, WY, WR + 34, 0, Math.PI * 2);
    fr.arc(WX, WY, WR, 0, Math.PI * 2, true);
    fr.fillPath();
    fr.lineStyle(6, 0x6b7290, 1);
    fr.strokeCircle(WX, WY, WR + 2);
    bake(this, fr, WX - WR - 40, WY - WR - 40, (WR + 40) * 2, (WR + 40) * 2);
    this.cross = this.add.graphics().setDepth(DEPTH.ui - 2);
    this.drawCross(false);

    // task, time left and how it's going
    this.goal = new GoalBar(this);
    this.bar = new ProgressBar(this, 900, 236, 300, 16, { color: COLORS.orange });
    this.barLabel = txt(this, 900, 212, this.T('timerLabel', 'Burn'), { size: 18, weight: 800, color: CSS.yellow, scale: false }).setDepth(DEPTH.ui);
    this.stateText = txt(this, 1050, 300, '', { size: 30, weight: 800, origin: 0.5, align: 'center', wrap: 300, scale: false }).setDepth(DEPTH.ui);
    this.glowBurn = this.add.image(WX, WY + WR + 10, 'softDot').setDisplaySize(500, 160).setTint(0xff9f43).setAlpha(0).setDepth(DEPTH.ui - 4);

    // controls: up and down
    const hold = (btn, key, v) => {
      btn.off('pointerup');
      btn.on('pointerdown', () => (this.input_[key] = v));
      btn.on('pointerup', () => {
        btn.setScale(1);
        this.input_[key] = 0;
      });
      btn.on('pointerout', () => (this.input_[key] = 0));
      btn.activate = () => {
        this.input_[key] = v;
        this.time.delayedCall(180, () => (this.input_[key] = 0));
      };
    };
    const bx = 1050;
    this.btns = [
      [new Button(this, bx, 450, { width: 220, height: 96, size: 28, icon: 'up', label: this.T('pitchUp', 'Up'), variant: 'secondary', sound: null }), 'pitch', -1],
      [new Button(this, bx, 566, { width: 220, height: 96, size: 28, icon: 'down', label: this.T('pitchDown', 'Down'), variant: 'secondary', sound: null }), 'pitch', 1]
    ];
    this.btns.forEach(([b, k, v]) => hold(b, k, v));
    if (this.input.keyboard) {
      const keys = this.input.keyboard.addKeys('UP,DOWN,W,S');
      this.keys = keys;
    }

    this.resetDrift();
    // stuck? point at the button that brings the line back
    idleHint(this, () => {
      if (this.state !== 'burn' || Math.abs(this.off.y) < TOL_Y) return null;
      const b = this.btns[this.off.y > 0 ? 0 : 1][0];
      return { x: b.x - 126, y: b.y, dir: 'right' };
    }, { delay: 2500 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.goal.set(this.T('task', { title: 'Keep the line in the green band!', help: 'Use Up and Down to hold the line between day and night in the band.' }));
      this.countdown();
    });
  }

  drawEarth() {
    const e = this.earth;
    e.removeAll(true);
    const R = 200;
    const g = this.add.graphics();
    g.fillStyle(0x4fb8ff, 0.15);
    g.fillCircle(0, 0, R + 18);
    // night side (bottom half) and day side (top half): the line between them is the terminator
    g.fillStyle(0x0b1a3d, 1);
    g.fillCircle(0, 0, R);
    g.fillStyle(0x2f7fd8, 1);
    g.beginPath();
    g.arc(0, 0, R, Math.PI, Math.PI * 2);
    g.closePath();
    g.fillPath();
    g.fillStyle(0xffffff, 0.55);
    [[-90, -120, 120, 26], [40, -70, 160, 22], [-20, -170, 90, 18], [110, -140, 70, 16]].forEach(([x, y, w, h]) => g.fillEllipse(x, y, w, h));
    g.fillStyle(0x4f9d52, 0.9);
    g.fillEllipse(-40, -50, 140, 50);
    g.fillEllipse(120, -30, 60, 40);
    // a few city lights on the night side
    g.lineStyle(3, 0xbfe6ff, 0.7);
    g.strokeCircle(0, 0, R);
    e.add(g);
    const lights = [];
    for (let i = 0; i < 40; i++) lights.push({ x: Phaser.Math.Between(-150, 150), y: Phaser.Math.Between(20, 150), alpha: 0.7, size: 1, tint: 0xffd98a });
    e.add(starDots(this, lights));
  }

  drawCross(onTarget) {
    const c = this.cross;
    c.clear();
    // the band where the line should stay
    c.fillStyle(COLORS.green, onTarget ? 0.28 : 0.16);
    c.fillRect(WX - WR, WY - TOL_Y, WR * 2, TOL_Y * 2);
    c.lineStyle(2, COLORS.green, 0.8);
    c.lineBetween(WX - WR, WY - TOL_Y, WX + WR, WY - TOL_Y);
    c.lineBetween(WX - WR, WY + TOL_Y, WX + WR, WY + TOL_Y);
    const col = onTarget ? COLORS.green : COLORS.orange;
    c.lineStyle(3, col, 0.95);
    c.lineBetween(WX - WR + 20, WY, WX - 30, WY);
    c.lineBetween(WX + 30, WY, WX + WR - 20, WY);
    c.lineBetween(WX, WY - WR + 20, WX, WY - 30);
    c.lineBetween(WX, WY + 30, WX, WY + WR - 20);
    c.strokeCircle(WX, WY, 30);
    for (let k = -3; k <= 3; k++) if (k) c.lineBetween(WX + k * 50, WY - 8, WX + k * 50, WY + 8);
  }

  resetDrift() {
    this.off = { y: Phaser.Math.Between(50, 80) * (Math.random() < 0.5 ? -1 : 1) };
    this.vel = { y: 0 };
    this.applyView();
  }

  applyView() {
    this.earth.y = this.off.y;
  }

  countdown() {
    this.state = 'countdown';
    this.attempt++;
    let n = 3;
    const tick = () => {
      if (this._leaving) return;
      if (n > 0) {
        this.stateText.setText(`${this.T('countdown', 'Burn starts in')} ${n}`).setColor(CSS.yellow);
        Sfx.play('tick');
        n--;
        this.time.delayedCall(800, tick);
      } else this.startBurn();
    };
    tick();
  }

  startBurn() {
    this.state = 'burn';
    this.elapsed = 0;
    this.onTime = 0;
    this.rumble = Sfx.rumble({ freq: 55, vol: 0.16 });
    this.rumble.set(0.7);
    Sfx.play('ignition');
    this.tweens.add({ targets: this.glowBurn, alpha: 0.5, duration: 300 });
  }

  endBurn() {
    this.state = 'over';
    if (this.rumble) this.rumble.stop();
    this.rumble = null;
    this.tweens.add({ targets: this.glowBurn, alpha: 0, duration: 300 });
    const pct = this.onTime / this.burnSec;
    this.input_ = { pitch: 0 };
    if (pct >= this.need) {
      Sfx.play('bigSuccess');
      this.stateText.setText('');
      const stars = pct >= 0.9 ? 3 : pct >= 0.78 ? 2 : 1;
      finishGame(this, { stars });
    } else {
      Sfx.play('error');
      this.guide.say(this.T('tooWobbly', 'Try again!'), { modal: true, position: 'top' }).then((r) => {
        if (r === null) return;
        this.resetDrift();
        this.countdown();
      });
    }
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    // controls (keys or buttons)
    let pitch = this.input_.pitch;
    if (this.keys) {
      if (this.keys.UP.isDown || this.keys.W.isDown) pitch = -1;
      if (this.keys.DOWN.isDown || this.keys.S.isDown) pitch = 1;
    }
    if (this.state === 'burn' || this.state === 'countdown') {
      // the burn shakes the ship, pushing the view off target; the player steers it back
      const shove = this.state === 'burn' ? (this.relaxed ? 0.7 : 1) : 0.35;
      this.vel.y += (Math.sin(time / 700) * 26 + (Math.random() - 0.5) * 60) * shove * dt;
      this.vel.y += pitch * 150 * dt;
      this.vel.y *= 0.9;
      this.off.y = clamp(this.off.y + this.vel.y * dt * 3, -150, 150);
      this.applyView();
      if (this.state === 'burn' && !this.reducedMotion) this.view.x = WX + (Math.random() - 0.5) * 2;
    }
    const on = Math.abs(this.off.y) < TOL_Y;
    this.drawCross(on);
    if (this.state === 'burn') {
      this.elapsed += dt;
      if (on) this.onTime += dt;
      const left = Math.max(0, this.burnSec - this.elapsed);
      this.goal.setCount(`${Math.ceil(left)} s`);
      this.bar.set(this.elapsed / this.burnSec, true);
      this.stateText.setText(on ? this.T('onTarget', 'On target!') : this.off.y > 0 ? this.T('pressUp', 'Press Up!') : this.T('pressDown', 'Press Down!')).setColor(on ? CSS.green : CSS.orange);
      if (this.elapsed >= this.burnSec) this.endBurn();
    }
  }

  onShutdown() {
    if (this.rumble) this.rumble.stop();
  }
}
