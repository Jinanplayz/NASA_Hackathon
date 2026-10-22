// Moves the player through the list of "steps" defined in each chapter's scene.json.
// A step is { "type": "cutscene", "data": "intro", "name": "..." }.
// "type" picks which game screen runs, "data" picks which block of the config it uses.

import { Content } from './Content.js';
import { Progress } from './Progress.js';
import { Speech } from './Speech.js';
import { Sfx } from './Sfx.js';

export const SCENE_FOR_TYPE = {
  cutscene: 'Cutscene',
  systems: 'Systems',
  builder: 'Builder',
  modelReveal: 'ModelReveal',
  ascent: 'Ascent',
  assembly: 'Assembly',
  orbitControl: 'OrbitControl',
  balance: 'Balance',
  partsList: 'PartsList',
  research: 'Research',
  wiring: 'Wiring',
  launchSequence: 'LaunchSequence',
  spaceDodge: 'SpaceDodge',
  lunarLanding: 'LunarLanding',
  samples: 'Samples',
  repair: 'Repair',
  splashdown: 'Splashdown',
  rescue: 'Rescue',
  summary: 'Summary',
  chapterComplete: 'ChapterComplete',
  // Chapter 4 · Apollo 13
  simulator: 'Simulator',
  stageBurn: 'StageBurn',
  diagnose: 'Diagnose',
  lifeboat: 'Lifeboat',
  powerDown: 'PowerDown',
  freeReturn: 'FreeReturn',
  scrubber: 'Scrubber',
  manualBurn: 'ManualBurn',
  powerUp: 'PowerUp',
  causeChain: 'CauseChain',
  // Chapter 5 · Voyager 1
  launchWindow: 'LaunchWindow',
  goldenRecord: 'GoldenRecord',
  recordCover: 'RecordCover',
  flybyCamera: 'FlybyCamera',
  ioPlume: 'IoPlume',
  colorFilters: 'ColorFilters',
  dsnRelay: 'DsnRelay',
  familyPortrait: 'FamilyPortrait',
  memoryFix: 'MemoryFix',
  heliopause: 'Heliopause',
  // Chapter 6 · Mars rovers
  moonBuggy: 'MoonBuggy',
  paintByNumbers: 'PaintByNumbers',
  airbagBounce: 'AirbagBounce',
  roverProgram: 'RoverProgram',
  dustDevil: 'DustDevil',
  skyCrane: 'SkyCrane',
  drill: 'Drill',
  samHum: 'SamHum',
  landingNav: 'LandingNav',
  ingenuity: 'Ingenuity',
  // Chapter 7 · James Webb Space Telescope
  lightTravel: 'LightTravel',
  infraredLens: 'InfraredLens',
  mirrorPuzzle: 'MirrorPuzzle',
  fairingFold: 'FairingFold',
  deployParts: 'DeployParts',
  lagrange: 'Lagrange',
  mirrorAlign: 'MirrorAlign',
  sunshieldGuard: 'SunshieldGuard',
  deepField: 'DeepField',
  spectrum: 'Spectrum'
};

const OVERLAYS = ['Pause', 'Settings'];

function stopOverlays(scene) {
  OVERLAYS.forEach((k) => {
    if (scene.scene.isActive(k) || scene.scene.isPaused(k)) scene.scene.stop(k);
  });
}

function transition(scene, key, data) {
  Speech.stop();
  stopOverlays(scene);
  const cam = scene.cameras && scene.cameras.main;
  const go = () => {
    scene.scene.start(key, data);
  };
  if (!cam || scene._leaving) return go();
  scene._leaving = true;
  cam.once('camerafadeoutcomplete', go);
  cam.fadeOut(280, 7, 11, 29);
}

export const Flow = {
  chapterId: null,
  stepIndex: 0,

  steps(chapterId = this.chapterId) {
    const ch = Content.chapter(chapterId);
    return ch ? ch.steps : [];
  },

  payloadFor(chapterId, index) {
    const ch = Content.chapter(chapterId);
    const step = ch.steps[index];
    const cfg = step.data ? ch[step.data] : step;
    if (step.data && !cfg) {
      console.warn(`[Flow] Chapter "${chapterId}" step ${index} points to missing config block "${step.data}".`);
    }
    return { chapterId, stepIndex: index, step, cfg: cfg || {} };
  },

  start(scene, chapterId, index = 0) {
    const steps = this.steps(chapterId);
    if (!steps.length) return this.home(scene);
    index = Math.max(0, Math.min(index, steps.length - 1));
    this.chapterId = chapterId;
    this.stepIndex = index;
    const step = steps[index];
    const key = SCENE_FOR_TYPE[step.type];
    if (!key) {
      console.warn(`[Flow] Unknown step type "${step.type}" - skipping it.`);
      return this.start(scene, chapterId, index + 1);
    }
    transition(scene, key, this.payloadFor(chapterId, index));
  },

  // Called by an activity when the player finishes it.
  next(scene, stars) {
    const { chapterId, stepIndex } = scene.payload || this;
    Progress.completeStep(chapterId, stepIndex, stars);
    const steps = this.steps(chapterId);
    if (stepIndex + 1 < steps.length) {
      this.start(scene, chapterId, stepIndex + 1);
    } else {
      Progress.completeChapter(chapterId);
      this.chapters(scene);
    }
  },

  restart(scene) {
    const { chapterId, stepIndex } = scene.payload || this;
    this.start(scene, chapterId, stepIndex);
  },

  skip(scene) {
    this.next(scene);
  },

  home(scene) {
    Sfx.stopLoops();
    transition(scene, 'Title', {});
  },

  chapters(scene, focusChapter) {
    Sfx.stopLoops();
    transition(scene, 'ChapterSelect', { focus: focusChapter });
  },

  nextChapterId(chapterId) {
    const list = Content.playableChapters();
    const i = list.findIndex((c) => c.id === chapterId);
    return i >= 0 && i + 1 < list.length ? list[i + 1].id : null;
  }
};
