import { useRef, useState } from 'react'
import { Btn, ConfirmBtn, Panel, Range, Select, Toggle } from '../../components/ui'
import type { SceneEntry, SettingValue } from '../../engine/types'
import { AMBIENCES, type State } from '../../storage/schema'
import { store, useStore } from '../../storage/store'

const set = <K extends keyof State>(key: K, patch: Partial<State[K]>) => store.set((s) => ({ ...s, [key]: { ...(s[key] as object), ...patch } }))

export function SceneSettingsPanel({ entry, onRestart }: { entry: SceneEntry; onRestart: () => void }) {
  useStore((s) => s.sceneSettings[entry.meta.id])
  const values = store.sceneSettings(entry.meta.id)
  const update = (k: string, v: SettingValue) => store.set((s) => ({ ...s, sceneSettings: { ...s.sceneSettings, [entry.meta.id]: { ...values, [k]: v } } }))
  return (
    <Panel title="Scene settings" open>
      <p className="muted">{entry.meta.description}</p>
      {entry.settings.map((d) =>
        d.type === 'range' ? (
          <Range key={d.key} label={d.label} value={Number(values[d.key])} min={d.min} max={d.max} step={d.step} onChange={(v) => update(d.key, v)} format={d.unit ? (v) => `${v} ${d.unit}` : undefined} />
        ) : d.type === 'select' ? (
          <Select key={d.key} label={d.label} value={String(values[d.key])} options={d.options} onChange={(v) => update(d.key, v)} />
        ) : (
          <Toggle key={d.key} label={d.label} value={Boolean(values[d.key])} onChange={(v) => update(d.key, v)} />
        ),
      )}
      <div className="row">
        <Btn onClick={() => store.set((s) => ({ ...s, sceneSettings: Object.fromEntries(Object.entries(s.sceneSettings).filter(([k]) => k !== entry.meta.id)) }))}>Reset scene</Btn>
        <Btn onClick={onRestart}>Restart scene</Btn>
      </div>
    </Panel>
  )
}

export function DisplayPanel() {
  const d = useStore((s) => s.display)
  const c = useStore((s) => s.clock)
  return (
    <Panel title="Display & clock">
      <Range label="Animation speed" value={d.speed} min={0.25} max={3} step={0.05} onChange={(v) => set('display', { speed: v })} format={(v) => `${v.toFixed(2)}×`} />
      <Range label="Brightness" value={d.brightness} min={0.2} max={1.4} step={0.05} onChange={(v) => set('display', { brightness: v })} format={(v) => `${Math.round(v * 100)}%`} />
      <Range label="Effects intensity" value={d.intensity} min={0} max={1.5} step={0.05} onChange={(v) => set('display', { intensity: v })} format={(v) => `${Math.round(v * 100)}%`} />
      <Range label="Element density" value={d.density} min={0.25} max={2} step={0.05} onChange={(v) => set('display', { density: v })} format={(v) => `${Math.round(v * 100)}%`} />
      <Select
        label="Pixel size"
        value={d.quality}
        options={[
          { value: 'low', label: 'Chunky (fastest)' },
          { value: 'balanced', label: 'Balanced' },
          { value: 'high', label: 'Fine' },
        ]}
        onChange={(v) => set('display', { quality: v })}
      />
      <Select
        label="Frame rate cap"
        value={d.fps}
        options={[
          { value: 15, label: '15 FPS' },
          { value: 30, label: '30 FPS' },
          { value: 60, label: '60 FPS' },
        ]}
        onChange={(v) => set('display', { fps: v })}
      />
      <Select
        label="CRT effect"
        value={d.crt}
        options={[
          { value: 'off', label: 'Off' },
          { value: 'subtle', label: 'Subtle' },
          { value: 'strong', label: 'Strong' },
        ]}
        onChange={(v) => set('display', { crt: v })}
      />
      <Toggle label="Show Gary" hint="In scenes where he can appear" value={d.showGary} onChange={(v) => set('display', { showGary: v })} />
      <Toggle label="Auto-hide controls" value={d.autoHide} onChange={(v) => set('display', { autoHide: v })} />
      <hr />
      <Toggle label="Clock" value={c.show} onChange={(v) => set('clock', { show: v })} />
      <Toggle label="Date" value={c.date} onChange={(v) => set('clock', { date: v })} />
      <Toggle label="24-hour format" value={c.h24} onChange={(v) => set('clock', { h24: v })} />
      <Select
        label="Clock position"
        value={c.pos}
        options={[
          { value: 'tl', label: 'Top left' },
          { value: 'tr', label: 'Top right' },
          { value: 'center', label: 'Centre' },
          { value: 'bl', label: 'Bottom left' },
          { value: 'br', label: 'Bottom right' },
        ]}
        onChange={(v) => set('clock', { pos: v })}
      />
      <Range label="Clock size" value={c.size} min={0.5} max={3} step={0.1} onChange={(v) => set('clock', { size: v })} format={(v) => `${v.toFixed(1)}×`} />
      <Range label="Clock opacity" value={c.opacity} min={0.1} max={1} step={0.05} onChange={(v) => set('clock', { opacity: v })} format={(v) => `${Math.round(v * 100)}%`} />
      <div className="row">
        <Btn onClick={() => store.set((s) => ({ ...s, display: { speed: 1, brightness: 1, intensity: 1, density: 1, quality: 'balanced', fps: 30, crt: 'off', showGary: true, autoHide: true } }))}>Reset display</Btn>
      </div>
    </Panel>
  )
}

export function SoundPanel({ sceneAmbience, onEnable }: { sceneAmbience: string; onEnable: () => void }) {
  const a = useStore((s) => s.audio)
  const name = AMBIENCES.find((x) => x.id === sceneAmbience)?.name ?? sceneAmbience
  return (
    <Panel title="Sound">
      <Toggle label="Sound on" hint="Everything is synthesised live. Your browser needs a tap first." value={a.enabled} onChange={(v) => (v ? onEnable() : set('audio', { enabled: false }))} />
      <Range label="Master volume" value={a.master} min={0} max={1} step={0.01} onChange={(v) => set('audio', { master: v })} format={(v) => `${Math.round(v * 100)}%`} />
      <Toggle label={`Scene ambience (${name})`} value={a.sceneAmbience} onChange={(v) => set('audio', { sceneAmbience: v })} />
      <Range label="Scene ambience volume" value={a.sceneLevel} min={0} max={1} step={0.01} onChange={(v) => set('audio', { sceneLevel: v })} format={(v) => `${Math.round(v * 100)}%`} />
      <p className="muted">Mix extra layers on top of any scene:</p>
      {AMBIENCES.map((x) => (
        <Range key={x.id} label={x.name} value={a.mix[x.id] ?? 0} min={0} max={1} step={0.01} onChange={(v) => store.set((s) => ({ ...s, audio: { ...s.audio, mix: { ...s.audio.mix, [x.id]: v } } }))} format={(v) => (v ? `${Math.round(v * 100)}%` : 'off')} />
      ))}
      <div className="row">
        <Btn onClick={() => set('audio', { mix: {} })}>Clear mix</Btn>
      </div>
    </Panel>
  )
}

export function AfkPanel({ onStart }: { onStart: () => void }) {
  const a = useStore((s) => s.afk)
  const playlists = useStore((s) => s.playlists)
  return (
    <Panel title="AFK mode">
      <p className="muted">After a while without touching Gary&apos;s AFK, the player goes immersive on its own. It only watches this tab: it is not a system screensaver.</p>
      <Toggle label="Start when idle" value={a.enabled} onChange={(v) => set('afk', { enabled: v })} />
      <Range label="Idle delay" value={a.delay} min={1} max={60} step={1} onChange={(v) => set('afk', { delay: v })} format={(v) => `${v} min`} />
      <Select
        label="Play"
        value={a.target}
        options={[{ value: 'current', label: 'Current scene' }, { value: 'random', label: 'A random scene' }, ...playlists.map((p) => ({ value: p.id, label: `Playlist: ${p.name}` }))]}
        onChange={(v) => set('afk', { target: v })}
      />
      <Toggle label="Exit on mouse or key" hint="Off: only Esc or a double-tap exits" value={a.exitOnInput} onChange={(v) => set('afk', { exitOnInput: v })} />
      <div className="row">
        <Btn onClick={onStart}>Go AFK now</Btn>
      </div>
    </Panel>
  )
}

export function AccessPanel({ systemReduced }: { systemReduced: boolean }) {
  const a = useStore((s) => s.access)
  return (
    <Panel title="Accessibility & screen care">
      <Select
        label={`Reduce motion (system: ${systemReduced ? 'on' : 'off'})`}
        value={a.reducedMotion}
        options={[
          { value: 'auto', label: 'Follow system' },
          { value: 'on', label: 'Always' },
          { value: 'off', label: 'Never' },
        ]}
        onChange={(v) => set('access', { reducedMotion: v })}
      />
      <Toggle label="No flashes" hint="Lightning and screen flashes stay dim" value={a.noFlash} onChange={(v) => set('access', { noFlash: v })} />
      <Toggle label="OLED care" hint="Moves the clock and labels a little every minute. Helps reduce the risk of burn-in, no guarantee." value={a.oledShift} onChange={(v) => set('access', { oledShift: v })} />
      <Toggle label="Power saver" hint="15 FPS and chunky pixels" value={a.powerSaver} onChange={(v) => set('access', { powerSaver: v })} />
      <p className="muted">Keys: Space pause · ← → previous/next · R random · F immersive · L favorite · M sound · Esc exit</p>
    </Panel>
  )
}

export function DataPanel() {
  const file = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const download = () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `garys-afk-settings-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
    setMsg('Exported. If no file appears, your browser blocked the download: use Copy instead.')
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(store.exportJSON())
      setMsg('Settings copied to the clipboard.')
    } catch {
      setMsg('Copy was blocked by the browser.')
    }
  }
  return (
    <Panel title="Your data">
      <p className="muted">Everything stays in this browser. No account, no tracking, no server. Reset all erases favorites, playlists and settings for good.</p>
      <div className="row">
        <Btn onClick={download}>Export JSON</Btn>
        <Btn onClick={copy}>Copy JSON</Btn>
        <Btn onClick={() => file.current?.click()}>Import JSON</Btn>
        <ConfirmBtn
          confirmLabel="Sure? Click again"
          onConfirm={() => {
            store.reset()
            setMsg('Everything was reset.')
          }}
        >
          Reset all
        </ConfirmBtn>
      </div>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          if (f.size > 1_000_000) return setMsg('That file is too big to be a settings file.')
          const err = store.importJSON(await f.text())
          setMsg(err ?? 'Imported.')
        }}
      />
      {msg && (
        <p className="note" role="status">
          {msg}
        </p>
      )}
    </Panel>
  )
}

export function AboutPanel() {
  return (
    <Panel title="About">
      <p>
        <strong>Gary&apos;s AFK</strong> v{__APP_VERSION__}. A collection of animated worlds, retro screensavers and ambient experiences for people who spend too much time online. Pick a scene, customize your
        atmosphere, go fullscreen and take a break.
      </p>
      <p>
        Part of <strong>Gary&apos;s Adventures</strong> by{' '}
        <a href="https://x.com/Gary_NGMI" target="_blank" rel="noopener noreferrer">
          @Gary_NGMI
        </a>
        . Gary not gonna make it. Jarvis keeps the lights on.
      </p>
      <ul className="links">
        <li>
          <a href="https://911corp.github.io/garys-free-stack/" target="_blank" rel="noopener noreferrer">
            Gary&apos;s Free Stack
          </a>
        </li>
        <li>
          <a href="https://911corp.github.io/garys-repo-rescue/" target="_blank" rel="noopener noreferrer">
            Gary&apos;s Repo Rescue
          </a>
        </li>
      </ul>
      <p className="muted">Free, no ads, no account. Code under the MIT licence. Fonts: VT323, Press Start 2P, IBM Plex (SIL Open Font Licence). All scenes and sounds are generated by code. Trading data in The Trenches is made up. Not financial advice. Neither is Gary.</p>
    </Panel>
  )
}
