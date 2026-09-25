// Player settings (accessibility + audio). Saved in the browser when possible.

const KEY = 'starSailors.settings.v1';

const prefersReducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const DEFAULTS = {
  readAloud: true, // narrate text with a voice file or the browser's text-to-speech
  voiceRate: 1, // 0.8 slow, 1 normal, 1.15 fast
  musicVolume: 0.35,
  sfxVolume: 0.8,
  largeText: false,
  reducedMotion: prefersReducedMotion(), // no screen shake, fewer flashing effects
  relaxed: false, // easier mini-games: slower, more forgiving
  sharp: true // full-resolution graphics (turn off on slow computers)
};

const listeners = new Set();

function loadSaved() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

const data = { ...DEFAULTS, ...loadSaved() };

export const Settings = {
  get(key) {
    return data[key];
  },
  set(key, value) {
    data[key] = value;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage may be blocked (private mode) - settings still work for this visit */
    }
    listeners.forEach((fn) => fn(key, value));
  },
  all() {
    return { ...data };
  },
  on(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  textScale() {
    return data.largeText ? 1.18 : 1;
  }
};
