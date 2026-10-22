import { W, COLORS, CSS, DEPTH, shuffle, clamp } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { playIntro, finishGame, starsFor, draggable } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt, fitText } from '../../ui/text.js';
import { drawPanel, toast, shake, floatText } from '../../ui/widgets.js';

// "Square peg, round hole": follow Houston's instructions and build the 'mailbox' adapter
// from things on board, before the carbon dioxide meter reaches the danger zone.
const BENCH = { x: 470, y: 330 };
const METER = { x: 70, y: 150, w: 56, h: 380 };
const LIST = { x: 820, y: 96, w: 430, h: 300 };
const DANGER = 15, START = 7, MAXV = 17;

export class ScrubberScene extends BaseScene {
  constructor() {
    super('Scrubber');
  }

  create() {
    this.setupStage();
    blueprint(this);
    this.state = 'intro';
    this.warned = false;
    this.photoDom = null;
    this.mistakes = 0;
    this.step = 0;
    this.co2 = START;
    this.peak = START;
    this.riseTime = this.relaxed ? 130 : 85; // seconds from the start value to danger
    this.steps = this.T('steps', []);

    // CO2 meter
    const mg = this.add.graphics();
    drawPanel(mg, METER.x - 40, METER.y - 56, METER.w + 80, METER.h + 100, { fill: 0x0b1230, radius: 18 });
    txt(this, METER.x + METER.w / 2, METER.y - 34, this.T('co2Label', 'CO2'), { size: 15, weight: 800, color: CSS.cyan, origin: 0.5, align: 'center', wrap: 130, scale: false });
    this.meterG = this.add.graphics();
    this.co2Text = txt(this, METER.x + METER.w / 2, METER.y + METER.h + 24, '', { size: 18, weight: 800, origin: 0.5, scale: false });

    // the workbench and the build
    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.25);
    bg.fillEllipse(BENCH.x, BENCH.y + 150, 420, 70);
    this.build = this.add.container(BENCH.x, BENCH.y);
    this.layers = {
      filter: img(this, 0, 0, 'scBuildFilter', 1).setAlpha(0.25),
      cardboard: img(this, 0, 0, 'scBuildCardboard', 1).setVisible(false),
      bag: img(this, 0, 0, 'scBuildBag', 1).setVisible(false),
      tape: img(this, 0, 0, 'scBuildTape', 1).setVisible(false),
      hose: img(this, 0, 0, 'scBuildHose', 1).setVisible(false)
    };
    this.build.add([this.layers.hose, this.layers.filter, this.layers.cardboard, this.layers.bag, this.layers.tape]);
    this.glow = this.add.graphics();

    // Houston's instructions
    const lg = this.add.graphics();
    drawPanel(lg, LIST.x, LIST.y, LIST.w, LIST.h, { fill: COLORS.panel, radius: 18, stroke: COLORS.cyan, strokeWidth: 3 });
    txt(this, LIST.x + 20, LIST.y + 16, this.T('listTitle', 'Instructions'), { size: 20, weight: 800, color: CSS.yellow, scale: false });
    this.lines = this.steps.map((s, k) => {
      const t = txt(this, LIST.x + 56, LIST.y + 58 + k * 47, s.text, { size: 16, wrap: LIST.w - 76, scale: false, color: CSS.dim });
      fitText(t, LIST.w - 76, 44, 11);
      const n = txt(this, LIST.x + 32, LIST.y + 58 + k * 47 + 10, String(k + 1), { size: 18, weight: 800, origin: 0.5, scale: false, color: CSS.dim });
      return { t, n };
    });

    // the tray of things on board
    txt(this, LIST.x + 20, LIST.y + LIST.h + 18, this.T('trayTitle', 'Things on board'), { size: 18, weight: 800, color: CSS.cyan, scale: false });
    this.items = shuffle(this.T('items', [])).map((it, k) => {
      const col = k % 4, row = Math.floor(k / 4);
      const c = this.itemCard(it, LIST.x + 56 + col * 107, LIST.y + LIST.h + 102 + row * 116);
      draggable(this, c, {
        onDrop: (x, y) => (Math.abs(x - BENCH.x) < 230 && Math.abs(y - BENCH.y) < 200 ? this.use(c) : false),
        onTap: () => this.use(c)
      });
      return c;
    });

    this.highlight();
    this.drawMeter();
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  itemCard(it, x, y) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x0b1230, 0.95);
    g.fillRoundedRect(-50, -52, 100, 104, 12);
    g.lineStyle(2, 0x3a4a92, 1);
    g.strokeRoundedRect(-50, -52, 100, 104, 12);
    const icon = img(this, 0, -12, it.key, 0.62);
    const name = txt(this, 0, 34, it.name, { size: 13, weight: 700, origin: 0.5, align: 'center', wrap: 94, scale: false });
    fitText(name, 94, 30, 10);
    c.add([g, icon, name]);
    c.setSize(100, 104);
    c.item = it;
    return c;
  }

  highlight() {
    this.lines.forEach((l, k) => {
      const color = k < this.step ? CSS.green : k === this.step ? CSS.text : CSS.dim;
      l.t.setColor(color);
      l.n.setText(k < this.step ? '✓' : String(k + 1)).setColor(k < this.step ? CSS.green : k === this.step ? CSS.yellow : CSS.dim);
    });
  }

  use(c) {
    if (this.state !== 'play' || !c.enabled) return false;
    const it = c.item;
    const want = this.steps[this.step];
    if (want && it.id === want.item) {
      c.enabled = false;
      c.disableInteractive();
      this.focus.remove(c);
      Sfx.play('snap');
      this.tweens.add({ targets: c, x: BENCH.x, y: BENCH.y, scale: 0.3, alpha: 0, duration: 300, onComplete: () => c.setVisible(false) });
      const layer = this.layers[it.id];
      if (layer) {
        layer.setVisible(true).setAlpha(0).setScale(1.2);
        this.tweens.add({ targets: layer, alpha: 1, scale: 1, duration: 350, ease: 'Back.easeOut' });
      }
      floatText(this, BENCH.x, BENCH.y - 150, '✓', CSS.green, 44);
      this.step++;
      this.highlight();
      if (this.step >= this.steps.length) this.win();
      return true;
    }
    this.mistakes++;
    this.co2 = Math.min(MAXV, this.co2 + 0.5);
    Sfx.play('error');
    shake(this, c, 8);
    const why = it.why || this.T('wrongStep', 'Not yet!');
    toast(this, why, { y: 100, color: COLORS.orange, sound: false, speak: true, duration: 3200 });
    c.goHome();
    return true;
  }

  drawMeter() {
    const g = this.meterG;
    g.clear();
    const yOf = (v) => METER.y + METER.h - (v / MAXV) * METER.h;
    g.fillStyle(0x1b2348, 1);
    g.fillRoundedRect(METER.x, METER.y, METER.w, METER.h, 12);
    g.fillStyle(COLORS.red, 0.3);
    g.fillRect(METER.x, METER.y, METER.w, yOf(DANGER) - METER.y);
    const v = clamp(this.co2, 0, MAXV);
    g.fillStyle(v >= DANGER ? COLORS.red : v > DANGER * 0.8 ? COLORS.orange : COLORS.green, 1);
    g.fillRoundedRect(METER.x + 8, yOf(v), METER.w - 16, Math.max(6, METER.y + METER.h - yOf(v) - 6), 8);
    g.lineStyle(3, COLORS.red, 1);
    g.lineBetween(METER.x - 12, yOf(DANGER), METER.x + METER.w + 12, yOf(DANGER));
    this.co2Text.setText(`${v.toFixed(1)}`).setColor(v >= DANGER ? CSS.red : CSS.text);
  }

  async win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    // the air clears
    this.tweens.addCounter({ from: this.co2, to: 2, duration: 2500, onUpdate: (t) => {
      this.co2 = t.getValue();
      this.drawMeter();
    } });
    this.tweens.add({ targets: this.build, scale: 1.1, duration: 400, yoyo: true });
    // the real 'mailbox', photographed on board Aquarius
    const photo = this.T('photo', null);
    if (photo && photo.src) this.showPhoto(photo);
    const r = await this.guide.say(this.T('doneLine', ''), { modal: false, position: 'top' });
    if (r === null) return;
    if (this.photoDom) this.setDomVisible(this.photoDom, false);
    const stars = Math.max(1, starsFor(this.mistakes, 0, 2) - (this.peak >= DANGER ? 1 : 0));
    finishGame(this, { stars });
  }

  showPhoto(photo) {
    const el = document.createElement('div');
    el.className = 'media-frame';
    el.style.width = '300px';
    el.style.height = '300px';
    const im = document.createElement('img');
    im.src = Content.media(this.chapterId, photo.src);
    im.alt = photo.alt || '';
    im.onerror = () => this.photoDom && this.setDomVisible(this.photoDom, false);
    el.appendChild(im);
    this.photoDom = this.addDom(W - 340, 330, el);
    this.photoDom.pointerEvents = 'none';
    txt(this, W - 190, 642, photo.credit || Content.ui('photoCredit', 'Photo: NASA'), { size: 13, color: CSS.dim, origin: 0.5, scale: false }).setDepth(DEPTH.ui);
    // hide the tray behind the photo
    this.items.forEach((c) => c.setVisible(false));
  }

  update(time, delta) {
    if (this.state === 'play') {
      const dt = Math.min(0.05, delta / 1000);
      this.co2 = Math.min(MAXV, this.co2 + ((DANGER - START) / this.riseTime) * dt);
      this.peak = Math.max(this.peak, this.co2);
      if (this.co2 >= DANGER && !this.warned) {
        this.warned = true;
        Sfx.play('alarm');
        Speech.say(this.T('dangerLabel', 'Danger'));
      }
      this.drawMeter();
    }
    // the next part to add glows on the bench
    this.glow.clear();
    if (this.state === 'play') {
      this.glow.lineStyle(3, COLORS.yellow, 0.4 + Math.sin(time / 250) * 0.3);
      this.glow.strokeRoundedRect(BENCH.x - 190, BENCH.y - 170, 380, 340, 20);
    }
  }
}
