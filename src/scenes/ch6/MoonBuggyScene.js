import Phaser from 'phaser';
import { W, H, FULL, COLORS, CSS, DEPTH, seeded } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame, starsFor } from '../common/kit.js';
import { img, makeTex } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { ProgressBar, toast, cameraShake, floatText } from '../../ui/widgets.js';

// Apollo 15 (1971): drive the Lunar Roving Vehicle across the Moon to three geology stops.
// In the Moon's weak gravity the rover floats when it jumps: hop over craters and boulders.
const GROUND = 560; // top of the ground
const ROVER_X = 330;
const SEG = 2600; // distance between stops (px)
const JUMP_V = 470, GRAV = 620; // px/s and px/s² (floaty: the Moon's gravity is 1/6 of Earth's)

// seamless rolling hills (sum of whole-number waves, so the left and right edges match)
function hills(c, w, h, color, amp, seed) {
  const rnd = seeded(seed);
  const waves = [1, 2, 3, 5].map((k) => ({ k, a: amp * (0.5 + rnd()) / k, p: rnd() * Math.PI * 2 }));
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) {
    const y = h * 0.55 - waves.reduce((s, wv) => s + Math.sin((x / w) * Math.PI * 2 * wv.k + wv.p) * wv.a, 0);
    c.lineTo(x, y);
  }
  c.lineTo(w, h);
  c.closePath();
  c.fill();
}

function groundTex(c, w, h) {
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#a9a49b');
  g.addColorStop(1, '#5e5a54');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  const rnd = seeded(15);
  for (let i = 0; i < 160; i++) {
    const x = rnd() * w, y = 6 + rnd() * (h - 6), r = 1 + rnd() * 3;
    c.fillStyle = rnd() < 0.5 ? 'rgba(60,58,54,0.5)' : 'rgba(220,216,206,0.35)';
    // drawn twice near the edges so the tile repeats without a seam
    [x, x - w, x + w].forEach((xx) => {
      c.beginPath();
      c.arc(xx, y, r, 0, Math.PI * 2);
      c.fill();
    });
  }
}

export class MoonBuggyScene extends BaseScene {
  constructor() {
    super('MoonBuggy');
  }

  create() {
    this.setupStage({ bg: 0x000000 });
    if (!this.textures.exists('moonHillsFar')) {
      makeTex(this, 'moonHillsFar', 1024, 220, (c, w, h) => hills(c, w, h, '#6d6a66', 60, 3), 1);
      makeTex(this, 'moonHillsNear', 1024, 200, (c, w, h) => hills(c, w, h, '#8a8680', 40, 7), 1);
      makeTex(this, 'moonGround', 512, FULL.y + FULL.h - GROUND, (c, w, h) => groundTex(c, w, h), 1);
    }
    this.state = 'intro';
    this.bumps = 0;
    this.dist = 0;
    this.vy = 0;
    this.y = 0; // height above the ground
    this.speed = 0;
    this.cruise = this.relaxed ? 210 : 270;
    this.stopIndex = 0;
    this.objects = [];
    this.stops = this.T('stops', []);

    // sky: stars and Earth
    const sg = this.add.graphics();
    const rnd = seeded(4);
    for (let i = 0; i < 160; i++) {
      sg.fillStyle(0xffffff, 0.3 + rnd() * 0.6);
      sg.fillCircle(FULL.x + rnd() * FULL.w, FULL.y + rnd() * (GROUND - FULL.y - 120), rnd() < 0.1 ? 1.6 : 0.9);
    }
    img(this, 900, 150, 'earthSmall', 0.5);
    this.far = this.add.tileSprite(W / 2, GROUND - 90, FULL.w, 220, 'moonHillsFar');
    this.near = this.add.tileSprite(W / 2, GROUND - 60, FULL.w, 200, 'moonHillsNear');
    const gh = FULL.y + FULL.h - GROUND;
    this.ground = this.add.tileSprite(W / 2, GROUND + gh / 2, FULL.w, gh, 'moonGround');
    this.worldLayer = this.add.container(0, 0);

    // the rover and the dust its wheels throw up ("rooster tails")
    this.dust = this.add.particles(0, 0, 'softDot', { speed: { min: 40, max: 120 }, angle: { min: 200, max: 250 }, gravityY: 90, lifespan: 1300, scale: { start: 0.18, end: 0.05 }, alpha: { start: 0.5, end: 0 }, tint: 0xc9c4ba, frequency: 50, emitting: false });
    this.rover = img(this, ROVER_X, GROUND, 'lrv', 1).setOrigin(0.5, 0.94);

    // the course: craters and boulders between the stops, then the stop markers
    this.buildCourse();

    // HUD
    const hy = 96;
    this.stopLabel = txt(this, 60, hy, '', { size: 20, weight: 800, color: CSS.yellow, scale: false }).setDepth(DEPTH.ui);
    this.bar = new ProgressBar(this, 60, hy + 34, 360, 14, { color: COLORS.cyan });
    this.bumpText = txt(this, 60, hy + 58, '', { size: 17, weight: 700, color: CSS.dim, scale: false }).setDepth(DEPTH.ui);
    this.speedText = txt(this, W - 60, hy, '', { size: 20, weight: 800, color: CSS.cyan, origin: [1, 0], scale: false }).setDepth(DEPTH.ui);
    this.jumpBtn = new Button(this, W - 150, 650, { width: 230, height: 78, size: 30, label: this.T('jumpLabel', 'Jump!'), icon: 'up', variant: 'warn', onClick: () => this.jump() });
    this.input.on('pointerdown', (p, over) => {
      if (!over.length) this.jump();
    });
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => this.jump());
      this.input.keyboard.on('keydown-UP', () => this.jump());
    }
    this.updateHud();
    playIntro(this).then((ok) => {
      if (ok) this.go();
    });
  }

  buildCourse() {
    const rnd = seeded(31);
    for (let s = 0; s < this.stops.length; s++) {
      const start = s * SEG + 700, end = (s + 1) * SEG - 400;
      let x = start;
      while (x < end) {
        const crater = rnd() < 0.55;
        const w = crater ? 120 + rnd() * 90 + s * 15 : 50 + rnd() * 34;
        this.objects.push({ kind: crater ? 'crater' : 'rock', x, w, h: crater ? 0 : w * 0.66, hit: false });
        x += w + 300 + rnd() * 320;
      }
      this.objects.push({ kind: 'stop', x: (s + 1) * SEG, index: s });
    }
    this.objects.forEach((o) => this.makeObject(o));
  }

  makeObject(o) {
    if (o.kind === 'crater') {
      // a hole seen slightly from above: a light raised rim around a dark, shadowed bowl
      const g = this.add.graphics();
      g.fillStyle(0xbdb8ae, 1);
      g.fillEllipse(0, 8, o.w + 26, 34);
      g.fillStyle(0x4a4741, 1);
      g.fillEllipse(0, 10, o.w, 24);
      g.fillStyle(0x2a2825, 1);
      g.fillEllipse(-o.w * 0.08, 8, o.w * 0.78, 16);
      o.view = g;
    } else if (o.kind === 'rock') {
      o.view = img(this, 0, 0, 'moonRock', o.w / 90).setOrigin(0.5, 0.9);
    } else {
      // the stop: a little flag and the rock to collect
      const c = this.add.container(0, 0);
      const pole = this.add.rectangle(0, -60, 4, 120, 0xd7dbe3).setOrigin(0.5, 0.5);
      const flag = this.add.rectangle(30, -108, 56, 26, COLORS.yellow).setStrokeStyle(2, 0x070b1d);
      const n = txt(this, 30, -108, String(o.index + 1), { size: 18, weight: 800, color: '#070b1d', origin: 0.5, scale: false });
      const rock = img(this, 70, 0, 'moonRock', o.index === 2 ? 0.5 : 0.45).setOrigin(0.5, 0.9);
      if (o.index === 2) rock.setTint(0xffffff, 0xffffff, 0xd8d4cc, 0xd8d4cc);
      const glow = this.add.image(70, -12, 'softDot').setScale(0.9).setTint(COLORS.yellow).setAlpha(0.45).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: glow, alpha: 0.15, duration: 700, yoyo: true, repeat: -1 });
      c.add([glow, pole, flag, n, rock]);
      o.view = c;
      o.rock = rock;
      o.glow = glow;
    }
    o.view.y = GROUND;
    this.worldLayer.add(o.view);
  }

  go() {
    if (this._leaving) return;
    this.state = 'drive';
    this.tweens.addCounter({ from: this.speed, to: this.cruise, duration: 900, onUpdate: (tw) => (this.speed = tw.getValue()) });
    this.dust.start();
  }

  jump() {
    if (this.state !== 'drive' || this.y > 0.5) return;
    this.vy = JUMP_V;
    Sfx.play('whoosh');
  }

  updateHud() {
    const s = this.stops[this.stopIndex];
    const segStart = this.stopIndex * SEG;
    this.stopLabel.setText(s ? `${this.T('nextLabel', 'Next stop')}: ${s.name}` : this.T('homeLabel', 'Back to the lunar module'));
    this.bar.set(Math.min(1, (this.dist - segStart) / SEG), true);
    this.bumpText.setText(`${this.T('bumpsLabel', 'Bumps')}: ${this.bumps}`);
    this.speedText.setText(`${Math.round((this.speed / 270) * 12)} km/h`);
  }

  bump(o) {
    o.hit = true;
    this.bumps++;
    Sfx.play('hit');
    cameraShake(this, 250, 0.008);
    this.tweens.add({ targets: this.rover, angle: { from: -10, to: 0 }, duration: 500, ease: 'Bounce.easeOut' });
    // it slows down for a moment
    this.speed = this.cruise * 0.35;
    this.tweens.addCounter({ from: this.speed, to: this.cruise, duration: 1400, onUpdate: (tw) => this.state === 'drive' && (this.speed = tw.getValue()) });
    toast(this, o.kind === 'crater' ? this.T('craterHit', 'Bump! Jump over the craters.') : this.T('rockHit', 'Bump! Jump over the boulders.'), { y: 210, color: COLORS.orange, sound: false, duration: 1600 });
  }

  async arrive(o) {
    this.state = 'stop';
    this.dust.stop();
    this.speed = 0;
    this.vy = 0;
    this.y = 0;
    const s = this.stops[o.index];
    Sfx.play('chime');
    // collect the rock
    const r = o.rock;
    const wx = o.view.x + r.x, wy = GROUND + r.y;
    this.worldLayer.remove(r);
    r.setPosition(wx, wy).setDepth(DEPTH.ui);
    o.glow.setVisible(false);
    this.tweens.add({ targets: r, x: ROVER_X - 60, y: GROUND - 70, scale: r.scale * 0.6, duration: 700, ease: 'Quad.easeInOut', onComplete: () => r.setVisible(false) });
    floatText(this, ROVER_X, GROUND - 160, '+1', CSS.yellow, 30);
    const res = await this.guide.say(s.text, { modal: true, position: 'top' });
    if (res === null || this._leaving) return;
    this.stopIndex++;
    if (this.stopIndex >= this.stops.length) return this.finish();
    this.go();
  }

  async finish() {
    this.state = 'done';
    Speech.stop();
    Sfx.play('bigSuccess');
    finishGame(this, { stars: starsFor(this.bumps, 1, 3) });
  }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    if (this.state === 'drive' || this.state === 'stop') {
      this.dist += this.speed * dt;
      // jumping (and falling slowly back down)
      if (this.y > 0 || this.vy > 0) {
        this.vy -= GRAV * dt;
        this.y = Math.max(0, this.y + this.vy * dt);
        if (this.y === 0) {
          this.vy = 0;
          Sfx.play('puff');
        }
      }
      // the stop sits right under the rover's front when it arrives
      const next = this.objects.find((o) => o.kind === 'stop' && o.index === this.stopIndex);
      if (this.state === 'drive' && next && this.dist >= next.x - 190) {
        this.dist = next.x - 190;
        this.arrive(next);
      }
      // bumps: driving into a crater or a boulder without jumping
      if (this.state === 'drive') {
        for (const o of this.objects) {
          if (o.hit || o.kind === 'stop') continue;
          const sx = o.x - this.dist + ROVER_X;
          if (Math.abs(sx - ROVER_X) > o.w / 2 + 40) continue;
          if (o.kind === 'crater' && this.y < 4 && Math.abs(sx - ROVER_X) < o.w / 2 - 24) this.bump(o);
          else if (o.kind === 'rock' && this.y < o.h - 6) this.bump(o);
        }
      }
    }
    // scroll everything
    this.objects.forEach((o) => {
      if (o.view) o.view.x = o.x - this.dist + ROVER_X;
    });
    this.far.tilePositionX = this.dist * 0.15;
    this.near.tilePositionX = this.dist * 0.35;
    this.ground.tilePositionX = this.dist;
    const bob = this.state === 'drive' && this.y === 0 ? Math.sin(time / 70) * 1.5 : 0;
    this.rover.y = GROUND - this.y + bob;
    if (this.y === 0 && this.state === 'drive') this.rover.angle *= 0.9;
    else if (this.state === 'drive') this.rover.angle = Phaser.Math.Clamp(-this.vy / 60, -8, 8);
    this.dust.setPosition(ROVER_X - 90, GROUND - this.y - 6);
    this.dust.emitting = this.state === 'drive' && this.y === 0;
    this.updateHud();
  }
}
