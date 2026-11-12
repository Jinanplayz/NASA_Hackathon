import { W, COLORS, CSS, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { blueprint } from '../common/bg.js';
import { playIntro, GoalBar, idleHint } from '../common/kit.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { RoundBox, ProgressBar, toast } from '../../ui/widgets.js';
import { Lab, COLD, powerAt } from './labState.js';
import { shipImage, endStep } from './labKit.js';

// Test Your Knowledge, test 2: the thermal vacuum chamber. Lamps play the Sun, the walls play the
// freezing shade of space. Keep the inside temperature in the green zone with the heaters and the
// radiators (which let heat out). An insulation blanket slows the swings, a nuclear battery keeps
// things warm, a weak power source makes weak heaters, and colder destinations get colder.
const CX = 420, CY = 410, CR = 220; // the chamber
const PHASE = 9, PHASES = 4;
const BAND = [0.38, 0.62];
const TX = 900, TY = 220, TH = 330; // the thermometer
const WATCH = ['noInsulation'];

export class LabThermalScene extends BaseScene {
  constructor() {
    super('LabThermal');
  }

  create() {
    this.toldWeak = false;
    this.setupStage({ bg: 0x0a0e18, music: 'tension' });
    blueprint(this);
    Lab.ensureShip();
    this.state = 'intro';
    const d = Lab.design();
    this.insulated = d.support.includes('insulation');
    this.rtg = d.power === 'rtg';
    // a weak power source (dim sunlight, flat batteries) makes the heaters warm slowly
    this.heatPower = powerAt(d.power, d.mission) >= 50 ? 1 : 0.35;
    this.cold = COLD[d.mission];
    this.temp = 0.5;
    this.t = 0;
    this.inBand = 0;
    this.heater = false;
    this.radiator = false;
    this.phase = -1;
    this.goal = new GoalBar(this);
    const L = this.T('labels', {});
    this.L = L;

    // the chamber, with its sun lamps
    const g = this.add.graphics();
    g.fillStyle(0x2a3140, 1);
    g.fillCircle(CX, CY, CR + 26);
    g.fillStyle(0x080b12, 1);
    g.fillCircle(CX, CY, CR);
    g.lineStyle(6, 0x596274, 1);
    g.strokeCircle(CX, CY, CR + 12);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      g.fillStyle(0x8f98aa, 1);
      g.fillCircle(CX + Math.cos(a) * (CR + 13), CY + Math.sin(a) * (CR + 13), 5);
    }
    this.lamp = this.add.image(CX - CR + 40, CY - 40, 'softDot').setDisplaySize(340, 340).setTint(0xffc46b).setAlpha(0);
    this.frost = this.add.image(CX, CY, 'softDot').setDisplaySize(CR * 2.2, CR * 2.2).setTint(0x7fc8ff).setAlpha(0);
    this.ship = shipImage(this, CX, CY + 10, 1.05);
    this.phaseText = txt(this, CX, CY - CR - 40, '', { size: 22, weight: 800, color: CSS.yellow, origin: 0.5, scale: false });
    const notes = [];
    if (this.insulated) notes.push(L.insulated || 'Insulation blanket fitted');
    if (this.rtg) notes.push(L.rtgWarm || 'Nuclear battery keeps it warm');
    txt(this, CX, CY + CR + 44, notes.join(' · '), { size: 15, weight: 700, color: CSS.green, origin: 0.5, scale: false });

    // the thermometer and the switches
    this.add.existing(new RoundBox(this)).draw(780, 176, 470, 430, { fill: 0x0b1230, alpha: 0.92, radius: 20, stroke: COLORS.stroke, strokeWidth: 3 });
    txt(this, 804, 194, L.temp || 'Inside temperature', { size: 18, weight: 800, color: CSS.cyan, scale: false });
    this.thermo = this.add.graphics();
    this.tempText = txt(this, TX + 70, TY + TH / 2, '', { size: 30, weight: 800, origin: [0, 0.5], scale: false });
    this.heaterBtn = new Button(this, 920, 640, { width: 250, height: 62, size: 20, icon: 'up', label: '', variant: 'secondary', onClick: () => this.toggle('heater') });
    this.radiatorBtn = new Button(this, 1150, 640, { width: 200, height: 62, size: 20, icon: 'down', label: '', variant: 'secondary', onClick: () => this.toggle('radiator') });
    this.timeBar = new ProgressBar(this, 804, 570, 420, 18, { color: COLORS.cyan });
    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-H', () => this.toggle('heater'));
      this.input.keyboard.on('keydown-R', () => this.toggle('radiator'));
      this.input.keyboard.on('keydown-UP', () => this.toggle('heater'));
      this.input.keyboard.on('keydown-DOWN', () => this.toggle('radiator'));
    }
    this.buttons();
    this.draw();
    idleHint(this, () => {
      if (this.state !== 'play') return null;
      if (this.temp < BAND[0] + 0.03 && !this.heater) return { x: this.heaterBtn.x, y: this.heaterBtn.y - 42 };
      if (this.temp > BAND[1] - 0.03 && !this.radiator) return { x: this.radiatorBtn.x, y: this.radiatorBtn.y - 42 };
      return null;
    }, { delay: 3000 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'play';
      this.goal.set(this.T('task', { title: 'Hot and cold test!', help: '' }));
    });
  }

  toggle(which) {
    if (this.state !== 'play') return;
    this[which] = !this[which];
    Sfx.play('switch');
    this.buttons();
    // the first time the heaters go on with weak power, say why they're slow
    if (which === 'heater' && this.heater && this.heatPower < 1 && !this.toldWeak) {
      this.toldWeak = true;
      const line = this.T('weakHeater', '');
      if (line) {
        Speech.say(line);
        toast(this, line, { x: W / 2, y: 560, color: COLORS.orange, sound: false, duration: 4200, wrap: 700 });
      }
    }
  }

  buttons() {
    const L = this.L;
    this.heaterBtn.setLabel(`${L.heater || 'Heaters'}: ${this.heater ? L.on || 'On' : L.off || 'Off'}`).setVariant(this.heater ? 'warn' : 'secondary');
    this.radiatorBtn.setLabel(`${L.radiator || 'Radiators'}: ${this.radiator ? L.open || 'Open' : L.closed || 'Closed'}`).setVariant(this.radiator ? 'primary' : 'secondary');
  }

  update(time, delta) {
    if (this.state !== 'play') return;
    const dt = Math.min(0.05, delta / 1000);
    this.t += dt;
    const phase = Math.min(PHASES - 1, Math.floor(this.t / PHASE));
    const sun = phase % 2 === 0;
    if (phase !== this.phase) {
      this.phase = phase;
      const line = sun ? this.T('sunPhase', '') : this.T('shadePhase', '');
      this.phaseText.setText(line).setColor(sun ? CSS.orange : CSS.cyan);
      Speech.say(line);
      Sfx.play(sun ? 'powerUp' : 'whoosh');
    }
    // heat flowing in from the lamps, or out into the cold walls
    const slow = (this.insulated ? 0.5 : 1) * (this.relaxed ? 0.7 : 1);
    const env = (sun ? 0.07 : -0.07 * this.cold) * slow;
    let d = env + (this.rtg ? 0.018 : 0);
    // the heaters always beat the cold in the shade (slowly with weak power), and the
    // radiators always beat the lamps in the sunshine
    if (this.heater) d += 0.07 * this.cold * slow + 0.06 * this.heatPower;
    if (this.radiator) d -= 0.07 * slow + 0.06;
    this.temp = clamp(this.temp + d * dt, 0, 1);
    if (this.temp >= BAND[0] && this.temp <= BAND[1]) this.inBand += dt;
    // warn once each time it leaves the zone
    const out = this.temp > BAND[1] ? 'hot' : this.temp < BAND[0] ? 'cold' : '';
    if (out && out !== this.warned) {
      this.warned = out;
      toast(this, out === 'hot' ? this.T('tooHot', 'Too hot!') : this.T('tooCold', 'Too cold!'), { x: 420, y: 660, color: out === 'hot' ? COLORS.orange : COLORS.cyan, sound: false, duration: 1200 });
      Sfx.play('alarm');
    } else if (!out) this.warned = '';
    this.lamp.setAlpha(sun ? 0.75 : 0);
    this.frost.setAlpha(sun ? 0 : 0.18 + (1 - this.temp) * 0.2);
    this.timeBar.set(this.t / (PHASE * PHASES), true);
    this.draw();
    if (this.t >= PHASE * PHASES) this.finish();
  }

  draw() {
    const g = this.thermo;
    g.clear();
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(TX, TY, 44, TH, 22);
    // the green zone
    g.fillStyle(COLORS.green, 0.35);
    g.fillRect(TX, TY + TH * (1 - BAND[1]), 44, TH * (BAND[1] - BAND[0]));
    // the reading
    const col = this.temp > BAND[1] ? COLORS.orange : this.temp < BAND[0] ? COLORS.cyan : COLORS.green;
    g.fillStyle(col, 1);
    g.fillRoundedRect(TX + 8, TY + TH * (1 - this.temp), 28, TH * this.temp, 14);
    g.fillCircle(TX + 22, TY + TH + 14, 24);
    g.lineStyle(3, 0xffffff, 0.35);
    g.strokeRoundedRect(TX, TY, 44, TH, 22);
    const c = Math.round((this.temp - 0.5) * 220);
    this.tempText.setText(`${c > 0 ? '+' : ''}${c} °C`).setColor(col === COLORS.green ? CSS.green : col === COLORS.orange ? CSS.orange : CSS.cyan);
    this.tempText.setY(TY + TH * (1 - this.temp));
  }

  finish() {
    this.state = 'done';
    const score = (this.inBand / (PHASE * PHASES)) * 100;
    endStep(this, 'test', 'thermal', score + (this.insulated ? 5 : 0), WATCH);
  }
}
