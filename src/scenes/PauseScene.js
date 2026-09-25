import Phaser from 'phaser';
import { W, H, RES, COLORS, CSS } from '../core/constants.js';
import { Content } from '../core/Content.js';
import { Flow } from '../core/Flow.js';
import { FocusManager } from '../ui/Focus.js';
import { txt } from '../ui/text.js';
import { Button } from '../ui/Button.js';
import { panel } from '../ui/widgets.js';

// Pause menu shown on top of any activity.
export class PauseScene extends Phaser.Scene {
  constructor() {
    super('Pause');
  }

  init(data) {
    this.from = data.from;
  }

  create() {
    const cam = this.cameras.main;
    cam.setZoom(RES);
    cam.centerOn(W / 2, H / 2);
    this.focus = new FocusManager(this);
    const under = this.scene.get(this.from);

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.65).setInteractive();
    const pw = 520, ph = 560;
    panel(this, W / 2 - pw / 2, H / 2 - ph / 2, pw, ph, { stroke: COLORS.cyan, strokeWidth: 3, radius: 28 });
    txt(this, W / 2, H / 2 - ph / 2 + 50, Content.ui('paused', 'Paused'), { size: 40, weight: 800, origin: 0.5, color: CSS.yellow, scale: false });

    const inActivity = under && under.payload && under.payload.chapterId;
    const items = [
      { label: Content.ui('resume', 'Resume'), icon: 'play', variant: 'primary', fn: () => this.resume() },
      { label: Content.ui('settings', 'Settings'), icon: 'sliders', variant: 'secondary', fn: () => this.openSettings() }
    ];
    if (inActivity) {
      items.push({ label: Content.ui('restart', 'Restart activity'), icon: 'restart', variant: 'secondary', fn: () => this.leave(() => Flow.restart(under)) });
      items.push({ label: Content.ui('skip', 'Skip activity'), icon: 'skip', variant: 'secondary', fn: () => this.leave(() => Flow.skip(under)) });
      items.push({ label: Content.ui('chapters', 'Chapter menu'), icon: 'menu', variant: 'secondary', fn: () => this.leave(() => Flow.chapters(under, under.chapterId)) });
    }
    items.push({ label: Content.ui('home', 'Home'), icon: 'home', variant: 'ghost', fn: () => this.leave(() => Flow.home(under)) });

    const top = H / 2 - ph / 2 + 115;
    const gap = Math.min(74, (ph - 140) / items.length);
    items.forEach((it, i) => {
      new Button(this, W / 2, top + i * gap, { width: 380, height: 60, label: it.label, icon: it.icon, variant: it.variant, onClick: it.fn });
    });

    this.input.keyboard.on('keydown-ESC', () => this.resume());
  }

  resume() {
    this.scene.stop();
    this.scene.resume(this.from);
  }

  leave(fn) {
    // Resume the paused activity first so it can transition away normally.
    this.scene.resume(this.from);
    this.scene.stop();
    fn();
  }

  openSettings() {
    this.scene.launch('Settings', { from: 'Pause' });
    this.scene.pause();
  }
}
