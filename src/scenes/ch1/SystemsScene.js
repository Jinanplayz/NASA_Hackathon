import Phaser from 'phaser';
import { W, COLORS, CSS, DEPTH, TEX } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Speech } from '../../core/Speech.js';
import { Settings } from '../../core/Settings.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { loadThree } from '../../three/loader.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { toast, roundBox, RoundBox } from '../../ui/widgets.js';
import { drawIcon } from '../../ui/icons.js';

// Scroll through the 8 major systems of a spaceship, each shown as a detailed 3D model.
const VX = 30, VY = 84, VW = 660, VH = 452;
const IX = 710, IY = 84, IW = 540, IH = 452;
const STRIP_X = 96, STRIP_W = W - 192, STRIP_Y = 552, CARD_W = 176, CARD_H = 142, GAP = 14;

export class SystemsScene extends BaseScene {
  constructor() {
    super('Systems');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 90 });
    this.items = this.T('items', []);
    this.labels = this.T('labels', {});
    this.viewed = new Set();
    this.current = -1;

    // 3D viewport background (drawn under the transparent 3D canvas)
    roundBox(this, VX, VY, VW, VH, { fill: 0x0b1230, radius: 20 });
    const vg = this.add.graphics();
    vg.lineStyle(1, 0x2a4a9a, 0.3);
    for (let x = VX + 30; x < VX + VW; x += 40) vg.lineBetween(x, VY + 10, x, VY + VH - 10);
    for (let y = VY + 30; y < VY + VH; y += 40) vg.lineBetween(VX + 10, y, VX + VW - 10, y);
    const glow = this.add.image(VX + VW / 2, VY + VH / 2, 'softDot').setDisplaySize(520, 420).setTint(0x3a5bd8).setAlpha(0.35);
    txt(this, VX + VW / 2, VY + VH - 20, Content.ui('dragToSpin', 'Drag to spin · Scroll or pinch to zoom'), { size: 15, color: CSS.dim, origin: 0.5, scale: false });
    this.noWebGL = txt(this, VX + VW / 2, VY + VH / 2, '', { size: 20, color: CSS.dim, origin: 0.5, align: 'center', wrap: VW - 80 });

    this.view = null;
    const here = this.stillHere();
    loadThree().then((ThreeView) => {
      if (!here()) return;
      const view = ThreeView && new ThreeView(this, VX + 8, VY + 8, VW - 16, VH - 40);
      if (view && view.ok) {
        this.view = view;
        if (this.current >= 0) view.setModel(this.items[this.current].model);
      } else {
        // no 3D on this device: show the system's picture instead
        const it = this.items[Math.max(0, this.current)];
        this.fallbackImg = this.add.image(VX + VW / 2, VY + VH / 2 - 10, (it && it.icon) || 'sys_propulsion').setScale(2.4 / TEX);
        glow.setAlpha(0.2);
      }
    });

    // info panel
    const ig = roundBox(this, IX, IY, IW, IH, { fill: COLORS.panel, radius: 20 });
    this.infoAccent = this.add.graphics();
    this.infoIcon = this.add.image(IX + 58, IY + 58, 'sys_propulsion').setScale(0.8 / TEX);
    this.infoNum = txt(this, IX + 112, IY + 24, '', { size: 15, weight: 700, color: CSS.cyan, scale: false });
    this.infoName = txt(this, IX + 112, IY + 44, '', { size: 30, weight: 800, wrap: IW - 130 });
    this.infoSub = txt(this, IX + 112, IY + 84, '', { size: 17, color: CSS.dim, wrap: IW - 130 });
    this.body = this.add.container(IX + 26, IY + 128);

    // counter / continue in the top bar
    this.counterBg = this.add.graphics().setDepth(DEPTH.hud);
    this.counter = txt(this, 1000, 38, '', { size: 18, weight: 700, origin: 0.5, scale: false }).setDepth(DEPTH.hud);
    this.continueBtn = new Button(this, 1000, 38, {
      width: 270,
      height: 56,
      size: 20,
      label: this.labels.continue || 'Continue',
      icon: 'next',
      variant: 'success',
      onClick: () => this.done()
    });
    this.continueBtn.setDepth(DEPTH.hud + 1).setVisible(false);

    this.buildStrip();
    this.setupInput();
    this.select(0, false);

    // (tapping a system cuts the intro short; the hint still follows, unless the screen has closed)
    this.guide.sequence(this.T('intro', []), { modal: false }).then(() => here() && this.showHint());
  }

  showHint() {
    if (this.viewed.size < this.items.length) toast(this, this.T('hint', ''), { y: 596, duration: 3800, sound: false });
  }

  buildStrip() {
    const total = this.items.length * (CARD_W + GAP) - GAP;
    this.maxScroll = Math.max(0, total - STRIP_W);
    // the strip eases towards scrollTarget; a flick keeps it gliding (scrollVel, px per second)
    this.scrollX = 0;
    this.scrollTarget = 0;
    this.scrollVel = 0;
    this.strip = this.add.container(STRIP_X, STRIP_Y);
    const mg = this.make.graphics({ add: false });
    mg.fillStyle(0xffffff, 1);
    mg.fillRect(STRIP_X - 4, STRIP_Y - 6, STRIP_W + 8, CARD_H + 16);
    this.strip.setMask(mg.createGeometryMask());
    this.cards = this.items.map((it, i) => {
      const c = this.add.container(i * (CARD_W + GAP) + CARD_W / 2, CARD_H / 2 + 2);
      const g = new RoundBox(this);
      const icon = this.add.image(0, -22, it.icon).setScale(0.62 / TEX);
      const name = txt(this, 0, 36, it.name, { size: 16, weight: 700, origin: 0.5, align: 'center', wrap: CARD_W - 16, scale: false });
      const check = this.add.graphics();
      c.add([g, icon, name, check]);
      c.setSize(CARD_W, CARD_H);
      c.setInteractive({ useHandCursor: true });
      c.on('pointerup', (p) => {
        if (Math.abs(p.downX - p.upX) < 12 * (this.cameras.main.zoom) && !this.stripDragged) this.select(i);
      });
      c.g = g;
      c.check = check;
      this.strip.add(c);
      return c;
    });
    this.drawCards();
    // arrows
    this.leftBtn = new Button(this, 50, STRIP_Y + CARD_H / 2 + 2, { width: 64, height: 110, icon: 'back', variant: 'secondary', radius: 16, onClick: () => this.select(Math.max(0, this.current - 1)) });
    this.rightBtn = new Button(this, W - 50, STRIP_Y + CARD_H / 2 + 2, { width: 64, height: 110, icon: 'next', variant: 'secondary', radius: 16, onClick: () => this.select(Math.min(this.items.length - 1, this.current + 1)) });
  }

  drawCards() {
    this.cards.forEach((c, i) => {
      const it = this.items[i];
      const sel = i === this.current;
      const col = Phaser.Display.Color.HexStringToColor(it.color || '#4fd1ff').color;
      c.g.draw(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, { fill: sel ? 0x22306b : COLORS.panel, alpha: 1, radius: 16, stroke: sel ? col : COLORS.stroke, strokeWidth: sel ? 4 : 2, shadowY: 4 });
      c.check.clear();
      if (this.viewed.has(i)) {
        c.check.fillStyle(COLORS.green, 1);
        c.check.fillCircle(CARD_W / 2 - 18, -CARD_H / 2 + 18, 13);
        drawIcon(c.check, 'check', CARD_W / 2 - 18, -CARD_H / 2 + 18, 16, COLORS.bg);
      }
    });
  }

  setupInput() {
    // drag the 3D model / swipe the card strip
    this.dragMode = null;
    this.stripDragged = false;
    const pinch = { active: false, d: 0 };
    this.input.on('pointerdown', (p) => {
      if (p.worldY >= STRIP_Y - 6 && p.worldY <= STRIP_Y + CARD_H + 10 && p.worldX > STRIP_X && p.worldX < STRIP_X + STRIP_W) {
        this.dragMode = 'strip';
        // a tap that stops a gliding strip shouldn't also pick a card
        this.stripDragged = Math.abs(this.scrollVel) > 150;
        this.scrollVel = 0;
        this.dragStart = { x: p.worldX, scroll: this.scrollTarget };
        this.dragSample = { x: p.worldX, t: performance.now() };
      } else if (p.worldX > VX && p.worldX < VX + VW && p.worldY > VY && p.worldY < VY + VH) {
        this.dragMode = 'model';
        this.last = { x: p.worldX, y: p.worldY };
        if (this.view) this.view.grab();
      }
    });
    this.input.on('pointermove', (p) => {
      const p1 = this.input.pointer1, p2 = this.input.pointer2;
      if (p1 && p2 && p1.isDown && p2.isDown) {
        const d = Phaser.Math.Distance.Between(p1.worldX, p1.worldY, p2.worldX, p2.worldY);
        if (pinch.active && this.view) this.view.zoomBy(pinch.d / Math.max(10, d));
        pinch.active = true;
        pinch.d = d;
        return;
      }
      pinch.active = false;
      if (!p.isDown) return;
      if (this.dragMode === 'strip') {
        const dx = p.worldX - this.dragStart.x;
        if (Math.abs(dx) > 8) this.stripDragged = true;
        this.setScroll(this.dragStart.scroll - dx);
        // how fast the finger is moving, for the glide after letting go
        const t = performance.now();
        const dt = Math.max(8, t - this.dragSample.t) / 1000;
        this.scrollVel += ((this.dragSample.x - p.worldX) / dt - this.scrollVel) * 0.5;
        this.dragSample = { x: p.worldX, t };
      } else if (this.dragMode === 'model' && this.view) {
        this.view.drag(p.worldX - this.last.x, p.worldY - this.last.y);
        this.last = { x: p.worldX, y: p.worldY };
      }
    });
    this.input.on('pointerup', () => {
      if (this.dragMode === 'strip') {
        // held still before letting go: no glide
        if (performance.now() - this.dragSample.t > 90) this.scrollVel = 0;
        this.scrollVel = Phaser.Math.Clamp(this.scrollVel, -2600, 2600);
      } else this.scrollVel = 0;
      this.dragMode = null;
      if (this.view) this.view.release();
      this.time.delayedCall(10, () => (this.stripDragged = false));
    });
    this.input.on('wheel', (p, over, dx, dy) => {
      if (p.worldY >= STRIP_Y - 10) {
        this.scrollVel = 0;
        this.setScroll(this.scrollTarget + (Math.abs(dx) > Math.abs(dy) ? dx : dy));
      } else if (this.view) this.view.zoomBy(dy > 0 ? 1.08 : 0.93);
    });
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-RIGHT', () => this.select(Math.min(this.items.length - 1, this.current + 1)));
      this.input.keyboard.on('keydown-LEFT', () => this.select(Math.max(0, this.current - 1)));
    }
  }

  setScroll(v) {
    this.scrollTarget = Phaser.Math.Clamp(v, 0, this.maxScroll);
  }

  // Glides the card strip smoothly towards where it should be.
  updateStrip(dt) {
    if (this.scrollVel && this.dragMode !== 'strip') {
      this.setScroll(this.scrollTarget + this.scrollVel * dt);
      this.scrollVel *= Math.exp(-dt * 4);
      if (Math.abs(this.scrollVel) < 8 || this.scrollTarget <= 0 || this.scrollTarget >= this.maxScroll) this.scrollVel = 0;
    }
    const diff = this.scrollTarget - this.scrollX;
    if (!diff) return;
    this.scrollX = Math.abs(diff) < 0.2 ? this.scrollTarget : this.scrollX + diff * (1 - Math.exp(-dt * 18));
    this.strip.x = STRIP_X - this.scrollX;
  }

  select(i, speak = true) {
    if (i === this.current || !this.items[i]) return;
    this.current = i;
    const it = this.items[i];
    Sfx.play('select');
    this.viewed.add(i);
    this.drawCards();
    // keep selected card visible
    const cardX = i * (CARD_W + GAP);
    this.scrollVel = 0;
    if (cardX < this.scrollTarget) this.setScroll(cardX);
    else if (cardX + CARD_W > this.scrollTarget + STRIP_W) this.setScroll(cardX + CARD_W - STRIP_W);

    if (this.view) this.view.setModel(it.model);
    else if (this.fallbackImg) this.fallbackImg.setTexture(it.icon);

    const col = Phaser.Display.Color.HexStringToColor(it.color || '#4fd1ff').color;
    this.infoAccent.clear();
    this.infoAccent.fillStyle(col, 0.18);
    this.infoAccent.fillCircle(IX + 58, IY + 58, 42);
    this.infoAccent.lineStyle(3, col, 1);
    this.infoAccent.strokeCircle(IX + 58, IY + 58, 42);
    this.infoIcon.setTexture(it.icon);
    this.infoNum.setText(`${i + 1} / ${this.items.length}`);
    this.infoName.setText(it.name);
    this.infoSub.setText(it.subtitle || '').setY(this.infoName.y + this.infoName.height + 2);
    this.layoutBody(it, col);
    this.updateCounter();
    if (speak) Speech.say([it.name, it.what, it.where, it.fact]);
  }

  layoutBody(it, col) {
    this.body.removeAll(true);
    const top = Math.max(IY + 128, this.infoSub.y + this.infoSub.height + 16);
    this.body.setY(top);
    const maxH = IY + IH - top - 16;
    const sections = [
      [this.labels.what || 'What it does', it.what, CSS.cyan],
      [this.labels.where || "Where it's used", it.where, CSS.green],
      [this.labels.fact || 'Fun fact', it.fact, CSS.yellow]
    ];
    let size = Math.round(19 * Settings.textScale());
    let h = 0;
    for (let attempt = 0; attempt < 8; attempt++) {
      this.body.removeAll(true);
      let y = 0;
      sections.forEach(([head, text, color]) => {
        const hd = txt(this, 0, y, head.toUpperCase(), { size: 14, weight: 800, color, scale: false });
        const bd = txt(this, 0, y + 20, text, { size, wrap: IW - 52, scale: false, lineSpacing: 4 });
        this.body.add([hd, bd]);
        y += 20 + bd.height + 14;
      });
      h = y;
      if (h <= maxH) break;
      size -= 1;
    }
  }

  updateCounter() {
    const n = this.viewed.size, total = this.items.length;
    const done = n >= total;
    this.counterBg.clear();
    if (!done) {
      this.counterBg.fillStyle(0x070b1d, 0.72);
      this.counterBg.fillRoundedRect(880, 12, 240, 52, 18);
      this.counterBg.lineStyle(2, COLORS.stroke, 1);
      this.counterBg.strokeRoundedRect(880, 12, 240, 52, 18);
      this.counter.setText(`${this.labels.viewed || 'explored'}: ${n} / ${total}`);
    } else {
      this.counter.setText('');
    }
    if (done && !this.continueBtn.visible) {
      this.continueBtn.setVisible(true).pulse();
      Sfx.play('success');
      this.time.delayedCall(1400, () => {
        if (this.guide && !this.guide.visible) toast(this, this.T('doneLine', ''), { y: 610, duration: 6000, color: COLORS.green, speak: true, wrap: 900 });
      });
    }
  }

  update(time, delta) {
    this.updateStrip(Math.min(0.05, delta / 1000));
    if (this.view) this.view.update(delta);
  }

  onShutdown() {
    if (this.view) this.view.destroy();
  }
}
