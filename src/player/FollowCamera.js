import * as THREE from 'three';

export class FollowCamera {
  constructor(aspect = 1.77) {
    this.camera = new THREE.PerspectiveCamera(58, aspect, 0.1, 450);
    this.lookTarget = new THREE.Vector3(0, 1.0, -14);
    this.scratchPos = new THREE.Vector3();
    this.shakePhase = 0;
    this.reset();
  }

  reset() {
    this.camera.fov = 58;
    this.camera.position.set(0, 2.35, 5.6);
    this.camera.lookAt(0, 1.05, -14);
    this.camera.updateProjectionMatrix();
  }

  resize(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  update(realDt, cat, state, beatEnergy = 0) {
    // Keep camera responsive in real time even during slow-motion
    const speedRatio = state.normalizedSpeed;
    const targetFov = 58 + speedRatio * 24 + (state.isBoosting ? 4 : 0) + (state.burstActive ? -4 : 0);
    this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-6 * realDt));
    this.camera.updateProjectionMatrix();

    // Subtle speed micro-shake without nauseating roll
    this.shakePhase += realDt * (18 + speedRatio * 26);
    const shakeAmp = (speedRatio > 0.35 ? (speedRatio - 0.35) * 0.08 : 0) + (state.actIndex >= 3 ? 0.03 : 0);
    const shakeX = Math.sin(this.shakePhase * 1.3) * shakeAmp;
    const shakeY = Math.cos(this.shakePhase * 1.9) * shakeAmp * 0.7;

    const desiredX = cat.x * 0.68 + shakeX;
    const desiredY = 2.35 + cat.y * 0.55 - speedRatio * 0.22 + shakeY;
    const desiredZ = 5.6 + speedRatio * 0.65 + (state.burstActive ? 0.5 : 0);

    const smooth = 1 - Math.exp(-9 * realDt);
    this.camera.position.x += (desiredX - this.camera.position.x) * smooth;
    this.camera.position.y += (desiredY - this.camera.position.y) * smooth;
    this.camera.position.z += (desiredZ - this.camera.position.z) * smooth;

    const targetLookX = cat.x * 0.82;
    const targetLookY = 1.1 + cat.y * 0.45 + beatEnergy * 0.04;
    const targetLookZ = -14 - speedRatio * 6;

    this.lookTarget.x += (targetLookX - this.lookTarget.x) * smooth;
    this.lookTarget.y += (targetLookY - this.lookTarget.y) * smooth;
    this.lookTarget.z += (targetLookZ - this.lookTarget.z) * smooth;

    this.camera.lookAt(this.lookTarget);
  }

  updateEnding(realDt, cat, step) {
    const smooth = 1 - Math.exp(-4.5 * realDt);
    if (step === 0) {
      // Follow leap into rift
      this.scratchPos.set(cat.x * 0.5, 2.4 + cat.y * 0.6, 5.2);
      this.lookTarget.set(0, 1.5, -10);
    } else if (step === 1) {
      this.scratchPos.set(0.0, 1.85, 5.0);
      this.lookTarget.set(0, 0.7, -1.5);
    } else if (step === 2) {
      // Wide enough to watch Lily trot in from the right while Wiwi fumes!
      this.scratchPos.set(0.25, 1.65, 5.1);
      this.lookTarget.set(0.15, 0.75, -0.4);
    } else {
      // Clean comedic two-cat framing over the laser dot
      this.scratchPos.set(0.15, 1.45, 4.4);
      this.lookTarget.set(0.1, 0.6, -0.2);
    }
    this.camera.fov += (52 - this.camera.fov) * smooth;
    this.camera.updateProjectionMatrix();
    this.camera.position.lerp(this.scratchPos, smooth);
    this.camera.lookAt(this.lookTarget);
  }
}
