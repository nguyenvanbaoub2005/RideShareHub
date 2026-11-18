import type { ReactNode } from 'react'
import { cn } from './cn'
import Icon from './Icon'
import Button from './Button'

/** inline=true renders in-flow (for previews); otherwise fixed overlay. */
export function Modal({ open = true, inline, contained, title, onClose, children, footer, width = 'max-w-lg', footerClass }: { open?: boolean; inline?: boolean; contained?: boolean; title: string; onClose?: () => void; children: ReactNode; footer?: ReactNode; width?: string; footerClass?: string }) {
  if (!open) return null
  const panel = (
    <div role="dialog" aria-modal className={cn('bg-surface rounded-[20px] w-full', width)} style={{ boxShadow: 'var(--shadow-modal)' }}>
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <button onClick={onClose} aria-label="Đóng" className="size-8 rounded-full hover:bg-slate-100 grid place-items-center text-slate-500"><Icon name="x" className="size-5" /></button>
      </div>
      <div className="px-6 pb-4 text-sm text-slate-600">{children}</div>
      {footer && <div className={cn('px-6 py-4 border-t border-line flex justify-end gap-3', footerClass)}>{footer}</div>}
    </div>
  )
  if (inline) return <div className="bg-navy/50 rounded-2xl p-8 grid place-items-center">{panel}</div>
  return <div className={cn(contained ? 'absolute' : 'fixed', 'inset-0 z-50 bg-navy/50 grid place-items-center p-4')} onClick={onClose}><div onClick={(e) => e.stopPropagation()} className="w-full grid place-items-center">{panel}</div></div>
}

export function ConfirmDialog({ open = true, inline, contained, large, title, message, confirmLabel, destructive, loading, onConfirm, onCancel }: { open?: boolean; inline?: boolean; contained?: boolean; large?: boolean; title: string; message: string; confirmLabel: string; destructive?: boolean; loading?: boolean; onConfirm?: () => void; onCancel?: () => void }) {
  return (
    <Modal open={open} inline={inline} contained={contained} title={title} onClose={onCancel} width="max-w-md" footerClass={large ? 'flex-col-reverse' : ''} footer={<>
      <Button size={large ? 'xl' : 'md'} variant="secondary" onClick={onCancel} className={large ? 'w-full' : ''}>Hủy</Button>
      <Button size={large ? 'xl' : 'md'} variant={destructive ? 'destructive' : 'primary'} loading={loading} onClick={onConfirm} className={large ? 'w-full' : ''}>{confirmLabel}</Button>
    </>}>
      <div className="flex gap-4">
        <div className={cn('size-10 shrink-0 rounded-full grid place-items-center', destructive ? 'bg-red-50 text-danger' : 'bg-blue-50 text-primary')}><Icon name={destructive ? 'alert' : 'info'} /></div>
        <p className="leading-relaxed">{message}</p>
      </div>
    </Modal>
  )
}
