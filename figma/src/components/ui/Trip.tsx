import { useState } from 'react'
import { cn } from './cn'
import Icon from './Icon'

export type SeatStatus = 'free' | 'taken' | 'selected' | 'driver'

/** 16-seat minibus layout: 4 rows x (2 + aisle + 2), driver top-left. */
export function SeatSelector({ taken = [], max = 3, defaultSelected = [] }: { taken?: string[]; max?: number; defaultSelected?: string[] }) {
  const [sel, setSel] = useState<string[]>(defaultSelected)
  const rows = ['A', 'B', 'C', 'D']
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < max ? [...s, id] : s))
  const seat = (id: string) => {
    const st: SeatStatus = taken.includes(id) ? 'taken' : sel.includes(id) ? 'selected' : 'free'
    return (
      <button key={id} disabled={st === 'taken'} onClick={() => toggle(id)} aria-pressed={st === 'selected'} className={cn('size-11 rounded-xl text-xs font-semibold border-2 transition', st === 'free' && 'bg-surface border-line text-slate-600 hover:border-primary', st === 'selected' && 'bg-primary border-primary text-white', st === 'taken' && 'bg-slate-100 border-slate-100 text-slate-300 cursor-not-allowed')}>{id}</button>
    )
  }
  return (
    <div className="bg-surface border border-line rounded-[20px] p-5 w-fit">
      <div className="flex justify-between items-center mb-4">
        <div className="size-11 rounded-xl border-2 border-dashed border-slate-300 text-slate-400 grid place-items-center"><Icon name="user" className="size-5" /></div>
        <span className="text-xs text-slate-500">Tài xế</span>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r} className="flex gap-2 items-center">
            {seat(`${r}1`)}{seat(`${r}2`)}<span className="w-6" />{seat(`${r}3`)}{seat(`${r}4`)}
          </div>
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-line flex gap-4 text-xs text-slate-500">
        {[['bg-surface border-line', 'Trống'], ['bg-primary border-primary', 'Đã chọn'], ['bg-slate-100 border-slate-100', 'Đã đặt']].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5"><span className={cn('size-3.5 rounded border-2', c)} />{l}</span>
        ))}
      </div>
    </div>
  )
}

export function MapCard({ title, subtitle, eta }: { title: string; subtitle: string; eta?: string }) {
  return (
    <div className="bg-surface border border-line rounded-[20px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="relative h-44 bg-[#E8EEF5]">
        <svg viewBox="0 0 400 176" className="absolute inset-0 size-full" preserveAspectRatio="none" aria-hidden>
          <g stroke="#fff" strokeWidth="10" fill="none"><path d="M-10 40 Q120 70 200 30 T410 60" /><path d="M60 -10 L120 190" /><path d="M300 -10 L260 190" /></g>
          <g stroke="#fff" strokeWidth="4" fill="none"><path d="M-10 120 L410 140" /><path d="M180 -10 L200 190" /></g>
          <path d="M50 140 C120 130 150 60 220 80 S330 50 350 36" stroke="#2563EB" strokeWidth="5" strokeLinecap="round" fill="none" />
        </svg>
        <span className="absolute left-[11%] top-[72%] size-4 rounded-full bg-teal ring-4 ring-white" />
        <span className="absolute left-[85%] top-[16%] size-4 rounded-full bg-danger ring-4 ring-white" />
        <span className="absolute left-[52%] top-[40%] size-8 rounded-full bg-primary text-white grid place-items-center ring-4 ring-primary/25"><Icon name="bus" className="size-4" /></span>
        {eta && <span className="absolute top-3 left-3 bg-surface rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5" style={{ boxShadow: 'var(--shadow-card)' }}><Icon name="clock" className="size-3.5 text-primary" />{eta}</span>}
      </div>
      <div className="p-4"><div className="font-semibold">{title}</div><div className="text-sm text-slate-500">{subtitle}</div></div>
    </div>
  )
}

export type Stop = { name: string; time: string; type: 'pickup' | 'dropoff' | 'stop'; status: 'done' | 'current' | 'upcoming'; note?: string }

export function StopTimeline({ stops }: { stops: Stop[] }) {
  const label = { pickup: 'Đón', dropoff: 'Trả', stop: 'Điểm dừng' }
  return (
    <ol className="bg-surface border border-line rounded-[20px] p-5">
      {stops.map((s, i) => (
        <li key={s.name} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className={cn('size-6 rounded-full grid place-items-center border-2 shrink-0', s.status === 'done' && 'bg-success border-success text-white', s.status === 'current' && 'bg-surface border-primary ring-4 ring-primary/20', s.status === 'upcoming' && 'bg-surface border-slate-300')}>
              {s.status === 'done' ? <Icon name="check" className="size-3.5" /> : s.status === 'current' ? <span className="size-2 rounded-full bg-primary" /> : null}
            </span>
            {i < stops.length - 1 && <span className={cn('w-0.5 flex-1 min-h-8', s.status === 'done' ? 'bg-success' : 'bg-slate-200')} />}
          </div>
          <div className="pb-5 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className={cn('font-semibold text-sm', s.status === 'upcoming' && 'text-slate-500')}>{s.name}</span>
              <span className="text-xs font-mono text-slate-500">{s.time}</span>
            </div>
            <div className="mt-0.5 text-xs flex items-center gap-2">
              <span className={cn('font-medium', s.type === 'pickup' ? 'text-teal' : s.type === 'dropoff' ? 'text-danger' : 'text-slate-500')}>{label[s.type]}</span>
              {s.note && <span className="text-slate-500">· {s.note}</span>}
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
