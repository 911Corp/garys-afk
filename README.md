# Gary's AFK

**even degens need a break.**

A collection of animated worlds, retro screensavers and ambient experiences for people who spend
too much time online. Pick a scene, customize your atmosphere, go fullscreen and take a break.

Part of **Gary's Adventures** ([@Gary_NGMI](https://x.com/Gary_NGMI)), next to
[Gary's Free Stack](https://911corp.github.io/garys-free-stack/) and
[Gary's Repo Rescue](https://911corp.github.io/garys-repo-rescue/).

Free. No account, no ads, no wallet, no tracking, no server. Everything stays in your browser.

## What's inside

64 animated scenes in 8 categories, each with its own renderer and settings:

| Category | Scenes |
| --- | --- |
| After Hours | Gary.exe · The Trenches · Lo-fi Room · Friday Deploy · Jarvis Core · Merge Conflict · 3AM Commit · Anomaly Archive |
| Terminal & Hacker | Terminal 404 · Digital Rain · Mainframe · Packet Flow · Whale Radar · Purity Scanner · Dial-Up 56k · Chat Room 1999 |
| Cozy & Relax | Fireplace · Rainy Night · Snow Cabin · Aquarium · Lava Lamp · Koi Pond · Bonsai Seasons · Laundromat |
| Space & Cosmos | Starfield · Black Hole · Solar System · Nebula · To the Moon · Orbit Station · Asteroid Drift · Lunar Base |
| Retro Screensavers | DVD Survivor · 3D Pipes · Endless Maze · Flying Floppies · Mystify · 3D Text · Under Construction · Pop-up Storm |
| Nature & Landscapes | Ocean Waves · Forest Life · Northern Lights · Thunderstorm · Sakura Valley · Desert Dunes · Volcano · Waterfall |
| Pixel Worlds | Neon City · Night Train · Arcade Room · NGMI Runner · Degen Casino · Cyber Café 2003 · Retro Racer · Pixel Harbor |
| Generative Art | Game of Life · Fractal Explorer · Flow Field · Kaleidoscope · Reaction Diffusion · Spirograph · Murmuration · L-System Garden |

Crypto tickers, wallets, balances and verdicts shown in scenes are fictional. Not financial advice.

Scenes render sharp and smooth at your screen's resolution. Turn on **Retro pixels** in Display to
get the 8/16-bit look instead: a ~320×180 buffer, limited palettes and ordered dithering. Gary
appears in one scene only, Gary.exe, asleep at his desk.

Also: favorites, recent scenes, search, shuffle, immersive fullscreen with auto-hiding controls,
an optional clock and date, 14 synthesised ambiences you can mix, playlists with durations and
fades, an AFK mode that starts after in-app idle time, a Pomodoro focus timer, OLED care, no-flash
and reduced-motion modes, JSON export/import, and offline use once installed (PWA).

## Keyboard

`Space` pause · `←` `→` previous / next · `R` random · `F` immersive · `L` favorite · `M` sound · `Esc` exit

## Run it

```bash
npm ci
npm run dev        # http://localhost:5173/garys-afk/
npm run lint
npm run typecheck
npm test           # unit tests (Vitest)
npm run build      # production build in dist/
npm run preview    # serve the build at http://localhost:4173/garys-afk/
npm run test:e2e   # end-to-end tests on the build (Playwright + Chrome)
```

`npm run thumbs` regenerates the catalogue thumbnails from the real scenes (needs `npx vite --base /`
running on port 5173). The build expects to live under `/garys-afk/`; set `GARYS_AFK_BASE=/` to
build for a root domain.

## Docs

- [Architecture](docs/architecture.md)
- [Creating a new scene](docs/creating-a-scene.md)
- [Deployment](docs/deployment.md)
- [Test results](docs/test-results.md)
- [Known limitations](docs/limitations.md)
- [Third-party notices and asset register](THIRD_PARTY_NOTICES.md)
- [Handoff for the next agent](HANDOFF.md)

## Licence

Code: MIT. Gary, Jarvis and the Gary's Adventures names are the project's identity and are not
licensed for reuse as a brand. Fonts: SIL Open Font License. See `THIRD_PARTY_NOTICES.md`.

Not financial advice. Neither is Gary.
