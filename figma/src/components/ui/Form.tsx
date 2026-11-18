import { useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn, type ForcedState } from './cn'
import Icon from './Icon'

type Status = 'default' | 'error' | 'success'

export function Field({ label, hint, status = 'default', children }: { label?: string; hint?: string; status?: Status; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 w-full">
      {label && <span className="text-sm font-medium text-navy">{label}</span>}
      {children}
      {hint && (
        <span className={cn('text-xs flex items-center gap-1', status === 'error' ? 'text-danger' : status === 'success' ? 'text-success' : 'text-slate-500')}>
          {status === 'error' && <Icon name="alert" className="size-3.5" />}
          {status === 'success' && <Icon name="check" className="size-3.5" />}
          {hint}
        </span>
      )}
    </label>
  )
}

export const inputBase = (status: Status, state: ForcedState = 'default', big = false) =>
  cn(
    big ? 'h-14 text-base' : 'h-11 text-sm',
    'w-full rounded-xl bg-surface border px-3.5 text-navy placeholder:text-slate-400 outline-none transition',
    'disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed',
    status === 'error' && 'border-danger focus:ring-4 focus:ring-danger/15',
    status === 'success' && 'border-success focus:ring-4 focus:ring-success/15',
    status === 'default' && 'border-line hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/15',
    state === 'hover' && status === 'default' && 'border-slate-300',
    state === 'focus' && status === 'default' && 'border-primary ring-4 ring-primary/15',
  )

type InProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; status?: Status; state?: ForcedState; big?: boolean }

export function TextInput({ label, hint, status = 'default', state, big, className, ...rest }: InProps) {
  return (
    <Field label={label} hint={hint} status={status}>
      <input className={cn(inputBase(status, state, big), className)} {...rest} />
    </Field>
  )
}

export function PasswordInput({ label, hint, status = 'default', state, big, ...rest }: InProps) {
  const [show, setShow] = useState(false)
  return (
    <Field label={label} hint={hint} status={status}>
      <span className="relative block">
        <input type={show ? 'text' : 'password'} className={cn(inputBase(status, state, big), 'pr-12')} {...rest} />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy">
          <Icon name={show ? 'eyeoff' : 'eye'} className="size-5" />
        </button>
      </span>
    </Field>
  )
}

export function SearchInput({ state, className, ...rest }: Omit<InProps, 'label' | 'hint' | 'status'>) {
  return (
    <span className="relative block w-full">
      <Icon name="search" className="size-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
      <input type="search" className={cn(inputBase('default', state), 'pl-11 rounded-full', className)} {...rest} />
    </span>
  )
}

export type Option = { value: string; label: string }

/** Dropdown: popover menu with custom list */
export function Dropdown({ label, options, value, onChange, placeholder = 'Chọn...', open: forceOpen }: { label?: string; options: Option[]; value?: string; onChange?: (v: string) => void; placeholder?: string; open?: boolean }) {
  const [open, setOpen] = useState(false)
  const [val, setVal] = useState(value)
  const isOpen = forceOpen ?? open
  const sel = options.find((o) => o.value === val)
  return (
    <div className="flex flex-col gap-1.5 w-full relative">
      {label && <span className="text-sm font-medium">{label}</span>}
      <button type="button" onClick={() => setOpen(!open)} className={cn(inputBase('default', isOpen ? 'focus' : 'default'), 'flex items-center justify-between text-left')}>
        <span className={sel ? '' : 'text-slate-400'}>{sel?.label ?? placeholder}</span>
        <Icon name="down" className={cn('size-4 text-slate-400 transition', isOpen && 'rotate-180')} />
      </button>
      {isOpen && (
        <ul className="absolute top-full mt-1 z-10 w-full bg-surface border border-line rounded-xl p-1" style={{ boxShadow: 'var(--shadow-dropdown)' }}>
          {options.map((o) => (
            <li key={o.value}>
              <button type="button" onClick={() => { setVal(o.value); onChange?.(o.value); setOpen(false) }} className={cn('w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-slate-50 text-left', o.value === val && 'text-primary font-medium bg-blue-50 hover:bg-blue-50')}>
                {o.label}
                {o.value === val && <Icon name="check" className="size-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Select menu: native select (best for mobile pickers) */
export function SelectMenu({ label, options, defaultValue, disabled }: { label?: string; options: Option[]; defaultValue?: string; disabled?: boolean }) {
  return (
    <Field label={label}>
      <span className="relative block">
        <select disabled={disabled} defaultValue={defaultValue} className={cn(inputBase('default'), 'appearance-none pr-10')}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <Icon name="down" className="size-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </span>
    </Field>
  )
}

const weekdays = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function DatePicker({ label, open: forceOpen }: { label?: string; open?: boolean }) {
  const [open, setOpen] = useState(false)
  const [day, setDay] = useState<number | null>(15)
  const isOpen = forceOpen ?? open
  // Tháng 7/2025 bắt đầu vào Thứ Ba, 31 ngày
  const cells = [...Array(1).fill(null), ...Array.from({ length: 31 }, (_, i) => i + 1)]
  return (
    <div className="flex flex-col gap-1.5 w-full relative">
      {label && <span className="text-sm font-medium">{label}</span>}
      <button type="button" onClick={() => setOpen(!open)} className={cn(inputBase('default', isOpen ? 'focus' : 'default'), 'flex items-center justify-between text-left')}>
        <span className={day ? '' : 'text-slate-400'}>{day ? `${String(day).padStart(2, '0')}/07/2025` : 'dd/mm/yyyy'}</span>
        <Icon name="calendar" className="size-5 text-slate-400" />
      </button>
      {isOpen && (
        <div className="absolute top-full mt-1 z-10 w-72 bg-surface border border-line rounded-2xl p-4" style={{ boxShadow: 'var(--shadow-dropdown)' }}>
          <div className="flex items-center justify-between mb-3">
            <Icon name="left" className="size-4 text-slate-400" />
            <span className="text-sm font-semibold">Tháng 7, 2025</span>
            <Icon name="right" className="size-4 text-slate-400" />
          </div>
          <div className="grid grid-cols-7 text-center text-xs text-slate-500 mb-1">{weekdays.map((w) => <span key={w}>{w}</span>)}</div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((d, i) => d === null ? <span key={i} /> : (
              <button key={i} type="button" onClick={() => { setDay(d); setOpen(false) }} className={cn('size-9 mx-auto rounded-full text-sm hover:bg-slate-100', d === day && 'bg-primary text-white hover:bg-primary font-semibold')}>{d}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function Checkbox({ label, defaultChecked, checked, onChange, disabled, error }: { label: string; defaultChecked?: boolean; checked?: boolean; onChange?: (c: boolean) => void; disabled?: boolean; error?: boolean }) {
  return (
    <label className={cn('flex items-center gap-3 text-sm min-h-6', disabled ? 'text-slate-400' : 'cursor-pointer')}>
      <input type="checkbox" {...(checked !== undefined ? { checked } : { defaultChecked })} onChange={(e) => onChange?.(e.target.checked)} disabled={disabled} className="peer sr-only" />
      <span className={cn('size-5 rounded-md border-2 grid place-items-center text-transparent transition peer-checked:bg-primary peer-checked:border-primary peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-primary/25 peer-disabled:bg-slate-100 peer-disabled:border-slate-200', error ? 'border-danger' : 'border-slate-300 hover:border-primary')}>
        <Icon name="check" className="size-3.5" />
      </span>
      {label}
    </label>
  )
}

export function Radio({ label, name, defaultChecked, checked, onChange, disabled }: { label: string; name: string; defaultChecked?: boolean; checked?: boolean; onChange?: () => void; disabled?: boolean }) {
  return (
    <label className={cn('flex items-center gap-3 text-sm min-h-6', disabled ? 'text-slate-400' : 'cursor-pointer')}>
      <input type="radio" name={name} {...(checked !== undefined ? { checked } : { defaultChecked })} onChange={() => onChange?.()} disabled={disabled} className="peer sr-only" />
      <span className="size-5 rounded-full border-2 border-slate-300 hover:border-primary grid place-items-center transition peer-checked:border-primary peer-focus-visible:ring-4 peer-focus-visible:ring-primary/25 peer-disabled:bg-slate-100 peer-disabled:border-slate-200 [&>span]:scale-0 peer-checked:[&>span]:scale-100">
        <span className="size-2.5 rounded-full bg-primary transition" />
      </span>
      {label}
    </label>
  )
}
