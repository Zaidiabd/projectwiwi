import * as THREE from 'three';

const MAX_POWERUPS = 6;
const LANES = [-4.0, -2.5, -1.2, 0.0, 1.2, 2.5, 4.0];

export const POWERUP_TYPES = [
  { id: 'surge', label: 'VELOCITY SURGE', sub: '+35% BOOST • SPEED +18%', color: '#22e6ff' },
  { id: 'shield', label: 'AEGIS SHIELD', sub: 'NEXT HIT BLOCKED (12s)', color: '#34d399' },
  { id: 'charge', label: 'TEMPORAL CELL', sub: '+45% BURST CHARGE', color: '#f472b6' }
];

export class PowerupSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeLimit = 5;

    // 1. Floating crystalline pickup core
    const coreGeom = new THREE.OctahedronGeometry(0.46, 0);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#ffffff',
      emissiveIntensity: 1.05,
      roughness: 0.15,
      metalness: 0.35,
      transparent: true,
      opacity: 0.96
    });
    this.coreMesh = new THREE.InstancedMesh(coreGeom, this.coreMat, MAX_POWERUPS);
    this.coreMesh.frustumCulled = false;
    this.coreMesh.renderOrder = 10;
    this.scene.add(this.coreMesh);

    // 2. Horizontal spinning beacon halo ring around each orb
    const ringGeom = new THREE.RingGeometry(0.62, 0.84, 24);
    ringGeom.rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.ringMesh = new THREE.InstancedMesh(ringGeom, this.ringMat, MAX_POWERUPS);
    this.ringMesh.frustumCulled = false;
    this.ringMesh.renderOrder = 9;
    this.scene.add(this.ringMesh);

    this.items = [];
    for (let i = 0; i < MAX_POWERUPS; i++) {
      this.items.push({
        x: 0,
        z: -60 - i * 32,
        typeIndex: i % POWERUP_TYPES.length,
        active: false,
        phase: Math.random() * Math.PI * 2
      });
    }

    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
    this.reset();
  }

  setQualityCount(count) {
    this.activeLimit = Math.min(MAX_POWERUPS, Math.max(3, Math.floor(count * 0.4)));
    this.coreMesh.count = this.activeLimit;
    this.ringMesh.count = this.activeLimit;
  }

  reset() {
    this.coreMesh.visible = false;
    this.ringMesh.visible = false;
    for (let i = 0; i < MAX_POWERUPS; i++) {
      const p = this.items[i];
      p.x = LANES[(i * 2) % LANES.length];
      p.z = -50 - i * 30;
      p.typeIndex = i % POWERUP_TYPES.length;
      p.active = i < 4;
    }
  }

  update(worldDt, cat, state, onCollect) {
    if (state.actIndex < 1 || state.actIndex >= 4 || state.runElapsed > 210) {
      this.coreMesh.visible = false;
      this.ringMesh.visible = false;
      return;
    }

    this.coreMesh.visible = true;
    this.ringMesh.visible = true;

    for (let i = 0; i < this.activeLimit; i++) {
      const p = this.items[i];
      p.z += state.speed * worldDt;
      p.phase += worldDt * 3.8;

      if (p.z > 8) {
        p.z = -115 - Math.random() * 55;
        p.x = LANES[Math.floor(Math.random() * LANES.length)];
        p.typeIndex = (p.typeIndex + 1 + Math.floor(Math.random() * 2)) % POWERUP_TYPES.length;
        p.active = true;
      }

      if (p.active && Math.abs(p.z) < 1.15 && Math.abs(p.x - cat.x) < 1.15 && cat.y < 1.6) {
        p.active = false;
        const spec = POWERUP_TYPES[p.typeIndex];
        if (onCollect) onCollect(spec, p.x, p.z);
      }

      const spec = POWERUP_TYPES[p.typeIndex];
      this.color.set(spec.color);
      this.coreMesh.setColorAt(i, this.color);
      this.ringMesh.setColorAt(i, this.color);

      if (p.active) {
        const y = 0.85 + Math.sin(p.phase) * 0.2;
        this.dummy.position.set(p.x, y, p.z);
        this.dummy.rotation.set(0.35, p.phase * 1.4, 0.2);
        this.dummy.scale.setScalar(1.0);
        this.dummy.updateMatrix();
        this.coreMesh.setMatrixAt(i, this.dummy.matrix);

        const rScale = 0.92 + Math.sin(p.phase * 1.6) * 0.16;
        this.dummy.position.set(p.x, 0.04, p.z);
        this.dummy.rotation.set(0, -p.phase, 0);
        this.dummy.scale.setScalar(rScale);
        this.dummy.updateMatrix();
        this.ringMesh.setMatrixAt(i, this.dummy.matrix);
      } else {
        this.dummy.position.set(0, -100, 0);
        this.dummy.scale.setScalar(0.01);
        this.dummy.updateMatrix();
        this.coreMesh.setMatrixAt(i, this.dummy.matrix);
        this.ringMesh.setMatrixAt(i, this.dummy.matrix);
      }
    }

    this.coreMesh.instanceMatrix.needsUpdate = true;
    this.ringMesh.instanceMatrix.needsUpdate = true;
    if (this.coreMesh.instanceColor) this.coreMesh.instanceColor.needsUpdate = true;
    if (this.ringMesh.instanceColor) this.ringMesh.instanceColor.needsUpdate = true;
  }

  getPowerupsRef() {
    return {
      active: this.coreMesh.visible,
      items: this.items
    };
  }
}
