// src/storage.js — localStorage wrapper, swappable for tests via inject
const KEY = 'a2h-echo-v1';

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveProgress(state, storage = globalThis.localStorage) {
  try {
    const snapshot = {
      episodeId: state.episodeId,
      screenIdx: state.screenIdx,
      lineIdx: state.lineIdx,
      learningScore: state.learningScore,
      choices: state.choices,
      lang: state.lang
    };
    storage?.setItem(KEY, JSON.stringify(snapshot));
  } catch {}
}

export function clearProgress(storage = globalThis.localStorage) {
  try { storage?.removeItem(KEY); } catch {}
}
