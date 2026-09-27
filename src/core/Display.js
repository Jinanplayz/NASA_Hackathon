// Keeps the picture sharp and filling the screen.
//  - The canvas takes the screen's shape (extra background shows around the 1280 x 720 stage on
//    wider or taller screens) and has as many pixels as the part of the screen it covers (see
//    computeRes). It is resized when the window changes size, goes full screen, or moves to a
//    screen with a different pixel density (or the browser zoom changes).
//  - Text is drawn on whole screen pixels. Phaser only does this when the zoom is a whole
//    number, and a text that sits half a pixel off looks slightly blurry.

import Phaser from 'phaser';
import { W, H, RES, VIEW, computeRes } from './constants.js';
import { Settings } from './Settings.js';

const Text = Phaser.GameObjects.Text;
const renderText = Text.prototype.renderWebGL;
Text.prototype.renderWebGL = function (renderer, src, camera, parentMatrix) {
  const snap = camera.renderRoundPixels;
  camera.renderRoundPixels = true;
  renderText.call(this, renderer, src, camera, parentMatrix);
  camera.renderRoundPixels = snap;
};

// Re-draws every text of a screen at the new resolution.
function sharpenTexts(list) {
  for (const o of list) {
    if (o instanceof Text && o.style.resolution !== RES) o.setResolution(RES);
    if (o.list) sharpenTexts(o.list);
  }
}

export function keepSharp(game) {
  let timer = null;

  const apply = () => {
    const before = [VIEW.w, VIEW.h, RES];
    computeRes();
    if (VIEW.w === before[0] && VIEW.h === before[1] && Math.abs(RES - before[2]) < 0.005) return;
    game.scale.setGameSize(VIEW.w, VIEW.h);
    const { RUNNING, PAUSED, SLEEPING } = Phaser.Scenes;
    for (const scene of game.scene.scenes) {
      const status = scene.sys.settings.status;
      if (status !== RUNNING && status !== PAUSED && status !== SLEEPING) continue;
      scene.cameras.main.setZoom(RES).centerOn(W / 2, H / 2);
      sharpenTexts(scene.sys.displayList.list);
    }
  };
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(apply, 150);
  };

  // window resized, full screen, phone rotated... (Phaser notices all of these)
  game.scale.on('resize', later);
  // pixel density changes: browser zoom, or dragging the window to another monitor
  const watchDensity = () => {
    const mq = window.matchMedia?.(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    if (!mq || !mq.addEventListener) return;
    mq.addEventListener(
      'change',
      () => {
        later();
        watchDensity();
      },
      { once: true }
    );
  };
  watchDensity();
  Settings.on((key) => key === 'sharp' && apply());
}
