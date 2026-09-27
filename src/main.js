import Phaser from 'phaser';
import '@fontsource/lexend/400.css';
import '@fontsource/lexend/600.css';
import '@fontsource/lexend/700.css';
import '@fontsource/lexend/800.css';
import '@fontsource/fredoka/700.css';
import './style.css';

import { VIEW, computeRes } from './core/constants.js';
import { Content } from './core/Content.js';
import { keepSharp } from './core/Display.js';
import { ALL_SCENES } from './scenes/index.js';

function showError(err) {
  console.error(err);
  const box = document.getElementById('loading');
  box.classList.remove('hidden');
  box.innerHTML = '';
  const title = document.createElement('p');
  title.textContent = 'Oops! The game could not start.';
  title.style.color = '#ff6b6b';
  title.style.fontSize = '22px';
  const pre = document.createElement('div');
  pre.className = 'error-box';
  pre.textContent = String(err && err.message ? err.message : err);
  box.append(title, pre);
}

async function boot() {
  computeRes();

  // Wait for the font so text is measured correctly from the start.
  try {
    await Promise.race([
      Promise.all(['400', '600', '700', '800'].map((w) => document.fonts.load(`${w} 24px Lexend`)).concat(document.fonts.load('700 24px Fredoka'))),
      new Promise((r) => setTimeout(r, 3000))
    ]);
  } catch {
    /* fall back to system fonts */
  }

  await Content.load();
  document.title = Content.game.title || document.title;

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: VIEW.w,
    height: VIEW.h,
    backgroundColor: '#070b1d',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      // Full screen must include the videos, photos and 3D views that sit on top of the canvas.
      // (Without this, Phaser puts only the canvas in full screen and they disappear.)
      fullscreenTarget: 'app'
    },
    dom: { createContainer: true },
    input: { activePointers: 3, keyboard: { target: window } },
    render: { antialias: true, powerPreference: 'high-performance' },
    audio: { noAudio: true },
    banner: false,
    // ?testloop keeps the game running in hidden/background tabs (used for automated testing)
    fps: new URLSearchParams(window.location.search).has('testloop') ? { forceSetTimeOut: true, target: 60 } : {},
    scene: ALL_SCENES
  });
  window.__game = game;
  keepSharp(game);
}

boot().catch(showError);
window.addEventListener('error', (e) => {
  console.error('[game error]', e.error && e.error.stack ? e.error.stack : e.message);
  if (!window.__game) showError(e.error || e.message);
});
