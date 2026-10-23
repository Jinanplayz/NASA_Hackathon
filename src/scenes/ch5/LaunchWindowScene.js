import Phaser from 'phaser';
import { COLORS, CSS, DEPTH } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame, GoalBar, idleHint } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { Slider, roundBox } from '../../ui/widgets.js';

// Launch window: slide the launch year. Jupiter and Saturn are shown where they will be when
// Voyager gets to them; when both sit in the yellow circles on Voyager's path, the window is
// open (1977). Orbit sizes are squeezed so everything fits; the timing uses the real orbital
// periods.
const C = { x: 450, y: 420 };
const YEAR0 = 1970, YEAR1 = 1990, BEST = 1977;
const PLANETS = [
  { id: 'jupiter', r: 150, period: 11.86, travel: 1.5, cross: -0.55, size: 0.2, key: 'jupiter', color: 0xd9b48a },
  { id: 'saturn', r: 234, period: 29.46, travel: 3.2, cross: -1.15, size: 0.34, key: 'saturn', color: 0xe8d6a8 }
];
const EARTH_R = 62;
const TOL = Phaser.Math.DegToRad(8);

// where a planet is (as an angle around the Sun) in a given year
const angleAt = (p, year) => p.cross + ((year - (BEST + p.travel)) / p.period) * Math.PI * 2;

export class LaunchWindowScene extends BaseScene {
  constructor() {
    super('LaunchWindow');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 160 });
    this.state = 'intro';
    this.year = YEAR0 + 2;
    const names = this.T('names', {});
    this.goal = new GoalBar(this);

    // the Sun and the orbits
    this.add.image(C.x, C.y, 'sun').setDisplaySize(96, 96);
    const g = this.add.graphics();
    g.lineStyle(2, 0x4fb8ff, 0.35);
    g.strokeCircle(C.x, C.y, EARTH_R);
    PLANETS.forEach((p) => {
      g.lineStyle(2, p.color, 0.4);
      g.strokeCircle(C.x, C.y, p.r);
    });
    // Voyager's path, through the two meeting points
    const pathPt = (p) => ({ x: C.x + Math.cos(p.cross) * p.r, y: C.y + Math.sin(p.cross) * p.r });
    const j = pathPt(PLANETS[0]), s = pathPt(PLANETS[1]);
    const start = { x: C.x + Math.cos(0.4) * EARTH_R, y: C.y + Math.sin(0.4) * EARTH_R };
    this.path = new Phaser.Curves.Spline([new Phaser.Math.Vector2(start.x, start.y), new Phaser.Math.Vector2(j.x, j.y), new Phaser.Math.Vector2(s.x, s.y), new Phaser.Math.Vector2(s.x + 180, s.y - 26)]);
    const pg = this.add.graphics();
    pg.lineStyle(5, COLORS.yellow, 0.8);
    this.path.draw(pg, 64);
    // the meeting points: each planet must be here when Voyager arrives
    this.targets = PLANETS.map((p) => {
      const q = pathPt(p);
      const ring = this.add.circle(q.x, q.y, p.id === 'saturn' ? 40 : 28).setStrokeStyle(4, COLORS.yellow, 0.95);
      this.tweens.add({ targets: ring, scale: 1.12, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return { ...q, ring };
    });
    img(this, start.x, start.y, 'earthSmall', 0.26);
    txt(this, start.x + 18, start.y + 24, names.earth || 'Earth', { size: 15, weight: 700, color: CSS.cyan, scale: false });

    // Jupiter and Saturn, shown where they'll be when Voyager reaches them
    this.bodies = PLANETS.map((p) => {
      const body = img(this, 0, 0, p.key, p.size);
      const lbl = txt(this, 0, 0, names[p.id] || p.id, { size: 17, weight: 800, origin: 0.5, scale: false, stroke: '#070b1d', strokeThickness: 5 });
      const okRing = this.add.graphics();
      return { p, body, lbl, okRing, ok: false };
    });

    // the panel with the year and the slider
    const panel = roundBox(this, 850, 178, 400, 380, { fill: COLORS.panel, radius: 20, stroke: COLORS.cyan, strokeWidth: 3 });
    txt(this, 1050, 198, this.T('yearLabel', 'Launch year'), { size: 20, weight: 800, color: CSS.cyan, origin: [0.5, 0], scale: false });
    this.yearText = txt(this, 1050, 226, '', { size: 66, weight: 800, color: CSS.yellow, origin: [0.5, 0], scale: false });
    this.checks = PLANETS.map((p, i) => txt(this, 900 + i * 180, 330, '', { size: 21, weight: 800, scale: false }));
    this.slider = new Slider(this, 1050, 420, 320, (this.year - YEAR0) / (YEAR1 - YEAR0), (v) => this.setYear(YEAR0 + v * (YEAR1 - YEAR0)), 80);
    txt(this, 890, 450, String(YEAR0), { size: 15, color: CSS.dim, scale: false });
    txt(this, 1210, 450, String(YEAR1), { size: 15, color: CSS.dim, origin: [1, 0], scale: false });
    this.launchBtn = new Button(this, 1050, 626, { width: 320, height: 76, size: 30, label: this.T('launchLabel', 'Launch!'), icon: 'up', variant: 'success', onClick: () => this.launch() });
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-LEFT', () => this.state === 'play' && this.slider.set(Math.max(0, this.slider.value - 1 / 80)));
      this.input.keyboard.on('keydown-RIGHT', () => this.state === 'play' && this.slider.set(Math.min(1, this.slider.value + 1 / 80)));
    }
    this.probe = img(this, start.x, start.y, 'voyager', 0.2).setVisible(false).setDepth(DEPTH.ui);
    this.setYear(this.year);
    // stuck? point at the slider knob, or at Launch once the planets line up
    idleHint(this, () => {
      if (this.state !== 'play') return null;
      if (this.aligned) return { x: this.launchBtn.x, y: this.launchBtn.y - 42 };
      return { x: this.slider.x - this.slider.w / 2 + this.slider.w * this.slider.value, y: 400 };
    }, { delay: 7000 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'play';
      this.setYear(this.year);
      this.goal.set(this.T('task', { title: 'Line up the planets!', help: 'Slide the year until Jupiter and Saturn sit in the yellow circles.' }));
    });
  }

  setYear(y) {
    if (this.state !== 'play' && this.state !== 'intro') return;
    this.year = y;
    this.yearText.setText(String(Math.round(y)));
    const names = this.T('names', {});
    let good = 0;
    this.bodies.forEach((b, i) => {
      const { p } = b;
      const a = angleAt(p, y + p.travel);
      b.body.setPosition(C.x + Math.cos(a) * p.r, C.y + Math.sin(a) * p.r);
      b.lbl.setPosition(b.body.x, b.body.y - (p.id === 'saturn' ? 44 : 34));
      const ok = Math.abs(Phaser.Math.Angle.Wrap(a - p.cross)) < TOL;
      if (ok) good++;
      if (ok && !b.ok && this.state === 'play') Sfx.play('chime');
      b.ok = ok;
      b.okRing.clear();
      if (ok) {
        b.okRing.lineStyle(5, COLORS.green, 1);
        b.okRing.strokeCircle(b.body.x, b.body.y, p.id === 'saturn' ? 42 : 30);
      }
      this.checks[i].setText(`${ok ? '✓' : '•'} ${names[p.id] || p.id}`).setColor(ok ? CSS.green : CSS.dim);
    });
    const was = this.aligned;
    this.aligned = good === PLANETS.length;
    this.launchBtn.setEnabled(this.aligned && this.state === 'play');
    if (this.aligned) this.launchBtn.pulse();
    else this.launchBtn.stopPulse();
    if (this.aligned && !was && this.state === 'play') this.goal.set(this.T('readyTask', { title: 'Lined up!', help: 'Press Launch!' }));
    else if (!this.aligned && was && this.state === 'play') this.goal.set(this.T('task', { title: 'Line up the planets!' }), { speak: false });
  }

  async launch() {
    if (this.state !== 'play' || !this.aligned) return;
    this.state = 'flying';
    this.launchBtn.setEnabled(false).stopPulse();
    Sfx.play('ignition');
    this.probe.setVisible(true);
    this.targets.forEach((t) => t.ring.setVisible(false));
    // fly Voyager 1's path: the planets are waiting at the meeting points
    await new Promise((resolve) => {
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 5200,
        ease: 'Sine.easeInOut',
        onUpdate: (tw) => {
          const pt = this.path.getPoint(tw.getValue());
          this.probe.setPosition(pt.x, pt.y);
        },
        onComplete: resolve
      });
    });
    if (this._leaving) return;
    Sfx.play('bigSuccess');
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    finishGame(this, { stars: 3 });
  }
}
