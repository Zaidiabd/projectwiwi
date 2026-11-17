import * as THREE from 'three';

const MAX_POOL = 20;

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
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    if (tex.a < 0.06) discard;
    gl_FragColor = vec4(uTint, tex.a * uOpacity);
  }
`;

export class AfterimageSystem {
  constructor(scene, catTexture, groundPivotY) {
    this.scene = scene;
    this.activeLimit = 14;
    this.spawnTimer = 0;

    const geom = new THREE.PlaneGeometry(2.4, 1.46);
    geom.translate(0, 1.46 * (0.5 - groundPivotY), 0);
    this.sharedGeom = geom;

    this.pool = [];
    this.cursor = 0;
    this.toggleColor = false;

    for (let i = 0; i < MAX_POOL; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: catTexture },
          uUvRect: { value: new THREE.Vector4(0, 0, 1, 1) },
          uTint: { value: new THREE.Color('#22e6ff') },
          uOpacity: { value: 0 }
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
        maxLife: 0.35
      });
    }
  }

  setQualityCount(count) {
    this.activeLimit = Math.min(MAX_POOL, count);
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
      (state.actIndex >= 2 || state.isBoosting || anyBurst) &&
      state.speed > 18;

    if (shouldEmit) {
      const interval = anyBurst ? 0.028 : state.actIndex >= 2 ? 0.044 : 0.072;
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
      p.mesh.position.z += state.speed * 0.65 * worldDt;

      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
      } else {
        const t = p.life / p.maxLife;
        p.mat.uniforms.uOpacity.value = t * 0.55;
      }
    }
  }

  spawn(cat, state) {
    const idx = this.cursor % this.activeLimit;
    this.cursor++;
    const p = this.pool[idx];

    const r = cat.getCurrentUVRect();
    p.mat.uniforms.uUvRect.value.set(r.u0, r.v0, r.u1, r.v1);
    this.toggleColor = !this.toggleColor;

    let tint = this.toggleColor ? '#22e6ff' : '#9333ea';
    if (state.stage2BurstActive || (state.burstActive && state.burstStage === 2)) {
      tint = this.toggleColor ? '#ffbe3b' : '#ff2a85';
    } else if (state.burstActive) {
      tint = '#38f3ff';
    } else if (state.tearCount >= 5) {
      tint = this.toggleColor ? '#ff2a4b' : '#a855f7';
    } else if (state.anomalyMode) {
      tint = this.toggleColor ? '#2dd4bf' : '#e879f9';
    }

    p.mat.uniforms.uTint.value.set(tint);

    p.mesh.position.set(cat.x, cat.y, 0.05);
    p.mesh.rotation.z = cat.bankAngle;
    p.mesh.visible = true;
    p.active = true;
    p.maxLife = state.stage2BurstActive || state.burstActive ? 0.48 : 0.34;
    p.life = p.maxLife;
    p.mat.uniforms.uOpacity.value = 0.55;
  }
}
