import { COLORS, CSS, DEPTH } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { playIntro, finishGame, draggable } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { drawPanel, toast, shake } from '../../ui/widgets.js';

// Fixing Voyager 1 from far away (2024): one memory chip broke. Move the pieces of code that
// sit on the broken (red) cells into empty, healthy memory. Each move is a radio message that
// takes almost a day to arrive, so fewer moves is better.
const COLS = 10, ROWS = 6, CELL = 58;
const GX = 120, GY = 170;
const BROKEN = [[3, 2], [4, 2], [5, 2], [3, 3], [4, 3], [5, 3]];
const BLOCKS = [
  { id: 'A', len: 3, c: 2, r: 2, label: 'NAV', color: 0x4fd1ff },
  { id: 'B', len: 2, c: 4, r: 3, label: 'LOG', color: 0xffd166 },
  { id: 'H', len: 2, c: 2, r: 3, label: 'CMD', color: 0xff9f43 },
  { id: 'C', len: 4, c: 1, r: 0, label: 'TELEMETRY', color: 0x3ddc97 },
  { id: 'D', len: 2, c: 6, r: 1, label: 'MAG', color: 0xa78bfa },
  { id: 'E', len: 3, c: 0, r: 4, label: 'PLASMA', color: 0xff7eb6 },
  { id: 'F', len: 2, c: 5, r: 5, label: 'PWR', color: 0x7fc4ff },
  { id: 'G', len: 2, c: 7, r: 3, label: 'SCI', color: 0xb6ffda }
];
const isBroken = (c, r) => BROKEN.some(([bc, br]) => bc === c && br === r);

export class MemoryFixScene extends BaseScene {
  constructor() {
    super('MemoryFix');
  }

  create() {
    this.setupStage();
    blueprint(this);
    this.state = 'intro';
    this.moves = 0;
    this.selected = null;

    // the memory grid
    const g = this.add.graphics();
    drawPanel(g, GX - 24, GY - 60, COLS * CELL + 48, ROWS * CELL + 84, { fill: 0x0b1230, radius: 18, stroke: COLORS.cyan, strokeWidth: 3 });
    txt(this, GX, GY - 44, this.T('memoryTitle', "Voyager 1's memory"), { size: 18, weight: 800, color: CSS.yellow, scale: false });
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const x = GX + c * CELL, y = GY + r * CELL;
        const bad = isBroken(c, r);
        g.fillStyle(bad ? 0x5a1d24 : 0x16204a, 1);
        g.fillRoundedRect(x + 3, y + 3, CELL - 6, CELL - 6, 6);
        if (bad) {
          g.lineStyle(2, COLORS.red, 0.9);
          g.lineBetween(x + 12, y + 10, x + CELL / 2, y + CELL / 2);
          g.lineBetween(x + CELL / 2, y + CELL / 2, x + CELL - 16, y + CELL - 12);
        }
      }
    }
    txt(this, GX + 4.5 * CELL, GY + 4 * CELL + 2, this.T('brokenLabel', 'Broken chip'), { size: 13, weight: 800, color: '#ff8080', origin: [0.5, 0], scale: false });
    // tapping an empty cell moves the selected piece there
    this.gridZone = this.add.zone(GX + (COLS * CELL) / 2, GY + (ROWS * CELL) / 2, COLS * CELL, ROWS * CELL).setInteractive();
    this.gridZone.on('pointerup', (p) => {
      if (!this.selected || this.state !== 'play') return;
      const c = Math.floor((p.worldX - GX) / CELL), r = Math.floor((p.worldY - GY) / CELL);
      this.tryMove(this.selected, c, r);
    });

    // the pieces of code
    this.blocks = BLOCKS.map((b) => this.makeBlock({ ...b }));

    // Earth, Voyager and the messages between them
    const sg = this.add.graphics();
    drawPanel(sg, 800, 110, 450, 300, { fill: COLORS.panel, radius: 18, stroke: COLORS.stroke });
    this.earthIcon = img(this, 850, 340, 'earthSmall', 0.5);
    this.voyIcon = img(this, 1190, 180, 'voyager', 0.32);
    this.link = this.add.graphics();
    this.link.lineStyle(2, COLORS.cyan, 0.4);
    for (let t = 0; t < 1; t += 0.04) this.link.lineBetween(850 + t * 340, 340 - t * 160, 850 + (t + 0.02) * 340, 340 - (t + 0.02) * 160);
    this.signal = this.add.circle(850, 340, 7, COLORS.yellow).setVisible(false);
    this.counter = txt(this, 820, 430, '', { size: 18, weight: 700, scale: false, lineSpacing: 8 });
    this.status = txt(this, 1025, 130, '', { size: 16, weight: 700, color: CSS.cyan, origin: [0.5, 0], align: 'center', wrap: 420, scale: false });
    this.sendBtn = new Button(this, 1025, 620, { width: 380, height: 70, size: 24, label: this.T('sendLabel', 'Send to Voyager'), icon: 'next', variant: 'success', onClick: () => this.send() });
    this.updateUi();
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  makeBlock(b) {
    const w = b.len * CELL - 8, h = CELL - 10;
    const c = this.add.container(0, 0).setDepth(DEPTH.ui - 5);
    const g = this.add.graphics();
    const draw = (sel) => {
      g.clear();
      g.fillStyle(b.color, 0.92);
      g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
      g.lineStyle(sel ? 4 : 2, sel ? 0xffffff : 0x070b1d, 1);
      g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
    };
    draw(false);
    const t = txt(this, 0, 0, b.label, { size: 16, weight: 800, color: '#070b1d', origin: 0.5, scale: false });
    c.add([g, t]);
    c.setSize(w, h);
    b.box = c;
    b.draw = draw;
    this.place(b, b.c, b.r);
    draggable(this, c, {
      onDrop: () => {
        const col = Math.round((c.x - w / 2 - 4 - GX) / CELL), row = Math.round((c.y - h / 2 - 5 - GY) / CELL);
        return this.tryMove(b, col, row);
      },
      onTap: () => this.select(b)
    });
    return b;
  }

  place(b, col, row) {
    b.c = col;
    b.r = row;
    const x = GX + col * CELL + (b.len * CELL) / 2, y = GY + row * CELL + CELL / 2;
    b.box.home = { x, y };
    this.tweens.add({ targets: b.box, x, y, duration: 180 });
  }

  fits(b, col, row) {
    if (row < 0 || row >= ROWS || col < 0 || col + b.len > COLS) return false;
    for (let k = 0; k < b.len; k++) {
      if (isBroken(col + k, row)) return false;
      if (this.blocks.some((o) => o !== b && o.r === row && col + k >= o.c && col + k < o.c + o.len)) return false;
    }
    return true;
  }

  onBroken(b) {
    for (let k = 0; k < b.len; k++) if (isBroken(b.c + k, b.r)) return true;
    return false;
  }

  select(b) {
    if (this.state !== 'play') return;
    this.blocks.forEach((o) => o.draw(false));
    this.selected = b;
    b.draw(true);
    Sfx.play('select');
  }

  tryMove(b, col, row) {
    if (this.state !== 'play') return false;
    if (col === b.c && row === b.r) return false;
    if (!this.fits(b, col, row)) {
      Sfx.play('error');
      shake(this, b.box, 6);
      toast(this, this.T('blocked', ''), { y: 100, color: COLORS.orange, sound: false, duration: 2000 });
      return false;
    }
    this.place(b, col, row);
    this.moves++;
    Sfx.play('snap');
    b.draw(false);
    this.selected = null;
    this.updateUi();
    return true;
  }

  updateUi() {
    const bad = this.blocks.filter((b) => this.onBroken(b));
    this.blocks.forEach((b) => b.box.setAlpha(this.onBroken(b) ? 1 : 0.9));
    this.counter.setText(`${this.T('movesLabel', 'Messages sent')}: ${this.moves}\n${this.T('daysLabel', 'Days waiting')}: ${this.moves * 2}`);
    this.sendBtn.setEnabled(bad.length === 0 && this.state !== 'sending');
    if (!bad.length) this.sendBtn.pulse();
    else this.sendBtn.stopPulse();
  }

  async send() {
    if (this.state !== 'play') return;
    if (this.blocks.some((b) => this.onBroken(b))) {
      Speech.say(this.T('stillBroken', ''));
      return;
    }
    this.state = 'sending';
    this.sendBtn.setEnabled(false).stopPulse();
    this.status.setText(this.T('sending', ''));
    Speech.say(this.T('sending', ''));
    Sfx.play('radio');
    // the message flies out to Voyager, and the answer comes back
    const fly = (from, to) =>
      new Promise((r) => {
        this.signal.setVisible(true).setPosition(from.x, from.y);
        this.tweens.add({ targets: this.signal, x: to.x, y: to.y, duration: 1800, ease: 'Sine.easeInOut', onComplete: r });
      });
    await fly(this.earthIcon, this.voyIcon);
    Sfx.play('beep');
    await fly(this.voyIcon, this.earthIcon);
    if (this._leaving) return;
    this.signal.setVisible(false);
    Sfx.play('bigSuccess');
    this.status.setText('');
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    finishGame(this, { stars: this.moves <= 3 ? 3 : this.moves <= 5 ? 2 : 1 });
  }
}
