# Known limitations

Written from what was actually built and tested on 2026-11-25. Anything not listed in
`docs/test-results.md` as tested has not been tested.

## Not tested yet

- Real devices. All automated tests ran in headless Chrome on Linux (software rendering). Not
  tested: Safari (macOS, iOS), Firefox, Edge, Android Chrome, Windows, macOS, a real second monitor,
  high-DPI screens, touch hardware.
- PWA installation prompts (desktop install, "Add to Home Screen" on iOS/Android). Offline use after
  a first visit is tested; the install flow itself is not.
- Sound output. The audio engine is built and type-checked, but headless tests cannot listen. The
  ambiences need a listening pass on real speakers, ideally on phones too, for levels and taste.
- Notifications from the focus timer (they need a user permission prompt).
- Long sessions beyond the automated 2-minute run and 96 scene switches (for example a full night
  on a secondary screen).

## Platform limits

- Fullscreen: the Fullscreen API needs a user gesture and is missing on iPhone Safari for page
  elements. The app then falls back to its in-page immersive view (the browser bars stay visible).
- AFK mode only sees activity inside the Gary's AFK tab. It is not a system screensaver and cannot
  start when another app is in front. The experimental Idle Detection API is not used.
- Audio needs a tap or key press after every page load (browser autoplay policy). If sound was on,
  the first tap anywhere turns it back on.
- OLED care moves the clock and labels a little every minute. It reduces the risk of burn-in, it
  does not prevent it. Static scene elements (for example Gary's desk) do not move.
- Offline needs one online visit first, so the service worker can download everything (about 1 MB).

## Product choices to confirm

- Jarvis has no official visual, so he appears as text only (the log on Gary's monitor, the voice in
  Terminal 404). Add his design to `src/engine/gary/` when it exists.
- "Flying Toasters" ships as **Flying Floppies**, with original sprites.
- Gary appears only in Gary.exe (asleep, no speech bubbles), at the owner's request. The canonical
  poses and the speech bubble remain in `src/engine/gary/` for future use.
- Fractal Explorer zooms until double precision runs out (about 10^11), then pulls back and picks
  another point. Deeper zooms would need arbitrary precision.
- Black Hole is an artistic rendering, not a physical simulation.
- Thumbnails are real renders at a fixed moment; a scene can look different a minute later
  (Game of Life, Flow Field, 3D Pipes grow over time).

## Performance notes

- Heaviest scenes on the CPU: Fractal Explorer, Nebula, Ocean Waves, Northern Lights (per-pixel
  work). They render at a lower internal resolution, so they look softer than the vector scenes.
  On slow devices use Graphics quality "Low", a 30 or 15 FPS cap, or Power saver.
- Frame rates in `docs/test-results.md` come from software rendering in a headless browser; real
  hardware should do better, but this has not been measured.
