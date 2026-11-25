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

1. The Stage sizes the canvas to a small buffer: 144, 180 or 224 pixels on the short side depending
   on the "Pixel size" setting, times the scene's `pixelScale` (text-heavy scenes use 1.25 to 1.5).
2. The scene draws with the normal Canvas 2D API, in buffer pixels (`this.u` = one pixel of a
   180-pixel screen).
3. `PixelScene.render()` reads the frame back and maps every pixel to the scene's palette through a
   32×32×32 lookup table, adding 4×4 Bayer dithering where the scene wants it.
4. CSS shows the canvas at full size with `image-rendering: pixelated`.

Animation is time-based (`dt` in seconds, clamped to 0.1 s), so scenes look the same at 15, 30 or
60 FPS. The loop stops when the tab is hidden. A new canvas is created per scene and the old one is
shrunk to 1×1 and removed, so switching scenes does not accumulate memory (verified in the soak test).

## Gary

`src/engine/gary/kit.ts` is a port of the Purity-o-Meter's `gary()` function: same seeded PRNG,
same `ln`/`blob`/`dot` wobble primitives, same coordinates and stroke widths for the five verdict
poses (Pure, Mid, Sus, Cursed, SCAM). New poses (asleep, sipping, in the grass, at the counter)
are built from those primitives and proportions only. The ops are compiled once to `Path2D` and
reused; a few seeded variants cycle for the optional "line boil". Gary scenes are composed in a
960×540 world (like the reaction pack scenes) and use a 5-colour Game Boy style palette built on
the Purity-o-Meter's LCD green, ink and bubble white.

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
break the install), serves cache-first, and deletes old caches on activate. Full offline use needs
one online visit first.
