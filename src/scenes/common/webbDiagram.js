// A front view of Webb whose parts can fold up (for launch) and unfold (in space).
// Each part has a fold value from 0 (open, as in space) to 1 (folded, as in the rocket).
// Used by the "fold it up" and "unfold in space" games.
import Phaser from 'phaser';
import { MIRROR_CELLS, hexCenter } from '../../art/ch7.js';

export const PARTS = ['solar', 'antenna', 'pallets', 'tower', 'shield', 'secondary', 'wings'];

const lerp = (a, b, t) => a + (b - a) * t;
const lp = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];

export class WebbDiagram {
  constructor(scene, x, y, s = 1, folded = 0) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.s = s;
    this.f = {};
    PARTS.forEach((p) => (this.f[p] = folded));
    this.g = scene.add.graphics();
    this.hi = null; // a part to highlight
    this.draw();
  }

  set(part, v) {
    this.f[part] = v;
    this.draw();
  }

  // animate one part folding (to 1) or opening (to 0)
  animate(part, to, ms = 1100) {
    return new Promise((res) => {
      this.scene.tweens.addCounter({
        from: this.f[part],
        to,
        duration: ms,
        ease: 'Sine.easeInOut',
        onUpdate: (tw) => this.set(part, tw.getValue()),
        onComplete: res
      });
    });
  }

  // where things are, in scene coordinates
  P(x, y) {
    return [this.x + x * this.s, this.y + y * this.s];
  }

  mirrorY() {
    return -150 - (1 - this.f.tower) * 90;
  }

  // the parts' tap areas (scene coordinates): { part, x, y, w, h }
  hitAreas() {
    const f = this.f, s = this.s;
    const my = this.mirrorY();
    const R = 26;
    const areas = [];
    const box = (part, x, y, w, h) => {
      const [px, py] = this.P(x, y);
      areas.push({ part, x: px, y: py, w: w * s, h: h * s });
    };
    box('solar', -50 - lerp(230, 20, f.solar) / 2 - 10, 92, lerp(230, 30, f.solar) + 20, 60);
    box('antenna', 95, 115 - f.antenna * 20, 80, 80);
    box('sunshield', -170, -10, 220, 120);
    box('sunshield', 170, -10, 220, 120);
    box('tower', 0, (my + 40) / 2, 50, Math.max(40, -my - 40));
    box('secondary', 0, my - R * 1.2 + f.secondary * R * 4.2, 64, 64);
    box('wings', -R * 3.6, my, 56, R * 4.4);
    box('wings', R * 3.6, my, 56, R * 4.4);
    return areas;
  }

  // total width and height of the drawing (to check it fits in the rocket)
  size() {
    const f = this.f;
    const shieldW = lerp(600, 150, f.pallets);
    const mirrorW = lerp(8 * 26, 5.2 * 26, f.wings);
    const solarW = lerp(330, 110, f.solar);
    return { w: Math.max(shieldW, mirrorW, solarW) * this.s, h: (lerp(400, 300, f.tower)) * this.s };
  }

  draw() {
    const g = this.g, f = this.f, s = this.s;
    if (!g.active) return;
    g.clear();
    const pts = (arr) => arr.map(([x, y]) => new Phaser.Math.Vector2(...this.P(x, y)));
    const hi = (part) => this.hi === part;

    // the solar panel and antenna under the spacecraft bus
    const sw = lerp(230, 20, f.solar);
    g.fillStyle(0x1e2a5c, 1);
    g.fillRect(...this.P(-50 - sw, 74), sw * s, 36 * s);
    g.lineStyle(hi('solar') ? 4 : 1, hi('solar') ? 0xffd166 : 0x4f6bd8, 1);
    g.strokeRect(...this.P(-50 - sw, 74), sw * s, 36 * s);
    const boom = [lp([60, 70], [60, 70], f.antenna), lp([120, 130], [70, 100], f.antenna)];
    g.lineStyle(3 * s, 0x9aa1ae, 1);
    g.lineBetween(...this.P(...boom[0]), ...this.P(...boom[1]));
    g.fillStyle(0xe9ecf2, 1);
    g.fillEllipse(...this.P(...boom[1]), lerp(46, 26, f.antenna) * s, 20 * s);
    if (hi('antenna')) {
      g.lineStyle(3, 0xffd166, 1);
      g.strokeEllipse(...this.P(...boom[1]), lerp(46, 26, f.antenna) * s + 8, 28 * s);
    }
    // the bus (the spacecraft's "body")
    g.fillStyle(0x5d6475, 1);
    g.fillRect(...this.P(-50, 20), 100 * s, 56 * s);

    // the sunshield: two pallets that fold up, and five thin layers stretched between them
    const halves = [-1, 1].map((k) => {
      const T = lp([0, -70], [k * 45, -40], f.pallets);
      const O = lp([k * 300, 0], [k * 80, -250], f.pallets);
      const B = lp([0, 70], [k * 45, 40], f.pallets);
      return [T, O, B];
    });
    const open = 1 - f.shield;
    halves.forEach((h) => {
      if (open > 0.02) {
        for (let k = 4; k >= 0; k--) {
          const off = k * 6 * open;
          const c = k === 0 ? 0xc9bdf0 : Phaser.Display.Color.GetColor(150 - k * 12, 130 - k * 10, 200 - k * 10);
          g.fillStyle(c, 0.95 * open + 0.05);
          g.fillPoints(pts(h.map(([x, y]) => [x * open + h[0][0] * (1 - open), y + off])), true);
        }
      }
      // the pallet (a stiff panel holding the folded layers)
      g.lineStyle(hi('sunshield') ? 6 : 5, hi('sunshield') ? 0xffd166 : 0x8a91a3, 1);
      g.lineBetween(...this.P(...h[0]), ...this.P(...lp(h[0], h[1], 0.35)));
      g.lineBetween(...this.P(...h[2]), ...this.P(...lp(h[2], h[1], 0.35)));
    });

    // the tower that lifts the telescope above the sunshield
    const my = this.mirrorY();
    g.fillStyle(hi('tower') ? 0xffd166 : 0x3a3f4b, 1);
    g.fillRect(...this.P(-8, my + 40), 16 * s, (-my - 40) * s);

    // the primary mirror: 18 gold hexagons; the side "wings" fold back
    const R = 26;
    MIRROR_CELLS.forEach(({ q, r }) => {
      const c = hexCenter(q, r, R);
      const wing = Math.abs(q) === 2;
      const sx = wing ? lerp(1, 0.15, f.wings) : 1;
      const cx = wing ? Math.sign(q) * lerp(Math.abs(c.x), 2.5 * R, f.wings) : c.x;
      const hex = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i;
        hex.push([cx + Math.cos(a) * R * 0.92 * sx, my + c.y + Math.sin(a) * R * 0.92]);
      }
      const shade = wing ? lerp(1, 0.55, f.wings) : 1;
      g.fillStyle(Phaser.Display.Color.GetColor(226 * shade, 181 * shade, 74 * shade), 1);
      g.fillPoints(pts(hex), true);
      g.lineStyle(wing && hi('wings') ? 3 : 1, wing && hi('wings') ? 0xffd166 : 0x7a5210, 1);
      g.strokePoints(pts(hex), true);
    });

    // the secondary mirror on its three struts (they fold down for launch)
    const sm = [0, my - R * 1.2 + f.secondary * R * 4.2];
    const feet = [[0, my - R * 4.4], [-R * 3.4, my + R * 2.6], [R * 3.4, my + R * 2.6]];
    g.lineStyle(3 * s, hi('secondary') ? 0xffd166 : 0x2b2f38, 1);
    feet.forEach((p) => g.lineBetween(...this.P(...p), ...this.P(...sm)));
    g.fillStyle(0xe2b54a, 1);
    g.fillCircle(...this.P(...sm), R * 0.5 * s);
    g.lineStyle(2, 0x2b2f38, 1);
    g.strokeCircle(...this.P(...sm), R * 0.5 * s);
  }

  destroy() {
    this.g.destroy();
  }
}
