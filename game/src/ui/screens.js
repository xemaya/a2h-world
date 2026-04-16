// src/ui/screens.js — paints #stage (theater) + [data-slot="dialogue-content"] separately.
// The HUD and the NEXT button are persistent DOM (handled in main.js).

const h = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null) continue;
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return el;
};

// ─── reusable scene pieces ───

function resolveSpritePath(characters, characterKey, emotion) {
  const char = characters?.[characterKey];
  if (!char) return `assets/echo/echo_${emotion || 'blank'}.png`;
  const fallbackEmotion = char.emotions?.[0] || 'blank';
  const actualEmotion = emotion || fallbackEmotion;
  return `${char.sprite_dir}/${char.sprite_pattern.replace('{emotion}', actualEmotion)}`;
}

function renderSceneBg(src, tintClass = null) {
  return [
    h('div', { class: 'scene-bg' }, h('img', { src, alt: '' })),
    tintClass ? h('div', { class: tintClass }) : null,
    h('div', { class: 'scene-vignette' })
  ];
}

function renderCharacters(activeSpeaker, echoEmotion, partnerSprite, partnerName, characters) {
  // activeSpeaker: 'partner' | 'echo' | 'narrator' | null
  // narrator → both dimmed equally; partner/echo → that one active, other dimmed
  const echoActive = activeSpeaker === 'echo';
  const partnerActive = activeSpeaker === 'partner';
  const echoSrc = characters
    ? resolveSpritePath(characters, 'echo', echoEmotion || 'blank')
    : `assets/echo/echo_${echoEmotion || 'blank'}.png`;
  return h('div', { class: 'characters' },
    h('img', {
      class: `sprite partner${partnerActive ? ' active' : ''}`,
      src: partnerSprite,
      alt: partnerName || ''
    }),
    h('img', {
      class: `sprite echo${echoActive ? ' active' : ''}`,
      src: echoSrc,
      alt: 'ECHO'
    })
  );
}

// ─── stage renderers ───

function paintStageStoryIntro(stage, screen, episodeLabel, episodeTitle) {
  // Build lines with staggered animation delays
  let delayMs = 800; // first line starts after chapter title fades in
  const lines = screen.content.map(line => {
    if (line === '') {
      delayMs += 600; // pause between groups
      return h('div', { class: 'story-spacer' });
    }
    const el = h('p', { class: 'story-line', style: `animation-delay: ${delayMs}ms` }, line);
    delayMs += 200;
    return el;
  });

  stage.replaceChildren(
    h('div', { class: 'story-intro-bg' }),
    h('div', { class: 'story-intro-content' },
      h('div', { class: 'chapter-title' },
        h('span', { class: 'chapter-title-ep' }, episodeLabel),
        h('span', { class: 'chapter-title-name' }, episodeTitle)
      ),
      h('div', { class: 'story-spacer' }),
      ...lines
    )
  );

  // Return total animation duration for footer reveal timing
  paintStageStoryIntro._totalDelay = delayMs + 800;
}

function paintStageColdOpen(stage, screen) {
  stage.replaceChildren(
    ...renderSceneBg(screen.image, 'scene-tint-red').filter(Boolean),
    h('div', { class: 'narration-card' }, screen.narration)
  );
}

function paintStageVn(stage, screen, line, characters) {
  const echoEmotion = line.speaker === 'echo' ? (line.emotion || 'blank') : 'blank';
  stage.replaceChildren(
    ...renderSceneBg(screen.bg).filter(Boolean),
    renderCharacters(line.speaker, echoEmotion, screen.partner.sprite, screen.partner.name, characters)
  );
}

function paintStageChoicePrompt(stage, screen, characters) {
  // Choice screen: show prompt floating above; both sprites are neutral presence.
  // We treat it as "echo thinking" so echo is active and shows 'concern' emotion.
  stage.replaceChildren(
    ...renderSceneBg(screen.bg).filter(Boolean),
    renderCharacters('echo', 'concern', 'assets/partners/kai.png', 'KAI', characters),
    h('div', { class: 'choice-prompt' }, screen.prompt)
  );
}

function paintStageChoiceReaction(stage, screen, chosen, characters) {
  // Reaction view: speaker from reaction is active; echo's emotion after.
  const reaction = chosen.reaction;
  stage.replaceChildren(
    ...renderSceneBg(screen.bg).filter(Boolean),
    renderCharacters(reaction.speaker, chosen.echo_emotion_after, 'assets/partners/kai.png', 'KAI', characters)
  );
}

function paintStageOutro(stage, screen, learnedLabel, epId, characters) {
  // Outro: market_hall bg + purple tint + ECHO happy + KAI neutral + giant learned word overlay
  stage.replaceChildren(
    ...renderSceneBg(screen.image, 'scene-tint-purple').filter(Boolean),
    renderCharacters(null, 'happy', 'assets/partners/kai.png', 'KAI', characters),
    h('div', { class: 'outro-banner' },
      h('div', { class: 'label' }, learnedLabel),
      h('div', { class: 'word' }, screen.learned_feeling_display),
      h('div', { class: 'episode' }, `EP.${epId.slice(2)}`),
      h('div', { class: 'slogan' }, '没有全能的个体，只有互补的进化 · a2hmarket.ai')
    )
  );
}

// ─── dialogue panel renderers (populates [data-slot="dialogue-content"]) ───

function renderDialogueLine(panel, speaker, text, speakerLabel) {
  panel.replaceChildren(
    h('div', { class: `speaker-row ${speaker}` },
      h('span', { class: 'speaker-dot' }),
      h('span', {}, speakerLabel)
    ),
    h('div', { class: `text${speaker === 'narrator' ? ' narrator-italic' : ''}` }, text)
  );
}

function renderChoiceOptions(panel, options, onChoose) {
  panel.replaceChildren(
    ...options.map(o =>
      h('button', { class: 'choice-option', onClick: () => onChoose(o.id) },
        h('span', { class: 'option-id' }, o.id),
        h('span', {}, o.text)
      )
    )
  );
}

// ─── unified entry point (called per paint) ───

export function renderScreen(refs, screen, lineIdx, state, i18n, onChoose) {
  const { stage, dialoguePanel, dialogueContent, choiceOptions, characters } = refs;
  const footer = dialoguePanel.closest('.dialogue-footer');

  // Reset panel mode classes
  dialoguePanel.classList.remove('choice-mode');
  dialogueContent.classList.remove('choice-mode');
  choiceOptions.replaceChildren(); // clear choice area
  footer.classList.remove('hidden');

  if (screen.type === 'story_intro') {
    const epLabel = `EP.${state.episodeId.slice(2)}`;
    const epTitle = state.script[state.episodeId]?.title || '';
    paintStageStoryIntro(stage, screen, epLabel, epTitle);
    renderDialogueLine(dialogueContent, 'narrator', i18n.t('cold_open_hint'), '——');
    // Hide footer during text animation, reveal after last line finishes
    footer.classList.add('hidden');
    clearTimeout(renderScreen._introTimer);
    const revealDelay = paintStageStoryIntro._totalDelay || 5200;
    renderScreen._introTimer = setTimeout(() => footer.classList.remove('hidden'), revealDelay);
    return;
  }

  if (screen.type === 'cold_open') {
    paintStageColdOpen(stage, screen);
    // Dialogue panel shows narration duplicated as a "读" prompt or blank
    renderDialogueLine(dialogueContent, 'narrator', i18n.t('cold_open_hint'), '——');
    return;
  }

  if (screen.type === 'vn') {
    const line = screen.dialogue[lineIdx];
    paintStageVn(stage, screen, line, characters);
    const speakerLabel = line.speaker === 'echo'
      ? 'ECHO'
      : (line.speaker === 'narrator' ? '——' : screen.partner.name);
    renderDialogueLine(dialogueContent, line.speaker, line.text, speakerLabel);
    return;
  }

  if (screen.type === 'choice') {
    if (lineIdx === 0) {
      paintStageChoicePrompt(stage, screen, characters);
      dialoguePanel.classList.add('choice-mode');
      renderChoiceOptions(choiceOptions, screen.options, onChoose);
      renderDialogueLine(dialogueContent, 'narrator', i18n.t('choose_hint'), '——');
    } else {
      const chosen = screen.options.find(o => o.id === state.chosenOption);
      if (!chosen) return;
      paintStageChoiceReaction(stage, screen, chosen, characters);
      const reaction = chosen.reaction;
      const speakerLabel = reaction.speaker === 'echo' ? 'ECHO' : 'KAI';
      renderDialogueLine(dialogueContent, reaction.speaker, reaction.text, speakerLabel);
    }
    return;
  }

  if (screen.type === 'outro') {
    paintStageOutro(stage, screen, i18n.t('learned_label'), state.episodeId, characters);
    renderDialogueLine(dialogueContent, 'narrator', i18n.t('next_episode') || '——点击重新开始 ▸', '——');
    return;
  }
}
