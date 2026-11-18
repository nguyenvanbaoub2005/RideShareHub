import { BottomNav, type NavItem } from '../../components/ui/Nav'
import { useStore, type ScreenId } from './store'

const target: Record<string, ScreenId> = { home: 'home', trips: 'bookings', notif: 'notifications', me: 'profile' }

export function TabBar({ active, go }: { active: 'home' | 'trips' | 'notif' | 'me'; go: (id: ScreenId) => void }) {
  const { unread } = useStore()
  const items: NavItem[] = [
    { id: 'home', label: 'Trang chủ', icon: 'home' },
    { id: 'trips', label: 'Chuyến của tôi', icon: 'ticket' },
    { id: 'notif', label: 'Thông báo', icon: 'bell', badge: unread || undefined },
    { id: 'me', label: 'Cá nhân', icon: 'user' },
  ]
  return <div className="pb-3 bg-surface shrink-0"><BottomNav items={items} active={active} onSelect={(id) => go(target[id])} /></div>
}
