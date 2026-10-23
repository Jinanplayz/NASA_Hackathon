import { COLORS, CSS, DEPTH, shuffle, clamp } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { playIntro, finishGame, starsFor, draggable, GoalBar, idleHint } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt, fitText } from '../../ui/text.js';
import { toast, shake, floatText, roundBox, RoundBox } from '../../ui/widgets.js';

// "Square peg, round hole": follow Houston's instructions (shown one at a time in the task bar)
// and build the 'mailbox' adapter from things on board, before the carbon dioxide meter reaches
// the danger zone.
const BENCH = { x: 480, y: 410 };
const METER = { x: 70, y: 226, w: 56, h: 340 };
const TRAY = { x: 820, y: 176, w: 430, h: 470 };
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
    const mg = roundBox(this, METER.x - 40, METER.y - 56, METER.w + 80, METER.h + 100, { fill: 0x0b1230, radius: 18 });
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

    // Houston's instructions, one at a time
    this.goal = new GoalBar(this);

    // the tray of things on board
    const tg = roundBox(this, TRAY.x, TRAY.y, TRAY.w, TRAY.h, { fill: COLORS.panel, radius: 18, stroke: COLORS.stroke, strokeWidth: 2 });
    txt(this, TRAY.x + 20, TRAY.y + 14, this.T('trayTitle', 'Things on board'), { size: 20, weight: 800, color: CSS.cyan, scale: false });
    this.items = shuffle(this.T('items', [])).map((it, k) => {
      const col = k % 3, row = Math.floor(k / 3);
      const c = this.itemCard(it, TRAY.x + 78 + col * 137, TRAY.y + 116 + row * 134);
      draggable(this, c, {
        onDrop: (x, y) => (Math.abs(x - BENCH.x) < 230 && Math.abs(y - BENCH.y) < 200 ? this.use(c) : false),
        onTap: () => this.use(c)
      });
      return c;
    });

    this.drawMeter();
    // stuck? point at the thing Houston asks for
    idleHint(this, () => {
      const want = this.state === 'play' && this.steps[this.step];
      const c = want && this.items.find((k) => k.enabled && k.item.id === want.item);
      return c ? { x: c.x, y: c.y - 62 } : null;
    }, { delay: 8000 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'play';
      this.highlight();
    });
  }

  itemCard(it, x, y) {
    const c = this.add.container(x, y);
    const g = this.add.existing(new RoundBox(this)).draw(-62, -58, 124, 116, { fill: 0x0b1230, alpha: 0.95, radius: 14, stroke: 0x3a4a92, strokeWidth: 2, shadow: false });
    const icon = img(this, 0, -14, it.key, 0.72);
    const name = txt(this, 0, 38, it.name, { size: 15, weight: 700, origin: 0.5, align: 'center', wrap: 116, scale: false });
    fitText(name, 116, 34, 11);
    c.add([g, icon, name]);
    c.setSize(124, 116);
    c.item = it;
    return c;
  }

  // show (and read out) Houston's next instruction
  highlight() {
    const s = this.steps[this.step];
    if (!s) return;
    this.goal.set({ title: s.text, help: this.T('dragHelp', 'Drag it onto the filter on the bench.') }, { count: `${this.step + 1} / ${this.steps.length}`, speak: false });
    Speech.say(this.step === 0 ? [s.text, this.T('dragHelp', 'Drag it onto the filter on the bench.')] : s.text);
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
      if (this.step >= this.steps.length) this.win();
      else this.time.delayedCall(500, () => this.state === 'play' && this.highlight());
      return true;
    }
    this.mistakes++;
    this.co2 = Math.min(MAXV, this.co2 + 0.5);
    Sfx.play('error');
    shake(this, c, 8);
    const why = it.why || this.T('wrongStep', 'Not yet!');
    toast(this, why, { y: 664, color: COLORS.orange, sound: false, speak: true, duration: 3200 });
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
    this.photoDom = this.addDom(TRAY.x + 65, TRAY.y + 70, el);
    this.photoDom.pointerEvents = 'none';
    txt(this, TRAY.x + TRAY.w / 2, TRAY.y + 396, photo.credit || Content.ui('photoCredit', 'Photo: NASA'), { size: 13, color: CSS.dim, origin: 0.5, align: 'center', wrap: TRAY.w - 30, scale: false }).setDepth(DEPTH.ui);
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
      this.glow.strokeRoundedRect(BENCH.x - 190, BENCH.y - 160, 380, 320, 20);
    }
  }
}
