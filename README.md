# PROJECT WIWI — The Last Light

**Play online (GitHub Pages):** https://zaidiabd.github.io/projectwiwi/

An interactive 2.5D browser speed-running experience built with Three.js (WebGL 2), featuring a 2D illustrated **gray British Shorthair Munchkin** cat chasing a red laser dot across a 216-second audio-synced sequence until reality fractures.

## Controls

| Input | Action |
| --- | --- |
| `W` / `Arrow Up` | Run / chase forward |
| `A` / `Arrow Left` | Switch lane left (3-lane road & void grid) |
| `D` / `Arrow Right` | Switch lane right (3-lane road & void grid) |
| `Shift` (hold) | Booster (unlocks in Stage 2 @ `10s`; locked during Stage 3 Overclock `25.7s–38s`) |
| `Space` | Manual Temporal Burst (unlocks @ `38s`; 2nd Overclock @ `136s`) — or **Cat Vault Hop** when locked |
| `I` / `AI PLAYTHROUGH` | Toggle predictive AI autopilot (avoids all obstacles & optimizes speed) |
| `P` / `Esc` | Pause / Resume |
| `M` | Mute / Unmute audio |
| Mobile touch pads | Steer (`◀` / `▶`), `BOOST`, and `BURST` |

## Timed Sequence (`216s` Audio-Synced Run • 3-Lane Navigation)

- `0s – 10.0s` (**Stage I — Neighborhood Chase**): Wiwi runs normally down a 3-lane neighborhood asphalt road chasing the red laser dot while pedestrians, joggers, and dogs walk along the sidewalks (Boost and Overclock locked).
- `10.0s – 25.7s` (**Stage II — Clock Gate Acceleration**): Wiwi passes through a **Clock-Shaped Wormhole Gate** (gates/tears appear only at stage transitions), unlocks the `Shift` **Booster**, and weaves across the 3 lanes to evade oncoming **Cars and Bikes**.
- `25.7s – 38.0s` (**Stage III — Pitch-Black Overclock**): Overclock locks out manual boost and turns the entire world **pitch black**; Wiwi flashes alternately between pitch-black and blazing neon while trailing neon afterimages, and all pedestrians, joggers, dogs, cars, bikes, and trees become slow-motion **white silhouettes**.
- `38.0s – 62.0s` (**World Collapse — Tears I & II**): The physical neighborhood collapses into nonexistent void footing that glows with reactive neon step pads wherever Wiwi steps; broken land chunks, cars, and uprooted trees tumble through the background and serve as 3-lane obstacles (`Boost` & manual `Temporal Burst` unlocked).
- `62.0s – 136.0s` (**Stage IV — Synthwave Titans**): Giant interdimensional **Synthwave Humanoid Beings** with glowing eyes loom over the collapsed road and slam colossal hands onto **2 lanes at a time** (alternating Left+Center and Center+Right), leaving 1 safe exit lane.
- `136.0s – 142.0s` (**2nd Overclock**): Yellow Overclock intensifies while obstacles become slowed **Yellow Pillars of Light** wrapped in electric charge rings.
- `142.0s – 216.0s` (**TEAR V — Black-Red Pillars & Lily Chase**): Pillars turn **pitch black with a glowing red outline** + electric charges as tactical **`! RIVAL DETECTED !`** triggers for **Lily** joining the chase toward `23,000 m`.
- `179s`: **Dual Overdrive** halfway through TEAR V — both Wiwi and Lily erupt into synchronized Overdrive, continue gaining speed relentlessly, and are hindered by only 20% on obstacle hits.
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
- `src/player/AutopilotAI.js`: Predictive AI playthrough controller forecasting static shards and lane-locked Dimensional Rift Pylons ahead of the cat while maximizing slipstream, Boost, and Temporal Burst distance.
- `src/core/TimeController.js`: Independent `realTime`, `playerTime`, `worldTime`, and `cinematicTime` domains with `dt` clamping (`<= 0.05s`) and `visibilitychange` auto-pause.
- `src/world/` & `src/effects/`: Instanced 3D corridor, speed void, floating rift shards, telegraphed Dimensional Rift Pylons + near-miss Graze bonus system, curved 3D slipstream ribbon, pooled afterimages, pooled 3D lightning, custom GLSL volumetric rift portal, and a single-pass `CompositeShader` post-processing stage scaled by `Low` / `Medium` / `High` quality presets with zero per-frame GC allocations.
