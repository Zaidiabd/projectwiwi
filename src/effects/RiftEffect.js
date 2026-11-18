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
  { start: 32.0, hit: TIMELINE.tear1 },
  { start: 44.0, hit: TIMELINE.tear2 },
  { start: 56.0, hit: TIMELINE.tear3Anomaly },
  { start: 69.0, hit: TIMELINE.tear4 },
  { start: TIMELINE.burst2Start, hit: TIMELINE.tear5 }
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

    this.reset();
  }

  reset() {
    this.group.visible = false;
    this.group.position.set(0, 3.8, -85);
    this.group.scale.setScalar(0.35);
    this.discMat.uniforms.uTime.value = 0;
    this.discMat.uniforms.uIntensity.value = 0;
    this.light.intensity = 0;
    this.passZ = -90;
  }

  update(worldDt, realDt, state, beatEnergy = 0) {
    const tSec = state.runElapsed;
    if (tSec < 32.0 || state.actIndex >= 4) {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;
    this.discMat.uniforms.uTime.value += worldDt * (1.45 + state.tearCount * 0.18);
    this.discMat.uniforms.uBeat.value = beatEnergy;

    // Color theme shifts per stage
    if (state.stage2BurstActive) {
      this.discMat.uniforms.uColorA.value.set('#ffbe3b');
      this.discMat.uniforms.uColorB.value.set('#ff2a85');
      this.ringMatA.color.set('#ffbe3b');
      this.ringMatB.color.set('#ff2a85');
      this.light.color.set('#ffbe3b');
    } else if (state.anomalyMode && state.tearCount < 5) {
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

    // Check if approaching one of the 5 major timed dimensional tears
    let matchedWindow = null;
    for (const w of TEAR_WINDOWS) {
      if (tSec >= w.start && tSec < w.hit) {
        matchedWindow = w;
        break;
      }
    }

    let targetZ = -85;
    let targetScale = 0.5;
    let intensity = 1.0;

    if (matchedWindow) {
      const ratio = (tSec - matchedWindow.start) / (matchedWindow.hit - matchedWindow.start);
      targetZ = THREE.MathUtils.lerp(-94, 3.0, Math.pow(ratio, 1.45));
      targetScale = THREE.MathUtils.lerp(0.38, 1.65, ratio) * (1 + beatEnergy * 0.06);
      intensity = Math.min(1, ratio * 1.3);
      this.group.position.y = THREE.MathUtils.lerp(4.4, 2.5, ratio);
      this.passZ = -92;
    } else if (tSec >= TIMELINE.finish - 7.0) {
      // Final exit rift before 216s leap
      const ratio = (tSec - (TIMELINE.finish - 7.0)) / 7.0;
      targetZ = THREE.MathUtils.lerp(-88, -9.5, Math.pow(ratio, 1.3));
      targetScale = THREE.MathUtils.lerp(0.55, 1.6, ratio) * (1 + beatEnergy * 0.07);
      this.group.position.y = THREE.MathUtils.lerp(4.2, 2.6, ratio);
    } else {
      // Continuous post-tear streaming portals flying past during intense chase
      this.passZ += state.speed * 1.15 * worldDt;
      if (this.passZ > 18) this.passZ = -98;
      targetZ = this.passZ;
      targetScale = 1.05 + state.tearCount * 0.1 + beatEnergy * 0.12;
      intensity = 0.85;
      this.group.position.y = 2.85;
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

    // Jagged fracture shards framing the portal mouth
    this.fractureMat.color.copy(this.ringMatA.color);
    this.fractureMat.opacity = intensity * (0.55 + beatEnergy * 0.35);
    const rotBase = this.discMat.uniforms.uTime.value * 0.55;
    for (let i = 0; i < this.fractureCount; i++) {
      const ang = (i / this.fractureCount) * Math.PI * 2 + rotBase;
      const rad = 5.1 + Math.sin(ang * 3 + rotBase * 2) * 0.45;
      this.dummy.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad, (i % 2 === 0 ? 0.6 : -0.6));
      this.dummy.rotation.set(0, 0, ang + Math.PI * 0.5);
      this.dummy.scale.set(0.85, 0.9 + beatEnergy * 0.35, 0.85);
      this.dummy.updateMatrix();
      this.fractureMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.fractureMesh.instanceMatrix.needsUpdate = true;
  }
}
