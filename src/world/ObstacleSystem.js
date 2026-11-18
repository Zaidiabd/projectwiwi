import * as THREE from 'three';
import { LANES } from '../core/GameState.js';

const MAX_LANE_VEHICLES = 12;
const MAX_LANE_DEBRIS = 12;
const MAX_HAND_STOMPS = 6;
const MAX_PILLARS = 12;

function mergeParts(parts) {
  const posArrays = [];
  const normArrays = [];
  const indices = [];
  let vertOffset = 0;

  for (const part of parts) {
    const g = part.geom;
    if (part.scale) {
      g.scale(part.scale[0], part.scale[1], part.scale[2]);
    }
    if (part.rot) {
      g.rotateX(part.rot[0] || 0);
      g.rotateY(part.rot[1] || 0);
      g.rotateZ(part.rot[2] || 0);
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

/**
 * Builds a sleek, rounded aerodynamic fastback sports car geometry using
 * beveled ExtrudeGeometry curves + smooth cylindrical wheels & capsule mirrors.
 */
function createSculptedCarGeometry() {
  // Side-silhouette Bezier profile of a modern aerodynamic sports coupe (Z = length, Y = height)
  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-1.55, 0.16);
  bodyShape.quadraticCurveTo(-1.62, 0.42, -1.32, 0.52); // Curved front bumper & nose
  bodyShape.quadraticCurveTo(-0.85, 0.58, -0.55, 0.62); // Swept hood
  bodyShape.bezierCurveTo(-0.25, 0.98, 0.15, 1.06, 0.58, 1.02); // Curved windshield & fastback roof
  bodyShape.quadraticCurveTo(1.12, 0.94, 1.48, 0.64); // Fastback rear glass & deck
  bodyShape.quadraticCurveTo(1.62, 0.45, 1.50, 0.18); // Rear diffuser curve
  bodyShape.lineTo(-1.55, 0.16);

  const extrudeOpts = {
    depth: 1.32,
    bevelEnabled: true,
    bevelSegments: 5,
    steps: 1,
    bevelSize: 0.16,
    bevelThickness: 0.18,
    curveSegments: 16
  };
  const bodyGeom = new THREE.ExtrudeGeometry(bodyShape, extrudeOpts);
  // Center extrusion along X and align Z along forward/back
  bodyGeom.rotateY(Math.PI / 2);
  bodyGeom.translate(-0.66, 0, 0);

  const parts = [{ geom: bodyGeom }];

  // Sculpted 20-segment rounded wheels with hub arches
  for (const wx of [-0.78, 0.78]) {
    for (const wz of [-0.95, 0.95]) {
      parts.push({
        geom: new THREE.CylinderGeometry(0.28, 0.28, 0.24, 20),
        rot: [0, 0, Math.PI / 2],
        pos: [wx, 0.28, wz]
      });
      // Rounded fender flare
      parts.push({
        geom: new THREE.SphereGeometry(0.32, 14, 10),
        scale: [0.45, 0.9, 1.15],
        pos: [wx * 0.94, 0.34, wz]
      });
    }
  }
  return mergeParts(parts);
}

/**
 * Builds an organic sport-bike + leaning rider out of smooth Torus tires,
 * beveled aerodynamic fairing, and CapsuleGeometry rider anatomy.
 */
function createSculptedBikeGeometry() {
  const parts = [
    // Front & rear rounded motorcycle tires
    { geom: new THREE.TorusGeometry(0.28, 0.09, 12, 22), rot: [0, Math.PI / 2, 0], pos: [0, 0.30, 0.66] },
    { geom: new THREE.TorusGeometry(0.29, 0.10, 12, 22), rot: [0, Math.PI / 2, 0], pos: [0, 0.31, -0.66] },
    // Sculpted aerodynamic teardrop fuel tank & front cowl
    { geom: new THREE.CapsuleGeometry(0.21, 0.85, 8, 16), rot: [Math.PI * 0.42, 0, 0], pos: [0, 0.56, 0.08] },
    { geom: new THREE.ConeGeometry(0.22, 0.55, 16), rot: [Math.PI * 0.58, 0, 0], pos: [0, 0.64, 0.62] },
    // Rider torso (smooth capsule leaning into the wind)
    { geom: new THREE.CapsuleGeometry(0.18, 0.46, 8, 16), rot: [0.58, 0, 0], pos: [0, 0.94, -0.05] },
    // Rider helmet (smooth sphere + aerodynamic tail)
    { geom: new THREE.SphereGeometry(0.19, 16, 14), scale: [0.92, 1.0, 1.18], pos: [0, 1.28, 0.20] },
    // Rider arms & legs (capsules hugging tank)
    { geom: new THREE.CapsuleGeometry(0.065, 0.38, 6, 10), rot: [0.95, 0, -0.18], pos: [-0.17, 0.96, 0.24] },
    { geom: new THREE.CapsuleGeometry(0.065, 0.38, 6, 10), rot: [0.95, 0, 0.18], pos: [0.17, 0.96, 0.24] },
    { geom: new THREE.CapsuleGeometry(0.08, 0.42, 6, 10), rot: [0.4, 0, 0], pos: [-0.18, 0.62, -0.18] },
    { geom: new THREE.CapsuleGeometry(0.08, 0.42, 6, 10), rot: [0.4, 0, 0], pos: [0.18, 0.62, -0.18] }
  ];
  return mergeParts(parts);
}

/**
 * Builds an organic fractured crag/asteroid land chunk by displacing a
 * subdivided IcosahedronGeometry and recomputing smooth normals.
 */
function createSculptedLandChunkGeometry() {
  const geom = new THREE.IcosahedronGeometry(1.05, 2);
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n =
      Math.sin(x * 3.7 + z * 2.3) * 0.18 +
      Math.cos(y * 4.1 - x * 2.9) * 0.14 +
      Math.sin(z * 5.2 + y * 3.1) * 0.09;
    // Flatten underside slightly like a torn road/crust island
    const ySquash = y < 0 ? 0.48 : 0.72;
    pos.setXYZ(i, x * (1.15 + n), y * ySquash + n * 0.35, z * (1.22 - n * 0.5));
  }
  geom.computeVertexNormals();
  return geom;
}

/**
 * Builds an organic multi-crown uprooted tree geometry.
 */
function createSculptedTreeDebrisGeometry() {
  return mergeParts([
    { geom: new THREE.CylinderGeometry(0.12, 0.26, 1.55, 12), pos: [0, -0.35, 0] },
    { geom: new THREE.IcosahedronGeometry(0.78, 2), scale: [1.05, 1.25, 1.05], pos: [0, 0.72, 0] },
    { geom: new THREE.IcosahedronGeometry(0.58, 2), pos: [-0.38, 0.55, 0.22] },
    { geom: new THREE.IcosahedronGeometry(0.55, 2), pos: [0.36, 0.62, -0.18] }
  ]);
}

/**
 * Builds an anatomical V-tapered Synthwave Titan upper body + sculpted head
 * using smooth Capsules, Spheres, and tapered Cylinders (zero boxy cubes).
 */
function createSculptedTitanGeometry() {
  return mergeParts([
    // Tapered waist & ribcage
    { geom: new THREE.CylinderGeometry(2.85, 1.65, 5.2, 20), scale: [1.18, 1.0, 0.68], pos: [0, 6.2, 0] },
    // Sculpted pectoral chest plates
    { geom: new THREE.SphereGeometry(1.95, 18, 14), scale: [1.15, 0.85, 0.68], pos: [-1.35, 9.2, 0.55] },
    { geom: new THREE.SphereGeometry(1.95, 18, 14), scale: [1.15, 0.85, 0.68], pos: [1.35, 9.2, 0.55] },
    // Rounded deltoid shoulder capsules & upper traps
    { geom: new THREE.CapsuleGeometry(1.45, 2.2, 10, 18), rot: [0, 0, Math.PI / 2], pos: [0, 10.6, 0] },
    { geom: new THREE.SphereGeometry(1.75, 18, 14), scale: [1.1, 0.95, 0.85], pos: [-3.85, 10.5, 0] },
    { geom: new THREE.SphereGeometry(1.75, 18, 14), scale: [1.1, 0.95, 0.85], pos: [3.85, 10.5, 0] },
    // Upper arms descending from deltoids
    { geom: new THREE.CapsuleGeometry(1.05, 3.6, 8, 16), rot: [0.15, 0, 0.18], pos: [-4.4, 7.6, 0.3] },
    { geom: new THREE.CapsuleGeometry(1.05, 3.6, 8, 16), rot: [0.15, 0, -0.18], pos: [4.4, 7.6, 0.3] },
    // Muscular neck column
    { geom: new THREE.CylinderGeometry(0.95, 1.25, 1.8, 16), pos: [0, 12.0, 0.1] },
    // Sculpted anatomical cranium & tapered jawline
    { geom: new THREE.SphereGeometry(1.95, 22, 18), scale: [0.92, 1.28, 1.02], pos: [0, 14.3, 0.2] },
    { geom: new THREE.ConeGeometry(1.45, 1.8, 16), rot: [Math.PI, 0, 0], scale: [0.85, 1.0, 0.85], pos: [0, 13.0, 0.35] }
  ]);
}

/**
 * Builds an organic, anatomical 5-fingered giant hand with rounded palm,
 * knuckle domes, 3-segment curved capsule fingers + thumb, and tapered forearm.
 */
function createSculptedHandGeometry() {
  const parts = [
    // Anatomical palm & dorsal hand arch (smooth scaled sphere + capsule bridge)
    { geom: new THREE.SphereGeometry(2.25, 20, 16), scale: [1.12, 0.36, 0.82], pos: [0, 0.78, 0] },
    // Tapered muscular wrist & forearm descending from above
    { geom: new THREE.CylinderGeometry(1.48, 1.12, 6.4, 20), rot: [-0.14, 0, 0], pos: [0, 4.1, -0.55] }
  ];

  // 4 sculpted articulated fingers (proximal + distal curved capsules + knuckle spheres)
  const fingerX = [-1.75, -0.60, 0.60, 1.75];
  const fingerLen = [1.05, 1.25, 1.22, 0.98];
  const fingerSplay = [-0.14, -0.04, 0.04, 0.14];

  for (let i = 0; i < 4; i++) {
    const fx = fingerX[i];
    const fl = fingerLen[i];
    const splay = fingerSplay[i];
    // Knuckle dome
    parts.push({
      geom: new THREE.SphereGeometry(0.46, 14, 12),
      pos: [fx, 0.82, 1.35]
    });
    // Proximal phalanx
    parts.push({
      geom: new THREE.CapsuleGeometry(0.36, fl * 0.85, 8, 14),
      rot: [1.32, splay, 0],
      pos: [fx + splay * 1.1, 0.68, 2.05]
    });
    // Distal fingertip claw curving into the ground
    parts.push({
      geom: new THREE.CapsuleGeometry(0.28, fl * 0.65, 8, 14),
      rot: [0.82, splay, 0],
      pos: [fx + splay * 1.8, 0.36, 2.78]
    });
  }

  // Opposable thumb on outer side
  parts.push({
    geom: new THREE.CapsuleGeometry(0.38, 0.95, 8, 14),
    rot: [1.1, -0.55, -0.3],
    pos: [-2.45, 0.58, 0.85]
  });

  return mergeParts(parts);
}

// ---------------------------------------------------------------------------
// Custom GLSL Shaders for Synthwave Titans & High-Energy Plasma Light Beams
// ---------------------------------------------------------------------------

const SYNTHWAVE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    vec4 instancePos = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      instancePos = instanceMatrix * instancePos;
    #endif
    vec4 wp = modelMatrix * instancePos;
    vWorldPos = wp.xyz;
    vec4 mvPos = viewMatrix * wp;
    vViewDir = normalize(-mvPos.xyz);
    mat3 nMat = normalMatrix;
    #ifdef USE_INSTANCING
      nMat = normalMatrix * mat3(instanceMatrix);
    #endif
    vNormal = normalize(nMat * normal);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const SYNTHWAVE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCoreColor;
  uniform vec3 uRimColorA;
  uniform vec3 uRimColorB;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;

  void main() {
    float ndv = clamp( abs(dot(normalize(vNormal), normalize(vViewDir))), 0.0, 1.0 );
    float fresnel = pow(1.0 - ndv, 2.2);

    // Smooth synthwave laser contour lines along Y & Z (no triangle wireframe!)
    float scanY = smoothstep(0.84, 0.98, sin(vWorldPos.y * 5.5 - uTime * 3.5) * 0.5 + 0.5);
    float scanX = smoothstep(0.88, 0.99, sin(vWorldPos.x * 4.0) * 0.5 + 0.5);
    float gridGlow = clamp(scanY * 0.55 + scanX * 0.35, 0.0, 1.0);

    vec3 rimCol = mix(uRimColorA, uRimColorB, sin(vWorldPos.y * 0.4 + uTime * 2.0) * 0.5 + 0.5);
    vec3 col = uCoreColor + rimCol * (fresnel * 1.65 + gridGlow * 0.48);
    gl_FragColor = vec4(col, 0.96);
  }
`;

const BEAM_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vUv = uv;
    vec4 instancePos = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      instancePos = instanceMatrix * instancePos;
    #endif
    vec4 mvPos = modelViewMatrix * instancePos;
    vViewDir = normalize(-mvPos.xyz);
    mat3 nMat = normalMatrix;
    #ifdef USE_INSTANCING
      nMat = normalMatrix * mat3(instanceMatrix);
    #endif
    vNormal = normalize(nMat * normal);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const BEAM_CORE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uDarkMode; // 0.0 = Blazing Yellow High-Energy Beam (136s-142s), 1.0 = Pitch-Black Beam w/ Red Fresnel Rim (142s+)

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

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
    float ndv = clamp(abs(dot(normalize(vNormal), normalize(vViewDir))), 0.0, 1.0);
    float angle = vUv.x * 6.2831853;

    // High-velocity upward plasma surges & helical electric filaments
    float n1 = noise(vec2(vUv.x * 6.0, vUv.y * 14.0 - uTime * 7.5));
    float n2 = noise(vec2(vUv.x * 12.0 - uTime * 2.0, vUv.y * 28.0 - uTime * 14.0));
    float plasma = n1 * 0.6 + n2 * 0.4;

    float helix1 = smoothstep(0.72, 0.98, sin(angle * 2.0 + vUv.y * 24.0 - uTime * 16.0) * 0.5 + 0.5);
    float helix2 = smoothstep(0.76, 0.99, sin(-angle * 3.0 + vUv.y * 32.0 - uTime * 20.0) * 0.5 + 0.5);
    float arc = clamp(helix1 + helix2, 0.0, 1.0);

    // Intense ground contact hotspot at the base of the beam
    float baseFlare = exp(-vUv.y * 5.5) * 0.85;
    float topFade = smoothstep(1.0, 0.82, vUv.y);

    if (uDarkMode < 0.5) {
      // 2ND OVERCLOCK (136s-142s): Blazing Yellow-Gold High-Energy Orbital Laser Beam!
      float coreHot = pow(ndv, 1.15);
      float edgeSoft = smoothstep(0.02, 0.48, ndv);
      vec3 goldenOuter = vec3(1.0, 0.68, 0.08);
      vec3 yellowMid = vec3(1.0, 0.93, 0.32);
      vec3 whiteHot = vec3(1.0, 1.0, 0.92);

      vec3 col = mix(goldenOuter, yellowMid, coreHot);
      col = mix(col, whiteHot, pow(coreHot, 2.4) + arc * 0.65 + baseFlare);
      col *= (1.15 + plasma * 0.55);

      float alpha = clamp((edgeSoft * 0.88 + arc * 0.45 + baseFlare) * topFade, 0.0, 1.0);
      gl_FragColor = vec4(col, alpha);
    } else {
      // POST-OVERCLOCK (142s+): Pitch-Black Void Core with Razor-Sharp Glowing Crimson-Red Outline & Voltage!
      // Center of cylinder (ndv > 0.36) is pure light-absorbing pitch black; silhouette edge (ndv < 0.42) is blazing red!
      float rimBand = smoothstep(0.52, 0.14, ndv) * smoothstep(0.01, 0.14, ndv);
      float outerTrim = smoothstep(0.0, 0.10, ndv);
      vec3 blackCore = vec3(0.01, 0.002, 0.015);
      vec3 redOutline = mix(vec3(1.0, 0.05, 0.18), vec3(1.0, 0.45, 0.52), rimBand * 0.7 + arc * 0.5);

      float electricVein = arc * smoothstep(0.15, 0.75, 1.0 - ndv) * 0.85;
      float outlineStrength = clamp(rimBand * 1.55 + electricVein + baseFlare * 0.8, 0.0, 1.0);
      vec3 col = mix(blackCore, redOutline * (1.25 + plasma * 0.45), outlineStrength);

      float alpha = clamp(outerTrim * 0.97 * topFade, 0.0, 1.0);
      gl_FragColor = vec4(col, alpha);
    }
  }
`;

const BEAM_CORONA_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uDarkMode;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float ndv = clamp(abs(dot(normalize(vNormal), normalize(vViewDir))), 0.0, 1.0);
    float angle = vUv.x * 6.2831853;

    // Helical electric lightning bolts spiraling around the outer beam sheath
    float boltA = smoothstep(0.86, 0.995, sin(angle * 3.0 + vUv.y * 36.0 - uTime * 22.0) * 0.5 + 0.5);
    float boltB = smoothstep(0.88, 0.996, sin(-angle * 4.0 + vUv.y * 44.0 - uTime * 17.0) * 0.5 + 0.5);
    float bolts = clamp(boltA + boltB, 0.0, 1.0);

    float halo = pow(ndv, 1.8) * 0.42;
    float baseBurst = exp(-vUv.y * 7.0) * 0.65;
    float topFade = smoothstep(1.0, 0.75, vUv.y);

    vec3 glowCol = uDarkMode < 0.5
      ? mix(vec3(1.0, 0.78, 0.12), vec3(1.0, 0.98, 0.75), bolts)
      : mix(vec3(1.0, 0.06, 0.20), vec3(1.0, 0.55, 0.62), bolts);

    float alpha = clamp((halo + bolts * 0.85 + baseBurst) * topFade, 0.0, 1.0);
    gl_FragColor = vec4(glowCol * 1.35, alpha);
  }
`;

const BEAM_FLARE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 instancePos = vec4(position, 1.0);
    #ifdef USE_INSTANCING
      instancePos = instanceMatrix * instancePos;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * instancePos;
  }
`;

const BEAM_FLARE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uDarkMode;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    if (r > 1.0) discard;
    float ang = atan(p.y, p.x);

    // Concentric expanding energy shock rings + radial electric arcs on the floor
    float core = exp(-r * r * 7.5);
    float ring = exp(-pow((r - fract(uTime * 2.2) * 0.85) * 9.0, 2.0)) * (1.0 - r);
    float rays = smoothstep(0.75, 0.98, sin(ang * 8.0 + r * 14.0 - uTime * 16.0) * 0.5 + 0.5) * (1.0 - r);

    vec3 col = uDarkMode < 0.5
      ? mix(vec3(1.0, 0.78, 0.15), vec3(1.0, 1.0, 0.88), core + rays)
      : mix(vec3(0.95, 0.05, 0.18), vec3(1.0, 0.55, 0.62), ring + rays);

    // Dark-mode ground flare keeps a pitch-black center pupil surrounded by a blazing red shock ring
    if (uDarkMode >= 0.5) {
      float darkCenter = smoothstep(0.32, 0.12, r);
      col = mix(col, vec3(0.01, 0.0, 0.02), darkCenter);
    }

    float alpha = clamp((core * 0.95 + ring * 0.85 + rays * 0.65) * (1.0 - r), 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  }
`;

const VEHICLE_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#e2e8f0'];

export class ObstacleSystem {
  constructor(scene) {
    this.scene = scene;
    this.vehicleLimit = 10;
    this.debrisLimit = 10;
    this.pillarLimit = 10;

    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();
    this.activeMode = 'none';
    this.waveTrackers = {
      vehicles: { waveIndex: 0, safeLane: 1, occupiedMask: 0, currentCount: 0, maxInWave: 1, waveZ: -55 },
      debris: { waveIndex: 0, safeLane: 1, occupiedMask: 0, currentCount: 0, maxInWave: 1, waveZ: -55 },
      pillars: { waveIndex: 0, safeLane: 1, occupiedMask: 0, currentCount: 0, maxInWave: 1, waveZ: -55 }
    };

    // ---------------------------------------------------------
    // 1. Stage 2 & Stage 3 Overclock: Sculpted Aerodynamic Cars & Sport-Bikes
    // ---------------------------------------------------------
    const carGeom = createSculptedCarGeometry();
    this.carMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#000000',
      roughness: 0.24,
      metalness: 0.72
    });
    this.carMesh = new THREE.InstancedMesh(carGeom, this.carMat, MAX_LANE_VEHICLES);
    this.carMesh.frustumCulled = false;
    this.scene.add(this.carMesh);

    const bikeGeom = createSculptedBikeGeometry();
    this.bikeMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#000000',
      roughness: 0.26,
      metalness: 0.68
    });
    this.bikeMesh = new THREE.InstancedMesh(bikeGeom, this.bikeMat, MAX_LANE_VEHICLES);
    this.bikeMesh.frustumCulled = false;
    this.scene.add(this.bikeMesh);

    this.color.set('#ffffff');
    for (let i = 0; i < MAX_LANE_VEHICLES; i++) {
      this.carMesh.setColorAt(i, this.color);
      this.bikeMesh.setColorAt(i, this.color);
    }

    // Uniform relative speed so vehicles never overtake each other to form a 3-lane wall
    this.vehicles = Array.from({ length: MAX_LANE_VEHICLES }, (_, i) => ({
      lane: i % 3,
      x: LANES[i % 3],
      z: -55 - i * 30,
      isBike: i % 2 === 1,
      relSpeed: 10,
      colorHex: VEHICLE_COLORS[i % VEHICLE_COLORS.length],
      active: false,
      grazed: false,
      hitCooldown: 0
    }));

    // ---------------------------------------------------------
    // 2. Post-Stage 3 World Collapse (38s-62s): Sculpted Crag Land Slabs, Cars & Multi-Crown Trees
    // ---------------------------------------------------------
    const landGeom = createSculptedLandChunkGeometry();
    this.landMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      emissive: '#9333ea',
      emissiveIntensity: 0.6,
      roughness: 0.55
    });
    this.landMesh = new THREE.InstancedMesh(landGeom, this.landMat, MAX_LANE_DEBRIS);
    this.landMesh.frustumCulled = false;
    this.scene.add(this.landMesh);

    const treeDebrisGeom = createSculptedTreeDebrisGeometry();
    this.treeDebrisMat = new THREE.MeshStandardMaterial({
      color: '#065f46',
      emissive: '#22e6ff',
      emissiveIntensity: 0.45,
      roughness: 0.65
    });
    this.treeDebrisMesh = new THREE.InstancedMesh(treeDebrisGeom, this.treeDebrisMat, MAX_LANE_DEBRIS);
    this.treeDebrisMesh.frustumCulled = false;
    this.scene.add(this.treeDebrisMesh);

    this.debris = Array.from({ length: MAX_LANE_DEBRIS }, (_, i) => ({
      lane: (i * 2) % 3,
      x: LANES[(i * 2) % 3],
      z: -48 - i * 20,
      kind: i % 3, // 0 = crag land slab, 1 = car, 2 = tree
      rx: Math.random() * Math.PI,
      ry: Math.random() * Math.PI,
      spin: 1.5 + Math.random() * 1.6,
      active: false,
      grazed: false,
      hitCooldown: 0
    }));

    // ---------------------------------------------------------
    // 3. Stage 4 (62s-136s): Anatomical Synthwave Humanoid Beings & 5-Fingered Clawed Hands
    // ---------------------------------------------------------
    this.titanGroup = new THREE.Group();
    this.titanGroup.visible = false;
    this.scene.add(this.titanGroup);

    this.titanShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCoreColor: { value: new THREE.Color('#0c031c') },
        uRimColorA: { value: new THREE.Color('#ff2a85') },
        uRimColorB: { value: new THREE.Color('#38f3ff') }
      },
      vertexShader: SYNTHWAVE_VERTEX,
      fragmentShader: SYNTHWAVE_FRAGMENT,
      transparent: true
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#38f3ff' });
    const titanBodyGeom = createSculptedTitanGeometry();

    this.titans = [];
    for (const side of [-1, 1]) {
      const fig = new THREE.Group();
      const bodyMesh = new THREE.Mesh(titanBodyGeom, this.titanShaderMat);
      fig.add(bodyMesh);

      // Wrap-around glowing synthwave visor eyes
      const eyeGeom = new THREE.CapsuleGeometry(0.18, 0.62, 6, 12);
      eyeGeom.rotateZ(Math.PI / 2);
      const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
      eyeL.position.set(-0.68, 14.4, 1.92);
      eyeL.rotation.y = -0.25;
      const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
      eyeR.position.set(0.68, 14.4, 1.92);
      eyeR.rotation.y = 0.25;
      fig.add(eyeL, eyeR);

      fig.position.set(side * 10.5, -1.5, -34);
      fig.rotation.y = side > 0 ? -0.35 : 0.35;
      this.titanGroup.add(fig);
      this.titans.push(fig);
    }

    const handGeom = createSculptedHandGeometry();
    this.handMesh = new THREE.InstancedMesh(handGeom, this.titanShaderMat, MAX_HAND_STOMPS);
    this.handMesh.frustumCulled = false;
    this.scene.add(this.handMesh);

    // 2-lane floor impact pulse disc under each hand stomp
    const handZoneGeom = new THREE.CircleGeometry(2.85, 28);
    handZoneGeom.rotateX(-Math.PI / 2);
    handZoneGeom.translate(0, 0.03, 0.6);
    this.handZoneMat = new THREE.MeshBasicMaterial({
      color: '#ff2a85',
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.handZoneMesh = new THREE.InstancedMesh(handZoneGeom, this.handZoneMat, MAX_HAND_STOMPS);
    this.handZoneMesh.frustumCulled = false;
    this.scene.add(this.handZoneMesh);

    this.handStomps = Array.from({ length: MAX_HAND_STOMPS }, (_, i) => {
      const isLeft = i % 2 === 0;
      return {
        isLeft,
        x: isLeft ? -1.5 : 1.5,
        coveredLanes: isLeft ? [0, 1] : [1, 2],
        exitLane: isLeft ? 2 : 0,
        z: -48 - i * 34,
        active: false,
        grazed: false,
        hitCooldown: 0
      };
    });

    // ---------------------------------------------------------
    // 4. 2nd Overclock (136s-142s) & Post-Overclock (142s+):
    //    Volumetric High-Energy Plasma Beam -> Pitch-Black Void Beam w/ Red Fresnel Rim!
    // ---------------------------------------------------------
    const beamCoreGeom = new THREE.CylinderGeometry(0.54, 0.54, 24.0, 28, 1, true);
    beamCoreGeom.translate(0, 12.0, 0);
    this.beamCoreMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDarkMode: { value: 0.0 }
      },
      vertexShader: BEAM_VERTEX,
      fragmentShader: BEAM_CORE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.pillarCoreMesh = new THREE.InstancedMesh(beamCoreGeom, this.beamCoreMat, MAX_PILLARS);
    this.pillarCoreMesh.frustumCulled = false;
    this.pillarCoreMesh.renderOrder = 6;
    this.scene.add(this.pillarCoreMesh);

    // Outer additive plasma corona & helical lightning sheath
    const beamCoronaGeom = new THREE.CylinderGeometry(0.96, 0.96, 24.0, 28, 1, true);
    beamCoronaGeom.translate(0, 12.0, 0);
    this.beamCoronaMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDarkMode: { value: 0.0 }
      },
      vertexShader: BEAM_VERTEX,
      fragmentShader: BEAM_CORONA_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.pillarOutlineMesh = new THREE.InstancedMesh(beamCoronaGeom, this.beamCoronaMat, MAX_PILLARS);
    this.pillarOutlineMesh.frustumCulled = false;
    this.pillarOutlineMesh.renderOrder = 7;
    this.scene.add(this.pillarOutlineMesh);

    // Ground impact plasma flare & crackling electric shock disc
    const flareGeom = new THREE.PlaneGeometry(3.5, 3.5);
    flareGeom.rotateX(-Math.PI / 2);
    flareGeom.translate(0, 0.032, 0);
    this.chargeRingMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDarkMode: { value: 0.0 }
      },
      vertexShader: BEAM_FLARE_VERTEX,
      fragmentShader: BEAM_FLARE_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.chargeRingMesh = new THREE.InstancedMesh(flareGeom, this.chargeRingMat, MAX_PILLARS);
    this.chargeRingMesh.frustumCulled = false;
    this.chargeRingMesh.renderOrder = 5;
    this.scene.add(this.chargeRingMesh);

    this.pillars = Array.from({ length: MAX_PILLARS }, (_, i) => ({
      lane: i % 3,
      x: LANES[i % 3],
      z: -42 - i * 18,
      phase: Math.random() * Math.PI * 2,
      active: false,
      grazed: false,
      hitCooldown: 0
    }));

    this.reset();
  }

  setQualityCount(count) {
    this.vehicleLimit = Math.min(MAX_LANE_VEHICLES, Math.max(6, Math.floor(count * 0.6)));
    this.debrisLimit = Math.min(MAX_LANE_DEBRIS, Math.max(6, Math.floor(count * 0.6)));
    this.pillarLimit = Math.min(MAX_PILLARS, Math.max(6, Math.floor(count * 0.6)));
    this.carMesh.count = this.vehicleLimit;
    this.bikeMesh.count = this.vehicleLimit;
    this.landMesh.count = this.debrisLimit;
    this.treeDebrisMesh.count = this.debrisLimit;
    this.pillarCoreMesh.count = this.pillarLimit;
    this.pillarOutlineMesh.count = this.pillarLimit;
    this.chargeRingMesh.count = this.pillarLimit;
    this.reset();
  }

  hideAll() {
    this.carMesh.visible = false;
    this.bikeMesh.visible = false;
    this.landMesh.visible = false;
    this.treeDebrisMesh.visible = false;
    this.titanGroup.visible = false;
    this.handMesh.visible = false;
    this.handZoneMesh.visible = false;
    this.pillarCoreMesh.visible = false;
    this.pillarOutlineMesh.visible = false;
    this.chargeRingMesh.visible = false;
  }

  reset() {
    this.hideAll();
    this.activeMode = 'none';
    this.layoutWavePool('vehicles', this.vehicles, this.vehicleLimit, -52, 30);
    this.layoutWavePool('debris', this.debris, this.debrisLimit, -54, 30);
    this.layoutHandStomps(-58, 44);
    this.layoutWavePool('pillars', this.pillars, this.pillarLimit, -54, 34);
  }

  hideInstance(mesh, index) {
    this.dummy.position.set(0, -150, 0);
    this.dummy.scale.setScalar(0.01);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(index, this.dummy.matrix);
  }

  /**
   * Deterministic/fair 3-lane wave allocator:
   * - Never allows 3 obstacles to occupy all 3 lanes in the same wave or within `0.85 * stepZ`.
   * - 2 out of 3 waves have 1 obstacle (2 open lanes); every 3rd wave has 2 obstacles (1 open lane).
   * - Adjacent wave safe lanes always differ by at most 1 lane (`Math.abs(nextSafe - prevSafe) <= 1`)
   *   so the player always has a smooth, reachable escape corridor.
   */
  assignNextWaveSlot(item, pool, limit, trackerKey, stepZ, firstZ = -52) {
    const tracker = this.waveTrackers[trackerKey];

    // Find current furthest active wave position among all other active items in the pool
    let furthestZ = Infinity;
    for (let j = 0; j < limit; j++) {
      const other = pool[j];
      if (other !== item && other.z < 500 && other.z < furthestZ) {
        furthestZ = other.z;
      }
    }
    const hasExistingWave = Number.isFinite(furthestZ);

    // Helper: bitmask of lanes occupied within `windowZ` of `candidateZ`
    const getNearbyLaneMask = (candidateZ, windowZ) => {
      let mask = 0;
      for (let j = 0; j < limit; j++) {
        const other = pool[j];
        if (other !== item && other.active && other.z < 500 && Math.abs(other.z - candidateZ) < windowZ) {
          mask |= 1 << other.lane;
        }
      }
      return mask;
    };

    // Can this item pair into the current furthest wave as a 2-obstacle gate (leaving 1 open lane)?
    if (hasExistingWave && tracker.currentCount > 0 && tracker.currentCount < tracker.maxInWave) {
      const pairWindowMask = getNearbyLaneMask(furthestZ, stepZ * 0.85);
      let chosenLane = -1;
      for (let l = 0; l < 3; l++) {
        if (
          l !== tracker.safeLane &&
          !(tracker.occupiedMask & (1 << l)) &&
          ((pairWindowMask | (1 << l)) !== 0b111)
        ) {
          chosenLane = l;
          break;
        }
      }
      if (chosenLane !== -1) {
        item.lane = chosenLane;
        item.x = LANES[chosenLane];
        item.z = furthestZ;
        item.active = true;
        item.grazed = false;
        item.hitCooldown = 0;
        tracker.occupiedMask |= 1 << chosenLane;
        tracker.currentCount += 1;
        tracker.waveZ = furthestZ;
        return;
      }
    }

    // Start a new wave separated by `stepZ` behind `furthestZ`
    tracker.waveIndex += 1;
    const prevSafe = tracker.safeLane;

    // Pick a reachable safe lane (within 1 lane step of prevSafe) and shift it so the player actively weaves
    const reachableSafe = [];
    for (let l = 0; l < 3; l++) {
      if (Math.abs(l - prevSafe) <= 1 && l !== prevSafe) {
        reachableSafe.push(l);
      }
    }
    const nextSafe =
      reachableSafe.length > 0
        ? reachableSafe[tracker.waveIndex % reachableSafe.length]
        : prevSafe;

    // Place the primary obstacle in prevSafe (if available) to encourage weaving, otherwise any non-safe lane
    let blockedLane = prevSafe !== nextSafe ? prevSafe : (nextSafe + 1) % 3;
    if (blockedLane === nextSafe) {
      blockedLane = (nextSafe + 2) % 3;
    }

    const newWaveZ = hasExistingWave ? Math.min(firstZ, furthestZ) - stepZ : firstZ;
    tracker.safeLane = nextSafe;
    tracker.occupiedMask = 1 << blockedLane;
    tracker.currentCount = 1;
    // Every 3rd wave is a 2-lane gate (1 open escape lane); all other waves are 1-lane (2 open escape lanes)
    tracker.maxInWave = tracker.waveIndex % 3 === 0 ? 2 : 1;
    tracker.waveZ = newWaveZ;

    item.lane = blockedLane;
    item.x = LANES[blockedLane];
    item.z = newWaveZ;
    item.active = true;
    item.grazed = false;
    item.hitCooldown = 0;
  }

  layoutWavePool(trackerKey, pool, limit, firstZ, stepZ) {
    const tracker = this.waveTrackers[trackerKey];
    tracker.waveIndex = 0;
    tracker.safeLane = 1;
    tracker.occupiedMask = 0;
    tracker.currentCount = 0;
    tracker.maxInWave = 1;
    tracker.waveZ = firstZ;

    for (let i = 0; i < pool.length; i++) {
      pool[i].z = 999;
      pool[i].active = false;
    }
    for (let i = 0; i < limit; i++) {
      this.assignNextWaveSlot(pool[i], pool, limit, trackerKey, stepZ, firstZ);
    }
  }

  layoutHandStomps(firstZ = -58, stepZ = 44) {
    for (let i = 0; i < MAX_HAND_STOMPS; i++) {
      const h = this.handStomps[i];
      h.isLeft = i % 2 === 0;
      h.x = h.isLeft ? -1.5 : 1.5;
      h.coveredLanes = h.isLeft ? [0, 1] : [1, 2];
      h.exitLane = h.isLeft ? 2 : 0;
      h.z = firstZ - i * stepZ;
      h.active = true;
      h.grazed = false;
      h.hitCooldown = 0;
    }
  }

  update(worldDt, cat, state, onHit, onPhase, lily = null, onLilyHit = null, onGraze = null) {
    this.hideAll();
    if (state.actIndex < 1 || state.actIndex >= 4 || state.runElapsed > 212) {
      return;
    }

    const phaseProtected = state.burstActive;

    // =========================================================================
    // MODE A: STAGE 2 (10s-25.7s) & STAGE 3 OVERCLOCK (25.7s-38s) -> Sculpted Cars & Bikes
    // =========================================================================
    if (!state.worldCollapsed) {
      if (this.activeMode !== 'vehicles') {
        this.activeMode = 'vehicles';
        this.layoutWavePool('vehicles', this.vehicles, this.vehicleLimit, -52, 30);
      }
      this.carMesh.visible = true;
      this.bikeMesh.visible = true;

      if (state.overclock1Active) {
        this.carMat.emissive.set('#ffffff');
        this.carMat.emissiveIntensity = 1.0;
        this.bikeMat.emissive.set('#ffffff');
        this.bikeMat.emissiveIntensity = 1.0;
      } else {
        this.carMat.emissive.set('#0f172a');
        this.carMat.emissiveIntensity = 0.25;
        this.bikeMat.emissive.set('#0f172a');
        this.bikeMat.emissiveIntensity = 0.25;
      }

      const vehicleStepZ = Math.max(28, state.speed * 0.72);
      for (let i = 0; i < this.vehicleLimit; i++) {
        const v = this.vehicles[i];
        v.z += (state.speed + v.relSpeed) * worldDt;
        if (v.hitCooldown > 0) v.hitCooldown -= worldDt;

        if (v.z > 10) {
          this.assignNextWaveSlot(v, this.vehicles, this.vehicleLimit, 'vehicles', vehicleStepZ);
        }

        if (v.active && v.hitCooldown <= 0 && Math.abs(v.z) < 1.65 && cat.y < 1.05) {
          if (v.lane === cat.laneIndex || Math.abs(v.x - cat.x) < 1.05) {
            v.hitCooldown = 1.0;
            v.active = false;
            v.grazed = true;
            if (phaseProtected) {
              if (onPhase) onPhase();
            } else {
              cat.applyImpactSlowdown(false);
              if (onHit) onHit();
            }
          }
        }

        if (v.active && !v.grazed && v.z > 0.3 && v.z < 3.6 && Math.abs(v.lane - cat.laneIndex) === 1) {
          v.grazed = true;
          if (onGraze) onGraze(v.x, 0.5);
        }

        const cHex = state.overclock1Active ? '#ffffff' : v.colorHex;
        this.color.set(cHex);
        if (v.isBike) {
          this.hideInstance(this.carMesh, i);
          if (v.active) {
            this.dummy.position.set(v.x, 0, v.z);
            this.dummy.rotation.set(0, 0, 0);
            this.dummy.scale.setScalar(1.0);
            this.dummy.updateMatrix();
            this.bikeMesh.setMatrixAt(i, this.dummy.matrix);
            this.bikeMesh.setColorAt(i, this.color);
          } else {
            this.hideInstance(this.bikeMesh, i);
          }
        } else {
          this.hideInstance(this.bikeMesh, i);
          if (v.active) {
            this.dummy.position.set(v.x, 0, v.z);
            this.dummy.rotation.set(0, 0, 0);
            this.dummy.scale.setScalar(1.0);
            this.dummy.updateMatrix();
            this.carMesh.setMatrixAt(i, this.dummy.matrix);
            this.carMesh.setColorAt(i, this.color);
          } else {
            this.hideInstance(this.carMesh, i);
          }
        }
      }
      this.carMesh.instanceMatrix.needsUpdate = true;
      this.bikeMesh.instanceMatrix.needsUpdate = true;
      if (this.carMesh.instanceColor) this.carMesh.instanceColor.needsUpdate = true;
      if (this.bikeMesh.instanceColor) this.bikeMesh.instanceColor.needsUpdate = true;
      return;
    }

    // =========================================================================
    // MODE B: WORLD COLLAPSE (38s-62s) -> Sculpted Crag Land Slabs, Cars & Multi-Crown Trees
    // =========================================================================
    if (!state.titanMode && !state.stage2BurstActive && !state.blackRedPillarMode) {
      if (this.activeMode !== 'debris') {
        this.activeMode = 'debris';
        this.layoutWavePool('debris', this.debris, this.debrisLimit, -54, 30);
      }
      this.landMesh.visible = true;
      this.carMesh.visible = true;
      this.treeDebrisMesh.visible = true;
      this.carMat.emissive.set('#22e6ff');
      this.carMat.emissiveIntensity = 0.35;

      const debrisStepZ = Math.max(29, state.speed * 0.68);
      for (let i = 0; i < this.debrisLimit; i++) {
        const d = this.debris[i];
        d.z += state.speed * 1.02 * worldDt;
        d.rx += d.spin * worldDt;
        d.ry += d.spin * 0.8 * worldDt;
        if (d.hitCooldown > 0) d.hitCooldown -= worldDt;

        if (d.z > 10) {
          this.assignNextWaveSlot(d, this.debris, this.debrisLimit, 'debris', debrisStepZ);
        }

        if (d.active && d.hitCooldown <= 0 && Math.abs(d.z) < 1.35 && cat.y < 1.25) {
          if (d.lane === cat.laneIndex || Math.abs(d.x - cat.x) < 1.05) {
            d.hitCooldown = 1.0;
            d.active = false;
            d.grazed = true;
            if (phaseProtected) {
              if (onPhase) onPhase();
            } else {
              cat.applyImpactSlowdown(false);
              if (onHit) onHit();
            }
          }
        }

        if (d.active && !d.grazed && d.z > 0.3 && d.z < 3.6 && Math.abs(d.lane - cat.laneIndex) === 1) {
          d.grazed = true;
          if (onGraze) onGraze(d.x, 0.5);
        }

        this.hideInstance(this.landMesh, i);
        this.hideInstance(this.carMesh, i);
        this.hideInstance(this.treeDebrisMesh, i);
        if (d.active) {
          this.dummy.position.set(d.x, 0.8 + Math.abs(Math.sin(d.rx)) * 0.25, d.z);
          this.dummy.rotation.set(d.rx * 0.35, d.ry, d.rx * 0.2);
          this.dummy.scale.setScalar(1.0);
          this.dummy.updateMatrix();
          if (d.kind === 0) {
            this.landMesh.setMatrixAt(i, this.dummy.matrix);
          } else if (d.kind === 1) {
            this.color.set('#38bdf8');
            this.carMesh.setMatrixAt(i, this.dummy.matrix);
            this.carMesh.setColorAt(i, this.color);
          } else {
            this.treeDebrisMesh.setMatrixAt(i, this.dummy.matrix);
          }
        }
      }
      this.landMesh.instanceMatrix.needsUpdate = true;
      this.carMesh.instanceMatrix.needsUpdate = true;
      this.treeDebrisMesh.instanceMatrix.needsUpdate = true;
      if (this.carMesh.instanceColor) this.carMesh.instanceColor.needsUpdate = true;
      return;
    }

    // =========================================================================
    // MODE C: STAGE 4 (62s-136s) -> Sculpted Synthwave Titans + 2-Lane Clawed Hand Stomps
    // =========================================================================
    if (state.titanMode) {
      if (this.activeMode !== 'titans') {
        this.activeMode = 'titans';
        this.layoutHandStomps(-58, 44);
      }
      this.titanGroup.visible = true;
      this.handMesh.visible = true;
      this.handZoneMesh.visible = true;
      this.titanShaderMat.uniforms.uTime.value = state.runElapsed;

      for (let tIdx = 0; tIdx < this.titans.length; tIdx++) {
        const fig = this.titans[tIdx];
        fig.position.y = -1.5 + Math.sin(state.runElapsed * 1.4 + tIdx * Math.PI) * 1.1;
      }

      const handStepZ = Math.max(42, state.speed * 0.88);
      for (let i = 0; i < MAX_HAND_STOMPS; i++) {
        const h = this.handStomps[i];
        h.z += state.speed * worldDt;
        if (h.hitCooldown > 0) h.hitCooldown -= worldDt;

        if (h.z > 12) {
          // Find the furthest active hand stomp and place this one strictly `handStepZ` behind it on the opposite side
          let furthestHandZ = -50;
          let furthestIsLeft = !h.isLeft;
          for (let j = 0; j < MAX_HAND_STOMPS; j++) {
            if (j !== i && this.handStomps[j].z < furthestHandZ) {
              furthestHandZ = this.handStomps[j].z;
              furthestIsLeft = this.handStomps[j].isLeft;
            }
          }
          h.z = furthestHandZ - handStepZ;
          h.isLeft = !furthestIsLeft;
          h.x = h.isLeft ? -1.5 : 1.5;
          h.coveredLanes = h.isLeft ? [0, 1] : [1, 2];
          h.exitLane = h.isLeft ? 2 : 0;
          h.active = true;
          h.grazed = false;
          h.hitCooldown = 0;
        }

        const slamT = THREE.MathUtils.clamp((h.z + 28) / 22, 0, 1);
        const dropY = THREE.MathUtils.lerp(7.5, 0.0, slamT * slamT);

        if (h.active && h.hitCooldown <= 0 && Math.abs(h.z) < 2.15 && dropY < 1.4 && cat.y < 1.8) {
          if (h.coveredLanes.includes(cat.laneIndex) || Math.abs(cat.x - h.x) < 2.65) {
            h.hitCooldown = 1.0;
            h.active = false;
            h.grazed = true;
            if (phaseProtected) {
              if (onPhase) onPhase();
            } else {
              cat.applyImpactSlowdown(false);
              if (onHit) onHit();
            }
          }
        }

        if (h.active && !h.grazed && h.z > 1.2 && h.z < 4.5 && cat.laneIndex === h.exitLane) {
          h.grazed = true;
          if (onGraze) onGraze(LANES[h.exitLane], 0.9);
        }

        if (h.active) {
          this.dummy.position.set(h.x, dropY, h.z);
          this.dummy.rotation.set(0, 0, 0);
          this.dummy.scale.set(h.isLeft ? 1 : -1, 1, 1);
          this.dummy.updateMatrix();
          this.handMesh.setMatrixAt(i, this.dummy.matrix);

          this.dummy.position.set(h.x, 0.03, h.z);
          this.dummy.rotation.set(0, 0, 0);
          this.dummy.scale.set(1.0, 1.0, 1.0);
          this.dummy.updateMatrix();
          this.handZoneMesh.setMatrixAt(i, this.dummy.matrix);
        } else {
          this.hideInstance(this.handMesh, i);
          this.hideInstance(this.handZoneMesh, i);
        }
      }
      this.handMesh.instanceMatrix.needsUpdate = true;
      this.handZoneMesh.instanceMatrix.needsUpdate = true;
      return;
    }

    // =========================================================================
    // MODE D: 2ND OVERCLOCK (136s-142s) -> Slowed Yellow High-Energy Plasma Beams
    //         & POST-OVERCLOCK (142s+) -> Pitch-Black Void Beams w/ Red Fresnel Rim & Voltage!
    // =========================================================================
    if (this.activeMode !== 'pillars') {
      this.activeMode = 'pillars';
      this.layoutWavePool('pillars', this.pillars, this.pillarLimit, -54, 34);
    }
    this.pillarCoreMesh.visible = true;
    this.pillarOutlineMesh.visible = true;
    this.chargeRingMesh.visible = true;

    const darkBeamMode = state.stage2BurstActive ? 0.0 : 1.0;
    const beamClock = state.runElapsed;
    this.beamCoreMat.uniforms.uTime.value = beamClock;
    this.beamCoreMat.uniforms.uDarkMode.value = darkBeamMode;
    this.beamCoronaMat.uniforms.uTime.value = beamClock;
    this.beamCoronaMat.uniforms.uDarkMode.value = darkBeamMode;
    this.chargeRingMat.uniforms.uTime.value = beamClock;
    this.chargeRingMat.uniforms.uDarkMode.value = darkBeamMode;

    const pillarStepZ = Math.max(32, state.speed * 0.62);
    for (let i = 0; i < this.pillarLimit; i++) {
      const p = this.pillars[i];
      p.z += state.speed * worldDt;
      p.phase += worldDt * 9.5;
      if (p.hitCooldown > 0) p.hitCooldown -= worldDt;

      if (p.z > 10) {
        this.assignNextWaveSlot(p, this.pillars, this.pillarLimit, 'pillars', pillarStepZ);
      }

      if (p.active && p.hitCooldown <= 0 && Math.abs(p.z) < 1.05 && cat.y < 3.0) {
        if (p.lane === cat.laneIndex || Math.abs(p.x - cat.x) < 1.0) {
          p.hitCooldown = 1.0;
          p.active = false;
          p.grazed = true;
          if (phaseProtected) {
            if (onPhase) onPhase();
          } else {
            cat.applyImpactSlowdown(state.overdriveMode);
            if (onHit) onHit();
          }
        }
      }

      if (p.active && !p.grazed && p.z > 0.3 && p.z < 3.6 && Math.abs(p.lane - cat.laneIndex) === 1) {
        p.grazed = true;
        if (onGraze) onGraze(p.x, 0.9);
      }

      if (
        p.active &&
        p.hitCooldown <= 0 &&
        state.tearCount >= 5 &&
        lily &&
        lily.group.visible &&
        Math.abs(p.z - lily.z) < 1.05 &&
        Math.abs(p.x - lily.x) < 1.0
      ) {
        p.hitCooldown = 1.0;
        p.active = false;
        if (!phaseProtected) {
          lily.applyImpactSlowdown(state.overdriveMode);
          if (onLilyHit) onLilyHit(lily.x, lily.z);
        }
      }

      if (p.active) {
        // High-frequency energy beam radial pulse
        const beamPulse = 1.0 + Math.sin(p.phase * 1.8) * 0.08;
        this.dummy.position.set(p.x, 0, p.z);
        this.dummy.rotation.set(0, p.phase * 0.25, 0);
        this.dummy.scale.set(beamPulse, 1.0, beamPulse);
        this.dummy.updateMatrix();
        this.pillarCoreMesh.setMatrixAt(i, this.dummy.matrix);

        const coronaPulse = 1.0 + Math.cos(p.phase * 2.2) * 0.14;
        this.dummy.rotation.set(0, -p.phase * 0.35, 0);
        this.dummy.scale.set(coronaPulse, 1.0, coronaPulse);
        this.dummy.updateMatrix();
        this.pillarOutlineMesh.setMatrixAt(i, this.dummy.matrix);

        // Ground impact scorch & radial voltage flare
        const flareScale = 0.95 + Math.sin(p.phase * 2.5) * 0.16;
        this.dummy.position.set(p.x, 0, p.z);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.set(flareScale, 1.0, flareScale);
        this.dummy.updateMatrix();
        this.chargeRingMesh.setMatrixAt(i, this.dummy.matrix);
      } else {
        this.hideInstance(this.pillarCoreMesh, i);
        this.hideInstance(this.pillarOutlineMesh, i);
        this.hideInstance(this.chargeRingMesh, i);
      }
    }
    this.pillarCoreMesh.instanceMatrix.needsUpdate = true;
    this.pillarOutlineMesh.instanceMatrix.needsUpdate = true;
    this.chargeRingMesh.instanceMatrix.needsUpdate = true;
  }

  getObstaclesRef() {
    return {
      vehicles: this.carMesh.visible ? this.vehicles : [],
      debris: this.landMesh.visible ? this.debris : [],
      handStomps: this.handMesh.visible ? this.handStomps : [],
      pillars: this.pillarCoreMesh.visible ? this.pillars : []
    };
  }
}
