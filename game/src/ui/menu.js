// src/ui/menu.js — Main menu and chapter select UI

export function renderMainMenu(container, state, i18n, handlers) {
  const hasSavedProgress = state.screenIdx > 0 || state.learningScore > 0;

  container.innerHTML = `
    <div class="menu-logo">ECHO</div>
    <div class="menu-subtitle">${i18n.t('game_subtitle')}</div>

    <div class="menu-buttons">
      <button class="menu-btn" data-action="new-game">${i18n.t('new_game')}</button>
      <button class="menu-btn" data-action="continue" ${!hasSavedProgress ? 'disabled' : ''}>
        ${i18n.t('continue_game')}
      </button>
      <button class="menu-btn" data-action="chapter-select">${i18n.t('chapter_select')}</button>
      <button class="menu-btn" data-action="toggle-lang">${i18n.t('lang_toggle')}</button>
    </div>

    <div class="menu-footer">
      <a href="https://a2hmarket.ai" target="_blank">a2hmarket.ai</a> · A2H UNIVERSE
    </div>
  `;

  container.querySelector('[data-action="new-game"]').addEventListener('click', handlers.onNewGame);
  const continueBtn = container.querySelector('[data-action="continue"]');
  if (hasSavedProgress) {
    continueBtn.addEventListener('click', handlers.onContinue);
  }
  container.querySelector('[data-action="chapter-select"]').addEventListener('click', handlers.onChapterSelect);
  container.querySelector('[data-action="toggle-lang"]').addEventListener('click', handlers.onToggleLang);
}

export function renderChapterSelect(container, state, i18n, handlers) {
  const episodes = state.script.episodes || [];

  container.innerHTML = `
    <div class="menu-logo">ECHO</div>
    <div class="menu-subtitle">${i18n.t('select_episode')}</div>

    <div class="chapter-select">
      ${episodes.map(ep => `
        <div class="chapter-card" data-episode-id="${ep.id}">
          <div class="chapter-card-title">EP.${ep.id.slice(2)} — ${ep.title}</div>
          <div class="chapter-card-desc">${ep.description || ''}</div>
        </div>
      `).join('')}
    </div>

    <button class="back-btn">← ${i18n.t('back_to_menu')}</button>
  `;

  container.querySelectorAll('.chapter-card').forEach(card => {
    card.addEventListener('click', () => {
      handlers.onSelectEpisode(card.dataset.episodeId);
    });
  });

  container.querySelector('.back-btn').addEventListener('click', handlers.onBack);
}
