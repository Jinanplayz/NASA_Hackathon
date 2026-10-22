import { W, COLORS, CSS, TEX } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { txt, fitText } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { drawPanel } from '../../ui/widgets.js';
import { drawIcon } from '../../ui/icons.js';

// NASA-style mission summary: stats, the missions that led to Apollo 11,
// and the technology Apollo gave the world.
export class SummaryScene extends BaseScene {
  constructor() {
    super('Summary');
  }

  create() {
    this.setupStage();
    // (Phaser reuses this screen when it is played again: start from a clean slate)
    this.photo = null;
    starfield(this, { count: 180 });
    this.pages = this.T('pages', []);
    this.page = -1;
    this.layer = this.add.container(0, 0);
    this.title = txt(this, W / 2, 108, '', { size: 34, weight: 800, color: CSS.yellow, origin: 0.5, scale: false });
    this.back = new Button(this, 150, 650, { width: 200, height: 64, label: this.T('back', 'Back'), icon: 'back', variant: 'secondary', onClick: () => this.show(this.page - 1) });
    this.next = new Button(this, W - 170, 650, { width: 240, height: 66, label: this.T('next', 'Next'), icon: 'next', onClick: () => this.show(this.page + 1) });
    this.dots = this.add.graphics();
    this.show(0);
  }

  show(i) {
    if (i >= this.pages.length) {
      this.done(3);
      return;
    }
    if (i < 0) return;
    this.page = i;
    this.layer.removeAll(true);
    if (this.photo) {
      this.photo.destroy();
      this.domEls = this.domEls.filter((d) => d !== this.photo);
      this.photo = null;
    }
    const p = this.pages[i];
    this.title.setText(p.title);
    this.back.setEnabled(i > 0);
    const last = i === this.pages.length - 1;
    this.next.setLabel(last ? this.T('finish', 'Finish') : this.T('next', 'Next'));
    if (last) this.next.pulse();
    else this.next.stopPulse();
    this.dots.clear();
    this.pages.forEach((_, k) => {
      this.dots.fillStyle(k === i ? COLORS.yellow : 0x3a4470, 1);
      this.dots.fillCircle(W / 2 + (k - (this.pages.length - 1) / 2) * 24, 650, k === i ? 8 : 6);
    });
    if (p.kind === 'stats') this.statsPage(p);
    else if (p.kind === 'timeline') this.timelinePage(p);
    else this.techPage(p);
    Sfx.play('whoosh');
    Speech.say([p.title, p.say || '']);
    this.layer.setAlpha(0);
    this.tweens.add({ targets: this.layer, alpha: 1, duration: 300 });
  }

  statsPage(p) {
    p.stats.forEach((s, k) => {
      const col = k % 2, row = Math.floor(k / 2);
      const x = 40 + col * 330, y = 156 + row * 138;
      const g = this.add.graphics();
      drawPanel(g, x, y, 314, 124, { fill: COLORS.panel, radius: 18, stroke: COLORS.stroke });
      const l = txt(this, x + 20, y + 18, s.label.toUpperCase(), { size: 14, weight: 800, color: CSS.cyan, scale: false, wrap: 280 });
      const v = txt(this, x + 20, y + 48, s.value, { size: 23, weight: 700, wrap: 280 });
      fitText(v, 280, 64, 14);
      this.layer.add([g, l, v]);
    });
    if (p.image && p.image.src) {
      const el = document.createElement('div');
      el.className = 'media-frame';
      el.style.width = '520px';
      el.style.height = '400px';
      const im = document.createElement('img');
      im.src = Content.media(this.chapterId, p.image.src);
      im.alt = p.image.alt || '';
      im.onerror = () => {
        if (this.photo) this.photo.setVisible(false);
      };
      el.appendChild(im);
      this.photo = this.addDom(720, 156, el);
      const cr = txt(this, 980, 572, p.image.credit || Content.ui('photoCredit', 'Photo: NASA'), { size: 14, color: CSS.dim, origin: 0.5, scale: false });
      // fallback art under the photo in case it can't load (a page can choose it: "fallback": "csmLm")
      const key = p.fallback && this.textures.exists(p.fallback) ? p.fallback : 'moonwalker';
      const fallback = this.add.image(980, 356, key);
      fallback.setScale(Math.min(360 / fallback.width, 300 / fallback.height, 2.6 / TEX));
      this.layer.addAt(fallback, 0);
      this.layer.add(cr);
    }
  }

  timelinePage(p) {
    const items = p.items;
    const x0 = 110, x1 = W - 110, y = 330;
    const g = this.add.graphics();
    g.lineStyle(6, COLORS.cyan, 0.8);
    g.lineBetween(x0 - 40, y, x1 + 40, y);
    this.layer.add(g);
    items.forEach((it, k) => {
      const x = x0 + (k / (items.length - 1)) * (x1 - x0);
      const up = k % 2 === 0;
      const last = k === items.length - 1;
      const dot = this.add.graphics();
      dot.fillStyle(last ? COLORS.yellow : COLORS.cyan, 1);
      dot.fillCircle(x, y, last ? 16 : 11);
      dot.lineStyle(3, 0x070b1d, 1);
      dot.strokeCircle(x, y, last ? 16 : 11);
      const yr = txt(this, x, up ? y + 28 : y - 28, it.year, { size: 17, weight: 800, origin: [0.5, up ? 0 : 1], color: last ? CSS.yellow : CSS.cyan, scale: false });
      const cardY = up ? y - 190 : y + 64;
      const cg = this.add.graphics();
      drawPanel(cg, x - 82, cardY, 164, 126, { fill: last ? 0x3a2f10 : COLORS.panel, radius: 14, stroke: last ? COLORS.yellow : COLORS.stroke });
      const nm = txt(this, x, cardY + 12, it.name, { size: 16, weight: 800, origin: [0.5, 0], align: 'center', wrap: 150, scale: false });
      fitText(nm, 150, 40, 11);
      const tx = txt(this, x, cardY + 16 + nm.height + 4, it.text, { size: 13, origin: [0.5, 0], align: 'center', wrap: 148, scale: false, color: CSS.dim });
      fitText(tx, 150, 126 - nm.height - 28, 10);
      const stem = this.add.graphics();
      stem.lineStyle(2, COLORS.dim, 0.6);
      stem.lineBetween(x, up ? cardY + 126 : cardY, x, up ? y - 12 : y + 12);
      [cg, nm, tx, stem, dot, yr].forEach((o, n) => {
        o.setAlpha(0);
        this.tweens.add({ targets: o, alpha: 1, duration: 300, delay: 200 + k * 220 });
      });
      this.layer.add([stem, cg, nm, tx, dot, yr]);
    });
  }

  techPage(p) {
    p.items.forEach((it, k) => {
      const col = k % 2, row = Math.floor(k / 2);
      const x = 60 + col * 590, y = 160 + row * 210;
      const g = this.add.graphics();
      drawPanel(g, x, y, 570, 192, { fill: COLORS.panel, radius: 20, stroke: COLORS.stroke });
      const icon = it.icon || it.art ? this.namedIcon(it, x + 70, y + 96) : this.techIcon(k, x + 70, y + 96);
      const nm = txt(this, x + 140, y + 26, it.name, { size: 24, weight: 800, color: CSS.yellow, wrap: 410 });
      const tx = txt(this, x + 140, y + 66, it.text, { size: 18, wrap: 410 });
      fitText(tx, 410, 110, 12);
      this.layer.add([g, icon, nm, tx]);
    });
  }

  // An icon chosen by the page: "art" is a picture from the game, "icon" a simple drawing
  // (team, tank, checklist, heart, or any button icon such as star, check, gear, info).
  namedIcon(it, x, y) {
    const c = this.add.container(0, 0);
    const g = this.add.graphics();
    g.fillStyle(0x070b1d, 1);
    g.fillCircle(x, y, 50);
    g.lineStyle(3, COLORS.cyan, 1);
    g.strokeCircle(x, y, 50);
    c.add(g);
    if (it.art && this.textures.exists(it.art)) {
      const im = this.add.image(x, y, it.art);
      im.setScale(Math.min(80 / im.width, 80 / im.height));
      c.add(im);
      return c;
    }
    const d = this.add.graphics();
    c.add(d);
    switch (it.icon) {
      case 'team':
        [[-20, 6, 0x4fd1ff], [20, 6, 0xffd166], [0, -4, 0x3ddc97]].forEach(([dx, dy, col]) => {
          d.fillStyle(col, 1);
          d.fillCircle(x + dx, y + dy - 14, 10);
          d.fillRoundedRect(x + dx - 13, y + dy - 2, 26, 22, 9);
        });
        break;
      case 'tank':
        d.fillStyle(0xdfe3ea, 1);
        d.fillCircle(x, y, 26);
        d.fillStyle(COLORS.cyan, 0.6);
        d.fillCircle(x, y, 18);
        d.fillStyle(0x9aa1ae, 1);
        d.fillRect(x - 5, y - 36, 10, 12);
        break;
      case 'checklist':
        d.fillStyle(0xf5ecd6, 1);
        d.fillRoundedRect(x - 22, y - 30, 44, 60, 5);
        for (let i = 0; i < 4; i++) {
          d.fillStyle(COLORS.green, 1);
          d.fillRect(x - 15, y - 20 + i * 13, 6, 6);
          d.fillStyle(0x7d8597, 1);
          d.fillRect(x - 5, y - 19 + i * 13, 20, 4);
        }
        break;
      case 'heart':
        d.fillStyle(COLORS.pink, 1);
        d.fillCircle(x - 12, y - 8, 15);
        d.fillCircle(x + 12, y - 8, 15);
        d.fillTriangle(x - 26, y - 1, x + 26, y - 1, x, y + 28);
        break;
      default:
        drawIcon(d, it.icon, x, y, 44, COLORS.yellow);
    }
    return c;
  }

  techIcon(k, x, y) {
    if (k === 3) return this.add.image(x, y, 'moonSmall').setScale(0.9 / TEX);
    const g = this.add.graphics();
    g.fillStyle(0x070b1d, 1);
    g.fillCircle(x, y, 50);
    g.lineStyle(3, COLORS.cyan, 1);
    g.strokeCircle(x, y, 50);
    if (k === 0) {
      g.fillStyle(0x3a3f4b, 1);
      g.fillRect(x - 22, y - 22, 44, 44);
      g.lineStyle(3, 0xd8ad52, 1);
      for (let i = -1; i <= 1; i++) {
        g.lineBetween(x - 32, y + i * 12, x - 22, y + i * 12);
        g.lineBetween(x + 22, y + i * 12, x + 32, y + i * 12);
        g.lineBetween(x + i * 12, y - 32, x + i * 12, y - 22);
        g.lineBetween(x + i * 12, y + 22, x + i * 12, y + 32);
      }
    } else if (k === 1) {
      g.lineStyle(5, COLORS.green, 1);
      g.lineBetween(x - 14, y - 20, x - 28, y);
      g.lineBetween(x - 28, y, x - 14, y + 20);
      g.lineBetween(x + 14, y - 20, x + 28, y);
      g.lineBetween(x + 28, y, x + 14, y + 20);
      g.lineBetween(x + 6, y - 22, x - 6, y + 22);
    } else if (k === 2) {
      g.fillStyle(COLORS.orange, 1);
      g.fillRoundedRect(x - 26, y - 16, 40, 22, 6);
      g.fillRect(x - 16, y + 4, 14, 22);
      g.fillStyle(0x9aa1ae, 1);
      g.fillRect(x + 14, y - 9, 20, 8);
    }
    return g;
  }
}
