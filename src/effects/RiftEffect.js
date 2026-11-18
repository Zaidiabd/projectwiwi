import * as THREE from 'three';
import { TIMELINE } from '../core/GameState.js';

const RIFT_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const RIFT_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uBeat;
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uAccent;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float angle = atan(p.y, p.x);

    float swirl = angle + (4.2 / (r + 0.26)) - uTime * 2.5;
    float n1 = noise(vec2(cos(swirl) * 3.0, sin(swirl) * 3.0) + r * 4.5 - uTime * 1.4);
    float n2 = noise(p * 7.0 + vec2(uTime * 0.9, -uTime * 1.3));
    float crack = smoothstep(0.54, 0.88, n1 * 0.65 + n2 * 0.35);

    float coreVoid = smoothstep(0.26, 0.08, r);
    float ring = exp(-pow((r - (0.44 + uBeat * 0.03)) * 6.5, 2.0));
    float outerFade = smoothstep(1.0, 0.30, r);

    vec3 col = mix(uColorB, uColorA, crack) * (0.75 + ring * 1.9);
    col += uAccent * smoothstep(0.74, 0.95, crack) * 0.75;
    col = mix(col, vec3(0.01, 0.01, 0.03), coreVoid * 0.92);

    float alpha = clamp((ring * 1.2 + crack * 0.68 + coreVoid * 0.85) * outerFade * uIntensity, 0.0, 1.0);
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

const TEAR_WINDOWS = [
  { start: 6.5, hit: TIMELINE.act2Start, isClock: true },
  { start: 22.5, hit: TIMELINE.stage3Overclock, isClock: false },
  { start: 34.5, hit: TIMELINE.tear1, isClock: false },
  { start: 46.5, hit: TIMELINE.tear2, isClock: false },
  { start: 58.5, hit: TIMELINE.tear3RiftGates, isClock: false },
  { start: 71.5, hit: TIMELINE.tear4, isClock: false },
  { start: 132.5, hit: TIMELINE.burst2Start, isClock: false },
  { start: 138.5, hit: TIMELINE.tear5, isClock: false },
  { start: 175.5, hit: TIMELINE.overdrivePowerup, isClock: false },
  { start: TIMELINE.finish - 6.0, hit: TIMELINE.finish, isClock: false }
];

export class RiftEffect {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    const discGeom = new THREE.PlaneGeometry(18, 18, 1, 1);
    this.discMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uBeat: { value: 0 },
        uColorA: { value: new THREE.Color('#22e6ff') },
        uColorB: { value: new THREE.Color('#9333ea') },
        uAccent: { value: new THREE.Color('#ff2a4b') }
      },
      vertexShader: RIFT_VERTEX,
      fragmentShader: RIFT_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.discMesh = new THREE.Mesh(discGeom, this.discMat);
    this.group.add(this.discMesh);

    const ringGeom = new THREE.TorusGeometry(4.4, 0.12, 12, 64);
    this.ringMatA = new THREE.MeshBasicMaterial({
      color: '#22e6ff',
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.ringMatB = new THREE.MeshBasicMaterial({
      color: '#a855f7',
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.ringA = new THREE.Mesh(ringGeom, this.ringMatA);
    this.ringA.position.z = 1.6;
    this.group.add(this.ringA);

    this.ringB = new THREE.Mesh(ringGeom, this.ringMatB);
    this.ringB.position.z = -1.6;
    this.ringB.scale.setScalar(1.22);
    this.group.add(this.ringB);

    this.light = new THREE.PointLight('#9333ea', 0, 55);
    this.light.position.set(0, 1.5, 4);
    this.group.add(this.light);

    // Jagged 3D glass-fracture blades framing the dimensional tear mouth
    const shardGeom = new THREE.ConeGeometry(0.45, 3.2, 3);
    this.fractureMat = new THREE.MeshBasicMaterial({
      color: '#22e6ff',
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.fractureCount = 12;
    this.fractureMesh = new THREE.InstancedMesh(shardGeom, this.fractureMat, this.fractureCount);
    this.fractureMesh.frustumCulled = false;
    this.group.add(this.fractureMesh);
    this.dummy = new THREE.Object3D();

    // Clock-Shaped Wormhole Gate visuals (Stage 2 transition @ 6.5s -> 10.0s)
    this.clockGroup = new THREE.Group();
    this.clockGroup.visible = false;
    this.group.add(this.clockGroup);

    this.clockMat = new THREE.MeshBasicMaterial({
      color: '#fde047',
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const clockRim = new THREE.Mesh(new THREE.TorusGeometry(4.85, 0.14, 12, 64), this.clockMat);
    this.clockGroup.add(clockRim);

    const tickGeom = new THREE.BoxGeometry(0.18, 0.65, 0.12);
    for (let h = 0; h < 12; h++) {
      const ang = (h / 12) * Math.PI * 2;
      const tick = new THREE.Mesh(tickGeom, this.clockMat);
      tick.position.set(Math.sin(ang) * 4.35, Math.cos(ang) * 4.35, 0.25);
      tick.rotation.z = -ang;
      this.clockGroup.add(tick);
    }

    const hourGeom = new THREE.BoxGeometry(0.22, 2.3, 0.14);
    hourGeom.translate(0, 1.05, 0);
    this.hourHand = new THREE.Mesh(hourGeom, this.clockMat);
    this.hourHand.position.z = 0.4;
    this.clockGroup.add(this.hourHand);

    const minGeom = new THREE.BoxGeometry(0.14, 3.6, 0.14);
    minGeom.translate(0, 1.7, 0);
    this.minHand = new THREE.Mesh(minGeom, this.clockMat);
    this.minHand.position.z = 0.5;
    this.clockGroup.add(this.minHand);

    this.reset();
  }

  reset() {
    this.group.visible = false;
    this.clockGroup.visible = false;
    this.group.position.set(0, 3.8, -85);
    this.group.scale.setScalar(0.35);
    this.discMat.uniforms.uTime.value = 0;
    this.discMat.uniforms.uIntensity.value = 0;
    this.light.intensity = 0;
  }

  update(worldDt, realDt, state, beatEnergy = 0) {
    const tSec = state.runElapsed;
    if (state.actIndex >= 4) {
      this.group.visible = false;
      return;
    }

    // Discrete stage-transition gates ONLY (no continuous portal spam!)
    let matchedWindow = null;
    for (let i = 0; i < TEAR_WINDOWS.length; i++) {
      const w = TEAR_WINDOWS[i];
      if (tSec >= w.start && tSec < w.hit) {
        matchedWindow = w;
        break;
      }
    }

    if (!matchedWindow) {
      this.group.visible = false;
      this.light.intensity = 0;
      return;
    }

    this.group.visible = true;
    this.clockGroup.visible = Boolean(matchedWindow.isClock);
    this.discMat.uniforms.uTime.value += worldDt * (1.45 + state.tearCount * 0.18);
    this.discMat.uniforms.uBeat.value = beatEnergy;

    // Color theme shifts per stage
    if (matchedWindow.isClock) {
      this.discMat.uniforms.uColorA.value.set('#38f3ff');
      this.discMat.uniforms.uColorB.value.set('#f59e0b');
      this.ringMatA.color.set('#fde047');
      this.ringMatB.color.set('#22e6ff');
      this.light.color.set('#fde047');
    } else if (state.stage2BurstActive || matchedWindow.hit === TIMELINE.burst2Start) {
      this.discMat.uniforms.uColorA.value.set('#ffbe3b');
      this.discMat.uniforms.uColorB.value.set('#ff2a85');
      this.ringMatA.color.set('#ffbe3b');
      this.ringMatB.color.set('#ff2a85');
      this.light.color.set('#ffbe3b');
    } else if (state.riftGateMode && state.tearCount < 5) {
      this.discMat.uniforms.uColorA.value.set('#2dd4bf');
      this.discMat.uniforms.uColorB.value.set('#d946ef');
      this.ringMatA.color.set('#2dd4bf');
      this.ringMatB.color.set('#d946ef');
      this.light.color.set('#2dd4bf');
    } else if (state.tearCount >= 5) {
      this.discMat.uniforms.uColorA.value.set('#ff2a4b');
      this.discMat.uniforms.uColorB.value.set('#7c3aed');
      this.ringMatA.color.set('#ff2a4b');
      this.ringMatB.color.set('#38f3ff');
      this.light.color.set('#ff2a4b');
    } else {
      this.discMat.uniforms.uColorA.value.set('#22e6ff');
      this.discMat.uniforms.uColorB.value.set('#9333ea');
      this.ringMatA.color.set('#22e6ff');
      this.ringMatB.color.set('#a855f7');
      this.light.color.set('#9333ea');
    }

    const ratio = (tSec - matchedWindow.start) / (matchedWindow.hit - matchedWindow.start);
    const targetZ = THREE.MathUtils.lerp(-92, 3.0, Math.pow(ratio, 1.4));
    const targetScale = THREE.MathUtils.lerp(0.42, 1.65, ratio) * (1 + beatEnergy * 0.06);
    const intensity = Math.min(1, ratio * 1.35);
    this.group.position.y = THREE.MathUtils.lerp(4.2, 2.55, ratio);

    if (this.clockGroup.visible) {
      this.clockMat.opacity = intensity * 0.92;
      this.hourHand.rotation.z -= worldDt * 2.4;
      this.minHand.rotation.z -= worldDt * 12.0;
    }

    this.discMat.uniforms.uIntensity.value = intensity;
    this.group.position.z = targetZ;
    this.group.scale.setScalar(targetScale);

    this.ringA.rotation.z += worldDt * (1.2 + state.tearCount * 0.25);
    this.ringA.rotation.x = Math.sin(this.discMat.uniforms.uTime.value * 0.6) * 0.35;
    this.ringB.rotation.z -= worldDt * (1.55 + state.tearCount * 0.3);
    this.ringB.rotation.y = Math.cos(this.discMat.uniforms.uTime.value * 0.5) * 0.35;

    this.ringMatA.opacity = intensity * (0.58 + beatEnergy * 0.35);
    this.ringMatB.opacity = intensity * (0.58 + beatEnergy * 0.35);
    this.light.intensity = intensity * (14 + state.tearCount * 2.5);

    // Jagged fracture shards framing the portal mouth (hidden cleanly during clock wormhole)
    this.fractureMesh.visible = !matchedWindow.isClock;
    if (this.fractureMesh.visible) {
      this.fractureMat.color.copy(this.ringMatA.color);
      this.fractureMat.opacity = intensity * (0.55 + beatEnergy * 0.35);
      const rotBase = this.discMat.uniforms.uTime.value * 0.55;
      for (let i = 0; i < this.fractureCount; i++) {
        const ang = (i / this.fractureCount) * Math.PI * 2 + rotBase;
        const rad = 5.1 + Math.sin(ang * 3 + rotBase * 2) * 0.45;
        this.dummy.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad, i % 2 === 0 ? 0.6 : -0.6);
        this.dummy.rotation.set(0, 0, ang + Math.PI * 0.5);
        this.dummy.scale.set(0.85, 0.9 + beatEnergy * 0.35, 0.85);
        this.dummy.updateMatrix();
        this.fractureMesh.setMatrixAt(i, this.dummy.matrix);
      }
      this.fractureMesh.instanceMatrix.needsUpdate = true;
    }
  }
}
