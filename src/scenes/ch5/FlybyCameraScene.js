import Phaser from 'phaser';
import { W, H, FULL, COLORS, CSS, DEPTH, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { toast, floatText } from '../../ui/widgets.js';

// Jupiter flyby photographer: Jupiter, its ring and four big moons sweep past. Steer the
// camera frame (it moves a bit slowly, like Voyager's scan platform) and press SNAP when a
// target is inside it.
const FW = 190, FH = 140; // camera frame
const FILM_Y = 650;

export class FlybyCameraScene extends BaseScene {
  constructor() {
    super('FlybyCamera');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 170 });
    this.state = 'intro';
    this.snaps = 0;
    this.misses = 0;
    this.got = new Set();
    this.speed = this.relaxed ? 58 : 78; // how fast the scene sweeps past (px per second)
    this.goal = this.relaxed ? this.T('relaxedGoal', 4) : this.T('goal', 5);
    this.cfgTargets = Object.fromEntries(this.T('targets', []).map((t) => [t.id, t]));

    // the world that sweeps past (everything moves left together)
    this.world = this.add.container(0, 0);
    const jx = 980, jy = 330;
    this.jupiter = img(this, jx, jy, 'jupiterBig', 0.72);
    const ring = this.add.graphics();
    ring.lineStyle(3, 0xd9c7a8, 0.3);
    ring.strokeEllipse(jx, jy, 760, 70);
    this.world.add([ring, this.jupiter]);
    const r = 640 * 0.72 * 0.47;
    const moons = [
      ['io', 1560, 220, 0.62],
      ['europa', 2060, 470, 0.55],
      ['ganymede', 2620, 260, 0.78],
      ['callisto', 3180, 430, 0.7]
    ];
    this.targets = [
      { id: 'grs', obj: this.jupiter, dx: r * 0.3, dy: r * 0.32 },
      { id: 'ring', obj: this.jupiter, dx: -372, dy: 4 },
      ...moons.map(([id, x, y, s]) => {
        const m = img(this, x, y, id, s);
        this.world.add(m);
        return { id, obj: m, dx: 0, dy: 0 };
      })
    ];
    this.worldEnd = 3180 + 120;

    // the camera frame
    this.frame = { x: W / 2 - 200, y: H / 2 - 40 };
    this.aim = { x: this.frame.x, y: this.frame.y };
    this.frameG = this.add.graphics().setDepth(DEPTH.ui);
    this.flash = this.add.rectangle(W / 2, H / 2, FULL.w, FULL.h, 0xffffff, 0).setDepth(DEPTH.ui + 10);

    // film strip of photos taken
    this.film = this.add.graphics().setDepth(DEPTH.ui);
    this.filmLabel = txt(this, 30, FILM_Y - 44, this.T('filmLabel', 'Photos'), { size: 15, weight: 800, color: CSS.yellow, scale: false }).setDepth(DEPTH.ui);
    this.thumbs = this.add.container(0, 0).setDepth(DEPTH.ui + 1);
    this.drawFilm();

    this.snapBtn = new Button(this, W - 150, FILM_Y, { width: 220, height: 70, size: 28, label: this.T('snapLabel', 'SNAP!'), icon: 'star', variant: 'warn', sound: null, onClick: () => this.snap() }).setDepth(DEPTH.ui + 2);

    this.input.on('pointermove', (p) => {
      if (p.worldY < FILM_Y - 60) this.aim = { x: p.worldX, y: p.worldY };
    });
    this.input.on('pointerdown', (p, over) => {
      if (!over.length && p.worldY < FILM_Y - 60) this.aim = { x: p.worldX, y: p.worldY };
    });
    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys('UP,DOWN,LEFT,RIGHT');
      this.input.keyboard.on('keydown-SPACE', () => this.snap());
    }
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  targetPos(t) {
    return { x: this.world.x + t.obj.x + t.dx, y: t.obj.y + t.dy };
  }

  drawFilm() {
    const g = this.film;
    g.clear();
    g.fillStyle(0x1d2029, 0.95);
    g.fillRoundedRect(20, FILM_Y - 32, 6 * 96 + 24, 64, 10);
    for (let i = 0; i < 6; i++) {
      g.fillStyle(i < this.got.size ? 0x3a4470 : 0x10131c, 1);
      g.fillRect(32 + i * 96, FILM_Y - 24, 84, 48);
    }
    g.fillStyle(0x0b0d14, 1);
    for (let i = 0; i < 26; i++) {
      g.fillRect(28 + i * 23, FILM_Y - 31, 10, 5);
      g.fillRect(28 + i * 23, FILM_Y + 26, 10, 5);
    }
  }

  snap() {
    if (this.state !== 'play') return;
    Sfx.play('snap');
    this.flash.setAlpha(0.6);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 250 });
    const fx = this.frame.x, fy = this.frame.y;
    const hit = this.targets.find((t) => {
      if (this.got.has(t.id)) return false;
      const p = this.targetPos(t);
      return Math.abs(p.x - fx) < FW / 2 - 6 && Math.abs(p.y - fy) < FH / 2 - 6;
    });
    if (!hit) {
      this.misses++;
      toast(this, this.T('missed', 'Missed it!'), { y: 100, color: COLORS.orange, sound: false, duration: 1600 });
      return;
    }
    this.got.add(hit.id);
    Sfx.play('success');
    const info = this.cfgTargets[hit.id] || { name: hit.id, fact: '' };
    // a little copy of the photo on the film strip
    const i = this.got.size - 1;
    const key = hit.id === 'grs' || hit.id === 'ring' ? 'jupiter' : hit.id;
    const th = img(this, 74 + i * 96, FILM_Y, key, hit.id === 'grs' || hit.id === 'ring' ? 0.15 : 0.36);
    this.thumbs.add(th);
    this.drawFilm();
    floatText(this, fx, fy - FH / 2 - 10, info.name, CSS.yellow, 24);
    toast(this, `${info.name}: ${info.fact}`, { y: 100, sound: false, duration: 3600 });
    Speech.say([info.name, info.fact]);
    if (this.got.size >= this.targets.length) this.end();
  }

  async end() {
    if (this.state !== 'play') return;
    this.state = 'over';
    if (this.got.size >= this.goal) {
      Sfx.play('bigSuccess');
      const stars = this.got.size >= 6 && this.misses <= 2 ? 3 : this.got.size >= 5 ? 2 : 1;
      finishGame(this, { stars });
    } else {
      Sfx.play('error');
      const r = await this.guide.say(this.T('notEnough', '').replace('{n}', this.got.size), { modal: true, position: 'top', nextLabel: 'OK' });
      if (r !== null) this.scene.restart(this.payload);
    }
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    if (this.state === 'play') {
      this.world.x -= this.speed * dt;
      if (this.world.x < -this.worldEnd) this.end();
    }
    // the camera platform turns towards where the player points, at a limited speed
    if (this.keys) {
      const k = this.keys;
      const step = 420 * dt;
      if (k.LEFT.isDown) this.aim.x -= step;
      if (k.RIGHT.isDown) this.aim.x += step;
      if (k.UP.isDown) this.aim.y -= step;
      if (k.DOWN.isDown) this.aim.y += step;
    }
    this.aim.x = clamp(this.aim.x, FW / 2, W - FW / 2);
    this.aim.y = clamp(this.aim.y, 90 + FH / 2, FILM_Y - 60 - FH / 2);
    const max = (this.relaxed ? 900 : 650) * dt;
    const dx = this.aim.x - this.frame.x, dy = this.aim.y - this.frame.y, d = Math.hypot(dx, dy);
    if (d > 0.5) {
      const k = Math.min(1, max / d);
      this.frame.x += dx * k;
      this.frame.y += dy * k;
    }
    // is a target inside the frame right now?
    const inside = this.targets.some((t) => {
      if (this.got.has(t.id)) return false;
      const p = this.targetPos(t);
      return Math.abs(p.x - this.frame.x) < FW / 2 - 6 && Math.abs(p.y - this.frame.y) < FH / 2 - 6;
    });
    const g = this.frameG;
    g.clear();
    const col = inside ? COLORS.green : 0xffffff;
    g.lineStyle(3, col, 0.95);
    const x0 = this.frame.x - FW / 2, y0 = this.frame.y - FH / 2, L = 28;
    [[x0, y0, 1, 1], [x0 + FW, y0, -1, 1], [x0, y0 + FH, 1, -1], [x0 + FW, y0 + FH, -1, -1]].forEach(([x, y, sx, sy]) => {
      g.lineBetween(x, y, x + L * sx, y);
      g.lineBetween(x, y, x, y + L * sy);
    });
    g.lineStyle(1.5, col, 0.6);
    g.lineBetween(this.frame.x - 12, this.frame.y, this.frame.x + 12, this.frame.y);
    g.lineBetween(this.frame.x, this.frame.y - 12, this.frame.x, this.frame.y + 12);
  }
}
