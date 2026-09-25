import Phaser from 'phaser';
import { W, H, COLORS, CSS, DEPTH, TEX, seeded, shuffle } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { img } from '../../art/core.js';
import { txt, fitText } from '../../ui/text.js';
import { drawPanel, toast, floatText, shake } from '../../ui/widgets.js';

// Part 1: hop around the Moon and collect samples. Part 2: sort them for the scientists.
const GROUND_Y = 400;
const BIN_Y = 614, BIN_W = 284, BIN_H = 160;

export class SamplesScene extends BaseScene {
  constructor() {
    super('Samples');
  }

  create() {
    this.setupStage({ bg: 0x000000 });
    this.items = this.T('items', []);
    this.bins = this.T('bins', []);
    this.collected = [];
    this.queue = [];
    this.walking = false;

    starfield(this, { count: 120, top: 0x000000, bottom: 0x06070c, height: GROUND_Y });
    this.add.image(860, 170, 'earthSmall').setScale(0.7 / TEX);
    // ground
    const g = this.add.graphics();
    g.fillStyle(0x9d9d9a, 1);
    g.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    g.fillStyle(0xb7b7b3, 1);
    g.fillRect(0, GROUND_Y, W, 6);
    const rnd = seeded(8);
    for (let i = 0; i < 26; i++) {
      g.fillStyle(0x858582, 0.8);
      g.fillEllipse(rnd() * W, GROUND_Y + 30 + rnd() * 290, 40 + rnd() * 90, 10 + rnd() * 16);
    }
    this.ground = g;
    this.lm = img(this, 150, GROUND_Y + 60, 'lm', 1.7).setOrigin(0.5, 1);
    this.flag = this.add.container(300, GROUND_Y + 40, [this.add.rectangle(0, -60, 3, 120, 0xdddddd), img(this, 44, -100, 'flag', 1)]);
    this.astro = img(this, 360, GROUND_Y + 150, 'moonwalker', 1.25).setOrigin(0.5, 1).setDepth(50);
    this.footprints = this.add.graphics().setDepth(5);

    // items on the ground
    const spots = shuffle(
      [
        [520, 470], [660, 440], [800, 500], [950, 455], [1100, 520],
        [470, 600], [640, 640], [820, 620], [990, 650], [1160, 620]
      ],
      seeded(3)
    );
    this.pieces = this.items.map((it, i) => {
      const [x, y] = spots[i % spots.length];
      const s = img(this, x, y, it.key, it.key === 'coreTube' || it.key === 'foil' ? 0.7 : 0.8).setDepth(y);
      s.item = it;
      const glow = this.add.image(x, y + 6, 'softDot').setDisplaySize(90, 40).setTint(COLORS.yellow).setAlpha(0.35).setDepth(y - 1);
      this.tweens.add({ targets: glow, alpha: 0.1, duration: 700, yoyo: true, repeat: -1 });
      s.glow = glow;
      s.setInteractive({ useHandCursor: true });
      s.on('pointerup', () => this.collect(s));
      s.enabled = true;
      s.activate = () => this.collect(s);
      this.focus.add(s);
      return s;
    });

    // bag counter
    const bg = this.add.graphics().setDepth(DEPTH.hud);
    drawPanel(bg, W - 300, 84, 280, 64, { fill: 0x070b1d, radius: 18, alpha: 0.85 });
    this.bagIcon = this.add.image(W - 262, 116, 'soilBag').setScale(0.6 / TEX).setDepth(DEPTH.hud);
    this.bagText = txt(this, W - 228, 116, '', { size: 20, weight: 800, origin: [0, 0.5], scale: false }).setDepth(DEPTH.hud);
    this.updateBag();
    this.title = txt(this, W / 2, 104, this.T('collectTitle', 'Collect the samples'), { size: 26, weight: 800, color: CSS.yellow, origin: 0.5, scale: false, stroke: '#070b1d', strokeThickness: 6 }).setDepth(DEPTH.hud);

    this.guide.sequence(this.T('intro', []), { modal: true });
  }

  updateBag() {
    this.bagText.setText(`${this.T('bagLabel', 'Collected')}: ${this.collected.length} / ${this.items.length}`);
  }

  collect(s) {
    if (!s.enabled || this.phase === 'sort') return;
    s.enabled = false;
    s.disableInteractive();
    this.queue.push(s);
    if (!this.walking) this.walkNext();
  }

  // the astronaut hops (Moon gravity!) to each item and bags it
  walkNext() {
    const s = this.queue.shift();
    if (!s) {
      this.walking = false;
      return;
    }
    this.walking = true;
    const from = { x: this.astro.x, y: this.astro.y };
    const to = { x: s.x + (s.x > this.astro.x ? -30 : 30), y: s.y + 36 };
    const dist = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
    const hops = Math.max(1, Math.round(dist / 110));
    this.astro.setFlipX(to.x < from.x);
    let i = 0;
    const hop = () => {
      i++;
      const t = i / hops;
      const nx = Phaser.Math.Linear(from.x, to.x, t), ny = Phaser.Math.Linear(from.y, to.y, t);
      this.tweens.add({ targets: this.astro, x: nx, duration: 380, ease: 'Linear' });
      this.tweens.add({
        targets: this.astro,
        y: ny - 40,
        duration: 190,
        ease: 'Quad.easeOut',
        yoyo: false,
        onComplete: () =>
          this.tweens.add({
            targets: this.astro,
            y: ny,
            duration: 190,
            ease: 'Quad.easeIn',
            onComplete: () => {
              this.footprints.fillStyle(0x6f6f6c, 0.7);
              this.footprints.fillEllipse(nx - 6, ny - 2, 9, 4);
              this.footprints.fillEllipse(nx + 6, ny + 1, 9, 4);
              this.astro.setDepth(ny);
              if (i < hops) hop();
              else this.bag(s);
            }
          })
      });
    };
    hop();
  }

  bag(s) {
    Sfx.play('pickup');
    s.glow.destroy();
    this.tweens.add({
      targets: s,
      x: this.bagIcon.x,
      y: this.bagIcon.y,
      scale: 0.1,
      alpha: 0.4,
      duration: 500,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        s.setVisible(false);
        this.collected.push(s.item);
        this.updateBag();
        this.tweens.add({ targets: this.bagIcon, scale: (0.8 / TEX), duration: 120, yoyo: true });
        if (this.collected.length >= this.items.length) this.time.delayedCall(500, () => this.startSort());
        this.walkNext();
      }
    });
    floatText(this, s.x, s.y - 30, s.item.name, CSS.yellow, 18);
  }

  // ---------- part 2: sorting ----------
  async startSort() {
    this.phase = 'sort';
    Sfx.play('success');
    this.title.setText(this.T('sortTitle', 'Sort the samples'));
    // lab tray covers the ground
    this.astro.setVisible(false);
    const lab = this.add.graphics().setDepth(700);
    lab.fillStyle(0x0b1230, 0.96);
    lab.fillRect(0, 160, W, H - 160);
    lab.lineStyle(2, COLORS.stroke, 1);
    lab.lineBetween(0, 160, W, 160);
    this.binObjs = this.bins.map((b, i) => {
      const x = 22 + BIN_W / 2 + i * (BIN_W + 22);
      const c = this.add.container(x, BIN_Y).setDepth(701);
      const g = this.add.graphics();
      const col = Phaser.Display.Color.HexStringToColor(b.color).color;
      g.fillStyle(0x000000, 0.3);
      g.fillRoundedRect(-BIN_W / 2, -BIN_H / 2 + 5, BIN_W, BIN_H, 18);
      g.fillStyle(0x141d42, 1);
      g.fillRoundedRect(-BIN_W / 2, -BIN_H / 2, BIN_W, BIN_H, 18);
      g.lineStyle(4, col, 1);
      g.strokeRoundedRect(-BIN_W / 2, -BIN_H / 2, BIN_W, BIN_H, 18);
      g.fillStyle(col, 0.25);
      g.fillRoundedRect(-BIN_W / 2 + 10, -BIN_H / 2 + 10, BIN_W - 20, 56, 12);
      const name = txt(this, 0, -BIN_H / 2 + 26, b.name, { size: 20, weight: 800, origin: 0.5, scale: false });
      const sub = txt(this, 0, -BIN_H / 2 + 50, b.sub, { size: 13, color: CSS.dim, origin: 0.5, scale: false, align: 'center', wrap: BIN_W - 30 });
      fitText(sub, BIN_W - 24, 20, 10);
      const count = txt(this, 0, 36, '', { size: 16, weight: 700, origin: 0.5, color: CSS.dim, scale: false });
      c.add([g, name, sub, count]);
      return { c, b, count, n: 0 };
    });
    // draggable cards
    const order = shuffle(this.collected);
    const perRow = 5;
    this.cards = order.map((it, i) => {
      const x = 170 + (i % perRow) * 235, y = 264 + Math.floor(i / perRow) * 132;
      const c = this.add.container(x, y).setDepth(710);
      const g = this.add.graphics();
      g.fillStyle(0x1d2a5c, 1);
      g.fillRoundedRect(-95, -58, 190, 116, 16);
      g.lineStyle(2, COLORS.stroke, 1);
      g.strokeRoundedRect(-95, -58, 190, 116, 16);
      const im = img(this, 0, -12, it.key, 0.85);
      const nm = txt(this, 0, 40, it.name, { size: 15, weight: 700, origin: 0.5, scale: false });
      c.add([g, im, nm]);
      c.setSize(190, 116).setInteractive({ useHandCursor: true, draggable: true });
      this.input.setDraggable(c);
      c.item = it;
      c.home = { x, y };
      return c;
    });
    this.sorted = 0;
    this.input.on('dragstart', (p, c) => {
      c.setDepth(750);
      Sfx.play('select');
    });
    this.input.on('drag', (p, c, x, y) => c.setPosition(x, y));
    this.input.on('dragend', (p, c) => this.dropCard(c));
    // keyboard: TAB to a card, ENTER sends it to its bin automatically (accessible shortcut)
    this.cards.forEach((c) => {
      c.enabled = true;
      c.activate = () => {
        const bin = this.binObjs.find((b) => b.b.id === c.item.bin);
        c.setPosition(bin.c.x, bin.c.y);
        this.dropCard(c);
      };
      this.focus.add(c);
    });
    this.guide.say(this.T('sortIntro', ''), { next: false, position: 'top', width: 900 });
  }

  dropCard(c) {
    const bin = this.binObjs.find((b) => Math.abs(b.c.x - c.x) < BIN_W / 2 && Math.abs(b.c.y - c.y) < BIN_H / 2 + 20);
    if (!bin) {
      this.tweens.add({ targets: c, x: c.home.x, y: c.home.y, duration: 250 });
      c.setDepth(710);
      return;
    }
    if (bin.b.id === c.item.bin) {
      Sfx.play('success');
      c.disableInteractive();
      c.enabled = false;
      bin.n++;
      bin.count.setText(`× ${bin.n}`);
      this.tweens.add({ targets: c, x: bin.c.x, y: bin.c.y + 10, scale: 0.3, alpha: 0, duration: 300, onComplete: () => c.destroy() });
      this.tweens.add({ targets: bin.c, scale: 1.05, duration: 120, yoyo: true });
      toast(this, `${c.item.name}: ${c.item.fact}`, { y: 494, color: COLORS.green, duration: 3600, sound: false, speak: [c.item.name, c.item.fact], wrap: 900 });
      this.sorted++;
      if (this.sorted >= this.cards.length) this.time.delayedCall(900, () => this.finish());
    } else {
      Sfx.play('error');
      const right = this.bins.find((b) => b.id === c.item.bin);
      shake(this, bin.c, 6);
      const wrongPrefix = this.T('wrongPrefix', 'Not that box.');
      const hintPrefix = this.T('hintPrefix', 'Try this box instead:');
      toast(this, `${wrongPrefix} ${hintPrefix} "${right.name}" (${this.hintFor(c.item)}).`, { y: 494, color: COLORS.orange, duration: 3600, sound: false, speak: [wrongPrefix, hintPrefix, right.name], wrap: 900 });
      this.tweens.add({ targets: c, x: c.home.x, y: c.home.y, duration: 300 });
      c.setDepth(710);
    }
  }

  hintFor(item) {
    const b = this.bins.find((x) => x.id === item.bin);
    return b ? b.sub : '';
  }

  async finish() {
    Sfx.play('bigSuccess');
    await this.guide.say(this.T('doneLine', ''), { modal: true, nextLabel: this.T('continue', Content.ui('continue', 'Continue')) });
    this.done();
  }
}
