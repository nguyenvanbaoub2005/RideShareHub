import { useEffect, useState } from "react";
import PhoneFrame from "./PhoneFrame";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import Badge, { type BadgeKind } from "../../components/ui/Badge";
import StarRating from "../../components/ui/Rating";
import { TextInput } from "../../components/ui/Form";
import { ConfirmDialog, Modal } from "../../components/ui/Overlays";
import { NotificationItem, EmptyState } from "../../components/ui/Feedback";
import { formatVND } from "../../lib/format";
import { cn } from "../../components/ui/cn";
import { useStore } from "./store";
import { TabBar } from "./Tabs";
import { AppBar, Footer, Card, H, Row } from "./Booking";
import { canCancel, canTrack, fmtDuration, type BookingStatus, type MyBooking } from "./data";
import type { Nav } from "./Screens";
import { AdministrativeAddressFields } from "../../address/AddressFields";
import {
  administrativeArea,
  formatAdministrativeAddress,
  validateAdministrativeAddress,
  gpsLabel,
  fitLocationPoints,
} from "../../address/model";

const dShort = (d: string) => d.split("-").reverse().slice(0, 2).join("/") + "/" + d.slice(0, 4);
const statusMeta = (b: MyBooking, clock?: Date): { kind: BadgeKind; label: string } =>
  b.status === "cancelled"
    ? { kind: "error", label: "Đã hủy" }
    : b.status === "completed"
      ? { kind: "completed", label: "Hoàn thành" }
      : canTrack(b, clock)
        ? { kind: "active", label: "Sắp khởi hành" }
        : { kind: "pending", label: "Sắp đi" };

/* PA-11 */
const tabsDef: [BookingStatus, string][] = [
  ["upcoming", "Sắp đi"],
  ["completed", "Hoàn thành"],
  ["cancelled", "Đã hủy"],
];
export function MyBookings({ go }: Nav) {
  const { bookings, setSelectedId, selected, clock } = useStore();
  const [tab, setTab] = useState<BookingStatus>(selected?.status ?? "upcoming");
  const list = bookings
    .filter((b) => b.status === tab)
    .sort((a, b) =>
      tab === "upcoming"
        ? `${a.date}${a.depart}`.localeCompare(`${b.date}${b.depart}`)
        : `${b.date}${b.depart}`.localeCompare(`${a.date}${a.depart}`),
    );
  return (
    <PhoneFrame className="bg-canvas">
      <div className="px-5 pb-3 bg-surface shrink-0">
        <h1 className="text-[26px] font-bold tracking-tight">Chuyến của tôi</h1>
        <div className="mt-3 grid grid-cols-3 p-1 bg-slate-100 rounded-full">
          {tabsDef.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                "h-10 rounded-full text-sm font-semibold transition",
                tab === k ? "bg-surface text-primary shadow-sm" : "text-slate-500",
              )}
            >
              {l}{" "}
              <span className="text-xs opacity-70">
                {bookings.filter((b) => b.status === k).length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 [scrollbar-width:none]">
        {list.length === 0 && (
          <EmptyState
            title="Chưa có chuyến nào"
            body="Các chuyến thuộc nhóm này sẽ hiển thị tại đây."
          />
        )}
        {list.map((b) => {
          const m = statusMeta(b, clock);
          return (
            <button
              key={b.id}
              onClick={() => {
                setSelectedId(b.id);
                go("bookingDetail");
              }}
              className="w-full text-left bg-surface border border-line rounded-[20px] p-4 hover:border-primary transition"
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-slate-500">{b.id}</span>
                <Badge kind={m.kind}>{m.label}</Badge>
              </div>
              <div className="mt-2 font-bold text-[17px]">
                {b.from} → {b.to}
              </div>
              <div className="mt-1 text-sm text-slate-500">
                {dShort(b.date)} · {b.depart} · {b.company}
              </div>
              <div className="mt-3 pt-3 border-t border-line flex items-center justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Icon name="ticket" className="size-4" />
                  Ghế {b.seats.join(", ")}
                </span>
                <span className="font-bold">{formatVND(b.total)}</span>
              </div>
              {b.status === "completed" && !b.rated && (
                <div className="mt-2 text-xs font-semibold text-primary flex items-center gap-1">
                  <Icon name="star" className="size-3.5" />
                  Chưa đánh giá
                </div>
              )}
            </button>
          );
        })}
      </div>
      <TabBar active="trips" go={go} />
    </PhoneFrame>
  );
}

/* PA-12 */
export function BookingDetail({ go }: Nav) {
  const { selected: b, cancelBooking, clock } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  if (!b)
    return (
      <PhoneFrame className="bg-canvas">
        <AppBar title="Chi tiết đặt chỗ" onBack={() => go("bookings")} />
        <EmptyState title="Không tìm thấy đặt chỗ" body="Vui lòng chọn lại từ danh sách." />
      </PhoneFrame>
    );
  const m = statusMeta(b, clock);
  const track = canTrack(b, clock);
  const cancel = canCancel(b, clock);
  return (
    <PhoneFrame className="bg-canvas">
      <AppBar
        title="Chi tiết đặt chỗ"
        sub={b.id}
        onBack={() => go("bookings")}
        right={
          <span className="mr-2">
            <Badge kind={m.kind}>{m.label}</Badge>
          </span>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [scrollbar-width:none]">
        <div className="rounded-[20px] bg-navy text-white p-4">
          <div className="text-xs text-slate-300">Mã đặt chỗ</div>
          <div className="mt-1 font-mono text-xl font-bold tracking-wider text-teal">{b.id}</div>
        </div>
        <Card>
          <H>Chuyến đi</H>
          <div className="font-bold text-[17px]">
            {b.from} → {b.to}
          </div>
          <div className="mt-1 flex items-center gap-3 text-sm">
            <span className="font-bold">{b.depart}</span>
            <span className="flex-1 border-t border-dashed border-slate-300" />
            <span className="font-bold">{b.arrive}</span>
          </div>
          <div className="mt-2 border-t border-line pt-2">
            <Row k="Ngày" v={dShort(b.date)} />
            <Row k="Nhà xe" v={b.company} />
            <Row k="Ghế" v={b.seats.join(", ")} />
          </div>
        </Card>
        <Card>
          <H>Hành khách</H>
          <Row k="Họ và tên" v={b.name} />
          <Row k="Số điện thoại" v={b.phone} />
        </Card>
        <Card>
          <H>Điểm đón · trả</H>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="size-8 rounded-full bg-teal/15 text-teal grid place-items-center shrink-0">
                <Icon name="pin" className="size-4" />
              </span>
              <div>
                <div className="text-xs text-slate-500">Điểm đón</div>
                <div className="font-semibold">{b.pickup}</div>
                <div className="text-[10px] text-primary font-mono">
                  GPS: {gpsLabel(b.pickupLocation)}
                </div>
                {b.pickupLocation?.instructions && (
                  <div className="text-xs text-slate-500">
                    Chỉ dẫn: {b.pickupLocation.instructions}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3">
              <span className="size-8 rounded-full bg-red-50 text-danger grid place-items-center shrink-0">
                <Icon name="pin" className="size-4" />
              </span>
              <div>
                <div className="text-xs text-slate-500">Điểm trả</div>
                <div className="font-semibold">{b.dropoff}</div>
                <div className="text-[10px] text-primary font-mono">
                  GPS: {gpsLabel(b.dropoffLocation)}
                </div>
                {b.dropoffLocation?.instructions && (
                  <div className="text-xs text-slate-500">
                    Chỉ dẫn: {b.dropoffLocation.instructions}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
        <Card>
          <H>Tài xế và phương tiện</H>
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-full bg-teal/15 text-teal font-bold text-lg grid place-items-center">
              {b.driver.name.split(" ").pop()?.[0]}
            </div>
            <div className="flex-1">
              <div className="font-semibold">{b.driver.name}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Icon name="star" filled className="size-3.5 text-warning" />
                {b.driver.rating.toFixed(1)} · {b.driver.phone}
              </div>
            </div>
            <a
              href={`tel:${b.driver.phone.replace(/\s/g, "")}`}
              className="size-10 rounded-full bg-blue-50 text-primary grid place-items-center"
              aria-label="Gọi tài xế"
            >
              <Icon name="phone" className="size-5" />
            </a>
          </div>
          <div className="mt-3 pt-3 border-t border-line">
            <Row k="Xe" v={b.vehicle} />
            <Row k="Biển số" v={b.plate} />
          </div>
        </Card>
        <Card>
          <H>Thanh toán</H>
          <Row
            k="Tổng giá vé"
            v={<span className="text-primary text-base">{formatVND(b.total)}</span>}
            strong
          />
          <p className="text-xs text-slate-500 mt-1">Thanh toán trực tiếp cho tài xế khi lên xe.</p>
        </Card>
        {b.status === "upcoming" && !cancel && (
          <div className="flex gap-2 text-xs text-slate-500 bg-slate-100 rounded-xl p-3">
            <Icon name="info" className="size-4 shrink-0" />
            Chỉ có thể hủy trước giờ khởi hành hơn 2 giờ. Chuyến này không còn đủ điều kiện hủy.
          </div>
        )}
        {b.status === "cancelled" && (
          <div className="flex gap-2 text-xs text-danger bg-red-50 rounded-xl p-3">
            <Icon name="alert" className="size-4 shrink-0" />
            Đặt chỗ này đã được hủy.
          </div>
        )}
      </div>
      {(track || cancel || b.status === "completed") && (
        <Footer>
          <div className="flex gap-3">
            {cancel && (
              <Button
                size="lg"
                variant="destructive"
                className="flex-1"
                onClick={() => setConfirm(true)}
              >
                Hủy đặt chỗ
              </Button>
            )}
            {track && (
              <Button size="lg" fullWidth icon="route" onClick={() => go("tracking")}>
                Theo dõi chuyến
              </Button>
            )}
            {b.status === "completed" &&
              (b.rated ? (
                <div className="flex-1 h-[52px] rounded-xl bg-teal-50 text-teal font-semibold grid place-items-center">
                  Bạn đã đánh giá chuyến này
                </div>
              ) : (
                <Button size="lg" fullWidth icon="star" onClick={() => go("rating")}>
                  Đánh giá chuyến đi
                </Button>
              ))}
          </div>
        </Footer>
      )}
      <ConfirmDialog
        contained
        open={confirm}
        destructive
        loading={loading}
        title="Hủy đặt chỗ?"
        message={`Đặt chỗ ${b.id} (${b.from} → ${b.to}, ${b.depart}) sẽ bị hủy và ghế được trả lại cho nhà xe.`}
        confirmLabel="Hủy đặt chỗ"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setLoading(true);
          setTimeout(() => {
            cancelBooking(b.id);
            setLoading(false);
            setConfirm(false);
          }, 700);
        }}
      />
    </PhoneFrame>
  );
}

/* PA-13 */
const W = 378,
  Hh = 330;
const PICK_T = 0.18;

export function Tracking({ go }: Nav) {
  const { selected: b, demo, completeBooking } = useStore();
  const [p, setP] = useState(demo ? 0.55 : b?.status === "completed" ? 1 : 0);
  const [confirmFinish, setConfirmFinish] = useState(false);
  useEffect(() => {
    if (!demo && p >= 1 && b?.status === "upcoming") completeBooking(b.id);
  }, [p, b?.id, b?.status, demo]);
  useEffect(() => {
    if (demo || p >= 1) return;
    const t = setTimeout(() => setP((x) => Math.min(1, x + 0.02)), 700);
    return () => clearTimeout(t);
  }, [p, demo]);
  if (!b)
    return (
      <PhoneFrame className="bg-canvas">
        <AppBar title="Theo dõi chuyến" onBack={() => go("bookingDetail")} />
        <EmptyState title="Chưa chọn chuyến" body="Vui lòng chọn lại từ danh sách." />
      </PhoneFrame>
    );

  const totalMin =
    Number(b.arrive.slice(0, 2)) * 60 +
    Number(b.arrive.slice(3)) -
    Number(b.depart.slice(0, 2)) * 60 -
    Number(b.depart.slice(3)) +
    10;
  const mid =
    (b.from === "Đà Nẵng" && b.to === "Huế") || (b.from === "Huế" && b.to === "Đà Nẵng")
      ? "Lăng Cô"
      : null;
  const next =
    p < PICK_T
      ? { name: b.pickup, t: PICK_T }
      : mid && p < 0.6
        ? { name: mid, t: 0.6 }
        : { name: b.dropoff, t: 1 };
  const eta = Math.max(0, Math.ceil((next.t - p) * totalMin));
  const status =
    p >= 1
      ? "Đã đến điểm trả"
      : p >= 0.9
        ? "Sắp đến điểm trả"
        : p >= PICK_T
          ? "Đang trên đường đến điểm trả"
          : "Tài xế đang đến điểm đón";
  const [pickupPoint, dropoffPoint] = fitLocationPoints(
    [b.pickupLocation, b.dropoffLocation],
    390,
    340,
  );
  const [px, py] = [pickupPoint.x, pickupPoint.y];
  const [dx, dy] = [dropoffPoint.x, dropoffPoint.y];
  const vx = px + (dx - px) * p,
    vy = py + (dy - py) * p;
  const pos = (x: number, y: number) => ({
    left: `${(x / 390) * 100}%`,
    top: `${(y / 340) * 100}%`,
  });

  return (
    <PhoneFrame className="bg-canvas">
      <div className="relative shrink-0" style={{ height: Hh, marginTop: -44, paddingTop: 0 }}>
        <div className="absolute inset-0 bg-[#E8EEF5] overflow-hidden" style={{ width: W }}>
          <svg
            viewBox="0 0 390 340"
            className="absolute inset-0 size-full"
            preserveAspectRatio="none"
            aria-hidden
          >
            <g stroke="#fff" strokeWidth="12" fill="none">
              <path d="M-10 90 Q130 120 210 70 T410 120" />
              <path d="M70 -10 L130 350" />
              <path d="M310 -10 L270 350" />
            </g>
            <g stroke="#fff" strokeWidth="5" fill="none">
              <path d="M-10 230 L410 260" />
              <path d="M190 -10 L215 350" />
              <path d="M-10 160 L410 180" />
            </g>
            <rect x="140" y="190" width="70" height="40" rx="10" fill="#D7E6DF" />
            <rect x="290" y="200" width="60" height="50" rx="10" fill="#D7E6DF" />
            <path
              d={`M${px} ${py} L${dx} ${dy}`}
              stroke="#BFD3F7"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d={`M${px} ${py} L${dx} ${dy}`}
              pathLength={1}
              strokeDasharray={`${p} 1`}
              stroke="#2563EB"
              strokeWidth="7"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 size-5 rounded-full bg-teal ring-4 ring-white grid place-items-center"
            style={pos(px, py)}
            title="Điểm đón"
          />
          <span
            className="absolute -translate-x-1/2 -translate-y-full text-danger"
            style={pos(dx, dy)}
            title="Điểm trả"
          >
            <Icon name="pin" filled className="size-9 drop-shadow" />
          </span>
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 size-11 rounded-full bg-primary text-white grid place-items-center ring-4 ring-primary/25 transition-all duration-700 ease-linear"
            style={pos(vx, vy)}
            title="Vị trí xe"
          >
            <Icon name="bus" className="size-5" />
          </span>
          <span
            className="absolute text-[10px] font-semibold bg-white/90 rounded-full px-2 py-0.5 -translate-x-1/2"
            style={{ ...pos(px, py + 16) }}
          >
            Điểm đón
          </span>
          <span
            className="absolute text-[10px] font-semibold bg-white/90 rounded-full px-2 py-0.5 -translate-x-1/2"
            style={{ ...pos(dx - 22, dy + 8) }}
          >
            Điểm trả
          </span>
        </div>
        <div className="absolute top-14 left-3 right-3 flex items-center justify-between z-10">
          <button
            onClick={() => go("bookingDetail")}
            className="size-11 rounded-full bg-surface grid place-items-center"
            style={{ boxShadow: "var(--shadow-card)" }}
            aria-label="Quay lại"
          >
            <Icon name="left" className="size-6" />
          </button>
          <span
            className="bg-surface rounded-full px-4 h-11 flex items-center gap-2 text-sm font-semibold"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <span className="size-2 rounded-full bg-success animate-pulse" />
            Trực tiếp
          </span>
        </div>
      </div>

      <div
        className="flex-1 -mt-5 relative z-10 bg-canvas rounded-t-[28px] overflow-y-auto px-4 pt-5 pb-4 space-y-3 [scrollbar-width:none]"
        style={{ boxShadow: "0 -8px 24px rgba(15,23,42,.08)" }}
      >
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-slate-500">Trạng thái chuyến</div>
              <div className="font-bold text-[17px] leading-tight mt-0.5">{status}</div>
            </div>
            {p >= 1 ? (
              <Badge kind="completed">Hoàn thành</Badge>
            ) : (
              <div className="text-right">
                <div className="text-2xl font-bold text-primary leading-none">
                  {eta}
                  <span className="text-xs font-semibold"> phút</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">đến điểm tiếp theo</div>
              </div>
            )}
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${p * 100}%` }}
            />
          </div>
          {p < 1 && (
            <div className="mt-3 pt-3 border-t border-line text-sm space-y-1.5">
              <div className="flex gap-2">
                <Icon name="pin" className="size-4 text-teal mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500">Điểm dừng tiếp theo: </span>
                  <span className="font-semibold">{next.name}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Icon name="clock" className="size-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="text-slate-500">Dự kiến đến điểm trả: </span>
                  <span className="font-semibold">{b.arrive}</span>
                  <span className="text-slate-400"> · hành trình {fmtDuration(totalMin - 10)}</span>
                </div>
              </div>
            </div>
          )}
        </Card>
        <Card className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-teal/15 text-teal font-bold text-lg grid place-items-center">
            {b.driver.name.split(" ").pop()?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold">{b.driver.name}</div>
            <div className="text-xs text-slate-500">
              {b.vehicle} · {b.plate}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
              <Icon name="star" filled className="size-3.5 text-warning" />
              {b.driver.rating.toFixed(1)}
            </div>
          </div>
          <a
            href={`tel:${b.driver.phone.replace(/\s/g, "")}`}
            className="size-11 rounded-full bg-primary text-white grid place-items-center"
            aria-label="Gọi tài xế"
          >
            <Icon name="phone" className="size-5" />
          </a>
        </Card>
        <div className="text-xs text-slate-400 text-center">
          {b.company} · Cập nhật vị trí mỗi vài giây
        </div>
      </div>
      <Footer>
        {p >= 1 ? (
          <Button size="lg" fullWidth icon="star" onClick={() => go("rating")}>
            Đánh giá chuyến đi
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button size="lg" variant="secondary" onClick={() => setConfirmFinish(true)}>
              Kết thúc chuyến (demo)
            </Button>
            <Button size="lg" className="flex-1" disabled>
              Đánh giá sau chuyến đi
            </Button>
          </div>
        )}
      </Footer>
      <ConfirmDialog
        contained
        open={confirmFinish}
        title="Kết thúc chuyến mô phỏng?"
        message="Chuyến sẽ chuyển sang hoàn thành trong phiên thử để bạn tiếp tục đánh giá. Không gửi cập nhật đến tài xế hoặc nhà xe thật."
        confirmLabel="Kết thúc chuyến"
        onCancel={() => setConfirmFinish(false)}
        onConfirm={() => {
          setP(1);
          setConfirmFinish(false);
        }}
      />
    </PhoneFrame>
  );
}

/* PA-14 */
export function Notifications({ go }: Nav) {
  const { notifs, markRead, markAllRead, setSelectedId, unread } = useStore();
  const [only, setOnly] = useState(false);
  const list = notifs.filter((n) => !only || n.unread);
  return (
    <PhoneFrame className="bg-canvas">
      <div className="px-5 pb-3 bg-surface shrink-0">
        <div className="flex items-end justify-between">
          <h1 className="text-[26px] font-bold tracking-tight">Thông báo</h1>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-sm font-semibold text-primary pb-1">
              Đánh dấu đã đọc
            </button>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          {(
            [
              [false, "Tất cả"],
              [true, `Chưa đọc (${unread})`],
            ] as const
          ).map(([k, l]) => (
            <button
              key={l}
              onClick={() => setOnly(k)}
              className={cn(
                "h-9 px-4 rounded-full text-sm font-medium border",
                only === k ? "bg-navy text-white border-navy" : "border-line text-slate-600",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 [scrollbar-width:none]">
        {list.length === 0 && (
          <EmptyState title="Không có thông báo chưa đọc" body="Bạn đã xem hết thông báo." />
        )}
        {list.map((n) => (
          <button
            key={n.id}
            className="block w-full text-left"
            onClick={() => {
              markRead(n.id);
              setSelectedId(n.bookingId);
              go(n.target);
            }}
          >
            <NotificationItem
              kind={n.kind}
              title={n.title}
              body={n.body}
              time={n.time}
              unread={n.unread}
            />
          </button>
        ))}
      </div>
      <TabBar active="notif" go={go} />
    </PhoneFrame>
  );
}

/* PA-15 */
export function Rating({ go }: Nav) {
  const { selected: b, rateBooking } = useStore();
  const [trip, setTrip] = useState(0);
  const [driver, setDriver] = useState(0);
  const [company, setCompany] = useState(0);
  const [text, setText] = useState("");
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<"form" | "loading" | "done">("form");
  if (!b)
    return (
      <PhoneFrame className="bg-canvas">
        <AppBar title="Đánh giá" onBack={() => go("bookings")} />
        <EmptyState title="Chưa chọn chuyến" body="Vui lòng chọn chuyến để đánh giá." />
      </PhoneFrame>
    );
  const labels = ["", "Rất tệ", "Chưa tốt", "Bình thường", "Tốt", "Tuyệt vời"];
  const rows: [string, string, number, (n: number) => void][] = [
    ["Chuyến đi", "Trải nghiệm chung", trip, setTrip],
    ["Tài xế", b.driver.name, driver, setDriver],
    ["Nhà xe", b.company, company, setCompany],
  ];
  const submit = () => {
    setTried(true);
    if (!trip || !driver || !company || b.status !== "completed" || b.rated) return;
    setState("loading");
    setTimeout(() => {
      rateBooking(b.id);
      setState("done");
    }, 800);
  };
  if (state === "done") {
    return (
      <PhoneFrame className="bg-canvas">
        <div className="flex-1 grid place-items-center text-center px-8">
          <div>
            <div className="mx-auto size-24 rounded-full bg-success/15 grid place-items-center">
              <span className="size-16 rounded-full bg-success text-white grid place-items-center">
                <Icon name="check" className="size-9" />
              </span>
            </div>
            <h1 className="mt-5 text-2xl font-bold">Cảm ơn bạn đã đánh giá!</h1>
            <p className="mt-2 text-sm text-slate-500">
              Phản hồi của bạn giúp {b.company} và cộng đồng RideShareHub cải thiện chất lượng
              chuyến đi.
            </p>
          </div>
        </div>
        <Footer>
          <Button size="lg" fullWidth onClick={() => go("bookings")}>
            Về chuyến của tôi
          </Button>
        </Footer>
      </PhoneFrame>
    );
  }
  return (
    <PhoneFrame className="bg-canvas">
      <AppBar
        title="Đánh giá chuyến đi"
        sub={`${b.from} → ${b.to} · ${dShort(b.date)}`}
        icon="x"
        onBack={() => go("bookingDetail")}
      />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [scrollbar-width:none]">
        {rows.map(([t, sub, v, set]) => (
          <Card key={t} className="text-center">
            <div className="font-semibold">{t}</div>
            <div className="text-xs text-slate-500">{sub}</div>
            <div className="mt-3 flex justify-center">
              <StarRating value={v} onChange={set} label={t} />
            </div>
            <div
              className={cn(
                "mt-2 text-sm h-5 font-medium",
                v ? "text-warning" : tried ? "text-danger" : "text-slate-400",
              )}
            >
              {v ? labels[v] : tried ? "Vui lòng chọn số sao" : "Chạm để đánh giá"}
            </div>
          </Card>
        ))}
        <Card>
          <label className="block">
            <span className="text-sm font-semibold">
              Nhận xét <span className="font-normal text-slate-400">(không bắt buộc)</span>
            </span>
            <textarea
              value={text}
              maxLength={300}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Chia sẻ trải nghiệm của bạn về tài xế, xe và chuyến đi..."
              className="mt-2 w-full rounded-xl border border-line px-3.5 py-3 text-sm outline-none resize-none placeholder:text-slate-400 hover:border-slate-300 focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </label>
          <div className="text-right text-xs text-slate-400">{text.length}/300</div>
        </Card>
      </div>
      <Footer>
        <Button
          size="lg"
          fullWidth
          disabled={b.status !== "completed" || b.rated}
          loading={state === "loading"}
          onClick={submit}
        >
          {b.rated
            ? "Bạn đã đánh giá chuyến này"
            : b.status !== "completed"
              ? "Chuyến chưa hoàn thành"
              : "Gửi đánh giá"}
        </Button>
      </Footer>
    </PhoneFrame>
  );
}

/* PA-16 */
function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn("w-12 h-7 rounded-full p-0.5 transition", on ? "bg-primary" : "bg-slate-300")}
    >
      <span
        className={cn("block size-6 rounded-full bg-white transition", on && "translate-x-5")}
        style={{ boxShadow: "var(--shadow-card)" }}
      />
    </button>
  );
}

export function Profile({ go }: Nav) {
  const { profile, setProfile, bookings, preferences, setPreferences } = useStore();
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [tried, setTried] = useState(false);
  const [logout, setLogout] = useState(false);
  const push = preferences.push;
  const setPush = (value: boolean) => setPreferences({ push: value });
  const tripNotif = preferences.reminders;
  const setTripNotif = (value: boolean) => setPreferences({ reminders: value });
  const [info, setInfo] = useState("");
  const err = {
    name: draft.name.trim().length < 2 ? "Vui lòng nhập họ và tên" : "",
    email: !/^\S+@\S+\.\S+$/.test(draft.email) ? "Email không hợp lệ" : "",
    phone: !/^(0|\+84)\d{9}$/.test(draft.phone.replace(/\s/g, ""))
      ? "Số điện thoại không hợp lệ"
      : "",
    address:
      Object.values(validateAdministrativeAddress(draft.administrativeAddress, false)).find(
        Boolean,
      ) ?? "",
  };
  const done = bookings.filter((b) => b.status === "completed").length;
  const rows: [string, string, string][] = [
    ["user", "Họ và tên", profile.name],
    ["bell", "Email", profile.email],
    ["phone", "Số điện thoại", profile.phone],
    [
      "pin",
      "Địa chỉ hành chính",
      formatAdministrativeAddress(profile.administrativeAddress) || "Chưa cập nhật",
    ],
  ];
  return (
    <PhoneFrame statusLight className="bg-canvas">
      <div className="flex-1 overflow-y-auto pb-4 [scrollbar-width:none]">
        <div className="bg-navy text-white -mt-11 pt-14 px-5 pb-14 text-center relative overflow-hidden">
          <div className="absolute -right-16 -top-16 size-56 rounded-full bg-primary/40 blur-3xl" />
          <div className="relative mx-auto size-20 rounded-full bg-teal text-navy font-bold text-3xl grid place-items-center ring-4 ring-white/20">
            {profile.name.trim().split(" ").pop()?.[0]}
          </div>
          <h1 className="relative mt-3 text-xl font-bold">{profile.name}</h1>
          <p className="relative text-sm text-slate-300">{profile.email}</p>
        </div>
        <div
          className="-mt-8 mx-4 relative bg-surface border border-line rounded-[20px] grid grid-cols-3 divide-x divide-line py-4 text-center"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          {[
            [String(done), "Chuyến đã đi"],
            [String(bookings.filter((b) => b.status === "upcoming").length), "Sắp tới"],
            ["4,9", "Đánh giá"],
          ].map(([v, l]) => (
            <div key={l}>
              <div className="text-xl font-bold text-primary">{v}</div>
              <div className="text-xs text-slate-500">{l}</div>
            </div>
          ))}
        </div>
        <div className="px-4 mt-4 space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-1">
              <H>Thông tin cá nhân</H>
              <button
                onClick={() => {
                  setDraft(profile);
                  setTried(false);
                  setEdit(true);
                }}
                className="text-sm font-semibold text-primary -mt-2.5 flex items-center gap-1"
              >
                Chỉnh sửa hồ sơ
              </button>
            </div>
            <div className="divide-y divide-line">
              {rows.map(([i, k, v]) => (
                <div key={k} className="flex items-center gap-3 py-2.5">
                  <Icon name={i} className="size-5 text-slate-400" />
                  <div>
                    <div className="text-xs text-slate-500">{k}</div>
                    <div className="text-sm font-medium">{v}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <H>Cài đặt tài khoản</H>
            <div className="divide-y divide-line">
              <div className="flex items-center justify-between py-3 text-sm">
                <span>Thông báo đẩy</span>
                <Toggle on={push} onChange={setPush} label="Thông báo đẩy" />
              </div>
              <div className="flex items-center justify-between py-3 text-sm">
                <span>Nhắc nhở chuyến đi</span>
                <Toggle on={tripNotif} onChange={setTripNotif} label="Nhắc nhở chuyến đi" />
              </div>
              {["Đổi mật khẩu", "Ngôn ngữ · Tiếng Việt", "Điều khoản và chính sách"].map((l) => (
                <button
                  key={l}
                  onClick={() => setInfo(l)}
                  className="w-full flex items-center justify-between py-3 text-sm text-left"
                >
                  {l}
                  <Icon name="right" className="size-4 text-slate-400" />
                </button>
              ))}
            </div>
          </Card>
          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon="logout"
            className="!text-danger"
            onClick={() => setLogout(true)}
          >
            Đăng xuất
          </Button>
          <p className="text-center text-xs text-slate-400">RideShareHub · Phiên bản 1.0 (MVP)</p>
        </div>
      </div>
      <TabBar active="me" go={go} />

      {edit && (
        <div
          className="absolute inset-0 z-40 bg-navy/50 flex items-end"
          onClick={() => setEdit(false)}
        >
          <div
            className="bg-surface w-full rounded-t-[28px] p-5 pb-8 max-h-full overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: "var(--shadow-modal)" }}
          >
            <div className="mx-auto w-10 h-1.5 rounded-full bg-slate-200 mb-4" />
            <h3 className="text-lg font-bold mb-4">Chỉnh sửa hồ sơ</h3>
            <div className="space-y-4">
              <TextInput
                label="Họ và tên"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                status={tried && err.name ? "error" : "default"}
                hint={tried ? err.name : ""}
              />
              <TextInput
                label="Email"
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                status={tried && err.email ? "error" : "default"}
                hint={tried ? err.email : ""}
              />
              <TextInput
                label="Số điện thoại"
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                status={tried && err.phone ? "error" : "default"}
                hint={tried ? err.phone : ""}
              />
              <AdministrativeAddressFields
                compact
                required={false}
                label="Địa chỉ hành chính (không bắt buộc)"
                value={draft.administrativeAddress}
                tried={tried}
                onChange={(administrativeAddress) =>
                  setDraft({
                    ...draft,
                    administrativeAddress,
                    city: administrativeArea(administrativeAddress),
                  })
                }
              />
            </div>
            <div className="mt-5 flex gap-3">
              <Button size="lg" variant="secondary" onClick={() => setEdit(false)}>
                Hủy
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={() => {
                  setTried(true);
                  if (!Object.values(err).some(Boolean)) {
                    setProfile(draft);
                    setEdit(false);
                  }
                }}
              >
                Lưu thay đổi
              </Button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        contained
        open={logout}
        destructive
        title="Đăng xuất?"
        message="Bạn cần đăng nhập lại để đặt chỗ và xem chuyến đi của mình."
        confirmLabel="Đăng xuất"
        onCancel={() => setLogout(false)}
        onConfirm={() => {
          setLogout(false);
          go("login");
        }}
      />
      <Modal
        contained
        open={!!info}
        title={info}
        onClose={() => setInfo("")}
        footer={<Button onClick={() => setInfo("")}>Đã hiểu</Button>}
      >
        <div>
          {info === "Đổi mật khẩu"
            ? "Nguyên mẫu chưa xác thực tài khoản thật. Chọn Quên mật khẩu tại màn hình đăng nhập để thử yêu cầu khôi phục."
            : info.startsWith("Ngôn ngữ")
              ? "Tiếng Việt là ngôn ngữ duy nhất của MVP."
              : "RideShareHub kết nối hành khách với nhà xe được phê duyệt. Hãy cung cấp thông tin đúng, có mặt đúng giờ và chỉ hủy chuyến khi đủ điều kiện. Dữ liệu của phiên thử không được gửi lên máy chủ."}
        </div>
      </Modal>
    </PhoneFrame>
  );
}

export const accountScreens = [
  { id: "bookings", code: "PA-11", title: "Chuyến của tôi", Comp: MyBookings },
  { id: "bookingDetail", code: "PA-12", title: "Chi tiết đặt chỗ", Comp: BookingDetail },
  { id: "tracking", code: "PA-13", title: "Theo dõi chuyến đi", Comp: Tracking },
  { id: "notifications", code: "PA-14", title: "Thông báo", Comp: Notifications },
  { id: "rating", code: "PA-15", title: "Đánh giá", Comp: Rating },
  { id: "profile", code: "PA-16", title: "Cá nhân", Comp: Profile },
] as const;
