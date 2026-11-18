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
  uniform float uRoadMode;
  uniform float uPitchBlack;
  uniform float uVoidFooting;
  uniform float uPeaceful;
  uniform float uLaserX;
  uniform float uAlignment;
  uniform float uBeat;

  varying vec2 vWorldUv;

  void main() {
    vec2 uv = vWorldUv;
    uv.y -= uOffset;

    vec3 col = uBaseColor;
    float distFade = exp(-length(vWorldUv) * 0.016);

    if (uPeaceful > 0.01) {
      float plankX = abs(fract(vWorldUv.x * 0.75) - 0.5);
      float plankZ = abs(fract(vWorldUv.y * 0.18) - 0.5);
      float seam = smoothstep(0.04, 0.0, min(plankX, plankZ * 2.5));
      float grain = fract(sin(floor(vWorldUv.x * 0.75) * 37.1 + floor(vWorldUv.y * 0.18) * 19.7) * 437.5);
      vec3 woodBase = mix(vec3(0.15, 0.16, 0.20), vec3(0.20, 0.21, 0.26), grain * 0.55);
      vec3 roomCol = mix(woodBase, vec3(0.09, 0.10, 0.13), seam * 0.65);
      col = mix(col, roomCol * exp(-length(vWorldUv) * 0.042), uPeaceful);
      gl_FragColor = vec4(col, 1.0);
      return;
    }

    if (uPitchBlack > 0.5) {
      // Stage 3 Overclock: pitch black ground with crisp white/neon silhouette lane guide hairlines
      float divL = smoothstep(0.045, 0.0, abs(vWorldUv.x + 1.5)) * step(0.45, fract(uv.y * 0.18));
      float divR = smoothstep(0.045, 0.0, abs(vWorldUv.x - 1.5)) * step(0.45, fract(uv.y * 0.18));
      float curb = smoothstep(0.055, 0.0, abs(abs(vWorldUv.x) - 4.55));
      col = vec3(0.0);
      col += vec3(0.92, 0.96, 1.0) * (divL + divR) * 0.28 * distFade;
      col += uLineColor * curb * 0.42 * distFade;
      gl_FragColor = vec4(col, 1.0);
      return;
    }

    if (uRoadMode > 0.5) {
      // Neighborhood 3-Lane Road (Lanes centered at -3.0, 0.0, +3.0 -> dividers at +/-1.5, curb at +/-4.55)
      float absX = abs(vWorldUv.x);
      float onAsphalt = 1.0 - smoothstep(4.45, 4.60, absX);
      float onSidewalk = smoothstep(4.55, 4.65, absX) * (1.0 - smoothstep(8.2, 8.6, absX));
      float curbLine = smoothstep(0.10, 0.0, abs(absX - 4.55));

      float grain = fract(sin(dot(floor(uv * 3.0), vec2(12.9898, 78.233))) * 43758.5453);
      vec3 asphalt = mix(vec3(0.075, 0.085, 0.11), vec3(0.095, 0.108, 0.135), grain * 0.5);
      vec3 sidewalk = vec3(0.16, 0.175, 0.205);
      float tileZ = smoothstep(0.04, 0.0, abs(fract(uv.y * 0.35) - 0.5));
      sidewalk = mix(sidewalk, vec3(0.11, 0.12, 0.15), tileZ * 0.45);
      vec3 grass = vec3(0.04, 0.09, 0.06);

      col = mix(grass, sidewalk, onSidewalk);
      col = mix(col, asphalt, onAsphalt);
      col = mix(col, vec3(0.28, 0.31, 0.36), curbLine);

      // Crisp 3-lane dashed lane dividers at x = -1.5 & +1.5
      float dash = smoothstep(0.35, 0.45, fract(uv.y * 0.18)) * (1.0 - smoothstep(0.75, 0.85, fract(uv.y * 0.18)));
      float laneMarks = (smoothstep(0.08, 0.02, abs(vWorldUv.x + 1.5)) + smoothstep(0.08, 0.02, abs(vWorldUv.x - 1.5))) * dash;
      float edgeStripe = smoothstep(0.08, 0.02, abs(absX - 4.32));
      col += vec3(0.78, 0.85, 0.94) * laneMarks * 0.82;
      col += vec3(0.95, 0.72, 0.22) * edgeStripe * 0.45;

      col *= mix(0.28, 1.0, distFade);
      gl_FragColor = vec4(col, 1.0);
      return;
    }

    // Post-Stage 3 Collapsed World: Nonexistent physical footing — dark void with subtle 3-lane filament threads
    // (real footing illumination comes from the glowing Step Pads under Wiwi & Lily!)
    float absX = abs(vWorldUv.x);
    float laneRail = smoothstep(0.06, 0.0, abs(absX - 4.55))
      + smoothstep(0.045, 0.0, abs(vWorldUv.x + 1.5)) * 0.45
      + smoothstep(0.045, 0.0, abs(vWorldUv.x - 1.5)) * 0.45;
    float slipDist = abs(vWorldUv.x - uLaserX);
    float slipWake = exp(-slipDist * slipDist * 1.8) * smoothstep(2.0, -9.0, vWorldUv.y) * smoothstep(-45.0, -8.0, vWorldUv.y);
    vec3 slipColor = mix(vec3(1.0, 0.16, 0.30), vec3(0.13, 0.90, 1.0), uAlignment);

    col = mix(vec3(0.01, 0.012, 0.024), uLineColor * 0.42, laneRail * uGridStrength * (0.45 + uBeat * 0.25));
    col += slipColor * slipWake * (0.20 + uAlignment * 0.28);
    col *= distFade;

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

function mergeSimpleParts(parts) {
  const posArrays = [];
  const normArrays = [];
  const indices = [];
  let vertOffset = 0;

  for (const part of parts) {
    const g = part.geom;
    if (part.scale) g.scale(part.scale[0], part.scale[1], part.scale[2]);
    if (part.rot) {
      if (part.rot[0]) g.rotateX(part.rot[0]);
      if (part.rot[1]) g.rotateY(part.rot[1]);
      if (part.rot[2]) g.rotateZ(part.rot[2]);
    }
    if (part.pos) g.translate(part.pos[0], part.pos[1], part.pos[2]);
    g.computeVertexNormals();
    const pos = g.attributes.position.array;
    const norm = g.attributes.normal.array;
    posArrays.push(pos);
    normArrays.push(norm);
    if (g.index) {
      const idx = g.index.array;
      for (let i = 0; i < idx.length; i++) indices.push(idx[i] + vertOffset);
    } else {
      for (let i = 0; i < g.attributes.position.count; i++) indices.push(i + vertOffset);
    }
    vertOffset += g.attributes.position.count;
    g.dispose();
  }

  const totalPos = posArrays.reduce((s, a) => s + a.length, 0);
  const mergedPos = new Float32Array(totalPos);
  const mergedNorm = new Float32Array(totalPos);
  let off = 0;
  for (let i = 0; i < posArrays.length; i++) {
    mergedPos.set(posArrays[i], off);
    mergedNorm.set(normArrays[i], off);
    off += posArrays[i].length;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
  merged.setIndex(indices);
  return merged;
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

    vec2 uv = vDir.xz / (h + 0.32);
    float n1 = noise(uv * 1.4 + vec2(uTime * 0.06, -uTime * 0.12));
    float n2 = noise(uv * 3.1 - vec2(uTime * 0.09, uTime * 0.05));
    float aurora = sin(vDir.x * 7.5 + uTime * 0.8 + n1 * 3.2) * 0.5 + 0.5;
    float neb = smoothstep(0.42, 0.90, n1 * 0.62 + n2 * 0.38);
    col += uNebulaColor * (neb + aurora * 0.24 * smoothstep(0.08, 0.32, h)) * uNebulaStrength * smoothstep(0.02, 0.42, h);

    float star1 = step(0.9965, hash(floor(vDir.xz * 220.0 + floor(vDir.y * 120.0))));
    float star2 = step(0.9982, hash(floor(vDir.xz * 340.0 - floor(vDir.y * 170.0))));
    col += vec3(0.78, 0.92, 1.0) * (star1 * 0.65 + star2 * 1.1) * smoothstep(0.04, 0.28, h);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const SLIPSTREAM_SEGS = 14;
const PERSON_COUNT = 16;
const DOG_COUNT = 10;
const TREE_COUNT = 22;
const LAMP_COUNT = 16;
const STEP_PAD_POOL = 28;

export class Environment {
  constructor(scene) {
    this.scene = scene;
    this.scene.background = new THREE.Color('#091326');
    this.scene.fog = new THREE.FogExp2('#091326', 0.013);

    this.scratchBg = new THREE.Color();
    this.scratchLine = new THREE.Color();
    this.scratchPadColor = new THREE.Color();
    this.dummy = new THREE.Object3D();

    // Lighting
    this.hemiLight = new THREE.HemisphereLight('#7dd3fc', '#111827', 0.95);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight('#e0f2fe', 1.05);
    this.dirLight.position.set(4, 12, 8);
    this.scene.add(this.dirLight);

    // Procedural Cosmic Sky Dome
    const skyGeom = new THREE.SphereGeometry(220, 28, 18);
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSkyTop: { value: new THREE.Color('#050b18') },
        uSkyHorizon: { value: new THREE.Color('#132444') },
        uNebulaColor: { value: new THREE.Color('#22e6ff') },
        uNebulaStrength: { value: 0.08 }
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    });
    this.skyMesh = new THREE.Mesh(skyGeom, this.skyMat);
    this.scene.add(this.skyMesh);

    // Floor plane with neighborhood road / pitch-black Overclock / nonexistent void / Act 5 shader
    const floorGeom = new THREE.PlaneGeometry(180, 260, 1, 1);
    floorGeom.rotateX(-Math.PI / 2);
    this.floorMat = new THREE.ShaderMaterial({
      uniforms: {
        uOffset: { value: 0 },
        uGridStrength: { value: 0.45 },
        uBaseColor: { value: new THREE.Color('#060912') },
        uLineColor: { value: new THREE.Color('#22e6ff') },
        uRoadMode: { value: 1.0 },
        uPitchBlack: { value: 0.0 },
        uVoidFooting: { value: 0.0 },
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

    // Roadside Neighborhood Group (Pedestrians, Joggers, Dogs, Trees, Streetlamps)
    this.roadsideGroup = new THREE.Group();
    this.scene.add(this.roadsideGroup);

    const personGeom = mergeSimpleParts([
      { geom: new THREE.CapsuleGeometry(0.17, 0.42, 6, 12), pos: [0, 0.84, 0], scale: [1.1, 1.0, 0.78] },
      { geom: new THREE.SphereGeometry(0.16, 12, 10), pos: [0, 1.36, 0] },
      { geom: new THREE.CapsuleGeometry(0.055, 0.34, 4, 8), pos: [-0.24, 0.82, 0.06], rot: [0.35, 0, 0.14] },
      { geom: new THREE.CapsuleGeometry(0.055, 0.34, 4, 8), pos: [0.24, 0.82, -0.06], rot: [-0.35, 0, -0.14] },
      { geom: new THREE.CapsuleGeometry(0.072, 0.38, 4, 8), pos: [-0.1, 0.28, -0.08], rot: [-0.28, 0, 0] },
      { geom: new THREE.CapsuleGeometry(0.072, 0.38, 4, 8), pos: [0.1, 0.28, 0.08], rot: [0.28, 0, 0] }
    ]);
    this.personMat = new THREE.MeshStandardMaterial({
      color: '#cbd5e1',
      emissive: '#000000',
      roughness: 0.65
    });
    this.personMesh = new THREE.InstancedMesh(personGeom, this.personMat, PERSON_COUNT);
    this.personMesh.frustumCulled = false;
    this.roadsideGroup.add(this.personMesh);

    const dogGeom = mergeSimpleParts([
      { geom: new THREE.CapsuleGeometry(0.14, 0.38, 6, 12), pos: [0, 0.34, 0], rot: [Math.PI / 2, 0, 0] },
      { geom: new THREE.CapsuleGeometry(0.09, 0.16, 5, 10), pos: [0, 0.46, -0.24], rot: [0.65, 0, 0] },
      { geom: new THREE.SphereGeometry(0.115, 10, 8), pos: [0, 0.55, -0.32] },
      { geom: new THREE.CapsuleGeometry(0.055, 0.10, 4, 8), pos: [0, 0.52, -0.43], rot: [Math.PI / 2, 0, 0] },
      { geom: new THREE.ConeGeometry(0.042, 0.12, 6), pos: [-0.065, 0.66, -0.30], rot: [0.2, 0, 0.15] },
      { geom: new THREE.ConeGeometry(0.042, 0.12, 6), pos: [0.065, 0.66, -0.30], rot: [0.2, 0, -0.15] },
      { geom: new THREE.CapsuleGeometry(0.032, 0.20, 4, 8), pos: [0, 0.48, 0.30], rot: [-0.75, 0, 0] },
      { geom: new THREE.CapsuleGeometry(0.038, 0.20, 4, 8), pos: [-0.085, 0.14, -0.19], rot: [0.22, 0, 0] },
      { geom: new THREE.CapsuleGeometry(0.038, 0.20, 4, 8), pos: [0.085, 0.14, -0.19], rot: [-0.22, 0, 0] },
      { geom: new THREE.CapsuleGeometry(0.042, 0.20, 4, 8), pos: [-0.085, 0.14, 0.19], rot: [-0.22, 0, 0] },
      { geom: new THREE.CapsuleGeometry(0.042, 0.20, 4, 8), pos: [0.085, 0.14, 0.19], rot: [0.22, 0, 0] }
    ]);
    this.dogMat = new THREE.MeshStandardMaterial({
      color: '#b45309',
      emissive: '#000000',
      roughness: 0.75
    });
    this.dogMesh = new THREE.InstancedMesh(dogGeom, this.dogMat, DOG_COUNT);
    this.dogMesh.frustumCulled = false;
    this.roadsideGroup.add(this.dogMesh);

    const treeGeom = mergeSimpleParts([
      { geom: new THREE.CylinderGeometry(0.14, 0.25, 1.45, 12), pos: [0, 0.72, 0] },
      { geom: new THREE.IcosahedronGeometry(1.08, 2), pos: [0, 2.05, 0], scale: [1.12, 0.88, 1.12] },
      { geom: new THREE.IcosahedronGeometry(0.84, 2), pos: [-0.36, 2.68, 0.18], scale: [1.0, 0.92, 1.0] },
      { geom: new THREE.IcosahedronGeometry(0.76, 2), pos: [0.32, 2.86, -0.16], scale: [0.95, 1.05, 0.95] }
    ]);
    this.treeMat = new THREE.MeshStandardMaterial({
      color: '#15803d',
      emissive: '#000000',
      roughness: 0.8
    });
    this.treeMesh = new THREE.InstancedMesh(treeGeom, this.treeMat, TREE_COUNT);
    this.treeMesh.frustumCulled = false;
    this.roadsideGroup.add(this.treeMesh);

    const lampGeom = mergeSimpleParts([
      { geom: new THREE.CylinderGeometry(0.05, 0.10, 4.2, 12), pos: [0, 2.1, 0] },
      { geom: new THREE.CapsuleGeometry(0.055, 0.55, 5, 10), pos: [0, 4.18, 0], rot: [0, 0, Math.PI / 2] },
      { geom: new THREE.SphereGeometry(0.14, 12, 10), pos: [0, 4.08, 0], scale: [1.5, 0.65, 1.0] }
    ]);
    this.lampMat = new THREE.MeshStandardMaterial({
      color: '#475569',
      emissive: '#fde68a',
      emissiveIntensity: 0.75,
      roughness: 0.35
    });
    this.lampMesh = new THREE.InstancedMesh(lampGeom, this.lampMat, LAMP_COUNT);
    this.lampMesh.frustumCulled = false;
    this.roadsideGroup.add(this.lampMesh);

    this.people = Array.from({ length: PERSON_COUNT }, (_, i) => ({
      side: i % 2 === 0 ? -1 : 1,
      xOff: 5.5 + (i % 3) * 0.85,
      z: -i * 9.5,
      isJogger: i % 2 === 1,
      strideSpeed: i % 2 === 1 ? 5.2 : 1.9,
      phase: Math.random() * Math.PI * 2
    }));

    this.dogs = Array.from({ length: DOG_COUNT }, (_, i) => ({
      side: i % 2 === 0 ? -1 : 1,
      xOff: 5.2 + (i % 2) * 0.7,
      z: -4 - i * 14.5,
      phase: Math.random() * Math.PI * 2
    }));

    this.trees = Array.from({ length: TREE_COUNT }, (_, i) => ({
      side: i % 2 === 0 ? -1 : 1,
      xOff: 8.6 + (i % 3) * 1.4,
      z: -i * 7.2,
      scale: 0.85 + (i % 4) * 0.18
    }));

    this.lamps = Array.from({ length: LAMP_COUNT }, (_, i) => ({
      side: i % 2 === 0 ? -1 : 1,
      xOff: 4.95,
      z: -i * 10.0
    }));

    // Post-Stage 3 Nonexistent Footing: Glowing Step Pads wherever Wiwi (and Lily) step!
    const padGeom = new THREE.CircleGeometry(0.88, 16);
    padGeom.rotateX(-Math.PI / 2);
    this.stepPadMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.stepPadMesh = new THREE.InstancedMesh(padGeom, this.stepPadMat, STEP_PAD_POOL);
    this.stepPadMesh.frustumCulled = false;
    this.stepPadMesh.renderOrder = 4;
    this.scene.add(this.stepPadMesh);

    this.scratchPadColor.set('#22e6ff');
    for (let i = 0; i < STEP_PAD_POOL; i++) {
      this.stepPadMesh.setColorAt(i, this.scratchPadColor);
    }

    this.stepPads = Array.from({ length: STEP_PAD_POOL }, () => ({
      active: false,
      x: 0,
      z: 0,
      life: 0,
      maxLife: 0.55,
      color: '#22e6ff'
    }));
    this.stepPadCursor = 0;
    this.wiwiStepTimer = 0;
    this.lilyStepTimer = 0;

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

    // Subtle pointer beam origin in Act 5
    this.peacefulLight = new THREE.SpotLight('#fff3db', 0, 26, Math.PI / 5, 0.65);
    this.peacefulLight.position.set(2.5, 7.5, 4);
    this.scene.add(this.peacefulLight);

    // Curved 3D slipstream ribbon
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

    // Act 5 ordinary living room props
    this.roomGroup = new THREE.Group();
    this.roomGroup.visible = false;
    this.scene.add(this.roomGroup);

    const rugGeom = new THREE.PlaneGeometry(5.8, 4.2);
    rugGeom.rotateX(-Math.PI / 2);
    const rug = new THREE.Mesh(rugGeom, new THREE.MeshStandardMaterial({ color: '#272c3a', roughness: 0.9 }));
    rug.position.set(0, 0.008, -1.0);
    this.roomGroup.add(rug);

    const baseboard = new THREE.Mesh(
      new THREE.BoxGeometry(24, 0.28, 0.15),
      new THREE.MeshStandardMaterial({ color: '#1b202b', roughness: 0.85 })
    );
    baseboard.position.set(0, 0.14, -5.2);
    this.roomGroup.add(baseboard);

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

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.05, 0.08),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.6 })
    );
    frame.position.set(-1.6, 2.35, -5.12);
    this.roomGroup.add(frame);

    const tableMat = new THREE.MeshStandardMaterial({ color: '#423328', roughness: 0.75 });
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.1, 0.95), tableMat);
    tableTop.position.set(2.3, 0.52, -2.0);
    this.roomGroup.add(tableTop);
    for (const [lx, lz] of [[-0.75, -0.38], [0.75, -0.38], [-0.75, 0.38], [0.75, 0.38]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.52, 6), tableMat);
      leg.position.set(2.3 + lx, 0.26, -2.0 + lz);
      this.roomGroup.add(leg);
    }

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
    this.reset();
  }

  reset() {
    this.floorScroll = 0;
    this.laserX = 0;
    this.laserZ = -7.2;
    this.laserTime = 0;
    this.wiwiStepTimer = 0;
    this.lilyStepTimer = 0;
    this.laserGroup.visible = true;
    this.laserGroup.position.set(0, 0, -7.2);
    this.slipstreamLine.visible = true;
    this.roomGroup.visible = false;
    this.skyMesh.visible = true;
    this.roadsideGroup.visible = true;
    this.stepPadMesh.visible = false;

    for (let i = 0; i < STEP_PAD_POOL; i++) {
      this.stepPads[i].active = false;
      this.dummy.position.set(0, -100, 0);
      this.dummy.scale.setScalar(0.01);
      this.dummy.updateMatrix();
      this.stepPadMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.stepPadMesh.instanceMatrix.needsUpdate = true;

    this.scene.background.set('#091326');
    this.scene.fog.color.set('#091326');
    this.scene.fog.density = 0.013;

    this.floorMat.uniforms.uOffset.value = 0;
    this.floorMat.uniforms.uGridStrength.value = 0.25;
    this.floorMat.uniforms.uBaseColor.value.set('#060912');
    this.floorMat.uniforms.uLineColor.value.set('#22e6ff');
    this.floorMat.uniforms.uRoadMode.value = 1.0;
    this.floorMat.uniforms.uPitchBlack.value = 0.0;
    this.floorMat.uniforms.uVoidFooting.value = 0.0;
    this.floorMat.uniforms.uPeaceful.value = 0.0;
    this.floorMat.uniforms.uLaserX.value = 0.0;
    this.floorMat.uniforms.uAlignment.value = 0.0;
    this.floorMat.uniforms.uBeat.value = 0.0;

    this.peacefulLight.intensity = 0;
    this.hemiLight.intensity = 0.95;
  }

  spawnStepPad(x, z, colorHex) {
    const pad = this.stepPads[this.stepPadCursor];
    this.stepPadCursor = (this.stepPadCursor + 1) % STEP_PAD_POOL;
    pad.active = true;
    pad.x = x;
    pad.z = z;
    pad.life = 0;
    pad.maxLife = 0.55;
    pad.color = colorHex;
  }

  updateRoadside(worldDt, speed, isOverclockWhiteSilhouette) {
    if (isOverclockWhiteSilhouette) {
      this.personMat.color.set('#ffffff');
      this.personMat.emissive.set('#ffffff');
      this.personMat.emissiveIntensity = 0.95;
      this.dogMat.color.set('#ffffff');
      this.dogMat.emissive.set('#ffffff');
      this.dogMat.emissiveIntensity = 0.95;
      this.treeMat.color.set('#ffffff');
      this.treeMat.emissive.set('#ffffff');
      this.treeMat.emissiveIntensity = 0.92;
      this.lampMat.color.set('#ffffff');
      this.lampMat.emissive.set('#ffffff');
      this.lampMat.emissiveIntensity = 0.95;
    } else {
      this.personMat.color.set('#cbd5e1');
      this.personMat.emissive.set('#1e293b');
      this.personMat.emissiveIntensity = 0.25;
      this.dogMat.color.set('#b45309');
      this.dogMat.emissive.set('#451a03');
      this.dogMat.emissiveIntensity = 0.15;
      this.treeMat.color.set('#166534');
      this.treeMat.emissive.set('#052e16');
      this.treeMat.emissiveIntensity = 0.15;
      this.lampMat.color.set('#475569');
      this.lampMat.emissive.set('#fde68a');
      this.lampMat.emissiveIntensity = 0.75;
    }

    for (let i = 0; i < PERSON_COUNT; i++) {
      const p = this.people[i];
      p.z += (speed + p.strideSpeed) * worldDt;
      p.phase += worldDt * (p.isJogger ? 9.5 : 4.2);
      if (p.z > 10) p.z -= PERSON_COUNT * 9.5;
      const bounce = Math.abs(Math.sin(p.phase)) * (p.isJogger ? 0.16 : 0.05);
      this.dummy.position.set(p.side * p.xOff, bounce, p.z);
      this.dummy.rotation.set(p.isJogger ? -0.18 : 0, p.side > 0 ? Math.PI : 0, 0);
      this.dummy.scale.setScalar(1.0);
      this.dummy.updateMatrix();
      this.personMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.personMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < DOG_COUNT; i++) {
      const d = this.dogs[i];
      d.z += (speed + 3.2) * worldDt;
      d.phase += worldDt * 11.0;
      if (d.z > 10) d.z -= DOG_COUNT * 14.5;
      const bounce = Math.abs(Math.sin(d.phase)) * 0.11;
      this.dummy.position.set(d.side * d.xOff, bounce, d.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(1.0);
      this.dummy.updateMatrix();
      this.dogMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.dogMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < TREE_COUNT; i++) {
      const t = this.trees[i];
      t.z += speed * worldDt;
      if (t.z > 10) t.z -= TREE_COUNT * 7.2;
      this.dummy.position.set(t.side * t.xOff, 0, t.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(t.scale);
      this.dummy.updateMatrix();
      this.treeMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.treeMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < LAMP_COUNT; i++) {
      const l = this.lamps[i];
      l.z += speed * worldDt;
      if (l.z > 10) l.z -= LAMP_COUNT * 10.0;
      this.dummy.position.set(l.side * l.xOff, 0, l.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(1.0);
      this.dummy.updateMatrix();
      this.lampMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.lampMesh.instanceMatrix.needsUpdate = true;
  }

  update(worldDt, realDt, state, beatEnergy = 0, cat = null, lily = null) {
    this.floorScroll += state.speed * worldDt;
    this.floorMat.uniforms.uOffset.value = this.floorScroll;

    // Laser weaving target ahead of the cat across the 3 lanes
    this.laserTime += worldDt * (0.9 + state.actIndex * 0.22);
    const weaveAmp = state.actIndex === 0 ? 1.4 : 3.1;
    const targetLaserX =
      Math.sin(this.laserTime * 1.15) * weaveAmp * 0.75 +
      Math.sin(this.laserTime * 2.1) * weaveAmp * 0.25;
    this.laserX += (targetLaserX - this.laserX) * (1 - Math.exp(-3.5 * worldDt));

    const desiredZ = -7.0 - state.normalizedSpeed * 3.8 + state.slipstreamAlignment * 0.9;
    this.laserZ += (desiredZ - this.laserZ) * (1 - Math.exp(-4 * realDt));

    this.laserGroup.visible = state.runElapsed < 214.0;
    this.laserGroup.position.set(this.laserX, 0, this.laserZ);

    const catX = cat ? cat.x : 0;
    this.floorMat.uniforms.uLaserX.value = this.laserX;
    this.floorMat.uniforms.uAlignment.value = state.slipstreamAlignment;
    this.floorMat.uniforms.uBeat.value = beatEnergy;

    // 3-mode floor state: Stage 1-2 Neighborhood Road -> Stage 3 Pitch Black -> Post-Stage 3 Void Footing
    this.floorMat.uniforms.uRoadMode.value = !state.worldCollapsed && !state.overclock1Active ? 1.0 : 0.0;
    this.floorMat.uniforms.uPitchBlack.value = state.overclock1Active ? 1.0 : 0.0;
    this.floorMat.uniforms.uVoidFooting.value = state.worldCollapsed ? 1.0 : 0.0;

    // Roadside neighborhood people / joggers / dogs / trees (visible until 38s world collapse)
    if (!state.worldCollapsed && state.phase === 'playing') {
      this.roadsideGroup.visible = true;
      this.updateRoadside(worldDt, state.speed, state.overclock1Active);
    } else if (!state.worldCollapsed && state.phase === 'start') {
      this.roadsideGroup.visible = true;
      this.updateRoadside(0, 0, false);
    } else {
      this.roadsideGroup.visible = false;
    }

    // Post-Stage 3 Void Footing: light up wherever Wiwi & Lily step!
    if (state.worldCollapsed && state.phase === 'playing' && state.speed > 4) {
      this.stepPadMesh.visible = true;
      this.wiwiStepTimer += worldDt;
      if (cat && cat.y < 0.25 && this.wiwiStepTimer >= 0.065) {
        this.wiwiStepTimer = 0;
        const padCol = state.stage2BurstActive
          ? '#fde047'
          : state.blackRedPillarMode
            ? '#ff1a35'
            : state.titanMode
              ? '#ff2a85'
              : '#22e6ff';
        this.spawnStepPad(cat.x, 0.12, padCol);
      }
      if (state.tearCount >= 5 && lily && lily.group.visible) {
        this.lilyStepTimer += worldDt;
        if (this.lilyStepTimer >= 0.075) {
          this.lilyStepTimer = 0;
          this.spawnStepPad(lily.x, lily.z + 0.1, state.overdriveMode ? '#34d399' : '#ff2a4b');
        }
      }

      for (let i = 0; i < STEP_PAD_POOL; i++) {
        const sp = this.stepPads[i];
        if (!sp.active) {
          this.dummy.position.set(0, -100, 0);
          this.dummy.scale.setScalar(0.01);
          this.dummy.updateMatrix();
          this.stepPadMesh.setMatrixAt(i, this.dummy.matrix);
          continue;
        }
        sp.life += worldDt;
        sp.z += state.speed * worldDt;
        if (sp.life >= sp.maxLife || sp.z > 10) {
          sp.active = false;
          this.dummy.scale.setScalar(0.01);
          this.dummy.updateMatrix();
          this.stepPadMesh.setMatrixAt(i, this.dummy.matrix);
          continue;
        }
        const rem = 1 - sp.life / sp.maxLife;
        this.dummy.position.set(sp.x, 0.025, sp.z);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(rem * 1.15, 1, rem * 1.35);
        this.dummy.updateMatrix();
        this.stepPadMesh.setMatrixAt(i, this.dummy.matrix);
        this.scratchPadColor.set(sp.color);
        this.stepPadMesh.setColorAt(i, this.scratchPadColor);
      }
      this.stepPadMesh.instanceMatrix.needsUpdate = true;
      if (this.stepPadMesh.instanceColor) this.stepPadMesh.instanceColor.needsUpdate = true;
    } else {
      this.stepPadMesh.visible = false;
    }

    // Slipstream ribbon
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

    // Palette & Sky evolution per stage
    const smooth = 1 - Math.exp(-4.5 * realDt);
    let targetBg = '#091326';
    let targetLine = '#22e6ff';
    let targetGrid = 0.35;
    let targetFog = 0.013;

    if (state.overclock1Active) {
      // Stage 3 Overclock: PITCH BLACK background & sky!
      targetBg = '#000000';
      targetLine = '#ffffff';
      targetGrid = 0.3;
      targetFog = 0.004;
      this.skyMesh.visible = false;
      this.scene.background.set('#000000');
      this.scene.fog.color.set('#000000');
      this.scene.fog.density = targetFog;
      this.floorMat.uniforms.uLineColor.value.set('#22e6ff');
      return;
    }

    this.skyMesh.visible = true;
    if (state.stage2BurstActive) {
      // 2nd Overclock (136s-142s): Retained Yellow Overdrive sky & ground accent
      targetBg = '#140f02';
      targetLine = '#fde047';
      targetGrid = 0.72;
      targetFog = 0.010;
    } else if (state.blackRedPillarMode) {
      // Post-2nd Overclock (142s+): Pitch Black & Crimson Red Void
      targetBg = '#080104';
      targetLine = state.overdriveMode ? '#38f3ff' : '#ff1a35';
      targetGrid = 0.68 + beatEnergy * 0.25;
      targetFog = 0.011;
    } else if (state.titanMode) {
      // Stage 4 Synthwave Titans (62s-136s)
      targetBg = '#120322';
      targetLine = '#ff2a85';
      targetGrid = 0.66 + beatEnergy * 0.22;
      targetFog = 0.011;
    } else if (state.worldCollapsed) {
      // Post-Stage 3 Collapsed World (38s-62s)
      targetBg = '#070314';
      targetLine = '#a855f7';
      targetGrid = 0.52 + beatEnergy * 0.2;
      targetFog = 0.011;
    } else if (state.actIndex === 1) {
      // Stage 2 Neighborhood Road Acceleration
      targetBg = '#0b1932';
      targetLine = '#22e6ff';
      targetGrid = 0.45;
      targetFog = 0.012;
    }

    this.scratchBg.set(targetBg);
    this.scratchLine.set(targetLine);
    this.scene.background.lerp(this.scratchBg, smooth);
    this.scene.fog.color.copy(this.scene.background);
    this.scene.fog.density += (targetFog - this.scene.fog.density) * smooth;
    this.floorMat.uniforms.uLineColor.value.lerp(this.scratchLine, smooth);
    this.floorMat.uniforms.uGridStrength.value +=
      (targetGrid - this.floorMat.uniforms.uGridStrength.value) * smooth;

    this.skyMat.uniforms.uTime.value += worldDt * (0.8 + state.normalizedSpeed * 1.8);
    this.skyMat.uniforms.uSkyHorizon.value.copy(this.scene.background);
    this.skyMat.uniforms.uNebulaColor.value.lerp(this.scratchLine, smooth);
    this.skyMat.uniforms.uNebulaStrength.value = state.worldCollapsed
      ? 0.22 + state.tearCount * 0.1 + (state.overdriveMode ? 0.22 : 0) + beatEnergy * 0.15
      : 0.06;
  }

  updateEnding(realDt, step) {
    this.slipstreamLine.visible = false;
    this.roadsideGroup.visible = false;
    this.stepPadMesh.visible = false;
    this.floorMat.uniforms.uRoadMode.value = 0.0;
    this.floorMat.uniforms.uPitchBlack.value = 0.0;
    this.floorMat.uniforms.uVoidFooting.value = 0.0;

    if (step === 0) {
      this.laserGroup.visible = false;
      this.roomGroup.visible = false;
      return;
    }

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

    this.laserGroup.visible = step >= 1 && step < 3;
    this.laserGroup.position.set(0, 0, -0.85);
    this.laserHalo.scale.setScalar(0.85);
    this.laserLight.intensity = 1.4;
  }
}
