import Phaser from 'phaser';
import { COLORS, CSS, DEPTH, seeded, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame, starsFor, InfoPanel, showPhoto } from '../common/kit.js';
import { makeTex, circle } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { drawPanel, toast, floatText } from '../../ui/widgets.js';

// Dust hides baby stars from ordinary cameras, but infrared light shines right through it.
// Move Webb's infrared "lens" over the dusty pillars and tap the hidden baby stars.
const F = { x: 60, y: 96, w: 780, h: 560 };
const LENS = 92;
const BABIES = [[175, 330], [205, 470], [420, 250], [455, 420], [640, 360], [690, 500]];

// three tall pillars of dust rising from the bottom
function pillars(c, w, h, solid) {
  const rnd = seeded(31);
  [[180, 140, 0.62], [430, 170, 0.78], [665, 130, 0.58]].forEach(([x, width, top]) => {
    for (let k = 0; k < 14; k++) {
      const t = k / 13;
      const y = h - t * h * top;
      const r = width * (0.55 - t * 0.2) * (0.85 + rnd() * 0.3);
      const cx = x + Math.sin(t * 5 + x) * 18;
      c.fillStyle = solid ? `rgba(${110 - k * 3},${68 - k * 2},${42 - k},1)` : 'rgba(200,90,50,0.16)';
      c.beginPath();
      c.ellipse(cx, y, r, r * 0.9, 0, 0, Math.PI * 2);
      c.fill();
      if (solid && k === 13) {
        // the sunlit top edge
        c.fillStyle = 'rgba(255,200,140,0.35)';
        c.beginPath();
        c.ellipse(cx, y - r * 0.5, r * 0.8, r * 0.35, 0, Math.PI, Math.PI * 2);
        c.fill();
      }
    }
  });
}

function starsLayer(c, w, h, n, seed, big) {
  const rnd = seeded(seed);
  for (let i = 0; i < n; i++) {
    const x = rnd() * w, y = rnd() * h, r = 0.6 + rnd() * (big ? 1.8 : 1.2);
    c.fillStyle = `rgba(255,${230 + rnd() * 25},${200 + rnd() * 55},${0.5 + rnd() * 0.5})`;
    circle(c, x, y, r);
    c.fill();
  }
}

export class InfraredLensScene extends BaseScene {
  constructor() {
    super('InfraredLens');
  }

  create() {
    this.setupStage({ bg: 0x05060f });
    this.state = 'intro';
    this.mistakes = 0;
    this.found = 0;
    if (!this.textures.exists('nebulaVisible')) {
      makeTex(this, 'nebulaVisible', F.w, F.h, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#1a3a5c');
        g.addColorStop(1, '#3a5a6c');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
        starsLayer(c, w, h, 40, 3, false);
        pillars(c, w, h, true);
      });
      makeTex(this, 'nebulaInfrared', F.w, F.h, (c, w, h) => {
        c.fillStyle = '#07040c';
        c.fillRect(0, 0, w, h);
        starsLayer(c, w, h, 420, 4, true);
        pillars(c, w, h, false);
      });
    }
    const frame = this.add.graphics();
    drawPanel(frame, F.x - 8, F.y - 8, F.w + 16, F.h + 16, { fill: 0x000000, radius: 12, stroke: 0x46516b, strokeWidth: 3 });
    this.add.image(F.x, F.y, 'nebulaVisible').setOrigin(0).setDisplaySize(F.w, F.h);
    // the infrared view, only seen through the lens
    this.ir = this.add.container(0, 0);
    this.ir.add(this.add.image(F.x, F.y, 'nebulaInfrared').setOrigin(0).setDisplaySize(F.w, F.h));
    this.babies = BABIES.map(([x, y]) => {
      const b = this.add.container(F.x + x, F.y + y);
      const glow = this.add.image(0, 0, 'softDot').setScale(0.5).setTint(0xff7a3a).setBlendMode(Phaser.BlendModes.ADD);
      const core = this.add.circle(0, 0, 4, 0xfff1d0);
      const spikes = this.add.graphics();
      spikes.lineStyle(2, 0xffd2a0, 0.9);
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
        spikes.lineBetween(0, 0, Math.cos(a) * 16, Math.sin(a) * 16);
      }
      b.add([glow, spikes, core]);
      this.tweens.add({ targets: glow, scale: 0.7, duration: 700, yoyo: true, repeat: -1 });
      this.ir.add(b);
      return { x: F.x + x, y: F.y + y, found: false };
    });
    this.maskG = this.make.graphics({ add: false });
    this.ir.setMask(this.maskG.createGeometryMask());
    this.lensRing = this.add.graphics().setDepth(DEPTH.ui - 5);
    this.marks = this.add.graphics().setDepth(DEPTH.ui - 4);
    this.lens = { x: F.x + F.w / 2, y: F.y + F.h / 2 };
    txt(this, F.x + 12, F.y + F.h - 28, this.T('frameLabel', 'Visible light · Lens: infrared light'), { size: 14, weight: 800, color: '#ffffff', scale: false, stroke: '#000000', strokeThickness: 4 }).setDepth(DEPTH.ui);

    // side panel
    this.info = new InfoPanel(this, 870, 96, 370, 300, { title: this.T('panelTitle', 'Infrared eyes'), text: this.T('panelText', ''), size: 18 });
    this.countText = txt(this, 1055, 430, '', { size: 22, weight: 800, color: CSS.yellow, origin: 0.5, scale: false });

    // the lens follows the pointer; tap to pick a baby star
    this.zone = this.add.zone(F.x + F.w / 2, F.y + F.h / 2, F.w, F.h).setInteractive({ useHandCursor: true });
    this.zone.on('pointermove', (p) => this.moveLens(p.worldX, p.worldY));
    this.zone.on('pointerdown', (p) => this.moveLens(p.worldX, p.worldY));
    this.zone.on('pointerup', (p) => this.tap(p.worldX, p.worldY));
    if (this.input.keyboard) {
      const mv = (dx, dy) => this.moveLens(this.lens.x + dx, this.lens.y + dy);
      this.input.keyboard.on('keydown-LEFT', () => mv(-30, 0));
      this.input.keyboard.on('keydown-RIGHT', () => mv(30, 0));
      this.input.keyboard.on('keydown-UP', () => mv(0, -30));
      this.input.keyboard.on('keydown-DOWN', () => mv(0, 30));
      this.input.keyboard.on('keydown-SPACE', () => {
        const b = this.babies.find((k) => !k.found && Math.hypot(k.x - this.lens.x, k.y - this.lens.y) < LENS - 10);
        this.tap(b ? b.x : this.lens.x, b ? b.y : this.lens.y);
      });
    }
    this.moveLens(this.lens.x, this.lens.y);
    this.updateCount();
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  moveLens(x, y) {
    this.lens.x = clamp(x, F.x + 20, F.x + F.w - 20);
    this.lens.y = clamp(y, F.y + 20, F.y + F.h - 20);
    this.maskG.clear();
    this.maskG.fillStyle(0xffffff, 1);
    this.maskG.fillCircle(this.lens.x, this.lens.y, LENS);
    const g = this.lensRing;
    g.clear();
    g.lineStyle(5, 0xe2b54a, 1);
    g.strokeCircle(this.lens.x, this.lens.y, LENS);
    g.lineStyle(2, 0xfff1b8, 0.6);
    g.strokeCircle(this.lens.x, this.lens.y, LENS - 6);
  }

  updateCount() {
    this.countText.setText(`${this.T('foundLabel', 'Baby stars found')}: ${this.found} / ${BABIES.length}`);
  }

  tap(x, y) {
    if (this.state !== 'play') return;
    const inLens = Math.hypot(x - this.lens.x, y - this.lens.y) < LENS;
    const b = this.babies.find((k) => !k.found && Math.hypot(k.x - x, k.y - y) < 34);
    if (!b || !inLens) {
      // a tap on empty space only counts if the lens was over the spot
      if (inLens) {
        this.mistakes++;
        Sfx.play('error');
        toast(this, this.T('nothing', 'Nothing there. Look for a bright orange glow inside the dust!'), { y: 690, color: COLORS.orange, sound: false, duration: 1600 });
      }
      return;
    }
    b.found = true;
    this.found++;
    Sfx.play('success');
    this.marks.lineStyle(3, COLORS.green, 1);
    this.marks.strokeCircle(b.x, b.y, 22);
    floatText(this, b.x, b.y - 30, '★', CSS.yellow, 28);
    const facts = this.T('facts', []);
    if (facts[this.found - 1]) this.info.show(this.T('panelTitle', 'Infrared eyes'), facts[this.found - 1]);
    this.updateCount();
    if (this.found >= BABIES.length) this.win();
  }

  async win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    this.lensRing.clear();
    // show the infrared view everywhere
    this.maskG.clear();
    this.maskG.fillStyle(0xffffff, 1);
    this.maskG.fillRect(F.x, F.y, F.w, F.h);
    await new Promise((r) => this.time.delayedCall(1600, r));
    if (this._leaving) return;
    this.photo = showPhoto(this, this.T('photo', null), 140, 298, 620, 359);
    const r = await this.guide.say(this.T('photoLine', ''), { modal: false, position: 'top' });
    if (r === null || this._leaving) return;
    if (this.photo) {
      this.setDomVisible(this.photo, false);
      this.photo.credit.setVisible(false);
    }
    Speech.stop();
    finishGame(this, { stars: starsFor(this.mistakes, 2, 5) });
  }
}
