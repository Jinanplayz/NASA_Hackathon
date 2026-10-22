// Animated pictures for Chapter 5 (Voyager) cutscenes.
import Phaser from 'phaser';
import { COLORS, CSS } from '../../core/constants.js';
import { img } from '../../art/core.js';
import { stars, sky, label, later, sfx, loop, orbit, counter, launchSequence } from './visualKit.js';

export const VISUALS_CH5 = {
  // the outer planets lined up, with the two Voyagers' paths curving past them
  grandTour(scene, c, w, h) {
    stars(scene, c, w, h, 140);
    const S = { x: 70, y: h - 60 };
    c.add(img(scene, S.x, S.y, 'sun', 0.7));
    const planets = [['jupiter', 0.2, 200], ['saturn', 0.22, 360], ['uranus', 0.3, 540], ['neptune', 0.3, 720]];
    const pts = planets.map(([, , d], i) => ({ x: S.x + d, y: S.y - 70 - i * 90 }));
    planets.forEach(([key, s], i) => {
      const p = img(scene, pts[i].x, pts[i].y, key, s);
      c.add(p);
      scene.tweens.add({ targets: p, y: p.y - 6, duration: 1600 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    const path = new Phaser.Curves.Spline([new Phaser.Math.Vector2(S.x + 60, S.y - 10), ...pts.map((p) => new Phaser.Math.Vector2(p.x - 10, p.y + 26)), new Phaser.Math.Vector2(w - 40, 40)]);
    const g = scene.add.graphics();
    g.lineStyle(3, COLORS.yellow, 0.6);
    path.draw(g, 80);
    c.add(g);
    const probe = img(scene, 0, 0, 'voyager', 0.22);
    c.add(probe);
    counter(scene, c, { from: 0, to: 1, duration: 8000, repeat: -1, onUpdate: (tw) => {
      const p = path.getPoint(tw.getValue());
      probe.setPosition(p.x, p.y);
    } });
    label(scene, c, w / 2, 40, 'The Grand Tour: a line-up every ~175 years', { size: 22, color: CSS.cyan });
  },

  // a spacecraft swinging round a planet and leaving faster
  gravityAssist(scene, c, w, h) {
    stars(scene, c, w, h, 120);
    const P = { x: w / 2, y: h / 2 + 30 };
    c.add(img(scene, P.x, P.y, 'jupiter', 0.75));
    const path = new Phaser.Curves.Spline([new Phaser.Math.Vector2(40, h - 60), new Phaser.Math.Vector2(P.x - 160, P.y + 140), new Phaser.Math.Vector2(P.x + 40, P.y + 150), new Phaser.Math.Vector2(P.x + 170, P.y + 20), new Phaser.Math.Vector2(w - 60, 60)]);
    const g = scene.add.graphics();
    g.lineStyle(3, COLORS.yellow, 0.4);
    path.draw(g, 80);
    c.add(g);
    const probe = img(scene, 0, 0, 'voyager', 0.25);
    c.add(probe);
    const speed = label(scene, c, w - 150, h - 40, '', { size: 22, color: CSS.green });
    counter(scene, c, { from: 0, to: 1, duration: 6000, repeat: -1, ease: 'Sine.easeIn', onUpdate: (tw) => {
      const t = tw.getValue();
      const p = path.getPoint(t);
      probe.setPosition(p.x, p.y);
      speed.setText(`Speed: ${t < 0.4 ? 'normal' : t < 0.7 ? 'faster!' : 'much faster!'}`);
    } });
    label(scene, c, w / 2, 40, "A planet's gravity flings the spacecraft onwards", { size: 22, color: CSS.cyan });
  },

  recordSpin(scene, c, w, h) {
    stars(scene, c, w, h, 100);
    const rec = img(scene, w / 2, h / 2, 'goldenRecordDisc', 1.4);
    c.add(rec);
    scene.tweens.add({ targets: rec, angle: 360, duration: 9000, repeat: -1 });
    c.add(img(scene, w * 0.82, h * 0.78, 'voyager', 0.55));
    loop(scene, c, 900, () => {
      const n = label(scene, c, w / 2 + Phaser.Math.Between(-180, 180), h / 2 + Phaser.Math.Between(-60, 60), Phaser.Math.RND.pick(['♪', '♫']), { size: 30, color: CSS.yellow });
      scene.tweens.add({ targets: n, y: n.y - 80, alpha: 0, duration: 1600, onComplete: () => n.destroy() });
    });
    label(scene, c, w / 2, 36, 'The Golden Record: the sounds of Earth', { size: 22, color: CSS.yellow });
  },

  voyagerLaunch(scene, c, w, h) {
    launchSequence(scene, c, w, h, 'titan3e', { scale: 0.8, tower: 300, split: 0.3, stageText: 'The lower stages drop away!', spaceText: 'On to Jupiter!' });
  },

  twoVoyagers(scene, c, w, h) {
    stars(scene, c, w, h, 120);
    c.add(img(scene, 80, h / 2, 'earthSmall', 0.9));
    c.add(img(scene, w - 120, h / 2 - 20, 'jupiter', 0.5));
    const v1 = img(scene, 140, h / 2 - 60, 'voyager', 0.3);
    const v2 = img(scene, 220, h / 2 + 70, 'voyager', 0.3);
    c.add([v1, v2]);
    const l1 = label(scene, c, 0, 0, 'Voyager 1', { size: 18, color: CSS.yellow });
    const l2 = label(scene, c, 0, 0, 'Voyager 2', { size: 18, color: CSS.cyan });
    counter(scene, c, { from: 0, to: 1, duration: 7000, repeat: -1, repeatDelay: 800, onUpdate: (tw) => {
      const t = tw.getValue();
      // Voyager 2 starts ahead, but Voyager 1's faster path overtakes it
      v1.setPosition(140 + t * (w - 340), h / 2 - 60 - Math.sin(t * Math.PI) * 40);
      v2.setPosition(220 + t * (w - 520), h / 2 + 70 + Math.sin(t * Math.PI) * 30);
      l1.setPosition(v1.x, v1.y - 34);
      l2.setPosition(v2.x, v2.y + 36);
    } });
    label(scene, c, w / 2, 36, 'Voyager 2 left first... Voyager 1 got to Jupiter first!', { size: 20, color: CSS.text });
  },

  jupiterSpin(scene, c, w, h) {
    stars(scene, c, w, h, 100);
    const j = img(scene, w / 2, h / 2 + 10, 'jupiterBig', 0.62);
    c.add(j);
    const moons = ['io', 'europa', 'ganymede', 'callisto'];
    moons.forEach((m, i) => {
      const mm = img(scene, 0, 0, m, 0.32 + i * 0.03);
      c.add(mm);
      orbit(scene, c, mm, w / 2, h / 2 + 10, 260 + i * 40, 50 + i * 12, 5000 + i * 2500, i * 1.4);
    });
    label(scene, c, w / 2, 36, 'Jupiter and its four big moons', { size: 22, color: CSS.cyan });
  },

  ioVolcano(scene, c, w, h) {
    sky(scene, c, w, h, 0x000000, 0x05060a);
    const io = img(scene, w / 2 + 60, h / 2 + 30, 'io', 3);
    c.add(io);
    const R = 120 * 3 * 0.45;
    const a = -2.4, px = io.x + Math.cos(a) * R, py = io.y + Math.sin(a) * R;
    loop(scene, c, 70, () => {
      const d = scene.add.image(px, py, 'softDot').setScale(0.12).setTint(0x8fb4ff).setAlpha(0.9);
      c.add(d);
      const ang = a + (Math.random() - 0.5) * 1.2;
      const v = 60 + Math.random() * 90;
      scene.tweens.add({ targets: d, x: px + Math.cos(ang) * v, y: py + Math.sin(ang) * v - 30, alpha: 0, scale: 0.3, duration: 1400, ease: 'Quad.easeOut', onComplete: () => d.destroy() });
    });
    label(scene, c, w / 2, 36, 'A volcano erupting on Io', { size: 22, color: CSS.orange });
  },

  saturnRings(scene, c, w, h) {
    stars(scene, c, w, h, 120);
    const s = img(scene, w / 2, h / 2 + 10, 'saturn', 1.7);
    c.add(s);
    scene.tweens.add({ targets: s, angle: 4, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const probe = img(scene, 0, 0, 'voyager', 0.2);
    c.add(probe);
    counter(scene, c, { from: 0, to: 1, duration: 7000, repeat: -1, onUpdate: (tw) => {
      const t = tw.getValue();
      probe.setPosition(40 + t * (w - 80), h - 40 - Math.sin(t * Math.PI) * 120);
    } });
    label(scene, c, w / 2, 36, 'Thousands of ringlets!', { size: 22, color: CSS.yellow });
  },

  titanHaze(scene, c, w, h) {
    stars(scene, c, w, h, 80);
    const t = img(scene, w / 2, h / 2, 'titan', 2.4);
    c.add(t);
    const haze = scene.add.image(w / 2, h / 2, 'softDot').setDisplaySize(440, 440).setTint(0xffb060).setAlpha(0.35);
    c.add(haze);
    scene.tweens.add({ targets: haze, alpha: 0.2, duration: 2000, yoyo: true, repeat: -1 });
    label(scene, c, w / 2, h - 36, 'Titan: a thick orange haze hides the ground', { size: 22, color: CSS.orange });
  },

  // Voyager 1 bends up out of the planets' plane at Titan; Voyager 2 carries on to Uranus and Neptune
  pathBend(scene, c, w, h) {
    stars(scene, c, w, h, 120);
    const plane = scene.add.graphics();
    plane.fillStyle(0x4fd1ff, 0.08);
    plane.fillEllipse(w / 2, h * 0.62, w * 0.95, 140);
    plane.lineStyle(2, COLORS.cyan, 0.3);
    plane.strokeEllipse(w / 2, h * 0.62, w * 0.95, 140);
    c.add(plane);
    const sat = img(scene, w * 0.3, h * 0.62, 'saturn', 0.5);
    const ura = img(scene, w * 0.62, h * 0.66, 'uranus', 0.4);
    const nep = img(scene, w * 0.86, h * 0.6, 'neptune', 0.4);
    c.add([sat, ura, nep]);
    const g = scene.add.graphics();
    g.lineStyle(3, COLORS.yellow, 0.8);
    g.lineBetween(w * 0.05, h * 0.7, sat.x, sat.y);
    g.lineBetween(sat.x, sat.y, w * 0.45, 40);
    g.lineStyle(3, COLORS.cyan, 0.7);
    g.lineBetween(sat.x, sat.y, ura.x, ura.y);
    g.lineBetween(ura.x, ura.y, nep.x, nep.y);
    c.add(g);
    label(scene, c, w * 0.48, 60, 'Voyager 1: up and out', { size: 20, color: CSS.yellow });
    label(scene, c, w * 0.74, h * 0.82, 'Voyager 2: Uranus (1986), Neptune (1989)', { size: 18, color: CSS.cyan });
    const v1 = img(scene, sat.x, sat.y, 'voyager', 0.18);
    c.add(v1);
    scene.tweens.add({ targets: v1, x: w * 0.45, y: 40, duration: 4000, repeat: -1, repeatDelay: 600 });
  },

  // a single pale blue pixel in a sunbeam
  paleDot(scene, c, w, h) {
    sky(scene, c, w, h, 0x000000, 0x020204);
    const g = scene.add.graphics();
    [[w * 0.3, 0.05], [w * 0.55, 0.08], [w * 0.7, 0.06]].forEach(([x, a]) => {
      g.fillStyle(0xffe9c0, a);
      g.fillRect(x - 50, 0, 100, h);
    });
    c.add(g);
    const dot = scene.add.circle(w * 0.58, h * 0.55, 2.4, 0x9fd8ff);
    c.add(dot);
    const ring = scene.add.circle(w * 0.58, h * 0.55, 30).setStrokeStyle(2, 0xffffff, 0.6);
    c.add(ring);
    scene.tweens.add({ targets: ring, scale: 0.6, alpha: 0.2, duration: 1500, yoyo: true, repeat: -1 });
    label(scene, c, w * 0.58 + 120, h * 0.55, 'Earth', { size: 22, color: CSS.cyan });
    label(scene, c, w / 2, h - 36, 'About 6 billion km (3.7 billion miles) away', { size: 20, color: CSS.dim });
  },

  // the Sun's bubble, with the two Voyagers poking out of it
  heliosphere(scene, c, w, h) {
    stars(scene, c, w, h, 150);
    const g = scene.add.graphics();
    g.fillStyle(0x3b6fb6, 0.25);
    g.fillEllipse(w * 0.62, h / 2, w * 0.95, h * 0.78);
    g.lineStyle(3, 0x9fd8ff, 0.6);
    g.strokeEllipse(w * 0.62, h / 2, w * 0.95, h * 0.78);
    c.add(g);
    c.add(img(scene, w * 0.62, h / 2, 'sun', 0.35));
    const v1 = img(scene, w * 0.14, h * 0.3, 'voyager', 0.22);
    const v2 = img(scene, w * 0.16, h * 0.72, 'voyager', 0.22);
    c.add([v1, v2]);
    scene.tweens.add({ targets: [v1, v2], x: '-=40', duration: 5000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    label(scene, c, w * 0.62, 40, "The heliosphere: the Sun's bubble", { size: 22, color: CSS.cyan });
    label(scene, c, w * 0.15, h * 0.3 - 40, 'Voyager 1', { size: 16, color: CSS.yellow });
    label(scene, c, w * 0.17, h * 0.72 + 40, 'Voyager 2', { size: 16, color: CSS.yellow });
    loop(scene, c, 300, () => {
      const p = scene.add.circle(w * 0.62, h / 2, 2, 0xffe9a0, 0.8);
      c.add(p);
      const a = Math.random() * Math.PI * 2;
      scene.tweens.add({ targets: p, x: p.x + Math.cos(a) * w * 0.4, y: p.y + Math.sin(a) * h * 0.34, alpha: 0, duration: 2600, onComplete: () => p.destroy() });
    });
  },

  // a radio message crawling all the way from Voyager to Earth
  lightDay(scene, c, w, h) {
    stars(scene, c, w, h, 140, 9);
    c.add(img(scene, 90, h / 2, 'earthSmall', 0.8));
    c.add(img(scene, w - 110, h / 2 - 20, 'voyager', 0.45));
    const g = scene.add.graphics();
    g.lineStyle(2, COLORS.cyan, 0.35);
    for (let x = 140; x < w - 170; x += 22) g.lineBetween(x, h / 2, x + 10, h / 2);
    c.add(g);
    const pulse = scene.add.circle(w - 170, h / 2, 6, COLORS.yellow);
    c.add(pulse);
    const clock = label(scene, c, w / 2, h / 2 + 70, '0 h', { size: 30, color: CSS.yellow });
    counter(scene, c, { from: 0, to: 1, duration: 8000, repeat: -1, onUpdate: (tw) => {
      const t = tw.getValue();
      pulse.x = w - 170 - t * (w - 310);
      clock.setText(`${Math.round(t * 23)} h`);
    } });
    later(scene, c, 300, () => sfx(c, 'radio'));
    label(scene, c, w / 2, 40, 'A radio message from Voyager 1 takes about a day to arrive', { size: 20, color: CSS.cyan, wrap: w - 60 });
  }
};
