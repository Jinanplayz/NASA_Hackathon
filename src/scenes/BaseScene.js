import Phaser from 'phaser';
import { W, H, RES, COLORS } from '../core/constants.js';
import { Flow } from '../core/Flow.js';
import { Speech } from '../core/Speech.js';
import { Sfx } from '../core/Sfx.js';
import { Settings } from '../core/Settings.js';
import { FocusManager } from '../ui/Focus.js';
import { Hud } from '../ui/Hud.js';
import { Guide } from '../ui/Guide.js';

// Background music mood for each screen (an activity's config can set "music" to change it).
const MUSIC = {
  Title: 'menu',
  ChapterSelect: 'menu',
  Cutscene: 'story',
  Systems: 'lab',
  Builder: 'lab',
  ModelReveal: 'lab',
  Assembly: 'lab',
  PartsList: 'lab',
  Research: 'lab',
  Wiring: 'lab',
  Repair: 'lab',
  Ascent: 'sky',
  OrbitControl: 'space',
  Balance: 'space',
  SpaceDodge: 'space',
  LaunchSequence: 'tension',
  LunarLanding: 'tension',
  Samples: 'moon',
  Splashdown: 'ocean',
  Rescue: 'ocean',
  Summary: 'triumph',
  ChapterComplete: 'triumph'
};

// Shared setup for every screen: camera scaling, top bar, guide, pause menu,
// keyboard focus and clean-up when the screen closes.
export class BaseScene extends Phaser.Scene {
  init(data) {
    this.payload = data || {};
    this.cfg = this.payload.cfg || {};
    this.chapterId = this.payload.chapterId;
    this.stepIndex = this.payload.stepIndex;
    this._leaving = false;
    this._run = {};
    this.domEls = [];
    this.relaxed = Settings.get('relaxed');
    this.reducedMotion = Settings.get('reducedMotion');
  }

  setupStage(o = {}) {
    const cam = this.cameras.main;
    cam.setZoom(RES);
    cam.centerOn(W / 2, H / 2);
    cam.setBackgroundColor(o.bg ?? COLORS.bg);
    if (o.fade !== false) cam.fadeIn(320, 7, 11, 29);
    Sfx.setMusic(o.music || this.cfg.music || MUSIC[this.scene.key] || 'story');
    this.focus = new FocusManager(this);
    if (o.hud !== false) this.hud = new Hud(this, { chapterId: this.chapterId, stepIndex: this.stepIndex, title: o.title });
    this.guide = new Guide(this);
    if (this.input.keyboard) this.input.keyboard.on('keydown-ESC', () => this.openPause());
    this.events.on('pause', this._onPaused, this);
    this.events.on('resume', this._onResumed, this);
    this.events.once('shutdown', this._cleanup, this);
  }

  // Text from this activity's config block, with a fallback if the team removed it.
  T(key, fallback = '') {
    const v = this.cfg[key];
    return v === undefined || v === null ? fallback : v;
  }

  openPause() {
    if (this._leaving || this.scene.isActive('Pause') || this.scene.isPaused()) return;
    this.scene.launch('Pause', { from: this.scene.key });
    this.scene.pause();
  }

  _onPaused() {
    Speech.stop();
    Sfx.setPaused(true);
    this.domEls.forEach((d) => d.active && d.setVisible(false));
    if (this.onPause) this.onPause();
  }

  _onResumed() {
    Sfx.setPaused(false);
    this.relaxed = Settings.get('relaxed');
    this.reducedMotion = Settings.get('reducedMotion');
    this.domEls.forEach((d) => d.active && d.setVisible(d._wantVisible !== false));
    if (this.onResume) this.onResume();
  }

  // Returns a check that stays true only while this visit to the screen lasts
  // (for slow work, like loading, that may finish after the player has moved on).
  stillHere() {
    const run = this._run;
    return () => this._run === run && !this._leaving;
  }

  // Adds an HTML element (video, image, 3D canvas) positioned in game coordinates.
  addDom(x, y, el) {
    const d = this.add.dom(x, y, el).setOrigin(0, 0);
    d._wantVisible = true;
    this.domEls.push(d);
    return d;
  }

  setDomVisible(d, v) {
    d._wantVisible = v;
    d.setVisible(v);
  }

  // Finish this activity and go to the next step of the chapter.
  done(stars) {
    if (this._leaving) return;
    Flow.next(this, stars);
  }

  _cleanup() {
    this._run = null;
    Speech.stop();
    Sfx.stopLoops();
    Sfx.setPaused(false);
    this.events.off('pause', this._onPaused, this);
    this.events.off('resume', this._onResumed, this);
    if (this.onShutdown) this.onShutdown();
  }
}
