import * as THREE from 'three';

const MAX_BOLTS = 16;
const SEGMENTS_PER_BOLT = 10;

export class LightningSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeLimit = 10;
    this.bolts = [];

    for (let i = 0; i < MAX_BOLTS; i++) {
      const positions = new Float32Array((SEGMENTS_PER_BOLT + 1) * 3);
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? '#22e6ff' : '#c084fc',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      const line = new THREE.Line(geom, mat);
      line.visible = false;
      line.frustumCulled = false;
      this.scene.add(line);

      this.bolts.push({
        line,
        geom,
        mat,
        positions,
        life: 0,
        maxLife: 0.14
      });
    }

    this.ambientTimer = 0;
    this.bodyChargeTimer = 0;
  }

  setQualityCount(count) {
    this.activeLimit = Math.min(MAX_BOLTS, count + 6);
  }

  reset() {
    this.ambientTimer = 0;
    this.bodyChargeTimer = 0;
    for (const b of this.bolts) {
      b.life = 0;
      b.line.visible = false;
    }
  }

  update(worldDt, cat, state, beatEnergy = 0) {
    // 1. Electric charges emanating directly off the cat's body starting at Tear #1 (38s)
    if (state.phase === 'playing' && state.bodyChargeLevel >= 1) {
      const chargeRate = Math.max(0.025, 0.11 - state.bodyChargeLevel * 0.016);
      this.bodyChargeTimer += worldDt * (1 + beatEnergy * 0.9);
      if (this.bodyChargeTimer >= chargeRate) {
        this.bodyChargeTimer = 0;
        this.triggerBodyArc(cat, state);
      }
    }

    // 2. Environmental / rift lightning arcs in Overclock and Rupture stages
    const envActive = state.phase === 'playing' && (state.actIndex >= 2 || state.burstActive || state.stage2BurstActive);
    if (envActive) {
      const rate = Math.max(0.035, 0.14 - state.tearCount * 0.018);
      this.ambientTimer += worldDt * (1 + beatEnergy * 1.4);
      if (this.ambientTimer >= rate) {
        this.ambientTimer = 0;
        this.triggerBolt(cat, state);
      }
    }

    for (let i = 0; i < MAX_BOLTS; i++) {
      const b = this.bolts[i];
      if (b.life <= 0) continue;

      b.life -= worldDt;
      if (b.life <= 0) {
        b.line.visible = false;
      } else {
        b.mat.opacity = (b.life / b.maxLife) * 0.95;
      }
    }
  }

  pickArcColor(state) {
    if (state.stage2BurstActive || (state.burstActive && state.burstStage === 2)) {
      return Math.random() > 0.45 ? '#ffbe3b' : '#ff2a4b';
    }
    if (state.tearCount >= 5) {
      return Math.random() > 0.4 ? '#ff2a4b' : '#c084fc';
    }
    if (state.anomalyMode) {
      return Math.random() > 0.5 ? '#2dd4bf' : '#e879f9';
    }
    return Math.random() > 0.45 ? '#22e6ff' : '#a855f7';
  }

  triggerBodyArc(cat, state) {
    for (let i = 0; i < this.activeLimit; i++) {
      const b = this.bolts[i];
      if (b.life > 0) continue;

      const angle = Math.random() * Math.PI * 2;
      const spread = 0.7 + state.bodyChargeLevel * 0.34;
      const startX = cat.x + (Math.random() - 0.5) * 0.45;
      const startY = cat.y + 0.35 + Math.random() * 0.55;
      const startZ = (Math.random() - 0.5) * 0.25;

      const endX = startX + Math.cos(angle) * spread;
      const endY = Math.max(0.06, startY + Math.sin(angle) * spread * 0.75);
      const endZ = startZ + 0.4 + Math.random() * 1.4;

      for (let s = 0; s <= SEGMENTS_PER_BOLT; s++) {
        const t = s / SEGMENTS_PER_BOLT;
        const jitter = s === 0 || s === SEGMENTS_PER_BOLT ? 0 : 0.24 + state.bodyChargeLevel * 0.04;
        b.positions[s * 3] = startX + (endX - startX) * t + (Math.random() - 0.5) * jitter;
        b.positions[s * 3 + 1] = startY + (endY - startY) * t + (Math.random() - 0.5) * jitter;
        b.positions[s * 3 + 2] = startZ + (endZ - startZ) * t;
      }

      b.mat.color.set(this.pickArcColor(state));
      b.geom.attributes.position.needsUpdate = true;
      b.maxLife = 0.07 + Math.random() * 0.07;
      b.life = b.maxLife;
      b.mat.opacity = 0.96;
      b.line.visible = true;
      break;
    }
  }

  triggerBolt(cat, state) {
    for (let i = 0; i < this.activeLimit; i++) {
      const b = this.bolts[i];
      if (b.life > 0) continue;

      const nearCat = state.actIndex === 2 || Math.random() < 0.3;
      const startX = nearCat ? cat.x + (Math.random() - 0.5) * 1.6 : (Math.random() - 0.5) * 14;
      const startY = nearCat ? 0.6 + Math.random() * 1.2 : 1.0 + Math.random() * 5.5;
      const startZ = nearCat ? -1.2 : -22 - Math.random() * 50;

      const endX = nearCat ? startX + (Math.random() - 0.5) * 6.0 : (Math.random() - 0.5) * 16;
      const endY = nearCat ? 0.1 + Math.random() * 3.8 : 0.1 + Math.random() * 6.8;
      const endZ = nearCat ? startZ - 4 - Math.random() * 9 : startZ - 14;

      for (let s = 0; s <= SEGMENTS_PER_BOLT; s++) {
        const t = s / SEGMENTS_PER_BOLT;
        const jitter = s === 0 || s === SEGMENTS_PER_BOLT ? 0 : 0.72;
        b.positions[s * 3] = startX + (endX - startX) * t + (Math.random() - 0.5) * jitter;
        b.positions[s * 3 + 1] = startY + (endY - startY) * t + (Math.random() - 0.5) * jitter;
        b.positions[s * 3 + 2] = startZ + (endZ - startZ) * t;
      }

      b.mat.color.set(this.pickArcColor(state));
      b.geom.attributes.position.needsUpdate = true;
      b.maxLife = 0.09 + Math.random() * 0.09;
      b.life = b.maxLife;
      b.mat.opacity = 0.92;
      b.line.visible = true;
      break;
    }
  }
}
