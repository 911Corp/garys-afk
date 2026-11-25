import type { CategoryId, SceneEntry } from '../engine/types'
import { garyScenes } from './gary'
import { terminalScenes } from './terminal'
import { cozyScenes } from './cozy'
import { spaceScenes } from './space'
import { retroScenes } from './retro'
import { natureScenes } from './nature'
import { pixelScenes } from './pixel'
import { generativeScenes } from './generative'

export const CATEGORIES: { id: CategoryId; name: string; short: string }[] = [
  { id: 'gary', name: "Gary's Universe", short: 'Gary' },
  { id: 'terminal', name: 'Terminal & Hacker', short: 'Terminal' },
  { id: 'cozy', name: 'Cozy & Relax', short: 'Cozy' },
  { id: 'space', name: 'Space & Cosmos', short: 'Space' },
  { id: 'retro', name: 'Retro Screensavers', short: 'Retro' },
  { id: 'nature', name: 'Nature & Landscapes', short: 'Nature' },
  { id: 'pixel', name: 'Pixel Worlds', short: 'Pixel' },
  { id: 'generative', name: 'Generative Art', short: 'Generative' },
]

export const SCENES: SceneEntry[] = [...garyScenes, ...terminalScenes, ...cozyScenes, ...spaceScenes, ...retroScenes, ...natureScenes, ...pixelScenes, ...generativeScenes]

export const sceneById = (id: string) => SCENES.find((s) => s.meta.id === id)
