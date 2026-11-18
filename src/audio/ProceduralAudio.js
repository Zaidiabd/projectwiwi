export class ProceduralAudio {
  constructor(ctx, masterGain) {
    this.ctx = ctx;
    this.masterGain = masterGain;

    this.fxGain = ctx.createGain();
    this.fxGain.gain.value = 0.42;
    this.fxGain.connect(masterGain);

    // Speed-modulated wind buffer
    const bufLen = ctx.sampleRate * 2;
    this.noiseBuffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    this.windSrc = ctx.createBufferSource();
    this.windSrc.buffer = this.noiseBuffer;
    this.windSrc.loop = true;

    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 260;
    this.windFilter.Q.value = 1.4;

    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.0;

    this.windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.fxGain);
    this.windSrc.start();

    // Subtle cosmic sub-drone
    this.droneOsc = ctx.createOscillator();
    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.value = 55;

    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 120;

    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.0;

    this.droneOsc.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.fxGain);
    this.droneOsc.start();

    this.pawTimer = 0;
  }

  update(dt, state, hasMusicPlaying) {
    const now = this.ctx.currentTime;
    if (state.phase !== 'playing') {
      this.windGain.gain.setTargetAtTime(0, now, 0.06);
      this.droneGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }

    const s = state.normalizedSpeed;
    const windVol = s * (state.isBoosting ? 0.24 : 0.14);
    this.windGain.gain.setTargetAtTime(windVol, now, 0.08);
    this.windFilter.frequency.setTargetAtTime(240 + s * 1450, now, 0.08);

    // Keep procedural drone soft when user's soundtrack is playing
    const droneCap = hasMusicPlaying ? 0.035 : 0.12;
    this.droneGain.gain.setTargetAtTime(0.02 + s * droneCap, now, 0.1);
    this.droneOsc.frequency.setTargetAtTime(52 + s * 38 + state.actIndex * 6, now, 0.12);
    this.droneFilter.frequency.setTargetAtTime(110 + state.actIndex * 65 + (state.burstActive ? 220 : 0), now, 0.1);

    // Paw foley cadence
    if (state.speed > 1.5) {
      const stepInterval = Math.max(0.11, 0.34 - s * 0.21);
      this.pawTimer += dt;
      if (this.pawTimer >= stepInterval) {
        this.pawTimer = 0;
        this.playPawTap(s);
      }
    }
  }

  playPawTap(speedRatio) {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(135 + Math.random() * 35 + speedRatio * 40, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.045);

    g.gain.setValueAtTime(0.055 + speedRatio * 0.04, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(g);
    g.connect(this.fxGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  playTemporalBurst() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.42);

    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(g);
    g.connect(this.fxGain);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  playImpact() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.18);

    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    osc.connect(g);
    g.connect(this.fxGain);
    osc.start(now);
    osc.stop(now + 0.22);
  }

  playPhaseShimmer() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(620, now);
    osc.frequency.exponentialRampToValueAtTime(1180, now + 0.16);

    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(g);
    g.connect(this.fxGain);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  playLaserCatch() {
    const now = this.ctx.currentTime;
    // Playful tiny two-note squeak/chime after the abrupt silence
    const notes = [880, 1318.5];
    notes.forEach((freq, idx) => {
      const start = now + idx * 0.085;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.06, start + 0.12);

      g.gain.setValueAtTime(0.22, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.24);

      osc.connect(g);
      g.connect(this.fxGain);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  }

  playAnnoyedPop() {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.08);

    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    osc.connect(g);
    g.connect(this.fxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  playLilySteal() {
    const now = this.ctx.currentTime;
    // Comedic descending "wah-wah-waaah" when Lily snags the laser!
    const notes = [
      { f: 392, d: 0.16, t: 0.0 },
      { f: 370, d: 0.16, t: 0.18 },
      { f: 349, d: 0.16, t: 0.36 },
      { f: 294, d: 0.42, t: 0.54 }
    ];
    notes.forEach((n) => {
      const start = now + n.t;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(n.f, start);
      if (n.d > 0.3) {
        osc.frequency.linearRampToValueAtTime(n.f * 0.86, start + n.d);
      }

      const filt = this.ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 950;

      g.gain.setValueAtTime(0.14, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + n.d);

      osc.connect(filt);
      filt.connect(g);
      g.connect(this.fxGain);
      osc.start(start);
      osc.stop(start + n.d + 0.02);
    });
  }

  playRivalAlert() {
    const now = this.ctx.currentTime;
    // Urgent high-tech two-tone siren pulse when a rival locks onto the chase
    [0, 0.16, 0.34].forEach((offset, i) => {
      const start = now + offset;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      const f0 = i % 2 === 0 ? 740 : 988;
      osc.frequency.setValueAtTime(f0, start);
      osc.frequency.exponentialRampToValueAtTime(f0 * 1.18, start + 0.11);

      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = 1400;
      filt.Q.value = 2.2;

      g.gain.setValueAtTime(0.16, start);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.14);

      osc.connect(filt);
      filt.connect(g);
      g.connect(this.fxGain);
      osc.start(start);
      osc.stop(start + 0.15);
    });
  }

  playPowerupPickup() {
    const now = this.ctx.currentTime;
    // Sparkling ascending 3-note chime when picking up a track powerup orb
    [523.25, 659.25, 987.77].forEach((freq, i) => {
      const t = now + i * 0.048;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.12, t + 0.14);
      g.gain.setValueAtTime(0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(g);
      g.connect(this.fxGain);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  playScreenSmash() {
    const now = this.ctx.currentTime;
    // Deep dimensional breach thud + explosive crystalline screen-smash scatter
    const sub = this.ctx.createOscillator();
    const subG = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.38);
    subG.gain.setValueAtTime(0.42, now);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    sub.connect(subG);
    subG.connect(this.fxGain);
    sub.start(now);
    sub.stop(now + 0.45);

    const shardFreqs = [1650, 2240, 2980, 3690, 4520, 5400];
    shardFreqs.forEach((f, idx) => {
      const t = now + idx * 0.018;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 0.54, t + 0.22);
      g.gain.setValueAtTime(0.11, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
      osc.connect(g);
      g.connect(this.fxGain);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  }
}
