import { W, COLORS, CSS, DEPTH, shuffle } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, GoalBar, idleHint } from '../common/kit.js';
import { txt, fitText } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { RoundBox, dialog, shake } from '../../ui/widgets.js';
import { Content } from '../../core/Content.js';
import { Lab, labContent } from './labState.js';
import { CreditsPill } from './labKit.js';

// Test Your Knowledge: a round of questions about the chapters. A right answer earns credits to
// spend on parts (2 the first time, 1 after a clue). The answer is never given away: after two
// misses the player is told which chapter holds it, and it comes back as a bonus question.
const shared = () => labContent().quizShared || {};
const SL = (k, f) => (shared().labels || {})[k] || f;

// One question on screen, with its answer buttons. onDone('first' | 'second' | 'missed').
export class QuizCard {
  constructor(scene, q, { y = 186, depth = DEPTH.ui, onDone } = {}) {
    this.scene = scene;
    this.q = q;
    this.onDone = onDone;
    this.tries = 0;
    this.over = false;
    this.root = scene.add.container(0, 0).setDepth(depth);
    const pw = 1000, px = W / 2 - pw / 2;
    this.root.add(new RoundBox(scene).draw(px, y, pw, 130, { fill: 0x0e1840, alpha: 0.96, radius: 20, stroke: COLORS.cyan, strokeWidth: 3 }));
    const qt = txt(scene, W / 2, y + 65, q.q, { size: 29, weight: 800, origin: 0.5, align: 'center', wrap: pw - 60, scale: false });
    fitText(qt, pw - 60, 112, 18);
    this.root.add(qt);
    this.clue = txt(scene, W / 2, y + 154, '', { size: 19, weight: 700, color: CSS.yellow, origin: 0.5, align: 'center', wrap: pw - 40, scale: false });
    this.root.add(this.clue);
    // the options, in a random order
    this.options = shuffle(q.options.map((text, i) => ({ text, right: i === (q.answer ?? 0) })));
    const gap = 68, top = y + 202;
    this.buttons = this.options.map((o, i) => {
      const b = new Button(scene, W / 2, top + i * gap, { width: 860, height: 56, size: 22, label: `${'ABCD'[i]}.  ${o.text}`, variant: 'secondary', radius: 18, onClick: () => this.answer(b) });
      b.option = o;
      b.setDepth(depth + 1);
      return b;
    });
    if (scene.input.keyboard) {
      // number keys 1-4 pick an answer too
      this.keyFn = (e) => {
        const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
        if (i >= 0 && this.buttons[i]) this.answer(this.buttons[i]);
      };
      scene.input.keyboard.on('keydown', this.keyFn);
    }
    this.root.setAlpha(0);
    scene.tweens.add({ targets: this.root, alpha: 1, duration: 250 });
    this.buttons.forEach((b, i) => {
      b.setAlpha(0);
      scene.tweens.add({ targets: b, alpha: 1, duration: 250, delay: 80 + i * 70 });
    });
  }

  read() {
    return Speech.say([this.q.q, ...this.options.map((o) => o.text)]);
  }

  answer(b) {
    if (this.over || !b.enabled || this.scene.guide.visible) return;
    this.tries++;
    if (b.option.right) {
      this.over = true;
      b.setVariant('success');
      Sfx.play('success');
      this.buttons.forEach((x) => x !== b && x.setEnabled(false));
      const right = shared().right || ['Correct!'];
      this.clue.setText('').setColor(CSS.green);
      Speech.say(right[Math.floor(Math.random() * right.length)]);
      this.scene.tweens.add({ targets: b, scale: 1.05, duration: 140, yoyo: true });
      this.scene.time.delayedCall(1300, () => this.finish(this.tries === 1 ? 'first' : 'second'));
      return;
    }
    Sfx.play('error');
    b.setVariant('danger').setEnabled(false);
    shake(this.scene, b, 8);
    if (this.tries === 1) {
      this.clue.setText(`${shared().wrong || 'Not quite. Here is a clue:'} ${this.q.nudge || ''}`);
      Speech.say([shared().wrong || 'Not quite. Here is a clue:', this.q.nudge || '']);
      return;
    }
    // two misses: no answer given away (every button goes plain), just where to find it
    this.over = true;
    this.buttons.forEach((x) => x.setVariant('secondary').setEnabled(false));
    this.clue.setText(`${SL('where', 'Look in')}: ${this.q.where || ''}`).setColor(CSS.cyan);
    Speech.say([shared().gaveUp || '', this.q.where || '']);
    this.scene.time.delayedCall(700, () => {
      const y = Math.min(684, this.buttons[this.buttons.length - 1].y + 72);
      this.nextBtn = new Button(this.scene, W / 2, y, { width: 300, height: 56, size: 22, icon: 'next', label: SL('next', 'Next question'), onClick: () => this.finish('missed') });
      this.nextBtn.setDepth(this.root.depth + 2);
    });
  }

  finish(result) {
    if (this.finished) return;
    this.finished = true;
    this.onDone && this.onDone(result);
  }

  destroy() {
    if (this.keyFn) this.scene.input.keyboard.off('keydown', this.keyFn);
    this.buttons.forEach((b) => b.destroy());
    if (this.nextBtn) this.nextBtn.destroy();
    this.root.destroy();
  }
}

export class LabQuizScene extends BaseScene {
  constructor() {
    super('LabQuiz');
  }

  create() {
    this.setupStage({ music: 'lab' });
    starfield(this, { count: 140 });
    this.state = 'intro';
    this.earned = 0;
    this.firstTry = 0;
    // questions not yet answered right (so replaying a round can't earn the same credits twice)
    const pool = this.T('questions', []);
    const fresh = pool.filter((q) => !Lab.answered(q.id).ok);
    this.list = shuffle(fresh).slice(0, Math.min(this.T('count', 8), fresh.length));
    this.index = 0;
    this.goal = new GoalBar(this);
    this.credits = new CreditsPill(this, W - 120, 664);
    idleHint(this, () => (this.state === 'ask' && this.card && !this.card.over ? { x: this.card.buttons[0].x - 300, y: this.card.buttons[0].y - 34 } : null), { delay: 14000 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      if (!this.list.length) return this.end();
      this.ask();
    });
  }

  ask() {
    this.state = 'ask';
    const q = this.list[this.index];
    const task = this.T('task', { title: 'Quiz', help: '' });
    this.goal.set({ title: task.title, help: task.help }, { speak: false, count: `${SL('question', 'Question')} ${this.index + 1} ${SL('of', 'of')} ${this.list.length}` });
    this.card = new QuizCard(this, q, { onDone: (r) => this.answered(q, r) });
    this.card.read();
  }

  answered(q, result) {
    Lab.recordAnswer(q.id, result !== 'missed', result === 'first' ? 1 : 2);
    // 2 credits for a first-try answer, 1 after a clue
    const gain = result === 'first' ? 2 : result === 'second' ? 1 : 0;
    if (result === 'first') this.firstTry++;
    if (gain) {
      Lab.earn(gain);
      this.earned += gain;
      this.credits.refresh();
    }
    const card = this.card;
    this.tweens.add({ targets: card.root, alpha: 0, duration: 200 });
    card.buttons.forEach((b) => this.tweens.add({ targets: b, alpha: 0, duration: 200 }));
    this.time.delayedCall(240, () => {
      card.destroy();
      this.index++;
      if (this.index < this.list.length) this.ask();
      else this.end();
    });
  }

  end() {
    this.state = 'done';
    Speech.stop();
    const n = this.list.length || 1;
    const stars = this.firstTry >= n - 1 ? 3 : this.firstTry >= n / 2 ? 2 : 1;
    const title = this.T('resultTitle', 'Round complete!');
    const text = this.T('resultText', '');
    dialog(this, {
      title,
      text: `${text}\n\n+${this.earned} ${SL('credits', 'credits')}`,
      stars,
      speak: [title, text],
      buttons: [{ label: Content.ui('continue', 'Continue'), value: 'next', icon: 'next' }]
    }).then(() => this.done(stars));
  }
}
