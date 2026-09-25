import { W, COLORS, CSS, DEPTH } from '../core/constants.js';
import { Content } from '../core/Content.js';
import { Settings } from '../core/Settings.js';
import { Speech } from '../core/Speech.js';
import { txt } from './text.js';
import { iconButton } from './Button.js';

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
    const g = scene.add.graphics();
    g.fillStyle(0x070b1d, 0.72);
    g.fillRoundedRect(10, 8, pillW, 56, 18);
    g.lineStyle(2, COLORS.stroke, 0.9);
    g.strokeRoundedRect(10, 8, pillW, 56, 18);
    this.root.add([g, label, name]);

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
    }

    // right-side buttons
    const menuBtn = iconButton(scene, W - 44, 38, 'menu', () => scene.openPause && scene.openPause());
    this.voiceBtn = iconButton(scene, W - 110, 38, Settings.get('readAloud') ? 'speaker' : 'speakerOff', () => {
      const on = !Settings.get('readAloud');
      Settings.set('readAloud', on);
      if (!on) Speech.stop();
    });
    this.unsub = Settings.on((k, v) => {
      if (k === 'readAloud' && this.voiceBtn.active) this.voiceBtn.setIcon(v ? 'speaker' : 'speakerOff');
    });
    menuBtn.setDepth(DEPTH.hud + 1);
    this.voiceBtn.setDepth(DEPTH.hud + 1);
    this.buttons = [menuBtn, this.voiceBtn];
    scene.events.once('shutdown', () => this.unsub());
  }

  setVisible(v) {
    this.root.setVisible(v);
    this.buttons.forEach((b) => b.setVisible(v));
  }
}
