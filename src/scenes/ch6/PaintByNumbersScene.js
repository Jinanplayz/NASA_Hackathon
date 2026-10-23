import Phaser from 'phaser';
import { COLORS, CSS, DEPTH, seeded, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame, starsFor, InfoPanel, showPhoto, GoalBar, idleHint } from '../common/kit.js';
import { txt } from '../../ui/text.js';
import { toast, ProgressBar, shake, roundBox } from '../../ui/widgets.js';

// Mariner 4 (1965) sent the first close-up picture of Mars as a long list of numbers: how bright
// each dot was. Engineers couldn't wait for the computer, so they printed the numbers on strips of
// paper and coloured them in by hand with crayons. Do the same: pick a crayon (its squares light
// up) and colour every square that has its number.
const COLS = 14, ROWS = 8, CELL = 46;
const GX = 66, GY = 236;
const BOX = { x: 800, y: 176 }; // the crayon box
// crayons from dark (1) to bright (6)
const CRAYONS = [0x3a1c10, 0x6e3218, 0xa8522a, 0xd27a3e, 0xeba560, 0xf5d67a];

// the picture: the bright planet in the middle, darker towards the top, and the black of space
// below its curved edge (bottom right)
function brightness(u, v, rnd) {
  const edge = 0.78 - 0.3 * u + 0.05 * Math.sin(u * 7);
  if (v > edge) return v > edge + 0.12 ? 1 : 2;
  const band = 0.46 - 0.12 * u;
  const d = Math.abs(v - band) / 0.32;
  let b = 6 - d * 3.2 + (rnd() - 0.5) * 0.9;
  if (v < 0.12) b -= 1;
  return clamp(Math.round(b), 2, 6);
}

export class PaintByNumbersScene extends BaseScene {
  constructor() {
    super('PaintByNumbers');
  }

  create() {
    this.setupStage({ bg: 0x0d1024 });
    this.state = 'intro';
    this.mistakes = 0;
    this.halfSaid = false;
    this.crayon = 0;
    this.painting = false;
    this.cursor = { c: 0, r: 0 };
    this.lastWrong = -1;

    // the paper strips with their numbers
    const rnd = seeded(65);
    this.cells = [];
    roundBox(this, GX - 16, GY - 56, COLS * CELL + 32, ROWS * CELL + 80, { fill: 0x1a1a22, radius: 14, stroke: 0x4a4a5a, strokeWidth: 2 });
    const pg = this.add.graphics();
    txt(this, GX, GY - 42, this.T('paperLabel', 'Mariner 4 · first close-up picture of Mars · July 15, 1965'), { size: 15, weight: 800, color: '#d8d0bc', scale: false });
    for (let c = 0; c < COLS; c++) {
      // each column is its own strip of paper, a little bit off
      const off = (rnd() - 0.5) * 4;
      pg.fillStyle(0xfbfaf6, 1);
      pg.fillRect(GX + c * CELL + 1, GY + off - 6, CELL - 2, ROWS * CELL + 12);
      for (let r = 0; r < ROWS; r++) {
        const n = brightness((c + 0.5) / COLS, (r + 0.5) / ROWS, rnd);
        const x = GX + c * CELL + CELL / 2, y = GY + r * CELL + CELL / 2 + off;
        const t = txt(this, x, y, String(n), { size: 19, weight: 800, color: '#6a6458', origin: 0.5, scale: false });
        this.cells.push({ c, r, n, x, y, done: false, t });
      }
    }
    this.paint = this.add.graphics();
    this.cursorG = this.add.graphics().setDepth(DEPTH.ui);
    this.total = this.cells.length;
    this.painted = 0;

    // painting with the pointer (dragging colours every matching square it passes)
    this.zone = this.add.zone(GX + (COLS * CELL) / 2, GY + (ROWS * CELL) / 2, COLS * CELL, ROWS * CELL).setInteractive({ useHandCursor: true });
    this.zone.on('pointerdown', (p) => {
      if (this.state !== 'play') return;
      this.painting = true;
      this.paintAt(p.worldX, p.worldY, true);
    });
    this.input.on('pointermove', (p) => this.painting && p.isDown && this.paintAt(p.worldX, p.worldY, false));
    this.input.on('pointerup', () => (this.painting = false));

    // the crayon box
    const bx = BOX.x, by = BOX.y;
    const bg = roundBox(this, bx, by, 440, 210, { fill: COLORS.panel, radius: 18, stroke: COLORS.stroke, strokeWidth: 3 });
    txt(this, bx + 220, by + 16, this.T('crayonsLabel', 'Crayons'), { size: 19, weight: 800, color: CSS.yellow, origin: [0.5, 0], scale: false });
    this.crayonBtns = CRAYONS.map((col, i) => {
      const x = bx + 50 + i * 68, y = by + 110;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      // a crayon: a pointed stick of colour with a paper wrapper
      g.fillStyle(col, 1);
      g.fillTriangle(-14, -40, 14, -40, 0, -66);
      g.fillRoundedRect(-14, -42, 28, 82, 4);
      g.fillStyle(0xffffff, 0.85);
      g.fillRect(-14, -14, 28, 30);
      const n = txt(this, 0, 1, String(i + 1), { size: 18, weight: 800, color: '#070b1d', origin: 0.5, scale: false });
      const ring = this.add.graphics();
      c.add([ring, g, n]);
      c.setSize(56, 120);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', () => this.pick(i));
      c.activate = () => this.pick(i);
      c.ring = ring;
      this.focus.add(c);
      return c;
    });
    txt(this, bx + 220, by + 186, this.T('keyLabel', '1 = darkest    6 = brightest'), { size: 15, weight: 700, color: CSS.dim, origin: 0.5, scale: false });
    this.info = new InfoPanel(this, bx, 404, 440, 196, { title: this.T('infoTitle', ''), text: this.T('infoText', ''), size: 17 });
    txt(this, bx, 620, this.T('progressLabel', 'Coloured in'), { size: 17, weight: 800, color: CSS.cyan, scale: false });
    this.bar = new ProgressBar(this, bx, 648, 440, 16, { color: COLORS.orange });
    this.goal = new GoalBar(this);

    if (this.input.keyboard) {
      for (let i = 0; i < 6; i++) this.input.keyboard.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'][i]}`, () => this.pick(i));
      const move = (dc, dr) => {
        if (this.state !== 'play') return;
        this.cursor.c = clamp(this.cursor.c + dc, 0, COLS - 1);
        this.cursor.r = clamp(this.cursor.r + dr, 0, ROWS - 1);
        this.drawCursor();
      };
      this.input.keyboard.on('keydown-LEFT', () => move(-1, 0));
      this.input.keyboard.on('keydown-RIGHT', () => move(1, 0));
      this.input.keyboard.on('keydown-UP', () => move(0, -1));
      this.input.keyboard.on('keydown-DOWN', () => move(0, 1));
      this.input.keyboard.on('keydown-SPACE', () => {
        const cell = this.cellAt(this.cursor.c, this.cursor.r);
        if (cell && this.state === 'play') this.paintAt(cell.x, cell.y, true);
      });
    }
    this.pick(0, false);
    // stuck? point at a square the chosen crayon can colour (or at the next crayon)
    idleHint(this, () => {
      if (this.state !== 'play') return null;
      const cell = this.cells.find((k) => !k.done && k.n === this.crayon + 1);
      if (cell) return { x: cell.x, y: cell.y - CELL / 2 };
      const left = this.cells.find((k) => !k.done);
      const b = left && this.crayonBtns[left.n - 1];
      return b ? { x: b.x, y: b.y - 80 } : null;
    }, { delay: 7000 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'play';
      this.goal.set(this.T('task', { title: 'Colour the picture!', help: 'Pick a crayon. Its squares light up: colour them in!' }), { count: '0%' });
    });
  }

  cellAt(c, r) {
    return this.cells[c * ROWS + r];
  }

  pick(i, sound = true) {
    this.crayon = i;
    this.crayonBtns.forEach((b, k) => {
      b.ring.clear();
      if (k === i) {
        b.ring.fillStyle(COLORS.yellow, 0.25);
        b.ring.fillRoundedRect(-28, -74, 56, 124, 12);
        b.ring.lineStyle(3, COLORS.yellow, 1);
        b.ring.strokeRoundedRect(-28, -74, 56, 124, 12);
      }
      this.tweens.add({ targets: b, y: k === i ? BOX.y + 110 - 16 : BOX.y + 110, duration: 150 });
    });
    // the squares that need this crayon light up; the others fade
    this.cells.forEach((cell) => {
      if (cell.done) return;
      const mine = cell.n === i + 1;
      cell.t.setColor(mine ? '#c2410c' : '#b9b3a6').setScale(mine ? 1.15 : 1);
    });
    if (sound) Sfx.play('select');
  }

  drawCursor() {
    const g = this.cursorG;
    g.clear();
    const cell = this.cellAt(this.cursor.c, this.cursor.r);
    if (!cell) return;
    g.lineStyle(3, COLORS.cyan, 1);
    g.strokeRect(cell.x - CELL / 2, cell.y - CELL / 2, CELL, CELL);
  }

  // colour the square under (x, y) and its neighbours, if they have the crayon's number
  paintAt(x, y, isTap) {
    const c = Math.floor((x - GX) / CELL), r = Math.floor((y - GY) / CELL);
    const here = this.cellAt(c, r);
    if (!here || c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
    const want = this.crayon + 1;
    let n = 0;
    for (let dc = -1; dc <= 1; dc++) {
      for (let dr = -1; dr <= 1; dr++) {
        // the square itself and all eight around it (a fat crayon)
        const cell = c + dc >= 0 && c + dc < COLS ? this.cellAt(c + dc, r + dr) : null;
        if (!cell || cell.done || cell.r !== r + dr || cell.n !== want) continue;
        this.fill(cell);
        n++;
      }
    }
    if (n) {
      Sfx.play('tick');
      this.bar.set(this.painted / this.total);
      this.goal.setCount(`${Math.round((this.painted / this.total) * 100)}%`);
      // halfway there: a fact about pixels
      if (!this.halfSaid && this.painted >= this.total / 2) {
        this.halfSaid = true;
        Speech.say(this.T('infoText', ''));
      }
      if (this.painted >= this.total) this.win();
    } else if (isTap && !here.done && here.n !== want) {
      // a tap on a square that needs another crayon (only counted once per square)
      const k = c * ROWS + r;
      if (this.lastWrong !== k) {
        this.lastWrong = k;
        this.mistakes++;
      }
      Sfx.play('error');
      shake(this, here.t, 4);
      toast(this, this.T('wrongSquare', 'That square needs a different crayon. Look at its number!'), { y: 664, color: COLORS.orange, sound: false, speak: true, duration: 1800 });
    }
  }

  fill(cell) {
    cell.done = true;
    this.painted++;
    cell.t.setVisible(false);
    const g = this.paint;
    const col = CRAYONS[cell.n - 1];
    g.fillStyle(col, 1);
    g.fillRect(cell.x - CELL / 2 + 1, cell.y - CELL / 2, CELL - 2, CELL);
    // crayon strokes
    g.lineStyle(2, Phaser.Display.Color.IntegerToColor(col).darken(12).color, 0.5);
    for (let k = 0; k < 4; k++) {
      const yy = cell.y - CELL / 2 + 5 + k * 8;
      g.lineBetween(cell.x - CELL / 2 + 4, yy + 3, cell.x + CELL / 2 - 4, yy);
    }
  }

  async win() {
    this.state = 'won';
    this.painting = false;
    this.cursorG.clear();
    Sfx.play('bigSuccess');
    this.info.show(this.T('doneTitle', 'You did it!'), this.T('doneText', ''));
    await new Promise((r) => this.time.delayedCall(1200, r));
    if (this._leaving) return;
    // the real hand-coloured picture, framed at JPL
    this.photo = showPhoto(this, this.T('photo', null), 120, 296, 560, 330);
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
