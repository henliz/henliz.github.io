# henliz.github.io

my personal portfolio. built entirely from scratch — no templates, no frameworks, no shortcuts. just me, a dangerous amount of caffeine, and an increasingly unhinged relationship with Three.js.

live at **[henliz.github.io](https://henliz.github.io)**

---

## what's actually in here

### the loading screen (`loading.html`)
a full canvas matrix rain effect before you even hit the homepage. because why not. each column tracks its own head position, trail characters, and glitch state — 3% chance per frame per column to randomly scramble a trail character so it never looks static. colours are a 12-stop depth lookup table (bright white → cyan → teal → invisible) with exponential falloff. intentionally rendered at ~18fps (`setInterval` at 55ms) for that chunky, chunky aesthetic. while you wait, it's async-fetching and caching all the GLB models in the background so the 3D scene is instant on arrival.

### the main page (`index.html`)
- **lenis** smooth scrolling wired up alongside a custom **programmatic snap system** — not CSS scroll-snap, actual JS that lerps you into the correct section and locks you there. has a `muteSnap` flag so navbar clicks and footer scroll-to-top don't get intercepted mid-animation.
- **custom cursor** that only renders on actual pointer devices (detected via `@media (hover: hover) and (pointer: fine)`, not viewport width — proper detection). position updates run through `requestAnimationFrame` batching, not raw `mousemove`, so it never thrashes.
- **iframe cursor relay** — the 3D scene lives in an iframe. browsers can't see cursor position inside iframes. so `models.html` catches every `mousemove`, `mousedown`, `mouseup`, and `mouseleave` and `postMessage`s them to the parent, which repositions the cursor accordingly. seamless. cursed. works perfectly.
- **work intro unscramble animation** — chromatic aberration + clip-path glitch keyframes on an `IntersectionObserver` trigger, fires once at 30% visibility then glitches itself out after 4.2s.

### the 3D work scene (`models.html`)
this is where it gets unhinged. the entire work showcase is a Three.js WebGL scene embedded in a sticky iframe.

**the camera moves along a parametric helix.** 3.6 full rotations, 1.7 units of vertical pitch per radian, 5 stations placed at hand-tuned `tStop` positions. progress is a single `0–1` float that lerps at 8% per frame. scroll wheel, touch, and keyboard all write to `progressGoal` and the camera chases it. the camera also has a constant sinusoidal idle sway at two different frequencies (0.28 and 0.19 rad/s) so it never feels completely frozen.

**editorial 3-light film rig.** warm key light at 2.6 intensity, cyan rim at 1.5, soft blue-grey fill at 0.22. on the Equinox station all three fade to zero (parallax art is self-lit) and the glow sprite fades out too, because the glow uses `AdditiveBlending` and bleeds cyan through transparent texture areas. per-frame `lerp` fades mean transitions are smooth, not snapped.

**full 6-DOF quaternion drag.** every station has a persistent `dragQuat`. dragging accumulates rotation via `premultiply(qY).multiply(qX)` — quaternion order matters to avoid gimbal lock. after 2.5 seconds of inactivity, the quat slerps back to identity at 40%/second (time-delta corrected so it's framerate independent). once the angle drops below 0.004 radians it hard-snaps clean. touch is yaw-only; mouse gets full pitch + yaw. gesture type is locked after 8px of movement — if horizontal wins, it's orbit; if vertical wins, it navigates between stations. all on the same pointer event.

**gesture disambiguation, in detail.** a single `gestureType` variable locks after the threshold. once locked, either `progressGoal` updates (scroll) or `dragQuat` accumulates (orbit). no separate event listeners. no state leaks. `noDrag` stations (Equinox) redirect horizontal drag to the parallax pointer instead.

**the parallax billboard (Equinox).** three `PlaneGeometry` meshes at z-depths -0.12, 0, +0.12, each 16×9 units so the edges are always off-screen regardless of parallax shift. all materials have `fog: false` so scene fog doesn't eat the edges. x-offset is driven by two inputs simultaneously: orbit parallax (`sin((progress - tStop) * THETA_MAX) * strength * sign`) and smoothed mouse/touch position (`smoothPtrX * MOUSE_RANGE * mouseMult * sign`). layer signs flip — background sign +1, tower -1, foreground -1 — so moving left pushes BG one way and FG the other, creating actual depth. the vignette is a fourth plane: a canvas-generated radial gradient (transparent centre → `rgba(0,2,10,0.90)` edges), `depthWrite: false`, positioned in front of everything. no fog, no lights, no external assets. billboard faces the camera directly each frame via `Math.atan2`. when you scroll away, all plane materials fade to opacity 0 via per-frame lerp — same fade-in on approach.

**canvas-generated glow sprite.** procedural radial gradient on a 256×256 canvas, wrapped as `CanvasTexture`, rendered as a `Sprite` with `AdditiveBlending`. follows the focused station with a 6% lerp lag. no baked texture asset. fades out on Equinox.

**dust particles.** 560 points, `BufferGeometry` with typed `Float32Array` position and colour attributes. 28% cyan (`#66fcf1`), 72% randomised pale white. `PointsMaterial` with `vertexColors: true` — no per-particle texture overhead. Y position lerps toward camera Y each frame so particles are always surrounding you as you descend the helix. slow rotation at 0.00018 rad/frame. fades to zero on Equinox because floating cyan dots look deeply wrong against 2D game art.

**font-mixing algorithm.** station titles aren't just a font — they alternate between `DotempDemo` (pixel monospace) and `Didot` (italic serif) in runs of 3 and 2 characters, cycling through a `[3,2]` pattern via a manual run-length counter. generates inline `<span>` tags per character. small detail, big personality.

**portrait mobile.** `isPortrait()` detects `innerWidth < innerHeight && innerWidth < 768`. when true: FOV bumps from 55° to 74° (models appear ~25% smaller relative to viewport), all pivot scales multiplied by 0.62. reactive on `resize` so rotating the device updates it live. both are plain functions called per-frame/per-resize — no event listener state, no CSS variables.

**per-station dynamic lighting.** `onEq` and station index checks lerp light intensities each frame. smooth transitions because they run every render tick, not on station switch. grid opacity and dust opacity follow the same pattern.

---

## stack

- **Three.js 0.152** — 3D scene, GLTFLoader, BufferGeometry, CanvasTexture
- **Lenis** (@studio-freight) — scroll physics
- **Lucide** — icons
- **Cormorant Garamond, Montserrat, DotempDemo** (custom TTF), Bodoni Moda, Didot
- zero build tooling. no webpack, no vite, no bundler. raw HTML/CSS/JS, import maps for Three.js modules, deployed straight to GitHub Pages.

---

## projects in the scene

| station | type |
|---|---|
| **Skrimp AI** | founder & CEO — AI sous chef |
| **Path to Menzoberranzan** | technical director — unofficial BG3 expansion |
| **MyAuntie** | 🏆 TechNova 2025 winner — AI postpartum companion |
| **Equinox** | 🏆 Comfy Jam: Winter 2025 winner — Godot mystery game |
| **Seniors Connect** | UX prototype — ending senior loneliness |

---

*built by Hen with lots of ❤ and copious amounts of ☕*
