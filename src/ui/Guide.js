import { W, H, FULL, COLORS, CSS, DEPTH, TEX } from '../core/constants.js';
import { Content, lineText, lineAudio, lineSpeak } from '../core/Content.js';
import { Settings } from '../core/Settings.js';
import { Speech, estimateMs } from '../core/Speech.js';
import { Sfx } from '../core/Sfx.js';
import { txt } from './text.js';
import { Button } from './Button.js';
import { drawIcon } from './icons.js';

// The friendly astronaut who explains everything. Shows a portrait and a speech bubble,
// reads the words aloud, and waits for the player to press "Next".
export class Guide {
  constructor(scene, o = {}) {
    this.scene = scene;
    this.name = o.name || (Content.game && Content.game.guide && Content.game.guide.name) || 'Captain Nova';
    this.root = scene.add.container(0, 0).setDepth(DEPTH.guide).setVisible(false);
    this.dim = scene.add.rectangle(W / 2, H / 2, FULL.w, FULL.h, 0x000000, 0.5).setInteractive();
    this.dim.on('pointerup', () => this.skipTyping());
    this.root.add(this.dim);

    this.box = scene.add.container(0, 0);
    this.root.add(this.box);
    this.bubble = scene.add.graphics();
    this.box.add(this.bubble);

    this.portraitBg = scene.add.graphics();
    this.box.add(this.portraitBg);
    this.portrait = scene.add.image(0, 0, 'guide').setScale(1 / TEX);
    this.box.add(this.portrait);

    this.nameText = txt(scene, 0, 0, this.name.toUpperCase(), { size: 16, weight: 700, color: CSS.cyan, scale: false });
    this.box.add(this.nameText);
    this.text = txt(scene, 0, 0, '', { size: 25, lineSpacing: 7 });
    this.box.add(this.text);

    this.hit = scene.add.rectangle(0, 0, 10, 10, 0xffffff, 0.001).setOrigin(0).setInteractive();
    this.hit.on('pointerup', () => this.skipTyping());
    this.box.addAt(this.hit, 1);

    this.replayG = scene.add.graphics();
    this.box.add(this.replayG);
    this.buttons = [];
    this.talkTimer = null;
    this.bobTween = null;
    scene.events.once('shutdown', () => this.destroy());
  }

  // line: text or {text, audio, speak}. Options:
  //   modal (dim the game), next (show Next button), nextLabel, buttons [{label, value, variant}],
  //   position 'bottom' | 'top', width, auto (resolve after reading time, no buttons)
  say(line, o = {}) {
    this.cancel();
    const text = lineText(line);
    const opts = { modal: false, next: true, position: 'bottom', ...o };
    this.opts = opts;
    this.root.setVisible(true);
    this.dim.setVisible(!!opts.modal);
    this.dim.setAlpha(opts.modal ? 1 : 0);

    const bubbleW = Math.min(opts.width ?? 1060, W - 170);
    const textW = bubbleW - 48;
    this.text.setWordWrapWidth(textW, true);
    this.text.setText(text);
    const wrapped = this.text.getWrappedText(text).join('\n');
    this.text.setWordWrapWidth(null);
    this.fullText = wrapped;
    this.text.setText(wrapped);
    const textH = this.text.height;

    const buttons = opts.auto ? [] : opts.buttons || (opts.next ? [{ label: opts.nextLabel || Content.ui('next', 'Next'), value: true, icon: 'next' }] : []);
    const btnRow = buttons.length ? 66 : 0;
    const bubbleH = Math.max(112, 20 + 24 + textH + 16 + btnRow + 12);
    const x0 = 150;
    const y0 = opts.position === 'top' ? 84 : H - 14 - bubbleH;

    // bubble
    const g = this.bubble;
    g.clear();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(x0, y0 + 6, bubbleW, bubbleH, 22);
    g.fillStyle(0xf7f9ff, 1);
    g.fillRoundedRect(x0, y0, bubbleW, bubbleH, 22);
    g.fillStyle(0xf7f9ff, 1);
    const tailY = opts.position === 'top' ? y0 + 50 : y0 + bubbleH - 52;
    g.fillTriangle(x0 + 2, tailY - 14, x0 + 2, tailY + 14, x0 - 18, tailY + 4);

    // portrait
    const px = 78, py = opts.position === 'top' ? y0 + 60 : y0 + bubbleH - 62;
    this.portraitBg.clear();
    this.portraitBg.fillStyle(0x000000, 0.35);
    this.portraitBg.fillCircle(px, py + 5, 62);
    this.portraitBg.fillStyle(COLORS.panel2, 1);
    this.portraitBg.fillCircle(px, py, 62);
    this.portraitBg.lineStyle(4, COLORS.cyan, 1);
    this.portraitBg.strokeCircle(px, py, 62);
    this.portrait.setPosition(px, py + 4);
    if (this.bobTween) this.bobTween.stop();
    this.bobTween = this.scene.tweens.add({ targets: this.portrait, y: py + 8, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.nameText.setPosition(x0 + 24, y0 + 14);
    this.text.setPosition(x0 + 24, y0 + 40);
    this.text.setColor('#0b1230');
    this.hit.setPosition(x0, y0).setSize(bubbleW, bubbleH - btnRow);
    if (this.hit.input) this.hit.input.hitArea.setSize(bubbleW, bubbleH - btnRow);

    // replay voice button (small speaker icon in the bubble corner)
    this.replayG.clear();
    drawIcon(this.replayG, 'speaker', x0 + bubbleW - 30, y0 + 22, 22, 0x4a5a9a);
    if (!this.replayHit) {
      this.replayHit = this.scene.add.rectangle(0, 0, 44, 40, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      this.replayHit.on('pointerup', () => {
        Speech.say(this.spokenText, { audio: this.audio, force: true });
      });
      this.box.add(this.replayHit);
    }
    this.replayHit.setPosition(x0 + bubbleW - 30, y0 + 22);

    // buttons
    this.buttons.forEach((b) => b.destroy());
    this.buttons = [];
    return new Promise((resolve) => {
      this.resolve = resolve;
      const bw = buttons.length > 1 ? Math.min(250, (bubbleW - 40) / buttons.length - 14) : 190;
      buttons.forEach((b, i) => {
        const bx = x0 + bubbleW - 24 - bw / 2 - (buttons.length - 1 - i) * (bw + 14);
        const btn = new Button(this.scene, bx, y0 + bubbleH - 12 - 30, {
          width: bw,
          height: 54,
          label: b.label,
          size: 21,
          icon: b.icon,
          iconSize: 20,
          variant: b.variant || 'primary',
          onClick: () => this.finish(b.value)
        });
        btn.setDepth(DEPTH.guide + 1);
        btn._guide = this;
        this.buttons.push(btn);
      });
      if (opts.modal && this.scene.focus) this.scene.focus.setTrap((item) => item._guide === this);

      // typewriter + voice
      this.spokenText = lineSpeak(line);
      this.audio = lineAudio(line) ? Content.media(this.scene.payload?.chapterId, lineAudio(line)) : null;
      this.startTyping();
      const speech = Speech.say(this.spokenText, { audio: this.audio });
      if (opts.auto) {
        const minWait = new Promise((r) => this.scene.time.delayedCall(Math.min(estimateMs(this.spokenText), opts.maxWait ?? 99999), r));
        Promise.all([speech, minWait]).then(() => {
          if (this.resolve === resolve) this.scene.time.delayedCall(opts.hold ?? 400, () => this.finish(true));
        });
      }
      this.box.setAlpha(0);
      this.box.y = 16;
      this.scene.tweens.add({ targets: this.box, alpha: 1, y: 0, duration: 220, ease: 'Cubic.easeOut' });
    });
  }

  // Several lines in a row, each with a Next button.
  async sequence(lines, o = {}) {
    for (let i = 0; i < lines.length; i++) {
      const last = i === lines.length - 1;
      const r = await this.say(lines[i], { ...o, nextLabel: last ? o.lastLabel || o.nextLabel : o.nextLabel });
      if (r === null) return null; // interrupted by another message
      if (!this.scene.sys.isActive() && !this.scene.sys.isPaused()) return null;
    }
  }

  startTyping() {
    const full = this.fullText;
    if (Settings.get('reducedMotion')) {
      this.text.setText(full);
      return;
    }
    let n = 0;
    this.text.setText('');
    const speed = 2; // characters per tick
    this.talkTimer = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        n += speed;
        this.text.setText(full.slice(0, n));
        this.portrait.setTexture(Math.floor(n / 6) % 2 ? 'guideTalk' : 'guide');
        if (n % 8 === 0) Sfx.play('type');
        if (n >= full.length) this.stopTyping();
      }
    });
  }

  stopTyping() {
    if (this.talkTimer) this.talkTimer.remove();
    this.talkTimer = null;
    if (!this.text.scene || !this.portrait.scene) return; // screen already closed
    this.text.setText(this.fullText || '');
    this.portrait.setTexture('guide');
  }

  skipTyping() {
    if (this.talkTimer) this.stopTyping();
  }

  finish(value) {
    const r = this.resolve;
    this.resolve = null;
    this.stopTyping();
    Speech.stop();
    if (this.scene.focus) this.scene.focus.clearTrap();
    this.buttons.forEach((b) => b.destroy());
    this.buttons = [];
    if (this.opts && this.opts.keep) {
      // keep bubble visible (without buttons)
    } else {
      this.root.setVisible(false);
    }
    if (r) r(value);
  }

  cancel() {
    if (this.resolve) {
      const r = this.resolve;
      this.resolve = null;
      r(null);
    }
    this.stopTyping();
    this.buttons.forEach((b) => b.destroy());
    this.buttons = [];
  }

  hide() {
    this.cancel();
    Speech.stop();
    if (this.scene.focus) this.scene.focus.clearTrap();
    this.root.setVisible(false);
  }

  get visible() {
    return this.root.visible;
  }

  // Called when the screen shuts down: game objects are already gone, so only
  // settle any waiting promise and stop the typing timer.
  destroy() {
    if (this.talkTimer) this.talkTimer.remove();
    this.talkTimer = null;
    if (this.resolve) {
      const r = this.resolve;
      this.resolve = null;
      r(null);
    }
    this.buttons = [];
  }
}
