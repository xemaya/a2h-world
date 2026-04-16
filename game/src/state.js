// src/state.js — pure state machine. Zero DOM. All side effects elsewhere.

export function initialState(scriptFile, startEpisodeId = 'EP01') {
  return {
    gameMode: 'menu', // 'menu' | 'chapter-select' | 'playing'
    script: scriptFile,
    episodeId: startEpisodeId,
    screenIdx: 0,
    lineIdx: 0,
    learningScore: 0,
    choices: {},
    lang: 'zh',
    completedEpisodes: []
  };
}

function currentEpisode(s) { return s.script[s.episodeId]; }
function currentScreen(s) { return currentEpisode(s).screens[s.screenIdx]; }

export function reduce(s, action) {
  switch (action.type) {
    case 'START_NEW_GAME':
      return {
        ...initialState(s.script, 'EP01'),
        lang: s.lang,
        gameMode: 'playing'
      };

    case 'CONTINUE_GAME':
      return { ...s, gameMode: 'playing' };

    case 'SHOW_CHAPTER_SELECT':
      return { ...s, gameMode: 'chapter-select' };

    case 'EXIT_TO_MENU':
      return { ...s, gameMode: 'menu' };

    case 'SELECT_EPISODE':
      return {
        ...s,
        episodeId: action.episodeId,
        screenIdx: 0,
        lineIdx: 0,
        learningScore: 0,
        choices: {},
        gameMode: 'playing'
      };

    case 'SET_LANG':
      return { ...s, lang: action.lang };

    case 'NEXT': {
      const screen = currentScreen(s);
      if (screen.type === 'story_intro' || screen.type === 'cold_open') {
        return { ...s, screenIdx: s.screenIdx + 1, lineIdx: 0 };
      }
      if (screen.type === 'vn') {
        if (s.lineIdx < screen.dialogue.length - 1) {
          return { ...s, lineIdx: s.lineIdx + 1 };
        }
        return { ...s, screenIdx: s.screenIdx + 1, lineIdx: 0 };
      }
      if (screen.type === 'choice') {
        if (s.lineIdx === 1) {
          return { ...s, screenIdx: s.screenIdx + 1, lineIdx: 0 };
        }
        return s;
      }
      if (screen.type === 'outro') {
        // Advance to next episode if available, otherwise return to menu
        const epIds = Object.keys(s.script).sort();
        const currentIdx = epIds.indexOf(s.episodeId);
        const completed = s.completedEpisodes.includes(s.episodeId)
          ? s.completedEpisodes
          : [...s.completedEpisodes, s.episodeId];

        if (currentIdx < epIds.length - 1) {
          const nextId = epIds[currentIdx + 1];
          return {
            ...s,
            episodeId: nextId,
            screenIdx: 0,
            lineIdx: 0,
            choices: {},
            chosenOption: undefined,
            completedEpisodes: completed
          };
        }
        // Last episode — show "to be continued"
        return { ...s, gameMode: 'tbc', completedEpisodes: completed };
      }
      return s;
    }

    case 'RESTART': {
      return restartEpisode(s);
    }

    case 'CHOOSE': {
      const screen = currentScreen(s);
      if (screen.type !== 'choice') return s;
      const opt = screen.options.find(o => o.id === action.optionId);
      if (!opt) return s;
      return {
        ...s,
        learningScore: s.learningScore + opt.score,
        choices: { ...s.choices, [s.episodeId]: opt.id },
        lineIdx: 1,
        chosenOption: opt.id
      };
    }

    default:
      return s;
  }
}

function restartEpisode(s) {
  return {
    ...s,
    screenIdx: 0,
    lineIdx: 0,
    learningScore: 0,
    choices: {},
    chosenOption: undefined,
    episodeEnded: false
  };
}

export function currentView(s) {
  return { episode: currentEpisode(s), screen: currentScreen(s), lineIdx: s.lineIdx };
}
