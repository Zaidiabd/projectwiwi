import * as THREE from 'three';
import { buildLilyCatAtlas } from './LilyCatAtlas.js';
import { CatAnimator } from './CatAnimator.js';
import { RUN_DURATION_SECONDS, TARGET_CATCH_DISTANCE } from '../core/GameState.js';

const LILY_VERT = /* glsl */ `
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

const LILY_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uRimColor;
  uniform float uRimIntensity;
  uniform vec2 uTexelSize;
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    if (tex.a < 0.04) discard;
    float aUp = texture2D(uMap, vUv + vec2(0.0, uTexelSize.y * 2.0)).a;
    float edge = clamp(1.0 - aUp, 0.0, 1.0);
    vec3 color = tex.rgb + uRimColor * edge * uRimIntensity * tex.a;
    gl_FragColor = vec4(color, tex.a);
  }
`;

function createShadowTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  g.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  g.addColorStop(0.55, 'rgba(2, 6, 16, 0.35)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  return tex;
}

export class LilyController {
  constructor(scene) {
    this.scene = scene;
    const { texture, manifest } = buildLilyCatAtlas();
    this.atlasTexture = texture;
    this.manifest = manifest;
    this.animator = new CatAnimator(manifest);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Bigger, fluffy long-haired silhouette (~1.45x taller than Wiwi)
    const planeW = 2.95;
    const planeH = 2.3;
    const geom = new THREE.PlaneGeometry(planeW, planeH);
    geom.translate(0, planeH * (0.5 - manifest.groundPivotY), 0);

    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this.atlasTexture },
        uUvRect: { value: new THREE.Vector4(0, 0, 1, 1) },
        uRimColor: { value: new THREE.Color('#cbd5e1') },
        uRimIntensity: { value: 0.35 },
        uTexelSize: { value: new THREE.Vector2(1 / manifest.atlasWidth, 1 / manifest.atlasHeight) }
      },
      vertexShader: LILY_VERT,
      fragmentShader: LILY_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.spriteMesh = new THREE.Mesh(geom, this.mat);
    this.spriteMesh.renderOrder = 9;
    this.group.add(this.spriteMesh);

    this.shadowTex = createShadowTexture();
    const shadowGeom = new THREE.PlaneGeometry(1.95, 1.35);
    shadowGeom.rotateX(-Math.PI / 2);
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: this.shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.68
    });
    this.shadowMesh = new THREE.Mesh(shadowGeom, this.shadowMat);
    this.shadowMesh.position.y = 0.014;
    this.group.add(this.shadowMesh);

    this.reset();
  }

  reset() {
    this.x = 5.8;
    this.y = 0;
    this.z = -0.8;
    this.vy = 0;
    this.group.visible = false;
    this.group.position.set(this.x, 0, this.z);
    this.spriteMesh.position.y = 0;
    this.animator.play('run_rear', { restart: true });
    this.syncUV();
  }

  /**
   * Lily joins the chase at TEAR V (142s -> 216s), bounding alongside Wiwi
   * and pulling ahead or trailing slightly based on Wiwi's threshold pace!
   */
  updateChase(playerDt, cat, state, laserX) {
    if (state.tearCount < 5 || state.phase !== 'playing') {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;
    const smooth = 1 - Math.exp(-5.0 * playerDt);

    // Keep Lily cleanly offset to the side of Wiwi while tracking the laser dot
    const sideOffset = cat.x >= 0 ? -1.85 : 1.85;
    const desiredX = THREE.MathUtils.clamp(laserX * 0.65 + sideOffset, -4.6, 4.6);
    this.x += (desiredX - this.x) * smooth;

    // Rivalry Z-lead: if Wiwi is behind the 14,000m pace, Lily edges slightly ahead!
    const expectedDist = (state.runElapsed / RUN_DURATION_SECONDS) * TARGET_CATCH_DISTANCE;
    const paceRatio = (state.distance - expectedDist) / 900; // + ahead, - behind
    const desiredZ = THREE.MathUtils.clamp(-0.6 - paceRatio * 1.1, -2.0, 0.85);
    this.z += (desiredZ - this.z) * (1 - Math.exp(-3.0 * playerDt));

    this.animator.play('run_rear');
    this.animator.setPlaybackRate(0.85 + state.normalizedSpeed * 1.0);
    this.animator.update(playerDt);

    this.mat.uniforms.uRimColor.value.set('#ff2a4b');
    this.mat.uniforms.uRimIntensity.value = 0.62;
    this.group.position.set(this.x, 0, this.z);
    this.spriteMesh.position.y = 0;
    this.shadowMesh.scale.setScalar(1.0);
    this.syncUV();
  }

  triggerLeap(vy = 9.5) {
    this.vy = vy;
  }

  updateEnding(dt, step, wiwiWon, endingTimer) {
    this.group.visible = true;
    const smooth = 1 - Math.exp(-5.0 * dt);

    if (step === 0) {
      // Lily leaps through the final rift alongside Wiwi!
      this.vy -= 20 * dt;
      this.y = Math.max(0, this.y + this.vy * dt);
      this.x += (1.35 - this.x) * smooth;
      this.z += (-0.8 - this.z) * smooth;
      this.animator.play('run_rear');
    } else if (step === 1) {
      this.y = 0;
      this.x += (1.35 - this.x) * smooth;
      this.z += (-0.85 - this.z) * smooth;
      this.animator.play('trot');
    } else if (step === 2) {
      // Both cats square off over the red laser dot in the quiet room!
      this.x += (1.25 - this.x) * smooth;
      this.z += (-0.7 - this.z) * smooth;
      this.animator.play('trot');
    } else if (step === 3) {
      if (wiwiWon) {
        this.x += (1.55 - this.x) * smooth;
        this.z += (-0.45 - this.z) * smooth;
        this.animator.play('shocked');
      } else {
        this.x += (0.25 - this.x) * (1 - Math.exp(-7 * dt));
        this.z += (-0.25 - this.z) * (1 - Math.exp(-7 * dt));
        this.animator.play('pounce');
      }
    } else {
      if (wiwiWon) {
        this.x += (1.55 - this.x) * smooth;
        this.z += (-0.45 - this.z) * smooth;
        this.animator.play('sulking');
      } else {
        this.x += (0.25 - this.x) * smooth;
        this.z += (-0.25 - this.z) * smooth;
        this.animator.play('sit_smug');
      }
    }

    this.animator.setPlaybackRate(1.0);
    this.animator.update(dt);

    this.mat.uniforms.uRimColor.value.set('#cbd5e1');
    this.mat.uniforms.uRimIntensity.value = 0.35;
    this.group.position.set(this.x, 0, this.z);
    this.spriteMesh.position.y = this.y;
    this.shadowMesh.scale.setScalar(Math.max(0.45, 1 - this.y * 0.14));
    this.syncUV();
  }

  syncUV() {
    const r = this.animator.getCurrentUVRect();
    this.mat.uniforms.uUvRect.value.set(r.u0, r.v0, r.u1, r.v1);
  }
}
