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
    uFlash: { value: 0.0 }
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

    varying vec2 vUv;

    float hash11(float p) {
      return fract(sin(p * 127.1) * 43758.5453);
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

      // Climax / breach flash
      accum = mix(accum, vec3(0.94, 0.98, 1.0), clamp(uFlash, 0.0, 1.0));

      gl_FragColor = vec4(accum, 1.0);
    }
  `
};
