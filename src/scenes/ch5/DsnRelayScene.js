import Phaser from 'phaser';
import { W, COLORS, CSS, DEPTH } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame, InfoPanel } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { ProgressBar, toast } from '../../ui/widgets.js';

// The Deep Space Network: Earth (seen from above the North Pole) turns, and each of the three
// dish sites can only see Voyager while it faces that way. Pass the signal to the next dish
// before the one talking to Voyager turns away.
const E = { x: 380, y: 400, r: 150 };
const VIEW = Phaser.Math.DegToRad(78); // how far from straight-at-Voyager a dish can still see it

export class DsnRelayScene extends BaseScene {
  constructor() {
    super('DsnRelay');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 160 });
    this.state = 'intro';
    this.lost = 0;
    this.received = 0;
    this.spin = 0;
    this.turnTime = this.relaxed ? 30 : 21; // seconds per (speeded-up) day
    this.receivedTime = this.relaxed ? 34 : 30; // seconds of contact needed
    this.stations = this.T('stations', []).map((s, i) => ({ ...s, a: -Math.PI / 2 + (i * Math.PI * 2) / 3 }));
    this.link = 0;

    // Earth from above the North Pole
    this.add.image(E.x, E.y, 'softDot').setDisplaySize(E.r * 2.7, E.r * 2.7).setTint(0x4fb8ff).setAlpha(0.25);
    this.earth = this.add.container(E.x, E.y);
    this.earth.add(img(this, 0, 0, 'earthPole', (E.r * 2) / (400 * 0.92)));
    // dish sites on the edge
    this.dishes = this.stations.map((s, i) => {
      const d = this.add.container(Math.cos(s.a) * (E.r + 4), Math.sin(s.a) * (E.r + 4));
      const g = this.add.graphics();
      g.fillStyle(0xeef1f7, 1);
      g.slice(0, 0, 22, -0.9, 0.9, false);
      g.fillPath();
      g.fillStyle(0x6b7290, 1);
      g.fillRect(-12, -3, 12, 6);
      d.add(g);
      d.rotation = s.a;
      this.earth.add(d);
      return d;
    });
    // night side shading (fixed: the Sun is to the left)
    const night = this.add.graphics();
    night.fillStyle(0x000020, 0.28);
    night.slice(E.x, E.y, E.r, -Math.PI / 2, Math.PI / 2, false);
    night.fillPath();

    // Voyager, far away to the right
    this.voyager = img(this, W - 150, E.y - 40, 'voyager', 0.45);
    txt(this, W - 150, E.y + 30, this.T('toVoyager', 'To Voyager 1'), { size: 15, weight: 800, color: CSS.cyan, origin: 0.5, scale: false });
    this.beam = this.add.graphics();
    this.labels = this.stations.map(() => txt(this, 0, 0, '', { size: 15, weight: 800, origin: 0.5, align: 'center', scale: false, stroke: '#070b1d', strokeThickness: 5 }).setDepth(DEPTH.ui));

    // the data coming in
    txt(this, 700, 112, this.T('dataLabel', 'Data received'), { size: 16, weight: 800, color: CSS.yellow, scale: false });
    this.bar = new ProgressBar(this, 700, 136, 520, 18, { color: COLORS.green });
    this.info = new InfoPanel(this, 700, 470, 540, 120, { title: '', text: '', size: 17 });
    this.factI = 0;
    this.nextFact();

    // buttons for each dish (tapping the dish on Earth works too)
    this.buttons = this.stations.map((s, i) => {
      const b = new Button(this, 760 + i * 170, 660, { width: 160, height: 64, size: 18, label: s.name, icon: 'speaker', variant: 'secondary', onClick: () => this.pick(i) });
      return b;
    });
    this.input.on('pointerdown', (p, over) => {
      if (over.length || this.state !== 'play') return;
      // nearest dish to the tap
      let best = -1, bd = 70;
      this.stations.forEach((s, i) => {
        const pos = this.dishWorld(i);
        const d = Phaser.Math.Distance.Between(p.worldX, p.worldY, pos.x, pos.y);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      if (best >= 0) this.pick(best);
    });
    if (this.input.keyboard) ['ONE', 'TWO', 'THREE'].forEach((k, i) => this.input.keyboard.on('keydown-' + k, () => this.pick(i)));

    // start talking through the dish that faces Voyager most directly
    this.link = this.stations.map((s, i) => i).sort((a, b) => Math.abs(Phaser.Math.Angle.Wrap(this.dishWorld(a).a)) - Math.abs(Phaser.Math.Angle.Wrap(this.dishWorld(b).a)))[0];
    this.update(0, 0);
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  nextFact() {
    const lines = this.T('factLines', []);
    if (!lines.length) return;
    this.info.show('', lines[this.factI % lines.length], { size: 17 });
    this.factI++;
  }

  dishWorld(i) {
    const a = this.stations[i].a + this.spin;
    return { x: E.x + Math.cos(a) * (E.r + 4), y: E.y + Math.sin(a) * (E.r + 4), a };
  }

  canSee(i) {
    // Voyager is straight to the right (angle 0)
    return Math.abs(Phaser.Math.Angle.Wrap(this.dishWorld(i).a)) < VIEW;
  }

  pick(i) {
    if (this.state !== 'play') return;
    if (!this.canSee(i)) {
      Sfx.play('error');
      toast(this, `${this.stations[i].name}: ${this.T('notVisible', '')}`, { y: 100, color: COLORS.orange, sound: false, duration: 2000 });
      return;
    }
    if (this.link !== i) Sfx.play('radio');
    this.link = i;
    this.wasLost = false;
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    if (this.state === 'play') this.spin -= ((Math.PI * 2) / this.turnTime) * dt; // turning anticlockwise, seen from the north
    this.earth.rotation = this.spin;
    const linked = this.link >= 0 && this.canSee(this.link);
    // the radio beam
    const g = this.beam;
    g.clear();
    if (linked) {
      const p = this.dishWorld(this.link);
      g.lineStyle(4, COLORS.cyan, 0.5 + Math.sin(time / 120) * 0.25);
      g.lineBetween(p.x, p.y, this.voyager.x - 40, this.voyager.y);
    }
    this.stations.forEach((s, i) => {
      const p = this.dishWorld(i);
      const see = this.canSee(i);
      const l = this.labels[i];
      l.setPosition(E.x + Math.cos(p.a) * (E.r + 52), E.y + Math.sin(p.a) * (E.r + 40));
      l.setText(`${s.name}\n${s.place}`).setColor(i === this.link && linked ? CSS.cyan : see ? CSS.green : CSS.dim);
      this.buttons[i].setVariant(i === this.link && linked ? 'primary' : see ? 'success' : 'secondary');
    });
    if (this.state !== 'play') return;
    if (linked) {
      this.received += dt / this.receivedTime;
      this.bar.set(this.received, true);
      if (Math.floor(this.received * 6) > Math.floor((this.received - dt / this.receivedTime) * 6)) this.nextFact();
      if (this.received >= 1) this.win();
    } else if (!this.wasLost) {
      this.wasLost = true;
      this.lost++;
      Sfx.play('static');
      toast(this, this.T('lost', 'Signal lost!'), { y: 100, color: COLORS.red, sound: false, speak: true, duration: 2200 });
    }
  }

  win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    this.time.delayedCall(600, () => finishGame(this, { stars: this.lost <= 1 ? 3 : this.lost <= 3 ? 2 : 1 }));
  }
}
