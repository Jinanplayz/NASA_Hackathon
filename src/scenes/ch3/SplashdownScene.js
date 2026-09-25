import Phaser from 'phaser';
import { W, H, COLORS, CSS, DEPTH, TEX, clamp, lerpColor } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { toast, floatText, drawPanel } from '../../ui/widgets.js';

// Open the parachutes at the right heights, flip the upside-down capsule with its
// balloon bags (Apollo 11 really landed upside down), then switch on the safety gear.
const DROGUE = { hi: 8000, lo: 6600 };
const MAIN = { hi: 3600, lo: 2500 };
const START_ALT = 10500;
const METER_X = 1150, METER_TOP = 110, METER_BOT = 560;
const SEA_Y = 520;

export class SplashdownScene extends BaseScene {
  constructor() {
    super('Splashdown');
  }

  create() {
    this.setupStage({ bg: 0x6aaee8 });
    this.alt = START_ALT;
    this.phase = 'intro';
    this.speed = 900; // m/s shown as a fast fall (game speed, not real)

    this.sky = this.add.graphics();
    this.clouds = [];
    for (let i = 0; i < 7; i++) {
      const c = img(this, Phaser.Math.Between(80, 1000), Phaser.Math.Between(120, 700), 'cloud' + (i % 3), 0.8 + Math.random() * 0.6).setAlpha(0.8);
      this.clouds.push(c);
    }
    this.sea = this.add.graphics().setVisible(false);
    this.capsule = this.add.container(560, 300).setDepth(20);
    this.cmImg = img(this, 0, 0, 'cm', 1.5);
    this.drogues = [-26, 26].map((dx) => img(this, dx, -120, 'drogue', 0.8).setVisible(false));
    this.mains = [-70, 0, 70].map((dx) => img(this, dx, -190, 'mainChute', 1.0).setVisible(false));
    this.lines = this.add.graphics();
    this.capsule.add([this.lines, ...this.drogues, ...this.mains, this.cmImg]);

    // height meter
    const mg = this.add.graphics().setDepth(DEPTH.hud);
    drawPanel(mg, METER_X - 70, METER_TOP - 40, 140, METER_BOT - METER_TOP + 90, { fill: 0x070b1d, alpha: 0.85, radius: 18 });
    txt(this, METER_X, METER_TOP - 22, this.T('heightLabel', 'Height'), { size: 15, weight: 800, color: CSS.cyan, origin: 0.5, scale: false }).setDepth(DEPTH.hud);
    const yFor = (a) => METER_BOT - (a / START_ALT) * (METER_BOT - METER_TOP);
    this.yFor = yFor;
    mg.fillStyle(0x3a4470, 1);
    mg.fillRoundedRect(METER_X - 12, METER_TOP, 24, METER_BOT - METER_TOP, 10);
    [DROGUE, MAIN].forEach((z) => {
      mg.fillStyle(COLORS.green, 0.9);
      mg.fillRect(METER_X - 12, yFor(z.hi), 24, yFor(z.lo) - yFor(z.hi));
    });
    txt(this, METER_X - 20, (yFor(DROGUE.hi) + yFor(DROGUE.lo)) / 2, 'drogue', { size: 12, weight: 700, origin: [1, 0.5], color: CSS.green, scale: false }).setDepth(DEPTH.hud);
    txt(this, METER_X - 20, (yFor(MAIN.hi) + yFor(MAIN.lo)) / 2, 'main', { size: 12, weight: 700, origin: [1, 0.5], color: CSS.green, scale: false }).setDepth(DEPTH.hud);
    this.marker = this.add.triangle(METER_X + 26, METER_TOP, 0, 0, 16, -9, 16, 9, COLORS.yellow).setDepth(DEPTH.hud);
    this.altText = txt(this, METER_X, METER_BOT + 28, '', { size: 18, weight: 800, origin: 0.5, scale: false }).setDepth(DEPTH.hud);

    this.drogueBtn = new Button(this, 380, 650, { width: 280, height: 72, label: this.T('drogueBtn', 'Drogue chutes'), icon: 'up', variant: 'warn', onClick: () => this.deploy('drogue') }).setDepth(DEPTH.hud);
    this.mainBtn = new Button(this, 700, 650, { width: 280, height: 72, label: this.T('mainBtn', 'Main chutes'), icon: 'up', variant: 'warn', onClick: () => this.deploy('main') }).setDepth(DEPTH.hud);
    this.mainBtn.setEnabled(false);
    this.drogueBtn.setEnabled(false);
    if (this.input.keyboard) this.input.keyboard.on('keydown-SPACE', () => this.deploy(this.phase === 'fall1' ? 'drogue' : 'main'));

    this.guide.sequence(this.T('intro', []), { modal: true, lastLabel: Content.ui('play', 'Play') }).then((r) => {
      if (r === null) return;
      this.phase = 'fall1';
      this.drogueBtn.setEnabled(true);
      this.wind = Sfx.rumble({ freq: 700, vol: 0.2 });
      this.wind.set(1);
    });
  }

  deploy(which) {
    if (which === 'drogue' && this.phase === 'fall1') {
      if (this.alt > DROGUE.hi) return this.early();
      this.openDrogues(false);
    } else if (which === 'main' && this.phase === 'fall2') {
      if (this.alt > MAIN.hi) return this.early();
      this.openMains(false);
    }
  }

  early() {
    Sfx.play('error');
    floatText(this, 560, 200, this.T('tooEarly', 'Too early!'), CSS.orange, 24);
    Speech.say(this.T('tooEarly', ''));
  }

  openDrogues(auto) {
    this.phase = 'fall2';
    this.drogueBtn.setEnabled(false);
    this.mainBtn.setEnabled(true);
    Sfx.play('whoosh');
    this.drogues.forEach((d) => d.setVisible(true).setScale(0.1 / TEX));
    this.tweens.add({ targets: this.drogues, scale: 0.8 / TEX, duration: 400, ease: 'Back.easeOut' });
    toast(this, auto ? this.T('auto', '') : this.T('drogueOk', ''), { y: 128, color: auto ? COLORS.orange : COLORS.green, duration: 3200, speak: true, sound: auto ? 'error' : 'success' });
  }

  openMains(auto) {
    this.phase = 'fall3';
    this.mainBtn.setEnabled(false);
    Sfx.play('whoosh');
    this.drogues.forEach((d) => this.tweens.add({ targets: d, y: d.y - 200, alpha: 0, duration: 800 }));
    this.mains.forEach((m) => m.setVisible(true).setScale(0.1 / TEX));
    this.tweens.add({ targets: this.mains, scale: 1 / TEX, duration: 600, ease: 'Back.easeOut' });
    if (this.wind) this.wind.set(0.3);
    toast(this, auto ? this.T('auto', '') : this.T('mainOk', ''), { y: 128, color: auto ? COLORS.orange : COLORS.green, duration: 3200, speak: true, sound: auto ? 'error' : 'success' });
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    // swaying chutes
    this.mains.forEach((m, i) => (m.angle = Math.sin(time / 700 + i) * 4));
    if (!['fall1', 'fall2', 'fall3'].includes(this.phase)) return;
    const rate = this.phase === 'fall1' ? 820 : this.phase === 'fall2' ? 620 : 330; // game-speed metres per second
    this.alt = Math.max(0, this.alt - rate * dt * (this.relaxed ? 0.75 : 1));
    // clouds rush upward to show the fall
    this.clouds.forEach((c) => {
      c.y -= rate * dt * 0.35;
      if (c.y < -80) {
        c.y = H + 80;
        c.x = Phaser.Math.Between(80, 1000);
      }
    });
    this.cmImg.angle = this.phase === 'fall1' ? Math.sin(time / 120) * 10 : Math.sin(time / 500) * 3;
    this.drawLines();
    this.marker.y = this.yFor(this.alt);
    this.altText.setText(`${Math.round(this.alt).toLocaleString()} m`);
    // automatic backups (the real system opened the chutes automatically too)
    if (this.phase === 'fall1' && this.alt < DROGUE.lo) this.openDrogues(true);
    if (this.phase === 'fall2' && this.alt < MAIN.lo) this.openMains(true);
    // the sea comes into view
    if (this.alt < 1600) {
      const k = 1 - this.alt / 1600;
      this.sea.setVisible(true).clear();
      this.sea.fillStyle(0x1f5fa8, 1);
      this.sea.fillRect(0, H - k * (H - SEA_Y), W, H);
      this.cameras.main.setBackgroundColor(lerpColor(0x6aaee8, 0x9fd0ff, k));
    }
    if (this.alt <= 0) this.splash();
  }

  drawLines() {
    const g = this.lines;
    g.clear();
    g.lineStyle(1.5, 0xffffff, 0.8);
    this.drogues.forEach((d) => d.visible && d.alpha > 0.1 && g.lineBetween(0, -30, d.x, d.y + 12));
    this.mains.forEach((m) => m.visible && [-40, 40].forEach((o) => g.lineBetween(0, -30, m.x + o * m.scaleX * TEX, m.y + 30)));
  }

  splash() {
    this.phase = 'splash';
    this.lines.clear();
    if (this.wind) this.wind.stop();
    this.clouds.forEach((c) => c.setVisible(false));
    Sfx.play('splash');
    this.drogueBtn.setVisible(false);
    this.mainBtn.setVisible(false);
    this.capsule.setPosition(560, SEA_Y - 10);
    // chutes fall onto the water
    this.mains.forEach((m, i) => this.tweens.add({ targets: m, y: 30, x: m.x + 160 + i * 30, angle: 70, alpha: 0.7, duration: 1400 }));
    const big = txt(this, W / 2 - 60, 250, this.T('splash', 'SPLASHDOWN!'), { size: 72, weight: 800, origin: 0.5, color: CSS.yellow, scale: false, stroke: '#070b1d', strokeThickness: 10 }).setDepth(DEPTH.toast);
    this.tweens.add({ targets: big, alpha: 0, delay: 1400, duration: 500, onComplete: () => big.destroy() });
    const drops = this.add.particles(560, SEA_Y, 'dot', { speedY: { min: -320, max: -120 }, speedX: { min: -200, max: 200 }, gravityY: 600, lifespan: 1000, scale: { start: 1, end: 0.3 }, tint: 0xdff4ff, emitting: false }).setDepth(25);
    drops.explode(40);
    // tip over to upside-down (Stable 2)
    this.tweens.add({ targets: this.cmImg, angle: 180, y: 10, duration: 1400, ease: 'Back.easeOut' });
    this.time.delayedCall(1800, () => this.startFlip());
  }

  startFlip() {
    this.phase = 'flip';
    this.bob = this.tweens.add({ targets: this.capsule, y: this.capsule.y + 6, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.mains.forEach((m) => m.setVisible(false));
    this.guide.say(this.T('flipIntro', ''), { next: false, position: 'top' });
    this.bags = [-36, 0, 36].map((dx, i) => {
      const b = this.add.container(dx, 44);
      const im = img(this, 0, 0, 'uprightBag', 0.5);
      const ring = this.add.circle(0, 0, 22).setStrokeStyle(3, COLORS.yellow);
      this.tweens.add({ targets: ring, scale: 1.4, alpha: 0, duration: 800, repeat: -1 });
      b.add([ring, im]);
      b.setSize(56, 56).setInteractive({ useHandCursor: true });
      b.inflated = false;
      b.im = im;
      b.enabled = true;
      b.activate = () => this.inflate(b);
      b.on('pointerup', () => this.inflate(b));
      this.focus.add(b);
      this.capsule.add(b);
      return b;
    });
  }

  inflate(b) {
    if (b.inflated || this.phase !== 'flip') return;
    b.inflated = true;
    b.enabled = false;
    b.disableInteractive();
    Sfx.play('inflate');
    this.tweens.add({ targets: b.im, scale: 1.3 / TEX, duration: 600, ease: 'Back.easeOut' });
    b.list[0].destroy();
    if (this.bags.every((x) => x.inflated)) {
      this.phase = 'flipping';
      this.time.delayedCall(600, () => {
        Sfx.play('whoosh');
        this.bags.forEach((x) => this.tweens.add({ targets: x, alpha: 0, duration: 800, delay: 900 }));
        this.tweens.add({
          targets: this.cmImg,
          angle: 360,
          y: 0,
          duration: 1400,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            this.cmImg.angle = 0;
            Sfx.play('success');
            toast(this, this.T('flipDone', ''), { y: 128, color: COLORS.green, duration: 3000, speak: true, sound: false });
            this.time.delayedCall(2600, () => this.startGear());
          }
        });
      });
    }
  }

  startGear() {
    this.phase = 'gear';
    this.guide.say(this.T('gearIntro', ''), { next: false, position: 'top' });
    const gear = this.T('gear', []);
    this.gearDone = 0;
    this.gearBtns = gear.map((gd, i) =>
      new Button(this, 190 + i * 300, 650, {
        width: 280,
        height: 70,
        size: 19,
        label: gd.name,
        icon: 'check',
        variant: 'secondary',
        onClick: (btn) => this.useGear(gd, btn)
      }).setDepth(DEPTH.hud)
    );
  }

  useGear(gd, btn) {
    if (btn.used) return;
    btn.used = true;
    btn.setVariant('success').setEnabled(false);
    Sfx.play('switch');
    toast(this, `${gd.name}: ${gd.fact}`, { y: 450, color: COLORS.green, duration: 3000, speak: [gd.name, gd.fact], sound: false, wrap: 760 });
    const cx = this.capsule.x, cy = this.capsule.y;
    if (gd.id === 'light') {
      const l = this.add.circle(cx, cy - 46, 8, 0xffffff).setDepth(30);
      const glow = this.add.image(cx, cy - 46, 'softDot').setScale(1.4).setDepth(29).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: [l, glow], alpha: 0.1, duration: 250, yoyo: true, repeat: -1, hold: 400 });
    } else if (gd.id === 'beacon') {
      const w = img(this, cx + 34, cy - 60, 'waves', 0.8).setDepth(30);
      this.tweens.add({ targets: w, alpha: 0.2, scale: 1.1 / TEX, duration: 500, yoyo: true, repeat: -1 });
      this.time.addEvent({ delay: 900, loop: true, callback: () => this.phase === 'gear' && Sfx.play('radio') });
    } else if (gd.id === 'dye') {
      const dye = this.add.ellipse(cx, cy + 20, 40, 12, 0x3ddc97, 0.7).setDepth(15);
      this.tweens.add({ targets: dye, scaleX: 8, scaleY: 5, alpha: 0.45, duration: 2500 });
    } else if (gd.id === 'chutes') {
      this.mains.forEach((m) => m.setVisible(false));
    }
    this.gearDone++;
    if (this.gearDone >= 4) {
      this.phase = 'done';
      this.time.delayedCall(1800, async () => {
        Sfx.play('bigSuccess');
        await this.guide.say(this.T('doneLine', ''), { modal: true, nextLabel: this.T('continue', Content.ui('continue', 'Continue')) });
        this.done();
      });
    }
  }

  onShutdown() {
    if (this.wind) this.wind.stop();
  }
}
