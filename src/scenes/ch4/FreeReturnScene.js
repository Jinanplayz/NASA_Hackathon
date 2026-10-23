import Phaser from 'phaser';
import { W, H, COLORS, CSS, DEPTH, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield, starDots, addDots } from '../common/bg.js';
import { playIntro, finishGame, GoalBar, idleHint } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { toast, floatText, Slider, roundBox } from '../../ui/widgets.js';

// Free return: aim one engine burn (a big slider turns the arrow) so the Moon's gravity swings
// Apollo 13 around and back into the safe entry corridor at Earth. The dotted line predicts the
// path (simple gravity from Earth and the Moon; about a quarter of the slider works) and turns
// green when it's right. Then a second, well-timed burn speeds up the trip home.
const E = { x: 170, y: 420, r: 62 };
const M = { x: 1030, y: 300, r: 30 };
const S0 = { x: 560, y: 400 };
const GM_E = 3.6e6, GM_M = 6e5;
const V0 = { x: Math.cos(0.1047) * 110, y: Math.sin(0.1047) * 110 };
const CORRIDOR = [-20, 50]; // degrees around Earth (0 = facing right, positive = below)
const DV_PER_PX = 0.12, DT = 0.02;
const AIM_LEN = 90; // burn strength (fixed)
const AIM_FROM = 40, AIM_TO = 320; // the slider turns the arrow between these angles (degrees)

function simulate(dvx, dvy) {
  let x = S0.x, y = S0.y, vx = V0.x + dvx, vy = V0.y + dvy;
  const pts = [{ x, y }];
  let passedMoon = false, closest = { d: 1e9, i: 0 };
  for (let i = 0; i < 7000; i++) {
    const ex = E.x - x, ey = E.y - y, de = Math.hypot(ex, ey);
    const mx = M.x - x, my = M.y - y, dm = Math.hypot(mx, my);
    if (dm < closest.d) closest = { d: dm, i: pts.length - 1 };
    if (dm < M.r) return { pts, result: 'moon', closest };
    if (dm < 150) passedMoon = true;
    if (de < E.r + 14) {
      const ang = (Math.atan2(y - E.y, x - E.x) * 180) / Math.PI;
      return { pts, result: passedMoon && ang > CORRIDOR[0] && ang < CORRIDOR[1] ? 'good' : 'miss', closest };
    }
    if (x < -300 || x > W + 300 || y < -260 || y > H + 260) return { pts, result: 'lost', closest };
    const ae = GM_E / (de * de * de), am = GM_M / (dm * dm * dm);
    vx += (ex * ae + mx * am) * DT;
    vy += (ey * ae + my * am) * DT;
    x += vx * DT;
    y += vy * DT;
    pts.push({ x, y });
  }
  return { pts, result: 'lost', closest };
}

export class FreeReturnScene extends BaseScene {
  constructor() {
    super('FreeReturn');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 170 });
    this.state = 'intro';
    this.mistakes = 0;
    this.aim = { x: 0, y: 0 };

    // Earth, its safe entry corridor, and the Moon
    this.add.image(E.x, E.y, 'softDot').setDisplaySize(E.r * 4, E.r * 4).setTint(0x4fb8ff).setAlpha(0.25);
    img(this, E.x, E.y, 'earth', (E.r * 2) / (360 * 0.92));
    const cg = this.add.graphics();
    cg.lineStyle(10, COLORS.green, 0.85);
    cg.beginPath();
    cg.arc(E.x, E.y, E.r + 14, Phaser.Math.DegToRad(CORRIDOR[0]), Phaser.Math.DegToRad(CORRIDOR[1]));
    cg.strokePath();
    txt(this, E.x + 70, E.y + 98, this.T('zoneLabel', 'Safe way in'), { size: 15, weight: 800, color: CSS.green, origin: 0.5, scale: false });
    this.add.image(M.x, M.y, 'softDot').setDisplaySize(M.r * 4, M.r * 4).setTint(0xc9d6ff).setAlpha(0.2);
    img(this, M.x, M.y, 'moonSmall', (M.r * 2) / (110 * 0.94));

    this.pathDots = starDots(this, []);
    this.arrow = this.add.graphics().setDepth(DEPTH.ui - 2);
    this.ship = img(this, S0.x, S0.y, 'csmLm', 0.32).setDepth(DEPTH.ui - 1);
    this.ship.rotation = Math.atan2(V0.y, V0.x);
    this.flame = this.add.image(0, 0, 'flame').setOrigin(0.5, 0).setScale(0.18, 0.3).setBlendMode(Phaser.BlendModes.ADD).setVisible(false).setDepth(DEPTH.ui - 2);
    this.goal = new GoalBar(this);
    this.status = txt(this, W / 2, 186, '', { size: 22, weight: 800, origin: [0.5, 0], align: 'center', wrap: 900, scale: false, stroke: '#070b1d', strokeThickness: 6 }).setDepth(DEPTH.ui);
    this.marker = this.add.graphics().setDepth(DEPTH.ui - 1).setVisible(false);
    this.quiet = txt(this, M.x + 90, M.y - 80, 'Radio quiet...', { size: 16, weight: 700, color: CSS.dim, origin: 0.5, scale: false }).setVisible(false);

    // the aiming slider
    const pg = roundBox(this, 60, 604, 820, 92, { fill: 0x0b1230, radius: 18, alpha: 0.9 }).setDepth(DEPTH.ui - 1);
    txt(this, 96, 650, this.T('aimLabel', 'Aim'), { size: 22, weight: 800, color: CSS.yellow, origin: [0, 0.5], scale: false }).setDepth(DEPTH.ui);
    this.slider = new Slider(this, 510, 650, 640, 0.05, (v) => this.setAim(v), 28).setDepth(DEPTH.ui);
    this.burnBtn = new Button(this, W - 190, 650, { width: 280, height: 78, size: 30, label: this.T('burnLabel', 'BURN'), icon: 'up', variant: 'warn', onClick: () => this.burn() }).setDepth(DEPTH.ui);
    this.burnBtn.setEnabled(false);
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-LEFT', () => this.state === 'aim' && this.slider.set(clamp(this.slider.value - 0.02, 0, 1)));
      this.input.keyboard.on('keydown-RIGHT', () => this.state === 'aim' && this.slider.set(clamp(this.slider.value + 0.02, 0, 1)));
      this.input.keyboard.on('keydown-B', () => this.burn());
      this.input.keyboard.on('keydown-SPACE', () => this.burn());
    }

    this.setAim(this.slider.value);
    // stuck? point at the slider while aiming, or at BURN when it's time
    idleHint(this, () => {
      if (this.burnBtn.enabled) return { x: this.burnBtn.x, y: this.burnBtn.y - 44 };
      if (this.state === 'aim') return { x: this.slider.x - this.slider.w / 2 + this.slider.w * this.slider.value, y: 630 };
      return null;
    }, { delay: 7000 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'aim';
      this.goal.set(this.T('aimTask', { title: 'Aim for home!', help: 'Slide to aim. Make the dotted path loop around the Moon and back to the green zone.' }));
      this.predict();
    });
  }

  setAim(v) {
    if (this.state !== 'aim' && this.state !== 'intro') return;
    const a = Phaser.Math.DegToRad(AIM_FROM + (AIM_TO - AIM_FROM) * v);
    this.aim = { x: Math.cos(a) * AIM_LEN, y: Math.sin(a) * AIM_LEN };
    this.predict();
  }

  predict() {
    const sim = simulate(this.aim.x * DV_PER_PX, this.aim.y * DV_PER_PX);
    this.sim = sim;
    const good = sim.result === 'good';
    const color = good ? COLORS.green : sim.result === 'moon' ? COLORS.red : COLORS.orange;
    // (a Blitter of dots: it's redrawn every time the aim changes, so it must be cheap)
    const dots = [];
    for (let i = 0; i < sim.pts.length; i += 12) dots.push({ x: sim.pts[i].x, y: sim.pts[i].y, size: i % 48 === 0 ? 4 : 3, alpha: 0.95, tint: color });
    const end = sim.pts[sim.pts.length - 1];
    dots.push({ x: end.x, y: end.y, size: 4, tint: color });
    this.pathDots.clear();
    addDots(this.pathDots, dots);
    // the burn arrow
    const a = this.arrow;
    a.clear();
    const len = Math.hypot(this.aim.x, this.aim.y);
    if (len > 4) {
      const ux = this.aim.x / len, uy = this.aim.y / len;
      const tx = S0.x + this.aim.x, ty = S0.y + this.aim.y;
      a.lineStyle(6, COLORS.yellow, 1);
      a.lineBetween(S0.x, S0.y, tx, ty);
      a.fillStyle(COLORS.yellow, 1);
      a.fillTriangle(tx + ux * 16, ty + uy * 16, tx - uy * 10, ty + ux * 10, tx + uy * 10, ty - ux * 10);
    }
    const msg = {
      good: this.T('goodPath', ''),
      moon: this.T('hitMoon', ''),
      lost: this.T('lost', ''),
      miss: this.T('missEarth', '')
    }[sim.result];
    if (this.state === 'aim' || this.state === 'intro') {
      this.status.setText(this.state === 'aim' ? msg : '').setColor(good ? CSS.green : CSS.orange);
      // found it: say so (only when it changes, not on every nudge of the slider)
      if (good && !this.burnBtn.enabled && this.state === 'aim') {
        Sfx.play('chime');
        Speech.say(msg);
      }
      this.burnBtn.setEnabled(good && this.state === 'aim');
      if (good) this.burnBtn.pulse();
      else this.burnBtn.stopPulse();
    }
  }

  burn() {
    if (this.state === 'aim') {
      if (!this.sim || this.sim.result !== 'good') return;
      this.state = 'fly';
      this.burnBtn.setEnabled(false).stopPulse();
      this.slider.setVisible(false);
      this.arrow.clear();
      Sfx.play('ignition');
      this.status.setText('');
      this.goal.set(this.T('flyTask', { title: 'Swinging around the Moon...', help: 'Get ready for one more burn after the Moon.' }), { speak: false });
      this.path = this.sim.pts;
      this.t = 0;
      this.speed = 70; // path points per second (the trip is shown speeded up)
      // where the second burn should happen: a little after passing the Moon
      this.markIdx = Math.min(this.path.length - 60, this.sim.closest.i + 120);
      this.flame.setVisible(true);
      this.time.delayedCall(900, () => this.flame.setVisible(false));
      return;
    }
    if (this.state === 'fly2') this.secondBurn();
  }

  secondBurn() {
    const i = Math.floor(this.t);
    const d = i - this.markIdx;
    if (d < -22) {
      this.mistakes++;
      Sfx.play('error');
      toast(this, this.T('secondEarly', 'A bit early!'), { y: 650, color: COLORS.orange, sound: false });
      return;
    }
    this.state = 'home';
    this.marker.setVisible(false);
    this.burnBtn.setEnabled(false).stopPulse();
    if (d > 22) this.mistakes++;
    Sfx.play('ignition');
    this.flame.setVisible(true);
    this.time.delayedCall(900, () => this.flame.setVisible(false));
    this.speed *= 1.7;
    toast(this, this.T('secondGood', ''), { y: 650, speak: true, duration: 4200 });
  }

  update(time, delta) {
    if (this.state !== 'fly' && this.state !== 'fly2' && this.state !== 'home') {
      this.ship.y = S0.y + Math.sin(time / 500) * 2;
      return;
    }
    const dt = Math.min(0.05, delta / 1000);
    this.t += this.speed * dt;
    const i = Math.min(this.path.length - 1, Math.floor(this.t));
    const p = this.path[i], q = this.path[Math.min(this.path.length - 1, i + 3)];
    this.ship.setPosition(p.x, p.y);
    if (q !== p) this.ship.rotation = Math.atan2(q.y - p.y, q.x - p.x);
    this.flame.setPosition(p.x - Math.cos(this.ship.rotation) * 36, p.y - Math.sin(this.ship.rotation) * 36).setRotation(this.ship.rotation + Math.PI / 2);
    // the Moon blocks the radio while the ship is behind it (seen from Earth)
    const behind = p.x > M.x - 10 && Phaser.Math.Distance.Between(p.x, p.y, M.x, M.y) < 120;
    this.quiet.setVisible(behind);
    // after passing the Moon: get ready for the second burn
    if (this.state === 'fly' && i > this.sim.closest.i + 30) {
      this.state = 'fly2';
      const m = this.path[this.markIdx];
      this.marker.clear();
      this.marker.lineStyle(4, COLORS.yellow, 1);
      this.marker.strokeCircle(m.x, m.y, 20);
      this.marker.setVisible(true);
      this.tweens.add({ targets: this.marker, alpha: 0.4, duration: 400, yoyo: true, repeat: -1 });
      this.burnBtn.setEnabled(true).pulse();
      this.goal.set(this.T('burn2Task', { title: 'Burn again at the yellow circle!', help: 'Press BURN when the ship reaches the yellow circle.' }));
      this.speed *= 0.45; // slow motion near the marker
    }
    if (this.state === 'fly2' && i > this.markIdx + 22) {
      // missed it: Mission Control calls the burn
      this.mistakes++;
      this.secondBurn();
    }
    if (i >= this.path.length - 1) this.arrive();
  }

  async arrive() {
    if (this.state === 'done') return;
    this.state = 'done';
    Sfx.play('bigSuccess');
    floatText(this, E.x, E.y - 90, '✓', CSS.green, 48);
    this.time.delayedCall(800, () => finishGame(this, { stars: this.mistakes === 0 ? 3 : this.mistakes === 1 ? 2 : 1 }));
  }
}
