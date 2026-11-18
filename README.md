# PROJECT WIWI — The Last Light

**Play online (GitHub Pages):** https://zaidiabd.github.io/projectwiwi/

An interactive 2.5D browser speed-running experience built with Three.js (WebGL 2), featuring a 2D illustrated **gray British Shorthair Munchkin** cat chasing a red laser dot across a 216-second audio-synced sequence until reality fractures.

## Controls

| Input | Action |
| --- | --- |
| `W` / `Arrow Up` | Accelerate forward |
| `A` / `Arrow Left` | Steer left (track the laser slipstream) |
| `D` / `Arrow Right` | Steer right (track the laser slipstream) |
| `Shift` (hold) | Overdrive Boost |
| `Space` | Temporal Burst (unlocks at `26s`; Stage II upgrade at `136s`) — or agile **Cat Vault Hop** when Burst is locked/recharging |
| `I` / `AI PLAYTHROUGH` | Toggle predictive AI autopilot (avoids all obstacles & optimizes speed) |
| `P` / `Esc` | Pause / Resume |
| `M` | Mute / Unmute audio |
| Mobile touch pads | Steer (`◀` / `▶`), `BOOST`, and `BURST` |

## Timed Sequence (`216s` Audio-Synced Run)

- `0s – 26s`: Quiet opening into acceleration corridor (Temporal Burst locked).
- `26s`: Overclock slow-motion beat + `Space` Temporal Burst unlocks.
- `38s`: First space-time fabric tear; electric charges emanate from Wiwi's body.
- `50s`: Second space-time tear; speed and electric intensity escalate.
- `62s`: Third space-time tear; **Dimensional Rift Pylon Gates** (fair, lane-locked obstacles with glowing ground telegraph strips) activate.
- `75s`: Fourth space-time tear; hyperstorm escalation — **collectible track powerups** (`Velocity Surge`, `Aegis Shield`, `Temporal Cell`) unlock and spawn from TEAR IV onward.
- `136s – 142s`: **Stage II Temporal Burst** (golden-crimson time-dilation overdrive) leading into Tear V (`142s`).
- `142s – 216s`: **TEAR V** — Tactical **`! RIVAL DETECTED !`** warning alert triggers as big long-haired black-and-white cat **Lily** joins the chase alongside Wiwi (triggering Wiwi's pulsing `💢` anger symbol) in a race to clear the `23,000 m` threshold.
- `179s`: **Dual Overdrive Powerup** halfway through TEAR V — both Wiwi and Lily erupt into synchronized Overdrive (electric cyan/crimson plasma rim highlights, swirling energy auras & orbiting halo rings on both cats, thick red/black/blue lightning on Wiwi paired with emerald/crimson/black lightning on Lily, supersonic smeared afterimages). Both cats continue gaining speed while hindered by only 20% on obstacle impacts.
- `216s`: Both cats leap through the final rift into abrupt silence inside a quiet living room; if `distance >= 23,000 m`, Wiwi catches the laser while Lily is shocked (`UNIVERSE DESTROYED. LASER ACQUIRED.`); otherwise Lily steals it while Wiwi belly-flops (`UNIVERSE DESTROYED. LILY STOLE THE LASER.`).

## Running Locally

Because the app uses native JavaScript ES modules (`<script type="importmap">`) and Web Audio / asset loading, it must be served over HTTP rather than `file://`:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080` (or `http://localhost:8080/?debug=1` for live FPS, frame time, draw calls, and DPR diagnostics).

## Deploying to GitHub Pages

All asset and module references use relative `./` paths and require **no build step**:

1. Push the repository to GitHub (`main` branch).
2. Open **Settings → Pages** in your GitHub repository.
3. Under **Build and deployment**, choose **Deploy from a branch** (`main` / `/ (root)`).
4. Visit `https://<your-username>.github.io/<repo-name>/`.

### Audio & Licensing Note

- By default, the player loads `./assets/Screen_Recording_20261118_044500_YouTube-mc.m4a` when present and allows uploading any local audio file via the **AUDIO / SOUNDTRACK** control.
- Ensure you hold the necessary rights/permission for any audio file committed to a public GitHub repository.
- If no audio file is present or audio is muted, the built-in Web Audio synthesizer (`src/audio/ProceduralAudio.js`) still provides reactive wind, paw foley, temporal burst sweeps, and laser-catch sound effects.

## Architecture Highlights

- `src/player/ProceduralCatAtlas.js` + `CatAnimator.js` + `CatController.js`: 13-clip 2D sprite atlas (`2048x2048` `CanvasTexture`) matching the gray British Shorthair Munchkin design sheet (`assets/characters/wiwi-munchkin/design-sheet.jpg`), rendered with a custom rim-lit `ShaderMaterial` and grounded contact shadow.
- `src/player/AutopilotAI.js`: Predictive AI playthrough controller forecasting static shards and lane-locked Dimensional Rift Pylons ahead of the cat while steering toward safe collectible powerups, slipstream, Boost, and Temporal Burst distance.
- `src/core/TimeController.js`: Independent `realTime`, `playerTime`, `worldTime`, and `cinematicTime` domains with `dt` clamping (`<= 0.05s`) and `visibilitychange` auto-pause.
- `src/world/` & `src/effects/`: Instanced 3D corridor, speed void, floating rift shards, grounded hazard rings + telegraphed Dimensional Rift Pylons + near-miss Graze bonus system, collectible powerup orbs (TEAR IV+), curved 3D slipstream ribbon, pooled afterimages, pooled 3D lightning, custom GLSL volumetric rift portal, and a single-pass `CompositeShader` post-processing stage scaled by `Low` / `Medium` / `High` quality presets with zero per-frame GC allocations.
