// Animated pictures for the Test Your Knowledge cutscenes. Where it makes sense they show the
// player's own spaceship (or an example one before it's built).
import { TEX, COLORS, CSS } from '../../core/constants.js';
import { img } from '../../art/core.js';
import { stars, sky, label, later, sfx, loop } from './visualKit.js';
import { Lab } from '../lab/labState.js';
import { craftTexture, rocketTexture, partTexture, drawRadar } from '../lab/labArt.js';

const EXAMPLE = {
  mission: 'mars',
  body: 'probe',
  power: 'solar',
  comms: 'dish',
  support: ['insulation'],
  entry: [],
  science: ['camera', 'magnetometer'],
  rocket: 'mediumRocket',
  paint: { body: 'white', trim: 'orange', pattern: 'stripes' }
};
// the player's ship once it has a body, otherwise the example
const ship = () => (Lab.picked('body').length ? Lab.design() : EXAMPLE);

export const VISUALS_LAB = {
  // every spacecraft from the chapters, drifting past
  labParade(scene, c, w, h) {
    stars(scene, c, w, h, 150, 81);
    const list = [['mercuryRedstone', 0.32], ['explorer1', 0.7], ['saturnV', 0.24], ['csmLm', 0.55], ['voyager', 0.45], ['curiosity', 0.5], ['jwst', 0.42]];
    list.forEach(([key, s], i) => {
      const x = 70 + (i * (w - 140)) / (list.length - 1);
      const y = h / 2 + (i % 2 ? 60 : -50);
      const im = img(scene, x, y + 30, key, s).setAlpha(0);
      c.add(im);
      scene.tweens.add({ targets: im, alpha: 1, y, duration: 700, delay: 300 + i * 260, ease: 'Back.easeOut' });
      scene.tweens.add({ targets: im, y: y - 10, duration: 1800 + i * 90, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: 1000 + i * 260 });
    });
  },

  // a glowing blueprint with a spaceship being drawn on it
  labBlueprint(scene, c, w, h) {
    sky(scene, c, w, h, 0x0d1a45, 0x070b1d);
    const g = scene.add.graphics();
    g.lineStyle(1, 0x2a4a9a, 0.35);
    for (let x = 0; x < w; x += 32) g.lineBetween(x, 0, x, h);
    for (let y = 0; y < h; y += 32) g.lineBetween(0, y, w, y);
    c.add(g);
    const im = scene.add.image(w / 2, h / 2 + 10, craftTexture(scene, ship())).setScale(1.3 / TEX).setAlpha(0);
    c.add(im);
    scene.tweens.add({ targets: im, alpha: 1, duration: 1600, delay: 300 });
    scene.tweens.add({ targets: im, angle: 3, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    ['?', '?', '?'].forEach((q, i) => {
      const t = label(scene, c, w / 2 + (i - 1) * 190, 60 + (i % 2) * 30, q, { size: 46, color: CSS.cyan });
      scene.tweens.add({ targets: t, y: t.y - 10, alpha: 0.4, duration: 1200 + i * 200, yoyo: true, repeat: -1 });
    });
  },

  // credits raining down, and the parts they buy
  labCredits(scene, c, w, h) {
    sky(scene, c, w, h, 0x0b1230, 0x16204a);
    const parts = ['rtg', 'dish', 'camera', 'heatShield', 'parachutes', 'solar', 'drill', 'airbags'];
    parts.forEach((id, i) => {
      const x = 80 + (i % 4) * ((w - 160) / 3), y = h / 2 - 50 + Math.floor(i / 4) * 130;
      const im = scene.add.image(x, y, partTexture(scene, id)).setScale(0.85 / TEX).setAlpha(0);
      c.add(im);
      scene.tweens.add({ targets: im, alpha: 1, duration: 400, delay: 500 + i * 200 });
    });
    loop(scene, c, 260, () => {
      const coin = scene.add.circle(Math.random() * w, -20, 12, COLORS.yellow).setStrokeStyle(3, 0xc99a2e);
      c.add(coin);
      scene.tweens.add({ targets: coin, y: h + 30, duration: 1800 + Math.random() * 800, ease: 'Quad.easeIn', onComplete: () => coin.destroy() });
    });
  },

  // the spaceship bolted onto a shaking table
  labShaker(scene, c, w, h) {
    sky(scene, c, w, h, 0x1a2333, 0x0e131c);
    const g = scene.add.graphics();
    g.fillStyle(0x3a4252, 1);
    g.fillRect(0, h - 70, w, 70);
    g.fillStyle(0x6b7385, 1);
    g.fillRect(w / 2 - 170, h - 120, 340, 26);
    g.fillStyle(0x4a5262, 1);
    for (let i = 0; i < 4; i++) g.fillRect(w / 2 - 150 + i * 96, h - 94, 28, 26);
    c.add(g);
    const im = scene.add.image(w / 2, h - 230, craftTexture(scene, ship())).setScale(1 / TEX);
    c.add(im);
    label(scene, c, w / 2, 40, 'SHAKE TABLE', { size: 22, color: CSS.yellow });
    loop(scene, c, 60, () => {
      im.x = w / 2 + (Math.random() - 0.5) * 8;
      im.y = h - 230 + (Math.random() - 0.5) * 6;
    });
    loop(scene, c, 1400, () => sfx(c, 'hit'));
  },

  // a giant vacuum chamber, freezing and then baking under the lamps
  labChamber(scene, c, w, h) {
    sky(scene, c, w, h, 0x070b1d, 0x101830);
    const g = scene.add.graphics();
    g.fillStyle(0x2a3140, 1);
    g.fillCircle(w / 2, h / 2 + 10, Math.min(w, h) * 0.44);
    g.fillStyle(0x0b0f18, 1);
    g.fillCircle(w / 2, h / 2 + 10, Math.min(w, h) * 0.38);
    c.add(g);
    const glow = scene.add.image(w / 2, h / 2 + 10, 'softDot').setDisplaySize(420, 420).setTint(0x7fc8ff).setAlpha(0.35);
    c.add(glow);
    c.add(scene.add.image(w / 2, h / 2 + 10, craftTexture(scene, ship())).setScale(0.95 / TEX));
    const tag = label(scene, c, w / 2, 40, 'FREEZING', { size: 22, color: CSS.cyan });
    let hot = false;
    loop(scene, c, 2200, () => {
      hot = !hot;
      tag.setText(hot ? 'BAKING' : 'FREEZING').setColor(hot ? CSS.orange : CSS.cyan);
      scene.tweens.add({ targets: glow, duration: 600, alpha: 0.45 });
      glow.setTint(hot ? 0xffb35c : 0x7fc8ff);
    });
  },

  // a report card with stars and a chart
  labReportCard(scene, c, w, h) {
    sky(scene, c, w, h, 0x0b1230, 0x070b1d);
    const key = 'labVisualRadar';
    if (!scene.textures.exists(key)) {
      const t = scene.textures.createCanvas(key, 360 * TEX, 300 * TEX);
      const ctx = t.getContext();
      ctx.scale(TEX, TEX);
      drawRadar(ctx, 180, 150, 100, [90, 70, 95, 80, 75, 85], ['Launch', 'Power', 'Radio', 'Safety', 'Arrival', 'Science'], { size: 15 });
      t.refresh();
    }
    const chart = scene.add.image(w * 0.36, h / 2 + 20, key).setScale(1 / TEX).setAlpha(0);
    c.add(chart);
    scene.tweens.add({ targets: chart, alpha: 1, duration: 800, delay: 300 });
    for (let i = 0; i < 5; i++) {
      const s = img(scene, w * 0.68 + i * 40, h / 2 - 40, 'sparkle', 0.5).setTint(COLORS.yellow).setScale(0);
      c.add(s);
      later(scene, c, 900 + i * 250, () => {
        sfx(c, 'twinkle');
        scene.tweens.add({ targets: s, scale: 0.6 / TEX, duration: 300, ease: 'Back.easeOut' });
      });
    }
    label(scene, c, w * 0.76, h / 2 + 40, 'GRADE A', { size: 34, color: CSS.yellow });
  },

  // the player's rocket on the launch pad, steaming
  labPad(scene, c, w, h) {
    sky(scene, c, w, h, 0x1a2a6c, 0x6a8fd8);
    const g = scene.add.graphics();
    g.fillStyle(0x2f6b3a, 1);
    g.fillRect(0, h - 50, w, 50);
    g.fillStyle(0x6b7385, 1);
    g.fillRect(w / 2 - 90, h - 64, 180, 16);
    g.fillStyle(0xb8402f, 1);
    g.fillRect(w / 2 + 70, h - 330, 16, 270);
    for (let y = h - 320; y < h - 70; y += 30) g.fillRect(w / 2 + 40, y, 46, 4);
    c.add(g);
    const r = scene.add.image(w / 2, h - 62, rocketTexture(scene, { ...ship(), rocket: Lab.picked('rocket')[0] || ship().rocket || 'mediumRocket' })).setOrigin(0.5, 1).setScale(0.62 / TEX);
    c.add(r);
    loop(scene, c, 160, () => {
      const p = img(scene, w / 2 + (Math.random() - 0.5) * 60, h - 60, 'smoke', 0.3).setAlpha(0.6);
      c.add(p);
      scene.tweens.add({ targets: p, x: p.x + (Math.random() - 0.5) * 120, y: p.y - 30, alpha: 0, scale: 0.9 / TEX, duration: 1600, onComplete: () => p.destroy() });
    });
  }
};
