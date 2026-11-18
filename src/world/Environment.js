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
  uniform float uLaserX;
  uniform float uAlignment;
  uniform float uBeat;

  varying vec2 vWorldUv;

  void main() {
    vec2 uv = vWorldUv;
    uv.y -= uOffset;

    // Primary anti-aliased grid + fine sub-grid harmonic
    vec2 gMain = abs(fract(uv * vec2(0.5, 0.25) - 0.5) - 0.5) / fwidth(uv * vec2(0.5, 0.25));
    float mainLine = 1.0 - min(min(gMain.x, gMain.y), 1.0);

    vec2 gSub = abs(fract(uv * vec2(1.5, 0.75) - 0.5) - 0.5) / fwidth(uv * vec2(1.5, 0.75));
    float subLine = (1.0 - min(min(gSub.x, gSub.y), 1.0)) * 0.26;

    // Active runway lane mask & glowing outer boundary rails with scrolling chevrons
    float centerTrack = smoothstep(5.9, 5.3, abs(vWorldUv.x));
    float railDist = abs(abs(vWorldUv.x) - 5.55);
    float edgeGlow = smoothstep(0.28, 0.0, railDist);
    float chevron = 0.65 + 0.35 * sin(uv.y * 1.4);

    // Dynamic laser slipstream projection along the runway
    float slipDist = abs(vWorldUv.x - uLaserX);
    float slipWake = exp(-slipDist * slipDist * 1.8) * smoothstep(2.0, -9.0, vWorldUv.y) * smoothstep(-45.0, -8.0, vWorldUv.y);
    vec3 slipColor = mix(vec3(1.0, 0.16, 0.30), vec3(0.13, 0.90, 1.0), uAlignment);

    // Distance horizon attenuation
    float distFade = exp(-length(vWorldUv) * 0.0175);

    float combinedGrid = (mainLine + subLine) * (1.0 + uBeat * 0.28);
    vec3 col = mix(uBaseColor, uLineColor, clamp(combinedGrid * uGridStrength * centerTrack, 0.0, 1.0));
    col += uLineColor * edgeGlow * chevron * (0.45 + uBeat * 0.35) * uGridStrength;
    col += slipColor * slipWake * (0.24 + uAlignment * 0.32) * (1.0 - uPeaceful);
    col *= mix(distFade, 1.0, uPeaceful);

    // Peaceful warm oak floor in Act 5 living room
    if (uPeaceful > 0.01) {
      float plankX = abs(fract(vWorldUv.x * 0.75) - 0.5);
      float plankZ = abs(fract(vWorldUv.y * 0.18) - 0.5);
      float seam = smoothstep(0.04, 0.0, min(plankX, plankZ * 2.5));
      float grain = fract(sin(floor(vWorldUv.x * 0.75) * 37.1 + floor(vWorldUv.y * 0.18) * 19.7) * 437.5);
      vec3 woodBase = mix(vec3(0.15, 0.16, 0.20), vec3(0.20, 0.21, 0.26), grain * 0.55);
      vec3 roomCol = mix(woodBase, vec3(0.09, 0.10, 0.13), seam * 0.65);
      col = mix(col, roomCol * exp(-length(vWorldUv) * 0.042), uPeaceful);
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

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSkyTop;
  uniform vec3 uSkyHorizon;
  uniform vec3 uNebulaColor;
  uniform float uNebulaStrength;
  varying vec3 vDir;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    float h = clamp(vDir.y, 0.0, 1.0);
    vec3 col = mix(uSkyHorizon, uSkyTop, pow(h, 0.62));

    // Swirling multi-octave cosmic nebula band + aurora curtain across upper sky
    vec2 uv = vDir.xz / (h + 0.32);
    float n1 = noise(uv * 1.4 + vec2(uTime * 0.06, -uTime * 0.12));
    float n2 = noise(uv * 3.1 - vec2(uTime * 0.09, uTime * 0.05));
    float aurora = sin(vDir.x * 7.5 + uTime * 0.8 + n1 * 3.2) * 0.5 + 0.5;
    float neb = smoothstep(0.42, 0.90, n1 * 0.62 + n2 * 0.38);
    col += uNebulaColor * (neb + aurora * 0.24 * smoothstep(0.08, 0.32, h)) * uNebulaStrength * smoothstep(0.02, 0.42, h);

    // Crisp dual-layer distant starfield
    float star1 = step(0.9965, hash(floor(vDir.xz * 220.0 + floor(vDir.y * 120.0))));
    float star2 = step(0.9982, hash(floor(vDir.xz * 340.0 - floor(vDir.y * 170.0))));
    col += vec3(0.78, 0.92, 1.0) * (star1 * 0.65 + star2 * 1.1) * smoothstep(0.04, 0.28, h);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const SLIPSTREAM_SEGS = 14;

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.scene.background = new THREE.Color('#05070d');
    this.scene.fog = new THREE.FogExp2('#05070d', 0.016);

    // Pre-allocated scratch colors to guarantee zero per-frame GC allocations
    this.scratchBg = new THREE.Color();
    this.scratchLine = new THREE.Color();

    // Lighting
    this.hemiLight = new THREE.HemisphereLight('#5c85b8', '#090b12', 0.85);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight('#bae6fd', 0.9);
    this.dirLight.position.set(4, 12, 8);
    this.scene.add(this.dirLight);

    // Procedural Cosmic Sky Dome
    const skyGeom = new THREE.SphereGeometry(220, 28, 18);
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSkyTop: { value: new THREE.Color('#03050c') },
        uSkyHorizon: { value: new THREE.Color('#0b172a') },
        uNebulaColor: { value: new THREE.Color('#22e6ff') },
        uNebulaStrength: { value: 0.25 }
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    this.skyMesh = new THREE.Mesh(skyGeom, this.skyMat);
    this.scene.add(this.skyMesh);

    // Floor plane with custom grid/void/peaceful shader
    const floorGeom = new THREE.PlaneGeometry(180, 260, 1, 1);
    floorGeom.rotateX(-Math.PI / 2);
    this.floorMat = new THREE.ShaderMaterial({
      uniforms: {
        uOffset: { value: 0 },
        uGridStrength: { value: 0.45 },
        uBaseColor: { value: new THREE.Color('#060912') },
        uLineColor: { value: new THREE.Color('#22e6ff') },
        uPeaceful: { value: 0.0 },
        uLaserX: { value: 0.0 },
        uAlignment: { value: 0.0 },
        uBeat: { value: 0.0 }
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
    const haloGeom = new THREE.PlaneGeometry(1.18, 1.18);
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

    // True 3D tapered slipstream ribbon connecting the laser dot back toward Wiwi's lane
    const vertCount = (SLIPSTREAM_SEGS + 1) * 2;
    this.slipstreamPositions = new Float32Array(vertCount * 3);
    const slipGeom = new THREE.BufferGeometry();
    slipGeom.setAttribute('position', new THREE.BufferAttribute(this.slipstreamPositions, 3));
    const slipIndices = [];
    for (let s = 0; s < SLIPSTREAM_SEGS; s++) {
      const a = s * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      slipIndices.push(a, b, c, b, d, c);
    }
    slipGeom.setIndex(slipIndices);
    this.slipstreamMat = new THREE.MeshBasicMaterial({
      color: '#ff2a4b',
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.slipstreamLine = new THREE.Mesh(slipGeom, this.slipstreamMat);
    this.slipstreamLine.frustumCulled = false;
    this.scene.add(this.slipstreamLine);

    // Act 5 ordinary living room props (hidden until final reveal)
    this.roomGroup = new THREE.Group();
    this.roomGroup.visible = false;
    this.scene.add(this.roomGroup);

    const rugGeom = new THREE.PlaneGeometry(5.8, 4.2);
    rugGeom.rotateX(-Math.PI / 2);
    const rugMat = new THREE.MeshStandardMaterial({ color: '#272c3a', roughness: 0.9 });
    const rug = new THREE.Mesh(rugGeom, rugMat);
    rug.position.set(0, 0.008, -1.0);
    this.roomGroup.add(rug);

    const wallMat = new THREE.MeshStandardMaterial({ color: '#1b202b', roughness: 0.85 });
    const baseboard = new THREE.Mesh(new THREE.BoxGeometry(24, 0.28, 0.15), wallMat);
    baseboard.position.set(0, 0.14, -5.2);
    this.roomGroup.add(baseboard);

    // Cozy multi-part sofa (base, back cushions, armrests, throw pillow)
    const sofaMat = new THREE.MeshStandardMaterial({ color: '#242b3b', roughness: 0.85 });
    const cushionMat = new THREE.MeshStandardMaterial({ color: '#2e374b', roughness: 0.8 });
    const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.55, 1.45), sofaMat);
    sofaBase.position.set(-1.6, 0.34, -4.1);
    this.roomGroup.add(sofaBase);

    const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.95, 0.36), sofaMat);
    sofaBack.position.set(-1.6, 0.98, -4.65);
    this.roomGroup.add(sofaBack);

    for (const ax of [-3.65, 0.45]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.72, 1.45), cushionMat);
      arm.position.set(ax, 0.62, -4.1);
      this.roomGroup.add(arm);
    }

    const pillow = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.45, 0.22),
      new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.9 })
    );
    pillow.position.set(-3.1, 0.82, -4.25);
    pillow.rotation.z = 0.22;
    this.roomGroup.add(pillow);

    // Wall picture frame behind sofa
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.05, 0.08),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6 })
    );
    frame.position.set(-1.6, 2.35, -5.12);
    this.roomGroup.add(frame);

    // Low wooden coffee table on the right
    const tableMat = new THREE.MeshStandardMaterial({ color: '#423328', roughness: 0.75 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 0.95), tableMat);
    tableTop.position.set(2.3, 0.52, -2.0);
    this.roomGroup.add(tableTop);
    for (const [lx, lz] of [[-0.75, -0.38], [0.75, -0.38], [-0.75, 0.38], [0.75, 0.38]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.52, 6), tableMat);
      leg.position.set(2.3 + lx, 0.26, -2.0 + lz);
      this.roomGroup.add(leg);
    }

    // Warm standing floor lamp on right + dust motes
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 3.0, 8),
      new THREE.MeshStandardMaterial({ color: '#475569', metalness: 0.6 })
    );
    pole.position.set(3.2, 1.5, -3.5);
    this.roomGroup.add(pole);

    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.48, 0.55, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: '#fde68a', side: THREE.DoubleSide })
    );
    shade.position.set(3.2, 3.0, -3.5);
    this.roomGroup.add(shade);

    const motePos = new Float32Array(42 * 3);
    for (let i = 0; i < 42; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * 6.0;
      motePos[i * 3 + 1] = 0.2 + Math.random() * 2.8;
      motePos[i * 3 + 2] = -3.8 + Math.random() * 3.8;
    }
    const moteGeom = new THREE.BufferGeometry();
    moteGeom.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    this.dustMotes = new THREE.Points(
      moteGeom,
      new THREE.PointsMaterial({ color: '#fde68a', size: 0.045, transparent: true, opacity: 0.45 })
    );
    this.roomGroup.add(this.dustMotes);

    // Subtle red laser-pointer barrel & beam descending onto the floor dot during Step 2
    const pointerMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.32, 10),
      new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.85, roughness: 0.2 })
    );
    pointerMesh.position.set(2.8, 2.3, 1.8);
    pointerMesh.lookAt(0, 0.03, -0.85);
    pointerMesh.rotateX(Math.PI / 2);
    this.roomGroup.add(pointerMesh);

    const beamGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(2.8, 2.3, 1.8),
      new THREE.Vector3(0, 0.03, -0.85)
    ]);
    this.pointerBeamMat = new THREE.LineBasicMaterial({
      color: '#ff2a4b',
      transparent: true,
      opacity: 0.26,
      blending: THREE.AdditiveBlending
    });
    this.pointerBeam = new THREE.Line(beamGeom, this.pointerBeamMat);
    this.roomGroup.add(this.pointerBeam);

    this.floorScroll = 0;
    this.laserX = 0;
    this.laserZ = -7.5;
    this.laserTime = 0;
    this.prevLaserX = 0;
    this.reset();
  }

  reset() {
    this.floorScroll = 0;
    this.laserX = 0;
    this.prevLaserX = 0;
    this.laserZ = -7.2;
    this.laserTime = 0;
    this.laserGroup.visible = true;
    this.laserGroup.position.set(0, 0, -7.2);
    this.slipstreamLine.visible = true;
    this.roomGroup.visible = false;
    this.skyMesh.visible = true;

    this.scene.background.set('#05070d');
    this.scene.fog.color.set('#05070d');
    this.scene.fog.density = 0.015;

    this.floorMat.uniforms.uOffset.value = 0;
    this.floorMat.uniforms.uGridStrength.value = 0.25;
    this.floorMat.uniforms.uBaseColor.value.set('#060912');
    this.floorMat.uniforms.uLineColor.value.set('#22e6ff');
    this.floorMat.uniforms.uPeaceful.value = 0.0;
    this.floorMat.uniforms.uLaserX.value = 0.0;
    this.floorMat.uniforms.uAlignment.value = 0.0;
    this.floorMat.uniforms.uBeat.value = 0.0;

    this.peacefulLight.intensity = 0;
    this.hemiLight.intensity = 0.85;
  }

  update(worldDt, realDt, state, beatEnergy = 0, catX = 0) {
    this.floorScroll += state.speed * worldDt;
    this.floorMat.uniforms.uOffset.value = this.floorScroll;

    // Laser weaving target ahead of the cat
    this.laserTime += worldDt * (0.9 + state.actIndex * 0.22);
    const weaveAmp = state.actIndex === 0 ? 0.55 : Math.min(3.6, 1.4 + state.actIndex * 0.85);
    const targetLaserX =
      Math.sin(this.laserTime * 1.15) * weaveAmp * 0.7 +
      Math.sin(this.laserTime * 2.1) * weaveAmp * 0.3;
    this.prevLaserX = this.laserX;
    this.laserX += (targetLaserX - this.laserX) * (1 - Math.exp(-3.5 * worldDt));

    // Laser stays tantalizingly just out of reach until Act 5
    const desiredZ = -7.0 - state.normalizedSpeed * 3.8 + state.slipstreamAlignment * 0.9;
    this.laserZ += (desiredZ - this.laserZ) * (1 - Math.exp(-4 * realDt));

    this.laserGroup.visible = state.runElapsed < 214.0;
    this.laserGroup.position.set(this.laserX, 0, this.laserZ);

    this.floorMat.uniforms.uLaserX.value = this.laserX;
    this.floorMat.uniforms.uAlignment.value = state.slipstreamAlignment;
    this.floorMat.uniforms.uBeat.value = beatEnergy;

    // Update curved 3D volumetric slipstream ribbon connecting laser dot to Wiwi's lane
    this.slipstreamLine.visible = this.laserGroup.visible && state.phase === 'playing';
    if (this.slipstreamLine.visible) {
      const pos = this.slipstreamPositions;
      const baseHalfW = 0.06 + state.slipstreamAlignment * 0.14;
      for (let s = 0; s <= SLIPSTREAM_SEGS; s++) {
        const u = s / SLIPSTREAM_SEGS;
        const smoothU = u * u * (3 - 2 * u);
        const cx = THREE.MathUtils.lerp(this.laserX, THREE.MathUtils.lerp(this.laserX, catX, 0.65), smoothU);
        const cz = THREE.MathUtils.lerp(this.laserZ, 0.35, u);
        const w = baseHalfW * (0.45 + Math.sin(u * Math.PI) * 0.85);
        const idx = s * 6;
        pos[idx] = cx - w;
        pos[idx + 1] = 0.026;
        pos[idx + 2] = cz;
        pos[idx + 3] = cx + w;
        pos[idx + 4] = 0.026;
        pos[idx + 5] = cz;
      }
      this.slipstreamLine.geometry.attributes.position.needsUpdate = true;
      this.slipstreamMat.opacity = 0.16 + state.slipstreamAlignment * 0.42 + beatEnergy * 0.12;
      this.slipstreamMat.color.set(state.slipstreamAlignment > 0.58 ? '#22e6ff' : '#ff2a4b');
    }

    const pulse = 1.0 + Math.sin(this.laserTime * 6) * 0.14 + beatEnergy * 0.28;
    this.laserHalo.scale.setScalar(pulse);
    this.laserLight.intensity = 2.1 + beatEnergy * 1.4;

    // Palette evolution by exact timed stage & vibe (zero per-frame allocations)
    const smooth = 1 - Math.exp(-3.5 * realDt);
    let targetBg = '#05070d';
    let targetLine = '#22e6ff';
    let targetGrid = 0.25;
    let targetFog = 0.014;

    if (state.stage2BurstActive) {
      targetBg = '#140c03';
      targetLine = '#ffbe3b';
      targetGrid = 0.65;
      targetFog = 0.011;
    } else if (state.tearCount >= 5) {
      targetBg = '#16030a';
      targetLine = state.overdriveMode ? '#38f3ff' : '#ff2a4b';
      targetGrid = 0.64 + beatEnergy * 0.25;
      targetFog = 0.012;
    } else if (state.tearCount >= 4) {
      targetBg = '#10031a';
      targetLine = '#e879f9';
      targetGrid = 0.56 + beatEnergy * 0.22;
      targetFog = 0.011;
    } else if (state.riftGateMode) {
      targetBg = '#04191e';
      targetLine = '#2dd4bf';
      targetGrid = 0.64 + beatEnergy * 0.24;
      targetFog = 0.015;
    } else if (state.tearCount >= 1) {
      targetBg = '#080416';
      targetLine = '#a855f7';
      targetGrid = 0.45 + beatEnergy * 0.2;
      targetFog = 0.011;
    } else if (state.actIndex === 2) {
      targetBg = '#020308';
      targetLine = '#7c3aed';
      targetGrid = 0.24;
      targetFog = 0.01;
    } else if (state.actIndex === 1) {
      targetBg = '#050914';
      targetLine = '#22e6ff';
      targetGrid = 0.58;
      targetFog = 0.013;
    } else {
      targetBg = '#05070d';
      targetLine = '#22e6ff';
      targetGrid = 0.20 + Math.min(0.25, state.runElapsed * 0.025);
      targetFog = 0.015;
    }

    this.scratchBg.set(targetBg);
    this.scratchLine.set(targetLine);
    this.scene.background.lerp(this.scratchBg, smooth);
    this.scene.fog.color.copy(this.scene.background);
    this.scene.fog.density += (targetFog - this.scene.fog.density) * smooth;
    this.floorMat.uniforms.uLineColor.value.lerp(this.scratchLine, smooth);
    this.floorMat.uniforms.uGridStrength.value +=
      (targetGrid - this.floorMat.uniforms.uGridStrength.value) * smooth;

    // Sky dome nebula & horizon evolution
    this.skyMesh.visible = true;
    this.skyMat.uniforms.uTime.value += worldDt * (0.8 + state.normalizedSpeed * 1.8);
    this.skyMat.uniforms.uSkyHorizon.value.copy(this.scene.background);
    this.skyMat.uniforms.uNebulaColor.value.lerp(this.scratchLine, smooth);
    this.skyMat.uniforms.uNebulaStrength.value =
      0.18 + state.tearCount * 0.1 + (state.overdriveMode ? 0.25 : 0) + beatEnergy * 0.15;
  }

  updateEnding(realDt, step) {
    this.slipstreamLine.visible = false;
    if (step === 0) {
      this.laserGroup.visible = false;
      this.roomGroup.visible = false;
      return;
    }

    // Peaceful quiet living room aesthetic
    this.skyMesh.visible = false;
    this.roomGroup.visible = true;
    this.pointerBeam.visible = step < 3;
    this.dustMotes.rotation.y += realDt * 0.04;
    const smooth = 1 - Math.exp(-3.5 * realDt);
    this.floorMat.uniforms.uPeaceful.value += (1 - this.floorMat.uniforms.uPeaceful.value) * smooth;
    this.floorMat.uniforms.uGridStrength.value = 0;

    this.scratchBg.set('#131720');
    this.scene.background.lerp(this.scratchBg, smooth);
    this.scene.fog.color.copy(this.scene.background);
    this.scene.fog.density = 0.032;

    this.peacefulLight.intensity += (28 - this.peacefulLight.intensity) * smooth;
    this.hemiLight.intensity += (1.15 - this.hemiLight.intensity) * smooth;

    // Single red laser dot sits peacefully right under/in front of the cats
    this.laserGroup.visible = step >= 1 && step < 3;
    this.laserGroup.position.set(0, 0, -0.85);
    this.laserHalo.scale.setScalar(0.85);
    this.laserLight.intensity = 1.4;
  }
}
