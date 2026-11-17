import * as THREE from 'three';

const FLOOR_VERTEX = /* glsl */ `
  varying vec2 vWorldUv;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldUv = wp.xz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FLOOR_FRAGMENT = /* glsl */ `
  uniform float uOffset;
  uniform float uGridStrength;
  uniform vec3 uBaseColor;
  uniform vec3 uLineColor;
  uniform float uPeaceful;

  varying vec2 vWorldUv;

  void main() {
    vec2 uv = vWorldUv;
    uv.y -= uOffset;

    // Anti-aliased grid lines
    vec2 grid = abs(fract(uv * vec2(0.5, 0.25) - 0.5) - 0.5) / fwidth(uv * vec2(0.5, 0.25));
    float line = 1.0 - min(min(grid.x, grid.y), 1.0);

    // Center slipstream track accent
    float centerTrack = smoothstep(5.8, 5.4, abs(vWorldUv.x));
    float edgeGlow = smoothstep(0.25, 0.0, abs(abs(vWorldUv.x) - 5.6));

    // Distance horizon fade
    float distFade = exp(-length(vWorldUv) * 0.018);

    vec3 col = mix(uBaseColor, uLineColor, line * uGridStrength * centerTrack);
    col += uLineColor * edgeGlow * 0.35 * uGridStrength;
    col *= mix(distFade, 1.0, uPeaceful);

    // Peaceful warm floor tile hint in Act 5
    if (uPeaceful > 0.01) {
      float plank = smoothstep(0.06, 0.0, abs(fract(vWorldUv.x * 0.65) - 0.5));
      vec3 roomCol = mix(vec3(0.14, 0.15, 0.18), vec3(0.18, 0.19, 0.23), plank);
      col = mix(col, roomCol * exp(-length(vWorldUv) * 0.045), uPeaceful);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

function createGlowDiscTexture(innerColor, outerColor) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 60);
  g.addColorStop(0, innerColor);
  g.addColorStop(0.22, outerColor);
  g.addColorStop(1, 'rgba(255, 42, 75, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.scene.background = new THREE.Color('#05070d');
    this.scene.fog = new THREE.FogExp2('#05070d', 0.016);

    // Lighting
    this.hemiLight = new THREE.HemisphereLight('#5c85b8', '#090b12', 0.85);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight('#bae6fd', 0.9);
    this.dirLight.position.set(4, 12, 8);
    this.scene.add(this.dirLight);

    // Floor plane with custom grid/void/peaceful shader
    const floorGeom = new THREE.PlaneGeometry(180, 260, 1, 1);
    floorGeom.rotateX(-Math.PI / 2);
    this.floorMat = new THREE.ShaderMaterial({
      uniforms: {
        uOffset: { value: 0 },
        uGridStrength: { value: 0.45 },
        uBaseColor: { value: new THREE.Color('#060912') },
        uLineColor: { value: new THREE.Color('#22e6ff') },
        uPeaceful: { value: 0.0 }
      },
      vertexShader: FLOOR_VERTEX,
      fragmentShader: FLOOR_FRAGMENT
    });
    this.floorMesh = new THREE.Mesh(floorGeom, this.floorMat);
    this.floorMesh.position.z = -90;
    this.scene.add(this.floorMesh);

    // Laser Dot group
    this.laserGroup = new THREE.Group();
    this.scene.add(this.laserGroup);

    const coreGeom = new THREE.CircleGeometry(0.11, 20);
    coreGeom.rotateX(-Math.PI / 2);
    this.laserCoreMat = new THREE.MeshBasicMaterial({
      color: '#ff4264',
      transparent: true,
      opacity: 1
    });
    this.laserCore = new THREE.Mesh(coreGeom, this.laserCoreMat);
    this.laserCore.position.y = 0.025;
    this.laserGroup.add(this.laserCore);

    this.laserGlowTex = createGlowDiscTexture('rgba(255,255,255,0.95)', 'rgba(255,42,75,0.75)');
    const haloGeom = new THREE.PlaneGeometry(1.15, 1.15);
    haloGeom.rotateX(-Math.PI / 2);
    this.laserHaloMat = new THREE.MeshBasicMaterial({
      map: this.laserGlowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.laserHalo = new THREE.Mesh(haloGeom, this.laserHaloMat);
    this.laserHalo.position.y = 0.022;
    this.laserGroup.add(this.laserHalo);

    this.laserLight = new THREE.PointLight('#ff2a4b', 2.4, 9);
    this.laserLight.position.set(0, 0.35, 0);
    this.laserGroup.add(this.laserLight);

    // Subtle pointer beam origin in Act 5 (ordinary peaceful reveal hint)
    this.peacefulLight = new THREE.SpotLight('#fff3db', 0, 26, Math.PI / 5, 0.65);
    this.peacefulLight.position.set(2.5, 7.5, 4);
    this.scene.add(this.peacefulLight);

    this.floorScroll = 0;
    this.laserX = 0;
    this.laserZ = -7.5;
    this.laserTime = 0;
    this.reset();
  }

  reset() {
    this.floorScroll = 0;
    this.laserX = 0;
    this.laserZ = -7.2;
    this.laserTime = 0;
    this.laserGroup.visible = true;
    this.laserGroup.position.set(0, 0, -7.2);

    this.scene.background.set('#05070d');
    this.scene.fog.color.set('#05070d');
    this.scene.fog.density = 0.015;

    this.floorMat.uniforms.uOffset.value = 0;
    this.floorMat.uniforms.uGridStrength.value = 0.25;
    this.floorMat.uniforms.uBaseColor.value.set('#060912');
    this.floorMat.uniforms.uLineColor.value.set('#22e6ff');
    this.floorMat.uniforms.uPeaceful.value = 0.0;

    this.peacefulLight.intensity = 0;
    this.hemiLight.intensity = 0.85;
  }

  update(worldDt, realDt, state, beatEnergy = 0) {
    this.floorScroll += state.speed * worldDt;
    this.floorMat.uniforms.uOffset.value = this.floorScroll;

    // Laser weaving target ahead of the cat
    this.laserTime += worldDt * (0.9 + state.actIndex * 0.22);
    const weaveAmp = state.actIndex === 0 ? 0.55 : Math.min(3.6, 1.4 + state.actIndex * 0.85);
    const targetLaserX = Math.sin(this.laserTime * 1.15) * weaveAmp * 0.7 + Math.sin(this.laserTime * 2.1) * weaveAmp * 0.3;
    this.laserX += (targetLaserX - this.laserX) * (1 - Math.exp(-3.5 * worldDt));

    // Laser stays tantalizingly just out of reach until Act 5
    const desiredZ = -7.0 - state.normalizedSpeed * 3.8 + state.slipstreamAlignment * 0.9;
    this.laserZ += (desiredZ - this.laserZ) * (1 - Math.exp(-4 * realDt));

    this.laserGroup.visible = state.runElapsed < 214.0;
    this.laserGroup.position.set(this.laserX, 0, this.laserZ);

    const pulse = 1.0 + Math.sin(this.laserTime * 6) * 0.14 + beatEnergy * 0.28;
    this.laserHalo.scale.setScalar(pulse);
    this.laserLight.intensity = 2.1 + beatEnergy * 1.4;

    // Palette evolution by exact timed stage & vibe
    const smooth = 1 - Math.exp(-3.5 * realDt);
    let targetBg = '#05070d';
    let targetLine = '#22e6ff';
    let targetGrid = 0.25;
    let targetFog = 0.014;

    if (state.stage2BurstActive) {
      // 136s-142s: Stage 2 Golden-Amber Temporal Burst
      targetBg = '#140c03';
      targetLine = '#ffbe3b';
      targetGrid = 0.65;
      targetFog = 0.011;
    } else if (state.tearCount >= 5) {
      // 142s-216s: Final collapse hyper-crimson void
      targetBg = '#16030a';
      targetLine = '#ff2a4b';
      targetGrid = 0.62 + beatEnergy * 0.25;
      targetFog = 0.012;
    } else if (state.tearCount >= 4) {
      // 75s-136s: Hyperstorm violet-crimson rupture
      targetBg = '#10031a';
      targetLine = '#e879f9';
      targetGrid = 0.56 + beatEnergy * 0.22;
      targetFog = 0.011;
    } else if (state.anomalyMode) {
      // 62s-75s: Weird Space Tear Anomaly (eerie bioluminescent teal + magenta shift)
      targetBg = '#04191e';
      targetLine = Math.sin(this.laserTime * 1.8) > 0 ? '#2dd4bf' : '#f472b6';
      targetGrid = 0.64 + beatEnergy * 0.24;
      targetFog = 0.016;
    } else if (state.tearCount >= 1) {
      // 38s-62s: Tear 1 & Tear 2 dimensional fracture
      targetBg = '#080416';
      targetLine = '#a855f7';
      targetGrid = 0.45 + beatEnergy * 0.2;
      targetFog = 0.011;
    } else if (state.actIndex === 2) {
      // 26s-38s: Overclock deep black void
      targetBg = '#020308';
      targetLine = '#7c3aed';
      targetGrid = 0.24;
      targetFog = 0.01;
    } else if (state.actIndex === 1) {
      // 10s-26s: Acceleration corridor
      targetBg = '#050914';
      targetLine = '#22e6ff';
      targetGrid = 0.58;
      targetFog = 0.013;
    } else {
      // 0s-10s: Quiet minimal opening
      targetBg = '#05070d';
      targetLine = '#22e6ff';
      targetGrid = 0.20 + Math.min(0.25, state.runElapsed * 0.025);
      targetFog = 0.015;
    }

    this.scene.background.lerp(new THREE.Color(targetBg), smooth);
    this.scene.fog.color.copy(this.scene.background);
    this.scene.fog.density += (targetFog - this.scene.fog.density) * smooth;
    this.floorMat.uniforms.uLineColor.value.lerp(new THREE.Color(targetLine), smooth);
    this.floorMat.uniforms.uGridStrength.value += (targetGrid - this.floorMat.uniforms.uGridStrength.value) * smooth;
  }

  updateEnding(realDt, step) {
    if (step === 0) {
      this.laserGroup.visible = false;
      return;
    }

    // Peaceful quiet room aesthetic
    const smooth = 1 - Math.exp(-3.5 * realDt);
    this.floorMat.uniforms.uPeaceful.value += (1 - this.floorMat.uniforms.uPeaceful.value) * smooth;
    this.floorMat.uniforms.uGridStrength.value = 0;

    this.scene.background.lerp(new THREE.Color('#131720'), smooth);
    this.scene.fog.color.copy(this.scene.background);
    this.scene.fog.density = 0.032;

    this.peacefulLight.intensity += (28 - this.peacefulLight.intensity) * smooth;
    this.hemiLight.intensity += (1.15 - this.hemiLight.intensity) * smooth;

    // Single red laser dot sits peacefully right under/in front of the cat
    this.laserGroup.visible = step >= 2 && step < 3; // hidden during 'catch' once pinned under paws (drawn in sprite!)
    this.laserGroup.position.set(0, 0, step === 2 ? -1.35 : -0.45);
    this.laserHalo.scale.setScalar(0.85);
    this.laserLight.intensity = 1.4;
  }
}
