import type { SceneEntry } from '../../engine/types'

const light = (def: string) => ({
  key: 'light',
  label: 'Light',
  type: 'select' as const,
  options: [
    { value: 'day', label: 'Day' },
    { value: 'sunset', label: 'Sunset' },
    { value: 'night', label: 'Night' },
  ],
  default: def,
})

export const natureScenes: SceneEntry[] = [
  {
    meta: {
      id: 'ocean-waves',
      heavy: true,
      name: 'Ocean Waves',
      category: 'nature',
      description: 'Open sea from the beach: rolling swell in perspective, a path of sun glints, waves rushing up the sand.',
      version: '1.0.0',
      render: 'pixel',
      complexity: 2,
      audio: ['ocean', 'wind'],
      gary: false,
      tags: ['sea', 'beach', 'waves', 'sun'],
    },
    settings: [
      { key: 'swell', label: 'Wave height', type: 'range', min: 0.2, max: 2, step: 0.1, default: 1 },
      { key: 'wind', label: 'Wind chop', type: 'range', min: 0, max: 2, step: 0.1, default: 0.8 },
      light('sunset'),
    ],
    load: () => import('./oceanWaves'),
  },
  {
    meta: {
      id: 'forest-life',
      name: 'Forest Life',
      category: 'nature',
      description: 'A deep pixel forest with light shafts, drifting pollen or fireflies, birds, and a deer that sometimes walks by.',
      version: '1.0.0',
      render: 'pixel',
      complexity: 1,
      audio: ['wind', 'night'],
      gary: false,
      tags: ['trees', 'animals', 'light', 'calm'],
    },
    settings: [
      {
        key: 'time',
        label: 'Time of day',
        type: 'select',
        options: [
          { value: 'day', label: 'Day' },
          { value: 'dusk', label: 'Dusk' },
          { value: 'night', label: 'Night (fireflies)' },
        ],
        default: 'day',
      },
      { key: 'particles', label: 'Pollen / fireflies', type: 'range', min: 0, max: 3, step: 0.1, default: 1 },
      { key: 'wind', label: 'Wind', type: 'range', min: 0, max: 2, step: 0.1, default: 0.6 },
      { key: 'wildlife', label: 'Wildlife', type: 'toggle', default: true },
    ],
    load: () => import('./forestLife'),
  },
  {
    meta: {
      id: 'northern-lights',
      heavy: true,
      name: 'Northern Lights',
      category: 'nature',
      description: 'Curtains of aurora rippling over snowy peaks, mirrored in a still lake.',
      version: '1.0.0',
      render: 'pixel',
      complexity: 2,
      audio: ['wind', 'night'],
      gary: false,
      tags: ['aurora', 'night', 'stars', 'lake'],
    },
    settings: [
      { key: 'intensity', label: 'Intensity', type: 'range', min: 0.2, max: 1.8, step: 0.1, default: 1 },
      {
        key: 'colors',
        label: 'Colours',
        type: 'select',
        options: [
          { value: 'green', label: 'Green' },
          { value: 'violet', label: 'Green and violet' },
          { value: 'pink', label: 'Pink' },
        ],
        default: 'violet',
      },
      { key: 'activity', label: 'Activity', type: 'range', min: 0.2, max: 3, step: 0.1, default: 1 },
      { key: 'reflection', label: 'Lake reflection', type: 'toggle', default: true },
    ],
    load: () => import('./northernLights'),
  },
  {
    meta: {
      id: 'thunderstorm',
      heavy: true,
      name: 'Thunderstorm',
      category: 'nature',
      description: 'A storm over the fields: rolling clouds, slanted rain, branching lightning. Has a no-flash mode.',
      version: '1.0.0',
      render: 'pixel',
      complexity: 2,
      audio: ['storm', 'rain'],
      gary: false,
      flashes: true,
      tags: ['storm', 'rain', 'lightning'],
    },
    settings: [
      { key: 'rain', label: 'Rain', type: 'range', min: 0.2, max: 2.5, step: 0.1, default: 1 },
      { key: 'lightning', label: 'Lightning frequency', type: 'range', min: 0, max: 3, step: 0.1, default: 1 },
      { key: 'wind', label: 'Wind', type: 'range', min: -1.5, max: 1.5, step: 0.1, default: 0.5 },
      { key: 'noflash', label: 'No flash', type: 'toggle', default: false },
    ],
    load: () => import('./thunderstorm'),
  },
]
