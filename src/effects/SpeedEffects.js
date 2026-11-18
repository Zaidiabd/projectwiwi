import * as THREE from 'three';

const MAX_SPARKS = 96;
const MAX_WAVES = 6;

export class SpeedEffects {
  constructor(scene) {
    this.scene = scene;
    this.sparkLimit = 64;

    // 1. Instanced paw-trail & shatter sparks (1 draw call)
    const sparkGeom = new THREE.BoxGeometry(0.08, 0.08, 0.36);
    this.sparkMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.sparkMesh = new THREE.InstancedMesh(sparkGeom, this.sparkMat, MAX_SPARKS);
    this.sparkMesh.frustumCulled = false;
    this.scene.add(this.sparkMesh);

    this.sparks = [];
    for (let i = 0; i < MAX_SPARKS; i++) {
      this.sparks.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
        scale: 1,
        color: new THREE.Color('#22e6ff')
      });
    }
    this.sparkCursor = 0;
    this.pawEmitTimer = 0;
    this.lilyEmitTimer = 0;

    // 2. Pre-allocated expanding 3D shockwave rings
    const waveGeom = new THREE.RingGeometry(0.65, 0.95, 36);
    this.waves = [];
    for (let i = 0; i < MAX_WAVES; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: '#22e6ff',
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(waveGeom, mat);
      mesh.visible = false;
      mesh.renderOrder = 11;
      this.scene.add(mesh);

      this.waves.push({
        mesh,
        mat,
        active: false,
        life: 0,
        maxLife: 0.55,
        maxScale: 9
      });
    }
    this.waveCursor = 0;
    this.dummy = new THREE.Object3D();
    this.reset();
  }

  setQualityCount(tier) {
    this.sparkLimit = tier === 'low' ? 32 : tier === 'medium' ? 64 : MAX_SPARKS;
    this.sparkMesh.count = this.sparkLimit;
  }

  reset() {
    this.pawEmitTimer = 0;
    this.lilyEmitTimer = 0;
    for (let i = 0; i < MAX_SPARKS; i++) {
      this.sparks[i].active = false;
      this.dummy.position.set(0, -100, 0);
      this.dummy.scale.setScalar(0.01);
      this.dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.sparkMesh.instanceMatrix.needsUpdate = true;

    for (const w of this.waves) {
      w.active = false;
      w.mesh.visible = false;
    }
  }

  emitSpark(x, y, z, vx, vy, vz, colorHex, maxLife = 0.36, scale = 1.0) {
    const idx = this.sparkCursor % this.sparkLimit;
    this.sparkCursor++;
    const s = this.sparks[idx];
    s.active = true;
    s.x = x;
    s.y = y;
    s.z = z;
    s.vx = vx;
    s.vy = vy;
    s.vz = vz;
    s.life = maxLife;
    s.maxLife = maxLife;
    s.scale = scale;
    s.color.set(colorHex);
    this.sparkMesh.setColorAt(idx, s.color);
    if (this.sparkMesh.instanceColor) {
      this.sparkMesh.instanceColor.needsUpdate = true;
    }
  }

  spawnShockwave(x, y, z, colorHex = '#22e6ff', maxScale = 9.5, maxLife = 0.55) {
    const w = this.waves[this.waveCursor % MAX_WAVES];
    this.waveCursor++;
    w.active = true;
    w.life = maxLife;
    w.maxLife = maxLife;
    w.maxScale = maxScale;
    w.mat.color.set(colorHex);
    w.mat.opacity = 0.9;
    w.mesh.position.set(x, y, z);
    w.mesh.scale.setScalar(0.4);
    w.mesh.visible = true;
  }

  spawnImpactBurst(x, y, z, colorHex = '#ff2a4b', count = 12) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 4 + Math.random() * 9;
      this.emitSpark(
        x,
        y + 0.4,
        z,
        Math.cos(ang) * spd,
        1.5 + Math.random() * 5.5,
        2 + Math.random() * 8,
        colorHex,
        0.35 + Math.random() * 0.2,
        1.25
      );
    }
  }

  pickWiwiSparkColor(state) {
    if (state.saiyanMode) {
      const r = Math.random();
      return r < 0.4 ? '#fef08a' : r < 0.72 ? '#ff1a35' : '#38bdf8';
    }
    if (state.stage2BurstActive) return Math.random() > 0.4 ? '#ffbe3b' : '#ff2a85';
    if (state.burstActive) return '#38f3ff';
    if (state.tearCount >= 5) return Math.random() > 0.5 ? '#ff2a4b' : '#c084fc';
    if (state.anomalyMode) return Math.random() > 0.5 ? '#2dd4bf' : '#e879f9';
    return '#22e6ff';
  }

  update(worldDt, realDt, cat, lily, state) {
    const isPlaying = state.phase === 'playing';
    this.sparkMesh.visible = isPlaying;

    if (isPlaying && state.speed > 10) {
      const interval = state.saiyanMode ? 0.018 : state.isBoosting ? 0.028 : 0.05;
      this.pawEmitTimer += worldDt;
      if (this.pawEmitTimer >= interval) {
        this.pawEmitTimer = 0;
        const side = Math.random() > 0.5 ? 0.28 : -0.28;
        this.emitSpark(
          cat.x + side + (Math.random() - 0.5) * 0.16,
          cat.y + 0.06,
          0.2,
          (Math.random() - 0.5) * 2.4,
          0.9 + Math.random() * 2.1,
          state.speed * 0.55 + Math.random() * 6,
          this.pickWiwiSparkColor(state),
          state.saiyanMode ? 0.42 : 0.30,
          state.saiyanMode ? 1.45 : 0.95
        );
      }

      // Lily paw-trail sparks during TEAR V (emerald & white!)
      if (state.tearCount >= 5 && lily.group.visible) {
        this.lilyEmitTimer += worldDt;
        if (this.lilyEmitTimer >= 0.036) {
          this.lilyEmitTimer = 0;
          const col = Math.random() > 0.45 ? '#34d399' : '#f1f5f9';
          this.emitSpark(
            lily.x + (Math.random() - 0.5) * 0.5,
            0.08,
            lily.z + 0.25,
            (Math.random() - 0.5) * 2.0,
            1.0 + Math.random() * 2.0,
            state.speed * 0.52,
            col,
            0.32,
            1.1
          );
        }
      }
    }

    // Update all sparks
    for (let i = 0; i < this.sparkLimit; i++) {
      const s = this.sparks[i];
      if (!s.active) {
        this.dummy.position.set(0, -100, 0);
        this.dummy.scale.setScalar(0.01);
        this.dummy.updateMatrix();
        this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      s.life -= worldDt;
      if (s.life <= 0) {
        s.active = false;
        this.dummy.position.set(0, -100, 0);
        this.dummy.scale.setScalar(0.01);
      } else {
        s.x += s.vx * worldDt;
        s.y = Math.max(0.02, s.y + s.vy * worldDt);
        s.vy -= 9.5 * worldDt;
        s.z += s.vz * worldDt;

        const lifeRatio = s.life / s.maxLife;
        this.dummy.position.set(s.x, s.y, s.z);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(
          s.scale * lifeRatio,
          s.scale * lifeRatio,
          s.scale * (1.2 + state.normalizedSpeed * 2.5) * lifeRatio
        );
      }
      this.dummy.updateMatrix();
      this.sparkMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.sparkMesh.instanceMatrix.needsUpdate = true;

    // Update expanding shockwave rings
    for (let i = 0; i < MAX_WAVES; i++) {
      const w = this.waves[i];
      if (!w.active) continue;

      w.life -= realDt;
      if (w.life <= 0) {
        w.active = false;
        w.mesh.visible = false;
      } else {
        const p = 1 - w.life / w.maxLife;
        const sc = 0.4 + Math.pow(p, 0.72) * w.maxScale;
        w.mesh.scale.setScalar(sc);
        w.mat.opacity = (1 - p) * 0.85;
      }
    }
  }
}
