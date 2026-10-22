// Animated pictures for Chapter 7 (James Webb Space Telescope) cutscenes.
import Phaser from 'phaser';
import { COLORS, CSS, seeded } from '../../core/constants.js';
import { img } from '../../art/core.js';
import { stars, sky, label, later, sfx, loop, counter, launchSequence } from './visualKit.js';
import { WebbDiagram } from './webbDiagram.js';

export const VISUALS_CH7 = {
  hubbleOrbit(scene, c, w, h) {
    stars(scene, c, w, h, 140, 71);
    c.add(img(scene, w * 0.5, h + 260, 'earthBig', 1.25));
    const hb = img(scene, w * 0.5, h * 0.36, 'hubble', 1.1);
    c.add(hb);
    scene.tweens.add({ targets: hb, y: hb.y - 12, angle: 4, duration: 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    label(scene, c, w / 2, 40, 'Hubble, above the blurry air (1990)', { size: 22, color: CSS.cyan });
  },

  // more and more faint galaxies appear the longer we look
  deepSky(scene, c, w, h) {
    sky(scene, c, w, h, 0x000000, 0x05060f);
    const rnd = seeded(72);
    const shown = [];
    loop(scene, c, 140, () => {
      const k = Phaser.Math.RND.pick(['galaxySpiral', 'galaxyRed', 'starYellow']);
      const gx = img(scene, rnd() * w, rnd() * h, k, 0.1 + rnd() * 0.25).setAlpha(0).setAngle(rnd() * 360);
      c.addAt(gx, 1);
      shown.push(gx);
      scene.tweens.add({ targets: gx, alpha: 0.5 + rnd() * 0.5, duration: 800 });
      if (shown.length > 200) shown.shift().destroy();
    });
    label(scene, c, w / 2, h - 40, 'Galaxies, galaxies everywhere...', { size: 22, color: CSS.yellow });
  },

  // a light wave stretching from blue to red to invisible infrared
  infraredStretch(scene, c, w, h) {
    stars(scene, c, w, h, 100, 73);
    c.add(img(scene, 90, h / 2, 'galaxyRed', 1));
    c.add(img(scene, w - 90, h / 2, 'jwst', 0.4));
    const g = scene.add.graphics();
    c.add(g);
    const caption = label(scene, c, w / 2, 40, '', { size: 22 });
    counter(scene, c, { from: 0, to: 1, duration: 7000, repeat: -1, repeatDelay: 800, onUpdate: (tw) => {
      const v = tw.getValue();
      const band = v < 0.3 ? 0 : v < 0.6 ? 1 : v < 0.85 ? 2 : 3;
      const col = [0x5b8cff, 0x3ddc97, 0xff4b3b, 0xb0302a][band];
      g.clear();
      g.lineStyle(5, col, band === 3 ? 0.35 : 1);
      g.beginPath();
      const len = 40 + v * 160;
      for (let x = 160; x <= w - 170; x += 4) {
        const y = h / 2 + Math.sin(((x - 160) / len) * Math.PI * 2) * 40;
        if (x === 160) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.strokePath();
      caption.setText(['Blue light...', 'Green...', 'Red...', 'Infrared: only Webb can see it!'][band]);
    } });
  },

  webbSpin(scene, c, w, h) {
    stars(scene, c, w, h, 150, 74);
    const s = img(scene, w / 2, h / 2 + 10, 'jwst', 1.25);
    c.add(s);
    scene.tweens.add({ targets: s, y: s.y - 14, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    // a glint sweeps across the gold
    loop(scene, c, 2600, () => {
      const glint = scene.add.rectangle(w / 2 - 150, h / 2 - 60, 26, 230, 0xffffff, 0.35).setAngle(25).setBlendMode(Phaser.BlendModes.ADD);
      c.add(glint);
      scene.tweens.add({ targets: glint, x: w / 2 + 150, alpha: 0, duration: 900, onComplete: () => glint.destroy() });
    });
  },

  goldMirror(scene, c, w, h) {
    sky(scene, c, w, h, 0x0b0f1f, 0x1a2350);
    const m = img(scene, w / 2, h / 2 + 10, 'jwstMirror', 1.6);
    c.add(m);
    loop(scene, c, 2200, () => {
      const glint = scene.add.rectangle(w / 2 - 220, h / 2, 34, 420, 0xffffff, 0.4).setAngle(20).setBlendMode(Phaser.BlendModes.ADD);
      c.add(glint);
      scene.tweens.add({ targets: glint, x: w / 2 + 220, alpha: 0, duration: 1100, onComplete: () => glint.destroy() });
    });
    label(scene, c, w / 2, 36, '18 hexagons, coated in real gold', { size: 22, color: CSS.yellow });
  },

  // the hot side and the cold side of the sunshield
  sunshieldCool(scene, c, w, h) {
    stars(scene, c, w, h, 100, 75);
    const sun = img(scene, 60, h / 2, 'sun', 0.8);
    c.add(sun);
    const shield = scene.add.graphics();
    for (let k = 0; k < 5; k++) {
      shield.fillStyle(Phaser.Display.Color.GetColor(200 - k * 15, 180 - k * 14, 240 - k * 10), 1);
      shield.fillRect(w * 0.42 + k * 14, h * 0.15, 6, h * 0.7);
    }
    c.add(shield);
    c.add(img(scene, w * 0.75, h / 2, 'jwstMirror', 0.8));
    label(scene, c, w * 0.22, h - 40, 'Hot side', { size: 22, color: CSS.orange });
    label(scene, c, w * 0.75, h - 40, 'Cold side: about -230 °C', { size: 22, color: CSS.cyan });
    loop(scene, c, 120, () => {
      const ray = scene.add.rectangle(110, h * 0.2 + Math.random() * h * 0.6, 30, 3, 0xffd166, 0.8);
      c.add(ray);
      scene.tweens.add({ targets: ray, x: w * 0.4, duration: 600, onComplete: () => ray.destroy() });
    });
  },

  arianeLaunch(scene, c, w, h) {
    launchSequence(scene, c, w, h, 'ariane5', { scale: 0.8, tower: 320, split: 0.35, stageText: 'The boosters fall away!', spaceText: 'On to L2!' });
  },

  // Webb unfolding, step by step
  webbUnfold(scene, c, w, h) {
    stars(scene, c, w, h, 120, 76);
    const d = new WebbDiagram(scene, w / 2, h * 0.62, 0.62, 1);
    c.add(d.g);
    const parts = ['solar', 'antenna', 'pallets', 'tower', 'shield', 'secondary', 'wings'];
    parts.forEach((p, i) => later(scene, c, 600 + i * 1300, () => {
      if (!d.g.active) return;
      d.animate(p, 0, 1100);
      sfx(c, 'whoosh');
    }));
    label(scene, c, w / 2, 36, 'Unfolding, one step at a time', { size: 22, color: CSS.cyan });
  },

  l2Orbit(scene, c, w, h) {
    stars(scene, c, w, h, 130, 77);
    c.add(scene.add.image(-60, h / 2, 'softDot').setScale(3).setTint(0xffd27a).setAlpha(0.5));
    c.add(img(scene, w * 0.3, h / 2, 'earthSmall', 0.8));
    const l2 = { x: w * 0.78, y: h / 2 };
    const g = scene.add.graphics();
    g.lineStyle(2, COLORS.green, 0.6);
    g.strokeEllipse(l2.x, l2.y, 160, 90);
    c.add(g);
    label(scene, c, l2.x, l2.y - 70, 'L2', { size: 24, color: CSS.green });
    const webb = img(scene, 0, 0, 'jwst', 0.2);
    c.add(webb);
    counter(scene, c, { from: 0, to: Math.PI * 2, duration: 6000, repeat: -1, onUpdate: (tw) => {
      const a = tw.getValue();
      webb.setPosition(l2.x + Math.cos(a) * 80, l2.y + Math.sin(a) * 45);
    } });
    label(scene, c, w / 2, h - 40, '1.5 million km from Earth, always in Earth\'s shadow side', { size: 20, color: CSS.cyan });
  },

  // 18 copies of a star coming together into one
  firstLight(scene, c, w, h) {
    sky(scene, c, w, h, 0x000000, 0x020308);
    const dots = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const d = scene.add.image(w / 2 + Math.cos(a) * 180, h / 2 + Math.sin(a) * 140, 'softDot').setScale(0.4).setTint(0xcfe0ff).setBlendMode(Phaser.BlendModes.ADD);
      c.add(d);
      dots.push({ d, x: d.x, y: d.y });
    }
    counter(scene, c, { from: 0, to: 1, duration: 5000, repeat: -1, repeatDelay: 1500, yoyo: true, hold: 1200, onUpdate: (tw) => {
      const k = tw.getValue();
      dots.forEach((p) => p.d.setPosition(p.x + (w / 2 - p.x) * k, p.y + (h / 2 - p.y) * k));
    } });
    label(scene, c, w / 2, 40, '18 mirror segments = 18 copies of one star', { size: 22, color: CSS.cyan });
  },

  galaxyZoom(scene, c, w, h) {
    sky(scene, c, w, h, 0x000000, 0x05060f);
    const rnd = seeded(78);
    for (let i = 0; i < 40; i++) c.add(img(scene, rnd() * w, rnd() * h, Phaser.Math.RND.pick(['galaxySpiral', 'galaxyRed']), 0.08 + rnd() * 0.18).setAngle(rnd() * 360).setAlpha(0.8));
    const far = img(scene, w * 0.62, h * 0.45, 'galaxyRed', 0.2);
    c.add(far);
    scene.tweens.add({ targets: far, scale: far.scale * 5, duration: 6000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    label(scene, c, w / 2, h - 40, 'Some of the farthest galaxies ever seen', { size: 22, color: CSS.yellow });
  },

  // OSIRIS-REx touches Bennu, and the capsule parachutes into the desert
  bennuSample(scene, c, w, h) {
    stars(scene, c, w, h, 120, 79);
    const b = img(scene, w * 0.3, h * 0.55, 'bennu', 2);
    c.add(b);
    scene.tweens.add({ targets: b, angle: 360, duration: 30000, repeat: -1 });
    const ox = img(scene, w * 0.75, h * 0.25, 'osirisRex', 0.9);
    c.add(ox);
    counter(scene, c, { from: 0, to: 1, duration: 6000, repeat: -1, repeatDelay: 600, onUpdate: (tw) => {
      const k = tw.getValue();
      const touch = k < 0.5 ? k * 2 : 1 - (k - 0.5) * 2;
      ox.setPosition(w * 0.75 - touch * w * 0.25, h * 0.25 + touch * h * 0.15);
    } });
    loop(scene, c, 3000, () => {
      const puff = scene.add.image(w * 0.5, h * 0.42, 'softDot').setScale(0.2).setTint(0x8a847c).setAlpha(0.8);
      c.add(puff);
      scene.tweens.add({ targets: puff, scale: 0.9, alpha: 0, duration: 900, onComplete: () => puff.destroy() });
    });
    label(scene, c, w / 2, 40, 'OSIRIS-REx grabs a sample from asteroid Bennu', { size: 21, color: CSS.cyan });
  },

  // every spacecraft from the whole game, flying by
  journeyEnd(scene, c, w, h) {
    stars(scene, c, w, h, 160, 80);
    const ships = [['sputnik', 0.9], ['explorer1', 0.8], ['mercuryRedstone', 0.3], ['csmLm', 0.55], ['voyager', 0.6], ['curiosity', 0.6], ['ingenuity', 0.7], ['jwst', 0.65]];
    ships.forEach(([k, s], i) => {
      if (!scene.textures.exists(k)) return;
      const im = img(scene, -160, 80 + (i % 4) * 95 + (i % 2) * 20, k, s);
      c.add(im);
      scene.tweens.add({ targets: im, x: w + 160, duration: 8000, delay: i * 1000, repeat: -1 });
    });
    label(scene, c, w / 2, h - 40, 'What a journey!', { size: 26, color: CSS.yellow });
  }
};
