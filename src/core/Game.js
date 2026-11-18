import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { QualitySettings } from './QualitySettings.js';
import { TimeController } from './TimeController.js';
import { GameState } from './GameState.js';

import { CatController } from '../player/CatController.js';
import { LilyController } from '../player/LilyController.js';
import { FollowCamera } from '../player/FollowCamera.js';
import { AutopilotAI } from '../player/AutopilotAI.js';

import { Environment } from '../world/Environment.js';
import { Corridor } from '../world/Corridor.js';
import { VoidWorld } from '../world/VoidWorld.js';
import { RiftWorld } from '../world/RiftWorld.js';
import { ObstacleSystem } from '../world/ObstacleSystem.js';
import { PowerupSystem } from '../world/PowerupSystem.js';

import { AfterimageSystem } from '../effects/AfterimageSystem.js';
import { LightningSystem } from '../effects/LightningSystem.js';
import { RiftEffect } from '../effects/RiftEffect.js';
import { SpeedEffects } from '../effects/SpeedEffects.js';
import { CompositeShader } from '../effects/CompositeShader.js';

import { AudioManager } from '../audio/AudioManager.js';
import { HUD } from '../ui/HUD.js';
import { Menus } from '../ui/Menus.js';
import { TouchControls } from '../ui/TouchControls.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    const isMobile =
      window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 820;
    this.quality = new QualitySettings(isMobile ? 'low' : 'medium');
    this.time = new TimeController();
    this.state = new GameState();

    this.scene = new THREE.Scene();
    this.cameraCtrl = new FollowCamera(window.innerWidth / window.innerHeight);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    // World & Player
    this.environment = new Environment(this.scene);
    this.corridor = new Corridor(this.scene);
    this.voidWorld = new VoidWorld(this.scene);
    this.riftWorld = new RiftWorld(this.scene);
    this.obstacles = new ObstacleSystem(this.scene);
    this.powerups = new PowerupSystem(this.scene);
    this.cat = new CatController(this.scene);
    this.lily = new LilyController(this.scene);
    this.autopilot = new AutopilotAI();

    // VFX
    this.afterimages = new AfterimageSystem(
      this.scene,
      this.cat.getSpriteTexture(),
      this.cat.manifest.groundPivotY
    );
    this.lightning = new LightningSystem(this.scene);
    this.rift = new RiftEffect(this.scene);
    this.speedEffects = new SpeedEffects(this.scene);

    // Audio & UI
    this.audio = new AudioManager();
    this.hud = new HUD();
    this.touch = new TouchControls(() => this.tryTriggerBurst());
    this.menus = new Menus({
      onStart: (useAI = false) => this.startRun(useAI),
      onPause: () => this.pauseRun(),
      onResume: () => this.resumeRun(),
      onRestart: (useAI = false) => this.restartRun(useAI),
      onToggleAI: () => this.toggleAI(),
      onToggleMute: () => this.audio.toggleMute(),
      onAudioUpload: (file) => this.audio.loadLocalFile(file),
      onVolumeChange: (val) => this.audio.setVolume(val),
      onQualityChange: (tier) => this.quality.setTier(tier)
    });

    // Post-processing
    this.composer = null;
    this.bloomPass = null;
    this.compositePass = null;
    this.crackValue = 0;
    this.shatterProgress = 0;
    this.initPostProcessing();

    this.quality.onChange(() => this.applyQuality());
    this.menus.syncQualityButtons(this.quality.tier);
    this.applyQuality();

    // Warm up shaders at startup to avoid mid-run compile hitches
    try {
      this.renderer.compile(this.scene, this.cameraCtrl.camera);
    } catch {
      // Non-fatal on restricted WebGL contexts
    }

    // Input state
    this.keys = {
      forward: false,
      left: false,
      right: false,
      boost: false
    };

    this.flashValue = 0;
    this.rippleValue = 0;
    this.overclockSlowmoTimer = 0;
    this.contextLost = false;
    this.lastFrameMs = performance.now();

    this.bindEvents();
    this.menus.showStart();
    this.hud.setVisible(false);
    this.touch.setVisible(false);

    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  initPostProcessing() {
    try {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.cameraCtrl.camera));

      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(Math.floor(w * 0.5), Math.floor(h * 0.5)),
        0.45,
        0.55,
        0.72
      );
      this.composer.addPass(this.bloomPass);

      this.compositePass = new ShaderPass(CompositeShader);
      this.composer.addPass(this.compositePass);
      this.composer.addPass(new OutputPass());
    } catch {
      this.composer = null;
    }
  }

  applyQuality() {
    const cfg = this.quality.config;
    const dpr = this.quality.effectiveDpr;
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);

    if (this.composer) {
      this.composer.setPixelRatio(dpr);
      this.composer.setSize(w, h);
      if (this.bloomPass) {
        this.bloomPass.enabled = cfg.bloom;
        this.bloomPass.strength = cfg.bloomStrength;
      }
    }

    this.corridor.setQualityCount(cfg.corridorArches);
    this.voidWorld.setQualityCount(cfg.voidStreaks);
    this.riftWorld.setQualityCount(cfg.riftShards);
    this.afterimages.setQualityCount(cfg.afterimagePool);
    this.lightning.setQualityCount(cfg.lightningBolts);
    this.obstacles.setQualityCount(cfg.obstacles);
    this.powerups.setQualityCount(cfg.obstacles);
    this.speedEffects.setQualityCount(cfg.id);
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.cameraCtrl.resize(window.innerWidth / window.innerHeight);
      this.applyQuality();
      this.touch.setVisible(this.state.phase === 'playing');
    });

    window.addEventListener('keydown', (e) => {
      const activePlay = this.state.phase === 'playing';
      if (
        activePlay &&
        (e.code === 'Space' ||
          e.code === 'ArrowUp' ||
          e.code === 'ArrowDown' ||
          e.code === 'ArrowLeft' ||
          e.code === 'ArrowRight')
      ) {
        e.preventDefault();
      }

      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.forward = true;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = true;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = true;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.boost = true;

      if (e.code === 'Space' && !e.repeat && activePlay) {
        this.tryTriggerBurst();
      }

      if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
        if (this.state.phase === 'playing') this.pauseRun();
        else if (this.state.phase === 'paused') this.resumeRun();
      }

      if (e.code === 'KeyM' && !e.repeat) {
        const muted = this.audio.toggleMute();
        this.menus.muteBtn.textContent = muted ? 'MUTED' : 'SFX ON';
      }

      if (e.code === 'KeyI' && !e.repeat && activePlay) {
        const enabled = this.toggleAI();
        this.menus.syncAIButton(enabled);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.forward = false;
      if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = false;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = false;
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.keys.boost = false;
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state.phase === 'playing') {
        this.pauseRun();
      }
    });

    window.addEventListener('blur', () => {
      this.keys.forward = false;
      this.keys.left = false;
      this.keys.right = false;
      this.keys.boost = false;
    });

    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.contextLost = true;
      if (this.state.phase === 'playing') this.pauseRun();
    });

    this.canvas.addEventListener('webglcontextrestored', () => {
      this.contextLost = false;
      this.applyQuality();
    });
  }

  tryTriggerBurst() {
    if (this.state.phase !== 'playing') return;
    // Space Temporal Burst is locked before 26 seconds
    if (!this.state.burstUnlocked) return;
    if (this.state.burstActive || this.state.stage2BurstActive || this.state.burstCharge < 0.35) return;
    this.state.burstActive = true;
    this.state.burstTimer = 2.4 * this.state.burstCharge;
    this.state.burstCharge = 0;
    this.flashValue = this.state.burstStage === 2 ? 0.36 : 0.24;
    this.rippleValue = 0.65;
    this.speedEffects.spawnShockwave(
      this.cat.x,
      this.cat.y + 0.55,
      0.1,
      this.state.burstStage === 2 ? '#ffbe3b' : '#22e6ff',
      9.5
    );
    this.audio.playTemporalBurst();
  }

  toggleAI() {
    this.autopilot.setEnabled(!this.autopilot.enabled);
    return this.autopilot.enabled;
  }

  startRun(useAI = false) {
    this.resetSimulation();
    this.autopilot.setEnabled(useAI);
    this.menus.syncAIButton(useAI);
    this.state.phase = 'playing';
    this.cat.triggerAlert();
    this.menus.showPlaying();
    this.hud.setVisible(true);
    this.touch.setVisible(!useAI);
    this.audio.startRun();
  }

  pauseRun() {
    if (this.state.phase !== 'playing') return;
    this.state.phase = 'paused';
    this.time.setPaused(true);
    this.audio.pause();
    this.touch.setVisible(false);
    this.menus.showPause();
  }

  resumeRun() {
    if (this.state.phase !== 'paused') return;
    this.state.phase = 'playing';
    this.time.setPaused(false);
    this.audio.resume();
    this.menus.showPlaying();
    this.touch.setVisible(!this.autopilot.enabled);
  }

  restartRun(useAI = false) {
    this.startRun(useAI);
  }

  resetSimulation() {
    this.time.reset();
    this.state.reset();
    this.cat.reset();
    this.lily.reset();
    this.autopilot.reset();
    this.cameraCtrl.reset();
    this.environment.reset();
    this.corridor.reset();
    this.voidWorld.reset();
    this.riftWorld.reset();
    this.obstacles.reset();
    this.powerups.reset();
    this.afterimages.reset();
    this.lightning.reset();
    this.rift.reset();
    this.speedEffects.reset();
    this.touch.reset();
    this.flashValue = 0;
    this.rippleValue = 0;
    this.crackValue = 0;
    this.shatterProgress = 0;
    this.overclockSlowmoTimer = 0;
  }

  beginEnding() {
    this.state.phase = 'ending';
    this.state.endingStep = 0;
    this.state.endingTimer = 0;
    this.crackValue = Math.max(this.crackValue, 0.96);
    this.shatterProgress = 0;
    this.state.completeRun();
    this.touch.setVisible(false);
    this.hud.setVisible(false);
    this.cat.triggerLeap(10.5);
    this.lily.triggerLeap(10.0);
  }

  updateEnding(realDt) {
    this.state.endingTimer += realDt;
    const t = this.state.endingTimer;
    const wiwiWon = this.state.wiwiWon;

    if (this.shatterProgress > 0 && this.shatterProgress < 1.0) {
      this.shatterProgress = Math.min(1.0, this.shatterProgress + realDt * 1.18);
      this.crackValue = Math.max(0, 1.0 - this.shatterProgress * 1.25);
    }

    if (this.state.endingStep === 0 && t >= 0.85) {
      // Right after both Wiwi & Lily jump: screen SMASHES open into quiet Act V living room!
      this.state.endingStep = 1;
      this.flashValue = 0.85;
      this.shatterProgress = 0.02;
      this.audio.cutToSilence();
      this.audio.playScreenSmash();
      this.afterimages.reset();
      this.lightning.reset();
      this.rift.reset();
    } else if (this.state.endingStep === 1 && t >= 1.55) {
      // Big long-haired black-and-white Lily joins the chase! Wiwi gets annoyed (💢)
      this.state.endingStep = 2;
      this.audio.playAnnoyedPop();
    } else if (this.state.endingStep === 2 && t >= 3.05) {
      // Threshold race resolves: Wiwi catches dot OR Lily steals it!
      this.state.endingStep = 3;
      if (wiwiWon) {
        this.audio.playLaserCatch();
      } else {
        this.audio.playLilySteal();
      }
    } else if (this.state.endingStep === 3 && t >= 4.35) {
      this.state.endingStep = 4;
      this.state.phase = 'ended';
      this.menus.showEnding(this.state);
    }

    this.cat.updateEndingPose(realDt, this.state.endingStep, wiwiWon, t);
    this.lily.updateEnding(realDt, this.state.endingStep, wiwiWon, t);
    this.environment.updateEnding(realDt, this.state.endingStep);
    this.cameraCtrl.updateEnding(realDt, this.cat, this.state.endingStep);
  }

  loop(nowMs) {
    requestAnimationFrame(this.loop);
    if (this.contextLost) return;

    const rawDt = (nowMs - this.lastFrameMs) / 1000;
    this.lastFrameMs = nowMs;
    this.time.step(rawDt);

    const realDt = this.time.realDt;
    const beatEnergy = this.audio.update(realDt, this.state);

    if (this.state.phase === 'playing') {
      // Lock runElapsed tightly to audio clock when full-length track is actively playing
      const audioClock = this.audio.getSyncedTrackTime();
      if (audioClock !== null && audioClock > 0.2 && audioClock < 216.5) {
        const drift = audioClock - this.state.runElapsed;
        if (Math.abs(drift) > 0.25) {
          this.state.runElapsed = audioClock;
        } else {
          this.state.runElapsed += realDt + drift * Math.min(1, realDt * 4.0);
        }
      } else {
        this.state.runElapsed += realDt;
      }

      // Temporal burst & overclock time-domain scaling
      if (this.state.burstActive) {
        this.state.burstTimer -= realDt;
        if (this.state.burstTimer <= 0) {
          this.state.burstActive = false;
          this.state.burstTimer = 0;
        }
      }

      if (this.overclockSlowmoTimer > 0) {
        this.overclockSlowmoTimer -= realDt;
      }

      const targetWorldScale = this.state.stage2BurstActive
        ? 0.16
        : this.state.burstActive
          ? 0.24
          : this.overclockSlowmoTimer > 0
            ? 0.42
            : 1.0;
      const targetPlayerScale = this.state.stage2BurstActive
        ? 1.24
        : this.state.burstActive
          ? 1.15
          : 1.0;

      this.time.setDomainTargets({
        player: targetPlayerScale,
        world: targetWorldScale,
        cinematic: 1.0
      });

      if (this.state.shieldTimer > 0) {
        this.state.shieldTimer = Math.max(0, this.state.shieldTimer - realDt);
        this.state.shieldActive = this.state.shieldTimer > 0;
      }
      if (this.state.surgeTimer > 0) {
        this.state.surgeTimer = Math.max(0, this.state.surgeTimer - realDt);
      }

      const aiInput = this.autopilot.enabled
        ? this.autopilot.computeInput(
            this.cat,
            this.state,
            this.environment.laserX,
            this.obstacles.getObstaclesRef(),
            this.time.worldScale,
            () => this.tryTriggerBurst(),
            this.powerups.getPowerupsRef()
          )
        : null;

      const mergedInput = aiInput || {
        forward: this.keys.forward || this.touch.state.forward,
        left: this.keys.left || this.touch.state.left,
        right: this.keys.right || this.touch.state.right,
        boost: this.keys.boost || this.touch.state.boost
      };

      this.cat.update(
        this.time.playerDt,
        mergedInput,
        this.state,
        this.environment.laserX,
        this.time.worldScale
      );

      const events = this.state.updateTimelineFromSeconds();
      if (events.stageChanged) {
        if (this.state.stageIndex === 2) {
          // 26s: Slow-motion animation & unlock Space Temporal Burst
          this.overclockSlowmoTimer = 2.8;
          this.flashValue = 0.26;
          this.audio.playTemporalBurst();
          this.hud.showBanner('STAGE III // 26s', 'OVERCLOCK SLOW-MO • TEMPORAL BURST UNLOCKED', '#22e6ff', 3.0);
        } else if (events.enteredBurst2) {
          // 136s-142s: Distinct Stage 2 Temporal Burst
          this.flashValue = 0.55;
          this.rippleValue = 0.75;
          this.speedEffects.spawnShockwave(this.cat.x, this.cat.y + 0.55, 0.1, '#ffbe3b', 11.5);
          this.audio.playTemporalBurst();
          this.hud.showBanner('BURST II // 136s', 'STAGE II TEMPORAL BURST ENGAGED', '#ffbe3b', 3.2);
        } else if (events.enteredOverdrive) {
          // 179s: Halfway through TEAR V -> Dual Overdrive on BOTH Wiwi & Lily!
          this.flashValue = 0.72;
          this.rippleValue = 1.0;
          this.overclockSlowmoTimer = 0.9;
          this.speedEffects.spawnShockwave(this.cat.x, this.cat.y + 0.55, 0.1, '#38f3ff', 14.0, 0.7);
          this.speedEffects.spawnImpactBurst(this.cat.x, this.cat.y, 0.1, '#ff2a4b', 18);
          this.speedEffects.spawnShockwave(this.lily.x, 0.35, this.lily.z, '#34d399', 11.5, 0.65);
          this.speedEffects.spawnImpactBurst(this.lily.x, 0.85, this.lily.z, '#fb7185', 18);
          this.audio.playTemporalBurst();
          this.audio.playPhaseShimmer();
          this.hud.showBanner('OVERDRIVE // 179s', 'DUAL OVERDRIVE • WIWI & LILY UNLEASHED!', '#38f3ff', 3.4);
        } else if (events.enteredEnding) {
          // 216s: Final leap into the Laser Reveal
          this.beginEnding();
        }
      }

      if (events.newTearTriggered && this.state.phase === 'playing') {
        // Space-time tear breach flash + brief impact surge at 38s, 50s, 62s, 75s, 142s
        this.flashValue = Math.min(0.85, 0.42 + this.state.tearCount * 0.08);
        this.rippleValue = 0.85;
        this.overclockSlowmoTimer = 0.65;
        this.speedEffects.spawnShockwave(this.cat.x, this.cat.y + 0.55, 0.1, '#a855f7', 12.0);
        this.audio.playPhaseShimmer();

        if (this.state.tearCount === 1) {
          this.hud.showBanner('TEAR I // 38s', 'SPACE-TIME BREACH • BODY CHARGE ACTIVE', '#a855f7', 2.8);
        } else if (this.state.tearCount === 2) {
          this.hud.showBanner('TEAR II // 50s', 'DIMENSIONAL SURGE INTENSIFYING', '#c084fc', 2.6);
        } else if (this.state.tearCount === 3) {
          this.hud.showBanner('TEAR III // 62s', 'RIFT PYLON GATES ACTIVE • STAY IN CLEAR LANES', '#2dd4bf', 3.0);
        } else if (this.state.tearCount === 4) {
          this.hud.showBanner('TEAR IV // 75s', 'HYPERSTORM RUPTURE • MAXIMUM ESCALATION', '#e879f9', 3.0);
        } else if (this.state.tearCount === 5) {
          // Lily bursts into the chase at TEAR V (142s)!
          this.audio.playAnnoyedPop();
          this.audio.playRivalAlert();
          this.hud.showBanner('TEAR V // 142s', 'LILY JOINED THE CHASE! REACH 23,000 m!', '#ff2a4b', 3.6);
          this.hud.showRivalAlert('LILY', 'LONG-HAIRED CHALLENGER JOINED TEAR V', '#ff2a4b', 3.6);
        }
      }

      if (this.state.phase === 'playing') {
        this.state.realityIntegrity = Math.max(
          0.0,
          1 - Math.pow(this.state.progress, 1.15)
        );

        this.lily.updateChase(this.time.playerDt, this.cat, this.state, this.environment.laserX);
        this.environment.update(this.time.worldDt, realDt, this.state, beatEnergy);
        this.corridor.update(this.time.worldDt, this.state.speed, this.state.actIndex, this.state.runElapsed, beatEnergy);
        this.voidWorld.update(this.time.worldDt, this.state);
        this.riftWorld.update(this.time.worldDt, this.state, beatEnergy);
        this.obstacles.update(
          this.time.worldDt,
          this.cat,
          this.state,
          () => {
            this.flashValue = 0.16;
            this.speedEffects.spawnImpactBurst(this.cat.x, this.cat.y, 0, '#ff2a4b', 14);
            this.audio.playImpact();
          },
          () => {
            this.state.boostEnergy = Math.min(1, this.state.boostEnergy + 0.15);
            this.speedEffects.spawnImpactBurst(this.cat.x, this.cat.y, 0, '#22e6ff', 10);
            this.audio.playPhaseShimmer();
          },
          () => {
            // Aegis Shield absorbed an obstacle hit!
            this.state.shieldActive = false;
            this.state.shieldTimer = 0;
            this.flashValue = 0.14;
            this.speedEffects.spawnShockwave(this.cat.x, this.cat.y + 0.4, 0.1, '#34d399', 8.5, 0.45);
            this.speedEffects.spawnImpactBurst(this.cat.x, this.cat.y, 0, '#34d399', 14);
            this.audio.playPhaseShimmer();
            this.hud.showBanner('AEGIS SHIELD', 'HAZARD ABSORBED • ZERO SLOWDOWN!', '#34d399', 1.8);
          },
          this.lily,
          (lx, lz) => {
            this.speedEffects.spawnImpactBurst(lx, 0.6, lz, '#fb7185', 10);
          }
        );
        this.powerups.update(this.time.worldDt, this.cat, this.state, (spec, px, pz) => {
          this.state.powerupsCollected++;
          if (spec.id === 'surge') {
            this.state.boostEnergy = Math.min(1, this.state.boostEnergy + 0.35);
            this.state.surgeTimer = 3.5;
            this.cat.speed += 12;
          } else if (spec.id === 'shield') {
            this.state.shieldActive = true;
            this.state.shieldTimer = 12.0;
          } else if (spec.id === 'charge') {
            if (this.state.burstUnlocked) {
              this.state.burstCharge = Math.min(1, this.state.burstCharge + 0.45);
            } else {
              this.state.boostEnergy = Math.min(1, this.state.boostEnergy + 0.5);
            }
          }
          this.flashValue = Math.max(this.flashValue, 0.14);
          this.speedEffects.spawnShockwave(px, 0.35, pz, spec.color, 7.5, 0.42);
          this.speedEffects.spawnImpactBurst(px, 0.7, pz, spec.color, 12);
          this.audio.playPowerupPickup();
          this.hud.showBanner(spec.label, spec.sub, spec.color, 2.0);
        });
        this.afterimages.update(this.time.worldDt, this.cat, this.state);
        this.lightning.update(this.time.worldDt, this.cat, this.state, beatEnergy, this.lily);
        this.rift.update(this.time.worldDt, realDt, this.state, beatEnergy);
        this.speedEffects.update(this.time.worldDt, realDt, this.cat, this.lily, this.state);
        this.cameraCtrl.update(realDt, this.cat, this.state, beatEnergy);
        this.hud.update(this.state, this.time, this.renderer, this.quality, this.audio.getTrackTime());
        this.touch.updateBurstUI(this.state);
      }
    } else if (this.state.phase === 'ending' || this.state.phase === 'ended') {
      this.speedEffects.update(realDt, realDt, this.cat, this.lily, this.state);
      this.updateEnding(realDt);
    } else if (this.state.phase === 'start') {
      // Gentle idle animation on start screen
      this.cat.animator.update(realDt);
      this.cat.syncSpriteUV();
      this.environment.laserHalo.scale.setScalar(1 + Math.sin(this.time.realElapsed * 4) * 0.12);
    }

    // Post-processing uniforms + bit-by-bit screen crack escalation -> full smash on Act V leap
    this.flashValue = Math.max(0, this.flashValue - realDt * 1.9);
    this.rippleValue = Math.max(0, this.rippleValue - realDt * 1.6);
    if (this.state.phase === 'playing') {
      const overdriveCrackRamp = this.state.overdriveMode
        ? Math.min(0.18, Math.max(0, (this.state.runElapsed - 179.0) / 36.0) * 0.18)
        : 0;
      const targetCrack =
        this.state.tearCount === 0
          ? 0
          : this.state.tearCount === 1
            ? 0.18
            : this.state.tearCount === 2
              ? 0.34
              : this.state.tearCount === 3
                ? 0.50
                : this.state.tearCount === 4
                  ? 0.68
                  : 0.82 + overdriveCrackRamp;
      this.crackValue += (targetCrack - this.crackValue) * (1 - Math.exp(-3.2 * realDt));
    }
    if (this.compositePass) {
      const isPlaying = this.state.phase === 'playing';
      const spd = isPlaying ? this.state.normalizedSpeed : 0;
      const anyBurst = this.state.burstActive || this.state.stage2BurstActive || this.state.overdriveMode;
      this.compositePass.uniforms.uTime.value = this.time.realElapsed;
      this.compositePass.uniforms.uSpeedBlur.value =
        spd > 0.22 ? (spd - 0.22) * 0.98 + (anyBurst ? 0.42 : 0) : 0;
      this.compositePass.uniforms.uSpeedLines.value =
        isPlaying && (spd > 0.34 || anyBurst)
          ? Math.min(1.25, Math.max(0, (spd - 0.30) * 1.4) + (this.state.overdriveMode ? 0.45 : anyBurst ? 0.25 : 0))
          : 0;
      this.compositePass.uniforms.uSpeedLineColor.value.set(
        this.state.overdriveMode
          ? '#38f3ff'
          : this.state.stage2BurstActive
            ? '#ffbe3b'
            : this.state.tearCount >= 5
              ? '#ff2a4b'
              : '#22e6ff'
      );
      this.compositePass.uniforms.uRipple.value = this.rippleValue;
      this.compositePass.uniforms.uChromatic.value =
        isPlaying && (this.state.actIndex >= 2 || anyBurst)
          ? 0.002 + spd * 0.0068 + this.state.tearCount * 0.0008 + (this.state.overdriveMode ? 0.0025 : 0) + beatEnergy * 0.002
          : 0;
      this.compositePass.uniforms.uVignette.value =
        this.state.phase === 'ending' || this.state.phase === 'ended' ? 0.14 : 0.26 + spd * 0.14;
      this.compositePass.uniforms.uFlash.value = this.flashValue;
      this.compositePass.uniforms.uCrackAmount.value = this.crackValue;
      this.compositePass.uniforms.uShatterProgress.value =
        this.shatterProgress >= 1.0 ? 0.0 : this.shatterProgress;
    }

    if (this.composer && this.quality.config.postProcessing) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.cameraCtrl.camera);
    }
  }
}
