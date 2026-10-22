import { COLORS, CSS, DEPTH, seeded } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame } from '../common/kit.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { drawPanel, toast } from '../../ui/widgets.js';

// Finding the edge of the Sun's bubble (2012): Voyager 1's particle counts draw across the
// chart. Particles from the Sun drop away and cosmic rays from the galaxy jump up when it
// crosses out - after a few short fake-outs in July and August. Press "Edge!" at the real one.
const CH = { x: 70, y: 150, w: 1140, h: 360 };
const DAYS = 335; // January 1 to December 1, 2012
const DIPS = [[209, 212], [226, 230]]; // the fake-outs (July 28, August 14)
const EDGE = 237; // August 25, 2012
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MDAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

function dateOf(day) {
  let m = 0, d = Math.floor(day);
  while (m < 11 && d >= MDAYS[m]) d -= MDAYS[m++];
  return `${MONTHS[m]} ${d + 1}, 2012`;
}

export class HeliopauseScene extends BaseScene {
  constructor() {
    super('Heliopause');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 140 });
    this.state = 'intro';
    this.mistakes = 0;
    this.day = 120;
    this.speed = this.relaxed ? 6.5 : 9; // days per second
    // the data, made once (with a little noise, like real measurements)
    const rnd = seeded(7);
    this.sun = [];
    this.cosmic = [];
    for (let d = 0; d <= DAYS; d++) {
      const inDip = DIPS.some(([a, b]) => d >= a && d <= b);
      const out = d >= EDGE;
      this.sun.push(out ? 0.05 + rnd() * 0.03 : inDip ? 0.14 + rnd() * 0.06 : 0.72 + Math.sin(d / 9) * 0.05 + rnd() * 0.06);
      this.cosmic.push(out ? 0.86 + rnd() * 0.04 : inDip ? 0.52 + rnd() * 0.05 : 0.3 + Math.sin(d / 13) * 0.03 + rnd() * 0.04);
    }

    const g = this.add.graphics();
    drawPanel(g, CH.x - 20, CH.y - 50, CH.w + 40, CH.h + 110, { fill: 0x0b1230, radius: 18, stroke: COLORS.cyan, strokeWidth: 3 });
    g.lineStyle(1, 0x2a3566, 1);
    for (let m = 0, d = 0; m < 12; d += MDAYS[m], m++) {
      const x = CH.x + (d / DAYS) * CH.w;
      g.lineBetween(x, CH.y, x, CH.y + CH.h);
      txt(this, x + 4, CH.y + CH.h + 10, MONTHS[m], { size: 13, color: CSS.dim, scale: false });
    }
    // the legend
    const lg = this.add.graphics();
    lg.fillStyle(COLORS.yellow, 1);
    lg.fillRect(CH.x, CH.y - 34, 26, 6);
    lg.fillStyle(COLORS.cyan, 1);
    lg.fillRect(CH.x + 420, CH.y - 34, 26, 6);
    txt(this, CH.x + 34, CH.y - 31, this.T('sunLabel', 'Particles from the Sun'), { size: 15, weight: 700, color: CSS.yellow, origin: [0, 0.5], scale: false });
    txt(this, CH.x + 454, CH.y - 31, this.T('galaxyLabel', 'Cosmic rays'), { size: 15, weight: 700, color: CSS.cyan, origin: [0, 0.5], scale: false });
    this.lines = this.add.graphics();
    this.cursor = this.add.graphics();
    this.dateText = txt(this, 0, CH.y - 4, '', { size: 16, weight: 800, color: '#ffffff', origin: [0.5, 1], scale: false }).setDepth(DEPTH.ui);

    this.edgeBtn = new Button(this, 640, 640, { width: 300, height: 76, size: 30, label: this.T('edgeLabel', 'Edge!'), icon: 'star', variant: 'warn', onClick: () => this.press() });
    if (this.input.keyboard) this.input.keyboard.on('keydown-SPACE', () => this.press());
    this.draw();
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  draw() {
    const g = this.lines;
    g.clear();
    const upto = Math.min(DAYS, Math.floor(this.day));
    const X = (d) => CH.x + (d / DAYS) * CH.w;
    const Y = (v) => CH.y + CH.h - v * CH.h;
    [[this.sun, COLORS.yellow], [this.cosmic, COLORS.cyan]].forEach(([data, col]) => {
      g.lineStyle(3, col, 1);
      g.beginPath();
      g.moveTo(X(0), Y(data[0]));
      for (let d = 1; d <= upto; d++) g.lineTo(X(d), Y(data[d]));
      g.strokePath();
    });
    const cx = X(this.day);
    this.cursor.clear();
    this.cursor.lineStyle(2, 0xffffff, 0.6);
    this.cursor.lineBetween(cx, CH.y, cx, CH.y + CH.h);
    this.dateText.setPosition(Math.min(CH.x + CH.w - 60, Math.max(CH.x + 60, cx)), CH.y - 4).setText(dateOf(this.day));
  }

  press() {
    if (this.state !== 'play') return;
    if (this.day >= EDGE && this.day <= EDGE + 40) return this.win();
    this.mistakes++;
    Sfx.play('error');
    toast(this, this.T('early', 'Not yet!'), { y: 100, color: COLORS.orange, sound: false, speak: true, duration: 2600 });
  }

  async win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    const x = CH.x + (EDGE / DAYS) * CH.w;
    const mark = this.add.graphics().setDepth(DEPTH.ui);
    mark.lineStyle(4, COLORS.green, 1);
    mark.lineBetween(x, CH.y - 10, x, CH.y + CH.h + 10);
    txt(this, x - 10, CH.y + CH.h - 30, 'Aug 25, 2012', { size: 16, weight: 800, color: CSS.green, origin: [1, 0.5], scale: false }).setDepth(DEPTH.ui);
    const r = await this.guide.say(this.T('good', ''), { modal: true, position: 'top' });
    if (r === null) return;
    finishGame(this, { stars: this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1 });
  }

  update(time, delta) {
    if (this.state !== 'play') return;
    const dt = Math.min(0.05, delta / 1000);
    this.day += this.speed * dt;
    if (this.day > EDGE + 40) {
      // missed it: go back a little and watch again
      this.mistakes++;
      this.day = 170;
      toast(this, this.T('late', 'Too late!'), { y: 100, color: COLORS.orange, sound: false, speak: true, duration: 2600 });
    }
    this.draw();
  }
}
