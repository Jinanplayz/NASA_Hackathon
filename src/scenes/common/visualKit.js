// Building blocks for the animated cutscene pictures (see Visuals.js and the chapter visual files).

import Phaser from 'phaser';
import { COLORS, CSS, seeded } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';

export function stars(scene, c, w, h, n = 90, seed = 3) {
  const rnd = seeded(seed);
  const g = scene.add.graphics();
  for (let i = 0; i < n; i++) {
    g.fillStyle(0xffffff, 0.3 + rnd() * 0.7);
    g.fillCircle(rnd() * w, rnd() * h, rnd() < 0.1 ? 1.6 : 0.9);
  }
  c.add(g);
  return g;
}

export function sky(scene, c, w, h, top = 0x050a1f, bottom = 0x1a2a6c) {
  const g = scene.add.graphics();
  g.fillGradientStyle(top, top, bottom, bottom, 1);
  g.fillRect(0, 0, w, h);
  c.add(g);
  return g;
}

export function label(scene, c, x, y, text, o = {}) {
  const t = txt(scene, x, y, text, { size: o.size ?? 20, weight: o.weight ?? 700, color: o.color ?? CSS.text, origin: o.origin ?? 0.5, align: 'center', stroke: '#070b1d', strokeThickness: 5, scale: false, wrap: o.wrap });
  c.add(t);
  return t;
}

// A one-off timer that is cancelled if the picture is removed first.
export function later(scene, c, delay, fn) {
  const ev = scene.time.delayedCall(delay, fn);
  c.once('destroy', () => ev.remove());
  return ev;
}

// Sounds from a picture stay silent while a NASA film plays over it.
export function sfx(c, name) {
  if (!c.getData('quiet')) Sfx.play(name);
}

// Repeats fn every `delay` ms while the picture is on screen (paused while a film plays over it).
export function loop(scene, c, delay, fn) {
  const ev = scene.time.addEvent({ delay, loop: true, callback: () => c.getData('quiet') || fn() });
  c.once('destroy', () => ev.remove());
  return ev;
}

export function orbit(scene, c, obj, cx, cy, rx, ry, period, start = 0, rotateToPath = false) {
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

// A counter tween that stops when the picture is removed.
export function counter(scene, c, cfg) {
  const tw = scene.tweens.addCounter(cfg);
  c.once('destroy', () => tw.stop());
  return tw;
}

// One detailed launch, played once before a NASA launch film (it never starts over):
// countdown with venting vapour, the gantry arm swinging away, ignition and billowing smoke,
// liftoff, the climb through the clouds as the sky turns black, the first stage dropping away,
// then the rocket carries on into space until the film starts.
// o: scale, tower, night, split (how much of the picture, from the top, flies on after staging),
//    stageText, spaceText
export function launchSequence(scene, c, w, h, rocketKey, o = {}) {
  const padY = h - 70;
  sky(scene, c, w, h, o.night ? 0x02040d : 0x3a78c9, o.night ? 0x0c1640 : 0xa9d4ff);
  const dark = scene.add.rectangle(w / 2, h / 2, w, h, 0x02030a, 1).setAlpha(0);
  c.add(dark);
  const starry = stars(scene, c, w, h, 110, 8).setAlpha(o.night ? 0.7 : 0);

  // everything on the ground (and the clouds above it) scrolls down as the rocket climbs
  const world = scene.add.container(0, 0);
  c.add(world);
  for (let i = 0; i < 5; i++) {
    const cl = img(scene, 90 + ((i * 290) % (w - 120)), -140 - i * 300, 'cloud' + (i % 3), 0.9 + (i % 2) * 0.4).setAlpha(o.night ? 0.35 : 0.9);
    world.add(cl);
  }
  const ground = scene.add.graphics();
  ground.fillStyle(o.night ? 0x0d1a12 : 0x3f7a4a, 1);
  ground.fillRect(-40, h - 60, w + 80, 400);
  ground.fillStyle(0x777b85, 1);
  ground.fillRect(w / 2 - 90, h - 70, 180, 16);
  world.add(ground);
  const towerH = o.tower ?? 300;
  const gx = w / 2 + 60;
  const gan = scene.add.graphics();
  gan.lineStyle(3, o.night ? 0x8a3a2a : 0xb8452f, 1);
  gan.strokeRect(gx, padY - towerH, 34, towerH);
  for (let y = padY; y > padY - towerH; y -= 24) gan.lineBetween(gx, y, gx + 34, y - 24);
  world.add(gan);
  // the arm that holds the rocket until launch
  const arm = scene.add.rectangle(gx, padY - towerH * 0.72, 44, 7, o.night ? 0x8a3a2a : 0xb8452f).setOrigin(1, 0.5);
  world.add(arm);
  const smoke = scene.add.particles(0, 0, 'smoke', {
    x: w / 2,
    y: h - 60,
    speedX: { min: -260, max: 260 },
    speedY: { min: -60, max: 0 },
    lifespan: 2200,
    scale: { start: 0.5, end: 2.2 },
    alpha: { start: 0.8, end: 0 },
    frequency: 18,
    emitting: false
  });
  world.add(smoke);

  // the rocket: two copies of the picture, cut where the stages separate
  const rk = scene.add.container(w / 2, padY);
  const scale = o.scale ?? 0.8;
  const upper = img(scene, 0, 0, rocketKey, scale).setOrigin(0.5, 1);
  const lower = img(scene, 0, 0, rocketKey, scale).setOrigin(0.5, 1);
  const fw = upper.frame.width, fh = upper.frame.height;
  const split = o.split ?? 0.5;
  upper.setCrop(0, 0, fw, fh * split);
  lower.setCrop(0, fh * split, fw, fh * (1 - split));
  const rH = upper.displayHeight, rW = upper.displayWidth;
  const fs = (rW * 0.95) / 80; // flame picture is 80 px wide
  const flame = scene.add.image(0, -2, 'flame').setOrigin(0.5, 0).setScale(fs * 0.3, fs * 0.4).setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
  rk.add([flame, lower, upper]);
  c.add(rk);
  const vent = scene.add.particles(0, 0, 'smoke', {
    x: w / 2 + rW * 0.45,
    y: padY - rH * 0.55,
    speedX: { min: 20, max: 60 },
    speedY: { min: -10, max: 10 },
    lifespan: 1400,
    scale: { start: 0.15, end: 0.55 },
    alpha: { start: 0.45, end: 0 },
    frequency: 140,
    emitting: false
  });
  c.add(vent);
  const trail = scene.add.particles(0, 0, 'smoke', {
    follow: rk,
    speedY: { min: 90, max: 150 },
    speedX: { min: -18, max: 18 },
    lifespan: 1500,
    scale: { start: 0.25, end: 1.1 },
    alpha: { start: 0.5, end: 0 },
    frequency: 40,
    emitting: false
  });
  c.addAt(trail, c.getIndex(rk));

  const count = label(scene, c, 76, 58, '', { size: 44 });
  const news = label(scene, c, w / 2, 44, '', { size: 26, color: CSS.yellow });
  const say = (t, color = CSS.yellow) => {
    news.setText(t).setColor(color).setAlpha(0).setScale(0.7);
    scene.tweens.add({ targets: news, alpha: 1, scale: 1, duration: 300, ease: 'Back.easeOut' });
  };

  later(scene, c, 200, () => (vent.emitting = true));
  ['5', '4', '3', '2', '1'].forEach((n, i) =>
    later(scene, c, 400 + i * 700, () => {
      count.setText(n);
      sfx(c, 'tick');
    })
  );
  // the arm swings away from the rocket
  later(scene, c, 2000, () => scene.tweens.add({ targets: arm, angle: -80, duration: 900, ease: 'Sine.easeInOut' }));
  // ignition: fire and smoke, the rocket strains against the pad
  later(scene, c, 3700, () => {
    count.setText('');
    say(o.igniteText || 'Ignition!', CSS.orange);
    vent.emitting = false;
    flame.setVisible(true);
    scene.tweens.add({ targets: flame, alpha: 0.7, duration: 70, yoyo: true, repeat: -1 });
    scene.tweens.add({ targets: flame, scaleX: fs * 0.7, scaleY: fs * 1.1, duration: 600 });
    smoke.emitting = true;
    sfx(c, 'ignition');
    scene.tweens.add({ targets: rk, x: w / 2 + 1.5, duration: 50, yoyo: true, repeat: 16 });
  });
  // liftoff: slowly at first, then faster, clearing the tower
  later(scene, c, 4600, () => {
    say(o.liftoffText || 'Liftoff!');
    trail.emitting = true;
    scene.tweens.add({ targets: rk, y: h * 0.62, scale: 0.6, duration: 3200, ease: 'Quad.easeIn' });
    scene.tweens.add({ targets: flame, scaleY: fs * 1.5, duration: 1500 });
  });
  later(scene, c, 6200, () => (smoke.emitting = false));
  // the climb: the ground falls away, clouds rush past, the sky turns black
  later(scene, c, 7600, () => {
    scene.tweens.add({ targets: world, y: 1700, duration: 6500, ease: 'Sine.easeIn' });
    scene.tweens.add({ targets: dark, alpha: 0.92, duration: 6000 });
    scene.tweens.add({ targets: starry, alpha: 1, duration: 6000, delay: 1500 });
    scene.tweens.add({ targets: rk, scale: 0.5, duration: 6000 });
  });
  // staging: the used stage drops away and the next part flies on
  later(scene, c, 10800, () => {
    say(o.stageText || 'Stage 1 drops away!', CSS.cyan);
    sfx(c, 'whoosh');
    flame.setVisible(false);
    scene.tweens.add({ targets: lower, y: rH * 0.9, angle: -24, alpha: 0, duration: 2600, ease: 'Quad.easeIn' });
    later(scene, c, 700, () => {
      flame.setY(-rH * (1 - split)).setScale(fs * 0.45, fs * 0.8).setVisible(true);
    });
  });
  // space!
  later(scene, c, 13000, () => {
    say(o.spaceText || 'Space!', CSS.text);
    trail.frequency = 90;
    scene.tweens.add({ targets: rk, y: '-=14', duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  });
  // the NASA film waits until the whole launch has been shown
  c.setData('filmAfter', 14500);
}
