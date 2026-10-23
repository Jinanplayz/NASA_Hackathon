import Phaser from 'phaser';
import { COLORS, CSS, shuffle } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { Speech } from '../../core/Speech.js';
import { BaseScene } from '../BaseScene.js';
import { starfield } from '../common/bg.js';
import { playIntro, finishGame, starsFor, draggable, GoalBar, idleHint } from '../common/kit.js';
import { img } from '../../art/core.js';
import { txt } from '../../ui/text.js';
import { toast, roundBox, RoundBox } from '../../ui/widgets.js';

// How Voyager made colour pictures: three black-and-white photos taken through orange, green
// and blue filters, each shown as one colour channel (red, green, blue). Put each photo into
// the matching channel to rebuild Saturn's real colours.
const CHANNELS = ['red', 'green', 'blue'];
const TINT = { red: 0xff0000, green: 0x00ff00, blue: 0x0000ff };
const SLOT_Y = 528, PHOTO_Y = 262;
const SLOT_X = [160, 400, 640];
const PREVIEW = { x: 800, y: 178, w: 450, h: 450 };
const FILTER_COLOR = { orange: 0xff9f43, green: 0x3ddc97, blue: 0x5b8cff };

// black-and-white copies of the Saturn picture, one per colour channel (made once)
function channelTextures(scene) {
  if (scene.textures.exists('saturnCh_red')) return;
  const src = scene.textures.get('saturn').getSourceImage();
  CHANNELS.forEach((ch, k) => {
    const ct = scene.textures.createCanvas('saturnCh_' + ch, src.width, src.height);
    const c = ct.getContext();
    c.drawImage(src, 0, 0);
    const d = c.getImageData(0, 0, src.width, src.height);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = d.data[i + k];
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
    }
    c.putImageData(d, 0, 0);
    ct.refresh();
  });
}

export class ColorFiltersScene extends BaseScene {
  constructor() {
    super('ColorFilters');
  }

  create() {
    this.setupStage();
    starfield(this, { count: 120 });
    channelTextures(this);
    this.state = 'intro';
    this.mistakes = 0;
    this.assign = { red: null, green: null, blue: null };
    this.selected = null;
    this.wrongOnce = false;
    this.hintAt = 0;
    this.hintToast = null;
    const names = this.T('channels', {});

    // the three colour channels
    this.slots = CHANNELS.map((ch, i) => {
      const x = SLOT_X[i], y = SLOT_Y;
      roundBox(this, x - 110, y - 82, 220, 164, { fill: 0x0b1230, alpha: 0.9, radius: 16, stroke: TINT[ch], strokeWidth: 4, strokeAlpha: 0.9, shadow: false });
      txt(this, x, y - 104, names[ch] || ch, { size: 20, weight: 800, color: Phaser.Display.Color.IntegerToColor(TINT[ch]).rgba, origin: 0.5, scale: false });
      const zone = this.add.zone(x, y, 220, 164).setInteractive({ useHandCursor: true });
      zone.on('pointerup', () => this.selected && this.put(this.selected, ch));
      return { ch, x, y };
    });

    // the photos (black and white), in a mixed-up order
    this.photos = shuffle(this.T('photos', [])).map((p, i) => {
      const c = this.add.container(SLOT_X[i], PHOTO_Y);
      // the frame shows the colour of the filter the photo was taken through
      const g = new RoundBox(this).draw(-104, -78, 208, 156, { fill: 0x000000, alpha: 1, radius: 12, stroke: FILTER_COLOR[p.id] ?? 0x6b7290, strokeWidth: 5, shadow: false });
      const pic = img(this, 0, -10, 'saturnCh_' + p.channel, 0.42);
      const tag = txt(this, 0, 58, p.name, { size: 17, weight: 800, color: Phaser.Display.Color.IntegerToColor(FILTER_COLOR[p.id] ?? 0xe6ebf5).rgba, origin: 0.5, scale: false });
      c.add([g, pic, tag]);
      c.setSize(208, 156);
      c.photo = p;
      c.slot = null;
      draggable(this, c, {
        onGrab: () => this.state === 'play' && Speech.say(p.name),
        onDrop: (x, y) => {
          const s = this.slots.find((sl) => Math.abs(x - sl.x) < 120 && Math.abs(y - sl.y) < 90);
          return s ? this.put(c, s.ch) : false;
        },
        onTap: () => this.select(c)
      });
      return c;
    });

    // the colour picture: the three channels added together
    const pg = roundBox(this, PREVIEW.x, PREVIEW.y, PREVIEW.w, PREVIEW.h, { fill: 0x000000, radius: 18, stroke: COLORS.cyan, strokeWidth: 3 });
    txt(this, PREVIEW.x + PREVIEW.w / 2, PREVIEW.y + 24, this.T('previewLabel', 'Colour picture'), { size: 18, weight: 800, color: CSS.yellow, origin: 0.5, scale: false });
    this.layers = CHANNELS.map((ch) => img(this, PREVIEW.x + PREVIEW.w / 2, PREVIEW.y + PREVIEW.h / 2 + 10, 'saturnCh_red', 0.98).setTint(TINT[ch]).setBlendMode(Phaser.BlendModes.ADD).setVisible(false));
    this.goal = new GoalBar(this);
    this.refresh();
    // stuck? point at a photo that isn't in its right box yet
    idleHint(this, () => {
      const c = this.state === 'play' && this.photos.find((k) => k.slot !== k.photo.channel);
      return c ? { x: c.x, y: c.y - 84 } : null;
    }, { delay: 9000 });
    playIntro(this).then((ok) => {
      if (!ok) return;
      this.state = 'play';
      this.goal.set(this.T('task', { title: 'Colour in Saturn!', help: 'Drag each filter photo into a colour box. Orange goes in red.' }), { count: this.countText() });
    });
  }

  countText() {
    return `${CHANNELS.filter((ch) => this.assign[ch]).length} / 3`;
  }

  select(c) {
    if (this.state !== 'play') return;
    this.photos.forEach((p) => p.setScale(1));
    this.selected = c;
    c.setScale(1.06);
    Sfx.play('select');
  }

  // put photo c into channel ch (a photo already there swaps places with it)
  put(c, ch) {
    if (this.state !== 'play') return false;
    const there = this.assign[ch];
    const from = c.slot;
    if (from) this.assign[from] = null;
    if (there && there !== c) {
      if (from) {
        this.assign[from] = there;
        there.slot = from;
        const s = this.slots.find((sl) => sl.ch === from);
        this.tweens.add({ targets: there, x: s.x, y: s.y, duration: 220 });
        there.home = { x: s.x, y: s.y };
      } else {
        there.slot = null;
        there.home = { x: c.home.x, y: c.home.y };
        this.tweens.add({ targets: there, x: there.home.x, y: there.home.y, duration: 220 });
      }
    }
    this.assign[ch] = c;
    c.slot = ch;
    const s = this.slots.find((sl) => sl.ch === ch);
    c.home = { x: s.x, y: s.y };
    this.tweens.add({ targets: c, x: s.x, y: s.y, scale: 1, duration: 220 });
    this.selected = null;
    Sfx.play('snap');
    this.refresh();
    this.goal.setCount(this.countText());
    this.check();
    return true;
  }

  refresh() {
    CHANNELS.forEach((ch, i) => {
      const c = this.assign[ch];
      this.layers[i].setVisible(!!c);
      if (c) this.layers[i].setTexture('saturnCh_' + c.photo.channel);
    });
  }

  check() {
    if (!CHANNELS.every((ch) => this.assign[ch])) return;
    const right = CHANNELS.every((ch) => this.assign[ch].photo.channel === ch);
    if (!right) {
      // (swapping photos around to fix a mix only counts once, and the hint doesn't repeat too often)
      if (!this.wrongOnce) {
        this.wrongOnce = true;
        this.mistakes++;
      }
      if (!this.hintAt || this.time.now - this.hintAt > 4000) {
        this.hintAt = this.time.now;
        Sfx.play('error');
        this.hintToast = toast(this, this.T('wrongMix', ''), { y: 660, color: COLORS.orange, sound: false, speak: true, duration: 3200 });
      }
      return;
    }
    if (this.hintToast && this.hintToast.active) this.hintToast.destroy();
    this.win();
  }

  async win() {
    this.state = 'won';
    Sfx.play('bigSuccess');
    this.photos.forEach((p) => {
      p.enabled = false;
      p.disableInteractive();
      this.focus.remove(p);
    });
    this.tweens.add({ targets: this.layers, scale: this.layers[0].scale * 1.05, duration: 500, yoyo: true });
    await new Promise((r) => this.time.delayedCall(900, r));
    if (this._leaving) return;
    const r = await this.guide.say(this.T('falseColor', ''), { modal: true, position: 'top' });
    if (r === null) return;
    Speech.stop();
    finishGame(this, { stars: starsFor(this.mistakes, 0, 2) });
  }
}
