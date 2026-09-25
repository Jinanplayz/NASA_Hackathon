// Detailed procedural 3D models (no model files needed).
// buildModel(name) returns a THREE.Group; group.userData.update(t, dt) animates it.

import * as THREE from 'three';

const V2 = (x, y) => new THREE.Vector2(x, y);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- materials & textures ----------
const mat = {
  steel: (c = 0xb9c0cc, r = 0.32) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.9, roughness: r }),
  paint: (c, r = 0.55) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.08, roughness: r }),
  brass: () => new THREE.MeshStandardMaterial({ color: 0xd8ad52, metalness: 1, roughness: 0.28 }),
  copper: () => new THREE.MeshStandardMaterial({ color: 0xc27c4e, metalness: 1, roughness: 0.35 }),
  dark: (c = 0x2b2f38) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.5, roughness: 0.6 }),
  glow: (c, o = 0.6) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  // glow that fades out along the length of a cone (bright at the wide end)
  plume: (c, o = 0.8) => new THREE.MeshBasicMaterial({ color: c, map: fadeTexture(), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  emissive: (c, i = 1.5) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4 })
};

function fadeTexture() {
  return canvasTex(16, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(0.55, 'rgba(120,120,120,1)');
    g.addColorStop(1, 'rgba(255,255,255,1)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });
}

function canvasTex(w, h, draw, repeat = null) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

// Floating name tag that always faces the camera.
function label(text, pos, size = 0.5, color = '#4fd1ff') {
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = '700 54px Lexend, "Segoe UI", sans-serif';
  const tw = Math.ceil(measure.measureText(text).width);
  const cw = tw + 80;
  const tex = canvasTex(cw, 128, (c, w) => {
    c.font = '700 54px Lexend, "Segoe UI", sans-serif';
    c.fillStyle = 'rgba(7,11,29,0.85)';
    c.beginPath();
    if (c.roundRect) c.roundRect(6, 20, w - 12, 88, 44);
    else c.rect(6, 20, w - 12, 88);
    c.fill();
    c.strokeStyle = color;
    c.lineWidth = 5;
    c.stroke();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, w / 2, 66);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  const k = size * 1.9;
  s.scale.set(k * (cw / 128), k, 1);
  s.position.copy(pos);
  s.renderOrder = 10;
  s.userData.isLabel = true;
  return s;
}

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  return m;
}

function tube(points, radius, material, segs = 48) {
  const curve = new THREE.CatmullRomCurve3(points);
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, radius, 12, false), material);
  m.userData.curve = curve;
  return m;
}

function bell(r0, r1, len, segs = 64, power = 0.62) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    pts.push(V2(r0 + (r1 - r0) * Math.pow(t, power), -t * len));
  }
  return new THREE.LatheGeometry(pts, segs);
}

// ---------- 1. Propulsion: rocket engine ----------
function engine() {
  const g = new THREE.Group();
  const tubesTex = canvasTex(1024, 64, (c, w, h) => {
    c.fillStyle = '#6f5a47';
    c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 8) {
      const grd = c.createLinearGradient(x, 0, x + 8, 0);
      grd.addColorStop(0, '#3b2e24');
      grd.addColorStop(0.5, '#b89572');
      grd.addColorStop(1, '#3b2e24');
      c.fillStyle = grd;
      c.fillRect(x, 0, 8, h);
    }
  });
  const nozzleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tubesTex, bumpMap: tubesTex, bumpScale: 0.6, metalness: 0.85, roughness: 0.38, side: THREE.DoubleSide });
  const nozzle = mesh(bell(0.34, 1.05, 2.4), nozzleMat, 0, 0, 0);
  g.add(nozzle);
  // stiffening rings on the bell
  [0.35, 0.7].forEach((t) => {
    const r = 0.34 + 0.71 * Math.pow(t, 0.62);
    const ring = mesh(new THREE.TorusGeometry(r + 0.02, 0.035, 10, 64), mat.steel(0x8d949f));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -t * 2.4;
    g.add(ring);
  });
  const exitRing = mesh(new THREE.TorusGeometry(1.07, 0.05, 12, 80), mat.steel(0x6f7682));
  exitRing.rotation.x = Math.PI / 2;
  exitRing.position.y = -2.4;
  g.add(exitRing);
  // combustion chamber + injector dome
  g.add(mesh(new THREE.CylinderGeometry(0.44, 0.36, 0.9, 48), mat.copper(), 0, 0.42, 0));
  const dome = mesh(new THREE.SphereGeometry(0.44, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), mat.steel(), 0, 0.86, 0);
  g.add(dome);
  // gimbal mount
  g.add(mesh(new THREE.BoxGeometry(0.55, 0.22, 0.55), mat.dark(), 0, 1.38, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.35, 16), mat.steel(), 0, 1.15, 0));
  // turbopump
  const pump = new THREE.Group();
  const housing = mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.8, 32), mat.steel(0xa7aeb9));
  housing.rotation.z = Math.PI / 2;
  pump.add(housing);
  [-0.42, 0.42].forEach((x) => {
    const cap = mesh(new THREE.SphereGeometry(0.26, 24, 12), mat.steel(0x8d949f), x, 0, 0);
    cap.scale.x = 0.5;
    pump.add(cap);
  });
  pump.add(mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.5, 16), mat.dark(0x444a55), 0, -0.35, 0.15));
  pump.position.set(0.95, 0.55, 0.1);
  g.add(pump);
  // turbine exhaust duct running down the nozzle
  g.add(tube([V3(0.95, 0.2, 0.25), V3(0.85, -0.4, 0.45), V3(0.95, -1.4, 0.55), V3(1.12, -2.3, 0.5)], 0.07, mat.steel(0x7b828e)));
  // propellant lines (fuel = orange band, oxidizer = blue band)
  const fuel = tube([V3(-0.3, 2.3, 0), V3(-0.45, 1.6, 0.1), V3(-0.62, 1.0, 0.25), V3(-0.4, 0.8, 0.35)], 0.09, mat.steel());
  const ox = tube([V3(0.3, 2.3, 0), V3(0.55, 1.7, -0.2), V3(0.85, 1.0, -0.1), V3(0.85, 0.72, 0.05)], 0.09, mat.steel());
  g.add(fuel, ox);
  const band1 = mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 24), mat.paint(0xff9f43), -0.45, 1.6, 0.1);
  band1.rotation.x = Math.PI / 2;
  const band2 = mesh(new THREE.TorusGeometry(0.1, 0.03, 8, 24), mat.paint(0x4fa3ff), 0.55, 1.7, -0.2);
  band2.rotation.x = Math.PI / 2;
  g.add(band1, band2);
  // flame
  const flameOuter = mesh(new THREE.ConeGeometry(0.98, 3.4, 40, 1, true), mat.plume(0xff8a2a, 0.9), 0, -4.1, 0);
  flameOuter.rotation.x = Math.PI;
  const flameInner = mesh(new THREE.ConeGeometry(0.6, 2.3, 32, 1, true), mat.plume(0xfff1b0, 0.9), 0, -3.55, 0);
  flameInner.rotation.x = Math.PI;
  g.add(flameOuter, flameInner);
  g.add(label('Nozzle', V3(-1.6, -1.6, 0), 0.34, '#ff9f43'));
  g.add(label('Combustion chamber', V3(-1.6, 0.45, 0), 0.34));
  g.add(label('Turbopump', V3(1.9, 0.9, 0), 0.34));
  g.add(label('Fuel & oxygen pipes', V3(0, 2.6, 0), 0.34, '#3ddc97'));
  g.userData.update = (t) => {
    const f = 1 + Math.sin(t * 43) * 0.06 + Math.sin(t * 17) * 0.05;
    flameOuter.scale.set(1, f, 1);
    flameInner.scale.set(1, 2 - f, 1);
    flameOuter.material.opacity = 0.8 + Math.sin(t * 29) * 0.12;
  };
  g.userData.startRotX = 0.12;
  return g;
}

// ---------- 2. Guidance: gyroscope ----------
function gyroscope() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.8, 0.95, 0.18, 48), mat.dark(0x33384a), 0, -1.75, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.3, 16), mat.steel(), 0, -1.55, 0));
  const cradle = mesh(new THREE.TorusGeometry(1.5, 0.06, 12, 64, Math.PI), mat.steel(0x8d949f));
  cradle.rotation.z = Math.PI;
  g.add(cradle);
  const pinMat = mat.steel(0xdfe3ea, 0.2);
  const pin = (x, y, z, axis) => {
    const p = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.28, 12), pinMat, x, y, z);
    if (axis === 'x') p.rotation.z = Math.PI / 2;
    if (axis === 'z') p.rotation.x = Math.PI / 2;
    return p;
  };
  const outer = new THREE.Group();
  outer.add(mesh(new THREE.TorusGeometry(1.3, 0.07, 16, 96), mat.brass()));
  outer.add(pin(1.4, 0, 0, 'x'), pin(-1.4, 0, 0, 'x'));
  g.add(outer);
  const middle = new THREE.Group();
  const mRing = mesh(new THREE.TorusGeometry(1.1, 0.06, 16, 96), mat.brass());
  mRing.rotation.y = Math.PI / 2;
  middle.add(mRing, pin(0, 1.2, 0, 'y'), pin(0, -1.2, 0, 'y'));
  outer.add(middle);
  const inner = new THREE.Group();
  const iRing = mesh(new THREE.TorusGeometry(0.9, 0.05, 16, 96), mat.steel(0xc9ced8));
  iRing.rotation.x = Math.PI / 2;
  inner.add(iRing, pin(0, 0, 1.0, 'z'), pin(0, 0, -1.0, 'z'));
  middle.add(inner);
  const rotor = new THREE.Group();
  const disk = mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.16, 64), mat.steel(0xa7aeb9, 0.25));
  disk.rotation.z = Math.PI / 2;
  rotor.add(disk);
  const stripe = mesh(new THREE.BoxGeometry(0.17, 0.1, 1.3), mat.emissive(0x4fd1ff, 1.2));
  rotor.add(stripe);
  const axle = mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 16), pinMat);
  axle.rotation.z = Math.PI / 2;
  rotor.add(axle);
  inner.add(rotor);
  g.add(label('Spinning wheel (rotor)', V3(0, 1.9, 0), 0.32, '#4fd1ff'));
  g.add(label('Gimbal rings', V3(1.9, -1.2, 0), 0.32, '#ffd166'));
  g.userData.update = (t, dt) => {
    outer.rotation.x = Math.sin(t * 0.5) * 0.7;
    middle.rotation.y = Math.sin(t * 0.73 + 1) * 0.9;
    inner.rotation.z = Math.sin(t * 0.41 + 2) * 0.6;
    rotor.rotation.x += dt * 22;
  };
  return g;
}

// ---------- 3. Attitude control: thruster cluster ----------
function thrusters() {
  const g = new THREE.Group();
  const panelTex = canvasTex(512, 384, (c, w, h) => {
    c.fillStyle = '#c9ced8';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(60,70,90,0.5)';
    c.lineWidth = 3;
    for (let x = 0; x < w; x += 128) c.strokeRect(x + 4, 4, 120, h - 8);
    c.fillStyle = 'rgba(40,50,70,0.6)';
    for (let x = 16; x < w; x += 32) for (let y = 16; y < h; y += 64) c.fillRect(x, y, 4, 4);
  });
  g.add(mesh(new THREE.BoxGeometry(2.6, 1.9, 0.12), new THREE.MeshStandardMaterial({ map: panelTex, metalness: 0.6, roughness: 0.45 }), 0, 0, -0.1));
  g.add(mesh(new THREE.BoxGeometry(0.7, 0.7, 0.5), mat.steel(0x8d949f), 0, 0.2, 0.25));
  const puffs = [];
  const dirs = [
    [0, 1, 0],
    [1, 0, 0],
    [0, -1, 0],
    [-1, 0, 0]
  ];
  dirs.forEach(([dx, dy]) => {
    const nz = new THREE.Group();
    const bellM = mesh(bell(0.05, 0.14, 0.38, 32), new THREE.MeshStandardMaterial({ color: 0x3a3f4b, metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide }));
    nz.add(bellM);
    const puffMat = mat.plume(0xdff4ff, 0.0);
    puffMat.map.rotation = Math.PI;
    puffMat.map.center.set(0.5, 0.5);
    const puff = mesh(new THREE.ConeGeometry(0.35, 1.2, 24, 1, true), puffMat);
    puff.position.y = -0.95; // narrow end at the nozzle, spreading outward
    nz.add(puff);
    puffs.push(puff);
    // point the nozzle outward
    nz.position.set(dx * 0.35, 0.2 + dy * 0.35, 0.25);
    nz.rotation.z = Math.atan2(dx, -dy);
    g.add(nz);
  });
  const tankMat = mat.steel(0xe8ebf2, 0.3);
  const t1 = mesh(new THREE.SphereGeometry(0.3, 32, 16), tankMat, -0.8, -0.55, 0.25);
  const t2 = mesh(new THREE.SphereGeometry(0.3, 32, 16), tankMat, 0.8, -0.55, 0.25);
  g.add(t1, t2);
  const bandO = mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 32), mat.paint(0xff9f43), -0.8, -0.55, 0.25);
  const bandB = mesh(new THREE.TorusGeometry(0.3, 0.025, 8, 32), mat.paint(0x4fa3ff), 0.8, -0.55, 0.25);
  g.add(bandO, bandB);
  g.add(tube([V3(-0.8, -0.3, 0.3), V3(-0.5, -0.1, 0.4), V3(-0.2, 0.05, 0.4)], 0.04, mat.steel()));
  g.add(tube([V3(0.8, -0.3, 0.3), V3(0.5, -0.1, 0.4), V3(0.2, 0.05, 0.4)], 0.04, mat.steel()));
  g.add(label('Thruster', V3(0, 1.5, 0.3), 0.3, '#4fd1ff'));
  g.add(label('Fuel tank', V3(-1.3, -1.1, 0.3), 0.26, '#ff9f43'));
  g.add(label('Oxidizer tank', V3(1.3, -1.1, 0.3), 0.26, '#4fa3ff'));
  g.userData.update = (t) => {
    const active = Math.floor(t / 0.9) % 4;
    const phase = (t % 0.9) / 0.9;
    puffs.forEach((p, i) => {
      const on = i === active;
      p.material.opacity = on ? Math.max(0, 0.7 * (1 - phase)) : 0;
      p.scale.set(on ? 0.4 + phase : 0.1, on ? 0.4 + phase : 0.1, on ? 0.4 + phase : 0.1);
    });
  };
  g.userData.startRotY = -0.3;
  return g;
}

// ---------- 4. Electrical power ----------
function power() {
  const g = new THREE.Group();
  // battery
  const batt = new THREE.Group();
  batt.add(mesh(new THREE.BoxGeometry(1.0, 0.65, 0.65), mat.dark(0x2f3542)));
  for (let i = 0; i < 6; i++) {
    const x = -0.35 + (i % 3) * 0.35, z = i < 3 ? -0.15 : 0.15;
    batt.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 16), mat.steel(0xd0d4dc), x, 0.36, z));
  }
  batt.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12), mat.paint(0xe5484d), -0.4, 0.42, 0.26));
  batt.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12), mat.paint(0x1d2029), 0.4, 0.42, 0.26));
  batt.position.set(-2.0, -0.6, 0);
  g.add(batt);
  // fuel cell (Apollo style)
  const fc = new THREE.Group();
  fc.add(mesh(new THREE.CylinderGeometry(0.38, 0.38, 1.4, 40), mat.steel(0xd7dbe3, 0.3)));
  for (let i = 0; i < 9; i++) {
    const rib = mesh(new THREE.TorusGeometry(0.39, 0.025, 8, 40), mat.steel(0x9aa1ae));
    rib.rotation.x = Math.PI / 2;
    rib.position.y = -0.6 + i * 0.15;
    fc.add(rib);
  }
  fc.add(mesh(new THREE.SphereGeometry(0.38, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat.steel(0xd7dbe3), 0, 0.7, 0));
  // water drop showing the fuel cell makes water
  const drop = mesh(new THREE.SphereGeometry(0.1, 16, 12), new THREE.MeshStandardMaterial({ color: 0x5fb4ff, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.85 }), 0.5, -0.5, 0.3);
  fc.add(drop);
  fc.position.set(0, -0.25, 0);
  g.add(fc);
  // solar panel on a boom
  const cellTex = canvasTex(512, 320, (c, w, h) => {
    c.fillStyle = '#10287a';
    c.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 32)
      for (let y = 0; y < h; y += 32) {
        const grd = c.createLinearGradient(x, y, x + 32, y + 32);
        grd.addColorStop(0, '#2a55d8');
        grd.addColorStop(1, '#16307e');
        c.fillStyle = grd;
        c.fillRect(x + 2, y + 2, 28, 28);
      }
    c.strokeStyle = '#c7cfdc';
    c.lineWidth = 4;
    c.strokeRect(2, 2, w - 4, h - 4);
    c.beginPath();
    c.moveTo(w / 2, 0);
    c.lineTo(w / 2, h);
    c.stroke();
  });
  const solar = new THREE.Group();
  const boom = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 12), mat.steel(), 0, 0, 0);
  boom.rotation.z = Math.PI / 2;
  boom.position.x = -0.6;
  solar.add(boom);
  const panelWing = mesh(new THREE.BoxGeometry(1.5, 0.03, 1.0), [mat.steel(), mat.steel(), new THREE.MeshStandardMaterial({ map: cellTex, metalness: 0.5, roughness: 0.25 }), mat.steel(0x6b7385), mat.steel(), mat.steel()], 0.75, 0, 0);
  solar.add(panelWing);
  solar.position.set(1.4, 0.35, 0);
  g.add(solar);
  // central power box + cables carrying glowing pulses of electricity
  const box = mesh(new THREE.BoxGeometry(0.7, 0.4, 0.4), mat.dark(0x3a4152), 0, -1.35, 0.45);
  g.add(box);
  const led = mesh(new THREE.SphereGeometry(0.05, 12, 8), mat.emissive(0x3ddc97, 2), 0.2, -1.3, 0.66);
  g.add(led);
  const cables = [
    tube([V3(-1.9, -0.9, 0.2), V3(-1.2, -1.3, 0.4), V3(-0.35, -1.35, 0.45)], 0.035, mat.dark(0x1d2029)),
    tube([V3(0, -0.95, 0.2), V3(0, -1.1, 0.35), V3(0, -1.15, 0.45)], 0.035, mat.dark(0x1d2029)),
    tube([V3(0.8, 0.3, 0), V3(0.9, -0.8, 0.3), V3(0.35, -1.35, 0.45)], 0.035, mat.dark(0x1d2029))
  ];
  const pulses = cables.map((c) => {
    g.add(c);
    const p = mesh(new THREE.SphereGeometry(0.06, 12, 8), mat.emissive(0xffd166, 3));
    g.add(p);
    return { p, curve: c.userData.curve };
  });
  g.add(label('Battery', V3(-2.0, 0.2, 0), 0.3, '#3ddc97'));
  g.add(label('Fuel cell', V3(0, 0.95, 0), 0.3, '#4fd1ff'));
  g.add(label('Solar panel', V3(2.1, 1.0, 0), 0.3, '#ffd166'));
  g.userData.update = (t) => {
    solar.rotation.x = Math.sin(t * 0.4) * 0.5 - 0.3;
    pulses.forEach((o, i) => o.p.position.copy(o.curve.getPoint(((t * 0.6 + i * 0.33) % 1))));
    drop.position.y = -0.5 - ((t * 0.5) % 1) * 0.4;
    drop.material.opacity = 0.85 * (1 - ((t * 0.5) % 1));
    led.material.emissiveIntensity = 1.5 + Math.sin(t * 6);
  };
  g.userData.startRotY = -0.2;
  return g;
}

// ---------- 5. Communications: dish antenna ----------
function antenna() {
  const g = new THREE.Group();
  const dishGroup = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 30; i++) {
    const r = (i / 30) * 1.3;
    pts.push(V2(r, r * r * 0.28));
  }
  const dish = mesh(new THREE.LatheGeometry(pts, 96), new THREE.MeshStandardMaterial({ color: 0xeef1f7, metalness: 0.35, roughness: 0.35, side: THREE.DoubleSide }));
  dishGroup.add(dish);
  const rim = mesh(new THREE.TorusGeometry(1.3, 0.03, 8, 96), mat.steel(0x9aa1ae), 0, 1.3 * 1.3 * 0.28, 0);
  rim.rotation.x = Math.PI / 2;
  dishGroup.add(rim);
  const f = 1 / (4 * 0.28);
  // feed horn on three struts
  const horn = mesh(new THREE.ConeGeometry(0.12, 0.3, 24, 1, true), new THREE.MeshStandardMaterial({ color: 0xd8ad52, metalness: 1, roughness: 0.3, side: THREE.DoubleSide }), 0, f + 0.1, 0);
  horn.rotation.x = Math.PI;
  dishGroup.add(horn);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const p0 = V3(Math.cos(a) * 1.25, 1.25 * 1.25 * 0.28, Math.sin(a) * 1.25);
    const p1 = V3(0, f + 0.2, 0);
    const strut = tube([p0, p0.clone().lerp(p1, 0.5), p1], 0.02, mat.steel(0xb9c0cc), 8);
    dishGroup.add(strut);
  }
  // back ribs
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rib = mesh(new THREE.BoxGeometry(0.04, 0.08, 1.1), mat.steel(0x8d949f));
    rib.position.set(Math.cos(a) * 0.6, 0.06, Math.sin(a) * 0.6);
    rib.rotation.y = -a + Math.PI / 2;
    dishGroup.add(rib);
  }
  dishGroup.add(mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.25, 24), mat.steel(), 0, -0.05, 0));
  dishGroup.rotation.x = Math.PI / 2 - 0.5;
  dishGroup.position.set(0, 0.5, 0);
  g.add(dishGroup);
  // yoke and base with radio box
  g.add(mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.1, 16), mat.steel(0x9aa1ae), 0, -0.5, -0.1));
  const radio = mesh(new THREE.BoxGeometry(1.4, 0.5, 0.8), mat.dark(0x2f3542), 0, -1.25, 0);
  g.add(radio);
  const leds = [];
  for (let i = 0; i < 4; i++) {
    const l = mesh(new THREE.SphereGeometry(0.045, 10, 8), mat.emissive([0x3ddc97, 0xffd166, 0x4fd1ff, 0xff6b6b][i], 2), -0.45 + i * 0.3, -1.2, 0.41);
    leds.push(l);
    g.add(l);
  }
  // radio waves travelling out of the dish
  const waves = [];
  const axis = new THREE.Vector3(0, 1, 0).applyEuler(dishGroup.rotation).normalize();
  const origin = V3(0, 0.5, 0).add(axis.clone().multiplyScalar(f));
  for (let i = 0; i < 4; i++) {
    const w = mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 64), mat.glow(0x4fd1ff, 0.7));
    w.quaternion.setFromUnitVectors(V3(0, 0, 1), axis);
    waves.push(w);
    g.add(w);
  }
  g.add(label('Dish antenna', V3(-1.6, 1.5, 0), 0.3, '#4fd1ff'));
  g.add(label('Radio', V3(1.3, -1.6, 0), 0.3, '#3ddc97'));
  g.userData.update = (t) => {
    waves.forEach((w, i) => {
      const k = ((t * 0.5 + i / waves.length) % 1);
      w.position.copy(origin).add(axis.clone().multiplyScalar(k * 2.2));
      w.scale.setScalar(0.6 + k * 3);
      w.material.opacity = 0.7 * (1 - k);
    });
    leds.forEach((l, i) => (l.material.emissiveIntensity = 1 + Math.max(0, Math.sin(t * 5 + i * 1.3)) * 2));
  };
  g.userData.startRotY = -0.7;
  return g;
}

// ---------- 6. Life support ----------
function lifeSupport() {
  const g = new THREE.Group();
  const tankMat = mat.steel(0xf0f2f6, 0.25);
  const tA = mesh(new THREE.SphereGeometry(0.42, 40, 24), tankMat, -1.6, 0.55, 0);
  const tB = mesh(new THREE.SphereGeometry(0.42, 40, 24), tankMat, -1.6, -0.45, 0);
  g.add(tA, tB);
  [tA, tB].forEach((t) => {
    const b = mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 40), mat.paint(0x2f7fd8), t.position.x, t.position.y, t.position.z);
    b.rotation.x = Math.PI / 2;
    g.add(b);
  });
  // CO2 scrubber canister with vents
  const ventTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#b9c0cc';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#3a3f4b';
    for (let y = 30; y < h - 30; y += 22) c.fillRect(20, y, w - 40, 8);
  });
  g.add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.0, 40), new THREE.MeshStandardMaterial({ map: ventTex, metalness: 0.7, roughness: 0.4 }), -0.2, -0.45, 0));
  // fan
  const fan = new THREE.Group();
  const fanRing = mesh(new THREE.TorusGeometry(0.32, 0.05, 12, 48), mat.steel(0x8d949f));
  fan.add(fanRing);
  const blades = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const b = mesh(new THREE.BoxGeometry(0.08, 0.28, 0.02), mat.steel(0xd0d4dc));
    b.position.y = 0.15;
    const hold = new THREE.Group();
    hold.rotation.z = (i / 5) * Math.PI * 2;
    b.rotation.y = 0.5;
    hold.add(b);
    blades.add(hold);
  }
  fan.add(blades);
  fan.position.set(-0.2, 0.7, 0);
  g.add(fan);
  // helmet
  const helmet = new THREE.Group();
  helmet.add(mesh(new THREE.SphereGeometry(0.6, 48, 32), new THREE.MeshStandardMaterial({ color: 0xbfe6ff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.35 })));
  const neck = mesh(new THREE.TorusGeometry(0.42, 0.08, 16, 48), mat.steel(0x9aa1ae), 0, -0.5, 0);
  neck.rotation.x = Math.PI / 2;
  helmet.add(neck);
  helmet.position.set(1.4, 0.2, 0);
  g.add(helmet);
  // hoses
  const hoseMat = new THREE.MeshStandardMaterial({ color: 0x3a6fd8, metalness: 0.2, roughness: 0.6 });
  const supply = tube([V3(-1.2, 0.55, 0), V3(-0.8, 1.0, 0.2), V3(-0.2, 1.05, 0.1), V3(0.5, 0.9, 0.2), V3(1.0, 0.4, 0.2)], 0.06, hoseMat);
  const ret = tube([V3(1.1, -0.3, 0.1), V3(0.7, -0.9, 0.3), V3(0.2, -1.1, 0.2), V3(-0.2, -1.0, 0)], 0.06, new THREE.MeshStandardMaterial({ color: 0x8d949f, metalness: 0.2, roughness: 0.6 }));
  g.add(supply, ret);
  const bubbles = [];
  for (let i = 0; i < 6; i++) {
    const o2 = mesh(new THREE.SphereGeometry(0.06, 10, 8), mat.emissive(0x4fd1ff, 2));
    const co2 = mesh(new THREE.SphereGeometry(0.06, 10, 8), mat.emissive(0x9aa1ae, 1));
    g.add(o2, co2);
    bubbles.push({ o2, co2, k: i / 6 });
  }
  g.add(label('Oxygen tanks', V3(-1.6, 1.3, 0), 0.28, '#4fd1ff'));
  g.add(label('Fan', V3(-0.2, 1.45, 0), 0.26, '#ffd166'));
  g.add(label('CO2 scrubber', V3(-0.2, -1.5, 0.3), 0.28, '#9aa4c7'));
  g.add(label('Helmet', V3(1.4, 1.0, 0), 0.28, '#3ddc97'));
  g.userData.update = (t, dt) => {
    blades.rotation.z += dt * 12;
    bubbles.forEach((b) => {
      const k = (t * 0.25 + b.k) % 1;
      b.o2.position.copy(supply.userData.curve.getPoint(k));
      b.co2.position.copy(ret.userData.curve.getPoint(k));
    });
  };
  g.userData.startRotY = -0.25;
  return g;
}

// ---------- 7. Heat shield ----------
function shingleTexture() {
  return canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#343a47';
    c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 24) {
      c.fillStyle = y % 48 ? '#3c4351' : '#2e3440';
      c.fillRect(0, y, w, 22);
      c.fillStyle = 'rgba(255,255,255,0.08)';
      for (let x = 0; x < w; x += 12) c.fillRect(x, y, 2, 22);
    }
  });
}

function heatShield() {
  const g = new THREE.Group();
  const capsule = mesh(new THREE.CylinderGeometry(0.42, 1.0, 1.6, 64, 1, false), new THREE.MeshStandardMaterial({ map: shingleTexture(), metalness: 0.6, roughness: 0.45 }), 0, 0.05, 0);
  g.add(capsule);
  g.add(mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.6, 40), mat.steel(0x5d6475), 0, 1.15, 0));
  const win = mesh(new THREE.PlaneGeometry(0.25, 0.3), new THREE.MeshStandardMaterial({ color: 0x7fd4ff, emissive: 0x225577, emissiveIntensity: 0.6, metalness: 0.2, roughness: 0.1 }), 0, 0.25, 0.73);
  win.rotation.x = -0.35;
  g.add(win);
  const R = 2.2, th = Math.asin(1.03 / R);
  const hexTex = canvasTex(1024, 512, (c, w, h) => {
    const grd = c.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#3a2414');
    grd.addColorStop(1, '#a8672f');
    c.fillStyle = grd;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(20,10,5,0.55)';
    c.lineWidth = 2;
    const s = 14;
    for (let row = 0; row * s * 1.5 < h + s; row++) {
      for (let col = 0; col * s * 1.732 < w + s; col++) {
        const x = col * s * 1.732 + (row % 2) * s * 0.866, y = row * s * 1.5;
        c.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 3) * k + Math.PI / 6;
          const px = x + Math.cos(a) * s, py = y + Math.sin(a) * s;
          if (k) c.lineTo(px, py);
          else c.moveTo(px, py);
        }
        c.closePath();
        c.stroke();
      }
    }
  });
  const shield = mesh(new THREE.SphereGeometry(R, 96, 24, 0, Math.PI * 2, 0, th), new THREE.MeshStandardMaterial({ map: hexTex, bumpMap: hexTex, bumpScale: 1, metalness: 0.1, roughness: 0.85, side: THREE.DoubleSide }));
  shield.rotation.x = Math.PI;
  shield.position.y = -0.75 + R * Math.cos(th);
  g.add(shield);
  // glowing plasma in front of the shield
  const glowShell = mesh(new THREE.SphereGeometry(R * 1.12, 64, 16, 0, Math.PI * 2, 0, th * 1.15), mat.glow(0xff7a2a, 0.35));
  glowShell.rotation.x = Math.PI;
  glowShell.position.y = shield.position.y - 0.06;
  g.add(glowShell);
  const sparks = [];
  for (let i = 0; i < 40; i++) {
    const s = mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.03, 8, 6), mat.glow(i % 2 ? 0xffd166 : 0xff8a3d, 0.9));
    s.userData = { a: Math.random() * Math.PI * 2, k: Math.random(), r: 1.0 + Math.random() * 0.4 };
    g.add(s);
    sparks.push(s);
  }
  g.add(label('Heat shield', V3(1.9, -0.9, 0), 0.3, '#ff9f43'));
  g.add(label('Glowing hot air', V3(-1.9, -1.4, 0), 0.3, '#ffd166'));
  g.userData.update = (t) => {
    glowShell.material.opacity = 0.28 + Math.sin(t * 9) * 0.08 + Math.sin(t * 23) * 0.04;
    sparks.forEach((s) => {
      const d = s.userData;
      const k = (t * 0.6 + d.k) % 1;
      s.position.set(Math.cos(d.a) * d.r * (1 + k * 0.3), -1.1 + k * 3.0, Math.sin(d.a) * d.r * (1 + k * 0.3));
      s.material.opacity = 0.9 * (1 - k);
    });
  };
  g.userData.startRotX = -0.55;
  return g;
}

// ---------- 8. Recovery: parachute ----------
function parachute() {
  const g = new THREE.Group();
  const goreTex = canvasTex(1024, 64, (c, w, h) => {
    const n = 16;
    for (let i = 0; i < n; i++) {
      c.fillStyle = i % 2 ? '#ffffff' : '#ff6f26';
      c.fillRect((i * w) / n, 0, w / n + 1, h);
    }
  });
  const canopyGroup = new THREE.Group();
  const canopy = mesh(new THREE.SphereGeometry(1.7, 64, 20, 0, Math.PI * 2, 0.12, Math.PI * 0.4), new THREE.MeshStandardMaterial({ map: goreTex, roughness: 0.85, metalness: 0, side: THREE.DoubleSide }));
  canopyGroup.add(canopy);
  canopyGroup.position.y = 0.4;
  g.add(canopyGroup);
  // suspension lines
  const rimY = 0.4 + 1.7 * Math.cos(0.12 + Math.PI * 0.4);
  const rimR = 1.7 * Math.sin(0.12 + Math.PI * 0.4);
  const conf = V3(0, -1.9, 0);
  const pts = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    pts.push(V3(Math.cos(a) * rimR, rimY, Math.sin(a) * rimR), conf);
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xdfe5ef })));
  g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([conf, V3(0, -2.3, 0)]), new THREE.LineBasicMaterial({ color: 0xdfe5ef })));
  // capsule hanging below
  const cap = new THREE.Group();
  cap.add(mesh(new THREE.CylinderGeometry(0.24, 0.55, 0.85, 48), new THREE.MeshStandardMaterial({ map: shingleTexture(), metalness: 0.6, roughness: 0.45 })));
  cap.add(mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.3, 32), mat.steel(0x5d6475), 0, 0.55, 0));
  cap.add(mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.08, 48), mat.paint(0x8a4f22), 0, -0.46, 0));
  cap.position.y = -2.9;
  g.add(cap);
  g.add(label('Parachute', V3(2.1, 1.1, 0), 0.3, '#ff9f43'));
  g.add(label('Capsule', V3(1.4, -2.9, 0), 0.3, '#4fd1ff'));
  g.userData.update = (t) => {
    const b = 1 + Math.sin(t * 2.2) * 0.035;
    canopyGroup.scale.set(b, 2 - b, b);
    g.rotation.z = Math.sin(t * 0.9) * 0.06;
  };
  g.userData.startRotX = 0.25;
  return g;
}

// ---------- full spacecraft ----------
function textTexture(bg, fg, text, w = 256, h = 1024) {
  return canvasTex(w, h, (c) => {
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    c.save();
    c.translate(w * 0.25, h / 2);
    c.rotate(-Math.PI / 2);
    c.fillStyle = fg;
    c.font = `800 ${w * 0.16}px Lexend, sans-serif`;
    c.textAlign = 'center';
    c.fillText(text, 0, w * 0.06);
    c.restore();
  });
}

function escapeTower(height, baseR, topR, color = 0xe0452b) {
  const g = new THREE.Group();
  const m = mat.paint(color, 0.5);
  const legs = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    legs.push([V3(Math.cos(a) * baseR, 0, Math.sin(a) * baseR), V3(Math.cos(a) * topR, height, Math.sin(a) * topR)]);
  }
  const bar = (p0, p1, r) => {
    const len = p0.distanceTo(p1);
    const b = mesh(new THREE.CylinderGeometry(r, r, len, 8), m);
    b.position.copy(p0).lerp(p1, 0.5);
    b.quaternion.setFromUnitVectors(V3(0, 1, 0), p1.clone().sub(p0).normalize());
    g.add(b);
  };
  legs.forEach(([p0, p1]) => bar(p0, p1, baseR * 0.06));
  const n = 5;
  for (let k = 0; k < n; k++) {
    const t0 = k / n, t1 = (k + 1) / n;
    for (let i = 0; i < 3; i++) {
      const a = legs[i], b = legs[(i + 1) % 3];
      const pa = a[0].clone().lerp(a[1], t0), pb = b[0].clone().lerp(b[1], t1);
      bar(pa, pb, baseR * 0.035);
    }
  }
  return g;
}

function mercuryRedstone() {
  const g = new THREE.Group();
  const boosterTex = textTexture('#eef1f7', '#1d2029', 'UNITED STATES');
  g.add(mesh(new THREE.CylinderGeometry(0.89, 0.89, 17.3, 48), new THREE.MeshStandardMaterial({ map: boosterTex, metalness: 0.15, roughness: 0.5 }), 0, 8.65, 0));
  const band = mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.25, 48), mat.paint(0x1d2029), 0, 15.2, 0);
  g.add(band);
  for (let i = 0; i < 4; i++) {
    const fin = mesh(new THREE.BoxGeometry(0.08, 2.0, 1.0), mat.paint(0x1d2029));
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    fin.position.set(Math.cos(a) * 1.3, 1.0, Math.sin(a) * 1.3);
    fin.rotation.y = -a;
    g.add(fin);
  }
  const nz = mesh(bell(0.35, 0.6, 0.8, 32), new THREE.MeshStandardMaterial({ color: 0x3b3f4a, metalness: 0.8, roughness: 0.4, side: THREE.DoubleSide }), 0, 0.05, 0);
  g.add(nz);
  // capsule
  g.add(mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.14, 48), mat.paint(0x8a4f22), 0, 17.45, 0));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    g.add(mesh(new THREE.SphereGeometry(0.18, 16, 12), mat.steel(0xd0d4dc), Math.cos(a) * 0.35, 17.3, Math.sin(a) * 0.35));
  }
  g.add(mesh(new THREE.CylinderGeometry(0.4, 0.945, 1.9, 48), new THREE.MeshStandardMaterial({ map: shingleTexture(), metalness: 0.6, roughness: 0.45 }), 0, 18.47, 0));
  g.add(mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.8, 32), mat.steel(0x5d6475), 0, 19.8, 0));
  const tower = escapeTower(3.3, 0.45, 0.16);
  tower.position.y = 20.2;
  g.add(tower);
  g.add(mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.4, 24), mat.paint(0xdfe3ea, 0.4), 0, 24.2, 0));
  g.add(mesh(new THREE.ConeGeometry(0.2, 0.6, 24), mat.paint(0xdfe3ea, 0.4), 0, 25.2, 0));
  g.userData.startRotX = 0.05;
  g.userData.distance = 1;
  return g;
}

function explorer1() {
  const g = new THREE.Group();
  const stripeTex = canvasTex(64, 512, (c, w, h) => {
    c.fillStyle = '#eef1f7';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#23324f';
    for (let i = 0; i < 8; i++) c.fillRect(0, (i + 0.3) * (h / 8), w, h / 20);
  });
  const body = new THREE.Group();
  body.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 32), new THREE.MeshStandardMaterial({ map: stripeTex, metalness: 0.3, roughness: 0.4 }), 0, 0.55, 0));
  body.add(mesh(new THREE.ConeGeometry(0.08, 0.3, 32), mat.steel(0xeef1f7, 0.3), 0, 1.1, 0));
  body.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.85, 32), mat.steel(0x9aa1ae, 0.35), 0, -0.28, 0));
  body.add(mesh(bell(0.04, 0.07, 0.12, 24), new THREE.MeshStandardMaterial({ color: 0x4a4f5c, metalness: 0.8, roughness: 0.4, side: THREE.DoubleSide }), 0, -0.7, 0));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const whip = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.56, 6), mat.steel(0xdfe5ef, 0.3));
    const dir = V3(Math.cos(a), -0.35, Math.sin(a)).normalize();
    whip.position.set(Math.cos(a) * 0.08, 0.15, Math.sin(a) * 0.08).add(dir.clone().multiplyScalar(0.28));
    whip.quaternion.setFromUnitVectors(V3(0, 1, 0), dir);
    body.add(whip);
  }
  body.rotation.z = -0.9;
  g.add(body);
  g.userData.update = (t, dt) => {
    body.rotateY(dt * 3);
  };
  g.userData.distance = 1;
  return g;
}

function saturnV() {
  const g = new THREE.Group();
  const s1Tex = canvasTex(512, 1024, (c, w, h) => {
    c.fillStyle = '#eef1f7';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1d2029';
    for (let q = 0; q < 4; q += 2) c.fillRect((q * w) / 4, h * 0.55, w / 4, h * 0.45);
    c.fillRect(0, 0, w, h * 0.03);
    c.save();
    c.translate(w * 0.62, h * 0.3);
    c.rotate(-Math.PI / 2);
    c.font = '800 70px Lexend, sans-serif';
    c.textAlign = 'center';
    c.fillText('USA', 0, 0);
    c.restore();
  });
  const s2Tex = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#eef1f7';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1d2029';
    c.fillRect(0, 0, w, h * 0.04);
  });
  const s4Tex = canvasTex(512, 512, (c, w, h) => {
    c.fillStyle = '#eef1f7';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#1d2029';
    for (let q = 0; q < 4; q += 2) c.fillRect((q * w) / 4, h * 0.7, w / 4, h * 0.3);
  });
  const white = () => mat.paint(0xeef1f7, 0.5);
  let y = 0;
  const stack = (geo, material, h) => {
    g.add(mesh(geo, material, 0, y + h / 2, 0));
    y += h;
  };
  // F-1 engines
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x2c2f37, metalness: 0.8, roughness: 0.4, side: THREE.DoubleSide });
  [[0, 0], [2.6, 0], [-2.6, 0], [0, 2.6], [0, -2.6]].forEach(([x, z]) => g.add(mesh(bell(0.6, 1.8, 5, 32), engineMat, x, 0, z)));
  y = 0.3;
  stack(new THREE.CylinderGeometry(5, 5, 42, 64), new THREE.MeshStandardMaterial({ map: s1Tex, metalness: 0.15, roughness: 0.5 }), 42);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const fin = mesh(new THREE.BoxGeometry(0.3, 5, 3), mat.paint(0x1d2029));
    fin.position.set(Math.cos(a) * 6.2, 2.5, Math.sin(a) * 6.2);
    fin.rotation.y = -a;
    g.add(fin);
  }
  stack(new THREE.CylinderGeometry(5, 5, 5.5, 64), mat.paint(0xc8ccd5), 5.5);
  stack(new THREE.CylinderGeometry(5, 5, 24.9, 64), new THREE.MeshStandardMaterial({ map: s2Tex, metalness: 0.15, roughness: 0.5 }), 24.9);
  stack(new THREE.CylinderGeometry(3.3, 5, 5.5, 64), white(), 5.5);
  stack(new THREE.CylinderGeometry(3.3, 3.3, 17.8, 64), new THREE.MeshStandardMaterial({ map: s4Tex, metalness: 0.15, roughness: 0.5 }), 17.8);
  stack(new THREE.CylinderGeometry(3.3, 3.3, 0.9, 64), mat.steel(0x9aa1ae), 0.9);
  stack(new THREE.CylinderGeometry(1.95, 3.3, 8.5, 64), white(), 8.5);
  stack(new THREE.CylinderGeometry(1.95, 1.95, 7.5, 64), mat.steel(0xd7dbe3, 0.3), 7.5);
  stack(new THREE.CylinderGeometry(0.4, 1.95, 3.2, 64), mat.paint(0xf2f3f6, 0.35), 3.2);
  const tower = escapeTower(6, 0.8, 0.35, 0xc9452f);
  tower.position.y = y;
  g.add(tower);
  y += 6;
  g.add(mesh(new THREE.CylinderGeometry(0.4, 0.4, 3.5, 24), mat.paint(0xdfe3ea, 0.4), 0, y + 1.75, 0));
  g.add(mesh(new THREE.ConeGeometry(0.4, 1.2, 24), mat.paint(0xdfe3ea, 0.4), 0, y + 4.1, 0));
  g.userData.startRotX = 0.05;
  g.userData.distance = 1;
  return g;
}

const BUILDERS = { engine, gyroscope, thrusters, power, antenna, lifeSupport, heatShield, parachute, mercuryRedstone, explorer1, saturnV };

export function buildModel(name) {
  const fn = BUILDERS[name] || engine;
  return fn();
}
