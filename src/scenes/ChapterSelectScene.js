import Phaser from 'phaser';
import { W, H, FULL, COLORS, CSS, DEPTH } from '../core/constants.js';
import { Content } from '../core/Content.js';
import { Progress } from '../core/Progress.js';
import { Flow } from '../core/Flow.js';
import { BaseScene } from './BaseScene.js';
import { starfield } from './common/bg.js';
import { img } from '../art/core.js';
import { txt, fitText } from '../ui/text.js';
import { Button, iconButton } from '../ui/Button.js';
import { panel, RoundBox } from '../ui/widgets.js';
import { drawIcon } from '../ui/icons.js';

// Mission map: every chapter on one screen as a picture card. Up to three chapters get big
// cards in a row; more chapters are laid out as a tidy grid (four on top, the rest below).
// Pick a chapter, then start it or jump to one of its activities.
const BIG = { w: 370, h: 420, gap: 30, artH: 180, art: 1 };
const SMALL = { w: 288, h: 288, gap: 16, artH: 120, art: 0.68 };

export class ChapterSelectScene extends BaseScene {
  constructor() {
    super('ChapterSelect');
  }

  create() {
    this.setupStage({ hud: false });
    starfield(this, { count: 180 });

    txt(this, W / 2, 50, Content.ui('chooseChapter', 'Choose your mission'), { size: 40, weight: 800, origin: 0.5, color: CSS.yellow, scale: false });
    iconButton(this, 44, 44, 'home', () => Flow.home(this)).setDepth(DEPTH.ui);
    iconButton(this, W - 44, 44, 'sliders', () => this.openSettings()).setDepth(DEPTH.ui);

    const chapters = Content.game.chapters;

    if (chapters.length <= 3) {
      // a few chapters: big cards in one row
      const startX = W / 2 - ((chapters.length - 1) * (BIG.w + BIG.gap)) / 2;
      chapters.forEach((c, i) => this.makeCard(c, startX + i * (BIG.w + BIG.gap), 340, BIG, i));
    } else {
      // more chapters: two rows (the top row gets the extra card when the count is odd)
      const perRow = Math.min(4, Math.ceil(chapters.length / 2));
      const rows = [chapters.slice(0, perRow), chapters.slice(perRow, perRow * 2)];
      const ys = [100 + SMALL.h / 2, 100 + SMALL.h + SMALL.gap + SMALL.h / 2];
      let index = 0;
      rows.forEach((row, r) => {
        const startX = W / 2 - ((row.length - 1) * (SMALL.w + SMALL.gap)) / 2;
        row.forEach((c, i) => this.makeCard(c, startX + i * (SMALL.w + SMALL.gap), ys[r], SMALL, index++));
      });
    }

    if (this.payload.focus) {
      const c = chapters.find((x) => x.id === this.payload.focus);
      if (c && Content.chapter(c.id)) this.time.delayedCall(350, () => this.openActivities(c));
    }
  }

  makeCard(c, x, y, size, index) {
    const { w, h, artH } = size;
    const big = size === BIG;
    const locked = c.comingSoon || !Content.chapter(c.id);
    const done = !locked && Progress.isChapterDone(c.id);
    const steps = locked ? [] : Content.chapter(c.id).steps;
    const count = locked ? 0 : Progress.doneCount(c.id);
    const cont = this.add.container(x, y);
    const box = new RoundBox(this).draw(-w / 2, -h / 2, w, h, { fill: locked ? 0x10183a : COLORS.panel, stroke: done ? COLORS.green : locked ? 0x28356e : COLORS.stroke, strokeWidth: 3, radius: big ? 24 : 20 });
    // art area
    const pad = big ? 14 : 12;
    const g = this.add.graphics();
    g.fillStyle(0x070b1d, 1);
    g.fillRoundedRect(-w / 2 + pad, -h / 2 + pad, w - pad * 2, artH, 16);
    cont.add([box, g]);
    // picture (kept outside the card container so it can be clipped with a mask)
    const art = this.chapterArt(c.art || c.id);
    art.setScale(size.art);
    art.setPosition(x, y - h / 2 + pad + artH / 2 + (big ? 0 : 4)).setDepth(DEPTH.ui - 1).setAlpha(0);
    this.tweens.add({ targets: art, alpha: locked ? 0.35 : 1, duration: 400, delay: index * 90 + 150 });
    // clip the picture to its rounded box
    const mg = this.make.graphics({ add: false });
    mg.fillStyle(0xffffff, 1);
    mg.fillRoundedRect(x - w / 2 + pad, y - h / 2 + pad, w - pad * 2, artH, 16);
    art.setMask(mg.createGeometryMask());

    // a badge on the picture: finished, how far along, or locked
    const badgeText = locked ? Content.ui('comingSoon', 'Coming soon') : done ? Content.ui('completed', 'Completed!') : count ? `${count} / ${steps.length}` : '';
    if (badgeText) {
      const bt = txt(this, 0, 0, badgeText, { size: big ? 15 : 13, weight: 800, color: done ? '#06281a' : '#ffffff', origin: 0.5, scale: false });
      const bw = bt.width + 22, bh = big ? 28 : 24;
      const bx = w / 2 - pad - 8 - bw / 2, by = -h / 2 + pad + 8 + bh / 2;
      const bg = this.add.existing(new RoundBox(this)).draw(bx - bw / 2, by - bh / 2, bw, bh, { fill: done ? COLORS.green : locked ? 0x28356e : 0x1b2a63, alpha: 0.95, radius: bh / 2, stroke: null, shadow: false });
      bt.setPosition(bx, by);
      const badge = this.add.container(x, y, [bg, bt]).setDepth(DEPTH.ui).setAlpha(0);
      this.tweens.add({ targets: badge, alpha: 1, duration: 300, delay: index * 90 + 300 });
    }

    const top = -h / 2 + pad + artH;
    const num = txt(this, -w / 2 + 20, top + (big ? 12 : 10), (c.label || `Chapter ${index + 1}`).toUpperCase(), { size: big ? 15 : 13, weight: 700, color: CSS.cyan, scale: false });
    const title = txt(this, -w / 2 + 20, num.y + num.height + 2, c.title, { size: big ? 26 : 21, weight: 800, scale: false, color: locked ? '#c9d0ee' : CSS.text });
    fitText(title, w - 40, big ? 64 : 28, 15);
    const sub = txt(this, -w / 2 + 20, title.y + title.height + 3, locked ? c.years || '' : c.subtitle || '', { size: big ? 16 : 14, color: CSS.dim, scale: false, wrap: w - 40, lineSpacing: 2 });
    fitText(sub, w - 40, big ? 60 : 36, 11);
    cont.add([num, title, sub]);
    if (locked) {
      drawIcon(g, 'lock', 0, h / 2 - 40, 30, 0x5b6aa3);
    } else {
      const bh = big ? 56 : 48;
      const listW = big ? 90 : 66;
      const play = new Button(this, -w / 2 + pad + (w - pad * 3 - listW) / 2, h / 2 - pad - bh / 2, {
        width: w - pad * 3 - listW,
        height: bh,
        size: big ? 24 : 21,
        iconSize: big ? 26 : 22,
        label: Content.ui('play', 'Play'),
        icon: 'play',
        onClick: () => Flow.start(this, c.id, 0)
      });
      const list = new Button(this, w / 2 - pad - listW / 2, h / 2 - pad - bh / 2, {
        width: listW,
        height: bh,
        iconSize: big ? 26 : 22,
        icon: 'menu',
        variant: 'secondary',
        onClick: () => this.openActivities(c)
      });
      cont.add([play, list]);
    }
    cont.setDepth(DEPTH.ui - 1);
    // fade in, one card after another
    cont.setAlpha(0);
    cont.y += 30;
    this.tweens.add({ targets: cont, alpha: 1, y, duration: 400, delay: index * 90, ease: 'Cubic.easeOut' });
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
    } else if (kind === 'voyager') {
      c.add(img(this, -110, 30, 'jupiter', 0.42));
      const sat = img(this, 105, -38, 'saturn', 0.42);
      c.add(sat);
      const v = img(this, 10, 34, 'voyager', 0.42).setAngle(-10);
      c.add(v);
      float(v, -8, 2300);
      if (!calm) this.tweens.add({ targets: sat, angle: 4, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else if (kind === 'jwst') {
      c.add(img(this, 110, -40, 'galaxySpiral', 0.7).setAlpha(0.9));
      c.add(img(this, -120, -48, 'galaxyRed', 0.5));
      const webb = img(this, -6, 22, 'jwst', 0.56);
      c.add(webb);
      float(webb, -7, 2400);
    } else if (kind === 'rovers') {
      const mars = img(this, 112, -22, 'mars', 0.44);
      c.add(mars);
      if (!calm) this.tweens.add({ targets: mars, angle: 360, duration: 120000, repeat: -1 });
      c.add(img(this, -14, 44, 'curiosity', 0.6));
      const heli = this.add.container(-118, -30);
      heli.add(img(this, 0, 0, 'ingenuity', 0.6));
      const blades = this.add.graphics();
      blades.lineStyle(2, 0x3a3f4b, 1);
      blades.lineBetween(-30, -20, 30, -20);
      blades.lineBetween(-30, -11, 30, -11);
      heli.add(blades);
      c.add(heli);
      float(heli, -10, 1600);
      if (!calm) this.tweens.add({ targets: blades, scaleX: 0.3, duration: 60, yoyo: true, repeat: -1 });
    } else if (kind === 'apollo13') {
      c.add(img(this, 118, -40, 'moonSmall', 0.95));
      c.add(img(this, -122, 58, 'earthSmall', 0.85));
      const ship = this.add.container(-4, 0);
      ship.add(img(this, 0, 0, 'csmLm', 0.62).setAngle(-14));
      c.add(ship);
      float(ship, -7, 2100);
      // oxygen venting from the damaged service module
      if (!calm) {
        this.time.addEvent({
          delay: 140,
          loop: true,
          callback: () => {
            if (!c.active) return;
            const p = this.add.image(-48, 14, 'softDot').setScale(0.08 + Math.random() * 0.08).setAlpha(0.85);
            c.addAt(p, 2);
            this.tweens.add({ targets: p, x: -90 - Math.random() * 60, y: 50 + Math.random() * 40, alpha: 0, scale: p.scale * 2.5, duration: 1600, onComplete: () => p.destroy() });
          }
        });
      }
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
    // long chapters get three columns, so every activity fits with room to tap
    const cols = steps.length > 16 ? 3 : 2;
    const rows = Math.ceil(steps.length / cols);
    const pw = cols === 3 ? 1060 : 880, ph = rows > 8 ? 668 : 620;
    root.add(panel(this, W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, { stroke: COLORS.cyan, strokeWidth: 3, radius: 26 }));
    root.add(txt(this, W / 2, H / 2 - ph / 2 + 40, c.title, { size: 30, weight: 800, origin: 0.5, color: CSS.yellow, scale: false }));
    root.add(txt(this, W / 2, H / 2 - ph / 2 + 76, Content.ui('pickActivity', 'Jump to any activity:'), { size: 18, origin: 0.5, color: CSS.dim, scale: false }));
    const buttons = [];
    const gapY = Math.min(58, (ph - 200) / rows);
    const bw = cols === 3 ? 326 : 400, bh = Math.min(50, gapY - 7);
    steps.forEach((s, i) => {
      const col = i % cols, rowI = Math.floor(i / cols);
      const x = W / 2 + (col - (cols - 1) / 2) * (bw + 20);
      const y = H / 2 - ph / 2 + 128 + rowI * gapY;
      const doneStep = Progress.isStepDone(c.id, i);
      const b = new Button(this, x, y, {
        width: bw,
        height: bh,
        size: bh < 44 ? 15 : 17,
        radius: Math.min(18, bh / 2),
        label: `${i + 1}. ${s.name}`,
        icon: doneStep ? 'check' : null,
        iconSize: bh < 44 ? 16 : 18,
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
