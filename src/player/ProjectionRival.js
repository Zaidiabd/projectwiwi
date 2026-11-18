import * as THREE from 'three';

const FRAME_POOL = 28;
const DUST_POOL = 24;
const FPS_STEP = 1 / 24;

function createRivalSpriteAtlas() {
  // 4-frame rear/3-quarter sleek aerodynamic speedster cat runner (silver-indigo coat, sharp crimson visor eyes, swept scarf)
  const cols = 4;
  const fw = 160;
  const fh = 160;
  const c = document.createElement('canvas');
  c.width = fw * cols;
  c.height = fh;
  const ctx = c.getContext('2d');

  for (let i = 0; i < cols; i++) {
    const ox = i * fw;
    const phase = (i / cols) * Math.PI * 2;
    const stride = Math.sin(phase);
    const lift = Math.cos(phase);

    ctx.save();
    ctx.translate(ox + fw * 0.5, fh * 0.62);

    // Swept aerodynamic twin scarf tails fluttering backward
    ctx.fillStyle = '#0ea5e9';
    ctx.beginPath();
    ctx.moveTo(8, -26);
    ctx.quadraticCurveTo(36, -34 + lift * 6, 58, -20 + stride * 7);
    ctx.quadraticCurveTo(34, -18 + lift * 4, 10, -14);
    ctx.closePath();
    ctx.fill();

    // Sleek dark-indigo body silhouette
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(-2, -10 + lift * 2, 24, 15, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rear & front pumping legs (24fps crisp sprint)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(-18 - stride * 12, 22 - Math.max(0, lift) * 9);
    ctx.moveTo(10, -2);
    ctx.lineTo(14 + stride * 13, 22 - Math.max(0, -lift) * 9);
    ctx.stroke();

    // Tail whipping up cleanly
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(18, -14);
    ctx.quadraticCurveTo(40, -34 + stride * 8, 48, -46 - lift * 6);
    ctx.stroke();

    // Head + pointed ears
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#7dd3fc';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(-14, -27 + lift * 1.5, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sharp ears
    ctx.beginPath();
    ctx.moveTo(-25, -38);
    ctx.lineTo(-29, -56);
    ctx.lineTo(-15, -42);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-10, -41);
    ctx.lineTo(-2, -57);
    ctx.lineTo(2, -39);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sharp crimson-gold arrogant speed eyes glinting backward toward Wiwi
    ctx.fillStyle = '#fb7185';
    ctx.beginPath();
    ctx.moveTo(-22, -28);
    ctx.lineTo(-14, -31);
    ctx.lineTo(-16, -24);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(-18, -27, 2.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function createProjectionFrameTexture() {
  // Translucent 24-fps film/cel glass pane with corner reticles & sprocket ticks
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, 256, 256);

  // Subtle cel glass fill
  const g = ctx.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, 'rgba(56, 189, 248, 0.30)');
  g.addColorStop(0.5, 'rgba(186, 230, 253, 0.14)');
  g.addColorStop(1, 'rgba(14, 165, 233, 0.34)');
  ctx.fillStyle = g;
  ctx.fillRect(10, 10, 236, 236);

  // Crisp bright neon-cyan frame border
  ctx.strokeStyle = 'rgba(125, 211, 252, 0.92)';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, 232, 232);

  // Inner film-strip side sprocket marks + diagonal speed slash
  ctx.fillStyle = 'rgba(224, 242, 254, 0.78)';
  for (let y = 26; y <= 220; y += 34) {
    ctx.fillRect(18, y, 8, 16);
    ctx.fillRect(230, y, 8, 16);
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(34, 216);
  ctx.lineTo(220, 38);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class ProjectionRival {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.atlasTex = createRivalSpriteAtlas();
    const geom = new THREE.PlaneGeometry(2.35, 2.35);
    geom.translate(0, 1.02, 0);

    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this.atlasTex },
        uCol: { value: 0 },
        uCols: { value: 4 },
        uOpacity: { value: 1.0 }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        uniform float uCol;
        uniform float uCols;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          vec2 uv = vec2((vUv.x + uCol) / uCols, vUv.y);
          vec4 tex = texture2D(uMap, uv);
          if (tex.a < 0.05) discard;
          gl_FragColor = vec4(tex.rgb, tex.a * uOpacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.spriteMesh = new THREE.Mesh(geom, this.mat);
    this.spriteMesh.renderOrder = 10;
    this.group.add(this.spriteMesh);

    // 24-FPS cel-glass projection panel trail (InstancedMesh, zero per-frame allocations)
    this.frameTex = createProjectionFrameTexture();
    const frameGeom = new THREE.PlaneGeometry(2.05, 2.05);
    this.frameMat = new THREE.MeshBasicMaterial({
      map: this.frameTex,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.framesMesh = new THREE.InstancedMesh(frameGeom, this.frameMat, FRAME_POOL);
    this.framesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.framesMesh.frustumCulled = false;
    this.framesMesh.renderOrder = 8;
    this.scene.add(this.framesMesh);

    this.frames = Array.from({ length: FRAME_POOL }, () => ({
      active: false,
      x: 0,
      y: 1.0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      rotZ: 0,
      vRot: 0,
      life: 0,
      maxLife: 0.5,
      scale: 1,
      shattered: false
    }));
    this.frameCursor = 0;

    // Shattered glass & dust burst billboards when defeated by Wiwi
    const dustGeom = new THREE.PlaneGeometry(0.9, 0.9);
    this.dustMat = new THREE.MeshBasicMaterial({
      color: '#cbd5e1',
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.dustMesh = new THREE.InstancedMesh(dustGeom, this.dustMat, DUST_POOL);
    this.dustMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dustMesh.frustumCulled = false;
    this.dustMesh.renderOrder = 9;
    this.scene.add(this.dustMesh);

    this.dust = Array.from({ length: DUST_POOL }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      maxLife: 0.8
    }));

    this.dummy = new THREE.Object3D();
    this.reset();
  }

  reset() {
    this.active = false;
    this.defeated = false;
    this.announced = false;
    this.x = 0;
    this.y = 0;
    this.z = -18;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.rotZ = 0;
    this.stepAccum = 0;
    this.frameTick = 0;
    this.snapX = 0;
    this.snapZ = -6;
    this.group.visible = false;
    this.group.rotation.set(0, 0, 0);
    this.mat.uniforms.uOpacity.value = 1.0;

    for (let i = 0; i < FRAME_POOL; i++) {
      this.frames[i].active = false;
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.framesMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.framesMesh.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < DUST_POOL; i++) {
      this.dust[i].active = false;
      this.dummy.scale.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.dustMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.dustMesh.instanceMatrix.needsUpdate = true;
  }

  spawnFrame(x, y, z) {
    const f = this.frames[this.frameCursor];
    this.frameCursor = (this.frameCursor + 1) % FRAME_POOL;
    f.active = true;
    f.x = x;
    f.y = y;
    f.z = z;
    f.vx = 0;
    f.vy = 0;
    f.vz = 0;
    f.rotZ = (Math.random() - 0.5) * 0.14;
    f.vRot = 0;
    f.life = 0;
    f.maxLife = 0.65;
    f.scale = 1.05;
    f.shattered = false;
  }

  shatterDefeat(speedEffects, audio) {
    if (this.defeated) return;
    this.defeated = true;
    this.vy = 5.5;
    this.vz = 32.0; // Blast rival backward into the dust behind Wiwi!
    this.vx = this.x >= 0 ? 4.2 : -4.2;

    for (let i = 0; i < FRAME_POOL; i++) {
      const f = this.frames[i];
      if (!f.active) continue;
      f.shattered = true;
      f.vx = (Math.random() - 0.5) * 18;
      f.vy = 4 + Math.random() * 11;
      f.vz = 14 + Math.random() * 20;
      f.vRot = (Math.random() - 0.5) * 16;
      f.life = 0;
      f.maxLife = 0.75;
    }

    for (let i = 0; i < DUST_POOL; i++) {
      const d = this.dust[i];
      d.active = true;
      d.x = this.x + (Math.random() - 0.5) * 2.2;
      d.y = 0.2 + Math.random() * 1.1;
      d.z = this.z + (Math.random() - 0.5) * 1.6;
      d.vx = (Math.random() - 0.5) * 7;
      d.vy = 1.4 + Math.random() * 4.5;
      d.vz = 10 + Math.random() * 16;
      d.life = 0;
      d.maxLife = 0.65 + Math.random() * 0.45;
    }

    if (speedEffects) {
      speedEffects.spawnImpactBurst(this.x, 1.1, this.z, '#38bdf8', 22);
      speedEffects.spawnImpactBurst(this.x, 1.0, this.z, '#fef08a', 12);
      speedEffects.spawnShockwave(this.x, 0.3, this.z, '#38bdf8', 11.5, 0.52);
    }
    if (audio && audio.playGlassShatter) {
      audio.playGlassShatter();
    }
  }

  update(dt, state, cat, speedEffects, audio) {
    const t = state.runElapsed;
    const isPlaying = state.phase === 'playing';
    const enterTime = 18.0;
    const overtakeStart = 24.4;
    const shatterTime = 25.65;
    const exitTime = 28.5;

    // Outside active duel window & particles settled -> keep completely hidden
    if (!isPlaying || t < enterTime || (t > exitTime && this.defeated)) {
      if (this.group.visible) {
        this.group.visible = false;
      }
      this.updateParticles(dt, state.speed);
      return null;
    }

    let event = null;
    if (!this.active) {
      this.active = true;
      this.x = cat.x >= 0 ? -3.4 : 3.4;
      this.z = -18.0;
      this.snapX = this.x;
      this.snapZ = this.z;
      this.group.visible = true;
      if (!this.announced) {
        this.announced = true;
        event = 'entered';
      }
    }

    if (!this.defeated) {
      // Snap rival position at strict 24 FPS cadence (Projection Sorcery homage!)
      this.stepAccum += dt;
      if (this.stepAccum >= FPS_STEP) {
        this.stepAccum -= FPS_STEP;
        this.frameTick++;

        const localT = t - enterTime;
        const laneWave = Math.sin(localT * 3.1) * 3.4;
        // 18s -> 24.4s: rockets smugly ahead in 24fps dashes; 24.4s -> 25.65s: Wiwi closes the gap!
        let targetZ = -6.8 - Math.sin(localT * 2.2) * 1.6;
        if (t >= overtakeStart) {
          const u = Math.min(1, (t - overtakeStart) / (shatterTime - overtakeStart));
          targetZ = THREE.MathUtils.lerp(-6.8, -0.6, u * u);
        }

        // Bias slightly offset from Wiwi's lane so player sees the 24fps dash & frames clearly
        const dodgeOffset = Math.abs(laneWave - cat.x) < 1.3 ? (cat.x >= 0 ? -1.8 : 1.8) : 0;
        this.snapX = THREE.MathUtils.clamp(laneWave + dodgeOffset, -4.4, 4.4);
        this.snapZ = targetZ;

        this.x = this.snapX;
        this.z = this.snapZ;
        this.mat.uniforms.uCol.value = this.frameTick % 4;
        this.spawnFrame(this.x, 1.05, this.z + 0.35);
      }

      this.group.visible = true;
      this.group.position.set(this.x, 0, this.z);
      this.group.rotation.set(0, 0, Math.sin(this.frameTick * 0.9) * 0.08);
      this.mat.uniforms.uOpacity.value = 1.0;

      // Right before the 26s Temporal Burst, Wiwi blitzes past and shatters the 24-FPS frames!
      if (t >= shatterTime) {
        this.shatterDefeat(speedEffects, audio);
        event = 'defeated';
      }
    } else {
      // Launched tumbling backward into the dust!
      this.vy -= 22.0 * dt;
      this.x += this.vx * dt;
      this.y = Math.max(0, this.y + this.vy * dt);
      this.z += this.vz * dt;
      this.rotZ += 11.5 * dt;
      this.group.position.set(this.x, this.y, this.z);
      this.group.rotation.set(0, 0, this.rotZ);
      this.mat.uniforms.uOpacity.value = Math.max(0, 1.0 - (t - shatterTime) / 1.4);
      if (this.z > 14.5 || this.mat.uniforms.uOpacity.value <= 0.02) {
        this.group.visible = false;
      }
    }

    this.updateParticles(dt, state.speed);
    return event;
  }

  updateParticles(dt, worldSpeed) {
    let framesDirty = false;
    for (let i = 0; i < FRAME_POOL; i++) {
      const f = this.frames[i];
      if (!f.active) continue;
      framesDirty = true;
      f.life += dt;
      if (f.life >= f.maxLife) {
        f.active = false;
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.framesMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }

      const p = f.life / f.maxLife;
      if (f.shattered) {
        f.vy -= 26 * dt;
        f.x += f.vx * dt;
        f.y = Math.max(0.05, f.y + f.vy * dt);
        f.z += (f.vz + worldSpeed * 0.5) * dt;
        f.rotZ += f.vRot * dt;
        const s = (1 - p) * 0.65;
        this.dummy.scale.set(s * 0.9, s * 0.45, 1);
      } else {
        f.z += Math.max(12, worldSpeed * 0.55) * dt;
        const s = f.scale * (1 - p * 0.35);
        this.dummy.scale.set(s, s, 1);
      }
      this.dummy.position.set(f.x, f.y, f.z);
      this.dummy.rotation.set(0, 0, f.rotZ);
      this.dummy.updateMatrix();
      this.framesMesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (framesDirty) {
      this.framesMesh.instanceMatrix.needsUpdate = true;
    }

    let dustDirty = false;
    for (let i = 0; i < DUST_POOL; i++) {
      const d = this.dust[i];
      if (!d.active) continue;
      dustDirty = true;
      d.life += dt;
      if (d.life >= d.maxLife) {
        d.active = false;
        this.dummy.scale.set(0, 0, 0);
        this.dummy.updateMatrix();
        this.dustMesh.setMatrixAt(i, this.dummy.matrix);
        continue;
      }
      const p = d.life / d.maxLife;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += (d.vz + worldSpeed * 0.35) * dt;
      const s = 0.6 + p * 2.2;
      this.dummy.position.set(d.x, d.y, d.z);
      this.dummy.rotation.set(0, 0, p * 2.0);
      this.dummy.scale.set(s * (1 - p * 0.6), s * (1 - p * 0.6), 1);
      this.dummy.updateMatrix();
      this.dustMesh.setMatrixAt(i, this.dummy.matrix);
    }
    if (dustDirty) {
      this.dustMesh.instanceMatrix.needsUpdate = true;
    }
  }
}
