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
  uniform float uOverdrive;
  uniform vec2 uTexelSize;
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    if (tex.a < 0.04) discard;
    float aUp = texture2D(uMap, vUv + vec2(0.0, uTexelSize.y * 2.0)).a;
    float edge = clamp(1.0 - aUp, 0.0, 1.0);
    vec3 baseCol = tex.rgb;
    if (uOverdrive > 0.01) {
      // Keep natural black-and-white fur intact while blasting emerald/magenta overdrive plasma highlights
      float luma = dot(baseCol, vec3(0.299, 0.587, 0.114));
      float highlightMask = smoothstep(0.18, 0.72, luma);
      vec3 overdriveTint = mix(vec3(0.20, 0.92, 0.65), vec3(1.0, 0.25, 0.52), edge);
      baseCol = mix(baseCol, baseCol * 1.15 + overdriveTint * 0.34, highlightMask * uOverdrive * 0.72);
      baseCol += vec3(0.20, 0.92, 0.68) * edge * 0.55 * uOverdrive;
    }
    vec3 color = baseCol + uRimColor * edge * uRimIntensity * tex.a;
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

function createLilyOverdriveAuraTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);

  ctx.save();
  ctx.translate(128, 140);

  const grad = ctx.createRadialGradient(0, 0, 12, 0, -10, 118);
  grad.addColorStop(0.0, 'rgba(209, 250, 229, 0.95)');
  grad.addColorStop(0.34, 'rgba(52, 211, 153, 0.78)');
  grad.addColorStop(0.68, 'rgba(244, 63, 94, 0.44)');
  grad.addColorStop(1.0, 'rgba(16, 185, 129, 0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, -10, 118, 0, Math.PI * 2);
  ctx.fill();

  // Jagged emerald-magenta plasma flame tongues
  const spikes = 16;
  for (let i = 0; i < spikes; i++) {
    const ang = -Math.PI + (i / (spikes - 1)) * Math.PI + (Math.random() - 0.5) * 0.14;
    const len = 76 + Math.random() * 48;
    const w = 13 + Math.random() * 14;
    ctx.save();
    ctx.rotate(ang + Math.PI / 2);
    const fGrad = ctx.createLinearGradient(0, 0, 0, -len);
    fGrad.addColorStop(0.0, 'rgba(167, 243, 208, 0.92)');
    fGrad.addColorStop(0.5, i % 2 === 0 ? 'rgba(52, 211, 153, 0.56)' : 'rgba(251, 113, 133, 0.48)');
    fGrad.addColorStop(1.0, 'rgba(52, 211, 153, 0.0)');
    ctx.fillStyle = fGrad;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.quadraticCurveTo(-w * 0.25, -len * 0.6, 0, -len);
    ctx.quadraticCurveTo(w * 0.25, -len * 0.6, w, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

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
        uOverdrive: { value: 0.0 },
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

    this.auraTex = createLilyOverdriveAuraTexture();
    const auraGeom = new THREE.PlaneGeometry(3.6, 3.2);
    auraGeom.translate(0, 1.32, 0);
    this.auraMat = new THREE.MeshBasicMaterial({
      map: this.auraTex,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.auraMesh = new THREE.Mesh(auraGeom, this.auraMat);
    this.auraMesh.position.z = 0.08;
    this.auraMesh.renderOrder = 8;
    this.auraMesh.visible = false;
    this.group.add(this.auraMesh);

    // Orbital overdrive energy ring around Lily (179s+)
    const ringGeom = new THREE.RingGeometry(1.18, 1.42, 36);
    this.overdriveRingMat = new THREE.MeshBasicMaterial({
      color: '#34d399',
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.overdriveRingMesh = new THREE.Mesh(ringGeom, this.overdriveRingMat);
    this.overdriveRingMesh.position.set(0, 0.95, 0.06);
    this.overdriveRingMesh.rotation.x = Math.PI * 0.36;
    this.overdriveRingMesh.renderOrder = 10;
    this.overdriveRingMesh.visible = false;
    this.group.add(this.overdriveRingMesh);

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
    this.overdrivePhase = 0;
    this.group.visible = false;
    this.group.position.set(this.x, 0, this.z);
    this.spriteMesh.position.y = 0;
    this.mat.uniforms.uOverdrive.value = 0;
    if (this.auraMesh) {
      this.auraMesh.visible = false;
      this.auraMat.opacity = 0;
    }
    if (this.overdriveRingMesh) {
      this.overdriveRingMesh.visible = false;
    }
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

    const overdrive = state.overdriveMode ? 1.0 : 0.0;
    this.overdrivePhase += playerDt * 18.0;
    this.mat.uniforms.uOverdrive.value += (overdrive - this.mat.uniforms.uOverdrive.value) * (1 - Math.exp(-8 * playerDt));

    if (overdrive > 0.5) {
      this.mat.uniforms.uRimColor.value.set(Math.sin(this.overdrivePhase) > 0 ? '#34d399' : '#ff2a4b');
      this.mat.uniforms.uRimIntensity.value = 1.15 + 0.28 * Math.sin(this.overdrivePhase * 1.4);
      this.auraMesh.visible = true;
      const sx = 1.04 + 0.12 * Math.sin(this.overdrivePhase * 1.6);
      const sy = 1.08 + 0.16 * Math.cos(this.overdrivePhase * 2.1);
      this.auraMesh.scale.set(sx, sy, 1);
      this.auraMat.opacity = 0.72 + 0.22 * Math.sin(this.overdrivePhase * 2.5);

      this.overdriveRingMesh.visible = true;
      this.overdriveRingMesh.rotation.z -= playerDt * 7.2;
      this.overdriveRingMesh.rotation.y = Math.cos(this.overdrivePhase * 0.35) * 0.4;
      this.overdriveRingMesh.scale.setScalar(1.0 + Math.sin(this.overdrivePhase * 1.5) * 0.12);
      this.overdriveRingMat.color.set(Math.sin(this.overdrivePhase) > 0 ? '#34d399' : '#fb7185');
    } else {
      this.mat.uniforms.uRimColor.value.set('#ff2a4b');
      this.mat.uniforms.uRimIntensity.value = 0.62;
      this.auraMesh.visible = false;
      this.auraMat.opacity = 0;
      this.overdriveRingMesh.visible = false;
    }
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

    this.mat.uniforms.uOverdrive.value = step === 0 ? Math.max(0, 1 - endingTimer * 0.4) : 0;
    this.auraMesh.visible = step === 0 && this.mat.uniforms.uOverdrive.value > 0.1;
    this.auraMat.opacity = this.mat.uniforms.uOverdrive.value * 0.6;
    this.overdriveRingMesh.visible = false;
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
