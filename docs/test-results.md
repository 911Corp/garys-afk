# Test results (v1.3.0)

Real results from 2026-11-25 22:38 UTC. Nothing here is estimated.

Environment: headless Google Chrome (Playwright) on Linux, **software rendering** (no GPU),
production build served by `vite preview` under `/garys-afk/`. Real devices and other browsers
were not tested: see `docs/limitations.md`.

## Summary

| Suite | Result |
| --- | --- |
| Lint (oxlint) | 0 warnings, 0 errors |
| Typecheck (tsc) | 0 errors |
| Unit tests (Vitest) | 20 / 20 passed |
| End-to-end (Playwright) | 179 / 179 passed |

## Every scene, landscape 1280x720 and portrait 390x844 (smooth mode)

Each scene was loaded alone, run for 2.5 s (landscape) or 1.2 s (portrait), checked for runtime
errors and for a non-blank canvas. FPS is the engine's own measurement, capped at 60, on software
rendering.

| Scene | Landscape | Buffer | Colours | FPS | Portrait |
| --- | --- | --- | --- | --- | --- |
| gary-exe | pass | 1280x720 | 1529 | 60 | pass (390x844) |
| the-trenches | pass | 1280x720 | 2125 | 60 | pass (390x844) |
| lofi-room | pass | 1280x720 | 1777 | 60 | pass (390x844) |
| friday-deploy | pass | 1280x720 | 1249 | 60 | pass (390x844) |
| jarvis-core | pass | 1280x720 | 1827 | 60 | pass (390x844) |
| merge-conflict | pass | 1280x720 | 2645 | 60 | pass (390x844) |
| commit-3am | pass | 1280x720 | 1143 | 60 | pass (390x844) |
| anomaly-archive | pass | 1280x720 | 2083 | 60 | pass (390x844) |
| lost-and-found | pass | 1280x720 | 3901 | 60 | pass (390x844) |
| terminal-404 | pass | 1280x720 | 1487 | 60 | pass (390x844) |
| digital-rain | pass | 1280x720 | 1245 | 60 | pass (390x844) |
| mainframe | pass | 1280x720 | 3339 | 60 | pass (390x844) |
| packet-flow | pass | 1280x720 | 2826 | 60 | pass (390x844) |
| whale-radar | pass | 1280x720 | 2278 | 60 | pass (390x844) |
| purity-scanner | pass | 1280x720 | 1132 | 60 | pass (390x844) |
| dial-up | pass | 1280x720 | 1273 | 60 | pass (390x844) |
| chat-room | pass | 1280x720 | 2544 | 60 | pass (390x844) |
| mining-farm | pass | 1280x720 | 4562 | 60 | pass (390x844) |
| fireplace | pass | 1280x720 | 220 | 60 | pass (390x844) |
| rainy-night | pass | 1280x720 | 6188 | 60 | pass (390x844) |
| snow-cabin | pass | 1280x720 | 5360 | 60 | pass (390x844) |
| aquarium | pass | 1280x720 | 1625 | 60 | pass (390x844) |
| lava-lamp | pass | 1280x720 | 2664 | 60 | pass (390x844) |
| koi-pond | pass | 1280x720 | 5108 | 60 | pass (390x844) |
| bonsai-seasons | pass | 1280x720 | 909 | 60 | pass (390x844) |
| laundromat | pass | 1280x720 | 6749 | 60 | pass (390x844) |
| sleeper-train | pass | 1280x720 | 4825 | 60 | pass (390x844) |
| starfield | pass | 1280x720 | 3602 | 60 | pass (390x844) |
| black-hole | pass | 1280x720 | 538 | 60 | pass (390x844) |
| solar-system | pass | 1280x720 | 962 | 60 | pass (390x844) |
| nebula | pass | 533x300 | 3423 | 60 | pass (390x844) |
| to-the-moon | pass | 1280x720 | 3969 | 60 | pass (390x844) |
| orbit-station | pass | 1280x720 | 3097 | 60 | pass (390x844) |
| asteroid-drift | pass | 1280x720 | 5734 | 60 | pass (390x844) |
| lunar-base | pass | 1280x720 | 1449 | 60 | pass (390x844) |
| observatory | pass | 1280x720 | 11446 | 60 | pass (390x844) |
| dvd-survivor | pass | 1280x720 | 229 | 60 | pass (390x844) |
| 3d-pipes | pass | 1280x720 | 1434 | 60 | pass (390x844) |
| endless-maze | pass | 533x300 | 3 | 60 | pass (390x844) |
| flying-floppies | pass | 1280x720 | 14 | 60 | pass (390x844) |
| mystify | pass | 1280x720 | 9366 | 60 | pass (390x844) |
| text-3d | pass | 1280x720 | 2251 | 60 | pass (390x844) |
| under-construction | pass | 1280x720 | 1544 | 60 | pass (390x844) |
| popup-storm | pass | 1280x720 | 1245 | 60 | pass (390x844) |
| pirate-radio | pass | 1280x720 | 3161 | 60 | pass (390x844) |
| ocean-waves | pass | 533x300 | 460 | 56 | pass (390x844) |
| forest-life | pass | 1280x720 | 458 | 60 | pass (390x844) |
| northern-lights | pass | 533x300 | 5667 | 60 | pass (390x844) |
| thunderstorm | pass | 533x300 | 963 | 60 | pass (390x844) |
| sakura-valley | pass | 1280x720 | 4256 | 60 | pass (390x844) |
| desert-dunes | pass | 1280x720 | 6800 | 60 | pass (390x844) |
| volcano | pass | 1280x720 | 5425 | 60 | pass (390x844) |
| waterfall | pass | 1280x720 | 18577 | 37 | pass (390x844) |
| lighthouse-storm | pass | 1280x720 | 8879 | 60 | pass (390x844) |
| abyss | pass | 1280x720 | 6284 | 60 | pass (390x844) |
| neon-city | pass | 1280x720 | 733 | 60 | pass (390x844) |
| night-train | pass | 1280x720 | 1732 | 60 | pass (390x844) |
| arcade-room | pass | 1280x720 | 13731 | 60 | pass (390x844) |
| ngmi-runner | pass | 1280x720 | 612 | 60 | pass (390x844) |
| degen-casino | pass | 1280x720 | 8031 | 60 | pass (390x844) |
| cyber-cafe | pass | 1280x720 | 3295 | 60 | pass (390x844) |
| retro-racer | pass | 1280x720 | 6339 | 60 | pass (390x844) |
| pixel-harbor | pass | 1280x720 | 3540 | 60 | pass (390x844) |
| little-troop | pass | 1280x720 | 1005 | 60 | pass (390x844) |
| night-market | pass | 1280x720 | 14085 | 60 | pass (390x844) |
| game-of-life | pass | 533x300 | 43 | 60 | pass (390x844) |
| fractal-explorer | pass | 533x300 | 706 | 34 | pass (390x844) |
| flow-field | pass | 1280x720 | 191 | 60 | pass (390x844) |
| kaleidoscope | pass | 1280x720 | 4002 | 36 | pass (390x844) |
| reaction-diffusion | pass | 533x300 | 3221 | 60 | pass (390x844) |
| spirograph | pass | 1280x720 | 1229 | 60 | pass (390x844) |
| murmuration | pass | 1280x720 | 3531 | 60 | pass (390x844) |
| l-system-garden | pass | 1280x720 | 1149 | 60 | pass (390x844) |
| zen-garden | pass | 1280x720 | 3124 | 60 | pass (390x844) |
| watchmaker | pass | 1280x720 | 3628 | 60 | pass (390x844) |

## App, offline and memory

| Check | Result | Detail |
| --- | --- | --- |
| Retro pixels mode renders at low resolution | pass |  |
| no-flash + reduced motion modes run | pass |  |
| app loads under /garys-afk/ without errors | pass |  |
| starts on Gary.exe | pass |  |
| picking a card switches scene | pass |  |
| category filter | pass |  |
| search | pass | Lo-fi Room, Digital Rain, Rainy Night, Koi Pond, Laundromat, Sleeper Train, Under Construction, Thunderstorm, Lighthouse Storm, Night Train, Night Market, Watchmaker |
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
| 96 scene switches: one canvas left, heap stable | pass | heap 2.4 MB -> 6.8 MB, canvases 1 |
| 2-minute run of one scene: heap stable | pass | heap 7.8 MB -> 7.9 MB, fps samples 60,60,60,60,60,60,60,60,60,60,60,59 |
