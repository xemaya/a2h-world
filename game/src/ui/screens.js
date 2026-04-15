// src/ui/screens.js — renders one of {cold_open, vn, choice, outro} into #stage

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

function renderColdOpen(stage, screen, i18n) {
  stage.replaceChildren(
    h('div', { class: 'screen-cold' },
      h('div', { class: 'narration' }, screen.narration),
      h('img', { src: screen.image, alt: 'cold open panel' })
    )
  );
}

function renderVn(stage, screen, lineIdx, i18n) {
  const line = screen.dialogue[lineIdx];
  const speakerLabel = line.speaker === 'echo' ? 'ECHO' : (line.speaker === 'narrator' ? '——' : screen.partner.name);
  stage.replaceChildren(
    h('div', { class: 'screen-vn' },
      h('div', { class: 'bg' }, h('img', { src: screen.bg, alt: '' })),
      h('div', { class: 'characters' },
        line.speaker === 'partner' || line.speaker === 'narrator'
          ? h('img', { class: 'sprite partner', src: screen.partner.sprite, alt: screen.partner.name })
          : h('span'),
        h('img', { class: 'sprite echo', src: `assets/echo/echo_${line.speaker === 'echo' ? line.emotion || 'blank' : 'blank'}.png`, alt: 'ECHO' })
      ),
      h('div', { class: 'dialogue-box' },
        h('div', { class: `speaker ${line.speaker}` }, speakerLabel),
        h('div', { class: 'text' }, line.text)
      )
    )
  );
}

function renderChoice(stage, screen, lineIdx, i18n, onChoose) {
  if (lineIdx === 0) {
    stage.replaceChildren(
      h('div', { class: 'screen-choice' },
        h('div', { class: 'bg' }, h('img', { src: screen.bg, alt: '' })),
        h('div', { class: 'prompt' }, screen.prompt),
        h('div', { class: 'choice-options' },
          ...screen.options.map(o =>
            h('button', { class: 'choice-option', onClick: () => onChoose(o.id) }, o.text)
          )
        )
      )
    );
  } else {
    const chosen = screen.options.find(o => o.id === stage.dataset.chosenOption);
    if (!chosen) return;
    const reaction = chosen.reaction;
    stage.replaceChildren(
      h('div', { class: 'screen-vn' },
        h('div', { class: 'bg' }, h('img', { src: screen.bg, alt: '' })),
        h('div', { class: 'characters' },
          h('img', { class: 'sprite partner', src: 'assets/partners/kai.png', alt: '' }),
          h('img', { class: 'sprite echo', src: `assets/echo/echo_${chosen.echo_emotion_after}.png`, alt: 'ECHO' })
        ),
        h('div', { class: 'dialogue-box' },
          h('div', { class: `speaker ${reaction.speaker}` }, reaction.speaker === 'echo' ? 'ECHO' : 'KAI'),
          h('div', { class: 'text' }, reaction.text)
        )
      )
    );
  }
}

function renderOutro(stage, screen, i18n) {
  stage.replaceChildren(
    h('div', { class: 'screen-outro' },
      h('img', { src: screen.image, alt: 'outro panel' }),
      h('div', { class: 'learned' }, `${i18n.t('learned_label')}: ${screen.learned_feeling_display}`)
    )
  );
}

export function renderScreen(stage, screen, lineIdx, i18n, onChoose) {
  switch (screen.type) {
    case 'cold_open': return renderColdOpen(stage, screen, i18n);
    case 'vn':        return renderVn(stage, screen, lineIdx, i18n);
    case 'choice':    return renderChoice(stage, screen, lineIdx, i18n, onChoose);
    case 'outro':     return renderOutro(stage, screen, i18n);
  }
}
