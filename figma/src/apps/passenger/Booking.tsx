import { useState, type ReactNode } from "react";
import PhoneFrame from "./PhoneFrame";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import { TextInput, Field, Checkbox, Radio } from "../../components/ui/Form";
import { StopTimeline } from "../../components/ui/Trip";
import { EmptyState } from "../../components/ui/Feedback";
import { formatVND } from "../../lib/format";
import { cn } from "../../components/ui/cn";
import { useStore } from "./store";
import type { Nav } from "./Screens";
import { bookingValidation, reservationKey } from "./validation";
import { LocationPicker } from "../../address/AddressFields";
import {
  applyFilters,
  activeFilterCount,
  assignSeats,
  drivers,
  bookBlock,
  companies,
  defaultFilters,
  fmtDate,
  fmtDateShort,
  fmtDuration,
  pickupPoints,
  stopsFor,
  type Filters,
  type Trip,
} from "./data";

export function AppBar({
  title,
  sub,
  onBack,
  icon = "left",
  right,
}: {
  title: string;
  sub?: string;
  onBack?: () => void;
  icon?: string;
  right?: ReactNode;
}) {
  return (
    <div className="px-3 pb-3 flex items-center gap-1 bg-surface border-b border-line shrink-0">
      <button
        onClick={onBack}
        className="size-11 rounded-full hover:bg-slate-100 grid place-items-center"
        aria-label="Quay lại"
      >
        <Icon name={icon} className="size-6" />
      </button>
      <div className="flex-1 min-w-0 leading-tight">
        <div className="font-bold text-[17px] truncate">{title}</div>
        {sub && <div className="text-xs text-slate-500 truncate">{sub}</div>}
      </div>
      {right}
    </div>
  );
}
export const Footer = ({ children }: { children: ReactNode }) => (
  <div className="bg-surface border-t border-line px-4 pt-3 pb-8 shrink-0">{children}</div>
);
export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div
    className={cn("bg-surface border border-line rounded-[20px] p-4", className)}
    style={{ boxShadow: "var(--shadow-card)" }}
  >
    {children}
  </div>
);
export const H = ({ children }: { children: ReactNode }) => (
  <h3 className="text-[13px] font-semibold uppercase tracking-wide text-slate-500 mb-2.5">
    {children}
  </h3>
);
export const Row = ({ k, v, strong }: { k: string; v: ReactNode; strong?: boolean }) => (
  <div className="flex justify-between gap-4 text-sm py-1.5">
    <span className="text-slate-500">{k}</span>
    <span className={cn("text-right", strong ? "font-bold" : "font-medium")}>{v}</span>
  </div>
);

function statusBadge(t: Trip, pax: number) {
  if (t.status === "cancelled") return <Badge kind="error">Đã hủy</Badge>;
  if (t.status === "completed") return <Badge kind="completed">Đã hoàn thành</Badge>;
  if (t.seatsLeft === 0) return <Badge kind="warning">Hết chỗ</Badge>;
  if (pax > t.seatsLeft) return <Badge kind="warning">Không đủ chỗ</Badge>;
  return null;
}

/* PA-05 */
export function Results({ go }: Nav) {
  const { search, filters, setFilters, setTripId, setBooking, availableTrips } = useStore();
  const all = availableTrips;
  const list = applyFilters(all, filters);
  const n = activeFilterCount(filters);
  const sorts: [Filters["sort"], string][] = [
    ["time", "Giờ đi sớm"],
    ["price", "Giá thấp nhất"],
    ["rating", "Đánh giá cao"],
  ];
  return (
    <PhoneFrame className="bg-canvas">
      <AppBar
        title={`${search.from} → ${search.to}`}
        sub={`${fmtDateShort(search.date)} · ${search.pax} khách`}
        onBack={() => go("home")}
        right={
          <button
            onClick={() => go("filters")}
            className="relative h-10 px-3.5 rounded-full border border-line bg-surface flex items-center gap-1.5 text-sm font-semibold mr-1"
          >
            <Icon name="filter" className="size-4" />
            Lọc
            {n > 0 && (
              <span className="size-5 rounded-full bg-primary text-white text-[11px] grid place-items-center">
                {n}
              </span>
            )}
          </button>
        }
      />
      <div className="px-4 py-3 flex gap-2 overflow-x-auto shrink-0 [scrollbar-width:none]">
        {sorts.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setFilters({ ...filters, sort: k })}
            className={cn(
              "h-9 px-4 rounded-full text-sm font-medium border whitespace-nowrap",
              filters.sort === k
                ? "bg-navy text-white border-navy"
                : "bg-surface border-line text-slate-600",
            )}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-3 [scrollbar-width:none]">
        <div className="text-sm text-slate-500">{list.length} chuyến phù hợp</div>
        {list.length === 0 && (
          <EmptyState
            title={
              search.from === search.to ? "Điểm đi và điểm đến trùng nhau" : "Không tìm thấy chuyến"
            }
            body={
              search.from === search.to
                ? "Vui lòng chọn lại điểm đến."
                : "Thử thay đổi bộ lọc hoặc ngày đi."
            }
            action={n ? "Xóa bộ lọc" : search.from === search.to ? "Chọn lại" : undefined}
            onAction={() => (n ? setFilters(defaultFilters) : go("home"))}
          />
        )}
        {list.map((t) => {
          const block = bookBlock(t, search.pax);
          return (
            <button
              key={t.id}
              disabled={!!block}
              onClick={() => {
                setTripId(t.id);
                setBooking({
                  seats: search.pax,
                  pickup: search.fromLocation?.kind === "point" ? search.fromLocation.address : "",
                  pickupLocation:
                    search.fromLocation?.kind === "point" ? search.fromLocation : null,
                  dropoff: search.toLocation?.kind === "point" ? search.toLocation.address : "",
                  dropoffLocation: search.toLocation?.kind === "point" ? search.toLocation : null,
                  pickupCustom: "",
                  dropoffCustom: "",
                });
                go("details");
              }}
              className={cn(
                "w-full text-left bg-surface border border-line rounded-[20px] p-4 transition",
                block ? "opacity-60 cursor-not-allowed" : "hover:border-primary active:scale-[.99]",
              )}
              style={{ boxShadow: "var(--shadow-card)" }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-sm">{t.company}</span>
                <span className="flex items-center gap-2">
                  {statusBadge(t, search.pax)}
                  <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                    <Icon name="star" filled className="size-3.5 text-warning" />
                    {t.rating.toFixed(1)}
                  </span>
                </span>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <div>
                  <div className="text-[22px] font-bold leading-none">{t.depart}</div>
                  <div className="text-xs text-slate-500 mt-1">{t.from}</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-[11px] text-slate-500">{fmtDuration(t.durationMin)}</div>
                  <div className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-teal" />
                    <span className="flex-1 border-t border-dashed border-slate-300" />
                    <Icon name="bus" className="size-4 text-primary" />
                    <span className="flex-1 border-t border-dashed border-slate-300" />
                    <span className="size-1.5 rounded-full bg-danger" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[22px] font-bold leading-none">{t.arrive}</div>
                  <div className="text-xs text-slate-500 mt-1">{t.to}</div>
                </div>
              </div>
              <div className="mt-3 text-xs text-slate-500 flex items-center gap-1.5">
                <Icon name="car" className="size-3.5" />
                {t.vehicle}
              </div>
              <div className="mt-3 pt-3 border-t border-line flex items-center justify-between">
                <span
                  className={cn(
                    "text-xs font-semibold",
                    block ? "text-slate-400" : t.seatsLeft <= 3 ? "text-warning" : "text-teal",
                  )}
                >
                  {block ?? `Còn ${t.seatsLeft}/${t.seatsTotal} chỗ`}
                </span>
                <span className="text-lg font-bold text-primary">
                  {formatVND(t.price)}
                  <span className="text-xs font-normal text-slate-500">/chỗ</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </PhoneFrame>
  );
}

/* PA-06 */
const timeOpts: [Filters["time"], string, string][] = [
  ["all", "Tất cả", ""],
  ["morning", "Sáng", "05:00–12:00"],
  ["afternoon", "Chiều", "12:00–18:00"],
  ["evening", "Tối", "Sau 18:00"],
];
export function FiltersScreen({ go }: Nav) {
  const { filters, setFilters, availableTrips } = useStore();
  const [d, setD] = useState<Filters>(filters);
  const count = applyFilters(availableTrips, d).length;
  const toggleCo = (c: string) =>
    setD({
      ...d,
      companies: d.companies.includes(c) ? d.companies.filter((x) => x !== c) : [...d.companies, c],
    });
  return (
    <PhoneFrame className="bg-canvas">
      <AppBar
        title="Bộ lọc"
        icon="x"
        onBack={() => go("results")}
        right={
          <button
            onClick={() => setD(defaultFilters)}
            className="text-sm font-semibold text-primary px-3"
          >
            Đặt lại
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [scrollbar-width:none]">
        <Card>
          <H>Giờ khởi hành</H>
          <div className="grid grid-cols-2 gap-2">
            {timeOpts.map(([k, l, s]) => (
              <button
                key={k}
                onClick={() => setD({ ...d, time: k })}
                className={cn(
                  "rounded-xl border px-3 py-2.5 text-left",
                  d.time === k ? "border-primary bg-blue-50 text-primary" : "border-line",
                )}
              >
                <div className="font-semibold text-sm">{l}</div>
                {s && <div className="text-[11px] text-slate-500">{s}</div>}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <H>Khoảng giá mỗi chỗ</H>
          <div className="text-center font-bold text-primary">
            {formatVND(d.min)} – {d.max >= 300000 ? `${formatVND(300000)}+` : formatVND(d.max)}
          </div>
          <div className="mt-3 space-y-3">
            {(
              [
                ["Từ", "min"],
                ["Đến", "max"],
              ] as const
            ).map(([l, k]) => (
              <label key={k} className="flex items-center gap-3 text-xs text-slate-500">
                <span className="w-7">{l}</span>
                <input
                  type="range"
                  min={0}
                  max={300000}
                  step={5000}
                  value={d[k]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setD(
                      k === "min"
                        ? { ...d, min: Math.min(v, d.max) }
                        : { ...d, max: Math.max(v, d.min) },
                    );
                  }}
                  className="flex-1 accent-[#2563EB]"
                />
              </label>
            ))}
          </div>
        </Card>
        <Card>
          <H>Số chỗ trống tối thiểu</H>
          <div className="flex items-center justify-between">
            <span className="text-sm">
              Ít nhất <b>{d.minSeats}</b> chỗ trống
            </span>
            <div className="flex items-center gap-2.5 bg-slate-50 border border-line rounded-full p-1">
              <button
                onClick={() => setD({ ...d, minSeats: Math.max(1, d.minSeats - 1) })}
                disabled={d.minSeats === 1}
                className="size-9 rounded-full bg-surface border border-line text-lg disabled:text-slate-300"
                aria-label="Giảm"
              >
                −
              </button>
              <span className="w-5 text-center font-bold">{d.minSeats}</span>
              <button
                onClick={() => setD({ ...d, minSeats: Math.min(8, d.minSeats + 1) })}
                disabled={d.minSeats === 8}
                className="size-9 rounded-full bg-primary text-white text-lg disabled:bg-slate-200"
                aria-label="Tăng"
              >
                +
              </button>
            </div>
          </div>
        </Card>
        <Card>
          <H>Nhà xe</H>
          <div className="space-y-3.5">
            {companies.map((c) => (
              <Checkbox
                key={c}
                label={c}
                checked={d.companies.includes(c)}
                onChange={() => toggleCo(c)}
              />
            ))}
          </div>
        </Card>
        <Card>
          <H>Sắp xếp theo</H>
          <div className="space-y-3.5">
            {(
              [
                ["time", "Giờ đi sớm nhất"],
                ["price", "Giá thấp nhất"],
                ["rating", "Đánh giá cao nhất"],
              ] as const
            ).map(([k, l]) => (
              <Radio
                key={k}
                name="sort"
                label={l}
                checked={d.sort === k}
                onChange={() => setD({ ...d, sort: k })}
              />
            ))}
          </div>
        </Card>
      </div>
      <Footer>
        <Button
          size="lg"
          fullWidth
          onClick={() => {
            setFilters(d);
            go("results");
          }}
        >
          Áp dụng · {count} chuyến
        </Button>
      </Footer>
    </PhoneFrame>
  );
}

/* PA-07 */
export function Details({ go }: Nav) {
  const { trip: t, search, setBooking } = useStore();
  if (!t)
    return (
      <PhoneFrame className="bg-canvas">
        <AppBar title="Chi tiết chuyến" onBack={() => go("results")} />
        <EmptyState title="Chưa chọn chuyến" body="Vui lòng chọn một chuyến từ kết quả tìm kiếm." />
      </PhoneFrame>
    );
  const block = bookBlock(t, 1);
  const pct = ((t.seatsTotal - t.seatsLeft) / t.seatsTotal) * 100;
  return (
    <PhoneFrame className="bg-canvas">
      <AppBar title="Chi tiết chuyến" sub={`${t.from} → ${t.to}`} onBack={() => go("results")} />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [scrollbar-width:none]">
        <Card>
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-xl bg-navy text-white grid place-items-center">
              <Icon name="building" className="size-6" />
            </div>
            <div className="flex-1">
              <div className="font-bold">{t.company}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <Icon name="star" filled className="size-3.5 text-warning" />
                {t.rating.toFixed(1)} · {t.reviews} đánh giá
              </div>
            </div>
            <Badge kind="completed">Đã xác minh</Badge>
          </div>
        </Card>
        <Card>
          <H>Lịch trình · {fmtDate(search.date)}</H>
          <div className="flex items-center gap-3">
            <div>
              <div className="text-2xl font-bold">{t.depart}</div>
              <div className="text-xs text-slate-500">{t.from}</div>
            </div>
            <div className="flex-1 text-center text-[11px] text-slate-500">
              <div>{fmtDuration(t.durationMin)}</div>
              <div className="border-t border-dashed border-slate-300 my-1" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{t.arrive}</div>
              <div className="text-xs text-slate-500">{t.to}</div>
            </div>
          </div>
        </Card>
        <Card>
          <H>Phương tiện</H>
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-blue-50 text-primary grid place-items-center">
              <Icon name="car" className="size-6" />
            </div>
            <div>
              <div className="font-semibold text-sm">{t.vehicle}</div>
              <div className="text-xs text-slate-500">Biển số {t.plate}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {t.amenities.map((a) => (
              <span
                key={a}
                className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600"
              >
                {a}
              </span>
            ))}
          </div>
        </Card>
        <Card>
          <H>Chỗ trống</H>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-teal">
              {t.seatsLeft}
              <span className="text-sm font-medium text-slate-500"> / {t.seatsTotal} chỗ</span>
            </span>
            <span className="text-xs text-slate-500">Đã đặt {t.seatsTotal - t.seatsLeft}</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </Card>
        <div>
          <H>Lộ trình</H>
          <StopTimeline stops={stopsFor(t)} />
        </div>
        <Card>
          <H>Điểm đón và điểm trả</H>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3">
              <span className="size-8 rounded-full bg-teal/15 text-teal grid place-items-center shrink-0">
                <Icon name="pin" className="size-4" />
              </span>
              <div>
                <div className="font-semibold">Điểm đón</div>
                <div className="text-slate-500 text-xs">
                  {pickupPoints(t.from).join(" · ")} · hoặc địa chỉ riêng trong nội thành
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <span className="size-8 rounded-full bg-red-50 text-danger grid place-items-center shrink-0">
                <Icon name="pin" className="size-4" />
              </span>
              <div>
                <div className="font-semibold">Điểm trả</div>
                <div className="text-slate-500 text-xs">
                  {pickupPoints(t.to).join(" · ")} · hoặc địa chỉ riêng trong nội thành
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      <Footer>
        {block && (
          <div className="mb-3 flex items-center gap-2 text-sm text-danger bg-red-50 rounded-xl px-3 py-2">
            <Icon name="alert" className="size-4" />
            {block}
          </div>
        )}
        <div className="flex items-center gap-4">
          <div>
            <div className="text-xs text-slate-500">Giá mỗi chỗ</div>
            <div className="text-xl font-bold text-primary">{formatVND(t.price)}</div>
          </div>
          <Button
            size="lg"
            className="flex-1"
            disabled={!!block}
            onClick={() => {
              setBooking({ seats: Math.min(search.pax, t.seatsLeft) });
              go("booking");
            }}
          >
            Đặt chỗ
          </Button>
        </div>
      </Footer>
    </PhoneFrame>
  );
}

/* PA-08 */
export function BookingForm({ go }: Nav) {
  const { trip: t, booking: b, setBooking } = useStore();
  const [tried, setTried] = useState(false);
  if (!t)
    return (
      <PhoneFrame className="bg-canvas">
        <AppBar title="Đặt chỗ" onBack={() => go("results")} />
        <EmptyState title="Chưa chọn chuyến" body="Vui lòng chọn một chuyến từ kết quả tìm kiếm." />
      </PhoneFrame>
    );
  const block = bookBlock(t, 1);
  const maxSeats = Math.min(t.seatsLeft, 6);
  const e = bookingValidation(b, t);
  const valid = !Object.values(e).some(Boolean) && !block;
  const show = (k: keyof typeof e) => (tried ? e[k] : "");
  return (
    <PhoneFrame className="bg-canvas">
      <AppBar
        title="Đặt chỗ"
        sub={`${t.company} · ${t.depart} · ${t.from} → ${t.to}`}
        onBack={() => go("details")}
      />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [scrollbar-width:none]">
        {block && (
          <div className="flex items-center gap-2 text-sm text-danger bg-red-50 rounded-xl px-3 py-2.5">
            <Icon name="alert" className="size-4" />
            {block}. Không thể đặt chỗ.
          </div>
        )}
        <Card>
          <H>Số chỗ</H>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold">Số lượng chỗ</div>
              <div className="text-xs text-slate-500">
                Còn {t.seatsLeft} chỗ · tối đa {maxSeats} chỗ/lần
              </div>
            </div>
            <div className="flex items-center gap-2.5 bg-slate-50 border border-line rounded-full p-1">
              <button
                onClick={() => setBooking({ seats: Math.max(1, b.seats - 1) })}
                disabled={b.seats <= 1 || !!block}
                className="size-9 rounded-full bg-surface border border-line text-lg disabled:text-slate-300"
                aria-label="Giảm"
              >
                −
              </button>
              <span className="w-5 text-center font-bold">{b.seats}</span>
              <button
                onClick={() => setBooking({ seats: Math.min(maxSeats, b.seats + 1) })}
                disabled={b.seats >= maxSeats || !!block}
                className="size-9 rounded-full bg-primary text-white text-lg disabled:bg-slate-200"
                aria-label="Tăng"
              >
                +
              </button>
            </div>
          </div>
          {b.seats >= maxSeats && !block && (
            <p className="mt-2 text-xs text-warning">Đã đạt số chỗ tối đa có thể đặt.</p>
          )}
        </Card>
        <Card className="space-y-4">
          <H>Điểm đón và điểm trả</H>
          <LocationPicker
            label="Điểm đón"
            area={t.from}
            value={b.pickupLocation}
            error={show("pickup")}
            onChange={(pickupLocation) =>
              setBooking({
                pickupLocation,
                pickup: pickupLocation?.address ?? "",
                pickupCustom: "",
              })
            }
          />
          <LocationPicker
            label="Điểm trả"
            area={t.to}
            value={b.dropoffLocation}
            error={show("dropoff")}
            onChange={(dropoffLocation) =>
              setBooking({
                dropoffLocation,
                dropoff: dropoffLocation?.address ?? "",
                dropoffCustom: "",
              })
            }
          />
        </Card>
        <Card className="space-y-4">
          <H>Thông tin hành khách</H>
          <TextInput
            label="Họ và tên"
            placeholder="Nguyễn Minh Anh"
            value={b.name}
            onChange={(ev) => setBooking({ name: ev.target.value })}
            status={show("name") ? "error" : "default"}
            hint={show("name")}
          />
          <TextInput
            label="Số điện thoại"
            type="tel"
            placeholder="0905 123 456"
            value={b.phone}
            onChange={(ev) => setBooking({ phone: ev.target.value })}
            status={show("phone") ? "error" : "default"}
            hint={show("phone")}
          />
          <TextInput
            label="Email (không bắt buộc)"
            type="email"
            placeholder="minhanh@email.com"
            value={b.email}
            onChange={(ev) => setBooking({ email: ev.target.value })}
            status={show("email") ? "error" : "default"}
            hint={show("email")}
          />
        </Card>
      </div>
      <Footer>
        <div className="flex items-center justify-between mb-3 text-sm">
          <span className="text-slate-500">Tạm tính ({b.seats} chỗ)</span>
          <span className="text-lg font-bold text-primary">{formatVND(t.price * b.seats)}</span>
        </div>
        <Button
          size="lg"
          fullWidth
          disabled={!!block}
          onClick={() => {
            setTried(true);
            if (valid) go("confirm");
          }}
        >
          Xem lại đặt chỗ
        </Button>
      </Footer>
    </PhoneFrame>
  );
}

const resolvePoint = (v: string, custom: string, city: string) =>
  v === "custom" ? `${custom}, ${city}` : v;

/* PA-09 */
export function Confirm({ go }: Nav) {
  const { trip: t, booking: b, search, setRef, addBooking, profile } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!t)
    return (
      <PhoneFrame className="bg-canvas">
        <AppBar title="Xác nhận đặt chỗ" onBack={() => go("booking")} />
        <EmptyState title="Chưa có thông tin đặt chỗ" body="Vui lòng quay lại và chọn chuyến." />
      </PhoneFrame>
    );
  const seats = assignSeats(t, b.seats);
  const total = t.price * b.seats;
  return (
    <PhoneFrame className="bg-canvas">
      <AppBar
        title="Xác nhận đặt chỗ"
        sub="Kiểm tra lại thông tin trước khi đặt"
        onBack={() => go("booking")}
      />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [scrollbar-width:none]">
        <Card>
          <H>Tóm tắt chuyến đi</H>
          <div className="font-bold">{t.company}</div>
          <div className="mt-2 flex items-center gap-3">
            <div>
              <div className="text-xl font-bold">{t.depart}</div>
              <div className="text-xs text-slate-500">{t.from}</div>
            </div>
            <div className="flex-1 border-t border-dashed border-slate-300" />
            <div className="text-right">
              <div className="text-xl font-bold">{t.arrive}</div>
              <div className="text-xs text-slate-500">{t.to}</div>
            </div>
          </div>
          <div className="mt-2 border-t border-line pt-2">
            <Row k="Ngày đi" v={fmtDateShort(search.date) + "/" + search.date.slice(0, 4)} />
            <Row k="Phương tiện" v={`${t.vehicle}`} />
            <Row k="Biển số" v={t.plate} />
          </div>
        </Card>
        <Card>
          <H>Ghế đã chọn</H>
          <div className="flex gap-2 flex-wrap">
            {seats.map((s) => (
              <span
                key={s}
                className="size-11 rounded-xl bg-primary text-white font-bold text-sm grid place-items-center"
              >
                {s}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">Ghế được xếp tự động theo thứ tự còn trống.</p>
        </Card>
        <Card>
          <H>Điểm đón · trả</H>
          <Row k="Điểm đón" v={resolvePoint(b.pickup, b.pickupCustom, t.from)} />
          <Row k="Điểm trả" v={resolvePoint(b.dropoff, b.dropoffCustom, t.to)} />
          {b.pickupLocation?.instructions && (
            <Row k="Chỉ dẫn đón" v={b.pickupLocation.instructions} />
          )}
          {b.dropoffLocation?.instructions && (
            <Row k="Chỉ dẫn trả" v={b.dropoffLocation.instructions} />
          )}
        </Card>
        <Card>
          <H>Hành khách</H>
          <Row k="Họ và tên" v={b.name} />
          <Row k="Số điện thoại" v={b.phone} />
          {b.email && <Row k="Email" v={b.email} />}
        </Card>
        <Card>
          <H>Giá vé dự kiến</H>
          <Row k={`${formatVND(t.price)} × ${b.seats} chỗ`} v={formatVND(total)} />
          <div className="border-t border-line mt-1 pt-2">
            <Row
              k="Tổng cộng"
              v={<span className="text-lg text-primary">{formatVND(total)}</span>}
              strong
            />
          </div>
          <p className="mt-2 text-xs text-slate-500 flex gap-1.5">
            <Icon name="info" className="size-4 shrink-0" />
            Thanh toán trực tiếp cho tài xế khi lên xe. Ứng dụng chưa hỗ trợ thanh toán trực tuyến.
          </p>
        </Card>
      </div>
      <Footer>
        {error && (
          <Field hint={error} status="error">
            <span />
          </Field>
        )}
        <div className="flex gap-3">
          <Button size="lg" variant="secondary" onClick={() => go("booking")}>
            Chỉnh sửa
          </Button>
          <Button
            size="lg"
            className="flex-1"
            loading={loading}
            onClick={() => {
              const invalid = Object.values(bookingValidation(b, t)).find(Boolean);
              if (invalid) {
                setError(invalid);
                return;
              }
              setError("");
              setLoading(true);
              setTimeout(() => {
                const id = `RSH-${search.date.slice(2).replace(/-/g, "")}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
                const issue = addBooking({
                  tripKey: reservationKey(search, t.id),
                  pickupLocation: b.pickupLocation ?? undefined,
                  dropoffLocation: b.dropoffLocation ?? undefined,
                  id,
                  from: t.from,
                  to: t.to,
                  date: search.date,
                  depart: t.depart,
                  arrive: t.arrive,
                  company: t.company,
                  vehicle: t.vehicle,
                  plate: t.plate,
                  seats,
                  total,
                  pickup: resolvePoint(b.pickup, b.pickupCustom, t.from),
                  dropoff: resolvePoint(b.dropoff, b.dropoffCustom, t.to),
                  name: b.name || profile.name,
                  phone: b.phone,
                  driver: drivers[Number(t.id) % drivers.length],
                  status: "upcoming",
                  rated: false,
                });
                setLoading(false);
                if (issue) {
                  setError(issue);
                  return;
                }
                setRef(id);
                go("success");
              }, 900);
            }}
          >
            Xác nhận đặt chỗ
          </Button>
        </div>
      </Footer>
    </PhoneFrame>
  );
}

/* PA-10 */
export function Success({ go }: Nav) {
  const { trip: t, booking: b, search, ref, bookings } = useStore();
  const confirmed = bookings.find((booking) => booking.id === ref);
  return (
    <PhoneFrame className="bg-canvas">
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-4 text-center [scrollbar-width:none]">
        <div className="relative mx-auto size-36 grid place-items-center">
          <span className="absolute inset-0 rounded-full bg-success/10" />
          <span className="absolute inset-4 rounded-full bg-success/20" />
          <span className="relative size-20 rounded-full bg-success text-white grid place-items-center shadow-lg">
            <Icon name="check" className="size-10" />
          </span>
          {[
            ["top-1 left-3", "bg-teal"],
            ["top-6 right-0", "bg-primary"],
            ["bottom-3 left-0", "bg-warning"],
            ["bottom-1 right-6", "bg-teal"],
          ].map(([pos, c]) => (
            <span key={pos} className={`absolute size-2.5 rounded-full ${pos} ${c}`} />
          ))}
        </div>
        <h1 className="mt-4 text-[26px] font-bold tracking-tight">Đặt chỗ thành công!</h1>
        <p className="mt-1.5 text-slate-500 text-sm">
          Nhà xe đã nhận yêu cầu của bạn. Hãy có mặt đúng giờ tại điểm đón.
        </p>
        <div className="mt-5 rounded-[20px] bg-navy text-white p-4">
          <div className="text-xs text-slate-300">Mã đặt chỗ</div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-wider text-teal">
            {ref || "RSH-250718-0317"}
          </div>
        </div>
        {t && (
          <Card className="mt-4 text-left">
            <H>Tóm tắt chuyến đi</H>
            <div className="flex items-center justify-between">
              <span className="font-bold">
                {t.from} → {t.to}
              </span>
              <Badge kind="active">Đã xác nhận</Badge>
            </div>
            <div className="mt-2">
              <Row k="Nhà xe" v={t.company} />
              <Row k="Khởi hành" v={`${t.depart} · ${fmtDateShort(search.date)}`} />
              <Row k="Ghế" v={(confirmed?.seats ?? assignSeats(t, b.seats)).join(", ")} />
              <Row k="Điểm đón" v={resolvePoint(b.pickup, b.pickupCustom, t.from)} />
              <div className="border-t border-line mt-1 pt-1">
                <Row
                  k="Tổng cộng"
                  v={<span className="text-primary">{formatVND(t.price * b.seats)}</span>}
                  strong
                />
              </div>
            </div>
          </Card>
        )}
      </div>
      <Footer>
        <div className="flex gap-3">
          <Button size="lg" variant="secondary" onClick={() => go("home")}>
            Trang chủ
          </Button>
          <Button size="lg" className="flex-1" onClick={() => go("bookings")}>
            Xem chuyến của tôi
          </Button>
        </div>
      </Footer>
    </PhoneFrame>
  );
}

export const bookingScreens = [
  { id: "results", code: "PA-05", title: "Kết quả tìm kiếm", Comp: Results },
  { id: "filters", code: "PA-06", title: "Bộ lọc tìm kiếm", Comp: FiltersScreen },
  { id: "details", code: "PA-07", title: "Chi tiết chuyến đi", Comp: Details },
  { id: "booking", code: "PA-08", title: "Biểu mẫu đặt chỗ", Comp: BookingForm },
  { id: "confirm", code: "PA-09", title: "Xác nhận đặt chỗ", Comp: Confirm },
  { id: "success", code: "PA-10", title: "Đặt chỗ thành công", Comp: Success },
] as const;
