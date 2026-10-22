import { COLORS, CSS } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { drawPanel, toast, floatText } from '../../ui/widgets.js';

// Driving Sojourner (1997). Radio messages took about ten minutes to reach Mars, so nobody
// could steer it live: the team planned a list of moves, sent it, and waited to see what
// happened. Build a program to reach each named rock and study it.
// S = Sojourner and the lander, # = a rock too big to drive over, A/B = rocks to study
const LEVELS = [
  ['.........', '.....A...', 'S........', '...#.....', '.........'],
  ['.........', '...#.....', 'S..#..A..', '...#.....', '.........'],
  ['..A......', '.........', 'S.#...#..', '......#B.', '.........']
];
const COLS = 9, ROWS = 5, CELL = 70;
const GX = 46, GY = 176;
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1]; // east, south, west, north
const SLOTS = 14;
const CMDS = [
  { id: 'F', icon: 'up' },
  { id: 'L', icon: 'left' },
  { id: 'R', icon: 'right' },
  { id: 'S', icon: 'info' }
];

export class RoverProgramScene extends BaseScene {
  constructor() {
    super('RoverProgram');
  }

  create() {
    this.setupStage({ bg: 0x1a0e0a });
    this.state = 'intro';
    this.level = 0;
    this.sols = 0;
    this.hazards = 0;
    this.program = [];
    this.levelCfg = this.T('levels', []);

    // the map
    this.mapG = this.add.graphics();
    this.mapLayer = this.add.container(0, 0);
    this.rover = img(this, 0, 0, 'sojournerTop', 0.95).setDepth(5);
    this.title = txt(this, GX, 106, '', { size: 22, weight: 800, color: CSS.yellow, scale: false });
    this.sub = txt(this, GX, 136, '', { size: 17, weight: 700, color: CSS.dim, scale: false, wrap: COLS * CELL });

    // the program panel
    const px = 700, pw = 540;
    const pg = this.add.graphics();
    drawPanel(pg, px, 96, pw, 470, { fill: COLORS.panel, radius: 18, stroke: COLORS.stroke, strokeWidth: 3 });
    txt(this, px + 24, 112, this.T('commandsLabel', 'Moves'), { size: 18, weight: 800, color: CSS.cyan, scale: false });
    const names = this.T('cmdNames', {});
    CMDS.forEach((c, i) => {
      const b = new Button(this, px + 82 + i * 126, 180, { width: 112, height: 64, size: 17, icon: c.icon, label: names[c.id] || c.id, variant: c.id === 'S' ? 'warn' : 'primary', onClick: () => this.addCmd(c.id) });
      b.cmd = c.id;
    });
    txt(this, px + 24, 228, this.T('programLabel', 'Your program'), { size: 18, weight: 800, color: CSS.cyan, scale: false });
    this.slotG = this.add.graphics();
    this.slotIcons = this.add.container(0, 0);
    this.slotPos = [];
    for (let i = 0; i < SLOTS; i++) this.slotPos.push({ x: px + 50 + (i % 7) * 70, y: 290 + Math.floor(i / 7) * 74 });
    this.undoBtn = new Button(this, px + 110, 470, { width: 180, height: 60, size: 20, icon: 'back', label: this.T('undoLabel', 'Undo'), variant: 'secondary', onClick: () => this.undo() });
    this.clearBtn = new Button(this, px + 300, 470, { width: 170, height: 60, size: 20, icon: 'close', label: this.T('clearLabel', 'Clear'), variant: 'secondary', onClick: () => this.clear() });
    this.sendBtn = new Button(this, px + 270, 630, { width: 420, height: 76, size: 26, icon: 'next', label: this.T('sendLabel', 'Send to Mars'), variant: 'success', onClick: () => this.send() });
    this.solText = txt(this, GX, 560, '', { size: 18, weight: 700, color: CSS.text, scale: false });

    // Earth, Mars and the message between them
    this.linkG = this.add.graphics();
    this.linkG.lineStyle(2, COLORS.cyan, 0.35);
    this.linkG.lineBetween(GX + 40, 640, GX + 560, 640);
    img(this, GX + 20, 640, 'earthSmall', 0.32);
    img(this, GX + 590, 640, 'mars', 0.16);
    this.signal = this.add.circle(GX + 40, 640, 7, COLORS.yellow).setVisible(false);
    this.delayText = txt(this, GX + 300, 612, '', { size: 15, weight: 700, color: CSS.cyan, origin: 0.5, scale: false });

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-UP', () => this.addCmd('F'));
      this.input.keyboard.on('keydown-LEFT', () => this.addCmd('L'));
      this.input.keyboard.on('keydown-RIGHT', () => this.addCmd('R'));
      this.input.keyboard.on('keydown-S', () => this.addCmd('S'));
      this.input.keyboard.on('keydown-BACKSPACE', () => this.undo());
    }
    this.loadLevel(0);
    playIntro(this).then((ok) => {
      if (ok) this.startLevel();
    });
  }

  loadLevel(i) {
    this.level = i;
    this.grid = LEVELS[i].map((row) => row.split(''));
    this.rocksDone = {};
    this.mapLayer.removeAll(true);
    const g = this.mapG;
    g.clear();
    drawPanel(g, GX - 10, GY - 10, COLS * CELL + 20, ROWS * CELL + 20, { fill: 0x8a4424, radius: 12, stroke: 0x4a2010, strokeWidth: 3 });
    const names = (this.levelCfg[i] || {}).rocks || {};
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = GX + c * CELL, y = GY + r * CELL;
        g.fillStyle((r + c) % 2 ? 0xc06a3c : 0xb86236, 1);
        g.fillRect(x, y, CELL, CELL);
        const ch = this.grid[r][c];
        if (ch === '#') this.mapLayer.add(img(this, x + CELL / 2, y + CELL / 2 + 6, 'marsRock', 0.75));
        if (ch === 'A' || ch === 'B') {
          const rock = img(this, x + CELL / 2, y + CELL / 2 + 4, 'marsRockLayered', 0.6);
          const label = txt(this, x + CELL / 2, y + 8, names[ch] || ch, { size: 13, weight: 800, color: '#ffffff', origin: [0.5, 0], scale: false, stroke: '#3a1a0a', strokeThickness: 4 });
          const glow = this.add.circle(x + CELL / 2, y + CELL / 2, CELL * 0.45, COLORS.yellow, 0.18);
          this.mapLayer.add([glow, rock, label]);
          this.rocksDone[ch] = { done: false, glow };
        }
        if (ch === 'S') {
          this.start = { c, r };
          this.mapLayer.add(img(this, x + CELL / 2, y + CELL / 2, 'pathfinder', 0.26).setAlpha(0.9));
        }
      }
    }
    g.lineStyle(1, 0x000000, 0.12);
    for (let c = 1; c < COLS; c++) g.lineBetween(GX + c * CELL, GY, GX + c * CELL, GY + ROWS * CELL);
    for (let r = 1; r < ROWS; r++) g.lineBetween(GX, GY + r * CELL, GX + COLS * CELL, GY + r * CELL);
    this.pos = { c: this.start.c, r: this.start.r, h: 0 };
    this.placeRover(true);
    this.program = [];
    this.drawProgram();
    const lc = this.levelCfg[i] || {};
    this.title.setText(lc.title || '');
    this.sub.setText(lc.goal || '');
    this.updateUi();
  }

  async startLevel() {
    const lc = this.levelCfg[this.level] || {};
    if (lc.intro) {
      const r = await this.guide.say(lc.intro, { modal: true, position: 'top' });
      if (r === null || this._leaving) return;
    }
    this.state = 'plan';
    this.updateUi();
  }

  placeRover(instant) {
    const x = GX + this.pos.c * CELL + CELL / 2, y = GY + this.pos.r * CELL + CELL / 2;
    const angle = this.pos.h * 90;
    if (instant) this.rover.setPosition(x, y).setAngle(angle);
    return { x, y, angle };
  }

  addCmd(id) {
    if (this.state !== 'plan') return;
    if (this.program.length >= SLOTS) {
      Sfx.play('error');
      toast(this, this.T('full', 'The program is full. Send it, or undo some moves.'), { y: 100, color: COLORS.orange, sound: false, duration: 1800 });
      return;
    }
    this.program.push(id);
    Sfx.play('click');
    this.drawProgram();
    this.updateUi();
  }

  undo() {
    if (this.state !== 'plan' || !this.program.length) return;
    this.program.pop();
    this.drawProgram();
    this.updateUi();
  }

  clear() {
    if (this.state !== 'plan') return;
    this.program = [];
    this.drawProgram();
    this.updateUi();
  }

  drawProgram(active = -1) {
    const g = this.slotG;
    g.clear();
    this.slotIcons.removeAll(true);
    this.slotPos.forEach((p, i) => {
      const id = this.program[i];
      g.fillStyle(i === active ? COLORS.yellow : id ? (id === 'S' ? COLORS.orange : COLORS.cyan) : 0x0b1230, id ? 1 : 0.8);
      g.fillRoundedRect(p.x - 29, p.y - 29, 58, 58, 10);
      g.lineStyle(2, 0x3a4a92, 1);
      g.strokeRoundedRect(p.x - 29, p.y - 29, 58, 58, 10);
      if (id) {
        const ig = this.add.graphics();
        this.slotIcons.add(ig);
        // the same arrows as on the buttons
        ig.fillStyle(0x070b1d, 1);
        if (id === 'F') ig.fillTriangle(p.x, p.y - 16, p.x - 14, p.y + 8, p.x + 14, p.y + 8);
        if (id === 'L' || id === 'R') {
          // a curved arrow: turning on the spot
          const k = id === 'L' ? -1 : 1;
          ig.lineStyle(5, 0x070b1d, 1);
          ig.beginPath();
          ig.arc(p.x, p.y + 6, 13, k < 0 ? 0 : Math.PI, k < 0 ? -Math.PI : Math.PI * 2, k < 0);
          ig.strokePath();
          ig.fillTriangle(p.x + k * 13 - 8, p.y + 4, p.x + k * 13 + 8, p.y + 4, p.x + k * 13, p.y + 16);
        }
        if (id === 'S') {
          ig.lineStyle(4, 0x070b1d, 1);
          ig.strokeCircle(p.x - 4, p.y - 4, 10);
          ig.lineBetween(p.x + 4, p.y + 4, p.x + 14, p.y + 14);
        }
      }
    });
  }

  updateUi() {
    const plan = this.state === 'plan';
    this.sendBtn.setEnabled(plan && this.program.length > 0);
    this.undoBtn.setEnabled(plan && this.program.length > 0);
    this.clearBtn.setEnabled(plan && this.program.length > 0);
    if (plan && this.program.length) this.sendBtn.pulse();
    else this.sendBtn.stopPulse();
    this.solText.setText(`${this.T('solsLabel', 'Messages sent')}: ${this.sols}`);
  }

  async send() {
    if (this.state !== 'plan' || !this.program.length) return;
    this.state = 'run';
    this.sols++;
    this.updateUi();
    // the message crosses space
    Sfx.play('radio');
    this.delayText.setText(this.T('sending', 'On its way... about 10 minutes to reach Mars'));
    this.signal.setVisible(true).setPosition(GX + 40, 640);
    await new Promise((r) => this.tweens.add({ targets: this.signal, x: GX + 560, duration: 1600, ease: 'Sine.easeInOut', onComplete: r }));
    this.signal.setVisible(false);
    this.delayText.setText('');
    if (this._leaving) return;
    // Sojourner carries out the moves one by one
    let stopped = false;
    for (let i = 0; i < this.program.length; i++) {
      this.drawProgram(i);
      const id = this.program[i];
      const ok = await this.run(id);
      if (this._leaving) return;
      if (!ok) {
        stopped = true;
        break;
      }
    }
    this.program = [];
    this.drawProgram();
    if (Object.values(this.rocksDone).every((d) => d.done)) return this.levelDone();
    if (!stopped) toast(this, this.T('waiting', 'Sojourner waits for its next message.'), { y: 100, sound: false, duration: 2000 });
    this.state = 'plan';
    this.updateUi();
  }

  run(id) {
    return new Promise((resolve) => {
      const p = this.pos;
      if (id === 'L' || id === 'R') {
        p.h = (p.h + (id === 'L' ? 3 : 1)) % 4;
        Sfx.play('tick');
        this.tweens.add({ targets: this.rover, angle: this.rover.angle + (id === 'L' ? -90 : 90), duration: 300, onComplete: () => resolve(true) });
        return;
      }
      if (id === 'F') {
        const c = p.c + DX[p.h], r = p.r + DY[p.h];
        const cell = this.grid[r] && this.grid[r][c];
        if (!cell || cell !== '.' && cell !== 'S') {
          // its hazard sensors spot the rock (or the edge) and it stops itself
          this.hazards++;
          Sfx.play('error');
          this.tweens.add({ targets: this.rover, x: this.rover.x + DX[p.h] * 10, y: this.rover.y + DY[p.h] * 10, duration: 120, yoyo: true });
          toast(this, this.T('hazard', 'Hazard! Sojourner saw a rock in the way and stopped itself.'), { y: 100, color: COLORS.orange, sound: false, speak: true, duration: 2600 });
          this.time.delayedCall(500, () => resolve(false));
          return;
        }
        p.c = c;
        p.r = r;
        const to = this.placeRover(false);
        Sfx.play('softWhoosh');
        this.tweens.add({ targets: this.rover, x: to.x, y: to.y, duration: 380, onComplete: () => resolve(true) });
        return;
      }
      // study the rock in front
      const c = p.c + DX[p.h], r = p.r + DY[p.h];
      const cell = this.grid[r] && this.grid[r][c];
      if (cell === 'A' || cell === 'B') {
        const d = this.rocksDone[cell];
        if (!d.done) {
          d.done = true;
          d.glow.setFillStyle(COLORS.green, 0.35);
          Sfx.play('success');
          floatText(this, GX + c * CELL + CELL / 2, GY + r * CELL, '✓', CSS.green, 34);
          const lc = this.levelCfg[this.level] || {};
          const fact = (lc.facts || {})[cell];
          if (fact) toast(this, fact, { y: 100, sound: false, speak: true, duration: 4200 });
        }
        this.time.delayedCall(700, () => resolve(true));
        return;
      }
      Sfx.play('error');
      toast(this, this.T('nothing', 'Nothing to study here. Face the rock first!'), { y: 100, color: COLORS.orange, sound: false, duration: 2000 });
      this.time.delayedCall(500, () => resolve(true));
    });
  }

  async levelDone() {
    this.state = 'between';
    Sfx.play('bigSuccess');
    await new Promise((r) => this.time.delayedCall(1800, r));
    if (this._leaving) return;
    if (this.level + 1 < LEVELS.length) {
      Speech.stop();
      this.loadLevel(this.level + 1);
      this.startLevel();
      return;
    }
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    // 4 messages is the fewest possible (one per rock, two for the last map)
    const extra = this.sols - 4 + this.hazards;
    finishGame(this, { stars: extra <= 1 ? 3 : extra <= 3 ? 2 : 1 });
  }
}
