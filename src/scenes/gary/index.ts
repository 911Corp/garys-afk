import type { SceneEntry } from '../../engine/types'

/** After Hours: night-time interiors. Gary appears only in Gary.exe, asleep, without speech bubbles. */
export const garyScenes: SceneEntry[] = [
  {
    meta: {
      id: 'gary-exe',
      name: 'Gary.exe',
      category: 'gary',
      description: 'Gary fell asleep at his desk. Jarvis keeps the build running on the screen.',
      version: '1.1.0',
      render: 'pixel',
      pixelScale: 1.5,
      complexity: 1,
      audio: ['computer', 'night'],
      gary: true,
      tags: ['gary', 'desk', 'night', 'jarvis', 'sleep', 'lcd'],
    },
    settings: [
      {
        key: 'palette',
        label: 'Palette',
        type: 'select',
        options: [
          { value: 'lcd', label: 'LCD (original)' },
          { value: 'night', label: 'Backlight off' },
          { value: 'paper', label: 'Paper' },
        ],
        default: 'lcd',
      },
      { key: 'boil', label: 'Hand-drawn line boil', type: 'toggle', default: true },
      { key: 'jarvis', label: 'Jarvis activity', type: 'range', min: 0.2, max: 3, step: 0.1, default: 1 },
      { key: 'lamp', label: 'Screen glow', type: 'toggle', default: true },
    ],
    load: () => import('./garyExe'),
  },
  {
    meta: {
      id: 'the-trenches',
      name: 'The Trenches',
      category: 'gary',
      description: 'An empty trading desk at night. Three monitors of made-up markets, red and green candles, fake alerts. Simulated data only.',
      version: '1.1.0',
      render: 'pixel',
      complexity: 1,
      audio: ['computer'],
      gary: false,
      tags: ['trading', 'charts', 'monitors', 'night', 'simulated'],
    },
    settings: [
      { key: 'chaos', label: 'Market speed', type: 'range', min: 0.2, max: 3, step: 0.1, default: 1 },
      { key: 'alerts', label: 'Fake alerts', type: 'toggle', default: true },
    ],
    load: () => import('./trenches'),
  },
  {
    meta: {
      id: 'night-diner',
      name: 'Night Diner',
      category: 'gary',
      description: 'A retro diner after midnight: neon in the window, rain and headlights outside, coffee steaming on the counter.',
      version: '1.0.0',
      render: 'pixel',
      complexity: 1,
      audio: ['rain', 'brown'],
      gary: false,
      tags: ['diner', 'neon', 'rain', 'coffee', 'night'],
    },
    settings: [
      { key: 'rain', label: 'Rain', type: 'range', min: 0, max: 2, step: 0.1, default: 1 },
      { key: 'traffic', label: 'Traffic', type: 'range', min: 0, max: 3, step: 0.1, default: 1 },
    ],
    load: () => import('./nightDiner'),
  },
  {
    meta: {
      id: 'lofi-room',
      name: 'Lo-fi Room',
      category: 'gary',
      description: 'A cosy room at night: rain on the window, a record spinning, fairy lights, a cat asleep on the rug.',
      version: '1.0.0',
      render: 'pixel',
      complexity: 1,
      audio: ['rain', 'pink'],
      gary: false,
      tags: ['cosy', 'room', 'cat', 'vinyl', 'rain', 'lofi'],
    },
    settings: [
      { key: 'rain', label: 'Rain on the window', type: 'range', min: 0, max: 2, step: 0.1, default: 1 },
      { key: 'music', label: 'Record playing', type: 'toggle', default: true },
    ],
    load: () => import('./lofiRoom'),
  },
]
