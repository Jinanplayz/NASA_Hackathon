import Phaser from 'phaser';
import { W, H, COLORS, CSS, DEPTH, TEX, lerpColor, clamp } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { toast, dialog, cameraShake, floatText } from '../../ui/widgets.js';
import { live } from '../../core/voiceText.js';

// Fly Freedom 7 from the launch pad to space (100 km), dodging things that
// really are found at each height: clouds, birds, winds, weather balloons and meteors.
const PX_PER_KM = 140;
const SKY = [
  [0, 0x6ec6ff],
  [12, 0x3a86d5],
  [30, 0x1f4fa0],
  [50, 0x16266a],
  [70, 0x0b1440],
  [85, 0x060a24],
  [100, 0x02030a]
];
const GAUGE_X = 1216, GAUGE_TOP = 132, GAUGE_BOT = 640;
const ROCKET_Y = 520;

function skyColor(alt) {
  for (let i = 1; i < SKY.length; i++) {
    if (alt <= SKY[i][0]) {
      const t = (alt - SKY[i - 1][0]) / (SKY[i][0] - SKY[i - 1][0]);
      return lerpColor(SKY[i - 1][1], SKY[i][1], t);
    }
  }
  return SKY[SKY.length - 1][1];
}

export class AscentScene extends BaseScene {
  constructor() {
    super('Ascent');
  }

  create() {
    this.setupStage({ bg: SKY[0][1] });
    this.goal = this.T('goalKm', 100);
    this.layers = this.T('layers', []);
    this.alt = 0;
    this.t = 0;
    this.hits = 0;
    this.state = 'intro';
    this.slow = 0;
    this.invuln = 0;
    this.obstacles = [];
    this.winds = [];
    this.layerShown = new Set();
    this.spawnTimer = 1.2;

    // stars (fade in high up)
    this.stars = this.add.tileSprite(W / 2, H / 2, W, H, 'starsTile').setTileScale(1 / TEX).setAlpha(0);
    // Earth's curved edge, rises into view near space
    this.horizon = this.add.graphics().setAlpha(0);
    this.horizon.fillStyle(0x2f7fd8, 1);
    this.horizon.fillCircle(W / 2, 0, 1600);
    this.horizon.lineStyle(26, 0x7fc4ff, 0.5);
    this.horizon.strokeCircle(W / 2, 0, 1612);
    this.horizon.y = H + 1800;
    this.aurora = img(this, W / 2, 200, 'aurora', 3.2).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);

    // ground & launch pad
    this.ground = this.add.container(0, 0);
    const gg = this.add.graphics();
    gg.fillStyle(0x3f7a4a, 1);
    gg.fillRect(0, 610, W, 200);
    gg.fillStyle(0x7fb069, 1);
    gg.fillRect(0, 606, W, 10);
    gg.fillStyle(0x777b85, 1);
    gg.fillRect(W / 2 - 110, 596, 220, 18);
    gg.lineStyle(3, 0xb8452f, 1);
    gg.strokeRect(W / 2 + 50, 380, 30, 216);
    for (let y = 596; y > 390; y -= 24) gg.lineBetween(W / 2 + 50, y, W / 2 + 80, y - 24);
    // the sea next to Cape Canaveral
    gg.fillStyle(0x2a6fc0, 1);
    gg.fillRect(900, 612, 380, 200);
    this.ground.add(gg);

    // speed streaks
    this.streaks = [];
    for (let i = 0; i < 26; i++) {
      const r = this.add.rectangle(Phaser.Math.Between(40, 1160), Phaser.Math.Between(0, H), 2, Phaser.Math.Between(20, 60), 0xffffff, 0);
      this.streaks.push(r);
    }

    // rocket
    this.rocketX = W / 2;
    this.targetX = W / 2;
    this.rocket = img(this, W / 2, 596 - 75, 'mercuryRedstone', 0.3).setDepth(DEPTH.world + 5);
    this.flame = this.add.image(W / 2, 0, 'flame').setOrigin(0.5, 0).setScale(0.4, 0.7).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.world + 4).setVisible(false);
    this.smoke = this.add.particles(0, 0, 'smoke', {
      speedY: { min: 80, max: 160 },
      speedX: { min: -30, max: 30 },
      lifespan: 1400,
      scale: { start: 0.25, end: 1.1 },
      alpha: { start: 0.5, end: 0 },
      frequency: 45,
      emitting: false
    }).setDepth(DEPTH.world + 3);

    this.buildGauge();
    this.altText = txt(this, GAUGE_X - 34, GAUGE_BOT + 34, '0 km', { size: 22, weight: 800, origin: [1, 0.5], scale: false, stroke: '#070b1d', strokeThickness: 5 }).setDepth(DEPTH.hud);
    this.bumpText = txt(this, W / 2, 94, '', { size: 18, weight: 700, origin: 0.5, scale: false, stroke: '#070b1d', strokeThickness: 5 }).setDepth(DEPTH.hud);

    // controls
    this.keys = this.input.keyboard ? this.input.keyboard.addKeys('LEFT,RIGHT,A,D') : null;
    this.input.on('pointerdown', (p) => {
      if (p.worldY > 70) this.pointerSteer = true;
    });
    this.input.on('pointerup', () => (this.pointerSteer = false));

    this.guide.sequence(this.T('intro', []), { modal: true, lastLabel: Content.ui('play', 'Play') }).then((r) => {
      if (r !== null) this.countdown();
    });
  }

  buildGauge() {
    const g = this.add.graphics().setDepth(DEPTH.hud);
    g.fillStyle(0x070b1d, 0.7);
    g.fillRoundedRect(GAUGE_X - 22, GAUGE_TOP - 16, 44, GAUGE_BOT - GAUGE_TOP + 32, 16);
    const yFor = (km) => GAUGE_BOT - (km / this.goal) * (GAUGE_BOT - GAUGE_TOP);
    this.layers.forEach((l) => {
      const col = Phaser.Display.Color.HexStringToColor(l.color || '#4fd1ff').color;
      g.fillStyle(col, 1);
      g.fillRect(GAUGE_X - 8, yFor(l.to), 16, yFor(l.from) - yFor(l.to));
      g.lineStyle(1, 0xffffff, 0.5);
      g.lineBetween(GAUGE_X - 14, yFor(l.from), GAUGE_X + 14, yFor(l.from));
      txt(this, GAUGE_X - 30, (yFor(l.from) + yFor(l.to)) / 2, l.name, { size: 13, weight: 700, origin: [1, 0.5], scale: false, stroke: '#070b1d', strokeThickness: 4 }).setDepth(DEPTH.hud);
    });
    g.lineStyle(3, COLORS.orange, 1);
    g.lineBetween(GAUGE_X - 18, GAUGE_TOP, GAUGE_X + 18, GAUGE_TOP);
    txt(this, GAUGE_X, GAUGE_TOP - 30, 'SPACE', { size: 13, weight: 800, origin: 0.5, color: CSS.orange, scale: false }).setDepth(DEPTH.hud);
    this.marker = this.add.triangle(GAUGE_X + 22, GAUGE_BOT, 0, 0, 14, -8, 14, 8, COLORS.yellow).setDepth(DEPTH.hud);
    this.yFor = yFor;
  }

  countdown() {
    this.state = 'countdown';
    const big = txt(this, W / 2, 300, '3', { size: 110, weight: 800, origin: 0.5, scale: false, stroke: '#070b1d', strokeThickness: 10 }).setDepth(DEPTH.toast);
    this.rumble = Sfx.rumble({ freq: 200, vol: 0.45 });
    let n = 3;
    Sfx.play('tick');
    this.time.addEvent({
      delay: 800,
      repeat: 3,
      callback: () => {
        n--;
        if (n > 0) {
          big.setText(String(n));
          Sfx.play('tick');
          this.rumble.set(0.2 * (4 - n));
        } else if (n === 0) {
          big.setText(Content.ui('liftoff', 'Liftoff!'));
          Sfx.play('ignition');
          this.flame.setVisible(true);
          this.smoke.emitting = true;
          this.rumble.set(1, 320);
          cameraShake(this, 800, 0.006);
          this.state = 'flying';
          this.tweens.add({ targets: this.rocket, y: ROCKET_Y, duration: 2200, ease: 'Sine.easeInOut' });
        } else {
          this.tweens.add({ targets: big, alpha: 0, duration: 400, onComplete: () => big.destroy() });
        }
      }
    });
  }

  spawn() {
    const a = this.alt;
    const r = Math.random();
    const x = Phaser.Math.Between(90, 1120);
    if (a < 3 && r < 0.35) {
      // a flock of birds flying sideways
      const dir = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < 3; i++) this.addObstacle('bird', dir > 0 ? -40 - i * 40 : W + 40 + i * 40, -40 - i * 26, { vx: dir * 110, r: 16, scale: 1.1, flip: dir < 0 });
    } else if (a < 11) {
      if (r < 0.2 && a > 2) this.addWind();
      else this.addObstacle('cloud' + Phaser.Math.Between(0, 2), x, -70, { r: 52, scale: 0.9 + Math.random() * 0.5, alpha: 0.95 });
    } else if (a < 45) {
      if (r < 0.3) this.addWind();
      else if (a > 14 && a < 38) this.addObstacle('balloon', x, -80, { r: 30, scale: 0.9, sway: true });
      else this.addObstacle('cloud' + Phaser.Math.Between(0, 2), x, -70, { r: 48, scale: 0.8, alpha: 0.55 });
    } else if (a < 88) {
      const fromLeft = Math.random() < 0.5;
      this.addObstacle('meteor', fromLeft ? Phaser.Math.Between(100, 600) : Phaser.Math.Between(600, 1100), -60, {
        r: 20,
        vx: fromLeft ? 130 : -130,
        extraVy: 180,
        angle: fromLeft ? 150 : 30,
        scale: 0.9
      });
    }
  }

  addObstacle(key, x, y, o = {}) {
    const s = img(this, x, y, key, o.scale ?? 1).setDepth(DEPTH.world + 2);
    if (o.alpha) s.setAlpha(o.alpha);
    if (o.flip) s.setFlipX(true);
    if (o.angle !== undefined) s.setAngle(o.angle);
    if (key === 'bird') this.tweens.add({ targets: s, scaleY: s.scaleY * 0.5, duration: 180, yoyo: true, repeat: -1 });
    this.obstacles.push({ s, key, r: (o.r ?? 30) * (o.scale ?? 1), vx: o.vx ?? 0, extraVy: o.extraVy ?? 0, sway: o.sway, phase: Math.random() * 6 });
  }

  addWind() {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const c = this.add.container(0, -60).setDepth(DEPTH.world + 1);
    const g = this.add.graphics();
    c.add(g);
    const label = txt(this, dir > 0 ? 140 : W - 240, 0, dir > 0 ? 'wind →' : '← wind', { size: 20, weight: 800, origin: 0.5, scale: false, color: '#ffffff', stroke: '#1a3a7a', strokeThickness: 5 });
    c.add(label);
    this.winds.push({ c, g, dir, h: 90, phase: 0 });
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    this.t += dt;
    // steering
    if (this.state === 'flying' || this.state === 'countdown') {
      const speed = 520;
      if (this.keys) {
        if (this.keys.LEFT.isDown || this.keys.A.isDown) this.targetX -= speed * dt;
        if (this.keys.RIGHT.isDown || this.keys.D.isDown) this.targetX += speed * dt;
      }
      if (this.pointerSteer && this.input.activePointer.isDown) this.targetX = this.input.activePointer.worldX;
      this.targetX = clamp(this.targetX, 90, 1130);
    }
    if (this.state !== 'flying') {
      this.syncRocketParts();
      return;
    }

    // climb
    let v = 0.9 + 0.03 * this.t;
    if (this.slow > 0) {
      this.slow -= dt;
      v *= 0.55;
    }
    if (this.relaxed) v *= 1.0;
    this.alt = Math.min(this.goal, this.alt + v * dt);
    const scroll = v * PX_PER_KM;

    // rocket movement
    const prevX = this.rocketX;
    this.rocketX += (this.targetX - this.rocketX) * Math.min(1, dt * 7);
    // winds push the rocket
    this.winds.forEach((w) => {
      if (Math.abs(w.c.y - ROCKET_Y) < w.h) {
        this.targetX += w.dir * 150 * dt;
        this.rocketX += w.dir * 120 * dt;
        if (!w.told) {
          w.told = true;
          floatText(this, this.rocketX, ROCKET_Y - 110, this.T('hits', {}).wind || 'Strong winds!', CSS.cyan, 22);
        }
      }
    });
    this.rocketX = clamp(this.rocketX, 70, 1140);
    this.rocket.x = this.rocketX;
    this.rocket.setAngle(clamp((this.rocketX - prevX) * 1.5, -14, 14));
    this.syncRocketParts();

    // background
    this.cameras.main.setBackgroundColor(skyColor(this.alt));
    this.stars.setAlpha(clamp((this.alt - 35) / 40, 0, 1));
    this.stars.tilePositionY -= scroll * dt * 0.2 * TEX;
    this.ground.y += scroll * dt;
    if (this.alt > 40) {
      const k = clamp((this.alt - 40) / 60, 0, 1);
      this.horizon.setAlpha(k);
      this.horizon.y = H + 1600 - k * 140;
    }
    this.aurora.setAlpha(clamp((this.alt - 86) / 10, 0, 0.6));
    this.streaks.forEach((r) => {
      r.y += scroll * dt * 2.2;
      r.fillAlpha = clamp(0.15 + v * 0.08, 0, 0.45) * (this.alt < 60 ? 1 : 0.4);
      if (r.y > H + 40) {
        r.y = -40;
        r.x = Phaser.Math.Between(40, 1160);
      }
    });
    this.rumble && this.rumble.set(clamp(1 - this.alt / 130, 0.25, 1), 320 - this.alt);

    // layer facts
    this.layers.forEach((l, i) => {
      if (this.alt >= Math.max(0.6, l.from) && !this.layerShown.has(i)) {
        this.layerShown.add(i);
        toast(this, l.fact, { y: 150, color: Phaser.Display.Color.HexStringToColor(l.color).color, duration: 4200, speak: true, wrap: 700 });
      }
    });

    // spawning
    if (this.alt < this.goal - 4) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawn();
        const base = this.alt < 45 ? 1.15 : 1.35;
        this.spawnTimer = base * (this.relaxed ? 1.7 : 1) * (0.75 + Math.random() * 0.5);
      }
    }

    // move obstacles & collisions
    this.invuln = Math.max(0, this.invuln - dt);
    this.rocket.setAlpha(this.invuln > 0 ? 0.5 + 0.5 * Math.sin(this.t * 30) : 1);
    const pts = [-60, -10, 45].map((dy) => ({ x: this.rocket.x + Math.sin(this.rocket.rotation) * -dy, y: this.rocket.y + dy }));
    this.obstacles = this.obstacles.filter((o) => {
      const s = o.s;
      s.y += (scroll + o.extraVy) * dt * (this.relaxed ? 0.85 : 1);
      s.x += o.vx * dt;
      if (o.sway) s.x += Math.sin(this.t * 2 + o.phase) * 30 * dt;
      if (this.invuln <= 0 && pts.some((p) => Phaser.Math.Distance.Between(p.x, p.y, s.x, s.y) < o.r + 9)) this.onHit(o);
      if (s.y > H + 120 || s.x < -200 || s.x > W + 200) {
        s.destroy();
        return false;
      }
      return true;
    });
    this.winds = this.winds.filter((w) => {
      w.c.y += scroll * dt;
      w.phase += dt * 6;
      w.g.clear();
      w.g.lineStyle(3, 0xffffff, 0.45);
      for (let row = -1; row <= 1; row++) {
        const pts2 = [];
        for (let x = 0; x <= W; x += 24) pts2.push({ x, y: row * 26 + Math.sin(x / 60 + w.phase * w.dir + row) * 8 });
        w.g.strokePoints(pts2, false);
      }
      if (w.c.y > H + 80) {
        w.c.destroy();
        return false;
      }
      return true;
    });

    // HUD
    this.marker.y = this.yFor(this.alt);
    this.altText.setText(`${Math.floor(this.alt)} km`);
    this.bumpText.setText(this.hits ? `Bumps: ${this.hits}` : '');

    if (this.alt >= this.goal) this.reachSpace();
  }

  syncRocketParts() {
    const bottom = this.rocket.y + 75 * Math.cos(this.rocket.rotation);
    this.flame.setPosition(this.rocket.x - Math.sin(this.rocket.rotation) * 75, bottom - 4).setRotation(this.rocket.rotation);
    this.flame.scaleY = 0.65 + Math.random() * 0.2;
    this.smoke.setPosition(this.flame.x, this.flame.y + 30);
  }

  onHit(o) {
    this.hits++;
    this.invuln = 1.3;
    this.slow = 0.9;
    Sfx.play('hit');
    cameraShake(this, 220, 0.008);
    const kind = o.key.startsWith('cloud') ? 'cloud' : o.key;
    floatText(this, this.rocket.x, this.rocket.y - 110, (this.T('hits', {})[kind]) || 'Bump!', CSS.orange, 24);
    this.tweens.add({ targets: o.s, alpha: 0.2, duration: 300 });
  }

  reachSpace() {
    this.state = 'space';
    this.smoke.emitting = false;
    if (this.rumble) this.rumble.set(0.2);
    this.obstacles.forEach((o) => this.tweens.add({ targets: o.s, alpha: 0, duration: 400 }));
    Sfx.play('bigSuccess');
    const banner = (this.spaceBanner = txt(this, W / 2, 250, 'SPACE!', { size: 96, weight: 800, origin: 0.5, color: CSS.yellow, scale: false, stroke: '#070b1d', strokeThickness: 10 }).setDepth(DEPTH.toast).setScale(0.3));
    this.tweens.add({ targets: banner, scale: 1, duration: 600, ease: 'Back.easeOut' });
    toast(this, this.T('spaceText', ''), { y: 340, color: COLORS.yellow, duration: 4500, speak: true, wrap: 760 });

    // separation: escape tower flies off, booster falls away, capsule coasts on
    this.time.delayedCall(1500, () => {
      this.flame.setVisible(false);
      if (this.rumble) this.rumble.stop();
      const rx = this.rocket.x, ry = this.rocket.y;
      this.rocket.setVisible(false);
      const booster = img(this, rx, ry + 75 * 0.3 * 3.6 - 20, 'redstoneOnly', 0.3).setDepth(DEPTH.world + 4);
      const capsule = img(this, rx, ry - 60, 'mercuryCapsuleSolo', 0.42).setDepth(DEPTH.world + 5);
      const tower = img(this, rx, ry - 95, 'bp_escapeTower', 0.3).setDepth(DEPTH.world + 5);
      Sfx.play('whoosh');
      this.tweens.add({ targets: booster, y: H + 200, angle: 25, duration: 3500, ease: 'Quad.easeIn' });
      this.tweens.add({ targets: tower, x: rx + 300, y: -100, angle: 60, duration: 1600, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: capsule, y: ry - 140, duration: 3000, ease: 'Sine.easeOut' });
    });
    this.time.delayedCall(4200, () => this.showResult());
  }

  async showResult() {
    if (this.spaceBanner) this.tweens.add({ targets: this.spaceBanner, alpha: 0, duration: 250 });
    const stars = this.hits <= 2 ? 3 : this.hits <= 5 ? 2 : 1;
    await dialog(this, {
      title: this.T('resultTitle', 'You reached space!'),
      stars,
      text: this.T('resultText', '').replace('{hits}', this.hits) + '\n\n' + this.T('endLines', []).join(' '),
      speak: [this.T('resultTitle', 'You reached space!'), live(this.T('resultText', '').replace('{hits}', this.hits)), ...this.T('endLines', [])],
      buttons: [
        { label: Content.ui('tryAgain', 'Try again'), value: 'retry', variant: 'secondary', icon: 'restart' },
        { label: this.T('continue', Content.ui('continue', 'Continue')), value: 'next', icon: 'next' }
      ],
      width: 820
    }).then((v) => {
      if (v === 'retry') this.scene.restart(this.payload);
      else this.done(stars);
    });
  }

  onShutdown() {
    if (this.rumble) this.rumble.stop();
  }
}
