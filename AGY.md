# AGY.md --- Project WIWI

> **Project codename:** WIWI\
> **Experience title:** The Last Light\
> **Project type:** Interactive 2.5D browser experience with a 2D character in a real-time 3D world\
> **Primary objective:** Build a polished, playable browser-based
> speed-running experience starring a small black cat named Wiwi. The cat chases a
> laser dot, accelerates beyond normal limits, tears through a surreal
> time-space dimension, and ultimately discovers that the cosmic pursuit
> was only about catching a laser pointer.

------------------------------------------------------------------------

## 1. Project vision

Project WIWI must feel like a small, playable 2.5D game---not a
pre-rendered video, static landing page, or sequence of non-interactive
animations. The cat is a hand-drawn 2D character, while the world, camera,
lighting, particles, dimensional effects, and gameplay space are rendered
in real time in 3D.

The player controls a 2D illustrated cat placed in a 3D world, viewed
from a **third-person chase camera positioned behind and slightly above
the character**. Keep the camera primarily behind the cat so the sprite
reads clearly and does not expose its flatness. The player controls forward
movement and steering, chooses when to boost, and can trigger a temporal
burst. The world responds continuously to the cat's speed.

The experience should build from a quiet, readable opening into a
high-speed, cinematic spectacle. The final reveal must deliver a comedic
contrast: after apparently breaking the universe, the cat catches a
simple laser dot.

### Creative principles

-   The cat is the main character and must remain visually readable
    throughout the experience.
-   Preserve the charm and personality of a cat. Do not make it look
    like a generic wolf, fox, dog, or humanoid mascot.
-   Prioritise convincing quadruped locomotion, camera feel, and
    responsive controls over excessive visual effects.
-   Use a restrained dark palette with cyan, electric blue, violet, and
    occasional laser-red accents.
-   The spectacle should escalate progressively. Do not show every
    effect at maximum intensity from the beginning.
-   The comedy should come from the contrast between cosmic-scale
    consequences and a cat's ordinary motivation.
-   The design, models, names, symbols, environments, UI, and story must
    be original. Do not copy protected characters, assets, logos,
    levels, interfaces, or distinctive designs from existing games.

------------------------------------------------------------------------

## 2. Core player experience

### Camera and movement

-   Third-person camera, behind and slightly above the cat.
-   Camera follows smoothly and looks ahead along the running direction.
-   Camera should not become first-person or switch to a front-facing
    view during normal gameplay.
-   The cat should remain near the lower-middle region of the screen,
    leaving enough view ahead to read the route and destination.
-   Use camera lag, subtle shake, and field-of-view changes
    proportionally to speed.
-   The camera must remain stable and comfortable. Avoid excessive
    shake, sudden snapping, or disorienting camera rolls.
-   Support keyboard controls and mobile touch controls.

### Default controls

  Input                 Action
  --------------------- --------------------
  `W` / `Arrow Up`      Run forward
  `A` / `Arrow Left`    Steer left
  `D` / `Arrow Right`   Steer right
  `Shift` (hold)        Boost / accelerate
  `Space`               Temporal burst
  Touch left / right    Steer on mobile
  Touch BOOST           Hold to accelerate

Controls must be displayed in the interface. Prevent browser scrolling
or unwanted key behaviour while gameplay is active. Provide a visible
start screen and restart option.

### Movement model

-   Forward movement should be continuous and responsive.
-   Acceleration and deceleration should be smoothed rather than
    instantly setting velocity.
-   Boost should increase acceleration and maximum speed while held.
-   Steering should be responsive but become more controlled at extreme
    speed.
-   Temporal burst should provide a brief, clearly communicated speed
    event with a cooldown or recharge rule if required by game balance.
-   The cat's animation speed must be driven by movement speed, but use
    a designed animation curve so limbs do not become visually
    unreadable at extreme speeds.
-   Do not make the character slide sideways unnaturally when steering.

### Skill loop and speed-run mechanics

To make the speed-running objective genuinely interactive rather than
holding a single key:

-   **Laser tracking / slipstream:** The laser dot subtly weaves across
    the path ahead; staying aligned with its trail builds boost/burst
    charge faster and rewards active steering.
-   **Temporal burst utility:** Activating `Space` slows world hazards
    and dimensional turbulence while preserving cat responsiveness,
    allowing the player to thread tight gaps or surge through reality
    shards without losing momentum.
-   **Act splits and personal best:** Track elapsed run time and per-act
    split times, storing the player's local best run in `localStorage`
    for instant replayability.

### Browser input and viewport guards

-   Call `e.preventDefault()` on `Space` and arrow keys only while
    gameplay is active so menus and file pickers remain usable.
-   Apply `touch-action: none` and `user-select: none` on the play
    canvas and touch buttons to prevent mobile scrolling, pull-to-refresh,
    or accidental text selection.
-   Auto-pause simulation cleanly on `visibilitychange` (tab switch) and
    `blur`, and clamp frame delta (`<= 0.05s`) on resume.

------------------------------------------------------------------------

## 3. Narrative and sequence

The experience is structured as five acts synchronized to the 216-second
soundtrack timeline (`runElapsed`), while player steering, boost,
slipstream tracking, and obstacle avoidance drive velocity, distance, and
high-speed intensity:

-   `0s--26s`: Quiet opening (`Act 1`) -> Acceleration corridor (`Act 2`);
    `Space` Temporal Burst stays locked until `26s`.
-   `26s`: Overclock slow-motion animation + `Space` Temporal Burst
    unlocks (`Stage 1`).
-   `38s`: First space-time fabric tear; electric charges emanate from
    Wiwi's body and intensify at every subsequent tear.
-   `50s`: Second space-time tear (`Stage 5`), faster speed ceiling.
-   `62s`: Third space-time tear (`Space Tear Anomaly`); environment
    shifts to a surreal bioluminescent anomaly palette and new swaying
    anomaly obstacles appear.
-   `75s`: Fourth space-time tear; hyperstorm escalation.
-   `136s--142s`: **Stage 2 Temporal Burst** (distinct golden-crimson
    time-dilation surge) leading into the fifth space-time tear at `142s`.
-   `142s--216s`: **TEAR V** — Bigger long-haired black-and-white cat
    **Lily** joins the chase alongside Wiwi while Wiwi displays an
    annoyed pulsing anger symbol (`💢`) overhead.
-   `179s`: **Saiyan Powerup** halfway through TEAR V — Wiwi's fur shifts
    to light yellow with a pulsing golden aura, thick red/black/blue
    ribbon lightning erupts, and supersonic smeared speed afterimages
    surge.
-   `216s`: Final leap into Act 5 (`The Laser Reveal`): clearing
    `>= 23,000 m` lets Wiwi beat Lily to the laser (`UNIVERSE DESTROYED.
    LASER ACQUIRED.`); falling short lets Lily steal it instead.

### Act 1 --- The Chase

**Purpose:** Introduce the cat, the laser, and the controls.

-   Begin in a quiet, minimal environment.
-   Show a small red laser dot ahead of the cat.
-   The cat notices the dot and becomes alert.
-   Display a short, unobtrusive control prompt.
-   The player initiates movement.
-   Keep visual effects restrained.

### Act 2 --- Acceleration

**Purpose:** Establish speed and reward player input.

-   The environment gradually becomes a stylised corridor or abstract
    running space.
-   The player can accelerate and steer.
-   Increase environmental movement, subtle wind effects, and camera
    field of view as speed rises.
-   Introduce a speedometer and acceleration indicator.
-   The laser remains visible ahead and appears just out of reach.

### Act 3 --- Overclock

**Purpose:** Change the visual language and introduce slow-motion
spectacle.

-   Transition the environment toward a deep black void.
-   Add cyan and violet afterimages behind the cat.
-   Use a controlled slow-motion visual moment while the player retains
    control.
-   The cat remains animated and recognisable.
-   Introduce restrained chromatic distortion, streaking light, and
    electrical effects.
-   Increase the sense of scale and speed without obscuring the route.

### Act 4 --- Temporal Rupture

**Purpose:** Deliver the visual climax.

-   The environment begins to fracture as speed and progress increase.
-   Open a large, original dimensional tear ahead.
-   Use procedural lightning, floating fragments, spatial distortion,
    and luminous cracks.
-   The portal must look volumetric and integrated into the 3D
    scene---not like a flat image pasted onto the screen.
-   The world should react to speed and player actions.
-   Keep the cat readable against the effects.

### Act 5 --- The Laser Reveal

**Purpose:** Deliver the comedic payoff.

-   The cat approaches and leaps through the dimensional fracture.

-   At the climax, sharply reduce motion and sound.

-   Reveal a single red laser dot in a simple, quiet environment.

-   The cat catches the dot.

-   The cosmic spectacle resolves into an ordinary, peaceful setting.

-   End card copy:

    **UNIVERSE DESTROYED. LASER ACQUIRED.**

-   Provide a clear restart action.

The reveal must be understandable without dialogue. Use staging, timing,
sound, and animation to communicate the joke.

------------------------------------------------------------------------

## 4. Visual direction

### Character

The cat is a small **gray British Shorthair Munchkin** cat with:

-   recognisable British Shorthair & Munchkin anatomy (round chubby
    cheeks, dense blue-gray plush coat, and short stubby legs);
-   softly rounded pointed ears and expressive golden-copper eyes;
-   a plush flexible tail with secondary motion;
-   visible paws and clear foot contact;
-   subtle pale-silver chest/muzzle accents and cool rim highlights for
    readability;
-   a distinctive silhouette against dark environments.

### Character format: 2D sprite in 3D space

The final character is a **2D illustrated / hand-drawn gray British
Shorthair Munchkin cat** placed
inside the real-time 3D world. Do not build the final cat as a 3D mesh or
use primitive 3D body parts. The 3D environment remains fully spatial:
lighting, fog, shadows where appropriate, particles, debris, lightning,
portals, reflections, and camera movement must interact with the scene.

Use a sprite-based animation system. Preferred implementation order:

1. A frame-based sprite sheet or texture atlas for each animation.
2. Separate directional sprite sets where needed (rear, three-quarter
   rear, side, and front / three-quarter front).
3. A 2D skeletal rig only if it materially improves secondary motion and
   does not compromise the hand-drawn look.

The camera should normally stay behind and slightly above the cat. Avoid
free-orbit camera movement that reveals the sprite as a thin card. Use
controlled directional sprite swaps or short transition animations when
the cat turns. A camera-facing billboard is acceptable only if the
sprite's orientation and perspective remain visually convincing.

### 3D-world sprite integration

To prevent the 2D cat from reading as a flat pasted sticker in 3D space:

-   **Grounded contact shadow:** Render a soft, speed- and jump-height-reactive
    shadow decal directly on the floor plane beneath the cat's pivot.
-   **Scene-reactive sprite shader:** Use a custom `ShaderMaterial` (or
    extended sprite material) that samples the atlas with clean
    premultiplied/alpha-tested edges and blends dynamic cyan, violet,
    and laser-red rim-light tints from the environment and laser dot.
-   **Physical secondary motion:** Apply subtle lateral banking when
    steering and squash-and-stretch on jump/landing without distorting
    the sprite's ground-contact anchor.

Required animation states:

1. Idle / breathing
2. Alert / noticing the laser
3. Run loop
4. Fast sprint loop
5. Overclock / exaggerated sprint
6. Slow-motion sprint
7. Jump / leap
8. Mid-air pose / fall
9. Landing
10. Sit / settle
11. Paw interaction / catching the laser

Animation requirements:

- Keep the cat's silhouette, face markings, proportions, line weight,
  palette, and design consistent across every frame and direction.
- Use transparent PNG or WebP sprite sheets / atlases with documented
  frame dimensions, frame order, frame rate, and animation names.
- Keep frames aligned to a consistent character pivot / ground contact
  point to prevent sprite jitter while running.
- Use enough frames for smooth movement; avoid relying on one still
  image with arbitrary rotation or stretching to fake a run.
- Drive animation playback from actual movement speed, with a designed
  speed curve and sensible upper limit so frames remain readable.
- Add subtle 3D-compatible secondary effects (tail accents, dust,
  speed trails) as separate scene elements rather than baking all effects
  into the character artwork.
- Maintain strong contrast and readability against dark environments.
- The final catch animation must clearly show the cat's paw / head
  reacting to the laser dot.

A temporary placeholder sprite is acceptable during prototyping, but it
must be clearly labelled and must not be mistaken for final artwork.

### Character asset production workflow

Image-generation models can produce strong concept sheets, but raw
multi-frame sprite sheets often exhibit frame-to-frame proportion drift,
inconsistent backgrounds, or shifting ground pivots. Pair generation with
a deterministic post-processing pipeline and a clean fallback:

1. Create and approve one definitive character design sheet (via
   `image-generator` or external art) showing the cat's silhouette, face
   markings, colour palette, proportions, and rear / three-quarter rear /
   side / front views.
2. Generate or commission animation frames conditioned on that approved
   design sheet. Keep each sheet focused on one state or directional
   group so frame fidelity stays high.
3. Run a deterministic sprite-processing script (`tools/build_atlas.py`
   using Python Pillow/NumPy) to:
   - strip solid/checker backgrounds into clean alpha with edge
     defringing;
   - normalize frame bounding boxes and lock a consistent ground-contact
     pivot (e.g., bottom-centre paw contact) so the cat never jitters;
   - extrude/pad frame borders by 2--4 px to prevent WebGL mipmap seam
     bleeding;
   - pack into WebGL-safe atlases (`<= 2048x2048` default, WebP/PNG) and
     emit `animations.json` metadata.
4. **Vector / CanvasTexture baseline fallback:** Until final illustrated
   atlases are approved, a dedicated procedural 2D vector/canvas cat
   atlas generator (rendered once at startup onto an offscreen
   `CanvasTexture` using the exact same `animations.json` frame schema)
   may drive all 11 states cleanly with zero jitter. Keep this clearly
   separated from final hand-drawn assets.
5. Integrate assets through a reusable `CatAnimator` that consumes the
   atlas + manifest interface so swapping illustrated sheets requires
   zero renderer changes.
6. Visually inspect the animated sprite in the live 3D camera across
   every act using browser verification.

Suggested asset structure:

```text
assets/
└── characters/
    └── felis-cat/
        ├── design-sheet.png
        ├── atlas-core.webp        # Packed WebGL-safe atlas (<= 2048x2048)
        ├── sprites/               # Source per-state strips (optional if packed)
        │   ├── idle.png
        │   ├── alert.png
        │   ├── run.png
        │   ├── sprint.png
        │   ├── overclock.png
        │   ├── jump.png
        │   ├── fall.png
        │   ├── land.png
        │   ├── sit.png
        │   └── catch.png
        └── animations.json
```

This is a suggested organisation. Use packed atlases and directional
variants when they reduce draw calls (`<= 1` texture bind for the cat)
or improve animation quality. Do not create empty placeholder files just
to match this tree.

### Environment

The environment should evolve through the acts:

-   quiet, minimal opening;
-   directional running corridor;
-   dark speed void;
-   fractured dimensional space;
-   peaceful final reveal.

Use depth, lighting, fog, reflections, and parallax to communicate
motion. Avoid relying only on flat screen-space streaks.

### Effects

Prioritise these effects:

-   speed-based field-of-view change;
-   motion streaks and controlled motion blur;
-   fading cat afterimages;
-   procedural lightning;
-   floating debris and fragments;
-   animated dimensional cracks;
-   portal distortion;
-   subtle impact flashes;
-   environmental light response.

Effects should be configurable by quality level. Do not let
post-processing make the cat or route unreadable.

------------------------------------------------------------------------

## 5. HUD and interface

The HUD should feel like a restrained experimental speed-testing
interface, not a cluttered military dashboard.

Required elements:

-   Project WIWI identity.
-   Current speed in a clearly readable numeric display.
-   Speed / boost meter.
-   Temporal shear or reality-integrity indicator.
-   Current act or mission state.
-   Compact run timer / act split indicator and personal best (`localStorage`).
-   Quality selector (`Low` / `Medium` / `High`) accessible from pause/start.
-   Optional diagnostics overlay (`?debug=1`) showing real FPS, frame time
    (`ms`), draw calls, active instances, and pixel ratio.
-   Control hints.
-   Start screen.
-   Optional audio upload control.
-   Pause / resume control.
-   Restart control.
-   End card.

HUD values must reflect actual game state. Do not display fabricated
values that do not correspond to the simulation.

Keep interface layout responsive for desktop and mobile. Ensure touch
controls do not cover important HUD information.

------------------------------------------------------------------------

## 6. Audio and music

The user wants to use the audio from the supplied reference video,
potentially using a longer version.

Requirements:

-   Support a user-selected local audio file through an upload control.
-   Do not fetch, extract, or redistribute audio from third-party
    platforms.
-   Do not assume permission to use copyrighted music. The user must
    supply audio they are authorised to use.
-   Do not generate or claim to have generated an extended version of an
    existing copyrighted track.
-   If the original audio is unavailable or too short, provide an
    original or properly licensed alternative.
-   Audio playback must begin after a user gesture to comply with
    browser autoplay restrictions.
-   Include mute and volume controls.
-   Synchronise major visual events to musical markers when reliable
    beat data is available.
-   If beat analysis is not available, use authored event timings and
    allow the user to adjust them.

Suggested sound layers:

-   quiet opening ambience;
-   paw impacts and movement;
-   wind build-up during acceleration;
-   rising electrical energy;
-   spatial distortion and lightning;
-   strong climax impact;
-   abrupt silence before the reveal;
-   a small, playful sound at the laser catch.

### Procedural Web Audio baseline and beat analysis

-   **Zero-asset default:** Implement a built-in Web Audio API
    synthesizer (`ProceduralAudio`) covering the sub-bass drone,
    speed-modulated filtered wind, rhythmic paw foley, temporal-burst
    time-warp sweep, lightning crackle, hard silence gate, and comedic
    laser-catch chime so the game sounds cohesive even with no uploaded
    track.
-   **Local track reactivity:** When the user uploads a local audio file,
    route it through `AnalyserNode` (`BeatSync`) to drive subtle
    energy-reactive pulses (bloom, lightning intensity, rift ring pulse)
    without breaking gameplay pacing.

Do not let sound effects overpower the soundtrack.

------------------------------------------------------------------------

## 7. Technical architecture

### Preferred stack

-   **Three.js (WebGL 2)** for the 3D world, camera, lighting, instanced
    geometry, and effects.
-   **Custom lit sprite plane** (`CanvasTexture` / packed PNG/WebP atlas
    + custom `ShaderMaterial`) for the 2D cat character, with grounded
    contact shadow and scene rim-lighting. Avoid true spherical
    billboards when they expose flatness.
-   **Reusable `CatAnimator`** driven by simulation speed, steering
    direction, and game state; avoid hardcoding frame changes into the
    main render loop.
-   **Procedural / instanced 3D geometry** (`InstancedMesh` + custom
    GLSL shaders) as the primary environment pipeline so the project
    loads cleanly with zero external 3D model failures. (**GLTF/GLB** is
    strictly optional for secondary environment props only---never for
    the 2D cat.)
-   **Lightweight deterministic kinematics** instead of heavy WASM
    physics (`Rapier` is omitted unless complex rigid-body collisions
    are explicitly added later; lane bounds, jump arcs, and time-domain
    dilation remain cleaner and faster without it).
-   **Selective post-processing (`EffectComposer`):** Combine radial speed
    blur, chromatic aberration, vignette, and speed streaks into a
    **single custom composite pass** paired with half-resolution bloom on
    Medium/High quality tiers.
-   **Custom GLSL shaders** for the volumetric dimensional rift, portal
    refraction/distortion, speed-line tunnel, and rim-lit cat sprite.
-   **Web Audio API** for both local audio playback (`AnalyserNode` beat
    reactivity) and procedural synthesis fallback.
-   HTML/CSS for the restrained HUD, overlays, and responsive touch
    controls.
-   JavaScript ES modules served over a local HTTP dev server (Vite or
    native ESM static server; `file://` is unsupported due to CORS on
    modules, JSON manifests, and textures).

Do not introduce a framework or dependency without a clear technical
reason. Keep the initial build simple and modular.

### Suggested module structure

``` text
projectwiwi/
├── index.html
├── AGY.md
├── README.md
├── tools/
│   └── build_atlas.py          # Optional sprite cleanup, pivot lock & atlas packing
├── src/
│   ├── main.js
│   ├── core/
│   │   ├── Game.js
│   │   ├── GameState.js
│   │   ├── TimeController.js
│   │   └── QualitySettings.js
│   ├── player/
│   │   ├── CatController.js
│   │   ├── CatAnimator.js
│   │   ├── ProceduralCatAtlas.js # CanvasTexture vector fallback atlas
│   │   └── FollowCamera.js
│   ├── world/
│   │   ├── Environment.js
│   │   ├── Corridor.js
│   │   ├── VoidWorld.js
│   │   ├── RiftWorld.js
│   │   └── ObstacleSystem.js
│   ├── effects/
│   │   ├── AfterimageSystem.js
│   │   ├── LightningSystem.js
│   │   ├── RiftEffect.js
│   │   ├── SpeedEffects.js
│   │   └── CompositeShader.js
│   ├── audio/
│   │   ├── AudioManager.js
│   │   ├── ProceduralAudio.js
│   │   └── BeatSync.js
│   ├── ui/
│   │   ├── HUD.js
│   │   ├── Menus.js
│   │   └── TouchControls.js
│   └── scenes/
│       ├── OpeningScene.js
│       ├── ChaseScene.js
│       ├── RiftScene.js
│       └── EndingScene.js
├── assets/
│   ├── characters/
│   ├── textures/
│   ├── audio/
│   └── fonts/
└── styles/
    └── main.css
```

This is a target organisation, not a requirement to create empty files.
Implement modules when they have real responsibilities.

------------------------------------------------------------------------

## 8. Simulation and time management

The player and world must not be frozen by the same global pause
mechanism.

Use a central update loop with explicit time domains:

-   **Real time:** UI, input, audio controls, and game-state
    transitions.
-   **Player time:** Cat movement and player animation.
-   **World time:** Environment movement, particles, hazards, and
    non-player animation.
-   **Cinematic time:** Scripted transitions and selected slow-motion
    events.

A temporal effect must not accidentally freeze the camera, input, or
HUD.

Use delta time for movement and animation. Clamp unusually large frame
deltas to prevent physics or movement spikes after a tab loses focus.

When the player activates a temporal burst, define exactly which systems
are slowed and which remain responsive. Do not implement time dilation
by simply stopping the entire render loop.

------------------------------------------------------------------------

## 9. Performance and browser compatibility

Target a smooth 60 FPS experience on modern desktop browsers first, then
optimise for mobile (30--60 FPS).

### Explicit browser & WebGL2 budgets

-   **Frame budget:** `<= 16.6 ms` per frame on desktop Medium/High.
-   **Draw calls:** `<= 100` draw calls at peak Act 4 spectacle by
    batching corridor structures, speed streaks, floating fragments, and
    pooled afterimages with `InstancedMesh` and shared materials.
-   **Texture & VRAM caps:** Keep sprite atlases `<= 2048x2048` on
    Low/Medium (`<= 4096x4096` max on High) and decode/upload textures
    plus run `renderer.compile()` during boot so Act 3/4 transitions do
    not stall for shader compilation.
-   **DPR scaling:** Cap `devicePixelRatio` per quality tier (`1.0` Low,
    `1.5` Medium, `2.0` High).
-   **Zero hot-loop GC allocations:** Pre-allocate scratch `Vector3`,
    `Quaternion`, `Matrix4`, `Color`, and typed arrays; never spawn
    temporary geometries or meshes inside `requestAnimationFrame`.
-   **Context loss resilience:** Handle `webglcontextlost` and
    `webglcontextrestored` cleanly without crashing the loop, and fall
    back gracefully if `EffectComposer` or Web Audio is unavailable.

### General requirements

-   Use `requestAnimationFrame` with clamped delta time (`<= 0.05s`).
-   Reuse geometries and materials where possible.
-   Pool particles, lightning segments, and afterimage objects.
-   Dispose of unused GPU resources on teardown or quality switch.
-   Provide `Low`, `Medium`, and `High` quality settings that scale DPR,
    half-res bloom, composite shader passes, and instance counts.
-   Avoid expensive real-time shadow maps; prefer projected contact
    shadow decals and shader lighting.
-   Monitor frame time and draw calls via the `?debug=1` diagnostics
    overlay during development.

The visual quality target is the best practical result for the user's
browser and GPU, not a promise that every device can render the highest
settings.

------------------------------------------------------------------------

## 10. Development rules

These rules are mandatory for AI coding agents and contributors.

1.  Read this file before changing the project.
2.  Inspect the existing codebase before editing. Do not assume the
    project is still a single HTML prototype.
3.  Preserve working functionality unless the requested change requires
    replacing it.
4.  Do not silently remove controls, scenes, HUD elements, or gameplay
    systems.
5.  Do not replace the third-person camera with first-person camera
    behaviour.
6.  Do not substitute a static image or video for interactive 3D
    gameplay.
7.  Do not use a primitive placeholder cat as the final character.
8.  Do not fake gameplay speed by changing only the speedometer. HUD
    values must reflect simulation state.
9.  Keep player input responsive during slow-motion and temporal
    effects.
10. Separate game state, simulation, rendering, audio, and UI
    responsibilities.
11. Avoid monolithic source files as the project grows.
12. Do not add dependencies without explaining their purpose.
13. Do not use remote assets with unclear licensing.
14. Do not hardcode secrets, private tokens, or personal data.
15. Test the actual browser experience after meaningful changes.
16. Report incomplete features honestly. Do not claim a feature works if
    it is only a visual placeholder.
17. Prefer small, verifiable implementation steps over a complete
    rewrite.
18. Update README documentation when setup, controls, dependencies, or
    project structure changes.

### Change discipline

Before implementing a feature:

-   identify the relevant modules;
-   state which files need to change;
-   preserve existing behaviour;
-   implement the smallest coherent change;
-   test the affected behaviour;
-   report what changed and what remains incomplete.

Do not rewrite unrelated files to make a small change.

### Browser verification protocol

When testing changes in a local browser (or via automated Chrome DevTools
verification) over a local HTTP server:

-   Confirm zero uncaught console errors, failed asset requests, or WebGL
    shader compilation warnings.
-   Verify `Start`, `Pause`/`Resume`, and `Restart` state transitions
    and confirm HUD values match live simulation state.
-   Exercise keyboard inputs (`W`, `A`, `D`, `Shift`, `Space`) and check
    desktop and mobile viewport layouts so touch controls never obscure
    HUD metrics.
-   Inspect `?debug=1` metrics (draw calls, FPS, DPR) and visually review
    cat readability, ground contact, and act transitions across scenes.
-   Note honestly what automated headless/DevTools tests cover versus
    what requires real-device audio or mobile GPU ergonomics testing.

------------------------------------------------------------------------

## 11. Milestones and acceptance criteria

### Milestone 1 --- Playable foundation

-   [ ] Local dev server serves ES modules cleanly (`file://` avoided).
-   [ ] Three.js WebGL2 scene loads reliably with `renderer.compile()` warmup.
-   [ ] Third-person camera follows the cat.
-   [ ] Cat moves forward and steers (with laser-tracking slipstream).
-   [ ] Acceleration and boost work.
-   [ ] Running animation responds to speed.
-   [ ] Keyboard controls work (with active-play scroll prevention).
-   [ ] Mobile touch controls work (`touch-action: none`).
-   [ ] Start, pause (`visibilitychange` safe), and restart flows work.

**Acceptance:** A user can control the cat continuously in a stable
third-person view without the camera losing the character.

### Milestone 2 --- Character quality

-   [ ] Consistent 2D cat design approved.
-   [ ] Sprite sheets / atlases processed (`tools/build_atlas.py` or
    verified atlas) and frame metadata verified (`<= 2048x2048` default).
-   [ ] Required animation states are present (or driven via the
    CanvasTexture baseline fallback until illustrated sheets land).
-   [ ] Run, sprint, jump, and landing transitions play without visible
    frame jitter or pivot drift.
-   [ ] Directional sprite changes work for required turns.
-   [ ] Character remains readable in dark scenes and against VFX via
    scene rim-lighting and grounded contact shadow.
-   [ ] The 2D character is convincingly integrated into the 3D world.

**Acceptance:** The hand-drawn cat animates smoothly and feels grounded
inside the 3D environment without appearing as a crude flat cut-out.

### Milestone 3 --- Speed experience

-   [ ] Speedometer reflects actual velocity.
-   [ ] Run timer, act splits, and personal best (`localStorage`) work.
-   [ ] Boost changes acceleration and movement.
-   [ ] Camera FOV responds to speed.
-   [ ] Afterimages are pooled (`InstancedMesh` / pool) and fade smoothly.
-   [ ] Slow-motion sprint remains visually clear.
-   [ ] Single-pass composite effects (radial blur, chromatic aberration,
    vignette) scale with speed and quality tier.

**Acceptance:** Acceleration feels progressive and visually communicates
increasing velocity.

### Milestone 4 --- Dimensional rupture

-   [ ] Environment transitions through the planned acts.
-   [ ] Procedural lightning works.
-   [ ] Floating fragments / reality shards respond to world time.
-   [ ] Rift has depth and shader-driven distortion.
-   [ ] Temporal burst affects the intended time domains.
-   [ ] Draw calls (`<= 100`) and frame time (`<= 16.6 ms` desktop)
    remain within budget on Medium/High.

**Acceptance:** The rift is an interactive 3D event, not a static
overlay.

### Milestone 5 --- Audio and cinematic pacing

-   [ ] Built-in procedural Web Audio soundscape works with zero external
    files.
-   [ ] Local audio upload works with `AnalyserNode` beat reactivity.
-   [ ] Playback starts from a user gesture.
-   [ ] Mute and volume controls work.
-   [ ] Major events can synchronise to authored timing or detected
    beats.
-   [ ] Silence before the reveal is implemented.
-   [ ] Audio permissions and licensing are respected.

**Acceptance:** The experience remains playable and atmospheric with or
without an uploaded soundtrack.

### Milestone 6 --- Comedic ending and polish

-   [ ] Cat leaps through the rift.
-   [ ] Scene transitions to the final reveal.
-   [ ] Laser dot is caught.
-   [ ] End card appears with run time / personal best.
-   [ ] Restart returns to a clean initial state.
-   [ ] Desktop and mobile layouts are tested via live browser QA.
-   [ ] README and setup instructions are complete.

**Acceptance:** The full experience can be played from opening to ending
and restarted without refreshing the page.

------------------------------------------------------------------------

## 12. Current workspace and prototype status

**Current workspace state (`projectwiwi`):** A modular, zero-build
GitHub Pages-ready implementation deployed at
`https://zaidiabd.github.io/projectwiwi/` across `index.html`,
`README.md`, `styles/main.css`, `src/` (28 ES modules), and `assets/`:

-   **Character & 2D-in-3D integration:** Gray British Shorthair
    Munchkin design sheet saved at
    `assets/characters/wiwi-munchkin/design-sheet.jpg`; painterly
    `2048x2048` 15-clip Munchkin sprite atlas (`ProceduralCatAtlas.js`),
    6-clip tuxedo rival atlas (`LilyCatAtlas.js` + `LilyController.js`),
    `CatAnimator.js`, optional external `SpriteAtlasLoader.js`, rim-lit
    `ShaderMaterial` sprite plane, grounded contact shadow
    (`CatController.js`), and predictive AI playthrough controller
    (`AutopilotAI.js`).
-   **3D worlds, effects & post-processing:** `InstancedMesh` corridor,
    speed void, floating rift shards + late-run cosmic warp rings,
    standard + swaying anomaly obstacles, glowing slipstream ribbon, Act 5
    peaceful living room props, pooled afterimages, pooled 3D lightning +
    cat body charges, custom GLSL volumetric rift (`RiftEffect.js`),
    stage announcement banners, and single-pass `CompositeShader` +
    half-res bloom (`Low`/`Medium`/`High` tiers).
-   **Audio & BeatSync:** Streams `assets/Screen_Recording_20261118_044500_YouTube-mc.m4a`
    with drift-locked `getSyncedTrackTime()`, `AnalyserNode` beat
    reactivity (`BeatSync.js`), custom file upload, and synthesized
    foley (`ProceduralAudio.js`).
-   **Verification status:** All 28 JavaScript modules pass `node --check`,
    the live GitHub Pages deployment returns HTTP `200`, and `AutopilotAI`
    plus `GameState` threshold checks pass under Node. Live Chrome
    DevTools visual QA remains pending until run in an active debugged
    browser session.

Remaining production polish:

-   Run live browser QA across Acts 1--5 (`?debug=1`) on desktop and
    mobile to validate visual framing, WebGL performance budgets, and
    ending timing, then check off Milestone 1--6 items once verified.
-   Optionally replace `ProceduralCatAtlas.js` with curated illustrated
    sprite sheets packed via `tools/build_atlas.py` using the same
    `CatAnimator` manifest contract.

------------------------------------------------------------------------

## 13. Definition of done

Project WIWI is complete when:

-   The user can start the experience and control the cat from a
    third-person chase camera.
-   The cat has consistent, high-quality 2D frame animation and remains
    convincingly integrated into the 3D world.
-   Forward movement, steering, boost, and temporal burst work reliably.
-   The environment and visual effects evolve with player progress and
    speed.
-   The speed HUD reflects the actual simulation.
-   The soundtrack can be supplied locally and controlled by the user.
-   The dimensional rupture is rendered in real time.
-   The cat catches the laser and the comedic reveal lands.
-   The game can be completed and restarted.
-   The project runs in a modern browser with documented setup
    instructions.
-   The codebase is modular enough to maintain and extend.

**Final creative test:** The player should remember the cat, the feeling
of speed, the dimensional spectacle, and the absurdity of destroying the
universe to catch a laser pointer.
