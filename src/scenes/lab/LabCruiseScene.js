import { W, COLORS, CSS, DEPTH, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, GoalBar, idleHint } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { RoundBox, ProgressBar, toast, cameraShake, floatText } from '../../ui/widgets.js';
import { Lab, powerAt } from './labState.js';
import { shipImage, endStep } from './labKit.js';

// Test Your Knowledge, flight 2: the cruise. The ship coasts from Earth to its destination while
// small pushes nudge it off course: fire the thrusters to stay inside the glowing path. Extra
// fuel tanks give more puffs, a star tracker shows the path clearly, a weak power source makes
// weak thrusters, and a radiation vault shrugs off the solar storm.
const X0 = 150, X1 = 1130, PY = 380, AMP = 70;
const TRIP = 46; // seconds
const DAYS = { moon: 3, mars: 210, jupiter: 1800 };
const DEST = { moon: ['moon', 0.32], mars: ['mars', 0.2], jupiter: ['jupiter', 0.22] };
const WATCH = ['solarDim', 'batteriesFlat', 'fuelCellsShort', 'noPower', 'noVault'];

export class LabCruiseScene extends BaseScene {
  constructor() {
    super('LabCruise');
  }

  create() {
    // (Phaser reuses this scene object on every visit, so start from a clean slate)
    this.rocksDone = false;
    this.setupStage({ music: 'space' });
    starfield(this, { count: 180 });
    Lab.ensureShip();
    this.state = 'intro';
    const d = Lab.design();
    this.d = d;
    this.tracker = d.extras.includes('starTracker');
    this.vault = d.support.includes('radiationVault');
    this.maxFuel = d.extras.includes('extraFuel') ? 1.6 : 1;
    this.fuel = this.maxFuel;
    this.pf = clamp(powerAt(d.power, d.mission) / 100, 0.35, 1);
    this.t = 0;
    this.off = 0; // how far off the path (px)
    this.vy = 0;
    this.inPath = 0;
    this.hits = 0;
    this.rocks = [];
    this.flare = null;
    this.flareOk = null;
    this.thrust = 0;
    this.L = this.T('labels', {});
    this.goal = new GoalBar(this);

    // Earth, the destination and the path between them
    img(this, X0 - 30, PY, 'earthSmall', 0.5);
    const [key, sc] = DEST[d.mission] || DEST.mars;
    img(this, X1 + 40, PY, key, sc);
    this.pathG = this.add.graphics();
    this.drawPath();
    this.ship = shipImage(this, X0, PY, 0.3).setDepth(10);

    // the panel along the bottom
    this.add.existing(new RoundBox(this)).draw(30, 592, 820, 110, { fill: 0x0b1230, alpha: 0.9, radius: 18, stroke: COLORS.stroke, strokeWidth: 3 }).setDepth(DEPTH.ui - 1);
    txt(this, 54, 606, this.L.fuel || 'Fuel', { size: 16, weight: 800, color: CSS.orange, scale: false }).setDepth(DEPTH.ui);
    this.fuelBar = new ProgressBar(this, 54, 632, 230, 20, { color: COLORS.orange });
    txt(this, 310, 606, this.L.power || 'Power', { size: 16, weight: 800, color: CSS.yellow, scale: false }).setDepth(DEPTH.ui);
    this.powerBar = new ProgressBar(this, 310, 632, 230, 20, { color: this.pf >= 0.6 ? COLORS.green : COLORS.red });
    this.powerBar.set(this.pf, true);
    txt(this, 566, 606, this.L.onPath || 'On path', { size: 16, weight: 800, color: CSS.cyan, scale: false }).setDepth(DEPTH.ui);
    this.pathBar = new ProgressBar(this, 566, 632, 260, 20, { color: COLORS.green });
    this.dayText = txt(this, 54, 666, '', { size: 18, weight: 800, scale: false }).setDepth(DEPTH.ui);

    this.upBtn = new Button(this, 990, 600, { width: 150, height: 70, size: 20, icon: 'up', label: this.L.up || 'Up', variant: 'primary' });
    this.downBtn = new Button(this, 1150, 600, { width: 150, height: 70, size: 20, icon: 'down', label: this.L.down || 'Down', variant: 'primary' });
    [this.upBtn, this.downBtn].forEach((b, i) => {
      b.on('pointerdown', () => (this.thrust = i ? 1 : -1));
      b.on('pointerup', () => (this.thrust = 0));
      b.on('pointerout', () => (this.thrust = 0));
      b.opts.onClick = null;
    });
    this.shelterBtn = new Button(this, 1070, 680, { width: 310, height: 52, size: 20, icon: 'star', label: this.L.shelter || 'Shelter', variant: 'danger', onClick: () => this.shelter() }).setVisible(false);
    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys('UP,DOWN,W,S');
      this.input.keyboard.on('keydown-SPACE', () => this.shelter());
    }
    this.updateHud();
    idleHint(this, () => {
      if (this.state !== 'fly') return null;
      if (this.flare && this.flareOk === null) return { x: this.shelterBtn.x, y: this.shelterBtn.y - 36 };
      if (Math.abs(this.off) > 30) return this.off > 0 ? { x: this.upBtn.x, y: this.upBtn.y - 42 } : { x: this.downBtn.x, y: this.downBtn.y - 42 };
      return null;
    }, { delay: 2500 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'fly';
      this.goal.set(this.T('task', { title: 'Cruise through space!', help: '' }));
      if (this.pf < 0.6) this.time.delayedCall(2500, () => Speech.say(this.T('powerLowLine', '')));
    });
  }

  pathY(x) {
    const k = (x - X0) / (X1 - X0);
    return PY - Math.sin(k * Math.PI) * AMP;
  }

  drawPath() {
    const g = this.pathG;
    g.clear();
    const half = this.relaxed ? 56 : 42;
    // the corridor
    g.fillStyle(COLORS.cyan, this.tracker ? 0.12 : 0.06);
    for (let x = X0; x < X1; x += 6) g.fillRect(x, this.pathY(x) - half, 6, half * 2);
    // the centre line: crisp with a star tracker, wobbly without one
    for (let x = X0; x < X1; x += 14) {
      const wob = this.tracker ? 0 : Math.sin(x * 0.07) * 9;
      g.fillStyle(COLORS.cyan, this.tracker ? 0.9 : 0.35);
      g.fillCircle(x, this.pathY(x) + wob, this.tracker ? 2.5 : 3);
    }
  }

  shelter() {
    if (this.state !== 'fly' || !this.flare || this.flareOk !== null) return;
    this.flareOk = true;
    this.shelterBtn.setVisible(false);
    Sfx.play('success');
    floatText(this, this.ship.x, this.ship.y - 40, '✓', CSS.green, 30);
  }

  update(time, delta) {
    if (this.state !== 'fly') return;
    const dt = Math.min(0.05, delta / 1000);
    this.t += dt;
    const k = this.t / TRIP;
    // drift: slow random pushes
    this.vy += (Math.sin(this.t * 0.7) * 14 + Math.sin(this.t * 1.9 + 1) * 9) * dt * (this.relaxed ? 0.6 : 1);
    // thrusters
    let th = this.thrust;
    if (this.keys) th += (this.keys.DOWN.isDown || this.keys.S.isDown ? 1 : 0) - (this.keys.UP.isDown || this.keys.W.isDown ? 1 : 0);
    th = clamp(th, -1, 1);
    if (th && this.fuel > 0) {
      this.vy += th * 70 * this.pf * dt;
      this.fuel = Math.max(0, this.fuel - dt * 0.035);
      if (this.fuel === 0) {
        Speech.say(this.T('noFuelLine', ''));
        toast(this, this.T('noFuelLine', ''), { x: W / 2, y: 540, color: COLORS.orange, sound: false });
      }
    }
    this.vy *= 0.985;
    this.off = clamp(this.off + this.vy * dt, -160, 160);
    const x = X0 + (X1 - X0) * Math.min(1, k);
    const y = this.pathY(x) + this.off;
    this.ship.setPosition(x, y).setAngle(clamp(this.vy * 0.2, -20, 20));
    if (Math.abs(this.off) < (this.relaxed ? 56 : 42)) this.inPath += dt;

    // space rocks a third of the way
    if (k > 0.3 && !this.rocksDone) {
      this.rocksDone = true;
      Speech.say(this.T('rocksLine', ''));
      for (let i = 0; i < 5; i++) {
        const rx = x + 220 + i * 70, ry = this.pathY(x + 220 + i * 70) + [-30, 34, -10, 40, -40][i];
        this.rocks.push(img(this, rx, ry, `rock${i % 3}`, 0.5 + Math.random() * 0.3).setAngle(Math.random() * 360));
      }
    }
    this.rocks.forEach((r) => {
      if (r.hit || !r.active) return;
      if (Math.hypot(r.x - x, r.y - y) < 34) {
        r.hit = true;
        this.hits++;
        Sfx.play('hit');
        if (!this.reducedMotion) cameraShake(this, 200, 0.008);
        this.tweens.add({ targets: r, alpha: 0, scale: r.scale * 1.6, duration: 300 });
      }
    });
    // a solar storm two thirds of the way
    if (k > 0.62 && !this.flare) {
      this.flare = this.add.rectangle(W / 2, 360, 1760, 1080, 0xffc46b, 0.18).setDepth(DEPTH.ui - 5);
      Sfx.play('alarm');
      if (this.vault) {
        this.flareOk = true;
        Speech.say(this.T('flareVault', ''));
        toast(this, this.T('flareVault', ''), { x: W / 2, y: 540, color: COLORS.green, sound: false, duration: 3000 });
      } else {
        Speech.say(this.T('flareLine', ''));
        this.shelterBtn.setVisible(true);
        if (!this.reducedMotion) this.shelterBtn.pulse();
        this.time.delayedCall(this.relaxed ? 6000 : 4000, () => {
          if (this.flareOk === null) {
            this.flareOk = false;
            this.shelterBtn.setVisible(false);
            Sfx.play('error');
          }
        });
      }
      this.time.delayedCall(5000, () => this.flare && this.tweens.add({ targets: this.flare, alpha: 0, duration: 800 }));
    }
    this.updateHud();
    if (k >= 1) this.finish();
  }

  updateHud() {
    this.fuelBar.set(this.fuel / this.maxFuel, true);
    this.pathBar.set(this.t ? this.inPath / this.t : 0, true);
    const days = Math.max(1, Math.round((DAYS[this.d.mission] || 100) * Math.min(1, this.t / TRIP)));
    this.dayText.setText(`${this.L.day || 'Day'} ${days}`);
  }

  finish() {
    this.state = 'done';
    this.shelterBtn.setVisible(false);
    const path = (this.inPath / TRIP) * 100;
    const events = clamp(100 - this.hits * 15 - (this.flareOk === false ? 30 : 0), 0, 100);
    const fuel = (this.fuel / this.maxFuel) * 100;
    const score = path * 0.55 + events * 0.3 + fuel * 0.15;
    // the solar storm shows why Jupiter needs a radiation vault
    endStep(this, 'flight', 'cruise', score * (0.75 + this.pf * 0.25), this.flareOk === false ? WATCH : WATCH.filter((n) => n !== 'noVault'));
  }
}
