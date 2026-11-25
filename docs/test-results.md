# Test results

Real results from 2026-11-25 09:10 UTC. Nothing here is estimated.

Environment: headless Google Chrome (Playwright 1.65) on Linux, **software rendering** (no GPU),
production build served by `vite preview` under `/garys-afk/`. Real devices and other browsers
were not tested: see `docs/limitations.md`.

## Summary

| Suite | Result |
| --- | --- |
| Lint (oxlint) | 0 warnings, 0 errors |
| Typecheck (tsc) | 0 errors |
| Unit tests (Vitest) | 19 / 19 passed |
| End-to-end (Playwright) | 92 / 92 passed |

Unit tests cover the Conway rule (blinker, block, glider across the wrapping edge, HighLife B6),
the settings schema (garbage input, clamping, unknown ids, prototype pollution, v0 migration,
import checks), the scene catalogue (32 scenes, 4 per category, thumbnails, valid defaults) and
the palette reduction.

## Every scene, landscape 1280x720 and portrait 390x844

Each scene was loaded alone, run for 2.5 s (landscape) or 1.2 s (portrait), checked for runtime
errors and for a non-blank canvas. "Colours" counts distinct colours in a sample of the frame. FPS is
the engine's own measurement, capped at 60, on software rendering.

| Scene | Landscape | Buffer | Colours | FPS | Portrait |
| --- | --- | --- | --- | --- | --- |
| gary-exe | pass | 480x270 | 5 | 60 | pass (270x584) |
| touch-grass | pass | 480x270 | 4 | 60 | pass (270x584) |
| burger-shift | pass | 480x270 | 5 | 60 | pass (270x584) |
| the-trenches | pass | 480x270 | 4 | 60 | pass (270x584) |
| terminal-404 | pass | 480x270 | 4 | 60 | pass (270x584) |
| digital-rain | pass | 480x270 | 5 | 60 | pass (270x584) |
| mainframe | pass | 320x180 | 16 | 60 | pass (180x390) |
| packet-flow | pass | 400x225 | 10 | 60 | pass (225x487) |
| fireplace | pass | 320x180 | 14 | 60 | pass (180x390) |
| rainy-night | pass | 320x180 | 16 | 60 | pass (180x390) |
| snow-cabin | pass | 320x180 | 15 | 60 | pass (180x390) |
| aquarium | pass | 320x180 | 15 | 60 | pass (180x390) |
| starfield | pass | 320x180 | 4 | 60 | pass (180x390) |
| black-hole | pass | 320x180 | 12 | 60 | pass (180x390) |
| solar-system | pass | 400x225 | 14 | 60 | pass (225x487) |
| nebula | pass | 320x180 | 9 | 60 | pass (180x390) |
| dvd-survivor | pass | 400x225 | 3 | 60 | pass (225x487) |
| 3d-pipes | pass | 320x180 | 14 | 60 | pass (180x390) |
| endless-maze | pass | 320x180 | 4 | 60 | pass (180x390) |
| flying-floppies | pass | 320x180 | 14 | 60 | pass (180x390) |
| ocean-waves | pass | 320x180 | 10 | 60 | pass (180x390) |
| forest-life | pass | 320x180 | 9 | 60 | pass (180x390) |
| northern-lights | pass | 320x180 | 11 | 60 | pass (180x390) |
| thunderstorm | pass | 320x180 | 10 | 60 | pass (180x390) |
| neon-city | pass | 320x180 | 15 | 60 | pass (180x390) |
| night-train | pass | 320x180 | 15 | 60 | pass (180x390) |
| medieval-village | pass | 320x180 | 15 | 60 | pass (180x390) |
| arcade-room | pass | 400x225 | 16 | 60 | pass (225x487) |
| game-of-life | pass | 320x180 | 6 | 60 | pass (180x390) |
| fractal-explorer | pass | 288x162 | 8 | 60 | pass (162x351) |
| flow-field | pass | 320x180 | 7 | 60 | pass (180x390) |
| kaleidoscope | pass | 320x180 | 8 | 60 | pass (180x390) |

## App behaviour

| Check | Result | Detail |
| --- | --- | --- |
| no-flash + reduced motion modes run | pass |  |
| app loads under /garys-afk/ without errors | pass |  |
| starts on Gary.exe | pass |  |
| picking a card switches scene | pass |  |
| category filter | pass |  |
| search | pass | Digital Rain, Rainy Night, Thunderstorm, Night Train |
| next scene (→) | pass | Rainy Night |
| previous scene (←) | pass |  |
| pause with Space | pass |  |
| last scene restored after reload | pass |  |
| favorite persisted | pass |  |
| immersive with F | pass |  |
| Escape leaves immersive | pass |  |
| shuffle | pass |  |
| export JSON | pass |  |
| import rejects invalid JSON | pass |  |
| import rejects foreign files | pass |  |
| import accepts an export | pass |  |
| focus timer runs | pass | Focus 24:59 |
| playlist starts | pass |  |
| playlist advances after 30 s | pass |  |
| AFK mode starts after the idle delay | pass |  |
| AFK mode exits on input | pass |  |
| no runtime errors during the app session | pass |  |
| works offline after first visit (service worker) | pass | GARY'S AFK_ / Kaleidoscope / thumbnails true |
| 96 scene switches: one canvas left, heap stable | pass | heap 2.2 MB -> 5.1 MB, canvases 1 |
| 2-minute run of one scene: heap stable | pass | heap 5.7 MB -> 5.9 MB, fps samples 60,60,60,60,60,60,60,60,60,60,60,60 |

Memory is measured after a forced garbage collection through the DevTools protocol. Separate
2-minute checks with the same method: Fireplace 3.5 to 3.7 MB, Gary.exe 3.4 to 3.5 MB, Nebula 3.6
to 4.5 MB, Rainy Night 3.4 to 3.8 MB (stable, no growth trend).

## Bugs found by these tests and fixed

1. AFK mode never started while a playlist was running: the idle timer restarted at every scene change.
2. The service worker failed to install: build placeholders were replaced in a comment, not in the code.
3. Offline reload missed the cached scripts because of the server's `Vary` header.

## How to reproduce

```bash
npm ci
npm run lint && npm run typecheck && npm test
npm run build && npm run test:e2e     # about 9 minutes, writes tests/e2e/results.json
```
