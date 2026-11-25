# Test results (v1.1.0)

Real results from 2026-11-25 09:56 UTC. Nothing here is estimated.

Environment: headless Google Chrome (Playwright 1.65) on Linux, **software rendering** (no GPU),
production build served by `vite preview` under `/garys-afk/`. Real devices and other browsers
were not tested: see `docs/limitations.md`.

## Summary

| Suite | Result |
| --- | --- |
| Lint (oxlint) | 0 warnings, 0 errors |
| Typecheck (tsc) | 0 errors |
| Unit tests (Vitest) | 19 / 19 passed |
| End-to-end (Playwright) | 93 / 93 passed |

Unit tests cover the Conway rule (blinker, block, glider across the wrapping edge, HighLife B6),
the settings schema (garbage input, clamping, unknown ids, prototype pollution, v0 migration,
import checks), the scene catalogue (32 scenes, 4 per category, thumbnails, valid defaults, Gary
only in Gary.exe) and the palette reduction used by Retro pixels mode.

## Every scene, landscape 1280x720 and portrait 390x844 (smooth mode)

Each scene was loaded alone, run for 2.5 s (landscape) or 1.2 s (portrait), checked for runtime
errors and for a non-blank canvas. "Buffer" is the canvas resolution (per-pixel scenes use a lower
one). "Colours" counts distinct colours in a sparse sample of the frame. FPS is the engine's own
measurement, capped at 60, on software rendering.

| Scene | Landscape | Buffer | Colours | FPS | Portrait |
| --- | --- | --- | --- | --- | --- |
| gary-exe | pass | 1280x720 | 1529 | 60 | pass (390x844) |
| the-trenches | pass | 1280x720 | 2132 | 60 | pass (390x844) |
| night-diner | pass | 1280x720 | 9643 | 60 | pass (390x844) |
| lofi-room | pass | 1280x720 | 10334 | 60 | pass (390x844) |
| terminal-404 | pass | 1280x720 | 1487 | 60 | pass (390x844) |
| digital-rain | pass | 1280x720 | 1245 | 60 | pass (390x844) |
| mainframe | pass | 1280x720 | 3362 | 60 | pass (390x844) |
| packet-flow | pass | 1280x720 | 2760 | 60 | pass (390x844) |
| fireplace | pass | 1280x720 | 228 | 60 | pass (390x844) |
| rainy-night | pass | 1280x720 | 6186 | 60 | pass (390x844) |
| snow-cabin | pass | 1280x720 | 5356 | 60 | pass (390x844) |
| aquarium | pass | 1280x720 | 1653 | 60 | pass (390x844) |
| starfield | pass | 1280x720 | 3610 | 60 | pass (390x844) |
| black-hole | pass | 1280x720 | 538 | 60 | pass (390x844) |
| solar-system | pass | 1280x720 | 962 | 60 | pass (390x844) |
| nebula | pass | 533x300 | 3439 | 60 | pass (300x649) |
| dvd-survivor | pass | 1280x720 | 229 | 60 | pass (390x844) |
| 3d-pipes | pass | 1280x720 | 1434 | 60 | pass (390x844) |
| endless-maze | pass | 533x300 | 3 | 60 | pass (300x649) |
| flying-floppies | pass | 1280x720 | 14 | 60 | pass (390x844) |
| ocean-waves | pass | 533x300 | 461 | 58 | pass (300x649) |
| forest-life | pass | 1280x720 | 458 | 60 | pass (390x844) |
| northern-lights | pass | 533x300 | 5643 | 60 | pass (300x649) |
| thunderstorm | pass | 533x300 | 962 | 60 | pass (300x649) |
| neon-city | pass | 1280x720 | 733 | 60 | pass (390x844) |
| night-train | pass | 1280x720 | 1733 | 60 | pass (390x844) |
| medieval-village | pass | 1280x720 | 1374 | 60 | pass (390x844) |
| arcade-room | pass | 1280x720 | 13718 | 60 | pass (390x844) |
| game-of-life | pass | 533x300 | 43 | 60 | pass (300x649) |
| fractal-explorer | pass | 533x300 | 695 | 30 | pass (300x649) |
| flow-field | pass | 1280x720 | 191 | 60 | pass (390x844) |
| kaleidoscope | pass | 1280x720 | 4017 | 35 | pass (390x844) |

## App behaviour

| Check | Result | Detail |
| --- | --- | --- |
| Retro pixels mode renders at low resolution | pass |  |
| no-flash + reduced motion modes run | pass |  |
| app loads under /garys-afk/ without errors | pass |  |
| starts on Gary.exe | pass |  |
| picking a card switches scene | pass |  |
| category filter | pass |  |
| search | pass | Night Diner, Lo-fi Room, Digital Rain, Rainy Night, Thunderstorm, Night Train |
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
| 96 scene switches: one canvas left, heap stable | pass | heap 2.2 MB -> 4.7 MB, canvases 1 |
| 2-minute run of one scene: heap stable | pass | heap 5.6 MB -> 5.9 MB, fps samples 60,60,60,60,60,60,60,60,60,60,60,60 |

Memory is measured after a forced garbage collection through the DevTools protocol.

## Bugs found by the tests and fixed (v1.0.0)

1. AFK mode never started while a playlist was running: the idle timer restarted at every scene change.
2. The service worker failed to install: build placeholders were replaced in a comment, not in the code.
3. Offline reload missed the cached scripts because of the server's `Vary` header.

## How to reproduce

```bash
npm ci
npm run lint && npm run typecheck && npm test
npm run build && npm run test:e2e     # about 9 minutes, writes tests/e2e/results.json
```
