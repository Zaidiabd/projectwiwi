const BEST_DIST_KEY = 'project_wiwi_best_dist_v1';

export const RUN_DURATION_SECONDS = 216.0;
export const TARGET_CATCH_DISTANCE = 23000;

export const TIMELINE = {
  act2Start: 10.0,
  slowmoAndBurstUnlock: 26.0,
  tear1: 38.0,
  tear2: 50.0,
  tear3RiftGates: 62.0,
  tear4: 75.0,
  burst2Start: 136.0,
  burst2End: 142.0,
  tear5: 142.0,
  overdrivePowerup: 179.0,
  finish: RUN_DURATION_SECONDS
};

export const STAGES = [
  { id: 1, code: 'STAGE I', name: 'THE CHASE', startSec: 0 },
  { id: 2, code: 'STAGE II', name: 'ACCELERATION', startSec: TIMELINE.act2Start },
  { id: 3, code: 'STAGE III', name: 'OVERCLOCK SLOW-MO', startSec: TIMELINE.slowmoAndBurstUnlock },
  { id: 4, code: 'TEAR I', name: 'FABRIC BREACH // CHARGED', startSec: TIMELINE.tear1 },
  { id: 5, code: 'TEAR II', name: 'DIMENSIONAL SURGE', startSec: TIMELINE.tear2 },
  { id: 6, code: 'TEAR III', name: 'RIFT PYLON GATES', startSec: TIMELINE.tear3RiftGates },
  { id: 7, code: 'TEAR IV', name: 'HYPERSTORM RUPTURE', startSec: TIMELINE.tear4 },
  { id: 8, code: 'BURST II', name: 'STAGE II TEMPORAL BURST', startSec: TIMELINE.burst2Start },
  { id: 9, code: 'TEAR V', name: 'FINAL COLLAPSE', startSec: TIMELINE.tear5 },
  { id: 10, code: 'OVERDRIVE', name: 'DUAL OVERDRIVE', startSec: TIMELINE.overdrivePowerup },
  { id: 11, code: 'ACT V', name: 'THE LASER REVEAL', startSec: TIMELINE.finish }
];

export class GameState {
  constructor() {
    this.bestDistance = this.loadBestDistance();
    this.reset();
  }

  loadBestDistance() {
    try {
      const raw = localStorage.getItem(BEST_DIST_KEY);
      if (!raw) return null;
      const val = Number(raw);
      return Number.isFinite(val) && val > 0 ? val : null;
    } catch {
      return null;
    }
  }

  saveBestDistance(meters) {
    try {
      localStorage.setItem(BEST_DIST_KEY, meters.toFixed(1));
    } catch {
      // Ignore storage quota errors
    }
  }

  reset() {
    this.phase = 'start'; // start | playing | paused | ending | ended
    this.stageIndex = 0;
    this.tearCount = 0; // 0..5

    this.distance = 0;
    this.progress = 0; // 0..1 mapped to 216s audio timeline

    this.speed = 0;
    this.peakSpeed = 0;
    this.normalizedSpeed = 0;

    this.boostEnergy = 1.0;
    this.isBoosting = false;

    this.burstUnlocked = false;
    this.burstCharge = 0.0;
    this.burstActive = false;
    this.burstTimer = 0;
    this.burstStage = 1; // 1 = cyan burst, 2 = distinct golden-crimson Stage 2 burst
    this.stage2BurstActive = false;

    this.bodyChargeLevel = 0; // 0 before 38s, 1..5 escalating at each tear
    this.riftGateMode = false; // lane-locked Dimensional Rift Pylon gates starting at 62s
    this.overdriveMode = false; // Dual Overdrive powerup on both Wiwi & Lily halfway through TEAR V (179s+)

    // Collectible pickup powerup buffs
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.surgeTimer = 0;
    this.powerupsCollected = 0;

    this.slipstreamAlignment = 0;
    this.realityIntegrity = 1.0;

    this.runElapsed = 0;
    this.stageSplits = {};
    this.isNewBest = false;

    this.endingStep = 0;
    this.endingTimer = 0;
    this.wiwiWon = false;
    this.hasMovedOnce = false;
  }

  get currentStage() {
    return STAGES[this.stageIndex] || STAGES[0];
  }

  // Compatibility alias for existing modules using intensity tier 0..4
  get actIndex() {
    if (this.stageIndex >= 10) return 4;
    if (this.stageIndex >= 3) return 3;
    if (this.stageIndex === 2) return 2;
    if (this.stageIndex === 1) return 1;
    return 0;
  }

  updateTimelineFromSeconds() {
    const t = this.runElapsed;
    this.progress = Math.min(1, Math.max(0, t / RUN_DURATION_SECONDS));

    let nextStage = 0;
    for (let i = 0; i < STAGES.length; i++) {
      if (t >= STAGES[i].startSec) {
        nextStage = i;
      }
    }

    const prevStage = this.stageIndex;
    const prevTearCount = this.tearCount;

    if (nextStage > prevStage) {
      this.stageIndex = nextStage;
      this.stageSplits[STAGES[nextStage].code] = t;
    }

    // Unlock Space Temporal Burst at 26s
    if (!this.burstUnlocked && t >= TIMELINE.slowmoAndBurstUnlock) {
      this.burstUnlocked = true;
      this.burstCharge = 1.0;
    }

    // Escalating tear count
    let nextTears = 0;
    if (t >= TIMELINE.tear5) nextTears = 5;
    else if (t >= TIMELINE.tear4) nextTears = 4;
    else if (t >= TIMELINE.tear3RiftGates) nextTears = 3;
    else if (t >= TIMELINE.tear2) nextTears = 2;
    else if (t >= TIMELINE.tear1) nextTears = 1;

    this.tearCount = nextTears;
    this.bodyChargeLevel = nextTears;
    this.riftGateMode = t >= TIMELINE.tear3RiftGates;
    this.stage2BurstActive = t >= TIMELINE.burst2Start && t < TIMELINE.burst2End;
    if (t >= TIMELINE.burst2Start) {
      this.burstStage = 2;
    }
    this.overdriveMode = t >= TIMELINE.overdrivePowerup;

    return {
      stageChanged: nextStage !== prevStage,
      newTearTriggered: nextTears > prevTearCount,
      enteredBurst2: prevStage < 7 && nextStage === 7,
      enteredOverdrive: prevStage < 9 && nextStage === 9,
      enteredEnding: nextStage >= 10 && prevStage < 10
    };
  }

  completeRun() {
    this.wiwiWon = this.distance >= TARGET_CATCH_DISTANCE;
    if (this.bestDistance === null || this.distance > this.bestDistance) {
      this.bestDistance = this.distance;
      this.isNewBest = true;
      this.saveBestDistance(this.bestDistance);
    }
  }
}
