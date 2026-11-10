import { TEX, COLORS, CSS } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { playIntro, GoalBar, idleHint } from '../common/kit.js';
import { txt, fitText } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { RoundBox } from '../../ui/widgets.js';
import { Lab } from './labState.js';
import { PAINT, PATTERNS, SHAPES, EMBLEMS, craftTexture, rocketTexture, patchTexture } from './labArt.js';

// Test Your Knowledge: name the ship and the mission, paint it, and design a mission patch, like
// real crews do. The names can be typed (a text box on top of the game) or rolled at random.
const RX = 548;
const MAX_NAME = 20;

export class LabPaintScene extends BaseScene {
  constructor() {
    super('LabPaint');
  }

  create() {
    // (Phaser reuses this scene object on every visit, so start from a clean slate)
    this.patchTimer = null;
    this.setupStage({ bg: 0x0a1230, music: 'lab' });
    blueprint(this);
    this.state = 'intro';
    Lab.ensureShip();
    const ideas = this.T('names', {});
    if (!Lab.s.name || Lab.s.name === 'Star Sailor 1') Lab.s.name = this.randomShip(ideas);
    if (!Lab.s.missionName || Lab.s.missionName === 'Mission Nova') Lab.s.missionName = this.pick(ideas.mission || ['Mission Nova']);
    Lab.save();
    this.labels = this.T('labels', {});
    this.goal = new GoalBar(this);

    // left: the ship, its rocket and its patch
    this.add.existing(new RoundBox(this)).draw(24, 172, 504, 530, { fill: 0x0b1230, alpha: 0.9, radius: 20, stroke: COLORS.stroke, strokeWidth: 3 });
    this.nameText = txt(this, 276, 196, '', { size: 28, weight: 800, color: CSS.yellow, origin: [0.5, 0], scale: false });
    this.missionText = txt(this, 276, 234, '', { size: 18, weight: 700, color: CSS.cyan, origin: [0.5, 0], scale: false });
    this.add.image(250, 380, 'softDot').setDisplaySize(380, 300).setTint(0x3a5bd8).setAlpha(0.28);
    this.craft = this.add.image(250, 382, '__DEFAULT');
    this.rocket = this.add.image(455, 690, '__DEFAULT').setOrigin(0.5, 1);
    this.patch = this.add.image(120, 600, '__DEFAULT');
    this.made = new Set(); // patch textures made on this screen (old ones are thrown away)

    // right: tabs and the controls for each
    const tabs = this.labels.tabs || {};
    this.tabBtns = ['name', 'paint', 'patch'].map((id, i) =>
      Object.assign(new Button(this, RX + 112 + i * 234, 200, { width: 222, height: 50, size: 19, label: tabs[id] || id, variant: 'secondary', radius: 14, onClick: () => this.showTab(id) }), { tabId: id })
    );
    this.panel = this.add.container(0, 0);
    this.inputs = [];
    this.doneBtn = new Button(this, 1140, 672, { width: 210, height: 58, size: 22, icon: 'check', label: this.labels.done || 'Done', variant: 'success', onClick: () => this.finish() });
    this.refresh();
    this.showTab('name');
    this.setInputsVisible(false);
    idleHint(this, () => (this.state === 'paint' ? { x: this.doneBtn.x, y: this.doneBtn.y - 40 } : null), { delay: 25000 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'paint';
      this.setInputsVisible(true);
      this.goal.set(this.T('task', { title: 'Name, paint and patch', help: '' }));
    });
  }

  pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }
  randomShip(ideas) {
    return `${this.pick(ideas.first || ['Star'])} ${this.pick(ideas.second || ['Sailor'])}`;
  }

  // ---------- the preview ----------
  refresh() {
    const d = Lab.design();
    this.nameText.setText(d.name).setFontSize(28);
    fitText(this.nameText, 470, 36, 16);
    this.missionText.setText(d.missionName);
    this.craft.setTexture(craftTexture(this, d)).setScale(1.25 / TEX);
    this.rocket.setTexture(rocketTexture(this, d)).setScale(0.44 / TEX);
    this.refreshPatch();
  }

  // the patch shows the names, so it's redrawn a moment after typing stops
  refreshPatch(delay = 0) {
    if (this.patchTimer) this.patchTimer.remove();
    this.patchTimer = this.time.delayedCall(delay, () => {
      const key = patchTexture(this, Lab.design());
      const old = this.patch.texture.key;
      this.patch.setTexture(key).setScale(0.62 / TEX);
      this.made.add(key);
      if (old !== key && this.made.has(old)) {
        this.made.delete(old);
        this.textures.remove(old);
      }
    });
  }

  // ---------- tabs ----------
  showTab(id) {
    this.tab = id;
    this.tabBtns.forEach((b) => b.setVariant(b.tabId === id ? 'primary' : 'secondary'));
    this.panel.removeAll(true);
    (this.tabWidgets || []).forEach((w) => w.destroy());
    this.tabWidgets = [];
    this.inputs.forEach((dom) => dom.destroy());
    this.inputs = [];
    if (id === 'name') this.nameTab();
    else if (id === 'paint') this.paintTab();
    else this.patchTab();
  }

  label(y, text) {
    this.panel.add(txt(this, RX + 8, y, text, { size: 18, weight: 800, color: CSS.cyan, scale: false }));
  }

  nameTab() {
    const ideas = this.T('names', {});
    this.label(244, this.labels.shipName || 'Spaceship name');
    this.textBox(RX + 8, 274, 'name', () => this.randomShip(ideas));
    this.label(372, this.labels.missionName || 'Mission name');
    this.textBox(RX + 8, 402, 'missionName', () => this.pick(ideas.mission || ['Mission Nova']));
  }

  // a typing box with an "ideas" button next to it
  textBox(x, y, field, idea) {
    const el = document.createElement('input');
    el.type = 'text';
    el.maxLength = MAX_NAME;
    el.value = Lab.s[field] || '';
    el.className = 'lab-input';
    el.setAttribute('aria-label', field === 'name' ? this.labels.shipName || 'Spaceship name' : this.labels.missionName || 'Mission name');
    el.style.cssText = 'width:480px;height:56px;box-sizing:border-box;padding:0 16px;border-radius:14px;border:3px solid #2e3f85;background:#0b1230;color:#f4f6ff;font:700 24px Lexend, "Segoe UI", sans-serif;outline:none;';
    el.addEventListener('focus', () => (el.style.borderColor = '#4fd1ff'));
    el.addEventListener('blur', () => (el.style.borderColor = '#2e3f85'));
    // keys typed here are for the box, not the game
    ['keydown', 'keyup', 'keypress'].forEach((t) => el.addEventListener(t, (e) => e.stopPropagation()));
    el.addEventListener('input', () => {
      Lab.s[field] = el.value.replace(/\s+/g, ' ').slice(0, MAX_NAME);
      Lab.save();
      this.nameText.setText(Lab.s.name);
      fitText(this.nameText.setFontSize(28), 470, 36, 16);
      this.missionText.setText(Lab.s.missionName);
      this.refreshPatch(350);
    });
    const dom = this.addDom(x, y, el);
    this.inputs.push(dom);
    const dice = new Button(this, x + 590, y + 28, { width: 190, height: 56, size: 19, icon: 'replay', label: this.labels.random || 'Ideas', variant: 'warn', onClick: () => {
      Lab.s[field] = idea();
      Lab.save();
      el.value = Lab.s[field];
      Sfx.play('pickup');
      this.refresh();
    } });
    this.tabWidgets.push(dice);
  }

  setInputsVisible(on) {
    this.inputs.forEach((d) => this.setDomVisible(d, on));
  }

  // a row of colour dots; the chosen one gets a ring
  swatches(y, value, onPick) {
    const names = Object.keys(PAINT);
    const colors = this.T('labels', {}).colors || {};
    names.forEach((n, i) => {
      const x = RX + 30 + (i % 13) * 52;
      const dot = this.add.circle(x, y, 20, parseInt(PAINT[n].slice(1), 16)).setStrokeStyle(value === n ? 4 : 2, value === n ? 0xffffff : 0x3a4a92);
      dot.setInteractive({ useHandCursor: true });
      dot.on('pointerup', () => onPick(n));
      Object.assign(dot, { enabled: true, activate: () => onPick(n), name: colors[n] || n });
      this.focus.add(dot);
      dot.once('destroy', () => this.focus.remove(dot));
      this.panel.add(dot);
    });
  }

  // a row of choice buttons
  choices(y, list, labels, value, onPick, w = 160) {
    list.forEach((id, i) => {
      const b = new Button(this, RX + w / 2 + 4 + i * (w + 10), y, { width: w, height: 48, size: 17, label: labels[id] || id, variant: value === id ? 'primary' : 'secondary', radius: 14, onClick: () => onPick(id) });
      this.tabWidgets.push(b);
    });
  }

  paintTab() {
    const p = Lab.s.paint;
    const set = (k, v) => {
      Lab.s.paint = { ...Lab.s.paint, [k]: v };
      Lab.save();
      Sfx.play('select');
      this.refresh();
      this.showTab('paint');
    };
    this.label(244, this.labels.body || 'Main colour');
    this.swatches(300, p.body, (n) => set('body', n));
    this.label(344, this.labels.trim || 'Stripe colour');
    this.swatches(400, p.trim, (n) => set('trim', n));
    this.label(444, this.labels.pattern || 'Pattern');
    this.choices(500, PATTERNS, this.labels.patterns || {}, p.pattern, (id) => set('pattern', id));
  }

  patchTab() {
    const p = Lab.s.patch;
    const set = (k, v) => {
      Lab.s.patch = { ...Lab.s.patch, [k]: v };
      Lab.save();
      Sfx.play('select');
      this.refresh();
      this.showTab('patch');
    };
    this.label(244, this.labels.shape || 'Patch shape');
    this.choices(298, SHAPES, this.labels.shapes || {}, p.shape, (id) => set('shape', id));
    this.label(340, this.labels.patchColor || 'Patch colour');
    this.swatches(396, p.color, (n) => set('color', n));
    this.label(436, this.labels.emblem || 'Picture');
    this.choices(490, EMBLEMS.slice(0, 4), this.labels.emblems || {}, p.emblem, (id) => set('emblem', id));
    this.choices(548, EMBLEMS.slice(4), this.labels.emblems || {}, p.emblem, (id) => set('emblem', id));
  }

  finish() {
    if (this.state !== 'paint') return;
    if (!Lab.s.name.trim()) Lab.s.name = this.randomShip(this.T('names', {}));
    if (!Lab.s.missionName.trim()) Lab.s.missionName = this.pick(this.T('names', {}).mission || ['Mission Nova']);
    Lab.save();
    this.state = 'done';
    this.setInputsVisible(false);
    Sfx.play('bigSuccess');
    this.guide.say(this.T('doneLine', ''), { modal: true }).then(() => this.done(3));
  }
}
