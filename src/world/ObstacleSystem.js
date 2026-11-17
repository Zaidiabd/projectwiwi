import * as THREE from 'three';

const MAX_OBSTACLES = 20;
const MAX_ANOMALIES = 12;

export class ObstacleSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeCount = 16;
    this.anomalyLimit = 10;

    // 1. Standard obsidian reality shards
    const geom = new THREE.ConeGeometry(0.46, 1.45, 5);
    geom.translate(0, 0.72, 0);
    this.mat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      emissive: '#ff2a4b',
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.8,
      transparent: true,
      opacity: 0.9
    });

    this.mesh = new THREE.InstancedMesh(geom, this.mat, MAX_OBSTACLES);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    // 2. Weird Space Tear Anomaly obstacles (unlocked at 62s)
    const anomGeom = new THREE.TorusKnotGeometry(0.45, 0.14, 36, 8);
    this.anomMat = new THREE.MeshStandardMaterial({
      color: '#06181c',
      emissive: '#2dd4bf',
      emissiveIntensity: 1.25,
      roughness: 0.15,
      metalness: 0.9,
      transparent: true,
      opacity: 0.94
    });

    this.anomMesh = new THREE.InstancedMesh(anomGeom, this.anomMat, MAX_ANOMALIES);
    this.anomMesh.frustumCulled = false;
    this.scene.add(this.anomMesh);

    this.items = [];
    for (let i = 0; i < MAX_OBSTACLES; i++) {
      this.items.push({
        x: 0,
        z: -40 - i * 16,
        active: false,
        hitCooldown: 0,
        spin: Math.random() * Math.PI
      });
    }

    this.anomalies = [];
    for (let i = 0; i < MAX_ANOMALIES; i++) {
      this.anomalies.push({
        baseX: 0,
        x: 0,
        y: 0.85,
        z: -55 - i * 24,
        phase: Math.random() * Math.PI * 2,
        swayAmp: 1.4 + Math.random() * 1.8,
        active: false,
        hitCooldown: 0
      });
    }

    this.dummy = new THREE.Object3D();
    this.reset();
  }

  setQualityCount(count) {
    this.activeCount = Math.min(MAX_OBSTACLES, count);
    this.anomalyLimit = Math.min(MAX_ANOMALIES, Math.max(4, Math.floor(count * 0.6)));
    this.mesh.count = this.activeCount;
    this.anomMesh.count = this.anomalyLimit;
  }

  reset() {
    this.mesh.visible = false;
    this.anomMesh.visible = false;
    for (let i = 0; i < MAX_OBSTACLES; i++) {
      this.items[i].z = -45 - i * 18;
      this.items[i].x = (Math.random() - 0.5) * 9.0;
      this.items[i].active = false;
      this.items[i].hitCooldown = 0;
    }
    for (let i = 0; i < MAX_ANOMALIES; i++) {
      this.anomalies[i].z = -60 - i * 24;
      this.anomalies[i].baseX = (Math.random() - 0.5) * 6.5;
      this.anomalies[i].x = this.anomalies[i].baseX;
      this.anomalies[i].active = false;
      this.anomalies[i].hitCooldown = 0;
    }
  }

  update(worldDt, cat, state, onHit, onPhase) {
    if (state.actIndex < 1 || state.actIndex >= 4 || state.runElapsed > 212) {
      this.mesh.visible = false;
      this.anomMesh.visible = false;
      return;
    }

    const phaseProtected = state.burstActive || state.stage2BurstActive;

    // 1. Standard floor shards
    this.mesh.visible = true;
    if (phaseProtected) {
      this.mat.emissive.set(state.stage2BurstActive ? '#ffbe3b' : '#22e6ff');
      this.mat.opacity = 0.36;
    } else {
      this.mat.emissive.set(state.anomalyMode ? '#d946ef' : '#ff2a4b');
      this.mat.opacity = 0.92;
    }

    const density = state.actIndex === 1 ? 0.45 : state.tearCount < 2 ? 0.7 : 1.0;
    const spawnCount = Math.floor(this.activeCount * density);

    for (let i = 0; i < this.activeCount; i++) {
      const it = this.items[i];
      if (i >= spawnCount) {
        this.dummy.position.set(0, -100, 0);
        this.dummy.scale.setScalar(0.01);
        this.dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      it.z += state.speed * worldDt;
      it.spin += worldDt * 2.2;
      if (it.hitCooldown > 0) it.hitCooldown -= worldDt;

      if (it.z > 8) {
        it.z = -125 - Math.random() * 45;
        it.x = (Math.random() - 0.5) * 9.2;
        it.active = true;
        it.hitCooldown = 0;
      }

      if (it.active && it.hitCooldown <= 0 && Math.abs(it.z) < 0.85 && cat.y < 0.8) {
        if (Math.abs(it.x - cat.x) < 0.78) {
          it.hitCooldown = 1.0;
          it.active = false;
          if (phaseProtected) {
            if (onPhase) onPhase();
          } else {
            cat.applyImpactSlowdown();
            if (onHit) onHit();
          }
        }
      }

      this.dummy.position.set(it.x, it.active ? 0 : -10, it.z);
      this.dummy.rotation.set(0, it.spin, 0);
      this.dummy.scale.setScalar(it.active ? 1 : 0.01);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    // 2. Weird Space Tear Anomaly Obstacles (active from 62s onward!)
    if (!state.anomalyMode) {
      this.anomMesh.visible = false;
      return;
    }

    this.anomMesh.visible = true;
    if (phaseProtected) {
      this.anomMat.emissive.set('#ffbe3b');
      this.anomMat.opacity = 0.36;
    } else if (state.tearCount >= 5) {
      this.anomMat.emissive.set('#ff2a4b');
      this.anomMat.opacity = 0.96;
    } else if (state.tearCount >= 4) {
      this.anomMat.emissive.set('#e879f9');
      this.anomMat.opacity = 0.95;
    } else {
      this.anomMat.emissive.set('#2dd4bf');
      this.anomMat.opacity = 0.94;
    }

    const anomDensity = state.tearCount >= 4 ? 1.0 : 0.65;
    const anomCount = Math.floor(this.anomalyLimit * anomDensity);

    for (let i = 0; i < this.anomalyLimit; i++) {
      const a = this.anomalies[i];
      if (i >= anomCount) {
        this.dummy.position.set(0, -100, 0);
        this.dummy.scale.setScalar(0.01);
        this.dummy.updateMatrix();
        this.anomMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      a.z += state.speed * (1.06 + state.tearCount * 0.03) * worldDt;
      a.phase += worldDt * (2.6 + state.tearCount * 0.35);
      a.x = THREE.MathUtils.clamp(a.baseX + Math.sin(a.phase) * a.swayAmp, -4.8, 4.8);
      a.y = 0.72 + Math.sin(a.phase * 1.7) * 0.28;
      if (a.hitCooldown > 0) a.hitCooldown -= worldDt;

      if (a.z > 10) {
        a.z = -140 - Math.random() * 45;
        a.baseX = (Math.random() - 0.5) * 6.8;
        a.active = true;
        a.hitCooldown = 0;
      }

      if (a.active && a.hitCooldown <= 0 && Math.abs(a.z) < 0.95 && Math.abs(a.y - (cat.y + 0.5)) < 0.85) {
        if (Math.abs(a.x - cat.x) < 0.86) {
          a.hitCooldown = 1.0;
          a.active = false;
          if (phaseProtected) {
            if (onPhase) onPhase();
          } else {
            cat.applyImpactSlowdown();
            if (onHit) onHit();
          }
        }
      }

      const pulseScale = a.active ? 0.95 + Math.sin(a.phase * 2) * 0.16 : 0.01;
      this.dummy.position.set(a.x, a.active ? a.y : -10, a.z);
      this.dummy.rotation.set(a.phase * 0.9, a.phase * 1.3, a.phase * 0.5);
      this.dummy.scale.setScalar(pulseScale);
      this.dummy.updateMatrix();
      this.anomMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.anomMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Exposes active obstacle lists for predictive AI playthrough avoidance.
   */
  getObstaclesRef() {
    return {
      shardsActive: this.mesh.visible,
      anomaliesActive: this.anomMesh.visible,
      shards: this.items,
      anomalies: this.anomalies
    };
  }
}
