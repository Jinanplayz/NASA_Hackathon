// Creates Captain Nova's narration with ElevenLabs, ONCE, and saves it as MP3 files.
// The game then plays those files; it never contacts ElevenLabs itself.
//
//   npm run voices          generate anything new or changed
//   npm run voices -- --dry show what would be generated (no API calls)
//
// Needs ELEVENLABS_API_KEY in a .env file in the project folder (never commit that file).
// Voice and model are set in public/content/game.json -> "narration".
// Only lines that are new or were edited are sent to ElevenLabs, so re-running is cheap.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { voiceKey } from '../src/core/voiceText.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'public', 'content');
const DRY = process.argv.includes('--dry');

// ---------- settings ----------
const game = readJSON(path.join(CONTENT, 'game.json'));
const narration = {
  voiceName: 'Sarah',
  voiceId: 'EXAVITQu4vr4xnSDxMaL',
  model: 'eleven_multilingual_v2',
  format: 'mp3_44100_96',
  settings: { stability: 0.6, similarity_boost: 0.8, style: 0.05, use_speaker_boost: true, speed: 0.95 },
  ...(game.narration || {})
};

// Words the voice should say differently from how they're written (the screen text is unchanged).
const PRONOUNCE = [
  [/\s*\(S-IC\)/g, ''],
  [/\s*\(S-II\)/g, ''],
  [/\s*\(S-IVB\)/g, ''],
  [/\b1202\b/g, 'twelve oh two'],
  [/\bTIROS-1\b/g, 'TIROS 1'],
  [/\s·\s/g, '. ']
];

// Config keys whose text is only shown on screen, never spoken.
const NOT_SPOKEN = new Set([
  'id', 'type', 'data', 'card', 'icon', 'model', 'key', 'color', 'src', 'poster', 'visual', 'bin', 'answer',
  'side', 'picture', 'kind', 'folder', 'art', 'audio', 'alt', 'credit', 'video', 'image', 'endLabel', 'continue',
  'labels', 'checkLabel', 'listTitle', 'listHint', 'cluesTitle', 'barTitle', 'stepLabel', 'copyLabel',
  'liftoffText', 'taskTitles', 'switchLabel', 'blueprintTitle', 'notToScale', 'trayTitle', 'progressLabel',
  'orbitLabel', 'launchLabel', 'stageText', 'driftLabel', 'puffLabel', 'good', 'early', 'late', 'thrust',
  'altitude', 'vspeed', 'hspeed', 'fuel', 'padLabel', 'rocksLabel', 'controls', 'heightLabel', 'drogueBtn',
  'mainBtn', 'splash', 'signal', 'bagLabel', 'collectTitle', 'sortTitle', 'retry', 'confirm', 'holdLabel',
  'aimLeft', 'aimRight', 'next', 'back', 'finish', 'badge', 'lines', 'hits', 'dayLabels', 'sub', 'nodes',
  'categories', 'stats', 'steerBack', 'hint', 'dept', 'bumpsLabel', 'panelHint', 'ratedLabel', 'rocketLabel',
  'travelLabel', 'airLabel', 'shieldLabel', 'shallowLabel', 'steepLabel', 'fuelLeft', 'selectedLabel',
  'swipeHint', 'subtitle', 'steps_meta', 'a', 'b', 'layersName', 'helpLabel', 'helpYes', 'helpNo', 'tips', 'music'
]);

function readJSON(f) {
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

function loadKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  const envFile = path.join(ROOT, '.env');
  if (fs.existsSync(envFile)) {
    const m = fs.readFileSync(envFile, 'utf8').match(/^\s*ELEVENLABS_API_KEY\s*=\s*(.+)\s*$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  }
  return null;
}

// ---------- collect every spoken line ----------
const lines = new Map(); // key -> { text, folder }

function add(text, folder) {
  if (typeof text !== 'string' || text.includes('{')) return; // {placeholders} are filled in while playing
  const key = voiceKey(text);
  if (!key || !/[A-Za-z0-9]/.test(key)) return;
  if (!lines.has(key)) lines.set(key, { text: key, folder });
}

function walk(node, folder, trail) {
  if (Array.isArray(node)) return node.forEach((v) => walk(v, folder, trail));
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (NOT_SPOKEN.has(k)) continue;
      const parent = trail[trail.length - 1];
      if (k === 'year' && !trail.includes('tvs')) continue; // years are spoken only by the TV milestones
      if (k === 'title' && (trail.length === 0 || parent === 'complete' || String(parent).endsWith('Reveal'))) continue;
      if (k === 'items' && trail.includes('pages')) continue; // summary cards are read, not spoken
      if (k === 'name' && trail.includes('layers')) continue; // gauge labels
      if (k === 'name' && trail.includes('tools')) continue; // tool captions
      walk(v, folder, trail.concat(k));
    }
    return;
  }
  add(node, folder);
}

for (const ch of game.chapters.filter((c) => c.folder && !c.comingSoon)) {
  const data = readJSON(path.join(CONTENT, ch.folder, 'scene.json'));
  const { steps, title, ...rest } = data; // step names are only shown in the menus
  walk(rest, ch.folder, []);
}
// a few interface lines that are spoken
['readAloudOn', 'voiceTest', 'allDone', 'welcomeHome'].forEach((k) => add(game.ui && game.ui[k], ''));

// ---------- plan ----------
const signature = JSON.stringify([narration.voiceId, narration.model, narration.format, narration.settings]);
const plan = [...lines.values()].map((l) => {
  const hash = crypto.createHash('sha1').update(signature + '|' + l.text).digest('hex').slice(0, 16);
  const rel = (l.folder ? `${l.folder}/audio/voice/` : 'voice/') + `${hash}.mp3`;
  const spoken = PRONOUNCE.reduce((t, [re, to]) => t.replace(re, to), l.text);
  return { ...l, rel, abs: path.join(CONTENT, rel), spoken };
});
const todo = plan.filter((p) => !(fs.existsSync(p.abs) && fs.statSync(p.abs).size > 0));
const chars = todo.reduce((n, p) => n + p.spoken.length, 0);

console.log(`Voice: ${narration.voiceName} (${narration.voiceId}), model ${narration.model}`);
console.log(`${plan.length} spoken lines, ${plan.length - todo.length} already recorded, ${todo.length} to generate (${chars.toLocaleString()} characters).`);

if (DRY) {
  todo.slice(0, 15).forEach((p) => console.log('  -', p.spoken.slice(0, 90)));
  if (todo.length > 15) console.log(`  ... and ${todo.length - 15} more`);
  process.exit(0);
}

// ---------- generate ----------
const KEY = loadKey();
if (todo.length && !KEY) {
  console.error('\nNo ElevenLabs key found. Create a .env file with ELEVENLABS_API_KEY=your-key');
  process.exit(1);
}

let format = narration.format;
async function tts(text) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${narration.voiceId}?output_format=${format}`, {
      method: 'POST',
      headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
      body: JSON.stringify({ text, model_id: narration.model, voice_settings: narration.settings })
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const body = await res.text();
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1500 * attempt));
      continue;
    }
    if (/output_format/i.test(body) && format !== 'mp3_44100_128') {
      format = 'mp3_44100_128'; // this plan doesn't offer the smaller format
      continue;
    }
    const err = new Error(`ElevenLabs ${res.status}: ${body.slice(0, 300)}`);
    err.fatal = res.status === 401 || /quota|credits|limit/i.test(body);
    throw err;
  }
  throw new Error('ElevenLabs kept rate-limiting; try again in a minute.');
}

let done = 0, failed = 0, stop = false;
async function worker(queue) {
  while (queue.length && !stop) {
    const p = queue.shift();
    try {
      const mp3 = await tts(p.spoken);
      fs.mkdirSync(path.dirname(p.abs), { recursive: true });
      fs.writeFileSync(p.abs, mp3);
      done++;
      if (done % 20 === 0 || done === todo.length) console.log(`  ${done}/${todo.length} done`);
    } catch (e) {
      failed++;
      console.error(`  ! "${p.text.slice(0, 60)}" - ${e.message}`);
      if (e.fatal) stop = true;
    }
  }
}
const queue = [...todo];
await Promise.all([1, 2, 3].map(() => worker(queue)));

// ---------- manifest + tidy up ----------
const files = {};
for (const p of plan) if (fs.existsSync(p.abs)) files[p.text] = p.rel;
fs.mkdirSync(path.join(CONTENT, 'voice'), { recursive: true });
fs.writeFileSync(
  path.join(CONTENT, 'voice', 'manifest.json'),
  JSON.stringify({ voice: { name: narration.voiceName, id: narration.voiceId }, model: narration.model, generated: new Date().toISOString(), files }, null, 1)
);

// remove recordings of lines that no longer exist
const keep = new Set(plan.map((p) => path.normalize(p.abs)));
let removed = 0;
const voiceDirs = [path.join(CONTENT, 'voice')].concat(game.chapters.filter((c) => c.folder).map((c) => path.join(CONTENT, c.folder, 'audio', 'voice')));
for (const dir of voiceDirs) {
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir)) {
    const full = path.normalize(path.join(dir, f));
    if (f.endsWith('.mp3') && !keep.has(full)) {
      fs.unlinkSync(full);
      removed++;
    }
  }
}

console.log(`\nDone: ${done} generated, ${failed} failed, ${removed} old files removed. ${Object.keys(files).length} lines have recordings.`);
if (failed) process.exitCode = 1;
