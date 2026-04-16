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

function renderSceneBg(src, tintClass = null) {
  return [
    h('div', { class: 'scene-bg' }, h('img', { src, alt: '' })),
    tintClass ? h('div', { class: tintClass }) : null,
    h('div', { class: 'scene-vignette' })
  ];
}

function renderCharacters(activeSpeaker, echoEmotion, partnerSprite, partnerName) {
  // activeSpeaker: 'partner' | 'echo' | 'narrator' | null
  // narrator → both dimmed equally; partner/echo → that one active, other dimmed
  const echoActive = activeSpeaker === 'echo';
  const partnerActive = activeSpeaker === 'partner';
  return h('div', { class: 'characters' },
    h('img', {
      class: `sprite partner${partnerActive ? ' active' : ''}`,
      src: partnerSprite,
      alt: partnerName || ''
    }),
    h('img', {
      class: `sprite echo${echoActive ? ' active' : ''}`,
      src: `assets/echo/echo_${echoEmotion || 'blank'}_v2.png`,
      alt: 'ECHO'
    })
  );
}

// ─── stage renderers ───

function paintStageStoryIntro(stage, screen) {
  // Story intro: full-screen text with starfield background
  stage.replaceChildren(
    h('div', { class: 'story-intro-bg' }),
    h('div', { class: 'story-intro-content' },
      ...screen.content.map(line =>
        line === ''
          ? h('div', { class: 'story-spacer' })
          : h('p', { class: 'story-line' }, line)
      )
    )
  );
}

function paintStageColdOpen(stage, screen) {
  stage.replaceChildren(
    ...renderSceneBg(screen.image, 'scene-tint-red').filter(Boolean),
    h('div', { class: 'narration-card' }, screen.narration)
  );
}

function paintStageVn(stage, screen, line) {
  const echoEmotion = line.speaker === 'echo' ? (line.emotion || 'blank') : 'blank';
  stage.replaceChildren(
    ...renderSceneBg(screen.bg).filter(Boolean),
    renderCharacters(line.speaker, echoEmotion, screen.partner.sprite, screen.partner.name)
  );
}

function paintStageChoicePrompt(stage, screen) {
  // Choice screen: show prompt floating above; both sprites are neutral presence.
  // We treat it as "echo thinking" so echo is active and shows 'concern' emotion.
  stage.replaceChildren(
    ...renderSceneBg(screen.bg).filter(Boolean),
    renderCharacters('echo', 'concern', 'assets/partners/kai.png', 'KAI'),
    h('div', { class: 'choice-prompt' }, screen.prompt)
  );
}

function paintStageChoiceReaction(stage, screen, chosen) {
  // Reaction view: speaker from reaction is active; echo's emotion after.
  const reaction = chosen.reaction;
  stage.replaceChildren(
    ...renderSceneBg(screen.bg).filter(Boolean),
    renderCharacters(reaction.speaker, chosen.echo_emotion_after, 'assets/partners/kai.png', 'KAI')
  );
}

function paintStageOutro(stage, screen, learnedLabel, epId) {
  // Outro: market_hall bg + purple tint + ECHO happy + KAI neutral + giant learned word overlay
  stage.replaceChildren(
    ...renderSceneBg(screen.image, 'scene-tint-purple').filter(Boolean),
    renderCharacters(null, 'happy', 'assets/partners/kai.png', 'KAI'),
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
  const { stage, dialoguePanel, dialogueContent } = refs;

  // Reset panel mode classes
  dialoguePanel.classList.remove('choice-mode');
  dialogueContent.classList.remove('choice-mode');

  if (screen.type === 'story_intro') {
    paintStageStoryIntro(stage, screen);
    renderDialogueLine(dialogueContent, 'narrator', i18n.t('cold_open_hint'), '——');
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
    paintStageVn(stage, screen, line);
    const speakerLabel = line.speaker === 'echo'
      ? 'ECHO'
      : (line.speaker === 'narrator' ? '——' : screen.partner.name);
    renderDialogueLine(dialogueContent, line.speaker, line.text, speakerLabel);
    return;
  }

  if (screen.type === 'choice') {
    if (lineIdx === 0) {
      paintStageChoicePrompt(stage, screen);
      dialoguePanel.classList.add('choice-mode');
      dialogueContent.classList.add('choice-mode');
      renderChoiceOptions(dialogueContent, screen.options, onChoose);
    } else {
      const chosen = screen.options.find(o => o.id === state.chosenOption);
      if (!chosen) return;
      paintStageChoiceReaction(stage, screen, chosen);
      const reaction = chosen.reaction;
      const speakerLabel = reaction.speaker === 'echo' ? 'ECHO' : 'KAI';
      renderDialogueLine(dialogueContent, reaction.speaker, reaction.text, speakerLabel);
    }
    return;
  }

  if (screen.type === 'outro') {
    paintStageOutro(stage, screen, i18n.t('learned_label'), state.episodeId);
    renderDialogueLine(dialogueContent, 'narrator', i18n.t('next_episode') || '——点击重新开始 ▸', '——');
    return;
  }
}
