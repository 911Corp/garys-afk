# Test results (v1.3.0)

Real results from 2026-11-25 22:00 UTC. Nothing here is estimated.

Environment: headless Google Chrome (Playwright) on Linux, **software rendering** (no GPU),
production build served by `vite preview` under `/garys-afk/`. Real devices and other browsers
were not tested: see `docs/limitations.md`.

## Summary

| Suite | Result |
| --- | --- |
| Lint (oxlint) | 0 warnings, 0 errors |
| Typecheck (tsc) | 0 errors |
| Unit tests (Vitest) | 20 / 20 passed |
| End-to-end (Playwright) | 159 / 159 passed |

## Every scene, landscape 1280x720 and portrait 390x844 (smooth mode)

Each scene was loaded alone, run for 2.5 s (landscape) or 1.2 s (portrait), checked for runtime
errors and for a non-blank canvas. FPS is the engine's own measurement, capped at 60, on software
rendering.

| Scene | Landscape | Buffer | Colours | FPS | Portrait |
| --- | --- | --- | --- | --- | --- |
| gary-exe | pass | 1280x720 | 1535 | 60 | pass (390x844) |
| the-trenches | pass | 1280x720 | 2149 | 60 | pass (390x844) |
| lofi-room | pass | 1280x720 | 10335 | 60 | pass (390x844) |
| friday-deploy | pass | 1280x720 | 1252 | 60 | pass (390x844) |
| jarvis-core | pass | 1280x720 | 1836 | 60 | pass (390x844) |
| merge-conflict | pass | 1280x720 | 2645 | 60 | pass (390x844) |
| commit-3am | pass | 1280x720 | 1143 | 60 | pass (390x844) |
| anomaly-archive | pass | 1280x720 | 2079 | 60 | pass (390x844) |
| terminal-404 | pass | 1280x720 | 1487 | 60 | pass (390x844) |
| digital-rain | pass | 1280x720 | 1270 | 60 | pass (390x844) |
| mainframe | pass | 1280x720 | 3336 | 60 | pass (390x844) |
| packet-flow | pass | 1280x720 | 2747 | 60 | pass (390x844) |
| whale-radar | pass | 1280x720 | 2299 | 60 | pass (390x844) |
| purity-scanner | pass | 1280x720 | 1149 | 60 | pass (390x844) |
| dial-up | pass | 1280x720 | 1278 | 60 | pass (390x844) |
| chat-room | pass | 1280x720 | 2544 | 60 | pass (390x844) |
| fireplace | pass | 1280x720 | 224 | 60 | pass (390x844) |
| rainy-night | pass | 1280x720 | 6184 | 60 | pass (390x844) |
| snow-cabin | pass | 1280x720 | 5356 | 60 | pass (390x844) |
| aquarium | pass | 1280x720 | 1653 | 60 | pass (390x844) |
| lava-lamp | pass | 1280x720 | 2660 | 60 | pass (390x844) |
| koi-pond | pass | 1280x720 | 5124 | 60 | pass (390x844) |
| bonsai-seasons | pass | 1280x720 | 892 | 60 | pass (390x844) |
| laundromat | pass | 1280x720 | 6727 | 60 | pass (390x844) |
| starfield | pass | 1280x720 | 3599 | 60 | pass (390x844) |
| black-hole | pass | 1280x720 | 538 | 60 | pass (390x844) |
| solar-system | pass | 1280x720 | 962 | 60 | pass (390x844) |
| nebula | pass | 533x300 | 3423 | 60 | pass (390x844) |
| to-the-moon | pass | 1280x720 | 3973 | 60 | pass (390x844) |
| orbit-station | pass | 1280x720 | 3099 | 60 | pass (390x844) |
| asteroid-drift | pass | 1280x720 | 5743 | 60 | pass (390x844) |
| lunar-base | pass | 1280x720 | 1450 | 60 | pass (390x844) |
| dvd-survivor | pass | 1280x720 | 168 | 60 | pass (390x844) |
| 3d-pipes | pass | 1280x720 | 1439 | 60 | pass (390x844) |
| endless-maze | pass | 533x300 | 3 | 60 | pass (390x844) |
| flying-floppies | pass | 1280x720 | 14 | 60 | pass (390x844) |
| mystify | pass | 1280x720 | 9737 | 60 | pass (390x844) |
| text-3d | pass | 1280x720 | 2156 | 60 | pass (390x844) |
| under-construction | pass | 1280x720 | 1553 | 60 | pass (390x844) |
| popup-storm | pass | 1280x720 | 1246 | 60 | pass (390x844) |
| ocean-waves | pass | 533x300 | 456 | 60 | pass (390x844) |
| forest-life | pass | 1280x720 | 458 | 60 | pass (390x844) |
| northern-lights | pass | 533x300 | 5632 | 60 | pass (390x844) |
| thunderstorm | pass | 533x300 | 952 | 60 | pass (390x844) |
| sakura-valley | pass | 1280x720 | 4225 | 60 | pass (390x844) |
| desert-dunes | pass | 1280x720 | 6807 | 60 | pass (390x844) |
| volcano | pass | 1280x720 | 5425 | 60 | pass (390x844) |
| waterfall | pass | 1280x720 | 21046 | 47 | pass (390x844) |
| neon-city | pass | 1280x720 | 733 | 60 | pass (390x844) |
| night-train | pass | 1280x720 | 1732 | 60 | pass (390x844) |
| arcade-room | pass | 1280x720 | 13731 | 60 | pass (390x844) |
| ngmi-runner | pass | 1280x720 | 608 | 60 | pass (390x844) |
| degen-casino | pass | 1280x720 | 8038 | 60 | pass (390x844) |
| cyber-cafe | pass | 1280x720 | 3305 | 60 | pass (390x844) |
| retro-racer | pass | 1280x720 | 6112 | 60 | pass (390x844) |
| pixel-harbor | pass | 1280x720 | 3542 | 60 | pass (390x844) |
| little-troop | pass | 1280x720 | 1005 | 60 | pass (390x844) |
| game-of-life | pass | 533x300 | 43 | 60 | pass (390x844) |
| fractal-explorer | pass | 533x300 | 698 | 34 | pass (390x844) |
| flow-field | pass | 1280x720 | 191 | 60 | pass (390x844) |
| kaleidoscope | pass | 1280x720 | 4009 | 39 | pass (390x844) |
| reaction-diffusion | pass | 533x300 | 3245 | 60 | pass (390x844) |
| spirograph | pass | 1280x720 | 1186 | 60 | pass (390x844) |
| murmuration | pass | 1280x720 | 3515 | 60 | pass (390x844) |
| l-system-garden | pass | 1280x720 | 1149 | 60 | pass (390x844) |

## App, offline and memory

| Check | Result | Detail |
| --- | --- | --- |
| Retro pixels mode renders at low resolution | pass |  |
| no-flash + reduced motion modes run | pass |  |
| app loads under /garys-afk/ without errors | pass |  |
| starts on Gary.exe | pass |  |
| picking a card switches scene | pass |  |
| category filter | pass |  |
| search | pass | Lo-fi Room, Digital Rain, Rainy Night, Koi Pond, Laundromat, Under Construction, Thunderstorm, Waterfall, Night Train |
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
| 96 scene switches: one canvas left, heap stable | pass | heap 2.3 MB -> 6.4 MB, canvases 1 |
| 2-minute run of one scene: heap stable | pass | heap 7.4 MB -> 7.5 MB, fps samples 60,60,60,60,60,60,60,60,60,60,60,60 |
