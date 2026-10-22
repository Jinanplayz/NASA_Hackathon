// Animated pictures for Chapter 6 (Mars rovers) cutscenes.
import Phaser from 'phaser';
import { COLORS, CSS, seeded } from '../../core/constants.js';
import { img } from '../../art/core.js';
import { stars, sky, label, later, sfx, loop, counter } from './visualKit.js';

// a strip of Martian landscape along the bottom of the picture, scrolling if speed is set
function marsGround(scene, c, w, h, o = {}) {
  sky(scene, c, w, h, o.top ?? 0xb9845c, o.bottom ?? 0xe6b88c);
  const gy = o.y ?? h - 110;
  const far = scene.add.tileSprite(w / 2, gy - 70, w, 220, 'marsHillsFar');
  const near = scene.add.tileSprite(w / 2, gy - 50, w, 200, 'marsHillsNear');
  const ground = scene.add.tileSprite(w / 2, gy + (h - gy) / 2, w, h - gy, 'marsGround');
  c.add([far, near, ground]);
  if (o.speed) {
    counter(scene, c, { from: 0, to: 100000, duration: (100000 / o.speed) * 1000, onUpdate: (tw) => {
      const x = tw.getValue();
      far.tilePositionX = x * 0.15;
      near.tilePositionX = x * 0.35;
      ground.tilePositionX = x;
    } });
  }
  return gy;
}

function moonGround(scene, c, w, h) {
  sky(scene, c, w, h, 0x000000, 0x05060a);
  stars(scene, c, w, h * 0.6, 120, 14);
  const g = scene.add.graphics();
  g.fillStyle(0x7d7a74, 1);
  g.fillRect(0, h - 120, w, 120);
  g.fillStyle(0x6a6762, 1);
  g.beginPath();
  g.moveTo(0, h - 120);
  for (let x = 0; x <= w; x += 30) g.lineTo(x, h - 150 - Math.sin(x / 120) * 26 - Math.sin(x / 41) * 6);
  g.lineTo(w, h - 120);
  g.closePath();
  g.fillPath();
  c.add(g);
  return h - 120;
}

export const VISUALS_CH6 = {
  // Mars turning slowly, with a few facts popping up
  marsSpin(scene, c, w, h) {
    stars(scene, c, w, h, 150, 61);
    // Earth and Mars at the same scale: Mars is about half as wide
    const e = img(scene, w * 0.2, h / 2 + 20, 'earth', 1.05);
    const m = img(scene, w * 0.5, h / 2 + 20, 'mars', 0.66);
    c.add([e, m]);
    scene.tweens.add({ targets: m, angle: 360, duration: 90000, repeat: -1 });
    label(scene, c, e.x, h - 40, 'Earth', { size: 20, color: CSS.cyan });
    label(scene, c, m.x, h - 40, 'Mars', { size: 20, color: CSS.orange });
    label(scene, c, w / 2, 36, 'Mars is about half as wide as Earth', { size: 22, color: CSS.yellow });
    const facts = ['A day: 24 h 37 min', 'A year: 687 Earth days', 'Gravity: about 1/3 of Earth\'s'];
    facts.forEach((f, i) => later(scene, c, 800 + i * 1400, () => {
      const t = label(scene, c, w * 0.8, h * 0.36 + i * 54, f, { size: 19 });
      t.setAlpha(0);
      scene.tweens.add({ targets: t, alpha: 1, duration: 400 });
      sfx(c, 'pickup');
    }));
  },

  // a radio message crawling from Earth to Mars
  marsDelay(scene, c, w, h) {
    stars(scene, c, w, h, 120, 62);
    const E = { x: 110, y: h / 2 }, M = { x: w - 120, y: h / 2 };
    c.add(img(scene, E.x, E.y, 'earthSmall', 0.9));
    c.add(img(scene, M.x, M.y, 'mars', 0.42));
    const g = scene.add.graphics();
    g.lineStyle(2, COLORS.cyan, 0.3);
    g.lineBetween(E.x + 60, E.y, M.x - 70, M.y);
    c.add(g);
    const dot = scene.add.circle(E.x + 60, E.y, 8, COLORS.yellow);
    c.add(dot);
    const t = label(scene, c, w / 2, h / 2 + 60, '', { size: 26, color: CSS.yellow });
    counter(scene, c, { from: 0, to: 1, duration: 6000, repeat: -1, repeatDelay: 600, onUpdate: (tw) => {
      const k = tw.getValue();
      dot.setPosition(E.x + 60 + k * (M.x - E.x - 130), E.y);
      t.setText(`${Math.round(k * 20)} minutes...`);
    } });
    label(scene, c, w / 2, 40, 'A radio message to Mars takes minutes, not seconds', { size: 21, color: CSS.cyan });
  },

  lunokhodDrive(scene, c, w, h) {
    const gy = moonGround(scene, c, w, h);
    c.add(img(scene, w * 0.82, h * 0.2, 'earthSmall', 0.6));
    const r = img(scene, -100, gy + 4, 'lunokhod', 1).setOrigin(0.5, 0.9);
    c.add(r);
    const tracks = scene.add.graphics();
    c.addAt(tracks, c.getIndex(r));
    counter(scene, c, { from: -100, to: w + 120, duration: 14000, repeat: -1, onUpdate: (tw) => {
      r.x = tw.getValue();
      tracks.clear();
      tracks.lineStyle(3, 0x4a4844, 0.6);
      tracks.lineBetween(-100, gy + 2, r.x - 70, gy + 2);
      tracks.lineBetween(-100, gy + 10, r.x - 70, gy + 10);
    } });
    label(scene, c, w / 2, 40, 'Lunokhod 1: driven from Earth by remote control (1970)', { size: 21, color: CSS.cyan });
  },

  lrvDrive(scene, c, w, h) {
    const gy = moonGround(scene, c, w, h);
    c.add(img(scene, w * 0.2, h * 0.2, 'earthSmall', 0.6));
    const r = img(scene, w / 2, gy + 4, 'lrv', 1.3).setOrigin(0.5, 0.92);
    c.add(r);
    scene.tweens.add({ targets: r, y: gy - 2, duration: 180, yoyo: true, repeat: -1 });
    loop(scene, c, 90, () => {
      const d = scene.add.image(r.x - 140, gy - 4, 'softDot').setScale(0.1).setTint(0xb9b4ac).setAlpha(0.7);
      c.addAt(d, c.getIndex(r));
      scene.tweens.add({ targets: d, x: d.x - 80 - Math.random() * 80, y: d.y - 40 - Math.random() * 50, alpha: 0, scale: 0.3, duration: 1000, onComplete: () => d.destroy() });
    });
    label(scene, c, w / 2, 40, 'The Lunar Roving Vehicle (Apollo 15, 1971)', { size: 22, color: CSS.cyan });
  },

  // every rover in this chapter, lined up
  roverFamily(scene, c, w, h) {
    const gy = marsGround(scene, c, w, h, { y: h - 120 });
    const rovers = [['sojourner', 0.8, 'Sojourner', 0.09], ['merRover', 0.72, 'Spirit & Opportunity', 0.27], ['curiosity', 0.82, 'Curiosity', 0.52], ['perseverance', 0.82, 'Perseverance', 0.8]];
    rovers.forEach(([k, s, n, fx], i) => {
      const x = w * fx;
      const r = img(scene, x, gy + 6, k, s).setOrigin(0.5, 0.92);
      c.add(r);
      const t = label(scene, c, x, gy + 40, n, { size: 16 });
      r.setAlpha(0);
      t.setAlpha(0);
      later(scene, c, 400 + i * 700, () => {
        scene.tweens.add({ targets: [r, t], alpha: 1, duration: 400 });
        sfx(c, 'pickup');
      });
    });
    const heli = img(scene, w * 0.66, gy - 250, 'ingenuity', 0.7);
    c.add(heli);
    scene.tweens.add({ targets: heli, y: heli.y - 16, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    label(scene, c, heli.x, heli.y - 60, 'Ingenuity', { size: 16 });
  },

  mariner4Flyby(scene, c, w, h) {
    stars(scene, c, w, h, 140, 63);
    c.add(img(scene, w * 0.7, h * 0.62, 'mars', 1.1));
    const p = img(scene, -80, h * 0.2, 'mariner4', 0.6);
    c.add(p);
    counter(scene, c, { from: 0, to: 1, duration: 9000, repeat: -1, onUpdate: (tw) => {
      const k = tw.getValue();
      p.setPosition(-80 + k * (w + 160), h * 0.18 + Math.sin(k * Math.PI) * 60);
      p.angle = k * 40;
    } });
    loop(scene, c, 1800, () => {
      // click: a picture is taken
      const f = scene.add.circle(p.x, p.y + 30, 6, 0xffffff, 0.9);
      c.add(f);
      scene.tweens.add({ targets: f, scale: 4, alpha: 0, duration: 500, onComplete: () => f.destroy() });
    });
    label(scene, c, w / 2, 40, 'Mariner 4 flies past Mars (1965)', { size: 22, color: CSS.cyan });
  },

  // numbers streaming down from space, turning into dots of a picture
  numberStream(scene, c, w, h) {
    sky(scene, c, w, h, 0x05070f, 0x0b1230);
    const rnd = seeded(64);
    const cols = 16, rows = 8, cell = 34;
    const gx = w / 2 - (cols * cell) / 2, gy = 120;
    const shades = [0x3a1c10, 0x6e3218, 0xa8522a, 0xd27a3e, 0xeba560, 0xf5d67a];
    let i = 0;
    loop(scene, c, 120, () => {
      if (i >= cols * rows) return;
      const col = i % cols, row = Math.floor(i / cols);
      i++;
      const u = col / cols, v = row / rows;
      const b = Math.max(0, Math.min(5, Math.round(5 - Math.abs(v - 0.45 + 0.1 * u) * 9 + (rnd() - 0.5))));
      const n = label(scene, c, gx + col * cell + cell / 2, 70, String(b + 1), { size: 16, color: CSS.green });
      scene.tweens.add({ targets: n, y: gy + row * cell + cell / 2, duration: 500, ease: 'Quad.easeIn', onComplete: () => {
        const sq = scene.add.rectangle(n.x, n.y, cell - 2, cell - 2, shades[b]);
        c.add(sq);
        n.destroy();
      } });
    });
    label(scene, c, w / 2, h - 40, 'One number for each dot: dark (1) to bright (6)', { size: 20, color: CSS.cyan });
  },

  craterMars(scene, c, w, h) {
    sky(scene, c, w, h, 0x000000, 0x0b0f1f);
    const g = scene.add.graphics();
    g.fillStyle(0xb9734a, 1);
    g.fillRect(0, 0, w, h);
    const rnd = seeded(66);
    for (let i = 0; i < 26; i++) {
      const x = rnd() * w, y = rnd() * h, r = 10 + rnd() * rnd() * 90;
      g.fillStyle(0x6e3a20, 0.6);
      g.fillCircle(x, y, r);
      g.lineStyle(Math.max(2, r * 0.15), 0xf0b888, 0.5);
      g.beginPath();
      g.arc(x, y, r, Math.PI * 0.9, Math.PI * 1.9);
      g.strokePath();
    }
    c.add(g);
    label(scene, c, w / 2, h - 40, 'Craters! Mars looked a lot like the Moon', { size: 22, color: CSS.yellow });
  },

  pathfinderBounce(scene, c, w, h) {
    const gy = marsGround(scene, c, w, h);
    const ball = img(scene, 0, 0, 'airbagBall', 0.8);
    c.add(ball);
    let t = 0;
    counter(scene, c, { from: 0, to: 1, duration: 7000, repeat: -1, repeatDelay: 600, onUpdate: (tw) => {
      const k = tw.getValue();
      t = k * 7;
      // bounces that get smaller and smaller
      const n = Math.floor(t), f = t - n;
      const height = 230 * Math.pow(0.6, n);
      ball.setPosition(60 + k * (w - 120), gy - 52 - Math.sin(f * Math.PI) * height);
      ball.rotation = k * 12;
    } });
    label(scene, c, w / 2, 40, 'Boing! Landing inside a ball of airbags', { size: 22, color: CSS.yellow });
  },

  sojournerRoll(scene, c, w, h) {
    const gy = marsGround(scene, c, w, h);
    c.add(img(scene, w * 0.3, gy + 10, 'pathfinder', 1.6).setOrigin(0.5, 0.85));
    const r = img(scene, w * 0.48, gy + 4, 'sojourner', 0.9).setOrigin(0.5, 0.92);
    c.add(r);
    scene.tweens.add({ targets: r, x: w * 0.78, duration: 9000, repeat: -1, repeatDelay: 1000, ease: 'Linear' });
    const rock = img(scene, w * 0.86, gy + 8, 'marsRockLayered', 0.9).setOrigin(0.5, 0.9);
    c.add(rock);
    label(scene, c, rock.x, gy - 70, 'Yogi', { size: 18 });
    label(scene, c, w / 2, 40, 'Sojourner: slow and steady, 1 cm per second', { size: 22, color: CSS.cyan });
  },

  // two rovers arriving on opposite sides of Mars
  twinLanding(scene, c, w, h) {
    stars(scene, c, w, h, 140, 67);
    const m = img(scene, w / 2, h / 2 + 20, 'mars', 1.25);
    c.add(m);
    const spots = [[-110, 30, 'Spirit · Jan 4, 2004'], [120, -20, 'Opportunity · Jan 25, 2004']];
    spots.forEach(([dx, dy, n], i) => {
      later(scene, c, 600 + i * 1600, () => {
        const ball = img(scene, w / 2 + dx * 2.4, -40, 'airbagBall', 0.3);
        c.add(ball);
        scene.tweens.add({ targets: ball, x: w / 2 + dx, y: h / 2 + 20 + dy, duration: 900, ease: 'Quad.easeIn', onComplete: () => {
          ball.destroy();
          const ring = scene.add.circle(w / 2 + dx, h / 2 + 20 + dy, 10, COLORS.yellow);
          c.add(ring);
          scene.tweens.add({ targets: ring, scale: 1.6, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
          label(scene, c, w / 2 + dx, h / 2 + 20 + dy + 34, n, { size: 17, color: CSS.yellow });
          sfx(c, 'puff');
        } });
      });
    });
    label(scene, c, w / 2, 40, 'Twin rovers, opposite sides of Mars', { size: 22, color: CSS.cyan });
  },

  // Spirit or Opportunity driving across the plain (or, with slide.stuck, spinning its wheels in
  // soft sand); slide.caption changes the caption, slide.devil adds a passing dust devil
  merDrive(scene, c, w, h, slide) {
    const stuck = !!slide.stuck;
    const gy = marsGround(scene, c, w, h, { speed: stuck ? 0 : 60 });
    const r = img(scene, w * 0.45, gy + (stuck ? 14 : 6), 'merRover', 1.2).setOrigin(0.5, 0.92);
    c.add(r);
    scene.tweens.add({ targets: r, y: r.y - 3, duration: stuck ? 90 : 400, yoyo: true, repeat: -1 });
    if (stuck) {
      // sand flying from the spinning wheels, but it doesn't move
      loop(scene, c, 120, () => {
        const x = r.x + Phaser.Math.Between(-90, 90);
        const d = scene.add.image(x, gy + 6, 'softDot').setScale(0.08).setTint(0xd9a070).setAlpha(0.8);
        c.add(d);
        scene.tweens.add({ targets: d, x: x - 40 + Math.random() * 20, y: gy - 30 - Math.random() * 40, alpha: 0, scale: 0.2, duration: 800, onComplete: () => d.destroy() });
      });
    }
    if (slide.devil) {
      const dd = scene.add.container(w + 100, gy);
      for (let k = 0; k < 16; k++) {
        const t = k / 15;
        const d = scene.add.image(0, -t * 240, 'softDot').setScale(0.25 + t * 0.6, 0.18 + t * 0.2).setTint(k % 2 ? 0xb07040 : 0xd9a070).setAlpha(0.5);
        d.k = t;
        dd.add(d);
      }
      c.add(dd);
      counter(scene, c, { from: w + 100, to: -150, duration: 9000, repeat: -1, repeatDelay: 1500, onUpdate: (tw) => {
        dd.x = tw.getValue();
        dd.list.forEach((p, k) => (p.x = Math.sin(Date.now() / 180 + k * 0.7) * (8 + p.k * 30)));
      } });
    }
    label(scene, c, w / 2, 40, slide.caption || 'Spirit and Opportunity: robot geologists', { size: 22, color: CSS.yellow });
  },

  // Opportunity's odometer going past a marathon
  oppyMarathon(scene, c, w, h) {
    const gy = marsGround(scene, c, w, h, { speed: 90 });
    const r = img(scene, w * 0.4, gy + 6, 'merRover', 1.1).setOrigin(0.5, 0.92);
    c.add(r);
    const km = label(scene, c, w * 0.75, 110, '', { size: 34, color: CSS.yellow });
    const note = label(scene, c, w * 0.75, 160, '', { size: 20, color: CSS.green });
    counter(scene, c, { from: 0, to: 45.16, duration: 9000, onUpdate: (tw) => {
      const v = tw.getValue();
      km.setText(`${v.toFixed(1)} km`);
      if (v > 42.2) note.setText('Longer than a marathon!');
    } });
    label(scene, c, w / 2, 40, "Opportunity's long drive (2004–2018)", { size: 22, color: CSS.cyan });
  },

  // the 2018 dust storm: the sky darkens and the Sun fades away
  dustStorm(scene, c, w, h) {
    const gy = marsGround(scene, c, w, h);
    const sun = img(scene, w * 0.72, h * 0.25, 'softDot', 1).setTint(0xfff4e0);
    c.add(sun);
    const r = img(scene, w * 0.35, gy + 6, 'merRover', 1.1).setOrigin(0.5, 0.92);
    c.add(r);
    const dust = scene.add.rectangle(w / 2, h / 2, w, h, 0x5a2a14, 0);
    c.add(dust);
    const bat = label(scene, c, w * 0.35, gy - 190, '', { size: 22, color: CSS.orange });
    counter(scene, c, { from: 0, to: 1, duration: 8000, onUpdate: (tw) => {
      const k = tw.getValue();
      dust.setFillStyle(0x3a1a0c, k * 0.82);
      sun.setAlpha(1 - k * 0.9).setScale((1 - k * 0.5) / 2);
      bat.setText(`Battery: ${Math.round((1 - k) * 100)}%`);
    } });
    label(scene, c, w / 2, 40, 'June 2018: a dust storm covers the whole planet', { size: 22, color: CSS.orange });
  },

  // a quiet night: the rover asleep under the stars
  seeingYou(scene, c, w, h) {
    sky(scene, c, w, h, 0x02040d, 0x1a1030);
    stars(scene, c, w, h * 0.7, 180, 68);
    const g = scene.add.graphics();
    g.fillStyle(0x2a140a, 1);
    g.fillRect(0, h - 110, w, 110);
    c.add(g);
    const r = img(scene, w / 2, h - 104, 'merRover', 1.1).setOrigin(0.5, 0.92).setTint(0x7a6a8a);
    c.add(r);
    c.add(img(scene, w * 0.8, h * 0.2, 'earthSmall', 0.35).setAlpha(0.9));
    loop(scene, c, 1400, () => {
      const n = label(scene, c, w / 2 + Phaser.Math.Between(-200, 200), h * 0.5, Phaser.Math.RND.pick(['♪', '♫']), { size: 28, color: '#c9b8ff' });
      scene.tweens.add({ targets: n, y: n.y - 90, alpha: 0, duration: 2600, onComplete: () => n.destroy() });
    });
  },

  // Gale Crater filling with a lake, then drying out and leaving layers
  galeLake(scene, c, w, h) {
    sky(scene, c, w, h, 0xb9845c, 0xe6b88c);
    const g = scene.add.graphics();
    g.fillStyle(0x9a5634, 1);
    g.beginPath();
    g.moveTo(0, h * 0.35);
    g.lineTo(w * 0.12, h * 0.38);
    g.lineTo(w * 0.2, h * 0.86);
    g.lineTo(w * 0.8, h * 0.86);
    g.lineTo(w * 0.88, h * 0.38);
    g.lineTo(w, h * 0.35);
    g.lineTo(w, h);
    g.lineTo(0, h);
    g.closePath();
    g.fillPath();
    c.add(g);
    const lake = scene.add.rectangle(w / 2, h * 0.86, w * 0.64, 10, 0x3f8fd8, 0.8).setOrigin(0.5, 1);
    c.add(lake);
    const layers = scene.add.graphics();
    c.add(layers);
    const caption = label(scene, c, w / 2, 40, 'Long ago: a lake in Gale Crater', { size: 22, color: CSS.cyan });
    counter(scene, c, { from: 0, to: 1, duration: 10000, repeat: -1, repeatDelay: 1000, onUpdate: (tw) => {
      const k = tw.getValue();
      const fill = k < 0.5 ? k * 2 : 1 - (k - 0.5) * 2;
      lake.setScale(1, 1 + fill * 22);
      // mud settles in layers while the lake is there
      layers.clear();
      const n = Math.floor(Math.min(k, 0.5) * 2 * 8);
      for (let i = 0; i < n; i++) {
        layers.fillStyle(i % 2 ? 0xc08060 : 0xa86a48, 1);
        layers.fillRect(w * 0.2 + i * 6, h * 0.86 - (i + 1) * 9, w * 0.6 - i * 12, 9);
      }
      caption.setText(k < 0.5 ? 'Long ago: a lake in Gale Crater' : 'The water dried up, leaving layers of mud rock');
    } });
  },

  curiosityDrive(scene, c, w, h) {
    const gy = marsGround(scene, c, w, h, { speed: 40 });
    const mt = scene.add.graphics();
    mt.fillStyle(0x9a5634, 1);
    mt.beginPath();
    mt.moveTo(w * 0.4, gy - 40);
    mt.lineTo(w * 0.62, gy - 230);
    mt.lineTo(w * 0.7, gy - 210);
    mt.lineTo(w * 0.8, gy - 260);
    mt.lineTo(w + 60, gy - 40);
    mt.closePath();
    mt.fillPath();
    c.addAt(mt, 2);
    label(scene, c, w * 0.78, gy - 290, 'Mount Sharp', { size: 18 });
    const r = img(scene, w * 0.3, gy + 6, 'curiosity', 1.1).setOrigin(0.5, 0.92);
    c.add(r);
    scene.tweens.add({ targets: r, y: gy + 3, duration: 500, yoyo: true, repeat: -1 });
    // the laser zaps a rock now and then
    loop(scene, c, 2600, () => {
      const z = scene.add.line(0, 0, r.x + 50, r.y - 175, r.x + 200, gy - 8, 0xff3b3b).setOrigin(0).setLineWidth(2);
      c.add(z);
      const p = scene.add.circle(r.x + 200, gy - 8, 6, 0xffe08a);
      c.add(p);
      sfx(c, 'beep');
      scene.tweens.add({ targets: [z, p], alpha: 0, duration: 400, onComplete: () => { z.destroy(); p.destroy(); } });
    });
    label(scene, c, w / 2, 40, 'Curiosity: a science lab on wheels, with a laser!', { size: 22, color: CSS.cyan });
  },

  birthdayHum(scene, c, w, h) {
    const gy = marsGround(scene, c, w, h);
    const r = img(scene, w / 2, gy + 6, 'curiosity', 1.3).setOrigin(0.5, 0.92);
    c.add(r);
    loop(scene, c, 600, () => {
      const n = label(scene, c, w / 2 + Phaser.Math.Between(-120, 120), gy - 180, Phaser.Math.RND.pick(['♪', '♫']), { size: 30, color: CSS.yellow });
      scene.tweens.add({ targets: n, y: n.y - 120, alpha: 0, duration: 1800, onComplete: () => n.destroy() });
    });
    label(scene, c, w / 2, 40, 'Happy birthday, Curiosity! (August 5, 2013)', { size: 22, color: CSS.yellow });
  },

  // from Earth to Mars, the long way round
  cruiseToMars(scene, c, w, h) {
    stars(scene, c, w, h, 150, 69);
    const S = { x: w / 2, y: h / 2 + 20 };
    c.add(img(scene, S.x, S.y, 'sun', 0.5));
    const g = scene.add.graphics();
    g.lineStyle(1.5, 0xffffff, 0.2);
    g.strokeEllipse(S.x, S.y, 300, 230);
    g.strokeEllipse(S.x, S.y, 560, 420);
    c.add(g);
    const earth = img(scene, 0, 0, 'earthSmall', 0.35);
    const mars = img(scene, 0, 0, 'mars', 0.12);
    const ship = scene.add.circle(0, 0, 5, COLORS.yellow);
    c.add([earth, mars, ship]);
    counter(scene, c, { from: 0, to: 1, duration: 7000, repeat: -1, repeatDelay: 800, onUpdate: (tw) => {
      const k = tw.getValue();
      const ea = Math.PI * 0.9 + k * Math.PI * 1.2, ma = Math.PI * 1.55 + k * Math.PI * 0.55;
      earth.setPosition(S.x + Math.cos(ea) * 150, S.y + Math.sin(ea) * 115);
      mars.setPosition(S.x + Math.cos(ma) * 280, S.y + Math.sin(ma) * 210);
      // the spacecraft's path curves out from Earth's orbit to Mars's
      const sa = Math.PI * 0.9 + k * Math.PI;
      const rr = 150 + (280 - 150) * k, ry = 115 + (210 - 115) * k;
      ship.setPosition(S.x + Math.cos(sa) * rr, S.y + Math.sin(sa) * ry);
    } });
    label(scene, c, w / 2, 40, 'About 7 months from Earth to Mars', { size: 22, color: CSS.cyan });
  },

  // a river fanning out into a lake: the delta Perseverance came to study
  jezeroDelta(scene, c, w, h) {
    const g = scene.add.graphics();
    g.fillStyle(0xb8764c, 1);
    g.fillRect(0, 0, w, h);
    c.add(g);
    const water = scene.add.graphics();
    c.add(water);
    const caption = label(scene, c, w / 2, h - 40, 'Billions of years ago: a river flowed into a lake', { size: 21, color: CSS.cyan });
    counter(scene, c, { from: 0, to: 1, duration: 9000, repeat: -1, repeatDelay: 800, onUpdate: (tw) => {
      const k = tw.getValue();
      const wet = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
      water.clear();
      water.fillStyle(0x3f8fd8, 0.75 * wet);
      water.fillEllipse(w * 0.62, h * 0.55, w * 0.7, h * 0.7);
      water.lineStyle(10, 0x3f8fd8, 0.9 * wet);
      water.lineBetween(0, h * 0.2, w * 0.3, h * 0.42);
      // the fan of mud the river left behind
      water.fillStyle(0x8a5034, Math.min(1, k * 1.8) * 0.8);
      water.fillTriangle(w * 0.28, h * 0.4, w * 0.48, h * 0.25, w * 0.5, h * 0.7);
      caption.setText(k < 0.6 ? 'Billions of years ago: a river flowed into a lake' : 'Today: dry, but the river\'s fan of mud is still there');
    } });
    label(scene, c, w / 2, 40, 'Jezero Crater', { size: 22, color: CSS.yellow });
  },

  skyCraneVis(scene, c, w, h) {
    const gy = marsGround(scene, c, w, h);
    const stage = img(scene, w / 2, 60, 'descentStage', 1);
    const rover = img(scene, w / 2, 0, 'perseverance', 0.9).setOrigin(0.5, 0.1);
    const cables = scene.add.graphics();
    c.add([cables, rover, stage]);
    counter(scene, c, { from: 0, to: 1, duration: 7000, repeat: -1, repeatDelay: 1200, onUpdate: (tw) => {
      const k = tw.getValue();
      const sy = 60 + Math.min(k, 0.7) * 150;
      const rope = 20 + Math.min(1, k * 2) * 120;
      const ry = Math.min(sy + 30 + rope, gy - 165);
      stage.setPosition(w / 2 + (k > 0.75 ? (k - 0.75) * 2000 : 0), sy - (k > 0.75 ? (k - 0.75) * 600 : 0));
      rover.setPosition(w / 2, ry);
      cables.clear();
      if (k < 0.72) {
        cables.lineStyle(2, 0xffffff, 0.9);
        cables.lineBetween(w / 2 - 20, sy + 28, w / 2 - 50, ry + 4);
        cables.lineBetween(w / 2 + 20, sy + 28, w / 2 + 50, ry + 4);
      }
    } });
    label(scene, c, w / 2, h - 30, 'The sky crane lowers the rover, cuts the cables and flies away', { size: 20, color: CSS.yellow });
  },

  // sound waves coming from the rover's microphone
  marsSounds(scene, c, w, h) {
    const gy = marsGround(scene, c, w, h);
    const r = img(scene, w * 0.35, gy + 6, 'perseverance', 1.1).setOrigin(0.5, 0.92);
    c.add(r);
    loop(scene, c, 500, () => {
      const ring = scene.add.circle(r.x + 70, gy - 175, 10).setStrokeStyle(3, COLORS.cyan, 0.9);
      c.add(ring);
      scene.tweens.add({ targets: ring, scale: 8, alpha: 0, duration: 1800, onComplete: () => ring.destroy() });
    });
    label(scene, c, w / 2, 40, 'Perseverance has microphones: the first sounds from Mars!', { size: 21, color: CSS.cyan });
  },

  heliFly(scene, c, w, h) {
    const gy = marsGround(scene, c, w, h);
    c.add(img(scene, w * 0.8, gy + 6, 'perseverance', 0.8).setOrigin(0.5, 0.92));
    const heli = scene.add.container(w * 0.35, gy);
    const body = img(scene, 0, -40, 'ingenuity', 1);
    const blades = scene.add.graphics();
    heli.add([body, blades]);
    c.add(heli);
    counter(scene, c, { from: 0, to: 1, duration: 8000, repeat: -1, repeatDelay: 500, onUpdate: (tw) => {
      const k = tw.getValue();
      const up = k < 0.2 ? k / 0.2 : k > 0.8 ? (1 - k) / 0.2 : 1;
      heli.y = gy - up * 150;
      blades.clear();
      blades.lineStyle(3, 0x2a2e38, 0.7);
      const half = Math.abs(Math.cos(Date.now() / 18)) * 60 + 6;
      blades.lineBetween(-half, -82, half, -82);
      blades.lineBetween(-half, -67, half, -67);
    } });
    label(scene, c, w / 2, 40, 'Ingenuity: the first flight on another planet (2021)', { size: 22, color: CSS.cyan });
  },

  sampleTubes(scene, c, w, h) {
    const gy = marsGround(scene, c, w, h);
    const rnd = seeded(70);
    for (let i = 0; i < 10; i++) {
      const tube = scene.add.rectangle(120 + i * 70, gy + 20 + rnd() * 30, 12, 60, 0xe9ecf2).setStrokeStyle(2, 0x9aa1ae).setAngle(80 + rnd() * 20);
      c.add(tube);
      tube.setAlpha(0);
      later(scene, c, 300 + i * 400, () => {
        scene.tweens.add({ targets: tube, alpha: 1, duration: 300 });
        sfx(c, 'tick');
      });
    }
    label(scene, c, w / 2, 40, 'Sealed tubes of Mars rock, waiting for a ride to Earth', { size: 21, color: CSS.yellow });
  },

  // people on Mars, one day
  marsFuture(scene, c, w, h) {
    const gy = marsGround(scene, c, w, h);
    // a base with a dome, a flag and an astronaut, with Perseverance nearby
    const dome = scene.add.graphics();
    dome.fillStyle(0xdfe7f5, 0.95);
    dome.slice(w * 0.72, gy + 4, 120, Math.PI, 0, false);
    dome.fillPath();
    dome.lineStyle(3, 0x9fb7d8, 1);
    dome.strokePath();
    dome.fillStyle(0x7f9cc4, 1);
    dome.fillRoundedRect(w * 0.72 - 22, gy - 56, 44, 60, { tl: 22, tr: 22, bl: 0, br: 0 });
    dome.fillStyle(0x4fd1ff, 0.6);
    [-70, 70].forEach((dx) => dome.fillCircle(w * 0.72 + dx, gy - 50, 12));
    c.add(dome);
    const a = img(scene, w * 0.4, gy + 4, 'moonwalker', 1.5).setOrigin(0.5, 1);
    c.add(a);
    c.add(scene.add.rectangle(w * 0.48, gy - 60, 3, 124, 0xf4f6fb));
    const flag = scene.add.rectangle(w * 0.48 + 2, gy - 112, 54, 32, 0x2a4dbb).setOrigin(0, 0.5);
    c.add(flag);
    scene.tweens.add({ targets: flag, scaleX: 0.9, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    c.add(img(scene, w * 0.12, gy + 6, 'perseverance', 0.6).setOrigin(0.5, 0.92));
    scene.tweens.add({ targets: a, x: a.x + 30, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    c.add(img(scene, w * 0.85, h * 0.18, 'earthSmall', 0.3));
    label(scene, c, w / 2, 40, 'One day, the first people on Mars?', { size: 22, color: CSS.yellow });
  }
};
