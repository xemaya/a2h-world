// src/state.js — pure state machine. Zero DOM. All side effects elsewhere.

export function initialState(scriptFile, startEpisodeId = 'EP01') {
  return {
    script: scriptFile,
    episodeId: startEpisodeId,
    screenIdx: 0,
    lineIdx: 0,
    learningScore: 0,
    choices: {},
    lang: 'zh'
  };
}

function currentEpisode(s) { return s.script[s.episodeId]; }
function currentScreen(s) { return currentEpisode(s).screens[s.screenIdx]; }

export function reduce(s, action) {
  switch (action.type) {
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
        // For now EP.01 is the only episode; NEXT on outro restarts the episode.
        // Plan 4 will extend this to advance to next episode or show end-of-season screen.
        return restartEpisode(s);
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
