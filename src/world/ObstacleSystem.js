import * as THREE from 'three';
import { LANES } from '../core/GameState.js';

const MAX_LANE_VEHICLES = 12;
const MAX_LANE_DEBRIS = 12;
const MAX_HAND_STOMPS = 6;
const MAX_PILLARS = 12;

function mergeParts(parts) {
  const posArrays = [];
  const normArrays = [];
  const indices = [];
  let vertOffset = 0;

  for (const part of parts) {
    const g = part.geom;
    if (part.rot) {
      g.rotateX(part.rot[0] || 0);
      g.rotateY(part.rot[1] || 0);
      g.rotateZ(part.rot[2] || 0);
    }
    if (part.pos) g.translate(part.pos[0], part.pos[1], part.pos[2]);
    const pos = g.attributes.position.array;
    const norm = g.attributes.normal.array;
    posArrays.push(pos);
    normArrays.push(norm);
    if (g.index) {
      const idx = g.index.array;
      for (let i = 0; i < idx.length; i++) indices.push(idx[i] + vertOffset);
    } else {
      for (let i = 0; i < g.attributes.position.count; i++) indices.push(i + vertOffset);
    }
    vertOffset += g.attributes.position.count;
    g.dispose();
  }

  const totalPos = posArrays.reduce((s, a) => s + a.length, 0);
  const mergedPos = new Float32Array(totalPos);
  const mergedNorm = new Float32Array(totalPos);
  let off = 0;
  for (let i = 0; i < posArrays.length; i++) {
    mergedPos.set(posArrays[i], off);
    mergedNorm.set(normArrays[i], off);
    off += posArrays[i].length;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(mergedPos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(mergedNorm, 3));
  merged.setIndex(indices);
  return merged;
}

const VEHICLE_COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#10b981', '#e2e8f0'];

export class ObstacleSystem {
  constructor(scene) {
    this.scene = scene;
    this.vehicleLimit = 10;
    this.debrisLimit = 10;
    this.pillarLimit = 10;

    this.dummy = new THREE.Object3D();
    this.color = new THREE.Color();

    // ---------------------------------------------------------
    // 1. Stage 2 & Stage 3 Overclock: 3-Lane Cars & Bikes
    // ---------------------------------------------------------
    const carGeom = mergeParts([
      { geom: new THREE.BoxGeometry(1.75, 0.52, 3.1), pos: [0, 0.42, 0] },
      { geom: new THREE.BoxGeometry(1.42, 0.46, 1.65), pos: [0, 0.90, -0.05] },
      { geom: new THREE.BoxGeometry(0.24, 0.34, 0.48), pos: [-0.82, 0.20, 0.95] },
      { geom: new THREE.BoxGeometry(0.24, 0.34, 0.48), pos: [0.82, 0.20, 0.95] },
      { geom: new THREE.BoxGeometry(0.24, 0.34, 0.48), pos: [-0.82, 0.20, -0.95] },
      { geom: new THREE.BoxGeometry(0.24, 0.34, 0.48), pos: [0.82, 0.20, -0.95] }
    ]);
    this.carMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#000000',
      roughness: 0.35,
      metalness: 0.65
    });
    this.carMesh = new THREE.InstancedMesh(carGeom, this.carMat, MAX_LANE_VEHICLES);
    this.carMesh.frustumCulled = false;
    this.scene.add(this.carMesh);

    const bikeGeom = mergeParts([
      { geom: new THREE.BoxGeometry(0.42, 0.48, 1.85), pos: [0, 0.45, 0] },
      { geom: new THREE.CylinderGeometry(0.32, 0.32, 0.16, 10), rot: [0, 0, Math.PI / 2], pos: [0, 0.32, 0.68] },
      { geom: new THREE.CylinderGeometry(0.32, 0.32, 0.16, 10), rot: [0, 0, Math.PI / 2], pos: [0, 0.32, -0.68] },
      // Rider leaning forward
      { geom: new THREE.BoxGeometry(0.42, 0.56, 0.36), rot: [-0.4, 0, 0], pos: [0, 0.92, 0.05] },
      { geom: new THREE.SphereGeometry(0.20, 8, 6), pos: [0, 1.30, -0.08] }
    ]);
    this.bikeMat = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#000000',
      roughness: 0.35,
      metalness: 0.6
    });
    this.bikeMesh = new THREE.InstancedMesh(bikeGeom, this.bikeMat, MAX_LANE_VEHICLES);
    this.bikeMesh.frustumCulled = false;
    this.scene.add(this.bikeMesh);

    this.color.set('#ffffff');
    for (let i = 0; i < MAX_LANE_VEHICLES; i++) {
      this.carMesh.setColorAt(i, this.color);
      this.bikeMesh.setColorAt(i, this.color);
    }

    this.vehicles = Array.from({ length: MAX_LANE_VEHICLES }, (_, i) => ({
      lane: i % 3,
      x: LANES[i % 3],
      z: -38 - i * 19,
      isBike: i % 2 === 1,
      relSpeed: 10 + (i % 3) * 4,
      colorHex: VEHICLE_COLORS[i % VEHICLE_COLORS.length],
      active: false,
      grazed: false,
      hitCooldown: 0
    }));

    // ---------------------------------------------------------
    // 2. Post-Stage 3 World Collapse (38s-62s): Flying Land, Cars & Trees
    // ---------------------------------------------------------
    const landGeom = new THREE.DodecahedronGeometry(0.95, 0);
    landGeom.scale(1.15, 0.55, 1.3);
    this.landMat = new THREE.MeshStandardMaterial({
      color: '#334155',
      emissive: '#9333ea',
      emissiveIntensity: 0.6,
      roughness: 0.5
    });
    this.landMesh = new THREE.InstancedMesh(landGeom, this.landMat, MAX_LANE_DEBRIS);
    this.landMesh.frustumCulled = false;
    this.scene.add(this.landMesh);

    const treeDebrisGeom = mergeParts([
      { geom: new THREE.CylinderGeometry(0.16, 0.24, 1.5, 6), pos: [0, -0.3, 0] },
      { geom: new THREE.ConeGeometry(0.95, 1.9, 6), pos: [0, 0.85, 0] }
    ]);
    this.treeDebrisMat = new THREE.MeshStandardMaterial({
      color: '#065f46',
      emissive: '#22e6ff',
      emissiveIntensity: 0.45,
      roughness: 0.6
    });
    this.treeDebrisMesh = new THREE.InstancedMesh(treeDebrisGeom, this.treeDebrisMat, MAX_LANE_DEBRIS);
    this.treeDebrisMesh.frustumCulled = false;
    this.scene.add(this.treeDebrisMesh);

    this.debris = Array.from({ length: MAX_LANE_DEBRIS }, (_, i) => ({
      lane: (i * 2) % 3,
      x: LANES[(i * 2) % 3],
      z: -48 - i * 20,
      kind: i % 3, // 0 = land slab, 1 = car, 2 = tree
      rx: Math.random() * Math.PI,
      ry: Math.random() * Math.PI,
      spin: 1.5 + Math.random() * 1.6,
      active: false,
      grazed: false,
      hitCooldown: 0
    }));

    // ---------------------------------------------------------
    // 3. Stage 4 (62s-136s): Giant Interdimensional Synthwave Beings & 2-Lane Hand Stomps
    // ---------------------------------------------------------
    this.titanGroup = new THREE.Group();
    this.titanGroup.visible = false;
    this.scene.add(this.titanGroup);

    const titanMat = new THREE.MeshBasicMaterial({
      color: '#120524',
      wireframe: false
    });
    const titanWireMat = new THREE.MeshBasicMaterial({
      color: '#ff2a85',
      wireframe: true,
      transparent: true,
      opacity: 0.65
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#38f3ff' });

    const titanBodyGeom = mergeParts([
      { geom: new THREE.BoxGeometry(5.5, 8.5, 3.2), pos: [0, 7.5, 0] }, // Torso
      { geom: new THREE.BoxGeometry(9.0, 2.2, 3.0), pos: [0, 11.2, 0] }, // Shoulders
      { geom: new THREE.OctahedronGeometry(2.2, 0), pos: [0, 14.6, 0] } // Head
    ]);

    this.titans = [];
    for (const side of [-1, 1]) {
      const fig = new THREE.Group();
      const bodySolid = new THREE.Mesh(titanBodyGeom, titanMat);
      const bodyWire = new THREE.Mesh(titanBodyGeom, titanWireMat);
      fig.add(bodySolid);
      fig.add(bodyWire);

      // Piercing glowing synthwave eyes
      const eyeGeom = new THREE.BoxGeometry(0.65, 0.28, 0.4);
      const eyeL = new THREE.Mesh(eyeGeom, eyeMat);
      eyeL.position.set(-0.65, 14.8, 1.85);
      const eyeR = new THREE.Mesh(eyeGeom, eyeMat);
      eyeR.position.set(0.65, 14.8, 1.85);
      fig.add(eyeL, eyeR);

      fig.position.set(side * 10.5, -1.5, -34);
      fig.rotation.y = side > 0 ? -0.35 : 0.35;
      this.titanGroup.add(fig);
      this.titans.push(fig);
    }

    // Colossal Hand Mesh covering 2 lanes (5.2m span!)
    const handGeom = mergeParts([
      { geom: new THREE.BoxGeometry(4.8, 1.15, 2.8), pos: [0, 0.65, 0] }, // Palm
      { geom: new THREE.BoxGeometry(0.85, 0.9, 1.8), pos: [-1.8, 0.5, 2.0] }, // Finger 1
      { geom: new THREE.BoxGeometry(0.85, 0.9, 2.1), pos: [-0.6, 0.5, 2.15] }, // Finger 2
      { geom: new THREE.BoxGeometry(0.85, 0.9, 2.1), pos: [0.6, 0.5, 2.15] }, // Finger 3
      { geom: new THREE.BoxGeometry(0.85, 0.9, 1.8), pos: [1.8, 0.5, 2.0] }, // Finger 4
      { geom: new THREE.CylinderGeometry(1.4, 1.6, 6.0, 8), pos: [0, 4.1, -0.4] } // Wrist / Forearm descending from Titan!
    ]);
    this.handMat = new THREE.MeshStandardMaterial({
      color: '#1b0636',
      emissive: '#ff2a85',
      emissiveIntensity: 1.05,
      roughness: 0.25,
      metalness: 0.8
    });
    this.handMesh = new THREE.InstancedMesh(handGeom, this.handMat, MAX_HAND_STOMPS);
    this.handMesh.frustumCulled = false;
    this.scene.add(this.handMesh);

    // Wireframe neon rim overlay on the stomping hands
    this.handWireMat = new THREE.MeshBasicMaterial({
      color: '#38f3ff',
      wireframe: true,
      transparent: true,
      opacity: 0.55
    });
    this.handWireMesh = new THREE.InstancedMesh(handGeom, this.handWireMat, MAX_HAND_STOMPS);
    this.handWireMesh.frustumCulled = false;
    this.scene.add(this.handWireMesh);

    // 2-lane floor hazard warning zone under each hand stomp
    const handZoneGeom = new THREE.PlaneGeometry(5.6, 5.2);
    handZoneGeom.rotateX(-Math.PI / 2);
    handZoneGeom.translate(0, 0.03, 0);
    this.handZoneMat = new THREE.MeshBasicMaterial({
      color: '#ff2a85',
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    this.handZoneMesh = new THREE.InstancedMesh(handZoneGeom, this.handZoneMat, MAX_HAND_STOMPS);
    this.handZoneMesh.frustumCulled = false;
    this.scene.add(this.handZoneMesh);

    this.handStomps = Array.from({ length: MAX_HAND_STOMPS }, (_, i) => {
      const isLeft = i % 2 === 0;
      return {
        isLeft,
        x: isLeft ? -1.5 : 1.5, // Left covers Lanes [0, 1] -> Exit = Lane 2 (+3.0); Right covers [1, 2] -> Exit = Lane 0 (-3.0)
        coveredLanes: isLeft ? [0, 1] : [1, 2],
        exitLane: isLeft ? 2 : 0,
        z: -48 - i * 34,
        active: false,
        grazed: false,
        hitCooldown: 0
      };
    });

    // ---------------------------------------------------------
    // 4. 2nd Overclock (136s-142s) & Post-Overclock (142s+):
    //    Slowed Yellow Light Pillars -> Black Pillars w/ Red Outline + Electric Charge Rings!
    // ---------------------------------------------------------
    const pillarGeom = new THREE.CylinderGeometry(0.68, 0.78, 11.0, 10);
    pillarGeom.translate(0, 5.5, 0);
    this.pillarCoreMat = new THREE.MeshStandardMaterial({
      color: '#fde047',
      emissive: '#ffbe3b',
      emissiveIntensity: 1.5,
      roughness: 0.15,
      metalness: 0.4,
      transparent: true,
      opacity: 0.94
    });
    this.pillarCoreMesh = new THREE.InstancedMesh(pillarGeom, this.pillarCoreMat, MAX_PILLARS);
    this.pillarCoreMesh.frustumCulled = false;
    this.scene.add(this.pillarCoreMesh);

    const outlineGeom = new THREE.CylinderGeometry(0.78, 0.88, 11.05, 8);
    outlineGeom.translate(0, 5.52, 0);
    this.pillarOutlineMat = new THREE.MeshBasicMaterial({
      color: '#fde047',
      wireframe: true,
      transparent: true,
      opacity: 0.92
    });
    this.pillarOutlineMesh = new THREE.InstancedMesh(outlineGeom, this.pillarOutlineMat, MAX_PILLARS);
    this.pillarOutlineMesh.frustumCulled = false;
    this.scene.add(this.pillarOutlineMesh);

    const chargeRingGeom = new THREE.TorusGeometry(1.05, 0.08, 6, 20);
    chargeRingGeom.rotateX(Math.PI / 2);
    this.chargeRingMat = new THREE.MeshBasicMaterial({
      color: '#fef08a',
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.chargeRingMesh = new THREE.InstancedMesh(chargeRingGeom, this.chargeRingMat, MAX_PILLARS);
    this.chargeRingMesh.frustumCulled = false;
    this.scene.add(this.chargeRingMesh);

    this.pillars = Array.from({ length: MAX_PILLARS }, (_, i) => ({
      lane: i % 3,
      x: LANES[i % 3],
      z: -42 - i * 18,
      phase: Math.random() * Math.PI * 2,
      active: false,
      grazed: false,
      hitCooldown: 0
    }));

    this.reset();
  }

  setQualityCount(count) {
    this.vehicleLimit = Math.min(MAX_LANE_VEHICLES, Math.max(6, Math.floor(count * 0.6)));
    this.debrisLimit = Math.min(MAX_LANE_DEBRIS, Math.max(6, Math.floor(count * 0.6)));
    this.pillarLimit = Math.min(MAX_PILLARS, Math.max(6, Math.floor(count * 0.6)));
    this.carMesh.count = this.vehicleLimit;
    this.bikeMesh.count = this.vehicleLimit;
    this.landMesh.count = this.debrisLimit;
    this.treeDebrisMesh.count = this.debrisLimit;
    this.pillarCoreMesh.count = this.pillarLimit;
    this.pillarOutlineMesh.count = this.pillarLimit;
    this.chargeRingMesh.count = this.pillarLimit;
  }

  hideAll() {
    this.carMesh.visible = false;
    this.bikeMesh.visible = false;
    this.landMesh.visible = false;
    this.treeDebrisMesh.visible = false;
    this.titanGroup.visible = false;
    this.handMesh.visible = false;
    this.handWireMesh.visible = false;
    this.handZoneMesh.visible = false;
    this.pillarCoreMesh.visible = false;
    this.pillarOutlineMesh.visible = false;
    this.chargeRingMesh.visible = false;
  }

  reset() {
    this.hideAll();
    for (let i = 0; i < MAX_LANE_VEHICLES; i++) {
      const v = this.vehicles[i];
      v.lane = i % 3;
      v.x = LANES[v.lane];
      v.z = -42 - i * 21;
      v.active = true;
      v.grazed = false;
      v.hitCooldown = 0;
    }
    for (let i = 0; i < MAX_LANE_DEBRIS; i++) {
      const d = this.debris[i];
      d.lane = (i * 2) % 3;
      d.x = LANES[d.lane];
      d.z = -50 - i * 22;
      d.active = true;
      d.grazed = false;
      d.hitCooldown = 0;
    }
    for (let i = 0; i < MAX_HAND_STOMPS; i++) {
      const h = this.handStomps[i];
      h.isLeft = i % 2 === 0;
      h.x = h.isLeft ? -1.5 : 1.5;
      h.coveredLanes = h.isLeft ? [0, 1] : [1, 2];
      h.exitLane = h.isLeft ? 2 : 0;
      h.z = -52 - i * 36;
      h.active = true;
      h.grazed = false;
      h.hitCooldown = 0;
    }
    for (let i = 0; i < MAX_PILLARS; i++) {
      const p = this.pillars[i];
      p.lane = i % 3;
      p.x = LANES[p.lane];
      p.z = -45 - i * 20;
      p.active = true;
      p.grazed = false;
      p.hitCooldown = 0;
    }
  }

  hideInstance(mesh, index) {
    this.dummy.position.set(0, -150, 0);
    this.dummy.scale.setScalar(0.01);
    this.dummy.updateMatrix();
    mesh.setMatrixAt(index, this.dummy.matrix);
  }

  pickFairLane(items, spawnZ) {
    // Guarantee at least one of the 3 lanes stays passable within any 14m Z band
    let occupiedMask = 0;
    for (let j = 0; j < items.length; j++) {
      const other = items[j];
      if (!other.active) continue;
      if (Math.abs(other.z - spawnZ) < 14.0) {
        occupiedMask |= 1 << other.lane;
      }
    }
    const open = [];
    for (let l = 0; l < 3; l++) {
      if (!(occupiedMask & (1 << l))) open.push(l);
    }
    if (open.length >= 2) {
      return open[Math.floor(Math.random() * open.length)];
    }
    // If 2 lanes are already blocked at this Z, share an already-blocked lane rather than walling off lane 3
    for (let l = 0; l < 3; l++) {
      if (occupiedMask & (1 << l)) return l;
    }
    return Math.floor(Math.random() * 3);
  }

  update(worldDt, cat, state, onHit, onPhase, lily = null, onLilyHit = null, onGraze = null) {
    this.hideAll();
    if (state.actIndex < 1 || state.actIndex >= 4 || state.runElapsed > 212) {
      return;
    }

    // Notice during Stage 3 Overclock & 2nd Overclock, obstacles remain tangible slow-motion threats to evade!
    // Only manual Temporal Burst triggers full phase-through invulnerability.
    const phaseProtected = state.burstActive;

    // =========================================================================
    // MODE A: STAGE 2 (10s-25.7s) & STAGE 3 OVERCLOCK (25.7s-38s) -> 3-Lane Cars & Bikes
    // =========================================================================
    if (!state.worldCollapsed) {
      this.carMesh.visible = true;
      this.bikeMesh.visible = true;

      if (state.overclock1Active) {
        this.carMat.emissive.set('#ffffff');
        this.carMat.emissiveIntensity = 1.0;
        this.bikeMat.emissive.set('#ffffff');
        this.bikeMat.emissiveIntensity = 1.0;
      } else {
        this.carMat.emissive.set('#0f172a');
        this.carMat.emissiveIntensity = 0.25;
        this.bikeMat.emissive.set('#0f172a');
        this.bikeMat.emissiveIntensity = 0.25;
      }

      for (let i = 0; i < this.vehicleLimit; i++) {
        const v = this.vehicles[i];
        v.z += (state.speed + v.relSpeed) * worldDt;
        if (v.hitCooldown > 0) v.hitCooldown -= worldDt;

        if (v.z > 10) {
          v.z = -150 - Math.random() * 50;
          v.lane = this.pickFairLane(this.vehicles, v.z);
          v.x = LANES[v.lane];
          v.active = true;
          v.grazed = false;
          v.hitCooldown = 0;
        }

        if (v.active && v.hitCooldown <= 0 && Math.abs(v.z) < 1.65 && cat.y < 1.05) {
          if (v.lane === cat.laneIndex || Math.abs(v.x - cat.x) < 1.05) {
            v.hitCooldown = 1.0;
            v.active = false;
            v.grazed = true;
            if (phaseProtected) {
              if (onPhase) onPhase();
            } else {
              cat.applyImpactSlowdown(false);
              if (onHit) onHit();
            }
          }
        }

        if (v.active && !v.grazed && v.z > 0.3 && v.z < 3.6 && Math.abs(v.lane - cat.laneIndex) === 1) {
          v.grazed = true;
          if (onGraze) onGraze(v.x, 0.5);
        }

        const cHex = state.overclock1Active ? '#ffffff' : v.colorHex;
        this.color.set(cHex);
        if (v.isBike) {
          this.hideInstance(this.carMesh, i);
          if (v.active) {
            this.dummy.position.set(v.x, 0, v.z);
            this.dummy.rotation.set(0, 0, 0);
            this.dummy.scale.setScalar(1.0);
            this.dummy.updateMatrix();
            this.bikeMesh.setMatrixAt(i, this.dummy.matrix);
            this.bikeMesh.setColorAt(i, this.color);
          } else {
            this.hideInstance(this.bikeMesh, i);
          }
        } else {
          this.hideInstance(this.bikeMesh, i);
          if (v.active) {
            this.dummy.position.set(v.x, 0, v.z);
            this.dummy.rotation.set(0, 0, 0);
            this.dummy.scale.setScalar(1.0);
            this.dummy.updateMatrix();
            this.carMesh.setMatrixAt(i, this.dummy.matrix);
            this.carMesh.setColorAt(i, this.color);
          } else {
            this.hideInstance(this.carMesh, i);
          }
        }
      }
      this.carMesh.instanceMatrix.needsUpdate = true;
      this.bikeMesh.instanceMatrix.needsUpdate = true;
      if (this.carMesh.instanceColor) this.carMesh.instanceColor.needsUpdate = true;
      if (this.bikeMesh.instanceColor) this.bikeMesh.instanceColor.needsUpdate = true;
      return;
    }

    // =========================================================================
    // MODE B: WORLD COLLAPSE (38s-62s) -> Flying Land Chunks, Cars & Trees in 3 Lanes
    // =========================================================================
    if (!state.titanMode && !state.stage2BurstActive && !state.blackRedPillarMode) {
      this.landMesh.visible = true;
      this.carMesh.visible = true;
      this.treeDebrisMesh.visible = true;
      this.carMat.emissive.set('#22e6ff');
      this.carMat.emissiveIntensity = 0.35;

      for (let i = 0; i < this.debrisLimit; i++) {
        const d = this.debris[i];
        d.z += state.speed * 1.05 * worldDt;
        d.rx += d.spin * worldDt;
        d.ry += d.spin * 0.8 * worldDt;
        if (d.hitCooldown > 0) d.hitCooldown -= worldDt;

        if (d.z > 10) {
          d.z = -145 - Math.random() * 50;
          d.lane = this.pickFairLane(this.debris, d.z);
          d.x = LANES[d.lane];
          d.active = true;
          d.grazed = false;
          d.hitCooldown = 0;
        }

        if (d.active && d.hitCooldown <= 0 && Math.abs(d.z) < 1.35 && cat.y < 1.25) {
          if (d.lane === cat.laneIndex || Math.abs(d.x - cat.x) < 1.05) {
            d.hitCooldown = 1.0;
            d.active = false;
            d.grazed = true;
            if (phaseProtected) {
              if (onPhase) onPhase();
            } else {
              cat.applyImpactSlowdown(false);
              if (onHit) onHit();
            }
          }
        }

        if (d.active && !d.grazed && d.z > 0.3 && d.z < 3.6 && Math.abs(d.lane - cat.laneIndex) === 1) {
          d.grazed = true;
          if (onGraze) onGraze(d.x, 0.5);
        }

        this.hideInstance(this.landMesh, i);
        this.hideInstance(this.carMesh, i);
        this.hideInstance(this.treeDebrisMesh, i);
        if (d.active) {
          this.dummy.position.set(d.x, 0.8 + Math.abs(Math.sin(d.rx)) * 0.25, d.z);
          this.dummy.rotation.set(d.rx * 0.35, d.ry, d.rx * 0.2);
          this.dummy.scale.setScalar(1.0);
          this.dummy.updateMatrix();
          if (d.kind === 0) {
            this.landMesh.setMatrixAt(i, this.dummy.matrix);
          } else if (d.kind === 1) {
            this.color.set('#38bdf8');
            this.carMesh.setMatrixAt(i, this.dummy.matrix);
            this.carMesh.setColorAt(i, this.color);
          } else {
            this.treeDebrisMesh.setMatrixAt(i, this.dummy.matrix);
          }
        }
      }
      this.landMesh.instanceMatrix.needsUpdate = true;
      this.carMesh.instanceMatrix.needsUpdate = true;
      this.treeDebrisMesh.instanceMatrix.needsUpdate = true;
      if (this.carMesh.instanceColor) this.carMesh.instanceColor.needsUpdate = true;
      return;
    }

    // =========================================================================
    // MODE C: STAGE 4 (62s-136s) -> Giant Synthwave Humanoid Beings + 2-Lane Hand Stomps
    // =========================================================================
    if (state.titanMode) {
      this.titanGroup.visible = true;
      this.handMesh.visible = true;
      this.handWireMesh.visible = true;
      this.handZoneMesh.visible = true;

      // Subtle looming hover animation on Giant Synthwave Titans with glowing eyes
      for (let tIdx = 0; tIdx < this.titans.length; tIdx++) {
        const fig = this.titans[tIdx];
        fig.position.y = -1.5 + Math.sin(state.runElapsed * 1.4 + tIdx * Math.PI) * 1.1;
      }

      for (let i = 0; i < MAX_HAND_STOMPS; i++) {
        const h = this.handStomps[i];
        h.z += state.speed * worldDt;
        if (h.hitCooldown > 0) h.hitCooldown -= worldDt;

        if (h.z > 12) {
          h.z = -185 - Math.random() * 25;
          // Alternate Left+Center vs Center+Right so single safe lane changes rhythmically!
          h.isLeft = !h.isLeft;
          h.x = h.isLeft ? -1.5 : 1.5;
          h.coveredLanes = h.isLeft ? [0, 1] : [1, 2];
          h.exitLane = h.isLeft ? 2 : 0;
          h.active = true;
          h.grazed = false;
          h.hitCooldown = 0;
        }

        // Dramatic vertical slam curve as hand approaches z = -12 -> -2
        const slamT = THREE.MathUtils.clamp((h.z + 28) / 22, 0, 1);
        const dropY = THREE.MathUtils.lerp(7.5, 0.0, slamT * slamT);

        if (h.active && h.hitCooldown <= 0 && Math.abs(h.z) < 2.15 && dropY < 1.4 && cat.y < 1.8) {
          if (h.coveredLanes.includes(cat.laneIndex) || Math.abs(cat.x - h.x) < 2.65) {
            h.hitCooldown = 1.0;
            h.active = false;
            h.grazed = true;
            if (phaseProtected) {
              if (onPhase) onPhase();
            } else {
              cat.applyImpactSlowdown(false);
              if (onHit) onHit();
            }
          }
        }

        if (h.active && !h.grazed && h.z > 1.2 && h.z < 4.5 && cat.laneIndex === h.exitLane) {
          h.grazed = true;
          if (onGraze) onGraze(LANES[h.exitLane], 0.9);
        }

        if (h.active) {
          this.dummy.position.set(h.x, dropY, h.z);
          this.dummy.rotation.set(0, 0, 0);
          this.dummy.scale.setScalar(1.0);
          this.dummy.updateMatrix();
          this.handMesh.setMatrixAt(i, this.dummy.matrix);
          this.handWireMesh.setMatrixAt(i, this.dummy.matrix);

          this.dummy.position.set(h.x, 0.03, h.z);
          this.dummy.rotation.set(0, 0, 0);
          this.dummy.scale.set(1.0, 1.0, 1.0);
          this.dummy.updateMatrix();
          this.handZoneMesh.setMatrixAt(i, this.dummy.matrix);
        } else {
          this.hideInstance(this.handMesh, i);
          this.hideInstance(this.handWireMesh, i);
          this.hideInstance(this.handZoneMesh, i);
        }
      }
      this.handMesh.instanceMatrix.needsUpdate = true;
      this.handWireMesh.instanceMatrix.needsUpdate = true;
      this.handZoneMesh.instanceMatrix.needsUpdate = true;
      return;
    }

    // =========================================================================
    // MODE D: 2ND OVERCLOCK (136s-142s) -> Slowed Yellow Pillars of Light w/ Electric Charge
    //         & POST-OVERCLOCK (142s+) -> Black Pillars with Red Outline w/ Electric Charge!
    // =========================================================================
    this.pillarCoreMesh.visible = true;
    this.pillarOutlineMesh.visible = true;
    this.chargeRingMesh.visible = true;

    const isSecondOverclock = state.stage2BurstActive;
    if (isSecondOverclock) {
      // Retained Yellow Pillars of Light with yellow electric charge rings
      this.pillarCoreMat.color.set('#fde047');
      this.pillarCoreMat.emissive.set('#ffbe3b');
      this.pillarCoreMat.emissiveIntensity = 1.65;
      this.pillarCoreMat.opacity = 0.92;
      this.pillarOutlineMat.color.set('#fef08a');
      this.chargeRingMat.color.set('#fef08a');
    } else {
      // Post-2nd Overclock (142s+): Pitch Black Pillars with bright Red Outline & Red Electric Charge!
      this.pillarCoreMat.color.set('#050508');
      this.pillarCoreMat.emissive.set('#080104');
      this.pillarCoreMat.emissiveIntensity = 0.4;
      this.pillarCoreMat.opacity = 0.98;
      this.pillarOutlineMat.color.set('#ff1a35');
      this.chargeRingMat.color.set('#ff1a35');
    }

    for (let i = 0; i < this.pillarLimit; i++) {
      const p = this.pillars[i];
      p.z += state.speed * worldDt;
      p.phase += worldDt * 9.5;
      if (p.hitCooldown > 0) p.hitCooldown -= worldDt;

      if (p.z > 10) {
        p.z = -150 - Math.random() * 45;
        p.lane = this.pickFairLane(this.pillars, p.z);
        p.x = LANES[p.lane];
        p.active = true;
        p.grazed = false;
        p.hitCooldown = 0;
      }

      if (p.active && p.hitCooldown <= 0 && Math.abs(p.z) < 1.05 && cat.y < 3.0) {
        if (p.lane === cat.laneIndex || Math.abs(p.x - cat.x) < 1.0) {
          p.hitCooldown = 1.0;
          p.active = false;
          p.grazed = true;
          if (phaseProtected) {
            if (onPhase) onPhase();
          } else {
            // Post-179s Dual Overdrive retains 80% speed (only 20% hindered!)
            cat.applyImpactSlowdown(state.overdriveMode);
            if (onHit) onHit();
          }
        }
      }

      if (p.active && !p.grazed && p.z > 0.3 && p.z < 3.6 && Math.abs(p.lane - cat.laneIndex) === 1) {
        p.grazed = true;
        if (onGraze) onGraze(p.x, 0.9);
      }

      if (
        p.active &&
        p.hitCooldown <= 0 &&
        state.tearCount >= 5 &&
        lily &&
        lily.group.visible &&
        Math.abs(p.z - lily.z) < 1.05 &&
        Math.abs(p.x - lily.x) < 1.0
      ) {
        p.hitCooldown = 1.0;
        p.active = false;
        if (!phaseProtected) {
          lily.applyImpactSlowdown(state.overdriveMode);
          if (onLilyHit) onLilyHit(lily.x, lily.z);
        }
      }

      if (p.active) {
        this.dummy.position.set(p.x, 0, p.z);
        this.dummy.rotation.set(0, 0, 0);
        this.dummy.scale.setScalar(1.0);
        this.dummy.updateMatrix();
        this.pillarCoreMesh.setMatrixAt(i, this.dummy.matrix);
        this.pillarOutlineMesh.setMatrixAt(i, this.dummy.matrix);

        // Animated electric charge ring sliding rapidly up & down the pillar
        const chargeY = 0.6 + ((Math.sin(p.phase) * 0.5 + 0.5) * 4.8);
        const chargeScale = 1.0 + Math.sin(p.phase * 2.3) * 0.25;
        this.dummy.position.set(p.x, chargeY, p.z);
        this.dummy.rotation.set(0, p.phase, 0);
        this.dummy.scale.set(chargeScale, 1, chargeScale);
        this.dummy.updateMatrix();
        this.chargeRingMesh.setMatrixAt(i, this.dummy.matrix);
      } else {
        this.hideInstance(this.pillarCoreMesh, i);
        this.hideInstance(this.pillarOutlineMesh, i);
        this.hideInstance(this.chargeRingMesh, i);
      }
    }
    this.pillarCoreMesh.instanceMatrix.needsUpdate = true;
    this.pillarOutlineMesh.instanceMatrix.needsUpdate = true;
    this.chargeRingMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * Normalized 3-lane hazard descriptors for predictive AI dodge controller:
   * each entry gives { z, coveredLanes: number[] }
   */
  getObstaclesRef() {
    return {
      vehicles: this.carMesh.visible ? this.vehicles : [],
      debris: this.landMesh.visible ? this.debris : [],
      handStomps: this.handMesh.visible ? this.handStomps : [],
      pillars: this.pillarCoreMesh.visible ? this.pillars : []
    };
  }
}
