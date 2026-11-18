import { LANES } from '../core/GameState.js';

/**
 * Predictive 3-Lane AI Playthrough Controller for Project WIWI.
 * Forecasts 3-lane vehicles, collapsed world debris, 2-lane Synthwave Titan Hand stomps,
 * and electric Light / Black-Red Pillars ahead of the cat, selecting the safest lane closest
 * to the laser slipstream while respecting stage boost/burst locks.
 */
export class AutopilotAI {
  constructor() {
    this.enabled = false;
    this.boostRecovering = false;
    this.targetLane = 1;
    this.targetX = 0;
  }

  reset() {
    this.boostRecovering = false;
    this.targetLane = 1;
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

    const phaseProtected = state.burstActive;
    const speed = Math.max(18, state.speed);
    const lookahead = Math.min(115, 42 + speed * 0.65);

    const { vehicles = [], debris = [], handStomps = [], pillars = [] } = obstaclesRef;
    let bestLane = 1;
    let bestScore = Infinity;
    let emergencyThreat = false;

    for (let laneIdx = 0; laneIdx < LANES.length; laneIdx++) {
      const candX = LANES[laneIdx];
      // Slight preference toward whichever lane stays closest to the laser slipstream
      let score = Math.abs(candX - laserX) * 1.1;

      if (!phaseProtected) {
        // 1. Evaluate 1-lane obstacles (Stage 2/3 Cars & Bikes, 38s+ Debris, 136s+ Pillars)
        const singleLists = [vehicles, debris, pillars];
        for (let listIdx = 0; listIdx < singleLists.length; listIdx++) {
          const list = singleLists[listIdx];
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (!item.active || item.z > 1.8 || item.z < -lookahead) continue;
            if (item.lane === laneIdx) {
              const distZ = Math.max(0.2, -item.z);
              const norm = Math.max(0, 1 - distZ / lookahead);
              const urgency = norm * norm * norm;
              score += (distZ < 28 ? 2400 : 120) + urgency * 1800;
              if (distZ < 16 && cat.laneIndex === laneIdx) {
                emergencyThreat = true;
              }
            }
          }
        }

        // 2. Evaluate 2-lane Giant Synthwave Titan Hand Stomps
        for (let i = 0; i < handStomps.length; i++) {
          const h = handStomps[i];
          if (!h.active || h.z > 2.4 || h.z < -lookahead * 1.1) continue;
          if (h.coveredLanes.includes(laneIdx)) {
            const distZ = Math.max(0.2, -h.z);
            const norm = Math.max(0, 1 - distZ / (lookahead * 1.1));
            const urgency = norm * norm * norm;
            score += (distZ < 34 ? 3200 : 180) + urgency * 2200;
            if (distZ < 20 && h.coveredLanes.includes(cat.laneIndex)) {
              emergencyThreat = true;
            }
          }
        }
      }

      if (score < bestScore) {
        bestScore = score;
        bestLane = laneIdx;
      }
    }

    this.targetLane = bestLane;
    this.targetX = LANES[bestLane];

    if (!state.boostUnlocked) {
      this.boostRecovering = false;
    } else if (state.boostEnergy <= 0.05) {
      this.boostRecovering = true;
    } else if (state.boostEnergy >= 0.22) {
      this.boostRecovering = false;
    }
    const wantsBoost = state.boostUnlocked && !this.boostRecovering && state.boostEnergy > 0.04;

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
      targetLane: bestLane,
      left: bestLane < (cat.laneIndex ?? 1),
      right: bestLane > (cat.laneIndex ?? 1),
      boost: wantsBoost
    };
  }
}
