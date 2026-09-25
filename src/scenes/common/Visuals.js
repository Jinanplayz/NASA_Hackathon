// Animated illustrations used by cutscenes ("visual": "name" in the config).
// Each function draws into container `c` sized w x h (0,0 = top-left of the frame).

import Phaser from 'phaser';
import { COLORS, CSS, seeded } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { starPoints } from '../../ui/icons.js';

function stars(scene, c, w, h, n = 90, seed = 3) {
  const rnd = seeded(seed);
  const g = scene.add.graphics();
  for (let i = 0; i < n; i++) {
    g.fillStyle(0xffffff, 0.3 + rnd() * 0.7);
    g.fillCircle(rnd() * w, rnd() * h, rnd() < 0.1 ? 1.6 : 0.9);
  }
  c.add(g);
  return g;
}

function sky(scene, c, w, h, top = 0x050a1f, bottom = 0x1a2a6c) {
  const g = scene.add.graphics();
  g.fillGradientStyle(top, top, bottom, bottom, 1);
  g.fillRect(0, 0, w, h);
  c.add(g);
  return g;
}

function label(scene, c, x, y, text, o = {}) {
  const t = txt(scene, x, y, text, { size: o.size ?? 20, weight: o.weight ?? 700, color: o.color ?? CSS.text, origin: o.origin ?? 0.5, align: 'center', stroke: '#070b1d', strokeThickness: 5, scale: false, wrap: o.wrap });
  c.add(t);
  return t;
}

// A one-off timer that is cancelled if the picture is removed first.
function later(scene, c, delay, fn) {
  const ev = scene.time.delayedCall(delay, fn);
  c.once('destroy', () => ev.remove());
  return ev;
}

// Sounds from a picture stay silent while a NASA film plays over it.
function sfx(c, name) {
  if (!c.getData('quiet')) Sfx.play(name);
}

// Repeats fn every `delay` ms while the picture is on screen (paused while a film plays over it).
function loop(scene, c, delay, fn) {
  const ev = scene.time.addEvent({ delay, loop: true, callback: () => c.getData('quiet') || fn() });
  c.once('destroy', () => ev.remove());
  return ev;
}

function orbit(scene, c, obj, cx, cy, rx, ry, period, start = 0, rotateToPath = false) {
  const state = { a: start };
  const tw = scene.tweens.addCounter({
    from: start,
    to: start + Math.PI * 2,
    duration: period,
    repeat: -1,
    onUpdate: (t) => {
      state.a = t.getValue();
      obj.setPosition(cx + Math.cos(state.a) * rx, cy + Math.sin(state.a) * ry);
      if (rotateToPath) obj.setRotation(state.a + Math.PI);
    }
  });
  c.once('destroy', () => tw.stop());
  return state;
}

function launchScene(scene, c, w, h, rocketKey, o = {}) {
  sky(scene, c, w, h, o.night ? 0x02040d : 0x3a78c9, o.night ? 0x0c1640 : 0xa9d4ff);
  if (o.night) stars(scene, c, w, h * 0.7, 70);
  const ground = scene.add.graphics();
  ground.fillStyle(o.night ? 0x0d1a12 : 0x3f7a4a, 1);
  ground.fillRect(0, h - 60, w, 60);
  ground.fillStyle(0x777b85, 1);
  ground.fillRect(w / 2 - 90, h - 70, 180, 16);
  c.add(ground);
  // gantry
  const gan = scene.add.graphics();
  gan.lineStyle(3, o.night ? 0x8a3a2a : 0xb8452f, 1);
  const gx = w / 2 + 60;
  gan.strokeRect(gx, h - 70 - (o.tower ?? 300), 34, o.tower ?? 300);
  for (let y = h - 70; y > h - 70 - (o.tower ?? 300); y -= 24) gan.lineBetween(gx, y, gx + 34, y - 24);
  c.add(gan);
  const rocket = img(scene, w / 2, h - 70, rocketKey, o.scale ?? 0.8).setOrigin(0.5, 1);
  c.add(rocket);
  const flame = scene.add.image(w / 2, h - 70, 'flame').setOrigin(0.5, 0).setScale(0.6, 0.9).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
  c.add(flame);
  const smoke = scene.add.particles(0, 0, 'smoke', {
    x: w / 2,
    y: h - 60,
    speedX: { min: -160, max: 160 },
    speedY: { min: -40, max: 0 },
    lifespan: 1800,
    scale: { start: 0.4, end: 1.4 },
    alpha: { start: 0.7, end: 0 },
    frequency: 25,
    emitting: false
  });
  c.add(smoke);
  const count = label(scene, c, 90, 60, '', { size: 44 });
  const run = () => {
    rocket.setY(h - 70);
    flame.setVisible(false);
    let n = 3;
    count.setText('3');
    const tick = scene.time.addEvent({
      delay: 700,
      repeat: 3,
      callback: () => {
        n--;
        if (n > 0) {
          count.setText(String(n));
          sfx(c, 'tick');
        } else if (n === 0) {
          count.setText(o.liftoff || 'Liftoff!');
          sfx(c, 'ignition');
          flame.setVisible(true);
          smoke.emitting = true;
          scene.tweens.add({
            targets: rocket,
            y: -60,
            duration: 3200,
            ease: 'Quad.easeIn',
            onUpdate: () => flame.setY(rocket.y)
          });
          later(scene, c, 1600, () => {
            smoke.emitting = false;
          });
        }
      }
    });
    c.once('destroy', () => tick.remove());
  };
  scene.tweens.add({ targets: flame, scaleY: 1.1, duration: 80, yoyo: true, repeat: -1 });
  later(scene, c, 500, run);
  loop(scene, c, 7000, run);
}

export const VISUALS = {
  sky(scene, c, w, h) {
    sky(scene, c, w, h, 0x02040d, 0x2a1f5c);
    stars(scene, c, w, h * 0.8, 160, 8);
    const hills = scene.add.graphics();
    hills.fillStyle(0x0b0f1f, 1);
    hills.beginPath();
    hills.moveTo(0, h);
    for (let x = 0; x <= w; x += 40) hills.lineTo(x, h - 70 - Math.sin(x / 130) * 30 - Math.sin(x / 47) * 8);
    hills.lineTo(w, h);
    hills.closePath();
    hills.fillPath();
    // child with a telescope
    hills.fillCircle(w * 0.3, h - 150, 14);
    hills.fillRoundedRect(w * 0.3 - 12, h - 138, 24, 44, 8);
    hills.fillRect(w * 0.3 - 11, h - 98, 8, 30);
    hills.fillRect(w * 0.3 + 3, h - 98, 8, 30);
    hills.lineStyle(8, 0x0b0f1f, 1);
    hills.lineBetween(w * 0.3 + 10, h - 130, w * 0.3 + 64, h - 176);
    hills.lineStyle(3, 0x0b0f1f, 1);
    hills.lineBetween(w * 0.3 + 40, h - 150, w * 0.3 + 30, h - 90);
    hills.lineBetween(w * 0.3 + 40, h - 150, w * 0.3 + 52, h - 90);
    c.add(hills);
    c.add(img(scene, w * 0.78, h * 0.24, 'moonSmall', 0.9));
    loop(scene, c, 2600, () => {
      const s = scene.add.image(Phaser.Math.Between(100, w - 200), Phaser.Math.Between(30, 160), 'softDot').setScale(0.15).setAlpha(0.9);
      c.add(s);
      scene.tweens.add({ targets: s, x: s.x + 180, y: s.y + 70, alpha: 0, duration: 800, onComplete: () => s.destroy() });
    });
  },

  sputnik(scene, c, w, h) {
    stars(scene, c, w, h);
    c.add(img(scene, w * 0.42, h * 0.62, 'earth', 1.1));
    const sp = img(scene, 0, 0, 'sputnik', 0.9);
    c.add(sp);
    const ring = scene.add.graphics();
    ring.lineStyle(2, COLORS.cyan, 0.25);
    ring.strokeEllipse(w * 0.42, h * 0.62, 520, 200);
    c.addAt(ring, 1);
    orbit(scene, c, sp, w * 0.42, h * 0.62, 260, 100, 9000, -Math.PI / 2);
    const beep = label(scene, c, 0, 0, 'beep!', { size: 18, color: CSS.cyan });
    loop(scene, c, 1400, () => {
      sfx(c, 'beep');
      beep.setPosition(sp.x + 30, sp.y - 30).setAlpha(1);
      scene.tweens.add({ targets: beep, alpha: 0, y: beep.y - 20, duration: 700 });
    });
  },

  nasa(scene, c, w, h) {
    stars(scene, c, w, h, 120);
    const ring = scene.add.graphics();
    ring.lineStyle(2, COLORS.cyan, 0.5);
    ring.strokeEllipse(w / 2, h / 2 - 10, 520, 170);
    c.add(ring);
    const sat = scene.add.circle(0, 0, 6, COLORS.cyan);
    c.add(sat);
    orbit(scene, c, sat, w / 2, h / 2 - 10, 260, 85, 6000);
    label(scene, c, w / 2, h / 2 - 20, 'NASA', { size: 110, weight: 800 });
    label(scene, c, w / 2, h / 2 + 70, 'National Aeronautics and Space Administration', { size: 20, color: CSS.cyan, weight: 600 });
    const date = label(scene, c, w / 2, h - 50, 'October 1, 1958', { size: 26, color: CSS.yellow });
    date.setAlpha(0);
    scene.tweens.add({ targets: date, alpha: 1, duration: 800, delay: 800 });
  },

  vostok(scene, c, w, h) {
    stars(scene, c, w, h);
    c.add(img(scene, w / 2, h / 2, 'earth', 0.95));
    const ship = img(scene, 0, 0, 'vostok', 0.7);
    c.add(ship);
    const path = scene.add.graphics();
    path.lineStyle(2, COLORS.yellow, 0.35);
    path.strokeCircle(w / 2, h / 2, 200);
    c.addAt(path, 1);
    orbit(scene, c, ship, w / 2, h / 2, 200, 200, 8000, -Math.PI / 2, true);
    const clock = label(scene, c, w - 110, 50, '0 min', { size: 30, color: CSS.yellow });
    const tw = scene.tweens.addCounter({ from: 0, to: 108, duration: 8000, repeat: -1, onUpdate: (t) => clock.setText(Math.round(t.getValue()) + ' min') });
    c.once('destroy', () => tw.stop());
    label(scene, c, 110, 50, 'Vostok 1', { size: 26 });
  },

  starSailor(scene, c, w, h) {
    stars(scene, c, w, h, 80);
    const g = scene.add.graphics();
    g.fillStyle(COLORS.yellow, 1);
    g.fillPoints(starPoints(w * 0.25, h * 0.38, 60, 26, 5), true);
    // sailboat
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(w * 0.75, h * 0.2, w * 0.75, h * 0.48, w * 0.84, h * 0.48);
    g.fillStyle(0xdfe5ef, 1);
    g.fillTriangle(w * 0.74, h * 0.24, w * 0.74, h * 0.48, w * 0.68, h * 0.48);
    g.fillStyle(0x9a6b3c, 1);
    g.fillRoundedRect(w * 0.66, h * 0.5, w * 0.2, 22, 10);
    c.add(g);
    label(scene, c, w * 0.25, h * 0.62, 'astron = star', { size: 30, color: CSS.yellow });
    label(scene, c, w * 0.76, h * 0.62, 'nautes = sailor', { size: 30, color: CSS.cyan });
    const word = label(scene, c, w / 2, h * 0.85, 'astronaut = star sailor', { size: 40, weight: 800 });
    word.setScale(0.6).setAlpha(0);
    scene.tweens.add({ targets: word, scale: 1, alpha: 1, duration: 600, delay: 900, ease: 'Back.easeOut' });
  },

  mercurySeven(scene, c, w, h) {
    sky(scene, c, w, h, 0x0b1535, 0x1c2b66);
    const names = ['Carpenter', 'Cooper', 'Glenn', 'Grissom', 'Schirra', 'Shepard', 'Slayton'];
    names.forEach((n, i) => {
      const x = w * (0.08 + i * 0.14);
      const head = img(scene, x, h * 0.45, 'guideBig', 0.38);
      c.add(head);
      scene.tweens.add({ targets: head, y: head.y - 8, duration: 900 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      label(scene, c, x, h * 0.7, n, { size: 18, color: n === 'Shepard' ? CSS.yellow : CSS.text });
    });
    label(scene, c, w / 2, h * 0.12, 'The Mercury Seven · 1959', { size: 28, color: CSS.cyan });
  },

  freedom7Launch(scene, c, w, h) {
    launchScene(scene, c, w, h, 'mercuryRedstone', { scale: 0.7, tower: 260 });
  },

  junoLaunch(scene, c, w, h) {
    launchScene(scene, c, w, h, 'juno', { scale: 0.85, tower: 270, night: true });
  },

  saturnLaunch(scene, c, w, h) {
    launchScene(scene, c, w, h, 'saturnV', { scale: 0.75, tower: 360, liftoff: 'Liftoff!' });
  },

  systems(scene, c, w, h) {
    stars(scene, c, w, h, 80);
    c.add(img(scene, w / 2, h / 2, 'freedom7', 1.3));
    const keys = ['propulsion', 'guidance', 'attitude', 'power', 'comms', 'life', 'thermal', 'recovery'];
    keys.forEach((k, i) => {
      const a = -Math.PI / 2 + (i / keys.length) * Math.PI * 2;
      const icon = img(scene, w / 2 + Math.cos(a) * 190, h / 2 + Math.sin(a) * 170, 'sys_' + k, 0.8).setAlpha(0).setScale(0.1);
      c.add(icon);
      scene.tweens.add({ targets: icon, alpha: 1, scale: 0.8 / 2, duration: 400, delay: 300 + i * 250, ease: 'Back.easeOut', onStart: () => sfx(c, 'pickup') });
    });
    label(scene, c, w / 2, h - 30, '8 major systems', { size: 26, color: CSS.yellow });
  },

  v2photo(scene, c, w, h) {
    sky(scene, c, w, h, 0x1a1410, 0x2d241b);
    const photo = img(scene, w / 2, h / 2 - 10, 'v2photo', 1.2).setAngle(-3);
    c.add(photo);
    const tape = scene.add.graphics();
    tape.fillStyle(0xf5e6b0, 0.8);
    tape.fillRect(w / 2 - 270, h / 2 - 190, 70, 24);
    tape.fillRect(w / 2 + 200, h / 2 - 190, 70, 24);
    c.add(tape);
    label(scene, c, w / 2, h - 36, 'October 24, 1946 · about 105 km (65 miles) up', { size: 22, color: CSS.yellow });
    scene.tweens.add({ targets: photo, scale: photo.scale * 1.04, duration: 6000, yoyo: true, repeat: -1 });
  },

  periscope(scene, c, w, h) {
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 1);
    g.fillRect(0, 0, w, h);
    c.add(g);
    const view = scene.add.container(w / 2, h / 2);
    c.add(view);
    const earth = scene.add.graphics();
    earth.fillStyle(0x2f7fd8, 1);
    earth.fillCircle(0, 820, 900);
    earth.fillStyle(0xffffff, 0.35);
    earth.fillEllipse(-120, 30, 300, 40);
    earth.fillEllipse(180, 60, 240, 30);
    earth.lineStyle(12, 0x9fd8ff, 0.6);
    earth.strokeCircle(0, 820, 905);
    view.add(earth);
    const ring = scene.add.graphics();
    ring.lineStyle(800, 0x050505, 1);
    ring.strokeCircle(w / 2, h / 2, 590);
    ring.lineStyle(4, 0x3a4a92, 1);
    ring.strokeCircle(w / 2, h / 2, 192);
    ring.lineStyle(1, 0x9aa4c7, 0.5);
    ring.lineBetween(w / 2 - 190, h / 2, w / 2 + 190, h / 2);
    ring.lineBetween(w / 2, h / 2 - 190, w / 2, h / 2 + 190);
    c.add(ring);
    scene.tweens.add({ targets: view, x: w / 2 + 30, y: h / 2 - 20, duration: 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    label(scene, c, w / 2, h - 30, '"What a beautiful view!"', { size: 24, color: CSS.yellow });
  },

  freedom7Arc(scene, c, w, h) {
    sky(scene, c, w, h, 0x02040d, 0x14235a);
    stars(scene, c, w, h * 0.5, 50);
    const g = scene.add.graphics();
    g.fillStyle(0x2f7fd8, 1);
    g.fillEllipse(w / 2, h + 1500, 4200, 3200);
    g.lineStyle(2, COLORS.orange, 0.8);
    const karman = h * 0.5;
    for (let x = 0; x < w; x += 24) g.lineBetween(x, karman, x + 12, karman);
    c.add(g);
    label(scene, c, w - 150, karman - 18, 'Space starts: 100 km', { size: 16, color: CSS.orange });
    const x0 = 90, x1 = w - 90, yG = h - 70, peak = 70;
    const path = scene.add.graphics();
    path.lineStyle(3, COLORS.yellow, 0.9);
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      pts.push({ x: x0 + (x1 - x0) * t, y: yG - (yG - peak) * 4 * t * (1 - t) });
    }
    path.strokePoints(pts, false);
    c.add(path);
    label(scene, c, x0, yG + 26, 'Cape Canaveral', { size: 16 });
    label(scene, c, x1, yG + 26, 'Splashdown', { size: 16 });
    label(scene, c, w / 2, peak - 30, 'Highest: 187 km (116 miles)', { size: 20, color: CSS.yellow });
    const cap = img(scene, x0, yG, 'mercuryCapsuleSolo', 0.45);
    c.add(cap);
    const tw = scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 6000,
      repeat: -1,
      repeatDelay: 800,
      onUpdate: (t) => {
        const v = t.getValue();
        cap.setPosition(x0 + (x1 - x0) * v, yG - (yG - peak) * 4 * v * (1 - v));
        cap.setAngle(-60 + v * 120);
      }
    });
    c.once('destroy', () => tw.stop());
  },

  splashMercury(scene, c, w, h) {
    sky(scene, c, w, h, 0x5aa0e6, 0xbfe3ff);
    const sea = scene.add.graphics();
    sea.fillStyle(0x1f5fa8, 1);
    sea.fillRect(0, h * 0.62, w, h * 0.38);
    sea.lineStyle(3, 0xffffff, 0.35);
    for (let i = 0; i < 12; i++) sea.lineBetween((i * 97) % w, h * 0.7 + (i % 4) * 30, ((i * 97) % w) + 40, h * 0.7 + (i % 4) * 30);
    c.add(sea);
    // distant ship
    const ship = scene.add.graphics();
    ship.fillStyle(0x5d6676, 1);
    ship.fillRect(w * 0.7, h * 0.58, 180, 18);
    ship.fillRect(w * 0.8, h * 0.52, 40, 10);
    c.add(ship);
    const cap = img(scene, w * 0.35, h * 0.64, 'mercuryCapsuleSolo', 0.9).setAngle(8);
    c.add(cap);
    scene.tweens.add({ targets: cap, angle: -8, y: cap.y + 6, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const heli = scene.add.graphics();
    heli.fillStyle(0x3d4a66, 1);
    heli.fillEllipse(0, 0, 90, 44);
    heli.fillRect(30, -6, 90, 10);
    heli.fillStyle(0x9fd8ff, 1);
    heli.fillEllipse(-26, -4, 30, 22);
    heli.lineStyle(4, 0x1d2029, 1);
    heli.lineBetween(-70, -34, 70, -34);
    heli.lineBetween(0, -34, 0, -22);
    heli.setPosition(w * 0.35, h * 0.2);
    c.add(heli);
    const rope = scene.add.graphics();
    c.add(rope);
    scene.tweens.add({ targets: heli, y: h * 0.24, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', onUpdate: () => {
      rope.clear();
      rope.lineStyle(2, 0x1d2029, 1);
      rope.lineBetween(heli.x, heli.y + 20, cap.x, cap.y - 30);
    } });
  },

  moonGolf(scene, c, w, h) {
    sky(scene, c, w, h, 0x000000, 0x05060a);
    stars(scene, c, w, h * 0.6, 60);
    c.add(img(scene, w * 0.8, h * 0.2, 'earthSmall', 0.9));
    const ground = scene.add.graphics();
    ground.fillStyle(0x9a9a98, 1);
    ground.fillRect(0, h * 0.7, w, h * 0.3);
    ground.fillStyle(0x7d7d7b, 1);
    ground.fillEllipse(w * 0.6, h * 0.8, 160, 30);
    ground.fillEllipse(w * 0.2, h * 0.9, 100, 20);
    c.add(ground);
    const guy = img(scene, w * 0.25, h * 0.7, 'moonwalker', 1.4).setOrigin(0.5, 1);
    c.add(guy);
    const ball = scene.add.circle(w * 0.3, h * 0.69, 5, 0xffffff);
    c.add(ball);
    const hit = () => {
      ball.setPosition(w * 0.3, h * 0.69);
      const tw = scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: 3500,
        onUpdate: (t) => {
          const v = t.getValue();
          ball.setPosition(w * 0.3 + v * w * 0.65, h * 0.69 - Math.sin(v * Math.PI) * h * 0.5);
        }
      });
      c.once('destroy', () => tw.stop());
    };
    hit();
    loop(scene, c, 4500, hit);
    label(scene, c, w / 2, 40, 'Apollo 14 · 1971', { size: 24, color: CSS.yellow });
  },

  // ---------- chapter 2 ----------
  moonOrbit(scene, c, w, h) {
    stars(scene, c, w, h);
    c.add(img(scene, w / 2, h / 2, 'earth', 0.8));
    const m = img(scene, 0, 0, 'moonSmall', 0.6);
    c.add(m);
    const ring = scene.add.graphics();
    ring.lineStyle(2, COLORS.dim, 0.35);
    ring.strokeEllipse(w / 2, h / 2, 640, 300);
    c.addAt(ring, 1);
    orbit(scene, c, m, w / 2, h / 2, 320, 150, 10000);
    label(scene, c, w / 2, h - 30, "The Moon is Earth's natural satellite", { size: 22, color: CSS.cyan });
  },

  newtonCannon(scene, c, w, h) {
    stars(scene, c, w, h, 60);
    const cx = w / 2, cy = h / 2 + 30, R = 150;
    c.add(img(scene, cx, cy, 'earth', (R * 2) / 330));
    const g = scene.add.graphics();
    g.fillStyle(0x6b5a4a, 1);
    g.fillTriangle(cx - 40, cy - R + 10, cx + 40, cy - R + 10, cx, cy - R - 50);
    g.fillStyle(0x2a2d36, 1);
    g.fillRect(cx - 4, cy - R - 60, 34, 12);
    c.add(g);
    const shots = [0.35, 0.7, 1.0];
    const trail = scene.add.graphics();
    c.add(trail);
    const ball = scene.add.circle(0, 0, 6, COLORS.yellow);
    c.add(ball);
    let k = 0;
    const fire = () => {
      const power = shots[k % shots.length];
      k++;
      trail.clear();
      sfx(c, 'whoosh');
      const r0 = R + 55;
      const tw = scene.tweens.addCounter({
        from: 0,
        to: 1,
        duration: power >= 1 ? 4200 : 1400,
        onUpdate: (t) => {
          const v = t.getValue();
          let a, r;
          if (power >= 1) {
            a = -Math.PI / 2 + v * Math.PI * 2;
            r = r0;
          } else {
            a = -Math.PI / 2 + v * power * 1.6;
            r = r0 - (r0 - R) * v * v;
          }
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          ball.setPosition(x, y);
          trail.fillStyle(COLORS.yellow, 0.6);
          trail.fillCircle(x, y, 2);
        }
      });
      c.once('destroy', () => tw.stop());
    };
    fire();
    loop(scene, c, 4800, fire);
    label(scene, c, w / 2, 30, 'Faster and faster... until it keeps missing the ground!', { size: 20, color: CSS.cyan });
  },

  satelliteUses(scene, c, w, h) {
    stars(scene, c, w, h);
    c.add(img(scene, w / 2, h / 2 + 20, 'earth', 0.75));
    const items = [
      ['Weather', -2.4, COLORS.cyan],
      ['TV & internet', -0.8, COLORS.pink],
      ['Maps & GPS', 0.6, COLORS.green],
      ['Watching Earth', 2.2, COLORS.yellow]
    ];
    items.forEach(([name, a, col], i) => {
      const x = w / 2 + Math.cos(a) * 250, y = h / 2 + 20 + Math.sin(a) * 180;
      const s = img(scene, x, y, i % 2 ? 'satA' : 'satB', 0.7);
      c.add(s);
      const beam = scene.add.graphics();
      beam.lineStyle(3, col, 0.6);
      beam.lineBetween(x, y, w / 2 + Math.cos(a) * 110, h / 2 + 20 + Math.sin(a) * 110);
      c.addAt(beam, 1);
      beam.setAlpha(0);
      scene.tweens.add({ targets: beam, alpha: 1, duration: 500, delay: 400 + i * 400, yoyo: true, hold: 1200, repeat: -1, repeatDelay: 600 });
      label(scene, c, x, y + (Math.sin(a) > 0 ? 40 : -40), name, { size: 18, color: '#' + col.toString(16).padStart(6, '0') });
    });
  },

  vanAllen(scene, c, w, h) {
    stars(scene, c, w, h);
    c.add(img(scene, w / 2, h / 2, 'earth', 0.6));
    const b1 = img(scene, w / 2, h / 2, 'belt', 1.9).setAlpha(0.8);
    const b2 = img(scene, w / 2, h / 2, 'belt', 1.3).setAlpha(0.6);
    c.add([b1, b2]);
    scene.tweens.add({ targets: [b1, b2], alpha: 0.4, duration: 1400, yoyo: true, repeat: -1 });
    const ex = img(scene, 0, 0, 'explorer1', 0.35);
    c.add(ex);
    orbit(scene, c, ex, w / 2, h / 2, 330, 90, 7000, 0, true);
    label(scene, c, w / 2, h - 30, 'The Van Allen radiation belts', { size: 24, color: CSS.pink });
    loop(scene, c, 350, () => {
      if (Math.random() < 0.6) sfx(c, 'tick');
    });
  },

  explorerFacts(scene, c, w, h) {
    const g = scene.add.graphics();
    g.fillGradientStyle(0x0d1a45, 0x0d1a45, 0x070b1d, 0x070b1d, 1);
    g.fillRect(0, 0, w, h);
    g.lineStyle(1, 0x2a4a9a, 0.35);
    for (let x = 0; x < w; x += 40) g.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 40) g.lineBetween(0, y, w, y);
    c.add(g);
    const ex = img(scene, w / 2, h / 2, 'explorer1', 2.2).setAngle(90);
    c.add(ex);
    const d = scene.add.graphics();
    d.lineStyle(2, COLORS.yellow, 1);
    d.lineBetween(w / 2 - 220, h / 2 + 90, w / 2 + 220, h / 2 + 90);
    d.lineBetween(w / 2 - 220, h / 2 + 80, w / 2 - 220, h / 2 + 100);
    d.lineBetween(w / 2 + 220, h / 2 + 80, w / 2 + 220, h / 2 + 100);
    c.add(d);
    label(scene, c, w / 2, h / 2 + 120, '2.03 m (80 inches) long', { size: 22, color: CSS.yellow });
    label(scene, c, w / 2, h / 2 - 110, '15.9 cm (6.25 in) wide  ·  13.97 kg (30.8 lb)', { size: 22, color: CSS.cyan });
  },

  explorerSpin(scene, c, w, h) {
    stars(scene, c, w, h);
    const ex = img(scene, w / 2, h / 2, 'explorer1', 1.6);
    c.add(ex);
    const note = label(scene, c, w / 2, h - 34, 'Spinning like a pencil...', { size: 24, color: CSS.cyan });
    const run = () => {
      ex.setAngle(0).setScale(1.6 / 2);
      note.setText('Spinning like a pencil...');
      const spin = scene.tweens.add({ targets: ex, scaleX: -0.8, duration: 160, yoyo: true, repeat: 10 });
      later(scene, c, 3600, () => {
        spin.stop();
        ex.setScale(0.8);
        note.setText('...then tumbling end over end!');
        scene.tweens.add({ targets: ex, angle: 720, duration: 3000 });
      });
    };
    run();
    loop(scene, c, 7500, run);
  },

  explorerLegacy(scene, c, w, h) {
    stars(scene, c, w, h);
    c.add(img(scene, w / 2, h / 2, 'earth', 0.8));
    const rnd = seeded(12);
    for (let i = 0; i < 26; i++) {
      const s = img(scene, 0, 0, rnd() < 0.5 ? 'satA' : 'satB', 0.25 + rnd() * 0.15).setAlpha(0);
      c.add(s);
      scene.tweens.add({ targets: s, alpha: 1, duration: 300, delay: i * 120 });
      const r = 170 + rnd() * 90;
      orbit(scene, c, s, w / 2, h / 2, r, r * (0.4 + rnd() * 0.6), 6000 + rnd() * 8000, rnd() * 6);
    }
  },

  // ---------- chapter 3 ----------
  kennedy(scene, c, w, h) {
    stars(scene, c, w, h);
    c.add(img(scene, w / 2, h / 2 + 30, 'moon', 1.0));
    label(scene, c, w / 2, 50, '"...before this decade is out..."', { size: 30, color: CSS.yellow });
    label(scene, c, w / 2, h - 30, 'President John F. Kennedy · May 25, 1961', { size: 18, color: CSS.dim });
  },

  saturnPad(scene, c, w, h) {
    sky(scene, c, w, h, 0x0f1c4a, 0xf4a261);
    const ground = scene.add.graphics();
    ground.fillStyle(0x1b2a1f, 1);
    ground.fillRect(0, h - 40, w, 40);
    c.add(ground);
    const sv = img(scene, w * 0.35, h - 40, 'saturnV', (h - 80) / 500).setOrigin(0.5, 1); // same metres-per-pixel as the statue
    c.add(sv);
    // vapor
    const vapor = scene.add.particles(0, 0, 'smoke', { x: w * 0.35, y: h - 220, speedX: { min: 20, max: 60 }, speedY: { min: -10, max: 10 }, lifespan: 2000, scale: { start: 0.2, end: 0.8 }, alpha: { start: 0.35, end: 0 }, frequency: 120 });
    c.add(vapor);
    // Statue of Liberty for size comparison (93 m vs 110.6 m)
    const s = scene.add.graphics();
    const baseY = h - 40, px = (h - 80) / 110.6;
    const sx = w * 0.7;
    s.fillStyle(0x8d8a80, 1); // stone pedestal (about 47 m)
    s.fillRect(sx - 26, baseY - 20 * px, 52, 20 * px);
    s.fillRect(sx - 16, baseY - 47 * px, 32, 27 * px);
    s.fillStyle(0x5fa89a, 1); // copper statue (about 46 m to the torch)
    s.fillTriangle(sx - 14, baseY - 47 * px, sx + 14, baseY - 47 * px, sx, baseY - 82 * px);
    s.fillCircle(sx, baseY - 83 * px, 3.2 * px);
    s.fillRect(sx + 4, baseY - 92 * px, 3, 12 * px);
    s.fillStyle(0xffd166, 1);
    s.fillCircle(sx + 5.5, baseY - 93 * px, 2.5);
    c.add(s);
    label(scene, c, w * 0.35 + 110, 60, 'Saturn V: 110.6 m (363 ft)', { size: 20, color: CSS.yellow });
    label(scene, c, w * 0.7, baseY - 93 * px - 22, 'Statue of Liberty: 93 m', { size: 16 });
  },

  crew(scene, c, w, h) {
    sky(scene, c, w, h, 0x0b1535, 0x1c2b66);
    const crew = [
      ['Neil Armstrong', 'Commander'],
      ['Michael Collins', 'Command Module Pilot'],
      ['Buzz Aldrin', 'Lunar Module Pilot']
    ];
    crew.forEach(([n, role], i) => {
      const x = w * (0.2 + i * 0.3);
      const head = img(scene, x, h * 0.42, 'guideBig', 0.62);
      c.add(head);
      scene.tweens.add({ targets: head, y: head.y - 8, duration: 1000 + i * 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      label(scene, c, x, h * 0.74, n, { size: 22 });
      label(scene, c, x, h * 0.82, role, { size: 16, color: CSS.cyan });
    });
  },

  spacecraftNames(scene, c, w, h) {
    stars(scene, c, w, h);
    const ship = img(scene, w / 2, h / 2, 'csmLm', 1.6);
    c.add(ship);
    label(scene, c, w * 0.3, h / 2 - 90, 'Columbia', { size: 30, color: CSS.cyan });
    label(scene, c, w * 0.3, h / 2 - 58, 'Command & Service Module', { size: 16 });
    label(scene, c, w * 0.72, h / 2 + 90, 'Eagle', { size: 30, color: CSS.yellow });
    label(scene, c, w * 0.72, h / 2 + 122, 'Lunar Module', { size: 16 });
    scene.tweens.add({ targets: ship, y: h / 2 - 10, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  tripToMoon(scene, c, w, h) {
    stars(scene, c, w, h);
    c.add(img(scene, 110, h / 2, 'earth', 0.5));
    c.add(img(scene, w - 90, h / 2, 'moonSmall', 0.9));
    const path = scene.add.graphics();
    path.lineStyle(2, COLORS.yellow, 0.6);
    const pts = [];
    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      pts.push({ x: 110 + (w - 200) * t, y: h / 2 - Math.sin(t * Math.PI) * 120 });
    }
    path.strokePoints(pts, false);
    c.add(path);
    const ship = img(scene, 110, h / 2, 'csmLm', 0.5);
    c.add(ship);
    const tw = scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 5000,
      repeat: -1,
      onUpdate: (t) => {
        const v = t.getValue();
        ship.setPosition(110 + (w - 200) * v, h / 2 - Math.sin(v * Math.PI) * 120);
      }
    });
    c.once('destroy', () => tw.stop());
    label(scene, c, w / 2, h - 40, 'About 3 days · 384,400 km (238,900 miles)', { size: 22, color: CSS.cyan });
  },

  moonwalk(scene, c, w, h) {
    sky(scene, c, w, h, 0x000000, 0x05060a);
    stars(scene, c, w, h * 0.5, 40);
    c.add(img(scene, w * 0.82, h * 0.18, 'earthSmall', 0.7));
    const ground = scene.add.graphics();
    ground.fillStyle(0xa3a3a0, 1);
    ground.fillRect(0, h * 0.68, w, h * 0.32);
    c.add(ground);
    c.add(img(scene, w * 0.22, h * 0.7, 'lm', 1.6).setOrigin(0.5, 1));
    const flag = scene.add.container(w * 0.62, h * 0.7);
    const pole = scene.add.rectangle(0, -70, 3, 140, 0xdddddd);
    const f = img(scene, 46, -118, 'flag', 1);
    flag.add([pole, f]);
    c.add(flag);
    const guy = img(scene, w * 0.45, h * 0.7, 'moonwalker', 1.2).setOrigin(0.5, 1);
    c.add(guy);
    scene.tweens.add({ targets: guy, y: h * 0.7 - 22, x: '+=30', duration: 700, yoyo: true, repeat: -1, ease: 'Quad.easeOut' });
    label(scene, c, w / 2, 36, '"One small step for a man, one giant leap for mankind."', { size: 20, color: CSS.yellow, wrap: w - 60 });
  },

  lunarDescent(scene, c, w, h) {
    sky(scene, c, w, h, 0x000000, 0x05060a);
    stars(scene, c, w, h * 0.5, 40);
    const ground = scene.add.graphics();
    ground.fillStyle(0xa3a3a0, 1);
    ground.fillRect(0, h * 0.75, w, h * 0.25);
    c.add(ground);
    const lm = img(scene, w / 2, 40, 'lm', 1.4);
    c.add(lm);
    const flame = scene.add.image(w / 2, 0, 'flame').setOrigin(0.5, 0).setScale(0.3, 0.4).setBlendMode(Phaser.BlendModes.ADD);
    c.add(flame);
    const dust = scene.add.particles(0, 0, 'smoke', { x: w / 2, y: h * 0.75, speedX: { min: -200, max: 200 }, speedY: { min: -30, max: 0 }, lifespan: 900, scale: { start: 0.2, end: 0.6 }, alpha: { start: 0.5, end: 0 }, tint: 0xc9c2b0, frequency: 40, emitting: false });
    c.add(dust);
    const t = label(scene, c, w / 2, h - 30, '', { size: 26, color: CSS.yellow });
    const run = () => {
      lm.setY(40);
      flame.setVisible(true);
      t.setText('');
      scene.tweens.add({
        targets: lm,
        y: h * 0.75 - 60,
        duration: 4500,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          flame.setY(lm.y + 30);
          dust.emitting = lm.y > h * 0.5;
        },
        onComplete: () => {
          flame.setVisible(false);
          dust.emitting = false;
          t.setText('"The Eagle has landed."');
        }
      });
    };
    run();
    loop(scene, c, 8000, run);
  },

  reentry(scene, c, w, h) {
    sky(scene, c, w, h, 0x0a0f2a, 0x3a1c3a);
    // falling downward, heat shield (bottom of the picture) first
    const cm = img(scene, w / 2, h / 2, 'cmHot', 1.4).setAngle(-18);
    c.add(cm);
    const fire = scene.add.particles(0, 0, 'softDot', {
      follow: cm,
      speedX: { min: -60, max: 60 },
      speedY: { min: -300, max: -150 },
      lifespan: 700,
      scale: { start: 0.6, end: 0 },
      tint: [0xffd166, 0xff9f43, 0xff5a2a],
      blendMode: 'ADD',
      frequency: 12
    });
    c.addAt(fire, 1);
    scene.tweens.add({ targets: cm, x: w / 2 + 10, duration: 90, yoyo: true, repeat: -1 });
    label(scene, c, w / 2, 40, 'About 40,000 km/h (25,000 mph)', { size: 24, color: CSS.orange });
    label(scene, c, w / 2, h - 30, 'Heat shield: about 2,760 °C (5,000 °F)', { size: 20, color: CSS.yellow });
  },

  splashApollo(scene, c, w, h) {
    sky(scene, c, w, h, 0x5aa0e6, 0xbfe3ff);
    const sea = scene.add.graphics();
    sea.fillStyle(0x1f5fa8, 1);
    sea.fillRect(0, h * 0.6, w, h * 0.4);
    c.add(sea);
    const cm = img(scene, w / 2, h * 0.62, 'cm', 1.4);
    c.add(cm);
    const collar = scene.add.ellipse(w / 2, h * 0.66, 130, 24, 0xf5a623);
    c.add(collar);
    scene.tweens.add({ targets: [cm, collar], y: '+=6', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const raft = img(scene, w / 2 + 120, h * 0.68, 'raft', 1.2);
    c.add(raft);
  },

  chutes(scene, c, w, h) {
    sky(scene, c, w, h, 0x5aa0e6, 0xbfe3ff);
    const sea = scene.add.graphics();
    sea.fillStyle(0x1f5fa8, 1);
    sea.fillRect(0, h * 0.86, w, h * 0.14);
    c.add(sea);
    const grp = scene.add.container(w / 2, h * 0.3);
    const lines = scene.add.graphics();
    lines.lineStyle(1.5, 0xffffff, 0.8);
    [-80, 0, 80].forEach((dx) => {
      lines.lineBetween(0, 150, dx - 40, 20);
      lines.lineBetween(0, 150, dx + 40, 20);
    });
    grp.add(lines);
    [-80, 0, 80].forEach((dx) => grp.add(img(scene, dx, -20, 'mainChute', 1.1)));
    grp.add(img(scene, 0, 170, 'cm', 1.1));
    c.add(grp);
    scene.tweens.add({ targets: grp, y: h * 0.36, angle: 3, duration: 2400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  },

  earthrise(scene, c, w, h) {
    sky(scene, c, w, h, 0x000000, 0x020308);
    stars(scene, c, w, h, 60);
    const e = img(scene, w / 2, h * 0.75, 'earth', 0.55);
    c.add(e);
    scene.tweens.add({ targets: e, y: h * 0.35, duration: 6000, ease: 'Sine.easeOut' });
    const g = scene.add.graphics();
    g.fillStyle(0x8f8f8c, 1);
    g.fillEllipse(w / 2, h + 380, w * 2.2, 900);
    c.add(g);
  },

  controlRoom(scene, c, w, h) {
    sky(scene, c, w, h, 0x10152e, 0x1d2448);
    const g = scene.add.graphics();
    g.fillStyle(0x0b2b20, 1);
    g.fillRect(40, 30, w - 80, 180);
    g.lineStyle(2, COLORS.green, 0.6);
    g.strokeRect(40, 30, w - 80, 180);
    for (let r = 0; r < 3; r++) {
      g.fillStyle(0x3a3f4b, 1);
      g.fillRect(60, 260 + r * 70, w - 120, 40);
      for (let k = 0; k < 8; k++) {
        g.fillStyle(0x0b2b20, 1);
        g.fillRect(80 + k * ((w - 160) / 8), 240 + r * 70, 50, 24);
      }
    }
    c.add(g);
    const line = scene.add.graphics();
    c.add(line);
    let x = 0;
    loop(scene, c, 60, () => {
      x = (x + 8) % (w - 100);
      line.clear();
      line.lineStyle(3, COLORS.green, 1);
      const pts = [];
      for (let i = 0; i <= 40; i++) pts.push({ x: 50 + i * ((w - 100) / 40), y: 120 + Math.sin(i * 0.5 + x * 0.05) * 40 });
      line.strokePoints(pts, false);
    });
  }
};

export function drawVisual(scene, c, key, w, h, slide) {
  const fn = VISUALS[key] || VISUALS.sky;
  fn(scene, c, w, h, slide);
}
