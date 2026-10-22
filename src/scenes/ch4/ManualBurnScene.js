import Phaser from 'phaser';
import { W, H, FULL, COLORS, CSS, DEPTH, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame } from '../common/kit.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { ProgressBar } from '../../ui/widgets.js';

// Steering by eye: the computer is off, so keep the line between Earth's day side and
// night side level and on the window's crosshairs for the whole 14-second burn.
const WX = W / 2, WY = 330, WR = 250; // the window
const TOL_Y = 22, TOL_A = 0.11; // how close counts as "on target" (px, radians)

export class ManualBurnScene extends BaseScene {
  constructor() {
    super('ManualBurn');
  }

  create() {
    this.setupStage({ bg: 0x05070f });
    this.state = 'intro';
    this.rumble = null;
    this.burnSec = this.T('burnSeconds', 14);
    this.goal = this.relaxed ? this.T('relaxedGoal', 0.55) : this.T('goal', 0.7);
    this.attempt = 0;
    this.input_ = { pitch: 0, roll: 0 };

    // the view outside: stars and Earth, inside a round window
    this.view = this.add.container(WX, WY);
    const sg = this.add.graphics();
    for (let i = 0; i < 160; i++) {
      sg.fillStyle(0xffffff, 0.3 + Math.random() * 0.6);
      sg.fillCircle(Phaser.Math.Between(-WR - 100, WR + 100), Phaser.Math.Between(-WR - 100, WR + 100), Math.random() < 0.1 ? 1.6 : 0.9);
    }
    this.view.add(sg);
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
    fr.arc(WX, WY, WR + 60, 0, Math.PI * 2);
    fr.arc(WX, WY, WR, 0, Math.PI * 2, true);
    fr.fillPath();
    fr.lineStyle(6, 0x6b7290, 1);
    fr.strokeCircle(WX, WY, WR + 2);
    fr.fillStyle(0x0d111c, 1);
    fr.fillRect(FULL.x, FULL.y, FULL.w, WY - WR - 60 - FULL.y);
    this.cross = this.add.graphics().setDepth(DEPTH.ui - 2);
    this.drawCross(false);

    // timer and score
    this.timerText = txt(this, WX, 84, '', { size: 24, weight: 800, color: CSS.yellow, origin: 0.5, scale: false }).setDepth(DEPTH.ui);
    this.bar = new ProgressBar(this, WX - 220, 104, 440, 14, { color: COLORS.orange });
    this.stateText = txt(this, WX, WY + WR + 40, '', { size: 24, weight: 800, origin: 0.5, scale: false }).setDepth(DEPTH.ui);
    this.glowBurn = this.add.image(WX, WY + WR + 10, 'softDot').setDisplaySize(500, 160).setTint(0xff9f43).setAlpha(0).setDepth(DEPTH.ui - 4);

    // controls: pitch (up/down) and roll (turn left/right)
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
    const bx = 160, by = WY + 40;
    this.btns = [
      [new Button(this, bx, by - 70, { width: 120, height: 70, icon: 'up', label: this.T('pitchUp', 'Up'), variant: 'secondary', sound: null }), 'pitch', -1],
      [new Button(this, bx, by + 20, { width: 120, height: 70, icon: 'down', label: this.T('pitchDown', 'Down'), variant: 'secondary', sound: null }), 'pitch', 1],
      [new Button(this, W - bx, by - 70, { width: 120, height: 70, icon: 'replay', label: this.T('rollLeft', 'Turn'), variant: 'secondary', sound: null }), 'roll', -1],
      [new Button(this, W - bx, by + 20, { width: 120, height: 70, icon: 'restart', label: this.T('rollRight', 'Turn'), variant: 'secondary', sound: null }), 'roll', 1]
    ];
    this.btns.forEach(([b, k, v]) => hold(b, k, v));
    if (this.input.keyboard) {
      const keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT,W,S,A,D');
      this.keys = keys;
    }

    this.resetDrift();
    playIntro(this).then((ok) => ok && this.countdown());
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
    g.fillStyle(0xffd98a, 0.7);
    for (let i = 0; i < 40; i++) g.fillCircle(Phaser.Math.Between(-150, 150), Phaser.Math.Between(20, 150), 1.2);
    g.lineStyle(3, 0xbfe6ff, 0.7);
    g.strokeCircle(0, 0, R);
    e.add(g);
  }

  drawCross(onTarget) {
    const c = this.cross;
    c.clear();
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
    this.off = { y: Phaser.Math.Between(-60, 60), a: Phaser.Math.FloatBetween(-0.3, 0.3) };
    this.vel = { y: 0, a: 0 };
    this.applyView();
  }

  applyView() {
    this.earth.y = this.off.y;
    this.earth.rotation = this.off.a;
  }

  countdown() {
    this.state = 'countdown';
    this.attempt++;
    let n = 3;
    const tick = () => {
      if (this._leaving) return;
      if (n > 0) {
        this.timerText.setText(`${this.T('countdown', 'Burn starts in')} ${n}`);
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
    this.input_ = { pitch: 0, roll: 0 };
    if (pct >= this.goal) {
      Sfx.play('bigSuccess');
      this.stateText.setText('');
      const p = Math.round(pct * 100);
      const stars = pct >= 0.9 ? 3 : pct >= 0.78 ? 2 : 1;
      // (the text has this game's score in it, so the built-in voice reads it)
      finishGame(this, { stars, text: this.T('resultText', '').replace('{pct}', p) });
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
    let pitch = this.input_.pitch, roll = this.input_.roll;
    if (this.keys) {
      if (this.keys.UP.isDown || this.keys.W.isDown) pitch = -1;
      if (this.keys.DOWN.isDown || this.keys.S.isDown) pitch = 1;
      if (this.keys.LEFT.isDown || this.keys.A.isDown) roll = -1;
      if (this.keys.RIGHT.isDown || this.keys.D.isDown) roll = 1;
    }
    if (this.state === 'burn' || this.state === 'countdown') {
      // the burn shakes the ship, pushing the view off target; the player steers it back
      const shove = this.state === 'burn' ? (this.relaxed ? 0.7 : 1) : 0.35;
      this.vel.y += (Math.sin(time / 700) * 26 + (Math.random() - 0.5) * 60) * shove * dt;
      this.vel.a += (Math.sin(time / 900 + 1) * 0.09 + (Math.random() - 0.5) * 0.25) * shove * dt;
      this.vel.y += pitch * 150 * dt;
      this.vel.a += roll * 0.55 * dt;
      this.vel.y *= 0.9;
      this.vel.a *= 0.9;
      this.off.y = clamp(this.off.y + this.vel.y * dt * 3, -170, 170);
      this.off.a = clamp(this.off.a + this.vel.a * dt * 3, -0.9, 0.9);
      this.applyView();
      if (this.state === 'burn' && !this.reducedMotion) this.view.x = WX + (Math.random() - 0.5) * 2;
    }
    const on = Math.abs(this.off.y) < TOL_Y && Math.abs(this.off.a) < TOL_A;
    this.drawCross(on);
    if (this.state === 'burn') {
      this.elapsed += dt;
      if (on) this.onTime += dt;
      const left = Math.max(0, this.burnSec - this.elapsed);
      this.timerText.setText(`${this.T('timerLabel', 'Burn')}: ${left.toFixed(1)} s`);
      this.bar.set(this.elapsed / this.burnSec, true);
      this.stateText.setText(on ? this.T('onTarget', 'On target') : this.T('offTarget', 'Steady...')).setColor(on ? CSS.green : CSS.orange);
      if (this.elapsed >= this.burnSec) this.endBurn();
    }
  }

  onShutdown() {
    if (this.rumble) this.rumble.stop();
  }
}
