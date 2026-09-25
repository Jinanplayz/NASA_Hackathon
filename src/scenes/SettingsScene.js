import Phaser from 'phaser';
import { W, H, RES, COLORS, CSS } from '../core/constants.js';
import { Content } from '../core/Content.js';
import { Settings } from '../core/Settings.js';
import { Progress } from '../core/Progress.js';
import { Speech } from '../core/Speech.js';
import { Sfx } from '../core/Sfx.js';
import { FocusManager } from '../ui/Focus.js';
import { txt } from '../ui/text.js';
import { Button } from '../ui/Button.js';
import { panel, Toggle, Slider } from '../ui/widgets.js';

// Accessibility & sound settings.
export class SettingsScene extends Phaser.Scene {
  constructor() {
    super('Settings');
  }

  init(data) {
    this.from = data.from;
  }

  create() {
    const cam = this.cameras.main;
    cam.setZoom(RES);
    cam.centerOn(W / 2, H / 2);
    this.focus = new FocusManager(this);
    const L = (k, f) => Content.ui(k, f);

    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setInteractive();
    const pw = 1000, ph = 640;
    const x0 = W / 2 - pw / 2, y0 = H / 2 - ph / 2;
    panel(this, x0, y0, pw, ph, { stroke: COLORS.cyan, strokeWidth: 3, radius: 28 });
    txt(this, W / 2, y0 + 44, L('settings', 'Settings'), { size: 38, weight: 800, origin: 0.5, color: CSS.yellow, scale: false });

    const row = (col, i, label, hint) => {
      const x = col === 0 ? x0 + 50 : x0 + pw / 2 + 30;
      const y = y0 + 116 + i * 82;
      txt(this, x, y - 16, label, { size: 22, weight: 700, scale: false });
      if (hint) txt(this, x, y + 12, hint, { size: 15, color: CSS.dim, scale: false, wrap: 300 });
      return { x: x + (col === 0 ? 400 : 380), y };
    };

    // left column
    let p = row(0, 0, L('readAloud', 'Read text aloud'), L('readAloudHint', 'A voice reads every message'));
    new Toggle(this, p.x, p.y, Settings.get('readAloud'), (v) => {
      Settings.set('readAloud', v);
      if (v) Speech.say(L('readAloudOn', 'Read aloud is on.'));
      else Speech.stop();
    });

    p = row(0, 1, L('voiceSpeed', 'Voice speed'));
    const speeds = [
      { label: L('slow', 'Slow'), v: 0.8 },
      { label: L('normal', 'Normal'), v: 1 },
      { label: L('fast', 'Fast'), v: 1.2 }
    ];
    const speedBtns = speeds.map((s, i) =>
      new Button(this, p.x - 200 + i * 100, p.y, {
        width: 92,
        height: 48,
        size: 17,
        label: s.label,
        variant: Math.abs(Settings.get('voiceRate') - s.v) < 0.01 ? 'primary' : 'secondary',
        onClick: () => {
          Settings.set('voiceRate', s.v);
          speedBtns.forEach((b, k) => b.setVariant(k === i ? 'primary' : 'secondary'));
          Speech.say(L('voiceTest', 'This is how fast I will talk.'));
        }
      })
    );

    p = row(0, 2, L('music', 'Music volume'));
    new Slider(this, p.x - 100, p.y, 200, Settings.get('musicVolume'), (v) => Settings.set('musicVolume', v));

    p = row(0, 3, L('sound', 'Sound effects'));
    new Slider(this, p.x - 100, p.y, 200, Settings.get('sfxVolume'), (v) => {
      Settings.set('sfxVolume', v);
      Sfx.play('pickup');
    });

    p = row(0, 4, L('sharpGraphics', 'Sharp graphics'), L('sharpGraphicsHint', 'Clearest picture. Turn off if the game feels slow.'));
    new Toggle(this, p.x, p.y, Settings.get('sharp') !== false, (v) => Settings.set('sharp', v));

    // right column
    p = row(1, 0, L('largeText', 'Bigger text'), L('largeTextHint', 'Makes reading text larger'));
    new Toggle(this, p.x, p.y, Settings.get('largeText'), (v) => Settings.set('largeText', v));

    p = row(1, 1, L('reducedMotion', 'Calm motion'), L('reducedMotionHint', 'No screen shaking or fast flashing'));
    new Toggle(this, p.x, p.y, Settings.get('reducedMotion'), (v) => Settings.set('reducedMotion', v));

    p = row(1, 2, L('relaxed', 'Relaxed mode'), L('relaxedHint', 'Mini-games are slower and easier'));
    new Toggle(this, p.x, p.y, Settings.get('relaxed'), (v) => Settings.set('relaxed', v));

    p = row(1, 3, L('resetProgress', 'Reset progress'), L('resetHint', 'Forget finished activities'));
    const resetBtn = new Button(this, p.x - 30, p.y, {
      width: 140,
      height: 48,
      size: 18,
      label: L('reset', 'Reset'),
      variant: 'danger',
      onClick: () => {
        Progress.reset();
        resetBtn.setLabel(L('resetDone', 'Done!')).setEnabled(false);
      }
    });

    txt(this, W / 2, y0 + ph - 118, L('settingsNote', 'Changes to text size apply to the next screen.'), { size: 15, color: CSS.dim, origin: 0.5, scale: false });
    new Button(this, W / 2, y0 + ph - 60, { width: 260, height: 62, label: L('close', 'Close'), icon: 'check', onClick: () => this.close() });
    this.input.keyboard.on('keydown-ESC', () => this.close());
  }

  close() {
    this.scene.stop();
    this.scene.resume(this.from);
  }
}
