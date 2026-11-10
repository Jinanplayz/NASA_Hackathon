import { W, COLORS, CSS, DEPTH } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, GoalBar, idleHint } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt, fitText } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { RoundBox, toast } from '../../ui/widgets.js';
import { drawIcon } from '../../ui/icons.js';
import { Lab, MISSIONS } from './labState.js';
import { missionInfo, L } from './labKit.js';

// Test Your Knowledge, step 1: pick where to go. Each destination needs a different ship, which
// the player finds out by building, testing and flying it.
const CW = 360, CH = 400, GAP = 26, CY = 400;
const ART = { moon: ['moon', 0.5], mars: ['mars', 0.3], jupiter: ['jupiter', 0.3] };

export class LabMissionScene extends BaseScene {
  constructor() {
    super('LabMission');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 180 });
    this.state = 'intro';
    this.choice = null;
    this.goal = new GoalBar(this);
    this.cards = MISSIONS.map((m, i) => this.makeCard(m, W / 2 + (i - 1) * (CW + GAP), CY));
    this.chooseBtn = new Button(this, W / 2, 660, { width: 380, height: 64, size: 24, icon: 'check', label: this.T('labels', {}).choose || 'Choose this mission', variant: 'success', onClick: () => this.confirm() });
    this.chooseBtn.setEnabled(false);
    idleHint(this, () => {
      if (this.state !== 'pick') return null;
      if (!this.choice) return { x: this.cards[1].x, y: CY - CH / 2 - 10 };
      return { x: this.chooseBtn.x, y: this.chooseBtn.y - 42 };
    });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'pick';
      this.goal.set(this.T('task', { title: 'Choose your mission!', help: 'Tap a card to learn about it. Then press Choose this mission.' }));
    });
  }

  makeCard(m, x, y) {
    const info = missionInfo(m);
    const labels = this.T('labels', {});
    const c = this.add.container(x, y).setDepth(DEPTH.ui - 1);
    c.box = new RoundBox(this);
    c.add(c.box);
    // the destination, glowing in its art window
    const art = this.add.graphics();
    art.fillStyle(0x070b1d, 1);
    art.fillRoundedRect(-CW / 2 + 14, -CH / 2 + 14, CW - 28, 170, 16);
    c.add(art);
    const [key, sc] = ART[m];
    const glow = this.add.image(0, -CH / 2 + 99, 'softDot').setDisplaySize(220, 220).setTint(m === 'mars' ? 0xff7a45 : m === 'jupiter' ? 0xffc890 : 0xcfd6ff).setAlpha(0.35);
    const planet = img(this, 0, -CH / 2 + 99, key, sc);
    c.add([glow, planet]);
    if (!this.reducedMotion) this.tweens.add({ targets: planet, angle: 360, duration: 80000, repeat: -1 });
    const name = txt(this, -CW / 2 + 22, -CH / 2 + 198, info.name || m, { size: 26, weight: 800, scale: false, wrap: CW - 44 });
    fitText(name, CW - 44, 36, 16);
    const brief = txt(this, -CW / 2 + 22, -CH / 2 + 236, info.brief || '', { size: 16, color: CSS.dim, scale: false, wrap: CW - 44, lineSpacing: 3 });
    fitText(brief, CW - 44, 70, 12);
    c.add([name, brief]);
    // facts: who flies, how far, how long, and how hard
    const il = info.labels || {};
    const facts = [
      [il.who === 'crew' ? labels.crewed || 'Astronauts on board' : labels.robotic || 'Robot explorer', il.who === 'crew' ? CSS.orange : CSS.cyan],
      [`${labels.distance || 'Distance'}: ${il.distance || ''}`, CSS.text],
      [`${labels.trip || 'Trip'}: ${il.trip || ''}`, CSS.text]
    ];
    facts.forEach(([t, color], i) => c.add(txt(this, -CW / 2 + 22, CH / 2 - 92 + i * 22, t, { size: 15, weight: 700, color, scale: false })));
    const stars = this.add.graphics();
    c.add(txt(this, CW / 2 - 22, CH / 2 - 92, labels.difficulty || 'Difficulty', { size: 13, weight: 700, color: CSS.dim, origin: [1, 0], scale: false }));
    for (let i = 0; i < 3; i++) drawIcon(stars, 'star', CW / 2 - 34 - (2 - i) * 24, CH / 2 - 52, 20, i < (info.stars || 1) ? COLORS.yellow : 0x2a3566);
    c.add(stars);
    c.mission = m;
    c.setSize(CW, CH).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => this.pick(c));
    c.activate = () => this.pick(c);
    c.enabled = true;
    this.focus.add(c);
    this.drawCard(c, false);
    c.setAlpha(0);
    this.tweens.add({ targets: c, alpha: 1, duration: 300, delay: 120 * MISSIONS.indexOf(m) });
    return c;
  }

  drawCard(c, on) {
    c.box.draw(-CW / 2, -CH / 2, CW, CH, { fill: on ? 0x1b3a6b : COLORS.panel, alpha: 1, radius: 22, stroke: on ? COLORS.yellow : COLORS.stroke, strokeWidth: on ? 5 : 3, shadowY: 6 });
  }

  pick(c) {
    if (this.state !== 'pick') return;
    this.choice = c.mission;
    Sfx.play('select');
    this.cards.forEach((k) => {
      this.drawCard(k, k === c);
      k.setScale(k === c ? 1.03 : 1);
    });
    this.chooseBtn.setEnabled(true);
    if (!this.reducedMotion) this.chooseBtn.pulse();
    const info = missionInfo(c.mission);
    Speech.say([info.name, info.brief]);
  }

  confirm() {
    if (this.state !== 'pick' || !this.choice) return;
    this.state = 'done';
    this.chooseBtn.stopPulse().setEnabled(false);
    Lab.start(this.choice, this.T('startCredits', 12));
    Sfx.play('bigSuccess');
    toast(this, `+${Lab.s.credits} ${L('credits', 'Credits')}`, { y: 640, color: COLORS.yellow, sound: false, duration: 2600 });
    this.guide.say(this.T('chosen', ''), { modal: true }).then(() => this.done(3));
  }
}
