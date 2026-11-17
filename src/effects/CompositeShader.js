export const CompositeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uSpeedBlur: { value: 0.0 },
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
    uniform float uSpeedBlur;
    uniform float uChromatic;
    uniform float uVignette;
    uniform float uFlash;

    varying vec2 vUv;

    void main() {
      vec2 center = vec2(0.5, 0.48);
      vec2 dir = vUv - center;
      float dist = length(dir);

      // Edge-weighted radial blur (keeps center cat & route crisp)
      float edgeMask = smoothstep(0.18, 0.85, dist);
      vec2 blurStep = dir * uSpeedBlur * edgeMask * 0.032;

      vec3 accum = vec3(0.0);
      if (uSpeedBlur > 0.01) {
        accum += texture2D(tDiffuse, vUv).rgb * 0.4;
        accum += texture2D(tDiffuse, vUv - blurStep * 0.5).rgb * 0.3;
        accum += texture2D(tDiffuse, vUv - blurStep).rgb * 0.3;
      } else {
        accum = texture2D(tDiffuse, vUv).rgb;
      }

      // Subtle chromatic aberration near edges at high overclock / rupture speed
      if (uChromatic > 0.0005) {
        vec2 caOffset = dir * uChromatic * edgeMask;
        float r = texture2D(tDiffuse, vUv + caOffset).r;
        float b = texture2D(tDiffuse, vUv - caOffset).b;
        accum.r = mix(accum.r, r, 0.7);
        accum.b = mix(accum.b, b, 0.7);
      }

      // Restrained vignette
      float vig = smoothstep(0.95, 0.35, dist);
      accum *= mix(1.0 - uVignette, 1.0, vig);

      // Climax rift flash
      accum = mix(accum, vec3(0.92, 0.98, 1.0), clamp(uFlash, 0.0, 1.0));

      gl_FragColor = vec4(accum, 1.0);
    }
  `
};
