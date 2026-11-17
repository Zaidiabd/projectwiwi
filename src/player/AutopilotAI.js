/**
 * Predictive AI Playthrough Controller for Project WIWI.
 * Forecasts static shard and swaying anomaly trajectories ahead of the cat,
 * chooses the safest reachable lane closest to the laser slipstream, and
 * optimizes Boost + Temporal Burst usage for maximum distance / peak speed.
 */
export class AutopilotAI {
  constructor() {
    this.enabled = false;
    this.boostRecovering = false;
    this.targetX = 0;

    // Pre-allocated candidate lane coordinates [-4.8 .. +4.8]
    this.candidates = [];
    for (let i = -12; i <= 12; i++) {
      this.candidates.push(i * 0.4);
    }
  }

  reset() {
    this.boostRecovering = false;
    this.targetX = 0;
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    if (!this.enabled) {
      this.boostRecovering = false;
    }
  }

  computeInput(cat, state, laserX, obstaclesRef, worldScale, onRequestBurst) {
    if (!this.enabled || state.phase !== 'playing') {
      return null;
    }

    const phaseProtected = state.burstActive || state.stage2BurstActive;
    const speed = Math.max(18, state.speed);
    const maxLatVel = 13.0 / (1 + state.normalizedSpeed * 0.42);
    const lookahead = Math.min(95, 36 + speed * 0.62);

    let bestX = laserX;
    let bestScore = Infinity;
    let emergencyThreat = false;

    const { shardsActive, anomaliesActive, shards, anomalies } = obstaclesRef;
    const swayRate = 2.6 + state.tearCount * 0.35;
    const anomSpeedMult = 1.06 + state.tearCount * 0.03;

    for (let c = 0; c < this.candidates.length; c++) {
      const candX = this.candidates[c];
      // Bias gently toward laser slipstream for maximum speed & recharge
      let score = Math.abs(candX - laserX) * 1.15;

      // Slight boundary comfort penalty so we don't hug walls unnecessarily
      if (Math.abs(candX) > 4.4) {
        score += 1.5;
      }

      if (!phaseProtected) {
        // 1. Evaluate static obsidian shards ahead
        if (shardsActive) {
          for (let i = 0; i < shards.length; i++) {
            const s = shards[i];
            if (!s.active || s.z > 1.0 || s.z < -lookahead) continue;

            const distZ = Math.max(0.1, -s.z);
            const dtImpact = distZ / Math.max(12, speed * worldScale);
            const dx = Math.abs(candX - s.x);
            const urgency = 1 - distZ / lookahead;

            // Safe clearance radius = 1.35m (cat + shard + margin)
            if (dx < 1.35) {
              const pen = (1.35 - dx) * (85 + urgency * 340);
              score += pen;
            } else if (dx < 1.85) {
              score += (1.85 - dx) * (12 + urgency * 30);
            }

            // Check if current cat path is threatened imminently
            if (distZ < 16 && Math.abs(cat.x - s.x) < 1.05) {
              emergencyThreat = true;
            }

            // Reachability check: don't pick a lane across a close obstacle if unreachable
            const travelNeeded = Math.abs(candX - cat.x);
            if (distZ < 22 && travelNeeded > maxLatVel * dtImpact * 0.95) {
              score += 18;
            }
          }
        }

        // 2. Evaluate moving/swaying anomaly monoliths ahead (predictive sinusoidal forecast)
        if (anomaliesActive) {
          for (let i = 0; i < anomalies.length; i++) {
            const a = anomalies[i];
            if (!a.active || a.z > 1.0 || a.z < -lookahead) continue;

            const distZ = Math.max(0.1, -a.z);
            const effWorldSpeed = Math.max(12, speed * anomSpeedMult * worldScale);
            const dtImpact = distZ / effWorldSpeed;

            // Forecast where the anomaly will sway at the exact moment it reaches z=0!
            const futurePhase = a.phase + swayRate * worldScale * dtImpact;
            const predX = Math.max(-4.8, Math.min(4.8, a.baseX + Math.sin(futurePhase) * a.swayAmp));
            const futureY = 0.72 + Math.sin(futurePhase * 1.7) * 0.28;

            // Only threat if within vertical hit envelope
            if (Math.abs(futureY - (cat.y + 0.5)) < 1.05) {
              const dxPred = Math.abs(candX - predX);
              const dxNow = Math.abs(candX - a.x);
              const minDx = Math.min(dxPred, dxNow * 1.15);
              const urgency = 1 - distZ / lookahead;

              if (minDx < 1.48) {
                score += (1.48 - minDx) * (95 + urgency * 360);
              } else if (minDx < 2.05) {
                score += (2.05 - minDx) * (14 + urgency * 35);
              }

              if (distZ < 18 && Math.abs(cat.x - predX) < 1.1) {
                emergencyThreat = true;
              }
            }
          }
        }
      }

      if (score < bestScore) {
        bestScore = score;
        bestX = candX;
      }
    }

    this.targetX += (bestX - this.targetX) * 0.68;
    const err = this.targetX - cat.x;
    const deadzone = 0.12;

    // Optimal boost management: hold boost aggressively, allow brief micro-recovery only if depleted
    if (state.boostEnergy <= 0.05) {
      this.boostRecovering = true;
    } else if (state.boostEnergy >= 0.22) {
      this.boostRecovering = false;
    }
    const wantsBoost = !this.boostRecovering && state.boostEnergy > 0.04;

    // Optimal Temporal Burst usage: fire immediately once unlocked & near full, or on emergency threat
    if (
      state.burstUnlocked &&
      !state.burstActive &&
      !state.stage2BurstActive &&
      (state.burstCharge >= 0.92 || (emergencyThreat && state.burstCharge >= 0.4))
    ) {
      onRequestBurst();
    }

    return {
      forward: true,
      left: err < -deadzone,
      right: err > deadzone,
      boost: wantsBoost
    };
  }
}
