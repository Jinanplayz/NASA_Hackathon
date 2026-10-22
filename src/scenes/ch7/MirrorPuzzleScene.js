import Phaser from 'phaser';
import { COLORS, CSS, DEPTH, shuffle } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame, starsFor, draggable, InfoPanel } from '../common/kit.js';
import { img, makeTex, linear, poly } from '../../art/core.js';
import { MIRROR_CELLS, hexCenter } from '../../art/ch7.js';
import { txt } from '../../ui/text.js';
import { toast, shake, floatText } from '../../ui/widgets.js';

// Webb's mirror is made of 18 gold hexagons. Because the mirror is curved, there are three
// slightly different shapes: A (the inner ring), and B and C (taking turns in the outer ring).
// Put every segment in a place with the same letter.
const C0 = { x: 390, y: 385 }, R = 50, SR = 30;
const TYPE_COL = { A: 0x4fd1ff, B: 0xff9f43, C: 0xa78bfa };

function typeOf(q, r) {
  const s = -q - r;
  const ring = Math.max(Math.abs(q), Math.abs(r), Math.abs(s));
  if (ring === 1) return 'A';
  // in the outer ring, the six corners are B and the six in between are C
  const twos = [q, r, s].filter((v) => Math.abs(v) === 2).length;
  return twos === 2 ? 'B' : 'C';
}

function hexPts(R0) {
  const pts = [];
  for (let i = 0; i < 6; i++) pts.push([Math.cos((Math.PI / 3) * i) * R0, Math.sin((Math.PI / 3) * i) * R0]);
  return pts;
}

export class MirrorPuzzleScene extends BaseScene {
  constructor() {
    super('MirrorPuzzle');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 120 });
    if (!this.textures.exists('hexSeg')) {
      makeTex(this, 'hexSeg', SR * 2 + 4, SR * 2 + 4, (c, w) => {
        const cx = w / 2;
        poly(c, hexPts(SR * 0.95).map(([x, y]) => [cx + x, cx + y]));
        c.fillStyle = linear(c, 0, 0, w, w, [[0, '#fff1b8'], [0.45, '#e2b54a'], [1, '#9a6a1a']]);
        c.fill();
        c.strokeStyle = 'rgba(80,50,10,0.7)';
        c.lineWidth = 2;
        c.stroke();
      });
    }
    this.state = 'intro';
    this.mistakes = 0;
    this.placed = 0;
    this.selected = null;

    // the empty honeycomb, with the letter of the segment each place needs
    const g = this.add.graphics();
    this.slots = MIRROR_CELLS.map(({ q, r }) => {
      const p = hexCenter(q, r, R);
      const x = C0.x + p.x, y = C0.y + p.y, type = typeOf(q, r);
      g.fillStyle(0x0b1230, 0.9);
      g.fillPoints(hexPts(R * 0.94).map(([dx, dy]) => new Phaser.Math.Vector2(x + dx, y + dy)), true);
      g.lineStyle(3, TYPE_COL[type], 0.8);
      g.strokePoints(hexPts(R * 0.94).map(([dx, dy]) => new Phaser.Math.Vector2(x + dx, y + dy)), true);
      const t = txt(this, x, y, type, { size: 24, weight: 800, color: '#' + TYPE_COL[type].toString(16), origin: 0.5, scale: false });
      return { x, y, type, seg: null, label: t };
    });
    txt(this, C0.x, 120, this.T('mirrorLabel', "Webb's primary mirror"), { size: 20, weight: 800, color: CSS.yellow, origin: 0.5, scale: false });
    // tap an empty place to put the selected segment there
    this.slots.forEach((s) => {
      const z = this.add.zone(s.x, s.y, R * 1.6, R * 1.6).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => this.selected && !s.seg && this.put(this.selected, s));
    });

    // the segments, mixed up in the tray
    const types = shuffle(this.slots.map((s) => s.type));
    this.segs = types.map((type, i) => {
      const x = 790 + (i % 6) * 76, y = 400 + Math.floor(i / 6) * 76;
      const c = this.add.container(x, y);
      const im = img(this, 0, 0, 'hexSeg', 1);
      const t = txt(this, 0, 0, type, { size: 20, weight: 800, color: '#3a2a08', origin: 0.5, scale: false });
      const dot = this.add.circle(SR * 0.62, -SR * 0.5, 6, TYPE_COL[type]);
      c.add([im, t, dot]);
      c.setSize(SR * 2, SR * 2);
      c.type = type;
      draggable(this, c, {
        onDrop: (px, py) => {
          const s = this.slots.find((k) => !k.seg && Math.hypot(k.x - px, k.y - py) < R * 0.9);
          return s ? this.put(c, s) : false;
        },
        onTap: () => this.select(c)
      });
      return c;
    });
    this.info = new InfoPanel(this, 760, 110, 470, 240, { title: this.T('panelTitle', '18 golden segments'), text: this.T('panelText', ''), size: 18 });
    this.countText = txt(this, 995, 640, '', { size: 20, weight: 800, color: CSS.yellow, origin: 0.5, scale: false });
    this.updateCount();
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  updateCount() {
    this.countText.setText(`${this.T('placedLabel', 'Segments in place')}: ${this.placed} / 18`);
  }

  select(c) {
    if (this.state !== 'play') return;
    this.segs.forEach((k) => k.enabled && k.setScale(1));
    this.selected = c;
    c.setScale(1.12);
    Sfx.play('select');
  }

  put(c, slot) {
    if (this.state !== 'play') return false;
    if (c.type !== slot.type) {
      this.mistakes++;
      Sfx.play('error');
      shake(this, c, 6);
      toast(this, this.T('wrongType', 'That is a {a} segment. It only fits where you see {a}.').split('{a}').join(c.type), { y: 670, color: COLORS.orange, sound: false, duration: 2000 });
      c.goHome();
      c.setScale(1);
      this.selected = null;
      return true;
    }
    slot.seg = c;
    slot.label.setVisible(false);
    this.tweens.killTweensOf(c);
    c.enabled = false;
    c.disableInteractive();
    this.focus.remove(c);
    this.selected = null;
    c.list[1].setVisible(false);
    c.list[2].setVisible(false);
    this.tweens.add({ targets: c, x: slot.x, y: slot.y, scale: R / SR, duration: 240, ease: 'Back.easeOut' });
    Sfx.play('snap');
    this.placed++;
    this.updateCount();
    const facts = this.T('facts', []);
    const k = [3, 9, 15].indexOf(this.placed);
    if (k >= 0 && facts[k]) {
      this.info.show(this.T('panelTitle', '18 golden segments'), facts[k]);
      Speech.say(facts[k]);
    }
    if (this.placed >= 18) this.win();
    return true;
  }

  async win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    // a shine sweeps across the gold
    const shine = this.add.rectangle(C0.x - 300, C0.y, 60, 520, 0xffffff, 0.35).setAngle(20).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.ui);
    this.tweens.add({ targets: shine, x: C0.x + 300, duration: 900, onComplete: () => shine.destroy() });
    floatText(this, C0.x, C0.y - 260, '✓', CSS.green, 40);
    await new Promise((r) => this.time.delayedCall(1200, r));
    if (this._leaving) return;
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    finishGame(this, { stars: starsFor(this.mistakes, 1, 3) });
  }
}
