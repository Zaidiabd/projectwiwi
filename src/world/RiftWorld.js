import * as THREE from 'three';

const MAX_SHARDS = 96;
const MAX_BG_CARS = 14;
const MAX_BG_TREES = 18;
const MAX_RINGS = 14;

export class RiftWorld {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.activeCount = 64;

    // 1. Floating shattered land / asphalt crag chunks after physical world collapse (38s+)
    const landGeom = new THREE.IcosahedronGeometry(1.15, 2);
    const lPos = landGeom.attributes.position;
    for (let i = 0; i < lPos.count; i++) {
      let x = lPos.getX(i) * 1.15;
      let y = lPos.getY(i);
      let z = lPos.getZ(i) * 1.35;
      const crag = 1.0 + 0.16 * Math.sin(x * 3.8 + z * 3.1) + 0.10 * Math.cos(y * 5.2 - x * 2.4);
      x *= crag;
      z *= crag;
      y = y > 0 ? y * 0.24 + 0.04 * Math.sin(x * 4.5 + z * 4.5) : y * 0.62 * crag;
      lPos.setXYZ(i, x, y, z);
    }
    landGeom.computeVertexNormals();

    this.shardMat = new THREE.MeshStandardMaterial({
      color: '#1e293b',
      emissive: '#6d28d9',
      emissiveIntensity: 0.72,
      roughness: 0.45,
      metalness: 0.55,
      transparent: true,
      opacity: 0.94
    });

    this.shardMesh = new THREE.InstancedMesh(landGeom, this.shardMat, MAX_SHARDS);
    this.shardMesh.frustumCulled = false;
    this.group.add(this.shardMesh);

    // 2. Flying / tumbling aerodynamic background cars torn off the collapsed neighborhood road
    const carGeom = new THREE.CapsuleGeometry(0.58, 1.85, 8, 16);
    carGeom.rotateX(Math.PI / 2);
    carGeom.scale(1.28, 0.68, 1.0);
    const cPos = carGeom.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      let x = cPos.getX(i);
      let y = cPos.getY(i);
      let z = cPos.getZ(i);
      // Sculpt cabin greenhouse hump + flat undercarriage
      if (y > 0.05 && Math.abs(z) < 0.85) {
        y += 0.26 * Math.cos((z / 0.85) * (Math.PI * 0.5));
        x *= 0.86;
      } else if (y < -0.12) {
        y = -0.18;
      }
      cPos.setXYZ(i, x, y, z);
    }
    carGeom.computeVertexNormals();

    this.carMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      emissive: '#ff2a4b',
      emissiveIntensity: 0.65,
      roughness: 0.3,
      metalness: 0.75,
      transparent: true,
      opacity: 0.92
    });
    this.carMesh = new THREE.InstancedMesh(carGeom, this.carMat, MAX_BG_CARS);
    this.carMesh.frustumCulled = false;
    this.group.add(this.carMesh);

    // 3. Uprooted organic neighborhood trees tumbling in the background void
    const treeGeom = new THREE.IcosahedronGeometry(1.05, 2);
    treeGeom.scale(0.95, 1.55, 0.95);
    const tPos = treeGeom.attributes.position;
    for (let i = 0; i < tPos.count; i++) {
      let x = tPos.getX(i);
      let y = tPos.getY(i);
      let z = tPos.getZ(i);
      if (y < -0.35) {
        // Tapered uprooted trunk base
        x *= 0.28;
        z *= 0.28;
      } else {
        const crownLobe = 1.0 + 0.18 * Math.sin(y * 3.6 + x * 2.8) * Math.cos(z * 2.8);
        x *= crownLobe;
        z *= crownLobe;
      }
      tPos.setXYZ(i, x, y, z);
    }
    treeGeom.computeVertexNormals();
    this.treeMat = new THREE.MeshStandardMaterial({
      color: '#064e3b',
      emissive: '#10b981',
      emissiveIntensity: 0.45,
      roughness: 0.6,
      transparent: true,
      opacity: 0.9
    });
    this.treeMesh = new THREE.InstancedMesh(treeGeom, this.treeMat, MAX_BG_TREES);
    this.treeMesh.frustumCulled = false;
    this.group.add(this.treeMesh);

    this.shards = [];
    this.bgCars = [];
    this.bgTrees = [];
    this.dummy = new THREE.Object3D();

    for (let i = 0; i < MAX_SHARDS; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      this.shards.push({
        x: side * (6.8 + Math.random() * 18),
        y: 1.0 + Math.random() * 12.0,
        z: -Math.random() * 145,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        spinX: (Math.random() - 0.5) * 1.1,
        spinY: (Math.random() - 0.5) * 1.4,
        scale: 0.5 + Math.random() * 1.35,
        bobPhase: Math.random() * Math.PI * 2
      });
    }

    for (let i = 0; i < MAX_BG_CARS; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      this.bgCars.push({
        x: side * (8.5 + Math.random() * 14),
        y: 2.5 + Math.random() * 10,
        z: -15 - i * 10,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 1.8
      });
    }

    for (let i = 0; i < MAX_BG_TREES; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      this.bgTrees.push({
        x: side * (7.5 + Math.random() * 16),
        y: 1.8 + Math.random() * 11,
        z: -10 - i * 8,
        rx: Math.random() * Math.PI,
        rz: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 1.4
      });
    }

    // Cosmic warp rings for late-run hyperstorm variety (75s+)
    const ringGeom = new THREE.TorusGeometry(7.2, 0.08, 8, 36);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: '#e879f9',
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.ringMesh = new THREE.InstancedMesh(ringGeom, this.ringMat, MAX_RINGS);
    this.ringMesh.frustumCulled = false;
    this.group.add(this.ringMesh);

    this.rings = [];
    for (let i = 0; i < MAX_RINGS; i++) {
      this.rings.push({
        z: -12 - i * 10.5,
        rx: (Math.random() - 0.5) * 0.5,
        ry: (Math.random() - 0.5) * 0.5,
        rz: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 1.6,
        scale: 0.9 + Math.random() * 0.65
      });
    }

    this.reset();
  }

  setQualityCount(count) {
    this.activeCount = Math.min(MAX_SHARDS, count);
    this.shardMesh.count = this.activeCount;
    this.carMesh.count = Math.min(MAX_BG_CARS, Math.max(6, Math.floor(count * 0.16)));
    this.treeMesh.count = Math.min(MAX_BG_TREES, Math.max(8, Math.floor(count * 0.2)));
    this.ringMesh.count = Math.min(MAX_RINGS, Math.max(5, Math.floor(count * 0.14)));
  }

  reset() {
    this.group.visible = false;
    this.shardMat.opacity = 0;
    this.carMat.opacity = 0;
    this.treeMat.opacity = 0;
    this.ringMesh.visible = false;
  }

  update(worldDt, state, beatEnergy = 0) {
    // Only visible AFTER Stage 3 Overclock finishes and the physical world collapses (38s+)
    if (!state.worldCollapsed || state.actIndex >= 4) {
      this.group.visible = false;
      return;
    }

    const factor = Math.min(1, (state.runElapsed - 38.0) / 8.0);
    const tearBoost = 1.0 + state.tearCount * 0.12;
    this.group.visible = true;
    this.shardMat.opacity = factor * 0.92;
    this.carMat.opacity = factor * 0.9;
    this.treeMat.opacity = factor * 0.9;
    this.shardMat.emissiveIntensity = (0.55 + factor * 0.8 + beatEnergy * 0.55) * tearBoost;

    if (state.stage2BurstActive) {
      this.shardMat.emissive.set('#d97706');
      this.carMat.emissive.set('#fde047');
    } else if (state.tearCount >= 5) {
      this.shardMat.emissive.set('#e11d48');
      this.carMat.emissive.set('#ff1a35');
    } else if (state.titanMode) {
      this.shardMat.emissive.set('#ec4899');
      this.carMat.emissive.set('#38f3ff');
    } else {
      this.shardMat.emissive.set('#9333ea');
      this.carMat.emissive.set('#22e6ff');
    }

    for (let i = 0; i < this.activeCount; i++) {
      const s = this.shards[i];
      s.z += state.speed * 0.88 * worldDt;
      if (s.z > 12) s.z = -140 - Math.random() * 20;
      s.rx += s.spinX * worldDt;
      s.ry += s.spinY * worldDt;
      s.bobPhase += worldDt * 1.5;

      this.dummy.position.set(s.x, s.y + Math.sin(s.bobPhase) * 0.45, s.z);
      this.dummy.rotation.set(s.rx, s.ry, 0);
      this.dummy.scale.setScalar(s.scale * (0.7 + factor * 0.4));
      this.dummy.updateMatrix();
      this.shardMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.shardMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.carMesh.count; i++) {
      const c = this.bgCars[i];
      c.z += state.speed * 0.95 * worldDt;
      if (c.z > 12) c.z = -140 - Math.random() * 25;
      c.rx += c.spin * worldDt;
      c.rz += c.spin * 0.7 * worldDt;
      this.dummy.position.set(c.x, c.y, c.z);
      this.dummy.rotation.set(c.rx, c.ry, c.rz);
      this.dummy.scale.setScalar(1.0);
      this.dummy.updateMatrix();
      this.carMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.carMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.treeMesh.count; i++) {
      const tr = this.bgTrees[i];
      tr.z += state.speed * 0.9 * worldDt;
      if (tr.z > 12) tr.z = -145 - Math.random() * 25;
      tr.rx += tr.spin * worldDt;
      tr.rz += tr.spin * 0.8 * worldDt;
      this.dummy.position.set(tr.x, tr.y, tr.z);
      this.dummy.rotation.set(tr.rx, 0, tr.rz);
      this.dummy.scale.setScalar(1.0);
      this.dummy.updateMatrix();
      this.treeMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.treeMesh.instanceMatrix.needsUpdate = true;

    // Late-run cosmic warp rings (75s+)
    if (state.tearCount >= 4) {
      this.ringMesh.visible = true;
      this.ringMat.color.set(
        state.stage2BurstActive ? '#ffbe3b' : state.tearCount >= 5 ? '#ff2a4b' : '#e879f9'
      );
      this.ringMat.opacity = 0.24 + beatEnergy * 0.25;

      for (let i = 0; i < this.ringMesh.count; i++) {
        const rg = this.rings[i];
        rg.z += state.speed * 1.1 * worldDt;
        if (rg.z > 14) rg.z -= MAX_RINGS * 10.5;
        rg.rz += rg.spin * worldDt;
        this.dummy.position.set(0, 2.8, rg.z);
        this.dummy.rotation.set(rg.rx, rg.ry, rg.rz);
        this.dummy.scale.setScalar(rg.scale);
        this.dummy.updateMatrix();
        this.ringMesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.ringMesh.instanceMatrix.needsUpdate = true;
    } else {
      this.ringMesh.visible = false;
    }
  }
}
