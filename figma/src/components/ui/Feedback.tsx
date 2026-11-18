import { cn } from './cn'
import Icon from './Icon'
import Button from './Button'

export function NotificationItem({ kind = 'info', title, body, time, unread }: { kind?: 'info' | 'success' | 'warning' | 'error'; title: string; body: string; time: string; unread?: boolean }) {
  const k = { info: ['info', 'bg-blue-50 text-primary'], success: ['check', 'bg-green-50 text-success'], warning: ['alert', 'bg-amber-50 text-warning'], error: ['alert', 'bg-red-50 text-danger'] }[kind]
  return (
    <div className={cn('flex gap-3 p-4 rounded-2xl border border-line hover:bg-slate-50 transition', unread ? 'bg-blue-50/40' : 'bg-surface')}>
      <div className={cn('size-10 shrink-0 rounded-full grid place-items-center', k[1])}><Icon name={k[0]} className="size-5" /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2"><span className="font-semibold text-sm">{title}</span>{unread && <span className="mt-1.5 size-2 rounded-full bg-primary shrink-0" />}</div>
        <p className="text-sm text-slate-600 mt-0.5">{body}</p>
        <span className="text-xs text-slate-400 mt-1 block">{time}</span>
      </div>
    </div>
  )
}

export function EmptyState({ title, body, action, onAction }: { title: string; body: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-6">
      <div className="size-16 rounded-full bg-slate-100 text-slate-400 grid place-items-center"><Icon name="inbox" className="size-8" /></div>
      <h4 className="mt-4 font-semibold">{title}</h4>
      <p className="mt-1 text-sm text-slate-500 max-w-xs">{body}</p>
      {action && <Button className="mt-5" icon={onAction ? undefined : 'plus'} onClick={onAction}>{action}</Button>}
    </div>
  )
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="p-6 space-y-3" aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="size-11 rounded-xl bg-slate-200" />
          <div className="flex-1 space-y-2"><div className="h-3 w-2/3 rounded bg-slate-200" /><div className="h-3 w-1/3 rounded bg-slate-100" /></div>
          <div className="h-6 w-16 rounded-full bg-slate-200" />
        </div>
      ))}
      <p className="text-center text-xs text-slate-400 pt-2">Đang tải dữ liệu...</p>
    </div>
  )
}

export function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-6">
      <div className="size-16 rounded-full bg-red-50 text-danger grid place-items-center"><Icon name="alert" className="size-8" /></div>
      <h4 className="mt-4 font-semibold">{title}</h4>
      <p className="mt-1 text-sm text-slate-500 max-w-xs">{body}</p>
      <Button variant="secondary" className="mt-5" icon="refresh">Thử lại</Button>
    </div>
  )
}
