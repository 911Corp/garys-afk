# Changelog

## 1.4.1 (2026-11-26)

### Changed
- **Bonsai** (was Bonsai Seasons) redrawn as a green evergreen in informal upright style, built to
  the classic rules: a trunk that tapers and whose curves shrink with height, surface roots, the
  first branch at a third of the height, alternating branches (one at the back), foliage pads with
  flat undersides forming a scalene triangle, the tree off-centre in a shallow pot, on a stand with
  an accent plant. New settings: light (morning, midday, evening) and breeze.

## 1.4.0 (2026-11-26)

### Art direction
- Each scene now commits to one clear style, and the styles are spread across the catalogue:
  pixel art (a real low-resolution grid, limited palettes, no smoothing), flat illustration,
  silhouettes and gradients, screens and retro web, and generative. A shared `PixelArtScene`
  base composes on a grid whose short side is 144 pixels.

### Redone
- Pixel art: **Waterfall** (colour-cycled water, hand-shaded rock), **Fireplace** (a real pixel
  fire; clock with the real time, candlesticks, books, fern, painting, window with snow),
  **Rainy Night**, **Aquarium** (sprite fish), **Night Train** (side view over a viaduct),
  **Pixel Harbor**, **Thunderstorm** (seen through a cottage window: hills, a line of trees on the
  ridge, a river, rain on the pane, lightning; no-flash mode kept).
- Silhouettes and gradients: **Observatory** (long-exposure star trails), **Murmuration** (the
  flock follows a living shape, so it always reads as one body).
- Flat illustration: **Lunar Base**.
- Generative: **Spirograph** (never starts empty, three pens, shifting ink), **L-System Garden**
  (more and bigger plants, leaves along the growth, grass).

## 1.3.1 (2026-11-25)

### Changed
- On-screen "fictional" / "simulated" notes removed from the scenes and their descriptions (Purity
  Scanner, Whale Radar, Degen Casino, Mining Farm, To the Moon, The Trenches, Terminal 404, Packet
  Flow, Pirate Radio): the joke works better unexplained. Gary's signature stays: "Not financial
  advice. Neither is Gary." Tickers and data remain invented.

## 1.3.0 (2026-11-25)

75 scenes.

### Added
- Ten scenes on new themes: **Mining Farm** (a fictional farm, a green wave when a block is
  found), **Lost & Found of the Web** (the night desk tags a guestbook, a hit counter, a webring
  badge...), **Night Market**, **Lighthouse Storm**, **Abyss**, **Sleeper Train**, **Observatory**
  (star trails around the pole), **Zen Garden** (a rake draws rings around the stones),
  **Watchmaker** (a meshing gear train, balance wheel, rubies), **Pirate Radio** (RADIO NGMI,
  VU meters, tape reels; invented tracks).
- **Little Troop** (Pixel Worlds): a 90s-style puzzle platformer in attract mode with an original
  crew in orange beanies. They drop from a hatch, dig, tunnel, build stairs and bridges, float down
  under umbrellas and head for the lantern door; a new level is carved when the troop is home.

### Changed
- **Lo-fi Room** redrawn as original pixel art on a real 256x144 grid, scaled without smoothing:
  an attic studio at night with a rainy skylight, fairy lights, a CRT and a desk lamp, hanging
  plants, a record spinning and a dog asleep in its basket.
- **Waterfall** rebuilt: a great fall through a notch in a towering cliff, seen from the plunge
  pool, with rolling mist, light shafts, vines, birds (no rainbow) and jungle fronds framing the view.
  New **Light** setting: day, golden hour, moonlight. Every element is placed from one geometry.
- **Pop-up Storm** redrawn the old-desktop way: pixel-art desktop icons (computer, recycle bin,
  folder, text file, app), bevelled windows and buttons with a focus ring, the classic message
  icons (error, warning, information, question), boxes sized to their text, one taskbar button
  per window, a tray clock and a Jarvis balloon.

### Fixed (phone / portrait)
- Dial-Up 56k is centred instead of leaving the bottom half empty.
- Laundromat stacks a second row of machines in portrait.
- Desert Dunes no longer turn into spikes on tall screens.
- NGMI Runner is larger on phones and its title no longer overlaps the score.

## 1.2.0 (2026-11-25)

### Changed
- The catalogue doubles: **64 scenes**, 8 per category.
- Removed Night Diner and Medieval Village (judged dull by the owner).

### Added, with references to the Gary's Adventures universe
- After Hours: **Friday Deploy** (a CI pipeline at 16:59 on a Friday), **Jarvis Core** (Gary's
  assistant thinking), **Merge Conflict** (an endless git graph), **3AM Commit** (code that writes
  itself, Jarvis suggestions), **Anomaly Archive** (classified files from the Weird Web).
- Terminal & Hacker: **Whale Radar**, **Purity Scanner** (the Purity-o-Meter dial, Pure to SCAM),
  **Dial-Up 56k**, **Chat Room 1999**.
- Retro Screensavers: **Mystify**, **3D Text** (NGMI, WAGMI, GM...), **Under Construction**,
  **Pop-up Storm** (fake airdrops until Jarvis closes them all).
- Pixel Worlds: **NGMI Runner** (attract mode of the NGMI game, a $NGMI coin jumping rugs),
  **Degen Casino**, **Cyber Café 2003**, **Retro Racer**, **Pixel Harbor**.
- Space: **To the Moon**, **Orbit Station**, **Asteroid Drift**, **Lunar Base**.
- Nature: **Sakura Valley** (Japanese landscape with a great cherry tree, asked for by the owner),
  **Desert Dunes**, **Volcano**, **Waterfall**.
- Cozy: **Lava Lamp**, **Koi Pond**, **Bonsai Seasons**, **Laundromat**.
- Generative: **Reaction Diffusion**, **Spirograph**, **Murmuration**, **L-System Garden**.
- Gary still appears in Gary.exe only. All tickers, wallets and balances are fictional.

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
