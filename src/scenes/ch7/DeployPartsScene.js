import { COLORS, CSS } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame, starsFor, GoalBar, idleHint } from '../common/kit.js';
import { WebbDiagram } from '../common/webbDiagram.js';
import { txt, fitText } from '../../ui/text.js';
import { toast, floatText, roundBox } from '../../ui/widgets.js';

// Unfolding Webb in space took two weeks, one careful step at a time. Follow the checklist:
// each step, tap the part of Webb that has to unfold next.
const ORDER = ['solar', 'antenna', 'pallets', 'tower', 'shield', 'secondary', 'wings'];
const DX = 420, DY = 470, S = 0.78;

export class DeployPartsScene extends BaseScene {
  constructor() {
    super('DeployParts');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 140 });
    this.state = 'intro';
    this.mistakes = 0;
    this.step = 0;
    this.wrongHere = 0;
    this.busy = false;
    this.webb = new WebbDiagram(this, DX, DY, S, 1);
    this.zones = [];
    this.makeZones();

    // the checklist
    const pg = roundBox(this, 790, 176, 450, 490, { fill: COLORS.panel, radius: 18, stroke: COLORS.stroke, strokeWidth: 3 });
    txt(this, 1015, 190, this.T('checklistTitle', 'Unfolding checklist'), { size: 20, weight: 800, color: CSS.yellow, origin: [0.5, 0], scale: false });
    const steps = this.T('steps', []);
    this.lines = ORDER.map((p, i) => {
      const t = txt(this, 812, 228 + i * 42, `${steps[i] ? steps[i].day : ''}  ${steps[i] ? steps[i].task : p}`, { size: 16, weight: 700, color: CSS.dim, scale: false, wrap: 410 });
      fitText(t, 410, 42, 12);
      return t;
    });
    this.factText = txt(this, 812, 530, '', { size: 16, weight: 600, color: CSS.text, scale: false, wrap: 410, lineSpacing: 4 });
    this.goal = new GoalBar(this);
    // keyboard: arrows pick a part, ENTER/SPACE taps it
    this.cursor = -1;
    if (this.input.keyboard) {
      const parts = ['solar', 'antenna', 'sunshield', 'tower', 'secondary', 'wings'];
      const pick = (d) => {
        this.cursor = (this.cursor + d + parts.length) % parts.length;
        this.webb.hi = parts[this.cursor];
        this.webb.draw();
      };
      this.input.keyboard.on('keydown-RIGHT', () => pick(1));
      this.input.keyboard.on('keydown-LEFT', () => pick(-1));
      const go = () => this.cursor >= 0 && this.tapPart(parts[this.cursor]);
      this.input.keyboard.on('keydown-ENTER', go);
      this.input.keyboard.on('keydown-SPACE', go);
    }
    this.showStep();
    // stuck? point at the part that unfolds next
    idleHint(this, () => {
      if (this.state !== 'play' || this.busy) return null;
      const want = ORDER[this.step];
      const a = this.webb.hitAreas().find((k) => k.part === want || (k.part === 'sunshield' && (want === 'pallets' || want === 'shield')));
      return a ? { x: a.x, y: a.y - a.h / 2 } : null;
    }, { delay: 10000 });
    playIntro(this).then((ok) => {
      if (ok) {
        this.state = 'play';
        this.sayStep();
      }
    });
  }

  makeZones() {
    this.zones.forEach((z) => z.destroy());
    this.zones = this.webb.hitAreas().map((a) => {
      const z = this.add.zone(a.x, a.y, a.w, a.h).setInteractive({ useHandCursor: true });
      z.on('pointerup', () => this.tapPart(a.part));
      return z;
    });
  }

  showStep() {
    this.lines.forEach((t, i) => t.setColor(i < this.step ? '#9dffcf' : i === this.step ? CSS.yellow : CSS.dim).setFontStyle(i === this.step ? 'bold' : 'normal'));
  }

  // the task bar shows (and reads) the next step of the checklist
  sayStep() {
    const s = this.T('steps', [])[this.step];
    if (!s) return;
    this.goal.set({ title: s.task, help: this.T('tapHelp', 'Tap that part of Webb to unfold it.') }, { count: `${this.step + 1} / ${ORDER.length}`, speak: false });
    Speech.say(this.step === 0 ? [s.task, this.T('tapHelp', '')] : s.task);
  }

  async tapPart(part) {
    if (this.state !== 'play' || this.busy) return;
    const want = ORDER[this.step];
    const ok = part === want || (part === 'sunshield' && (want === 'pallets' || want === 'shield'));
    const names = this.T('parts', {});
    if (!ok) {
      this.mistakes++;
      this.wrongHere++;
      Sfx.play('error');
      toast(this, this.T('notThatOne', 'Not that part! Look at the checklist and try again.'), { y: 690, color: COLORS.orange, sound: false, speak: true, duration: 2200 });
      // after a wrong tap, the right part lights up
      if (this.wrongHere >= 1) {
        this.webb.hi = want === 'pallets' || want === 'shield' ? 'sunshield' : want;
        this.webb.draw();
      }
      return;
    }
    this.busy = true;
    this.wrongHere = 0;
    this.webb.hi = null;
    Sfx.play('whoosh');
    await this.webb.animate(want, 0, 1300);
    this.busy = false;
    if (this._leaving) return;
    Sfx.play('success');
    floatText(this, DX, 200, '✓', CSS.green, 32);
    const s = this.T('steps', [])[this.step];
    this.factText.setText(s ? s.fact : '');
    if (s && s.fact) Speech.say(s.fact);
    this.step++;
    this.makeZones();
    this.showStep();
    if (this.step >= ORDER.length) return this.win();
    this.time.delayedCall(2600, () => this.state === 'play' && this.sayStep());
  }

  async win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    await new Promise((r) => this.time.delayedCall(1800, r));
    if (this._leaving) return;
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    finishGame(this, { stars: starsFor(this.mistakes, 1, 3) });
  }
}
