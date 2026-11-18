import { cn } from './cn'
import Icon from './Icon'
import { SearchInput } from './Form'

export type NavItem = { id: string; label: string; icon: string; badge?: number }

export function Sidebar({ title, subtitle, items, active, collapsed }: { title: string; subtitle: string; items: NavItem[]; active: string; collapsed?: boolean }) {
  return (
    <aside className={cn('bg-navy text-slate-300 flex flex-col h-full p-4', collapsed ? 'w-[72px] items-center' : 'w-64')}>
      <div className="flex items-center gap-3 px-1 mb-6">
        <div className="size-9 shrink-0 rounded-xl bg-primary text-white font-bold grid place-items-center">R</div>
        {!collapsed && (
          <div className="leading-tight">
            <div className="text-white font-bold text-sm">{title}</div>
            <div className="text-xs text-slate-400">{subtitle}</div>
          </div>
        )}
      </div>
      <nav className="flex flex-col gap-1 flex-1 w-full">
        {items.map((i) => (
          <a key={i.id} className={cn('flex items-center gap-3 rounded-xl px-3 h-11 text-sm font-medium cursor-pointer transition', collapsed && 'justify-center px-0', i.id === active ? 'bg-primary text-white' : 'hover:bg-white/10 hover:text-white')}>
            <Icon name={i.icon} className="size-5 shrink-0" />
            {!collapsed && <span className="flex-1">{i.label}</span>}
            {!collapsed && i.badge ? <span className="text-[11px] bg-teal text-navy font-bold rounded-full px-1.5">{i.badge}</span> : null}
          </a>
        ))}
      </nav>
      <a className="flex items-center gap-3 px-3 h-11 text-sm rounded-xl hover:bg-white/10 cursor-pointer w-full">
        <Icon name="logout" className="size-5" />{!collapsed && 'Đăng xuất'}
      </a>
    </aside>
  )
}

export function Breadcrumbs({ items }: { items: string[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {items.map((it, i) => (
        <span key={it} className="flex items-center gap-1.5">
          {i > 0 && <Icon name="right" className="size-3.5 text-slate-400" />}
          <span className={i === items.length - 1 ? 'font-semibold text-navy' : 'text-slate-500 hover:text-primary cursor-pointer'}>{it}</span>
        </span>
      ))}
    </nav>
  )
}

export function Topbar({ breadcrumbs, user, role }: { breadcrumbs: string[]; user: string; role: string }) {
  return (
    <header className="h-16 bg-surface border-b border-line px-6 flex items-center gap-6">
      <Breadcrumbs items={breadcrumbs} />
      <div className="ml-auto w-72"><SearchInput placeholder="Tìm kiếm..." /></div>
      <button className="relative size-10 rounded-full hover:bg-slate-100 grid place-items-center" aria-label="Thông báo">
        <Icon name="bell" />
        <span className="absolute top-2 right-2.5 size-2 rounded-full bg-danger ring-2 ring-white" />
      </button>
      <div className="flex items-center gap-3">
        <div className="size-9 rounded-full bg-teal/15 text-teal font-bold grid place-items-center text-sm">{user.slice(0, 1)}</div>
        <div className="leading-tight text-sm"><div className="font-semibold">{user}</div><div className="text-xs text-slate-500">{role}</div></div>
      </div>
    </header>
  )
}

export function BottomNav({ items, active, onSelect }: { items: NavItem[]; active: string; onSelect?: (id: string) => void }) {
  return (
    <nav className="h-16 bg-surface border-t border-line grid" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((i) => (
        <a key={i.id} onClick={() => onSelect?.(i.id)} className={cn('flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium relative cursor-pointer', i.id === active ? 'text-primary' : 'text-slate-500')}>
          <span className="relative">
            <Icon name={i.icon} className="size-6" />
            {i.badge ? <span className="absolute -top-1 -right-2 bg-danger text-white text-[10px] rounded-full min-w-4 h-4 grid place-items-center px-1">{i.badge}</span> : null}
          </span>
          {i.label}
          {i.id === active && <span className="absolute top-0 h-0.5 w-8 bg-primary rounded-full" />}
        </a>
      ))}
    </nav>
  )
}
