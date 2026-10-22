import Phaser from 'phaser';
import { COLORS, CSS, DEPTH, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame, starsFor, InfoPanel } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Slider, drawPanel, toast, floatText } from '../../ui/widgets.js';

// Linda Morabito's discovery: in a navigation photo of Io, made extra bright to show the
// stars, a faint cloud appeared over the moon's edge - an erupting volcano. Turn up the
// brightness, then tap the plume.
const PX = 40, PY = 96, PW = 820, PH = 570; // the photo
const IO = { x: 470, y: 400, r: 190 };
const PLUME = { a: -2.35 }; // where on Io's edge the plume rises (radians)

export class IoPlumeScene extends BaseScene {
  constructor() {
    super('IoPlume');
  }

  create() {
    this.setupStage({ bg: 0x05060a });
    this.state = 'intro';
    this.mistakes = 0;
    this.bright = 0.15;

    // the black-and-white style photo
    const frame = this.add.graphics();
    drawPanel(frame, PX - 8, PY - 8, PW + 16, PH + 16, { fill: 0x000000, radius: 12, stroke: 0x46516b, strokeWidth: 3 });
    this.photo = this.add.container(0, 0);
    const mask = this.make.graphics({ add: false });
    mask.fillStyle(0xffffff, 1);
    mask.fillRect(PX, PY, PW, PH);
    this.photo.setMask(mask.createGeometryMask());
    this.stars = this.add.graphics();
    for (let i = 0; i < 70; i++) {
      this.stars.fillStyle(0xffffff, 0.5 + Math.random() * 0.5);
      this.stars.fillCircle(PX + Math.random() * PW, PY + Math.random() * PH, Math.random() < 0.15 ? 2 : 1.2);
    }
    this.io = img(this, IO.x, IO.y, 'io', (IO.r * 2) / (120 * 0.9)).setTint(0xb0b0b0);
    this.overexpose = this.add.circle(IO.x, IO.y, IO.r * 0.98, 0xffffff, 0);
    // the plume: a faint umbrella-shaped cloud over the edge, only visible when bright
    const px = IO.x + Math.cos(PLUME.a) * IO.r, py = IO.y + Math.sin(PLUME.a) * IO.r;
    this.plumePos = { x: px + Math.cos(PLUME.a) * 34, y: py + Math.sin(PLUME.a) * 34 };
    // (made of soft glowing puffs along an umbrella-shaped arc, like the real faint cloud)
    this.plume = this.add.container(0, 0);
    for (let k = 0; k <= 26; k++) {
      const t = k / 26, ang = PLUME.a - 0.75 + t * 1.5;
      const rr = 58 + Math.sin(t * Math.PI) * 10;
      const dot = this.add.image(px + Math.cos(ang) * rr, py + Math.sin(ang) * rr, 'softDot').setScale(0.42 + Math.sin(t * Math.PI) * 0.18).setTint(0xcfe0ff).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD);
      this.plume.add(dot);
    }
    for (let k = 0; k < 6; k++) {
      const dot = this.add.image(px + Math.cos(PLUME.a) * (10 + k * 9), py + Math.sin(PLUME.a) * (10 + k * 9), 'softDot').setScale(0.3).setTint(0xcfe0ff).setAlpha(0.25).setBlendMode(Phaser.BlendModes.ADD);
      this.plume.add(dot);
    }
    this.plume.setAlpha(0);
    // the grid of little crosses printed on Voyager's camera pictures
    const reseau = this.add.graphics();
    reseau.lineStyle(1.5, 0x000000, 0.7);
    for (let x = PX + 50; x < PX + PW; x += 100) for (let y = PY + 45; y < PY + PH; y += 100) {
      reseau.lineBetween(x - 5, y, x + 5, y);
      reseau.lineBetween(x, y - 5, x, y + 5);
    }
    this.photo.add([this.stars, this.io, this.overexpose, this.plume, reseau]);
    txt(this, PX + 14, PY + PH - 26, 'VOYAGER 1 · IO · NAVIGATION IMAGE', { size: 13, weight: 800, color: '#8b93a8', scale: false }).setDepth(DEPTH.ui);

    // controls
    const cg = this.add.graphics();
    drawPanel(cg, 890, 96, 360, 220, { fill: COLORS.panel, radius: 18, stroke: COLORS.cyan, strokeWidth: 3 });
    txt(this, 1070, 120, this.T('brightLabel', 'Brightness'), { size: 20, weight: 800, color: CSS.yellow, origin: [0.5, 0], scale: false });
    this.slider = new Slider(this, 1070, 200, 280, this.bright, (v) => this.setBright(v), 10);
    this.hint = txt(this, 1070, 250, '', { size: 16, color: CSS.dim, origin: [0.5, 0], align: 'center', wrap: 320, scale: false });
    this.info = new InfoPanel(this, 890, 336, 360, 330, { title: '', text: '' });
    this.info.g.setVisible(false);

    // tap on the photo
    this.zone = this.add.zone(PX + PW / 2, PY + PH / 2, PW, PH).setInteractive({ useHandCursor: true });
    this.zone.on('pointerup', (p) => this.tapAt(p.worldX, p.worldY));
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-UP', () => this.slider.set(clamp(this.slider.value + 0.1, 0, 1)));
      this.input.keyboard.on('keydown-DOWN', () => this.slider.set(clamp(this.slider.value - 0.1, 0, 1)));
    }
    this.setBright(this.bright);
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  setBright(v) {
    this.bright = v;
    // turning the brightness up washes Io out and brings out faint things: stars and the plume
    this.stars.setAlpha(clamp((v - 0.25) / 0.4, 0, 1));
    this.overexpose.setFillStyle(0xffffff, clamp((v - 0.35) / 0.6, 0, 0.85));
    this.plume.setAlpha(clamp((v - 0.55) / 0.35, 0, 1) * 0.75);
    this.hint.setText(v > 0.6 ? this.T('hint', '') : '');
  }

  tapAt(x, y) {
    if (this.state !== 'play') return;
    const d = Phaser.Math.Distance.Between(x, y, this.plumePos.x, this.plumePos.y);
    if (d < 70 && this.bright > 0.55) return this.found();
    this.mistakes++;
    Sfx.play('error');
    toast(this, this.bright > 0.55 ? this.T('notThere', 'Nothing there.') : this.T('tooDark', 'Too dark! Turn the brightness up first.'), { y: 100, color: COLORS.orange, sound: false, speak: true, duration: 2200 });
  }

  async found() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    const ring = this.add.graphics().setDepth(DEPTH.ui);
    ring.lineStyle(4, COLORS.yellow, 1);
    ring.strokeCircle(this.plumePos.x, this.plumePos.y, 60);
    this.tweens.add({ targets: ring, alpha: 0.3, duration: 400, yoyo: true, repeat: 3 });
    floatText(this, this.plumePos.x, this.plumePos.y - 70, '!', CSS.yellow, 48);
    this.info.g.setVisible(true);
    this.info.show(this.T('resultTitle', 'Discovery!'), this.T('found', ''));
    // wait for Captain Nova to finish (and at least a couple of seconds to look)
    await Promise.all([Speech.say(this.T('found', '')), new Promise((r) => this.time.delayedCall(2500, r))]);
    if (this._leaving || this.state !== 'won') return;
    finishGame(this, { stars: starsFor(this.mistakes, 1, 3) });
  }
}
