import { W, COLORS, CSS, DEPTH, shuffle } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame, starsFor, draggable } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt, fitText } from '../../ui/text.js';
import { ProgressBar, toast, shake, floatText } from '../../ui/widgets.js';

// The Golden Record: drag (or tap) the things that are really on it onto the record.
// The rest bounce off with the reason why. Real sounds on the record play a little tune.
const REC = { x: W / 2, y: 392, r: 150 };

export class GoldenRecordScene extends BaseScene {
  constructor() {
    super('GoldenRecord');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 150 });
    this.state = 'intro';
    this.mistakes = 0;
    this.placed = [];
    this.items = shuffle(this.T('items', []));
    this.goal = this.items.filter((i) => i.on).length;

    this.glow = this.add.image(REC.x, REC.y, 'softDot').setDisplaySize(REC.r * 3, REC.r * 3).setTint(0xffd166).setAlpha(0.2);
    this.record = img(this, REC.x, REC.y, 'goldenRecordDisc', (REC.r * 2) / 260);
    this.label = txt(this, REC.x, REC.y, this.T('recordLabel', ''), { size: 11, weight: 800, color: '#5a3e10', origin: 0.5, align: 'center', wrap: 90, scale: false });
    txt(this, REC.x, 112, `${this.T('progressLabel', 'On the record')}`, { size: 16, weight: 800, color: CSS.yellow, origin: 0.5, scale: false });
    this.progress = new ProgressBar(this, REC.x - 160, 128, 320, 14, { color: COLORS.yellow });
    this.count = txt(this, REC.x + 176, 135, '', { size: 16, weight: 800, origin: [0, 0.5], scale: false });

    // cards on both sides of the record
    this.cards = this.items.map((it, k) => {
      const side = k < 6 ? -1 : 1, i = k % 6;
      const x = REC.x + side * (330 + (i % 2) * 132), y = 200 + Math.floor(i / 2) * 150;
      const c = this.card(it, x, y);
      draggable(this, c, {
        onDrop: (px, py) => (Math.hypot(px - REC.x, py - REC.y) < REC.r + 30 ? this.add_(c) : false),
        onTap: () => this.add_(c)
      });
      return c;
    });
    this.updateCount();
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  card(it, x, y) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x0b1230, 0.95);
    g.fillRoundedRect(-60, -64, 120, 128, 14);
    g.lineStyle(2, 0x3a4a92, 1);
    g.strokeRoundedRect(-60, -64, 120, 128, 14);
    const icon = img(this, 0, -16, it.key, 0.7);
    const name = txt(this, 0, 40, it.name, { size: 14, weight: 700, origin: 0.5, align: 'center', wrap: 112, scale: false });
    fitText(name, 112, 40, 10);
    c.add([g, icon, name]);
    c.setSize(120, 128);
    c.item = it;
    return c;
  }

  updateCount() {
    this.progress.set(this.placed.length / this.goal);
    this.count.setText(`${this.placed.length} / ${this.goal}`);
  }

  // a little sound for the things on the record
  playSound(kind) {
    if (kind === 'whale') {
      [330, 294, 262].forEach((f, i) => this.time.delayedCall(i * 260, () => Sfx.note(f, { decay: 0.6, type: 'sine', vol: 0.12 })));
    } else if (kind === 'thunder') {
      Sfx.play('hit');
      this.time.delayedCall(200, () => Sfx.play('whoosh'));
    } else if (kind === 'music') {
      [392, 494, 587, 784].forEach((f, i) => this.time.delayedCall(i * 120, () => Sfx.note(f)));
    } else if (kind === 'hello') {
      Sfx.play('chime');
    } else Sfx.play('pickup');
  }

  add_(c) {
    if (this.state !== 'play' || !c.enabled) return false;
    const it = c.item;
    if (!it.on) {
      this.mistakes++;
      Sfx.play('error');
      shake(this, c, 8);
      toast(this, `${it.name}: ${it.why}`, { y: 660, color: COLORS.orange, sound: false, speak: [it.name, it.why], duration: 3400 });
      c.goHome();
      return true;
    }
    c.enabled = false;
    c.disableInteractive();
    this.focus.remove(c);
    const n = this.placed.length;
    this.placed.push(c);
    // it shrinks and takes a place around the record's edge
    const a = -Math.PI / 2 + (n / this.goal) * Math.PI * 2;
    this.tweens.add({ targets: c, x: REC.x + Math.cos(a) * (REC.r + 2), y: REC.y + Math.sin(a) * (REC.r + 2), scale: 0.42, duration: 380, ease: 'Back.easeOut' });
    this.playSound(it.sound);
    floatText(this, REC.x, REC.y - REC.r - 20, '+1', CSS.yellow, 30);
    toast(this, `${it.name}: ${it.info}`, { y: 660, sound: false, speak: [it.name, it.info], duration: 3400 });
    this.updateCount();
    if (this.placed.length >= this.goal) this.win();
    return true;
  }

  async win() {
    this.state = 'won';
    // the rest leave the table
    this.cards.filter((c) => c.enabled).forEach((c) => {
      c.enabled = false;
      c.disableInteractive();
      this.focus.remove(c);
      this.tweens.add({ targets: c, alpha: 0.25, duration: 300 });
    });
    Sfx.play('bigSuccess');
    this.tweens.add({ targets: this.glow, alpha: 0.5, duration: 600, yoyo: true, repeat: 2 });
    await new Promise((r) => this.time.delayedCall(1500, r));
    if (this._leaving) return;
    Speech.stop();
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    finishGame(this, { stars: starsFor(this.mistakes, 1, 3) });
  }

  update(time, delta) {
    // the record turns slowly, like it's playing
    const spin = this.state === 'won' ? 0.12 : 0.02;
    this.record.rotation += spin * (delta / 16.7);
    this.label.rotation = this.record.rotation;
  }
}
