import Phaser from 'phaser';
import { COLORS, CSS, DEPTH } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame, starsFor, InfoPanel } from '../common/kit.js';
import { txt, fitText } from '../../ui/text.js';
import { drawPanel, floatText } from '../../ui/widgets.js';
import { drawIcon } from '../../ui/icons.js';

// Mission Control after the explosion: ten live gauges, five of them showing the real
// failures (oxygen tanks, fuel cells, a power line). Tap the ones that look wrong.
const CX = 30, CY = 116, CW = 880, CH = 540;
const TW = 160, TH = 222;

export class DiagnoseScene extends BaseScene {
  constructor() {
    super('Diagnose');
  }

  create() {
    this.setupStage({ bg: 0x10152e });
    this.state = 'intro';
    this.mistakes = 0;
    this.found = 0;
    this.checked = new Set();
    this.gauges = this.T('gauges', []);
    this.total = this.gauges.filter((g) => g.bad).length;

    // the console
    const g = this.add.graphics();
    drawPanel(g, CX, CY, CW, CH, { fill: 0x1d2433, stroke: 0x46516b, strokeWidth: 3, radius: 20 });
    g.fillStyle(0x121722, 1);
    g.fillRoundedRect(CX + 16, CY + 14, CW - 32, 46, 12);
    txt(this, CX + 34, CY + 37, this.T('consoleTitle', 'CONSOLE'), { size: 15, weight: 800, color: '#cfd6e6', origin: [0, 0.5], scale: false });
    // master alarm light
    this.alarm = this.add.graphics();
    this.alarmText = txt(this, CX + CW - 130, CY + 37, 'MASTER ALARM', { size: 14, weight: 800, color: '#ffd6d6', origin: 0.5, scale: false });
    this.found_t = txt(this, CX + CW - 226, CY + 37, '', { size: 18, weight: 800, color: CSS.yellow, origin: [1, 0.5], scale: false });

    this.tiles = this.gauges.map((gd, i) => this.makeTile(gd, i));
    this.info = new InfoPanel(this, 930, CY, 320, CH, { title: this.T('panelTitle', 'Clues'), text: this.T('panelHint', 'Tap a gauge to check it.'), size: 20 });
    this.updateFound();

    Sfx.play('alarm');
    this.alarmEv = this.time.addEvent({ delay: 2400, loop: true, callback: () => this.state === 'play' && Sfx.play('alarm') });
    playIntro(this).then((ok) => {
      if (ok) this.state = 'play';
    });
  }

  makeTile(gd, i) {
    const col = i % 5, row = Math.floor(i / 5);
    const x = CX + 24 + col * (TW + 8), y = CY + 74 + row * (TH + 8);
    // (the tile's centre is the container's position, so taps and the focus ring line up;
    // the drawing inside is laid out from the tile's top-left corner)
    const c = this.add.container(x + TW / 2, y + TH / 2);
    const inner = this.add.container(-TW / 2, -TH / 2);
    c.add(inner);
    const bg = this.add.graphics();
    const draw = (state) => {
      bg.clear();
      bg.fillStyle(state === 'bad' ? 0x3a1720 : state === 'ok' ? 0x142a26 : 0x252d40, 1);
      bg.fillRoundedRect(0, 0, TW, TH, 14);
      bg.lineStyle(state ? 4 : 2, state === 'bad' ? COLORS.red : state === 'ok' ? COLORS.green : 0x46516b, 1);
      bg.strokeRoundedRect(0, 0, TW, TH, 14);
    };
    draw(null);
    const name = txt(this, TW / 2, 14, gd.name, { size: 15, weight: 800, color: '#e6ebf5', origin: [0.5, 0], align: 'center', wrap: TW - 16, scale: false });
    fitText(name, TW - 16, 40, 11);
    // the dial
    const dial = this.add.graphics();
    const dx = TW / 2, dy = 118, r = 48;
    dial.fillStyle(0x0b0f18, 1);
    dial.fillCircle(dx, dy, r + 6);
    dial.lineStyle(10, COLORS.red, 0.85);
    dial.beginPath();
    dial.arc(dx, dy, r - 4, Math.PI * 0.75, Math.PI * 1.05);
    dial.strokePath();
    dial.lineStyle(10, COLORS.green, 0.85);
    dial.beginPath();
    dial.arc(dx, dy, r - 4, Math.PI * 1.55, Math.PI * 2.1);
    dial.strokePath();
    dial.lineStyle(2, 0xcfd6e6, 0.6);
    for (let k = 0; k <= 10; k++) {
      const a = Math.PI * 0.75 + (k / 10) * Math.PI * 1.5;
      dial.lineBetween(dx + Math.cos(a) * (r - 14), dy + Math.sin(a) * (r - 14), dx + Math.cos(a) * (r - 6), dy + Math.sin(a) * (r - 6));
    }
    const needle = this.add.rectangle(dx, dy, 4, r - 8, 0xffd166).setOrigin(0.5, 1);
    const hub = this.add.circle(dx, dy, 6, 0xcfd6e6);
    const readout = txt(this, TW / 2, 184, '', { size: 18, weight: 800, color: '#7dffb0', origin: 0.5, scale: false });
    const led = this.add.circle(TW - 20, TH - 20, 7, 0x3a3f4b);
    const mark = this.add.graphics();
    inner.add([bg, name, dial, needle, hub, readout, led, mark]);
    c.setSize(TW, TH);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerup', () => this.check(i));
    c.activate = () => this.check(i);
    c.enabled = true;
    this.focus.add(c);
    // live behaviour
    const t = { value: gd.bad ? (gd.kind === 'falling' ? 0.62 : gd.kind === 'flash' ? 0.2 : 0) : 0.55 + Math.random() * 0.25, jitter: Math.random() * 10 };
    return { c, gd, needle, readout, led, mark, draw, t, x, y };
  }

  updateFound() {
    this.found_t.setText(`${this.T('foundLabel', 'Problems found')}: ${this.found} / ${this.total}`);
  }

  check(i) {
    if (this.state !== 'play') return;
    const tile = this.tiles[i];
    const gd = tile.gd;
    if (gd.bad) {
      if (!this.checked.has(i)) {
        this.checked.add(i);
        this.found++;
        tile.draw('bad');
        tile.mark.clear();
        drawIcon(tile.mark, 'check', 22, TH - 22, 22, COLORS.red);
        Sfx.play('success');
        floatText(this, tile.x + TW / 2, tile.y + 40, '!', CSS.red, 40);
        this.updateFound();
      }
      this.info.show(`${gd.name}: ${this.T('badTitle', 'Problem found!')}`, gd.why, { titleColor: CSS.red, stroke: COLORS.red });
      Speech.say([gd.name, gd.why]);
      if (this.found >= this.total) this.win();
    } else {
      if (!this.checked.has(i)) {
        this.checked.add(i);
        this.mistakes++;
        tile.draw('ok');
      }
      Sfx.play('select');
      this.info.show(`${gd.name}: ${this.T('fineTitle', 'This one is OK')}`, gd.why, { titleColor: CSS.green, stroke: COLORS.green });
      Speech.say([gd.name, gd.why]);
    }
  }

  async win() {
    this.state = 'won';
    this.alarmEv.remove();
    Sfx.play('bigSuccess');
    const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
    if (r === null) return;
    finishGame(this, { stars: starsFor(this.mistakes, 0, 2) });
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    // master alarm flashing until every problem is found
    const on = this.state !== 'won' && Math.floor(time / 400) % 2 === 0;
    this.alarm.clear();
    this.alarm.fillStyle(on ? COLORS.red : 0x4a1d24, 1);
    this.alarm.fillRoundedRect(CX + CW - 210, CY + 22, 160, 30, 8);
    this.alarmText.setAlpha(on ? 1 : 0.5);
    this.tiles.forEach((tl) => {
      const { gd, t } = tl;
      if (gd.bad && gd.kind === 'falling') t.value = Math.max(0.04, t.value - 0.012 * dt);
      const wobble = gd.bad ? (gd.kind === 'flash' ? Math.sin(time / 90) * 0.03 : 0) : Math.sin(time / 600 + t.jitter) * 0.015;
      const v = Phaser.Math.Clamp(t.value + wobble, 0, 1);
      // the needle points up when not turned; the dial runs from 0.75π (empty) to 2.25π (full)
      tl.needle.rotation = Math.PI * 0.75 + v * Math.PI * 1.5 + Math.PI / 2;
      const pct = Math.round(v * 100);
      tl.readout.setText(gd.bad && gd.kind === 'zero' ? '0' : String(pct)).setColor(gd.bad && (pct < 30 || gd.kind) ? '#ff8080' : '#7dffb0');
      const blink = gd.bad && Math.floor(time / (gd.kind === 'flash' ? 180 : 500)) % 2 === 0;
      tl.led.setFillStyle(gd.bad ? (blink ? COLORS.red : 0x5a1d24) : COLORS.green);
    });
  }
}
