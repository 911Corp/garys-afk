import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Btn } from '../components/ui'
import { audio } from '../engine/audio/audio'
import type { AmbienceId } from '../engine/types'
import { Catalog, type Filter } from '../features/catalog/Catalog'
import { FocusPanel, useFocus } from '../features/focus/Focus'
import { Player } from '../features/player/Player'
import { PlaylistsPanel } from '../features/playlists/Playlists'
import { AboutPanel, AccessPanel, AfkPanel, DataPanel, DisplayPanel, SceneSettingsPanel, SoundPanel } from '../features/settings/Panels'
import { SCENES, sceneById } from '../scenes/registry'
import { store, useStore } from '../storage/store'

interface Run {
  id: string
  order: number[]
  idx: number
  endsAt: number
}

function useSystemReducedMotion() {
  const [v, setV] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const f = () => setV(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  return v
}

export function App() {
  const [current, setCurrent] = useState(() => store.get().lastScene)
  const [paused, setPaused] = useState(false)
  const [immersive, setImmersive] = useState(false)
  const [fade, setFade] = useState(false)
  const [seedKey, setSeedKey] = useState(0)
  const [filter, setFilter] = useState<Filter>('all')
  const [run, setRun] = useState<Run | null>(null)
  const [afkActive, setAfkActive] = useState(false)
  const [focusOnStage, setFocusOnStage] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const favorites = useStore((s) => s.favorites)
  const audioPrefs = useStore((s) => s.audio)
  const afk = useStore((s) => s.afk)
  const access = useStore((s) => s.access)
  const playlists = useStore((s) => s.playlists)
  const systemReduced = useSystemReducedMotion()
  const reducedMotion = access.reducedMotion === 'on' || (access.reducedMotion === 'auto' && systemReduced)
  const focus = useFocus()
  const entry = sceneById(current) ?? SCENES[0]
  const [soundBlocked, setSoundBlocked] = useState(false)

  const say = (t: string) => {
    setToast(t)
    window.setTimeout(() => setToast((x) => (x === t ? null : x)), 2200)
  }

  /* ---------------- scene switching ---------------- */
  const go = useCallback((id: string, withFade = 0.6) => {
    if (!sceneById(id)) return
    if (withFade > 0 && !reducedMotionRef.current) {
      setFade(true)
      window.setTimeout(() => {
        setCurrent(id)
        setPaused(false)
        window.setTimeout(() => setFade(false), 60)
      }, (withFade * 1000) / 2)
    } else {
      setCurrent(id)
      setPaused(false)
    }
  }, [])
  const reducedMotionRef = useRef(reducedMotion)
  reducedMotionRef.current = reducedMotion

  useEffect(() => {
    store.set((s) => ({ ...s, lastScene: current, recents: [current, ...s.recents.filter((x) => x !== current)].slice(0, 12) }))
  }, [current])

  const pool = useMemo(() => {
    if (filter === 'favorites' && favorites.length) return favorites
    if (filter === 'all' || filter === 'favorites' || filter === 'recent') return SCENES.map((s) => s.meta.id)
    return SCENES.filter((s) => s.meta.category === filter).map((s) => s.meta.id)
  }, [filter, favorites])
  const step = (d: number) => {
    const list = pool.includes(current) ? pool : SCENES.map((s) => s.meta.id)
    const i = list.indexOf(current)
    go(list[(i + d + list.length) % list.length])
  }
  const random = () => {
    const list = pool.filter((x) => x !== current)
    if (list.length) go(list[Math.floor(Math.random() * list.length)])
  }
  const toggleFav = () => {
    const on = favorites.includes(current)
    store.set((s) => ({ ...s, favorites: on ? s.favorites.filter((x) => x !== current) : [...s.favorites, current] }))
    say(on ? 'Removed from favorites' : 'Added to favorites')
  }

  /* ---------------- immersive / fullscreen ---------------- */
  const enterImmersive = useCallback(() => {
    setImmersive(true)
    const el = document.documentElement
    if (document.fullscreenElement == null && el.requestFullscreen) el.requestFullscreen().catch(() => undefined) // falls back to the in-page immersive view
  }, [])
  const exitImmersive = useCallback(() => {
    setImmersive(false)
    setAfkActive(false)
    setRun((r) => (afkRunRef.current ? null : r))
    afkRunRef.current = false
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined)
  }, [])
  useEffect(() => {
    const f = () => {
      if (!document.fullscreenElement) setImmersive(false)
    }
    document.addEventListener('fullscreenchange', f)
    return () => document.removeEventListener('fullscreenchange', f)
  }, [])
  useEffect(() => {
    document.body.classList.toggle('is-immersive', immersive)
  }, [immersive])

  /* ---------------- playlists ---------------- */
  const playPlaylist = useCallback(
    (id: string) => {
      const p = store.get().playlists.find((x) => x.id === id)
      if (!p || !p.items.length) return
      const order = p.items.map((_, i) => i)
      if (p.shuffle) order.sort(() => Math.random() - 0.5)
      setRun({ id, order, idx: 0, endsAt: Date.now() + p.items[order[0]].duration * 60_000 })
      go(p.items[order[0]].sceneId, p.transition)
    },
    [go],
  )
  useEffect(() => {
    if (!run) return
    const t = window.setTimeout(
      () => {
        const p = store.get().playlists.find((x) => x.id === run.id)
        if (!p || !p.items.length) return setRun(null)
        let idx = run.idx + 1
        let order = run.order
        if (idx >= order.length) {
          if (!p.loop) return setRun(null)
          idx = 0
          if (p.shuffle) order = [...order].sort(() => Math.random() - 0.5)
        }
        const it = p.items[order[idx]] ?? p.items[0]
        setRun({ id: run.id, order, idx, endsAt: Date.now() + it.duration * 60_000 })
        go(it.sceneId, p.transition)
      },
      Math.max(0, run.endsAt - Date.now()),
    )
    return () => clearTimeout(t)
  }, [run, go])

  /* ---------------- AFK mode (in-app idle) ---------------- */
  const afkRunRef = useRef(false)
  const startAfk = useCallback(() => {
    const a = store.get().afk
    if (a.target === 'random') {
      const list = SCENES.map((s) => s.meta.id).filter((x) => x !== current)
      go(list[Math.floor(Math.random() * list.length)])
    } else if (a.target !== 'current') {
      playPlaylist(a.target)
      afkRunRef.current = true
    }
    setAfkActive(true)
    enterImmersive()
  }, [current, go, playPlaylist, enterImmersive])
  // last user activity lives outside the effect, so re-running it (scene change, settings) never resets the idle timer
  const lastActivity = useRef(Date.now())
  useEffect(() => {
    const activity = () => {
      lastActivity.current = Date.now()
      if (afkActive && store.get().afk.exitOnInput) exitImmersive()
    }
    const evs = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    evs.forEach((e) => window.addEventListener(e, activity, { passive: true }))
    // pointer moves count too, but ignore tiny jitter
    let lx = -1
    let ly = -1
    const move = (e: PointerEvent) => {
      if (Math.abs(e.clientX - lx) + Math.abs(e.clientY - ly) > 6) {
        lx = e.clientX
        ly = e.clientY
        activity()
      }
    }
    window.addEventListener('pointermove', move, { passive: true })
    const id = window.setInterval(() => {
      if (afk.enabled && !afkActive && !immersive && Date.now() - lastActivity.current > afk.delay * 60_000) startAfk()
    }, 2000)
    return () => {
      evs.forEach((e) => window.removeEventListener(e, activity))
      window.removeEventListener('pointermove', move)
      clearInterval(id)
    }
  }, [afk.enabled, afk.delay, afkActive, immersive, startAfk, exitImmersive])

  /* ---------------- sound ---------------- */
  const enableSound = useCallback(async () => {
    const ok = await audio.start()
    store.set((s) => ({ ...s, audio: { ...s.audio, enabled: ok } }))
    setSoundBlocked(!ok)
    if (!ok) say('Sound is not available in this browser')
  }, [])
  useEffect(() => {
    const levels: Partial<Record<AmbienceId, number>> = {}
    if (audioPrefs.enabled) {
      for (const [k, v] of Object.entries(audioPrefs.mix)) if (v) levels[k as AmbienceId] = v
      if (audioPrefs.sceneAmbience && entry.meta.audio[0]) levels[entry.meta.audio[0]] = Math.max(levels[entry.meta.audio[0]] ?? 0, audioPrefs.sceneLevel)
    }
    audio.setMaster(audioPrefs.master)
    audio.setLevels(levels)
    if (!audioPrefs.enabled) audio.suspend()
    else if (!audio.running) setSoundBlocked(true)
  }, [audioPrefs, entry])
  // sound was on last time: resume it on the first tap (browsers require a gesture)
  useEffect(() => {
    if (!audioPrefs.enabled || audio.running) return
    const f = () => {
      enableSound()
      window.removeEventListener('pointerdown', f)
      window.removeEventListener('keydown', f)
    }
    window.addEventListener('pointerdown', f)
    window.addEventListener('keydown', f)
    return () => {
      window.removeEventListener('pointerdown', f)
      window.removeEventListener('keydown', f)
    }
  }, [audioPrefs.enabled, enableSound])

  /* ---------------- keyboard ---------------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === ' ') {
        e.preventDefault()
        setPaused((p) => !p)
      } else if (k === 'arrowright') step(1)
      else if (k === 'arrowleft') step(-1)
      else if (k === 'r') random()
      else if (k === 'f') (immersive ? exitImmersive : enterImmersive)()
      else if (k === 'l') toggleFav()
      else if (k === 'm') (audioPrefs.enabled ? () => store.set((s) => ({ ...s, audio: { ...s.audio, enabled: false } })) : enableSound)()
      else if (k === 'escape' && immersive) exitImmersive()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const fav = favorites.includes(current)
  const runName = run ? playlists.find((p) => p.id === run.id)?.name : null
  return (
    <div className={`app ${immersive ? 'is-immersive' : ''}`}>
      <header className="top">
        <div className="brand">
          <h1>
            GARY&apos;S AFK<span className="cursor">_</span>
          </h1>
          <p>even degens need a break.</p>
        </div>
        <div className="top-actions">
          <Btn onClick={audioPrefs.enabled && !soundBlocked ? () => store.set((s) => ({ ...s, audio: { ...s.audio, enabled: false } })) : enableSound} active={audioPrefs.enabled && !soundBlocked} title="Sound (M)">
            ♪<span className="label"> {audioPrefs.enabled && !soundBlocked ? 'On' : 'Off'}</span>
          </Btn>
          <Btn onClick={enterImmersive} title="Fullscreen (F)">
            ⛶<span className="label"> Fullscreen</span>
          </Btn>
        </div>
      </header>

      <main className="layout">
        <div className="area-player">
          <Player
            entry={entry}
            paused={paused}
            immersive={immersive}
            fade={fade}
            seedKey={seedKey}
            onTogglePause={() => setPaused((p) => !p)}
            onToggleImmersive={() => (immersive ? exitImmersive() : enterImmersive())}
            onExitImmersive={exitImmersive}
            focusLabel={focusOnStage && (focus.st.running || focus.st.endsAt) ? focus.label : null}
            reducedMotion={reducedMotion}
          />
          <div className="controls" role="toolbar" aria-label="Player controls">
            <Btn onClick={() => step(-1)} title="Previous scene (←)">
              ‹
            </Btn>
            <Btn onClick={random} title="Random scene (R)">
              ⤨ Shuffle
            </Btn>
            <Btn onClick={toggleFav} active={fav} title="Favorite (L)">
              {fav ? '★' : '☆'} Favorite
            </Btn>
            <Btn onClick={() => step(1)} title="Next scene (→)">
              ›
            </Btn>
          </div>
          {runName && (
            <p className="now-playing">
              Playlist: <strong>{runName}</strong> · {run!.idx + 1}/{run!.order.length}{' '}
              <button type="button" className="linkish" onClick={() => setRun(null)}>
                stop
              </button>
            </p>
          )}
        </div>

        <div className="area-catalog">
          <Catalog current={current} onPick={(id) => go(id)} filter={filter} setFilter={setFilter} />
        </div>

        <div className="area-panels">
          <SceneSettingsPanel entry={entry} onRestart={() => setSeedKey((k) => k + 1)} />
          <PlaylistsPanel currentScene={current} playing={run?.id ?? null} onPlay={playPlaylist} onStop={() => setRun(null)} />
          <FocusPanel focus={focus} showOnStage={focusOnStage} setShowOnStage={setFocusOnStage} />
          <AfkPanel onStart={startAfk} />
          <DisplayPanel />
          <SoundPanel sceneAmbience={entry.meta.audio[0]} onEnable={enableSound} />
          <AccessPanel systemReduced={systemReduced} />
          <DataPanel />
          <AboutPanel />
        </div>
      </main>
      <footer className="foot">
        <span>Gary&apos;s Adventures · free, local, no account</span>
        <span>Not financial advice. Neither is Gary.</span>
      </footer>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  )
}
