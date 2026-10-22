import { W, H, FULL, COLORS, CSS, DEPTH, shuffle } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame, starsFor, draggable, InfoPanel } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt, fitText } from '../../ui/text.js';
import { Slider, drawPanel, toast, shake, floatText } from '../../ui/widgets.js';

// Light takes time to reach us, so looking far away means looking back in time.
// Part 1: put each object on the timeline of how long its light takes to get here.
// Part 2: light from the most distant galaxies gets stretched on the way, from blue to red to
// infrared: stretch it until Webb's infrared eyes can see the galaxy.
const SLOT_Y = 470;
const SLOT_X = [150, 395, 640, 885, 1130];

export class LightTravelScene extends BaseScene {
  constructor() {
    super('LightTravel');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 160 });
    this.state = 'intro';
    this.mistakes = 0;
    this.filled = 0;
    this.objects = this.T('objects', []);

    // the timeline
    const g = this.add.graphics();
    g.lineStyle(6, COLORS.cyan, 0.6);
    g.lineBetween(90, SLOT_Y + 90, 1190, SLOT_Y + 90);
    g.fillStyle(COLORS.cyan, 0.8);
    g.fillTriangle(1190, SLOT_Y + 78, 1214, SLOT_Y + 90, 1190, SLOT_Y + 102);
    txt(this, W / 2, SLOT_Y + 178, this.T('fartherLabel', 'Farther away = older light'), { size: 18, weight: 800, color: CSS.cyan, origin: 0.5, scale: false });
    this.slots = this.objects.map((o, i) => {
      const x = SLOT_X[i];
      const sg = this.add.graphics();
      drawPanel(sg, x - 105, SLOT_Y - 70, 210, 140, { fill: 0x0b1230, radius: 16, stroke: COLORS.stroke, strokeWidth: 2, alpha: 0.8 });
      sg.fillStyle(COLORS.cyan, 1);
      sg.fillCircle(x, SLOT_Y + 90, 9);
      txt(this, x, SLOT_Y + 108, o.time, { size: 16, weight: 800, color: CSS.yellow, origin: [0.5, 0], align: 'center', wrap: 220, scale: false });
      return { x, y: SLOT_Y, index: i, card: null };
    });

    // the object cards (shuffled) across the top
    const order = shuffle(this.objects.map((o, i) => i));
    this.cards = order.map((idx, k) => {
      const o = this.objects[idx];
      const c = this.add.container(SLOT_X[k], 254);
      const cg = this.add.graphics();
      drawPanel(cg, -100, -64, 200, 128, { fill: COLORS.panel, radius: 16, stroke: COLORS.cyan, strokeWidth: 3 });
      const pic = img(this, 0, -14, o.art, o.scale ?? 0.5);
      const name = txt(this, 0, 42, o.name, { size: 16, weight: 800, origin: 0.5, align: 'center', wrap: 186, scale: false });
      fitText(name, 186, 36, 11);
      c.add([cg, pic, name]);
      c.setSize(200, 128);
      c.obj = o;
      c.index = idx;
      draggable(this, c, {
        onDrop: (x, y) => {
          const slot = this.slots.find((s) => !s.card && Math.abs(s.x - x) < 115 && Math.abs(s.y - y) < 80);
          return slot ? this.place(c, slot) : false;
        },
        onTap: () => this.select(c)
      });
      return c;
    });
    this.selected = null;
    // tap a slot to place the selected card
    this.slots.forEach((s) => {
      const z = this.add.zone(s.x, s.y, 210, 140).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => this.selected && !s.card && this.place(this.selected, s));
    });
    this.info = new InfoPanel(this, 300, 90, 680, 96, { title: '', text: '', size: 17, titleSize: 19 });
    this.info.g.setVisible(false);
    playIntro(this).then((ok) => {
      if (ok) this.state = 'match';
    });
  }

  select(c) {
    if (this.state !== 'match') return;
    this.cards.forEach((k) => k.enabled && k.setScale(1));
    this.selected = c;
    c.setScale(1.06);
    Sfx.play('select');
  }

  place(c, slot) {
    if (this.state !== 'match') return false;
    if (c.index !== slot.index) {
      this.mistakes++;
      Sfx.play('error');
      shake(this, c, 8);
      toast(this, this.T('wrong', 'Not quite! Think about how far away it is.'), { y: 356, color: COLORS.orange, sound: false, duration: 1800 });
      c.goHome();
      return true;
    }
    slot.card = c;
    c.enabled = false;
    c.disableInteractive();
    this.focus.remove(c);
    this.selected = null;
    this.tweens.add({ targets: c, x: slot.x, y: slot.y, scale: 1, duration: 220 });
    Sfx.play('snap');
    this.info.g.setVisible(true);
    this.info.show(c.obj.name, c.obj.fact);
    Speech.say(c.obj.fact);
    this.filled++;
    if (this.filled >= this.slots.length) this.time.delayedCall(2600, () => this.startStretch());
    return true;
  }

  // ---------- part 2: stretching light ----------
  async startStretch() {
    if (this._leaving) return;
    this.state = 'between';
    const r = await this.guide.say(this.T('stretchIntro', ''), { modal: true, position: 'top' });
    if (r === null || this._leaving) return;
    // clear the timeline and show a light wave on its way from a far galaxy
    this.cards.forEach((c) => c.setVisible(false));
    this.add.rectangle(W / 2, H / 2, FULL.w, FULL.h, 0x070b1d, 0.85).setDepth(DEPTH.ui - 4);
    this.info.g.setVisible(false);
    this.info.title.setText('');
    this.info.body.setText('');
    const pg = this.add.graphics().setDepth(DEPTH.ui - 3);
    drawPanel(pg, 60, 110, 1160, 470, { fill: 0x0b1230, radius: 18, stroke: COLORS.stroke, strokeWidth: 3 });
    this.galaxy = img(this, 150, 300, 'galaxyRed', 1.1).setDepth(DEPTH.ui - 2);
    this.webb = img(this, 1120, 300, 'jwst', 0.45).setDepth(DEPTH.ui - 2);
    this.wave = this.add.graphics().setDepth(DEPTH.ui - 2);
    this.waveLabel = txt(this, W / 2, 140, '', { size: 22, weight: 800, origin: [0.5, 0], scale: false }).setDepth(DEPTH.ui);
    this.eyeText = txt(this, W / 2, 440, '', { size: 18, weight: 700, color: CSS.dim, origin: [0.5, 0], align: 'center', wrap: 900, scale: false }).setDepth(DEPTH.ui);
    txt(this, W / 2, 490, this.T('stretchLabel', 'Stretch the light'), { size: 18, weight: 800, color: CSS.yellow, origin: 0.5, scale: false }).setDepth(DEPTH.ui);
    this.stretch = 0;
    this.slider = new Slider(this, W / 2, 540, 600, 0, (v) => this.setStretch(v), 20);
    this.slider.setDepth(DEPTH.ui);
    this.setStretch(0);
    this.state = 'stretch';
    Speech.say(this.T('stretchHint', ''));
  }

  setStretch(v) {
    this.stretch = v;
    // wavelength grows as the light stretches; colour goes blue -> green -> red -> invisible infrared
    const len = 40 + v * 140;
    const band = v < 0.25 ? 0 : v < 0.5 ? 1 : v < 0.75 ? 2 : 3;
    const col = [0x5b8cff, 0x3ddc97, 0xff4b3b, 0xb0302a][band];
    const g = this.wave;
    g.clear();
    // infrared: still there, but invisible to our eyes (drawn faint)
    g.lineStyle(5, col, band === 3 ? 0.35 : 1);
    g.beginPath();
    for (let x = 220; x <= 1040; x += 4) {
      const y = 300 + Math.sin(((x - 220) / len) * Math.PI * 2) * 40;
      if (x === 220) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.strokePath();
    const names = this.T('bands', ['Blue light', 'Green light', 'Red light', 'Infrared!']);
    this.waveLabel.setText(names[band]).setColor(band === 3 ? CSS.orange : '#' + col.toString(16).padStart(6, '0'));
    const eyes = this.T('eyes', []);
    this.eyeText.setText(eyes[band] || '');
    this.galaxy.setAlpha(band === 3 ? 1 : 0.5);
    if (band === 3 && this.state === 'stretch') this.stretched();
  }

  async stretched() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    floatText(this, 1120, 220, '✓', CSS.green, 40);
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    finishGame(this, { stars: starsFor(this.mistakes, 1, 3) });
  }
}
