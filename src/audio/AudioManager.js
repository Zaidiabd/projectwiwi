import { ProceduralAudio } from './ProceduralAudio.js';
import { BeatSync } from './BeatSync.js';

const DEFAULT_TRACK_PATH = './assets/Screen_Recording_20261118_044500_YouTube-mc.m4a';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.analyser = null;
    this.procedural = null;
    this.beatSync = new BeatSync(null);

    this.audioEl = new Audio();
    this.audioEl.loop = true;
    this.audioEl.preload = 'auto';
    this.audioEl.playsInline = true;
    this.audioEl.setAttribute('playsinline', '');
    this.mediaSource = null;

    this.customObjectUrl = null;
    this.trackSource = DEFAULT_TRACK_PATH;
    this.trackName = 'DEFAULT TRACK';
    this.hasMusicLoaded = false;
    this.musicActive = false;

    this.volume = 0.8;
    this.muted = false;
    this.silenceCut = false;
    this.fallbackTime = 0;

    this.audioEl.addEventListener('canplay', () => {
      this.hasMusicLoaded = true;
    });

    this.audioEl.addEventListener('error', () => {
      this.hasMusicLoaded = false;
      this.musicActive = false;
    });

    this.audioEl.src = DEFAULT_TRACK_PATH;
  }

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.85;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.78;

      this.musicGain.connect(this.analyser);
      this.analyser.connect(this.masterGain);

      this.mediaSource = this.ctx.createMediaElementSource(this.audioEl);
      this.mediaSource.connect(this.musicGain);

      this.procedural = new ProceduralAudio(this.ctx, this.masterGain);
      this.beatSync = new BeatSync(this.analyser);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  loadLocalFile(file) {
    if (!file) return;
    if (this.customObjectUrl) {
      URL.revokeObjectURL(this.customObjectUrl);
    }
    this.customObjectUrl = URL.createObjectURL(file);
    this.trackSource = this.customObjectUrl;
    this.trackName = file.name;
    this.hasMusicLoaded = false;
    this.audioEl.src = this.customObjectUrl;
    this.audioEl.load();

    if (this.ctx && this.musicActive) {
      this.audioEl.currentTime = 0;
      this.audioEl.play().catch(() => {});
    }
  }

  startRun() {
    this.silenceCut = false;
    if (!this.ensureContext()) return;

    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, now, 0.04);
    this.musicGain.gain.setTargetAtTime(0.85, now, 0.05);

    this.audioEl.currentTime = 0;
    const playPromise = this.audioEl.play();
    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          this.musicActive = true;
        })
        .catch(() => {
          this.musicActive = false;
        });
    }
  }

  pause() {
    if (!this.audioEl.paused) {
      this.audioEl.pause();
    }
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.04);
    }
  }

  resume() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.05);
    if (!this.silenceCut && this.hasMusicLoaded) {
      this.audioEl.play().catch(() => {});
    }
  }

  cutToSilence() {
    this.silenceCut = true;
    if (!this.audioEl.paused) {
      this.audioEl.pause();
    }
    if (this.ctx && this.musicGain) {
      this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.015);
    }
  }

  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.ctx && this.masterGain && !this.muted) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.04);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime, 0.04);
    }
    return this.muted;
  }

  playTemporalBurst() {
    if (this.procedural) this.procedural.playTemporalBurst();
  }

  playImpact() {
    if (this.procedural) this.procedural.playImpact();
  }

  playPhaseShimmer() {
    if (this.procedural) this.procedural.playPhaseShimmer();
  }

  playLaserCatch() {
    if (this.procedural) this.procedural.playLaserCatch();
  }

  playAnnoyedPop() {
    if (this.procedural) this.procedural.playAnnoyedPop();
  }

  playLilySteal() {
    if (this.procedural) this.procedural.playLilySteal();
  }

  playRivalAlert() {
    if (this.procedural) this.procedural.playRivalAlert();
  }

  playPowerupPickup() {
    if (this.procedural) this.procedural.playPowerupPickup();
  }

  playGraze(streak = 1) {
    if (this.procedural) this.procedural.playGraze(streak);
  }

  playJump() {
    if (this.procedural) this.procedural.playJump();
  }

  getTrackTime() {
    if (!this.hasMusicLoaded && !this.musicActive) return null;
    return Number.isFinite(this.audioEl.currentTime) ? this.audioEl.currentTime : null;
  }

  /**
   * Returns authoritative audio clock (seconds) for drift-free timeline sync
   * when playing a full-length (>= 200s) soundtrack without looping.
   */
  getSyncedTrackTime() {
    if (
      !this.musicActive ||
      this.silenceCut ||
      this.audioEl.paused ||
      this.audioEl.readyState < 2 ||
      !Number.isFinite(this.audioEl.duration) ||
      this.audioEl.duration < 200
    ) {
      return null;
    }
    return this.audioEl.currentTime;
  }

  update(dt, state) {
    this.fallbackTime += dt * (1.8 + state.normalizedSpeed * 1.8);
    const fallbackPulse = state.phase === 'playing' ? 0.25 + 0.25 * Math.sin(this.fallbackTime * Math.PI) : 0;

    if (this.procedural) {
      this.procedural.update(dt, state, this.musicActive && !this.audioEl.paused);
    }
    return this.beatSync.update(dt, fallbackPulse);
  }
}
