import Phaser from 'phaser';
import { W, FULL, COLORS, CSS, DEPTH, TEX, clamp, seeded } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { toast, dialog, floatText, pointerArrow, RoundBox } from '../../ui/widgets.js';
import { live } from '../../core/voiceText.js';
import { Speech, estimateMs } from '../../core/Speech.js';

// Steer the Juno I rocket along the glowing path into orbit. As Explorer 1 climbs,
// a row of TVs lights up, one by one, showing what satellites made possible. Each TV is
// read out in full before the next one switches on.
const EARTH = { x: 640, y: 3000, r: 2480 };
const ORBIT_R = 2810;
const N = 300;
const BAR_Y = 574;

function earthY(x, r) {
  return EARTH.y - Math.sqrt(r * r - (x - EARTH.x) * (x - EARTH.x));
}

export class OrbitControlScene extends BaseScene {
  constructor() {
    super('OrbitControl');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 160, height: BAR_Y });
    this.state = 'intro';
    this.t = 0;
    this.inside = 0;
    this.total = 0;
    this.idx = 0;
    this.staged = false;
    this.tvNext = 0; // the next TV to switch on
    this.tvBusy = false; // a TV's milestone is being read out
    this.tvDone = Promise.resolve();

    // Earth and the orbit line
    const g = this.add.graphics();
    g.fillStyle(0x7fc4ff, 0.18);
    g.fillCircle(EARTH.x, EARTH.y, EARTH.r + 26);
    g.fillStyle(0x2f7fd8, 1);
    g.fillCircle(EARTH.x, EARTH.y, EARTH.r);
    g.fillStyle(0x3e9e57, 1);
    g.fillEllipse(260, earthY(260, EARTH.r) + 30, 260, 60);
    g.fillEllipse(900, earthY(900, EARTH.r) + 40, 400, 70);
    g.lineStyle(2, COLORS.dim, 0.35);
    const orbitPts = [];
    for (let x = FULL.x; x <= FULL.x + FULL.w; x += 20) orbitPts.push({ x, y: earthY(x, ORBIT_R) });
    g.strokePoints(orbitPts, false);
    txt(this, 1100, earthY(1100, ORBIT_R) - 26, this.T('orbitLabel', 'Orbit'), { size: 16, weight: 700, color: CSS.dim, origin: 0.5, scale: false });
    txt(this, 200, earthY(200, EARTH.r) + 22, this.T('launchLabel', 'Cape Canaveral'), { size: 14, weight: 700, origin: 0.5, scale: false, stroke: '#070b1d', strokeThickness: 4 });

    // the ideal path
    const ctrl = [
      [200, earthY(200, EARTH.r) - 4],
      [208, 470],
      [245, 385],
      [320, 305],
      [440, 245],
      [590, 208]
    ];
    for (let x = 700; x <= 1230; x += 90) ctrl.push([x, earthY(x, ORBIT_R)]);
    const curve = new Phaser.Curves.Spline(ctrl.map(([x, y]) => new Phaser.Math.Vector2(x, y)));
    this.path = curve.getSpacedPoints(N - 1);
    this.half = this.relaxed ? 52 : 36;
    const pg = this.add.graphics();
    pg.lineStyle(this.half * 2, COLORS.cyan, 0.12);
    pg.strokePoints(this.path, false);
    pg.lineStyle(3, COLORS.cyan, 0.55);
    for (let i = 0; i < N - 1; i += 6) pg.lineBetween(this.path[i].x, this.path[i].y, this.path[i + 2].x, this.path[i + 2].y);
    this.trail = this.add.graphics();

    // rocket
    this.pos = new Phaser.Math.Vector2(this.path[0].x, this.path[0].y - 10);
    this.lastDot = null;
    this.heading = -Math.PI / 2;
    this.rocket = img(this, this.pos.x, this.pos.y, 'juno', 0.26).setDepth(DEPTH.world + 5);
    this.flame = this.add.image(0, 0, 'flame').setScale(0.22, 0.4).setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.world + 4);
    this.warn = txt(this, W / 2, 178, '', { size: 22, weight: 800, color: CSS.orange, origin: 0.5, stroke: '#070b1d', strokeThickness: 6, scale: false }).setDepth(DEPTH.hud);

    // TV bar
    this.buildTVs();

    // controls
    this.keys = this.input.keyboard ? this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S') : null;
    // while Captain Nova explains, point at the TVs so it's clear what they are
    const arrow = pointerArrow(this, W / 2, BAR_Y - 70, 'down', COLORS.yellow).setDepth(DEPTH.guide + 5);
    this.tvTitle.setDepth(DEPTH.guide + 5);
    this.guide.sequence(this.T('intro', []), { modal: true, position: 'top', lastLabel: Content.ui('play', 'Play') }).then((r) => {
      arrow.destroy();
      if (r === null) return;
      this.tvTitle.setDepth(DEPTH.ui + 2);
      this.state = 'flying';
      this.rumble = Sfx.rumble({ freq: 240, vol: 0.3 });
      this.rumble.set(0.8);
      Sfx.play('ignition');
    });
  }

  buildTVs() {
    const bar = this.add.graphics().setDepth(DEPTH.ui);
    bar.fillStyle(0x0b1230, 0.95);
    bar.fillRect(FULL.x, BAR_Y, FULL.w, FULL.y + FULL.h - BAR_Y);
    bar.lineStyle(2, COLORS.stroke, 1);
    bar.lineBetween(FULL.x, BAR_Y, FULL.x + FULL.w, BAR_Y);
    // what the TVs are for
    const title = txt(this, 0, 0, this.T('tvsTitle', 'What satellites did next'), { size: 15, weight: 800, color: CSS.yellow, origin: 0.5, scale: false });
    const tw = title.width + 36;
    const tg = this.add.existing(new RoundBox(this)).draw(-tw / 2, -15, tw, 30, { fill: 0x0b1230, alpha: 0.95, radius: 15, stroke: COLORS.yellow, strokeWidth: 2, strokeAlpha: 0.8, shadow: false });
    this.tvTitle = this.add.container(W / 2, BAR_Y - 26, [tg, title]).setDepth(DEPTH.ui + 2);
    this.tvs = this.T('tvs', []).map((tv, i, arr) => {
      const x = 110 + i * ((W - 220) / Math.max(1, arr.length - 1));
      const y = BAR_Y + 58;
      const c = this.add.container(x, y).setDepth(DEPTH.ui + 1);
      const cab = this.add.graphics();
      cab.lineStyle(3, 0x9aa1ae, 1);
      cab.lineBetween(-8, -52, -26, -72);
      cab.lineBetween(8, -52, 26, -72);
      cab.fillStyle(0x6b4a2f, 1);
      cab.fillRoundedRect(-84, -52, 168, 100, 14);
      cab.fillStyle(0x4d3420, 1);
      cab.fillRoundedRect(58, -40, 18, 76, 6);
      cab.fillStyle(0xd8c3a0, 1);
      cab.fillCircle(67, -24, 5);
      cab.fillCircle(67, -6, 5);
      const screen = this.add.graphics();
      c.add([cab, screen]);
      const label = txt(this, x - 8, BAR_Y + 128, `${tv.year} · ${tv.name}`, { size: 13, weight: 700, origin: 0.5, scale: false, color: CSS.dim }).setDepth(DEPTH.ui + 1);
      const obj = { c, screen, label, tv, lit: false, threshold: (i + 1) / (arr.length + 1) };
      this.drawScreen(obj, 0);
      return obj;
    });
  }

  // Screen contents: off, turning on, then the picture (black & white or colour).
  drawScreen(o, phase) {
    const s = o.screen;
    const x0 = -76, y0 = -44, w = 128, h = 84;
    s.clear();
    s.fillStyle(0x1a1d24, 1);
    s.fillRoundedRect(x0, y0, w, h, 12);
    if (phase === 0) {
      s.fillStyle(0xffffff, 0.06);
      s.fillRoundedRect(x0 + 8, y0 + 6, w * 0.5, h * 0.25, 8);
      return;
    }
    if (phase < 1) {
      s.fillStyle(0xffffff, 0.9);
      s.fillRect(x0 + w / 2 - (w / 2) * phase, y0 + h / 2 - 2, w * phase, 4);
      return;
    }
    const bw = !o.tv.color;
    const col = (c, grey) => (bw ? grey : c);
    const cx = x0 + w / 2, cy = y0 + h / 2;
    s.fillStyle(col(0x0b1640, 0x2a2a2a), 1);
    s.fillRoundedRect(x0, y0, w, h, 12);
    switch (o.tv.picture) {
      case 'beep':
        s.fillStyle(0xdddddd, 1);
        s.fillCircle(cx - 20, cy + 6, 6);
        s.lineStyle(2, 0xdddddd, 0.9);
        for (let k = 1; k <= 3; k++) {
          s.beginPath();
          s.arc(cx - 20, cy + 6, k * 12, -1.2, 0.2);
          s.strokePath();
        }
        break;
      case 'clouds':
        s.fillStyle(0xbbbbbb, 1);
        s.fillCircle(cx, cy, 30);
        s.fillStyle(0x6a6a6a, 1);
        s.fillEllipse(cx - 6, cy - 6, 36, 14);
        s.fillEllipse(cx + 8, cy + 10, 30, 12);
        s.lineStyle(3, 0xeeeeee, 0.9);
        s.beginPath();
        s.arc(cx, cy, 18, 0.3, 4.2);
        s.strokePath();
        break;
      case 'ocean':
        s.fillStyle(col(0x2f7fd8, 0x555555), 1);
        s.fillRect(x0 + 4, cy - 4, w - 8, 36);
        s.fillStyle(col(0x3e9e57, 0x999999), 1);
        s.fillRect(x0 + 4, cy + 6, 26, 26);
        s.fillRect(x0 + w - 30, cy + 6, 26, 26);
        s.lineStyle(3, col(0xffd166, 0xffffff), 1);
        s.beginPath();
        s.arc(cx, cy + 40, 50, -2.6, -0.5);
        s.strokePath();
        s.fillStyle(col(0xff6b6b, 0xffffff), 1);
        s.fillCircle(cx, cy - 12, 5);
        break;
      case 'torch':
        s.fillStyle(col(0x9aa1ae, 0x999999), 1);
        s.fillTriangle(cx - 8, cy - 2, cx + 8, cy - 2, cx, cy + 34);
        s.fillStyle(col(0xff9f43, 0xdddddd), 1);
        s.fillEllipse(cx, cy - 14, 22, 30);
        s.fillStyle(col(0xffd166, 0xffffff), 1);
        s.fillEllipse(cx, cy - 10, 10, 16);
        break;
      case 'landsat': {
        const rnd = seeded(4);
        s.fillStyle(col(0x1b2a6c, 0x333333), 1);
        s.fillRoundedRect(x0, y0, w, h, 12);
        for (let k = 0; k < 14; k++) {
          s.fillStyle(col([0xe0445a, 0xff7eb6, 0xb8325a][k % 3], 0x888888), 1);
          s.fillRect(x0 + 6 + rnd() * (w - 30), y0 + 6 + rnd() * (h - 26), 12 + rnd() * 18, 8 + rnd() * 12);
        }
        s.fillStyle(col(0x4fd1ff, 0xcccccc), 1);
        s.fillRect(x0 + 10, cy + 12, w - 20, 5);
        break;
      }
      case 'gps':
        s.fillStyle(col(0xe8f0dc, 0xcccccc), 1);
        s.fillRoundedRect(x0, y0, w, h, 12);
        s.lineStyle(2, col(0xb9c0cc, 0x888888), 1);
        for (let k = 1; k < 5; k++) s.lineBetween(x0 + k * 26, y0, x0 + k * 26, y0 + h);
        s.lineBetween(x0, cy, x0 + w, cy);
        s.fillStyle(col(0xff6b6b, 0x333333), 1);
        s.fillCircle(cx + 10, cy - 14, 11);
        s.fillTriangle(cx + 1, cy - 9, cx + 19, cy - 9, cx + 10, cy + 8);
        s.fillStyle(0xffffff, 1);
        s.fillCircle(cx + 10, cy - 14, 4);
        break;
      default:
        break;
    }
    s.fillStyle(0xffffff, 0.07);
    s.fillRoundedRect(x0 + 8, y0 + 6, w * 0.5, h * 0.22, 8);
  }

  // Switches a TV on and reads out its milestone. Resolves once it has been read in full
  // (or, with read-aloud off, after enough time to read it).
  lightTV(o) {
    o.lit = true;
    this.tvNext = Math.max(this.tvNext, this.tvs.indexOf(o) + 1);
    this.tvBusy = true;
    Sfx.play('static');
    const tw = this.tweens.addCounter({
      from: 0.05,
      to: 1,
      duration: 380,
      onUpdate: (t) => this.drawScreen(o, Math.min(0.99, t.getValue())),
      onComplete: () => {
        this.drawScreen(o, 1);
        Sfx.play('chime');
        o.label.setColor(o.tv.color ? CSS.yellow : CSS.text);
        this.tweens.add({ targets: o.c, scale: 1.12, duration: 160, yoyo: true });
      }
    });
    // the card stays up until the milestone has been read out
    const card = toast(this, `${o.tv.year} · ${o.tv.name}: ${o.tv.fact}`, { y: 110, color: o.tv.color ? COLORS.yellow : COLORS.dim, duration: 600000, sound: false, wrap: 820 });
    const words = [o.tv.year, o.tv.name, o.tv.fact];
    const spoken = Speech.say(words);
    const readTime = new Promise((r) => this.time.delayedCall(Math.max(3500, estimateMs(words) * 0.8), r));
    const here = this.stillHere();
    this.tvDone = Promise.all([spoken, readTime]).then(() => {
      if (!here()) return;
      this.tvBusy = false;
      if (card.active) this.tweens.add({ targets: card, alpha: 0, y: card.y - 20, duration: 260, onComplete: () => card.destroy() });
    });
    return this.tvDone;
  }

  nearest() {
    let best = this.idx, bestD = Infinity;
    const lo = Math.max(0, this.idx - 8), hi = Math.min(N - 1, this.idx + 40);
    for (let i = lo; i <= hi; i++) {
      const d = Phaser.Math.Distance.Between(this.pos.x, this.pos.y, this.path[i].x, this.path[i].y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return { i: best, d: bestD };
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    if (this.state !== 'flying') return;
    this.t += dt;

    // steering
    const turn = Phaser.Math.DegToRad(100) * dt;
    if (this.keys) {
      if (this.keys.LEFT.isDown || this.keys.A.isDown || this.keys.UP.isDown || this.keys.W.isDown) this.heading -= turn;
      if (this.keys.RIGHT.isDown || this.keys.D.isDown || this.keys.DOWN.isDown || this.keys.S.isDown) this.heading += turn;
    }
    const p = this.input.activePointer;
    if (p.isDown && p.worldY < BAR_Y && p.worldY > 70) {
      const want = Math.atan2(p.worldY - this.pos.y, p.worldX - this.pos.x);
      const diff = Phaser.Math.Angle.Wrap(want - this.heading);
      this.heading += clamp(diff, -turn * 1.3, turn * 1.3);
    }
    // wobble from the wind and the rocket itself
    const amp = Phaser.Math.DegToRad(this.relaxed ? 14 : 28);
    this.heading += (Math.sin(this.t * 0.9) * 0.6 + Math.sin(this.t * 2.3 + 1) * 0.4) * amp * dt;

    const near = this.nearest();
    this.idx = Math.max(this.idx, near.i);
    const tangent = this.path[Math.min(N - 1, near.i + 1)].clone().subtract(this.path[Math.max(0, near.i - 1)]);
    const tAng = Math.atan2(tangent.y, tangent.x);
    const inside = near.d <= this.half;
    if (this.relaxed) this.heading += Phaser.Math.Angle.Wrap(tAng - this.heading) * 0.4 * dt;
    let speed = this.relaxed ? 26 : 30;
    if (!inside) {
      speed *= 0.6;
      // gently pull back so nobody gets lost
      this.pos.x += (this.path[near.i].x - this.pos.x) * 0.9 * dt;
      this.pos.y += (this.path[near.i].y - this.pos.y) * 0.9 * dt;
      this.heading += Phaser.Math.Angle.Wrap(tAng - this.heading) * 1.2 * dt;
      this.warn.setText(this.T('steerBack', 'Steer back to the glowing path!'));
    } else {
      this.warn.setText('');
    }
    this.total += dt;
    if (inside) this.inside += dt;
    this.pos.x += Math.cos(this.heading) * speed * dt;
    this.pos.y += Math.sin(this.heading) * speed * dt;

    this.rocket.setPosition(this.pos.x, this.pos.y).setRotation(this.heading + Math.PI / 2);
    const back = this.staged ? 30 : 42;
    this.flame.setPosition(this.pos.x - Math.cos(this.heading) * back, this.pos.y - Math.sin(this.heading) * back).setRotation(this.heading + Math.PI / 2);
    this.flame.scaleY = 0.35 + Math.random() * 0.12;
    // a dot every few pixels draws the same line with far fewer shapes than one per frame
    if (!this.lastDot || Phaser.Math.Distance.Between(this.lastDot.x, this.lastDot.y, this.pos.x, this.pos.y) >= 2.5) {
      this.lastDot = { x: this.pos.x, y: this.pos.y };
      this.trail.fillStyle(inside ? COLORS.yellow : COLORS.orange, 0.55);
      this.trail.fillCircle(this.pos.x, this.pos.y, 1.6);
    }

    // staging
    const s = this.idx / (N - 1);
    if (!this.staged && s > 0.38) {
      this.staged = true;
      Sfx.play('whoosh');
      const stage = img(this, this.pos.x, this.pos.y + 10, 'redstoneOnly', 0.17).setRotation(this.heading + Math.PI / 2);
      this.tweens.add({ targets: stage, x: stage.x - 60, y: stage.y + 260, angle: stage.angle - 70, alpha: 0, duration: 3000 });
      this.rocket.setTexture('junoTop').setScale(0.62 / TEX);
      floatText(this, this.pos.x, this.pos.y - 40, this.T('stageText', 'Stage 1 drops away!'), CSS.cyan, 20);
    }
    // one TV at a time: the next waits until the last one has been read out
    const next = this.tvs[this.tvNext];
    if (next && !this.tvBusy && s >= next.threshold) this.lightTV(next);
    if (this.rumble) this.rumble.set(0.8 - s * 0.5);
    if (near.i >= N - 3 || this.pos.x > W - 40) this.reachOrbit();
  }

  async reachOrbit() {
    this.state = 'orbit';
    this.warn.setText('');
    if (this.rumble) this.rumble.stop();
    this.flame.setVisible(false);
    Sfx.play('bigSuccess');
    // Explorer 1 separates and glides along the orbit, beeping
    const ex = img(this, this.pos.x, this.pos.y, 'explorer1', 0.35).setRotation(this.heading + Math.PI / 2);
    this.rocket.setVisible(false);
    let x = this.pos.x;
    const tw = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 2600,
      onUpdate: (t) => {
        const nx = Phaser.Math.Linear(x, W - 60, t.getValue());
        ex.setPosition(nx, earthY(nx, ORBIT_R));
        ex.rotation += 0.3;
      }
    });
    const beeps = this.time.addEvent({ delay: 500, repeat: 5, callback: () => Sfx.play('beep') });
    const pct = this.total ? this.inside / this.total : 1;
    const stars = pct > 0.85 ? 3 : pct > 0.6 ? 2 : 1;
    // every TV still to come switches on and is read out, one after another
    const here = this.stillHere();
    const glide = new Promise((r) => this.time.delayedCall(2600, r));
    await this.tvDone;
    while (here() && this.tvNext < this.tvs.length) await this.lightTV(this.tvs[this.tvNext]);
    await glide;
    if (!here()) return;
    {
      dialog(this, {
        title: this.T('resultTitle', 'Explorer 1 is in orbit!'),
        stars,
        text: `${this.T('resultText', '').replace('{pct}', Math.round(pct * 100))}\n\n${this.T('resultMore', '')}`,
        speak: [this.T('resultTitle', 'Explorer 1 is in orbit!'), live(this.T('resultText', '').replace('{pct}', Math.round(pct * 100))), this.T('resultMore', '')],
        buttons: [
          { label: Content.ui('tryAgain', 'Try again'), value: 'retry', variant: 'secondary', icon: 'restart' },
          { label: Content.ui('continue', 'Continue'), value: 'next', icon: 'next' }
        ],
        width: 800
      }).then((v) => {
        if (v === 'retry') this.scene.restart(this.payload);
        else this.done(stars);
      });
    }
  }

  onShutdown() {
    if (this.rumble) this.rumble.stop();
  }
}
