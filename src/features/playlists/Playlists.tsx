import { useState } from 'react'
import { Btn, ConfirmBtn, Panel, Range, Toggle } from '../../components/ui'
import { sceneById } from '../../scenes/registry'
import type { Playlist } from '../../storage/schema'
import { store, useStore } from '../../storage/store'

const update = (id: string, f: (p: Playlist) => Playlist) => store.set((s) => ({ ...s, playlists: s.playlists.map((p) => (p.id === id ? f(p) : p)) }))

export function PlaylistsPanel({ currentScene, playing, onPlay, onStop }: { currentScene: string; playing: string | null; onPlay: (id: string) => void; onStop: () => void }) {
  const playlists = useStore((s) => s.playlists)
  const [openId, setOpenId] = useState<string | null>(playlists[0]?.id ?? null)
  const create = () => {
    const id = `pl-${Date.now().toString(36)}`
    store.set((s) => ({ ...s, playlists: [...s.playlists, { id, name: `Playlist ${s.playlists.length + 1}`, items: [{ sceneId: currentScene, duration: 5 }], shuffle: false, loop: true, transition: 1.5 }] }))
    setOpenId(id)
  }
  return (
    <Panel title="Playlists">
      {playlists.length === 0 && <p className="muted">Chain scenes with a duration each, then let them play on their own.</p>}
      {playlists.map((p) => (
        <div key={p.id} className={`playlist ${openId === p.id ? 'is-open' : ''}`}>
          <div className="playlist-head">
            <button type="button" className="linkish" onClick={() => setOpenId(openId === p.id ? null : p.id)} aria-expanded={openId === p.id}>
              {p.name} <small>({p.items.length})</small>
            </button>
            {playing === p.id ? (
              <Btn onClick={onStop} active>
                ■ Stop
              </Btn>
            ) : (
              <Btn onClick={() => onPlay(p.id)} disabled={!p.items.length}>
                ▶ Play
              </Btn>
            )}
          </div>
          {openId === p.id && (
            <div className="playlist-body">
              <div className="field">
                <label>
                  <span>Name</span>
                </label>
                <input type="text" value={p.name} maxLength={60} onChange={(e) => update(p.id, (x) => ({ ...x, name: e.target.value }))} />
              </div>
              <ol className="pl-items">
                {p.items.map((it, i) => (
                  <li key={`${it.sceneId}-${i}`}>
                    <span className="pl-name">{sceneById(it.sceneId)?.meta.name ?? it.sceneId}</span>
                    <select
                      aria-label="Duration"
                      value={it.duration}
                      onChange={(e) => update(p.id, (x) => ({ ...x, items: x.items.map((y, j) => (j === i ? { ...y, duration: Number(e.target.value) } : y)) }))}
                    >
                      {[0.5, 1, 2, 3, 5, 10, 15, 20, 30, 45, 60, 120].map((m) => (
                        <option key={m} value={m}>
                          {m < 1 ? '30 s' : `${m} min`}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="mini" aria-label="Move up" disabled={i === 0} onClick={() => update(p.id, (x) => ({ ...x, items: swap(x.items, i, i - 1) }))}>
                      ↑
                    </button>
                    <button type="button" className="mini" aria-label="Move down" disabled={i === p.items.length - 1} onClick={() => update(p.id, (x) => ({ ...x, items: swap(x.items, i, i + 1) }))}>
                      ↓
                    </button>
                    <button type="button" className="mini" aria-label="Remove" onClick={() => update(p.id, (x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))}>
                      ✕
                    </button>
                  </li>
                ))}
              </ol>
              <div className="row">
                <Btn onClick={() => update(p.id, (x) => ({ ...x, items: [...x.items, { sceneId: currentScene, duration: 5 }] }))}>+ Add current scene</Btn>
              </div>
              <Toggle label="Shuffle" value={p.shuffle} onChange={(v) => update(p.id, (x) => ({ ...x, shuffle: v }))} />
              <Toggle label="Loop" value={p.loop} onChange={(v) => update(p.id, (x) => ({ ...x, loop: v }))} />
              <Range label="Fade between scenes" value={p.transition} min={0} max={5} step={0.5} onChange={(v) => update(p.id, (x) => ({ ...x, transition: v }))} format={(v) => `${v} s`} />
              <div className="row">
                <ConfirmBtn confirmLabel="Delete it? Click again" onConfirm={() => store.set((s) => ({ ...s, playlists: s.playlists.filter((x) => x.id !== p.id) }))}>
                  Delete playlist
                </ConfirmBtn>
              </div>
            </div>
          )}
        </div>
      ))}
      <div className="row">
        <Btn onClick={create}>+ New playlist</Btn>
      </div>
    </Panel>
  )
}

function swap<T>(a: T[], i: number, j: number) {
  const b = [...a]
  ;[b[i], b[j]] = [b[j], b[i]]
  return b
}
