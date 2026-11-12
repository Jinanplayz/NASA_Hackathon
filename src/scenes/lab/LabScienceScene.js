import { W, FULL, COLORS, CSS, DEPTH, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, GoalBar, idleHint } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt, fitText } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { RoundBox, ProgressBar, floatText, shake } from '../../ui/widgets.js';
import { Lab, rate, relevance, powerAt, part } from './labState.js';
import { endStep, note, shipImage } from './labKit.js';

// Test Your Knowledge, flight 4: science! Each instrument the ship brought gets a short job. An
// instrument with nothing to measure there (a drill at Jupiter, a weather station on the airless
// Moon) is explained instead. The better the instruments suit the place, the more is discovered.
const AX = 120, AY = 180, AW = 1040, AH = 400; // the work area
const SECS = 16;
const WATCH = ['noScience', 'drillUseless', 'seismometerUseless', 'weatherStationUseless', 'magnetometerUseless', 'roverJupiter', 'probeMars', 'wrongBody'];
const GROUND = { moon: 0x8d919c, mars: 0xb5643a, jupiter: null };
// (the Moon's sharp rock is a Mars rock painted grey)
const TARGETS = { moon: ['moonRock', 'rock1', 'marsRockSharp'], mars: ['marsRock', 'marsRockLayered', 'marsRockSpots'], jupiter: ['io', 'europa', 'ganymede'] };

export class LabScienceScene extends BaseScene {
  constructor() {
    super('LabScience');
  }

  create() {
    // (Phaser reuses this scene object on every visit, so start from a clean slate)
    this.finished = false;
    this.setupStage({ music: 'space' });
    Lab.ensureShip();
    const d = Lab.design();
    this.d = d;
    this.m = d.mission;
    this.state = 'intro';
    this.L = this.T('labels', {});
    this.pf = clamp(powerAt(d.power, d.mission) / 100, 0.4, 1);
    this.results = [];
    // the scenery: ground for the Moon and Mars, Jupiter's clouds from orbit
    if (this.m === 'jupiter') {
      starfield(this, { count: 120 });
      img(this, W / 2, 900, 'jupiterBig', 1.6).setAlpha(0.95);
    } else {
      this.add.rectangle(W / 2, 360, FULL.w, FULL.h, this.m === 'mars' ? 0xd08a5a : 0x03050f);
      if (this.m === 'moon') starfield(this, { count: 90 });
      this.add.rectangle(W / 2, 640, FULL.w, 400, GROUND[this.m]);
    }
    this.add.existing(new RoundBox(this)).draw(AX - 20, AY - 8, AW + 40, AH + 28, { fill: 0x070b1d, alpha: 0.55, radius: 20, stroke: COLORS.stroke, strokeWidth: 2, shadow: false });
    this.area = this.add.container(0, 0).setDepth(DEPTH.ui - 4);
    this.counter = txt(this, AX + 14, AY + 10, '', { size: 18, weight: 800, color: CSS.cyan, scale: false }).setDepth(DEPTH.ui);
    this.title = txt(this, W / 2, 610, '', { size: 22, weight: 800, color: CSS.yellow, origin: 0.5, align: 'center', wrap: 1000, scale: false }).setDepth(DEPTH.ui);
    this.timeBar = new ProgressBar(this, AX, 642, AW - 280, 18, { color: COLORS.cyan });
    this.actionBtn = new Button(this, 1040, 660, { width: 240, height: 64, size: 22, icon: 'check', label: '', variant: 'success' }).setVisible(false);
    this.actionBtn.on('pointerdown', () => (this.held = true));
    this.actionBtn.on('pointerup', () => (this.held = false));
    this.actionBtn.on('pointerout', () => (this.held = false));
    this.actionBtn.opts.onClick = () => this.task && this.task.press && this.task.press();
    if (this.input.keyboard) {
      this.keys = this.input.keyboard.addKeys('SPACE,LEFT,RIGHT,UP,DOWN');
      this.input.keyboard.on('keydown-SPACE', () => this.task && this.task.press && this.task.press());
    }
    this.goal = new GoalBar(this);
    idleHint(this, () => (this.task && this.task.hint ? this.task.hint() : null), { delay: 4000 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.goal.set(this.T('task', { title: 'Do the science!', help: '' }), { speak: false });
      if (this.pf < 0.6) Speech.say(this.T('lowPower', ''));
      this.queue = d.science.slice();
      this.next();
    });
  }

  next() {
    this.area.removeAll(true);
    this.counter.setText('');
    this.actionBtn.setVisible(false);
    this.held = false;
    this.task = null;
    if (!this.d.science.length) {
      this.state = 'none';
      this.title.setText(this.T('noInstruments', ''));
      return this.guide.say(this.T('noInstruments', ''), { modal: true }).then(() => this.finish());
    }
    const id = this.queue.shift();
    if (!id) return this.finish();
    this.id = id;
    const p = part(id);
    // nothing to measure here: say why, and move on
    if (!relevance(this.m, id)) {
      this.state = 'useless';
      this.results.push({ id, score: 0 });
      this.title.setText(`${p.name}: ${this.T('useless', '')}`);
      const why = note(`${id}Useless`);
      return this.guide.say({ text: `${p.name}. ${why}`, speak: [p.name, why] }, { modal: true }).then(() => this.next());
    }
    this.state = 'task';
    this.t = 0;
    this.secs = SECS * (0.7 + this.pf * 0.3);
    const line = (this.T('tasks', {}) || {})[id] || p.name;
    // (one line: it sits just above the timer bar)
    this.title.setFontSize(22).setText(line);
    fitText(this.title, 1040, 30, 14);
    Speech.say(line);
    this.task = this[`${id}Task`]();
  }

  taskDone(score) {
    if (this.state !== 'task') return;
    this.state = 'between';
    this.results.push({ id: this.id, score: clamp(score, 0, 100) });
    Sfx.play(score > 60 ? 'success' : 'click');
    if (score > 60) floatText(this, W / 2, 380, this.T('great', 'Great data!'), CSS.green, 30);
    this.actionBtn.setVisible(false);
    this.time.delayedCall(1200, () => this.next());
  }

  update(time, delta) {
    if (this.state !== 'task' || !this.task) return;
    const dt = Math.min(0.05, delta / 1000);
    this.t += dt;
    this.timeBar.set(1 - this.t / this.secs, true);
    this.task.update && this.task.update(dt);
    if (this.t >= this.secs && this.state === 'task') this.taskDone(this.task.score());
  }

  rnd(a, b) {
    return a + Math.random() * (b - a);
  }

  // ---------- camera: tap things as they appear ----------
  cameraTask() {
    let snapped = 0, shown = 0, cur = null, wait = 0;
    const keys = TARGETS[this.m];
    const show = () => {
      if (cur) cur.destroy();
      shown++;
      const key = keys[shown % keys.length];
      cur = img(this, this.rnd(AX + 80, AX + AW - 80), this.rnd(AY + 70, AY + AH - 70), key, this.m === 'jupiter' ? 0.42 : 1.3);
      if (this.m === 'moon' && key.startsWith('mars')) cur.setTint(0xc4bfb6);
      cur.setInteractive({ useHandCursor: true });
      cur.on('pointerdown', () => snap());
      Object.assign(cur, { enabled: true, activate: () => snap() });
      this.area.add(cur);
      wait = 2.3;
    };
    const snap = () => {
      if (!cur || cur.taken) return;
      cur.taken = true;
      snapped++;
      this.counter.setText(`${this.L.photos || 'Photos'}: ${snapped}`);
      Sfx.play('snap');
      const flash = this.add.rectangle(cur.x, cur.y, 140, 140, 0xffffff, 0.8);
      this.area.add(flash);
      this.tweens.add({ targets: flash, alpha: 0, duration: 300, onComplete: () => flash.destroy() });
      this.tweens.add({ targets: cur, alpha: 0, scale: cur.scale * 1.3, duration: 300 });
      wait = Math.min(wait, 0.4);
    };
    show();
    return {
      update: (dt) => {
        wait -= dt;
        if (wait <= 0) show();
      },
      score: () => (snapped / Math.max(1, shown - 1)) * 100,
      hint: () => (cur && !cur.taken ? { x: cur.x, y: cur.y - 50 } : null)
    };
  }

  // ---------- spectrometer: hold the scanner over each target ----------
  spectrometerTask() {
    const targets = [0, 1, 2].map((i) => {
      const t = this.add.container(AX + 180 + i * 340, AY + this.rnd(100, AH - 100));
      const glow = this.add.circle(0, 0, 40, [0xff7eb6, 0x4fd1ff, 0xa78bfa][i], 0.35);
      const ring = this.add.graphics();
      t.add([glow, ring]);
      Object.assign(t, { glow, ring, prog: 0, done: false });
      this.area.add(t);
      this.tweens.add({ targets: glow, scale: 1.3, duration: 700, yoyo: true, repeat: -1 });
      return t;
    });
    const scope = this.add.container(W / 2, AY + AH / 2);
    const sg = this.add.graphics();
    sg.lineStyle(3, COLORS.yellow, 1);
    sg.strokeCircle(0, 0, 30);
    sg.lineBetween(-42, 0, -18, 0);
    sg.lineBetween(18, 0, 42, 0);
    sg.lineBetween(0, -42, 0, -18);
    sg.lineBetween(0, 18, 0, 42);
    scope.add(sg);
    this.area.add(scope);
    this.input.on('pointermove', (p) => {
      if (this.state === 'task' && this.id === 'spectrometer' && p.isDown) scope.setPosition(clamp(p.worldX, AX, AX + AW), clamp(p.worldY, AY, AY + AH));
    });
    this.input.on('pointerdown', (p) => {
      if (this.state === 'task' && this.id === 'spectrometer') scope.setPosition(clamp(p.worldX, AX, AX + AW), clamp(p.worldY, AY, AY + AH));
    });
    return {
      update: (dt) => {
        if (this.keys) {
          scope.x = clamp(scope.x + ((this.keys.RIGHT.isDown ? 1 : 0) - (this.keys.LEFT.isDown ? 1 : 0)) * 320 * dt, AX, AX + AW);
          scope.y = clamp(scope.y + ((this.keys.DOWN.isDown ? 1 : 0) - (this.keys.UP.isDown ? 1 : 0)) * 320 * dt, AY, AY + AH);
        }
        targets.forEach((t) => {
          if (t.done) return;
          if (Math.hypot(t.x - scope.x, t.y - scope.y) < 40) {
            t.prog += dt / 1.4;
            if (t.prog >= 1) {
              t.done = true;
              this.counter.setText(`${this.L.found || 'Found'}: ${targets.filter((x) => x.done).length} / 3`);
              Sfx.play('chime');
              t.glow.setFillStyle(COLORS.green, 0.5);
            }
          }
          t.ring.clear();
          t.ring.lineStyle(5, COLORS.green, 1);
          t.ring.beginPath();
          t.ring.arc(0, 0, 48, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, t.prog), false);
          t.ring.strokePath();
        });
        if (targets.every((t) => t.done)) this.taskDone(100 - (this.t / this.secs) * 25);
      },
      score: () => (targets.filter((t) => t.done).length / 3) * 100,
      hint: () => {
        const t = targets.find((x) => !x.done);
        return t ? { x: t.x, y: t.y - 60 } : null;
      }
    };
  }

  // ---------- drill: hold, keeping the pressure in the green ----------
  drillTask() {
    let pressure = 0, depth = 0, stuck = 0;
    const g = this.add.graphics();
    this.area.add(g);
    const base = this.m === 'mars' ? [0x9a5030, 0x7a3c22, 0x8a4424] : [0x7d818c, 0x666a74, 0x737782];
    base.forEach((col, i) => this.area.add(this.add.rectangle(W / 2, AY + AH - 100 + i * 40, 640, 40, col)));
    const bit = this.add.rectangle(W / 2, AY + AH - 140, 14, 60, 0xc9d2e3);
    this.area.add([bit, shipImage(this, W / 2 - 20, AY + 120, 0.6)]);
    this.area.add(txt(this, AX + 60, AY + 30, this.L.pressure || 'Pressure', { size: 15, weight: 800, color: CSS.yellow, origin: [0.5, 1], scale: false }));
    this.area.add(txt(this, AX + AW - 68, AY + 30, this.L.depth || 'Depth', { size: 15, weight: 800, color: CSS.cyan, origin: [0.5, 1], scale: false }));
    this.actionBtn.setLabel(this.L.drill || 'Hold to drill').setVisible(true);
    return {
      update: (dt) => {
        // harder layers further down push the pressure up faster
        const hard = 0.8 + Math.sin(depth * 9) * 0.35;
        if (this.held || (this.keys && this.keys.SPACE.isDown)) pressure += dt * 0.6 * hard;
        else pressure -= dt * 0.5;
        pressure = clamp(pressure, 0, 1);
        if (pressure > 0.4 && pressure < 0.75) depth = Math.min(1, depth + dt * 0.11);
        if (pressure >= 0.95) stuck += dt;
        bit.y = AY + AH - 140 + depth * 90;
        g.clear();
        g.fillStyle(0x000000, 0.5);
        g.fillRoundedRect(AX + 40, AY + 40, 40, 300, 12);
        g.fillStyle(COLORS.green, 0.4);
        g.fillRect(AX + 40, AY + 40 + 300 * 0.25, 40, 300 * 0.35);
        g.fillStyle(pressure >= 0.75 ? COLORS.red : COLORS.yellow, 1);
        g.fillRect(AX + 46, AY + 40 + 300 * (1 - pressure), 28, 6);
        g.fillStyle(COLORS.cyan, 1);
        g.fillRect(AX + AW - 80, AY + 40, 24, 300 * depth);
        if (depth >= 1) this.taskDone(100 - stuck * 10);
      },
      score: () => depth * 100 - stuck * 10,
      hint: () => ({ x: this.actionBtn.x, y: this.actionBtn.y - 44 }),
      info: () => ({ pressure, depth })
    };
  }

  // ---------- magnetometer: tap the strongest spots ----------
  magnetometerTask() {
    // four hidden spots where the field is strong; the probe's meter shows how strong it is
    // where the probe is. Hold the probe on a strong spot to record it.
    const spots = [];
    for (let i = 0; i < 4; i++) spots.push({ x: AX + 130 + i * 260 + this.rnd(-40, 40), y: AY + this.rnd(100, AH - 90), found: false, prog: 0 });
    // field lines bunch together where the field is strongest
    const g = this.add.graphics();
    g.lineStyle(2, 0x7fc8ff, 0.3);
    for (let y = AY + 24; y < AY + AH; y += 24) {
      g.beginPath();
      for (let x = AX; x <= AX + AW; x += 12) {
        const pull = spots.reduce((sum, p) => sum + (p.y - y) * 0.45 * Math.exp(-((x - p.x) ** 2 + (p.y - y) ** 2) / 14000), 0);
        const yy = y + Math.sin(x * 0.02 + y) * 4 + pull;
        if (x === AX) g.moveTo(x, yy);
        else g.lineTo(x, yy);
      }
      g.strokePath();
    }
    this.area.add(g);
    // the strength meter
    this.area.add(txt(this, AX + AW - 300, AY + 12, this.L.field || 'Field strength', { size: 16, weight: 800, color: CSS.cyan, scale: false }));
    const meterG = this.add.graphics();
    this.area.add(meterG);
    // the probe
    const probe = this.add.container(AX + AW / 2, AY + AH / 2);
    const pg = this.add.graphics();
    const ring = this.add.graphics();
    probe.add([pg, ring]);
    this.area.add(probe);
    const strength = (x, y) => Math.max(0, ...spots.filter((p) => !p.found).map((p) => Math.exp(-((x - p.x) ** 2 + (y - p.y) ** 2) / 9000)));
    const place = (p) => probe.setPosition(clamp(p.worldX, AX + 20, AX + AW - 20), clamp(p.worldY, AY + 20, AY + AH - 20));
    this.input.on('pointermove', (p) => {
      if (this.state === 'task' && this.id === 'magnetometer' && p.isDown) place(p);
    });
    this.input.on('pointerdown', (p) => {
      if (this.state === 'task' && this.id === 'magnetometer') place(p);
    });
    const found = () => spots.filter((p) => p.found).length;
    return {
      update: (dt) => {
        if (this.keys) {
          probe.x = clamp(probe.x + ((this.keys.RIGHT.isDown ? 1 : 0) - (this.keys.LEFT.isDown ? 1 : 0)) * 320 * dt, AX + 20, AX + AW - 20);
          probe.y = clamp(probe.y + ((this.keys.DOWN.isDown ? 1 : 0) - (this.keys.UP.isDown ? 1 : 0)) * 320 * dt, AY + 20, AY + AH - 20);
        }
        const s = strength(probe.x, probe.y);
        const col = s > 0.7 ? COLORS.red : s > 0.35 ? COLORS.yellow : COLORS.cyan;
        meterG.clear();
        meterG.fillStyle(0x000000, 0.45);
        meterG.fillRoundedRect(AX + AW - 300, AY + 38, 280, 18, 9);
        meterG.fillStyle(col, 1);
        meterG.fillRoundedRect(AX + AW - 300, AY + 38, Math.max(18, 280 * s), 18, 9);
        pg.clear();
        pg.fillStyle(col, 0.25);
        pg.fillCircle(0, 0, 30);
        pg.lineStyle(3, col, 1);
        pg.strokeCircle(0, 0, 30);
        pg.lineBetween(-42, 0, -18, 0);
        pg.lineBetween(18, 0, 42, 0);
        pg.lineBetween(0, -42, 0, -18);
        pg.lineBetween(0, 18, 0, 42);
        // the strongest spot nearby: hold the probe there to record it
        const near = spots.find((p) => !p.found && Math.hypot(p.x - probe.x, p.y - probe.y) < 50);
        spots.forEach((p) => {
          if (p === near) p.prog += dt / 1.1;
          else p.prog = Math.max(0, p.prog - dt);
          if (p.prog >= 1 && !p.found) {
            p.found = true;
            this.counter.setText(`${this.L.found || 'Found'}: ${found()} / 4`);
            Sfx.play('chime');
            this.area.add(this.add.circle(p.x, p.y, 30, COLORS.green, 0.5));
          }
        });
        ring.clear();
        if (near && near.prog > 0) {
          ring.lineStyle(5, COLORS.green, 1);
          ring.beginPath();
          ring.arc(0, 0, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, near.prog), false);
          ring.strokePath();
        }
        if (found() === 4) this.taskDone(100 - (this.t / this.secs) * 25);
      },
      score: () => (found() / 4) * 100,
      // where to look next, and how strong the field is at the probe (for the hint and the tests)
      info: () => ({ probe: { x: probe.x, y: probe.y }, strength: strength(probe.x, probe.y), next: spots.find((p) => !p.found) }),
      hint: () => {
        const p = spots.find((x) => !x.found);
        return p ? { x: p.x, y: p.y - 60 } : null;
      }
    };
  }

  // ---------- weather station: measure at the gusts ----------
  weatherStationTask() {
    let hits = 0, tries = 0, a = 0;
    const g = this.add.graphics();
    this.area.add(g);
    const cx = W / 2, cy = AY + AH - 60;
    this.actionBtn.setLabel(this.L.measure || 'Measure').setVisible(true);
    this.area.add(txt(this, cx, cy + 22, this.L.wind || 'Wind', { size: 18, weight: 800, color: CSS.cyan, origin: [0.5, 0], scale: false }));
    const wind = () => (Math.sin(a) + 1) / 2;
    return {
      update: (dt) => {
        a += dt * 2.4;
        const v = wind();
        g.clear();
        g.lineStyle(14, 0x2a3566, 1);
        g.beginPath();
        g.arc(cx, cy, 180, Math.PI, 0);
        g.strokePath();
        g.lineStyle(14, COLORS.green, 0.9);
        g.beginPath();
        g.arc(cx, cy, 180, Math.PI * 1.82, Math.PI * 1.98);
        g.strokePath();
        const na = Math.PI + v * Math.PI;
        g.lineStyle(6, COLORS.yellow, 1);
        g.lineBetween(cx, cy, cx + Math.cos(na) * 170, cy + Math.sin(na) * 170);
      },
      press: () => {
        if (this.state !== 'task') return;
        tries++;
        if (wind() > 0.82) {
          hits++;
          this.counter.setText(`${this.L.found || 'Found'}: ${hits} / 4`);
          Sfx.play('success');
          floatText(this, cx, cy - 200, '✓', CSS.green, 30);
          if (hits >= 4) this.taskDone(100 - (tries - hits) * 10);
        } else {
          Sfx.play('error');
          shake(this, this.actionBtn, 6);
        }
      },
      score: () => (hits / 4) * 100 - (tries - hits) * 10,
      hint: () => (wind() > 0.7 ? { x: this.actionBtn.x, y: this.actionBtn.y - 44 } : null),
      info: () => ({ wind: wind() })
    };
  }

  // ---------- seismometer: record when a quake crosses the line ----------
  seismometerTask() {
    let hits = 0, tries = 0;
    const quakes = [2.2, 5, 8, 11, 13.5].map((t) => ({ t, got: false }));
    const g = this.add.graphics();
    this.area.add(g);
    const lineX = W / 2;
    this.actionBtn.setLabel(this.L.record || 'Record').setVisible(true);
    const speed = 160;
    const waveAt = (x) => {
      const t = this.t + (x - lineX) / speed;
      return quakes.reduce((s, q) => s + Math.exp(-((t - q.t) ** 2) / 0.02) * 120, 0) + Math.sin(t * 13) * 6;
    };
    return {
      update: () => {
        g.clear();
        g.lineStyle(3, COLORS.cyan, 1);
        g.beginPath();
        for (let x = AX; x <= AX + AW; x += 6) {
          const y = AY + AH / 2 - waveAt(x);
          if (x === AX) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.strokePath();
        g.lineStyle(3, COLORS.yellow, 0.9);
        g.lineBetween(lineX, AY + 20, lineX, AY + AH - 20);
      },
      press: () => {
        if (this.state !== 'task') return;
        tries++;
        const q = quakes.find((k) => !k.got && Math.abs(k.t - this.t) < 0.35);
        if (q) {
          q.got = true;
          hits++;
          this.counter.setText(`${this.L.found || 'Found'}: ${hits} / ${quakes.length}`);
          Sfx.play('success');
          floatText(this, lineX, AY + 40, '✓', CSS.green, 30);
        } else {
          Sfx.play('error');
        }
      },
      score: () => (hits / quakes.length) * 100 - (tries - hits) * 8,
      hint: () => (quakes.some((k) => !k.got && Math.abs(k.t - this.t) < 0.6) ? { x: this.actionBtn.x, y: this.actionBtn.y - 44 } : null),
      info: () => ({ near: quakes.some((k) => !k.got && Math.abs(k.t - this.t) < 0.2) })
    };
  }

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.state = 'done';
    this.area.removeAll(true);
    // each result counts for how well that instrument suits the place
    const r = rate(this.d);
    const weights = this.results.map((x) => relevance(this.m, x.id));
    const total = weights.reduce((a, b) => a + b, 0);
    const skill = total ? this.results.reduce((s, x, i) => s + x.score * weights[i], 0) / total : 0;
    const score = (skill * 0.6 + r.axes.science * 0.4) * (0.8 + this.pf * 0.2);
    // nothing to measure at all (no instruments, or none that suit this place): no stars
    endStep(this, 'flight', 'science', score, WATCH, { none: total === 0 });
  }
}
