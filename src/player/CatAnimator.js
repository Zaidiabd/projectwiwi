/**
 * Reusable sprite-sheet / texture-atlas animation state machine.
 * Consumes a manifest describing clips & frame UVs so illustrated PNG/WebP
 * atlases or procedural CanvasTexture atlases share the exact same contract.
 */
export class CatAnimator {
  constructor(manifest) {
    this.manifest = manifest;
    this.currentClip = 'idle';
    this.frameIndex = 0;
    this.elapsed = 0;
    this.playbackRate = 1.0;
    this.finished = false;
  }

  play(clipName, { restart = false } = {}) {
    if (!this.manifest.clips[clipName]) return;
    if (this.currentClip === clipName && !restart) return;
    this.currentClip = clipName;
    this.frameIndex = 0;
    this.elapsed = 0;
    this.finished = false;
  }

  setPlaybackRate(rate) {
    this.playbackRate = Math.max(0.25, Math.min(2.4, rate));
  }

  update(dt) {
    const clip = this.manifest.clips[this.currentClip];
    if (!clip) return;

    const frameDuration = 1 / (clip.fps * this.playbackRate);
    this.elapsed += dt;

    while (this.elapsed >= frameDuration) {
      this.elapsed -= frameDuration;
      if (this.frameIndex + 1 < clip.frameCount) {
        this.frameIndex++;
      } else if (clip.loop) {
        this.frameIndex = 0;
      } else {
        this.frameIndex = clip.frameCount - 1;
        this.finished = true;
      }
    }
  }

  getCurrentUVRect() {
    const clip = this.manifest.clips[this.currentClip];
    return clip.frames[this.frameIndex];
  }
}
