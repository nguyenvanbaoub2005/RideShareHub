import type { ReactNode } from 'react'
import Badge, { type BadgeKind } from './Badge'
import Button from './Button'
import Icon from './Icon'
import { formatVND } from '../../lib/format'
import { cn } from './cn'

const card = 'bg-surface border border-line rounded-[20px] p-4 transition hover:border-slate-300'
const shadow = { boxShadow: 'var(--shadow-card)' }

const Meta = ({ icon, children }: { icon: string; children: ReactNode }) => (
  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500"><Icon name={icon} className="size-3.5" />{children}</span>
)

export function TripCard({ from, to, depart, arrive, company, price, seatsLeft, rating }: { from: string; to: string; depart: string; arrive: string; company: string; price: number; seatsLeft: number; rating: number }) {
  return (
    <div className={card} style={shadow}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-navy">{company}</span>
        <span className="inline-flex items-center gap-1 text-slate-600"><Icon name="star" filled className="size-3.5 text-warning" />{rating.toFixed(1)}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div><div className="text-xl font-bold">{depart}</div><div className="text-xs text-slate-500">{from}</div></div>
        <div className="flex-1 flex items-center gap-1 text-slate-300"><span className="flex-1 border-t border-dashed border-slate-300" /><Icon name="bus" className="size-4 text-primary" /><span className="flex-1 border-t border-dashed border-slate-300" /></div>
        <div className="text-right"><div className="text-xl font-bold">{arrive}</div><div className="text-xs text-slate-500">{to}</div></div>
      </div>
      <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
        <span className={cn('text-xs font-medium', seatsLeft <= 3 ? 'text-warning' : 'text-teal')}>Còn {seatsLeft} chỗ</span>
        <span className="text-lg font-bold text-primary">{formatVND(price)}<span className="text-xs font-normal text-slate-500">/chỗ</span></span>
      </div>
    </div>
  )
}

export function BookingCard({ code, route, date, seats, total, status, statusLabel }: { code: string; route: string; date: string; seats: string; total: number; status: BadgeKind; statusLabel: string }) {
  return (
    <div className={card} style={shadow}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-slate-500">{code}</span>
        <Badge kind={status}>{statusLabel}</Badge>
      </div>
      <div className="mt-2 font-semibold">{route}</div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1"><Meta icon="calendar">{date}</Meta><Meta icon="ticket">Ghế {seats}</Meta></div>
      <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
        <span className="font-bold">{formatVND(total)}</span>
        <Button variant="secondary" className="h-9 px-4">Xem chi tiết</Button>
      </div>
    </div>
  )
}

export function VehicleCard({ plate, type, seats, year, status, statusLabel }: { plate: string; type: string; seats: number; year: number; status: BadgeKind; statusLabel: string }) {
  return (
    <div className={card} style={shadow}>
      <div className="flex items-start gap-3">
        <div className="size-12 rounded-xl bg-blue-50 text-primary grid place-items-center"><Icon name="car" className="size-6" /></div>
        <div className="flex-1">
          <div className="font-bold tracking-wide">{plate}</div>
          <div className="text-sm text-slate-600">{type}</div>
        </div>
        <Badge kind={status}>{statusLabel}</Badge>
      </div>
      <div className="mt-3 pt-3 border-t border-line flex gap-4"><Meta icon="users">{seats} chỗ</Meta><Meta icon="calendar">Đời {year}</Meta></div>
    </div>
  )
}

export function DriverCard({ name, phone, license, rating, trips, status, statusLabel }: { name: string; phone: string; license: string; rating: number; trips: number; status: BadgeKind; statusLabel: string }) {
  return (
    <div className={card} style={shadow}>
      <div className="flex items-center gap-3">
        <div className="size-12 rounded-full bg-teal/15 text-teal font-bold text-lg grid place-items-center">{name.split(' ').pop()?.[0]}</div>
        <div className="flex-1">
          <div className="font-semibold">{name}</div>
          <div className="text-xs text-slate-500">Bằng lái {license}</div>
        </div>
        <Badge kind={status}>{statusLabel}</Badge>
      </div>
      <div className="mt-3 pt-3 border-t border-line flex flex-wrap gap-4">
        <Meta icon="phone">{phone}</Meta>
        <Meta icon="star">{rating.toFixed(1)} sao</Meta>
        <Meta icon="route">{trips} chuyến</Meta>
      </div>
    </div>
  )
}

export function CompanyCard({ name, city, vehicles, routes, status, statusLabel, actions }: { name: string; city: string; vehicles: number; routes: number; status: BadgeKind; statusLabel: string; actions?: boolean }) {
  return (
    <div className={card} style={shadow}>
      <div className="flex items-start gap-3">
        <div className="size-12 rounded-xl bg-navy text-white grid place-items-center"><Icon name="building" className="size-6" /></div>
        <div className="flex-1">
          <div className="font-semibold">{name}</div>
          <div className="text-xs text-slate-500 flex items-center gap-1"><Icon name="pin" className="size-3.5" />{city}</div>
        </div>
        <Badge kind={status}>{statusLabel}</Badge>
      </div>
      <div className="mt-3 pt-3 border-t border-line flex items-center gap-4">
        <Meta icon="car">{vehicles} xe</Meta><Meta icon="route">{routes} tuyến</Meta>
        {actions && <div className="ml-auto flex gap-2"><Button variant="destructive" className="h-8 px-3 text-xs">Từ chối</Button><Button className="h-8 px-3 text-xs">Duyệt</Button></div>}
      </div>
    </div>
  )
}
