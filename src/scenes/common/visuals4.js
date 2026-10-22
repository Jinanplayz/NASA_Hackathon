// Animated pictures for Chapter 4 (Apollo 13) cutscenes.
import Phaser from 'phaser';
import { COLORS, CSS } from '../../core/constants.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { stars, sky, label, later, sfx, loop, counter } from './visualKit.js';

function heads(scene, c, w, h, people, y = 0.42) {
  people.forEach(([name, role, color], i) => {
    const x = w * ((i + 1) / (people.length + 1));
    const head = img(scene, x, h * y, 'guideBig', 0.55);
    c.add(head);
    scene.tweens.add({ targets: head, y: head.y - 8, duration: 1000 + i * 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    label(scene, c, x, h * 0.74, name, { size: 22, color: color || CSS.text });
    if (role) label(scene, c, x, h * 0.82, role, { size: 16, color: CSS.cyan });
  });
}

export const VISUALS_CH4 = {
  a13Crew(scene, c, w, h) {
    sky(scene, c, w, h, 0x0b1535, 0x1c2b66);
    heads(scene, c, w, h, [
      ['Jim Lovell', 'Commander'],
      ['Jack Swigert', 'Command Module Pilot'],
      ['Fred Haise', 'Lunar Module Pilot']
    ]);
  },

  // Ken Mattingly steps out (a thermometer for the measles scare) and Jack Swigert steps in.
  crewSwap(scene, c, w, h) {
    sky(scene, c, w, h, 0x0b1535, 0x1c2b66);
    const make = (name, x) => {
      const g = scene.add.container(x, h * 0.42);
      g.add(img(scene, 0, 0, 'guideBig', 0.5));
      g.add(txt(scene, 0, h * 0.3, name, { size: 20, weight: 700, origin: 0.5, stroke: '#070b1d', strokeThickness: 5, scale: false }));
      c.add(g);
      return g;
    };
    const lovell = make('Jim Lovell', w * 0.2);
    const ken = make('Ken Mattingly', w * 0.5);
    const haise = make('Fred Haise', w * 0.8);
    const jack = make('Jack Swigert', w + 160);
    const therm = scene.add.graphics();
    therm.fillStyle(0xffffff, 1);
    therm.fillRoundedRect(-6, -60, 12, 70, 6);
    therm.fillStyle(COLORS.red, 1);
    therm.fillCircle(0, 12, 11);
    therm.fillRect(-3, -40, 6, 50);
    therm.setPosition(w * 0.5 + 70, h * 0.32).setAlpha(0);
    c.add(therm);
    const note = label(scene, c, w / 2, 40, '3 days before launch...', { size: 24, color: CSS.yellow });
    later(scene, c, 1200, () => {
      scene.tweens.add({ targets: therm, alpha: 1, duration: 300 });
      note.setText('A measles scare!');
      sfx(c, 'alarm');
    });
    later(scene, c, 2600, () => {
      scene.tweens.add({ targets: [ken, therm], y: h + 200, alpha: 0.2, duration: 900, ease: 'Quad.easeIn' });
      scene.tweens.add({ targets: jack, x: w * 0.5, duration: 1000, delay: 500, ease: 'Back.easeOut' });
      note.setText('The backup steps in: Jack Swigert');
      sfx(c, 'whoosh');
    });
    [lovell, haise].forEach((p, i) => scene.tweens.add({ targets: p, y: p.y - 6, duration: 1100 + i * 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
  },

  // Inside the service module: two oxygen tanks with stirring fans.
  oxygenStir(scene, c, w, h) {
    stars(scene, c, w, h, 60);
    const g = scene.add.graphics();
    g.fillStyle(0x1b2236, 1);
    g.fillRoundedRect(w * 0.12, h * 0.16, w * 0.76, h * 0.62, 26);
    g.lineStyle(3, 0x9aa4bf, 1);
    g.strokeRoundedRect(w * 0.12, h * 0.16, w * 0.76, h * 0.62, 26);
    c.add(g);
    label(scene, c, w / 2, h * 0.11, 'Inside the service module', { size: 22, color: CSS.cyan });
    [w * 0.36, w * 0.64].forEach((x, i) => {
      const tank = scene.add.graphics();
      tank.fillStyle(0xdfe3ea, 1);
      tank.fillCircle(x, h * 0.47, 92);
      tank.fillStyle(0x9fd8ff, 0.5);
      tank.fillCircle(x, h * 0.47, 72);
      c.add(tank);
      const fan = scene.add.graphics();
      fan.fillStyle(0x3b4a6b, 1);
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        fan.fillTriangle(0, 0, Math.cos(a) * 40 - Math.sin(a) * 10, Math.sin(a) * 40 + Math.cos(a) * 10, Math.cos(a) * 40 + Math.sin(a) * 10, Math.sin(a) * 40 - Math.cos(a) * 10);
      }
      fan.setPosition(x, h * 0.47);
      c.add(fan);
      scene.tweens.add({ targets: fan, angle: 360, duration: 900 - i * 200, repeat: -1 });
      label(scene, c, x, h * 0.72, `Oxygen tank ${i + 1}`, { size: 18 });
    });
    label(scene, c, w / 2, h * 0.88, `Mission Control: "We'd like you to stir up the cryo tanks."`, { size: 18, color: CSS.yellow, wrap: w - 60 });
  },

  // The stack shudders, a flash, and a cloud of oxygen sprays out of the service module.
  oxygenBlast(scene, c, w, h) {
    stars(scene, c, w, h, 120);
    const ship = img(scene, w / 2, h / 2, 'csmLm', 1.7);
    c.add(ship);
    const gas = scene.add.particles(0, 0, 'smoke', {
      x: w / 2 - 110,
      y: h / 2 + 30,
      speedY: { min: 60, max: 220 },
      speedX: { min: -140, max: 60 },
      lifespan: 2200,
      scale: { start: 0.25, end: 1.6 },
      alpha: { start: 0.7, end: 0 },
      tint: [0xffffff, 0xdfeaff],
      frequency: 30,
      emitting: false
    });
    c.add(gas);
    const flash = scene.add.rectangle(w / 2, h / 2, w, h, 0xffffff, 0);
    c.add(flash);
    const bang = label(scene, c, w / 2, 60, '', { size: 56, color: CSS.orange, weight: 800 });
    later(scene, c, 1300, () => {
      flash.setAlpha(0.9);
      scene.tweens.add({ targets: flash, alpha: 0, duration: 500 });
      bang.setText('BANG!').setScale(0.4);
      scene.tweens.add({ targets: bang, scale: 1, duration: 300, ease: 'Back.easeOut' });
      gas.emitting = true;
      sfx(c, 'hit');
      sfx(c, 'alarm');
      scene.tweens.add({ targets: ship, x: w / 2 + 6, duration: 50, yoyo: true, repeat: 10 });
      scene.tweens.add({ targets: ship, angle: 8, duration: 4000, ease: 'Sine.easeOut' });
    });
    later(scene, c, 2300, () => label(scene, c, w / 2 - 110, h - 60, 'Oxygen tank 2', { size: 22, color: CSS.red }));
  },

  ventingGas(scene, c, w, h) {
    const g = scene.add.graphics();
    g.fillStyle(0x000000, 1);
    g.fillRect(0, 0, w, h);
    c.add(g);
    stars(scene, c, w, h, 80);
    // a cloud of tiny sparkling crystals streaming past the window
    loop(scene, c, 60, () => {
      const s = scene.add.image(Phaser.Math.Between(w * 0.1, w * 0.4), Phaser.Math.Between(h * 0.2, h * 0.8), 'softDot').setScale(0.05 + Math.random() * 0.12).setAlpha(0.9);
      c.add(s);
      scene.tweens.add({ targets: s, x: s.x + 500 + Math.random() * 300, y: s.y + (Math.random() - 0.5) * 140, alpha: 0, duration: 1800, onComplete: () => s.destroy() });
    });
    const frame = scene.add.graphics();
    frame.lineStyle(70, 0x1b2236, 1);
    frame.strokeRoundedRect(20, 20, w - 40, h - 40, 60);
    c.add(frame);
    label(scene, c, w / 2, h - 50, 'Gas venting into space...', { size: 26, color: CSS.yellow });
  },

  // Apollo 13 swings around behind the Moon; the radio goes quiet for a while.
  farSidePass(scene, c, w, h) {
    stars(scene, c, w, h, 100);
    const M = { x: w / 2, y: h / 2 + 20 };
    c.add(img(scene, M.x, M.y, 'moon', 0.95));
    const ship = img(scene, 0, 0, 'csmLm', 0.45);
    c.add(ship);
    const status = label(scene, c, w / 2, 40, 'Swinging around the Moon', { size: 24, color: CSS.cyan });
    counter(scene, c, {
      from: Math.PI * 0.9,
      to: Math.PI * 2.9,
      duration: 9000,
      repeat: -1,
      onUpdate: (tw) => {
        const a = tw.getValue();
        const x = M.x + Math.cos(a) * 200, y = M.y + Math.sin(a) * 70;
        ship.setPosition(x, y).setRotation(a + Math.PI / 2);
        // behind the Moon (the upper half of the loop) it is hidden and silent
        const behind = Math.sin(a) < -0.2 && Math.abs(x - M.x) < 150;
        ship.setVisible(!behind);
        status.setText(behind ? 'Behind the Moon: no radio signal...' : 'Swinging around the Moon').setColor(behind ? CSS.dim : CSS.cyan);
      }
    });
    label(scene, c, w / 2, h - 30, 'About 254 km (158 miles) above the far side', { size: 18, color: CSS.yellow });
  },

  distanceRecord(scene, c, w, h) {
    stars(scene, c, w, h, 120);
    c.add(img(scene, 90, h / 2, 'earthSmall', 0.9));
    c.add(img(scene, w - 220, h / 2, 'moonSmall', 0.7));
    const ship = img(scene, 160, h / 2 - 30, 'csmLm', 0.35);
    c.add(ship);
    const line = scene.add.graphics();
    c.add(line);
    const km = label(scene, c, w / 2, 60, '0 km', { size: 40, color: CSS.yellow });
    counter(scene, c, {
      from: 0,
      to: 1,
      duration: 6000,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        const t = tw.getValue();
        const x = 160 + t * (w - 160 - 120);
        ship.setPosition(x, h / 2 - 30 - Math.sin(t * Math.PI) * 40);
        line.clear();
        line.lineStyle(3, COLORS.yellow, 0.7);
        line.lineBetween(120, h / 2 + 50, x, h / 2 + 50);
        km.setText(`${Math.round(t * 400171).toLocaleString('en-US')} km`);
      },
      onComplete: () => {
        sfx(c, 'fanfare');
        label(scene, c, w / 2, 112, 'The farthest any people had ever been from home!', { size: 22, color: CSS.text });
      }
    });
    label(scene, c, w / 2, h - 36, 'Record: 1970 - 2026 (beaten by Artemis II)', { size: 18, color: CSS.cyan });
  },

  coldCabin(scene, c, w, h) {
    sky(scene, c, w, h, 0x1c2433, 0x0d121c);
    const g = scene.add.graphics();
    g.fillStyle(0x2a2316, 1);
    g.fillRoundedRect(w * 0.1, h * 0.12, w * 0.8, h * 0.7, 30);
    g.lineStyle(4, 0xd8ad52, 1);
    g.strokeRoundedRect(w * 0.1, h * 0.12, w * 0.8, h * 0.7, 30);
    c.add(g);
    // frost crystals creeping in along the edges
    for (let i = 0; i < 46; i++) {
      const top = Math.random() < 0.5;
      const x = w * 0.11 + Math.random() * w * 0.78, y = top ? h * 0.13 + Math.random() * 40 : h * 0.81 - Math.random() * 40;
      const f = scene.add.image(x, y, 'sparkle').setTint(0xdff4ff).setScale(0.12 + Math.random() * 0.22).setAngle(Math.random() * 90).setAlpha(0);
      c.add(f);
      scene.tweens.add({ targets: f, alpha: 0.5 + Math.random() * 0.4, duration: 1500, delay: Math.random() * 3500 });
    }
    // drips of water down the walls
    loop(scene, c, 500, () => {
      const d = scene.add.ellipse(w * 0.14 + Math.random() * w * 0.72, h * 0.14, 6, 10, 0x9fd8ff, 0.8);
      c.add(d);
      scene.tweens.add({ targets: d, y: h * 0.8, duration: 2600, ease: 'Quad.easeIn', onComplete: () => d.destroy() });
    });
    // thermometer falling to about 3 °C
    const tx = w * 0.82, ty = h * 0.3;
    const tg = scene.add.graphics();
    tg.fillStyle(0xffffff, 1);
    tg.fillRoundedRect(tx - 12, ty, 24, 200, 12);
    tg.fillCircle(tx, ty + 210, 22);
    c.add(tg);
    const merc = scene.add.rectangle(tx, ty + 200, 12, 160, 0xff6b6b).setOrigin(0.5, 1); // (scaled, so it shrinks towards the bulb)
    c.add(merc);
    c.add(scene.add.circle(tx, ty + 210, 16, 0xff6b6b));
    const temp = label(scene, c, tx - 90, ty + 40, '22 °C', { size: 26, color: CSS.yellow });
    counter(scene, c, { from: 22, to: 3, duration: 5000, ease: 'Sine.easeOut', onUpdate: (tw) => {
      const v = tw.getValue();
      merc.setScale(1, (30 + (v / 22) * 130) / 160);
      temp.setText(`${Math.round(v)} °C`);
    } });
    label(scene, c, w * 0.4, h * 0.45, 'Cold, damp and dark', { size: 30, color: CSS.cyan });
  },

  co2Rising(scene, c, w, h) {
    sky(scene, c, w, h, 0x0b1535, 0x1c2b66);
    const mx = w * 0.7, my = h * 0.16, mh = h * 0.62;
    const g = scene.add.graphics();
    g.fillStyle(0x1b2348, 1);
    g.fillRoundedRect(mx, my, 60, mh, 14);
    g.fillStyle(COLORS.red, 0.35);
    g.fillRect(mx, my, 60, mh * 0.2);
    c.add(g);
    const bar = scene.add.rectangle(mx + 30, my + mh, 40, mh, COLORS.orange).setOrigin(0.5, 1).setScale(1, 0.2);
    c.add(bar);
    counter(scene, c, { from: 0.2, to: 0.85, duration: 6000, onUpdate: (tw) => bar.setScale(1, tw.getValue()) });
    label(scene, c, mx + 30, my + mh + 30, 'Carbon dioxide', { size: 18, color: CSS.orange });
    // breath bubbles from the crew
    heads(scene, c, w * 0.6, h, [['', ''], ['', ''], ['', '']], 0.5);
    loop(scene, c, 300, () => {
      const b = scene.add.circle(w * 0.1 + Math.random() * w * 0.4, h * 0.5, 4 + Math.random() * 6, 0xa0a0a0, 0.6);
      c.add(b);
      scene.tweens.add({ targets: b, y: h * 0.1, alpha: 0, duration: 2500, onComplete: () => b.destroy() });
    });
    label(scene, c, w * 0.32, 40, 'The air is getting stale...', { size: 24, color: CSS.yellow });
  },

  // The service module is let go and drifts away, turning to show the missing panel.
  smJettison(scene, c, w, h) {
    stars(scene, c, w, h, 110);
    c.add(img(scene, w * 0.28, h * 0.5, 'cm', 1.6).setAngle(-90));
    const sm = img(scene, w * 0.28 + 70, h * 0.5, 'smIntact', 1.5).setAngle(-90);
    const dmg = img(scene, w * 0.28 + 70, h * 0.5, 'smDamaged', 1.5).setAngle(-90).setAlpha(0);
    c.add([sm, dmg]);
    later(scene, c, 600, () => sfx(c, 'snap'));
    scene.tweens.add({ targets: [sm, dmg], x: w * 0.72, y: h * 0.56, duration: 6000, delay: 600, ease: 'Sine.easeOut' });
    // it slowly turns: the damaged side comes into view
    scene.tweens.add({ targets: sm, alpha: 0, duration: 1500, delay: 2600 });
    scene.tweens.add({ targets: dmg, alpha: 1, duration: 1500, delay: 2600 });
    scene.tweens.add({ targets: [sm, dmg], angle: -70, duration: 5000, delay: 1200 });
    const note = label(scene, c, w / 2, 40, 'Letting the service module go...', { size: 24, color: CSS.cyan });
    later(scene, c, 3600, () => note.setText('"One whole side of that spacecraft missing!"').setColor(CSS.yellow));
  },

  farewellAquarius(scene, c, w, h) {
    sky(scene, c, w, h, 0x000000, 0x050814);
    stars(scene, c, w, h * 0.5, 60);
    const earth = img(scene, w / 2, h + 260, 'earthBig', 1.2);
    c.add(earth);
    c.add(img(scene, w * 0.25, h * 0.3, 'cm', 1.3).setAngle(-15));
    const lm = img(scene, w * 0.3, h * 0.42, 'lm', 1.2);
    c.add(lm);
    scene.tweens.add({ targets: lm, x: w * 0.78, y: h * 0.28, scale: lm.scale * 0.5, angle: 25, duration: 7000, ease: 'Sine.easeOut' });
    label(scene, c, w / 2, 40, '"Farewell, Aquarius, and we thank you."', { size: 24, color: CSS.yellow });
  },

  // Re-entry with the radio cut off: the minutes tick by... longer than usual.
  blackout(scene, c, w, h) {
    sky(scene, c, w, h, 0x0a0f2a, 0x3a1c3a);
    const cm = img(scene, w / 2, h / 2, 'cmHot', 1.4).setAngle(-18);
    c.add(cm);
    const fire = scene.add.particles(0, 0, 'softDot', { follow: cm, speedX: { min: -60, max: 60 }, speedY: { min: -300, max: -150 }, lifespan: 700, scale: { start: 0.6, end: 0 }, tint: [0xffd166, 0xff9f43, 0xff5a2a], blendMode: 'ADD', frequency: 14 });
    c.addAt(fire, 1);
    const clock = label(scene, c, w / 2, 50, '0:00', { size: 40, color: CSS.yellow });
    const msg = label(scene, c, w / 2, h - 40, '"Odyssey, Houston, standing by..."', { size: 20, color: CSS.dim });
    counter(scene, c, {
      from: 0,
      to: 6.2,
      duration: 9000,
      onUpdate: (tw) => {
        const m = tw.getValue();
        clock.setText(`${Math.floor(m)}:${String(Math.floor((m % 1) * 60)).padStart(2, '0')}`);
        clock.setColor(m > 4 ? CSS.red : CSS.yellow);
        if (m > 4.1 && !msg.getData('late')) {
          msg.setData('late', true);
          msg.setText('Longer than usual...').setColor(CSS.orange);
        }
      }
    });
    loop(scene, c, 900, () => sfx(c, 'static'));
  }
};
