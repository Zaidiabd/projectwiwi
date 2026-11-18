import { TARGET_CATCH_DISTANCE } from '../core/GameState.js';

export function formatTime(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) {
    return '--:--.--';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const cs = Math.floor((seconds * 100) % 100);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export class HUD {
  constructor() {
    this.root = document.getElementById('hud');
    this.actCode = document.getElementById('hud-act-code');
    this.actName = document.getElementById('hud-act-name');
    this.progressFill = document.getElementById('hud-progress-fill');
    this.timerEl = document.getElementById('hud-timer');
    this.distGoalEl = document.getElementById('hud-dist-goal');
    this.bestEl = document.getElementById('hud-best');

    this.stageBannerEl = document.getElementById('stage-banner');
    this.stageBannerKicker = document.getElementById('stage-banner-kicker');
    this.stageBannerTitle = document.getElementById('stage-banner-title');
    this.bannerTimer = 0;

    this.rivalAlertEl = document.getElementById('rival-alert');
    this.rivalAlertNameEl = document.getElementById('rival-alert-name');
    this.rivalAlertSubEl = document.getElementById('rival-alert-sub');
    this.rivalAlertTimer = 0;

    this.powerupBuffEl = document.getElementById('powerup-buff-pill');
    this.rivalryWidgetEl = document.getElementById('rivalry-widget');
    this.rivalryDeltaEl = document.getElementById('rivalry-delta');
    this.rivalryFillEl = document.getElementById('rivalry-fill');

    this.tempSyncTimerEl = document.getElementById('temp-sync-timer');
    this.syncSecEl = document.getElementById('hud-sync-sec');
    this.audioSecEl = document.getElementById('hud-audio-sec');
    this.distPctEl = document.getElementById('hud-dist-pct');

    this.speedCardEl = document.getElementById('speedometer-card');
    this.speedEl = document.getElementById('hud-speed');
    this.speedUnitEl = document.getElementById('hud-speed-unit');
    this.peakSpeedEl = document.getElementById('hud-peak-speed');
    this.speedBarEl = document.getElementById('hud-speed-bar');
    this.boostPctEl = document.getElementById('hud-boost-pct');
    this.boostFillEl = document.getElementById('hud-boost-fill');
    this.shearLabelEl = document.getElementById('hud-shear-label');
    this.shearPctEl = document.getElementById('hud-shear-pct');
    this.shearFillEl = document.getElementById('hud-shear-fill');
    this.promptEl = document.getElementById('hud-prompt');

    this.debugPanel = document.getElementById('debug-panel');
    this.dbgFps = document.getElementById('dbg-fps');
    this.dbgMs = document.getElementById('dbg-ms');
    this.dbgCalls = document.getElementById('dbg-calls');
    this.dbgTris = document.getElementById('dbg-tris');
    this.dbgDpr = document.getElementById('dbg-dpr');
    this.dbgTier = document.getElementById('dbg-tier');
    this.dbgPTime = document.getElementById('dbg-ptime');
    this.dbgWTime = document.getElementById('dbg-wtime');

    this.debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
    if (this.debugEnabled) {
      this.debugPanel.classList.remove('hidden');
      this.tempSyncTimerEl.classList.remove('hidden');
    }

    this.fpsAccum = 0;
    this.fpsFrames = 0;
    this.lastFps = 60;
    this.lastMs = 16.6;
  }

  setVisible(visible) {
    this.root.classList.toggle('hidden', !visible);
    if (!visible) {
      this.stageBannerEl.classList.add('hidden');
      this.bannerTimer = 0;
      if (this.rivalAlertEl) this.rivalAlertEl.classList.add('hidden');
      this.rivalAlertTimer = 0;
      if (this.powerupBuffEl) this.powerupBuffEl.classList.add('hidden');
      if (this.rivalryWidgetEl) this.rivalryWidgetEl.classList.add('hidden');
    }
  }

  showBanner(kicker, title, accent = '#22e6ff', duration = 2.8) {
    this.stageBannerKicker.textContent = kicker;
    this.stageBannerKicker.style.color = accent;
    this.stageBannerTitle.textContent = title;
    this.stageBannerEl.style.borderColor = accent;
    this.stageBannerEl.classList.remove('hidden');
    this.bannerTimer = duration;
  }

  showRivalAlert(name, subtitle, accent = '#ff2a4b', duration = 3.4) {
    if (!this.rivalAlertEl) return;
    this.rivalAlertEl.style.setProperty('--rival-accent', accent);
    this.rivalAlertNameEl.textContent = name;
    this.rivalAlertSubEl.textContent = subtitle;
    this.rivalAlertEl.classList.remove('hidden');
    this.rivalAlertTimer = duration;
  }

  update(state, timeCtrl, renderer, quality, audioSeconds = null) {
    const stage = state.currentStage;
    this.actCode.textContent = stage.code;
    this.actName.textContent = stage.name;
    this.progressFill.style.width = `${(state.progress * 100).toFixed(1)}%`;

    this.timerEl.textContent = formatTime(state.runElapsed);
    this.distGoalEl.textContent = `${Math.round(state.distance).toLocaleString()} / ${TARGET_CATCH_DISTANCE.toLocaleString()} m`;
    this.bestEl.textContent = state.bestDistance ? `${Math.round(state.bestDistance).toLocaleString()} m` : '-- m';

    if (this.bannerTimer > 0) {
      this.bannerTimer -= timeCtrl.realDt;
      if (this.bannerTimer <= 0) {
        this.stageBannerEl.classList.add('hidden');
      }
    }

    if (this.rivalAlertTimer > 0) {
      this.rivalAlertTimer -= timeCtrl.realDt;
      if (this.rivalAlertTimer <= 0 && this.rivalAlertEl) {
        this.rivalAlertEl.classList.add('hidden');
      }
    }

    if (this.debugEnabled) {
      this.syncSecEl.textContent = state.runElapsed.toFixed(1);
      this.audioSecEl.textContent = audioSeconds !== null ? `${audioSeconds.toFixed(1)}s` : '--.-s';
      this.distPctEl.textContent = `${Math.round(state.distance)} / ${TARGET_CATCH_DISTANCE} m`;
    }

    // Speedometer + recorded peak + gradual reddening + vibration
    this.speedEl.textContent = state.speed.toFixed(1);
    this.peakSpeedEl.textContent = state.peakSpeed.toFixed(1);
    const barPct = Math.min(100, (state.speed / 172) * 100);
    this.speedBarEl.style.width = `${barPct.toFixed(1)}%`;
    this.speedCardEl.classList.toggle('overdrive-active', state.overdriveMode);

    const heat = Math.min(1, Math.max(0, (state.speed - 22) / 108));
    let r, g, b;
    if (heat < 0.5) {
      const t = heat * 2;
      r = Math.round(34 + (255 - 34) * t);
      g = Math.round(230 + (140 - 230) * t);
      b = Math.round(255 + (45 - 255) * t);
    } else {
      const t = (heat - 0.5) * 2;
      r = 255;
      g = Math.round(140 + (38 - 140) * t);
      b = Math.round(45 + (75 - 45) * t);
    }
    const speedCol = `rgb(${r}, ${g}, ${b})`;
    this.speedEl.style.color = heat > 0.12 ? speedCol : '#ffffff';
    this.speedEl.style.textShadow = heat > 0.25 ? `0 0 ${Math.round(6 + heat * 16)}px rgba(${r}, ${g}, ${b}, ${(0.35 + heat * 0.55).toFixed(2)})` : 'none';
    this.speedUnitEl.style.color = speedCol;
    this.speedBarEl.style.background = speedCol;
    this.speedCardEl.style.borderColor = `rgba(${r}, ${g}, ${b}, ${(0.24 + heat * 0.65).toFixed(2)})`;
    this.speedCardEl.style.boxShadow = heat > 0.35 ? `0 0 ${Math.round(heat * 26)}px rgba(${r}, ${g}, ${b}, ${(heat * 0.38).toFixed(2)})` : 'none';

    if (heat > 0.28 && state.phase === 'playing') {
      const vibAmp = Math.pow((heat - 0.28) / 0.72, 1.35) * 4.5;
      const vx = (Math.random() - 0.5) * 2 * vibAmp;
      const vy = (Math.random() - 0.5) * 2 * vibAmp;
      this.speedCardEl.style.transform = `translate(${vx.toFixed(2)}px, ${vy.toFixed(2)}px)`;
    } else {
      this.speedCardEl.style.transform = 'translate(0px, 0px)';
    }

    const boostPct = Math.round(state.boostEnergy * 100);
    this.boostPctEl.textContent = `${boostPct}%`;
    this.boostFillEl.style.width = `${boostPct}%`;

    if (state.stage2BurstActive) {
      this.shearLabelEl.textContent = 'STAGE II TEMPORAL BURST';
      const remPct = Math.max(0, Math.round(((142 - state.runElapsed) / 6.0) * 100));
      this.shearPctEl.textContent = `${remPct}%`;
      this.shearFillEl.style.width = `${remPct}%`;
      this.shearFillEl.style.background = 'linear-gradient(90deg, #ffbe3b, #ff2a85)';
    } else if (state.burstActive) {
      this.shearLabelEl.textContent = state.burstStage === 2 ? 'STAGE II BURST ACTIVE' : 'TEMPORAL BURST ACTIVE';
      const remPct = Math.round((state.burstTimer / 2.4) * 100);
      this.shearPctEl.textContent = `${remPct}%`;
      this.shearFillEl.style.width = `${remPct}%`;
      this.shearFillEl.style.background = state.burstStage === 2
        ? 'linear-gradient(90deg, #ffbe3b, #ff2a85)'
        : 'linear-gradient(90deg, #22e6ff, #3b82f6)';
    } else if (!state.burstUnlocked) {
      this.shearLabelEl.textContent = 'TEMPORAL BURST LOCKED';
      const unlockPct = Math.min(100, Math.round((state.runElapsed / 26.0) * 100));
      this.shearPctEl.textContent = `${Math.max(0, Math.ceil(26 - state.runElapsed))}s`;
      this.shearFillEl.style.width = `${unlockPct}%`;
      this.shearFillEl.style.background = 'rgba(148, 163, 184, 0.45)';
    } else {
      this.shearLabelEl.textContent = state.burstStage === 2 ? 'BURST II CHARGE / INTEGRITY' : 'BURST CHARGE / INTEGRITY';
      const integrityPct = Math.round(state.realityIntegrity * 100);
      this.shearPctEl.textContent = `${Math.round(state.burstCharge * 100)}%`;
      this.shearFillEl.style.width = `${Math.round(state.burstCharge * 100)}%`;
      this.shearFillEl.style.background = state.burstStage === 2
        ? 'linear-gradient(90deg, #ffbe3b, #ff2a4b)'
        : 'linear-gradient(90deg, var(--violet), var(--laser))';
    }

    this.promptEl.classList.toggle('faded', state.hasMovedOnce);

    if (this.powerupBuffEl) {
      const buffs = [];
      if (state.grazeTimer > 0 && state.grazeStreak > 0) {
        buffs.push(`GRAZE x${state.grazeStreak}`);
      }
      if (buffs.length > 0 && state.phase === 'playing') {
        this.powerupBuffEl.textContent = buffs.join('  •  ');
        this.powerupBuffEl.style.borderColor = '#22e6ff';
        this.powerupBuffEl.classList.remove('hidden');
      } else {
        this.powerupBuffEl.classList.add('hidden');
      }
    }

    if (this.rivalryWidgetEl) {
      const showRivalry = state.phase === 'playing' && state.tearCount >= 5;
      this.rivalryWidgetEl.classList.toggle('hidden', !showRivalry);
      if (showRivalry) {
        const delta = Math.round(state.rivalryDelta);
        const ahead = delta >= 0;
        this.rivalryDeltaEl.textContent = ahead ? `WIWI +${delta} m` : `LILY +${Math.abs(delta)} m`;
        this.rivalryDeltaEl.style.color = ahead ? '#22e6ff' : '#ff2a4b';
        const pct = Math.max(8, Math.min(92, 50 + (delta / 900) * 42));
        this.rivalryFillEl.style.width = `${pct.toFixed(1)}%`;
      }
    }

    if (this.debugEnabled) {
      this.fpsAccum += timeCtrl.realDt;
      this.fpsFrames++;
      if (this.fpsAccum >= 0.35) {
        this.lastFps = Math.round(this.fpsFrames / this.fpsAccum);
        this.lastMs = (this.fpsAccum / this.fpsFrames) * 1000;
        this.fpsAccum = 0;
        this.fpsFrames = 0;
      }
      this.dbgFps.textContent = String(this.lastFps);
      this.dbgMs.textContent = this.lastMs.toFixed(1);
      this.dbgCalls.textContent = String(renderer.info.render.calls);
      this.dbgTris.textContent = String(renderer.info.render.triangles);
      this.dbgDpr.textContent = renderer.getPixelRatio().toFixed(2);
      this.dbgTier.textContent = quality.config.label;
      this.dbgPTime.textContent = timeCtrl.playerScale.toFixed(2);
      this.dbgWTime.textContent = timeCtrl.worldScale.toFixed(2);
    }
  }
}
