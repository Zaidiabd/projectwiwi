import * as THREE from 'three';

const MAX_BOLTS = 22;
const SEGMENTS_PER_BOLT = 10;

function createRibbonGeometry(positions) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const indices = [];
  for (let s = 0; s < SEGMENTS_PER_BOLT; s++) {
    const a = s * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;
    indices.push(a, b, c, b, d, c);
  }
  geom.setIndex(indices);
  return geom;
}

export class LightningSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeLimit = 14;
    this.bolts = [];

    for (let i = 0; i < MAX_BOLTS; i++) {
      const vertCount = (SEGMENTS_PER_BOLT + 1) * 2;
      const positions = new Float32Array(vertCount * 3);
      const geom = createRibbonGeometry(positions);

      // Reserve slots 0..5 for black-core high-contrast lightning during Saiyan Powerup
      const isBlackCoreSlot = i < 6;
      const mat = new THREE.MeshBasicMaterial({
        color: isBlackCoreSlot ? '#05050a' : '#22e6ff',
        transparent: true,
        opacity: 0,
        blending: isBlackCoreSlot ? THREE.NormalBlending : THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = isBlackCoreSlot ? 12 : 11;
      this.scene.add(mesh);

      this.bolts.push({
        mesh,
        geom,
        mat,
        positions,
        isBlackCoreSlot,
        life: 0,
        maxLife: 0.14
      });
    }

    this.ambientTimer = 0;
    this.bodyChargeTimer = 0;
  }

  setQualityCount(count) {
    this.activeLimit = Math.min(MAX_BOLTS, count + 10);
  }

  reset() {
    this.ambientTimer = 0;
    this.bodyChargeTimer = 0;
    for (const b of this.bolts) {
      b.life = 0;
      b.mesh.visible = false;
    }
  }

  update(worldDt, cat, state, beatEnergy = 0) {
    // 1. Electric charges emanating directly off Wiwi's body starting at Tear #1 (38s)
    if (state.phase === 'playing' && state.bodyChargeLevel >= 1) {
      const chargeRate = state.saiyanMode
        ? 0.018
        : Math.max(0.025, 0.11 - state.bodyChargeLevel * 0.016);
      this.bodyChargeTimer += worldDt * (1 + beatEnergy * 0.9);
      if (this.bodyChargeTimer >= chargeRate) {
        this.bodyChargeTimer = 0;
        this.triggerBodyArc(cat, state);
      }
    }

    // 2. Environmental / rift lightning arcs
    const envActive =
      state.phase === 'playing' &&
      (state.actIndex >= 2 || state.burstActive || state.stage2BurstActive);
    if (envActive) {
      const rate = state.saiyanMode
        ? 0.024
        : Math.max(0.035, 0.14 - state.tearCount * 0.018);
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
        b.mesh.visible = false;
      } else {
        b.mat.opacity = (b.life / b.maxLife) * (b.isBlackCoreSlot ? 0.96 : 0.92);
      }
    }
  }

  pickArcColor(state) {
    if (state.saiyanMode) {
      // Intense Red and Electric Blue outer lightning paired with Black-Core bolts
      return Math.random() > 0.48 ? '#ff1a35' : '#2563eb';
    }
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

  writeRibbonPath(bolt, startX, startY, startZ, endX, endY, endZ, jitter, halfWidth) {
    const pos = bolt.positions;
    for (let s = 0; s <= SEGMENTS_PER_BOLT; s++) {
      const t = s / SEGMENTS_PER_BOLT;
      const j = s === 0 || s === SEGMENTS_PER_BOLT ? 0 : jitter;
      const px = startX + (endX - startX) * t + (Math.random() - 0.5) * j;
      const py = startY + (endY - startY) * t + (Math.random() - 0.5) * j;
      const pz = startZ + (endZ - startZ) * t;

      // Taper ends slightly, thicken mid-arc for pronounced lightning silhouette
      const taper = Math.sin(t * Math.PI) * 0.7 + 0.35;
      const w = halfWidth * taper;

      const idx = s * 6;
      pos[idx] = px - w;
      pos[idx + 1] = py + w * 0.42;
      pos[idx + 2] = pz;

      pos[idx + 3] = px + w;
      pos[idx + 4] = py - w * 0.42;
      pos[idx + 5] = pz;
    }
    bolt.geom.attributes.position.needsUpdate = true;
  }

  findFreeSlot(allowBlackCore) {
    for (let i = 0; i < this.activeLimit; i++) {
      const b = this.bolts[i];
      if (b.life > 0) continue;
      if (b.isBlackCoreSlot && !allowBlackCore) continue;
      return b;
    }
    return null;
  }

  triggerBodyArc(cat, state) {
    const angle = Math.random() * Math.PI * 2;
    const spread = (state.saiyanMode ? 1.45 : 0.7) + state.bodyChargeLevel * 0.36;
    const startX = cat.x + (Math.random() - 0.5) * 0.55;
    const startY = cat.y + 0.35 + Math.random() * 0.65;
    const startZ = (Math.random() - 0.5) * 0.25;

    const endX = startX + Math.cos(angle) * spread;
    const endY = Math.max(0.06, startY + Math.sin(angle) * spread * 0.85);
    const endZ = startZ + 0.4 + Math.random() * 1.6;

    const jitter = (state.saiyanMode ? 0.55 : 0.25) + state.bodyChargeLevel * 0.04;
    const baseWidth = state.saiyanMode ? 0.14 : 0.055;

    // Outer thick red / blue / violet bolt
    const outerBolt = this.findFreeSlot(false);
    if (outerBolt) {
      outerBolt.mat.color.set(this.pickArcColor(state));
      this.writeRibbonPath(outerBolt, startX, startY, startZ, endX, endY, endZ, jitter, baseWidth);
      outerBolt.maxLife = state.saiyanMode ? 0.12 : 0.09;
      outerBolt.life = outerBolt.maxLife;
      outerBolt.mat.opacity = 0.96;
      outerBolt.mesh.visible = true;
    }

    // During Saiyan Powerup, pair with a sharp black lightning core arc!
    if (state.saiyanMode && Math.random() < 0.72) {
      const blackBolt = this.findFreeSlot(true);
      if (blackBolt && blackBolt.isBlackCoreSlot) {
        blackBolt.mat.color.set('#05050a');
        this.writeRibbonPath(
          blackBolt,
          startX,
          startY,
          startZ + 0.02,
          endX,
          endY,
          endZ + 0.02,
          jitter * 0.85,
          baseWidth * 0.62
        );
        blackBolt.maxLife = 0.11;
        blackBolt.life = blackBolt.maxLife;
        blackBolt.mat.opacity = 0.98;
        blackBolt.mesh.visible = true;
      }
    }
  }

  triggerBolt(cat, state) {
    const nearCat = state.actIndex === 2 || state.saiyanMode || Math.random() < 0.35;
    const startX = nearCat ? cat.x + (Math.random() - 0.5) * 2.2 : (Math.random() - 0.5) * 14;
    const startY = nearCat ? 0.6 + Math.random() * 1.4 : 1.0 + Math.random() * 5.5;
    const startZ = nearCat ? -1.4 : -22 - Math.random() * 50;

    const endX = nearCat ? startX + (Math.random() - 0.5) * 7.2 : (Math.random() - 0.5) * 16;
    const endY = nearCat ? 0.1 + Math.random() * 4.4 : 0.1 + Math.random() * 6.8;
    const endZ = nearCat ? startZ - 4 - Math.random() * 10 : startZ - 14;

    const width = state.saiyanMode ? 0.19 : 0.07;
    const bolt = this.findFreeSlot(state.saiyanMode && Math.random() < 0.45);
    if (!bolt) return;

    bolt.mat.color.set(bolt.isBlackCoreSlot ? '#05050a' : this.pickArcColor(state));
    this.writeRibbonPath(bolt, startX, startY, startZ, endX, endY, endZ, 0.82, width);
    bolt.maxLife = 0.10 + Math.random() * 0.09;
    bolt.life = bolt.maxLife;
    bolt.mat.opacity = 0.94;
    bolt.mesh.visible = true;
  }
}
