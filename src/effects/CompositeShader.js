import * as THREE from 'three';

export const CompositeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uSpeedBlur: { value: 0.0 },
    uSpeedLines: { value: 0.0 },
    uSpeedLineColor: { value: new THREE.Color('#22e6ff') },
    uRipple: { value: 0.0 },
    uChromatic: { value: 0.0 },
    uVignette: { value: 0.25 },
    uFlash: { value: 0.0 },
    uCrackAmount: { value: 0.0 },
    uShatterProgress: { value: 0.0 }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uSpeedBlur;
    uniform float uSpeedLines;
    uniform vec3 uSpeedLineColor;
    uniform float uRipple;
    uniform float uChromatic;
    uniform float uVignette;
    uniform float uFlash;
    uniform float uCrackAmount;
    uniform float uShatterProgress;

    varying vec2 vUv;

    float hash11(float p) {
      return fract(sin(p * 127.1) * 43758.5453);
    }

    vec2 hash22(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.xx + p3.yz) * p3.zy);
    }

    // Returns (edgeDist, cellIdHash, shardOffsetVec.x, shardOffsetVec.y)
    vec4 voronoiCrack(vec2 x) {
      vec2 n = floor(x);
      vec2 f = fract(x);

      vec2 mg = vec2(0.0);
      vec2 mr = vec2(0.0);
      float md = 8.0;
      vec2 bestCell = vec2(0.0);

      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = hash22(n + g);
          vec2 r = g + o - f;
          float d = dot(r, r);
          if (d < md) {
            md = d;
            mr = r;
            mg = g;
            bestCell = n + g;
          }
        }
      }

      // Second pass for distance to exact Voronoi border line
      md = 8.0;
      for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
          vec2 g = mg + vec2(float(i), float(j));
          vec2 o = hash22(n + g);
          vec2 r = g + o - f;
          if (dot(mr - r, mr - r) > 0.00001) {
            md = min(md, dot(0.5 * (mr + r), normalize(r - mr)));
          }
        }
      }

      vec2 h = hash22(bestCell);
      return vec4(md, h.x, mr.x, mr.y);
    }

    void main() {
      vec2 center = vec2(0.5, 0.48);
      vec2 dir = vUv - center;
      float dist = length(dir);
      vec2 normDir = dist > 0.0001 ? dir / dist : vec2(0.0);

      // Tear-breach shock-ripple distortion
      vec2 sampleUv = vUv;
      if (uRipple > 0.005) {
        float wave = sin(dist * 34.0 - uTime * 22.0) * exp(-dist * 2.8);
        sampleUv += normDir * wave * uRipple * 0.022;
      }

      // Compute Voronoi glass fracture pattern (used for both progressive cracks & final smash)
      float crackLine = 0.0;
      vec4 vData = vec4(1.0);
      if (uCrackAmount > 0.005 || uShatterProgress > 0.001) {
        vec2 aspectUv = (vUv - center) * vec2(1.45, 1.0) * 5.2 + vec2(3.7, 1.9);
        vData = voronoiCrack(aspectUv);
        float edgeD = vData.x;

        // Progressive cracks creep inward bit-by-bit from corners/perimeter as uCrackAmount rises
        float reach = mix(0.76, 0.0, clamp(uCrackAmount, 0.0, 1.0));
        float crackZone = smoothstep(reach - 0.14, reach + 0.16, dist);
        // Deterministic stagger per cell so new individual fractures snap in across tears
        float cellGate = step(vData.y, clamp(uCrackAmount * 1.15, 0.0, 1.0));
        float seam = 1.0 - smoothstep(0.0, 0.028 + uCrackAmount * 0.014, edgeD);
        crackLine = seam * crackZone * cellGate;

        // Subtle glass refraction along cracked shard faces
        sampleUv += vData.zw * crackZone * uCrackAmount * 0.008;

        // Full screen smash after both cats jump into final Act V!
        if (uShatterProgress > 0.001 && uShatterProgress < 0.995) {
          float shatterFade = 1.0 - smoothstep(0.45, 1.0, uShatterProgress);
          float explode = pow(uShatterProgress, 0.72);
          vec2 shardFly = (normDir + (hash22(vec2(vData.y * 19.3, vData.y * 7.1)) - 0.5) * 0.9) * explode * 0.24;
          sampleUv = clamp(sampleUv + shardFly * shatterFade, 0.002, 0.998);
          float smashSeam = 1.0 - smoothstep(0.0, 0.045, edgeD);
          crackLine = max(crackLine, smashSeam * shatterFade * 1.25);
        }
      }

      // Edge-weighted radial blur (keeps center cat & route crisp)
      float edgeMask = smoothstep(0.18, 0.85, dist);
      vec2 blurStep = dir * uSpeedBlur * edgeMask * 0.032;

      vec3 accum = vec3(0.0);
      if (uSpeedBlur > 0.01) {
        accum += texture2D(tDiffuse, sampleUv).rgb * 0.4;
        accum += texture2D(tDiffuse, sampleUv - blurStep * 0.5).rgb * 0.3;
        accum += texture2D(tDiffuse, sampleUv - blurStep).rgb * 0.3;
      } else {
        accum = texture2D(tDiffuse, sampleUv).rgb;
      }

      // Subtle chromatic aberration near edges at high overclock / rupture speed
      if (uChromatic > 0.0005) {
        vec2 caOffset = dir * uChromatic * edgeMask;
        float r = texture2D(tDiffuse, sampleUv + caOffset).r;
        float b = texture2D(tDiffuse, sampleUv - caOffset).b;
        accum.r = mix(accum.r, r, 0.72);
        accum.b = mix(accum.b, b, 0.72);
      }

      // Anime radial speed lines around perimeter (zero extra draw calls!)
      if (uSpeedLines > 0.01) {
        float angle = atan(dir.y, dir.x);
        float sector = floor(angle * 42.0);
        float rnd = hash11(sector + floor(uTime * 24.0) * 0.37);
        float streak = smoothstep(0.84, 0.985, rnd);
        float radialMask = smoothstep(0.32, 0.78, dist);
        accum += uSpeedLineColor * streak * radialMask * uSpeedLines * 0.55;
      }

      // Restrained vignette
      float vig = smoothstep(0.95, 0.35, dist);
      accum *= mix(1.0 - uVignette, 1.0, vig);

      // Luminous crystalline glass fracture veins + prismatic glints
      if (crackLine > 0.01) {
        vec3 crackGlow = mix(uSpeedLineColor, vec3(0.95, 0.99, 1.0), 0.65);
        accum = mix(accum, crackGlow, clamp(crackLine * 0.88, 0.0, 0.95));
      }

      // Climax / breach flash
      accum = mix(accum, vec3(0.94, 0.98, 1.0), clamp(uFlash, 0.0, 1.0));

      gl_FragColor = vec4(accum, 1.0);
    }
  `
};
