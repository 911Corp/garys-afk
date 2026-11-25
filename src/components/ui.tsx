import { useEffect, useId, useState, type ReactNode } from 'react'

export function Panel({ title, children, open, id }: { title: string; children: ReactNode; open?: boolean; id?: string }) {
  return (
    <details className="panel" open={open} id={id}>
      <summary>
        <span className="panel-caret" aria-hidden="true">
          ▶
        </span>
        {title}
      </summary>
      <div className="panel-body">{children}</div>
    </details>
  )
}

export function Range({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>
        <span>{label}</span>
        <output>{format ? format(value) : String(Math.round(value * 100) / 100)}</output>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}

export function Select<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  const id = useId()
  return (
    <div className="field">
      <label htmlFor={id}>
        <span>{label}</span>
      </label>
      <select
        id={id}
        value={String(value)}
        onChange={(e) => {
          const o = options.find((x) => String(x.value) === e.target.value)
          if (o) onChange(o.value)
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Toggle({ label, value, onChange, hint }: { label: string; value: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-box" aria-hidden="true" />
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
    </label>
  )
}

export function Btn({ children, onClick, active, title, className = '', disabled }: { children: ReactNode; onClick: () => void; active?: boolean; title?: string; className?: string; disabled?: boolean }) {
  return (
    <button type="button" className={`btn ${active ? 'is-active' : ''} ${className}`} onClick={onClick} title={title} aria-label={title} aria-pressed={active} disabled={disabled}>
      {children}
    </button>
  )
}

/** A destructive button that asks for a second click instead of a browser dialog. */
export function ConfirmBtn({ children, confirmLabel, onConfirm }: { children: ReactNode; confirmLabel: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = window.setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      type="button"
      className={`btn danger ${armed ? 'is-armed' : ''}`}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else setArmed(true)
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  )
}
