import { cn } from './cn'

export const badgeKinds = {
  success: { label: 'Thành công', cls: 'bg-green-50 text-green-700 ring-green-600/20', dot: 'bg-success' },
  warning: { label: 'Cảnh báo', cls: 'bg-amber-50 text-amber-700 ring-amber-500/30', dot: 'bg-warning' },
  error: { label: 'Lỗi', cls: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-danger' },
  pending: { label: 'Chờ duyệt', cls: 'bg-slate-100 text-slate-600 ring-slate-400/30', dot: 'bg-slate-400' },
  active: { label: 'Đang hoạt động', cls: 'bg-blue-50 text-blue-700 ring-blue-600/20', dot: 'bg-primary' },
  completed: { label: 'Hoàn thành', cls: 'bg-teal-50 text-teal-700 ring-teal-600/20', dot: 'bg-teal' },
} as const
export type BadgeKind = keyof typeof badgeKinds

export default function Badge({ kind, children }: { kind: BadgeKind; children?: React.ReactNode }) {
  const k = badgeKinds[kind]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap', k.cls)}>
      <span className={cn('size-1.5 rounded-full', k.dot)} />
      {children ?? k.label}
    </span>
  )
}
