import Phaser from 'phaser';
import { W, H, FULL, COLORS, CSS, DEPTH, TEX, clamp } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { toast, dialog, cameraShake, floatText } from '../../ui/widgets.js';
import { live } from '../../core/voiceText.js';

// 30-second trip from Earth to the Moon: dodge satellites near Earth,
// then space rocks and dust further out.
const SHIP_X = 250;
const TOP = 96, BOTTOM = 690;

export class SpaceDodgeScene extends BaseScene {
  constructor() {
    super('SpaceDodge');
  }

  create() {
    this.setupStage({ bg: 0x03050f });
    this.duration = this.T('duration', 30);
    this.t = 0;
    this.hits = 0;
    this.invuln = 0;
    this.state = 'intro';
    this.obstacles = [];
    this.spawnT = 0.8;
    this.factsShown = new Set();

    this.far = this.add.tileSprite(W / 2, H / 2, FULL.w, FULL.h, 'starsTile').setTileScale(1 / TEX).setAlpha(0.6);
    this.near = this.add.tileSprite(W / 2, H / 2, FULL.w, FULL.h, 'starsTile').setTileScale(1.6 / TEX).setAlpha(0.9);
    this.earth = img(this, 60, H / 2 + 40, 'earthBig', 1.0);
    this.moon = img(this, W + 260, H / 2, 'moon', 1.5);

    this.ship = img(this, SHIP_X, H / 2, 'csmLm', 0.62).setDepth(DEPTH.world + 5);
    this.targetY = H / 2;
    this.engine = this.add.image(0, 0, 'flame').setScale(0.18, 0.3).setRotation(Math.PI / 2).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.world + 4).setVisible(false);
    this.shield = this.add.circle(SHIP_X, H / 2, 72).setStrokeStyle(4, COLORS.cyan, 0.8).setDepth(DEPTH.world + 6).setAlpha(0);

    // progress: Earth -> Moon
    const pg = this.add.graphics().setDepth(DEPTH.hud);
    const px0 = 400, px1 = 1060, py = 44;
    pg.fillStyle(0x070b1d, 0.75);
    pg.fillRoundedRect(px0 - 50, py - 26, px1 - px0 + 100, 52, 20);
    pg.lineStyle(3, COLORS.dim, 0.6);
    for (let x = px0; x < px1; x += 16) pg.lineBetween(x, py, x + 8, py);
    this.add.image(px0 - 22, py, 'earthSmall').setScale(0.3 / TEX).setDepth(DEPTH.hud);
    this.add.image(px1 + 22, py, 'moonSmall').setScale(0.34 / TEX).setDepth(DEPTH.hud);
    this.T('dayLabels', []).forEach((d, i, arr) => {
      txt(this, px0 + ((i + 0.5) / arr.length) * (px1 - px0), py + 14, d, { size: 12, weight: 700, origin: [0.5, 0], color: CSS.dim, scale: false }).setDepth(DEPTH.hud);
    });
    this.marker = this.add.image(px0, py - 2, 'csmLm').setScale(0.2 / TEX).setDepth(DEPTH.hud + 1);
    this.px0 = px0;
    this.px1 = px1;
    this.bumpText = txt(this, W - 40, 100, '', { size: 18, weight: 700, origin: [1, 0.5], scale: false, stroke: '#070b1d', strokeThickness: 5 }).setDepth(DEPTH.hud);

    this.keys = this.input.keyboard ? this.input.keyboard.addKeys('UP,DOWN,W,S') : null;
    this.guide.sequence(this.T('intro', []), { modal: true, lastLabel: Content.ui('play', 'Play') }).then((r) => {
      if (r === null) return;
      this.state = 'play';
      this.engine.setVisible(true);
      this.rumble = Sfx.rumble({ freq: 180, vol: 0.18 });
      this.rumble.set(0.6);
    });
  }

  spawn() {
    const k = this.t / this.duration;
    const y = Phaser.Math.Between(TOP + 30, BOTTOM - 30);
    let key, r, scale, spin, speed;
    if (k < 0.3) {
      key = Math.random() < 0.5 ? 'satA' : 'satB';
      r = 30;
      scale = 0.8;
      spin = 40;
      speed = 300;
    } else if (Math.random() < 0.7) {
      key = 'rock' + Phaser.Math.Between(0, 2);
      scale = 0.5 + Math.random() * 0.7;
      r = 30 * scale;
      spin = 90;
      speed = 330 + Math.random() * 120;
    } else {
      key = 'softDot';
      scale = 0.35;
      r = 10;
      spin = 0;
      speed = 520;
    }
    if (this.relaxed) speed *= 0.72;
    // appear just past the right edge of the screen (wide screens show more than the stage)
    const x0 = Math.max(W, this.cameras.main.worldView.right) + 60;
    const s = key === 'softDot' ? this.add.image(x0, y, key).setScale(scale).setTint(0xffe6a8) : img(this, x0, y, key, scale);
    s.setDepth(DEPTH.world + 3);
    this.obstacles.push({ s, r, speed, spin: (Math.random() < 0.5 ? -1 : 1) * spin, vy: (Math.random() - 0.5) * 40 });
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    this.far.tilePositionX += 30 * dt * TEX;
    this.near.tilePositionX += 90 * dt * TEX;
    if (this.state !== 'play') return;
    this.t += dt;
    const k = clamp(this.t / this.duration, 0, 1);

    // steering
    if (this.keys) {
      if (this.keys.UP.isDown || this.keys.W.isDown) this.targetY -= 460 * dt;
      if (this.keys.DOWN.isDown || this.keys.S.isDown) this.targetY += 460 * dt;
    }
    const p = this.input.activePointer;
    if (p.isDown && p.worldY > 80) this.targetY = p.worldY;
    this.targetY = clamp(this.targetY, TOP + 20, BOTTOM - 20);
    const dy = (this.targetY - this.ship.y) * Math.min(1, dt * 6);
    this.ship.y += dy;
    this.ship.setAngle(clamp(dy * 2, -12, 12));
    this.engine.setPosition(this.ship.x - 88, this.ship.y);
    this.engine.scaleY = 0.26 + Math.random() * 0.08;
    this.shield.setPosition(this.ship.x, this.ship.y);

    // Earth shrinks behind us, Moon grows ahead
    this.earth.setScale((1.0 - k * 0.8) / TEX).setX(60 - k * 160);
    this.moon.setX(W + 260 - k * 420).setScale((0.6 + k * 1.2) / TEX);
    this.marker.x = this.px0 + k * (this.px1 - this.px0);

    // facts along the way
    this.T('facts', []).forEach((f, i) => {
      if (k >= f.at && !this.factsShown.has(i)) {
        this.factsShown.add(i);
        toast(this, f.text, { y: 128, color: COLORS.cyan, duration: 3600, speak: true, wrap: 760 });
      }
    });

    // obstacles
    if (k < 0.93) {
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawn();
        this.spawnT = (this.relaxed ? 1.05 : 0.62) * (0.7 + Math.random() * 0.6);
      }
    }
    this.invuln = Math.max(0, this.invuln - dt);
    this.ship.setAlpha(this.invuln > 0 ? 0.55 + 0.45 * Math.sin(this.t * 30) : 1);
    const hitPts = [-70, -25, 25, 70].map((ox) => ({ x: this.ship.x + ox, y: this.ship.y }));
    this.obstacles = this.obstacles.filter((o) => {
      o.s.x -= o.speed * dt;
      o.s.y += o.vy * dt;
      o.s.angle += o.spin * dt;
      if (this.invuln <= 0 && hitPts.some((h) => Phaser.Math.Distance.Between(h.x, h.y, o.s.x, o.s.y) < o.r + 16)) this.onHit(o);
      if (o.s.x < Math.min(0, this.cameras.main.worldView.x) - 100) {
        o.s.destroy();
        return false;
      }
      return true;
    });
    this.bumpText.setText(this.hits ? `${this.T('bumpsLabel', 'Bumps')}: ${this.hits}` : '');
    if (k >= 1) this.arrive();
  }

  onHit(o) {
    this.hits++;
    this.invuln = 1.2;
    Sfx.play('hit');
    cameraShake(this, 200, 0.006);
    this.shield.setAlpha(1);
    this.tweens.add({ targets: this.shield, alpha: 0, duration: 600 });
    floatText(this, this.ship.x, this.ship.y - 60, this.T('hitText', 'Shield bump!'), CSS.orange, 22);
    this.tweens.add({ targets: o.s, alpha: 0.2, duration: 300 });
  }

  arrive() {
    this.state = 'done';
    if (this.rumble) this.rumble.stop();
    this.engine.setVisible(false);
    Sfx.play('bigSuccess');
    this.tweens.add({ targets: this.moon, x: W - 200, scale: 2.4 / TEX, duration: 1800, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.ship, x: W - 470, y: H / 2 - 150, angle: 0, scale: 0.4 / TEX, duration: 1800, ease: 'Sine.easeInOut' });
    const stars = this.hits <= 2 ? 3 : this.hits <= 5 ? 2 : 1;
    this.time.delayedCall(2000, () => {
      dialog(this, {
        title: this.T('resultTitle', 'You reached the Moon!'),
        stars,
        text: `${this.T('bumpsLabel', 'Bumps')}: ${this.hits}\n\n${this.T('resultText', '')}`,
        speak: [this.T('resultTitle', 'You reached the Moon!'), live(`${this.T('bumpsLabel', 'Bumps')}: ${this.hits}`), this.T('resultText', '')],
        buttons: [
          { label: Content.ui('tryAgain', 'Try again'), value: 'retry', variant: 'secondary', icon: 'restart' },
          { label: this.T('continue', Content.ui('continue', 'Continue')), value: 'next', icon: 'next' }
        ],
        width: 840
      }).then((v) => {
        if (v === 'retry') this.scene.restart(this.payload);
        else this.done(stars);
      });
    });
  }

  onShutdown() {
    if (this.rumble) this.rumble.stop();
  }
}
