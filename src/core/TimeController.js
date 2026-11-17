/**
 * Explicit multi-domain time controller for Project FELIS.
 * Keeps realTime, playerTime, worldTime, and cinematicTime independent.
 */
export class TimeController {
  constructor() {
    this.reset();
  }

  reset() {
    this.paused = false;
    this.realDt = 0;
    this.playerDt = 0;
    this.worldDt = 0;
    this.cinematicDt = 0;

    this.playerScale = 1.0;
    this.worldScale = 1.0;
    this.cinematicScale = 1.0;

    this.targetPlayerScale = 1.0;
    this.targetWorldScale = 1.0;
    this.targetCinematicScale = 1.0;

    this.realElapsed = 0;
  }

  setPaused(paused) {
    this.paused = Boolean(paused);
  }

  setDomainTargets({ player = 1.0, world = 1.0, cinematic = 1.0 }) {
    this.targetPlayerScale = player;
    this.targetWorldScale = world;
    this.targetCinematicScale = cinematic;
  }

  step(rawSeconds) {
    // Clamp large frame deltas after tab switches or hiccups
    const clamped = Math.min(Math.max(rawSeconds, 0), 0.05);
    this.realDt = clamped;
    this.realElapsed += clamped;

    if (this.paused) {
      this.playerDt = 0;
      this.worldDt = 0;
      this.cinematicDt = 0;
      return;
    }

    const lerpRate = 1 - Math.exp(-10 * clamped);
    this.playerScale += (this.targetPlayerScale - this.playerScale) * lerpRate;
    this.worldScale += (this.targetWorldScale - this.worldScale) * lerpRate;
    this.cinematicScale += (this.targetCinematicScale - this.cinematicScale) * lerpRate;

    this.playerDt = clamped * this.playerScale;
    this.worldDt = clamped * this.worldScale;
    this.cinematicDt = clamped * this.cinematicScale;
  }
}
