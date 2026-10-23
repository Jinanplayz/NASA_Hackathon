import Phaser from 'phaser';
import { W, COLORS, CSS, TEX, shuffle } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { txt } from '../../ui/text.js';
import { floatText, toast, roundBox } from '../../ui/widgets.js';

// Drag the parts of Explorer 1 onto the blueprint. Each part explains what it does.
// Slots are sized like the real layout (not to scale), with the nose pointing right.
const SAT_Y = 238;
const SLOTS = {
  motor: { x: 320, y: SAT_Y, key: 'exMotor' },
  batteries: { x: 535, y: SAT_Y, key: 'exBatteries' },
  transmitter: { x: 640, y: SAT_Y, key: 'exTransmitter' },
  cosmic: { x: 765, y: SAT_Y, key: 'exCosmic' },
  micro: { x: 868, y: SAT_Y, key: 'exMicro' },
  antennas: { x: 470, y: SAT_Y, key: 'exAntennas' },
  nose: { x: 955, y: SAT_Y, key: 'exNose' }
};
const TRAY_Y = 468;

export class AssemblyScene extends BaseScene {
  constructor() {
    super('Assembly');
  }

  create() {
    this.setupStage();
    blueprint(this);
    this.parts = this.T('parts', []);
    this.placed = new Set();

    txt(this, W / 2, 100, this.T('blueprintTitle', 'Explorer 1 · blueprint'), { size: 22, weight: 800, color: CSS.cyan, origin: 0.5, scale: false });
    txt(this, W / 2, 124, this.T('notToScale', '(not to scale)'), { size: 14, color: CSS.dim, origin: 0.5, scale: false });

    // the empty instrument tube (a cut-away so you can see inside)
    const shell = this.add.graphics();
    shell.fillStyle(0x0a1433, 0.9);
    shell.fillRect(480, SAT_Y - 38, 420, 76);
    shell.lineStyle(3, 0x9fc3ff, 0.9);
    shell.strokeRect(480, SAT_Y - 38, 420, 76);
    shell.lineStyle(1, 0x9fc3ff, 0.25);
    for (let x = 500; x < 900; x += 20) shell.lineBetween(x, SAT_Y - 38, x, SAT_Y + 38);

    // ghost outlines of every part
    this.ghosts = {};
    this.parts.forEach((p) => {
      const s = SLOTS[p.id];
      const ghost = this.add.image(s.x, s.y, s.key).setScale(1 / TEX).setTintFill(0x3f63c9).setAlpha(0.45);
      this.ghosts[p.id] = ghost;
      if (p.id === 'antennas') ghost.setDepth(2);
    });
    this.glow = this.add.graphics().setDepth(3);

    // tray
    const tg = roundBox(this, 40, TRAY_Y - 78, W - 80, 156, { fill: 0x0e1840, radius: 22, stroke: COLORS.stroke });
    txt(this, 64, TRAY_Y - 68, this.T('trayTitle', 'Parts box'), { size: 15, weight: 800, color: CSS.cyan, scale: false });
    this.progress = txt(this, W - 64, TRAY_Y - 68, '', { size: 15, weight: 700, color: CSS.dim, origin: [1, 0], scale: false });

    const order = shuffle(this.parts);
    const gap = (W - 160) / order.length;
    this.pieces = order.map((p, i) => this.makePiece(p, 80 + gap * (i + 0.5), TRAY_Y + 10));
    this.updateProgress();

    this.input.on('dragstart', (pointer, obj) => this.onDragStart(obj));
    this.input.on('drag', (pointer, obj, dragX, dragY) => obj.setPosition(dragX, dragY));
    this.input.on('dragend', (pointer, obj) => this.onDrop(obj));

    this.guide.sequence(this.T('intro', []), { modal: true });
    this.hintTimer = this.time.addEvent({ delay: 14000, loop: true, callback: () => this.hint() });
  }

  makePiece(p, x, y) {
    const s = SLOTS[p.id];
    const tex = this.textures.getFrame(s.key);
    const trayScale = Math.min(1, 118 / (tex.width / TEX), 118 / (tex.height / TEX));
    const piece = this.add.image(x, y, s.key).setScale(trayScale / TEX).setDepth(10);
    piece.home = { x, y, scale: trayScale / TEX };
    piece.part = p;
    piece.setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(piece);
    const label = txt(this, x, TRAY_Y + 60, p.name, { size: 14, weight: 700, origin: 0.5, align: 'center', wrap: 150, scale: false });
    piece.label = label;
    // keyboard: focus a part with TAB, press ENTER to place it
    piece.enabled = true;
    piece.activate = () => this.place(piece);
    this.focus.add(piece);
    piece.on('pointerover', () => !this.placed.has(p.id) && piece.setTint(0xdff4ff));
    piece.on('pointerout', () => piece.clearTint());
    return piece;
  }

  onDragStart(obj) {
    if (this.placed.has(obj.part.id)) return;
    Sfx.play('select');
    obj.setDepth(50);
    this.tweens.add({ targets: obj, scale: 1 / TEX, duration: 150 });
    const s = SLOTS[obj.part.id];
    this.glow.clear();
    this.glow.lineStyle(3, COLORS.yellow, 0.9);
    this.glow.strokeCircle(s.x, s.y, 16);
  }

  onDrop(obj) {
    this.glow.clear();
    if (this.placed.has(obj.part.id)) return;
    const target = SLOTS[obj.part.id];
    const d = Phaser.Math.Distance.Between(obj.x, obj.y, target.x, target.y);
    if (d < 70) {
      this.place(obj);
      return;
    }
    // dropped on a different part's spot?
    const other = this.parts.find((p) => p.id !== obj.part.id && !this.placed.has(p.id) && Phaser.Math.Distance.Between(obj.x, obj.y, SLOTS[p.id].x, SLOTS[p.id].y) < 50);
    if (other) {
      Sfx.play('error');
      const wrongSpot = this.T('wrongSpot', 'Oops! That spot is for a different part:');
      toast(this, `${wrongSpot} ${other.name}.`, { y: 150, color: COLORS.orange, duration: 2500, sound: false, speak: [wrongSpot, other.name] });
    }
    this.sendHome(obj);
  }

  sendHome(obj) {
    obj.setDepth(10);
    this.tweens.add({ targets: obj, x: obj.home.x, y: obj.home.y, scale: obj.home.scale, duration: 300, ease: 'Cubic.easeOut' });
  }

  place(obj) {
    const p = obj.part;
    if (this.placed.has(p.id)) return;
    this.placed.add(p.id);
    const s = SLOTS[p.id];
    obj.disableInteractive();
    obj.enabled = false;
    obj.clearTint();
    obj.setDepth(p.id === 'antennas' ? 4 : 3);
    this.tweens.add({ targets: obj, x: s.x, y: s.y, scale: 1 / TEX, duration: 250, ease: 'Back.easeOut' });
    this.ghosts[p.id].setVisible(false);
    obj.label.setVisible(false);
    Sfx.play('snap');
    const sparks = this.add.particles(s.x, s.y, 'sparkle', { speed: { min: 60, max: 160 }, lifespan: 500, scale: { start: 0.22, end: 0 }, tint: [0xffd166, 0x4fd1ff], emitting: false });
    sparks.setDepth(20).explode(12);
    floatText(this, s.x, s.y - 60, p.name, CSS.green, 18);
    this.updateProgress();
    if (this.placed.size >= this.parts.length) this.finish();
    else this.guide.say({ text: `${p.name}: ${p.info}`, speak: [p.name, p.info] }, { next: false });
  }

  hint() {
    if (this.guide.visible && this.guide.resolve) return;
    const left = this.pieces.find((pc) => !this.placed.has(pc.part.id));
    if (!left) return;
    const s = SLOTS[left.part.id];
    this.tweens.add({ targets: left, y: left.home.y - 16, duration: 200, yoyo: true, repeat: 2 });
    const ring = this.add.circle(s.x, s.y, 30).setStrokeStyle(4, COLORS.yellow).setDepth(20);
    this.tweens.add({ targets: ring, scale: 2, alpha: 0, duration: 900, repeat: 1, onComplete: () => ring.destroy() });
  }

  updateProgress() {
    this.progress.setText(`${this.placed.size} / ${this.parts.length} ${this.T('progressLabel', 'parts placed')}`);
  }

  async finish() {
    this.hintTimer.remove();
    Sfx.play('bigSuccess');
    const stripes = this.add.graphics().setDepth(5).setAlpha(0);
    stripes.fillStyle(0xeef1f7, 0.25);
    stripes.fillRect(480, SAT_Y - 38, 420, 76);
    this.tweens.add({ targets: stripes, alpha: 1, duration: 400, yoyo: true, repeat: 1 });
    await this.guide.say(this.T('doneLine', ''), { nextLabel: this.T('continue', Content.ui('continue', 'Continue')) });
    this.done();
  }
}
