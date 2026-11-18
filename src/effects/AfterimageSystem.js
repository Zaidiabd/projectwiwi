import * as THREE from 'three';

const MAX_POOL = 24;

const AFTERIMAGE_VERT = /* glsl */ `
  varying vec2 vUv;
  uniform vec4 uUvRect;
  void main() {
    vUv = vec2(
      mix(uUvRect.x, uUvRect.z, uv.x),
      mix(uUvRect.y, uUvRect.w, uv.y)
    );
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const AFTERIMAGE_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uTint;
  uniform float uOpacity;
  uniform float uStreak;
  varying vec2 vUv;

  void main() {
    float a = texture2D(uMap, vUv).a;
    if (uStreak > 0.01) {
      // Multi-tap supersonic speed-streak smear along the sprite
      a = a * 0.45
        + texture2D(uMap, vUv + vec2(0.008 * uStreak, -0.004 * uStreak)).a * 0.30
        + texture2D(uMap, vUv - vec2(0.008 * uStreak,  0.004 * uStreak)).a * 0.25;
    }
    if (a < 0.05) discard;
    gl_FragColor = vec4(uTint, a * uOpacity);
  }
`;

export class AfterimageSystem {
  constructor(scene, catTexture, groundPivotY) {
    this.scene = scene;
    this.activeLimit = 16;
    this.spawnTimer = 0;

    const geom = new THREE.PlaneGeometry(2.4, 1.46);
    geom.translate(0, 1.46 * (0.5 - groundPivotY), 0);
    this.sharedGeom = geom;

    this.pool = [];
    this.cursor = 0;
    this.colorCycle = 0;

    for (let i = 0; i < MAX_POOL; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: catTexture },
          uUvRect: { value: new THREE.Vector4(0, 0, 1, 1) },
          uTint: { value: new THREE.Color('#22e6ff') },
          uOpacity: { value: 0 },
          uStreak: { value: 0 }
        },
        vertexShader: AFTERIMAGE_VERT,
        fragmentShader: AFTERIMAGE_FRAG,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(this.sharedGeom, mat);
      mesh.visible = false;
      mesh.renderOrder = 8;
      this.scene.add(mesh);

      this.pool.push({
        mesh,
        mat,
        active: false,
        life: 0,
        maxLife: 0.35,
        speedMult: 0.65
      });
    }
  }

  setQualityCount(count) {
    this.activeLimit = Math.min(MAX_POOL, count + 4);
  }

  reset() {
    this.spawnTimer = 0;
    for (const p of this.pool) {
      p.active = false;
      p.mesh.visible = false;
    }
  }

  update(worldDt, cat, state) {
    const anyBurst = state.burstActive || state.stage2BurstActive;
    const shouldEmit =
      state.phase === 'playing' &&
      (state.actIndex >= 2 || state.isBoosting || anyBurst || state.saiyanMode) &&
      state.speed > 18;

    if (shouldEmit) {
      const interval = state.saiyanMode
        ? 0.018
        : anyBurst
          ? 0.028
          : state.actIndex >= 2
            ? 0.044
            : 0.072;
      this.spawnTimer += worldDt;
      if (this.spawnTimer >= interval) {
        this.spawnTimer = 0;
        this.spawn(cat, state);
      }
    }

    for (let i = 0; i < MAX_POOL; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= worldDt;
      p.mesh.position.z += state.speed * p.speedMult * worldDt;

      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
      } else {
        const t = p.life / p.maxLife;
        p.mat.uniforms.uOpacity.value = t * (state.saiyanMode ? 0.68 : 0.55);
      }
    }
  }

  spawn(cat, state) {
    const idx = this.cursor % this.activeLimit;
    this.cursor++;
    const p = this.pool[idx];

    const r = cat.getCurrentUVRect();
    p.mat.uniforms.uUvRect.value.set(r.u0, r.v0, r.u1, r.v1);
    this.colorCycle = (this.colorCycle + 1) % 3;

    let tint = this.colorCycle % 2 === 0 ? '#22e6ff' : '#9333ea';
    if (state.saiyanMode) {
      // Distinct supersonic light-yellow, crimson-red, and electric-blue speed ghosts
      tint =
        this.colorCycle === 0
          ? '#fef08a'
          : this.colorCycle === 1
            ? '#ff2a4b'
            : '#38bdf8';
      p.mat.uniforms.uStreak.value = 1.65;
      p.mesh.scale.set(1.36, 0.86, 1);
      p.speedMult = 1.18;
      p.maxLife = 0.28;
    } else {
      p.mat.uniforms.uStreak.value = 0.0;
      p.mesh.scale.set(1, 1, 1);
      p.speedMult = 0.65;
      p.maxLife = state.stage2BurstActive || state.burstActive ? 0.48 : 0.34;

      if (state.stage2BurstActive || (state.burstActive && state.burstStage === 2)) {
        tint = this.colorCycle % 2 === 0 ? '#ffbe3b' : '#ff2a85';
      } else if (state.burstActive) {
        tint = '#38f3ff';
      } else if (state.tearCount >= 5) {
        tint = this.colorCycle % 2 === 0 ? '#ff2a4b' : '#a855f7';
      } else if (state.anomalyMode) {
        tint = this.colorCycle % 2 === 0 ? '#2dd4bf' : '#e879f9';
      }
    }

    p.mat.uniforms.uTint.value.set(tint);
    p.mesh.position.set(
      cat.x + (state.saiyanMode ? (Math.random() - 0.5) * 0.14 : 0),
      cat.y,
      0.06
    );
    p.mesh.rotation.z = cat.bankAngle;
    p.mesh.visible = true;
    p.active = true;
    p.life = p.maxLife;
    p.mat.uniforms.uOpacity.value = state.saiyanMode ? 0.68 : 0.55;
  }
}
