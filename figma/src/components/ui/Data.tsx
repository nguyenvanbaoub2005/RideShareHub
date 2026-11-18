import type { ReactNode } from 'react'
import { cn } from './cn'
import Icon from './Icon'
import Button from './Button'
import { SearchInput } from './Form'

export type Column<T> = { key: string; header: string; align?: 'right'; render?: (row: T) => ReactNode }

export function DataTable<T extends Record<string, unknown>>({ columns, rows, selectedIndex }: { columns: Column<T>[]; rows: T[]; selectedIndex?: number }) {
  return (
    <div className="overflow-x-auto bg-surface border border-line rounded-2xl">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            {columns.map((c) => <th key={c.key} className={cn('text-left font-semibold px-4 py-3', c.align === 'right' && 'text-right')}>{c.header}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => (
            <tr key={i} className={cn('hover:bg-slate-50 transition', selectedIndex === i && 'bg-blue-50/60')}>
              {columns.map((c) => <td key={c.key} className={cn('px-4 py-3.5', c.align === 'right' && 'text-right')}>{c.render ? c.render(r) : (r[c.key] as ReactNode)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({ page, pages, total, perPage, onChange }: { page: number; pages: number; total: number; perPage: number; onChange?: (p: number) => void }) {
  const btn = 'size-9 rounded-lg text-sm font-medium grid place-items-center transition'
  const from = (page - 1) * perPage + 1
  return (
    <div className="flex items-center justify-between text-sm text-slate-600">
      <span>Hiển thị {from}–{Math.min(page * perPage, total)} trên {total} kết quả</span>
      <div className="flex items-center gap-1">
        <button disabled={page === 1} onClick={() => onChange?.(page - 1)} className={cn(btn, 'border border-line hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-transparent')} aria-label="Trang trước"><Icon name="left" className="size-4" /></button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <button key={p} onClick={() => onChange?.(p)} className={cn(btn, p === page ? 'bg-primary text-white' : 'hover:bg-slate-100')}>{p}</button>
        ))}
        <button disabled={page === pages} onClick={() => onChange?.(page + 1)} className={cn(btn, 'border border-line hover:bg-slate-50 disabled:text-slate-300 disabled:hover:bg-transparent')} aria-label="Trang sau"><Icon name="right" className="size-4" /></button>
      </div>
    </div>
  )
}

export function FilterBar({ filters, active, onChange }: { filters: { id: string; label: string; count?: number }[]; active: string; onChange?: (id: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((f) => (
        <button key={f.id} onClick={() => onChange?.(f.id)} className={cn('h-9 px-4 rounded-full text-sm font-medium border transition flex items-center gap-2', f.id === active ? 'bg-navy text-white border-navy' : 'bg-surface text-slate-600 border-line hover:border-slate-300')}>
          {f.label}
          {f.count !== undefined && <span className={cn('text-xs rounded-full px-1.5', f.id === active ? 'bg-white/20' : 'bg-slate-100')}>{f.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function SearchToolbar({ placeholder, action }: { placeholder: string; action: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 max-w-md"><SearchInput placeholder={placeholder} /></div>
      <Button variant="secondary" icon="filter">Bộ lọc</Button>
      <Button icon="plus" className="ml-auto">{action}</Button>
    </div>
  )
}
