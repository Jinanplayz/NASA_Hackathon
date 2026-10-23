import Phaser from 'phaser';
import { buildAllArt } from '../art/index.js';
import { Content } from '../core/Content.js';
import { Flow } from '../core/Flow.js';
import { loadThree } from '../three/loader.js';

// Paints all textures, then opens the title screen.
// Testers can jump straight to an activity with ?chapter=scene3&step=4 in the address bar.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    const label = document.getElementById('loading-text');
    if (label) label.textContent = 'Painting the stars…';
    // let the loading text render before the (short) painting work
    this.time.delayedCall(30, () => {
      buildAllArt(this);
      const loading = document.getElementById('loading');
      if (loading) {
        loading.classList.add('hidden');
        setTimeout(() => loading.classList.contains('hidden') && loading.classList.add('gone'), 700);
      }
      // fetch the 3D viewer in the background so it's ready before the first 3D screen
      setTimeout(loadThree, 1500);

      const params = new URLSearchParams(window.location.search);
      const ch = params.get('chapter');
      if (ch && Content.chapter(ch)) {
        Flow.start(this, ch, Number(params.get('step') || 0));
      } else {
        this.scene.start('Title');
      }
    });
  }
}
