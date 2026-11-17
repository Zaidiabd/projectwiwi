import { formatTime } from './HUD.js';
import { TARGET_CATCH_DISTANCE } from '../core/GameState.js';

export class Menus {
  constructor(handlers) {
    this.startScreen = document.getElementById('screen-start');
    this.pauseScreen = document.getElementById('screen-pause');
    this.endScreen = document.getElementById('screen-end');

    this.startAudioName = document.getElementById('start-audio-name');
    this.muteBtn = document.getElementById('btn-mute');
    this.aiToggleBtn = document.getElementById('btn-ai-toggle');

    this.endHeadlineEl = document.getElementById('end-headline');
    this.endOutcomeNoteEl = document.getElementById('end-outcome-note');
    this.endTimeEl = document.getElementById('end-time');
    this.endPeakSpeedEl = document.getElementById('end-peak-speed');
    this.endBestTimeEl = document.getElementById('end-best-time');
    this.endNewBestBadge = document.getElementById('end-new-best');
    this.endSplitsEl = document.getElementById('end-splits');

    document.getElementById('btn-start').addEventListener('click', () => handlers.onStart(false));
    document.getElementById('btn-start-ai').addEventListener('click', () => handlers.onStart(true));
    document.getElementById('btn-pause').addEventListener('click', () => handlers.onPause());
    document.getElementById('btn-resume').addEventListener('click', () => handlers.onResume());
    document.getElementById('btn-pause-restart').addEventListener('click', () => handlers.onRestart(false));
    document.getElementById('btn-restart').addEventListener('click', () => handlers.onRestart(false));
    document.getElementById('btn-restart-ai').addEventListener('click', () => handlers.onRestart(true));

    this.aiToggleBtn.addEventListener('click', () => {
      const enabled = handlers.onToggleAI();
      this.syncAIButton(enabled);
    });

    this.muteBtn.addEventListener('click', () => {
      const muted = handlers.onToggleMute();
      this.muteBtn.textContent = muted ? 'MUTED' : 'SFX ON';
    });

    const handleFile = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      this.startAudioName.textContent = file.name.slice(0, 22);
      handlers.onAudioUpload(file);
    };

    document.getElementById('start-audio-input').addEventListener('change', handleFile);
    document.getElementById('hud-audio-input').addEventListener('change', handleFile);

    document.getElementById('pause-volume').addEventListener('input', (e) => {
      handlers.onVolumeChange(Number(e.target.value));
    });

    this.qualityButtons = [
      ...document.querySelectorAll('#start-quality-group button'),
      ...document.querySelectorAll('#pause-quality-group button')
    ];

    for (const btn of this.qualityButtons) {
      btn.addEventListener('click', () => {
        const tier = btn.dataset.quality;
        handlers.onQualityChange(tier);
        this.syncQualityButtons(tier);
      });
    }
  }

  syncQualityButtons(activeTier) {
    for (const btn of this.qualityButtons) {
      btn.classList.toggle('active', btn.dataset.quality === activeTier);
    }
  }

  syncAIButton(enabled) {
    this.aiToggleBtn.textContent = enabled ? 'AI: ON' : 'AI: OFF';
    this.aiToggleBtn.classList.toggle('ai-active', enabled);
  }

  showStart() {
    this.startScreen.classList.remove('hidden');
    this.pauseScreen.classList.add('hidden');
    this.endScreen.classList.add('hidden');
  }

  showPlaying() {
    this.startScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.endScreen.classList.add('hidden');
  }

  showPause() {
    this.pauseScreen.classList.remove('hidden');
  }

  showEnding(state) {
    this.endScreen.classList.remove('hidden');

    if (state.wiwiWon) {
      this.endHeadlineEl.innerHTML = 'UNIVERSE DESTROYED.<br />LASER ACQUIRED.';
      this.endOutcomeNoteEl.textContent = `Wiwi dove past Lily and claimed the dot! (${TARGET_CATCH_DISTANCE.toLocaleString()} m threshold cleared)`;
      this.endOutcomeNoteEl.style.color = '#22e6ff';
    } else {
      const deficit = Math.max(1, Math.round(TARGET_CATCH_DISTANCE - state.distance));
      this.endHeadlineEl.innerHTML = 'UNIVERSE DESTROYED.<br />LILY STOLE THE LASER.';
      this.endOutcomeNoteEl.textContent = `Big fluffy Lily casually stepped on it first! Needed +${deficit.toLocaleString()} m to reach ${TARGET_CATCH_DISTANCE.toLocaleString()} m.`;
      this.endOutcomeNoteEl.style.color = '#ff6b81';
    }

    this.endTimeEl.textContent = `${Math.round(state.distance)} m`;
    this.endPeakSpeedEl.textContent = `${state.peakSpeed.toFixed(1)} m/s`;
    this.endBestTimeEl.textContent = state.bestDistance ? `${Math.round(state.bestDistance)} m` : `${Math.round(state.distance)} m`;
    this.endNewBestBadge.classList.toggle('hidden', !state.isNewBest);

    this.endSplitsEl.innerHTML = '';
    for (const [stage, t] of Object.entries(state.stageSplits)) {
      const chip = document.createElement('span');
      chip.className = 'split-chip';
      chip.textContent = `${stage}: ${t.toFixed(1)}s`;
      this.endSplitsEl.appendChild(chip);
    }
  }
}
