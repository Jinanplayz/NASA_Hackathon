import { W, H, COLORS, CSS, DEPTH } from '../core/constants.js';
import { Content } from '../core/Content.js';
import { Flow } from '../core/Flow.js';
import { BaseScene } from './BaseScene.js';
import { starfield } from './common/bg.js';
import { img } from '../art/core.js';
import { txt } from '../ui/text.js';
import { Button, iconButton } from '../ui/Button.js';

export class TitleScene extends BaseScene {
  constructor() {
    super('Title');
  }

  create() {
    this.setupStage({ hud: false });
    const g = Content.game;
    starfield(this, { count: 220 });

    // Earth rising at the bottom
    const earth = img(this, W / 2, H + 250, 'earthBig', 1.25).setAngle(115);
    this.tweens.add({ targets: earth, angle: 135, duration: 30000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Moon in the corner
    img(this, 1120, 140, 'moonSmall', 1.1);

    // rocket flying across
    const rocket = img(this, 180, 470, 'freedom7', 0.8).setAngle(25);
    const trail = this.add.particles(0, 0, 'softDot', {
      speed: { min: 10, max: 40 },
      lifespan: 900,
      scale: { start: 0.25, end: 0 },
      alpha: { start: 0.6, end: 0 },
      tint: [0xffd166, 0xff9f43, 0xffffff],
      blendMode: 'ADD',
      frequency: 30,
      follow: rocket,
      followOffset: { x: -35, y: 70 }
    });
    trail.setDepth(1);
    this.tweens.add({ targets: rocket, x: 260, y: 430, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Title
    const title = txt(this, W / 2, 150, g.title || 'Star Sailors', { size: 92, weight: 800, origin: 0.5, color: CSS.text, scale: false, shadow: true });
    title.setDepth(DEPTH.ui);
    const sub = txt(this, W / 2, 230, g.subtitle || '', { size: 26, weight: 600, origin: 0.5, color: CSS.cyan, scale: false, align: 'center', wrap: 900 });
    sub.setDepth(DEPTH.ui);
    this.tweens.add({ targets: title, y: 142, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const start = new Button(this, W / 2, 360, {
      width: 360,
      height: 76,
      size: 30,
      label: Content.ui('start', 'Start the Journey'),
      icon: 'play',
      onClick: () => Flow.chapters(this)
    });
    start.setDepth(DEPTH.ui).pulse();

    new Button(this, W / 2 - 135, 455, {
      width: 250,
      height: 60,
      label: Content.ui('settings', 'Settings'),
      icon: 'sliders',
      variant: 'secondary',
      onClick: () => this.openSettings()
    }).setDepth(DEPTH.ui);
    new Button(this, W / 2 + 135, 455, {
      width: 250,
      height: 60,
      label: Content.ui('fullscreen', 'Full screen'),
      icon: 'fullscreen',
      variant: 'secondary',
      onClick: () => this.toggleFullscreen()
    }).setDepth(DEPTH.ui);

    const credit = txt(this, W / 2, H - 22, g.credit || '', { size: 15, origin: 0.5, color: '#dfe6ff', scale: false, align: 'center', stroke: '#070b1d', strokeThickness: 5 });
    credit.setDepth(DEPTH.ui);

    iconButton(this, W - 44, 40, 'sliders', () => this.openSettings()).setDepth(DEPTH.ui);
  }

  openSettings() {
    if (this.scene.isActive('Settings')) return;
    this.scene.launch('Settings', { from: 'Title' });
    this.scene.pause();
  }

  toggleFullscreen() {
    if (this.scale.isFullscreen) {
      this.scale.stopFullscreen();
    } else {
      this.scale.startFullscreen();
      try {
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {});
      } catch {
        /* not supported */
      }
    }
  }
}
