import { COLORS, CSS, DEPTH, lerpColor } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { playIntro, GoalBar, idleHint } from '../common/kit.js';
import { txt } from '../../ui/text.js';
import { RoundBox, ProgressBar, floatText, cameraShake } from '../../ui/widgets.js';
import { Lab, shipMass } from './labState.js';
import { shipImage, endStep } from './labKit.js';

// Test Your Knowledge, test 1: the shake test. NASA bolts every spacecraft to a shaker table that
// rattles it like a launch. Bolts work loose: tap each wiggling one before it falls off. Heavier
// ships shake harder. The engineers also check the weight here (too heavy for the rocket, or
// carrying parts that are useless where it's going).
const SX = 470, SY = 380; // the ship
const PHASE_SECS = 12;
const WATCH = ['tooHeavy', 'chutesMoon', 'shieldJupiter', 'noLandJupiter'];

export class LabShakeScene extends BaseScene {
  constructor() {
    super('LabShake');
  }

  create() {
    this.setupStage({ bg: 0x10151f, music: 'tension' });
    blueprint(this);
    Lab.ensureShip();
    this.state = 'intro';
    this.t = 0;
    this.phase = -1;
    this.tight = 0;
    this.lost = 0;
    this.nextLoose = 1.2;
    this.heavy = shipMass(Lab.design()) > 5;
    this.goal = new GoalBar(this);

    // the shaker table
    const g = this.add.graphics();
    g.fillStyle(0x2a3140, 1);
    g.fillRect(-300, 610, 1880, 300);
    g.fillStyle(0x596274, 1);
    g.fillRoundedRect(SX - 230, 540, 460, 30, 8);
    g.fillStyle(0x3a4252, 1);
    for (let i = 0; i < 5; i++) g.fillRect(SX - 200 + i * 92, 570, 30, 40);
    this.table = g;
    this.ship = shipImage(this, SX, SY, 1.25);
    this.plate = this.add.rectangle(SX, 528, 300, 18, 0x8f98aa).setStrokeStyle(2, 0x596274);

    // bolts around the ship
    this.bolts = [];
    const spots = [[-150, -60], [150, -60], [-170, 40], [170, 40], [-110, 140], [110, 140], [-40, 148], [40, 148], [-60, -120], [60, -120]];
    spots.forEach(([dx, dy], i) => this.bolts.push(this.makeBolt(SX + dx, SY + dy, i)));

    // right: the gauges
    const px = 830;
    this.add.existing(new RoundBox(this)).draw(px, 176, 420, 470, { fill: 0x0b1230, alpha: 0.92, radius: 20, stroke: COLORS.stroke, strokeWidth: 3 });
    const L = this.T('labels', {});
    txt(this, px + 24, 196, L.strength || 'Shaking', { size: 18, weight: 800, color: CSS.cyan, scale: false });
    this.meter = this.add.graphics();
    this.phaseText = txt(this, px + 24, 290, '', { size: 20, weight: 800, color: CSS.yellow, scale: false, wrap: 372 });
    this.tightText = txt(this, px + 24, 400, '', { size: 22, weight: 800, color: CSS.green, scale: false });
    this.lostText = txt(this, px + 24, 440, '', { size: 22, weight: 800, color: CSS.red, scale: false });
    txt(this, px + 24, 520, L.time || 'Time', { size: 16, weight: 700, color: CSS.dim, scale: false });
    this.timeBar = new ProgressBar(this, px + 24, 548, 372, 24, { color: COLORS.cyan });
    this.counts();

    idleHint(this, () => {
      const b = this.bolts.find((x) => x.loose);
      return this.state === 'play' && b ? { x: b.x, y: b.y - 36 } : null;
    }, { delay: 2500 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'play';
      this.goal.set(this.T('task', { title: 'Shake test!', help: '' }));
      if (this.heavy) this.time.delayedCall(1500, () => Speech.say(this.T('heavyLine', '')));
      Sfx.rumble({ freq: 60, vol: 0.18 });
    });
  }

  makeBolt(x, y, i) {
    const c = this.add.container(x, y).setDepth(DEPTH.ui - 5);
    const ring = this.add.graphics();
    const nut = this.add.graphics();
    const draw = (loose) => {
      nut.clear();
      nut.fillStyle(loose ? COLORS.red : 0x9aa3b5, 1);
      nut.fillCircle(0, 0, 13);
      nut.lineStyle(3, loose ? 0x5a1d24 : 0x4a5160, 1);
      nut.lineBetween(-7, 0, 7, 0);
    };
    draw(false);
    c.add([ring, nut]);
    c.setSize(56, 56).setInteractive({ useHandCursor: true });
    Object.assign(c, { i, homeY: y, ring, nut, draw, loose: false, gone: false, timer: 0, enabled: true, activate: () => this.tighten(c) });
    c.on('pointerdown', () => this.tighten(c));
    this.focus.add(c);
    return c;
  }

  loosen() {
    const free = this.bolts.filter((b) => !b.loose && !b.gone);
    if (!free.length) return;
    const b = free[Math.floor(Math.random() * free.length)];
    b.loose = true;
    b.timer = (this.relaxed ? 3.6 : 2.6) * (this.heavy ? 0.85 : 1);
    b.max = b.timer;
    b.draw(true);
    Sfx.play('tick');
    this.tweens.add({ targets: b, scale: 1.35, duration: 160, yoyo: true });
  }

  tighten(b) {
    if (this.state !== 'play' || !b.loose) return;
    b.loose = false;
    b.ring.clear();
    b.draw(false);
    b.setAngle(0);
    this.tight++;
    Sfx.play('snap');
    floatText(this, b.x, b.y - 26, '✓', CSS.green, 24);
    this.tweens.add({ targets: b, angle: 360, duration: 250 });
    this.counts();
  }

  counts() {
    const L = this.T('labels', {});
    this.tightText.setText(`${L.bolts || 'Bolts tight'}: ${this.tight}`);
    this.lostText.setText(`${L.lost || 'Bolts lost'}: ${this.lost}`);
  }

  update(time, delta) {
    if (this.state !== 'play') return;
    const dt = Math.min(0.05, delta / 1000);
    this.t += dt;
    const phase = Math.min(2, Math.floor(this.t / PHASE_SECS));
    if (phase !== this.phase) {
      this.phase = phase;
      const line = this.T('phases', [])[phase] || '';
      this.phaseText.setText(line);
      Speech.say(line);
      if (phase === 2) {
        // stage separation: a big jolt that loosens two bolts at once
        if (!this.reducedMotion) cameraShake(this, 400, 0.012);
        Sfx.play('hit');
        this.loosen();
        this.loosen();
      }
    }
    // how hard it shakes: a rumble, the max-Q peak, then calmer after the jolt
    const strength = phase === 0 ? 0.35 + (this.t / PHASE_SECS) * 0.3 : phase === 1 ? 0.9 + Math.sin(this.t * 3) * 0.1 : 0.55;
    const jig = this.reducedMotion ? 1.5 : 7 * strength;
    this.ship.x = SX + (Math.random() - 0.5) * jig;
    this.ship.y = SY + (Math.random() - 0.5) * jig * 0.6;
    this.plate.x = SX + (Math.random() - 0.5) * jig * 0.5;
    this.drawMeter(strength);
    this.timeBar.set(this.t / (PHASE_SECS * 3), true);

    // bolts work loose faster when it shakes harder (and on heavy ships)
    this.nextLoose -= dt * strength * (this.heavy ? 1.3 : 1) * (this.relaxed ? 0.75 : 1);
    if (this.nextLoose <= 0) {
      this.loosen();
      this.nextLoose = 1.1 + Math.random() * 0.5;
    }
    this.bolts.forEach((b) => {
      if (!b.loose) return;
      b.timer -= dt;
      b.setAngle(Math.sin(this.t * 40) * 18);
      // a ring that runs out
      b.ring.clear();
      b.ring.lineStyle(4, COLORS.yellow, 1);
      b.ring.beginPath();
      b.ring.arc(0, 0, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (b.timer / b.max), false);
      b.ring.strokePath();
      if (b.timer <= 0) this.fall(b);
    });
    if (this.t >= PHASE_SECS * 3) this.finish();
  }

  fall(b) {
    b.loose = false;
    b.gone = true;
    b.ring.clear();
    this.lost++;
    this.counts();
    Sfx.play('error');
    this.tweens.add({ targets: b, y: 640, angle: 400, alpha: 0, duration: 700, ease: 'Quad.easeIn' });
    // a lost bolt gets put back by the technicians a few seconds later
    this.time.delayedCall(4000, () => {
      if (this.state !== 'play') return;
      b.gone = false;
      b.setAlpha(1).setAngle(0);
      b.y = b.homeY;
      b.draw(false);
    });
  }

  drawMeter(s) {
    const g = this.meter;
    g.clear();
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(854, 228, 372, 28, 14);
    g.fillStyle(lerpColor(COLORS.green, COLORS.red, s), 1);
    g.fillRoundedRect(854, 228, Math.max(28, 372 * s), 28, 14);
  }

  finish() {
    this.state = 'done';
    Sfx.stopLoops();
    this.ship.setPosition(SX, SY);
    this.bolts.forEach((b) => b.ring.clear());
    const total = this.tight + this.lost;
    const score = total ? (this.tight / total) * 100 : 100;
    endStep(this, 'test', 'shake', score, WATCH);
  }
}
