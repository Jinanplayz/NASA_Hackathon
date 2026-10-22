import Phaser from 'phaser';
import { W, COLORS, CSS, DEPTH } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { playIntro, finishGame } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { toast } from '../../ui/widgets.js';

// Cable puzzle: turn the pieces so power flows from Aquarius's battery (left) to
// Odyssey's battery (right). Tap a piece to turn it; arrow keys + ENTER work too.
const N = 1, E = 2, S = 4, Wd = 8;
const DIRS = [
  [N, 0, -1, S],
  [E, 1, 0, Wd],
  [S, 0, 1, N],
  [Wd, -1, 0, E]
];
const rot = (m, r) => {
  let v = m;
  for (let k = 0; k < r; k++) v = ((v << 1) | (v >> 3)) & 15;
  return v;
};
const T = 86;

export class PowerUpScene extends BaseScene {
  constructor() {
    super('PowerUp');
  }

  create() {
    this.setupStage();
    blueprint(this);
    this.state = 'intro';
    this.level = 0;
    this.moves = 0;
    this.minMoves = 0;
    this.sizes = this.relaxed ? [[4, 3], [5, 4], [6, 4]] : [[5, 4], [6, 4], [7, 5]];
    this.sizes = this.sizes.slice(0, this.T('levels', 3));
    this.layer = this.add.container(0, 0);
    this.levelText = txt(this, W / 2, 96, '', { size: 22, weight: 800, color: CSS.yellow, origin: 0.5, scale: false });
    this.cursor = this.add.graphics().setDepth(DEPTH.ui);
    this.cur = { c: 0, r: 0 };
    if (this.input.keyboard) {
      const move = (dc, dr) => {
        if (this.state !== 'play') return;
        this.cur.c = Phaser.Math.Clamp(this.cur.c + dc, 0, this.cols - 1);
        this.cur.r = Phaser.Math.Clamp(this.cur.r + dr, 0, this.rows - 1);
        this.showCursor = true;
        this.drawCursor();
      };
      this.input.keyboard.on('keydown-LEFT', () => move(-1, 0));
      this.input.keyboard.on('keydown-RIGHT', () => move(1, 0));
      this.input.keyboard.on('keydown-UP', () => move(0, -1));
      this.input.keyboard.on('keydown-DOWN', () => move(0, 1));
      this.input.keyboard.on('keydown-SPACE', () => this.showCursor && this.turn(this.cur.c, this.cur.r));
      this.input.keyboard.on('keydown-ENTER', () => this.showCursor && this.turn(this.cur.c, this.cur.r));
    }
    this.buildLevel();
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  // a random winding cable route from the left edge to the right edge, then shuffled pieces
  buildLevel() {
    this.layer.removeAll(true);
    const [cols, rows] = this.sizes[this.level];
    this.cols = cols;
    this.rows = rows;
    this.x0 = W / 2 - (cols * T) / 2;
    this.y0 = 150 + ((5 - rows) * T) / 2;
    this.levelText.setText(`${this.T('levelLabel', 'Cable')} ${this.level + 1} / ${this.sizes.length}`);
    this.src = Phaser.Math.Between(0, rows - 1);
    this.dst = Phaser.Math.Between(0, rows - 1);
    const path = this.makePath(cols, rows);
    const masks = Array.from({ length: rows }, () => Array(cols).fill(0));
    path.forEach((p, i) => {
      const prev = path[i - 1], next = path[i + 1];
      const link = (q) => {
        if (!q) return;
        DIRS.forEach(([d, dx, dy]) => {
          if (q.c === p.c + dx && q.r === p.r + dy) masks[p.r][p.c] |= d;
        });
      };
      link(prev);
      link(next);
      if (i === 0) masks[p.r][p.c] |= Wd;
      if (i === path.length - 1) masks[p.r][p.c] |= E;
    });
    const shapes = [N | S, N | E, N | E | S];
    this.tiles = [];
    this.minMoves = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        let m = masks[r][c];
        if (!m) m = shapes[Phaser.Math.Between(0, shapes.length - 1)];
        // shuffle: turn the piece a random number of times
        const turns = Phaser.Math.Between(0, 3);
        const t = { c, r, m: rot(m, turns), onPath: !!masks[r][c], need: (4 - turns) % 4 };
        // straight pieces only need half the turns
        if (t.onPath && (m === (N | S) || m === (E | Wd))) t.need %= 2;
        if (t.onPath) this.minMoves += t.need;
        t.g = this.add.graphics();
        t.zone = this.add.zone(this.x0 + c * T + T / 2, this.y0 + r * T + T / 2, T - 4, T - 4).setInteractive({ useHandCursor: true });
        t.zone.on('pointerup', () => this.turn(c, r));
        this.layer.add([t.g, t.zone]);
        this.tiles.push(t);
      }
    }
    // (never start already solved: give the first piece a turn)
    if (this.minMoves === 0) {
      const t0 = this.tile(0, this.src);
      t0.m = rot(t0.m, 1);
      this.minMoves = 1;
    }
    // the batteries at both ends
    const by = (r) => this.y0 + r * T + T / 2;
    const a = img(this, this.x0 - 70, by(this.src), 'batteryLM', 0.8);
    const b = img(this, this.x0 + cols * T + 70, by(this.dst), 'batteryCM', 0.8);
    const la = txt(this, this.x0 - 70, by(this.src) + 52, this.T('fromLabel', 'Aquarius'), { size: 14, weight: 800, color: '#ffd98a', origin: [0.5, 0], align: 'center', wrap: 120, scale: false });
    const lb = txt(this, this.x0 + cols * T + 70, by(this.dst) + 52, this.T('toLabel', 'Odyssey'), { size: 14, weight: 800, color: '#cfd6e6', origin: [0.5, 0], align: 'center', wrap: 120, scale: false });
    this.ends = this.add.graphics();
    this.layer.add([this.ends, a, b, la, lb]);
    this.cur = { c: 0, r: this.src };
    this.flow();
  }

  makePath(cols, rows) {
    // random walk that always ends on the right edge at the target row, never crossing itself
    for (let attempt = 0; attempt < 200; attempt++) {
      const path = [{ c: 0, r: this.src }];
      const seen = new Set([`0,${this.src}`]);
      let ok = true;
      while (true) {
        const p = path[path.length - 1];
        if (p.c === cols - 1 && p.r === this.dst) break;
        const opts = [];
        DIRS.forEach(([, dx, dy]) => {
          const q = { c: p.c + dx, r: p.r + dy };
          if (q.c < 0 || q.c >= cols || q.r < 0 || q.r >= rows || seen.has(`${q.c},${q.r}`)) return;
          if (dx < 0 && Math.random() < 0.7) return; // mostly heads right
          opts.push(q);
        });
        if (!opts.length) {
          ok = false;
          break;
        }
        const q = opts[Phaser.Math.Between(0, opts.length - 1)];
        path.push(q);
        seen.add(`${q.c},${q.r}`);
        if (path.length > cols * rows) {
          ok = false;
          break;
        }
      }
      if (ok && path.length >= cols + 1) return path;
    }
    // fallback: straight across, then down/up at the end
    const path = [];
    for (let c = 0; c < cols; c++) path.push({ c, r: this.src });
    const step = this.dst > this.src ? 1 : -1;
    for (let r = this.src + step; this.dst !== this.src && r !== this.dst + step; r += step) path.push({ c: cols - 1, r });
    return path;
  }

  tile(c, r) {
    return this.tiles[r * this.cols + c];
  }

  turn(c, r) {
    if (this.state !== 'play') return;
    const t = this.tile(c, r);
    if (!t) return;
    t.m = rot(t.m, 1);
    this.moves++;
    this.cur = { c, r };
    Sfx.play('switch');
    this.flow();
  }

  // power spreads from Aquarius's battery through every connected piece
  flow() {
    const powered = new Set();
    const start = this.tile(0, this.src);
    if (start && start.m & Wd) {
      const queue = [start];
      powered.add(start);
      while (queue.length) {
        const t = queue.shift();
        DIRS.forEach(([d, dx, dy, back]) => {
          if (!(t.m & d)) return;
          const q = this.tile(t.c + dx, t.r + dy);
          if (!q || t.c + dx < 0 || t.c + dx >= this.cols || powered.has(q) || !(q.m & back)) return;
          powered.add(q);
          queue.push(q);
        });
      }
    }
    const end = this.tile(this.cols - 1, this.dst);
    const solved = powered.has(end) && end.m & E;
    this.tiles.forEach((t) => this.drawTile(t, powered.has(t)));
    // the cables to the batteries
    const g = this.ends;
    g.clear();
    const by = (r) => this.y0 + r * T + T / 2;
    g.lineStyle(10, powered.size ? COLORS.cyan : 0x4a5578, 1);
    g.lineBetween(this.x0 - 40, by(this.src), this.x0, by(this.src));
    g.lineStyle(10, solved ? COLORS.cyan : 0x4a5578, 1);
    g.lineBetween(this.x0 + this.cols * T, by(this.dst), this.x0 + this.cols * T + 40, by(this.dst));
    this.drawCursor();
    if (solved && this.state === 'play') this.levelDone();
  }

  drawTile(t, on) {
    const g = t.g;
    const x = this.x0 + t.c * T, y = this.y0 + t.r * T, cx = x + T / 2, cy = y + T / 2;
    g.clear();
    g.fillStyle(0x0d1430, 1);
    g.fillRoundedRect(x + 3, y + 3, T - 6, T - 6, 12);
    g.lineStyle(2, 0x2e3f85, 1);
    g.strokeRoundedRect(x + 3, y + 3, T - 6, T - 6, 12);
    const col = on ? COLORS.cyan : 0x6b7290;
    if (on) {
      g.lineStyle(20, COLORS.cyan, 0.18);
      DIRS.forEach(([d, dx, dy]) => t.m & d && g.lineBetween(cx, cy, cx + (dx * T) / 2, cy + (dy * T) / 2));
    }
    g.lineStyle(11, col, 1);
    DIRS.forEach(([d, dx, dy]) => t.m & d && g.lineBetween(cx, cy, cx + (dx * T) / 2, cy + (dy * T) / 2));
    g.fillStyle(col, 1);
    g.fillCircle(cx, cy, 9);
  }

  drawCursor() {
    this.cursor.clear();
    if (!this.showCursor || this.state !== 'play') return;
    this.cursor.lineStyle(4, COLORS.yellow, 1);
    this.cursor.strokeRoundedRect(this.x0 + this.cur.c * T, this.y0 + this.cur.r * T, T, T, 14);
  }

  levelDone() {
    this.state = 'between';
    Sfx.play('powerUp');
    this.time.delayedCall(250, () => Sfx.play('success'));
    this.level++;
    if (this.level >= this.sizes.length) return this.win();
    toast(this, this.T('levelDone', 'Connected!'), { y: 660, speak: true, duration: 2200 });
    this.time.delayedCall(1700, () => {
      if (this._leaving) return;
      this.buildLevel();
      this.state = 'play';
    });
  }

  async win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    const r = await this.guide.say(this.T('fact', ''), { modal: true, position: 'top' });
    if (r === null) return;
    const extra = this.moves - this.minMoves;
    finishGame(this, { stars: extra <= 8 ? 3 : extra <= 20 ? 2 : 1 });
  }
}
