import * as THREE from 'three';

const MAX_SHARDS = 110;
const CRACK_COUNT = 24;

export class RiftWorld {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.activeCount = 72;

    const shardGeom = new THREE.OctahedronGeometry(0.55, 0);
    this.shardMat = new THREE.MeshStandardMaterial({
      color: '#111827',
      emissive: '#6d28d9',
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.85,
      transparent: true,
      opacity: 0.92
    });

    this.shardMesh = new THREE.InstancedMesh(shardGeom, this.shardMat, MAX_SHARDS);
    this.shardMesh.frustumCulled = false;
    this.group.add(this.shardMesh);

    // Luminous dimensional floor cracks
    const crackGeom = new THREE.PlaneGeometry(0.18, 9.0);
    crackGeom.rotateX(-Math.PI / 2);
    this.crackMat = new THREE.MeshBasicMaterial({
      color: '#22e6ff',
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.crackMesh = new THREE.InstancedMesh(crackGeom, this.crackMat, CRACK_COUNT);
    this.crackMesh.frustumCulled = false;
    this.group.add(this.crackMesh);

    this.shards = [];
    this.cracks = [];
    this.dummy = new THREE.Object3D();

    for (let i = 0; i < MAX_SHARDS; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      this.shards.push({
        x: side * (5.8 + Math.random() * 14),
        y: 0.8 + Math.random() * 9.5,
        z: -Math.random() * 140,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        spinX: (Math.random() - 0.5) * 1.4,
        spinY: (Math.random() - 0.5) * 1.8,
        scale: 0.45 + Math.random() * 1.45,
        bobPhase: Math.random() * Math.PI * 2
      });
    }

    for (let i = 0; i < CRACK_COUNT; i++) {
      this.cracks.push({
        x: (Math.random() - 0.5) * 14,
        z: -i * 6.5,
        yaw: (Math.random() - 0.5) * 0.7,
        scaleX: 0.7 + Math.random() * 1.2
      });
    }

    this.reset();
  }

  setQualityCount(count) {
    this.activeCount = Math.min(MAX_SHARDS, count);
    this.shardMesh.count = this.activeCount;
  }

  reset() {
    this.group.visible = false;
    this.shardMat.opacity = 0;
    this.crackMat.opacity = 0;
  }

  update(worldDt, state, beatEnergy = 0) {
    if (state.actIndex >= 4 || state.runElapsed < 28.0) {
      this.group.visible = false;
      return;
    }

    const factor = Math.min(1, (state.runElapsed - 28.0) / 22.0);
    const tearBoost = 1.0 + state.tearCount * 0.14;
    this.group.visible = true;
    this.shardMat.opacity = factor * 0.94;
    this.shardMat.emissiveIntensity = (0.65 + factor * 1.1 + beatEnergy * 0.7) * tearBoost;
    this.crackMat.opacity = factor * (0.45 + beatEnergy * 0.35) * Math.min(1.4, tearBoost);

    if (state.stage2BurstActive) {
      this.shardMat.emissive.set('#d97706');
      this.crackMat.color.set('#ffbe3b');
    } else if (state.tearCount >= 5) {
      this.shardMat.emissive.set('#e11d48');
      this.crackMat.color.set('#ff2a4b');
    } else if (state.anomalyMode) {
      this.shardMat.emissive.set('#0d9488');
      this.crackMat.color.set('#2dd4bf');
    } else if (state.tearCount >= 1) {
      this.shardMat.emissive.set('#9333ea');
      this.crackMat.color.set('#b366ff');
    } else {
      this.shardMat.emissive.set('#1e40af');
      this.crackMat.color.set('#22e6ff');
    }

    for (let i = 0; i < this.activeCount; i++) {
      const s = this.shards[i];
      s.z += state.speed * 0.92 * worldDt;
      if (s.z > 12) {
        s.z = -135 - Math.random() * 20;
      }
      s.rx += s.spinX * worldDt;
      s.ry += s.spinY * worldDt;
      s.bobPhase += worldDt * 1.6;

      this.dummy.position.set(s.x, s.y + Math.sin(s.bobPhase) * 0.45, s.z);
      this.dummy.rotation.set(s.rx, s.ry, 0);
      this.dummy.scale.setScalar(s.scale * (0.65 + factor * 0.55));
      this.dummy.updateMatrix();
      this.shardMesh.setMatrixAt(i, this.dummy.matrix);
    }

    for (let i = 0; i < CRACK_COUNT; i++) {
      const c = this.cracks[i];
      c.z += state.speed * worldDt;
      if (c.z > 10) {
        c.z -= CRACK_COUNT * 6.5;
        c.x = (Math.random() - 0.5) * 13;
      }
      this.dummy.position.set(c.x, 0.02, c.z);
      this.dummy.rotation.set(0, c.yaw, 0);
      this.dummy.scale.set(c.scaleX, 1, 1);
      this.dummy.updateMatrix();
      this.crackMesh.setMatrixAt(i, this.dummy.matrix);
    }

    this.shardMesh.instanceMatrix.needsUpdate = true;
    this.crackMesh.instanceMatrix.needsUpdate = true;
  }
}
