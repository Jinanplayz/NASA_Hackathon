import Phaser from 'phaser';
import { COLORS, CSS, DEPTH, seeded, clamp } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { playIntro, finishGame, starsFor, InfoPanel } from '../common/kit.js';
import { makeTex, blob, circle } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { drawPanel, toast, floatText } from '../../ui/widgets.js';

// Perseverance (2021) found its own way down: while falling it took pictures, matched them to a
// map stored in its computer to work out where it was, then steered to the safest spot nearby.
// Each round: find where the camera picture is on the map, then pick a safe spot close to it.
const MAP = { x: 60, y: 100, w: 720, h: 560 };
const SNAP = 140; // size of the camera picture (on the map)
const ROUNDS = [{ x: 0.3, y: 0.32 }, { x: 0.7, y: 0.6 }, { x: 0.46, y: 0.72 }];

// Jezero crater: the old river delta, cliffs, boulder fields and dunes (hazards in the hazard map)
function drawJezero(c, w, h, hazards) {
  c.fillStyle = '#b8764c';
  c.fillRect(0, 0, w, h);
  const rnd = seeded(91);
  // light and dark patches of ground
  for (let i = 0; i < 70; i++) {
    c.fillStyle = rnd() < 0.5 ? 'rgba(90,40,20,0.18)' : 'rgba(255,210,170,0.14)';
    blob(c, rnd() * w, rnd() * h, 20 + rnd() * 60, rnd, 10, 0.4);
    c.fill();
  }
  // the delta fan, where a river once flowed into the lake
  c.fillStyle = 'rgba(120,70,45,0.55)';
  c.beginPath();
  c.moveTo(w * 0.05, h * 0.05);
  c.quadraticCurveTo(w * 0.45, h * 0.1, w * 0.42, h * 0.42);
  c.quadraticCurveTo(w * 0.2, h * 0.55, w * 0.02, h * 0.4);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(60,30,15,0.45)';
  c.lineWidth = 3;
  for (let k = 0; k < 5; k++) {
    c.beginPath();
    c.moveTo(w * 0.04, h * (0.08 + k * 0.05));
    c.quadraticCurveTo(w * (0.18 + k * 0.03), h * (0.2 + k * 0.03), w * (0.3 + k * 0.02), h * (0.36 + k * 0.01));
    c.stroke();
  }
  // craters of all sizes (good landmarks)
  for (let i = 0; i < 34; i++) {
    const x = rnd() * w, y = rnd() * h, r = 5 + rnd() * rnd() * 34;
    c.fillStyle = 'rgba(70,30,15,0.5)';
    circle(c, x, y, r);
    c.fill();
    c.strokeStyle = 'rgba(255,215,180,0.45)';
    c.lineWidth = Math.max(1.5, r * 0.18);
    c.beginPath();
    c.arc(x, y, r, Math.PI * 0.9, Math.PI * 1.9);
    c.stroke();
  }
  // hazards: cliffs, boulder fields and dunes
  hazards.forEach((hz) => {
    if (hz.kind === 'cliff') {
      c.strokeStyle = 'rgba(50,20,8,0.85)';
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(hz.x0, hz.y0);
      c.quadraticCurveTo(hz.cx, hz.cy, hz.x1, hz.y1);
      c.stroke();
      c.strokeStyle = 'rgba(255,220,190,0.5)';
      c.lineWidth = 2;
      c.stroke();
    } else if (hz.kind === 'boulders') {
      for (let k = 0; k < 40; k++) {
        c.fillStyle = 'rgba(55,25,12,0.8)';
        circle(c, hz.x + (rnd() - 0.5) * hz.r * 2, hz.y + (rnd() - 0.5) * hz.r * 2, 2 + rnd() * 4);
        c.fill();
      }
    } else {
      c.strokeStyle = 'rgba(80,40,20,0.6)';
      c.lineWidth = 3;
      for (let k = 0; k < 7; k++) {
        c.beginPath();
        c.moveTo(hz.x - hz.r, hz.y - hz.r * 0.6 + k * 12);
        c.quadraticCurveTo(hz.x, hz.y - hz.r * 0.9 + k * 12, hz.x + hz.r, hz.y - hz.r * 0.6 + k * 12);
        c.stroke();
      }
    }
  });
}

export class LandingNavScene extends BaseScene {
  constructor() {
    super('LandingNav');
  }

  create() {
    this.setupStage({ bg: 0x0b0f1f });
    this.state = 'intro';
    this.round = 0;
    this.mistakes = 0;
    this.findTries = 0;
    // hazards (on the map, in map pixels)
    const W_ = MAP.w, H_ = MAP.h;
    this.hazards = [
      { kind: 'cliff', x0: W_ * 0.05, y0: H_ * 0.46, cx: W_ * 0.3, cy: H_ * 0.62, x1: W_ * 0.47, y1: H_ * 0.4 },
      { kind: 'boulders', x: W_ * 0.24, y: H_ * 0.24, r: 42 },
      { kind: 'boulders', x: W_ * 0.74, y: H_ * 0.52, r: 40 },
      { kind: 'boulders', x: W_ * 0.5, y: H_ * 0.82, r: 36 },
      { kind: 'dunes', x: W_ * 0.82, y: H_ * 0.22, r: 70 },
      { kind: 'dunes', x: W_ * 0.62, y: H_ * 0.72, r: 46 }
    ];
    if (!this.textures.exists('jezeroMap')) makeTex(this, 'jezeroMap', MAP.w, MAP.h, (c, w, h) => drawJezero(c, w, h, this.hazards));
    this.map = this.add.image(MAP.x, MAP.y, 'jezeroMap').setOrigin(0).setDisplaySize(MAP.w, MAP.h);
    const fg = this.add.graphics();
    fg.lineStyle(3, COLORS.cyan, 1);
    fg.strokeRect(MAP.x, MAP.y, MAP.w, MAP.h);
    txt(this, MAP.x + 10, MAP.y + MAP.h - 28, this.T('mapLabel', 'Jezero Crater · map in the computer'), { size: 14, weight: 800, color: '#ffffff', scale: false, stroke: '#3a1a0a', strokeThickness: 4 });
    // hazard map overlay (shown once the rover knows where it is)
    this.hazG = this.add.graphics().setVisible(false);
    this.hazards.forEach((hz) => {
      this.hazG.fillStyle(COLORS.red, 0.35);
      if (hz.kind === 'cliff') {
        const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(hz.x0, hz.y0), new Phaser.Math.Vector2(hz.cx, hz.cy), new Phaser.Math.Vector2(hz.x1, hz.y1));
        curve.getPoints(30).forEach((p) => this.hazG.fillCircle(MAP.x + p.x, MAP.y + p.y, 26));
      } else this.hazG.fillCircle(MAP.x + hz.x, MAP.y + hz.y, hz.r + 18);
    });

    // the camera picture and the "viewfinder" the player moves around
    const px = 820, py = 100;
    const pg = this.add.graphics();
    drawPanel(pg, px, py, 420, 280, { fill: COLORS.panel, radius: 18, stroke: COLORS.stroke, strokeWidth: 3 });
    txt(this, px + 210, py + 16, this.T('cameraLabel', "Perseverance's camera"), { size: 17, weight: 800, color: CSS.yellow, origin: [0.5, 0], scale: false });
    this.snap = this.add.image(px + 210, py + 160, 'jezeroMap').setDisplaySize(1, 1);
    this.snapFrame = this.add.graphics();
    this.snapFrame.lineStyle(3, 0xffffff, 0.9);
    this.snapFrame.strokeRect(px + 210 - 100, py + 160 - 100, 200, 200);
    this.finder = this.add.graphics().setDepth(DEPTH.ui - 5);
    this.marker = this.add.graphics().setDepth(DEPTH.ui - 4);
    this.info = new InfoPanel(this, px, 400, 420, 180, { title: '', text: '', size: 18 });
    this.altText = txt(this, px + 210, 610, '', { size: 26, weight: 800, color: '#ffffff', origin: [0.5, 0], scale: false });

    // pointer: in the "find" step the viewfinder follows the pointer; a tap places it
    this.zone = this.add.zone(MAP.x + MAP.w / 2, MAP.y + MAP.h / 2, MAP.w, MAP.h).setInteractive({ useHandCursor: true });
    this.zone.on('pointermove', (p) => this.state === 'find' && this.drawFinder(p.worldX, p.worldY));
    this.zone.on('pointerup', (p) => this.tap(p.worldX, p.worldY));
    this.cursor = { x: MAP.x + MAP.w / 2, y: MAP.y + MAP.h / 2 };
    if (this.input.keyboard) {
      const mv = (dx, dy) => {
        if (this.state !== 'find' && this.state !== 'pick') return;
        this.cursor.x = clamp(this.cursor.x + dx, MAP.x, MAP.x + MAP.w);
        this.cursor.y = clamp(this.cursor.y + dy, MAP.y, MAP.y + MAP.h);
        if (this.state === 'find') this.drawFinder(this.cursor.x, this.cursor.y);
        else this.drawMarker(this.cursor.x, this.cursor.y);
      };
      this.input.keyboard.on('keydown-LEFT', () => mv(-20, 0));
      this.input.keyboard.on('keydown-RIGHT', () => mv(20, 0));
      this.input.keyboard.on('keydown-UP', () => mv(0, -20));
      this.input.keyboard.on('keydown-DOWN', () => mv(0, 20));
      this.input.keyboard.on('keydown-SPACE', () => this.tap(this.cursor.x, this.cursor.y));
    }
    playIntro(this).then((ok) => {
      if (ok) this.startRound(0);
    });
  }

  startRound(i) {
    this.round = i;
    this.findTries = 0;
    const r = ROUNDS[i];
    this.target = { x: MAP.x + r.x * MAP.w, y: MAP.y + r.y * MAP.h };
    // the camera picture: a piece of the map, blown up
    const sx = r.x * MAP.w - SNAP / 2, sy = r.y * MAP.h - SNAP / 2;
    const tex = this.textures.get('jezeroMap').getSourceImage();
    const k = tex.width / MAP.w;
    this.snap.setCrop(sx * k, sy * k, SNAP * k, SNAP * k);
    this.snap.setOrigin((sx + SNAP / 2) / MAP.w, (sy + SNAP / 2) / MAP.h);
    this.snap.setScale(200 / (SNAP * k));
    this.hazG.setVisible(false);
    this.marker.clear();
    this.finder.clear();
    this.alt = [4200, 2100, 900][i];
    this.altText.setText(`${this.T('altLabel', 'Height')}: ${this.alt} m`);
    this.info.show(this.T('findTitle', 'Where am I?'), this.T('findText', ''));
    this.state = 'find';
    Speech.say(this.T('findText', ''));
  }

  drawFinder(x, y) {
    const g = this.finder;
    g.clear();
    g.lineStyle(3, 0xffffff, 0.95);
    g.strokeRect(x - SNAP / 2, y - SNAP / 2, SNAP, SNAP);
    g.lineStyle(1, 0xffffff, 0.6);
    g.lineBetween(x - 10, y, x + 10, y);
    g.lineBetween(x, y - 10, x, y + 10);
  }

  drawMarker(x, y) {
    const g = this.marker;
    g.clear();
    g.lineStyle(4, COLORS.yellow, 1);
    g.strokeCircle(x, y, 22);
    g.lineBetween(x - 30, y, x + 30, y);
    g.lineBetween(x, y - 30, x, y + 30);
  }

  inHazard(x, y) {
    const mx = x - MAP.x, my = y - MAP.y;
    return this.hazards.some((hz) => {
      if (hz.kind === 'cliff') {
        const curve = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(hz.x0, hz.y0), new Phaser.Math.Vector2(hz.cx, hz.cy), new Phaser.Math.Vector2(hz.x1, hz.y1));
        return curve.getPoints(30).some((p) => Math.hypot(p.x - mx, p.y - my) < 30);
      }
      return Math.hypot(hz.x - mx, hz.y - my) < hz.r + 20;
    });
  }

  async tap(x, y) {
    if (this.state === 'find') {
      this.drawFinder(x, y);
      const d = Math.hypot(x - this.target.x, y - this.target.y);
      if (d > 45) {
        this.findTries++;
        this.mistakes++;
        Sfx.play('error');
        toast(this, this.T('notHere', "That doesn't match. Look for the same craters and shapes!"), { y: 100, color: COLORS.orange, sound: false, duration: 2000 });
        if (this.findTries >= 3) {
          // a hint: flash where it is
          const hint = this.add.circle(this.target.x, this.target.y, 80, COLORS.cyan, 0.25).setDepth(DEPTH.ui);
          this.tweens.add({ targets: hint, alpha: 0, duration: 600, repeat: 2, onComplete: () => hint.destroy() });
        }
        return;
      }
      // found: the hazard map appears around it
      this.state = 'pick';
      Sfx.play('success');
      this.drawFinder(this.target.x, this.target.y);
      floatText(this, this.target.x, this.target.y - 90, '✓', CSS.green, 34);
      this.hazG.setVisible(true);
      this.cursor = { x: this.target.x, y: this.target.y };
      this.info.show(this.T('pickTitle', 'Pick a safe spot'), this.T('pickText', ''));
      Speech.say(this.T('pickText', ''));
      return;
    }
    if (this.state === 'pick') {
      const d = Math.hypot(x - this.target.x, y - this.target.y);
      this.drawMarker(x, y);
      if (d > 150) {
        Sfx.play('error');
        toast(this, this.T('tooFar', "Too far! The rover can only steer a little way. Pick a spot close to where you are."), { y: 100, color: COLORS.orange, sound: false, duration: 2400 });
        return;
      }
      if (this.inHazard(x, y)) {
        this.mistakes++;
        Sfx.play('error');
        toast(this, this.T('hazard', 'Danger! That spot is in a red zone: cliffs, boulders or dunes.'), { y: 100, color: COLORS.orange, sound: false, speak: true, duration: 2400 });
        return;
      }
      this.state = 'between';
      Sfx.play('bigSuccess');
      this.finder.clear();
      const lines = this.T('roundDone', []);
      if (this.round + 1 < ROUNDS.length) {
        this.info.show(this.T('safeTitle', 'Safe!'), lines[this.round] || '');
        Speech.say(lines[this.round] || '');
        await new Promise((r) => this.time.delayedCall(3200, r));
        if (this._leaving) return;
        this.startRound(this.round + 1);
        return;
      }
      this.altText.setText(`${this.T('altLabel', 'Height')}: 0 m`);
      const r = await this.guide.say(this.T('doneLine', ''), { modal: true, position: 'top' });
      if (r === null) return;
      Speech.stop();
      finishGame(this, { stars: starsFor(this.mistakes, 1, 3) });
    }
  }

  update(time, delta) {
    // the height keeps dropping while you look (just for show)
    if (this.state === 'find' || this.state === 'pick') {
      this.alt = Math.max(this.round === 2 ? 60 : 300, this.alt - delta * 0.02);
      this.altText.setText(`${this.T('altLabel', 'Height')}: ${Math.round(this.alt)} m`);
    }
  }
}
