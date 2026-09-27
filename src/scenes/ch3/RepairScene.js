import Phaser from 'phaser';
import { COLORS, CSS, DEPTH, TEX, clamp } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { drawPanel, toast, floatText, shake, Slider } from '../../ui/widgets.js';

// Four quick jobs to get home: fix the broken switch (with a felt-tip pen, like Buzz Aldrin),
// separate the Service Module, point the heat shield forward, and pick a safe entry angle.
export class RepairScene extends BaseScene {
  constructor() {
    super('Repair');
  }

  create() {
    this.setupStage();
    // (Phaser reuses this screen when it is played again: start from a clean slate)
    this.sepTick = null;
    this.capsule = null;
    this.aimDrag = null;
    this.aimHold = 0;
    this.aimDone = false;
    starfield(this, { count: 140 });
    this.titles = this.T('taskTitles', []);
    this.layer = this.add.container(0, 0);
    this.task = -1;

    // instruction bar
    const ig = this.add.graphics().setDepth(DEPTH.ui);
    drawPanel(ig, 180, 84, 920, 92, { fill: 0x0e1840, radius: 18, stroke: COLORS.cyan });
    this.taskTitle = txt(this, 204, 96, '', { size: 20, weight: 800, color: CSS.yellow, scale: false }).setDepth(DEPTH.ui);
    this.instr = txt(this, 204, 124, '', { size: 17, wrap: 872, scale: false }).setDepth(DEPTH.ui);
    this.dots = this.add.graphics().setDepth(DEPTH.ui);

    this.guide.sequence(this.T('intro', []), { modal: true }).then((r) => {
      if (r !== null) this.nextTask();
    });
  }

  setInstr(text, speak = true) {
    this.instr.setText(text);
    if (speak) Speech.say(text);
  }

  nextTask() {
    this.task++;
    this.layer.removeAll(true);
    this.dots.clear();
    for (let i = 0; i < 4; i++) {
      this.dots.fillStyle(i < this.task ? COLORS.green : i === this.task ? COLORS.yellow : 0x3a4470, 1);
      this.dots.fillCircle(1040 + i * 16, 106, 6);
    }
    this.taskTitle.setText(`${this.task + 1}/4 · ${this.titles[this.task] || ''}`);
    [this.taskSwitch, this.taskSeparate, this.taskAim, this.taskAngle][this.task]?.call(this);
  }

  // ---------- 1. the broken switch ----------
  taskSwitch() {
    this.setInstr(this.T('intro', [])[1] || '', false);
    const px = 330, py = 190, pw = 620, ph = 310;
    const g = this.add.graphics();
    drawPanel(g, px, py, pw, ph, { fill: 0x3a3f4b, stroke: 0x6b7385, radius: 14 });
    this.layer.add(g);
    const cols = 8, rows = 4;
    this.breakerAt = { x: px + 80 + 5 * 68, y: py + 66 + 1 * 64 };
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = px + 80 + c * 68, y = py + 66 + r * 64;
        const broken = x === this.breakerAt.x && y === this.breakerAt.y;
        g.fillStyle(0x23262e, 1);
        g.fillCircle(x, y, 16);
        if (!broken) {
          g.fillStyle(0xd0d4dc, 1);
          g.fillCircle(x, y, 9);
          g.fillStyle(0xffffff, 0.5);
          g.fillCircle(x - 3, y - 3, 3);
        }
        g.fillStyle(0xc9ced8, 0.6);
        g.fillRect(x - 20, y + 22, 40, 6);
      }
    }
    const label = txt(this, this.breakerAt.x, this.breakerAt.y + 38, this.T('switchLabel', 'ENGINE ARM'), { size: 12, weight: 800, origin: 0.5, color: '#ffd166', scale: false });
    this.brokenGlow = this.add.circle(this.breakerAt.x, this.breakerAt.y, 24).setStrokeStyle(4, COLORS.red, 1);
    this.tweens.add({ targets: this.brokenGlow, alpha: 0.2, duration: 400, yoyo: true, repeat: -1 });
    // the broken-off piece lying on the panel
    const stub = this.add.circle(this.breakerAt.x + 40, this.breakerAt.y + 50, 7, 0xd0d4dc);
    this.layer.add([label, this.brokenGlow, stub]);

    // tools
    const tray = this.add.graphics();
    drawPanel(tray, 180, 560, 920, 140, { fill: 0x0e1840, radius: 18 });
    this.layer.add(tray);
    this.T('tools', []).forEach((t, i) => {
      const x = 300 + i * 230, y = 616;
      const im = img(this, x, y, t.key, 0.9);
      const nm = txt(this, x, 670, t.name, { size: 15, weight: 700, origin: 0.5, scale: false });
      im.setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(im);
      im.tool = t;
      im.home = { x, y };
      im.enabled = true;
      im.activate = () => {
        im.setPosition(this.breakerAt.x, this.breakerAt.y);
        this.useTool(im);
      };
      this.focus.add(im);
      this.layer.add([im, nm]);
    });
    this.input.off('drag').off('dragend').off('dragstart');
    this.input.on('dragstart', (p, o) => {
      Sfx.play('select');
      o.setDepth(50);
    });
    this.input.on('drag', (p, o, x, y) => o.setPosition(x, y));
    this.input.on('dragend', (p, o) => this.useTool(o));
  }

  useTool(o) {
    if (!o.tool) return;
    const near = Phaser.Math.Distance.Between(o.x, o.y, this.breakerAt.x, this.breakerAt.y) < 70;
    if (!near) {
      this.tweens.add({ targets: o, x: o.home.x, y: o.home.y, duration: 250 });
      return;
    }
    if (!o.tool.correct) {
      Sfx.play('error');
      shake(this, o, 6);
      toast(this, o.tool.why, { y: 530, color: COLORS.orange, duration: 3500, sound: false, speak: true, wrap: 800 });
      this.time.delayedCall(350, () => this.tweens.add({ targets: o, x: o.home.x, y: o.home.y, duration: 250 }));
      return;
    }
    // push the switch in with the pen
    o.disableInteractive();
    this.tweens.add({ targets: o, x: this.breakerAt.x + 50, y: this.breakerAt.y, angle: -20, duration: 250 });
    this.time.delayedCall(300, () => {
      Sfx.play('switch');
      this.brokenGlow.destroy();
      const k = this.add.circle(this.breakerAt.x, this.breakerAt.y, 9, 0xd0d4dc);
      const led = this.add.circle(this.breakerAt.x + 26, this.breakerAt.y - 20, 6, COLORS.green);
      this.layer.add([k, led]);
      Sfx.play('success');
      floatText(this, this.breakerAt.x, this.breakerAt.y - 40, Content.ui('fixed', 'Fixed!'), CSS.green, 26);
      this.time.delayedCall(700, async () => {
        await this.guide.say(this.T('fixedLine', ''), { modal: true });
        this.nextTask();
      });
    });
  }

  // ---------- 2. separate the Service Module ----------
  taskSeparate() {
    this.setInstr(this.T('separateIntro', ''));
    const cm = img(this, 640, 350, 'cm', 1.9).setAngle(90);
    const sm = this.add.container(520, 350);
    const smImg = this.add.image(0, 0, 'card_sm').setScale(1.35 / TEX).setAngle(90);
    sm.add(smImg);
    this.layer.add([sm, cm]);
    const bar = this.add.graphics();
    this.layer.add(bar);
    let held = 0, done = false;
    const btn = new Button(this, 640, 610, { width: 380, height: 84, size: 24, label: this.T('holdLabel', 'Hold to separate'), icon: 'hand', variant: 'warn', sound: null, onClick: () => {} });
    btn.isHeld = false;
    btn.on('pointerdown', () => (btn.isHeld = true));
    btn.on('pointerup', () => (btn.isHeld = false));
    btn.on('pointerout', () => (btn.isHeld = false));
    const key = this.input.keyboard ? this.input.keyboard.addKey('SPACE') : null;
    // ENTER completes it for keyboard users. (Past the finish line, so the slow drain in
    // sepTick can't pull it back under. A mouse click also calls this, but the button is
    // being held then, so clicking still means holding.)
    btn.activate = () => {
      if (!btn.isHeld) held = 2;
    };
    this.layer.add(btn);
    this.sepTick = (dt) => {
      if (done) return;
      if (btn.isHeld || (key && key.isDown)) {
        held += dt;
        if (Math.random() < 0.3) Sfx.play('tick');
      } else held = Math.max(0, held - dt * 0.5);
      bar.clear();
      bar.fillStyle(0x000000, 0.5);
      bar.fillRoundedRect(450, 530, 380, 18, 9);
      bar.fillStyle(COLORS.orange, 1);
      bar.fillRoundedRect(450, 530, 380 * clamp(held / 1.5, 0, 1), 18, 9);
      if (held >= 1.5) {
        done = true;
        Sfx.play('whoosh');
        this.tweens.add({ targets: sm, x: 160, y: 470, angle: -30, alpha: 0.6, duration: 2200, ease: 'Sine.easeOut' });
        this.time.delayedCall(1200, async () => {
          toast(this, this.T('separatedLine', ''), { y: 470, x: 820, color: COLORS.green, duration: 3000, speak: true, wrap: 600 });
          this.time.delayedCall(2600, () => {
            this.sepTick = null;
            this.nextTask();
          });
        });
      }
    };
  }

  // ---------- 3. point the heat shield forward ----------
  taskAim() {
    this.setInstr(this.T('aimIntro', ''));
    // arrow showing direction of travel
    const arrow = this.add.graphics();
    arrow.fillStyle(COLORS.cyan, 0.9);
    arrow.fillRect(900, 342, 200, 16);
    arrow.fillTriangle(1100, 322, 1150, 350, 1100, 378);
    const lab = txt(this, 1030, 300, this.T('travelLabel', 'Direction of travel'), { size: 16, weight: 700, origin: 0.5, color: CSS.cyan, scale: false });
    const air = txt(this, 1030, 400, this.T('airLabel', "Earth's air ahead"), { size: 14, origin: 0.5, color: CSS.dim, scale: false });
    this.capsule = img(this, 560, 350, 'cm', 2.4).setAngle(Phaser.Math.Between(40, 150));
    const shieldTag = txt(this, 0, 0, this.T('shieldLabel', 'Heat shield'), { size: 14, weight: 800, origin: 0.5, color: CSS.orange, scale: false, stroke: '#070b1d', strokeThickness: 4 });
    this.shieldTag = shieldTag;
    this.layer.add([arrow, lab, air, this.capsule, shieldTag]);
    const turn = (d) => {
      this.capsule.angle += d;
      Sfx.play('tick');
    };
    const b1 = new Button(this, 480, 610, { width: 140, height: 72, icon: 'restart', variant: 'secondary', sound: null, onClick: () => turn(-10) });
    b1.iconG.setScale(-1, 1);
    const b2 = new Button(this, 640, 610, { width: 140, height: 72, icon: 'restart', variant: 'secondary', sound: null, onClick: () => turn(10) });
    this.layer.add([b1, b2]);
    // drag to rotate as well
    this.aimDrag = null;
    this.input.off('pointerdown').off('pointermove');
    this.input.on('pointerdown', (p) => {
      if (Phaser.Math.Distance.Between(p.worldX, p.worldY, 560, 350) < 150) this.aimDrag = Math.atan2(p.worldY - 350, p.worldX - 560);
    });
    this.input.on('pointermove', (p) => {
      if (this.aimDrag === null || !p.isDown || this.task !== 2) return;
      const a = Math.atan2(p.worldY - 350, p.worldX - 560);
      this.capsule.rotation += Phaser.Math.Angle.Wrap(a - this.aimDrag);
      this.aimDrag = a;
    });
    this.input.on('pointerup', () => (this.aimDrag = null));
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-LEFT', () => this.task === 2 && turn(-10));
      this.input.keyboard.on('keydown-RIGHT', () => this.task === 2 && turn(10));
    }
    this.aimHold = 0;
  }

  // ---------- 4. entry angle ----------
  taskAngle() {
    this.setInstr(this.T('angleIntro', ''));
    this.input.off('pointerdown').off('pointermove');
    const g = this.add.graphics();
    // atmosphere band
    g.fillStyle(0x2f7fd8, 1);
    g.fillCircle(640, 2100, 1600);
    g.fillStyle(0x7fc4ff, 0.18);
    g.fillCircle(640, 2100, 1700);
    this.layer.add(g);
    this.path = this.add.graphics();
    this.layer.add(this.path);
    const cap = img(this, 170, 230, 'cmHot', 0.8).setAngle(-120);
    this.layer.add(cap);
    this.angleVal = 0.2;
    this.verdict = txt(this, 640, 470, '', { size: 26, weight: 800, origin: 0.5, scale: false, stroke: '#070b1d', strokeThickness: 6 });
    this.layer.add(this.verdict);
    const slider = new Slider(this, 560, 560, 480, this.angleVal, (v) => {
      this.angleVal = v;
      this.drawPath();
    });
    // zones under the slider
    const zg = this.add.graphics();
    zg.fillStyle(COLORS.yellow, 0.35);
    zg.fillRect(320, 584, 480 * 0.4, 12);
    zg.fillStyle(COLORS.green, 0.8);
    zg.fillRect(320 + 480 * 0.4, 584, 480 * 0.22, 12);
    zg.fillStyle(COLORS.red, 0.45);
    zg.fillRect(320 + 480 * 0.62, 584, 480 * 0.38, 12);
    const l1 = txt(this, 330, 606, this.T('shallowLabel', 'Shallow'), { size: 14, color: CSS.yellow, scale: false });
    const l2 = txt(this, 800, 606, this.T('steepLabel', 'Steep'), { size: 14, color: CSS.red, origin: [1, 0], scale: false });
    const lock = new Button(this, 1000, 560, { width: 220, height: 66, label: this.T('confirm', 'Lock it in'), icon: 'check', variant: 'success', onClick: () => this.lockAngle() });
    this.layer.add([slider, zg, l1, l2, lock]);
    this.drawPath();
  }

  zone() {
    const v = this.angleVal;
    return v < 0.4 ? 'shallow' : v > 0.62 ? 'steep' : 'ok';
  }

  drawPath() {
    const g = this.path;
    g.clear();
    const z = this.zone();
    const col = z === 'ok' ? COLORS.green : z === 'steep' ? COLORS.red : COLORS.yellow;
    g.lineStyle(5, col, 1);
    const pts = [];
    const slope = 0.15 + this.angleVal * 1.1;
    for (let i = 0; i <= 60; i++) {
      const x = 190 + i * 16;
      let y = 240 + (x - 190) * slope;
      const surface = 2100 - Math.sqrt(Math.max(0, 1700 * 1700 - (x - 640) * (x - 640)));
      if (z === 'shallow' && y > surface - 10) y = surface - 10 - (y - surface) * 0.8; // skips off
      pts.push({ x, y: Math.min(y, 700) });
    }
    g.strokePoints(pts, false);
    this.verdict.setText(z === 'ok' ? this.T('justRight', 'Just right!') : z === 'steep' ? this.T('tooSteep', 'Too steep!') : this.T('tooShallow', 'Too shallow!'));
    this.verdict.setColor(z === 'ok' ? CSS.green : z === 'steep' ? CSS.red : CSS.yellow);
  }

  async lockAngle() {
    const z = this.zone();
    if (z !== 'ok') {
      Sfx.play('error');
      shake(this, this.verdict, 8);
      Speech.say(z === 'steep' ? this.T('tooSteep', '') : this.T('tooShallow', ''));
      return;
    }
    Sfx.play('bigSuccess');
    await this.guide.say(this.T('doneLine', ''), { modal: true, nextLabel: Content.ui('continue', 'Continue') });
    this.done();
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    if (this.sepTick) this.sepTick(dt);
    if (this.task === 2 && this.capsule && this.capsule.active) {
      const r = this.capsule.rotation;
      // heat shield is the bottom of the capsule picture (local +y)
      this.shieldTag.setPosition(560 - Math.sin(r) * 130, 350 + Math.cos(r) * 130);
      const shieldDir = Phaser.Math.Angle.Wrap(r + Math.PI / 2);
      const ok = Math.abs(Phaser.Math.Angle.Wrap(shieldDir - 0)) < Phaser.Math.DegToRad(this.relaxed ? 16 : 11);
      this.capsule.setTint(ok ? 0xc8ffd8 : 0xffffff);
      this.aimHold = ok ? this.aimHold + dt : 0;
      if (this.aimHold > 0.5 && !this.aimDone) {
        this.aimDone = true;
        Sfx.play('success');
        this.tweens.add({ targets: this.capsule, rotation: -Math.PI / 2, duration: 200 });
        toast(this, this.T('aimDone', ''), { y: 480, color: COLORS.green, duration: 2500, speak: true, sound: false });
        this.time.delayedCall(2200, () => this.nextTask());
      }
    }
  }
}
