import Phaser from 'phaser';
import { W, H, FULL, COLORS, CSS, DEPTH, TEX, clamp } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { toast, dialog, drawPanel, floatText } from '../../ui/widgets.js';

// Fly Helicopter 66 over a foggy ocean and home in on the capsule's radio beacon.
const FOG_SCALE = 5;

export class RescueScene extends BaseScene {
  constructor() {
    super('Rescue');
  }

  create() {
    this.setupStage({ bg: 0x1d5ea6 });
    this.state = 'intro';
    this.t = 0;
    this.nextBeep = 0;

    this.ocean = this.add.tileSprite(W / 2, H / 2, FULL.w, FULL.h, 'waveTile').setTileScale(1 / TEX);
    this.ship = img(this, 170, 610, 'hornet', 0.9).setAngle(-8);

    // the capsule, hidden somewhere in the fog
    this.target = new Phaser.Math.Vector2(Phaser.Math.Between(760, 1150), Phaser.Math.Between(170, 470));
    this.dye = this.add.ellipse(this.target.x, this.target.y, 220, 150, 0x3ddc97, 0.45);
    this.capsule = img(this, this.target.x, this.target.y, 'cmTop', 0.9);
    this.collar = img(this, this.target.x, this.target.y, 'collar', 0.9).setVisible(false);

    // helicopter
    this.heli = this.add.container(260, 540).setDepth(40);
    this.heliBody = img(this, 0, 0, 'heli', 0.9);
    this.rotor = img(this, 0, -10, 'rotor', 1);
    this.heli.add([this.heliBody, this.rotor]);
    this.shadow = this.add.ellipse(275, 560, 70, 30, 0x000000, 0.25).setDepth(39);

    // fog + beacon light that shines through it
    this.fog = this.add.image(260, 540, 'fogHole').setScale(FOG_SCALE / TEX).setDepth(50);
    this.flash = this.add.image(this.target.x, this.target.y, 'softDot').setScale(1.6).setDepth(51).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);

    // direction finder arrow & signal meter
    this.arrow = this.add.graphics().setDepth(60);
    const pg = this.add.graphics().setDepth(DEPTH.hud);
    drawPanel(pg, W - 250, H - 130, 230, 110, { fill: 0x070b1d, alpha: 0.85, radius: 16 });
    txt(this, W - 230, H - 118, this.T('signal', 'Signal'), { size: 16, weight: 800, color: CSS.cyan, scale: false }).setDepth(DEPTH.hud);
    this.bars = this.add.graphics().setDepth(DEPTH.hud);
    this.distText = txt(this, W - 36, H - 118, '', { size: 14, color: CSS.dim, origin: [1, 0], scale: false }).setDepth(DEPTH.hud);

    this.keys = this.input.keyboard ? this.input.keyboard.addKeys('LEFT,RIGHT,UP,DOWN,A,D,W,S') : null;
    this.guide.sequence(this.T('intro', []), { modal: true, lastLabel: Content.ui('play', 'Play') }).then((r) => {
      if (r === null) return;
      this.state = 'search';
      this.heliSound = Sfx.rumble({ freq: 110, vol: 0.25 });
      this.heliSound.set(0.8);
    });
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    this.t += dt;
    this.ocean.tilePositionX += 8 * dt * TEX;
    this.ocean.tilePositionY += 4 * dt * TEX;
    this.rotor.rotation += dt * 22;
    if (this.state !== 'search') {
      this.fog.setPosition(this.heli.x, this.heli.y);
      return;
    }

    // flying
    const speed = this.relaxed ? 170 : 210;
    let vx = 0, vy = 0;
    const k = this.keys;
    if (k) {
      if (k.LEFT.isDown || k.A.isDown) vx -= 1;
      if (k.RIGHT.isDown || k.D.isDown) vx += 1;
      if (k.UP.isDown || k.W.isDown) vy -= 1;
      if (k.DOWN.isDown || k.S.isDown) vy += 1;
    }
    const p = this.input.activePointer;
    if (p.isDown && p.worldY > 80) {
      const dx = p.worldX - this.heli.x, dy = p.worldY - this.heli.y;
      const d = Math.hypot(dx, dy);
      if (d > 12) {
        vx = dx / d;
        vy = dy / d;
      }
    }
    const len = Math.hypot(vx, vy) || 1;
    this.heli.x = clamp(this.heli.x + (vx / len) * speed * dt, 40, W - 40);
    this.heli.y = clamp(this.heli.y + (vy / len) * speed * dt, 90, H - 40);
    if (vx || vy) this.heliBody.rotation = Math.atan2(vy, vx) + Math.PI / 2;
    this.shadow.setPosition(this.heli.x + 15, this.heli.y + 20);
    this.fog.setPosition(this.heli.x, this.heli.y);

    // radio signal
    const dist = Phaser.Math.Distance.Between(this.heli.x, this.heli.y, this.target.x, this.target.y);
    const strength = clamp(1 - dist / 1100, 0, 1);
    this.nextBeep -= dt;
    if (this.nextBeep <= 0) {
      Sfx.play('radio');
      this.nextBeep = 0.18 + (1 - strength) * 1.3;
    }
    this.drawBars(strength);
    this.distText.setText(`${Math.round(dist * 0.02 * 10) / 10} km`);
    // direction finder: noisy when far, accurate when close
    const trueA = Math.atan2(this.target.y - this.heli.y, this.target.x - this.heli.x);
    const noise = (1 - strength) * 0.7 * Math.sin(this.t * 2.1);
    this.drawArrow(trueA + noise, strength);
    // the flashing beacon light is visible through the fog when you're fairly close
    const blink = Math.sin(this.t * 8) > 0.3 ? 1 : 0.1;
    this.flash.setAlpha(dist < 480 ? blink * clamp(1 - dist / 480, 0.2, 1) : 0);

    if (dist < 70) this.found();
  }

  drawBars(s) {
    const g = this.bars;
    g.clear();
    for (let i = 0; i < 5; i++) {
      const on = s > i / 5 + 0.05;
      g.fillStyle(on ? COLORS.green : 0x2a3566, 1);
      g.fillRect(W - 230 + i * 34, H - 40 - (i + 1) * 9, 24, (i + 1) * 9);
    }
  }

  drawArrow(a, s) {
    const g = this.arrow;
    g.clear();
    const r = 78;
    const x = this.heli.x + Math.cos(a) * r, y = this.heli.y + Math.sin(a) * r;
    g.fillStyle(s > 0.6 ? COLORS.green : COLORS.yellow, 0.95);
    g.lineStyle(3, 0x070b1d, 1);
    const pts = [
      { x: x + Math.cos(a) * 20, y: y + Math.sin(a) * 20 },
      { x: x + Math.cos(a + 2.4) * 16, y: y + Math.sin(a + 2.4) * 16 },
      { x: x + Math.cos(a - 2.4) * 16, y: y + Math.sin(a - 2.4) * 16 }
    ];
    g.fillPoints(pts, true);
    g.strokePoints(pts, true);
  }

  found() {
    this.state = 'rescue';
    this.arrow.clear();
    this.flash.setAlpha(0);
    Sfx.play('bigSuccess');
    // clear the fog and hover over the capsule
    this.tweens.add({ targets: this.fog, scale: (FOG_SCALE * 3) / TEX, alpha: 0, duration: 1200 });
    this.tweens.add({ targets: this.heli, x: this.target.x - 70, y: this.target.y - 60, duration: 900, ease: 'Sine.easeOut' });
    toast(this, this.T('found', ''), { y: 128, color: COLORS.green, duration: 3200, speak: true, sound: false });
    const steps = this.T('steps', []);
    // swimmers drop into the water
    this.time.delayedCall(1100, () => {
      for (let i = 0; i < 3; i++) {
        const s = img(this, this.heli.x, this.heli.y, 'swimmer', 1).setDepth(35);
        this.tweens.add({ targets: s, x: this.target.x - 50 + i * 40, y: this.target.y + 50 - (i % 2) * 90, duration: 800, delay: i * 300, ease: 'Quad.easeIn', onComplete: () => Sfx.play('splash') });
      }
    });
    this.time.delayedCall(3400, () => {
      toast(this, steps[0] || '', { y: 128, color: COLORS.cyan, duration: 3200, speak: true });
      this.collar.setVisible(true).setScale(0.1 / TEX);
      this.tweens.add({ targets: this.collar, scale: 0.9 / TEX, duration: 700, ease: 'Back.easeOut' });
      const raft = img(this, this.target.x + 70, this.target.y + 10, 'raft', 1).setDepth(20);
      raft.setAlpha(0);
      this.tweens.add({ targets: raft, alpha: 1, duration: 500 });
    });
    this.time.delayedCall(7000, () => toast(this, steps[1] || '', { y: 128, color: COLORS.cyan, duration: 3200, speak: true }));
    this.time.delayedCall(10500, () => {
      toast(this, steps[2] || '', { y: 128, color: COLORS.cyan, duration: 3200, speak: true });
      const basket = this.add.rectangle(this.target.x + 20, this.target.y, 20, 14, 0xffd166).setDepth(36);
      const rope = this.add.graphics().setDepth(35);
      this.tweens.add({
        targets: basket,
        x: this.heli.x,
        y: this.heli.y + 10,
        duration: 2200,
        onUpdate: () => {
          rope.clear();
          rope.lineStyle(2, 0xffffff, 0.8);
          rope.lineBetween(this.heli.x, this.heli.y, basket.x, basket.y);
        },
        onComplete: () => {
          rope.destroy();
          basket.destroy();
          this.flyHome();
        }
      });
    });
  }

  flyHome() {
    Sfx.play('whoosh');
    this.tweens.add({
      targets: this.heli,
      x: this.ship.x + 40,
      y: this.ship.y - 10,
      duration: 2600,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        const a = Math.atan2(this.ship.y - this.heli.y, this.ship.x - this.heli.x);
        this.heliBody.rotation = a + Math.PI / 2;
        this.shadow.setPosition(this.heli.x + 15, this.heli.y + 20);
      },
      onComplete: () => {
        if (this.heliSound) this.heliSound.stop();
        Sfx.play('fanfare');
        floatText(this, this.ship.x, this.ship.y - 60, Content.ui('welcomeHome', 'Welcome home!'), CSS.yellow, 30);
        this.time.delayedCall(1200, () => {
          dialog(this, {
            title: Content.ui('welcomeHome', 'Welcome home!'),
            text: this.T('homeLine', ''),
            buttons: [{ label: this.T('continue', Content.ui('continue', 'Continue')), value: 'next', icon: 'next' }],
            width: 860
          }).then(() => this.done(3));
        });
      }
    });
  }

  onShutdown() {
    if (this.heliSound) this.heliSound.stop();
  }
}
