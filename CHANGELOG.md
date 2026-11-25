# Changelog

## 1.1.1 (2026-11-25)

### Fixed
- Updates now reach phones and installed apps right away. The service worker used to serve the
  cached page first and wait for every tab to close before switching, so the previous version could
  stay on screen. The page is now fetched from the network first (the cache is only the offline
  fallback), a new worker takes over immediately, and the page reloads once when it does.

## 1.1.0 (2026-11-25)

### Changed
- New interface style, matched on the owner's reference screens: IBM Plex Mono everywhere, a
  rounded app frame, thin rounded buttons, chips and cards, mint accent for what is active, a large
  clock centred at the top of the scene.
- Scenes now render smooth and sharp at the screen's resolution. The pixel look stays available as
  the **Retro pixels** display option (off by default). Per-pixel scenes (Nebula, Ocean Waves,
  Northern Lights, Thunderstorm, Fractal Explorer, Game of Life, Endless Maze) render at a lower
  internal resolution and are smoothed when scaled.
- Starfield redrawn in the spirit of the reference "The Void": deep blue night, star streaks.
- Ocean Waves: sun clipped at the horizon, finer sun glitter.
- Thumbnails regenerated from the smooth renders, as 640×360 JPEG.
- Subtle CRT scanlines on by default.

### Gary
- Gary now appears in one scene only, **Gary.exe**, asleep, with no speech bubbles.
- Removed: Touch Grass and Burger Shift, and the "Gary's head" logo of DVD Survivor.
- The Trenches no longer shows Gary: an empty trading desk with three monitors of simulated
  markets (red and green candles, order book, fake alerts).
- The "Gary's Universe" category becomes **After Hours**.

### Added
- **Night Diner**: a retro diner after midnight, neon, rain and headlights outside, coffee steaming.
- **Lo-fi Room**: a cosy room at night, rain on the window, a record spinning, a cat asleep, fairy lights.

## 1.0.0 (2026-11-25), first complete version, not deployed

### Direction
- Retro pixel-art app, 8/16-bit spirit: every scene renders at about 320×180, is reduced to a
  limited palette with ordered dithering, then upscaled with crisp pixels.
- Single-page layout from the validated prototype screens: header, player with clock and scene
  name, ‹ Shuffle Favorite › row, category chips, thumbnail grid, collapsible panels.
- Gary is drawn with the Purity-o-Meter's canonical code (ported, not redrawn), in a 5-colour
  palette built on its LCD green. Gary scenes are deliberately minimal.

### Scenes (32)
- Gary's Universe: Gary.exe, Touch Grass, Burger Shift, The Trenches (simulated market, Gary's five
  canonical poses).
- Terminal & Hacker: Terminal 404, Digital Rain, Mainframe, Packet Flow.
- Cozy & Relax: Fireplace (classic heat-spread pixel fire), Rainy Night, Snow Cabin, Aquarium.
- Space & Cosmos: Starfield, Black Hole, Solar System (real period ratios), Nebula.
- Retro Screensavers: DVD Survivor, 3D Pipes, Endless Maze (ray casting), Flying Floppies
  (renamed from "Flying Toasters", original sprites).
- Nature & Landscapes: Ocean Waves, Forest Life, Northern Lights, Thunderstorm (no-flash mode).
- Pixel Worlds: Neon City, Night Train, Medieval Village, Arcade Room (5 original mini-games).
- Generative Art: Game of Life (real B3/S23 and HighLife), Fractal Explorer (Mandelbrot, Julia,
  Burning Ship), Flow Field (curl noise), Kaleidoscope.

### Features
- Catalogue: categories, search, favorites, recent, shuffle, previous/next, real thumbnails.
- Player: pause, immersive fullscreen (with an in-page fallback), auto-hiding controls, double-tap.
- Display: speed, brightness, effects intensity, density, pixel size, 15/30/60 FPS cap, CRT
  overlay, show/hide Gary; per-scene settings with reset and restart.
- Clock and date: 12/24 h, five positions, size, opacity.
- Sound: 14 synthesised ambiences, scene ambience + free mix, master volume, mute (M), thunder and
  chime one-shots. Starts only after a user gesture.
- Playlists: create, rename, reorder, durations from 30 s to 2 h, shuffle, loop, fades.
- AFK mode: in-app idle detection, delay, current/random/playlist, exit on input or Esc only.
- Focus timer: Pomodoro with rounds, long breaks, chime, optional notifications.
- Accessibility: reduce motion (system/on/off), no flashes, OLED care (moving overlays, no
  guarantee), power saver, keyboard shortcuts, labelled controls, 44 px touch targets.
- Data: local only, JSON export, validated import, full reset, schema migrations.
- PWA: manifest, Gary pixel icons, generated service worker with versioned precache, works
  offline after the first visit.

### Fixed during testing
- The AFK idle timer restarted at every scene change, so a running playlist kept AFK mode from
  starting.
- The service worker template replaced its placeholders in a comment instead of the code.
- Offline: cached module scripts were missed because of the `Vary` header; the cache now ignores it.
