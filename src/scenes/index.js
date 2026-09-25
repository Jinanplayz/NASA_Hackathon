import { BootScene } from './BootScene.js';
import { TitleScene } from './TitleScene.js';
import { ChapterSelectScene } from './ChapterSelectScene.js';
import { PauseScene } from './PauseScene.js';
import { SettingsScene } from './SettingsScene.js';
import { CutsceneScene } from './CutsceneScene.js';
import { ChapterCompleteScene } from './ChapterCompleteScene.js';
// Chapter 1 · Freedom 7
import { SystemsScene } from './ch1/SystemsScene.js';
import { BuilderScene } from './ch1/BuilderScene.js';
import { ModelRevealScene } from './ch1/ModelRevealScene.js';
import { AscentScene } from './ch1/AscentScene.js';
// Chapter 2 · Explorer 1
import { AssemblyScene } from './ch2/AssemblyScene.js';
import { OrbitControlScene } from './ch2/OrbitControlScene.js';
import { BalanceScene } from './ch2/BalanceScene.js';
// Chapter 3 · Apollo 11
import { PartsListScene } from './ch3/PartsListScene.js';
import { ResearchScene } from './ch3/ResearchScene.js';
import { WiringScene } from './ch3/WiringScene.js';
import { LaunchSequenceScene } from './ch3/LaunchSequenceScene.js';
import { SpaceDodgeScene } from './ch3/SpaceDodgeScene.js';
import { LunarLandingScene } from './ch3/LunarLandingScene.js';
import { SamplesScene } from './ch3/SamplesScene.js';
import { RepairScene } from './ch3/RepairScene.js';
import { SplashdownScene } from './ch3/SplashdownScene.js';
import { RescueScene } from './ch3/RescueScene.js';
import { SummaryScene } from './ch3/SummaryScene.js';

// Overlay scenes (Pause, Settings) are listed last so they draw on top.
export const ALL_SCENES = [
  BootScene,
  TitleScene,
  ChapterSelectScene,
  CutsceneScene,
  ChapterCompleteScene,
  SystemsScene,
  BuilderScene,
  ModelRevealScene,
  AscentScene,
  AssemblyScene,
  OrbitControlScene,
  BalanceScene,
  PartsListScene,
  ResearchScene,
  WiringScene,
  LaunchSequenceScene,
  SpaceDodgeScene,
  LunarLandingScene,
  SamplesScene,
  RepairScene,
  SplashdownScene,
  RescueScene,
  SummaryScene,
  PauseScene,
  SettingsScene
];
