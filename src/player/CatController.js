import * as THREE from 'three';
import { buildProceduralCatAtlas } from './ProceduralCatAtlas.js';
import { CatAnimator } from './CatAnimator.js';

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
    color += uRimColor * edge * uRimIntensity * tex.a;
    color += uLaserTint * edge * 0.25 * tex.a;

    gl_FragColor = vec4(color, tex.a * uOpacity);
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
    const { texture, manifest } = buildProceduralCatAtlas();
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

  reset() {
    this.x = 0;
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

  applyImpactSlowdown() {
    this.speed = Math.max(8, this.speed * 0.62);
    this.squashX = 1.18;
    this.squashY = 0.84;
  }

  update(playerDt, input, state, laserX, worldScale) {
    // 1. Speed & boost simulation escalating through each tear stage
    const tearEscalation = state.tearCount * 12;
    const stage2Bonus = state.stage2BurstActive ? 22 : 0;
    const baseMaxSpeed = 28 + state.actIndex * 8 + tearEscalation + stage2Bonus;
    const boostMaxSpeed = 48 + state.actIndex * 10 + tearEscalation * 1.2 + stage2Bonus * 1.15;
    const wantsBoost = input.boost && state.boostEnergy > 0.04;
    state.isBoosting = wantsBoost && (input.forward || this.speed > 4);

    if (state.isBoosting) {
      state.boostEnergy = Math.max(0, state.boostEnergy - playerDt * 0.24);
    } else {
      const slipRecharge = state.slipstreamAlignment * 0.22;
      state.boostEnergy = Math.min(1, state.boostEnergy + playerDt * (0.16 + slipRecharge));
    }

    const targetMax = state.isBoosting ? boostMaxSpeed : baseMaxSpeed;
    const slipBonus = state.slipstreamAlignment * 6.5;

    if (input.forward || state.hasMovedOnce) {
      const cruiseFloor = state.hasMovedOnce ? (input.forward ? targetMax + slipBonus : 14 + state.tearCount * 4) : 0;
      const accelRate = input.forward ? (state.isBoosting ? 28 : 16) : 5.5;
      if (this.speed < cruiseFloor) {
        this.speed = Math.min(cruiseFloor, this.speed + accelRate * playerDt);
      } else {
        this.speed = Math.max(cruiseFloor, this.speed - 12 * playerDt);
      }
      if (input.forward) state.hasMovedOnce = true;
    } else {
      this.speed = Math.max(0, this.speed - 15 * playerDt);
    }

    // Temporal burst speed surge (Stage 1 or Stage 2)
    if (state.burstActive || state.stage2BurstActive) {
      this.speed = Math.max(this.speed, baseMaxSpeed + (state.stage2BurstActive ? 24 : 15));
    }

    state.speed = this.speed;
    state.peakSpeed = Math.max(state.peakSpeed, this.speed);
    state.normalizedSpeed = Math.min(1, this.speed / 138);

    // 2. Lateral steering (snappy, controlled at high speeds, no awkward sideways slide)
    const steerInput = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const speedDamping = 1 / (1 + state.normalizedSpeed * 0.42);
    const maxLatVel = 13.0 * speedDamping;
    const targetVx = steerInput * maxLatVel;
    this.vx += (targetVx - this.vx) * (1 - Math.exp(-14 * playerDt));
    this.x = THREE.MathUtils.clamp(this.x + this.vx * playerDt, -5.2, 5.2);

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

    // Update rim-light color with tear stage, anomaly vibe & burst stage (balanced for plush gray coat)
    const rim = this.spriteMaterial.uniforms.uRimColor.value;
    if (state.stage2BurstActive || (state.burstActive && state.burstStage === 2)) {
      rim.set('#ffbe3b');
      this.spriteMaterial.uniforms.uRimIntensity.value = 1.25;
    } else if (state.burstActive) {
      rim.set('#38f3ff');
      this.spriteMaterial.uniforms.uRimIntensity.value = 1.05;
    } else if (state.tearCount >= 5) {
      rim.set('#ff2a4b');
      this.spriteMaterial.uniforms.uRimIntensity.value = 1.05;
    } else if (state.anomalyMode) {
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
}
