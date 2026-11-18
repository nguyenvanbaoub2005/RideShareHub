import { useState, type ReactNode } from "react";
import PhoneFrame from "../passenger/PhoneFrame";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import { TextInput, PasswordInput } from "../../components/ui/Form";
import { EmptyState } from "../../components/ui/Feedback";
import { Modal } from "../../components/ui/Overlays";
import { usePrototypeSession } from "../../prototype/Session";
import { cn } from "../../components/ui/cn";
import { useDriver, type DScreen } from "./store";
import {
  driver,
  statusMeta,
  isToday,
  isUpcoming,
  minutesUntil,
  fmtUntil,
  dayLabel,
  type DTrip,
} from "./data";

export type DNav = { go: (id: DScreen) => void; tripId?: string };

export const Badge = ({ t }: { t: DTrip }) => {
  const cls = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-blue-100 text-blue-800",
    ongoing: "bg-green-100 text-green-800",
    completed: "bg-teal-100 text-teal-800",
    cancelled: "bg-red-100 text-red-800",
    rejected: "bg-red-100 text-red-800",
  }[t.status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold whitespace-nowrap",
        cls,
      )}
    >
      {statusMeta[t.status].label}
    </span>
  );
};

/** Thanh điều hướng lớn cho tài xế: chỉ gồm các màn hình đã thiết kế. */
function DriverTabs({ active, go }: { active: "home" | "trips"; go: (id: DScreen) => void }) {
  const items = [
    ["home", "Trang chủ", "home"],
    ["trips", "Chuyến được giao", "bus"],
  ] as const;
  return (
    <nav className="grid grid-cols-2 bg-navy shrink-0 pb-7 pt-1">
      {items.map(([id, label, icon]) => (
        <button
          key={id}
          onClick={() => go(id)}
          className={cn(
            "h-[68px] flex flex-col items-center justify-center gap-1 text-[13px] font-semibold",
            active === id ? "text-teal" : "text-slate-400",
          )}
          aria-current={active === id}
        >
          <Icon name={icon} className="size-7" />
          {label}
        </button>
      ))}
    </nav>
  );
}

/* DR-01 */
export function DriverLogin({ go }: DNav) {
  const session = usePrototypeSession();
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [tried, setTried] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgot, setForgot] = useState(false);
  const idv = id.replace(/\s/g, "");
  const e = {
    id: !idv
      ? "Vui lòng nhập email hoặc số điện thoại"
      : !/^(\S+@\S+\.\S+|(0|\+84)\d{9})$/.test(idv)
        ? "Email hoặc số điện thoại không hợp lệ"
        : "",
    pw: !pw ? "Vui lòng nhập mật khẩu" : pw.length < 8 ? "Mật khẩu tối thiểu 8 ký tự" : "",
  };
  if (session?.accountLocked(id))
    e.id = "Tài khoản đã bị khóa. Vui lòng liên hệ nhà xe hoặc quản trị viên.";
  const submit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setTried(true);
    if (e.id || e.pw) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      go("home");
    }, 700);
  };
  return (
    <PhoneFrame dark className="bg-navy">
      <div className="absolute -top-20 -right-20 size-72 rounded-full bg-primary/40 blur-3xl" />
      <div className="relative px-6 pt-6 pb-10 text-white">
        <div className="size-16 rounded-2xl bg-teal text-navy grid place-items-center">
          <Icon name="bus" className="size-9" />
        </div>
        <h1 className="mt-5 text-[30px] font-extrabold tracking-tight">RideShareHub</h1>
        <p className="text-teal font-semibold">Dành cho tài xế</p>
      </div>
      <form
        onSubmit={submit}
        noValidate
        className="relative flex-1 bg-surface rounded-t-[32px] px-6 pt-8 pb-10 flex flex-col"
      >
        <h2 className="text-2xl font-bold">Đăng nhập</h2>
        <p className="text-slate-600 mt-1">Dùng tài khoản do nhà xe cấp cho bạn.</p>
        <div className="mt-6 space-y-5">
          <TextInput
            big
            label="Email hoặc số điện thoại"
            placeholder="0905 111 222"
            value={id}
            onChange={(ev) => setId(ev.target.value)}
            status={tried && e.id ? "error" : "default"}
            hint={tried ? e.id : ""}
            autoComplete="username"
          />
          <PasswordInput
            big
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            value={pw}
            onChange={(ev) => setPw(ev.target.value)}
            status={tried && e.pw ? "error" : "default"}
            hint={tried ? e.pw : ""}
            autoComplete="current-password"
          />
        </div>
        <button
          type="button"
          onClick={() => setForgot(true)}
          className="self-end mt-3 h-11 px-1 text-base font-semibold text-primary"
        >
          Quên mật khẩu?
        </button>
        <Button type="submit" size="xl" fullWidth loading={loading} className="mt-auto">
          Đăng nhập
        </Button>
        <p className="mt-4 text-center text-sm text-slate-500">
          Chưa có tài khoản? Liên hệ nhà xe của bạn để được cấp.
        </p>
      </form>
      <Modal
        contained
        open={forgot}
        title="Khôi phục tài khoản tài xế"
        onClose={() => setForgot(false)}
        footer={<Button onClick={() => setForgot(false)}>Đã hiểu</Button>}
      >
        <div>
          Liên hệ {driver.company} để được cấp lại mật khẩu tài xế. Đây là nguyên mẫu, không gửi yêu
          cầu đến hệ thống thật.
        </div>
      </Modal>
    </PhoneFrame>
  );
}

/* DR-02 */
function TripRow({ t, big }: { t: DTrip; big?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 bg-surface border-2 border-line rounded-2xl",
        big ? "p-5" : "p-4",
      )}
    >
      <div className="text-center w-[64px] shrink-0">
        <div className="text-[22px] font-extrabold leading-none">{t.depart}</div>
        <div className="text-xs text-slate-500 mt-1 font-medium">{dayLabel(t.date)}</div>
      </div>
      <div className="w-px self-stretch bg-line" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-[17px] leading-tight">
          {t.from} → {t.to}
        </div>
        <div className="mt-1 text-sm text-slate-600 flex items-center gap-1.5">
          <Icon name="users" className="size-4" />
          {t.pax}/{t.seatsTotal} khách
        </div>
      </div>
      <Badge t={t} />
    </div>
  );
}

export function DriverHome({ go }: DNav) {
  const { available, setAvailable, trips } = useDriver();
  const today = trips.filter(isToday).sort((a, b) => a.depart.localeCompare(b.depart));
  const upcoming = trips
    .filter(isUpcoming)
    .sort((a, b) => `${a.date}${a.depart}`.localeCompare(`${b.date}${b.depart}`));
  const next = today.find((t) => t.status === "confirmed" || t.status === "ongoing");
  const pax = today.reduce((s, t) => s + t.pax, 0);
  return (
    <PhoneFrame statusLight className="bg-canvas">
      <div className="flex-1 overflow-y-auto pb-4 [scrollbar-width:none]">
        <div className="bg-navy text-white -mt-11 pt-14 px-5 pb-16">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-full bg-teal text-navy font-extrabold text-2xl grid place-items-center">
              {driver.short[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-300">Chào buổi sáng,</div>
              <div className="text-2xl font-extrabold leading-tight">Tài xế {driver.short}</div>
              <div className="text-sm text-slate-300 mt-0.5 flex items-center gap-1.5">
                <Icon name="star" filled className="size-4 text-warning" />
                {driver.rating.toFixed(1)} · {driver.trips} chuyến
              </div>
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-white/10 px-4 py-3 text-sm flex items-center gap-3">
            <Icon name="car" className="size-5 text-teal" />
            <span className="flex-1">
              <b>{driver.plate}</b> · {driver.vehicle}
            </span>
          </div>
        </div>

        <div className="px-4 -mt-9 space-y-4">
          <button
            onClick={() => setAvailable(!available)}
            role="switch"
            aria-checked={available}
            className={cn(
              "w-full rounded-[22px] p-5 flex items-center gap-4 text-left border-2 transition",
              available ? "bg-green-50 border-success" : "bg-surface border-slate-300",
            )}
            style={{ boxShadow: "var(--shadow-dropdown)" }}
          >
            <span
              className={cn(
                "size-12 rounded-full grid place-items-center text-white shrink-0",
                available ? "bg-success" : "bg-slate-400",
              )}
            >
              <Icon name={available ? "check" : "clock"} className="size-6" />
            </span>
            <span className="flex-1">
              <span className="block text-lg font-extrabold">
                {available ? "Sẵn sàng nhận chuyến" : "Đang tạm nghỉ"}
              </span>
              <span className="block text-sm text-slate-600">
                {available
                  ? "Nhà xe có thể giao chuyến mới cho bạn"
                  : "Bạn sẽ không nhận chuyến mới"}
              </span>
            </span>
            <span
              className={cn(
                "w-[60px] h-9 rounded-full p-1 transition shrink-0",
                available ? "bg-success" : "bg-slate-300",
              )}
            >
              <span
                className={cn(
                  "block size-7 rounded-full bg-white transition",
                  available && "translate-x-6",
                )}
              />
            </span>
          </button>

          {next && (
            <div className="rounded-[22px] bg-primary text-white p-5">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span className="uppercase tracking-wide opacity-90">Chuyến tiếp theo</span>
                <span className="bg-white/20 rounded-full px-3 py-1">
                  Còn {fmtUntil(minutesUntil(next))}
                </span>
              </div>
              <div className="mt-3 text-[34px] font-extrabold leading-none">{next.depart}</div>
              <div className="mt-2 text-xl font-bold">
                {next.from} → {next.to}
              </div>
              <div className="mt-2 text-sm opacity-90 flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Icon name="users" className="size-4" />
                  {next.pax} khách
                </span>
                <span>{next.code}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              [String(today.length), "Chuyến hôm nay"],
              [String(pax), "Hành khách"],
              [String(upcoming.length), "Chuyến sắp tới"],
            ].map(([v, l]) => (
              <div key={l} className="bg-surface border-2 border-line rounded-2xl py-3">
                <div className="text-2xl font-extrabold text-primary">{v}</div>
                <div className="text-xs font-medium text-slate-600 px-1">{l}</div>
              </div>
            ))}
          </div>

          <Section title="Chuyến hôm nay" count={today.length}>
            {today.map((t) => (
              <TripRow key={t.id} t={t} />
            ))}
          </Section>
          <Section title="Chuyến sắp tới" count={upcoming.length}>
            {upcoming.map((t) => (
              <TripRow key={t.id} t={t} />
            ))}
          </Section>
          <Button size="xl" variant="secondary" fullWidth icon="bus" onClick={() => go("trips")}>
            Xem tất cả chuyến được giao
          </Button>
        </div>
      </div>
      <DriverTabs active="home" go={go} />
    </PhoneFrame>
  );
}
const Section = ({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) => (
  <section>
    <h3 className="text-xl font-extrabold mb-3">
      {title} <span className="text-slate-500 font-semibold text-base">({count})</span>
    </h3>
    <div className="space-y-3">{children}</div>
  </section>
);

/* DR-03 */
const filters = [
  ["all", "Tất cả"],
  ["today", "Hôm nay"],
  ["upcoming", "Sắp tới"],
  ["done", "Đã xong"],
] as const;
export function AssignedTrips({ go }: DNav) {
  const { trips, setSelectedId } = useDriver();
  const [f, setF] = useState<(typeof filters)[number][0]>("all");
  const list = trips
    .filter((t) =>
      f === "all"
        ? true
        : f === "today"
          ? isToday(t)
          : f === "upcoming"
            ? isUpcoming(t)
            : t.status === "completed" || t.status === "cancelled" || t.status === "rejected",
    )
    .sort((a, b) => `${a.date}${a.depart}`.localeCompare(`${b.date}${b.depart}`));
  return (
    <PhoneFrame statusLight className="bg-canvas">
      <div className="bg-navy text-white px-5 pb-4 -mt-11 pt-14 shrink-0">
        <h1 className="text-[28px] font-extrabold tracking-tight">Chuyến được giao</h1>
        <p className="text-slate-300 text-sm">
          {driver.company} · {driver.plate}
        </p>
        <div className="mt-4 flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {filters.map(([k, l]) => (
            <button
              key={k}
              onClick={() => setF(k)}
              className={cn(
                "h-12 px-5 rounded-full text-base font-bold whitespace-nowrap",
                f === k ? "bg-teal text-navy" : "bg-white/10 text-white",
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [scrollbar-width:none]">
        {list.length === 0 && (
          <EmptyState
            title="Không có chuyến nào"
            body="Chuyến được nhà xe giao cho bạn sẽ hiển thị tại đây."
          />
        )}
        {list.map((t) => {
          const dim =
            t.status === "cancelled" || t.status === "completed" || t.status === "rejected";
          return (
            <article
              key={t.id}
              className={cn(
                "bg-surface border-2 border-line rounded-[22px] p-5",
                dim && "opacity-80",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-500">
                  {dayLabel(t.date)} · {t.code}
                </span>
                <Badge t={t} />
              </div>
              <div className="mt-3 flex items-end gap-3">
                <div className="text-[34px] font-extrabold leading-none">{t.depart}</div>
                <div className="text-slate-500 pb-1 text-sm">đến {t.arrive}</div>
              </div>
              <div className="mt-2 text-xl font-bold leading-tight">
                {t.from} → {t.to}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[15px]">
                <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex items-center gap-2">
                  <Icon name="users" className="size-5 text-primary" />
                  <span>
                    <b>{t.pax}</b>/{t.seatsTotal} khách
                  </span>
                </div>
                <div className="bg-slate-50 rounded-xl px-3 py-2.5 flex items-center gap-2 min-w-0">
                  <Icon name="car" className="size-5 text-primary shrink-0" />
                  <span className="truncate font-semibold">{t.plate}</span>
                </div>
              </div>
              <div className="mt-1.5 text-sm text-slate-500 px-1">{t.vehicle}</div>
              {t.note && (
                <div className="mt-2 flex gap-2 text-sm text-slate-700 bg-slate-100 rounded-xl p-3">
                  <Icon name="info" className="size-5 shrink-0" />
                  {t.note}
                </div>
              )}
              <Button
                size="xl"
                fullWidth
                className="mt-4"
                onClick={() => {
                  setSelectedId(t.id);
                  go("details");
                }}
              >
                Xem chi tiết
              </Button>
            </article>
          );
        })}
      </div>
      <DriverTabs active="trips" go={go} />
    </PhoneFrame>
  );
}

export const driverScreens = [
  { id: "login", code: "DR-01", title: "Đăng nhập tài xế", Comp: DriverLogin },
  { id: "home", code: "DR-02", title: "Trang chủ tài xế", Comp: DriverHome },
  { id: "trips", code: "DR-03", title: "Chuyến được giao", Comp: AssignedTrips },
] as const;
