import Phaser from 'phaser';
import { H, COLORS, CSS, TEX } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { txt, fitText } from '../../ui/text.js';
import { toast, floatText, roundBox, RoundBox } from '../../ui/widgets.js';
import { drawIcon } from '../../ui/icons.js';

// Connect the teams behind Apollo 11 the way messages really travelled.
const NW = 196, NH = 84;
const CLX = 922, CLY = 84, CLW = 334, CLH = 616;

const hexColor = (s) => Phaser.Display.Color.HexStringToColor(s || '#4fd1ff').color;
const keyOf = (a, b) => [a, b].sort().join('|');

const TMP = new Phaser.Math.Vector2();

export class WiringScene extends BaseScene {
  constructor() {
    super('Wiring');
  }

  create() {
    this.setupStage();
    // (Phaser reuses this screen when it is played again: start from a clean slate)
    this.dragFrom = null;
    this.dragging = false;
    starfield(this, { count: 120 });
    this.nodesCfg = this.T('nodes', []);
    this.links = this.T('links', []);
    this.wrongs = this.T('wrong', []);
    this.connected = new Set();
    this.wires = [];
    this.selected = null;

    // world map-ish grid
    const bg = this.add.graphics();
    bg.lineStyle(1, 0x2a4a9a, 0.2);
    for (let x = 20; x < CLX - 10; x += 40) bg.lineBetween(x, 80, x, H - 10);
    for (let y = 80; y < H; y += 40) bg.lineBetween(20, y, CLX - 20, y);

    this.wireLayer = this.add.graphics().setDepth(5);
    this.dragLine = this.add.graphics().setDepth(6);
    this.pulseLayer = this.add.graphics().setDepth(7);
    this.nodes = {};
    this.nodesCfg.forEach((n) => (this.nodes[n.id] = this.makeNode(n)));

    // clue list
    const cg = roundBox(this, CLX, CLY, CLW, CLH, { fill: 0x0e1840, radius: 20, stroke: COLORS.cyan });
    txt(this, CLX + 20, CLY + 16, this.T('cluesTitle', 'Clues'), { size: 22, weight: 800, color: CSS.yellow, scale: false });
    this.clueRows = this.links.map((l, i) => {
      const y = CLY + 56 + i * 68;
      const box = this.add.graphics();
      const t = txt(this, CLX + 50, y, l.clue, { size: 15, wrap: CLW - 66, scale: false, lineSpacing: 2 });
      fitText(t, CLW - 66, 62, 11);
      return { l, box, t, y };
    });
    this.drawClues();

    this.input.on('pointermove', (p) => this.onMove(p));
    this.input.on('pointerup', (p) => this.onUp(p));
    this.guide.sequence(this.T('intro', []), { modal: true, width: 740 });
  }

  makeNode(n) {
    const c = this.add.container(n.x, n.y).setDepth(10);
    const g = new RoundBox(this);
    c.add(g);
    const col = hexColor(n.color);
    // icon
    const ix = -NW / 2 + 38;
    const iconBg = this.add.graphics();
    iconBg.fillStyle(0x070b1d, 1);
    iconBg.fillCircle(ix, 0, 28);
    iconBg.lineStyle(2, col, 1);
    iconBg.strokeCircle(ix, 0, 28);
    c.add(iconBg);
    c.add(this.nodeIcon(n.icon, ix, 0, col));
    const name = txt(this, -NW / 2 + 76, -16, n.name, { size: 16, weight: 800, scale: false, wrap: NW - 84 });
    fitText(name, NW - 84, 40, 11);
    name.setY(-6 - name.height / 2 + 2);
    const dept = txt(this, -NW / 2 + 76, name.y + name.height + 2, n.dept, { size: 13, color: CSS.dim, scale: false, wrap: NW - 84 });
    fitText(dept, NW - 84, 18, 10);
    c.add([name, dept]);
    c.setSize(NW, NH).setInteractive({ useHandCursor: true });
    Object.assign(c, { cfg: n, g, col, enabled: true, activate: () => this.tapNode(c) });
    c.on('pointerdown', (p) => {
      this.dragFrom = c;
      this.dragStart = { x: p.worldX, y: p.worldY };
    });
    this.focus.add(c);
    this.drawNode(c);
    return c;
  }

  nodeIcon(kind, x, y, col) {
    const imgFor = (key, s) => this.add.image(x, y, key).setScale(s / TEX);
    switch (kind) {
      case 'cm':
        return imgFor('cm', 0.62);
      case 'dish':
        return imgFor('card_dishAntenna', 0.42);
      case 'rocket':
        return imgFor('card_saturnV', 0.46);
      case 'gear':
        return imgFor('sys_guidance', 0.5);
      case 'flag':
        return imgFor('flag', 0.45);
      case 'ship':
        return imgFor('hornet', 0.14);
      default: {
        const g = this.add.graphics();
        if (kind === 'control') {
          g.fillStyle(0x3a3f4b, 1);
          g.fillRoundedRect(x - 18, y - 13, 36, 24, 4);
          g.fillStyle(0x0b2b20, 1);
          g.fillRect(x - 14, y - 10, 28, 17);
          g.lineStyle(2, COLORS.green, 1);
          g.lineBetween(x - 12, y, x - 4, y - 5);
          g.lineBetween(x - 4, y - 5, x + 4, y + 2);
          g.lineBetween(x + 4, y + 2, x + 12, y - 6);
          g.fillStyle(0x6b7385, 1);
          g.fillRect(x - 6, y + 11, 12, 6);
        } else if (kind === 'building') {
          g.fillStyle(0xe8ecf3, 1);
          g.fillTriangle(x - 20, y - 6, x + 20, y - 6, x, y - 18);
          for (let k = -2; k <= 2; k++) g.fillRect(x + k * 8 - 2, y - 5, 4, 18);
          g.fillRect(x - 20, y + 13, 40, 4);
        } else if (kind === 'tv') {
          g.fillStyle(0x6b4a2f, 1);
          g.fillRoundedRect(x - 18, y - 13, 36, 27, 5);
          g.fillStyle(0x9fd8ff, 1);
          g.fillRoundedRect(x - 14, y - 9, 22, 19, 4);
          g.lineStyle(2, 0x9aa1ae, 1);
          g.lineBetween(x - 4, y - 13, x - 12, y - 21);
          g.lineBetween(x + 4, y - 13, x + 12, y - 21);
        }
        return g;
      }
    }
  }

  drawNode(c, state = '') {
    const g = c.g;
    g.draw(-NW / 2, -NH / 2, NW, NH, {
      fill: state === 'sel' ? 0x22306b : COLORS.panel,
      alpha: 1,
      radius: 16,
      stroke: state === 'sel' ? COLORS.yellow : state === 'bad' ? COLORS.red : c.col,
      strokeWidth: state ? 4 : 3,
      shadowAlpha: 0.35,
      shadowY: 4
    });
  }

  drawClues() {
    const firstOpen = this.links.find((l) => !this.connected.has(keyOf(l.a, l.b)));
    this.clueRows.forEach((r) => {
      const done = this.connected.has(keyOf(r.l.a, r.l.b));
      const cur = r.l === firstOpen;
      r.box.clear();
      if (cur) {
        r.box.fillStyle(0x22306b, 1);
        r.box.fillRoundedRect(CLX + 10, r.y - 6, CLW - 20, 62, 12);
      }
      r.box.fillStyle(done ? COLORS.green : 0x1b275a, 1);
      r.box.fillCircle(CLX + 30, r.y + 12, 12);
      if (done) drawIcon(r.box, 'check', CLX + 30, r.y + 12, 16, COLORS.bg);
      r.t.setColor(done ? CSS.green : cur ? CSS.text : CSS.dim);
    });
  }

  nodeAt(x, y) {
    return Object.values(this.nodes).find((n) => Math.abs(n.x - x) < NW / 2 && Math.abs(n.y - y) < NH / 2);
  }

  onMove(p) {
    this.dragLine.clear();
    if (!this.dragFrom || !p.isDown) return;
    const d = Phaser.Math.Distance.Between(p.worldX, p.worldY, this.dragStart.x, this.dragStart.y);
    if (d < 10) return;
    this.dragging = true;
    this.dragLine.lineStyle(5, COLORS.yellow, 0.9);
    this.drawCurve(this.dragLine, this.dragFrom.x, this.dragFrom.y, p.worldX, p.worldY);
    const over = this.nodeAt(p.worldX, p.worldY);
    Object.values(this.nodes).forEach((n) => this.drawNode(n, n === over && n !== this.dragFrom ? 'sel' : n === this.selected ? 'sel' : ''));
  }

  onUp(p) {
    this.dragLine.clear();
    const from = this.dragFrom;
    this.dragFrom = null;
    if (!from) return;
    const to = this.nodeAt(p.worldX, p.worldY);
    if (this.dragging) {
      this.dragging = false;
      Object.values(this.nodes).forEach((n) => this.drawNode(n));
      if (to && to !== from) this.tryConnect(from, to);
      return;
    }
    if (to === from) this.tapNode(from);
  }

  tapNode(c) {
    if (this.guide.visible && this.guide.opts && this.guide.opts.modal) return;
    if (!this.selected) {
      this.selected = c;
      Sfx.play('select');
      this.drawNode(c, 'sel');
    } else if (this.selected === c) {
      this.selected = null;
      this.drawNode(c);
    } else {
      const a = this.selected;
      this.selected = null;
      this.drawNode(a);
      this.tryConnect(a, c);
    }
  }

  tryConnect(a, b) {
    const k = keyOf(a.cfg.id, b.cfg.id);
    if (this.connected.has(k)) return;
    const link = this.links.find((l) => keyOf(l.a, l.b) === k);
    if (link) {
      this.connected.add(k);
      // the boxes never move, so each wire's curve is worked out once
      this.wires.push({ a, b, col: a.cfg.id === 'mission' ? b.col : a.col, t: 0, curve: this.curvePoints(a.x, a.y, b.x, b.y) });
      Sfx.play('powerUp');
      this.time.delayedCall(150, () => Sfx.play('success'));
      floatText(this, (a.x + b.x) / 2, (a.y + b.y) / 2 - 20, Content.ui('connected', 'Connected!'), CSS.green, 22);
      Speech.say(link.clue);
      this.redrawWires();
      this.drawClues();
      if (this.connected.size >= this.links.length) this.time.delayedCall(900, () => this.finish());
    } else {
      Sfx.play('error');
      const w = this.wrongs.find((x) => keyOf(x.a, x.b) === k);
      const msg = w ? w.why : this.T('genericWrong', "These two didn't talk directly.");
      [a, b].forEach((n) => {
        this.drawNode(n, 'bad');
        this.time.delayedCall(700, () => this.drawNode(n));
      });
      const flash = this.add.graphics().setDepth(6);
      flash.lineStyle(5, COLORS.red, 0.9);
      this.drawCurve(flash, a.x, a.y, b.x, b.y);
      this.tweens.add({ targets: flash, alpha: 0, duration: 700, onComplete: () => flash.destroy() });
      toast(this, msg, { y: 652, x: 460, color: COLORS.orange, duration: 4200, sound: false, speak: true, wrap: 760 });
    }
  }

  curvePoints(x1, y1, x2, y2) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.max(1, Math.hypot(dx, dy));
    const bend = Math.min(60, len * 0.18);
    const c = new Phaser.Math.Vector2(mx - (dy / len) * bend, my + (dx / len) * bend);
    return new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(x1, y1), c, new Phaser.Math.Vector2(x2, y2));
  }

  drawCurve(g, x1, y1, x2, y2) {
    const curve = this.curvePoints(x1, y1, x2, y2);
    g.strokePoints(curve.getPoints(24), false);
  }

  redrawWires() {
    const g = this.wireLayer;
    g.clear();
    this.wires.forEach((w) => {
      const pts = w.curve.getPoints(24);
      g.lineStyle(9, 0x000000, 0.4);
      g.strokePoints(pts, false);
      g.lineStyle(5, w.col, 1);
      g.strokePoints(pts, false);
    });
  }

  update(time, delta) {
    // data pulses travelling along each connected wire
    const g = this.pulseLayer;
    g.clear();
    this.wires.forEach((w, i) => {
      w.t = (w.t + delta / 1400) % 1;
      for (let k = 0; k < 2; k++) {
        const p = w.curve.getPoint((w.t + k * 0.5) % 1, TMP);
        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(p.x, p.y, 4);
      }
    });
  }

  async finish() {
    Sfx.play('bigSuccess');
    await this.guide.say(this.T('doneLine', ''), { nextLabel: Content.ui('continue', 'Continue'), width: 740 });
    this.done();
  }
}
