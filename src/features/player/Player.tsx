import { useEffect, useRef, useState } from 'react'
import { audio } from '../../engine/audio/audio'
import { Stage } from '../../engine/stage'
import type { GlobalRender, SceneEntry } from '../../engine/types'
import { store, useStore } from '../../storage/store'
import { Clock } from './Clock'

export interface PlayerProps {
  entry: SceneEntry
  paused: boolean
  immersive: boolean
  fade: boolean
  onTogglePause: () => void
  onToggleImmersive: () => void
  onExitImmersive: () => void
  focusLabel: string | null
  reducedMotion: boolean
  seedKey: number
}

/**
 * The stage plus its overlays (clock, title, focus chip, pause). The canvas itself is created by
 * the engine; React only owns the frame around it.
 */
export function Player(p: PlayerProps) {
  const host = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Stage | null>(null)
  const display = useStore((s) => s.display)
  const access = useStore((s) => s.access)
  const sceneSettings = useStore((s) => s.sceneSettings[p.entry.meta.id])
  const [error, setError] = useState<string | null>(null)
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimer = useRef(0)
  const [shift, setShift] = useState({ x: 0, y: 0 })

  const global: GlobalRender = {
    density: display.density,
    intensity: display.intensity,
    showGary: display.showGary,
    noFlash: access.noFlash,
    reducedMotion: p.reducedMotion,
    quality: access.powerSaver ? 'low' : display.quality,
  }
  const fps = access.powerSaver ? 15 : display.fps

  // create the stage once
  useEffect(() => {
    const stage = new Stage(host.current!, {
      speed: display.speed * (p.reducedMotion ? 0.6 : 1),
      fpsCap: fps,
      global,
      onError: (e) => setError(e instanceof Error ? e.message : String(e)),
      onEvent: (e) => audio.event(e),
    })
    stageRef.current = stage
    ;(window as unknown as { __stage: Stage }).__stage = stage
    return () => stage.destroy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // load the scene when it changes (or when "restart" bumps the seed)
  useEffect(() => {
    setError(null)
    stageRef.current?.load(p.entry, store.sceneSettings(p.entry.meta.id))
  }, [p.entry, p.seedKey])

  useEffect(() => {
    stageRef.current?.setSettings(store.sceneSettings(p.entry.meta.id))
  }, [sceneSettings, p.entry.meta.id])

  useEffect(() => {
    stageRef.current?.setOptions({ speed: display.speed * (p.reducedMotion ? 0.6 : 1), fpsCap: fps, global })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [display.speed, fps, display.density, display.intensity, display.showGary, display.quality, access.noFlash, access.powerSaver, p.reducedMotion])

  useEffect(() => {
    if (p.paused) stageRef.current?.pause()
    else stageRef.current?.resume()
  }, [p.paused])

  // OLED care: nudge every overlay by a few pixels each minute
  useEffect(() => {
    if (!access.oledShift) {
      setShift({ x: 0, y: 0 })
      return
    }
    const id = window.setInterval(() => setShift({ x: Math.round(Math.random() * 16 - 8), y: Math.round(Math.random() * 12 - 6) }), 60_000)
    return () => clearInterval(id)
  }, [access.oledShift])

  const poke = () => {
    setControlsVisible(true)
    clearTimeout(hideTimer.current)
    if (display.autoHide || p.immersive) hideTimer.current = window.setTimeout(() => setControlsVisible(false), 2600)
  }
  useEffect(() => {
    poke()
    return () => clearTimeout(hideTimer.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.immersive, display.autoHide])

  const lastTap = useRef(0)
  const onTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 320) p.onToggleImmersive()
    lastTap.current = now
    poke()
  }

  const hideAll = p.immersive && !controlsVisible
  return (
    <div className={`player ${p.immersive ? 'is-immersive' : ''} ${hideAll ? 'hide-cursor' : ''} crt-${display.crt}`} onPointerMove={poke}>
      <div className="stage" ref={host} onClick={onTap} style={{ filter: display.brightness !== 1 ? `brightness(${display.brightness})` : undefined }} />
      <div className={`fade ${p.fade ? 'on' : ''}`} aria-hidden="true" />
      {display.crt !== 'off' && <div className="crt-overlay" aria-hidden="true" />}
      <div className="overlays" style={{ transform: `translate(${shift.x}px, ${shift.y}px)` }}>
        <Clock />
        {p.focusLabel && <div className="focus-chip">{p.focusLabel}</div>}
        <div className={`scene-title ${hideAll || (p.immersive && !controlsVisible) ? 'gone' : ''}`}>
          <strong>{p.entry.meta.name}</strong>
          <span>GARY&apos;S ADVENTURES / AFK</span>
        </div>
      </div>
      {error && (
        <div className="stage-error" role="alert">
          <p>This scene could not start on this device.</p>
          <small>{error}</small>
        </div>
      )}
      <div className={`player-buttons ${hideAll ? 'gone' : ''}`}>
        <button type="button" className="icon-btn" onClick={p.onTogglePause} aria-label={p.paused ? 'Play' : 'Pause'} title={p.paused ? 'Play (Space)' : 'Pause (Space)'}>
          {p.paused ? '▶' : '❚❚'}
        </button>
        <button type="button" className="icon-btn" onClick={p.onToggleImmersive} aria-label={p.immersive ? 'Exit immersive mode' : 'Immersive mode'} title="Immersive (F)">
          {p.immersive ? '✕' : '⛶'}
        </button>
      </div>
      {p.immersive && controlsVisible && (
        <button type="button" className="exit-hint" onClick={p.onExitImmersive}>
          Esc or double-tap to exit
        </button>
      )}
    </div>
  )
}
