import { useCallback, useEffect, useRef, useState } from 'react'
import { Btn, Panel, Range, Toggle } from '../../components/ui'
import { audio } from '../../engine/audio/audio'
import { store, useStore } from '../../storage/store'

export type Phase = 'work' | 'short' | 'long'
export interface FocusState {
  running: boolean
  phase: Phase
  round: number
  /** ms left when paused, or end timestamp when running */
  left: number
  endsAt: number
}

const LABEL: Record<Phase, string> = { work: 'Focus', short: 'Break', long: 'Long break' }

/** Pomodoro timer. Runs on timestamps, so it stays right even if the tab sleeps. */
export function useFocus() {
  const cfg = useStore((s) => s.focus)
  const [st, setSt] = useState<FocusState>({ running: false, phase: 'work', round: 1, left: cfg.work * 60_000, endsAt: 0 })
  const [, tick] = useState(0)
  const cfgRef = useRef(cfg)
  cfgRef.current = cfg

  const durationOf = (p: Phase) => (p === 'work' ? cfgRef.current.work : p === 'short' ? cfgRef.current.short : cfgRef.current.long) * 60_000

  const advance = useCallback((s: FocusState): FocusState => {
    const c = cfgRef.current
    let phase: Phase
    let round = s.round
    if (s.phase === 'work') phase = s.round >= c.rounds ? 'long' : 'short'
    else {
      phase = 'work'
      round = s.phase === 'long' ? 1 : s.round + 1
    }
    const d = durationOf(phase)
    return { running: s.running, phase, round, left: d, endsAt: Date.now() + d }
  }, [])

  useEffect(() => {
    if (!st.running) return
    const id = window.setInterval(() => {
      if (Date.now() >= st.endsAt) {
        const next = advance(st)
        if (cfgRef.current.chime) audio.chime()
        if (cfgRef.current.notify && 'Notification' in window && Notification.permission === 'granted') {
          try {
            new Notification("Gary's AFK", { body: next.phase === 'work' ? 'Break over. Back to it.' : 'Time for a break. Even degens need one.' })
          } catch {
            /* some browsers only allow notifications from a service worker */
          }
        }
        setSt(next)
      } else tick((n) => n + 1)
    }, 500)
    return () => clearInterval(id)
  }, [st, advance])

  // reflect duration edits while idle
  useEffect(() => {
    if (!st.running && st.left === durationOf(st.phase)) return
    if (!st.running && st.endsAt === 0) setSt((s) => ({ ...s, left: durationOf(s.phase) }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.work, cfg.short, cfg.long])

  const remaining = st.running ? Math.max(0, st.endsAt - Date.now()) : st.left
  const api = {
    st,
    remaining,
    label: `${LABEL[st.phase]} ${fmt(remaining)}`,
    start: () => setSt((s) => ({ ...s, running: true, endsAt: Date.now() + s.left })),
    pause: () => setSt((s) => ({ ...s, running: false, left: Math.max(0, s.endsAt - Date.now()) })),
    reset: () => setSt({ running: false, phase: 'work', round: 1, left: durationOf('work'), endsAt: 0 }),
    skip: () => setSt((s) => advance(s)),
  }
  return api
}

export const fmt = (ms: number) => {
  const s = Math.ceil(ms / 1000)
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function FocusPanel({ focus, showOnStage, setShowOnStage }: { focus: ReturnType<typeof useFocus>; showOnStage: boolean; setShowOnStage: (v: boolean) => void }) {
  const cfg = useStore((s) => s.focus)
  const setF = (patch: Partial<typeof cfg>) => store.set((s) => ({ ...s, focus: { ...s.focus, ...patch } }))
  return (
    <Panel title="Focus timer">
      <div className="focus-readout" aria-live="polite">
        <span>{LABEL[focus.st.phase]}</span>
        <strong>{fmt(focus.remaining)}</strong>
        <small>
          round {focus.st.round}/{cfg.rounds}
        </small>
      </div>
      <div className="row">
        {focus.st.running ? <Btn onClick={focus.pause}>❚❚ Pause</Btn> : <Btn onClick={focus.start}>▶ Start</Btn>}
        <Btn onClick={focus.skip}>Skip</Btn>
        <Btn onClick={focus.reset}>Reset</Btn>
      </div>
      <Toggle label="Show on the scene" value={showOnStage} onChange={setShowOnStage} />
      <Range label="Focus" value={cfg.work} min={5} max={90} step={5} onChange={(v) => setF({ work: v })} format={(v) => `${v} min`} />
      <Range label="Short break" value={cfg.short} min={1} max={30} step={1} onChange={(v) => setF({ short: v })} format={(v) => `${v} min`} />
      <Range label="Long break" value={cfg.long} min={5} max={60} step={5} onChange={(v) => setF({ long: v })} format={(v) => `${v} min`} />
      <Range label="Rounds before a long break" value={cfg.rounds} min={1} max={8} step={1} onChange={(v) => setF({ rounds: v })} />
      <Toggle label="Chime" hint="Needs sound on" value={cfg.chime} onChange={(v) => setF({ chime: v })} />
      <Toggle
        label="Notifications"
        hint="Your browser will ask first"
        value={cfg.notify}
        onChange={async (v) => {
          if (v && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission().catch(() => 'denied')
          setF({ notify: v && 'Notification' in window && Notification.permission === 'granted' })
        }}
      />
    </Panel>
  )
}
