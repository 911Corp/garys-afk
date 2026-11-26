# Test results (v1.4.1)

Real results from 2026-11-26 05:57 UTC. Nothing here is estimated.

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
| the-trenches | pass | 1280x720 | 2142 | 60 | pass (390x844) |
| lofi-room | pass | 1280x720 | 1779 | 60 | pass (390x844) |
| friday-deploy | pass | 1280x720 | 1249 | 60 | pass (390x844) |
| jarvis-core | pass | 1280x720 | 1827 | 60 | pass (390x844) |
| merge-conflict | pass | 1280x720 | 2645 | 60 | pass (390x844) |
| commit-3am | pass | 1280x720 | 1141 | 60 | pass (390x844) |
| anomaly-archive | pass | 1280x720 | 2065 | 60 | pass (390x844) |
| lost-and-found | pass | 1280x720 | 3901 | 60 | pass (390x844) |
| terminal-404 | pass | 1280x720 | 1487 | 60 | pass (390x844) |
| digital-rain | pass | 1280x720 | 1270 | 60 | pass (390x844) |
| mainframe | pass | 1280x720 | 3336 | 60 | pass (390x844) |
| packet-flow | pass | 1280x720 | 2764 | 60 | pass (390x844) |
| whale-radar | pass | 1280x720 | 2279 | 60 | pass (390x844) |
| purity-scanner | pass | 1280x720 | 1133 | 60 | pass (390x844) |
| dial-up | pass | 1280x720 | 1276 | 60 | pass (390x844) |
| chat-room | pass | 1280x720 | 2544 | 60 | pass (390x844) |
| mining-farm | pass | 1280x720 | 4522 | 60 | pass (390x844) |
| fireplace | pass | 1280x720 | 1313 | 60 | pass (390x844) |
| rainy-night | pass | 1280x720 | 834 | 57 | pass (390x844) |
| snow-cabin | pass | 1280x720 | 5367 | 60 | pass (390x844) |
| aquarium | pass | 1280x720 | 183 | 60 | pass (390x844) |
| lava-lamp | pass | 1280x720 | 2668 | 60 | pass (390x844) |
| koi-pond | pass | 1280x720 | 5102 | 60 | pass (390x844) |
| bonsai-seasons | pass | 1280x720 | 909 | 60 | pass (390x844) |
| laundromat | pass | 1280x720 | 6726 | 60 | pass (390x844) |
| sleeper-train | pass | 1280x720 | 4843 | 60 | pass (390x844) |
| starfield | pass | 1280x720 | 3615 | 60 | pass (390x844) |
| black-hole | pass | 1280x720 | 538 | 60 | pass (390x844) |
| solar-system | pass | 1280x720 | 987 | 60 | pass (390x844) |
| nebula | pass | 533x300 | 3423 | 60 | pass (390x844) |
| to-the-moon | pass | 1280x720 | 3954 | 60 | pass (390x844) |
| orbit-station | pass | 1280x720 | 3097 | 60 | pass (390x844) |
| asteroid-drift | pass | 1280x720 | 5754 | 60 | pass (390x844) |
| lunar-base | pass | 1280x720 | 1041 | 60 | pass (390x844) |
| observatory | pass | 1280x720 | 8680 | 60 | pass (390x844) |
| dvd-survivor | pass | 1280x720 | 168 | 60 | pass (390x844) |
| 3d-pipes | pass | 1280x720 | 1431 | 60 | pass (390x844) |
| endless-maze | pass | 533x300 | 3 | 60 | pass (390x844) |
| flying-floppies | pass | 1280x720 | 14 | 60 | pass (390x844) |
| mystify | pass | 1280x720 | 9736 | 60 | pass (390x844) |
| text-3d | pass | 1280x720 | 2156 | 60 | pass (390x844) |
| under-construction | pass | 1280x720 | 1544 | 60 | pass (390x844) |
| popup-storm | pass | 1280x720 | 1246 | 60 | pass (390x844) |
| pirate-radio | pass | 1280x720 | 3159 | 60 | pass (390x844) |
| ocean-waves | pass | 533x300 | 457 | 60 | pass (390x844) |
| forest-life | pass | 1280x720 | 458 | 60 | pass (390x844) |
| northern-lights | pass | 533x300 | 5637 | 60 | pass (390x844) |
| thunderstorm | pass | 533x300 | 23 | 60 | pass (390x844) |
| sakura-valley | pass | 1280x720 | 4226 | 60 | pass (390x844) |
| desert-dunes | pass | 1280x720 | 6817 | 60 | pass (390x844) |
| volcano | pass | 1280x720 | 5512 | 60 | pass (390x844) |
| waterfall | pass | 1280x720 | 24 | 60 | pass (390x844) |
| lighthouse-storm | pass | 1280x720 | 8932 | 60 | pass (390x844) |
| abyss | pass | 1280x720 | 6291 | 60 | pass (390x844) |
| neon-city | pass | 1280x720 | 733 | 60 | pass (390x844) |
| night-train | pass | 1280x720 | 30 | 60 | pass (390x844) |
| arcade-room | pass | 1280x720 | 13731 | 60 | pass (390x844) |
| ngmi-runner | pass | 1280x720 | 611 | 60 | pass (390x844) |
| degen-casino | pass | 1280x720 | 7499 | 60 | pass (390x844) |
| cyber-cafe | pass | 1280x720 | 3210 | 60 | pass (390x844) |
| retro-racer | pass | 1280x720 | 6127 | 60 | pass (390x844) |
| pixel-harbor | pass | 1280x720 | 149 | 60 | pass (390x844) |
| little-troop | pass | 1280x720 | 1005 | 60 | pass (390x844) |
| night-market | pass | 1280x720 | 14095 | 60 | pass (390x844) |
| game-of-life | pass | 533x300 | 43 | 60 | pass (390x844) |
| fractal-explorer | pass | 533x300 | 704 | 32 | pass (390x844) |
| flow-field | pass | 1280x720 | 191 | 60 | pass (390x844) |
| kaleidoscope | pass | 1280x720 | 4014 | 37 | pass (390x844) |
| reaction-diffusion | pass | 533x300 | 3221 | 60 | pass (390x844) |
| spirograph | pass | 1280x720 | 3822 | 60 | pass (390x844) |
| murmuration | pass | 1280x720 | 10995 | 60 | pass (390x844) |
| l-system-garden | pass | 1280x720 | 1789 | 60 | pass (390x844) |
| zen-garden | pass | 1280x720 | 3123 | 60 | pass (390x844) |
| watchmaker | pass | 1280x720 | 3647 | 60 | pass (390x844) |

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
| 96 scene switches: one canvas left, heap stable | pass | heap 2.4 MB -> 7.0 MB, canvases 1 |
| 2-minute run of one scene: heap stable | pass | heap 7.9 MB -> 8.0 MB, fps samples 60,60,60,60,60,60,60,60,60,60,60,60 |
