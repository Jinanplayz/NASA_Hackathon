// Shared by the game (Speech.js) and the narration generator (scripts/make-voices.mjs),
// so both turn text into exactly the same lookup keys.

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;
const SYMBOLS = /[•·→←↑↓▸★]/g;

// Tidies a piece of text for speaking.
export function cleanSpeech(s) {
  return String(s ?? '')
    .replace(EMOJI, '')
    .replace(SYMBOLS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// The key a line is stored under in content/voice/manifest.json.
export function voiceKey(s) {
  return cleanSpeech(s).normalize('NFC');
}

// Marks text that changes every game (scores, percentages...). It can't be recorded
// ahead of time, so it is always read by the browser's built-in voice.
export function live(text) {
  return { live: String(text ?? '') };
}

// Speech can be one string or a list of pieces (spoken one after another).
// Each piece is looked up on its own, so lines built from several pieces of the
// config (for example a part name + its description) still find their recordings.
// Returns [{ text, live }].
export function speechParts(input) {
  const list = Array.isArray(input) ? input : [input];
  return list
    .map((p) => (p && typeof p === 'object' && 'live' in p ? { text: cleanSpeech(p.live), live: true } : { text: cleanSpeech(p), live: false }))
    .filter((p) => p.text);
}
