import { useEffect, useState } from 'react'
import { useStore } from '../../storage/store'

export function formatTime(d: Date, h24: boolean) {
  const m = String(d.getMinutes()).padStart(2, '0')
  if (h24) return `${String(d.getHours()).padStart(2, '0')}:${m}`
  const h = d.getHours() % 12 || 12
  return `${h}:${m} ${d.getHours() < 12 ? 'AM' : 'PM'}`
}

export function Clock() {
  const clock = useStore((s) => s.clock)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!clock.show) return
    const id = window.setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [clock.show])
  if (!clock.show) return null
  return (
    <div className={`clock pos-${clock.pos}`} style={{ opacity: clock.opacity, fontSize: `calc(var(--clock-base) * ${clock.size})` }} aria-live="off">
      <div className="clock-time">{formatTime(now, clock.h24)}</div>
      {clock.date && <div className="clock-date">{now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</div>}
    </div>
  )
}
