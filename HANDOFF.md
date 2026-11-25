# HANDOFF: Gary's AFK v1.1.0

For the next agent or developer. Date: 2026-11-25. State: v1.1.0, tested in headless Chrome.
**Live on GitHub Pages**: https://911corp.github.io/garys-afk/ (repo `911Corp/garys-afk`, branch
`main`). v1.0.0 was deployed first; v1.1.0 is the redesign below.

## Decisions taken (with the owner, in this session)

1. **v1.1 visual direction = the owner's reference screens** (the earlier prototype's look): IBM
   Plex Mono, rounded thin frames, mint accent, big centred clock, smooth sharp scenes. The v1.0
   pixel-art rendering stays as the optional "Retro pixels" display setting.
2. **All 32 scenes kept**, 4 per category, each with its own renderer and real settings.
3. **Gary appears in one scene only: Gary.exe, asleep, no speech bubbles** (the owner found the
   Gary scenes and bubbles unreadable). Touch Grass and Burger Shift were removed; The Trenches
   lost Gary; Night Diner and Lo-fi Room were added; the category is now **After Hours**.
4. **Layout = the validated prototype screens**: one page, header "GARY'S AFK_ / even degens need
   a break.", player with clock and scene name, `‹ Shuffle Favorite ›`, category chips, thumbnail
   grid, collapsible panels. On wide screens the catalogue sits beside the player.
5. **Gary's official design = the Purity-o-Meter drawing code** (puritymeter.netlify.app), as
   the owner said. `src/engine/gary/kit.ts` is a port of `gary()` with the same PRNG, primitives,
   coordinates and strokes. New poses reuse those primitives only. Palette: the LCD green
   `#b8d97a`, ink `#1f2a12`, bubble white `#fffaf0`, plus two in-between greens.
6. **Jarvis** has no official visual: he appears as text only (Gary.exe monitor log, Terminal 404).
7. **Handoff ZIP from the owner** (HANDOFF.md, SCENES.csv, visual search links) was read and
   applied: green phosphor by default in Terminal 404, NGMI logo by default in DVD Survivor,
   Medieval Village at dusk by default.
8. **"Flying Toasters" renamed "Flying Floppies"**, original sprites, as the brief allowed.
9. **The Trenches** is now an empty desk with red/green simulated charts, as the catalogue notes said.
10. **Sound is 100% synthesised** (Web Audio): no audio files, nothing to license, no loop seams.
11. **No automatic deployment**: the Pages workflow is manual (`workflow_dispatch`).

## Decisions left to the owner

- Approve each new public release: the deploy workflow is manual (`docs/deployment.md`).
- Confirm the MIT licence for the code (the Gary identity is excluded in `LICENSE`).
- Listen to the 14 ambiences on real speakers and adjust levels or drop any.
- Provide a Jarvis design if one should appear visually.
- Test on real devices (iPhone Safari, Android, Firefox, Windows/macOS, second monitor).

## Important files

| Path | What |
| --- | --- |
| `src/engine/gary/kit.ts` | Gary's canonical drawing code and all his poses (only the sleeping one is used). Read before touching Gary. |
| `src/scenes/gary/world.ts` | 960×540 world base for the illustrated After Hours scenes |
| `src/engine/gary/draw.ts` | Path2D renderer, LCD palettes, canonical speech bubble |
| `src/engine/types.ts` | The scene contract |
| `src/engine/stage.ts` | Canvas, loop, FPS cap, pixel buffer size, pause, disposal |
| `src/engine/base.ts`, `pixel.ts` | PixelScene and palette reduction |
| `src/engine/audio/audio.ts` | Synthesised ambiences |
| `src/scenes/<category>/` | `index.ts` (metadata + settings) and one file per scene |
| `src/app/App.tsx` | Orchestration: scenes, playlists, AFK, sound, keyboard |
| `src/storage/schema.ts` | Saved state, migrations, sanitising, import checks |
| `src/sw-template.js` + `vite.config.ts` | Service worker generated at build time |
| `scripts/thumbnails.mjs`, `scripts/icons.mjs`, `scripts/shot.mjs` | Thumbnails, icons, visual checks |
| `tests/unit/`, `tests/e2e/run.mjs` | Tests |
| `docs/` | Architecture, scene guide, deployment, test results, limitations |

## Feature status

| Feature | Status |
| --- | --- |
| 32 scenes, per-scene settings, reset/restart | done, tested |
| Catalogue: categories, search, favorites, recent, shuffle, prev/next, thumbnails | done, tested |
| Smooth HD rendering + optional Retro pixels mode | done, tested (both modes) |
| Player: pause, immersive, fullscreen API + fallback, auto-hide, double-tap | done, tested (fallback path on iOS not tested on a device) |
| Display: speed, brightness, intensity, density, pixel size, FPS cap, CRT, show Gary | done; FPS and pixel size verified, others visually spot-checked |
| Clock/date, 12/24 h, position, size, opacity | done, visually checked |
| Sound: 14 ambiences, mix, master, mute | built; not listened to (headless) |
| Playlists: edit, reorder, durations, shuffle, loop, fades | done, auto-advance tested |
| AFK mode (in-app idle) | done, tested (start after delay, exit on input) |
| Focus timer (Pomodoro) | done, start/run tested; notifications not tested |
| Accessibility: reduced motion, no flash, OLED care, power saver, keyboard | done; no-flash/reduced paths run without errors |
| Data: local save, export, copy, validated import, reset, migrations | done, tested |
| PWA: manifest, icons, offline | offline tested; install prompt not tested |

## Test results

Lint 0 warnings, typecheck 0 errors, 19/19 unit tests, 92/92 end-to-end checks (every scene in
landscape and portrait, app behaviour, offline, 96 scene switches, 2-minute memory run). Details
and environment in `docs/test-results.md`. All runs used headless Chrome with software rendering.

## Changes made in this session

Everything in this repository was written in this session (no code reused from the 48-scene
prototype). See `CHANGELOG.md`. Three bugs were found by the tests and fixed (AFK idle timer reset,
service worker placeholders, offline `Vary` mismatch).

## Next steps that would help most

1. Real-device pass (iPhone, Android, Safari, Firefox) and a sound listening pass.
2. After any change: `npm run build && npm run test:e2e`, then run the Pages workflow by hand.
3. Optional: a gentle pixel drift of whole Gary scenes for OLED screens; a Jarvis sprite once designed.
