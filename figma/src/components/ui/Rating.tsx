import { useState } from 'react'
import Icon from './Icon'
import { cn } from './cn'

export default function StarRating({ value, onChange, size = 'size-9', readOnly, label }: { value: number; onChange?: (v: number) => void; size?: string; readOnly?: boolean; label?: string }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={readOnly} aria-label={`${n} sao`} onMouseEnter={() => !readOnly && setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => onChange?.(n)} className={cn('transition active:scale-90', readOnly && 'cursor-default')}>
          <Icon name="star" filled={n <= shown} className={cn(size, n <= shown ? 'text-warning' : 'text-slate-300')} />
        </button>
      ))}
    </div>
  )
}
