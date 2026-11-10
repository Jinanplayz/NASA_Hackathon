import { W, COLORS, DEPTH } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { Flow } from '../../core/Flow.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, GoalBar } from '../common/kit.js';
import { Button } from '../../ui/Button.js';
import { toast } from '../../ui/widgets.js';
import { Lab, LAB, finalScore, labContent } from './labState.js';
import { L } from './labKit.js';
import { reportCanvas, savePicture, canSharePicture, sharePicture, CARD_W } from './labReport.js';

// Test Your Knowledge, the finale: the mission report card, with stars, a grade, points, a chart
// of the ship's strengths, the test and flight scores and badges. The card shown is the very
// picture the player can save or share.
let cards = 0;
const SHOW_W = 920; // how wide the card is shown

export class LabReportScene extends BaseScene {
  constructor() {
    super('LabReport');
  }

  create() {
    this.setupStage({ music: 'triumph' });
    starfield(this, { count: 160 });
    Lab.ensureShip();
    this.state = 'intro';
    this.goal = new GoalBar(this);
    this.goal.setVisible(false);
    const fs = finalScore();
    this.fs = fs;
    const R = this.T('labels', {});
    const words = { labels: R, axes: L('axes', {}), place: L(`places.${fs.d.mission}`, fs.d.mission) };
    this.canvas = reportCanvas(fs, Lab.s, words);
    const key = `labReport${++cards}`;
    this.textures.addCanvas(key, this.canvas);
    this.events.once('shutdown', () => this.textures.exists(key) && this.textures.remove(key));
    this.card = this.add.image(W / 2, 380, key).setScale((SHOW_W / CARD_W) * 0.9).setAlpha(0).setDepth(DEPTH.ui - 2);
    // remember the best mission for the menu card
    Lab.keepBest({
      points: fs.points,
      stars: fs.stars,
      grade: fs.grade,
      name: fs.d.name,
      place: `${fs.d.missionName} · ${L(`places.${fs.d.mission}`, fs.d.mission)}`,
      pointsLabel: R.points || 'points',
      design: { ...fs.d }
    });

    // buttons
    const share = canSharePicture();
    const list = [
      { label: R.save || 'Save picture', icon: 'down', variant: 'warn', fn: () => this.save() },
      share && { label: R.share || 'Share', icon: 'next', variant: 'primary', fn: () => this.share() },
      { label: R.again || 'New mission', icon: 'restart', variant: 'secondary', fn: () => this.again() },
      { label: R.continue || 'Continue', icon: 'check', variant: 'success', fn: () => this.finish() }
    ].filter(Boolean);
    const bw = 250, gap = 16;
    this.btns = list.map((b, i) => new Button(this, W / 2 + (i - (list.length - 1) / 2) * (bw + gap), 680, { width: bw, height: 60, size: 20, icon: b.icon, label: b.label, variant: b.variant, onClick: b.fn }).setVisible(false));

    playIntro(this).then((ok) => {
      if (!ok) return;
      this.reveal();
    });
  }

  reveal() {
    this.state = 'show';
    Sfx.play('fanfare');
    this.tweens.add({ targets: this.card, alpha: 1, scale: SHOW_W / CARD_W, duration: 700, ease: 'Back.easeOut' });
    this.time.delayedCall(800, () => {
      this.btns.forEach((b, i) => {
        b.setVisible(true).setAlpha(0);
        this.tweens.add({ targets: b, alpha: 1, duration: 300, delay: i * 90 });
      });
      const t = this.fs.total;
      Speech.say(t >= 80 ? this.T('great', '') : t >= 60 ? this.T('good', '') : this.T('ok', ''));
    });
  }

  async save() {
    if (this.state !== 'show') return;
    const ok = await savePicture(this.canvas, Lab.s.name);
    if (ok) {
      Sfx.play('success');
      toast(this, this.T('saved', 'Saved!'), { y: 600, color: COLORS.green, sound: false, speak: true });
    }
  }

  async share() {
    if (this.state !== 'show') return;
    await sharePicture(this.canvas, Lab.s.name, `${Lab.s.name} · Star Sailors`);
  }

  again() {
    if (this.state !== 'show') return;
    this.state = 'leaving';
    Flow.start(this, LAB, labContent().steps.findIndex((s) => s.type === 'labMission'));
  }

  finish() {
    if (this.state !== 'show') return;
    this.state = 'leaving';
    this.done(this.fs.stars >= 4 ? 3 : this.fs.stars >= 2.5 ? 2 : 1);
  }
}

