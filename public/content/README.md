# Editing the game content

Every word, fact, video and voice-over in the game lives in this folder, so you can
change information **without touching any code**. After saving a file, refresh the
browser to see the change (with `npm run dev` running).

```
content/
  game.json            title, guide name, chapter cards, all button labels
  scene1/              Chapter 1 · The First Astronaut (Freedom 7)
    scene.json         all text + settings for this chapter
    video/             your own video files
    audio/             voice-over recordings
    images/            photos
  scene2/              Chapter 2 · Explorer 1
  scene3/              Chapter 3 · Apollo 11
```

## JSON in 60 seconds

The `.json` files are plain text. Open them in any text editor (VS Code, Notepad++…).
Rules that matter:

- Text goes inside double quotes: `"text": "Hello!"`
- Items in a list or block are separated by commas, and there is **no comma after the last one**.
- To use a double quote inside text, write `\"`, or use single quotes `'like this'` instead.
- If you break a file, the game shows a message telling you **which file and which line**.

## How a chapter is put together

Each `scene.json` starts with a list of **steps**. The game plays them in order:

```json
"steps": [
  { "type": "cutscene", "data": "intro", "name": "The space race begins" },
  { "type": "systems",  "data": "systems", "name": "8 systems of a spaceship" },
  ...
]
```

- `type` is **which kind of activity** runs (see the table below).
- `data` is **the name of the block** further down in the same file that holds its text.
- `name` is shown in the top bar and in the chapter's activity list.

You can **reorder, remove or repeat** steps. For example, to add another narrated "video",
add a step `{ "type": "cutscene", "data": "myNewVideo", "name": "..." }` and a block
`"myNewVideo": { "slides": [ ... ] }`.

| type | What it is | Used in |
| --- | --- | --- |
| `cutscene` | Narrated slides: animations, NASA photos or NASA videos | all chapters |
| `systems` | Scroll through spaceship systems shown in 3D | Ch 1 |
| `builder` | Guided parts picking (only correct parts can be chosen) | Ch 1 |
| `modelReveal` | Big 3D model with facts (`model`: `mercuryRedstone`, `explorer1`, `saturnV`) | all |
| `ascent` | Fly up through the atmosphere | Ch 1 |
| `assembly` | Drag-and-drop satellite assembly | Ch 2 |
| `orbitControl` | Steer to orbit while TVs light up | Ch 2 |
| `balance` | Timing bar game | Ch 2 |
| `partsList` | Checklist parts picking (wrong parts explain why) | Ch 3 |
| `research` | Tap parts and rate how hard they were to build | Ch 3 |
| `wiring` | Connect the teams | Ch 3 |
| `launchSequence` | Arrow/swipe launch countdown | Ch 3 |
| `spaceDodge` | Dodge satellites and space rocks | Ch 3 |
| `lunarLanding` | Land the Eagle | Ch 3 |
| `samples` | Collect and sort Moon samples | Ch 3 |
| `repair` | Fix the switch and prepare for re-entry | Ch 3 |
| `splashdown` | Parachutes, flip the capsule, safety gear | Ch 3 |
| `rescue` | Helicopter search | Ch 3 |
| `summary` | Mission summary pages | Ch 3 |
| `chapterComplete` | Badge and "chapter complete" screen | all |

## Cutscenes (the narrated "videos")

```json
"intro": {
  "slides": [
    {
      "year": "1957",
      "heading": "Sputnik 1",
      "text": "On October 4, 1957 ...",
      "visual": "sputnik"
    },
    {
      "heading": "Freedom 7",
      "text": "Let's watch NASA's film of that day!",
      "video": { "src": "video/freedom7.mp4", "start": 0, "end": 45, "credit": "Video: NASA" },
      "visual": "freedom7Launch"
    },
    {
      "heading": "The Mercury Seven",
      "text": "...",
      "image": { "src": "images/mercury7.jpg", "alt": "The seven astronauts" },
      "credit": "Photo: NASA"
    }
  ],
  "endLabel": "Let's explore!"
}
```

- `visual` is the animated drawing shown for the slide. It is also the **backup** if a
  video or photo can't load. Available visuals: `sky`, `sputnik`, `nasa`, `vostok`,
  `starSailor`, `mercurySeven`, `freedom7Launch`, `junoLaunch`, `saturnLaunch`, `systems`,
  `v2photo`, `periscope`, `freedom7Arc`, `splashMercury`, `moonGolf`, `moonOrbit`,
  `newtonCannon`, `satelliteUses`, `vanAllen`, `explorerFacts`, `explorerSpin`,
  `explorerLegacy`, `kennedy`, `saturnPad`, `crew`, `spacecraftNames`, `tripToMoon`,
  `moonwalk`, `lunarDescent`, `reentry`, `chutes`, `splashApollo`, `earthrise`, `controlRoom`.
- `video.src` / `image.src` can be a file in this chapter's folder (`video/…`, `images/…`)
  or a full web address (`https://…`). NASA's library (https://images.nasa.gov) gives
  direct `.mp4` and `.jpg` links.
- `start` and `end` (seconds) play only part of a long video.
- The slide text is read aloud first, then the video plays.
- Slides move on by themselves after the narration. The last slide waits for the player.

## Captain Nova's voice (generated narration)

Every spoken line has a recording in the chapter's `audio/voice/` folder, made with
ElevenLabs by `npm run voices`. **When you change or add text, run `npm run voices` again**:
it records only the new or changed lines and removes the unused ones. Until you do, changed
lines are read by the browser's built-in voice instead. The voice and model are set in
`game.json` under `"narration"`.

Lines containing `{placeholders}` (like `{hits}` or `{pct}`) change every game, so they
can't be recorded ahead of time. They are read by the browser's built-in voice instead.

Lines with years, speeds, distances, temperatures or measurements (like `1969`, `8,262 km/h`,
`2,760 °C` or `108 minutes`) are recorded with the numbers written out in words
("nineteen sixty-nine", "eight thousand two hundred sixty-two kilometers per hour"), because
the voice sometimes garbles them otherwise. This happens automatically; the text on screen
keeps the numbers.

## Adding your own voice-over recordings

To use a human recording for a particular line instead:

1. Put the file (`.mp3`, `.m4a` or `.ogg`) in the chapter's `audio/` folder.
2. For a **cutscene slide**, add `"audio": "audio/intro-1.mp3"` to the slide.
3. For a **guide line** (the astronaut's speech bubble), change the plain text into an object:

```json
"intro": [
  { "text": "Every spaceship is made of a few big systems...", "audio": "audio/systems-1.mp3" },
  "This line still uses Captain Nova's generated voice."
]
```

A line's own `"audio"` file always takes priority over the generated narration.
If an audio file is missing, the game falls back to the generated narration or the built-in voice.
Add `"speak": "..."` to a line when the spoken words should differ from the written
ones (for example to spell out a tricky name).

## Common edits

- **Game title / guide name**: `game.json` → `title`, `guide.name`
- **Button words** (Next, Settings, Play…): `game.json` → `ui`
- **Chapter cards and "coming soon" list**: `game.json` → `chapters`
- **Facts on the 8 systems**: `scene1/scene.json` → `systems.items`
- **Right and wrong rocket parts**: `builder.parts` (Ch 1), `partsList.parts` (Ch 3). Set `"correct": true/false`; wrong parts need a `"why"`.
- **Research difficulty answers**: `scene3/scene.json` → `research.items[].answer` (`hard`, `veryHard` or `extreme`) and `research.categories`
- **Mission Control links**: `scene3/scene.json` → `wiring.nodes` (team boxes and their x/y position) and `wiring.links` (correct connections with their clue)
- **TV milestones**: `scene2/scene.json` → `orbit.tvs` (`color: false` shows black & white)
- **Mini-game length**: `ascent.goalKm`, `balance.goal`, `dodge.duration`
- **Title screen**: `game.json` → `title` (the last word goes on the second, bigger line),
  `subtitle`, and `subtitleHighlight` (the words of the subtitle shown in blue).
- **Orbit TVs label**: `scene2/scene.json` → `orbit.tvsTitle`
- **Background music**: each screen picks a mood automatically. To change it, add `"music": "space"` to an activity's block.
  Moods: `menu`, `story`, `lab`, `sky`, `space`, `tension`, `moon`, `ocean`, `triumph`.

## Fact checking

Everything was written to be accurate and simple, but **please have the research team
verify every date and number** before the final submission. Facts are grouped by
chapter in each `scene.json`, so they're easy to review.
