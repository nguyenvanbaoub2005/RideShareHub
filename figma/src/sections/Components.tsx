import { useState, type ReactNode } from 'react'
import Button from '../components/ui/Button'
import Badge, { badgeKinds, type BadgeKind } from '../components/ui/Badge'
import { TextInput, PasswordInput, SearchInput, Dropdown, SelectMenu, DatePicker, Checkbox, Radio } from '../components/ui/Form'
import { Sidebar, Topbar, BottomNav, Breadcrumbs, type NavItem } from '../components/ui/Nav'
import { DataTable, Pagination, FilterBar, SearchToolbar } from '../components/ui/Data'
import { TripCard, BookingCard, VehicleCard, DriverCard, CompanyCard } from '../components/ui/Cards'
import { Modal, ConfirmDialog } from '../components/ui/Overlays'
import { NotificationItem, EmptyState, LoadingState, ErrorState } from '../components/ui/Feedback'
import { SeatSelector, MapCard, StopTimeline } from '../components/ui/Trip'
import { formatVND } from '../lib/format'

const Group = ({ n, title, children }: { n: string; title: string; children: ReactNode }) => (
  <section>
    <div className="flex items-baseline gap-3 border-b border-line pb-3">
      <span className="font-mono text-sm text-primary font-semibold">{n}</span>
      <h2 className="text-2xl font-bold">{title}</h2>
    </div>
    <div className="mt-6 space-y-6">{children}</div>
  </section>
)
const Spec = ({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) => (
  <div className={className}>
    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{label}</div>
    {children}
  </div>
)
const Panel = ({ children, className = '' }: { children: ReactNode; className?: string }) => (
  <div className={`bg-surface border border-line rounded-2xl ${className.includes('p-0') ? '' : 'p-6'} ${className}`}>{children}</div>
)
const Phone = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="w-[390px] max-w-full">
    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{title}</div>
    <div className="rounded-[28px] border-2 border-navy bg-canvas overflow-hidden">{children}</div>
  </div>
)

const company: NavItem[] = [
  { id: 'dash', label: 'Tổng quan', icon: 'dashboard' },
  { id: 'veh', label: 'Phương tiện', icon: 'car' },
  { id: 'drv', label: 'Tài xế', icon: 'users' },
  { id: 'route', label: 'Tuyến đường', icon: 'route' },
  { id: 'trip', label: 'Chuyến đi', icon: 'bus', badge: 3 },
  { id: 'set', label: 'Cài đặt', icon: 'settings' },
]
const pass: NavItem[] = [
  { id: 'home', label: 'Trang chủ', icon: 'home' },
  { id: 'book', label: 'Đặt chỗ', icon: 'ticket', badge: 2 },
  { id: 'notif', label: 'Thông báo', icon: 'bell' },
  { id: 'me', label: 'Tài khoản', icon: 'user' },
]

type Row = { code: string; route: string; company: string; seats: string; price: number; status: BadgeKind; label: string }
const rows: Row[] = [
  { code: 'CH-1024', route: 'Đà Nẵng → Huế', company: 'Nhà xe Minh Tâm', seats: '12/16', price: 120000, status: 'active', label: 'Đang mở bán' },
  { code: 'CH-1025', route: 'Đà Nẵng → Hội An', company: 'Nhà xe Thành Công', seats: '16/16', price: 60000, status: 'completed', label: 'Hoàn thành' },
  { code: 'CH-1026', route: 'Hội An → Quảng Nam', company: 'Nhà xe Minh Tâm', seats: '3/9', price: 45000, status: 'pending', label: 'Chờ khởi hành' },
  { code: 'CH-1027', route: 'Huế → Đà Nẵng', company: 'Nhà xe Thành Công', seats: '0/16', price: 120000, status: 'error', label: 'Đã hủy' },
]

export default function Components() {
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const dd = [{ value: 'dn', label: 'Đà Nẵng' }, { value: 'hue', label: 'Huế' }, { value: 'ha', label: 'Hội An' }, { value: 'qn', label: 'Quảng Nam' }]

  return (
    <div className="space-y-14">
      <header className="rounded-3xl bg-navy text-white p-10">
        <span className="text-xs font-semibold tracking-widest uppercase text-teal">Phần 03</span>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Thành phần dùng chung</h1>
        <p className="mt-3 text-slate-300 max-w-2xl">
          Thư viện component React tái sử dụng cho cả bốn ứng dụng, xây dựng trên token của hệ thống thiết kế. Mã nguồn tại <code className="font-mono text-teal">src/components/ui</code>.
        </p>
      </header>

      <Group n="01" title="Nút bấm">
        <Panel className="space-y-6">
          <Spec label="Chính (Primary)"><div className="flex flex-wrap gap-4 items-end">
            <Button>Mặc định</Button><Button state="hover">Hover</Button><Button state="focus">Focus</Button><Button disabled>Vô hiệu hóa</Button><Button loading>Đang xử lý</Button>
          </div></Spec>
          <Spec label="Phụ (Secondary)"><div className="flex flex-wrap gap-4 items-end">
            <Button variant="secondary">Mặc định</Button><Button variant="secondary" state="hover">Hover</Button><Button variant="secondary" state="focus">Focus</Button><Button variant="secondary" disabled>Vô hiệu hóa</Button><Button variant="secondary" loading>Đang xử lý</Button>
          </div></Spec>
          <Spec label="Hủy / Xóa (Destructive)"><div className="flex flex-wrap gap-4 items-end">
            <Button variant="destructive">Mặc định</Button><Button variant="destructive" state="hover">Hover</Button><Button variant="destructive" state="focus">Focus</Button><Button variant="destructive" disabled>Vô hiệu hóa</Button><Button variant="destructive" loading>Đang xử lý</Button>
          </div></Spec>
          <Spec label="Kích thước lớn cho mobile (52 px) và có biểu tượng"><div className="flex flex-wrap gap-4 items-end">
            <Button size="lg" icon="search">Tìm chuyến</Button><Button size="lg" variant="secondary" icon="ticket">Vé của tôi</Button>
          </div></Spec>
        </Panel>
      </Group>

      <Group n="02" title="Biểu mẫu">
        <Panel>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-6">
            <Spec label="Ô nhập văn bản · Mặc định"><TextInput label="Họ và tên" placeholder="Nguyễn Văn An" hint="Nhập đúng họ tên trên CCCD" /></Spec>
            <Spec label="Hover"><TextInput label="Số điện thoại" placeholder="0905 123 456" state="hover" /></Spec>
            <Spec label="Focus"><TextInput label="Email" placeholder="minhtam@nhaxe.vn" state="focus" /></Spec>
            <Spec label="Vô hiệu hóa"><TextInput label="Mã nhà xe" value="NX-0012" disabled readOnly /></Spec>
            <Spec label="Thành công"><TextInput label="Biển số xe" defaultValue="43A-123.45" status="success" hint="Biển số hợp lệ" /></Spec>
            <Spec label="Lỗi"><TextInput label="Số điện thoại" defaultValue="0905 12" status="error" hint="Số điện thoại không hợp lệ" /></Spec>
            <Spec label="Mật khẩu"><PasswordInput label="Mật khẩu" defaultValue="matkhau123" hint="Tối thiểu 8 ký tự" /></Spec>
            <Spec label="Tìm kiếm"><SearchInput placeholder="Tìm tuyến, nhà xe..." /></Spec>
            <Spec label="Chọn ngày"><DatePicker label="Ngày khởi hành" /></Spec>
            <Spec label="Dropdown (menu tùy biến)" className="min-h-[260px]"><Dropdown label="Điểm đi" options={dd} value="dn" open /></Spec>
            <Spec label="Select menu (bộ chọn gốc)"><SelectMenu label="Loại xe" options={[{ value: '16', label: 'Xe 16 chỗ' }, { value: '9', label: 'Xe 9 chỗ Limousine' }, { value: '29', label: 'Xe 29 chỗ' }]} /></Spec>
            <Spec label="Chọn ngày (mở)" className="min-h-[360px]"><DatePicker label="Ngày về" open /></Spec>
            <Spec label="Checkbox"><div className="space-y-3">
              <Checkbox label="Tôi đồng ý điều khoản sử dụng" defaultChecked /><Checkbox label="Nhận thông báo chuyến đi" /><Checkbox label="Bắt buộc chấp nhận" error /><Checkbox label="Không khả dụng" disabled />
            </div></Spec>
            <Spec label="Radio"><div className="space-y-3">
              <Radio name="r1" label="Đón tại nhà" defaultChecked /><Radio name="r1" label="Đón tại bến xe" /><Radio name="r1" label="Không khả dụng" disabled />
            </div></Spec>
          </div>
        </Panel>
      </Group>

      <Group n="03" title="Trạng thái">
        <Panel>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(badgeKinds) as BadgeKind[]).map((k) => <Badge key={k} kind={k} />)}
          </div>
          <p className="mt-4 text-xs text-slate-500">Dùng chung cho chuyến đi, đặt chỗ, nhà xe, xe và tài xế; nhãn có thể thay đổi theo ngữ cảnh.</p>
        </Panel>
      </Group>

      <Group n="04" title="Điều hướng">
        <Spec label="Thanh bên và thanh trên (web · Nhà xe / Quản trị)">
          <div className="flex border border-line rounded-2xl overflow-hidden h-[460px] bg-canvas">
            <Sidebar title="RideShareHub" subtitle="Nhà xe Minh Tâm" items={company} active="veh" />
            <div className="flex-1 min-w-0">
              <Topbar breadcrumbs={['Nhà xe Minh Tâm', 'Phương tiện', 'Thêm xe mới']} user="Minh Tâm" role="Quản lý nhà xe" />
              <div className="p-6 text-sm text-slate-400">Vùng nội dung</div>
            </div>
          </div>
        </Spec>
        <div className="flex flex-wrap gap-8 items-start">
          <Spec label="Sidebar thu gọn"><div className="h-[360px] rounded-2xl overflow-hidden border border-line"><Sidebar title="" subtitle="" items={company} active="dash" collapsed /></div></Spec>
          <Phone title="Thanh điều hướng dưới (mobile)">
            <div className="h-24 grid place-items-end"><div className="w-full"><BottomNav items={pass} active="book" /></div></div>
          </Phone>
          <Spec label="Breadcrumbs"><Panel className="space-y-3"><Breadcrumbs items={['Trang chủ', 'Tuyến đường']} /><Breadcrumbs items={['Quản trị', 'Nhà xe', 'Nhà xe Thành Công']} /></Panel></Spec>
        </div>
      </Group>

      <Group n="05" title="Dữ liệu">
        <Panel className="space-y-5">
          <SearchToolbar placeholder="Tìm theo mã chuyến, tuyến..." action="Đăng chuyến" />
          <FilterBar active={filter} onChange={setFilter} filters={[{ id: 'all', label: 'Tất cả', count: 128 }, { id: 'open', label: 'Đang mở bán', count: 42 }, { id: 'wait', label: 'Chờ khởi hành', count: 31 }, { id: 'done', label: 'Hoàn thành', count: 55 }]} />
          <DataTable<Row> selectedIndex={0} rows={rows} columns={[
            { key: 'code', header: 'Mã chuyến', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
            { key: 'route', header: 'Tuyến', render: (r) => <span className="font-medium">{r.route}</span> },
            { key: 'company', header: 'Nhà xe' },
            { key: 'seats', header: 'Chỗ đã đặt' },
            { key: 'price', header: 'Giá vé', align: 'right', render: (r) => formatVND(r.price) },
            { key: 'status', header: 'Trạng thái', render: (r) => <Badge kind={r.status}>{r.label}</Badge> },
          ]} />
          <Pagination page={page} pages={5} total={128} perPage={4} onChange={setPage} />
        </Panel>
      </Group>

      <Group n="06" title="Thẻ">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
          <Spec label="Thẻ chuyến đi"><TripCard from="Đà Nẵng" to="Huế" depart="07:30" arrive="10:30" company="Nhà xe Minh Tâm" price={120000} seatsLeft={4} rating={4.8} /></Spec>
          <Spec label="Thẻ chuyến đi · sắp đầy"><TripCard from="Đà Nẵng" to="Hội An" depart="14:00" arrive="15:00" company="Nhà xe Thành Công" price={60000} seatsLeft={2} rating={4.6} /></Spec>
          <Spec label="Thẻ đặt chỗ"><BookingCard code="RSH-240718-031" route="Đà Nẵng → Huế" date="18/07/2025 · 07:30" seats="A1, A2" total={240000} status="active" statusLabel="Đã xác nhận" /></Spec>
          <Spec label="Thẻ phương tiện"><VehicleCard plate="43A-123.45" type="Ford Transit 16 chỗ" seats={16} year={2022} status="active" statusLabel="Sẵn sàng" /></Spec>
          <Spec label="Thẻ tài xế"><DriverCard name="Nguyễn Văn Hải" phone="0905 123 456" license="D · 2029" rating={4.9} trips={312} status="completed" statusLabel="Đã xác minh" /></Spec>
          <Spec label="Thẻ nhà xe (chờ duyệt)"><CompanyCard name="Nhà xe Thành Công" city="Quảng Nam" vehicles={14} routes={6} status="pending" statusLabel="Chờ duyệt" actions /></Spec>
        </div>
      </Group>

      <Group n="07" title="Thành phần khác">
        <div className="grid xl:grid-cols-2 gap-6">
          <Spec label="Modal (xem trước) · bấm để mở thật">
            <Modal inline title="Thêm tuyến đường" footer={<><Button variant="secondary">Hủy</Button><Button>Lưu tuyến</Button></>}>
              <div className="space-y-4"><TextInput label="Tên tuyến" defaultValue="Đà Nẵng – Huế" /><TextInput label="Giá vé mỗi chỗ" defaultValue={formatVND(120000)} /></div>
            </Modal>
            <Button variant="secondary" className="mt-3" onClick={() => setModal(true)}>Mở modal</Button>
          </Spec>
          <Spec label="Hộp thoại xác nhận">
            <ConfirmDialog inline destructive title="Hủy chuyến đi?" message="Chuyến Đà Nẵng → Huế lúc 07:30 có 12 hành khách đã đặt chỗ. Hành khách sẽ nhận thông báo hủy." confirmLabel="Hủy chuyến" />
            <Button variant="destructive" className="mt-3" onClick={() => setConfirm(true)}>Mở hộp thoại</Button>
          </Spec>
        </div>
        <div className="grid xl:grid-cols-3 gap-6">
          <Spec label="Mục thông báo"><div className="space-y-3">
            <NotificationItem unread title="Đặt chỗ được xác nhận" body="Chuyến Đà Nẵng → Huế, ghế A1, A2." time="2 phút trước" kind="success" />
            <NotificationItem unread title="Tài xế sắp đến điểm đón" body="Xe 43A-123.45 cách bạn 5 phút." time="10 phút trước" />
            <NotificationItem title="Chuyến bị thay đổi giờ" body="Giờ khởi hành mới: 08:00." time="Hôm qua" kind="warning" />
            <NotificationItem title="Nhà xe bị từ chối" body="Thiếu giấy phép kinh doanh vận tải." time="2 ngày trước" kind="error" />
          </div></Spec>
          <Spec label="Chọn ghế"><SeatSelector taken={['A1', 'B3', 'B4', 'C2', 'D1']} defaultSelected={['A3', 'A4']} /></Spec>
          <Spec label="Thẻ bản đồ"><MapCard title="Đà Nẵng → Huế" subtitle="Xe đang qua hầm Hải Vân" eta="Còn 45 phút" /></Spec>
        </div>
        <div className="grid xl:grid-cols-3 gap-6">
          <Spec label="Dòng thời gian điểm dừng"><StopTimeline stops={[
            { name: 'Bến xe Trung tâm Đà Nẵng', time: '07:30', type: 'pickup', status: 'done', note: '3 khách' },
            { name: '254 Nguyễn Văn Linh, Đà Nẵng', time: '07:50', type: 'pickup', status: 'current', note: '1 khách' },
            { name: 'Lăng Cô', time: '09:10', type: 'stop', status: 'upcoming' },
            { name: 'Bến xe phía Nam Huế', time: '10:30', type: 'dropoff', status: 'upcoming', note: '4 khách' },
          ]} /></Spec>
          <Spec label="Trạng thái trống"><Panel className="p-0"><EmptyState title="Chưa có chuyến đi" body="Bạn chưa đăng chuyến nào. Hãy tạo chuyến đầu tiên để nhận đặt chỗ." action="Đăng chuyến" /></Panel></Spec>
          <div className="space-y-6">
            <Spec label="Trạng thái đang tải"><Panel className="p-0"><LoadingState rows={2} /></Panel></Spec>
            <Spec label="Trạng thái lỗi"><Panel className="p-0"><ErrorState title="Không tải được dữ liệu" body="Kết nối mạng không ổn định. Vui lòng thử lại." /></Panel></Spec>
          </div>
        </div>
      </Group>

      <Modal open={modal} title="Thêm tuyến đường" onClose={() => setModal(false)} footer={<><Button variant="secondary" onClick={() => setModal(false)}>Hủy</Button><Button onClick={() => setModal(false)}>Lưu tuyến</Button></>}>
        <TextInput label="Tên tuyến" defaultValue="Hội An – Quảng Nam" />
      </Modal>
      <ConfirmDialog open={confirm} destructive loading={loading} title="Hủy chuyến đi?" message="Hành khách đã đặt chỗ sẽ nhận thông báo hủy." confirmLabel="Hủy chuyến" onCancel={() => setConfirm(false)} onConfirm={() => { setLoading(true); setTimeout(() => { setLoading(false); setConfirm(false) }, 1200) }} />
    </div>
  )
}
