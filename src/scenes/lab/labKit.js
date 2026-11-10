// Small pieces shared by the screens of the Test Your Knowledge mode.
import { TEX, COLORS, CSS, DEPTH } from '../../core/constants.js';
import { Sfx } from '../../core/Sfx.js';
import { txt } from '../../ui/text.js';
import { Content } from '../../core/Content.js';
import { RoundBox, floatText, dialog } from '../../ui/widgets.js';
import { Lab, labContent, rate } from './labState.js';
import { craftTexture, rocketTexture, patchTexture } from './labArt.js';

// A label from the mode's shared "labels" block (on-screen words only), e.g. L('categories.power').
export function L(path, fallback = '') {
  const v = path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : undefined), labContent().labels);
  return v === undefined || v === null ? fallback : v;
}
export const note = (code) => (labContent().notes || {})[code] || '';
export const missionInfo = (m = Lab.mission) => (labContent().missions || {})[m] || {};

// The ship as it is right now, as an image (300 x 250 at scale 1).
export function shipImage(scene, x, y, scale = 1) {
  return scene.add.image(x, y, craftTexture(scene, Lab.design())).setScale(scale / TEX);
}
export function rocketImage(scene, x, y, scale = 1, flame = false) {
  return scene.add.image(x, y, rocketTexture(scene, Lab.design(), flame)).setScale(scale / TEX).setOrigin(0.5, 1);
}
export function patchImage(scene, x, y, scale = 1) {
  return scene.add.image(x, y, patchTexture(scene, Lab.design())).setScale(scale / TEX);
}

// A gold coin with the number of credits; call refresh() after earning or spending.
export class CreditsPill {
  constructor(scene, x, y, o = {}) {
    this.scene = scene;
    this.root = scene.add.container(x, y).setDepth(o.depth ?? DEPTH.ui + 5);
    const w = o.w ?? 190;
    this.root.add(new RoundBox(scene).draw(-w / 2, -24, w, 48, { fill: 0x0b1230, alpha: 0.92, radius: 24, stroke: COLORS.yellow, strokeWidth: 2, shadow: false }));
    const coin = scene.add.circle(-w / 2 + 28, 0, 15, COLORS.yellow).setStrokeStyle(3, 0xc99a2e);
    this.root.add([coin, txt(scene, -w / 2 + 28, 1, '¢', { size: 18, weight: 800, color: '#7a5a10', origin: 0.5, scale: false })]);
    this.text = txt(scene, -w / 2 + 52, 0, '', { size: 22, weight: 800, color: CSS.yellow, origin: [0, 0.5], scale: false });
    this.root.add(this.text);
    this.shown = Lab.s.credits;
    this.refresh(true);
  }

  refresh(instant = false) {
    const to = Lab.s.credits;
    const label = L('credits', 'Credits');
    if (instant || this.shown === to) {
      this.shown = to;
      this.text.setText(`${to} ${label}`);
      return;
    }
    const from = this.shown;
    this.shown = to;
    if (to > from) {
      Sfx.play('pickup');
      floatText(this.scene, this.root.x, this.root.y - 34, `+${to - from}`, CSS.yellow, 26);
    }
    this.scene.tweens.addCounter({
      from,
      to,
      duration: 400,
      onUpdate: (tw) => this.text.setText(`${Math.round(tw.getValue())} ${label}`)
    });
    this.scene.tweens.add({ targets: this.root, scale: 1.12, duration: 120, yoyo: true });
  }
}

// The end of a test or a flight step: remember the score, note what the engineers learned from
// it (codes from rate(); shown in the design review and the report), and show the result.
// kind: 'test' or 'flight'. Only notes in `watch` (that this step could notice) are reported.
export function endStep(scene, kind, name, score, watch = []) {
  if (kind === 'test') Lab.setTest(name, score);
  else Lab.setFlight(name, score);
  const found = rate(Lab.design()).notes.filter((n) => watch.includes(n));
  found.forEach((n) => Lab.event(`note_${n}`));
  const stars = score >= 85 ? 3 : score >= 60 ? 2 : 1;
  const title = scene.T('resultTitle', 'Well done!');
  const text = scene.T('resultText', '');
  const notes = found.slice(0, 2).map(note);
  return dialog(scene, {
    title,
    stars,
    text: [text, ...notes].filter(Boolean).join('\n\n'),
    speak: [title, text, ...notes],
    width: 860,
    buttons: [
      { label: Content.ui('tryAgain', 'Try again'), value: 'retry', variant: 'secondary', icon: 'restart' },
      { label: Content.ui('continue', 'Continue'), value: 'next', icon: 'next' }
    ]
  }).then((v) => {
    if (v === 'retry') scene.scene.restart(scene.payload);
    else scene.done(stars);
  });
}
