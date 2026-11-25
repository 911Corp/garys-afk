import { useEffect, useRef } from 'react'
import { Stage } from '../engine/stage'
import { defaultSettings } from '../engine/types'
import { sceneById } from '../scenes/registry'

/**
 * Bare full-window render of one scene. Used by the thumbnail script and the visual tests:
 * #/render/<id>?q=high&gary=1&reduced=0&seed=7
 */
export function RenderOnly({ id }: { id: string }) {
  const host = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const entry = sceneById(id)
    if (!entry || !host.current) return
    const q = new URLSearchParams(location.hash.split('?')[1] ?? '')
    const overrides = JSON.parse(q.get('s') ?? '{}') as Record<string, never>
    const stage = new Stage(host.current, {
      speed: Number(q.get('speed') ?? 1),
      fpsCap: 60,
      global: {
        density: 1,
        intensity: 1,
        showGary: q.get('gary') !== '0',
        noFlash: q.get('noflash') === '1',
        reducedMotion: q.get('reduced') === '1',
        quality: (q.get('q') as 'low' | 'balanced' | 'high') ?? 'high',
        retro: q.get('retro') === '1',
      },
      onError: (e) => {
        document.title = 'ERROR ' + String(e)
        console.error(e)
      },
    })
    ;(window as unknown as { __stage: Stage }).__stage = stage
    stage.load(entry, { ...defaultSettings(entry.settings), ...overrides }, Number(q.get('seed') ?? 7))
    return () => stage.destroy()
  }, [id])
  return <div ref={host} style={{ position: 'fixed', inset: 0, background: '#000' }} />
}
