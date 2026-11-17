import * as THREE from 'three';

const MAX_ARCHES = 36;
const ARCH_SPACING = 12;

export class Corridor {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.activeCount = 26;
    this.scrollOffset = 0;

    // Instanced left & right cyber-corridor pillars + top lintel (3 instances per arch -> 1 draw call per geometry or single combined arch geometry)
    const archGeom = this.createArchGeometry();
    this.archMat = new THREE.MeshStandardMaterial({
      color: '#0e172a',
      emissive: '#1488a8',
      emissiveIntensity: 0.7,
      roughness: 0.45,
      metalness: 0.6,
      transparent: true,
      opacity: 1
    });

    this.archMesh = new THREE.InstancedMesh(archGeom, this.archMat, MAX_ARCHES);
    this.archMesh.frustumCulled = false;
    this.group.add(this.archMesh);

    // Instanced floor edge rails
    const railGeom = new THREE.BoxGeometry(0.14, 0.06, ARCH_SPACING * 0.9);
    this.railMat = new THREE.MeshBasicMaterial({
      color: '#22e6ff',
      transparent: true,
      opacity: 0.42
    });
    this.railMesh = new THREE.InstancedMesh(railGeom, this.railMat, MAX_ARCHES * 2);
    this.railMesh.frustumCulled = false;
    this.group.add(this.railMesh);

    this.dummy = new THREE.Object3D();
    this.reset();
  }

  createArchGeometry() {
    // Build a single U-shaped arch frame from merged boxes
    const postW = 0.35;
    const postH = 6.2;
    const span = 13.0;
    const parts = [
      { size: [postW, postH, 0.42], pos: [-span * 0.5, postH * 0.5, 0] },
      { size: [postW, postH, 0.42], pos: [span * 0.5, postH * 0.5, 0] },
      { size: [span + postW, 0.35, 0.42], pos: [0, postH, 0] }
    ];

    const geometries = parts.map((p) => {
      const g = new THREE.BoxGeometry(p.size[0], p.size[1], p.size[2]);
      g.translate(p.pos[0], p.pos[1], p.pos[2]);
      return g;
    });

    // Merge manually cleanly without extra addon dependency
    const merged = new THREE.BufferGeometry();
    const posArrays = [];
    const normArrays = [];
    const indices = [];
    let vertOffset = 0;

    for (const g of geometries) {
      const pos = g.attributes.position.array;
      const norm = g.attributes.normal.array;
      const idx = g.index.array;
      posArrays.push(pos);
      normArrays.push(norm);
      for (let i = 0; i < idx.length; i++) {
        indices.push(idx[i] + vertOffset);
      }
      vertOffset += g.attributes.position.count;
      g.dispose();
    }

    const totalPos = posArrays.reduce((s, a) => s + a.length, 0);
    const mergedPos = new Float32Array(totalPos);
    const mergedNorm = new Float32Array(totalPos);
    let offset = 0;
    for (let i = 0; i < posArrays.length; i++) {
      mergedPos.set(posArrays[i], offset);
      mergedNorm.set(normArrays[i], offset);
      offset += posArrays[i].length;
    }

    merged.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
    merged.setIndex(indices);
    return merged;
  }

  setQualityCount(count) {
    this.activeCount = Math.min(MAX_ARCHES, count);
    this.archMesh.count = this.activeCount;
    this.railMesh.count = this.activeCount * 2;
  }

  reset() {
    this.scrollOffset = 0;
    this.group.visible = true;
    this.archMat.opacity = 0;
    this.railMat.opacity = 0;
  }

  update(worldDt, speed, actIndex, runElapsed, beatEnergy = 0) {
    // Fade corridor in 4s->10s, strong through 26s, dissolve into black Overclock void 26s->35s
    let visibilityFactor = 0;
    if (runElapsed < 10.0) {
      visibilityFactor = Math.max(0, (runElapsed - 3.5) / 6.5) * 0.65;
    } else if (runElapsed < 26.0) {
      visibilityFactor = 0.65 + Math.min(1, (runElapsed - 10.0) / 5.0) * 0.35;
    } else if (runElapsed < 35.0) {
      visibilityFactor = Math.max(0, 1 - (runElapsed - 26.0) / 9.0);
    }

    if (visibilityFactor <= 0.01 || actIndex >= 4) {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;
    this.archMat.opacity = visibilityFactor;
    this.railMat.opacity = visibilityFactor * (0.35 + beatEnergy * 0.35);
    this.archMat.emissiveIntensity = 0.5 + beatEnergy * 0.75 + (actIndex >= 2 ? 0.5 : 0);

    if (actIndex >= 2) {
      this.archMat.emissive.set('#6d28d9');
      this.railMat.color.set('#a855f7');
    } else {
      this.archMat.emissive.set('#1488a8');
      this.railMat.color.set('#22e6ff');
    }

    const totalLen = this.activeCount * ARCH_SPACING;
    this.scrollOffset = (this.scrollOffset + speed * worldDt) % ARCH_SPACING;

    for (let i = 0; i < this.activeCount; i++) {
      const z = 12 - i * ARCH_SPACING + this.scrollOffset;
      const depthFade = Math.max(0.4, 1 - Math.abs(z) / totalLen);
      this.dummy.position.set(0, 0, z);
      this.dummy.scale.set(1, 0.95 + depthFade * 0.05, 1);
      this.dummy.updateMatrix();
      this.archMesh.setMatrixAt(i, this.dummy.matrix);

      // Left & right floor guide rails
      this.dummy.position.set(-5.8, 0.03, z);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.railMesh.setMatrixAt(i * 2, this.dummy.matrix);

      this.dummy.position.set(5.8, 0.03, z);
      this.dummy.updateMatrix();
      this.railMesh.setMatrixAt(i * 2 + 1, this.dummy.matrix);
    }

    this.archMesh.instanceMatrix.needsUpdate = true;
    this.railMesh.instanceMatrix.needsUpdate = true;
  }
}
