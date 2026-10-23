import Phaser from 'phaser';
import { W, COLORS, CSS, DEPTH } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { playIntro, finishGame, starsFor, GoalBar, idleHint } from '../common/kit.js';
import { txt } from '../../ui/text.js';
import { floatText, roundBox } from '../../ui/widgets.js';

// Memory game in the command module simulator: the switches light up in a sequence,
// then the player presses them in the same order. Each round adds one more step.
const NOTES = [262, 294, 330, 392, 440, 523];
const PX = 190, PY = 178, PW = 900, PH = 420;

export class SimulatorScene extends BaseScene {
  constructor() {
    super('Simulator');
  }

  create() {
    this.setupStage();
    blueprint(this);
    this.state = 'intro';
    this.round = 0;
    this.mistakes = 0;
    this.seq = [];
    this.inputPos = 0;
    this.watched = false;
    this.copied = false;
    this.rounds = this.T('rounds', [3, 4, 5, 6]);
    if (this.relaxed) this.rounds = this.rounds.slice(0, Math.max(2, this.rounds.length - 1));
    this.stepMs = this.relaxed ? 820 : 620;

    // the console
    roundBox(this, PX, PY, PW, PH, { fill: 0x2b3140, stroke: 0x5c6a8a, strokeWidth: 4, radius: 26 });
    const g = this.add.graphics();
    g.fillStyle(0x1f2430, 1);
    g.fillRoundedRect(PX + 20, PY + 20, PW - 40, 54, 14);
    // screws in the corners
    g.fillStyle(0x8b93a8, 1);
    [[PX + 18, PY + 18], [PX + PW - 18, PY + 18], [PX + 18, PY + PH - 18], [PX + PW - 18, PY + PH - 18]].forEach(([x, y]) => g.fillCircle(x, y, 5));
    txt(this, W / 2, PY + 47, this.T('panelTitle', 'SIMULATOR'), { size: 20, weight: 800, color: '#cfd6e6', origin: 0.5, scale: false });

    this.goal = new GoalBar(this);
    this.dots = this.add.graphics().setDepth(DEPTH.ui);

    // the six switches
    this.pads = this.T('switches', []).slice(0, 6).map((s, i) => this.makePad(s, i));

    if (this.input.keyboard) {
      for (let i = 0; i < 6; i++) this.input.keyboard.on(`keydown-${['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX'][i]}`, () => this.press(i));
    }

    // stuck? the arrow shows the next switch to press
    idleHint(this, () => (this.state === 'input' ? { x: this.pads[this.seq[this.inputPos]].x, y: this.pads[this.seq[this.inputPos]].y - 70 } : null));

    playIntro(this).then((ok) => ok && this.nextRound());
  }

  makePad(s, i) {
    const col = i % 3, row = Math.floor(i / 3);
    const x = PX + 170 + col * 280, y = PY + 175 + row * 175;
    const color = Phaser.Display.Color.HexStringToColor(s.color || '#4fd1ff').color;
    const c = this.add.container(x, y);
    const glow = this.add.image(0, -8, 'softDot').setDisplaySize(230, 230).setTint(color).setAlpha(0);
    const pad = [
      this.add.circle(0, -4, 58, 0x000000, 0.35),
      this.add.circle(0, -8, 58, 0x161a23).setStrokeStyle(4, 0x8b93a8),
      this.add.circle(0, -8, 44, color),
      this.add.ellipse(-12, -24, 34, 18, 0xffffff)
    ];
    const draw = (lit) => {
      pad[2].setFillStyle(color, lit ? 1 : 0.28);
      pad[3].setFillStyle(0xffffff, lit ? 0.55 : 0.12);
    };
    draw(false);
    const label = txt(this, 0, 64, s.label, { size: 17, weight: 800, color: '#e6ebf5', origin: 0.5, scale: false });
    const key = txt(this, 44, -60, String(i + 1), { size: 14, weight: 800, color: '#8b93a8', origin: 0.5, scale: false });
    c.add([glow, ...pad, label, key]);
    c.setSize(150, 170);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerdown', () => this.press(i));
    c.activate = () => this.press(i);
    c.enabled = true;
    this.focus.add(c);
    c.light = (ms = 320) => {
      draw(true);
      glow.setAlpha(0.7);
      Sfx.note(NOTES[i]);
      this.tweens.add({ targets: c, scale: 1.06, duration: 90, yoyo: true });
      this.time.delayedCall(ms, () => {
        if (!c.active) return;
        draw(false);
        glow.setAlpha(0);
      });
    };
    return c;
  }

  drawDots() {
    const n = this.seq.length;
    this.dots.clear();
    for (let k = 0; k < n; k++) {
      this.dots.fillStyle(k < this.inputPos ? COLORS.green : 0x3a4470, 1);
      this.dots.fillCircle(W / 2 + (k - (n - 1) / 2) * 30, PY + PH + 36, 9);
    }
  }

  nextRound() {
    if (this.round >= this.rounds.length) return this.win();
    const len = this.rounds[this.round];
    while (this.seq.length < len) {
      // no switch twice in a row, so every step is easy to see
      let k;
      do k = Phaser.Math.Between(0, this.pads.length - 1);
      while (k === this.seq[this.seq.length - 1]);
      this.seq.push(k);
    }
    this.round++;
    this.playSequence();
  }

  playSequence() {
    this.state = 'show';
    this.inputPos = 0;
    this.drawDots();
    const count = `${this.T('roundLabel', 'Round')} ${this.round} / ${this.rounds.length}`;
    // (the help is read out the first time; after that the short title is enough)
    this.goal.set(this.T('watchTask', { title: 'Watch the lights!', help: 'Remember the order they light up in.' }), { count, speak: this.round === 1 && !this.watched });
    this.watched = true;
    this.seq.forEach((k, n) => this.time.delayedCall(700 + n * this.stepMs, () => this.pads[k].light(this.stepMs * 0.62)));
    this.time.delayedCall(700 + this.seq.length * this.stepMs + 150, () => {
      if (this.state !== 'show') return;
      this.state = 'input';
      this.goal.set(this.T('copyTask', { title: 'Your turn!', help: 'Press the switches in the same order.' }), { count, speak: this.round === 1 && !this.copied });
      this.copied = true;
    });
  }

  press(i) {
    if (this.state !== 'input' || !this.pads[i]) return;
    this.pads[i].light(260);
    if (this.seq[this.inputPos] === i) {
      this.inputPos++;
      this.drawDots();
      if (this.inputPos >= this.seq.length) {
        this.state = 'between';
        Sfx.play('success');
        floatText(this, W / 2, PY + PH / 2, this.T('roundDone', 'Perfect!'), CSS.green, 54);
        this.time.delayedCall(900, () => this.nextRound());
      }
    } else {
      this.mistakes++;
      this.state = 'between';
      Sfx.play('error');
      if (!this.reducedMotion) this.cameras.main.shake(160, 0.004);
      floatText(this, W / 2, PY + PH / 2, this.T('oops', 'Oops! Watch again.'), CSS.orange, 40);
      Speech.say(this.T('oops', 'Oops! Watch again.'));
      this.time.delayedCall(1100, () => this.playSequence());
    }
  }

  win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    this.time.delayedCall(500, () => finishGame(this, { stars: starsFor(this.mistakes, 0, 2) }));
  }
}
