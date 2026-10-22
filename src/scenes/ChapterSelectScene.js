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

// Mission map: a row of chapter cards that slides left and right (drag or swipe it, use the
// arrow buttons, the arrow keys or the mouse wheel). Pick a chapter, then start it or jump to
// one of its activities.
const CW = 370, CH = 420, GAP = 30, STEP = CW + GAP;
const ART_H = 180;

export class ChapterSelectScene extends BaseScene {
  constructor() {
    super('ChapterSelect');
  }

  create() {
    this.setupStage({ hud: false });
    // (Phaser reuses this screen when it is opened again: start from a clean slate)
    this.cards = [];
    this.drag = null;
    this.modalOpen = false;
    starfield(this, { count: 180 });

    txt(this, W / 2, 56, Content.ui('chooseChapter', 'Choose your mission'), { size: 40, weight: 800, origin: 0.5, color: CSS.yellow, scale: false });
    iconButton(this, 44, 44, 'home', () => Flow.home(this)).setDepth(DEPTH.ui);
    iconButton(this, W - 44, 44, 'sliders', () => this.openSettings()).setDepth(DEPTH.ui);

    const chapters = Content.game.chapters;
    const playable = Content.playableChapters();
    const soon = chapters.filter((c) => c.comingSoon || !Content.chapter(c.id));
    this.cardY = soon.length ? 326 : 350;

    // start with the chapter the player came from (or the first one not finished yet) in view
    const focusIndex = Math.max(0, playable.findIndex((c) => c.id === this.payload.focus));
    const firstOpen = playable.findIndex((c) => !Progress.isChapterDone(c.id));
    const startAt = this.payload.focus ? focusIndex : Math.max(0, firstOpen);
    this.maxPos = Math.max(0, playable.length - 3);
    this.pos = this.target = Phaser.Math.Clamp(startAt - 1, 0, this.maxPos);

    // the chapter cards
    playable.forEach((c, i) => this.cards.push(this.makeCard(c, i)));
    this.placeCards();

    // only needed when there are more chapters than fit on the screen
    if (this.maxPos > 0) {
      this.prevBtn = iconButton(this, 36, this.cardY, 'back', () => this.scrollBy(-1), { width: 56, height: 96 }).setDepth(DEPTH.ui + 5);
      this.nextBtn = iconButton(this, W - 36, this.cardY, 'next', () => this.scrollBy(1), { width: 56, height: 96 }).setDepth(DEPTH.ui + 5);
      this.dots = this.add.graphics().setDepth(DEPTH.ui);
      this.setupScrolling();
    }

    // coming soon strip
    if (soon.length) {
      txt(this, W / 2, 576, Content.ui('comingSoon', 'Coming soon'), { size: 18, weight: 700, origin: 0.5, color: CSS.dim, scale: false });
      const sw = 230, sgap = 14;
      const sx = W / 2 - ((soon.length - 1) * (sw + sgap)) / 2;
      soon.forEach((c, i) => {
        const x = sx + i * (sw + sgap);
        const g = this.add.graphics();
        drawPanel(g, x - sw / 2, 594, sw, 100, { fill: 0x10183a, stroke: 0x28356e, radius: 16, alpha: 0.9 });
        drawIcon(g, 'lock', x - sw / 2 + 28, 644, 26, 0x5b6aa3);
        txt(this, x - sw / 2 + 52, 620, c.title, { size: 17, weight: 700, color: '#c9d0ee', scale: false, wrap: sw - 64 });
        txt(this, x - sw / 2 + 52, 664, c.years || '', { size: 14, color: CSS.dim, scale: false });
      });
    }

    if (this.payload.focus) {
      const c = chapters.find((x) => x.id === this.payload.focus);
      if (c && Content.chapter(c.id)) this.time.delayedCall(350, () => this.openActivities(c));
    }
  }

  // ---------- sliding row of cards ----------
  setupScrolling() {
    const top = this.cardY - CH / 2, bottom = this.cardY + CH / 2;
    this.input.on('pointerdown', (p) => {
      if (this.modalOpen || p.worldY < top || p.worldY > bottom) return;
      this.drag = { x: p.worldX, pos: this.pos, moved: false, t: performance.now(), v: 0, lastX: p.worldX, lastT: performance.now() };
    });
    this.input.on('pointermove', (p) => {
      const d = this.drag;
      if (!d || !p.isDown) return;
      const dx = p.worldX - d.x;
      if (!d.moved && Math.abs(dx) > 12) {
        d.moved = true;
        // a drag is not a tap: don't let the button under the finger fire when it lets go
        this.cards.forEach((card) => card.buttons.forEach((b) => (b.pressed = false)));
      }
      if (!d.moved) return;
      const now = performance.now();
      const dt = Math.max(1, now - d.lastT);
      d.v = d.v * 0.6 + ((d.lastX - p.worldX) / STEP / dt) * 1000 * 0.4; // cards per second
      d.lastX = p.worldX;
      d.lastT = now;
      // a little stretch past the first and last cards
      let pos = d.pos - dx / STEP;
      if (pos < 0) pos *= 0.35;
      if (pos > this.maxPos) pos = this.maxPos + (pos - this.maxPos) * 0.35;
      this.pos = this.target = pos;
    });
    this.input.on('pointerup', () => {
      const d = this.drag;
      this.drag = null;
      if (!d || !d.moved) return;
      // a quick flick carries on to the next card
      const flick = Phaser.Math.Clamp(d.v * 0.25, -1.5, 1.5);
      this.target = Phaser.Math.Clamp(Math.round(this.pos + flick), 0, this.maxPos);
    });
    this.input.on('wheel', (p, over, dx, dy) => {
      if (this.modalOpen) return;
      const d = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      if (Math.abs(d) > 4) this.scrollBy(d > 0 ? 1 : -1);
    });
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-LEFT', () => !this.modalOpen && this.scrollBy(-1));
      this.input.keyboard.on('keydown-RIGHT', () => !this.modalOpen && this.scrollBy(1));
    }
  }

  scrollBy(n) {
    this.target = Phaser.Math.Clamp(Math.round(this.target) + n, 0, this.maxPos);
  }

  update(time, delta) {
    if (!this.cards.length) return;
    if (!this.drag && Math.abs(this.target - this.pos) > 0.0005) {
      // ease towards the chosen card
      const k = 1 - Math.pow(0.0005, Math.min(0.05, delta / 1000));
      this.pos += (this.target - this.pos) * k;
      if (Math.abs(this.target - this.pos) < 0.0005) this.pos = this.target;
      this.placeCards();
    } else if (this.drag && this.drag.moved) {
      this.placeCards();
    }
  }

  placeCards() {
    // cards 0..2 of the view sit at the same places as the old three-card layout
    const left = W / 2 - STEP;
    this.cards.forEach((card, i) => {
      const x = left + (i - this.pos) * STEP;
      const off = Math.abs(i - this.pos - 1); // 0 = middle of the view, 1 = left/right card
      const inView = off < 1.5;
      card.cont.x = x;
      card.art.x = x;
      card.mask.x = x - card.homeX;
      // cards sliding out of view fade away
      const a = Phaser.Math.Clamp(1 - (off - 1.05) / 0.9, 0, 1);
      card.cont.setAlpha(card.shown * a);
      card.art.setAlpha(card.shownArt * a);
      card.cont.setVisible(a > 0.01);
      card.art.setVisible(a > 0.01);
      card.buttons.forEach((b) => {
        b.setVisible(inView);
        if (b.input) b.input.enabled = inView && !this.modalOpen;
      });
    });
    if (this.prevBtn) {
      this.prevBtn.setVisible(this.target > 0.01);
      this.nextBtn.setVisible(this.target < this.maxPos - 0.01);
    }
    if (this.dots) {
      const n = this.cards.length;
      this.dots.clear();
      const dy = this.cardY + CH / 2 + 18;
      for (let i = 0; i < n; i++) {
        const near = 1 - Phaser.Math.Clamp(Math.abs(i - this.pos - 1) - 0.5, 0, 1);
        this.dots.fillStyle(near > 0.5 ? COLORS.yellow : 0x3a4470, 1);
        this.dots.fillCircle(W / 2 + (i - (n - 1) / 2) * 22, dy, 5 + near * 2);
      }
    }
  }

  makeCard(c, index) {
    const w = CW, h = CH, y = this.cardY;
    const homeX = W / 2 - STEP + index * STEP;
    const done = Progress.isChapterDone(c.id);
    const steps = Content.chapter(c.id).steps;
    const count = Progress.doneCount(c.id);
    const cont = this.add.container(homeX, y);
    const g = this.add.graphics();
    drawPanel(g, -w / 2, -h / 2, w, h, { fill: COLORS.panel, stroke: done ? COLORS.green : COLORS.stroke, strokeWidth: 3, radius: 24 });
    // art area
    g.fillStyle(0x070b1d, 1);
    g.fillRoundedRect(-w / 2 + 14, -h / 2 + 14, w - 28, ART_H, 16);
    cont.add(g);
    // picture (kept outside the card container so it can be clipped with a mask)
    const art = this.chapterArt(c.art || c.id);
    art.setPosition(homeX, y - h / 2 + 104).setDepth(DEPTH.ui - 1);
    // clip the picture to its rounded box
    const mask = this.make.graphics({ add: false });
    mask.fillStyle(0xffffff, 1);
    mask.fillRoundedRect(homeX - w / 2 + 14, y - h / 2 + 14, w - 28, ART_H, 16);
    art.setMask(mask.createGeometryMask());

    const num = txt(this, -w / 2 + 22, -h / 2 + 206, (c.label || `Chapter ${index + 1}`).toUpperCase(), { size: 15, weight: 700, color: CSS.cyan, scale: false });
    const title = txt(this, -w / 2 + 22, -h / 2 + 228, c.title, { size: 26, weight: 800, scale: false, wrap: w - 44 });
    const sub = txt(this, -w / 2 + 22, title.y + title.height + 4, c.subtitle || '', { size: 16, color: CSS.dim, scale: false, wrap: w - 44 });
    cont.add([num, title, sub]);

    const status = done ? Content.ui('completed', 'Completed!') : count ? `${count}/${steps.length} ${Content.ui('activitiesDone', 'activities done')}` : c.years || '';
    const st = txt(this, -w / 2 + 22, sub.y + sub.height + 6, status, { size: 15, weight: 700, color: done ? CSS.green : CSS.dim, scale: false });
    cont.add(st);

    // (the buttons ride inside the card, so they slide with it)
    const play = new Button(this, -52, h / 2 - 44, {
      width: w - 150,
      height: 56,
      label: done || count ? Content.ui('playAgain', 'Play') : Content.ui('play', 'Play'),
      icon: 'play',
      onClick: () => Flow.start(this, c.id, 0)
    });
    const list = new Button(this, w / 2 - 58, h / 2 - 44, {
      width: 90,
      height: 56,
      icon: 'menu',
      variant: 'secondary',
      onClick: () => this.openActivities(c)
    });
    cont.add([play, list]);
    cont.setDepth(DEPTH.ui - 1);

    // fade in, one card after another
    const card = { cont, art, mask, homeX, buttons: [play, list], shown: 0, shownArt: 0 };
    const order = Math.max(0, index - Math.floor(this.pos));
    this.tweens.addCounter({ from: 0, to: 1, duration: 400, delay: order * 120, ease: 'Cubic.easeOut', onUpdate: (t) => {
      card.shown = t.getValue();
      card.offY = 30 * (1 - card.shown);
      cont.y = y + card.offY;
      this.placeCards();
    } });
    this.tweens.addCounter({ from: 0, to: 1, duration: 400, delay: order * 120 + 150, onUpdate: (t) => {
      card.shownArt = t.getValue();
      this.placeCards();
    } });
    return card;
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
    // the cards underneath stay still and can't be pressed while the list is open
    this.modalOpen = true;
    this.drag = null;
    this.placeCards();
    const root = this.add.container(0, 0).setDepth(DEPTH.modal);
    const dim = this.add.rectangle(W / 2, H / 2, FULL.w, FULL.h, 0x000000, 0.65).setInteractive();
    root.add(dim);
    const cols = 2;
    const rows = Math.ceil(steps.length / cols);
    // long chapters get a taller list with slimmer rows, so every activity fits
    const pw = 880, ph = rows > 8 ? 668 : 620;
    root.add(panel(this, W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, { stroke: COLORS.cyan, strokeWidth: 3, radius: 26 }));
    root.add(txt(this, W / 2, H / 2 - ph / 2 + 40, c.title, { size: 30, weight: 800, origin: 0.5, color: CSS.yellow, scale: false }));
    root.add(txt(this, W / 2, H / 2 - ph / 2 + 76, Content.ui('pickActivity', 'Jump to any activity:'), { size: 18, origin: 0.5, color: CSS.dim, scale: false }));
    const buttons = [];
    const gapY = Math.min(58, (ph - 200) / rows);
    const bw = 400, bh = Math.min(50, gapY - 7);
    steps.forEach((s, i) => {
      const col = i % cols, rowI = Math.floor(i / cols);
      const x = W / 2 + (col === 0 ? -bw / 2 - 10 : bw / 2 + 10);
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
        this.modalOpen = false;
        this.placeCards();
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
