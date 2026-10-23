import { COLORS, CSS } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame, starsFor, InfoPanel, GoalBar } from '../common/kit.js';
import { txt } from '../../ui/text.js';
import { toast, floatText } from '../../ui/widgets.js';

// Webb's First Deep Field (July 2022), the real picture. Find the things on the list, one at a
// time (the task bar says what to look for): tap them in the picture. If you're stuck, a dashed
// ring shows where to look. (Spots are in the picture's own pixels: it is 1254 x 1280.)
const PIC = { x: 90, y: 174, w: 490, h: 500, iw: 1254, ih: 1280 };

export class DeepFieldScene extends BaseScene {
  constructor() {
    super('DeepField');
  }

  create() {
    this.setupStage({ bg: 0x020308 });
    starfield(this, { count: 80 });
    this.state = 'intro';
    this.mistakes = 0;
    this.found = 0;
    this.wanted = null;
    this.hintEl = null;
    this.targets = this.T('targets', []).map((t) => ({ ...t, found: false }));

    // the real picture (a web page element on top of the game) with circles for what you find
    const el = document.createElement('div');
    el.className = 'media-frame';
    el.style.width = `${PIC.w}px`;
    el.style.height = `${PIC.h}px`;
    el.style.position = 'relative';
    const im = document.createElement('img');
    im.src = Content.media(this.chapterId, this.T('image', ''));
    im.alt = this.T('imageAlt', '');
    im.onerror = () => {
      this.failed = true;
      toast(this, this.T('noImage', "The picture couldn't load. Check your internet connection."), { x: 955, y: 672, wrap: 500, color: COLORS.orange, duration: 4000 });
    };
    el.appendChild(im);
    this.markLayer = el;
    this.dom = this.addDom(PIC.x, PIC.y, el);
    this.dom.pointerEvents = 'none';
    // (hidden while Captain Nova talks, because web page elements sit on top of the game)
    this.setDomVisible(this.dom, false);
    txt(this, PIC.x + PIC.w / 2, PIC.y + PIC.h + 18, this.T('credit', 'Image: NASA, ESA, CSA, STScI'), { size: 13, color: CSS.dim, origin: 0.5, scale: false });
    // taps go to the game underneath the picture
    this.zone = this.add.zone(PIC.x + PIC.w / 2, PIC.y + PIC.h / 2, PIC.w, PIC.h).setInteractive({ useHandCursor: true });
    this.zone.on('pointerup', (p) => this.tap(p.worldX, p.worldY));

    // the list of things to find
    this.info = new InfoPanel(this, 630, 176, 610, 190, { title: '', text: '', size: 17 });
    this.info.g.setVisible(false);
    this.list = this.targets.map((t, i) => txt(this, 650, 394 + i * 44, `○  ${t.name}`, { size: 18, weight: 700, color: CSS.text, scale: false, wrap: 570 }));
    this.goal = new GoalBar(this);
    this.missesHere = 0;
    this.lastFind = 0;
    this.updateList();
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.setDomVisible(this.dom, true);
      this.state = 'play';
      this.lastFind = this.time.now;
      this.askNext(true);
    });
  }

  // the next thing to look for, in the task bar
  askNext(first = false) {
    const t = this.targets.find((k) => !k.found);
    this.wanted = t;
    this.updateList();
    if (!t) return;
    this.goal.set({ title: t.ask || t.name, help: this.T('tapHelp', 'Look in the picture and tap it.') }, { count: `${this.found} / ${this.targets.length}`, speak: false });
    Speech.say(first ? [t.ask, this.T('tapHelp', '')] : t.ask);
  }

  updateList() {
    this.targets.forEach((t, i) => this.list[i].setText(`${t.found ? '✓' : t === this.wanted ? '▶' : '○'}  ${t.name}`).setColor(t.found ? '#9dffcf' : t === this.wanted ? CSS.yellow : CSS.text));
  }

  // a dashed ring in the picture around the thing to find
  showHint() {
    const t = this.wanted;
    if (!t || this.hintEl) return;
    const d = document.createElement('div');
    const r = (t.r || 40) * (PIC.w / PIC.iw) * 1.6;
    d.style.cssText = `position:absolute;left:${(t.x / PIC.iw) * PIC.w - r}px;top:${(t.y / PIC.ih) * PIC.h - r}px;width:${r * 2}px;height:${r * 2}px;border:3px dashed #ffd166;border-radius:50%;pointer-events:none`;
    this.markLayer.appendChild(d);
    this.hintEl = d;
  }

  clearHint() {
    if (this.hintEl) this.hintEl.remove();
    this.hintEl = null;
  }

  update(time) {
    // stuck for a while? show where to look
    if (this.state === 'play' && !this.hintEl && time - this.lastFind > 15000) this.showHint();
  }

  mark(t) {
    const d = document.createElement('div');
    const r = (t.r || 40) * (PIC.w / PIC.iw);
    d.style.cssText = `position:absolute;left:${(t.x / PIC.iw) * PIC.w - r}px;top:${(t.y / PIC.ih) * PIC.h - r}px;width:${r * 2}px;height:${r * 2}px;border:3px solid #3ddc97;border-radius:50%;box-shadow:0 0 12px #3ddc97;pointer-events:none`;
    this.markLayer.appendChild(d);
  }

  tap(x, y) {
    if (this.state !== 'play') return;
    const ix = ((x - PIC.x) / PIC.w) * PIC.iw, iy = ((y - PIC.y) / PIC.h) * PIC.ih;
    const t = this.targets.find((k) => !k.found && Math.hypot(k.x - ix, k.y - iy) < (k.r || 40) * 1.25);
    if (!t) {
      this.mistakes++;
      Sfx.play('error');
      toast(this, this.T('notThis', 'Look closer! Check the list for what to find.'), { x: 935, y: 672, wrap: 560, color: COLORS.orange, sound: false, speak: true, duration: 1600 });
      this.missesHere++;
      if (this.missesHere >= 3) this.showHint();
      return;
    }
    this.missesHere = 0;
    this.lastFind = this.time.now;
    this.clearHint();
    t.found = true;
    this.found++;
    Sfx.play('success');
    this.mark(t);
    floatText(this, x, y - 30, '✓', CSS.green, 30);
    this.info.g.setVisible(true);
    this.info.show(t.name, t.fact);
    if (this.found >= this.targets.length) {
      this.wanted = null;
      this.updateList();
      this.goal.setCount(`${this.found} / ${this.targets.length}`);
      Speech.say(t.fact);
      return this.win();
    }
    // the fact first, then what to find next
    Speech.say(t.fact).then(() => this.state === 'play' && this.askNext());
    this.wanted = this.targets.find((k) => !k.found);
    this.updateList();
    this.goal.set({ title: this.wanted.ask || this.wanted.name, help: this.T('tapHelp', 'Look in the picture and tap it.') }, { count: `${this.found} / ${this.targets.length}`, speak: false });
  }

  async win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    await new Promise((r) => this.time.delayedCall(2500, r));
    if (this._leaving) return;
    this.setDomVisible(this.dom, false);
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    finishGame(this, { stars: starsFor(this.mistakes, 2, 5) });
  }
}
