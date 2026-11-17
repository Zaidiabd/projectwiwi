export const QUALITY_PRESETS = {
  low: {
    id: 'low',
    label: 'LOW',
    maxDpr: 1.0,
    postProcessing: false,
    bloom: false,
    bloomStrength: 0,
    corridorArches: 16,
    voidStreaks: 120,
    riftShards: 36,
    afterimagePool: 8,
    lightningBolts: 3,
    obstacles: 10
  },
  medium: {
    id: 'medium',
    label: 'MEDIUM',
    maxDpr: 1.5,
    postProcessing: true,
    bloom: true,
    bloomStrength: 0.45,
    corridorArches: 26,
    voidStreaks: 240,
    riftShards: 72,
    afterimagePool: 14,
    lightningBolts: 6,
    obstacles: 16
  },
  high: {
    id: 'high',
    label: 'HIGH',
    maxDpr: 2.0,
    postProcessing: true,
    bloom: true,
    bloomStrength: 0.65,
    corridorArches: 36,
    voidStreaks: 360,
    riftShards: 110,
    afterimagePool: 20,
    lightningBolts: 9,
    obstacles: 20
  }
};

export class QualitySettings {
  constructor(initialTier = 'medium') {
    this.tier = QUALITY_PRESETS[initialTier] ? initialTier : 'medium';
    this.listeners = new Set();
  }

  get config() {
    return QUALITY_PRESETS[this.tier];
  }

  get effectiveDpr() {
    return Math.min(window.devicePixelRatio || 1, this.config.maxDpr);
  }

  setTier(tier) {
    if (!QUALITY_PRESETS[tier] || tier === this.tier) return;
    this.tier = tier;
    for (const fn of this.listeners) fn(this.config);
  }

  onChange(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}
