import Phaser from 'phaser';
import { COLORS, CSS, DEPTH } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame } from '../common/kit.js';
import { marsBackdrop } from '../common/mars.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { drawPanel, floatText } from '../../ui/widgets.js';

// Curiosity's first birthday on Mars (August 5, 2013): engineers made the SAM instrument
// vibrate at different speeds so it hummed "Happy Birthday". Tap each note as it reaches
// the line, in the right lane (low, middle or high).
const NOTE = { G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, F5: 698, G5: 784 };
const LANE_OF = { G4: 0, A4: 0, B4: 1, C5: 1, D5: 1, E5: 2, F5: 2, G5: 2 };
// [note, beats] in 3/4 time
const SONG = [
  ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
  ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
  ['G4', 0.75], ['G4', 0.25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2],
  ['F5', 0.75], ['F5', 0.25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 3]
];
const LANES = [760, 900, 1040];
const LANE_COL = [COLORS.cyan, COLORS.yellow, COLORS.pink];
const TOP = 110, HIT = 560;
const FALL = 2.1; // seconds from the top to the line

export class SamHumScene extends BaseScene {
  constructor() {
    super('SamHum');
  }

  create() {
    this.setupStage({ bg: 0xb9845c });
    this.state = 'intro';
    this.round = 0;
    this.hits = 0;
    this.misses = 0;
    this.notes = [];
    this.t = 0;
    this.scenery = marsBackdrop(this, 600, { sunX: 160, sunY: 120 });
    this.rover = img(this, 330, 610, 'curiosity', 1.25).setOrigin(0.5, 0.92);
    // SAM glows inside the rover when it hums
    this.samGlow = this.add.image(320, 470, 'softDot').setScale(1.1).setTint(COLORS.yellow).setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    txt(this, 320, 380, 'SAM', { size: 18, weight: 800, color: '#ffffff', origin: 0.5, scale: false, stroke: '#3a1a0a', strokeThickness: 5 });

    // the note track
    const g = this.add.graphics();
    drawPanel(g, 680, 84, 440, 600, { fill: 0x0b1230, radius: 18, stroke: COLORS.stroke, strokeWidth: 3, alpha: 0.92 });
    LANES.forEach((x, i) => {
      g.lineStyle(2, LANE_COL[i], 0.25);
      g.lineBetween(x, TOP, x, HIT + 50);
    });
    g.lineStyle(4, 0xffffff, 0.8);
    g.lineBetween(700, HIT, 1100, HIT);
    this.noteLayer = this.add.container(0, 0);
    const names = this.T('laneNames', ['Low', 'Middle', 'High']);
    this.pads = LANES.map((x, i) => {
      const c = this.add.container(x, HIT + 70);
      const pg = this.add.graphics();
      const draw = (lit) => {
        pg.clear();
        pg.fillStyle(LANE_COL[i], lit ? 1 : 0.35);
        pg.fillRoundedRect(-58, -38, 116, 76, 16);
        pg.lineStyle(3, LANE_COL[i], 1);
        pg.strokeRoundedRect(-58, -38, 116, 76, 16);
      };
      draw(false);
      const t = txt(this, 0, 0, `${names[i]}\n${i + 1}`, { size: 17, weight: 800, color: '#ffffff', origin: 0.5, align: 'center', scale: false, stroke: '#070b1d', strokeThickness: 4 });
      c.add([pg, t]);
      c.setSize(116, 76);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerdown', () => this.press(i));
      c.activate = () => this.press(i);
      c.draw = draw;
      this.focus.add(c);
      return c;
    });
    this.roundText = txt(this, 900, 96, '', { size: 18, weight: 800, color: CSS.yellow, origin: [0.5, 0], scale: false }).setDepth(DEPTH.ui);
    this.scoreText = txt(this, 60, 96, '', { size: 20, weight: 800, color: '#ffffff', scale: false, stroke: '#3a1a0a', strokeThickness: 5 }).setDepth(DEPTH.ui);
    if (this.input.keyboard) {
      ['ONE', 'TWO', 'THREE'].forEach((k, i) => this.input.keyboard.on(`keydown-${k}`, () => this.press(i)));
      this.input.keyboard.on('keydown-LEFT', () => this.press(0));
      this.input.keyboard.on('keydown-DOWN', () => this.press(1));
      this.input.keyboard.on('keydown-RIGHT', () => this.press(2));
    }
    this.updateHud();
    playIntro(this).then((ok) => {
      if (ok) this.startRound(0);
    });
  }

  updateHud() {
    this.scoreText.setText(`${this.T('hitsLabel', 'Notes hummed')}: ${this.hits}`);
  }

  startRound(r) {
    this.round = r;
    const bpm = (this.relaxed ? 72 : 84) - (r === 0 ? 8 : 0);
    const beat = 60 / bpm;
    const song = r === 0 ? SONG.slice(0, 12) : SONG;
    this.roundText.setText(r === 0 ? this.T('practiceLabel', 'Practice: the first two lines') : this.T('songLabel', 'The whole song!'));
    this.noteLayer.removeAll(true);
    let time = 1.2;
    this.notes = song.map(([n, beats]) => {
      const lane = LANE_OF[n];
      const c = this.add.container(LANES[lane], TOP - 40);
      const g = this.add.graphics();
      g.fillStyle(LANE_COL[lane], 1);
      g.fillCircle(0, 0, 22);
      g.lineStyle(3, 0xffffff, 0.9);
      g.strokeCircle(0, 0, 22);
      c.add([g, txt(this, 0, 1, '♪', { size: 24, weight: 800, color: '#070b1d', origin: 0.5, scale: false })]);
      c.setVisible(false);
      this.noteLayer.add(c);
      const note = { n, lane, at: time, len: beats * beat, view: c, done: false };
      time += beats * beat;
      return note;
    });
    this.roundHits = 0;
    this.roundEnd = time + 1;
    this.t = 0;
    this.state = 'play';
  }

  press(lane) {
    if (this.state !== 'play') return;
    const win = this.relaxed ? 0.26 : 0.19;
    this.pads[lane].draw(true);
    this.time.delayedCall(120, () => this.pads[lane].draw(false));
    const note = this.notes.find((n) => !n.done && n.lane === lane && Math.abs(n.at - this.t) < win);
    if (!note) {
      Sfx.play('tick');
      return;
    }
    note.done = true;
    this.hits++;
    this.roundHits++;
    // SAM buzzes the note
    Sfx.note(NOTE[note.n], { type: 'square', vol: 0.05, decay: Math.min(1.2, note.len + 0.15) });
    this.samGlow.setAlpha(0.7);
    this.tweens.add({ targets: this.samGlow, alpha: 0, duration: 400 });
    note.view.destroy();
    floatText(this, 320 + Phaser.Math.Between(-60, 60), 400, '♪', CSS.yellow, 30);
    this.updateHud();
  }

  async endRound() {
    this.state = 'between';
    const total = this.notes.length;
    if (this.round === 0) {
      const r = await this.guide.say(this.T('practiceDone', ''), { modal: true, position: 'top' });
      if (r === null || this._leaving) return;
      this.startRound(1);
      return;
    }
    this.finalScore = this.roundHits / total;
    Sfx.play('bigSuccess');
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    const stars = this.finalScore >= 0.85 ? 3 : this.finalScore >= 0.6 ? 2 : 1;
    finishGame(this, { stars });
  }

  update(time, delta) {
    if (this.state !== 'play') return;
    const dt = Math.min(delta, 50) / 1000;
    this.t += dt;
    const win = this.relaxed ? 0.26 : 0.19;
    this.notes.forEach((n) => {
      if (n.done) return;
      const k = 1 - (n.at - this.t) / FALL;
      n.view.setVisible(k > 0);
      n.view.y = TOP + k * (HIT - TOP);
      // missed: it went past the line
      if (this.t - n.at > win) {
        n.done = true;
        this.misses++;
        this.tweens.add({ targets: n.view, alpha: 0, y: n.view.y + 30, duration: 300, onComplete: () => n.view.destroy() });
      }
    });
    if (this.t > this.roundEnd) this.endRound();
  }
}
