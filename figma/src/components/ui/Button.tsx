import type { ButtonHTMLAttributes } from 'react'
import { cn, type ForcedState } from './cn'
import Icon from './Icon'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'destructive'
  size?: 'md' | 'lg' | 'xl'
  loading?: boolean
  fullWidth?: boolean
  state?: ForcedState
  icon?: string
}

const styles = {
  primary: 'bg-primary text-white hover:bg-blue-700 focus-visible:ring-primary/40',
  secondary: 'bg-surface text-navy border border-line hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-primary/30',
  destructive: 'bg-danger text-white hover:bg-red-700 focus-visible:ring-danger/40',
}
const forced = {
  primary: { hover: 'bg-blue-700', focus: 'ring-4 ring-primary/40' },
  secondary: { hover: 'bg-slate-50 border-slate-300', focus: 'ring-4 ring-primary/30' },
  destructive: { hover: 'bg-red-700', focus: 'ring-4 ring-danger/40' },
}

export default function Button({ variant = 'primary', size = 'md', loading, fullWidth, state = 'default', icon, className, disabled, children, ...rest }: Props) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors outline-none focus-visible:ring-4',
        size === 'md' ? 'h-11 px-5 text-sm' : size === 'lg' ? 'h-[52px] px-6 text-base' : 'h-16 px-7 text-lg',
        styles[variant],
        state !== 'default' && forced[variant][state],
        'disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-100 disabled:cursor-not-allowed',
        loading && 'cursor-wait',
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? <Icon name="refresh" className="size-4 animate-spin" /> : icon && <Icon name={icon} className="size-4" />}
      {children}
    </button>
  )
}
