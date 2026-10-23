import { W, COLORS, CSS, DEPTH } from '../core/constants.js';
import { Content } from '../core/Content.js';
import { Settings } from '../core/Settings.js';
import { Speech } from '../core/Speech.js';
import { txt } from './text.js';
import { Button, iconButton } from './Button.js';
import { toast } from './widgets.js';
import { bake, RoundBox } from './paint.js';

// Top bar: chapter + activity name on the left, step dots, and quick buttons on the right.
export class Hud {
  constructor(scene, o = {}) {
    this.scene = scene;
    this.root = scene.add.container(0, 0).setDepth(DEPTH.hud);
    const ch = o.chapterId ? Content.chapter(o.chapterId) : null;
    const steps = ch ? ch.steps : [];
    const stepName = o.title ?? (ch && steps[o.stepIndex] ? steps[o.stepIndex].name : '');
    const chapterLabel = ch ? (ch._meta.short || ch.title || '').toUpperCase() : '';

    const label = txt(scene, 30, 16, chapterLabel, { size: 14, weight: 700, color: CSS.cyan, scale: false });
    const name = txt(scene, 30, 34, stepName, { size: 20, weight: 700, scale: false });
    const pillW = Math.max(label.width, name.width) + 40;
    const pill = new RoundBox(scene).draw(10, 8, pillW, 56, { fill: 0x070b1d, alpha: 0.72, radius: 18, strokeAlpha: 0.9, shadow: false });
    this.root.add([pill, label, name]);

    // step dots
    if (steps.length && o.showSteps !== false) {
      const dots = scene.add.graphics();
      const n = steps.length;
      const gap = Math.min(20, 300 / n);
      const startX = 10 + pillW + 20;
      dots.fillStyle(0x070b1d, 0.6);
      dots.fillRoundedRect(startX - 12, 26, gap * (n - 1) + 24, 20, 10);
      for (let i = 0; i < n; i++) {
        const done = i < o.stepIndex;
        const cur = i === o.stepIndex;
        dots.fillStyle(cur ? COLORS.yellow : done ? COLORS.green : 0x3a4470, 1);
        dots.fillCircle(startX + i * gap, 36, cur ? 7 : 5);
      }
      this.root.add(dots);
      bake(scene, dots, startX - 16, 22, gap * (n - 1) + 32, 28);
    }

    // right-side buttons
    const menuBtn = iconButton(scene, W - 44, 38, 'menu', () => scene.openPause && scene.openPause());
    // Read-aloud on/off, with a small "VOICE" caption so it's clear this is Captain Nova's voice
    // (not the music or sound effects).
    this.voiceBtn = new Button(scene, W - 110, 38, {
      width: 58,
      height: 58,
      icon: Settings.get('readAloud') ? 'speaker' : 'speakerOff',
      iconSize: 22,
      variant: 'ghost',
      radius: 16,
      onClick: () => {
        const on = !Settings.get('readAloud');
        Settings.set('readAloud', on);
        if (on) Speech.say(Content.ui('readAloudOn', 'Read aloud is on.'));
        else Speech.stop();
        toast(scene, on ? Content.ui('readAloudOn', 'Read aloud is on.') : Content.ui('readAloudOff', 'Read aloud is off.'), { y: 96, duration: 1800, sound: false, size: 18 });
      }
    });
    this.voiceBtn.iconG.y = -8;
    this.voiceCaption = txt(scene, 0, 17, Content.ui('voiceLabel', 'Voice').toUpperCase(), { size: 11, weight: 800, origin: 0.5, color: CSS.cyan, scale: false });
    this.voiceBtn.add(this.voiceCaption);
    const showVoice = (on) => {
      this.voiceBtn.setIcon(on ? 'speaker' : 'speakerOff');
      this.voiceCaption.setColor(on ? CSS.cyan : CSS.dim);
    };
    showVoice(Settings.get('readAloud'));
    this.unsub = Settings.on((k, v) => {
      if (k === 'readAloud' && this.voiceBtn.active) showVoice(v);
    });
    // (above Captain Nova's dimmed backdrop, so the menu and voice buttons always work)
    menuBtn.setDepth(DEPTH.guide + 2);
    this.voiceBtn.setDepth(DEPTH.guide + 2);
    this.buttons = [menuBtn, this.voiceBtn];
    scene.events.once('shutdown', () => this.unsub());
  }

  setVisible(v) {
    this.root.setVisible(v);
    this.buttons.forEach((b) => b.setVisible(v));
  }
}
