// src/main.js — app boot, event wiring, state → DOM sync

import { initialState, reduce, currentView } from './state.js';
import { createI18n } from './i18n.js';
import { loadProgress, saveProgress, clearProgress } from './storage.js';
import { renderScreen } from './ui/screens.js';

async function loadJson(path) {
  const res = await fetch(`${path}?v=${Date.now()}`);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function resolveAssetPaths(episode, lang) {
  // Only swap lang suffix if the path already has one (e.g., comics/ep0X_zh.png).
  // Paths without a lang suffix (e.g., bg/ruins_2050.png) are language-agnostic
  // and pass through unchanged.
  const clone = structuredClone(episode);
  const cacheBust = `?t=${Date.now()}`; // Dynamic cache busting
  for (const s of clone.screens) {
    if (s.type === 'cold_open' || s.type === 'outro') {
      s.image = s.image.replace(/_(zh|en)\.png$/, `_${lang}.png`) + cacheBust;
    }
    if (s.type === 'vn' && s.partner?.sprite) {
      s.partner.sprite += cacheBust;
    }
  }
  return clone;
}

async function boot() {
  const [scriptZh, scriptEn, uiZh, uiEn] = await Promise.all([
    loadJson('./data/script.zh.json'),
    loadJson('./data/script.en.json'),
    loadJson('./data/ui.zh.json'),
    loadJson('./data/ui.en.json')
  ]);

  const uiResources = { zh: uiZh, en: uiEn };
  const scripts = { zh: scriptZh, en: scriptEn };

  const saved = loadProgress();
  let state = initialState(scripts[saved?.lang || 'zh'], 'EP01');
  if (saved) state = { ...state, ...saved, script: scripts[saved.lang || 'zh'] };

  const i18n = createI18n(uiResources, state.lang);

  const refs = {
    stage: document.querySelector('#stage'),
    dialoguePanel: document.querySelector('.dialogue-panel'),
    dialogueContent: document.querySelector('[data-slot="dialogue-content"]')
  };
  const nextBtn = document.querySelector('[data-slot="next"]');
  const langBtn = document.querySelector('[data-slot="lang-toggle"]');
  const restartBtn = document.querySelector('[data-slot="restart"]');
  const progressFill = document.querySelector('[data-slot="progress-fill"]');
  const progressValue = document.querySelector('[data-slot="progress-value"]');
  const progressLabel = document.querySelector('[data-slot="progress-label"]');
  const epLabel = document.querySelector('[data-slot="ep-label"]');

  function paint() {
    const { episode, screen, lineIdx } = currentView(state);
    const epi = resolveAssetPaths(episode, state.lang);
    const screenWithAssets = epi.screens[state.screenIdx];

    renderScreen(refs, screenWithAssets, lineIdx, state, i18n, (optionId) => {
      state = reduce(state, { type: 'CHOOSE', optionId });
      saveProgress(state);
      paint();
    });

    progressLabel.textContent = i18n.t('learning_progress');
    progressValue.textContent = `${state.learningScore}/100`;
    progressFill.style.width = `${state.learningScore}%`;
    epLabel.textContent = `EP.${episode.id.slice(2)}`;
    langBtn.textContent = i18n.t('lang_toggle');

    nextBtn.textContent = screenWithAssets.type === 'outro' ? i18n.t('restart') : i18n.t('next');
    nextBtn.disabled = (screenWithAssets.type === 'choice' && lineIdx === 0);
    restartBtn.title = i18n.t('restart');
  }

  nextBtn.addEventListener('click', () => {
    state = reduce(state, { type: 'NEXT' });
    saveProgress(state);
    paint();
  });

  langBtn.addEventListener('click', () => {
    const newLang = state.lang === 'zh' ? 'en' : 'zh';
    i18n.setLang(newLang);
    state = { ...state, lang: newLang, script: scripts[newLang] };
    saveProgress(state);
    paint();
  });

  restartBtn.addEventListener('click', () => {
    state = reduce(state, { type: 'RESTART' });
    saveProgress(state);
    paint();
  });

  paint();
}

boot().catch(err => {
  document.body.innerHTML = `<pre style="color:#ff6666;padding:40px;font-family:monospace">Boot error: ${err.message}\n${err.stack || ''}</pre>`;
});
