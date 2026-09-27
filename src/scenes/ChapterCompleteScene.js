import { W, COLORS, CSS } from '../core/constants.js';
import { Content } from '../core/Content.js';
import { Progress } from '../core/Progress.js';
import { Flow } from '../core/Flow.js';
import { Sfx } from '../core/Sfx.js';
import { BaseScene } from './BaseScene.js';
import { starfield } from './common/bg.js';
import { txt } from '../ui/text.js';
import { Button } from '../ui/Button.js';
import { drawPanel } from '../ui/widgets.js';
import { drawIcon, starPoints } from '../ui/icons.js';

// Celebration screen at the end of a chapter.
export class ChapterCompleteScene extends BaseScene {
  constructor() {
    super('ChapterComplete');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 200 });
    Progress.completeStep(this.chapterId, this.stepIndex);
    Progress.completeChapter(this.chapterId);
    Sfx.play('fanfare');

    // confetti
    const confetti = this.add.particles(0, -20, 'dot', {
      x: { min: 0, max: W },
      speedY: { min: 120, max: 260 },
      speedX: { min: -60, max: 60 },
      rotate: { min: 0, max: 360 },
      lifespan: 4000,
      scale: { start: 0.9, end: 0.6 },
      tint: [0xffd166, 0x4fd1ff, 0xff7eb6, 0x3ddc97, 0xff9f43],
      frequency: this.reducedMotion ? 200 : 40
    });
    this.time.delayedCall(3500, () => (confetti.emitting = false));

    // badge
    const bx = 330, by = 380;
    const badge = this.add.container(bx, by);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillCircle(0, 8, 150);
    g.fillStyle(COLORS.yellow, 1);
    g.fillPoints(starPoints(0, 0, 160, 128, 16), true);
    g.fillStyle(0x1b275a, 1);
    g.fillCircle(0, 0, 118);
    g.lineStyle(6, COLORS.yellow, 1);
    g.strokeCircle(0, 0, 106);
    g.fillStyle(COLORS.yellow, 1);
    g.fillPoints(starPoints(0, -40, 34, 15, 5), true);
    badge.add(g);
    badge.add(txt(this, 0, 18, this.T('badge', 'Badge'), { size: 26, weight: 800, origin: 0.5, align: 'center', wrap: 190, scale: false }));
    badge.add(txt(this, 0, 62, (Content.chapter(this.chapterId)?._meta?.label || '').toUpperCase(), { size: 14, weight: 700, origin: 0.5, color: CSS.cyan, scale: false }));
    badge.setScale(0.2).setAngle(-30);
    this.tweens.add({ targets: badge, scale: 1, angle: 0, duration: 900, ease: 'Back.easeOut' });
    this.tweens.add({ targets: badge, y: by - 10, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 900 });

    // summary
    const px = 560, py = 110, pw = 680, ph = 420;
    const pg = this.add.graphics();
    drawPanel(pg, px, py, pw, ph, { fill: COLORS.panel, stroke: COLORS.green, strokeWidth: 3, radius: 24 });
    txt(this, px + 32, py + 28, this.T('title', Content.ui('chapterComplete', 'Chapter complete!')), { size: 38, weight: 800, color: CSS.yellow, scale: false });
    let y = py + 100;
    this.T('lines', []).forEach((line, i) => {
      const ic = this.add.graphics();
      ic.fillStyle(COLORS.green, 1);
      ic.fillCircle(px + 50, y + 16, 16);
      drawIcon(ic, 'check', px + 50, y + 16, 20, COLORS.bg);
      const t = txt(this, px + 80, y, line, { size: 22, wrap: pw - 120 });
      [ic, t].forEach((o) => {
        o.setAlpha(0);
        this.tweens.add({ targets: o, alpha: 1, duration: 300, delay: 700 + i * 350 });
      });
      y += Math.max(44, t.height + 16);
    });

    const next = Flow.nextChapterId(this.chapterId);
    const buttons = [];
    buttons.push(new Button(this, px + 170, py + ph - 56, { width: 280, height: 64, label: Content.ui('backToMenu', 'Chapter menu'), icon: 'menu', variant: 'secondary', onClick: () => Flow.chapters(this) }));
    if (next) {
      buttons.push(new Button(this, px + pw - 170, py + ph - 56, { width: 280, height: 64, label: Content.ui('nextChapter', 'Next chapter'), icon: 'next', variant: 'success', onClick: () => Flow.start(this, next, 0) }).pulse());
    } else {
      buttons.push(new Button(this, px + pw - 170, py + ph - 56, { width: 280, height: 64, label: Content.ui('home', 'Home'), icon: 'home', variant: 'success', onClick: () => Flow.home(this) }));
    }

    const guideLine = this.T('guide', next ? '' : Content.ui('allDone', ''));
    if (guideLine) this.time.delayedCall(1600, () => this.guide.say(guideLine, { next: false, width: 1000 }));
  }
}
