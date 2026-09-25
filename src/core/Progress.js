// Remembers which activities the player has finished (per browser).

const KEY = 'starSailors.progress.v1';

function load() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : { chapters: {} };
  } catch {
    return { chapters: {} };
  }
}

const state = load();

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore - progress just won't persist */
  }
}

function chapter(id) {
  if (!state.chapters[id]) state.chapters[id] = { steps: {}, completed: false, stars: {} };
  return state.chapters[id];
}

export const Progress = {
  completeStep(chapterId, index, stars) {
    const ch = chapter(chapterId);
    ch.steps[index] = true;
    if (typeof stars === 'number') ch.stars[index] = Math.max(ch.stars[index] || 0, stars);
    save();
  },
  completeChapter(chapterId) {
    chapter(chapterId).completed = true;
    save();
  },
  isStepDone(chapterId, index) {
    return !!chapter(chapterId).steps[index];
  },
  isChapterDone(chapterId) {
    return !!chapter(chapterId).completed;
  },
  stars(chapterId, index) {
    return chapter(chapterId).stars[index] || 0;
  },
  doneCount(chapterId) {
    return Object.keys(chapter(chapterId).steps).length;
  },
  reset() {
    state.chapters = {};
    save();
  }
};
