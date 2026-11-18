import * as THREE from 'three';
import { buildLilyCatAtlas } from './LilyCatAtlas.js';
import { buildProceduralCatAtlas } from './ProceduralCatAtlas.js';
import { CatAnimator } from './CatAnimator.js';
import { LANES, getExpectedRivalDistance } from '../core/GameState.js';

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
    this.lilyAtlas = buildLilyCatAtlas();
    this.wiwiAtlas = buildProceduralCatAtlas();
    this.characterId = 'lily';
    const { texture, manifest } = this.lilyAtlas;
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
    const auraGeom = new THREE.PlaneGeometry(3.2, 2.8);
    auraGeom.translate(0, 1.25, 0);
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

  setCharacter(charId = 'lily') {
    this.characterId = charId === 'wiwi' ? 'wiwi' : 'lily';
    const bundle = this.characterId === 'wiwi' ? this.wiwiAtlas : this.lilyAtlas;
    this.atlasTexture = bundle.texture;
    this.manifest = bundle.manifest;
    this.animator = new CatAnimator(bundle.manifest);
    this.mat.uniforms.uMap.value = bundle.texture;
    this.mat.uniforms.uTexelSize.value.set(1 / bundle.manifest.atlasWidth, 1 / bundle.manifest.atlasHeight);
    this.syncUV();
  }

  reset() {
    this.x = LANES[2];
    this.y = 0;
    this.z = -0.8;
    this.vy = 0;
    this.laneIndex = 2;
    this.overdrivePhase = 0;
    this.hitSlowFactor = 1.0;
    this.hitZOffset = 0;
    this.tear5Synced = false;
    // Alternate competitive edge cleanly while keeping organic per-run variance (~50/50 balanced win rate)
    LilyController.matchCounter = (LilyController.matchCounter || 0) + 1;
    const slightBias = (LilyController.matchCounter % 2 === 0 ? 1 : -1) * (0.022 + Math.random() * 0.014);
    this.rivalPaceFactor = 1.0 + slightBias;
    this.boostPhaseOffset = Math.random() * Math.PI * 2;
    this.decisionTimer = 0;
    this.group.visible = false;
    this.group.position.set(this.x, 0, this.z);
    this.spriteMesh.position.y = 0;
    this.mat.uniforms.uOverdrive.value = 0;
    if (this.auraMesh) {
      this.auraMesh.visible = false;
      this.auraMat.opacity = 0;
    }
    this.animator.play('run_rear', { restart: true });
    this.syncUV();
  }

  applyImpactSlowdown(isOverdrive = false, state = null) {
    // Before Overdrive: 38% speed loss (0.62x); after Dual Overdrive (179s+): only 20% hindered (0.80x)
    const retain = isOverdrive ? 0.80 : 0.62;
    this.hitSlowFactor = Math.min(this.hitSlowFactor, retain);
    this.hitZOffset = Math.min(1.4, this.hitZOffset + (isOverdrive ? 0.36 : 0.85));
    if (state) {
      state.rivalDistance = Math.max(0, state.rivalDistance - (isOverdrive ? 18 : 42));
    }
  }

  /**
   * Rival joins the chase at TEAR V (142s -> 216s), actively weaving across the 3 lanes
   * to dodge Black-Red Pillars and racing head-to-head against the player!
   */
  updateChase(playerDt, cat, state, laserX, pillars = []) {
    if (state.tearCount < 5 || state.phase !== 'playing') {
      this.group.visible = false;
      return;
    }

    this.group.visible = true;
    const smooth = 1 - Math.exp(-9.0 * playerDt);

    // Sync head-to-head rivalry distance at TEAR V entry (142s) if the player has been actively running
    if (!this.tear5Synced) {
      this.tear5Synced = true;
      const baseline142 = getExpectedRivalDistance(142.0);
      if (state.distance >= baseline142 * 0.78) {
        state.rivalDistance = state.distance + (Math.random() - 0.5) * 60;
      } else {
        state.rivalDistance = Math.max(state.rivalDistance, baseline142);
      }
    }

    // Recover rapidly back to full pace & accelerate continuously during 179s+ Overdrive
    const recoverRate = state.overdriveMode ? 2.6 : 1.4;
    this.hitSlowFactor = Math.min(1.0, this.hitSlowFactor + playerDt * recoverRate);
    this.hitZOffset = Math.max(0, this.hitZOffset - playerDt * (state.overdriveMode ? 2.2 : 1.1));

    // 1. Symmetrical Rival Velocity & Distance Simulation (identical physics tier to Player Cat in TEAR V & Overdrive)
    const overdriveClimb = state.overdriveMode ? Math.max(0, state.runElapsed - 179.0) * 0.68 : 0;
    const overdriveBonus = state.overdriveMode ? 14.0 + overdriveClimb : 0;
    const rivalBaseMax = 73.0 + overdriveBonus;
    const rivalBoostMax = rivalBaseMax + 33.0 + (state.overdriveMode ? 10.0 : 0);

    // Rival manages boost energy & slipstream just like a skilled runner
    const rivalIsBoosting = Math.sin(state.runElapsed * 1.65 + this.boostPhaseOffset) > -0.38;
    const rivalTargetMax = rivalIsBoosting ? rivalBoostMax : rivalBaseMax;
    const rivalSlipBonus = (0.68 + 0.30 * Math.cos(state.runElapsed * 1.1 + this.boostPhaseOffset)) * (rivalIsBoosting ? 8.5 : 3.0);
    const rivalGrazePace = 42.5; // matches player active graze & temporal burst velocity contribution

    // Keep head-to-head duel tight when player is actively sprinting
    const draftPull =
      state.speed > 45
        ? THREE.MathUtils.clamp((state.distance - state.rivalDistance) * 0.05, -6.0, 6.0)
        : 0;
    state.rivalSpeed = Math.max(
      28,
      (rivalTargetMax + rivalSlipBonus + rivalGrazePace) * this.rivalPaceFactor * this.hitSlowFactor + draftPull
    );
    state.rivalDistance += state.rivalSpeed * playerDt;
    state.rivalryDelta = state.distance - state.rivalDistance;

    // 2. 3-Lane Rival Avoidance AI (dodges incoming pillars while preferring a lane distinct from the player)
    let bestLane = this.laneIndex;
    let bestScore = Infinity;
    for (let l = 0; l < 3; l++) {
      let score = l === cat.laneIndex ? 45 : 0;
      score += Math.abs(LANES[l] - laserX) * 2.2;
      for (let i = 0; i < pillars.length; i++) {
        const p = pillars[i];
        if (!p.active || p.lane !== l) continue;
        const relZ = p.z - this.z;
        if (relZ < 1.6 && relZ > -42) {
          const dist = Math.max(0.2, -relZ);
          score += (dist < 26 ? 2400 : 250) + (1 - dist / 42) * 1200;
        }
      }
      if (score < bestScore) {
        bestScore = score;
        bestLane = l;
      }
    }
    this.laneIndex = bestLane;

    const desiredX = LANES[this.laneIndex];
    this.x += (desiredX - this.x) * smooth;

    // 3. Rivalry Z-lead: directly reflects live head-to-head lead/deficit (`state.rivalryDelta`)
    const paceRatio = state.rivalryDelta / 220; // + player ahead (rival behind at +z), - rival ahead (rival in front at -z)
    const desiredZ = THREE.MathUtils.clamp(-0.35 + paceRatio * 1.45 + this.hitZOffset, -2.45, 1.35);
    this.z += (desiredZ - this.z) * (1 - Math.exp(-4.2 * playerDt));

    const overdriveSpeedRamp = state.overdriveMode ? Math.max(0, state.runElapsed - 179.0) * 0.014 : 0;
    this.animator.play('run_rear');
    this.animator.setPlaybackRate((0.85 + state.normalizedSpeed * 1.1 + overdriveSpeedRamp) * this.hitSlowFactor);
    this.animator.update(playerDt);

    const overdrive = state.overdriveMode ? 1.0 : 0.0;
    this.overdrivePhase += playerDt * 18.0;
    this.mat.uniforms.uOverdrive.value += (overdrive - this.mat.uniforms.uOverdrive.value) * (1 - Math.exp(-8 * playerDt));

    if (overdrive > 0.5) {
      this.mat.uniforms.uRimColor.value.set(Math.sin(this.overdrivePhase) > 0 ? '#34d399' : '#ff2a4b');
      this.mat.uniforms.uRimIntensity.value = 1.05 + 0.22 * Math.sin(this.overdrivePhase * 1.4);
      this.auraMesh.visible = true;
      const sx = 1.0 + 0.08 * Math.sin(this.overdrivePhase * 1.6);
      const sy = 1.02 + 0.10 * Math.cos(this.overdrivePhase * 2.1);
      this.auraMesh.scale.set(sx, sy, 1);
      this.auraMat.opacity = 0.44 + 0.14 * Math.sin(this.overdrivePhase * 2.5);
    } else {
      this.mat.uniforms.uRimColor.value.set('#ff2a4b');
      this.mat.uniforms.uRimIntensity.value = 0.62;
      this.auraMesh.visible = false;
      this.auraMat.opacity = 0;
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
    this.auraMat.opacity = this.mat.uniforms.uOverdrive.value * 0.45;
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
