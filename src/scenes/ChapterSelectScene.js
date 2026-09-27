import Phaser from 'phaser';
import { W, H, FULL, COLORS, CSS, DEPTH } from '../core/constants.js';
import { Content } from '../core/Content.js';
import { Progress } from '../core/Progress.js';
import { Flow } from '../core/Flow.js';
import { BaseScene } from './BaseScene.js';
import { starfield } from './common/bg.js';
import { img } from '../art/core.js';
import { txt } from '../ui/text.js';
import { Button, iconButton } from '../ui/Button.js';
import { panel, drawPanel } from '../ui/widgets.js';
import { drawIcon } from '../ui/icons.js';

// Mission map: pick a chapter, then start it or jump to one of its activities.
export class ChapterSelectScene extends BaseScene {
  constructor() {
    super('ChapterSelect');
  }

  create() {
    this.setupStage({ hud: false });
    starfield(this, { count: 180 });

    txt(this, W / 2, 56, Content.ui('chooseChapter', 'Choose your mission'), { size: 40, weight: 800, origin: 0.5, color: CSS.yellow, scale: false });
    iconButton(this, 44, 44, 'home', () => Flow.home(this)).setDepth(DEPTH.ui);
    iconButton(this, W - 44, 44, 'sliders', () => this.openSettings()).setDepth(DEPTH.ui);

    const chapters = Content.game.chapters;
    const playable = chapters.filter((c) => !c.comingSoon);
    const soon = chapters.filter((c) => c.comingSoon);

    // playable chapters: big cards
    const cw = 370, ch = 420, gap = 30;
    const startX = W / 2 - ((playable.length - 1) * (cw + gap)) / 2;
    playable.forEach((c, i) => this.makeCard(c, startX + i * (cw + gap), 326, cw, ch, i));

    // coming soon strip
    if (soon.length) {
      txt(this, W / 2, 564, Content.ui('comingSoon', 'Coming soon'), { size: 18, weight: 700, origin: 0.5, color: CSS.dim, scale: false });
      const sw = 230, sgap = 14;
      const sx = W / 2 - ((soon.length - 1) * (sw + sgap)) / 2;
      soon.forEach((c, i) => {
        const x = sx + i * (sw + sgap);
        const g = this.add.graphics();
        drawPanel(g, x - sw / 2, 584, sw, 100, { fill: 0x10183a, stroke: 0x28356e, radius: 16, alpha: 0.9 });
        drawIcon(g, 'lock', x - sw / 2 + 28, 634, 26, 0x5b6aa3);
        txt(this, x - sw / 2 + 52, 610, c.title, { size: 17, weight: 700, color: '#c9d0ee', scale: false, wrap: sw - 64 });
        txt(this, x - sw / 2 + 52, 654, c.years || '', { size: 14, color: CSS.dim, scale: false });
      });
    }

    if (this.payload.focus) {
      const c = chapters.find((x) => x.id === this.payload.focus);
      if (c) this.time.delayedCall(350, () => this.openActivities(c));
    }
  }

  makeCard(c, x, y, w, h, index) {
    const done = Progress.isChapterDone(c.id);
    const steps = Content.chapter(c.id).steps;
    const count = Progress.doneCount(c.id);
    const cont = this.add.container(x, y);
    const g = this.add.graphics();
    drawPanel(g, -w / 2, -h / 2, w, h, { fill: COLORS.panel, stroke: done ? COLORS.green : COLORS.stroke, strokeWidth: 3, radius: 24 });
    // art area
    g.fillStyle(0x070b1d, 1);
    g.fillRoundedRect(-w / 2 + 14, -h / 2 + 14, w - 28, 180, 16);
    cont.add(g);
    // picture (kept outside the card container so it can be clipped with a mask)
    const art = this.chapterArt(c.art || c.id);
    art.setPosition(x, y - h / 2 + 104).setDepth(DEPTH.ui - 1).setAlpha(0);
    this.tweens.add({ targets: art, alpha: 1, duration: 400, delay: index * 120 + 150 });
    // clip the picture to its rounded box
    const mg = this.make.graphics({ add: false });
    mg.fillStyle(0xffffff, 1);
    mg.fillRoundedRect(x - w / 2 + 14, y - h / 2 + 14, w - 28, 180, 16);
    art.setMask(mg.createGeometryMask());

    const num = txt(this, -w / 2 + 22, -h / 2 + 206, (c.label || `Chapter ${index + 1}`).toUpperCase(), { size: 15, weight: 700, color: CSS.cyan, scale: false });
    const title = txt(this, -w / 2 + 22, -h / 2 + 228, c.title, { size: 26, weight: 800, scale: false, wrap: w - 44 });
    const sub = txt(this, -w / 2 + 22, title.y + title.height + 4, c.subtitle || '', { size: 16, color: CSS.dim, scale: false, wrap: w - 44 });
    cont.add([num, title, sub]);

    const status = done ? Content.ui('completed', 'Completed!') : count ? `${count}/${steps.length} ${Content.ui('activitiesDone', 'activities done')}` : c.years || '';
    const st = txt(this, -w / 2 + 22, sub.y + sub.height + 6, status, { size: 15, weight: 700, color: done ? CSS.green : CSS.dim, scale: false });
    cont.add(st);

    const play = new Button(this, x - 52, y + h / 2 - 44, {
      width: w - 150,
      height: 56,
      label: done || count ? Content.ui('playAgain', 'Play') : Content.ui('play', 'Play'),
      icon: 'play',
      onClick: () => Flow.start(this, c.id, 0)
    });
    play.setDepth(DEPTH.ui);
    const list = new Button(this, x + w / 2 - 58, y + h / 2 - 44, {
      width: 90,
      height: 56,
      icon: 'menu',
      variant: 'secondary',
      onClick: () => this.openActivities(c)
    });
    list.setDepth(DEPTH.ui);
    cont.setDepth(DEPTH.ui - 1);
    cont.setAlpha(0);
    cont.y += 30;
    this.tweens.add({ targets: cont, alpha: 1, y, duration: 400, delay: index * 120, ease: 'Cubic.easeOut' });
  }

  chapterArt(kind) {
    const c = this.add.container(0, 0);
    const calm = this.reducedMotion;
    // gentle up-and-down float
    const float = (target, dy, ms) => !calm && this.tweens.add({ targets: target, y: target.y + dy, duration: ms, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (kind === 'freedom7') {
      c.add(img(this, 0, 150, 'earth', 1.1));
      // the rocket and its flame move as one piece, so they never come apart
      const ship = this.add.container(40, -26);
      const r = img(this, 0, 0, 'mercuryRedstone', 0.34).setAngle(8);
      ship.add([this.flameUnder(r, 0.3, 0.42), r]);
      c.add(ship);
      float(ship, -8, 1800);
      const sputnik = img(this, -120, -50, 'sputnik', 0.6);
      c.add(sputnik);
      if (!calm) this.tweens.add({ targets: sputnik, x: -105, y: -58, angle: 8, duration: 3200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else if (kind === 'explorer1') {
      c.add(img(this, -40, 120, 'earth', 0.9));
      const belt = img(this, -40, 120, 'belt', 1.2).setAlpha(0.7);
      c.add(belt);
      if (!calm) this.tweens.add({ targets: belt, alpha: 0.45, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const ex = img(this, 90, -30, 'explorer1', 0.9).setAngle(60);
      c.add(ex);
      // a slow, soft turn (one full turn every 24 seconds) while it floats
      if (!calm) this.tweens.add({ targets: ex, angle: 420, duration: 24000, repeat: -1 });
      float(ex, 7, 2600);
    } else if (kind === 'apollo11') {
      const moon = img(this, 100, -20, 'moon', 0.7);
      c.add(moon);
      if (!calm) this.tweens.add({ targets: moon, angle: 360, duration: 90000, repeat: -1 });
      const rocket = this.add.container(-92, -12);
      const sv = img(this, 0, 0, 'saturnV', 0.3).setAngle(-12);
      rocket.add([this.flameUnder(sv, 0.3, 0.4), sv]);
      c.add(rocket);
      float(rocket, -9, 2000);
      const lm = img(this, 60, 44, 'lm', 0.7);
      c.add(lm);
      float(lm, -8, 1500);
    }
    return c;
  }

  // A flickering flame fixed to the bottom of a rocket picture (turned with the rocket).
  flameUnder(rocket, sx, sy) {
    const a = rocket.rotation, half = rocket.displayHeight / 2 - 3;
    const f = this.add.image(rocket.x - Math.sin(a) * half, rocket.y + Math.cos(a) * half, 'flame').setOrigin(0.5, 0).setScale(sx, sy).setRotation(a).setBlendMode(Phaser.BlendModes.ADD);
    if (!this.reducedMotion) this.tweens.add({ targets: f, scaleY: sy * 1.25, duration: 90, yoyo: true, repeat: -1 });
    return f;
  }

  openActivities(c) {
    const steps = Content.chapter(c.id).steps;
    const root = this.add.container(0, 0).setDepth(DEPTH.modal);
    const dim = this.add.rectangle(W / 2, H / 2, FULL.w, FULL.h, 0x000000, 0.65).setInteractive();
    root.add(dim);
    const pw = 880, ph = 620;
    root.add(panel(this, W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, { stroke: COLORS.cyan, strokeWidth: 3, radius: 26 }));
    root.add(txt(this, W / 2, H / 2 - ph / 2 + 40, c.title, { size: 30, weight: 800, origin: 0.5, color: CSS.yellow, scale: false }));
    root.add(txt(this, W / 2, H / 2 - ph / 2 + 76, Content.ui('pickActivity', 'Jump to any activity:'), { size: 18, origin: 0.5, color: CSS.dim, scale: false }));
    const buttons = [];
    const cols = 2;
    const bw = 400, bh = 50;
    const rows = Math.ceil(steps.length / cols);
    const gapY = Math.min(58, (ph - 200) / rows);
    steps.forEach((s, i) => {
      const col = i % cols, rowI = Math.floor(i / cols);
      const x = W / 2 + (col === 0 ? -bw / 2 - 10 : bw / 2 + 10);
      const y = H / 2 - ph / 2 + 128 + rowI * gapY;
      const doneStep = Progress.isStepDone(c.id, i);
      const b = new Button(this, x, y, {
        width: bw,
        height: bh,
        size: 17,
        label: `${i + 1}. ${s.name}`,
        icon: doneStep ? 'check' : null,
        iconSize: 18,
        variant: doneStep ? 'secondary' : 'ghost',
        onClick: () => Flow.start(this, c.id, i)
      });
      b.labelText.setOrigin(0.5);
      b.setDepth(DEPTH.modal + 1);
      b._menu = root;
      buttons.push(b);
    });
    const close = new Button(this, W / 2, H / 2 + ph / 2 - 46, {
      width: 220,
      height: 56,
      label: Content.ui('close', 'Close'),
      variant: 'secondary',
      icon: 'close',
      onClick: () => {
        this.focus.clearTrap();
        buttons.forEach((b) => b.destroy());
        close.destroy();
        root.destroy();
      }
    });
    close.setDepth(DEPTH.modal + 1);
    close._menu = root;
    this.focus.setTrap((it) => it._menu === root);
  }

  openSettings() {
    if (this.scene.isActive('Settings')) return;
    this.scene.launch('Settings', { from: 'ChapterSelect' });
    this.scene.pause();
  }
}
