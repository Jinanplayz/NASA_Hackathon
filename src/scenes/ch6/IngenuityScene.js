import Phaser from 'phaser';
import { W, COLORS, CSS, DEPTH, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame, starsFor } from '../common/kit.js';
import { marsBackdrop } from '../common/mars.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { ProgressBar, drawPanel, toast, floatText } from '../../ui/widgets.js';

// Ingenuity (2021), the first aircraft to fly on another planet. Spin the rotors up (the air is
// so thin they must spin very fast), hover 3 metres up like the first flight, land gently, then
// fly a second time to take photos.
const GROUND = 600;
const PAD = 450;
const PX_PER_M = 34;
const GRAV = 140, LIFT = 250, SIDE = 170;
const SHOTS = [{ x: 620, alt: 5 }, { x: 870, alt: 8 }, { x: 1080, alt: 5, rover: true }];

export class IngenuityScene extends BaseScene {
  constructor() {
    super('Ingenuity');
  }

  create() {
    this.setupStage({ bg: 0xb9845c });
    this.state = 'intro';
    this.mistakes = 0;
    this.rpm = 0;
    this.holding = false;
    this.side = 0;
    this.x = PAD;
    this.alt = 0; // metres
    this.vx = 0;
    this.vy = 0; // metres per second, up is positive
    this.hover = 0;
    this.shot = 0;
    this.scenery = marsBackdrop(this, GROUND, { sunX: 1080, sunY: 120 });
    // the airfield (named after the Wright brothers) and Perseverance watching
    const pad = this.add.graphics();
    pad.fillStyle(0xf4f6fb, 0.35);
    pad.fillEllipse(PAD, GROUND + 6, 150, 20);
    pad.lineStyle(3, 0xffffff, 0.7);
    pad.strokeEllipse(PAD, GROUND + 6, 150, 20);
    txt(this, PAD, GROUND + 40, this.T('fieldLabel', 'Wright Brothers Field'), { size: 15, weight: 800, color: '#ffffff', origin: 0.5, scale: false, stroke: '#3a1a0a', strokeThickness: 5 });
    img(this, 1080, GROUND + 6, 'perseverance', 0.7).setOrigin(0.5, 0.92);
    // the photo targets
    this.shotG = this.add.graphics();
    this.shotLabels = SHOTS.map((s, i) => txt(this, s.x, GROUND - s.alt * PX_PER_M - 46, `${i + 1}`, { size: 18, weight: 800, color: '#070b1d', origin: 0.5, scale: false }).setVisible(false));

    // Ingenuity and its two rotors (drawn as spinning lines)
    this.heli = this.add.container(PAD, GROUND).setDepth(5).setScale(1.3);
    this.body = img(this, 0, -40, 'ingenuity', 0.8);
    this.rotors = this.add.graphics();
    this.heli.add([this.body, this.rotors]);
    this.shadow = this.add.ellipse(PAD, GROUND + 6, 80, 12, 0x3a1608, 0.35).setDepth(4);
    this.dust = this.add.particles(0, 0, 'softDot', { speed: { min: 50, max: 140 }, angle: { min: 160, max: 380 }, lifespan: 900, scale: { start: 0.2, end: 0.5 }, alpha: { start: 0.35, end: 0 }, tint: 0xd09060, frequency: 60, emitting: false }).setDepth(3);

    // HUD
    const hg = this.add.graphics().setDepth(DEPTH.ui - 1);
    drawPanel(hg, 40, 84, 380, 132, { fill: 0x0b1230, radius: 16, stroke: COLORS.stroke, strokeWidth: 2 });
    this.rpmText = txt(this, 60, 98, '', { size: 18, weight: 800, color: CSS.cyan, scale: false }).setDepth(DEPTH.ui);
    this.rpmBar = new ProgressBar(this, 60, 128, 340, 12, { color: COLORS.cyan });
    this.altText = txt(this, 60, 150, '', { size: 18, weight: 800, color: '#ffffff', scale: false }).setDepth(DEPTH.ui);
    this.goalText = txt(this, 60, 180, '', { size: 16, weight: 700, color: CSS.yellow, scale: false, wrap: 340 }).setDepth(DEPTH.ui);
    this.hoverBar = new ProgressBar(this, 440, 100, 200, 14, { color: COLORS.green });
    this.hoverBar.g.setVisible(false);
    // the hover band for the first flight
    this.band = this.add.rectangle(W / 2, GROUND - 3 * PX_PER_M, 2000, PX_PER_M, COLORS.green, 0.12).setVisible(false);
    this.bandLine = this.add.graphics().setVisible(false);
    this.bandLine.lineStyle(2, COLORS.green, 0.7);
    this.bandLine.lineBetween(-300, GROUND - 3.5 * PX_PER_M, 1600, GROUND - 3.5 * PX_PER_M);
    this.bandLine.lineBetween(-300, GROUND - 2.5 * PX_PER_M, 1600, GROUND - 2.5 * PX_PER_M);

    // controls: hold Lift; arrows to fly sideways; Photo for the second flight
    this.liftBtn = new Button(this, W - 170, 650, { width: 260, height: 76, size: 26, label: this.T('liftLabel', 'Hold: lift'), icon: 'up', variant: 'warn', sound: null });
    this.liftBtn.off('pointerup');
    this.liftBtn.on('pointerdown', () => (this.holding = true));
    this.liftBtn.activate = () => (this.holding = !this.holding);
    this.leftBtn = this.holdButton(100, 650, 'left', -1);
    this.rightBtn = this.holdButton(250, 650, 'right', 1);
    this.photoBtn = new Button(this, W - 450, 650, { width: 200, height: 76, size: 24, label: this.T('photoLabel', 'Photo'), icon: 'star', variant: 'primary', onClick: () => this.photo() });
    this.photoBtn.setVisible(false).setEnabled(false);
    this.input.on('pointerup', () => {
      this.holding = false;
      this.side = 0;
    });
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-UP', () => (this.holding = true));
      this.input.keyboard.on('keyup-UP', () => (this.holding = false));
      this.input.keyboard.on('keydown-SPACE', () => (this.holding = true));
      this.input.keyboard.on('keyup-SPACE', () => (this.holding = false));
      this.input.keyboard.on('keydown-LEFT', () => (this.side = -1));
      this.input.keyboard.on('keydown-RIGHT', () => (this.side = 1));
      this.input.keyboard.on('keyup-LEFT', () => this.side < 0 && (this.side = 0));
      this.input.keyboard.on('keyup-RIGHT', () => this.side > 0 && (this.side = 0));
      this.input.keyboard.on('keydown-P', () => this.photo());
    }
    this.setSideButtons(false);
    this.updateHud();
    playIntro(this).then((ok) => {
      if (ok) {
        this.state = 'spin';
        this.updateHud();
      }
    });
  }

  holdButton(x, y, icon, dir) {
    const b = new Button(this, x, y, { width: 130, height: 76, icon, variant: 'secondary', sound: null });
    b.off('pointerup');
    b.on('pointerdown', () => (this.side = dir));
    b.activate = () => {
      this.side = dir;
      this.time.delayedCall(350, () => this.side === dir && (this.side = 0));
    };
    return b;
  }

  setSideButtons(on) {
    this.leftBtn.setVisible(on).setEnabled(on);
    this.rightBtn.setVisible(on).setEnabled(on);
  }

  updateHud() {
    this.rpmText.setText(`${this.T('rpmLabel', 'Rotor speed')}: ${Math.round(this.rpm)} rpm`);
    this.rpmBar.set(this.rpm / 2600, true);
    this.altText.setText(`${this.T('altLabel', 'Height')}: ${this.alt.toFixed(1)} m`);
    const goals = this.T('goals', {});
    this.goalText.setText(goals[this.state] || '');
  }

  setState(s) {
    this.state = s;
    const goals = this.T('goals', {});
    if (goals[s]) Speech.say(goals[s]);
    this.band.setVisible(s === 'hover');
    this.bandLine.setVisible(s === 'hover');
    this.hoverBar.g.setVisible(s === 'hover');
    this.setSideButtons(s === 'photos' || s === 'return');
    this.photoBtn.setVisible(s === 'photos').setEnabled(s === 'photos');
    this.drawShots();
    this.updateHud();
  }

  drawShots() {
    const g = this.shotG;
    g.clear();
    SHOTS.forEach((s, i) => {
      const on = this.state === 'photos' && i >= this.shot;
      this.shotLabels[i].setVisible(on);
      if (!on) return;
      const y = GROUND - s.alt * PX_PER_M;
      g.fillStyle(i === this.shot ? COLORS.yellow : 0xffffff, i === this.shot ? 0.9 : 0.4);
      g.fillCircle(s.x, y - 46, 16);
      g.lineStyle(3, i === this.shot ? COLORS.yellow : 0xffffff, i === this.shot ? 0.9 : 0.4);
      g.strokeRect(s.x - 34, y - 26, 68, 52);
    });
  }

  photo() {
    if (this.state !== 'photos') return;
    const s = SHOTS[this.shot];
    const y = this.alt;
    if (Math.abs(this.x - s.x) > 40 || Math.abs(y - s.alt) > 1.2) {
      Sfx.play('error');
      toast(this, this.T('notLinedUp', 'Line up with the yellow box first!'), { y: 270, color: COLORS.orange, sound: false, duration: 1600 });
      return;
    }
    // click!
    Sfx.play('snap');
    const flash = this.add.rectangle(W / 2, 360, 2400, 1600, 0xffffff, 0.7).setDepth(DEPTH.ui + 10);
    this.tweens.add({ targets: flash, alpha: 0, duration: 400, onComplete: () => flash.destroy() });
    const facts = this.T('photoFacts', []);
    if (facts[this.shot]) toast(this, facts[this.shot], { y: 270, sound: false, speak: true, duration: 3800 });
    this.shot++;
    if (this.shot >= SHOTS.length) this.setState('return');
    else this.drawShots();
  }

  touchdown() {
    const hard = -this.vy > 1.6;
    this.alt = 0;
    this.vy = 0;
    this.vx = 0;
    if (hard) {
      this.mistakes++;
      Sfx.play('hit');
      toast(this, this.T('hardLanding', 'Bump! That landing was a bit hard. Let go of Lift slowly, and tap it to slow down.'), { y: 270, color: COLORS.orange, sound: false, speak: true, duration: 3000 });
    } else Sfx.play('puff');
    if (this.state === 'land1') return this.flightDone(1);
    if (this.state === 'return') {
      if (Math.abs(this.x - PAD) > 70) {
        toast(this, this.T('offPad', 'Land on Wright Brothers Field, please!'), { y: 270, color: COLORS.orange, sound: false, duration: 2000 });
        return;
      }
      return this.flightDone(2);
    }
  }

  async flightDone(n) {
    this.state = 'between';
    this.holding = false;
    this.side = 0;
    Sfx.play('bigSuccess');
    this.rpm = 0;
    if (n === 1) {
      const r = await this.guide.say(this.T('flight1Done', ''), { modal: true, position: 'top' });
      if (r === null || this._leaving) return;
      this.setState('spin2');
      return;
    }
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    finishGame(this, { stars: starsFor(this.mistakes, 0, 2) });
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    const flying = ['hover', 'land1', 'photos', 'return'].includes(this.state);
    // rotors spin up while you hold Lift, and slowly spin down when you don't
    if (['spin', 'spin2'].includes(this.state) || flying) {
      const target = this.holding || flying ? 2550 : 0;
      this.rpm += clamp(target - this.rpm, -900 * dt, (this.relaxed ? 1100 : 800) * dt);
      if (this.state === 'spin' && this.rpm >= 2400) this.setState('hover');
      if (this.state === 'spin2' && this.rpm >= 2400) {
        this.shot = 0;
        this.setState('photos');
      }
    }
    if (flying) {
      // thin air: lift only while holding
      const up = this.holding ? LIFT : 0;
      this.vy += ((up - GRAV) / PX_PER_M) * dt;
      this.vy *= 1 - 0.8 * dt;
      this.vx += (this.side * SIDE - this.vx * 1.6) * dt;
      this.alt += this.vy * dt;
      this.x = clamp(this.x + this.vx * dt, 80, W - 80);
      this.alt = Math.min(this.alt, 12);
      if (this.alt <= 0 && this.vy < 0) {
        this.alt = 0;
        if (this.state === 'land1' || this.state === 'return') this.touchdown();
        else this.vy = 0;
      }
      // the first flight: stay in the green band
      if (this.state === 'hover') {
        const inBand = this.alt > 2.5 && this.alt < 3.5;
        if (inBand) this.hover += dt;
        this.hoverBar.set(this.hover / (this.relaxed ? 5 : 6), true);
        if (this.hover >= (this.relaxed ? 5 : 6)) {
          Sfx.play('success');
          floatText(this, this.heli.x, this.heli.y - 120, '✓', CSS.green, 34);
          this.setState('land1');
        }
      }
    }
    this.heli.setPosition(this.x, GROUND - this.alt * PX_PER_M);
    this.heli.angle = clamp(this.vx / 12, -12, 12);
    this.shadow.setPosition(this.x, GROUND + 6).setScale(clamp(1 - this.alt / 14, 0.3, 1));
    this.dust.setPosition(this.x, GROUND);
    this.dust.emitting = this.rpm > 1500 && this.alt < 2.5;
    // the spinning blades
    const g = this.rotors;
    g.clear();
    const len = 58;
    const spin = (time / 1000) * (this.rpm / 60) * Math.PI * 2 * 0.02;
    // (the two rotor hubs on the mast)
    [[-64, spin], [-52, -spin]].forEach(([y, a]) => {
      const half = Math.abs(Math.cos(a)) * len + 6;
      g.lineStyle(4, 0x2a2e38, this.rpm > 1200 ? 0.5 : 1);
      g.lineBetween(-half, y, half, y);
    });
    this.updateHud();
  }
}
