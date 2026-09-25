// Loads the editable text/config files from public/content/.
// Every scene of the game reads its words, facts and media paths from there,
// so the team can change information without touching code.

async function loadJSON(path) {
  let res;
  try {
    res = await fetch(path, { cache: 'no-cache' });
  } catch (e) {
    throw new Error(`Could not download "${path}".\n${e.message}`);
  }
  if (!res.ok) throw new Error(`Could not find "${path}" (HTTP ${res.status}).`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    // Point at the line so whoever edited the file can fix it quickly.
    const m = /position (\d+)/.exec(e.message);
    let where = '';
    if (m) {
      const pos = Number(m[1]);
      const before = text.slice(0, pos);
      const line = before.split('\n').length;
      const lineText = text.split('\n')[line - 1] || '';
      where = `\nAround line ${line}:\n  ${lineText.trim()}`;
    }
    throw new Error(
      `There is a typing mistake in "${path}".\n${e.message}${where}\n\n` +
        'Tip: check for a missing comma, an extra comma before } or ], or a missing quote mark.'
    );
  }
}

export const Content = {
  game: null,
  chapters: {},
  voice: null,

  async load() {
    // Pre-recorded narration (made with `npm run voices`). Optional: without it the
    // game falls back to the browser's built-in voice.
    const voice = fetch('content/voice/manifest.json', { cache: 'no-cache' })
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
    this.game = await loadJSON('content/game.json');
    // download every chapter at the same time
    const chapters = this.game.chapters.filter((ch) => ch.folder && !ch.comingSoon);
    const data = await Promise.all(chapters.map((ch) => loadJSON(`content/${ch.folder}/scene.json`)));
    chapters.forEach((ch, i) => {
      data[i]._folder = ch.folder;
      data[i]._meta = ch;
      this.chapters[ch.id] = data[i];
    });
    this.voice = await voice;
  },

  chapter(id) {
    return this.chapters[id];
  },

  playableChapters() {
    return this.game.chapters.filter((c) => !c.comingSoon && this.chapters[c.id]);
  },

  // Turns "video/launch.mp4" into "content/scene1/video/launch.mp4". Web links are kept as they are.
  media(chapterId, path) {
    if (!path) return null;
    if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path.replace(/^http:\/\//, 'https://');
    const ch = this.chapters[chapterId];
    const folder = ch ? ch._folder : chapterId;
    return `content/${folder}/${path}`;
  },

  ui(key, fallback = '') {
    return (this.game && this.game.ui && this.game.ui[key]) || fallback;
  }
};

// Lines in the config can be plain text or { "text": "...", "audio": "audio/file.mp3", "speak": "..." }.
export function lineText(line) {
  if (line == null) return '';
  if (typeof line === 'string') return line;
  return line.text || '';
}

export function lineAudio(line) {
  return line && typeof line === 'object' ? line.audio || null : null;
}

export function lineSpeak(line) {
  if (line && typeof line === 'object' && line.speak) return line.speak;
  return lineText(line);
}
