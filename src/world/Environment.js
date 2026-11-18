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

function mergeSimpleParts(parts, defaultColor = '#cbd5e1') {
  const posArrays = [];
  const normArrays = [];
  const colArrays = [];
  const indices = [];
  let vertOffset = 0;
  const tmpColor = new THREE.Color();

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
    const vCount = g.attributes.position.count;
    tmpColor.set(part.color || defaultColor);
    const col = new Float32Array(vCount * 3);
    for (let i = 0; i < vCount; i++) {
      col[i * 3] = tmpColor.r;
      col[i * 3 + 1] = tmpColor.g;
      col[i * 3 + 2] = tmpColor.b;
    }
    posArrays.push(pos);
    normArrays.push(norm);
    colArrays.push(col);
    if (g.index) {
      const idx = g.index.array;
      for (let i = 0; i < idx.length; i++) indices.push(idx[i] + vertOffset);
    } else {
      for (let i = 0; i < vCount; i++) indices.push(i + vertOffset);
    }
    vertOffset += vCount;
    g.dispose();
  }

  const totalPos = posArrays.reduce((s, a) => s + a.length, 0);
  const mergedPos = new Float32Array(totalPos);
  const mergedNorm = new Float32Array(totalPos);
  const mergedCol = new Float32Array(totalPos);
  let off = 0;
  for (let i = 0; i < posArrays.length; i++) {
    mergedPos.set(posArrays[i], off);
    mergedNorm.set(normArrays[i], off);
    mergedCol.set(colArrays[i], off);
    off += posArrays[i].length;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
  merged.setAttribute('color', new THREE.BufferAttribute(mergedCol, 3));
  merged.setIndex(indices);
  return merged;
}

/**
 * 1. Strolling Couple Holding Hands (Partner A in Cobalt Overcoat + Partner B in Rose Trench Dress & Beret)
 */
function createCoupleGeometry() {
  return mergeSimpleParts([
    // --- Partner A (Left, x = -0.27) ---
    // Shoes
    { geom: new THREE.CapsuleGeometry(0.052, 0.11, 5, 10), pos: [-0.36, 0.055, 0.08], rot: [Math.PI / 2, 0, 0], color: '#0f172a' },
    { geom: new THREE.CapsuleGeometry(0.052, 0.11, 5, 10), pos: [-0.18, 0.055, -0.05], rot: [Math.PI / 2, 0, 0], color: '#0f172a' },
    // Tailored navy trousers (thighs + calves)
    { geom: new THREE.CapsuleGeometry(0.068, 0.36, 6, 12), pos: [-0.36, 0.30, 0.05], rot: [0.18, 0, 0], color: '#1e293b' },
    { geom: new THREE.CapsuleGeometry(0.068, 0.36, 6, 12), pos: [-0.18, 0.30, -0.05], rot: [-0.18, 0, 0], color: '#1e293b' },
    // Cobalt wool overcoat torso + flared coat hem + cream turtleneck collar
    { geom: new THREE.CylinderGeometry(0.15, 0.19, 0.56, 14), pos: [-0.27, 0.80, 0], scale: [1.08, 1.0, 0.78], color: '#2563eb' },
    { geom: new THREE.SphereGeometry(0.16, 12, 10), pos: [-0.27, 1.04, 0], scale: [1.14, 0.55, 0.82], color: '#1d4ed8' },
    { geom: new THREE.CylinderGeometry(0.075, 0.085, 0.10, 10), pos: [-0.27, 1.16, 0.01], color: '#f8fafc' },
    // Neck, sculpted head, nose & wavy espresso hair
    { geom: new THREE.CylinderGeometry(0.055, 0.062, 0.08, 10), pos: [-0.27, 1.22, 0.01], color: '#f1c27d' },
    { geom: new THREE.SphereGeometry(0.145, 14, 12), pos: [-0.27, 1.36, 0.02], scale: [0.94, 1.06, 0.96], color: '#f1c27d' },
    { geom: new THREE.SphereGeometry(0.028, 8, 8), pos: [-0.27, 1.35, 0.16], color: '#e0ac69' },
    { geom: new THREE.SphereGeometry(0.152, 14, 12), pos: [-0.27, 1.41, -0.01], scale: [0.98, 0.88, 1.02], color: '#271c19' },
    { geom: new THREE.CapsuleGeometry(0.048, 0.12, 5, 10), pos: [-0.27, 1.49, 0.06], rot: [0.2, 0, Math.PI / 2], color: '#271c19' },
    // Outer left arm + hand
    { geom: new THREE.CapsuleGeometry(0.052, 0.34, 5, 10), pos: [-0.47, 0.84, -0.03], rot: [-0.22, 0, 0.14], color: '#2563eb' },
    { geom: new THREE.SphereGeometry(0.044, 8, 8), pos: [-0.51, 0.64, -0.09], color: '#f1c27d' },
    // Inner right arm angled inward to hold Partner B's hand!
    { geom: new THREE.CapsuleGeometry(0.050, 0.34, 5, 10), pos: [-0.09, 0.85, 0.04], rot: [0.16, 0, -0.46], color: '#2563eb' },

    // --- Clasped Hands in the Center (x = 0.0, y = 0.70, z = 0.08) ---
    { geom: new THREE.SphereGeometry(0.052, 10, 10), pos: [0.0, 0.70, 0.08], scale: [1.25, 0.9, 1.0], color: '#f3c68f' },

    // --- Partner B (Right, x = +0.27) ---
    // Ankle boots
    { geom: new THREE.CapsuleGeometry(0.046, 0.10, 5, 10), pos: [0.19, 0.05, -0.05], rot: [Math.PI / 2, 0, 0], color: '#1c1917' },
    { geom: new THREE.CapsuleGeometry(0.046, 0.10, 5, 10), pos: [0.35, 0.05, 0.07], rot: [Math.PI / 2, 0, 0], color: '#1c1917' },
    // Sculpted calves
    { geom: new THREE.CapsuleGeometry(0.054, 0.34, 6, 10), pos: [0.19, 0.28, -0.04], rot: [-0.16, 0, 0], color: '#f5cba7' },
    { geom: new THREE.CapsuleGeometry(0.054, 0.34, 6, 10), pos: [0.35, 0.28, 0.04], rot: [0.16, 0, 0], color: '#f5cba7' },
    // Flared A-line Rose Trench Dress + waist belt + cream scarf
    { geom: new THREE.CylinderGeometry(0.12, 0.24, 0.56, 16), pos: [0.27, 0.74, 0], scale: [1.05, 1.0, 0.82], color: '#e11d48' },
    { geom: new THREE.TorusGeometry(0.135, 0.024, 8, 16), pos: [0.27, 0.82, 0], rot: [Math.PI / 2, 0, 0], scale: [1.05, 0.82, 1.0], color: '#fda4af' },
    { geom: new THREE.SphereGeometry(0.145, 12, 10), pos: [0.27, 0.98, 0], scale: [1.08, 0.62, 0.80], color: '#e11d48' },
    { geom: new THREE.TorusGeometry(0.088, 0.032, 8, 14), pos: [0.27, 1.11, 0.01], rot: [Math.PI / 2, 0, 0], color: '#fef2f2' },
    // Head, flowing chestnut hair & tilted French beret
    { geom: new THREE.SphereGeometry(0.135, 14, 12), pos: [0.27, 1.28, 0.02], scale: [0.92, 1.04, 0.94], color: '#f5cba7' },
    { geom: new THREE.SphereGeometry(0.024, 8, 8), pos: [0.27, 1.27, 0.15], color: '#e5b58d' },
    { geom: new THREE.CapsuleGeometry(0.095, 0.18, 6, 12), pos: [0.27, 1.22, -0.05], scale: [1.15, 1.0, 0.85], color: '#451a03' },
    { geom: new THREE.SphereGeometry(0.145, 12, 10), pos: [0.29, 1.39, 0.0], rot: [0, 0, -0.22], scale: [1.12, 0.42, 1.08], color: '#be123c' },
    // Inner left arm reaching across to Partner A's hand
    { geom: new THREE.CapsuleGeometry(0.045, 0.32, 5, 10), pos: [0.10, 0.82, 0.04], rot: [0.16, 0, 0.46], color: '#e11d48' },
    // Outer right arm + boutique shopping bag
    { geom: new THREE.CapsuleGeometry(0.045, 0.30, 5, 10), pos: [0.44, 0.82, 0.03], rot: [0.20, 0, -0.15], color: '#e11d48' },
    { geom: new THREE.SphereGeometry(0.040, 8, 8), pos: [0.48, 0.64, 0.08], color: '#f5cba7' },
    { geom: new THREE.BoxGeometry(0.08, 0.24, 0.20), pos: [0.51, 0.46, 0.08], color: '#fef08a' },
    { geom: new THREE.TorusGeometry(0.045, 0.010, 6, 12), pos: [0.51, 0.60, 0.08], rot: [0, Math.PI / 2, 0], color: '#f43f5e' }
  ]);
}

/**
 * 2. Elderly Gentleman with Fedora Hat, Gold Spectacles, Bushy White Mustache & Wooden Walking Cane
 */
function createOldManGeometry() {
  return mergeSimpleParts([
    // Polished brown loafers
    { geom: new THREE.CapsuleGeometry(0.054, 0.12, 5, 10), pos: [-0.11, 0.055, 0.06], rot: [Math.PI / 2, 0, 0], color: '#271c19' },
    { geom: new THREE.CapsuleGeometry(0.054, 0.12, 5, 10), pos: [0.11, 0.055, -0.04], rot: [Math.PI / 2, 0, 0], color: '#271c19' },
    // Pleated charcoal-taupe slacks
    { geom: new THREE.CapsuleGeometry(0.070, 0.34, 6, 12), pos: [-0.11, 0.28, 0.04], rot: [0.14, 0, 0], color: '#475569' },
    { geom: new THREE.CapsuleGeometry(0.070, 0.34, 6, 12), pos: [0.11, 0.28, -0.03], rot: [-0.14, 0, 0], color: '#475569' },
    // Slightly stooped tweed cardigan torso + cream dress shirt front + crimson bowtie
    { geom: new THREE.CapsuleGeometry(0.175, 0.38, 8, 14), pos: [0, 0.78, 0.04], rot: [0.24, 0, 0], scale: [1.08, 1.0, 0.86], color: '#78350f' },
    { geom: new THREE.CapsuleGeometry(0.11, 0.28, 6, 10), pos: [0, 0.82, 0.14], rot: [0.24, 0, 0], scale: [0.85, 1.0, 0.45], color: '#fef3c7' },
    { geom: new THREE.CapsuleGeometry(0.028, 0.075, 4, 8), pos: [0, 1.01, 0.19], rot: [0, 0, Math.PI / 2], color: '#dc2626' },
    // Forward-stooped head, prominent nose, silver-white side hair & bushy handlebar mustache
    { geom: new THREE.SphereGeometry(0.15, 14, 12), pos: [0, 1.20, 0.14], scale: [0.95, 1.04, 0.98], color: '#f1c27d' },
    { geom: new THREE.SphereGeometry(0.036, 8, 8), pos: [0, 1.18, 0.29], color: '#e0ac69' },
    // Bushy white mustache
    { geom: new THREE.CapsuleGeometry(0.028, 0.085, 5, 10), pos: [-0.038, 1.13, 0.27], rot: [0, 0.25, 1.35], color: '#f8fafc' },
    { geom: new THREE.CapsuleGeometry(0.028, 0.085, 5, 10), pos: [0.038, 1.13, 0.27], rot: [0, -0.25, -1.35], color: '#f8fafc' },
    // Gold-rimmed spectacles
    { geom: new THREE.TorusGeometry(0.034, 0.008, 6, 12), pos: [-0.052, 1.21, 0.27], color: '#fbbf24' },
    { geom: new THREE.TorusGeometry(0.034, 0.008, 6, 12), pos: [0.052, 1.21, 0.27], color: '#fbbf24' },
    // Fluffy silver-white side/back hair fringe
    { geom: new THREE.TorusGeometry(0.135, 0.038, 8, 16, Math.PI * 1.25), pos: [0, 1.22, 0.12], rot: [Math.PI / 2, 0, 2.5], color: '#e2e8f0' },
    // Classic brimmed Fedora hat (dark brown felt brim + ribbon band + pinched crown)
    { geom: new THREE.CylinderGeometry(0.22, 0.23, 0.025, 16), pos: [0, 1.31, 0.14], rot: [0.10, 0, 0], scale: [0.96, 1.0, 1.12], color: '#451a03' },
    { geom: new THREE.CylinderGeometry(0.135, 0.145, 0.045, 14), pos: [0, 1.34, 0.14], rot: [0.10, 0, 0], color: '#d97706' },
    { geom: new THREE.CylinderGeometry(0.115, 0.135, 0.11, 14), pos: [0, 1.40, 0.13], rot: [0.10, 0, 0], scale: [0.92, 1.0, 1.06], color: '#451a03' },
    // Left arm folded politely behind his lower back
    { geom: new THREE.CapsuleGeometry(0.052, 0.26, 5, 10), pos: [-0.21, 0.84, -0.02], rot: [-0.45, 0, 0.25], color: '#78350f' },
    { geom: new THREE.CapsuleGeometry(0.048, 0.22, 5, 10), pos: [-0.11, 0.68, -0.14], rot: [0.15, 0, 1.25], color: '#78350f' },
    // Right arm extended forward gripping the wooden walking cane
    { geom: new THREE.CapsuleGeometry(0.052, 0.26, 5, 10), pos: [0.21, 0.86, 0.12], rot: [0.65, 0, -0.15], color: '#78350f' },
    { geom: new THREE.CapsuleGeometry(0.046, 0.22, 5, 10), pos: [0.22, 0.72, 0.28], rot: [1.05, 0, 0], color: '#78350f' },
    { geom: new THREE.SphereGeometry(0.045, 8, 8), pos: [0.22, 0.66, 0.39], color: '#f1c27d' },
    // Sculpted Wooden Walking Cane (shaft + curved crook handle + brass collar + rubber tip)
    { geom: new THREE.CylinderGeometry(0.018, 0.014, 0.66, 8), pos: [0.22, 0.33, 0.41], rot: [0.06, 0, 0], color: '#92400e' },
    { geom: new THREE.CylinderGeometry(0.021, 0.021, 0.04, 8), pos: [0.22, 0.62, 0.40], color: '#fbbf24' },
    { geom: new THREE.TorusGeometry(0.042, 0.017, 8, 12, Math.PI), pos: [0.22, 0.66, 0.37], rot: [0, Math.PI / 2, 0], color: '#451a03' },
    { geom: new THREE.SphereGeometry(0.020, 8, 8), pos: [0.22, 0.02, 0.43], color: '#111827' }
  ]);
}

/**
 * 3. Neighborhood Postman with Peaked Postal Visor Cap, Crossbody Leather Mail Satchel & Stamped Letter
 */
function createPostmanGeometry() {
  return mergeSimpleParts([
    // Black postal oxford shoes + white crew socks
    { geom: new THREE.CapsuleGeometry(0.054, 0.12, 5, 10), pos: [-0.11, 0.055, 0.10], rot: [Math.PI / 2, 0, 0], color: '#111827' },
    { geom: new THREE.CapsuleGeometry(0.054, 0.12, 5, 10), pos: [0.11, 0.055, -0.08], rot: [Math.PI / 2, 0, 0], color: '#111827' },
    { geom: new THREE.CylinderGeometry(0.050, 0.048, 0.12, 10), pos: [-0.11, 0.14, 0.06], rot: [0.22, 0, 0], color: '#f8fafc' },
    { geom: new THREE.CylinderGeometry(0.050, 0.048, 0.12, 10), pos: [0.11, 0.14, -0.06], rot: [-0.22, 0, 0], color: '#f8fafc' },
    // Calves + navy postal shorts + belt
    { geom: new THREE.CapsuleGeometry(0.056, 0.22, 6, 10), pos: [-0.11, 0.28, 0.04], rot: [0.24, 0, 0], color: '#e0ac69' },
    { geom: new THREE.CapsuleGeometry(0.056, 0.22, 6, 10), pos: [0.11, 0.28, -0.04], rot: [-0.24, 0, 0], color: '#e0ac69' },
    { geom: new THREE.CapsuleGeometry(0.076, 0.20, 6, 10), pos: [-0.11, 0.48, 0.02], rot: [0.16, 0, 0], color: '#1e3a8a' },
    { geom: new THREE.CapsuleGeometry(0.076, 0.20, 6, 10), pos: [0.11, 0.48, -0.02], rot: [-0.16, 0, 0], color: '#1e3a8a' },
    { geom: new THREE.CylinderGeometry(0.165, 0.175, 0.16, 14), pos: [0, 0.58, 0], scale: [1.06, 1.0, 0.80], color: '#1e3a8a' },
    { geom: new THREE.CylinderGeometry(0.172, 0.172, 0.045, 14), pos: [0, 0.65, 0], scale: [1.06, 1.0, 0.82], color: '#111827' },
    // Sky-blue postal uniform shirt + navy tie + gold postal badge + shoulder epaulets
    { geom: new THREE.CapsuleGeometry(0.168, 0.36, 8, 14), pos: [0, 0.88, 0], scale: [1.10, 1.0, 0.78], color: '#0284c7' },
    { geom: new THREE.BoxGeometry(0.042, 0.28, 0.025), pos: [0, 0.90, 0.135], color: '#1e3a8a' },
    { geom: new THREE.SphereGeometry(0.028, 8, 8), pos: [-0.085, 0.98, 0.135], scale: [1.0, 1.2, 0.4], color: '#fde047' },
    { geom: new THREE.BoxGeometry(0.09, 0.025, 0.06), pos: [-0.16, 1.11, 0], color: '#0369a1' },
    { geom: new THREE.BoxGeometry(0.09, 0.025, 0.06), pos: [0.16, 1.11, 0], color: '#0369a1' },
    // Crossbody leather mail satchel strap + plump leather mailbag at right hip + white envelopes peeking out!
    { geom: new THREE.CylinderGeometry(0.178, 0.178, 0.045, 14), pos: [0, 0.88, 0], rot: [0, 0, 0.68], scale: [1.12, 1.0, 0.82], color: '#78350f' },
    { geom: new THREE.CapsuleGeometry(0.095, 0.18, 6, 12), pos: [0.23, 0.64, -0.02], rot: [Math.PI / 2, 0, 0], scale: [0.75, 1.0, 1.15], color: '#92400e' },
    { geom: new THREE.BoxGeometry(0.13, 0.12, 0.24), pos: [0.24, 0.71, -0.02], rot: [0, 0, -0.15], color: '#78350f' },
    { geom: new THREE.SphereGeometry(0.022, 8, 8), pos: [0.30, 0.65, -0.02], color: '#fbbf24' },
    { geom: new THREE.BoxGeometry(0.03, 0.10, 0.16), pos: [0.23, 0.76, 0.02], rot: [0.1, 0, 0.1], color: '#ffffff' },
    // Head + Peaked Postal Visor Cap (royal blue crown + gold band + glossy black visor brim)
    { geom: new THREE.CylinderGeometry(0.055, 0.062, 0.08, 10), pos: [0, 1.16, 0.01], color: '#e0ac69' },
    { geom: new THREE.SphereGeometry(0.145, 14, 12), pos: [0, 1.30, 0.02], scale: [0.95, 1.05, 0.96], color: '#e0ac69' },
    { geom: new THREE.SphereGeometry(0.030, 8, 8), pos: [0, 1.29, 0.16], color: '#d19a56' },
    { geom: new THREE.CylinderGeometry(0.152, 0.142, 0.09, 14), pos: [0, 1.41, 0.01], rot: [-0.08, 0, 0], color: '#0369a1' },
    { geom: new THREE.CylinderGeometry(0.145, 0.145, 0.028, 14), pos: [0, 1.37, 0.01], rot: [-0.08, 0, 0], color: '#fbbf24' },
    { geom: new THREE.SphereGeometry(0.022, 8, 8), pos: [0, 1.41, 0.155], color: '#fde047' },
    { geom: new THREE.CylinderGeometry(0.142, 0.142, 0.020, 14), pos: [0, 1.36, 0.10], rot: [0.18, 0, 0], scale: [0.92, 1.0, 0.85], color: '#090d16' },
    // Left arm raised holding a white stamped letter/parcel!
    { geom: new THREE.CapsuleGeometry(0.052, 0.24, 5, 10), pos: [-0.23, 0.94, 0.06], rot: [0.45, 0, 0.18], color: '#0284c7' },
    { geom: new THREE.CapsuleGeometry(0.045, 0.20, 5, 10), pos: [-0.24, 0.86, 0.22], rot: [1.25, 0, -0.15], color: '#e0ac69' },
    { geom: new THREE.BoxGeometry(0.18, 0.12, 0.022), pos: [-0.21, 0.90, 0.34], rot: [-0.25, 0.25, 0.12], color: '#ffffff' },
    { geom: new THREE.BoxGeometry(0.038, 0.038, 0.026), pos: [-0.16, 0.93, 0.35], rot: [-0.25, 0.25, 0.12], color: '#ef4444' },
    // Right arm swinging back near mail satchel
    { geom: new THREE.CapsuleGeometry(0.052, 0.30, 5, 10), pos: [0.24, 0.88, -0.05], rot: [-0.28, 0, -0.18], color: '#0284c7' },
    { geom: new THREE.SphereGeometry(0.044, 8, 8), pos: [0.28, 0.70, -0.12], color: '#e0ac69' }
  ]);
}

/**
 * 4. Athletic Jogger with Sweatband, Over-Ear Headphones, Ponytail & Sports Water Bottle
 */
function createJoggerGeometry() {
  return mergeSimpleParts([
    // Coral-orange marathon running shoes + white cushion soles
    { geom: new THREE.CapsuleGeometry(0.054, 0.13, 5, 10), pos: [-0.11, 0.06, 0.14], rot: [Math.PI / 2 - 0.18, 0, 0], color: '#f97316' },
    { geom: new THREE.CapsuleGeometry(0.054, 0.13, 5, 10), pos: [0.11, 0.09, -0.14], rot: [Math.PI / 2 + 0.32, 0, 0], color: '#f97316' },
    // Athletic calves & thighs + sleek black running shorts
    { geom: new THREE.CapsuleGeometry(0.056, 0.32, 6, 10), pos: [-0.11, 0.28, 0.08], rot: [0.36, 0, 0], color: '#e0ac69' },
    { geom: new THREE.CapsuleGeometry(0.056, 0.32, 6, 10), pos: [0.11, 0.28, -0.08], rot: [-0.38, 0, 0], color: '#e0ac69' },
    { geom: new THREE.CylinderGeometry(0.155, 0.168, 0.18, 14), pos: [0, 0.56, 0], scale: [1.05, 1.0, 0.78], color: '#0f172a' },
    // Emerald-teal athletic tech singlet + mint racing stripe
    { geom: new THREE.CapsuleGeometry(0.158, 0.36, 8, 14), pos: [0, 0.86, 0.02], rot: [0.12, 0, 0], scale: [1.08, 1.0, 0.76], color: '#10b981' },
    { geom: new THREE.BoxGeometry(0.05, 0.34, 0.025), pos: [0, 0.88, 0.14], rot: [0.12, 0, 0], color: '#a7f3d0' },
    // Head, crimson sweatband, bouncing high ponytail & over-ear wireless headphones
    { geom: new THREE.SphereGeometry(0.14, 14, 12), pos: [0, 1.28, 0.05], scale: [0.94, 1.05, 0.96], color: '#e0ac69' },
    { geom: new THREE.SphereGeometry(0.144, 12, 10), pos: [0, 1.33, 0.02], scale: [0.96, 0.82, 1.0], color: '#1c1917' },
    { geom: new THREE.TorusGeometry(0.136, 0.022, 8, 16), pos: [0, 1.34, 0.05], rot: [Math.PI / 2 - 0.12, 0, 0], color: '#ef4444' },
    { geom: new THREE.CapsuleGeometry(0.048, 0.18, 5, 10), pos: [0, 1.32, -0.16], rot: [-0.65, 0, 0], color: '#1c1917' },
    // Over-ear wireless headphones (cyan earcups + white arch band)
    { geom: new THREE.CylinderGeometry(0.048, 0.048, 0.036, 10), pos: [-0.145, 1.29, 0.05], rot: [0, 0, Math.PI / 2], color: '#38bdf8' },
    { geom: new THREE.CylinderGeometry(0.048, 0.048, 0.036, 10), pos: [0.145, 1.29, 0.05], rot: [0, 0, Math.PI / 2], color: '#38bdf8' },
    { geom: new THREE.TorusGeometry(0.148, 0.015, 6, 14, Math.PI), pos: [0, 1.30, 0.05], color: '#f8fafc' },
    // Bent 90-degree runner arms + cyan hydration bottle in right hand
    { geom: new THREE.CapsuleGeometry(0.048, 0.22, 5, 10), pos: [-0.21, 0.94, -0.04], rot: [-0.35, 0, 0.16], color: '#e0ac69' },
    { geom: new THREE.CapsuleGeometry(0.044, 0.20, 5, 10), pos: [-0.22, 0.82, 0.10], rot: [1.15, 0, 0], color: '#e0ac69' },
    { geom: new THREE.CapsuleGeometry(0.048, 0.22, 5, 10), pos: [0.21, 0.94, 0.06], rot: [0.42, 0, -0.16], color: '#e0ac69' },
    { geom: new THREE.CapsuleGeometry(0.044, 0.20, 5, 10), pos: [0.22, 0.86, 0.22], rot: [1.35, 0, 0], color: '#e0ac69' },
    { geom: new THREE.CylinderGeometry(0.036, 0.036, 0.16, 10), pos: [0.22, 0.90, 0.32], rot: [0.35, 0, 0], color: '#38bdf8' }
  ]);
}

/**
 * 5. Casual Neighborhood Walker with Mustard Hoodie, Commuter Backpack, Beanie & Takeout Coffee Cup
 */
function createCasualWalkerGeometry() {
  return mergeSimpleParts([
    // Crisp white street sneakers + cuffed indigo denim jeans
    { geom: new THREE.CapsuleGeometry(0.054, 0.12, 5, 10), pos: [-0.11, 0.055, 0.08], rot: [Math.PI / 2, 0, 0], color: '#f8fafc' },
    { geom: new THREE.CapsuleGeometry(0.054, 0.12, 5, 10), pos: [0.11, 0.055, -0.06], rot: [Math.PI / 2, 0, 0], color: '#f8fafc' },
    { geom: new THREE.CapsuleGeometry(0.068, 0.36, 6, 12), pos: [-0.11, 0.30, 0.04], rot: [0.20, 0, 0], color: '#1d4ed8' },
    { geom: new THREE.CapsuleGeometry(0.068, 0.36, 6, 12), pos: [0.11, 0.30, -0.04], rot: [-0.20, 0, 0], color: '#1d4ed8' },
    // Mustard-gold pullover hoodie + rolled hood collar
    { geom: new THREE.CapsuleGeometry(0.172, 0.38, 8, 14), pos: [0, 0.84, 0], scale: [1.10, 1.0, 0.80], color: '#eab308' },
    { geom: new THREE.TorusGeometry(0.105, 0.042, 8, 14), pos: [0, 1.13, -0.02], rot: [Math.PI / 2 + 0.2, 0, 0], color: '#ca8a04' },
    // Sculpted charcoal commuter backpack + outer pocket on back
    { geom: new THREE.CapsuleGeometry(0.135, 0.22, 6, 12), pos: [0, 0.88, -0.18], scale: [1.05, 1.0, 0.65], color: '#334155' },
    { geom: new THREE.BoxGeometry(0.20, 0.16, 0.06), pos: [0, 0.82, -0.25], color: '#1e293b' },
    // Head + knitted burgundy beanie cap
    { geom: new THREE.SphereGeometry(0.145, 14, 12), pos: [0, 1.30, 0.02], scale: [0.95, 1.05, 0.96], color: '#f1c27d' },
    { geom: new THREE.SphereGeometry(0.028, 8, 8), pos: [0, 1.29, 0.16], color: '#e0ac69' },
    { geom: new THREE.SphereGeometry(0.152, 12, 10), pos: [0, 1.38, -0.01], rot: [-0.18, 0, 0], scale: [0.98, 0.86, 1.02], color: '#9f1239' },
    { geom: new THREE.SphereGeometry(0.038, 8, 8), pos: [0, 1.49, -0.06], color: '#be123c' },
    // Left arm holding takeout coffee cup with kraft cardboard sleeve!
    { geom: new THREE.CapsuleGeometry(0.054, 0.24, 5, 10), pos: [-0.23, 0.90, 0.05], rot: [0.35, 0, 0.15], color: '#eab308' },
    { geom: new THREE.CapsuleGeometry(0.048, 0.20, 5, 10), pos: [-0.22, 0.82, 0.20], rot: [1.28, 0, -0.12], color: '#eab308' },
    { geom: new THREE.CylinderGeometry(0.042, 0.032, 0.12, 10), pos: [-0.20, 0.88, 0.31], color: '#ffffff' },
    { geom: new THREE.CylinderGeometry(0.044, 0.038, 0.055, 10), pos: [-0.20, 0.88, 0.31], color: '#b45309' },
    // Right arm swinging casually
    { geom: new THREE.CapsuleGeometry(0.054, 0.32, 5, 10), pos: [0.23, 0.84, -0.04], rot: [-0.24, 0, -0.15], color: '#eab308' },
    { geom: new THREE.SphereGeometry(0.044, 8, 8), pos: [0.26, 0.65, -0.10], color: '#f1c27d' }
  ]);
}

/**
 * 6. Refined Multi-Tone Neighborhood Dog (Facing +Z with Red Collar, Gold Bell Tag, Cream Bib & Paws)
 */
function createRefinedDogGeometry() {
  return mergeSimpleParts([
    // Ribcage, waist & haunches (facing +Z)
    { geom: new THREE.CapsuleGeometry(0.145, 0.36, 8, 14), pos: [0, 0.35, 0], rot: [Math.PI / 2, 0, 0], scale: [0.95, 1.0, 1.05], color: '#d97706' },
    { geom: new THREE.SphereGeometry(0.135, 10, 10), pos: [0, 0.36, 0.16], scale: [1.0, 1.05, 1.1], color: '#fef3c7' },
    // Neck + Red Collar + Gold Bell Tag
    { geom: new THREE.CapsuleGeometry(0.095, 0.16, 6, 12), pos: [0, 0.47, 0.24], rot: [-0.62, 0, 0], color: '#d97706' },
    { geom: new THREE.TorusGeometry(0.098, 0.022, 8, 14), pos: [0, 0.46, 0.25], rot: [Math.PI / 2 - 0.62, 0, 0], color: '#ef4444' },
    { geom: new THREE.SphereGeometry(0.026, 8, 8), pos: [0, 0.39, 0.34], color: '#fbbf24' },
    // Cranium, cream snout, black nose button, eyes & perky ears
    { geom: new THREE.SphereGeometry(0.122, 12, 10), pos: [0, 0.56, 0.33], color: '#d97706' },
    { geom: new THREE.CapsuleGeometry(0.058, 0.11, 6, 10), pos: [0, 0.53, 0.44], rot: [Math.PI / 2, 0, 0], color: '#fef3c7' },
    { geom: new THREE.SphereGeometry(0.026, 8, 8), pos: [0, 0.55, 0.52], color: '#111827' },
    { geom: new THREE.ConeGeometry(0.046, 0.14, 8), pos: [-0.072, 0.68, 0.31], rot: [-0.18, 0, 0.18], color: '#92400e' },
    { geom: new THREE.ConeGeometry(0.046, 0.14, 8), pos: [0.072, 0.68, 0.31], rot: [-0.18, 0, -0.18], color: '#92400e' },
    // Upward-curled wagging tail with white tip (at -Z)
    { geom: new THREE.CapsuleGeometry(0.034, 0.20, 5, 10), pos: [0, 0.49, -0.30], rot: [0.72, 0, 0], color: '#d97706' },
    { geom: new THREE.SphereGeometry(0.038, 8, 8), pos: [0, 0.58, -0.38], color: '#fef3c7' },
    // 4 Articulated Legs + Cream Paws
    { geom: new THREE.CapsuleGeometry(0.042, 0.20, 5, 10), pos: [-0.09, 0.16, 0.19], rot: [0.22, 0, 0], color: '#d97706' },
    { geom: new THREE.SphereGeometry(0.045, 8, 8), pos: [-0.09, 0.04, 0.22], scale: [0.9, 0.65, 1.2], color: '#fef3c7' },
    { geom: new THREE.CapsuleGeometry(0.042, 0.20, 5, 10), pos: [0.09, 0.16, 0.19], rot: [-0.22, 0, 0], color: '#d97706' },
    { geom: new THREE.SphereGeometry(0.045, 8, 8), pos: [0.09, 0.04, 0.16], scale: [0.9, 0.65, 1.2], color: '#fef3c7' },
    { geom: new THREE.CapsuleGeometry(0.046, 0.20, 5, 10), pos: [-0.09, 0.16, -0.19], rot: [-0.22, 0, 0], color: '#d97706' },
    { geom: new THREE.SphereGeometry(0.045, 8, 8), pos: [-0.09, 0.04, -0.22], scale: [0.9, 0.65, 1.2], color: '#fef3c7' },
    { geom: new THREE.CapsuleGeometry(0.046, 0.20, 5, 10), pos: [0.09, 0.16, -0.19], rot: [0.22, 0, 0], color: '#d97706' },
    { geom: new THREE.SphereGeometry(0.045, 8, 8), pos: [0.09, 0.04, -0.16], scale: [0.9, 0.65, 1.2], color: '#fef3c7' }
  ]);
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

    // Roadside Neighborhood Group (Strolling Couples, Old Men w/ Canes, Postmen, Joggers, Walkers, Dogs, Trees, Streetlamps)
    this.roadsideGroup = new THREE.Group();
    this.scene.add(this.roadsideGroup);

    this.personMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#0f172a',
      emissiveIntensity: 0.16,
      roughness: 0.58,
      vertexColors: true
    });

    const archetypeDefs = [
      { key: 'couple', geom: createCoupleGeometry(), count: 4, strideSpeed: 1.35, cadence: 3.4, bounceAmp: 0.04, lean: 0.0 },
      { key: 'oldMan', geom: createOldManGeometry(), count: 4, strideSpeed: 0.85, cadence: 2.8, bounceAmp: 0.03, lean: 0.08 },
      { key: 'postman', geom: createPostmanGeometry(), count: 4, strideSpeed: 2.55, cadence: 5.2, bounceAmp: 0.07, lean: 0.04 },
      { key: 'jogger', geom: createJoggerGeometry(), count: 4, strideSpeed: 5.4, cadence: 9.6, bounceAmp: 0.15, lean: 0.16 },
      { key: 'walker', geom: createCasualWalkerGeometry(), count: 4, strideSpeed: 1.85, cadence: 4.2, bounceAmp: 0.05, lean: 0.02 }
    ];

    this.passerbyGroups = [];
    let globalPersonIdx = 0;
    const totalPassersby = archetypeDefs.reduce((s, d) => s + d.count, 0);

    for (const def of archetypeDefs) {
      const mesh = new THREE.InstancedMesh(def.geom, this.personMat, def.count);
      mesh.frustumCulled = false;
      this.roadsideGroup.add(mesh);

      const items = Array.from({ length: def.count }, (_, idx) => {
        const slot = globalPersonIdx++;
        return {
          side: slot % 2 === 0 ? -1 : 1,
          xOff: def.key === 'couple' ? 5.95 : 5.35 + (slot % 3) * 0.72,
          z: -slot * 8.5 - idx * 3.2,
          wrapSpan: totalPassersby * 8.5,
          strideSpeed: def.strideSpeed,
          cadence: def.cadence,
          bounceAmp: def.bounceAmp,
          lean: def.lean,
          phase: slot * 1.15
        };
      });

      this.passerbyGroups.push({ key: def.key, mesh, items });
    }
    this.personMesh = this.passerbyGroups[0].mesh;

    const dogGeom = createRefinedDogGeometry();
    this.dogMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#1e1b18',
      emissiveIntensity: 0.14,
      roughness: 0.68,
      vertexColors: true
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
      // Zero diffuse + pure white emissive renders every vertex-colored archetype as a crisp white silhouette!
      this.personMat.color.set('#000000');
      this.personMat.emissive.set('#ffffff');
      this.personMat.emissiveIntensity = 1.15;
      this.dogMat.color.set('#000000');
      this.dogMat.emissive.set('#ffffff');
      this.dogMat.emissiveIntensity = 1.15;
      this.treeMat.color.set('#ffffff');
      this.treeMat.emissive.set('#ffffff');
      this.treeMat.emissiveIntensity = 0.92;
      this.lampMat.color.set('#ffffff');
      this.lampMat.emissive.set('#ffffff');
      this.lampMat.emissiveIntensity = 0.95;
    } else {
      this.personMat.color.set('#ffffff');
      this.personMat.emissive.set('#0f172a');
      this.personMat.emissiveIntensity = 0.16;
      this.dogMat.color.set('#ffffff');
      this.dogMat.emissive.set('#1e1b18');
      this.dogMat.emissiveIntensity = 0.14;
      this.treeMat.color.set('#166534');
      this.treeMat.emissive.set('#052e16');
      this.treeMat.emissiveIntensity = 0.15;
      this.lampMat.color.set('#475569');
      this.lampMat.emissive.set('#fde68a');
      this.lampMat.emissiveIntensity = 0.75;
    }

    for (let gIdx = 0; gIdx < this.passerbyGroups.length; gIdx++) {
      const grp = this.passerbyGroups[gIdx];
      for (let i = 0; i < grp.items.length; i++) {
        const p = grp.items[i];
        p.z += (speed + p.strideSpeed) * worldDt;
        p.phase += worldDt * p.cadence;
        if (p.z > 10) p.z -= p.wrapSpan;
        const bounce = Math.abs(Math.sin(p.phase)) * p.bounceAmp;
        const sway = Math.sin(p.phase) * 0.035;
        this.dummy.position.set(p.side * p.xOff, bounce, p.z);
        // Face oncoming (+Z) with a slight inward angle toward the road so all front details are visible
        this.dummy.rotation.set(p.lean, -p.side * 0.16, sway);
        this.dummy.scale.setScalar(1.0);
        this.dummy.updateMatrix();
        grp.mesh.setMatrixAt(i, this.dummy.matrix);
      }
      grp.mesh.instanceMatrix.needsUpdate = true;
    }

    for (let i = 0; i < DOG_COUNT; i++) {
      const d = this.dogs[i];
      d.z += (speed + 3.2) * worldDt;
      d.phase += worldDt * 11.0;
      if (d.z > 10) d.z -= DOG_COUNT * 14.5;
      const bounce = Math.abs(Math.sin(d.phase)) * 0.11;
      const pitch = Math.cos(d.phase) * 0.08;
      this.dummy.position.set(d.side * d.xOff, bounce, d.z);
      this.dummy.rotation.set(pitch, -d.side * 0.12, 0);
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
