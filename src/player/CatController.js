import * as THREE from 'three';
import { buildProceduralCatAtlas } from './ProceduralCatAtlas.js';
import { buildLilyCatAtlas } from './LilyCatAtlas.js';
import { CatAnimator } from './CatAnimator.js';
import { LANES } from '../core/GameState.js';

const CAT_VERTEX_SHADER = /* glsl */ `
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

const CAT_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uRimColor;
  uniform float uRimIntensity;
  uniform vec3 uLaserTint;
  uniform float uOpacity;
  uniform float uOverdrive;
  uniform float uOverclockStrobe;
  uniform float uTime;
  uniform vec2 uTexelSize;

  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    if (tex.a < 0.04) discard;

    // Sample neighbors to detect silhouette rim for crisp readability against black void
    float aUp = texture2D(uMap, vUv + vec2(0.0, uTexelSize.y * 2.2)).a;
    float aL  = texture2D(uMap, vUv - vec2(uTexelSize.x * 2.2, 0.0)).a;
    float aR  = texture2D(uMap, vUv + vec2(uTexelSize.x * 2.2, 0.0)).a;
    float edge = clamp((1.0 - aUp) * 0.65 + (1.0 - min(aL, aR)) * 0.45, 0.0, 1.0);

    vec3 color = tex.rgb;
    if (uOverclockStrobe > 0.5) {
      // Stage 3 Overclock: alternate sharply between Pitch-Black & Blazing Neon body!
      float strobe = step(0.0, sin(uTime * 72.0));
      vec3 neonBody = mix(vec3(0.08, 0.92, 1.0), vec3(1.0, 0.16, 0.52), edge);
      vec3 blackBody = vec3(0.02, 0.02, 0.04) + neonBody * edge * 1.45;
      color = mix(blackBody, neonBody * (0.85 + edge * 0.65), strobe);
    } else if (uOverdrive > 0.01) {
      // Preserve natural gray fur while charging coat edges & highlights with crimson/cyan plasma luminescence
      float luma = dot(color, vec3(0.299, 0.587, 0.114));
      float highlightMask = smoothstep(0.22, 0.72, luma);
      vec3 plasmaTint = mix(vec3(0.18, 0.88, 1.0), vec3(1.0, 0.22, 0.42), edge);
      color = mix(color, color * 1.18 + plasmaTint * 0.34, highlightMask * uOverdrive * 0.72);
      color += vec3(0.45, 0.92, 1.0) * edge * 0.52 * uOverdrive * tex.a;
    }

    color += uRimColor * edge * uRimIntensity * tex.a;
    color += uLaserTint * edge * 0.25 * tex.a;

    gl_FragColor = vec4(color, tex.a * uOpacity);
  }
`;

function createOverdriveAuraTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);

  // Surging electric crimson-cyan plasma core aura
  const g = ctx.createRadialGradient(128, 148, 16, 128, 138, 120);
  g.addColorStop(0, 'rgba(224, 248, 255, 0.86)');
  g.addColorStop(0.35, 'rgba(56, 189, 248, 0.58)');
  g.addColorStop(0.68, 'rgba(255, 42, 75, 0.36)');
  g.addColorStop(1, 'rgba(34, 230, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  // Sharp swept plasma flame plumes
  for (let i = 0; i < 12; i++) {
    const t = (i / 11) * Math.PI;
    const bx = 128 + Math.cos(t) * 58;
    const by = 165 - Math.sin(t) * 26;
    const tipX = 128 + Math.cos(t) * 98;
    const tipY = 148 - Math.sin(t) * 120 - (i % 2 === 0 ? 18 : 0);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(56, 243, 255, 0.52)' : 'rgba(255, 58, 92, 0.45)';
    ctx.beginPath();
    ctx.moveTo(bx - 12, by + 18);
    ctx.quadraticCurveTo((bx + tipX) * 0.5 - 6, (by + tipY) * 0.5, tipX, tipY);
    ctx.quadraticCurveTo((bx + tipX) * 0.5 + 6, (by + tipY) * 0.5, bx + 12, by + 18);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

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

function createAngerSymbolTexture() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 128, 128);

  // Soft red rage glow behind the cartoon cross-vein
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 56);
  g.addColorStop(0, 'rgba(255, 42, 75, 0.45)');
  g.addColorStop(1, 'rgba(255, 42, 75, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  const drawCurve = (x1, y1, cx, cy, x2, y2) => {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(cx, cy, x2, y2);
    ctx.stroke();
  };

  // Classic 4-quadrant anime anger vein (💢) with crisp dark outline + bright crimson fill
  for (const [lw, col] of [[15, '#120409'], [9, '#ff2a4b'], [3.5, '#ff8fa3']]) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lw;
    ctx.strokeStyle = col;
    drawCurve(52, 24, 56, 52, 26, 54);
    drawCurve(76, 24, 72, 52, 102, 54);
    drawCurve(52, 104, 56, 76, 26, 74);
    drawCurve(76, 104, 72, 76, 102, 74);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class CatController {
  constructor(scene) {
    this.scene = scene;
    this.wiwiAtlas = buildProceduralCatAtlas();
    this.lilyAtlas = buildLilyCatAtlas();
    this.characterId = 'wiwi';
    const { texture, manifest } = this.wiwiAtlas;
    this.atlasTexture = texture;
    this.manifest = manifest;
    this.animator = new CatAnimator(manifest);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    // Bottom-anchored sprite plane so ground pivot stays locked
    const planeW = 2.4;
    const planeH = 1.46;
    const geom = new THREE.PlaneGeometry(planeW, planeH);
    geom.translate(0, planeH * (0.5 - manifest.groundPivotY), 0);

    this.spriteMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this.atlasTexture },
        uUvRect: { value: new THREE.Vector4(0, 0, 1, 1) },
        uRimColor: { value: new THREE.Color('#22e6ff') },
        uRimIntensity: { value: 0.75 },
        uLaserTint: { value: new THREE.Color('#ff2a4b') },
        uOpacity: { value: 1.0 },
        uOverdrive: { value: 0.0 },
        uOverclockStrobe: { value: 0.0 },
        uTime: { value: 0.0 },
        uTexelSize: { value: new THREE.Vector2(1 / manifest.atlasWidth, 1 / manifest.atlasHeight) }
      },
      vertexShader: CAT_VERTEX_SHADER,
      fragmentShader: CAT_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.spriteMesh = new THREE.Mesh(geom, this.spriteMaterial);
    this.spriteMesh.renderOrder = 10;
    this.group.add(this.spriteMesh);

    // Restrained overdrive back-aura behind Wiwi (179s+)
    this.auraTex = createOverdriveAuraTexture();
    const auraGeom = new THREE.PlaneGeometry(2.45, 2.25);
    auraGeom.translate(0, 1.02, 0);
    this.auraMat = new THREE.MeshBasicMaterial({
      map: this.auraTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.auraMesh = new THREE.Mesh(auraGeom, this.auraMat);
    this.auraMesh.position.z = -0.06;
    this.auraMesh.renderOrder = 9;
    this.auraMesh.visible = false;
    this.group.add(this.auraMesh);

    // Grounded projected shadow decal
    this.shadowTex = createShadowTexture();
    const shadowGeom = new THREE.PlaneGeometry(1.5, 1.1);
    shadowGeom.rotateX(-Math.PI / 2);
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: this.shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.7
    });
    this.shadowMesh = new THREE.Mesh(shadowGeom, this.shadowMat);
    this.shadowMesh.position.y = 0.015;
    this.group.add(this.shadowMesh);

    // Cartoon anger symbol (💢) floating above Wiwi's head when Lily interrupts
    this.angerTex = createAngerSymbolTexture();
    const angerGeom = new THREE.PlaneGeometry(0.55, 0.55);
    this.angerMat = new THREE.MeshBasicMaterial({
      map: this.angerTex,
      transparent: true,
      depthWrite: false
    });
    this.angerMesh = new THREE.Mesh(angerGeom, this.angerMat);
    this.angerMesh.position.set(0.32, 1.32, 0.08);
    this.angerMesh.renderOrder = 14;
    this.angerMesh.visible = false;
    this.group.add(this.angerMesh);

    this.reset();
  }

  setCharacter(charId = 'wiwi') {
    this.characterId = charId === 'lily' ? 'lily' : 'wiwi';
    const bundle = this.characterId === 'lily' ? this.lilyAtlas : this.wiwiAtlas;
    this.applyAtlas(bundle.texture, bundle.manifest);
  }

  reset() {
    this.laneIndex = 1; // Center lane (0.0) out of 3 lanes [-3, 0, +3]
    this.prevLeft = false;
    this.prevRight = false;
    this.laneRepeatTimer = 0;
    this.laneSwitchTimer = 0;
    this.x = LANES[1];
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
    this.isGrounded = true;
    this.bankAngle = 0;
    this.squashX = 1;
    this.squashY = 1;
    this.alertTimer = 0;
    this.landingTimer = 0;

    this.group.position.set(0, 0, 0);
    this.spriteMesh.position.set(0, 0, 0);
    this.spriteMesh.rotation.set(0, 0, 0);
    this.spriteMesh.scale.set(1, 1, 1);
    this.angerMesh.visible = false;
    this.auraMesh.visible = false;
    this.spriteMaterial.uniforms.uOverdrive.value = 0.0;
    this.spriteMaterial.uniforms.uOverclockStrobe.value = 0.0;

    this.animator.play('idle', { restart: true });
    this.syncSpriteUV();
  }

  triggerAlert() {
    this.alertTimer = 0.55;
    this.animator.play('alert', { restart: true });
  }

  triggerLeap(vy = 11.5) {
    this.isGrounded = false;
    this.vy = vy;
    this.squashX = 0.86;
    this.squashY = 1.18;
    this.animator.play('jump', { restart: true });
  }

  applyImpactSlowdown(isOverdrive = false, state = null) {
    // Before Overdrive (179s): obstacle hit cuts speed to 52% and costs 45m momentum;
    // After Dual Overdrive (179s+): obstacles only hinder by 20% (retain 80% speed)
    const retain = isOverdrive ? 0.80 : 0.52;
    const floor = isOverdrive ? 24 : 8;
    this.speed = Math.max(floor, this.speed * retain);
    if (state && !isOverdrive) {
      state.distance = Math.max(0, state.distance - 45);
    }
    this.squashX = isOverdrive ? 1.10 : 1.18;
    this.squashY = isOverdrive ? 0.90 : 0.84;
  }

  update(playerDt, input, state, laserX, worldScale) {
    // 1. Calibrated Speed & Threshold Simulation (TARGET_CATCH_DISTANCE = 23,000m):
    //    - AFK (no W): 0m -> Rival wins
    //    - Lazy W-only (hitting obstacles, no boost): ~13,800m -> Rival wins
    //    - W + Dodging only (no Shift boost): ~19,200m -> Rival wins
    //    - Active Play (W + Dodging + Shift Boost + Slipstream + Burst): ~25,200m -> Player wins!
    const tearEscalation = state.tearCount * 7.2;
    const stage2Bonus = state.stage2BurstActive ? 14 : 0;
    const overdriveClimb = state.overdriveMode ? Math.max(0, state.runElapsed - 179.0) * 0.68 : 0;
    const overdriveBonus = state.overdriveMode ? 14 + overdriveClimb : 0;
    const baseMaxSpeed =
      state.actIndex === 0
        ? 18
        : state.actIndex === 1
          ? 28
          : 22 + state.actIndex * 5 + tearEscalation + stage2Bonus + overdriveBonus;
    const boostMaxSpeed =
      state.actIndex === 1
        ? 44
        : baseMaxSpeed + 18 + state.tearCount * 3.0 + (state.overdriveMode ? 10 : 0);
    const wantsBoost = state.boostUnlocked && input.boost && state.boostEnergy > 0.04;
    state.isBoosting = wantsBoost && (input.forward || this.speed > 4);

    if (state.isBoosting) {
      state.boostEnergy = Math.max(0, state.boostEnergy - playerDt * 0.24);
    } else {
      const slipRecharge = state.slipstreamAlignment * 0.22;
      state.boostEnergy = Math.min(1, state.boostEnergy + playerDt * (0.16 + slipRecharge));
    }

    const targetMax = state.isBoosting ? boostMaxSpeed : baseMaxSpeed;
    const slipBonus = state.slipstreamAlignment * (state.isBoosting ? 8.5 : 3.0);

    if (input.forward) {
      state.hasMovedOnce = true;
      const desiredSpeed = targetMax + slipBonus;
      const accelRate = state.isBoosting ? (state.overdriveMode ? 42 : 28) : (state.overdriveMode ? 22 : 14);
      if (this.speed < desiredSpeed) {
        this.speed = Math.min(desiredSpeed, this.speed + accelRate * playerDt);
      } else {
        this.speed = Math.max(desiredSpeed, this.speed - 12 * playerDt);
      }
    } else if (state.hasMovedOnce) {
      // Letting go of W decelerates down to a slow coast so AFK players cannot coast to 23,000m
      const coastFloor = 4.0;
      this.speed = Math.max(coastFloor, this.speed - 20 * playerDt);
    } else {
      this.speed = Math.max(0, this.speed - 20 * playerDt);
    }

    // Automatic Overclock or manual Temporal Burst surge requires active running (or manual burst trigger)
    if (state.burstActive) {
      this.speed = Math.max(this.speed, boostMaxSpeed + 12);
    } else if ((state.overclock1Active || state.stage2BurstActive) && input.forward) {
      this.speed = Math.max(this.speed, baseMaxSpeed + (state.stage2BurstActive ? 14 : 10));
    }

    state.speed = this.speed;
    state.peakSpeed = Math.max(state.peakSpeed, this.speed);
    state.normalizedSpeed = Math.min(1, this.speed / 185);

    // 2. Discrete 3-lane navigation (Left = -3.0, Center = 0.0, Right = +3.0)
    const prevLane = this.laneIndex;
    if (typeof input.targetLane === 'number') {
      this.laneIndex = THREE.MathUtils.clamp(input.targetLane, 0, 2);
    } else {
      const leftPressed = Boolean(input.left);
      const rightPressed = Boolean(input.right);
      if (leftPressed && !this.prevLeft) {
        this.laneIndex = Math.max(0, this.laneIndex - 1);
        this.laneRepeatTimer = 0.22;
      } else if (rightPressed && !this.prevRight) {
        this.laneIndex = Math.min(2, this.laneIndex + 1);
        this.laneRepeatTimer = 0.22;
      } else if (leftPressed !== rightPressed) {
        this.laneRepeatTimer -= playerDt;
        if (this.laneRepeatTimer <= 0) {
          this.laneIndex = THREE.MathUtils.clamp(this.laneIndex + (rightPressed ? 1 : -1), 0, 2);
          this.laneRepeatTimer = 0.16;
        }
      }
      this.prevLeft = leftPressed;
      this.prevRight = rightPressed;
    }
    if (this.laneIndex !== prevLane) {
      this.laneSwitchTimer = 0.85;
    } else {
      this.laneSwitchTimer = Math.max(0, this.laneSwitchTimer - playerDt);
    }

      const targetX = LANES[this.laneIndex];
      const latErr = targetX - this.x;
      const steerInput = Math.abs(latErr) > 0.18 ? Math.sign(latErr) : 0;
      const prevX = this.x;
      this.x += latErr * (1 - Math.exp(-18 * playerDt));
      this.vx = playerDt > 0.0001 ? (this.x - prevX) / playerDt : 0;

      // Laser slipstream alignment
      const distToLaser = Math.abs(this.x - laserX);
      const align = Math.max(0, 1 - distToLaser / 2.2);
      state.slipstreamAlignment += (align - state.slipstreamAlignment) * (1 - Math.exp(-8 * playerDt));

      if (state.burstUnlocked && !state.burstActive && !state.stage2BurstActive) {
        const chargeRate = 0.08 + state.slipstreamAlignment * 0.09 + (state.isBoosting ? 0.03 : 0);
        state.burstCharge = Math.min(1, state.burstCharge + playerDt * chargeRate);
      }

      // 3. Vertical jump / landing kinematics
      if (!this.isGrounded) {
        this.vy -= 26 * playerDt;
        this.y += this.vy * playerDt;
        if (this.y <= 0) {
          this.y = 0;
          this.vy = 0;
          this.isGrounded = true;
          this.landingTimer = 0.2;
          this.squashX = 1.18;
          this.squashY = 0.82;
          this.animator.play('land', { restart: true });
        }
      }

      // 4. Advance forward distance
      state.distance += this.speed * playerDt;

      // 5. Select animation state & speed curve
      this.alertTimer = Math.max(0, this.alertTimer - playerDt);
      this.landingTimer = Math.max(0, this.landingTimer - playerDt);

      if (!this.isGrounded) {
        if (this.vy < -1.5 && this.animator.currentClip !== 'fall') {
          this.animator.play('fall');
        }
      } else if (this.landingTimer > 0) {
        // hold land
      } else if (this.speed < 0.8) {
        if (this.alertTimer > 0) {
          this.animator.play('alert');
        } else {
          this.animator.play('idle');
        }
      } else if (worldScale < 0.55) {
        this.animator.play('slowmo');
      } else if (state.actIndex >= 2 && (state.isBoosting || this.speed > 44)) {
        this.animator.play('overclock');
      } else if (this.speed > 28 || state.isBoosting) {
        this.animator.play('sprint');
      } else if (steerInput < -0.1) {
        this.animator.play('run_left');
      } else if (steerInput > 0.1) {
        this.animator.play('run_right');
      } else {
        this.animator.play('run');
      }

      // Designed animation speed curve so limbs never turn unreadable at extreme velocity
      const animCurve = 0.72 + Math.pow(state.normalizedSpeed, 0.68) * 1.15;
      this.animator.setPlaybackRate(animCurve);
      this.animator.update(playerDt);

      // 6. Physical banking & squash/stretch
      const targetBank = -this.vx * 0.026;
      this.bankAngle += (targetBank - this.bankAngle) * (1 - Math.exp(-12 * playerDt));
      this.squashX += (1 - this.squashX) * (1 - Math.exp(-12 * playerDt));
      this.squashY += (1 - this.squashY) * (1 - Math.exp(-12 * playerDt));

      this.group.position.set(this.x, 0, 0);
      this.spriteMesh.position.y = this.y;
      this.spriteMesh.rotation.z = this.bankAngle;
      this.spriteMesh.scale.set(this.squashX, this.squashY, 1);

      // Shadow responds to height
      const hFactor = Math.max(0.35, 1 - this.y * 0.14);
      this.shadowMesh.scale.setScalar(hFactor);
      this.shadowMat.opacity = 0.68 * hFactor;

      // Stage 3 Overclock flashing black/neon shader strobe & Dual Overdrive plasma transformation
      this.spriteMaterial.uniforms.uTime.value = state.runElapsed;
      this.spriteMaterial.uniforms.uOverclockStrobe.value = state.overclock1Active ? 1.0 : 0.0;
      const targetOverdrive = state.overdriveMode ? 1.0 : 0.0;
      this.spriteMaterial.uniforms.uOverdrive.value +=
        (targetOverdrive - this.spriteMaterial.uniforms.uOverdrive.value) * (1 - Math.exp(-8 * playerDt));

      this.auraMesh.visible = state.overdriveMode;
      if (state.overdriveMode) {
        const t = state.runElapsed;
        this.auraMesh.position.y = this.y;
        const sx = 1.02 + Math.sin(t * 24) * 0.08;
        const sy = 1.05 + Math.cos(t * 28) * 0.10;
        this.auraMesh.scale.set(sx, sy, 1);
        this.auraMat.opacity = 0.45 + Math.sin(t * 36) * 0.14;
      }

      // Update rim-light color with Dual Overdrive, tear stage, rift gates & burst stage
      const rim = this.spriteMaterial.uniforms.uRimColor.value;
      if (state.overdriveMode) {
        rim.set(Math.sin(state.runElapsed * 16) > 0 ? '#38f3ff' : '#ff2a4b');
        this.spriteMaterial.uniforms.uRimIntensity.value = 1.28;
      } else if (state.stage2BurstActive || (state.burstActive && state.burstStage === 2)) {
        rim.set('#ffbe3b');
        this.spriteMaterial.uniforms.uRimIntensity.value = 1.25;
      } else if (state.burstActive) {
        rim.set('#38f3ff');
        this.spriteMaterial.uniforms.uRimIntensity.value = 1.05;
      } else if (state.tearCount >= 5) {
        rim.set('#ff2a4b');
        this.spriteMaterial.uniforms.uRimIntensity.value = 1.05;
      } else if (state.riftGateMode) {
        rim.set('#2dd4bf');
        this.spriteMaterial.uniforms.uRimIntensity.value = 0.92;
      } else if (state.tearCount >= 1) {
        rim.set('#c084fc');
        this.spriteMaterial.uniforms.uRimIntensity.value = 0.85 + state.tearCount * 0.06;
      } else if (state.actIndex >= 2) {
        rim.set('#22e6ff');
        this.spriteMaterial.uniforms.uRimIntensity.value = 0.72;
      } else {
        rim.set('#a6bdd9');
        this.spriteMaterial.uniforms.uRimIntensity.value = 0.48;
      }

      // Visible cartoon anger symbol (💢) over Wiwi's head during TEAR V when Lily joins the chase!
      const annoyedInTear5 = state.tearCount >= 5;
      this.angerMesh.visible = annoyedInTear5;
      if (annoyedInTear5) {
        const t = state.runElapsed;
        this.angerMesh.position.set(
          0.34 + Math.sin(t * 34) * 0.03,
          this.y + 1.24 + Math.cos(t * 28) * 0.03,
          0.1
        );
        this.angerMesh.scale.setScalar(0.95 + Math.abs(Math.sin(t * 10)) * 0.28);
      }

      this.syncSpriteUV();
    }

    updateEndingPose(dt, step, wiwiWon = true, endingTimer = 0) {
      const smooth = 1 - Math.exp(-6 * dt);
      let showAnger = false;
      let angerScale = 1.0;

      if (step === 0) {
        // Leap through rift
        this.vy -= 20 * dt;
        this.y = Math.max(0, this.y + this.vy * dt);
        this.x += (0 - this.x) * (1 - Math.exp(-5 * dt));
        this.animator.play(this.vy >= 0 ? 'jump' : 'fall');
      } else if (step === 1) {
        this.y = 0;
        this.x = -0.55;
        this.animator.play('land');
      } else if (step === 2) {
        // Lily joins the chase! Wiwi gets visibly annoyed with pulsing 💢 above head
        this.x += (-0.65 - this.x) * smooth;
        this.animator.play('annoyed');
        showAnger = true;
        angerScale = 0.85 + Math.abs(Math.sin(endingTimer * 12)) * 0.25;
      } else if (step === 3) {
        if (wiwiWon) {
          // Wiwi beats Lily! Dives onto the laser dot at x = -0.15
          this.x += (-0.15 - this.x) * (1 - Math.exp(-9 * dt));
          this.animator.play('catch');
          showAnger = false;
        } else {
          // Under threshold! Wiwi tries to lunge, belly-flops flat while Lily steals the dot!
          this.x += (-1.15 - this.x) * smooth;
          this.animator.play('flop_lose');
          showAnger = true;
          angerScale = 1.15 + Math.abs(Math.sin(endingTimer * 14)) * 0.35;
        }
      } else {
        if (wiwiWon) {
          this.x += (-0.15 - this.x) * smooth;
          this.animator.play('sit');
          showAnger = false;
        } else {
          this.x += (-1.15 - this.x) * smooth;
          this.animator.play('flop_lose');
          showAnger = true;
          angerScale = 1.2 + Math.abs(Math.sin(endingTimer * 12)) * 0.3;
        }
      }

      this.animator.setPlaybackRate(1.0);
      this.animator.update(dt);

      this.group.position.set(this.x, 0, 0);
      this.spriteMesh.position.y = this.y;
      this.spriteMesh.rotation.z = step === 2 && showAnger ? Math.sin(endingTimer * 28) * 0.035 : 0;
      this.spriteMesh.scale.set(1, 1, 1);

      // Dual Overdrive powerup fades cleanly into normal cozy Munchkin once landing in the peaceful room
      this.auraMesh.visible = step === 0;
      this.spriteMaterial.uniforms.uOverclockStrobe.value = 0.0;
      this.spriteMaterial.uniforms.uOverdrive.value = step === 0 ? 1.0 : Math.max(0, this.spriteMaterial.uniforms.uOverdrive.value - dt * 2.5);

      this.angerMesh.visible = showAnger;
      if (showAnger) {
        const yAnchor = step >= 3 && !wiwiWon ? 0.85 : 1.25;
        this.angerMesh.position.set(
          0.34 + Math.sin(endingTimer * 36) * 0.025,
          yAnchor + Math.cos(endingTimer * 32) * 0.025,
          0.12
        );
        this.angerMesh.scale.setScalar(angerScale);
      }

      this.spriteMaterial.uniforms.uRimIntensity.value = 0.42;
      this.spriteMaterial.uniforms.uRimColor.value.set('#9bb4cc');
      this.shadowMesh.scale.setScalar(Math.max(0.4, 1 - this.y * 0.14));
      this.syncSpriteUV();
    }

    syncSpriteUV() {
      const r = this.animator.getCurrentUVRect();
      this.spriteMaterial.uniforms.uUvRect.value.set(r.u0, r.v0, r.u1, r.v1);
    }

    getSpriteTexture() {
      return this.atlasTexture;
    }

    getCurrentUVRect() {
      return this.animator.getCurrentUVRect();
    }

    applyAtlas(texture, manifest) {
      this.atlasTexture = texture;
      this.manifest = manifest;
      this.animator = new CatAnimator(manifest);
      this.spriteMaterial.uniforms.uMap.value = texture;
      this.spriteMaterial.uniforms.uTexelSize.value.set(
        1 / manifest.atlasWidth,
        1 / manifest.atlasHeight
      );
      this.syncSpriteUV();
    }
  }
