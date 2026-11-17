export class BeatSync {
  constructor(analyser) {
    this.analyser = analyser;
    this.bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    this.energy = 0;
  }

  update(dt, fallbackPulse = 0) {
    if (!this.analyser || !this.bins) {
      this.energy += (fallbackPulse - this.energy) * (1 - Math.exp(-8 * dt));
      return this.energy;
    }

    this.analyser.getByteFrequencyData(this.bins);
    // Focus on low/sub-bass bins (first ~12 bins)
    let sum = 0;
    const count = Math.min(12, this.bins.length);
    for (let i = 0; i < count; i++) {
      sum += this.bins[i];
    }
    const raw = count > 0 ? sum / (count * 255) : 0;
    const target = Math.max(raw, fallbackPulse * 0.45);
    this.energy += (target - this.energy) * (1 - Math.exp(-12 * dt));
    return this.energy;
  }
}
