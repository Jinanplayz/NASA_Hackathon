import Phaser from 'phaser';
import { W, H, COLORS, CSS, DEPTH, TEX } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { img } from '../../art/core.js';
import { txt, fitText } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { drawPanel, toast, cameraShake, shake } from '../../ui/widgets.js';
import { drawIcon } from '../../ui/icons.js';

// Launch countdown: copy arrow sequences (keys, arrow buttons or swipes) to complete
// each real step of the Apollo 11 launch and fill the launch sequence bar.
const DIRS = ['up', 'right', 'down', 'left'];
const PX = 392, PY = 84, PW = 864, PH = 616;
const PAD_Y = 684;

export class LaunchSequenceScene extends BaseScene {
  constructor() {
    super('LaunchSequence');
  }

  create() {
    this.setupStage({ bg: 0x0f1c4a });
    this.steps = this.T('steps', []);
    this.round = 0;
    this.pos = 0;
    this.state = 'intro';

    // dawn sky + launch pad
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x0f1c4a, 0x0f1c4a, 0xf4a261, 0xf4a261, 1);
    sky.fillRect(0, 0, W, H);
    const ground = this.add.graphics();
    ground.fillStyle(0x1b2a1f, 1);
    ground.fillRect(0, PAD_Y, W, H - PAD_Y);
    ground.fillStyle(0x5d6676, 1);
    ground.fillRect(70, PAD_Y - 10, 280, 14);
    // umbilical tower
    const tower = this.add.graphics();
    tower.lineStyle(4, 0xb8452f, 1);
    tower.strokeRect(262, 150, 44, PAD_Y - 160);
    for (let y = PAD_Y - 10; y > 160; y -= 30) tower.lineBetween(262, y, 306, y - 30);
    this.rocketX = 196;
    this.rocket = img(this, this.rocketX, PAD_Y - 10, 'saturnV', 1.08).setOrigin(0.5, 1);
    // crew access arm (swings away in step 1)
    this.arm = this.add.rectangle(262, 176, 46, 10, 0xd0d4dc).setOrigin(1, 0.5);
    this.flames = this.add.image(this.rocketX, PAD_Y - 10, 'flame').setOrigin(0.5, 0).setScale(1.1, 1.3).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.vapor = this.add.particles(0, 0, 'smoke', { x: this.rocketX + 20, y: 300, speedX: { min: 20, max: 60 }, speedY: { min: -10, max: 10 }, lifespan: 1800, scale: { start: 0.2, end: 0.7 }, alpha: { start: 0.35, end: 0 }, frequency: 180 });
    this.smoke = this.add.particles(0, 0, 'smoke', { x: this.rocketX, y: PAD_Y - 6, speedX: { min: -260, max: 260 }, speedY: { min: -60, max: 0 }, lifespan: 2200, scale: { start: 0.5, end: 2 }, alpha: { start: 0.8, end: 0 }, frequency: 16, emitting: false });
    this.lights = this.add.graphics();

    // console
    const cg = this.add.graphics();
    drawPanel(cg, PX, PY, PW, PH, { fill: 0x0b1230, radius: 24, stroke: COLORS.cyan, alpha: 0.95 });
    txt(this, PX + 28, PY + 20, this.T('barTitle', 'Launch sequence'), { size: 20, weight: 800, color: CSS.yellow, scale: false });
    this.bar = this.add.graphics();
    this.stepTexts = this.steps.map((s, i) => {
      const w = (PW - 56) / this.steps.length;
      const t = txt(this, PX + 28 + w * i + w / 2, PY + 104, s.name, { size: 13, weight: 700, origin: [0.5, 0], align: 'center', wrap: w - 8, scale: false, color: CSS.dim });
      fitText(t, w - 6, 36, 10);
      return t;
    });
    this.drawBar();
    this.stepTitle = txt(this, PX + PW / 2, PY + 176, '', { size: 26, weight: 800, origin: 0.5, align: 'center', wrap: PW - 60 });
    this.copyLabel = txt(this, PX + PW / 2, PY + 214, this.T('copyLabel', 'Copy this sequence:'), { size: 16, color: CSS.dim, origin: 0.5, scale: false });
    this.tiles = this.add.container(PX + PW / 2, PY + 282);
    this.countText = txt(this, PX + PW / 2, PY + 282, '', { size: 64, weight: 800, origin: 0.5, color: CSS.yellow, scale: false, stroke: '#070b1d', strokeThickness: 8 }).setDepth(DEPTH.toast);

    // D-pad
    const dx = PX + PW / 2, dy = PY + 470;
    const pad = { up: [0, -76], down: [0, 76], left: [-96, 0], right: [96, 0] };
    this.padBtns = DIRS.map((d) =>
      new Button(this, dx + pad[d][0], dy + pad[d][1], { width: 88, height: 70, icon: d, iconSize: 34, variant: 'secondary', radius: 18, sound: null, onClick: () => this.input_(d) })
    );
    txt(this, dx, dy, this.T('swipeHint', 'or swipe'), { size: 14, color: CSS.dim, origin: 0.5, scale: false });

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-UP', () => this.input_('up'));
      this.input.keyboard.on('keydown-DOWN', () => this.input_('down'));
      this.input.keyboard.on('keydown-LEFT', () => this.input_('left'));
      this.input.keyboard.on('keydown-RIGHT', () => this.input_('right'));
      this.input.keyboard.on('keydown-W', () => this.input_('up'));
      this.input.keyboard.on('keydown-S', () => this.input_('down'));
      this.input.keyboard.on('keydown-A', () => this.input_('left'));
      this.input.keyboard.on('keydown-D', () => this.input_('right'));
    }
    // swipes ("dashes") anywhere on the console
    this.input.on('pointerdown', (p, over) => {
      this.swipe = !over.length && p.worldX > PX ? { x: p.worldX, y: p.worldY } : null;
    });
    this.input.on('pointerup', (p) => {
      if (!this.swipe) return;
      const dxs = p.worldX - this.swipe.x, dys = p.worldY - this.swipe.y;
      this.swipe = null;
      if (Math.hypot(dxs, dys) < 40) return;
      this.input_(Math.abs(dxs) > Math.abs(dys) ? (dxs > 0 ? 'right' : 'left') : dys > 0 ? 'down' : 'up');
    });

    this.guide.sequence(this.T('intro', []), { modal: true, width: 900 }).then((r) => {
      if (r !== null) this.startRound();
    });
  }

  drawBar() {
    const g = this.bar;
    const n = this.steps.length;
    const w = (PW - 56) / n;
    g.clear();
    for (let i = 0; i < n; i++) {
      const x = PX + 28 + w * i;
      const done = i < this.round;
      const cur = i === this.round && this.state !== 'intro';
      g.fillStyle(done ? COLORS.green : cur ? 0x2a3f8a : 0x1b275a, 1);
      g.fillRoundedRect(x + 3, PY + 58, w - 6, 38, 10);
      if (cur) {
        g.lineStyle(3, COLORS.yellow, 1);
        g.strokeRoundedRect(x + 3, PY + 58, w - 6, 38, 10);
      }
      if (done) drawIcon(g, 'check', x + w / 2, PY + 77, 22, COLORS.bg);
      this.stepTexts[i].setColor(done ? CSS.green : cur ? CSS.text : CSS.dim);
    }
  }

  startRound() {
    const s = this.steps[this.round];
    this.state = 'input';
    this.pos = 0;
    const len = (s.length || 3) + (this.relaxed ? -1 : 0);
    this.seq = [];
    for (let i = 0; i < Math.max(2, len); i++) {
      let d;
      do d = DIRS[Math.floor(Math.random() * 4)];
      while (i > 0 && d === this.seq[i - 1] && Math.random() < 0.6);
      this.seq.push(d);
    }
    const last = this.round === this.steps.length - 1;
    this.stepTitle.setText(last ? this.T('holdText', 'T-0: Release the arms now!') : `${this.T('stepLabel', 'Step')} ${this.round + 1}: ${s.name}`);
    this.stepTitle.setColor(last ? CSS.orange : CSS.text);
    this.drawBar();
    this.drawTiles();
    Speech.say(last ? this.T('holdText', '') : s.name);
  }

  drawTiles(state = []) {
    this.tiles.removeAll(true);
    const n = this.seq.length;
    const size = 74, gap = 14;
    this.seq.forEach((d, i) => {
      const x = (i - (n - 1) / 2) * (size + gap);
      const g = this.add.graphics();
      const st = state[i] || (i < this.pos ? 'ok' : '');
      g.fillStyle(st === 'ok' ? COLORS.green : st === 'bad' ? COLORS.red : i === this.pos ? 0x2a3f8a : 0x1b275a, 1);
      g.fillRoundedRect(x - size / 2, -size / 2, size, size, 16);
      g.lineStyle(3, i === this.pos && !st ? COLORS.yellow : 0xffffff, i === this.pos && !st ? 1 : 0.3);
      g.strokeRoundedRect(x - size / 2, -size / 2, size, size, 16);
      drawIcon(g, d, x, 0, 38, st ? COLORS.bg : 0xffffff);
      this.tiles.add(g);
    });
  }

  input_(d) {
    if (this.state !== 'input') return;
    const btn = this.padBtns[DIRS.indexOf(d)];
    this.tweens.add({ targets: btn, scale: 0.9, duration: 70, yoyo: true });
    if (d === this.seq[this.pos]) {
      this.pos++;
      Sfx.play('tick');
      this.drawTiles();
      if (this.pos >= this.seq.length) this.completeRound();
    } else {
      Sfx.play('error');
      const st = this.seq.map((_, i) => (i === this.pos ? 'bad' : ''));
      this.drawTiles(st);
      shake(this, this.tiles, 8);
      this.pos = 0;
      this.time.delayedCall(450, () => this.state === 'input' && this.drawTiles());
    }
  }

  completeRound() {
    this.state = 'busy';
    const s = this.steps[this.round];
    Sfx.play('success');
    this.round++;
    this.drawBar();
    toast(this, `${s.name}: ${s.fact}`, { y: 128, x: PX + PW / 2, color: COLORS.green, duration: 3800, speak: [s.name, s.fact], sound: false, wrap: 740 });
    // show it happening on the rocket
    const i = this.round - 1;
    if (i === 0) this.tweens.add({ targets: this.arm, angle: -80, duration: 1200, ease: 'Sine.easeInOut' });
    if (i === 1) this.vapor.frequency = 60;
    if (i === 2) this.blinkLights();
    if (i === 3) {
      this.tweens.add({ targets: this.flames, alpha: 0.6, duration: 800 });
      this.smoke.emitting = true;
      this.rumble = Sfx.rumble({ freq: 140, vol: 0.6 });
      this.rumble.set(0.6);
    }
    if (this.round >= this.steps.length) {
      this.time.delayedCall(600, () => this.liftoff());
    } else if (this.round === this.steps.length - 1) {
      this.time.delayedCall(1400, () => this.countdown());
    } else {
      this.time.delayedCall(1700, () => this.startRound());
    }
  }

  blinkLights() {
    this.lights.clear();
    this.lights.fillStyle(COLORS.yellow, 1);
    [240, 330, 420].forEach((y) => this.lights.fillCircle(this.rocketX + 18, y, 4));
    this.tweens.add({ targets: this.lights, alpha: 0.2, duration: 300, yoyo: true, repeat: -1 });
  }

  countdown() {
    this.tiles.removeAll(true);
    this.copyLabel.setVisible(false);
    this.stepTitle.setText('');
    let n = 9;
    const tick = () => {
      this.countText.setText(String(n)).setScale(1.3).setAlpha(1);
      this.tweens.add({ targets: this.countText, scale: 1, duration: 300 });
      Sfx.play('tick');
      if (this.rumble) this.rumble.set(0.6 + (9 - n) * 0.04);
      this.flames.setAlpha(0.6 + (9 - n) * 0.04);
      n--;
      if (n >= 1) this.time.delayedCall(this.relaxed ? 600 : 450, tick);
      else
        this.time.delayedCall(500, () => {
          this.countText.setText('');
          this.copyLabel.setVisible(true);
          this.startRound();
        });
    };
    tick();
  }

  liftoff() {
    this.state = 'liftoff';
    this.tiles.removeAll(true);
    this.copyLabel.setVisible(false);
    this.stepTitle.setText('');
    this.countText.setText(this.T('liftoffText', 'LIFTOFF!')).setColor(CSS.green);
    Sfx.play('ignition');
    if (this.rumble) this.rumble.set(1, 260);
    cameraShake(this, 2500, 0.008);
    this.flames.setAlpha(1);
    this.smoke.frequency = 8;
    Speech.say(this.T('liftoffLine', 'Liftoff!'));
    this.tweens.add({
      targets: this.rocket,
      y: -40,
      duration: 5200,
      ease: 'Quad.easeIn',
      onUpdate: () => this.flames.setY(this.rocket.y)
    });
    this.time.delayedCall(2000, () => (this.smoke.emitting = false));
    this.time.delayedCall(5600, () => {
      if (this.rumble) this.rumble.stop();
      this.done(3);
    });
  }

  onShutdown() {
    if (this.rumble) this.rumble.stop();
  }
}
