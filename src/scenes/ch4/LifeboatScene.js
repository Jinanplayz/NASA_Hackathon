import { COLORS, CSS, DEPTH, shuffle } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame, starsFor, draggable, GoalBar, idleHint } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt, fitText } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { ProgressBar, toast, shake, floatText, RoundBox, roundBox } from '../../ui/widgets.js';

// Moving into the lifeboat: copy the guidance numbers into Aquarius's computer, send the
// things the crew needs through the tunnel, then switch Odyssey off before its power runs out.
const OD = { x: 40, y: 176, w: 430, h: 420 };
const AQ = { x: 740, y: 176, w: 500, h: 420 };
const TUN_Y = OD.y + OD.h / 2; // middle of the tunnel

export class LifeboatScene extends BaseScene {
  constructor() {
    super('Lifeboat');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 120 });
    this.state = 'intro';
    this.mistakes = 0;
    this.power = 1;
    this.drainTime = this.relaxed ? 150 : 100; // seconds until Odyssey's power runs out
    this.ranOut = false;
    this.moved = [];
    this.cards = [];

    this.drawModules();
    // Odyssey's battery, in the corner of its box
    txt(this, OD.x + OD.w - 216, OD.y + 26, this.T('powerLabel', 'Power'), { size: 15, weight: 800, color: CSS.yellow, origin: [1, 0.5], scale: false });
    this.powerBar = new ProgressBar(this, OD.x + OD.w - 206, OD.y + 18, 180, 16, { color: COLORS.yellow });
    this.powerBar.set(1, true);
    this.goal = new GoalBar(this);
    idleHint(this, () => this.hintTarget(), { delay: 8000 });

    playIntro(this).then((ok) => ok && this.startCopy());
  }

  hintTarget() {
    if (this.state === 'copy' || this.state === 'move') {
      const c = this.cards.find((k) => k.enabled && (this.state === 'copy' || k.item.correct));
      return c ? { x: c.x, y: c.y - 50 } : null;
    }
    if (this.state === 'shutdown' && this.offBtn) return { x: this.offBtn.x, y: this.offBtn.y - 36 };
    return null;
  }

  drawModules() {
    const g = this.add.graphics();
    // Odyssey: the cone-shaped command module (seen from the side)
    g.fillStyle(0x1b2236, 1);
    g.fillRoundedRect(OD.x, OD.y, OD.w, OD.h, 30);
    g.lineStyle(4, 0x9aa4bf, 1);
    g.strokeRoundedRect(OD.x, OD.y, OD.w, OD.h, 30);
    // Aquarius: the lunar module cabin
    g.fillStyle(0x2a2316, 1);
    g.fillRoundedRect(AQ.x, AQ.y, AQ.w, AQ.h, 30);
    g.lineStyle(4, 0xd8ad52, 1);
    g.strokeRoundedRect(AQ.x, AQ.y, AQ.w, AQ.h, 30);
    // the tunnel between them
    g.fillStyle(0x10141f, 1);
    g.fillRect(OD.x + OD.w, TUN_Y - 40, AQ.x - OD.x - OD.w, 80);
    g.lineStyle(3, 0x6b7290, 1);
    g.strokeRect(OD.x + OD.w, TUN_Y - 40, AQ.x - OD.x - OD.w, 80);
    txt(this, (OD.x + OD.w + AQ.x) / 2, TUN_Y + 58, this.T('tunnelLabel', 'Tunnel'), { size: 15, weight: 700, color: CSS.dim, origin: 0.5, scale: false });
    txt(this, OD.x + 24, OD.y + 16, this.T('odysseyLabel', 'Odyssey').toUpperCase(), { size: 18, weight: 800, color: '#cfd6e6', scale: false });
    txt(this, AQ.x + 24, AQ.y + 16, this.T('aquariusLabel', 'Aquarius').toUpperCase(), { size: 18, weight: 800, color: '#ffd98a', scale: false });
    this.odDim = this.add.rectangle(OD.x + OD.w / 2, OD.y + OD.h / 2, OD.w, OD.h, 0x000000, 0).setDepth(DEPTH.ui - 5);
    // arrows showing the way through the tunnel
    this.arrows = this.add.graphics();
    this.arrows.fillStyle(COLORS.cyan, 0.5);
    for (let k = 0; k < 3; k++) {
      const x = OD.x + OD.w + 40 + k * 70;
      this.arrows.fillTriangle(x, TUN_Y - 15, x, TUN_Y + 15, x + 22, TUN_Y);
    }
    this.tweens.add({ targets: this.arrows, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
  }

  setTask(key, fallback, n) {
    this.goal.set(this.T(key, fallback), { count: `${this.T('stepLabel', 'Step')} ${n} / 3` });
  }

  // ---------- 1. guidance numbers ----------
  startCopy() {
    this.state = 'copy';
    this.setTask('copyTask', { title: 'Copy the numbers!', help: 'Drag each number into the box with the same name.' }, 1);
    const angles = this.T('angles', []);
    // Odyssey's display
    const dsky = (x, y, w, h, color) => roundBox(this, x, y, w, h, { fill: 0x0c120c, alpha: 1, radius: 12, stroke: color, strokeWidth: 3, shadow: false });
    this.dskys = [dsky(OD.x + 30, OD.y + 60, OD.w - 60, 260, 0x9aa4bf), dsky(AQ.x + 40, AQ.y + 60, AQ.w - 80, 260, 0xd8ad52)];
    // empty boxes on Aquarius's computer, in a different order
    this.slots = shuffle(angles.map((a) => a.axis)).map((axis, k) => {
      const x = AQ.x + AQ.w / 2, y = AQ.y + 110 + k * 76;
      const g = this.add.graphics();
      g.lineStyle(3, 0xd8ad52, 0.9);
      g.strokeRoundedRect(x - 40, y - 28, 210, 56, 10);
      const lbl = txt(this, x - 60, y, axis.toUpperCase(), { size: 20, weight: 800, color: '#ffd98a', origin: [1, 0.5], scale: false });
      return { axis, x: x + 65, y, g, lbl, filled: false };
    });
    angles.forEach((a, k) => {
      const c = this.numberCard(a, OD.x + OD.w / 2, OD.y + 110 + k * 76);
      draggable(this, c, {
        onDrop: (x, y) => this.dropNumber(c, x, y),
        onTap: () => this.dropNumber(c, null, null)
      });
      this.cards.push(c);
    });
  }

  numberCard(a, x, y) {
    const c = this.add.container(x, y);
    const g = this.add.existing(new RoundBox(this)).draw(-110, -28, 220, 56, { fill: 0x163a1c, alpha: 1, radius: 10, stroke: 0x7dffb0, strokeWidth: 2, shadow: false });
    const t = txt(this, 0, 0, `${a.axis.toUpperCase()}  ${a.value}`, { size: 24, weight: 800, color: '#7dffb0', origin: 0.5, scale: false });
    c.add([g, t]);
    c.setSize(220, 56);
    c.angle_ = a;
    return c;
  }

  // dropped at (x, y) - or tapped (x = null: it goes to its own box)
  dropNumber(c, x, y) {
    if (this.state !== 'copy') return false;
    let slot;
    if (x === null) slot = this.slots.find((s) => s.axis === c.angle_.axis);
    else slot = this.slots.find((s) => Math.abs(x - s.x) < 130 && Math.abs(y - s.y) < 40);
    if (!slot || slot.filled) return false;
    if (slot.axis !== c.angle_.axis) {
      this.mistakes++;
      Sfx.play('error');
      shake(this, slot.lbl, 6);
      return false;
    }
    slot.filled = true;
    c.enabled = false;
    c.disableInteractive();
    this.focus.remove(c);
    Sfx.play('snap');
    this.tweens.add({ targets: c, x: slot.x, y: slot.y, scale: 0.92, duration: 200 });
    if (this.slots.every((s) => s.filled)) {
      Sfx.play('success');
      toast(this, this.T('copyDone', ''), { y: 660, speak: true, duration: 3800 });
      this.time.delayedCall(1800, () => this.startMove());
    }
    return true;
  }

  // ---------- 2. move the things the crew needs ----------
  startMove() {
    if (this._leaving) return;
    this.state = 'move';
    this.cards.forEach((c) => this.tweens.add({ targets: c, alpha: 0, duration: 300, onComplete: () => c.destroy() }));
    this.cards = [];
    this.setTask('moveTask', { title: 'Move to Aquarius!', help: 'Drag the things the crew needs into Aquarius.' }, 2);
    // the computers are done with
    this.dskys.forEach((g) => this.tweens.add({ targets: g, alpha: 0, duration: 300, onComplete: () => g.destroy() }));
    this.slots.forEach((s) => {
      s.g.destroy();
      s.lbl.destroy();
    });
    this.items = shuffle(this.T('items', []));
    this.items.forEach((it, k) => {
      const col = k % 3, row = Math.floor(k / 3);
      const c = this.itemCard(it, OD.x + 82 + col * 133, OD.y + 112 + row * 124);
      c.setAlpha(0);
      this.tweens.add({ targets: c, alpha: 1, duration: 250, delay: k * 60 });
      draggable(this, c, {
        onDrop: (x, y) => (x > AQ.x && x < AQ.x + AQ.w && y > AQ.y && y < AQ.y + AQ.h ? this.moveItem(c) : false),
        onTap: () => this.moveItem(c)
      });
      this.cards.push(c);
    });
  }

  itemCard(it, x, y) {
    const c = this.add.container(x, y);
    const g = this.add.existing(new RoundBox(this)).draw(-58, -54, 116, 108, { fill: 0x0b1230, alpha: 0.95, radius: 14, stroke: 0x3a4a92, strokeWidth: 2, shadow: false });
    const icon = img(this, 0, -12, it.key, 0.72);
    const name = txt(this, 0, 36, it.name, { size: 14, weight: 700, origin: 0.5, align: 'center', wrap: 108, scale: false });
    fitText(name, 108, 34, 10);
    c.add([g, icon, name]);
    c.setSize(116, 108);
    c.item = it;
    return c;
  }

  moveItem(c) {
    if (this.state !== 'move' || !c.enabled) return false;
    const it = c.item;
    if (!it.correct) {
      this.mistakes++;
      Sfx.play('error');
      shake(this, c, 8);
      toast(this, it.why, { y: 660, color: COLORS.orange, sound: false, speak: true, duration: 3800 });
      c.goHome();
      return true; // (already sent home)
    }
    c.enabled = false;
    c.disableInteractive();
    this.focus.remove(c);
    const n = this.moved.length;
    this.moved.push(c);
    Sfx.play('whoosh');
    // through the tunnel, then into a spot inside Aquarius
    const tx = AQ.x + 86 + (n % 3) * 160, ty = AQ.y + 120 + Math.floor(n / 3) * 130;
    this.tweens.add({
      targets: c,
      x: [OD.x + OD.w - 20, AQ.x + 30, tx],
      y: [TUN_Y, TUN_Y, ty],
      duration: 900,
      interpolation: 'catmull',
      ease: 'Sine.easeInOut'
    });
    floatText(this, AQ.x + AQ.w / 2, AQ.y + 60, '+', CSS.green, 36);
    toast(this, `${it.name}: ${it.info}`, { y: 660, sound: false, speak: [it.name, it.info], duration: 3400 });
    if (this.moved.length >= this.items.filter((i) => i.correct).length) this.time.delayedCall(1000, () => this.readyToShutDown());
    return true;
  }

  // ---------- 3. switch Odyssey off ----------
  readyToShutDown() {
    if (this._leaving || this.state !== 'move') return;
    this.state = 'shutdown';
    // the items left behind belong in Odyssey
    this.cards.filter((c) => c.enabled).forEach((c) => {
      c.enabled = false;
      c.disableInteractive();
      this.focus.remove(c);
      this.tweens.add({ targets: c, alpha: 0.35, duration: 300 });
    });
    this.setTask('offTask', { title: 'Power down Odyssey!', help: 'Press the red button to save its batteries for the trip home.' }, 3);
    this.offBtn = new Button(this, OD.x + OD.w / 2, OD.y + OD.h - 50, { width: 330, height: 64, label: this.T('shutdownLabel', 'Power down Odyssey'), icon: 'close', variant: 'danger', onClick: () => this.shutDown() }).setDepth(DEPTH.ui + 5);
    this.offBtn.pulse();
  }

  async shutDown() {
    if (this.state !== 'shutdown') return;
    this.state = 'done';
    this.offBtn.destroy();
    Sfx.play('powerUp');
    this.tweens.add({ targets: this.odDim, fillAlpha: 0.65, duration: 900 });
    this.tweens.add({ targets: this.arrows, alpha: 0, duration: 400 });
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    const stars = Math.max(1, starsFor(this.mistakes, 0, 2) - (this.ranOut ? 1 : 0));
    finishGame(this, { stars });
  }

  update(time, delta) {
    if (this.state !== 'copy' && this.state !== 'move' && this.state !== 'shutdown') return;
    const dt = Math.min(0.05, delta / 1000);
    this.power = Math.max(0, this.power - dt / this.drainTime);
    this.powerBar.set(this.power, true);
    this.powerBar.color = this.power < 0.25 ? COLORS.red : this.power < 0.5 ? COLORS.orange : COLORS.yellow;
    if (this.power <= 0 && !this.ranOut) {
      this.ranOut = true;
      Sfx.play('alarm');
      toast(this, this.T('outOfPower', 'Hurry!'), { y: 660, color: COLORS.red, speak: true, sound: false });
    }
  }
}
