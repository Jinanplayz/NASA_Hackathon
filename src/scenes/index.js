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
// Chapter 4 · Apollo 13
import { SimulatorScene } from './ch4/SimulatorScene.js';
import { StageBurnScene } from './ch4/StageBurnScene.js';
import { DiagnoseScene } from './ch4/DiagnoseScene.js';
import { LifeboatScene } from './ch4/LifeboatScene.js';
import { PowerDownScene } from './ch4/PowerDownScene.js';
import { FreeReturnScene } from './ch4/FreeReturnScene.js';
import { ScrubberScene } from './ch4/ScrubberScene.js';
import { ManualBurnScene } from './ch4/ManualBurnScene.js';
import { PowerUpScene } from './ch4/PowerUpScene.js';
import { CauseChainScene } from './ch4/CauseChainScene.js';
// Chapter 5 · Voyager 1
import { LaunchWindowScene } from './ch5/LaunchWindowScene.js';
import { GoldenRecordScene } from './ch5/GoldenRecordScene.js';
import { RecordCoverScene } from './ch5/RecordCoverScene.js';
import { FlybyCameraScene } from './ch5/FlybyCameraScene.js';
import { IoPlumeScene } from './ch5/IoPlumeScene.js';
import { ColorFiltersScene } from './ch5/ColorFiltersScene.js';
import { DsnRelayScene } from './ch5/DsnRelayScene.js';
import { FamilyPortraitScene } from './ch5/FamilyPortraitScene.js';
import { MemoryFixScene } from './ch5/MemoryFixScene.js';
import { HeliopauseScene } from './ch5/HeliopauseScene.js';
// Chapter 6 · Mars rovers
import { MoonBuggyScene } from './ch6/MoonBuggyScene.js';
import { PaintByNumbersScene } from './ch6/PaintByNumbersScene.js';
import { AirbagBounceScene } from './ch6/AirbagBounceScene.js';
import { RoverProgramScene } from './ch6/RoverProgramScene.js';
import { DustDevilScene } from './ch6/DustDevilScene.js';
import { SkyCraneScene } from './ch6/SkyCraneScene.js';
import { DrillScene } from './ch6/DrillScene.js';
import { SamHumScene } from './ch6/SamHumScene.js';
import { LandingNavScene } from './ch6/LandingNavScene.js';
import { IngenuityScene } from './ch6/IngenuityScene.js';
// Chapter 7 · James Webb Space Telescope
import { LightTravelScene } from './ch7/LightTravelScene.js';
import { InfraredLensScene } from './ch7/InfraredLensScene.js';
import { MirrorPuzzleScene } from './ch7/MirrorPuzzleScene.js';
import { FairingFoldScene } from './ch7/FairingFoldScene.js';
import { DeployPartsScene } from './ch7/DeployPartsScene.js';
import { LagrangeScene } from './ch7/LagrangeScene.js';
import { MirrorAlignScene } from './ch7/MirrorAlignScene.js';
import { SunshieldGuardScene } from './ch7/SunshieldGuardScene.js';
import { DeepFieldScene } from './ch7/DeepFieldScene.js';
import { SpectrumScene } from './ch7/SpectrumScene.js';

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
  SimulatorScene,
  StageBurnScene,
  DiagnoseScene,
  LifeboatScene,
  PowerDownScene,
  FreeReturnScene,
  ScrubberScene,
  ManualBurnScene,
  PowerUpScene,
  CauseChainScene,
  LaunchWindowScene,
  GoldenRecordScene,
  RecordCoverScene,
  FlybyCameraScene,
  IoPlumeScene,
  ColorFiltersScene,
  DsnRelayScene,
  FamilyPortraitScene,
  MemoryFixScene,
  HeliopauseScene,
  MoonBuggyScene,
  PaintByNumbersScene,
  AirbagBounceScene,
  RoverProgramScene,
  DustDevilScene,
  SkyCraneScene,
  DrillScene,
  SamHumScene,
  LandingNavScene,
  IngenuityScene,
  LightTravelScene,
  InfraredLensScene,
  MirrorPuzzleScene,
  FairingFoldScene,
  DeployPartsScene,
  LagrangeScene,
  MirrorAlignScene,
  SunshieldGuardScene,
  DeepFieldScene,
  SpectrumScene,
  PauseScene,
  SettingsScene
];
