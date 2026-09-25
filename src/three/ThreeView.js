// A three.js viewport placed inside a Phaser scene (as a transparent DOM canvas on top).
// Phaser handles all input and tells the view how to rotate/zoom.

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { W, clamp } from '../core/constants.js';
import { buildModel } from './models.js';

let renderer = null;
let envTexture = null;
let failed = false;

function getRenderer() {
  if (renderer || failed) return renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
    const pmrem = new THREE.PMREMGenerator(renderer);
    envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
  } catch (e) {
    console.warn('3D view not available on this device:', e);
    failed = true;
    renderer = null;
  }
  return renderer;
}

function disposeObject(obj) {
  obj.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        ['map', 'bumpMap', 'emissiveMap', 'roughnessMap', 'alphaMap'].forEach((k) => m[k] && m[k].dispose());
        m.dispose();
      });
    }
  });
}

export class ThreeView {
  constructor(phaserScene, x, y, w, h, o = {}) {
    this.scene = phaserScene;
    this.w = w;
    this.h = h;
    this.renderer = getRenderer();
    this.ok = !!this.renderer;
    if (!this.ok) return;

    this.s3 = new THREE.Scene();
    this.s3.environment = envTexture;
    this.camera = new THREE.PerspectiveCamera(o.fov ?? 32, w / h, 0.05, 200);

    const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x2a2238, 0.9);
    const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
    key.position.set(4, 6, 5);
    const rim = new THREE.DirectionalLight(0x7fc4ff, 1.6);
    rim.position.set(-5, 2, -4);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-3, -2, 5);
    this.s3.add(hemi, key, rim, fill);

    this.pivot = new THREE.Group();
    this.s3.add(this.pivot);

    // The model eases towards the target angle/zoom, so dragging feels smooth
    // even when touch events arrive unevenly. A flick keeps it spinning for a moment.
    this.rotY = this.tRotY = o.rotY ?? -0.5;
    this.rotX = this.tRotX = o.rotX ?? 0.18;
    this.spinY = 0; // radians per second
    this.spinX = 0;
    this.zoom = this.tZoom = 1;
    this.dragging = false;
    this.lastDrag = 0;
    this.autoRotate = o.autoRotate ?? 0.25;
    this.idle = 0;
    this.time = 0;

    const div = document.createElement('div');
    div.className = 'three-frame';
    div.style.width = w + 'px';
    div.style.height = h + 'px';
    div.appendChild(this.renderer.domElement);
    this.div = div;
    this.dom = phaserScene.addDom(x, y, div);

    this.onResize = () => this.resize();
    phaserScene.scale.on('resize', this.onResize);
    this.resize();
  }

  resize() {
    if (!this.ok) return;
    const scale = this.scene.scale.displaySize.width / W;
    const pr = Math.min(3, Math.max(1, scale * (window.devicePixelRatio || 1)));
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(this.w, this.h, true);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
  }

  setModel(name) {
    if (!this.ok) return;
    if (this.model) {
      this.pivot.remove(this.model);
      disposeObject(this.model);
    }
    const model = buildModel(name);
    this.model = model;
    // centre the model and frame it with the camera (name tags don't count)
    model.updateMatrixWorld(true);
    const box = new THREE.Box3();
    model.traverse((o) => {
      if ((o.isMesh || o.isLine) && !o.userData.isLabel) box.expandByObject(o, false);
    });
    if (box.isEmpty()) box.setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.sub(center);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    this.radius = sphere.radius;
    this.pivot.add(model);
    this.zoom = this.tZoom = 1;
    this.rotY = this.tRotY = model.userData.startRotY ?? -0.5;
    this.rotX = this.tRotX = model.userData.startRotX ?? 0.18;
    this.spinY = this.spinX = 0;
    this.frame();
    // pop-in animation
    this.pivot.scale.setScalar(0.6);
    this.popT = 0;
  }

  frame() {
    const fov = (this.camera.fov * Math.PI) / 180;
    const fitH = this.radius / Math.tan(fov / 2);
    const fitW = this.radius / (Math.tan(fov / 2) * this.camera.aspect);
    const dist = Math.max(fitH, fitW) * 1.12 * this.zoom * (this.model?.userData.distance ?? 1);
    this.camera.position.set(0, 0, dist);
    this.camera.lookAt(0, 0, 0);
    this.camera.near = dist / 100;
    this.camera.far = dist * 10;
    this.camera.updateProjectionMatrix();
  }

  // finger/mouse pressed on the model
  grab() {
    this.dragging = true;
    this.spinY = this.spinX = 0;
    this.lastDrag = performance.now();
    this.idle = 0;
  }

  drag(dx, dy) {
    const t = performance.now();
    const dt = clamp((t - this.lastDrag) / 1000, 0.008, 0.1);
    this.lastDrag = t;
    this.nudge(dx, dy);
    // remember how fast it was moving, for the glide after letting go
    this.spinY += ((dx * 0.012) / dt - this.spinY) * 0.5;
    this.spinX += ((dy * 0.008) / dt - this.spinX) * 0.5;
  }

  // turn by a fixed amount (arrow keys)
  nudge(dx, dy) {
    this.tRotY += dx * 0.012;
    this.tRotX = clamp(this.tRotX + dy * 0.008, -1.2, 1.2);
    this.idle = 0;
  }

  release() {
    if (!this.dragging) return;
    this.dragging = false;
    // holding still before letting go means no glide
    if (performance.now() - this.lastDrag > 90) this.spinY = this.spinX = 0;
    this.spinY = clamp(this.spinY, -6, 6);
    this.spinX = clamp(this.spinX, -4, 4);
  }

  zoomBy(f) {
    this.tZoom = clamp(this.tZoom * f, 0.45, 1.8);
    this.idle = 0;
  }

  resetView() {
    this.tZoom = 1;
    this.tRotX = 0.18;
  }

  update(dtMs) {
    if (!this.ok || !this.model) return;
    const dt = Math.min(0.05, dtMs / 1000);
    this.time += dt;
    if (!this.dragging) {
      this.idle += dt;
      // glide after a flick, slowing down smoothly
      this.tRotY += this.spinY * dt;
      this.tRotX = clamp(this.tRotX + this.spinX * dt, -1.2, 1.2);
      this.spinY *= Math.exp(-dt * 4);
      this.spinX *= Math.exp(-dt * 5);
      // gentle auto-spin, easing in when the player is not touching it
      if (this.idle > 1.5) this.tRotY += this.autoRotate * Math.min(1, this.idle - 1.5) * dt;
    }
    const k = 1 - Math.exp(-dt * 16);
    this.rotY += (this.tRotY - this.rotY) * k;
    this.rotX += (this.tRotX - this.rotX) * k;
    if (Math.abs(this.tZoom - this.zoom) > 0.0005) {
      this.zoom += (this.tZoom - this.zoom) * (1 - Math.exp(-dt * 12));
      this.frame();
    }
    this.pivot.rotation.set(this.rotX, this.rotY, 0);
    if (this.popT < 1) {
      this.popT = Math.min(1, this.popT + dt * 3);
      const e = 1 - Math.pow(1 - this.popT, 3);
      this.pivot.scale.setScalar(0.6 + 0.4 * e);
    }
    if (this.model.userData.update) this.model.userData.update(this.time, dt);
    this.renderer.render(this.s3, this.camera);
  }

  setVisible(v) {
    if (this.dom) this.scene.setDomVisible(this.dom, v);
  }

  destroy() {
    if (!this.ok) return;
    this.scene.scale.off('resize', this.onResize);
    if (this.model) {
      this.pivot.remove(this.model);
      disposeObject(this.model);
      this.model = null;
    }
    if (this.renderer.domElement.parentNode === this.div) this.div.removeChild(this.renderer.domElement);
    this.renderer.clear();
  }
}
