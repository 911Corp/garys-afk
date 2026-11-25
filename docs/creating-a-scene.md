# Creating a new scene

A scene is one file plus one entry in its category's `index.ts`. The core app never changes.

## 1. The module

```ts
// src/scenes/cozy/lavaLamp.ts
import { PixelScene } from '../../engine/base'
import { PALETTES } from '../../engine/pixel'
import type { SceneContext } from '../../engine/types'

export function create(ctx: SceneContext) {
  return new LavaLamp(ctx)
}

class LavaLamp extends PixelScene {
  blobs: { y: number; v: number }[] = []

  constructor(ctx: SceneContext) {
    super(ctx)
    this.configure()
  }
  palette() {
    return PALETTES.warm16 // or your own list of 4 to 16 colours
  }
  dither() {
    return 0.5 // 0 = flat colours, 1 = strong ordered dithering
  }
  configure() {
    // called after any settings change (this.s) or global change (this.g)
    this.blobs = Array.from({ length: Math.round(this.num('blobs')) }, () => ({ y: this.r() * this.h, v: this.r.range(4, 9) }))
  }
  layout() {
    // called after a resize: this.w, this.h are the new buffer size
  }
  step(dt: number) {
    // dt is in seconds, already scaled by the global speed. this.t is the total time.
    for (const b of this.blobs) b.y = (b.y - b.v * dt * this.u + this.h) % this.h
  }
  draw() {
    const { c, w, h, u } = this
    c.fillStyle = '#24120a'
    c.fillRect(0, 0, w, h)
    c.fillStyle = '#f08a2a'
    for (const b of this.blobs) c.fillRect(w / 2 - 8 * u, b.y, 16 * u, 10 * u)
  }
  dispose() {
    // free anything that is not garbage-collected on its own (timers, listeners)
  }
}
```

Rules of the house:

- Draw in units: `this.u` is one pixel of a 180-pixel screen; multiply sizes by it. The same code
  then works in smooth HD and in Retro pixels mode.
- If your scene computes every pixel (noise, fractals, ray casting), set `heavy: true` in its meta.
- Use `this.r` (seeded rng) instead of `Math.random()`, so thumbnails are reproducible.
- Honour `this.g.reducedMotion` (calmer motion) and `this.g.noFlash` (no full-screen flashes).
- Use `this.density` for element counts and `this.g.intensity` for optional glow.
- Gary: the owner decided he appears only in Gary.exe. Do not add him to other scenes without asking.
  If he is ever used again, only through `src/engine/gary/kit.ts` and `draw.ts`, never a new stickman.

## 2. The entry

```ts
// in src/scenes/cozy/index.ts
{
  meta: {
    id: 'lava-lamp',              // stable forever: used in storage, playlists, URLs
    name: 'Lava Lamp',
    category: 'cozy',
    description: 'Warm wax rising and falling in a glass lamp.',
    version: '1.0.0',
    render: 'pixel',
    pixelScale: 1,                // 1.25 to 1.5 if the scene shows text
    complexity: 1,
    audio: ['brown'],             // first one plays as the scene ambience
    gary: false,
    tags: ['warm', 'retro'],
  },
  settings: [
    { key: 'blobs', label: 'Blobs', type: 'range', min: 1, max: 12, step: 1, default: 5 },
  ],
  load: () => import('./lavaLamp'),
},
```

Every setting must change the picture. Ranges, selects and toggles are rendered automatically
in the Scene settings panel, saved per scene, sanitised on load and import.

## 3. Thumbnail and checks

```bash
npx vite --base / &           # dev server on 5173
node scripts/shot.mjs http://localhost:5173/ /tmp/shots lava-lamp 5 1280 720   # look at it
npm run thumbs                # regenerate thumbnails, including the new one
npm test                      # the catalogue test checks ids, thumbnails and defaults
npm run build && npm run test:e2e
```

The catalogue unit test currently expects exactly 32 scenes and 4 per category: update it when you
add a pack.

## The diversity rule

A new scene must be recognisable without its title: its own composition, its own motion, its own
logic. Colour, speed, weather or density variants belong in settings, not in new scenes.
