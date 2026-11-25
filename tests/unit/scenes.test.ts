import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { defaultSettings, sanitizeSettings } from '../../src/engine/types'
import { CATEGORIES, SCENES } from '../../src/scenes/registry'

describe('scene catalogue', () => {
  it('has 75 scenes, at least 8 per category, unique stable ids', () => {
    expect(SCENES).toHaveLength(75)
    expect(new Set(SCENES.map((s) => s.meta.id)).size).toBe(75)
    for (const c of CATEGORIES) expect(SCENES.filter((s) => s.meta.category === c.id).length).toBeGreaterThanOrEqual(8)
  })
  it('every scene has a real thumbnail, a description, an ambience and valid defaults', () => {
    for (const s of SCENES) {
      expect(existsSync(`public/assets/thumbnails/${s.meta.id}.jpg`), s.meta.id).toBe(true)
      expect(s.meta.description.length).toBeGreaterThan(20)
      expect(s.meta.audio.length).toBeGreaterThan(0)
      const d = defaultSettings(s.settings)
      expect(sanitizeSettings(s.settings, d)).toEqual(d)
      for (const def of s.settings) {
        if (def.type === 'range') expect(def.default >= def.min && def.default <= def.max, `${s.meta.id}.${def.key}`).toBe(true)
        if (def.type === 'select') expect(def.options.some((o) => o.value === def.default), `${s.meta.id}.${def.key}`).toBe(true)
      }
      expect(new Set(s.settings.map((d) => d.key)).size).toBe(s.settings.length)
    }
  })
  it('Gary appears in one scene only: Gary.exe, asleep', () => {
    expect(SCENES.filter((s) => s.meta.gary).map((s) => s.meta.id)).toEqual(['gary-exe'])
  })
  it('the two scenes judged dull in v1.1 are gone', () => {
    const ids = SCENES.map((s) => s.meta.id)
    expect(ids).not.toContain('night-diner')
    expect(ids).not.toContain('medieval-village')
    expect(ids).toContain('sakura-valley')
  })
  it('scenes that can flash say so', () => {
    expect(SCENES.filter((s) => s.meta.flashes).map((s) => s.meta.id).sort()).toEqual(['rainy-night', 'thunderstorm'])
  })
})
