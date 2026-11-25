import { describe, expect, it } from 'vitest'
import { checkImport, defaults, migrate, sanitize, SCHEMA_VERSION } from '../../src/storage/schema'

const valid = (id: string) => ['gary-exe', 'fireplace'].includes(id)
const scene = (_id: string, s: unknown) => (s && typeof s === 'object' ? (s as Record<string, number>) : {})

describe('settings schema', () => {
  it('returns defaults for garbage', () => {
    expect(sanitize(null, valid, scene)).toEqual(defaults())
    expect(sanitize('hello', valid, scene)).toEqual(defaults())
    expect(sanitize([1, 2], valid, scene)).toEqual(defaults())
  })
  it('clamps numbers and drops unknown values', () => {
    const s = sanitize({ v: 1, display: { speed: 99, fps: 144, quality: 'ultra', crt: 'strong' }, clock: { pos: 'nowhere', size: -3 } }, valid, scene)
    expect(s.display.speed).toBe(3)
    expect(s.display.fps).toBe(30)
    expect(s.display.quality).toBe('balanced')
    expect(s.display.crt).toBe('strong')
    expect(s.clock.pos).toBe('tr')
    expect(s.clock.size).toBe(0.5)
  })
  it('removes unknown scene ids everywhere', () => {
    const s = sanitize(
      { v: 1, lastScene: 'nope', favorites: ['fireplace', 'nope', 'fireplace', 3], sceneSettings: { nope: {}, 'gary-exe': { lamp: false } }, playlists: [{ name: 'x', items: [{ sceneId: 'nope', duration: 5 }, { sceneId: 'fireplace', duration: 999 }] }] },
      valid,
      scene,
    )
    expect(s.lastScene).toBe('gary-exe')
    expect(s.favorites).toEqual(['fireplace'])
    expect(Object.keys(s.sceneSettings)).toEqual(['gary-exe'])
    expect(s.playlists[0].items).toEqual([{ sceneId: 'fireplace', duration: 240 }])
  })
  it('never keeps functions or prototype tricks', () => {
    const evil = JSON.parse('{"v":1,"__proto__":{"polluted":true},"display":{"speed":"alert(1)"}}')
    const s = sanitize(evil, valid, scene)
    expect(({} as Record<string, unknown>).polluted).toBeUndefined()
    expect(s.display.speed).toBe(1)
  })
  it('migrates v0 prototype files', () => {
    const m = migrate({ favourites: ['fireplace'], settings: { speed: 2 } }) as Record<string, unknown>
    expect(m.v).toBe(1)
    expect(sanitize({ favourites: ['fireplace'], settings: { speed: 2 } }, valid, scene).favorites).toEqual(['fireplace'])
  })
  it('import check rejects foreign or newer files', () => {
    expect(checkImport({ v: 1 })).toMatch(/not exported/)
    expect(checkImport({ app: 'garys-afk', v: SCHEMA_VERSION + 1 })).toMatch(/newer/)
    expect(checkImport({ app: 'garys-afk', v: 1 })).toBeNull()
    expect(checkImport(42)).toMatch(/not a Gary/)
  })
  it('AFK target must be a known playlist', () => {
    const s = sanitize({ v: 1, afk: { target: 'pl-x' }, playlists: [{ id: 'pl-y', name: 'a', items: [] }] }, valid, scene)
    expect(s.afk.target).toBe('current')
  })
})
