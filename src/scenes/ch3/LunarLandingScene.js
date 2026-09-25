import Phaser from 'phaser';
import { W, H, COLORS, CSS, DEPTH, TEX, clamp, seeded } from '../../core/constants.js';
import { Content } from '../../core/Content.js';
import { Sfx } from '../../core/Sfx.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { Button } from '../../ui/Button.js';
import { toast, dialog, cameraShake, ProgressBar, drawPanel, Toggle, pointerArrow } from '../../ui/widgets.js';
import { live } from '../../core/voiceText.js';

// Land Eagle gently on the flat, safe spot. THRUST slows the fall, the side jets move
// Eagle left and right. "Landing help" (like Apollo's own computer) can hold a gentle
// down speed so the player only has to steer.
const GRAV = 20; // px/s², Moon gravity
const THRUST = 46; // main engine at full power
const SIDE = 50; // side jets
const MAX_FALL = 110;
const MAX_SIDE = 90;
const BURN = 0.034; // fuel per second at full power
const SIDE_BURN = 0.01;
const PAD = { x0: 790, x1: 1030, y: 600 };
const PAD_X = (PAD.x0 + PAD.x1) / 2;
const ROCKS = { x0: 520, x1: 740 };
const FOOT_X = 30, FOOT_Y = 34; // lander legs, from its centre
const M_PER_PX = 0.06; // keeps height and speed readings consistent (safe touchdown ≈ 3 m/s)

export class LunarLandingScene extends BaseScene {
  constructor() {
    super('LunarLanding');
  }

  create() {
    this.setupStage({ bg: 0x000000 });
    starfield(this, { count: 170, top: 0x000000, bottom: 0x05060d });
    this.add.image(560, 190, 'earthSmall').setScale(0.75 / TEX);
    this.buildTerrain();

    this.safe = this.relaxed ? { vy: 72, vx: 60 } : { vy: 55, vx: 45 };
    this.help = this.relaxed;
    this.helpOffered = false;
    this.crashes = 0;
    this.alarmShown = false;

    this.shadow = this.add.ellipse(0, 0, 70, 12, 0x000000, 0.4).setDepth(DEPTH.world + 2);
    this.lm = img(this, 0, 0, 'lm', 0.82).setDepth(DEPTH.world + 5);
    this.flame = this.add.image(0, 0, 'flame').setOrigin(0.5, 0).setScale(0.32, 0.5).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.world + 4).setVisible(false);
    // side jets: the left one pushes Eagle right, the right one pushes it left
    this.jets = [Math.PI / 2, -Math.PI / 2].map((r) => this.add.image(0, 0, 'flame').setOrigin(0.5, 0).setScale(0.1, 0.16).setRotation(r).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.world + 4).setVisible(false));
    this.dust = this.add.particles(0, 0, 'smoke', { speedX: { min: -220, max: 220 }, speedY: { min: -40, max: 0 }, lifespan: 800, scale: { start: 0.2, end: 0.7 }, alpha: { start: 0.55, end: 0 }, tint: 0xc9c2b0, frequency: 30, emitting: false }).setDepth(DEPTH.world + 6);
    this.padArrow = pointerArrow(this, PAD_X, PAD.y - 96, 'down', COLORS.green).setDepth(DEPTH.world + 3).setScale(0.8);

    this.buildHud();
    this.buildControls();
    this.reset();
    this.guide.sequence(this.T('intro', []), { modal: true, lastLabel: Content.ui('play', 'Play') }).then((r) => {
      if (r !== null) this.start();
    });
  }

  buildTerrain() {
    const rnd = seeded(31);
    this.ground = [];
    for (let x = 0; x <= W + 20; x += 20) {
      let y;
      if (x >= PAD.x0 - 10 && x <= PAD.x1 + 10) y = PAD.y;
      else y = 598 + Math.sin(x / 90) * 22 + Math.sin(x / 31 + 2) * 9 + (rnd() - 0.5) * 8;
      if (x > 330 && x < 460) y += Math.sin(((x - 330) / 130) * Math.PI) * 38; // crater
      this.ground.push({ x, y });
    }
    const g = this.add.graphics().setDepth(DEPTH.world);
    g.fillStyle(0x8f8f8c, 1);
    g.beginPath();
    g.moveTo(0, H);
    this.ground.forEach((p) => g.lineTo(p.x, p.y));
    g.lineTo(W + 20, H);
    g.closePath();
    g.fillPath();
    g.lineStyle(3, 0xc9c9c4, 1);
    g.strokePoints(this.ground, false);
    // speckles
    for (let i = 0; i < 90; i++) {
      g.fillStyle(0x6f6f6c, 0.6);
      g.fillCircle(rnd() * W, 620 + rnd() * 100, 1 + rnd() * 3);
    }
    // boulder field
    this.boulders = [];
    for (let i = 0; i < 9; i++) {
      const x = ROCKS.x0 + (i / 8) * (ROCKS.x1 - ROCKS.x0) + (rnd() - 0.5) * 16;
      const r = 10 + rnd() * 12;
      const y = this.groundY(x) - r * 0.6;
      g.fillStyle(0x5f5f5c, 1);
      g.fillEllipse(x, y, r * 2.2, r * 1.6);
      g.fillStyle(0xa9a9a4, 1);
      g.fillEllipse(x - r * 0.3, y - r * 0.3, r * 0.9, r * 0.5);
      this.boulders.push({ x, y, r });
    }
    txt(this, (ROCKS.x0 + ROCKS.x1) / 2, 650, this.T('rocksLabel', 'Boulders!'), { size: 15, weight: 700, origin: 0.5, color: CSS.orange, scale: false }).setDepth(DEPTH.world + 1);
    // landing pad lights
    const pad = this.add.graphics().setDepth(DEPTH.world + 1);
    pad.fillStyle(COLORS.green, 0.3);
    pad.fillRect(PAD.x0, PAD.y - 2, PAD.x1 - PAD.x0, 6);
    this.padLights = [PAD.x0, PAD_X, PAD.x1].map((x) => this.add.circle(x, PAD.y - 10, 6, COLORS.green).setDepth(DEPTH.world + 1));
    this.tweens.add({ targets: this.padLights, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 });
    txt(this, PAD_X, 628, this.T('padLabel', 'Safe spot'), { size: 16, weight: 800, origin: 0.5, color: CSS.green, scale: false }).setDepth(DEPTH.world + 1);
  }

  groundY(x) {
    const i = clamp(Math.floor(x / 20), 0, this.ground.length - 2);
    const a = this.ground[i], b = this.ground[i + 1];
    return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }

  buildHud() {
    const x = W - 290, y = 84;
    const g = this.add.graphics().setDepth(DEPTH.hud);
    drawPanel(g, x, y, 270, 262, { fill: 0x070b1d, alpha: 0.85, radius: 16 });
    const row = (i, label) => {
      txt(this, x + 16, y + 14 + i * 44, label, { size: 14, weight: 700, color: CSS.dim, scale: false }).setDepth(DEPTH.hud);
      return txt(this, x + 254, y + 32 + i * 44, '', { size: 22, weight: 800, origin: [1, 0.5], scale: false }).setDepth(DEPTH.hud);
    };
    this.altT = row(0, this.T('altitude', 'Height'));
    this.vsT = row(1, this.T('vspeed', 'Down speed'));
    this.hsT = row(2, this.T('hspeed', 'Side speed'));
    txt(this, x + 16, y + 146, this.T('fuel', 'Fuel'), { size: 14, weight: 700, color: CSS.dim, scale: false }).setDepth(DEPTH.hud);
    this.fuelBar = new ProgressBar(this, x + 16, y + 170, 238, 20, { color: COLORS.orange, depth: DEPTH.hud });
    txt(this, x + 16, y + 228, this.T('helpLabel', 'Landing help'), { size: 17, weight: 700, origin: [0, 0.5], scale: false }).setDepth(DEPTH.hud);
    this.helpToggle = new Toggle(this, x + 206, y + 228, this.help, (v) => this.setHelp(v)).setDepth(DEPTH.hud);
    txt(this, W / 2, 82, this.T('controls', ''), { size: 15, color: CSS.dim, origin: 0.5, scale: false }).setDepth(DEPTH.hud);
    // a short live tip ("Jet right", "Too fast!"...) so players always know what to do next
    this.tipT = txt(this, W / 2, 690, '', { size: 20, weight: 800, origin: 0.5, scale: false, stroke: '#070b1d', strokeThickness: 5 }).setDepth(DEPTH.hud);
  }

  buildControls() {
    // big touch buttons (hold) – also work with a mouse
    const mk = (x, label, icon, variant, w) => {
      const b = new Button(this, x, H - 58, { width: w, height: 84, label, icon, iconSize: 34, variant, size: 24, sound: null, onClick: () => {} });
      b.setDepth(DEPTH.hud).setAlpha(0.85);
      b.held = false;
      b.on('pointerdown', () => (b.held = true));
      b.on('pointerup', () => (b.held = false));
      b.on('pointerout', () => (b.held = false));
      return b;
    };
    this.leftBtn = mk(100, '', 'left', 'secondary', 120);
    this.rightBtn = mk(236, '', 'right', 'secondary', 120);
    this.thrustBtn = mk(W - 150, this.T('thrust', 'THRUST'), 'up', 'warn', 240);
    this.keys = this.input.keyboard ? this.input.keyboard.addKeys('LEFT,RIGHT,UP,SPACE,A,D,W') : null;
    if (this.input.keyboard) this.input.keyboard.on('keydown-H', () => this.state === 'fly' && this.setHelp(!this.help));
  }

  setHelp(on) {
    this.help = on;
    if (this.helpToggle.value !== on) {
      this.helpToggle.value = on;
      this.helpToggle.draw();
    }
    if (on) toast(this, this.T('helpOn', ''), { y: 150, color: COLORS.green, duration: 3200, speak: true, wrap: 600, size: 18 });
  }

  reset() {
    this.pos = new Phaser.Math.Vector2(130, 160);
    this.vel = new Phaser.Math.Vector2(30, 8);
    this.fuel = 1;
    this.grounded = false;
    this.lowFuelShown = false;
    this.offPadShown = false;
    this.helpUsed = false;
    this.jetTimer = 0;
    this.tip = null;
    this.state = 'ready';
    this.lm.setPosition(this.pos.x, this.pos.y).setAngle(0).setVisible(true);
    this.flame.setVisible(false);
    this.jets.forEach((j) => j.setVisible(false));
    this.updateHud(this.altitude());
    this.updateShadow(this.altitude());
  }

  start() {
    this.state = 'fly';
    this.rumble = Sfx.rumble({ freq: 160, vol: 0.35 });
  }

  altitude() {
    return this.groundY(this.pos.x) - (this.pos.y + FOOT_Y);
  }

  update(time, delta) {
    const dt = Math.min(0.04, delta / 1000);
    if (this.state !== 'fly') return;
    const k = this.keys;
    const left = this.leftBtn.held || (k && (k.LEFT.isDown || k.A.isDown));
    const right = this.rightBtn.held || (k && (k.RIGHT.isDown || k.D.isDown));
    const manual = this.thrustBtn.held || (k && (k.UP.isDown || k.SPACE.isDown || k.W.isDown));
    const hasFuel = this.fuel > 0;
    let alt = this.altitude();

    // engine power: full while THRUST is held. Otherwise Landing help keeps a gentle down speed,
    // and hovers (about 7 m up) until Eagle is over the safe spot.
    let throttle = 0;
    if (hasFuel && manual) throttle = 1;
    else if (hasFuel && this.help && !this.grounded) {
      let target = clamp(24 + alt * 0.12, 26, 75);
      if (!this.overPad()) target = Math.min(target, (alt - 120) * 0.35);
      throttle = clamp((this.vel.y - target) / 12 + GRAV / THRUST, 0, 1);
    }
    const side = hasFuel && !this.grounded ? (right ? 1 : 0) - (left ? 1 : 0) : 0;
    if (this.help) this.helpUsed = true;

    // physics
    if (this.grounded) {
      if (throttle * THRUST > GRAV) this.grounded = false; // hop back up
      else this.vel.set(0, 0);
    }
    if (!this.grounded) {
      this.vel.y = Math.min(MAX_FALL, this.vel.y + (GRAV - THRUST * throttle) * dt);
      this.vel.x += SIDE * side * dt;
      if (!side) this.vel.x *= 1 - (this.help && this.overPad() ? 2.5 : 0.1) * dt;
      this.vel.x = clamp(this.vel.x, -MAX_SIDE, MAX_SIDE);
      this.pos.x += this.vel.x * dt;
      this.pos.y += this.vel.y * dt;
      if (this.pos.x < 40 || this.pos.x > W - 40) {
        this.pos.x = clamp(this.pos.x, 40, W - 40);
        this.vel.x = 0;
      }
      if (this.pos.y < 135) {
        this.pos.y = 135;
        this.vel.y = Math.max(0, this.vel.y);
      }
    }
    this.fuel = Math.max(0, this.fuel - dt * (throttle * BURN + (side ? SIDE_BURN : 0)) * (this.relaxed ? 0.7 : 1));
    alt = this.altitude();

    // looks and sounds
    const lean = clamp(this.vel.x * 0.1 + side * 4, -14, 14);
    const a = Phaser.Math.DegToRad(lean);
    this.lm.setPosition(this.pos.x, this.pos.y).setAngle(lean);
    this.flame.setVisible(throttle > 0.05).setPosition(this.pos.x - Math.sin(a) * 18, this.pos.y + Math.cos(a) * 18).setRotation(a);
    this.flame.setScale(0.32 * (0.6 + 0.4 * throttle), (0.2 + 0.28 * throttle) * (0.9 + Math.random() * 0.25));
    this.jets[0].setVisible(side > 0).setPosition(this.pos.x - 34, this.pos.y - 6);
    this.jets[1].setVisible(side < 0).setPosition(this.pos.x + 34, this.pos.y - 6);
    if (side) {
      this.jetTimer -= dt;
      if (this.jetTimer <= 0) {
        this.jetTimer = 0.3;
        Sfx.play('puff');
      }
    } else this.jetTimer = 0;
    if (this.rumble) this.rumble.set(0.12 + throttle * 0.8);
    this.dust.emitting = throttle > 0.3 && alt < 140;
    this.dust.setPosition(this.pos.x, this.groundY(this.pos.x) - 4);
    this.updateShadow(alt);
    this.padArrow.setVisible(!(this.overPad() && alt < 150));

    // historic moments
    if (!this.alarmShown && alt < 300) {
      this.alarmShown = true;
      Sfx.play('alarm');
      toast(this, this.T('alarm', ''), { y: 150, color: COLORS.yellow, duration: 5200, sound: false, speak: true, wrap: 600, size: 18 });
    }
    if (!this.lowFuelShown && this.fuel < 0.25) {
      this.lowFuelShown = true;
      toast(this, this.T('lowFuel', ''), { y: 150, color: COLORS.orange, duration: 3500, speak: true, wrap: 600, size: 18 });
    }
    this.updateHud(alt);
    this.updateTip(alt);
    if (!this.grounded) this.checkContact();
    else if (!hasFuel) this.crash('crashFuel');
  }

  overPad() {
    return this.pos.x - FOOT_X >= PAD.x0 && this.pos.x + FOOT_X <= PAD.x1;
  }

  // Eagle's shadow shows where it will touch down: green over the safe spot.
  updateShadow(alt) {
    const x = this.pos.x;
    const overRocks = x + FOOT_X > ROCKS.x0 - 10 && x - FOOT_X < ROCKS.x1 + 10;
    const color = this.overPad() ? COLORS.green : overRocks ? COLORS.orange : 0x000000;
    const near = clamp(1 - alt / 460, 0.25, 1);
    this.shadow.setPosition(x, this.groundY(x) + 2).setScale(0.6 + near * 0.5, 1);
    this.shadow.setFillStyle(color, color === 0x000000 ? 0.2 + 0.3 * near : 0.35 + 0.35 * near);
  }

  updateHud(alt) {
    const vs = this.vel.y, hs = this.vel.x;
    // green = safe to touch down; orange = too fast this close to the ground
    const color = (ok) => (ok ? CSS.green : alt > 160 ? CSS.text : CSS.orange);
    this.altT.setText(`${Math.max(0, Math.round(alt * M_PER_PX))} m`);
    this.vsT.setText(`${Math.round(Math.max(0, vs) * M_PER_PX * 10) / 10} m/s`).setColor(color(vs <= this.safe.vy));
    this.hsT.setText(`${Math.round(Math.abs(hs) * M_PER_PX * 10) / 10} m/s`).setColor(color(Math.abs(hs) <= this.safe.vx));
    this.fuelBar.set(this.fuel, true);
    this.fuelBar.color = this.fuel < 0.25 ? COLORS.red : COLORS.orange;
  }

  updateTip(alt) {
    const tips = this.T('tips', {});
    let key;
    if (this.grounded) key = 'hop';
    // (with Landing help on, the computer looks after the down speed)
    else if (!this.help && this.vel.y > this.safe.vy && alt < 230) key = 'slow';
    else if (!this.help && !this.overPad() && alt < 170 && this.vel.y > 8) key = 'hover';
    else {
      // the side speed that would glide Eagle over to the safe spot
      const want = clamp((PAD_X - this.pos.x) * 0.45, -70, 70);
      if (this.vel.x < want - 22) key = 'right';
      else if (this.vel.x > want + 22) key = 'left';
      else key = this.overPad() ? 'down' : 'good';
    }
    if (key === this.tip) return;
    this.tip = key;
    const fallback = { hop: 'Hold THRUST to hop up', slow: 'Too fast! Hold THRUST', hover: 'Not there yet! Hold THRUST to stay up', right: 'Jet right ▶', left: '◀ Jet left', down: 'Now down gently…', good: 'Looking good!' };
    this.tipT.setText(tips[key] || fallback[key]).setColor(key === 'slow' || key === 'hover' ? CSS.orange : key === 'good' || key === 'down' ? CSS.green : CSS.yellow);
  }

  checkContact() {
    const feet = [-FOOT_X, FOOT_X].map((fx) => ({ x: this.pos.x + fx, y: this.pos.y + FOOT_Y }));
    const touching = feet.some((f) => f.y >= this.groundY(f.x));
    const hitRock = this.boulders.some((b) => feet.some((f) => Phaser.Math.Distance.Between(f.x, f.y, b.x, b.y) < b.r + 4));
    if (!touching && !hitRock) return;
    const fast = this.vel.y > this.safe.vy;
    const sliding = Math.abs(this.vel.x) > this.safe.vx;
    if (hitRock) return this.crash('crashRocks');
    if (fast) return this.crash(this.fuel <= 0 ? 'crashFuel' : 'crashFast');
    if (sliding) return this.crash('crashSide');
    if (this.overPad()) return this.land();
    // a gentle touchdown on bumpy ground: rest there and let the player hop over
    this.grounded = true;
    this.pos.y = Math.min(...feet.map((f) => this.groundY(f.x))) - FOOT_Y;
    this.vel.set(0, 0);
    this.lm.setY(this.pos.y);
    if (!this.offPadShown) {
      this.offPadShown = true;
      toast(this, this.T('offPad', ''), { y: 150, color: COLORS.yellow, duration: 3800, speak: true, wrap: 600, size: 18 });
    }
  }

  stopEngines() {
    this.flame.setVisible(false);
    this.jets.forEach((j) => j.setVisible(false));
    this.dust.emitting = false;
    this.tipT.setText('');
    if (this.rumble) this.rumble.stop();
  }

  land() {
    this.state = 'landed';
    this.stopEngines();
    this.lm.setAngle(0);
    this.pos.y = PAD.y - FOOT_Y;
    this.lm.setY(this.pos.y);
    this.padArrow.setVisible(false);
    Sfx.play('bigSuccess');
    const title = this.T('success', 'The Eagle has landed!');
    const fuelPct = Math.round(this.fuel * 100);
    let stars = this.fuel > 0.45 ? 3 : this.fuel > 0.2 ? 2 : 1;
    if (this.helpUsed && !this.relaxed) stars = Math.min(stars, 2);
    this.time.delayedCall(900, () => {
      dialog(this, {
        title,
        stars,
        text: `${this.T('successText', '')}\n\n${this.T('fuelLeft', 'Fuel left')}: ${fuelPct}%`,
        speak: [title, this.T('successText', ''), live(`${this.T('fuelLeft', 'Fuel left')}: ${fuelPct}%`)],
        buttons: [
          { label: this.T('retry', 'Try again'), value: 'retry', variant: 'secondary', icon: 'restart' },
          { label: this.T('continue', 'Continue'), value: 'next', icon: 'next' }
        ],
        width: 860
      }).then((v) => {
        if (v === 'retry') this.scene.restart(this.payload);
        else this.done(stars);
      });
    });
  }

  crash(reasonKey) {
    this.state = 'crashed';
    this.crashes++;
    this.stopEngines();
    Sfx.play('hit');
    cameraShake(this, 300, 0.01);
    const tip = this.lm.angle >= 0 ? 25 : -25;
    this.tweens.add({ targets: this.lm, angle: this.lm.angle + tip, duration: 300 });
    this.time.delayedCall(700, async () => {
      await this.guide.say(this.T(reasonKey, 'Try again!'), { modal: true, position: 'top', nextLabel: this.T('retry', 'Try again') });
      if (!this.lm.scene) return; // left the activity
      // after a couple of tries, offer the computer's help (players can also switch it on any time)
      if (this.crashes >= 2 && !this.help && !this.helpOffered) {
        this.helpOffered = true;
        const v = await dialog(this, {
          title: this.T('helpLabel', 'Landing help'),
          text: this.T('helpOffer', ''),
          speak: this.T('helpOffer', ''),
          buttons: [
            { label: this.T('helpNo', 'No thanks'), value: 'no', variant: 'secondary' },
            { label: this.T('helpYes', 'Yes, help me'), value: 'yes', icon: 'check' }
          ]
        });
        if (!this.lm.scene) return;
        if (v === 'yes') this.setHelp(true);
      }
      this.reset();
      this.start();
    });
  }

  onShutdown() {
    if (this.rumble) this.rumble.stop();
  }
}
