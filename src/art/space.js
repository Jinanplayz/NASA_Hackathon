// Planets, particles, sky objects and obstacles.
import { seeded } from '../core/constants.js';
import { makeTex, circle, blob, radial, linear, roundRect, poly, rgba } from './core.js';

export function drawEarth(ctx, s, seed = 7, opts = {}) {
  const cx = s / 2, cy = s / 2, r = s * 0.46;
  // atmosphere glow
  ctx.fillStyle = radial(ctx, cx, cy, r * 0.92, r * 1.085, [[0, 'rgba(120,200,255,0.55)'], [1, 'rgba(120,200,255,0)']]);
  circle(ctx, cx, cy, r * 1.085);
  ctx.fill();
  // ocean
  ctx.fillStyle = radial(ctx, cx - r * 0.35, cy - r * 0.4, r * 0.05, r * 1.05, [[0, '#5fb4ff'], [0.45, '#2175d6'], [1, '#0a2f73']]);
  circle(ctx, cx, cy, r);
  ctx.fill();
  ctx.save();
  circle(ctx, cx, cy, r);
  ctx.clip();
  const rnd = seeded(seed);
  // continents: a main blob plus smaller blobs around it for wiggly coastlines
  const land = ['#4f9d52', '#3f8c47', '#5aa85a'];
  for (let i = 0; i < 6; i++) {
    const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * r * 0.75;
    const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d * 0.85;
    const size = r * (0.13 + rnd() * 0.16);
    ctx.fillStyle = land[i % land.length];
    blob(ctx, x, y, size, rnd, 18, 0.35);
    ctx.fill();
    for (let k = 0; k < 4; k++) {
      const aa = rnd() * Math.PI * 2;
      blob(ctx, x + Math.cos(aa) * size * 0.8, y + Math.sin(aa) * size * 0.7, size * (0.35 + rnd() * 0.35), rnd, 12, 0.4);
      ctx.fill();
    }
    // desert / mountain patch
    ctx.fillStyle = 'rgba(206,180,112,0.85)';
    blob(ctx, x + size * 0.25, y - size * 0.1, size * 0.35, rnd, 10, 0.4);
    ctx.fill();
  }
  // ice caps
  ctx.fillStyle = 'rgba(245,250,255,0.9)';
  blob(ctx, cx, cy - r * 0.98, r * 0.34, rnd, 14, 0.25);
  ctx.fill();
  blob(ctx, cx, cy + r * 1.0, r * 0.4, rnd, 14, 0.25);
  ctx.fill();
  // soft cloud streaks
  for (let i = 0; i < 26; i++) {
    const x = cx + (rnd() - 0.5) * r * 1.9, y = cy + (rnd() - 0.5) * r * 1.9;
    const rx = r * (0.06 + rnd() * 0.16), ry = rx * (0.22 + rnd() * 0.2);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rnd() - 0.5) * 0.6);
    ctx.scale(1, ry / rx);
    ctx.fillStyle = radial(ctx, 0, 0, 0, rx, [[0, 'rgba(255,255,255,0.75)'], [0.6, 'rgba(255,255,255,0.4)'], [1, 'rgba(255,255,255,0)']]);
    circle(ctx, 0, 0, rx);
    ctx.fill();
    ctx.restore();
  }
  // night side shading
  if (opts.shade !== false) {
    ctx.fillStyle = linear(ctx, cx - r, cy - r, cx + r, cy + r, [[0, 'rgba(0,0,20,0)'], [0.55, 'rgba(0,0,20,0.05)'], [1, 'rgba(0,0,25,0.7)']]);
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(170,225,255,0.8)';
  ctx.lineWidth = s * 0.008;
  circle(ctx, cx, cy, r);
  ctx.stroke();
}

export function drawMoon(ctx, s, seed = 11) {
  const cx = s / 2, cy = s / 2, r = s * 0.47;
  ctx.fillStyle = radial(ctx, cx - r * 0.3, cy - r * 0.35, r * 0.05, r * 1.05, [[0, '#f1f1ee'], [0.6, '#bdbdb7'], [1, '#7c7c78']]);
  circle(ctx, cx, cy, r);
  ctx.fill();
  ctx.save();
  circle(ctx, cx, cy, r);
  ctx.clip();
  const rnd = seeded(seed);
  // maria (dark "seas")
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = 'rgba(95,95,100,0.45)';
    blob(ctx, cx + (rnd() - 0.4) * r, cy + (rnd() - 0.6) * r, r * (0.12 + rnd() * 0.2), rnd, 10, 0.4);
    ctx.fill();
  }
  // craters
  for (let i = 0; i < 26; i++) {
    const x = cx + (rnd() - 0.5) * r * 1.9, y = cy + (rnd() - 0.5) * r * 1.9;
    const cr = r * (0.02 + rnd() * rnd() * 0.12);
    ctx.fillStyle = 'rgba(80,80,80,0.35)';
    circle(ctx, x, y, cr);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = cr * 0.25;
    ctx.beginPath();
    ctx.arc(x, y, cr, Math.PI * 0.8, Math.PI * 1.8);
    ctx.stroke();
  }
  ctx.fillStyle = linear(ctx, cx - r, cy, cx + r, cy, [[0, 'rgba(0,0,0,0)'], [0.6, 'rgba(0,0,0,0.05)'], [1, 'rgba(0,0,0,0.55)']]);
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

export function buildSpaceArt(scene) {
  makeTex(scene, 'earth', 360, 360, (c, w) => drawEarth(c, w, 7));
  makeTex(scene, 'earthBig', 620, 620, (c, w) => drawEarth(c, w, 7));
  makeTex(scene, 'earthSmall', 120, 120, (c, w) => drawEarth(c, w, 3));
  makeTex(scene, 'moon', 300, 300, (c, w) => drawMoon(c, w));
  makeTex(scene, 'moonSmall', 110, 110, (c, w) => drawMoon(c, w, 4));

  // particles and glows (soft, so a fixed 2x density is plenty; scenes size them with plain scale numbers)
  makeTex(scene, 'softDot', 64, 64, (c) => {
    c.fillStyle = radial(c, 32, 32, 0, 32, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]);
    c.fillRect(0, 0, 64, 64);
  }, 2);
  makeTex(scene, 'dot', 10, 10, (c) => {
    c.fillStyle = '#fff';
    circle(c, 5, 5, 4.5);
    c.fill();
  }, 2);
  makeTex(scene, 'smoke', 80, 80, (c) => {
    const rnd = seeded(5);
    for (let i = 0; i < 6; i++) {
      c.fillStyle = radial(c, 40 + (rnd() - 0.5) * 20, 40 + (rnd() - 0.5) * 20, 0, 30, [[0, 'rgba(255,255,255,0.55)'], [1, 'rgba(255,255,255,0)']]);
      c.fillRect(0, 0, 80, 80);
    }
  }, 2);
  makeTex(scene, 'flame', 40, 90, (c) => {
    c.fillStyle = linear(c, 0, 0, 0, 90, [[0, 'rgba(255,255,230,1)'], [0.25, 'rgba(255,220,90,0.95)'], [0.6, 'rgba(255,120,40,0.7)'], [1, 'rgba(255,60,20,0)']]);
    c.beginPath();
    c.moveTo(4, 0);
    c.quadraticCurveTo(0, 30, 20, 90);
    c.quadraticCurveTo(40, 30, 36, 0);
    c.closePath();
    c.fill();
  }, 2);
  makeTex(scene, 'sparkle', 32, 32, (c) => {
    c.fillStyle = '#fff';
    poly(c, [[16, 0], [19, 13], [32, 16], [19, 19], [16, 32], [13, 19], [0, 16], [13, 13]]);
    c.fill();
  }, 2);

  // stars tile (for scrolling backgrounds)
  makeTex(scene, 'starsTile', 512, 512, (c) => {
    const rnd = seeded(21);
    for (let i = 0; i < 170; i++) {
      const a = 0.3 + rnd() * 0.7;
      c.fillStyle = `rgba(255,255,255,${a})`;
      circle(c, rnd() * 512, rnd() * 512, rnd() < 0.08 ? 1.6 : 0.8);
      c.fill();
    }
  });

  // clouds (3 variants): soft puffs with a gently shaded underside
  for (let v = 0; v < 3; v++) {
    makeTex(scene, 'cloud' + v, 220, 110, (c) => {
      const rnd = seeded(40 + v);
      const puffs = [];
      for (let i = 0; i < 7; i++) puffs.push([40 + rnd() * 140, 52 + (rnd() - 0.5) * 26, 22 + rnd() * 20]);
      puffs.forEach(([x, y, r]) => {
        c.fillStyle = radial(c, x - r * 0.3, y - r * 0.4, r * 0.1, r, [[0, 'rgba(255,255,255,1)'], [0.75, 'rgba(244,248,255,0.98)'], [1, 'rgba(205,220,240,0.95)']]);
        circle(c, x, y, r);
        c.fill();
      });
    });
  }

  // bird (flying, simple silhouette)
  makeTex(scene, 'bird', 44, 24, (c) => {
    c.strokeStyle = '#1b2440';
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(3, 8);
    c.quadraticCurveTo(12, 0, 22, 12);
    c.quadraticCurveTo(32, 0, 41, 8);
    c.stroke();
  });

  // weather balloon with instrument box
  makeTex(scene, 'balloon', 70, 120, (c) => {
    c.fillStyle = radial(c, 28, 26, 4, 36, [[0, '#ffffff'], [1, '#d7dde8']]);
    c.beginPath();
    c.ellipse(35, 36, 30, 34, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#9aa4c7';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(35, 70);
    c.lineTo(35, 100);
    c.stroke();
    c.fillStyle = '#ff9f43';
    roundRect(c, 26, 98, 18, 16, 3);
    c.fill();
  });

  // meteor (burning space rock)
  makeTex(scene, 'meteor', 90, 44, (c) => {
    c.fillStyle = linear(c, 0, 22, 70, 22, [[0, 'rgba(255,140,40,0)'], [1, 'rgba(255,200,90,0.9)']]);
    c.beginPath();
    c.moveTo(0, 20);
    c.lineTo(66, 8);
    c.lineTo(66, 36);
    c.closePath();
    c.fill();
    const rnd = seeded(9);
    c.fillStyle = '#8a6a55';
    blob(c, 70, 22, 15, rnd, 9, 0.3);
    c.fill();
    c.fillStyle = 'rgba(255,220,120,0.6)';
    blob(c, 66, 20, 8, rnd, 8, 0.3);
    c.fill();
  });

  // asteroids / space rocks
  for (let v = 0; v < 3; v++) {
    makeTex(scene, 'rock' + v, 80, 80, (c) => {
      const rnd = seeded(60 + v);
      c.fillStyle = radial(c, 30, 28, 4, 44, [[0, '#a79a8e'], [1, '#5a5048']]);
      blob(c, 40, 40, 30, rnd, 11, 0.3);
      c.fill();
      for (let i = 0; i < 4; i++) {
        c.fillStyle = 'rgba(40,30,25,0.45)';
        circle(c, 25 + rnd() * 30, 25 + rnd() * 30, 3 + rnd() * 5);
        c.fill();
      }
    });
  }

  // generic satellites (obstacles)
  makeTex(scene, 'satA', 110, 50, (c) => {
    c.fillStyle = '#2d5bd6';
    c.fillRect(0, 14, 38, 22);
    c.fillRect(72, 14, 38, 22);
    c.strokeStyle = '#8fb3ff';
    c.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(i * 7.6, 14);
      c.lineTo(i * 7.6, 36);
      c.moveTo(72 + i * 7.6, 14);
      c.lineTo(72 + i * 7.6, 36);
      c.stroke();
    }
    c.fillStyle = '#e5b94a';
    roundRect(c, 40, 8, 30, 34, 4);
    c.fill();
    c.fillStyle = '#c7cfdc';
    c.fillRect(38, 22, 34, 6);
  });
  makeTex(scene, 'satB', 70, 70, (c) => {
    c.strokeStyle = '#c7cfdc';
    c.lineWidth = 2;
    [[35, 35, 5, 5], [35, 35, 65, 8], [35, 35, 8, 64], [35, 35, 66, 62]].forEach(([a, b, x, y]) => {
      c.beginPath();
      c.moveTo(a, b);
      c.lineTo(x, y);
      c.stroke();
    });
    c.fillStyle = radial(c, 30, 30, 2, 18, [[0, '#ffffff'], [1, '#9aa4b8']]);
    circle(c, 35, 35, 16);
    c.fill();
  });

  // aurora curtain: many soft vertical rays
  makeTex(scene, 'aurora', 400, 140, (c) => {
    for (let x = 0; x <= 400; x += 2) {
      const base = 120 + Math.sin(x / 45) * 10;
      const len = 60 + Math.sin(x / 23 + 1) * 25 + Math.sin(x / 7) * 8;
      const edge = Math.min(1, x / 60, (400 - x) / 60);
      const g = c.createLinearGradient(0, base, 0, base - len);
      g.addColorStop(0, `rgba(110,255,170,${0.55 * edge})`);
      g.addColorStop(0.6, `rgba(110,255,200,${0.25 * edge})`);
      g.addColorStop(1, 'rgba(170,120,255,0)');
      c.strokeStyle = g;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x, base);
      c.lineTo(x + 6, base - len);
      c.stroke();
    }
  });

  // radiation belt ring (Van Allen)
  makeTex(scene, 'belt', 300, 160, (c) => {
    c.strokeStyle = 'rgba(255,140,200,0.55)';
    for (let i = 0; i < 3; i++) {
      c.lineWidth = 16 - i * 4;
      c.beginPath();
      c.ellipse(150, 80, 140 - i * 25, 70 - i * 12, 0, 0, Math.PI * 2);
      c.stroke();
    }
  });

  // sea fog with a clear hole in the middle (rescue search). Shown at 5x size.
  makeTex(scene, 'fogHole', 512, 288, (c) => {
    c.fillStyle = 'rgba(8,24,44,0.94)';
    c.fillRect(0, 0, 512, 288);
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = radial(c, 256, 144, 12, 30, [[0, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]);
    c.fillRect(0, 0, 512, 288);
    c.globalCompositeOperation = 'source-over';
  });

  // ocean waves tile
  makeTex(scene, 'waveTile', 256, 256, (c) => {
    c.fillStyle = '#1d5ea6';
    c.fillRect(0, 0, 256, 256);
    const rnd = seeded(77);
    c.strokeStyle = 'rgba(255,255,255,0.22)';
    c.lineWidth = 2;
    c.lineCap = 'round';
    for (let i = 0; i < 28; i++) {
      const x = rnd() * 256, y = rnd() * 256, w = 14 + rnd() * 20;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + w / 2, y - 5, x + w, y);
      c.stroke();
    }
  });

  // US flag (for Apollo scenes)
  makeTex(scene, 'flag', 90, 60, (c) => {
    for (let i = 0; i < 13; i++) {
      c.fillStyle = i % 2 ? '#ffffff' : '#c8102e';
      c.fillRect(0, (i * 60) / 13, 90, 60 / 13 + 0.5);
    }
    c.fillStyle = '#002868';
    c.fillRect(0, 0, 38, 32);
    c.fillStyle = '#fff';
    for (let r = 0; r < 4; r++) for (let k = 0; k < 5; k++) {
      circle(c, 4 + k * 7.5 + (r % 2) * 3, 4 + r * 7.5, 1.2);
      c.fill();
    }
  });

  // a sheet of "photo" from the 1946 V-2 camera (grainy black & white)
  makeTex(scene, 'v2photo', 420, 280, (c) => {
    c.fillStyle = '#1b1b1b';
    c.fillRect(0, 0, 420, 280);
    c.fillStyle = linear(c, 0, 0, 0, 280, [[0, '#0e0e0e'], [0.45, '#3a3a3a'], [0.5, '#9a9a9a'], [1, '#6d6d6d']]);
    c.beginPath();
    c.moveTo(0, 150);
    c.quadraticCurveTo(210, 90, 420, 150);
    c.lineTo(420, 280);
    c.lineTo(0, 280);
    c.closePath();
    c.fill();
    const rnd = seeded(33);
    for (let i = 0; i < 60; i++) {
      c.fillStyle = `rgba(230,230,230,${0.06 + rnd() * 0.14})`;
      blob(c, rnd() * 420, 150 + rnd() * 130, 5 + rnd() * 16, rnd, 8, 0.5);
      c.fill();
    }
    for (let i = 0; i < 2500; i++) {
      c.fillStyle = `rgba(${rnd() < 0.5 ? '255,255,255' : '0,0,0'},${rnd() * 0.18})`;
      c.fillRect(rnd() * 420, rnd() * 280, 1.2, 1.2);
    }
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      c.beginPath();
      const x = rnd() * 420;
      c.moveTo(x, 0);
      c.lineTo(x + (rnd() - 0.5) * 30, 280);
      c.stroke();
    }
  });

  // radio waves (used for beacons & signals)
  makeTex(scene, 'waves', 80, 80, (c) => {
    c.strokeStyle = rgba(0x4fd1ff, 0.9);
    c.lineWidth = 3;
    for (let i = 1; i <= 3; i++) {
      c.beginPath();
      c.arc(10, 70, i * 20, -Math.PI / 2, 0);
      c.stroke();
    }
  });
}
