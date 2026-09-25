# Star Sailors 🚀

An educational web game about the history of space exploration, made for the
**NASA Space Apps Challenge**. A friendly astronaut guide, **Captain Nova**, walks
players from the very first satellite all the way to the Moon.

It runs in any modern browser on phones, tablets and computers, with nothing to install.

> "Star Sailors" is a placeholder name (the concept doc lists the name as TBD).
> Change it in `public/content/game.json`.

## What's in the prototype

| Chapter | Activities |
| --- | --- |
| **1 · The First Astronaut** (1957–1961) | Narrated intro (Sputnik, NASA, Gagarin, Mercury Seven, NASA film of Freedom 7) · **8 spaceship systems in detailed 3D** · **Build Freedom 7** (guided, only the right parts can be picked) · 3D reveal · **Fly to space** (dodge clouds, birds, winds, balloons and meteors through each layer of the atmosphere) · first photos from space and mission facts |
| **2 · Explorer 1** (1958) | What a satellite is (Newton's cannon) · NASA film · **Drag-and-drop assembly** of Explorer 1 · 3D reveal · **Guide it to orbit** while a row of TVs lights up (black & white, then colour) with the satellite milestones that followed · **Timing game** to keep the satellite steady · the Van Allen belt discovery |
| **3 · Apollo 11** (1969) | Intro with real NASA photos and film · **Parts checklist** (wrong parts explain why the mission would fail) · Saturn V in 3D · **Research**: rate how hard 5 parts were to build, with instant feedback · **Connect Mission Control** (the real chain of communication) · **Launch countdown** (arrow sequences, or swipes on phones) · NASA launch footage · **Dodge to the Moon** · **Land the Eagle** (thrust, side jets, fuel, the real 1202 alarm, and an optional *Landing help* computer) · NASA moonwalk footage · **Collect and sort Moon samples** · **Repair and prepare for re-entry** (Buzz Aldrin's felt-tip pen fix, Service Module separation, heat shield, entry angle) · **Splashdown** (parachutes, flip the upside-down capsule, safety gear) · **Helicopter search and rescue** · **Mission summary** |

Later missions (Apollo 13, Voyager 1, Mars rovers, JWST) appear as "coming soon".

## Accessibility

- **Read aloud**: every message is spoken by Captain Nova's recorded voice (see *Narration* below), and every spoken line is also shown on screen as text.
- **Bigger text**, **Calm motion** (no screen shake or fast flashing) and **Relaxed mode** (slower, more forgiving mini-games) in Settings.
- Play with **touch, mouse or keyboard**: TAB and SHIFT+TAB move a yellow focus ring, ENTER presses, and arrow keys, space and WASD work in the games.
- **Pause menu** on every screen (ESC or ☰), with Restart and **Skip activity**, so nobody gets stuck.
- The **Lexend** font was designed for easy reading; the colours are high contrast.
- Nobody can "lose": mistakes explain what went wrong and let you try again.

## Run it locally

You need [Node.js](https://nodejs.org) 20.19+ or 22.12+ (required by Vite 8).

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

**Testing shortcut:** add `?chapter=scene3&step=8` to the address to jump straight
to an activity (`step` counts from 0 in that chapter's `steps` list). The chapter menu
(☰ on each chapter card) also lets you jump to any activity.

## Build and deploy

```bash
npm run build     # creates the dist/ folder
npm run preview   # serves dist/ to check it
```

`dist/` is a plain static website that can be hosted anywhere.

### Cloudflare Pages

**Option A – connect the GitHub repo** (rebuilds automatically on every push):

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**, and pick this repo.
2. Framework preset: **None** (or Vite). Build command: `npm run build`. Build output directory: `dist`.
3. Save and deploy. The Node version comes from `.node-version` (22).

**Option B – upload by hand:** run `npm run build`, then in **Workers & Pages** → **Create** → **Pages** →
**Upload assets**, drag in the `dist` folder. (Or run `npx wrangler pages deploy dist`.)

Nothing secret is needed to build or host the game: the narration is already recorded, so **never add the
ElevenLabs key to Cloudflare**. `public/_headers` tells Cloudflare to let browsers cache the game files and
voice recordings, so repeat visits load quickly. NASA's films and photos stream from NASA's own servers.

A GitHub Pages workflow is also included (`.github/workflows/deploy.yml`); it only runs when started by hand
from the repo's **Actions** tab.

## Editing the text, facts, videos and audio (no coding needed)

Everything the player reads or hears is in **`public/content/`**:

```
public/content/
  game.json              title, guide name, chapter list, button labels
  scene1/scene.json      Chapter 1: every sentence, fact, part and activity setting
  scene1/video/          drop your own video files here
  scene1/audio/          drop voice-over recordings here
  scene1/images/         drop photos here
  scene2/...             Chapter 2 (Explorer 1)
  scene3/...             Chapter 3 (Apollo 11)
```

See **[public/content/README.md](public/content/README.md)** for a step-by-step guide:
how to change text, add your own videos, voice-overs and photos, reorder activities,
and fix typing mistakes in the JSON files.

## How the code is organised

```
src/
  main.js                start-up (loads fonts and content, starts Phaser)
  core/                  settings, save progress, content loader, sound synth, speech, scene flow
  ui/                    buttons, guide speech bubble, top bar, pop-ups, sliders, keyboard focus
  art/                   all pictures are painted in code at start-up (no image files)
  three/                 three.js 3D viewer and the detailed 3D models
  scenes/                one file per screen / mini-game
    ch1/ ch2/ ch3/       activities for each chapter
    common/              backgrounds and the animated cutscene pictures
```

- **Phaser 3** runs the game; **three.js** draws the detailed 3D spacecraft models, as the concept doc specifies.
- The game is designed at 1280 × 720 and scales to fit any landscape screen (it asks phones to rotate).
- **Sharp on every screen:** the canvas always has exactly as many pixels as the part of the screen it covers
  (up to 4K), and updates when the window is resized, goes full screen or moves to another monitor. On big
  high-resolution screens the pictures are painted at 3×, and computers get NASA's 720p films and 1920 px photos
  (phones keep the smaller, faster ones). *Sharp graphics* in Settings can be turned off on slow computers.
- Sound effects and music are made with the Web Audio API, so there are no audio files to download.
  Each kind of screen has its own soft background music (calm menus, a lab tune for building,
  spacey pads in orbit, waves for splashdown...). It fades under the narration and goes silent while a NASA film plays.
- three.js is loaded as a separate file in the background, so the game starts faster.
- Progress and settings are saved in the browser (localStorage).

## Narration (Captain Nova's voice)

All spoken lines were generated **once** with [ElevenLabs](https://elevenlabs.io)
(voice "Sarah", model `eleven_multilingual_v2`) and saved as MP3 files in each chapter's
`audio/voice/` folder, with a lookup list in `public/content/voice/manifest.json`.
The game only plays these files: it never contacts ElevenLabs, and no key is in the game.

**After editing any text**, regenerate just the changed lines:

```bash
npm run voices -- --dry   # shows what would be generated and how many characters
npm run voices            # generates new/changed lines and deletes unused ones
```

This needs a `.env` file in the project folder containing `ELEVENLABS_API_KEY=...`.
`.env` is listed in `.gitignore`, so the key is never committed. To use a different voice, change
`narration.voiceId` in `public/content/game.json` and run `npm run voices` (this re-records every line).
Any line without a recording falls back to the browser's built-in voice, and the browser
console notes which lines need recording.

## Real NASA media

The cutscenes stream short public-domain videos and photos straight from
[NASA's Image and Video Library](https://images.nasa.gov), which keeps the download small.
If a video or photo can't load (for example when offline), the game shows an
animated illustration instead. To use local copies, download the files into the
chapter's `video/` or `images/` folder and change the `src` in `scene.json`.

NASA media is generally not copyrighted, but NASA's name and logos must not be used to
imply endorsement. See [NASA's media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/).

## Where AI was used

The game code, procedural art, 3D models and first drafts of the educational text
were produced with the help of an AI assistant (Claude, by Anthropic), following the
team's concept document. The narration voice was generated with ElevenLabs' AI text-to-speech. **The research team should check every fact** in
`public/content/*/scene.json` before submission.

## Credits

- Concept and project team: Ahnaf Saleque, Abdullah Al Nahian, Labib Azmain, Takrim Hossain
- Videos and photos: NASA (images.nasa.gov)
- Narration voice: generated with [ElevenLabs](https://elevenlabs.io)
- Font: [Lexend](https://www.lexend.com) (SIL Open Font License)
- Built with [Phaser](https://phaser.io), [three.js](https://threejs.org) and [Vite](https://vitejs.dev)
