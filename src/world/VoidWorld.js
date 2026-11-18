import * as THREE from 'three';

const MAX_STREAKS = 360;

export class VoidWorld {
  constructor(scene) {
    this.scene = scene;
    this.activeCount = 240;

    const geom = new THREE.BoxGeometry(0.035, 0.035, 1.0);
    this.mat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.mesh = new THREE.InstancedMesh(geom, this.mat, MAX_STREAKS);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    this.items = [];
    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();

    for (let i = 0; i < MAX_STREAKS; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 3.2 + Math.random() * 18;
      this.items.push({
        x: Math.cos(angle) * radius,
        y: Math.max(0.3, Math.sin(angle) * radius * 0.65 + 4.5),
        z: -Math.random() * 150,
        speedMult: 0.8 + Math.random() * 0.9,
        hue: Math.random()
      });
    }
    this.reset();
  }

  setQualityCount(count) {
    this.activeCount = Math.min(MAX_STREAKS, count);
    this.mesh.count = this.activeCount;
  }

  reset() {
    this.mesh.visible = true;
    this.mat.opacity = 0;
  }

  update(worldDt, state) {
    if (state.actIndex >= 4 || state.progress > 0.995) {
      this.mesh.visible = false;
      return;
    }

    const intensity = Math.min(1, Math.max(0, (state.runElapsed - 8.0) / 28.0));
    this.mesh.visible = intensity > 0.01;
    if (!this.mesh.visible) return;

    this.mat.opacity = intensity * (0.38 + Math.min(0.62, state.speed / 100));
    const stretch = 1.4 + (state.speed / 80) * 11.5;

    for (let i = 0; i < this.activeCount; i++) {
      const it = this.items[i];
      it.z += (12 + state.speed * 1.45) * it.speedMult * worldDt;
      if (it.z > 12) {
        it.z = -145 - Math.random() * 20;
      }

      this.dummy.position.set(it.x, it.y, it.z);
      this.dummy.scale.set(1, 1, stretch);
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this.dummy.matrix);

      if (state.stage2BurstActive) {
        this.color.set(it.hue > 0.5 ? '#ffbe3b' : '#ff2a85');
      } else if (state.tearCount >= 5) {
        this.color.set(it.hue > 0.45 ? '#ff2a4b' : '#c084fc');
      } else if (state.riftGateMode) {
        this.color.set(it.hue > 0.5 ? '#2dd4bf' : '#e879f9');
      } else if (state.actIndex >= 3 && it.hue > 0.72) {
        this.color.set('#ff2a4b');
      } else if (it.hue > 0.45) {
        this.color.set('#9333ea');
      } else {
        this.color.set('#22e6ff');
      }
      this.mesh.setColorAt(i, this.color);
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
