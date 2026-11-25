# Architecture

Static, local-first single-page app: React 19 + TypeScript + Vite, Canvas 2D, Web Audio,
localStorage, a generated service worker. No backend, no runtime dependency besides React.

```
src/
  main.tsx                 entry: fonts, CSS, App or the bare #/render/<id> route, SW registration
  sw-template.js           service worker; the build injects the version and the precache list
  app/App.tsx              orchestration: current scene, prev/next/shuffle, immersive, playlists,
                           AFK idle detection, sound, keyboard
  app/RenderOnly.tsx       one scene full-window, no UI (thumbnails and visual tests)
  components/ui.tsx        Panel, Range, Select, Toggle, Btn
  features/
    player/                Player (stage + overlays + auto-hide), Clock
    catalog/               chips, search, grid of thumbnails
    playlists/             playlist editor
    focus/                 Pomodoro hook and panel
    settings/              scene, display & clock, sound, AFK, accessibility, data, about panels
  storage/
    schema.ts              State type, defaults, migrate(), sanitize(), checkImport()
    store.ts               tiny external store + useStore(), debounced persistence, import/export
  engine/
    types.ts               the scene contract (SceneMeta, SettingDef, SceneContext, SceneInstance)
    stage.ts               owns the canvas, the clock, the FPS cap, resize, pause, disposal
    base.ts                BaseScene / PixelScene (draw, then palette reduction)
    pixel.ts               palettes, RGB555 lookup tables, Bayer dithering
    noise.ts, math.ts      seeded simplex noise, rng, helpers
    gary/kit.ts            Gary's canonical drawing code (ported from the Purity-o-Meter)
    gary/draw.ts           Path2D renderer for Gary ops, LCD palettes, the canonical bubble
    audio/audio.ts         synthesised ambiences and one-shots
  scenes/
    registry.ts            categories + the list of SceneEntry
    <category>/index.ts    metadata and settings of the 4 scenes, with lazy loaders
    <category>/<scene>.ts  the scene modules
```

## The scene contract

A scene is described by a `SceneEntry` (metadata, settings definitions, lazy `load()`), and its
module exports `create(ctx): SceneInstance`. The instance implements `update(dt)`, `render()`,
`resize()`, `setSettings()` and `dispose()`. Pause and resume are handled by the Stage, which simply
stops calling `update`/`render`.

`ctx` gives the canvas, its internal size, `pixelRatio`, the scene's settings, the global render
options (density, intensity, show Gary, no flash, reduced motion, quality), an `emit()` for audio
one-shots (thunder, chime) and a deterministic seed.

## Rendering pipeline

Two modes, chosen by the "Retro pixels" display setting.

- **Smooth (default)**: the Stage sizes the canvas to the screen's real pixels (short side capped at
  360, 720 or 1080 by Graphics quality, and at 2× the CSS size). Scenes flagged `heavy` (per-pixel
  work) use 200, 300 or 420 and are smoothed when CSS scales them up.
- **Retro pixels**: a small buffer of 144, 180 or 224 pixels on the short side, times the scene's
  `pixelScale`. After drawing, `PixelScene.render()` maps every pixel to the scene's palette through
  a 32×32×32 lookup table with 4×4 Bayer dithering, and CSS shows it with `image-rendering: pixelated`.

In both modes scenes draw in units (`this.u` = one pixel of a 180-pixel-high screen), so the same
code serves every resolution. Switching mode creates a fresh canvas.

Animation is time-based (`dt` in seconds, clamped to 0.1 s), so scenes look the same at 15, 30 or
60 FPS. The loop stops when the tab is hidden. A new canvas is created per scene and the old one is
shrunk to 1×1 and removed, so switching scenes does not accumulate memory (verified in the soak test).

## Gary

`src/engine/gary/kit.ts` is a port of the Purity-o-Meter's `gary()` function: same seeded PRNG,
same `ln`/`blob`/`dot` wobble primitives, same coordinates and stroke widths for the five verdict
poses (Pure, Mid, Sus, Cursed, SCAM). New poses (asleep, sipping, in the grass, at the counter)
are built from those primitives and proportions only. The ops are compiled once to `Path2D` and
reused; a few seeded variants cycle for the optional "line boil". Gary appears in one scene,
Gary.exe, composed in a 960×540 world in the Purity-o-Meter's LCD colours. The other After Hours
scenes use `src/scenes/gary/world.ts`, the same 960×540 world without Gary.

## Storage

One JSON object under the `garys-afk` key. `sanitize()` runs on load and on import: unknown keys
are dropped, numbers clamped, unknown scene ids removed, nothing is evaluated. `migrate()` upgrades
older versions (v0 prototype files map to v1). Imports must carry `"app": "garys-afk"` and a version
not newer than the app's.

## Sound

All 14 ambiences are synthesised: looped noise buffers (white, pink, brown; the loop point is
cross-faded), biquad filters, slow LFOs and randomly scheduled one-shots (rain drips, fire crackles,
crickets, HDD clicks, train clacks, arcade arpeggios). A compressor on the master bus prevents
clipping when layers stack. The AudioContext is created only after a click or key press.

## Offline

`vite.config.ts` emits `sw.js` at build time with a versioned cache name and the full list of build
and public files. The worker precaches everything on install (file by file, so one failure does not
break the install) and takes over at once (`skipWaiting`). The page itself is network-first, so a
new deployment shows up immediately; hashed assets are cache-first. Old caches are deleted on
activate, and the page reloads once when a new worker takes control. The browser checks for a new
worker on each visit and when the app comes back to the foreground. Full offline use needs
one online visit first.

## Art direction (v1.4)

Every scene belongs to one style family, and the families are balanced across the catalogue:

| Family | How it is drawn |
| --- | --- |
| Pixel art | `PixelArtScene` (src/scenes/pixelart.ts): composed on a small grid (short side 144 px), scaled with no smoothing. Helpers: `px`, `dot`, `disc`, `bands`, `dither2`. |
| Flat illustration | Solid colours and clean shapes, no gradients on surfaces. |
| Silhouettes and gradients | Flat black or near-black shapes against a gradient sky. |
| Screens and retro web | UI-like scenes: terminals, old desktops, editors, dials. |
| Generative | Simulations and procedural drawings. |
