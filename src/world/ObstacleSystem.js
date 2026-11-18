import * as THREE from 'three';

const MAX_OBSTACLES = 20;
const MAX_GATES = 10;
const GATE_LANES = [-3.9, -2.35, -0.8, 0.8, 2.35, 3.9];

export class ObstacleSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeCount = 16;
    this.gateLimit = 8;

    // 1. Standard obsidian reality shards (lane-locked floor hazards)
    const geom = new THREE.ConeGeometry(0.46, 1.45, 5);
    geom.translate(0, 0.72, 0);
    this.mat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      emissive: '#ff2a4b',
      emissiveIntensity: 0.9,
      roughness: 0.24,
      metalness: 0.8,
      transparent: true,
      opacity: 0.92
    });

    this.mesh = new THREE.InstancedMesh(geom, this.mat, MAX_OBSTACLES);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    // 2. Dimensional Rift Pylon Gates (fair, lane-locked obstacles starting at 62s)
    const pylonGeom = new THREE.CylinderGeometry(0.26, 0.42, 2.35, 6);
    pylonGeom.translate(0, 1.18, 0);
    this.pylonMat = new THREE.MeshStandardMaterial({
      color: '#091524',
      emissive: '#2dd4bf',
      emissiveIntensity: 1.15,
      roughness: 0.18,
      metalness: 0.85,
      transparent: true,
      opacity: 0.94
    });

    this.pylonMesh = new THREE.InstancedMesh(pylonGeom, this.pylonMat, MAX_GATES);
    this.pylonMesh.frustumCulled = false;
    this.scene.add(this.pylonMesh);

    // Restrained ground telegraph lane strip ahead of each pylon
    const stripGeom = new THREE.PlaneGeometry(0.75, 9.0);
    stripGeom.rotateX(-Math.PI / 2);
    stripGeom.translate(0, 0.024, 4.5);
    this.stripMat = new THREE.MeshBasicMaterial({
      color: '#2dd4bf',
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.stripMesh = new THREE.InstancedMesh(stripGeom, this.stripMat, MAX_GATES);
    this.stripMesh.frustumCulled = false;
    this.scene.add(this.stripMesh);

    this.items = [];
    for (let i = 0; i < MAX_OBSTACLES; i++) {
      this.items.push({
        x: 0,
        z: -40 - i * 16,
        active: false,
        grazed: false,
        hitCooldown: 0,
        spin: Math.random() * Math.PI
      });
    }

    this.gates = [];
    for (let i = 0; i < MAX_GATES; i++) {
      this.gates.push({
        x: GATE_LANES[i % GATE_LANES.length],
        z: -65 - i * 26,
        phase: Math.random() * Math.PI * 2,
        active: false,
        grazed: false,
        hitCooldown: 0
      });
    }

    this.dummy = new THREE.Object3D();
    this.reset();
  }

  setQualityCount(count) {
    this.activeCount = Math.min(MAX_OBSTACLES, count);
    this.gateLimit = Math.min(MAX_GATES, Math.max(4, Math.floor(count * 0.5)));
    this.mesh.count = this.activeCount;
    this.pylonMesh.count = this.gateLimit;
    this.stripMesh.count = this.gateLimit;
  }

  reset() {
    this.mesh.visible = false;
    this.pylonMesh.visible = false;
    this.stripMesh.visible = false;
    for (let i = 0; i < MAX_OBSTACLES; i++) {
      this.items[i].z = -45 - i * 18;
      this.items[i].x = (Math.random() - 0.5) * 9.0;
      this.items[i].active = false;
      this.items[i].grazed = false;
      this.items[i].hitCooldown = 0;
    }
    for (let i = 0; i < MAX_GATES; i++) {
      this.gates[i].z = -70 - i * 28;
      this.gates[i].x = GATE_LANES[(i * 2) % GATE_LANES.length];
      this.gates[i].active = false;
      this.gates[i].grazed = false;
      this.gates[i].hitCooldown = 0;
    }
  }

  update(worldDt, cat, state, onHit, onPhase, lily = null, onLilyHit = null, onGraze = null) {
    if (state.actIndex < 1 || state.actIndex >= 4 || state.runElapsed > 212) {
      this.mesh.visible = false;
      this.pylonMesh.visible = false;
      this.stripMesh.visible = false;
      return;
    }

    const phaseProtected = state.burstActive || state.stage2BurstActive;

    // 1. Standard floor shards
    this.mesh.visible = true;
    if (phaseProtected) {
      this.mat.emissive.set(state.stage2BurstActive ? '#ffbe3b' : '#22e6ff');
      this.mat.opacity = 0.36;
    } else {
      this.mat.emissive.set(state.riftGateMode ? '#d946ef' : '#ff2a4b');
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
        it.x = (Math.random() - 0.5) * 9.0;
        it.active = true;
        it.grazed = false;
        it.hitCooldown = 0;
      }

      if (it.active && it.hitCooldown <= 0 && Math.abs(it.z) < 0.85 && cat.y < 0.8) {
        const dx = Math.abs(it.x - cat.x);
        if (dx < 0.78) {
          it.hitCooldown = 1.0;
          it.active = false;
          it.grazed = true;
          if (phaseProtected) {
            if (onPhase) onPhase();
          } else {
            cat.applyImpactSlowdown(state.overdriveMode);
            if (onHit) onHit();
          }
        }
      }

      if (it.active && !it.grazed && it.z > 0.15 && it.z < 3.5) {
        const dx = Math.abs(it.x - cat.x);
        const vaultedOver = dx < 0.78 && cat.y >= 0.8;
        if ((dx >= 0.78 && dx <= 1.48) || vaultedOver) {
          it.grazed = true;
          if (onGraze) onGraze(it.x, 0.45);
        }
      }

      if (
        it.active &&
        it.hitCooldown <= 0 &&
        state.tearCount >= 5 &&
        lily &&
        lily.group.visible &&
        Math.abs(it.z - lily.z) < 0.9 &&
        Math.abs(it.x - lily.x) < 0.82
      ) {
        it.hitCooldown = 1.0;
        it.active = false;
        if (!phaseProtected) {
          lily.applyImpactSlowdown(state.overdriveMode);
          if (onLilyHit) onLilyHit(lily.x, lily.z);
        }
      }

      this.dummy.position.set(it.x, it.active ? 0 : -10, it.z);
      this.dummy.rotation.set(0, it.spin, 0);
      this.dummy.scale.setScalar(it.active ? 1 : 0.01);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;

    // 2. Dimensional Rift Pylon Gates (active from 62s onward)
    if (!state.riftGateMode) {
      this.pylonMesh.visible = false;
      this.stripMesh.visible = false;
      return;
    }

    this.pylonMesh.visible = true;
    this.stripMesh.visible = true;
    if (phaseProtected) {
      this.pylonMat.emissive.set('#ffbe3b');
      this.pylonMat.opacity = 0.36;
      this.stripMat.color.set('#ffbe3b');
      this.stripMat.opacity = 0.12;
    } else if (state.tearCount >= 5) {
      this.pylonMat.emissive.set('#ff2a4b');
      this.pylonMat.opacity = 0.95;
      this.stripMat.color.set('#ff2a4b');
      this.stripMat.opacity = 0.24;
    } else if (state.tearCount >= 4) {
      this.pylonMat.emissive.set('#e879f9');
      this.pylonMat.opacity = 0.94;
      this.stripMat.color.set('#e879f9');
      this.stripMat.opacity = 0.22;
    } else {
      this.pylonMat.emissive.set('#2dd4bf');
      this.pylonMat.opacity = 0.94;
      this.stripMat.color.set('#2dd4bf');
      this.stripMat.opacity = 0.20;
    }

    const gateDensity = state.tearCount >= 4 ? 1.0 : 0.7;
    const gateCount = Math.floor(this.gateLimit * gateDensity);

    for (let i = 0; i < this.gateLimit; i++) {
      const g = this.gates[i];
      if (i >= gateCount) {
        this.dummy.position.set(0, -100, 0);
        this.dummy.scale.setScalar(0.01);
        this.dummy.updateMatrix();
        this.pylonMesh.setMatrixAt(i, this.dummy.matrix);
        this.stripMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      g.z += state.speed * worldDt;
      g.phase += worldDt * 3.0;
      if (g.hitCooldown > 0) g.hitCooldown -= worldDt;

      if (g.z > 10) {
        g.z = -140 - Math.random() * 45;
        g.x = GATE_LANES[Math.floor(Math.random() * GATE_LANES.length)];
        g.active = true;
        g.grazed = false;
        g.hitCooldown = 0;
      }

      if (g.active && g.hitCooldown <= 0 && Math.abs(g.z) < 0.85 && cat.y < 1.9) {
        if (Math.abs(g.x - cat.x) < 0.76) {
          g.hitCooldown = 1.0;
          g.active = false;
          g.grazed = true;
          if (phaseProtected) {
            if (onPhase) onPhase();
          } else {
            cat.applyImpactSlowdown(state.overdriveMode);
            if (onHit) onHit();
          }
        }
      }

      if (g.active && !g.grazed && g.z > 0.15 && g.z < 3.5) {
        const dx = Math.abs(g.x - cat.x);
        if (dx >= 0.76 && dx <= 1.52) {
          g.grazed = true;
          if (onGraze) onGraze(g.x, 0.85);
        }
      }

      if (
        g.active &&
        g.hitCooldown <= 0 &&
        state.tearCount >= 5 &&
        lily &&
        lily.group.visible &&
        Math.abs(g.z - lily.z) < 0.9 &&
        Math.abs(g.x - lily.x) < 0.82
      ) {
        g.hitCooldown = 1.0;
        g.active = false;
        if (!phaseProtected) {
          lily.applyImpactSlowdown(state.overdriveMode);
          if (onLilyHit) onLilyHit(lily.x, lily.z);
        }
      }

      const pulseScale = g.active ? 1.0 + Math.sin(g.phase * 2) * 0.08 : 0.01;
      this.dummy.position.set(g.x, g.active ? 0 : -10, g.z);
      this.dummy.rotation.set(0, g.phase * 0.65, 0);
      this.dummy.scale.setScalar(pulseScale);
      this.dummy.updateMatrix();
      this.pylonMesh.setMatrixAt(i, this.dummy.matrix);

      this.dummy.position.set(g.x, g.active ? 0 : -10, g.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(g.active ? 1.0 : 0.01);
      this.dummy.updateMatrix();
      this.stripMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.pylonMesh.instanceMatrix.needsUpdate = true;
    this.stripMesh.instanceMatrix.needsUpdate = true;
  }

  getObstaclesRef() {
    return {
      shardsActive: this.mesh.visible,
      gatesActive: this.pylonMesh.visible,
      shards: this.items,
      gates: this.gates
    };
  }
}
