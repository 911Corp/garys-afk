import { useMemo, useState } from 'react'
import type { CategoryId } from '../../engine/types'
import { CATEGORIES, SCENES } from '../../scenes/registry'
import { useStore } from '../../storage/store'

export type Filter = CategoryId | 'all' | 'favorites' | 'recent'

export const thumb = (id: string) => `${import.meta.env.BASE_URL}assets/thumbnails/${id}.png`

export function Catalog({ current, onPick, filter, setFilter }: { current: string; onPick: (id: string) => void; filter: Filter; setFilter: (f: Filter) => void }) {
  const favorites = useStore((s) => s.favorites)
  const recents = useStore((s) => s.recents)
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    let items = SCENES
    if (filter === 'favorites') items = favorites.map((id) => SCENES.find((s) => s.meta.id === id)!).filter(Boolean)
    else if (filter === 'recent') items = recents.map((id) => SCENES.find((s) => s.meta.id === id)!).filter(Boolean)
    else if (filter !== 'all') items = SCENES.filter((s) => s.meta.category === filter)
    if (query) items = items.filter((s) => [s.meta.name, s.meta.description, ...s.meta.tags, CATEGORIES.find((c) => c.id === s.meta.category)?.name ?? ''].join(' ').toLowerCase().includes(query))
    return items
  }, [q, filter, favorites, recents])

  const chips: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'favorites', label: `★ ${favorites.length}` },
    { id: 'recent', label: 'Recent' },
    ...CATEGORIES.map((c) => ({ id: c.id as Filter, label: c.short })),
  ]

  return (
    <section className="catalog" aria-label="Scenes">
      <div className="chips" role="tablist" aria-label="Categories">
        {chips.map((c) => (
          <button key={c.id} type="button" role="tab" aria-selected={filter === c.id} className={`chip ${filter === c.id ? 'is-active' : ''}`} onClick={() => setFilter(c.id)}>
            {c.label}
          </button>
        ))}
      </div>
      <input className="search" type="search" placeholder="Search scenes: rain, space, gary..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search scenes" />
      {list.length === 0 ? (
        <p className="empty">{filter === 'favorites' ? 'No favorites yet. Tap ☆ Favorite on a scene you like.' : filter === 'recent' ? 'Nothing played yet.' : 'No scene matches. Try another word.'}</p>
      ) : (
        <div className="grid">
          {list.map((s) => (
            <button key={s.meta.id} type="button" className={`card ${s.meta.id === current ? 'is-current' : ''}`} onClick={() => onPick(s.meta.id)} title={s.meta.description}>
              <img src={thumb(s.meta.id)} alt="" loading="lazy" width={320} height={180} />
              <span className="card-name">
                {favorites.includes(s.meta.id) && <span className="star">★</span>}
                {s.meta.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
