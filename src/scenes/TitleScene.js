import Phaser from 'phaser';
import { W, H, FULL, RES, CSS, DEPTH, TEX, seeded, lerpColor } from '../core/constants.js';
import { Content } from '../core/Content.js';
import { Flow } from '../core/Flow.js';
import { Sfx } from '../core/Sfx.js';
import { BaseScene } from './BaseScene.js';
import { starfield } from './common/bg.js';
import { img } from '../art/core.js';
import { txt } from '../ui/text.js';
import { Button, iconButton } from '../ui/Button.js';
import { starPoints } from '../ui/icons.js';

// The rounded logo font (the rest of the game uses Lexend)
const LOGO_FONT = 'Fredoka, Lexend, "Segoe UI", sans-serif';
const ROCKET_TILT = 35; // degrees to the right of straight up

// Title screen: a night sky over the Earth, a Mercury-Redstone climbing out of the clouds,
// Captain Nova floating by, and the Star Sailors logo with its orbit ring.
export class TitleScene extends BaseScene {
  constructor() {
    super('Title');
  }

  create() {
    this.setupStage({ hud: false, bg: 0x081436 });
    const g = Content.game;
    const calm = this.reducedMotion;
    this.buildSky(calm);
    this.buildEarth(calm);
    this.buildRocket(calm);
    this.buildClouds(calm);
    this.buildAstronaut(calm);
    this.buildLogo(g.title || 'Star Sailors', calm);
    this.buildSubtitle(g.subtitle || '', g.subtitleHighlight || '');
    this.buildButtons(calm);
    this.buildFooter(g.credit || '');
    iconButton(this, W - 44, 40, 'sliders', () => this.openSettings()).setDepth(DEPTH.ui);
  }

  // ---------- sky: stars that drift and twinkle, asteroids, shooting stars, a planet and the Moon ----------
  buildSky(calm) {
    starfield(this, { count: 150, top: 0x06102e, bottom: 0x0d2466, twinkle: false });
    this.add.image(640, 300, 'softDot').setDisplaySize(1500, 950).setTint(0x2a4fc4).setAlpha(0.35);
    this.add.image(170, 430, 'softDot').setDisplaySize(760, 620).setTint(0x6a3fd0).setAlpha(0.16);
    // a slowly drifting layer of tiny stars
    this.dust = this.add.tileSprite(W / 2, H / 2, FULL.w, FULL.h, 'starsTile').setTileScale(0.8 / TEX).setAlpha(0.5);
    const rnd = seeded(12);
    // little four-pointed stars that twinkle
    for (let i = 0; i < 16; i++) {
      const s = this.add
        .image(FULL.x + rnd() * FULL.w, FULL.y + rnd() * (FULL.h * 0.72), 'sparkle')
        .setScale(0.16 + rnd() * 0.22)
        .setTint(rnd() < 0.45 ? 0xffd166 : 0xcfe9ff);
      if (!calm) this.tweens.add({ targets: s, alpha: 0.2, scale: s.scale * 0.55, duration: 900 + rnd() * 1500, yoyo: true, repeat: -1, delay: rnd() * 2500, ease: 'Sine.easeInOut' });
    }
    // small asteroids tumbling slowly across
    this.rocks = [0, 1, 2, 1].map((k) => {
      const r = img(this, FULL.x + rnd() * FULL.w, 70 + rnd() * 340, 'rock' + k, 0.22 + rnd() * 0.18).setAlpha(0.9);
      r.vx = -(10 + rnd() * 16);
      r.vy = 2 + rnd() * 5;
      r.spin = (rnd() - 0.5) * 50;
      return r;
    });
    // a ringed planet and the Moon
    img(this, 150, 118, 'ringPlanet', 1);
    this.add.image(1190, 74, 'softDot').setDisplaySize(470, 470).setTint(0x9fc8ff).setAlpha(0.28);
    const moon = img(this, 1190, 74, 'moon', 0.9);
    if (!calm) this.tweens.add({ targets: moon, angle: 360, duration: 120000, repeat: -1 });
    if (!calm) this.time.addEvent({ delay: 4600, loop: true, callback: () => this.shootingStar() });
  }

  shootingStar() {
    const x = Phaser.Math.Between(260, FULL.x + FULL.w), y = Phaser.Math.Between(FULL.y + 30, 250);
    const g = this.add.graphics().setDepth(1);
    // a bright head with a fading tail behind it (up and to the right)
    for (let i = 0; i < 12; i++) {
      g.lineStyle(3 - i * 0.2, 0xffffff, 1 - i / 12);
      g.lineBetween(i * 9, -i * 4, (i + 1) * 9, -(i + 1) * 4);
    }
    g.fillStyle(0xffffff, 1);
    g.fillCircle(0, 0, 2.5);
    g.setPosition(x, y).setAlpha(0);
    this.tweens.add({ targets: g, alpha: 1, duration: 150 });
    this.tweens.add({ targets: g, x: x - 380, y: y + 170, duration: 1200, ease: 'Quad.easeIn' });
    this.tweens.add({ targets: g, alpha: 0, delay: 800, duration: 400, onComplete: () => g.destroy() });
    Sfx.play('softWhoosh');
  }

  // ---------- the Earth's curved edge along the bottom, with a glowing atmosphere ----------
  buildEarth(calm) {
    const R = 1150, cx = 640, cy = 580 + R;
    const g = this.add.graphics().setDepth(1);
    // the atmosphere's glow: stacked see-through discs (smooth, no seams)
    for (let i = 8; i >= 1; i--) {
      g.fillStyle(0x4fb8ff, 0.07);
      g.fillCircle(cx, cy, R + i * 6);
    }
    // the sea, lighter near the edge where the sun catches it
    for (let i = 0; i <= 10; i++) {
      g.fillStyle(lerpColor(0x3f8cf2, 0x1c55c4, i / 10), 1);
      g.fillCircle(cx, cy, R - i * 7);
    }
    // land and clouds all the way round the planet, so it can turn very slowly
    // (both sit on the planet's centre and are kept inside it by a mask)
    const land = this.add.graphics().setDepth(1).setPosition(cx, cy);
    const clouds = this.add.graphics().setDepth(1).setPosition(cx, cy);
    // a patch that follows the curve: centred `a` radians from the top, `d` below the rim
    const patch = (gr, a, d, w, h) => {
      const pts = [];
      for (let k = 0; k < 24; k++) {
        const t = (k / 24) * Math.PI * 2;
        const ang = a + (Math.cos(t) * w) / 2 / R;
        const r = R - d - (Math.sin(t) * h) / 2;
        pts.push({ x: Math.sin(ang) * r, y: -Math.cos(ang) * r });
      }
      gr.fillPoints(pts, true);
    };
    const rnd = seeded(31);
    const hills = [];
    land.fillStyle(0x2f9a57, 1);
    for (let a = 0.05; a < Math.PI * 2 - 0.2; a += 0.36 + rnd() * 0.2) {
      const d = 34 + rnd() * 64, w = 170 + rnd() * 200, h = 56 + rnd() * 56;
      patch(land, a, d, w, h);
      patch(land, a + (rnd() - 0.5) * (w / R) * 0.9, d + (rnd() - 0.2) * h * 0.5, w * (0.4 + rnd() * 0.3), h * (0.7 + rnd() * 0.4));
      if (rnd() < 0.6) hills.push([a + (rnd() - 0.5) * (w / R) * 0.4, d - h * 0.18, w * 0.34, h * 0.3]);
    }
    // a few deeper ones, seen on taller screens
    for (let a = 0.25; a < Math.PI * 2 - 0.3; a += 0.5 + rnd() * 0.3) patch(land, a, 190 + rnd() * 110, 220 + rnd() * 220, 80 + rnd() * 70);
    land.fillStyle(0x6fbf73, 1);
    hills.forEach(([a, d, w, h]) => patch(land, a, d, w, h));
    clouds.fillStyle(0xf2f8ff, 0.55);
    for (let a = 0; a < Math.PI * 2 - 0.15; a += 0.24 + rnd() * 0.16) patch(clouds, a, 14 + rnd() * 40, 180 + rnd() * 140, 13 + rnd() * 6);
    const mask = this.make.graphics({ add: false });
    mask.fillStyle(0xffffff, 1);
    mask.fillCircle(cx, cy, R);
    const m = mask.createGeometryMask();
    land.setMask(m);
    clouds.setMask(m);
    // it turns towards the left, the clouds a little faster than the land (radians per second)
    this.earthSpin = calm ? [] : [[land, -0.0066], [clouds, -0.0088]];
    // the thin bright rim
    const rim = this.add.graphics().setDepth(1);
    rim.lineStyle(4, 0xc8efff, 1);
    rim.strokeCircle(cx, cy, R + 1);
  }

  // ---------- fluffy clouds in the bottom corners ----------
  buildClouds(calm) {
    const put = (x, y, s, k, tint) => {
      const c = img(this, x, y, 'cloud' + k, s).setTint(tint).setDepth(4);
      if (!calm) this.tweens.add({ targets: c, x: x + 12, duration: 5000 + k * 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return c;
    };
    // left: where the rocket launched from
    [
      [FULL.x + 40, 610, 1.5, 0],
      [-40, 690, 1.7, 1],
      [90, 650, 1.3, 2],
      [210, 712, 1.4, 0],
      [FULL.x + 120, 720, 1.6, 2],
      [20, 585, 1.1, 1]
    ].forEach(([x, y, s, k], i) => put(x, y, s, k, i % 2 ? 0xd6e8ff : 0xeef6ff));
    // right
    [
      [1180, 700, 1.3, 1],
      [1300, 650, 1.5, 0],
      [FULL.x + FULL.w - 40, 690, 1.6, 2],
      [1080, 734, 1.2, 2]
    ].forEach(([x, y, s, k], i) => put(x, y, s, k, i % 2 ? 0xd6e8ff : 0xeef6ff));
  }

  // ---------- the Mercury-Redstone, climbing with a big launch plume ----------
  buildRocket(calm) {
    const a = Phaser.Math.DegToRad(ROCKET_TILT);
    const home = { x: 246, y: 332 };
    this.rocket = this.add.container(home.x, home.y).setDepth(3).setRotation(a);
    const body = img(this, 0, 0, 'mercuryRedstone', 0.42);
    const half = body.displayHeight / 2;
    const flame = this.add.image(0, half - 6, 'flame').setOrigin(0.5, 0).setScale(0.42, 0.95).setBlendMode(Phaser.BlendModes.ADD);
    this.rocket.add([flame, body]);
    this.tweens.add({ targets: flame, scaleY: 1.2, scaleX: 0.46, duration: 80, yoyo: true, repeat: -1 });
    // where the exhaust comes out, and which way it goes (down and to the left)
    this.rocketHalf = half;
    this.nozzle = { x: 0, y: 0 };
    const ex = Phaser.Math.RadToDeg(Math.atan2(Math.cos(a), -Math.sin(a)));
    // the plume starts a warm, pale yellow-orange by the engine and cools to white smoke further back
    this.add
      .particles(0, 0, 'smoke', {
        follow: this.nozzle,
        angle: { min: ex - 13, max: ex + 13 },
        speed: { min: 70, max: 170 },
        lifespan: 2800,
        scale: { start: 0.35, end: 2.7 },
        alpha: { start: 0.75, end: 0 },
        color: [0xffd9a0, 0xffe9c4, 0xfff6e8, 0xeef3fc, 0xd4e0f6],
        frequency: calm ? 60 : 20
      })
      .setDepth(2);
    // a soft warm glow around the engine
    this.nozzleGlow = this.add.image(0, 0, 'softDot').setDisplaySize(150, 150).setTint(0xffb454).setAlpha(0.4).setBlendMode(Phaser.BlendModes.ADD).setDepth(2);
    this.add
      .particles(0, 0, 'softDot', {
        follow: this.nozzle,
        angle: { min: ex - 8, max: ex + 8 },
        speed: { min: 90, max: 170 },
        lifespan: 380,
        scale: { start: 0.55, end: 0 },
        tint: [0xffd166, 0xff9f43, 0xfff3c4],
        blendMode: 'ADD',
        frequency: 18
      })
      .setDepth(3);
    // it surges forward and eases back, as if climbing, with a little shake
    if (!calm) {
      this.tweens.add({ targets: this.rocket, x: home.x + Math.sin(a) * 34, y: home.y - Math.cos(a) * 34, duration: 2800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.placeNozzle();
    // a deep, quiet engine rumble
    this.rumble = Sfx.rumble({ freq: 75, vol: 0.12 });
    this.rumble.set(0.7);
  }

  // keep the exhaust (and its glow) coming out of the moving rocket's nozzle
  placeNozzle() {
    const a = this.rocket.rotation;
    this.nozzle.x = this.rocket.x - Math.sin(a) * (this.rocketHalf + 8);
    this.nozzle.y = this.rocket.y + Math.cos(a) * (this.rocketHalf + 8);
    this.nozzleGlow.setPosition(this.nozzle.x - Math.sin(a) * 30, this.nozzle.y + Math.cos(a) * 30);
  }

  // ---------- Captain Nova floating in low gravity: bobbing, waving and kicking ----------
  buildAstronaut(calm) {
    const c = this.add.container(1110, 318).setDepth(5).setAngle(-12);
    const legL = img(this, -17, 52, 'astroLeg', 1).setOrigin(0.5, 0.06).setAngle(14);
    const legR = img(this, 17, 52, 'astroLeg', 1).setOrigin(0.5, 0.06).setAngle(-8);
    const armRest = img(this, 37, -6, 'astroArm', 1).setOrigin(0.5, 0.1).setAngle(-26);
    const body = img(this, 0, 0, 'astroBody', 1);
    const armWave = img(this, -37, -6, 'astroArm', 1).setOrigin(0.5, 0.1).setAngle(148);
    c.add([legL, legR, body, armRest, armWave]);
    if (calm) return;
    this.tweens.add({ targets: c, y: c.y - 16, duration: 3400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: c, angle: -5, duration: 4300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: c, x: c.x - 10, duration: 5200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // a friendly wave
    this.tweens.add({ targets: armWave, angle: 124, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: armRest, angle: -14, duration: 2100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // slow, floaty kicks
    this.tweens.add({ targets: legL, angle: 26, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: legR, angle: -22, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 400 });
  }

  // ---------- the logo: two lines of chunky letters with an orbit ring and stars ----------
  buildLogo(title, calm) {
    const words = title.trim().split(/\s+/);
    const line2 = words.length > 1 ? words.pop() : words[0];
    const line1 = words.length ? words.join(' ') : '';
    const cx = 640;
    this.buildOrbitRing(cx, 176, calm);
    if (line1) this.logoWord(line1, cx + 14, 112, 100);
    const big = this.logoWord(line2, cx, 222, 124);
    this.starInO(big, line2, cx, 222);
  }

  logoWord(text, x, y, size) {
    const style = {
      fontFamily: LOGO_FONT,
      fontSize: size + 'px',
      fontStyle: '700',
      color: '#ffffff',
      stroke: '#0a1a4a',
      strokeThickness: 7,
      resolution: RES,
      padding: { x: 10, y: 14 },
      // the blue "3D" edge under the letters
      shadow: { offsetX: 0, offsetY: 8, color: '#3d6ee8', blur: 0, stroke: true, fill: true }
    };
    // a soft cyan glow behind the letters (kept gentle so the name isn't glaring)
    const glow = this.add
      .text(x, y, text, { ...style, color: '#7fe3ff', stroke: '#7fe3ff', padding: { x: 34, y: 34 }, shadow: { offsetX: 0, offsetY: 0, color: '#4fd1ff', blur: 22, stroke: true, fill: true } })
      .setOrigin(0.5)
      .setAlpha(0.28);
    const t = this.add.text(x, y, text, style).setOrigin(0.5).setDepth(DEPTH.ui);
    // soft white at the top, fading to icy blue at the bottom
    const grad = t.context.createLinearGradient(0, 0, 0, t.height);
    grad.addColorStop(0, '#f2f7ff');
    grad.addColorStop(0.55, '#e0ebfd');
    grad.addColorStop(1, '#8fbdf5');
    t.setFill(grad);
    glow.setDepth(DEPTH.ui - 1);
    return t;
  }

  // a small dark star sitting inside the "o" of the big word, like the mockup
  starInO(t, word, cx, cy) {
    const i = word.toLowerCase().lastIndexOf('o');
    if (i < 0) return;
    const ctx = t.canvas.getContext('2d');
    ctx.save();
    ctx.font = t.style._font;
    const pre = ctx.measureText(word.slice(0, i)).width;
    const o = ctx.measureText('o');
    ctx.restore();
    const left = cx - t.width / 2 + t.padding.left + t.style.strokeThickness / 2;
    const baseline = cy - t.height / 2 + t.padding.top + t.style.strokeThickness / 2 + t.style.metrics.ascent;
    const oy = baseline - (o.actualBoundingBoxAscent - o.actualBoundingBoxDescent) / 2;
    const r = o.width * 0.2;
    const g = this.add.graphics().setDepth(DEPTH.ui + 1);
    g.fillStyle(0x16318f, 1);
    g.fillPoints(starPoints(left + pre + o.width / 2, oy, r, r * 0.45), true);
  }

  // an orbit ring around the name, open at the bottom, with a light travelling along it
  buildOrbitRing(cx, cy, calm) {
    const rx = 318, ry = 96, tilt = Phaser.Math.DegToRad(-9);
    const from = Math.PI * 0.72, to = Math.PI * 2.3;
    const at = (t) => {
      const x = Math.cos(t) * rx, y = Math.sin(t) * ry;
      return { x: cx + x * Math.cos(tilt) - y * Math.sin(tilt), y: cy + x * Math.sin(tilt) + y * Math.cos(tilt) };
    };
    const pts = [];
    for (let k = 0; k <= 80; k++) pts.push(at(from + ((to - from) * k) / 80));
    const g = this.add.graphics().setDepth(DEPTH.ui - 2);
    [[16, 0.08], [9, 0.22], [4, 1]].forEach(([wd, al]) => {
      g.lineStyle(wd, 0x4fd1ff, al);
      g.strokePoints(pts, false);
    });
    // a yellow star at the end of the ring
    const end = at(to);
    const star = this.add.image(end.x, end.y, 'sparkle').setScale(0.75).setTint(0xffd166).setDepth(DEPTH.ui + 1);
    if (!calm) this.tweens.add({ targets: star, scale: 0.5, angle: 45, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (calm) return;
    // a little light orbiting all the way round: it fades out as it reaches the star, passes
    // behind the name through the ring's open gap, and fades back in (so it never jumps)
    const dot = this.add.image(0, 0, 'softDot').setScale(0.3).setTint(0xcff6ff).setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.ui - 1);
    const fade = Math.PI * 0.16;
    this.tweens.addCounter({
      from,
      to: from + Math.PI * 2,
      duration: 6600,
      repeat: -1,
      onUpdate: (tw) => {
        const t = tw.getValue();
        const p = at(t);
        dot.setPosition(p.x, p.y).setAlpha(Phaser.Math.Clamp(Math.min((t - from) / fade, (to - t) / fade), 0, 1));
      }
    });
  }

  buildSubtitle(sub, highlight) {
    const split = highlight && sub.endsWith(highlight) ? [sub.slice(0, sub.length - highlight.length), highlight] : [sub, ''];
    const a = txt(this, 0, 318, split[0], { size: 27, weight: 700, origin: [0, 0.5], color: CSS.text, scale: false, stroke: '#081436', strokeThickness: 4 }).setDepth(DEPTH.ui);
    const b = txt(this, 0, 318, split[1], { size: 27, weight: 700, origin: [0, 0.5], color: CSS.cyan, scale: false, stroke: '#081436', strokeThickness: 4 }).setDepth(DEPTH.ui);
    const x0 = W / 2 - (a.width + b.width) / 2;
    a.setX(x0);
    b.setX(x0 + a.width);
  }

  buildButtons(calm) {
    const y = 406;
    const glow = this.add.image(W / 2, y, 'softDot').setDisplaySize(560, 180).setTint(0x2fd6ff).setAlpha(0.45).setDepth(DEPTH.ui - 1);
    if (!calm) this.tweens.add({ targets: glow, alpha: 0.18, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const start = new Button(this, W / 2, y, {
      width: 380,
      height: 78,
      size: 30,
      radius: 39,
      label: Content.ui('start', 'Start the Journey'),
      icon: 'play',
      onClick: () => Flow.chapters(this)
    });
    start.setDepth(DEPTH.ui).pulse();
    // little light rays on both sides of the start button
    const rays = this.add.graphics().setDepth(DEPTH.ui);
    rays.lineStyle(4, 0x4fd1ff, 0.9);
    [-1, 1].forEach((s) => {
      const x = W / 2 + s * 214;
      rays.lineBetween(x, y - 16, x + s * 14, y - 26);
      rays.lineBetween(x + s * 2, y, x + s * 20, y);
      rays.lineBetween(x, y + 16, x + s * 14, y + 26);
    });
    // Full screen is left out where the browser can't do it (iPhones)
    const canFull = !!(this.scale.fullscreen && this.scale.fullscreen.available);
    new Button(this, canFull ? W / 2 - 132 : W / 2, 496, {
      width: 244,
      height: 58,
      radius: 29,
      label: Content.ui('settings', 'Settings'),
      icon: 'gear',
      variant: 'outline',
      onClick: () => this.openSettings()
    }).setDepth(DEPTH.ui);
    if (canFull) {
      new Button(this, W / 2 + 132, 496, {
        width: 244,
        height: 58,
        radius: 29,
        label: Content.ui('fullscreen', 'Full screen'),
        icon: 'fullscreen',
        variant: 'outline',
        onClick: () => this.toggleFullscreen()
      }).setDepth(DEPTH.ui);
    }
  }

  buildFooter(credit) {
    if (!credit) return;
    txt(this, W / 2, 672, `—   ${credit.replace(/\s·\s/g, '  •  ')}   —`, { size: 14, origin: 0.5, color: '#dfe6ff', scale: false, stroke: '#070b1d', strokeThickness: 4 }).setDepth(DEPTH.ui);
  }

  update(time, delta) {
    const dt = Math.min(0.05, delta / 1000);
    if (this.reducedMotion) return;
    this.dust.tilePositionX += 6 * dt * TEX;
    this.dust.tilePositionY -= 2 * dt * TEX;
    this.rocks.forEach((r) => {
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.angle += r.spin * dt;
      if (r.x < FULL.x - 40) {
        r.x = FULL.x + FULL.w + 40;
        r.y = Phaser.Math.Between(60, 400);
      }
    });
    // the Earth turning, very slowly
    this.earthSpin.forEach(([layer, speed]) => (layer.rotation += speed * dt));
    this.placeNozzle();
  }

  openSettings() {
    if (this.scene.isActive('Settings')) return;
    this.scene.launch('Settings', { from: 'Title' });
    this.scene.pause();
  }

  toggleFullscreen() {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    } else {
      this.scale.startFullscreen();
      try {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      } catch {
        /* not supported */
      }
    }
  }
}
