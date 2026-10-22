import Phaser from 'phaser';
import { W, COLORS, CSS, DEPTH } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { Slider, drawPanel } from '../../ui/widgets.js';

// Launch window: slide the launch year. Faint "ghost" planets show where Jupiter and Saturn
// will be when Voyager arrives; when both sit on Voyager's path, the window is open (1977).
// Orbit sizes are squeezed so everything fits; the timing uses the real orbital periods.
const C = { x: 460, y: 404 };
const YEAR0 = 1970, YEAR1 = 1990, BEST = 1977;
const PLANETS = [
  { id: 'earth', r: 46, period: 1, size: 0.22, key: 'earthSmall', color: 0x4fb8ff },
  { id: 'jupiter', r: 112, period: 11.86, travel: 1.5, cross: -0.55, size: 0.15, key: 'jupiter', color: 0xd9b48a },
  { id: 'saturn', r: 172, period: 29.46, travel: 3.2, cross: -1.15, size: 0.26, key: 'saturn', color: 0xe8d6a8 },
  { id: 'uranus', r: 232, period: 84, travel: 8.4, cross: -1.95, size: 0.24, key: 'uranus', color: 0x9fe8ee, v2: true },
  { id: 'neptune', r: 290, period: 164.8, travel: 12, cross: -2.6, size: 0.24, key: 'neptune', color: 0x5f8cff, v2: true }
];
const TOL = Phaser.Math.DegToRad(8);

const angleAt = (p, year) => p.cross + ((year - (BEST + (p.travel || 0))) / p.period) * Math.PI * 2;

export class LaunchWindowScene extends BaseScene {
  constructor() {
    super('LaunchWindow');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 160 });
    this.state = 'intro';
    this.tries = 0;
    this.year = YEAR0 + 2;
    const names = this.T('names', {});

    // the Sun and the orbits
    this.add.image(C.x, C.y, 'sun').setScale(0.5 / 2).setDisplaySize(90, 90);
    const g = this.add.graphics();
    PLANETS.forEach((p) => {
      g.lineStyle(2, p.color, p.v2 ? 0.22 : 0.35);
      g.strokeCircle(C.x, C.y, p.r);
    });
    // Voyager's path through the crossing points (Voyager 2's continues to Uranus and Neptune)
    const pathPt = (p) => ({ x: C.x + Math.cos(p.cross) * p.r, y: C.y + Math.sin(p.cross) * p.r });
    const e = PLANETS[0], j = PLANETS[1], s = PLANETS[2], u = PLANETS[3], n = PLANETS[4];
    const start = { x: C.x + Math.cos(0.4) * e.r, y: C.y + Math.sin(0.4) * e.r };
    this.pathV1 = new Phaser.Curves.Spline([new Phaser.Math.Vector2(start.x, start.y), new Phaser.Math.Vector2(pathPt(j).x, pathPt(j).y), new Phaser.Math.Vector2(pathPt(s).x, pathPt(s).y), new Phaser.Math.Vector2(pathPt(s).x + 70, pathPt(s).y - 150)]);
    this.pathV2 = new Phaser.Curves.Spline([new Phaser.Math.Vector2(pathPt(s).x, pathPt(s).y), new Phaser.Math.Vector2(pathPt(u).x, pathPt(u).y), new Phaser.Math.Vector2(pathPt(n).x, pathPt(n).y), new Phaser.Math.Vector2(pathPt(n).x - 120, pathPt(n).y + 60)]);
    const pg = this.add.graphics();
    pg.lineStyle(4, COLORS.yellow, 0.75);
    this.pathV1.draw(pg, 64);
    pg.lineStyle(3, COLORS.cyan, 0.35);
    this.pathV2.draw(pg, 64);
    // crossing points (where each planet must be)
    PLANETS.slice(1).forEach((p) => {
      const q = pathPt(p);
      g.lineStyle(3, p.v2 ? COLORS.cyan : COLORS.yellow, p.v2 ? 0.4 : 0.9);
      g.strokeCircle(q.x, q.y, 16);
    });
    img(this, start.x, start.y, 'earthSmall', 0.22);

    // the planets now, and their ghosts at arrival time
    this.bodies = PLANETS.slice(1).map((p) => {
      const now = img(this, 0, 0, p.key, p.size);
      const ghost = img(this, 0, 0, p.key, p.size).setAlpha(0.45);
      const link = this.add.graphics();
      const okRing = this.add.graphics();
      const lbl = txt(this, 0, 0, names[p.id] || p.id, { size: 14, weight: 700, color: CSS.dim, origin: 0.5, scale: false });
      return { p, now, ghost, link, lbl, okRing };
    });

    // the panel with the year and the slider
    const panel = this.add.graphics();
    drawPanel(panel, 870, 140, 380, 420, { fill: COLORS.panel, radius: 20, stroke: COLORS.cyan, strokeWidth: 3 });
    txt(this, 1060, 166, this.T('yearLabel', 'Launch year'), { size: 18, weight: 800, color: CSS.cyan, origin: [0.5, 0], scale: false });
    this.yearText = txt(this, 1060, 196, '', { size: 64, weight: 800, color: CSS.yellow, origin: [0.5, 0], scale: false });
    this.status = txt(this, 1060, 300, '', { size: 18, weight: 700, origin: [0.5, 0], align: 'center', wrap: 340, scale: false });
    this.slider = new Slider(this, 1060, 400, 300, (this.year - YEAR0) / (YEAR1 - YEAR0), (v) => this.setYear(YEAR0 + v * (YEAR1 - YEAR0)), 80);
    txt(this, 910, 428, String(YEAR0), { size: 14, color: CSS.dim, scale: false });
    txt(this, 1210, 428, String(YEAR1), { size: 14, color: CSS.dim, origin: [1, 0], scale: false });
    txt(this, 1060, 470, this.T('ghostHint', ''), { size: 14, color: CSS.dim, origin: [0.5, 0], align: 'center', wrap: 330, scale: false });
    this.launchBtn = new Button(this, 1060, 620, { width: 300, height: 70, size: 28, label: this.T('launchLabel', 'Launch!'), icon: 'up', variant: 'success', onClick: () => this.launch() });
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-LEFT', () => this.state === 'play' && this.slider.set(Math.max(0, this.slider.value - 1 / 80)));
      this.input.keyboard.on('keydown-RIGHT', () => this.state === 'play' && this.slider.set(Math.min(1, this.slider.value + 1 / 80)));
    }
    this.probe = img(this, start.x, start.y, 'voyager', 0.18).setVisible(false).setDepth(DEPTH.ui);
    this.setYear(this.year);
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  setYear(y) {
    if (this.state !== 'play' && this.state !== 'intro') return;
    this.year = y;
    this.yearText.setText(String(Math.round(y)));
    let good = 0;
    this.bodies.forEach((b) => {
      const { p } = b;
      const a = angleAt(p, y), ga = angleAt(p, y + p.travel);
      b.now.setPosition(C.x + Math.cos(a) * p.r, C.y + Math.sin(a) * p.r);
      b.ghost.setPosition(C.x + Math.cos(ga) * p.r, C.y + Math.sin(ga) * p.r);
      b.lbl.setPosition(b.now.x, b.now.y - 26);
      const off = Math.abs(Phaser.Math.Angle.Wrap(ga - p.cross));
      const ok = off < TOL;
      if (!p.v2 && ok) good++;
      b.ghost.setAlpha(ok ? 0.85 : 0.4);
      b.okRing.clear();
      if (ok) {
        b.okRing.lineStyle(4, COLORS.green, 1);
        b.okRing.strokeCircle(b.ghost.x, b.ghost.y, p.id === 'saturn' ? 34 : 24);
      }
      b.link.clear();
      b.link.lineStyle(2, ok ? COLORS.green : 0x6b7290, 0.6);
      b.link.lineBetween(b.now.x, b.now.y, b.ghost.x, b.ghost.y);
    });
    this.aligned = good === 2;
    this.launchBtn.setEnabled(this.aligned && this.state === 'play');
    if (this.aligned) this.launchBtn.pulse();
    else this.launchBtn.stopPulse();
    this.status.setText(this.aligned ? '✓' : this.T('notYet', 'Not lined up yet.')).setColor(this.aligned ? CSS.green : CSS.dim).setFontSize(this.aligned ? 40 : 18);
  }

  async launch() {
    if (this.state !== 'play' || !this.aligned) return;
    this.state = 'flying';
    this.launchBtn.setEnabled(false).stopPulse();
    Sfx.play('ignition');
    this.probe.setVisible(true);
    // fly Voyager 1's path while the planets move to meet it
    const y0 = this.year;
    await new Promise((resolve) => {
      this.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 5200,
        ease: 'Sine.easeInOut',
        onUpdate: (tw) => {
          const t = tw.getValue();
          const pt = this.pathV1.getPoint(t);
          this.probe.setPosition(pt.x, pt.y);
          this.bodies.forEach((b) => {
            const a = angleAt(b.p, y0 + t * 4);
            b.now.setPosition(C.x + Math.cos(a) * b.p.r, C.y + Math.sin(a) * b.p.r);
            b.lbl.setPosition(b.now.x, b.now.y - 26);
            b.link.clear();
            b.okRing.clear();
          });
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
