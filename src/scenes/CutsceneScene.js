import { RES, COLORS, CSS, DEPTH } from '../core/constants.js';
import { Content, lineText, lineSpeak } from '../core/Content.js';
import { Speech, estimateMs } from '../core/Speech.js';
import { Settings } from '../core/Settings.js';
import { Sfx } from '../core/Sfx.js';
import { BaseScene } from './BaseScene.js';
import { starfield } from './common/bg.js';
import { drawVisual } from './common/Visuals.js';
import { txt, fitText } from '../ui/text.js';
import { Button } from '../ui/Button.js';
import { ProgressBar, roundBox, RoundBox } from '../ui/widgets.js';

// A narrated "video": a series of slides, each with an animated picture, a real NASA
// photo, or a real NASA video clip. Slides move on by themselves after the narration,
// and the player can go back, pause or skip at any time.
const FX = 30, FY = 84, FW = 880, FH = 495;
const PX = 928, PW = 322;

// On computers, use NASA's sharper copies of films (720p) and photos (1920 px).
// Phones and tablets keep the smaller, faster ones. Returns null when there is no upgrade.
function sharperNasa(url, kind) {
  const computer = window.matchMedia?.('(pointer: fine)').matches;
  if (!url || !/images-assets\.nasa\.gov/.test(url) || !computer || navigator.connection?.saveData || Settings.get('sharp') === false) return null;
  if (kind === 'video' && url.includes('~mobile.mp4')) return url.replace('~mobile.mp4', '~medium.mp4');
  if (kind === 'image' && RES > 1.4 && url.includes('~medium.jpg')) return url.replace('~medium.jpg', '~large.jpg');
  return null;
}

export class CutsceneScene extends BaseScene {
  constructor() {
    super('Cutscene');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 120 });
    this.slides = this.cfg.slides || [];
    this.index = -1;
    this.playing = true;
    this.time.paused = false; // this screen is reused: never start with a clock paused last time
    this.token = 0;

    // frame
    const fg = this.add.existing(new RoundBox(this)).draw(FX, FY, FW, FH, { fill: 0x03050f, alpha: 1, radius: 18, stroke: null, shadowAlpha: 0.35, shadowY: 6 });
    const border = this.add.graphics().setDepth(DEPTH.ui);
    border.lineStyle(3, COLORS.stroke, 1);
    border.strokeRoundedRect(FX, FY, FW, FH, 18);
    const mg = this.make.graphics({ add: false });
    mg.fillStyle(0xffffff, 1);
    mg.fillRoundedRect(FX, FY, FW, FH, 18);
    this.frameMask = mg.createGeometryMask();

    // text panel
    const pg = roundBox(this, PX, FY, PW, FH, { fill: COLORS.panel, radius: 18 });
    this.yearChip = this.add.graphics().setDepth(DEPTH.ui);
    this.yearText = txt(this, PX + 22, FY + 22, '', { size: 18, weight: 800, color: CSS.dark, scale: false }).setDepth(DEPTH.ui + 1);
    this.heading = txt(this, PX + 22, FY + 64, '', { size: 28, weight: 800, color: CSS.yellow, wrap: PW - 44 }).setDepth(DEPTH.ui);
    this.body = txt(this, PX + 22, FY + 110, '', { size: 21, wrap: PW - 44, lineSpacing: 6 }).setDepth(DEPTH.ui);
    this.credit = txt(this, PX + 22, FY + FH - 14, '', { size: 14, color: CSS.dim, scale: false, wrap: PW - 44, origin: [0, 1] }).setDepth(DEPTH.ui);

    // controls
    const cy = 640;
    this.progress = new ProgressBar(this, FX, 598, FW, 10, { color: COLORS.cyan });
    this.dots = this.add.graphics();
    this.backBtn = new Button(this, FX + 70, cy + 8, { width: 130, height: 58, label: Content.ui('back', 'Back'), icon: 'back', variant: 'secondary', onClick: () => this.go(this.index - 1) });
    this.playBtn = new Button(this, FX + 200, cy + 8, { width: 110, height: 58, icon: 'pause', variant: 'secondary', onClick: () => this.togglePlay() });
    this.nextBtn = new Button(this, PX + PW - 110, cy + 8, { width: 220, height: 64, label: Content.ui('next', 'Next'), icon: 'next', onClick: () => this.advance(true) });
    this.replayBtn = new Button(this, PX + 44, cy + 8, { width: 88, height: 58, icon: 'replay', variant: 'secondary', onClick: () => this.go(this.index) });

    if (this.input.keyboard) {
      this.input.keyboard.on('keydown-RIGHT', () => this.advance(true));
      this.input.keyboard.on('keydown-LEFT', () => this.go(this.index - 1));
      this.input.keyboard.on('keydown-SPACE', () => this.togglePlay());
    }

    if (!this.slides.length) {
      this.time.delayedCall(300, () => this.done());
      return;
    }
    this.go(0);
  }

  togglePlay() {
    this.setPlaying(!this.playing);
  }

  // Pauses (or carries on) everything on the slide: the voice, the animation, the photo's
  // slow zoom, the film and the timeline.
  setPlaying(on) {
    if (on === this.playing) return;
    this.playing = on;
    this.playBtn.setIcon(on ? 'pause' : 'play');
    if (on) Speech.resume();
    else Speech.pause();
    this.freeze(!on);
    if (this.video && this.filmStarted) {
      if (on) this.video.play().catch(() => {});
      else this.video.pause();
    }
    if (on && this.waitingForPlay) {
      this.waitingForPlay = false;
      this.scheduleAdvance(800);
    }
  }

  freeze(p) {
    if (p) this.tweens.pauseAll();
    else this.tweens.resumeAll();
    this.time.paused = p;
    const emitters = (o) => {
      if (o.type === 'ParticleEmitter') {
        if (p) o.pause();
        else o.resume();
      }
      if (o.list) o.list.forEach(emitters);
    };
    if (this.visual) emitters(this.visual);
    if (this.mediaDom) this.mediaDom.node.classList.toggle('paused', p);
  }

  // the pause menu must not restart a narration the player paused themselves
  holdSpeech() {
    return !this.playing;
  }

  advance(manual = false) {
    if (this.index >= this.slides.length - 1) {
      if (manual) this.done();
      return;
    }
    this.go(this.index + 1);
  }

  clearSlide() {
    this.token++;
    Speech.stop();
    Sfx.hushMusic(false);
    if (this.advanceTimer) this.advanceTimer.remove();
    this.advanceTimer = null;
    if (this.progressTween) this.progressTween.stop();
    if (this.visual) {
      const kill = (o) => {
        this.tweens.killTweensOf(o);
        if (o.list) o.list.forEach(kill);
      };
      kill(this.visual);
      this.visual.destroy();
      this.visual = null;
    }
    this.clearDomOnly();
    this.hideStatus();
    this.filmStarted = false;
  }

  go(i) {
    if (i < 0 || i >= this.slides.length) return;
    if (!this.playing) {
      // Back / Next / Replay play the slide (the old narration is stopped just below)
      this.playing = true;
      this.playBtn.setIcon('pause');
      this.freeze(false);
    }
    this.waitingForPlay = false;
    this.clearSlide();
    this.index = i;
    const s = this.slides[i];
    const my = this.token;

    // text
    const year = s.year || '';
    this.yearChip.clear();
    this.yearText.setText(year);
    if (year) {
      this.yearChip.fillStyle(COLORS.yellow, 1);
      this.yearChip.fillRoundedRect(PX + 14, FY + 16, this.yearText.width + 18, 32, 16);
      this.yearText.setPosition(PX + 23, FY + 21);
    }
    const headY = year ? FY + 62 : FY + 22;
    this.heading.setText(s.heading || '').setY(headY).setFontSize(Math.round(28 * Settings.textScale()));
    fitText(this.heading, PW - 44, 110, 18);
    this.body.setText(lineText(s.text)).setY(this.heading.y + this.heading.height + 14).setFontSize(Math.round(21 * Settings.textScale()));
    fitText(this.body, PW - 44, FY + FH - 60 - this.body.y, 14);
    this.credit.setText(s.credit || '');

    // slide dots
    this.dots.clear();
    const n = this.slides.length;
    const gap = Math.min(24, 360 / n);
    const dx = FX + 520 - ((n - 1) * gap) / 2;
    for (let k = 0; k < n; k++) {
      this.dots.fillStyle(k === i ? COLORS.yellow : k < i ? COLORS.cyan : 0x3a4470, 1);
      this.dots.fillCircle(dx + k * gap, 648, k === i ? 7 : 5);
    }
    this.backBtn.setEnabled(i > 0);
    const last = i === n - 1;
    this.nextBtn.setLabel(last ? this.T('endLabel', Content.ui('continue', 'Continue')) : Content.ui('next', 'Next'));
    if (last) this.nextBtn.pulse();
    else this.nextBtn.stopPulse();

    // picture / video
    this.visual = this.add.container(FX, FY);
    this.visual.setMask(this.frameMask);
    const video = s.video && (typeof s.video === 'string' ? { src: s.video } : s.video);
    const image = s.image && (typeof s.image === 'string' ? { src: s.image } : s.image);
    if (video && video.src) {
      drawVisual(this, this.visual, s.visual || 'sky', FW, FH, s);
      this.showVideo(video, s, my);
    } else {
      if (image && image.src) this.showImage(image, s);
      else drawVisual(this, this.visual, s.visual || 'sky', FW, FH, s);
      this.narrateThenAdvance(s, my);
    }
    this.progress.set(0, true);
  }

  narrateThenAdvance(s, my, after = null) {
    const text = s.speak || [s.heading, lineSpeak(s.text)];
    const minMs = s.duration ? s.duration * 1000 : estimateMs(text) + 600;
    this.animateProgress(minMs);
    const start = Date.now();
    const audio = s.audio ? Content.media(this.chapterId, s.audio) : null;
    Speech.say(text, { audio }).then(() => {
      if (my !== this.token) return;
      if (after) return after();
      const waited = Date.now() - start;
      this.scheduleAdvance(Math.max(900, minMs - waited));
    });
  }

  animateProgress(ms) {
    if (this.progressTween) this.progressTween.stop();
    this.progressTween = this.tweens.addCounter({ from: 0, to: 1, duration: ms, onUpdate: (t) => this.progress.set(t.getValue(), true) });
  }

  scheduleAdvance(ms) {
    if (this.advanceTimer) this.advanceTimer.remove();
    if (this.index >= this.slides.length - 1) return; // last slide waits for the player
    if (!this.playing) {
      this.waitingForPlay = true;
      return;
    }
    this.advanceTimer = this.time.delayedCall(ms, () => this.advance(false));
  }

  showImage(image, s) {
    const el = document.createElement('div');
    el.className = 'media-frame';
    el.style.width = FW + 'px';
    el.style.height = FH + 'px';
    const im = document.createElement('img');
    im.alt = image.alt || s.heading || '';
    const normal = Content.media(this.chapterId, image.src);
    let hd = sharperNasa(normal, 'image');
    im.src = hd || normal;
    el.appendChild(im);
    this.mediaDom = this.addDom(FX, FY, el);
    // taps and drags go to the game underneath
    this.mediaDom.pointerEvents = 'none';
    // a slow zoom on the photo (a CSS animation, so the pause button can freeze it)
    im.onload = () => !Settings.get('reducedMotion') && im.classList.add('kenburns');
    im.onerror = () => {
      // no sharper copy of this photo: use the standard one
      if (hd) {
        hd = null;
        im.src = normal;
        return;
      }
      // photo missing or offline: show the drawn picture instead
      this.clearDomOnly();
      drawVisual(this, this.visual, s.visual || 'sky', FW, FH, s);
    };
    if (!s.credit) this.credit.setText(image.credit || Content.ui('photoCredit', 'Photo: NASA'));
  }

  showVideo(video, s, my) {
    const el = document.createElement('div');
    el.className = 'media-frame';
    el.style.width = FW + 'px';
    el.style.height = FH + 'px';
    const v = document.createElement('video');
    v.setAttribute('playsinline', '');
    v.setAttribute('preload', 'auto');
    v.controls = true;
    if (video.poster) v.poster = Content.media(this.chapterId, video.poster);
    const start = video.start || 0;
    const part = start || video.end ? `#t=${start}${video.end ? ',' + video.end : ''}` : '';
    const normal = Content.media(this.chapterId, video.src);
    let hd = sharperNasa(normal, 'video');
    v.src = (hd || normal) + part;
    el.appendChild(v);
    this.video = v;
    this.mediaDom = this.addDom(FX, FY, el);
    // keep the film hidden (animation visible) until it actually starts playing
    this.setDomVisible(this.mediaDom, false);
    v.addEventListener('play', () => {
      if (my !== this.token || !this.mediaDom) return;
      this.filmStarted = true;
      if (!this.playing) this.setPlaying(true); // started with the film's own play button
      this.hideStatus();
      this.setDomVisible(this.mediaDom, true);
      // the film has its own sound: silence the music and the animation behind it
      Sfx.hushMusic(true);
      if (this.visual) this.visual.setData('quiet', true).setVisible(false);
    });
    if (!s.credit) this.credit.setText(video.credit || Content.ui('videoCredit', 'Video: NASA'));

    this.showStatus(Content.ui('filmNext', 'NASA film coming up…'));
    let ready = false;
    let failed = false;
    const fail = () => {
      if (failed || my !== this.token) return;
      failed = true;
      this.clearDomOnly();
      Sfx.hushMusic(false);
      if (this.visual) this.visual.setData('quiet', false).setVisible(true).setAlpha(1);
      this.hideStatus();
      this.credit.setText(Content.ui('videoFailed', 'The video could not load, so here is an animation instead.'));
      this.narrateThenAdvance(s, my);
    };
    v.addEventListener('error', () => {
      // no sharper copy of this film: use the standard one
      if (hd && !failed && my === this.token) {
        hd = null;
        v.src = normal + part;
        v.load();
        return;
      }
      fail();
    });
    const timeout = this.time.delayedCall(15000, () => {
      if (!ready) fail();
    });
    v.addEventListener('loadeddata', () => {
      ready = true;
      timeout.remove();
    });
    v.addEventListener('timeupdate', () => {
      if (my !== this.token) return;
      const end = video.end || v.duration;
      if (end && isFinite(end)) this.progress.set((v.currentTime - start) / (end - start), true);
      if (video.end && v.currentTime >= video.end) {
        v.pause();
        onEnd();
      }
    });
    let ended = false;
    const onEnd = () => {
      if (ended || my !== this.token) return;
      ended = true;
      Sfx.hushMusic(false);
      this.scheduleAdvance(1200);
    };
    v.addEventListener('ended', onEnd);
    // paused with the film's own controls: pause the slide too (not when the game pauses it)
    v.addEventListener('pause', () => {
      if (my !== this.token || ended || !this.filmStarted || this.scene.isPaused()) return;
      if (this.playing) this.setPlaying(false);
    });

    // Read the slide text first, then roll the film.
    const playFilm = () => {
      if (my !== this.token || failed) return;
      const reveal = () => {
        // autoplay blocked: show the player so the built-in play button can be pressed
        if (this.mediaDom && my === this.token) this.setDomVisible(this.mediaDom, true);
      };
      if (this.playing) v.play().catch(reveal);
      else reveal();
    };
    const text = s.speak || [s.heading, lineSpeak(s.text)];
    const audio = s.audio ? Content.media(this.chapterId, s.audio) : null;
    // roll the film once the narration AND the picture's own animation have both finished
    // (the timer uses the game clock, so the pause button holds it too)
    const wait = (this.visual && this.visual.getData('filmAfter')) || 0;
    const shown = new Promise((r) => (wait ? this.time.delayedCall(wait, r) : r()));
    Promise.all([Speech.say(text, { audio }), shown]).then(playFilm);
    v.addEventListener('play', () => Speech.stop());
  }

  clearDomOnly() {
    if (this.mediaDom) {
      if (this.video) {
        this.video.pause();
        this.video.removeAttribute('src');
        this.video.load();
      }
      this.mediaDom.destroy();
      this.domEls = this.domEls.filter((d) => d !== this.mediaDom);
      this.mediaDom = null;
      this.video = null;
    }
  }

  // "NASA film coming up...": a badge at the bottom of the picture. The picture's own captions
  // down there are hidden meanwhile so the two never overlap.
  showStatus(message) {
    this.hideStatus();
    const t = txt(this, 0, 0, message, { size: 19, weight: 800, origin: 0.5, color: CSS.yellow, scale: false });
    const w = t.width + 40, h = t.height + 16;
    const bg = this.add.existing(new RoundBox(this)).draw(-w / 2, -h / 2, w, h, { fill: 0x070b1d, alpha: 0.92, radius: h / 2, stroke: COLORS.yellow, strokeWidth: 2, strokeAlpha: 0.9, shadow: false });
    this.statusText = this.add.container(FX + FW / 2, FY + FH - 30, [bg, t]).setDepth(DEPTH.ui);
    this.hiddenCaptions = [];
    const walk = (o) => {
      if (o.type === 'Text' && o.visible && o.y > FH - 100) {
        o.setVisible(false);
        this.hiddenCaptions.push(o);
      }
      if (o.list) o.list.forEach(walk);
    };
    if (this.visual) walk(this.visual);
  }

  hideStatus() {
    if (this.statusText) {
      this.statusText.destroy();
      this.statusText = null;
    }
    (this.hiddenCaptions || []).forEach((o) => o.active && o.setVisible(true));
    this.hiddenCaptions = [];
  }

  onPause() {
    if (this.video) this.video.pause();
  }

  onResume() {
    if (this.video && this.playing && this.filmStarted) this.video.play().catch(() => {});
  }

  onShutdown() {
    this.clearSlide();
  }
}
