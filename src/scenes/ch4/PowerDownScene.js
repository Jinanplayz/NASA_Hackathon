import { COLORS, CSS, DEPTH, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { live } from '../../core/voiceText.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame, starsFor, InfoPanel } from '../common/kit.js';
import { txt, fitText } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { drawPanel, Toggle, shake } from '../../ui/widgets.js';

// Aquarius's power budget: switch off everything the crew can live without until the
// batteries will last the ~90 hours home - but keep the radio, oxygen and air filters running.
const RX = 34, RY = 108, RW = 430, RH = 70, GAP = 12;
const MX = 940, MY = 108, MW = 310, MH = 540;
const BAR = { x: MX + 40, y: MY + 110, w: 70, h: 300 };
const MAX_HOURS = 140;

export class PowerDownScene extends BaseScene {
  constructor() {
    super('PowerDown');
  }

  create() {
    this.setupStage({ bg: 0x14100a });
    this.state = 'intro';
    this.mistakes = 0;
    this.capacity = this.T('capacity', 1000);
    this.needed = this.T('hoursNeeded', 90);
    this.shown = 0;

    // the systems, each with an on/off switch
    this.systems = this.T('systems', []).map((s, i) => this.makeRow(s, i));

    // battery meter
    const g = this.add.graphics();
    drawPanel(g, MX, MY, MW, MH, { fill: COLORS.panel, radius: 18, stroke: 0xd8ad52, strokeWidth: 3 });
    txt(this, MX + MW / 2, MY + 24, this.T('meterLabel', 'Battery will last').toUpperCase(), { size: 15, weight: 800, color: '#ffd98a', origin: [0.5, 0], scale: false });
    this.hoursText = txt(this, MX + MW / 2, MY + 52, '', { size: 34, weight: 800, origin: [0.5, 0], scale: false });
    this.barG = this.add.graphics();
    const lineY = BAR.y + BAR.h - (this.needed / MAX_HOURS) * BAR.h;
    const lg = this.add.graphics().setDepth(DEPTH.ui);
    lg.lineStyle(4, COLORS.green, 1);
    lg.lineBetween(BAR.x - 14, lineY, BAR.x + BAR.w + 14, lineY);
    txt(this, BAR.x + BAR.w + 24, lineY, `${this.T('needLabel', 'Needed')}:\n${this.needed} ${this.T('hoursUnit', 'hours')}`, { size: 15, weight: 700, color: CSS.green, origin: [0, 0.5], scale: false, wrap: 140 });
    this.info = new InfoPanel(this, MX + 14, BAR.y + BAR.h + 20, MW - 28, 92, { title: '', text: '', size: 15, titleSize: 17, minSize: 11 });
    this.info.g.setVisible(false);

    this.readyBtn = new Button(this, MX + MW / 2, MY + MH + 34, { width: MW, height: 60, label: this.T('doneLabel', 'Ready'), icon: 'check', variant: 'success', onClick: () => this.finish() }).setDepth(DEPTH.ui);
    this.readyBtn.setEnabled(false);

    this.refresh(true);
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  makeRow(s, i) {
    const col = i < 6 ? 0 : 1, row = i < 6 ? i : i - 6;
    const x = RX + col * (RW + 14), y = RY + row * (RH + GAP);
    const g = this.add.graphics();
    const name = txt(this, x + 18, y + RH / 2, s.name, { size: 19, weight: 700, origin: [0, 0.5], scale: false, wrap: RW - 170 });
    fitText(name, RW - 170, RH - 10, 13);
    // power used: a little lightning bolt per unit
    const bolts = this.add.graphics();
    const draw = (on) => {
      g.clear();
      g.fillStyle(on ? 0x1d2a5c : 0x111633, 1);
      g.fillRoundedRect(x, y, RW, RH, 14);
      g.lineStyle(2, s.essential ? 0xffd166 : 0x2e3f85, s.essential ? 0.8 : 1);
      g.strokeRoundedRect(x, y, RW, RH, 14);
      name.setColor(on ? CSS.text : CSS.dim);
      bolts.clear();
      bolts.fillStyle(on ? 0xffd166 : 0x3a4470, 1);
      for (let k = 0; k < s.cost; k++) {
        const bx = x + RW - 128 - k * 9, by = y + RH / 2;
        bolts.fillTriangle(bx, by - 11, bx - 5, by + 1, bx + 1, by + 1);
        bolts.fillTriangle(bx + 1, by - 1, bx - 3, by + 11, bx + 5, by - 1);
      }
    };
    const sys = { s, on: true, draw };
    sys.toggle = new Toggle(this, x + RW - 58, y + RH / 2, true, (v) => this.flip(sys, v));
    draw(true);
    return sys;
  }

  draw() {
    return this.systems.reduce((sum, sys) => sum + (sys.on ? sys.s.cost : 0), 0);
  }

  // how long the batteries last at the power being used now
  hours() {
    return this.capacity / Math.max(1, this.draw());
  }

  flip(sys, on) {
    if (this.state !== 'play') {
      // not yet: put the switch back
      sys.toggle.value = sys.on;
      sys.toggle.draw();
      return;
    }
    if (!on && sys.s.essential) {
      // the crew can't live without this one: it switches itself back on
      this.mistakes++;
      Sfx.play('alarm');
      sys.toggle.value = true;
      sys.toggle.draw();
      shake(this, sys.toggle, 6);
      this.info.g.setVisible(true);
      this.info.show(this.T('dangerTitle', 'The crew needs this!'), sys.s.offWarn, { titleColor: CSS.red, stroke: COLORS.red, size: 15 });
      Speech.say(sys.s.offWarn);
      return;
    }
    sys.on = on;
    sys.draw(on);
    if (!on && sys.s.fact) {
      this.info.g.setVisible(true);
      this.info.show(sys.s.name, sys.s.fact, { size: 15 });
      Speech.say([sys.s.name, sys.s.fact]);
    }
    this.refresh();
  }

  refresh(instant = false) {
    const h = Math.round(this.hours());
    const ok = h >= this.needed;
    this.hoursText.setText(`${h} ${this.T('hoursUnit', 'hours')}`).setColor(ok ? CSS.green : h > this.needed * 0.6 ? CSS.yellow : CSS.red);
    this.readyBtn.setEnabled(ok);
    if (ok && !this.readyBtn._pulse) {
      this.readyBtn.pulse();
      if (!instant) Sfx.play('success');
    } else if (!ok) this.readyBtn.stopPulse();
    // ease the battery fill to its new level
    this.tweens.addCounter({
      from: this.shown,
      to: clamp(h / MAX_HOURS, 0, 1),
      duration: instant ? 0 : 400,
      onUpdate: (t) => {
        this.shown = t.getValue();
        this.drawBar(ok);
      }
    });
  }

  drawBar(ok) {
    const g = this.barG;
    g.clear();
    g.fillStyle(0x0b0f18, 1);
    g.fillRoundedRect(BAR.x - 6, BAR.y - 6, BAR.w + 12, BAR.h + 12, 12);
    g.fillRoundedRect(BAR.x + BAR.w / 2 - 16, BAR.y - 20, 32, 16, 4);
    const fh = this.shown * BAR.h;
    g.fillStyle(ok ? COLORS.green : this.shown * MAX_HOURS > this.needed * 0.6 ? COLORS.yellow : COLORS.red, 1);
    g.fillRoundedRect(BAR.x, BAR.y + BAR.h - fh, BAR.w, Math.max(4, fh), 8);
  }

  async finish() {
    if (this.state !== 'play') return;
    if (this.hours() < this.needed) {
      Speech.say(this.T('notEnough', ''));
      return;
    }
    this.state = 'done';
    Sfx.play('bigSuccess');
    Speech.say(live(`${Math.round(this.hours())} ${this.T('hoursUnit', 'hours')}`));
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    finishGame(this, { stars: starsFor(this.mistakes, 0, 2) });
  }
}
