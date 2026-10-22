import Phaser from 'phaser';
import { W, COLORS, CSS, DEPTH, clamp, lerpColor } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame, starsFor } from '../common/kit.js';
import { marsBackdrop } from '../common/mars.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { ProgressBar, drawPanel, toast, floatText } from '../../ui/widgets.js';

// Spirit and Opportunity ran on sunlight. Dust slowly covered their solar panels, but now and
// then a dust devil (a little whirlwind) swept them clean! Drive to the rocks to study them,
// keep the battery up, and in winter park on a slope that tilts the panels towards the Sun.
const GROUND = 590;
const WORLD = 3100;
const ROCKS = [650, 1150, 1650, 2150, 2950];
const SLOPE = [2420, 2760]; // the north-facing slope (in winter the Sun is low in the north)
const SPEED = 170;

export class DustDevilScene extends BaseScene {
  constructor() {
    super('DustDevil');
  }

  create() {
    this.setupStage({ bg: 0xb9845c });
    this.state = 'intro';
    this.mistakes = 0;
    this.battery = 0.75;
    this.warnedLow = false;
    this.dust = 0.25;
    this.x = 300;
    this.camX = 0;
    this.move = 0;
    this.studied = 0;
    this.studyT = 0;
    this.winter = 0; // 0 = not yet, 1 = winter now, 2 = over
    this.winterLeft = 0;
    this.devils = [];
    this.devilT = 3;
    this.sols = 1;
    this.solT = 0;
    this.toldClean = false;
    this.scenery = marsBackdrop(this, GROUND, { sunX: 220, sunY: 150 });
    this.dim = this.add.rectangle(W / 2, 300, 2200, 1400, 0x1a1030, 0).setDepth(1);

    // the world: rocks to study and the slope
    this.world = this.add.container(0, 0).setDepth(2);
    const sg = this.add.graphics();
    sg.fillStyle(0xa85a30, 1);
    sg.beginPath();
    sg.moveTo(SLOPE[0] - 120, GROUND + 4);
    sg.lineTo(SLOPE[0] + 40, GROUND - 52);
    sg.lineTo(SLOPE[1], GROUND - 70);
    sg.lineTo(SLOPE[1] + 130, GROUND + 4);
    sg.closePath();
    sg.fillPath();
    this.world.add(sg);
    this.slopeLabel = txt(this, (SLOPE[0] + SLOPE[1]) / 2, GROUND - 130, this.T('slopeLabel', 'Sunny slope'), { size: 16, weight: 800, color: '#ffffff', origin: 0.5, scale: false, stroke: '#3a1a0a', strokeThickness: 5 });
    this.world.add(this.slopeLabel);
    const names = this.T('rocks', []);
    this.rocks = ROCKS.map((x, i) => {
      const r = img(this, x, GROUND + 8, i === 4 ? 'marsRockLayered' : 'marsRockSpots', 0.7).setOrigin(0.5, 0.9);
      const n = txt(this, x, GROUND - 122, names[i] || '', { size: 15, weight: 800, color: '#ffffff', origin: 0.5, scale: false, stroke: '#3a1a0a', strokeThickness: 5 });
      const pole = this.add.rectangle(x - 1, GROUND - 74, 3, 52, 0xf4f6fb).setOrigin(0.5, 0);
      const flag = this.add.triangle(x, GROUND - 100, 0, 0, 22, 9, 0, 18, COLORS.yellow).setOrigin(0, 0.5);
      flag.setPosition(x, GROUND - 92);
      this.world.add([r, pole, n, flag]);
      return { x, view: r, name: n, flag, done: false };
    });
    this.devilLayer = this.add.container(0, 0).setDepth(3);
    this.rover = img(this, 0, GROUND + 4, 'merRover', 0.75).setOrigin(0.5, 0.92).setDepth(4);
    this.ring = this.add.graphics().setDepth(DEPTH.ui);

    // HUD: battery, dust and the rocks studied
    const hg = this.add.graphics().setDepth(DEPTH.ui - 1);
    drawPanel(hg, 40, 84, 420, 150, { fill: 0x0b1230, radius: 16, stroke: COLORS.stroke, strokeWidth: 2 });
    txt(this, 60, 98, this.T('batteryLabel', 'Battery'), { size: 17, weight: 800, color: CSS.green, scale: false }).setDepth(DEPTH.ui);
    this.batBar = new ProgressBar(this, 170, 104, 270, 16, { color: COLORS.green });
    txt(this, 60, 130, this.T('dustLabel', 'Dust on panels'), { size: 17, weight: 800, color: CSS.orange, scale: false }).setDepth(DEPTH.ui);
    this.dustBar = new ProgressBar(this, 220, 136, 220, 16, { color: 0xb5703a });
    this.sciText = txt(this, 60, 164, '', { size: 17, weight: 800, color: CSS.yellow, scale: false }).setDepth(DEPTH.ui);
    this.solText = txt(this, 60, 194, '', { size: 15, weight: 700, color: CSS.dim, scale: false }).setDepth(DEPTH.ui);
    this.winterText = txt(this, W - 60, 100, '', { size: 20, weight: 800, color: '#bfe3ff', origin: [1, 0], scale: false, stroke: '#0b1230', strokeThickness: 5 }).setDepth(DEPTH.ui);

    // controls: hold to drive
    this.leftBtn = this.holdButton(110, 650, 'left', -1);
    this.rightBtn = this.holdButton(270, 650, 'right', 1);
    this.input.on('pointerup', () => (this.move = 0));
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-LEFT', () => (this.move = -1));
      this.input.keyboard.on('keydown-RIGHT', () => (this.move = 1));
      this.input.keyboard.on('keyup-LEFT', () => this.move < 0 && (this.move = 0));
      this.input.keyboard.on('keyup-RIGHT', () => this.move > 0 && (this.move = 0));
    }
    this.updateHud();
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  holdButton(x, y, icon, dir) {
    const b = new Button(this, x, y, { width: 140, height: 76, icon, variant: 'secondary', sound: null });
    b.off('pointerup');
    b.on('pointerdown', () => (this.move = dir));
    b.activate = () => {
      this.move = dir;
      this.time.delayedCall(400, () => this.move === dir && (this.move = 0));
    };
    return b;
  }

  onSlope() {
    return this.x > SLOPE[0] + 30 && this.x < SLOPE[1] - 10;
  }

  groundY(x) {
    if (x < SLOPE[0] - 120 || x > SLOPE[1] + 130) return GROUND;
    if (x < SLOPE[0] + 40) return GROUND - ((x - (SLOPE[0] - 120)) / 160) * 52;
    if (x < SLOPE[1]) return GROUND - 52 - ((x - (SLOPE[0] + 40)) / (SLOPE[1] - SLOPE[0] - 40)) * 18;
    return GROUND - 70 + ((x - SLOPE[1]) / 130) * 74;
  }

  updateHud() {
    this.batBar.set(this.battery, true);
    this.batBar.color = this.battery < 0.25 ? COLORS.red : COLORS.green;
    this.dustBar.set(this.dust, true);
    this.sciText.setText(`${this.T('studiedLabel', 'Rocks studied')}: ${this.studied} / ${ROCKS.length}`);
    this.solText.setText(`${this.T('solLabel', 'Sol')} ${this.sols}`);
    this.winterText.setText(this.winter === 1 ? `${this.T('winterLabel', 'Winter')}: ${Math.ceil(this.winterLeft)} s` : '');
  }

  spawnDevil() {
    // a whirlwind of dust that wanders across the plain
    const dir = Math.random() < 0.5 ? -1 : 1;
    const x = clamp(this.x + Phaser.Math.Between(250, 600) * -dir * (Math.random() < 0.3 ? -1 : 1), 100, WORLD - 100);
    const c = this.add.container(x, GROUND);
    for (let k = 0; k < 18; k++) {
      const t = k / 17;
      const d = this.add.image(0, -t * 280, 'softDot').setScale(0.28 + t * 0.6, 0.2 + t * 0.22).setTint(k % 2 ? 0xb07040 : 0xd9a070).setAlpha(0.55);
      d.k = t;
      c.add(d);
    }
    this.devilLayer.add(c);
    this.devils.push({ c, x, v: dir * Phaser.Math.Between(60, 110), life: Phaser.Math.Between(7, 10), hit: false });
  }

  async clean(d) {
    d.hit = true;
    this.dust = Math.max(0, this.dust * 0.15);
    Sfx.play('whoosh');
    floatText(this, this.rover.x, this.rover.y - 150, this.T('cleanLabel', 'Clean!'), CSS.yellow, 30);
    if (!this.toldClean) {
      this.toldClean = true;
      toast(this, this.T('cleanFact', ''), { y: 270, sound: false, speak: true, duration: 4200 });
    }
  }

  async study(rock) {
    rock.done = true;
    this.studied++;
    this.battery = Math.max(0, this.battery - 0.06);
    Sfx.play('success');
    rock.flag.setFillStyle(COLORS.green);
    const facts = this.T('rockFacts', []);
    const i = this.rocks.indexOf(rock);
    if (facts[i]) toast(this, facts[i], { y: 270, sound: false, speak: true, duration: 4200 });
    if (this.studied === 4 && !this.winter) this.startWinter();
    if (this.studied >= ROCKS.length) this.win();
  }

  async startWinter() {
    this.winter = 1;
    this.winterLeft = this.relaxed ? 16 : 20;
    this.pausedForTalk = true;
    const r = await this.guide.say(this.T('winterLine', ''), { modal: true, position: 'top' });
    this.pausedForTalk = false;
    if (r === null) return;
    Sfx.play('chime');
  }

  async outOfPower() {
    this.mistakes++;
    this.battery = 0;
    this.state = 'asleep';
    this.move = 0;
    Sfx.play('error');
    toast(this, this.T('outOfPower', 'Out of power! The rover sleeps until the Sun charges it a little.'), { y: 270, color: COLORS.orange, sound: false, speak: true, duration: 3200 });
    this.tweens.add({ targets: this.rover, alpha: 0.5, duration: 400, yoyo: true, repeat: 3 });
    await new Promise((r) => this.time.delayedCall(3200, r));
    if (this._leaving) return;
    this.battery = 0.3;
    this.state = 'play';
  }

  async win() {
    this.state = 'won';
    this.move = 0;
    Sfx.play('bigSuccess');
    await new Promise((r) => this.time.delayedCall(1500, r));
    if (this._leaving) return;
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    finishGame(this, { stars: starsFor(this.mistakes, 0, 2) });
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    const live = this.state === 'play' && !this.pausedForTalk;
    if (live) {
      // the days go by
      this.solT += dt;
      if (this.solT > 4) {
        this.solT = 0;
        this.sols++;
      }
      // driving
      if (this.move) {
        this.x = clamp(this.x + this.move * SPEED * dt, 120, WORLD - 120);
        this.studyT = 0;
      }
      // power: sunlight in (less with dust, much less in winter unless tilted to the Sun)
      const sun = this.winter === 1 ? (this.onSlope() ? 0.95 : 0.15) : 1;
      const charge = 0.045 * sun * (1 - this.dust * 0.9);
      const use = 0.012 + (this.move ? 0.05 : 0) + (this.winter === 1 ? 0.015 : 0);
      this.battery = clamp(this.battery + (charge - use) * dt * (this.relaxed ? 0.75 : 1), 0, 1);
      this.dust = clamp(this.dust + (this.relaxed ? 0.022 : 0.028) * dt, 0, 1);
      if (this.battery < 0.25 && !this.warnedLow) {
        this.warnedLow = true;
        toast(this, this.T('lowBattery', 'Battery low! Stop and let the Sun charge it, or catch a dust devil.'), { y: 270, color: COLORS.orange, sound: 'alarm', speak: true, duration: 3200 });
      }
      if (this.battery > 0.4) this.warnedLow = false;
      if (this.battery <= 0) this.outOfPower();
      // winter counts down
      if (this.winter === 1) {
        this.winterLeft -= dt;
        if (this.winterLeft <= 0) {
          this.winter = 2;
          Sfx.play('chime');
          toast(this, this.T('springLine', 'Spring is here! Back to work.'), { y: 270, sound: false, speak: true, duration: 2600 });
        }
      }
      // dust devils
      this.devilT -= dt;
      if (this.devilT <= 0) {
        this.devilT = this.relaxed ? Phaser.Math.Between(5, 8) : Phaser.Math.Between(7, 11);
        this.spawnDevil();
      }
      // studying a rock: stay still next to it
      const rock = this.rocks.find((r) => !r.done && Math.abs(r.x - this.x) < 60);
      if (rock && !this.move && (rock !== this.rocks[4] || this.winter === 2)) {
        this.studyT += dt;
        if (this.studyT > 1.6) {
          this.studyT = 0;
          this.study(rock);
        }
      } else if (!rock) this.studyT = 0;
    }
    // dust devils move and fade
    this.devils = this.devils.filter((d) => {
      if (live) {
        d.x += d.v * dt;
        d.life -= dt;
      }
      d.c.x = d.x;
      d.c.list.forEach((p, k) => (p.x = Math.sin(time / 180 + k * 0.7) * (8 + p.k * 30)));
      d.c.setAlpha(clamp(d.life, 0, 1));
      if (!d.hit && Math.abs(d.x - this.x) < 70 && live) this.clean(d);
      if (d.life <= 0) {
        d.c.destroy();
        return false;
      }
      return true;
    });
    // winter makes the sky darker
    this.dim.setFillStyle(0x1a1030, this.winter === 1 ? 0.35 : 0);
    this.scenery.sun.setAlpha(this.winter === 1 ? 0.45 : 0.8);
    // view follows the rover
    const want = clamp(this.x - W / 2 + 100, 0, WORLD - W);
    this.camX += (want - this.camX) * Math.min(1, dt * 5);
    this.world.x = -this.camX;
    this.devilLayer.x = -this.camX;
    this.scenery.scroll(this.camX);
    const gy = this.groundY(this.x);
    this.rover.setPosition(this.x - this.camX, gy + 4);
    // tilted on the slope (towards the low winter Sun)
    const tilt = this.x > SLOPE[0] - 120 && this.x < SLOPE[0] + 40 ? -12 : this.x > SLOPE[1] ? 18 : this.onSlope() ? -4 : 0;
    this.rover.angle += (tilt - this.rover.angle) * Math.min(1, dt * 6);
    this.rover.setTint(lerpColor(0xffffff, 0xc89060, this.dust * 0.8));
    // the study ring
    this.ring.clear();
    if (this.studyT > 0) {
      this.ring.lineStyle(6, COLORS.yellow, 1);
      this.ring.beginPath();
      this.ring.arc(this.rover.x, this.rover.y - 140, 18, -Math.PI / 2, -Math.PI / 2 + (this.studyT / 1.6) * Math.PI * 2);
      this.ring.strokePath();
    }
    this.updateHud();
  }
}
