import Phaser from 'phaser';
import { COLORS, CSS, DEPTH, clamp, shuffle } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame, starsFor, draggable, InfoPanel } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt, fitText } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { drawPanel, toast, shake, floatText } from '../../ui/widgets.js';

// Curiosity's first drill hole (February 2013). Pick a good rock to drill, drill 6.4 cm down
// keeping the pressure in the green, then pour the powder into the rover's two labs.
const RX = 70, RY = 230, RW = 600, RH = 420; // the rock, cut open so we can see inside
const DEPTH_CM = 6.4, PX_PER_CM = 56;
const ZONE = [0.42, 0.74];
// how hard each layer is (deeper = further down the list)
const LAYERS = [[0, 0.5, 0.15, 0xb5562c], [0.5, 2.4, 0.55, 0x8d8a86], [2.4, 3.3, 1.15, 0x6e6c6a], [3.3, 7, 0.7, 0x86837f]];

export class DrillScene extends BaseScene {
  constructor() {
    super('Drill');
  }

  create() {
    this.setupStage({ bg: 0x1a0e0a });
    this.state = 'intro';
    this.mistakes = 0;
    this.depth = 0;
    this.pressure = 0;
    this.holding = false;
    this.stuckT = 0;
    this.delivered = {};
    this.info = new InfoPanel(this, 760, 96, 480, 200, { title: '', text: '', size: 18 });
    this.choose();
    playIntro(this).then((ok) => {
      if (ok) this.state = 'choose';
    });
  }

  // ---------- 1. choose the rock ----------
  choose() {
    this.info.show(this.T('chooseTitle', 'Which rock?'), this.T('chooseText', ''));
    this.cards = shuffle(this.T('rocks', [])).map((r, i) => {
      const x = 150 + i * 235, y = 410;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      drawPanel(g, -105, -170, 210, 340, { fill: COLORS.panel, radius: 16, stroke: COLORS.stroke, strokeWidth: 3 });
      const pic = img(this, 0, -90, r.art, 1.25);
      const name = txt(this, 0, -14, r.name, { size: 19, weight: 800, color: CSS.yellow, origin: [0.5, 0], align: 'center', wrap: 186, scale: false });
      const clue = txt(this, 0, name.y + name.height + 10, r.clue, { size: 16, weight: 600, origin: [0.5, 0], align: 'center', wrap: 186, scale: false, lineSpacing: 3 });
      fitText(clue, 186, 160 - clue.y, 12);
      c.add([g, pic, name, clue]);
      c.setSize(210, 340);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', () => this.pick(c));
      c.activate = () => this.pick(c);
      c.rock = r;
      this.focus.add(c);
      return c;
    });
  }

  pick(c) {
    if (this.state !== 'choose' || c.done) return;
    const r = c.rock;
    if (!r.ok) {
      c.done = true;
      this.mistakes++;
      Sfx.play('error');
      shake(this, c, 8);
      c.setAlpha(0.45);
      this.info.show(r.name, r.why, { titleColor: CSS.orange });
      Speech.say(r.why);
      return;
    }
    Sfx.play('success');
    this.state = 'between';
    this.info.show(r.name, r.why, { titleColor: CSS.green });
    Speech.say(r.why);
    this.tweens.add({ targets: c, scale: 1.08, duration: 200, yoyo: true });
    this.time.delayedCall(2600, () => {
      if (this._leaving) return;
      this.cards.forEach((k) => k.destroy());
      this.setupDrill();
    });
  }

  // ---------- 2. drill ----------
  setupDrill() {
    // the rock, cut open, with its layers
    const g = this.add.graphics();
    LAYERS.forEach(([a, b, , col]) => {
      g.fillStyle(col, 1);
      g.fillRect(RX, RY + a * PX_PER_CM, RW, Math.min(b * PX_PER_CM, RH) - a * PX_PER_CM);
    });
    // white veins of a mineral left by water
    g.lineStyle(3, 0xf4f1ea, 0.85);
    [[0.1, 1.2, 0.45, 1.6], [0.55, 2.0, 0.9, 1.7], [0.2, 4.2, 0.6, 4.6], [0.65, 5.2, 0.95, 5.0]].forEach(([x0, y0, x1, y1]) => g.lineBetween(RX + x0 * RW, RY + y0 * PX_PER_CM, RX + x1 * RW, RY + y1 * PX_PER_CM));
    g.lineStyle(3, 0x3a1a0a, 1);
    g.strokeRect(RX, RY, RW, RH);
    txt(this, RX + 10, RY + RH - 28, this.T('rockName', 'John Klein'), { size: 16, weight: 800, color: '#ffffff', scale: false, stroke: '#1a0e0a', strokeThickness: 4 });
    // depth marks
    for (let cm = 1; cm <= 6; cm++) {
      g.lineStyle(2, 0xffffff, 0.5);
      g.lineBetween(RX + RW + 4, RY + cm * PX_PER_CM, RX + RW + 18, RY + cm * PX_PER_CM);
      txt(this, RX + RW + 24, RY + cm * PX_PER_CM, `${cm} cm`, { size: 13, weight: 700, color: CSS.dim, origin: [0, 0.5], scale: false });
    }
    g.lineStyle(3, COLORS.green, 1);
    g.lineBetween(RX + RW / 2 - 50, RY + DEPTH_CM * PX_PER_CM, RX + RW / 2 + 50, RY + DEPTH_CM * PX_PER_CM);
    // the drill: a spinning bit coming down from the rover's arm
    this.hole = this.add.graphics();
    this.drillBox = this.add.container(RX + RW / 2, RY);
    this.bit = this.add.graphics();
    this.drillBox.add([this.add.rectangle(0, -70, 60, 80, 0x9aa1ae).setStrokeStyle(2, 0x3a3f4b), this.add.rectangle(0, -130, 22, 60, 0x6b7290), this.bit]);
    this.drawBit(0);
    this.chips = this.add.particles(0, 0, 'softDot', { speed: { min: 40, max: 140 }, angle: { min: 200, max: 340 }, gravityY: 300, lifespan: 700, scale: { start: 0.08, end: 0.02 }, tint: [0xb5562c, 0x8d8a86], frequency: 40, emitting: false });

    // pressure gauge and the drill button
    const gx = 760, gy = 330, gh = 260;
    const pg = this.add.graphics();
    drawPanel(pg, gx, gy - 20, 480, gh + 60, { fill: COLORS.panel, radius: 16, stroke: COLORS.stroke, strokeWidth: 3 });
    txt(this, gx + 24, gy - 6, this.T('pressureLabel', 'Pressure'), { size: 18, weight: 800, color: CSS.cyan, scale: false });
    this.gauge = { x: gx + 40, y: gy + 26, w: 50, h: gh - 40 };
    this.gaugeG = this.add.graphics();
    this.depthText = txt(this, gx + 130, gy + 40, '', { size: 30, weight: 800, color: CSS.yellow, scale: false });
    this.hintText = txt(this, gx + 130, gy + 90, '', { size: 17, weight: 700, color: CSS.text, wrap: 330, scale: false, lineSpacing: 4 });
    this.drillBtn = new Button(this, gx + 300, gy + gh - 10, { width: 280, height: 74, size: 26, label: this.T('drillLabel', 'Hold to drill'), icon: 'down', variant: 'warn', sound: null });
    this.drillBtn.off('pointerup');
    this.drillBtn.on('pointerdown', () => (this.holding = true));
    this.input.on('pointerup', () => (this.holding = false));
    this.drillBtn.activate = () => (this.holding = !this.holding);
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-SPACE', () => (this.holding = true));
      this.input.keyboard.on('keyup-SPACE', () => (this.holding = false));
    }
    this.info.show(this.T('drillTitle', 'Drill!'), this.T('drillText', ''));
    Speech.say(this.T('drillText', ''));
    this.state = 'drill';
    this.drawGauge();
  }

  drawBit(spin) {
    const g = this.bit;
    g.clear();
    const len = 40 + this.depth * PX_PER_CM;
    g.fillStyle(0xc9ced8, 1);
    g.fillRect(-10, -30, 20, len);
    g.lineStyle(2, 0x5d6475, 1);
    for (let y = -26 + (spin % 12); y < len - 30; y += 12) g.lineBetween(-10, y, 10, y + 6);
    g.fillStyle(0x9aa1ae, 1);
    g.fillTriangle(-10, len - 30, 10, len - 30, 0, len - 18);
  }

  hardness() {
    const l = LAYERS.find(([a, b]) => this.depth >= a && this.depth < b) || LAYERS[LAYERS.length - 1];
    return l[2];
  }

  drawGauge() {
    const { x, y, w, h } = this.gauge;
    const g = this.gaugeG;
    g.clear();
    g.fillStyle(0x0b1230, 1);
    g.fillRoundedRect(x, y, w, h, 10);
    g.fillStyle(COLORS.green, 0.85);
    g.fillRect(x, y + h - ZONE[1] * h, w, (ZONE[1] - ZONE[0]) * h);
    g.fillStyle(COLORS.red, 0.6);
    g.fillRect(x, y, w, h * 0.08);
    const py = y + h - this.pressure * h;
    g.fillStyle(COLORS.yellow, 1);
    g.fillTriangle(x + w + 4, py, x + w + 22, py - 10, x + w + 22, py + 10);
    g.fillRect(x, py - 2, w, 4);
    this.depthText.setText(`${this.depth.toFixed(1)} / ${DEPTH_CM} cm`);
  }

  // ---------- 3. deliver the powder ----------
  async deliver() {
    this.state = 'between';
    this.holding = false;
    this.drillBtn.setVisible(false).setEnabled(false);
    Sfx.play('bigSuccess');
    this.chips.stop();
    floatText(this, RX + RW / 2, RY - 60, '6.4 cm!', CSS.green, 32);
    // the powder inside is grey, not red!
    const pile = this.add.ellipse(RX + RW / 2 + 70, RY - 6, 70, 18, 0x8d8a86).setDepth(DEPTH.ui);
    this.tweens.add({ targets: pile, scaleX: 1.3, duration: 600 });
    this.info.show(this.T('greyTitle', 'Grey inside!'), this.T('greyText', ''));
    const r = await this.guide.say(this.T('greyText', ''), { modal: true, position: 'top' });
    if (r === null || this._leaving) return;
    // the two little labs inside the rover
    this.drillBox.setVisible(false);
    this.hintText.setText('');
    const names = this.T('labs', {});
    const deck = this.add.graphics().setDepth(DEPTH.ui - 5);
    drawPanel(deck, 760, 96, 480, 200, { fill: 0xe9ecf2, radius: 16, stroke: 0x9aa1ae, strokeWidth: 3 });
    this.info.g.setVisible(false);
    this.info.title.setVisible(false);
    this.info.body.setVisible(false);
    txt(this, 1000, 110, this.T('deckLabel', "Curiosity's deck"), { size: 16, weight: 800, color: '#3a3f4b', origin: [0.5, 0], scale: false }).setDepth(DEPTH.ui - 4);
    this.inlets = ['chemin', 'sam'].map((k, i) => {
      const x = 880 + i * 240, y = 200;
      const c = this.add.container(x, y).setDepth(DEPTH.ui - 4);
      const g = this.add.graphics();
      g.fillStyle(0x3a3f4b, 1);
      g.fillRoundedRect(-70, -40, 140, 80, 12);
      g.fillStyle(0x0b1230, 1);
      g.fillCircle(0, -8, 18);
      const t = txt(this, 0, 22, (names[k] || k).toUpperCase(), { size: 15, weight: 800, color: '#ffffff', origin: 0.5, scale: false });
      c.add([g, t]);
      c.key = k;
      return c;
    });
    // the scoop full of powder
    const scoop = this.add.container(RX + RW / 2 + 70, RY - 40).setDepth(DEPTH.ui);
    const sg = this.add.graphics();
    sg.fillStyle(0x9aa1ae, 1);
    sg.fillRoundedRect(-40, -18, 80, 36, 8);
    sg.fillStyle(0x8d8a86, 1);
    sg.fillEllipse(0, -14, 64, 14);
    scoop.add([sg, txt(this, 0, 30, this.T('scoopLabel', 'Powder'), { size: 14, weight: 800, color: '#ffffff', origin: 0.5, scale: false })]);
    scoop.setSize(90, 60);
    pile.destroy();
    this.scoop = scoop;
    this.state = 'deliver';
    Speech.say(this.T('deliverText', ''));
    toast(this, this.T('deliverText', 'Drag the powder into both labs: CheMin and SAM.'), { y: 330, sound: false, duration: 4000 });
    draggable(this, scoop, {
      onDrop: (x, y) => {
        const inlet = this.inlets.find((c) => Math.abs(c.x - x) < 90 && Math.abs(c.y - y) < 70);
        return inlet ? this.pour(inlet) : false;
      },
      onTap: () => {
        const next = this.inlets.find((c) => !this.delivered[c.key]);
        if (next) this.pour(next);
      }
    });
  }

  pour(inlet) {
    if (this.state !== 'deliver' || this.delivered[inlet.key]) return false;
    this.delivered[inlet.key] = true;
    Sfx.play('pickup');
    const facts = this.T('labFacts', {});
    for (let i = 0; i < 12; i++) {
      const d = this.add.circle(inlet.x + Phaser.Math.Between(-10, 10), inlet.y - 60, 3, 0x8d8a86).setDepth(DEPTH.ui);
      this.tweens.add({ targets: d, y: inlet.y - 8, alpha: 0, duration: 500, delay: i * 40, onComplete: () => d.destroy() });
    }
    floatText(this, inlet.x, inlet.y - 70, '✓', CSS.green, 30);
    if (facts[inlet.key]) toast(this, facts[inlet.key], { y: 640, sound: false, speak: true, duration: 4200 });
    this.scoop.goHome();
    if (Object.keys(this.delivered).length >= 2) this.time.delayedCall(4400, () => this.win());
    return true;
  }

  async win() {
    if (this._leaving || this.state === 'won') return;
    this.state = 'won';
    this.scoop.setVisible(false);
    Sfx.play('bigSuccess');
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    finishGame(this, { stars: starsFor(this.mistakes, 1, 3) });
  }

  update(time, delta) {
    if (this.state !== 'drill') return;
    const dt = Math.min(delta, 50) / 1000;
    if (this.stuckT > 0) {
      this.stuckT -= dt;
      this.pressure = Math.max(0, this.pressure - 0.5 * dt);
      if (this.stuckT <= 0) this.hintText.setText('');
    } else if (this.holding) {
      this.pressure += (0.3 + this.hardness() * 0.45) * dt * (this.relaxed ? 0.75 : 1);
    } else {
      this.pressure -= 0.55 * dt;
    }
    this.pressure = clamp(this.pressure, 0, 1);
    // too much pressure and the bit gets stuck
    if (this.pressure > 0.92 && this.stuckT <= 0) {
      this.stuckT = 1.4;
      this.mistakes++;
      this.holding = false;
      Sfx.play('error');
      shake(this, this.drillBox, 6);
      this.hintText.setText(this.T('stuck', 'Stuck! Too much pressure. Wait while it wiggles free...'));
    }
    const inZone = this.pressure >= ZONE[0] && this.pressure <= ZONE[1] && this.stuckT <= 0 && this.holding;
    if (inZone) {
      this.depth = Math.min(DEPTH_CM, this.depth + (0.85 / (0.6 + this.hardness())) * dt * 1.4);
      this.chips.emitting = true;
      this.chips.setPosition(RX + RW / 2, RY - 4);
      if (Math.random() < dt * 8) Sfx.play('tick');
    } else this.chips.emitting = false;
    if (this.stuckT <= 0) {
      this.hintText.setText(this.holding ? (this.pressure < ZONE[0] ? this.T('pushHarder', 'Keep holding: more pressure!') : this.pressure > ZONE[1] ? this.T('easeOff', 'Ease off!') : this.T('good', 'Drilling!')) : this.T('holdHint', 'Hold the button to press the drill down.'));
    }
    // the hole gets deeper
    this.hole.clear();
    this.hole.fillStyle(0x2a2826, 1);
    this.hole.fillRect(RX + RW / 2 - 12, RY, 24, this.depth * PX_PER_CM);
    this.drawBit(this.holding && inZone ? time / 20 : 0);
    this.drawGauge();
    if (this.depth >= DEPTH_CM) this.deliver();
  }
}
