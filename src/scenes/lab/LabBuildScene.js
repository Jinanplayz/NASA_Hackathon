import { W, H, FULL, TEX, COLORS, CSS, DEPTH } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { playIntro, GoalBar, idleHint } from '../common/kit.js';
import { txt, fitText } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { RoundBox, toast, shake } from '../../ui/widgets.js';
import { drawIcon } from '../../ui/icons.js';
import { Lab, CATEGORIES, labContent, part, shipMass, rocketLift, rate } from './labState.js';
import { partTexture } from './labArt.js';
import { CreditsPill, shipImage, L, note } from './labKit.js';
import { QuizCard } from './LabQuizScene.js';

// Test Your Knowledge: the workshop. Tap parts to add them to the ship (paying their cost) or
// take them off again (getting it back). The same screen is the design review after testing,
// with every kind of part, the engineers' notes from the tests, and bonus questions.
const RX = 470, RW = 780; // the right-hand side: tabs and part cards
const CARD_W = 250, GAP = 15;

export class LabBuildScene extends BaseScene {
  constructor() {
    super('LabBuild');
  }

  create() {
    this.setupStage({ bg: 0x0a1230, music: 'lab' });
    blueprint(this);
    this.state = 'intro';
    this.review = !!this.T('review', false);
    if (this.review) Lab.ensureShip();
    else if (!Lab.s.mission) Lab.start(Lab.mission, 12);
    this.cats = this.T('categories', ['body', 'power', 'comms']).map((id) => CATEGORIES.find((c) => c.id === id)).filter(Boolean);
    this.tab = this.cats[0].id;
    this.goal = new GoalBar(this);

    // left: the ship as it is now
    // (the review has two more buttons below, so everything sits a little higher)
    this.py = this.review ? -44 : 0;
    this.add.existing(new RoundBox(this)).draw(24, 172, 422, 530, { fill: 0x0b1230, alpha: 0.9, radius: 20, stroke: COLORS.stroke, strokeWidth: 3 });
    this.shipGlow = this.add.image(235, 330 + this.py * 0.75, 'softDot').setDisplaySize(380, 300).setTint(0x3a5bd8).setAlpha(0.3);
    this.ship = null;
    this.emptyText = txt(this, 235, 330, L('startHint', 'Choose a spacecraft to start'), { size: 20, weight: 700, color: CSS.dim, origin: 0.5, align: 'center', wrap: 340, scale: false });
    this.massText = txt(this, 48, 476 + this.py, '', { size: 19, weight: 800, scale: false });
    this.liftText = txt(this, 48, 506 + this.py, '', { size: 17, weight: 700, color: CSS.dim, scale: false, wrap: 380 });
    this.barG = this.add.graphics();
    this.credits = new CreditsPill(this, 235, this.review ? 566 : 664, { w: 230 });
    if (this.review) this.reviewButtons();

    // right: tabs, part cards and the info line
    this.tabs = this.cats.map((c, i) => this.makeTab(c, i));
    this.pickText = txt(this, RX + 8, this.review ? 282 : 232, '', { size: 16, weight: 700, color: CSS.cyan, scale: false });
    this.cards = [];
    // details of the last part tapped
    const iy = this.review ? 548 : 530, ih = this.review ? 92 : 104;
    this.add.existing(new RoundBox(this)).draw(RX, iy, 640, ih, { fill: 0x0b1230, alpha: 0.92, radius: 16, stroke: COLORS.stroke, strokeWidth: 2, shadow: false });
    this.infoIcon = this.add.image(RX + 52, iy + ih / 2, '__DEFAULT').setVisible(false);
    this.infoName = txt(this, RX + 100, iy + 10, '', { size: 18, weight: 800, color: CSS.yellow, scale: false });
    this.info = txt(this, RX + 100, iy + 36, L('tapPart', 'Tap a part to hear about it and add it to your ship.'), { size: 15, color: CSS.text, scale: false, wrap: 525, lineSpacing: 2 });
    this.infoBox = { y: iy, h: ih };
    this.doneBtn = new Button(this, 1140, 672, { width: 210, height: 58, size: 22, icon: 'check', label: this.review ? L('ready', 'Ready to launch') : L('done', 'Done'), variant: 'success', onClick: () => this.finish() });

    this.refresh();
    this.showTab(this.tab);
    // stuck? point at the first part on the tab, then at Done
    idleHint(this, () => {
      if (this.state !== 'build') return null;
      if (!this.chosenHere()) return this.cards[0] ? { x: this.cards[0].x, y: this.cards[0].y - 70 } : null;
      return { x: this.doneBtn.x, y: this.doneBtn.y - 40 };
    }, { delay: 12000 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'build';
      this.goal.set(this.T('task', { title: 'Build your spacecraft', help: '' }));
    });
  }

  // anything picked on this screen yet?
  chosenHere() {
    return this.cats.some((c) => Lab.picked(c.id).length);
  }

  makeTab(c, i) {
    const n = this.cats.length;
    const perRow = n > 4 ? 4 : n;
    const w = perRow === 4 ? (RW - 3 * 10) / 4 : Math.min(250, (RW - (n - 1) * 12) / n);
    const row = Math.floor(i / perRow), col = i % perRow;
    const b = new Button(this, RX + w / 2 + col * (w + (perRow === 4 ? 10 : 12)), 196 + row * 48 + (n > 4 ? 0 : 4), {
      width: w,
      height: n > 4 ? 42 : 50,
      size: n > 4 ? 16 : 19,
      label: L(`categories.${c.id}`, c.id),
      variant: 'secondary',
      radius: 14,
      onClick: () => this.showTab(c.id)
    });
    b.cat = c.id;
    return b;
  }

  showTab(id) {
    this.tab = id;
    this.tabs.forEach((b) => b.setVariant(b.cat === id ? 'primary' : 'secondary'));
    this.cards.forEach((c) => c.destroy());
    const cat = CATEGORIES.find((c) => c.id === id);
    this.pickText.setText(cat.pick === 'one' ? L('pickOne', 'Pick one') : `${L('pickMany', 'Pick any')}${cat.max ? ` (${L('upTo', 'up to')} ${cat.max})` : ''}`);
    const top = this.review ? 300 : 262;
    const h = this.review ? 110 : 120;
    this.cards = cat.parts.map((pid, i) => this.makeCard(pid, RX + CARD_W / 2 + (i % 3) * (CARD_W + GAP), top + h / 2 + Math.floor(i / 3) * (h + 10), h));
  }

  showInfo(pid) {
    const p = part(pid);
    this.infoIcon.setTexture(partTexture(this, pid)).setScale(0.8 / TEX).setVisible(true);
    this.infoName.setText(p.name);
    this.info.setText(p.info);
    fitText(this.info, 525, this.infoBox.h - 42, 11);
  }

  makeCard(pid, x, y, h) {
    const p = part(pid);
    const c = this.add.container(x, y).setDepth(DEPTH.ui - 2);
    c.box = new RoundBox(this);
    c.add(c.box);
    c.add(this.add.image(-CARD_W / 2 + 46, 0, partTexture(this, pid)).setScale(0.72 / TEX));
    const name = txt(this, -CARD_W / 2 + 92, -h / 2 + 12, p.name, { size: 17, weight: 800, scale: false, wrap: CARD_W - 124 });
    fitText(name, CARD_W - 124, 44, 12);
    c.add(name);
    // cost, and mass (or, for rockets, how much they carry to the destination)
    c.add(this.add.circle(-CARD_W / 2 + 102, h / 2 - 42, 9, COLORS.yellow));
    c.add(txt(this, -CARD_W / 2 + 117, h / 2 - 42, String(p.cost), { size: 17, weight: 800, color: CSS.yellow, origin: [0, 0.5], scale: false }));
    const sub = p.lift ? `${L('carries', 'Carries')} ${p.lift[Lab.mission]} ${L('tons', 't')}` : `${L('massShort', 'Mass')}: ${p.mass} ${L('tons', 't')}`;
    c.add(txt(this, -CARD_W / 2 + 92, h / 2 - 18, sub, { size: 14, weight: 700, color: CSS.dim, origin: [0, 0.5], scale: false }));
    c.check = this.add.graphics();
    c.add(c.check);
    c.pid = pid;
    c.setSize(CARD_W, h).setInteractive({ useHandCursor: true });
    c.on('pointerup', () => this.tap(c));
    c.activate = () => this.tap(c);
    c.enabled = true;
    c.h = h;
    this.focus.add(c);
    c.once('destroy', () => this.focus.remove(c));
    this.drawCard(c);
    return c;
  }

  drawCard(c) {
    const on = Lab.has(c.pid);
    const cat = CATEGORIES.find((k) => k.parts.includes(c.pid));
    const others = Lab.picked(cat.id).reduce((s, x) => s + part(x).cost, 0);
    const afford = on || Lab.s.credits + (cat.pick === 'one' ? others : 0) >= part(c.pid).cost;
    c.box.draw(-CARD_W / 2, -c.h / 2, CARD_W, c.h, { fill: on ? 0x1b3a6b : COLORS.panel, alpha: 1, radius: 16, stroke: on ? COLORS.cyan : COLORS.stroke, strokeWidth: on ? 4 : 2, shadowY: 4 });
    c.setAlpha(afford ? 1 : 0.55);
    c.check.clear();
    if (on) {
      c.check.fillStyle(COLORS.cyan, 1);
      c.check.fillCircle(CARD_W / 2 - 20, -c.h / 2 + 20, 13);
      drawIcon(c.check, 'check', CARD_W / 2 - 20, -c.h / 2 + 20, 16, COLORS.bg);
    }
  }

  tap(c) {
    if (this.state !== 'build') return;
    const p = part(c.pid);
    const had = Lab.has(c.pid);
    const why = Lab.toggle(c.pid);
    this.showInfo(c.pid);
    if (why) {
      Sfx.play('error');
      shake(this, c, 6);
      toast(this, why === 'full' ? L('full', 'That is the most you can carry') : L('tooPoor', 'Not enough credits'), { x: RX + 320, y: this.infoBox.y - 18, color: COLORS.orange, sound: false, duration: 1600 });
      Speech.say([p.name, p.info]);
      return;
    }
    Sfx.play(had ? 'click' : 'select');
    if (!had) this.tweens.add({ targets: c, scale: 1.05, duration: 100, yoyo: true });
    Speech.say(had ? p.name : [p.name, p.info]);
    this.credits.refresh();
    this.refresh();
  }

  // update the ship picture, the mass and the cards
  refresh() {
    const d = Lab.design();
    if (Lab.picked('body').length) {
      const old = this.ship;
      this.ship = shipImage(this, 235, 330 + this.py * 0.75, this.review ? 1.08 : 1.25);
      if (old) {
        this.ship.setAlpha(0);
        this.tweens.add({ targets: this.ship, alpha: 1, duration: 180 });
        this.tweens.add({ targets: old, alpha: 0, duration: 180, onComplete: () => old.destroy() });
      }
    } else if (this.ship) {
      this.ship.destroy();
      this.ship = null;
    }
    this.emptyText.setVisible(!this.ship);
    const mass = shipMass(d);
    this.massText.setText(`${L('mass', 'Ship mass')}: ${mass} ${L('tons', 't')}`);
    const g = this.barG;
    g.clear();
    if (Lab.picked('rocket').length) {
      const lift = rocketLift(d);
      this.liftText.setText(`${L('lift', 'Rocket can carry')}: ${lift} ${L('tons', 't')} ${L('to', 'to')} ${L(`missions.${d.mission}`, d.mission)}`);
      // mass against what the rocket can carry
      const max = Math.max(mass, lift, 1) * 1.1;
      const bx = 48, bw = 372;
      g.fillStyle(0x000000, 0.4);
      const y1 = 540 + this.py, y2 = 562 + this.py;
      g.fillRoundedRect(bx, y1, bw, 16, 8);
      g.fillRoundedRect(bx, y2, bw, 16, 8);
      g.fillStyle(mass <= lift ? COLORS.green : COLORS.red, 1);
      g.fillRoundedRect(bx, y1, Math.max(16, (bw * mass) / max), 16, 8);
      g.fillStyle(COLORS.cyan, 1);
      g.fillRoundedRect(bx, y2, Math.max(16, (bw * lift) / max), 16, 8);
    } else {
      this.liftText.setText('');
    }
    this.cards.forEach((c) => this.drawCard(c));
    if (this.notesBtn) this.updateReview();
  }

  // ---------- design review extras ----------
  reviewButtons() {
    this.notesBtn = new Button(this, 235, 632, { width: 380, height: 50, size: 19, icon: 'info', label: L('notes', "Engineers' notes"), variant: 'warn', onClick: () => this.showNotes() });
    this.bonusBtn = new Button(this, 235, 682, { width: 380, height: 46, size: 18, icon: 'star', label: L('bonus', 'Bonus questions'), variant: 'secondary', onClick: () => this.bonus() });
  }

  // notes the tests found (fixed ones get ticked off)
  testNotes() {
    const now = rate(Lab.design()).notes;
    return Object.keys(Lab.s.events)
      .filter((k) => k.startsWith('note_') && Lab.s.events[k])
      .map((k) => k.slice(5))
      .map((code) => ({ code, fixed: !now.includes(code) }));
  }

  updateReview() {
    const open = this.testNotes().filter((n) => !n.fixed).length;
    this.notesBtn.setLabel(`${L('notes', "Engineers' notes")}${open ? ` (${open})` : ''}`);
    const left = this.bonusList().length;
    this.bonusBtn.setLabel(`${L('bonus', 'Bonus questions')} (${left})`).setEnabled(left > 0);
  }

  showNotes() {
    if (this.state !== 'build') return;
    const notes = this.testNotes();
    const root = this.add.container(0, 0).setDepth(DEPTH.modal);
    root.add(this.add.rectangle(W / 2, H / 2, FULL.w, FULL.h, 0x000000, 0.65).setInteractive());
    // problems still open come first; more than six notes go into two columns
    const list = notes.filter((n) => !n.fixed).concat(notes.filter((n) => n.fixed)).slice(0, 12);
    const two = list.length > 6;
    const pw = two ? 1100 : 900;
    const perCol = two ? Math.ceil(list.length / 2) : list.length;
    const colW = two ? (pw - 40) / 2 : pw - 40;
    const say = [];
    // write the notes first, so the panel can be sized to fit them
    const rows = list.map((n, i) => {
      const t = txt(this, 0, 0, note(n.code), { size: two ? 16 : 18, color: n.fixed ? CSS.dim : CSS.text, wrap: colW - 80, scale: false, lineSpacing: 3 });
      fitText(t, colW - 80, two ? 64 : 66, 12);
      if (!n.fixed) say.push(note(n.code));
      return { n, t, c: two ? Math.floor(i / perCol) : 0, h: Math.max(44, t.height + (two ? 12 : 14)) };
    });
    const tallest = Math.max(80, ...[0, 1].map((c) => rows.filter((r) => r.c === c).reduce((s, r) => s + r.h, 0)));
    const ph = Math.min(H - 40, tallest + 190);
    root.add(new RoundBox(this).draw(W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, { fill: COLORS.panel, stroke: COLORS.orange, strokeWidth: 3, radius: 24 }));
    root.add(txt(this, W / 2, H / 2 - ph / 2 + 40, L('notes', "Engineers' notes"), { size: 30, weight: 800, color: CSS.yellow, origin: 0.5, scale: false }));
    const top = H / 2 - ph / 2 + 86;
    if (!notes.length) {
      root.add(txt(this, W / 2, top + 10, this.T('allGood', 'No problems found.'), { size: 22, origin: [0.5, 0], align: 'center', wrap: pw - 80, scale: false }));
      say.push(this.T('allGood', ''));
    }
    const ys = [top, top];
    rows.forEach(({ n, t, c, h }) => {
      const x = W / 2 - pw / 2 + 20 + c * colW;
      const g = this.add.graphics();
      drawIcon(g, n.fixed ? 'check' : 'info', x + 30, ys[c] + 14, 22, n.fixed ? COLORS.green : COLORS.orange);
      t.setPosition(x + 60, ys[c]);
      root.add([g, t]);
      ys[c] += h;
    });
    Speech.say(say);
    const close = new Button(this, W / 2, H / 2 + ph / 2 - 44, { width: 220, height: 56, label: L('done', 'Done'), icon: 'check', variant: 'secondary', onClick: () => done() });
    close.setDepth(DEPTH.modal + 1);
    close._menu = root;
    this.focus.setTrap((it) => it._menu === root);
    this.state = 'notes';
    const done = () => {
      Speech.stop();
      this.focus.clearTrap();
      close.destroy();
      root.destroy();
      this.state = 'build';
    };
  }

  // questions given up on in the quizzes
  bonusList() {
    const all = ['quiz1', 'quiz2', 'quiz3'].flatMap((k) => (labContent()[k] || {}).questions || []);
    const missed = Lab.missed();
    return all.filter((q) => missed.includes(q.id));
  }

  bonus() {
    if (this.state !== 'build') return;
    const list = this.bonusList();
    if (!list.length) {
      Speech.say(this.T('noBonus', ''));
      return;
    }
    const q = list[Math.floor(Math.random() * list.length)];
    this.state = 'bonus';
    const root = this.add.container(0, 0).setDepth(DEPTH.modal);
    root.add(this.add.rectangle(W / 2, H / 2, FULL.w, FULL.h, 0x000000, 0.78).setInteractive());
    toast(this, this.T('bonusIntro', 'Bonus question!'), { y: 130, color: COLORS.yellow, sound: false, duration: 2200 });
    const card = new QuizCard(this, q, {
      y: 176,
      depth: DEPTH.modal + 1,
      onDone: (r) => {
        const right = r !== 'missed';
        Lab.recordAnswer(q.id, right, r === 'second' ? 2 : 1);
        if (right) {
          Lab.earn(2);
          this.credits.refresh();
        }
        Speech.say(right ? this.T('bonusRight', '') : this.T('bonusWrong', ''));
        this.time.delayedCall(right ? 900 : 300, () => {
          card.destroy();
          root.destroy();
          this.focus.clearTrap();
          this.state = 'build';
          this.refresh();
        });
      }
    });
    card.buttons.forEach((b) => (b._menu = root));
    this.focus.setTrap((it) => it._menu === root);
    this.time.delayedCall(300, () => card.read());
  }

  finish() {
    if (this.state !== 'build') return;
    const needBody = this.cats.some((c) => c.id === 'body') && !Lab.picked('body').length;
    const needRocket = this.cats.some((c) => c.id === 'rocket') && !Lab.picked('rocket').length;
    if (needBody || needRocket) {
      Sfx.play('error');
      const line = needBody ? this.T('needBody', '') : this.T('needRocket', '');
      toast(this, line, { x: RX + 320, y: this.infoBox.y - 18, color: COLORS.orange, sound: false, speak: true });
      this.showTab(needBody ? 'body' : 'rocket');
      return;
    }
    this.state = 'done';
    Sfx.play('bigSuccess');
    this.guide.say(this.T('doneLine', ''), { modal: true }).then(() => this.done(3));
  }
}
