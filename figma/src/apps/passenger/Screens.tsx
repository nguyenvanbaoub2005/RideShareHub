import { useEffect, useState } from "react";
import PhoneFrame from "./PhoneFrame";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import { TextInput, PasswordInput, Checkbox } from "../../components/ui/Form";
import { Modal } from "../../components/ui/Overlays";
import { LocationPicker } from "../../address/AddressFields";
import {
  areaLocation,
  validLocation,
  emptyAdministrativeAddress,
  type GeoLocation,
} from "../../address/model";
import { usePrototypeSession } from "../../prototype/Session";
import { loginValidation, registrationValidation } from "./validation";
import { TabBar } from "./Tabs";
import { formatVND } from "../../lib/format";
import { cn } from "../../components/ui/cn";

import { useStore, type ScreenId } from "./store";

export type Nav = { go: (id: ScreenId) => void };

function Logo({ size = 72, inverted }: { size?: number; inverted?: boolean }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className={cn(
          "absolute inset-0 rounded-[28%] grid place-items-center",
          inverted ? "bg-white text-primary" : "bg-primary text-white",
        )}
      >
        <Icon name="bus" className="size-1/2" />
      </div>
      <span
        className="absolute -right-1 -bottom-1 rounded-full bg-teal border-[3px]"
        style={{
          width: size * 0.3,
          height: size * 0.3,
          borderColor: inverted ? "#0F172A" : "#fff",
        }}
      />
    </div>
  );
}

/* PA-01 */
export function Splash({ go }: Nav) {
  return (
    <PhoneFrame dark className="bg-navy">
      <div className="absolute -top-24 -right-24 size-80 rounded-full bg-primary/40 blur-3xl" />
      <div className="absolute bottom-10 -left-24 size-72 rounded-full bg-teal/30 blur-3xl" />
      <button
        onClick={() => go("login")}
        className="relative flex-1 flex flex-col items-center justify-center text-center text-white px-10"
        aria-label="Tiếp tục"
      >
        <Logo size={96} inverted />
        <h1 className="mt-8 text-[34px] font-extrabold tracking-tight">RideShareHub</h1>
        <p className="mt-3 text-slate-300 leading-relaxed">
          Đi chung thông minh,
          <br />
          tiết kiệm mỗi chuyến
        </p>
        <div className="mt-6 flex gap-2 text-xs text-slate-300">
          {["Đà Nẵng", "Huế", "Hội An", "Quảng Nam"].map((c) => (
            <span key={c} className="px-2.5 py-1 rounded-full bg-white/10 border border-white/10">
              {c}
            </span>
          ))}
        </div>
      </button>
      <div className="relative pb-16 flex flex-col items-center gap-3">
        <div className="w-40 h-1 rounded-full bg-white/15 overflow-hidden">
          <div
            className="h-full w-1/2 bg-teal rounded-full"
            style={{ animation: "rsh-load 1.4s ease-in-out infinite" }}
          />
        </div>
        <span className="text-xs text-slate-400">Đang khởi động...</span>
        <style>{`@keyframes rsh-load{0%{transform:translateX(-100%)}100%{transform:translateX(200%)}}`}</style>
      </div>
    </PhoneFrame>
  );
}

/* PA-02 */
export function Login({ go }: Nav) {
  const [loading, setLoading] = useState(false);
  const session = usePrototypeSession();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [tried, setTried] = useState(false);
  const [forgot, setForgot] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const e = loginValidation(identifier, password);
  if (session?.accountLocked(identifier))
    e.identifier = "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.";
  return (
    <PhoneFrame className="bg-canvas">
      <div className="flex-1 overflow-y-auto px-6 pt-8 pb-24 flex flex-col">
        <Logo size={56} />
        <h1 className="mt-6 text-[28px] font-bold tracking-tight">Chào mừng trở lại</h1>
        <p className="mt-1.5 text-slate-500">Đăng nhập để tìm và đặt chuyến xe ghép.</p>
        <form
          noValidate
          className="mt-8 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            setTried(true);
            if (Object.values(e).some(Boolean)) return;
            setLoading(true);
            setTimeout(() => {
              go("home");
              setLoading(false);
            }, 700);
          }}
        >
          <TextInput
            label="Email hoặc số điện thoại"
            placeholder="0905 123 456"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            status={tried && e.identifier ? "error" : "default"}
            hint={tried ? e.identifier : ""}
          />
          <PasswordInput
            label="Mật khẩu"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            status={tried && e.password ? "error" : "default"}
            hint={tried ? e.password : ""}
          />
          <div className="flex justify-end -mt-2">
            <button
              type="button"
              onClick={() => {
                setForgot(true);
                setRecovered(false);
                setTried(false);
              }}
              className="text-sm font-semibold text-primary"
            >
              Quên mật khẩu?
            </button>
          </div>
          <Button type="submit" size="lg" fullWidth loading={loading}>
            Đăng nhập
          </Button>
        </form>
        <div className="mt-auto pt-10 text-center text-sm text-slate-600">
          Chưa có tài khoản?{" "}
          <button onClick={() => go("register")} className="font-semibold text-primary">
            Đăng ký ngay
          </button>
        </div>
      </div>
      <Modal
        contained
        open={forgot}
        title="Khôi phục mật khẩu"
        onClose={() => setForgot(false)}
        footer={
          <Button
            onClick={() => {
              setTried(true);
              if (!loginValidation(identifier, "12345678").identifier) {
                if (recovered) setForgot(false);
                else setRecovered(true);
              }
            }}
          >
            {recovered ? "Đã hiểu" : "Gửi yêu cầu mô phỏng"}
          </Button>
        }
      >
        {recovered ? (
          <div role="status">
            Đã ghi nhận yêu cầu trong nguyên mẫu. Không có email hoặc SMS thật được gửi.
          </div>
        ) : (
          <TextInput
            label="Email hoặc số điện thoại"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            status={tried && e.identifier ? "error" : "default"}
            hint={tried ? e.identifier : ""}
          />
        )}
      </Modal>
    </PhoneFrame>
  );
}

/* PA-03 */
export function Register({ go }: Nav) {
  const { profile, setProfile, setBooking } = useStore();
  const [data, setData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    terms: false,
  });
  const [tried, setTried] = useState(false);
  const errors = registrationValidation(data);
  return (
    <PhoneFrame className="bg-canvas">
      <div className="flex-1 overflow-y-auto px-6 pt-2 pb-24">
        <button
          onClick={() => go("login")}
          className="size-10 -ml-2 rounded-full hover:bg-slate-100 grid place-items-center"
          aria-label="Quay lại"
        >
          <Icon name="left" className="size-6" />
        </button>
        <h1 className="mt-2 text-[28px] font-bold tracking-tight">Tạo tài khoản</h1>
        <p className="mt-1.5 text-slate-500">Chỉ mất một phút để bắt đầu hành trình.</p>
        <form
          noValidate
          className="mt-6 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTried(true);
            if (Object.values(errors).some(Boolean)) return;
            setProfile({
              ...profile,
              administrativeAddress: emptyAdministrativeAddress(),
              city: "",
              name: data.name.trim(),
              email: data.email.trim(),
              phone: data.phone.trim(),
            });
            setBooking({
              name: data.name.trim(),
              email: data.email.trim(),
              phone: data.phone.trim(),
            });
            go("home");
          }}
        >
          <TextInput
            label="Họ và tên"
            placeholder="Nguyễn Minh Anh"
            value={data.name}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            status={tried && errors.name ? "error" : "default"}
            hint={tried ? errors.name : ""}
          />
          <TextInput
            label="Email"
            type="email"
            placeholder="minhanh@email.com"
            value={data.email}
            onChange={(e) => setData({ ...data, email: e.target.value })}
            status={tried && errors.email ? "error" : "default"}
            hint={tried ? errors.email : ""}
          />
          <TextInput
            label="Số điện thoại"
            type="tel"
            placeholder="0905 123 456"
            value={data.phone}
            onChange={(e) => setData({ ...data, phone: e.target.value })}
            status={tried && errors.phone ? "error" : "default"}
            hint={tried ? errors.phone : ""}
          />
          <PasswordInput
            label="Mật khẩu"
            placeholder="Tối thiểu 8 ký tự"
            value={data.password}
            onChange={(e) => setData({ ...data, password: e.target.value })}
            status={tried && errors.password ? "error" : "default"}
            hint={tried ? errors.password : ""}
          />
          <PasswordInput
            label="Xác nhận mật khẩu"
            placeholder="Nhập lại mật khẩu"
            value={data.confirm}
            onChange={(e) => setData({ ...data, confirm: e.target.value })}
            status={tried && errors.confirm ? "error" : "default"}
            hint={tried ? errors.confirm : ""}
          />
          <Checkbox
            label="Tôi đồng ý với Điều khoản sử dụng"
            checked={data.terms}
            onChange={(terms) => setData({ ...data, terms })}
            error={tried && !!errors.terms}
          />
          {tried && errors.terms && (
            <div role="alert" className="text-xs text-danger">
              {errors.terms}
            </div>
          )}
          <Button type="submit" size="lg" fullWidth>
            Tạo tài khoản
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Đã có tài khoản?{" "}
          <button onClick={() => go("login")} className="font-semibold text-primary">
            Đăng nhập
          </button>
        </p>
      </div>
    </PhoneFrame>
  );
}

/* PA-04 */
const popular = [
  { from: "Đà Nẵng", to: "Huế", price: 120000, time: "3 giờ", tone: "from-primary to-blue-700" },
  { from: "Đà Nẵng", to: "Hội An", price: 60000, time: "1 giờ", tone: "from-teal to-teal-700" },
  {
    from: "Hội An",
    to: "Quảng Nam",
    price: 45000,
    time: "45 phút",
    tone: "from-navy to-slate-700",
  },
  { from: "Huế", to: "Đà Nẵng", price: 120000, time: "3 giờ", tone: "from-blue-500 to-indigo-700" },
];
const recent = [
  {
    route: "Đà Nẵng → Huế",
    meta: "18/07 · 07:30 · Nhà xe Minh Tâm",
    price: 240000,
    label: "Sắp đi",
    cls: "bg-blue-50 text-blue-700",
  },
  {
    route: "Hội An → Đà Nẵng",
    meta: "02/07 · 16:00 · Nhà xe Thành Công",
    price: 60000,
    label: "Hoàn thành",
    cls: "bg-teal-50 text-teal-700",
  },
];

function CityPick({
  icon,
  label,
  value,
  onOpen,
  tint,
}: {
  icon: string;
  label: string;
  value: string;
  onOpen: () => void;
  tint: string;
}) {
  return (
    <div className="flex items-center gap-3 px-1 h-14 relative">
      <span className={cn("size-9 rounded-full grid place-items-center shrink-0", tint)}>
        <Icon name={icon} className="size-[18px]" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[11px] font-medium text-slate-500">{label}</span>
        <Button
          variant="secondary"
          type="button"
          aria-label={`Chọn ${label.toLowerCase()}`}
          onClick={onOpen}
          className="w-full justify-start border-0 px-0 h-auto bg-transparent text-left"
        >
          <span className="truncate">{value}</span>
        </Button>
      </span>
      <Icon name="down" className="size-4 text-slate-400" />
    </div>
  );
}

export function Home({ go }: Nav) {
  const { search, setSearch, unread, profile } = useStore();
  const [searchError, setSearchError] = useState("");
  const { from, to, date, pax } = search;
  const [locationTarget, setLocationTarget] = useState<"from" | "to" | null>(null);
  const [pendingLocation, setPendingLocation] = useState<GeoLocation | null>(null);
  const openLocation = (target: "from" | "to") => {
    setPendingLocation(search[target === "from" ? "fromLocation" : "toLocation"] ?? null);
    setLocationTarget(target);
  };
  const setDate = (v: string) => setSearch({ date: v });
  const setPax = (v: number) => setSearch({ pax: v });
  const swap = () =>
    setSearch({
      from: to,
      to: from,
      fromLocation: search.toLocation,
      toLocation: search.fromLocation,
    });
  const dateLabel = new Date(date + "T00:00").toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <PhoneFrame statusLight className="bg-canvas">
      <div className="flex-1 overflow-y-auto pb-6 [scrollbar-width:none]">
        <div className="bg-navy text-white -mt-11 pt-14 px-5 pb-20 relative overflow-hidden">
          <div className="absolute -right-16 -top-16 size-56 rounded-full bg-primary/40 blur-3xl" />
          <div className="relative flex items-center gap-3">
            <div className="size-12 rounded-full bg-teal text-navy font-bold text-lg grid place-items-center ring-2 ring-white/30">
              M
            </div>
            <div className="flex-1 leading-tight">
              <div className="text-sm text-slate-300">Xin chào,</div>
              <div className="font-bold text-lg">{profile.name.split(" ").slice(-2).join(" ")}</div>
            </div>
            <button
              onClick={() => go("notifications")}
              className="relative size-11 rounded-full bg-white/10 grid place-items-center"
              aria-label="Thông báo"
            >
              <Icon name="bell" className="size-[22px]" />
              {unread > 0 && (
                <span className="absolute top-2.5 right-3 size-2.5 rounded-full bg-danger ring-2 ring-navy" />
              )}
            </button>
          </div>
          <h2 className="relative mt-6 text-[22px] font-bold leading-snug">
            Bạn muốn đi đâu hôm nay?
          </h2>
        </div>

        <div
          className="-mt-14 mx-4 relative bg-surface rounded-[24px] border border-line p-4"
          style={{ boxShadow: "var(--shadow-dropdown)" }}
        >
          <div className="relative">
            <CityPick
              icon="pin"
              label="Điểm đi"
              value={search.fromLocation?.label ?? from}
              onOpen={() => openLocation("from")}
              tint="bg-teal/15 text-teal"
            />
            <div className="ml-5 border-l-2 border-dotted border-slate-200 h-1" />
            <CityPick
              icon="pin"
              label="Điểm đến"
              value={search.toLocation?.label ?? to}
              onOpen={() => openLocation("to")}
              tint="bg-red-50 text-danger"
            />
            <button
              onClick={swap}
              aria-label="Đổi chiều"
              className="absolute right-9 top-1/2 -translate-y-1/2 size-9 rounded-full bg-surface border border-line grid place-items-center text-primary hover:bg-blue-50"
            >
              <Icon name="refresh" className="size-4 rotate-90" />
            </button>
          </div>
          <div className="my-3 border-t border-line" />
          <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
            <label className="flex items-center gap-3 px-1 relative">
              <span className="size-9 rounded-full bg-blue-50 text-primary grid place-items-center">
                <Icon name="calendar" className="size-[18px]" />
              </span>
              <span className="flex-1">
                <span className="block text-[11px] font-medium text-slate-500">Ngày đi</span>
                <span className="block font-semibold text-[15px] -mt-0.5">{dateLabel}</span>
              </span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer"
                aria-label="Chọn ngày đi"
              />
            </label>
            <div className="flex items-center gap-2.5 bg-slate-50 border border-line rounded-full p-1">
              <button
                onClick={() => setPax(Math.max(1, pax - 1))}
                disabled={pax === 1}
                className="size-8 rounded-full bg-surface border border-line grid place-items-center text-lg disabled:text-slate-300"
                aria-label="Giảm"
              >
                −
              </button>
              <span className="text-center leading-none">
                <span className="block font-bold text-[15px]">{pax}</span>
                <span className="text-[10px] text-slate-500">khách</span>
              </span>
              <button
                onClick={() => setPax(Math.min(6, pax + 1))}
                disabled={pax === 6}
                className="size-8 rounded-full bg-primary text-white grid place-items-center text-lg disabled:bg-slate-200"
                aria-label="Tăng"
              >
                +
              </button>
            </div>
          </div>
          <Button
            size="lg"
            fullWidth
            icon="search"
            className="mt-4"
            onClick={() => {
              if (
                from === to ||
                !date ||
                !validLocation(search.fromLocation, true) ||
                !validLocation(search.toLocation, true)
              ) {
                setSearchError("Chọn ngày đi hợp lệ và điểm đến khác điểm đi.");
                return;
              }
              go("results");
            }}
          >
            Tìm chuyến
          </Button>
        </div>

        <section className="mt-6">
          <div className="px-5 flex items-center justify-between">
            <h3 className="font-bold text-[17px]">Tuyến phổ biến</h3>
            <button onClick={() => go("results")} className="text-sm font-semibold text-primary">
              Xem tất cả
            </button>
          </div>
          <div className="mt-3 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {popular.map((p) => (
              <button
                key={p.from + p.to}
                onClick={() =>
                  setSearch({
                    from: p.from,
                    to: p.to,
                    fromLocation: areaLocation(p.from),
                    toLocation: areaLocation(p.to),
                  })
                }
                className={cn(
                  "shrink-0 w-[168px] text-left rounded-[20px] p-4 text-white bg-gradient-to-br relative overflow-hidden",
                  p.tone,
                )}
              >
                <Icon name="route" className="size-16 absolute -right-3 -bottom-3 opacity-15" />
                <div className="text-[11px] opacity-80">{p.time}</div>
                <div className="mt-3 font-bold leading-tight">{p.from}</div>
                <div className="text-xs opacity-80 my-0.5">đến</div>
                <div className="font-bold leading-tight">{p.to}</div>
                <div className="mt-3 text-sm font-semibold">Từ {formatVND(p.price)}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="mt-6 px-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[17px]">Đặt chỗ gần đây</h3>
            <button onClick={() => go("bookings")} className="text-sm font-semibold text-primary">
              Xem tất cả
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {recent.map((r) => (
              <div
                key={r.route}
                role="button"
                tabIndex={0}
                onClick={() => go("bookings")}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") go("bookings");
                }}
                className="bg-surface border border-line rounded-[20px] p-4 flex items-center gap-3"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="size-11 rounded-xl bg-blue-50 text-primary grid place-items-center shrink-0">
                  <Icon name="ticket" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{r.route}</div>
                  <div className="text-xs text-slate-500 truncate">{r.meta}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">{formatVND(r.price)}</div>
                  <span
                    className={cn(
                      "inline-block mt-1 text-[11px] font-medium rounded-full px-2 py-0.5",
                      r.cls,
                    )}
                  >
                    {r.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      <TabBar active="home" go={go} />
      <Modal
        contained
        open={!!locationTarget}
        title={locationTarget === "from" ? "Chọn điểm đi" : "Chọn điểm đến"}
        onClose={() => setLocationTarget(null)}
        footer={
          <Button
            disabled={!validLocation(pendingLocation, true)}
            onClick={() => {
              if (!pendingLocation) return;
              setSearch(
                locationTarget === "from"
                  ? { from: pendingLocation.area, fromLocation: pendingLocation }
                  : { to: pendingLocation.area, toLocation: pendingLocation },
              );
              setLocationTarget(null);
            }}
          >
            Sử dụng địa điểm
          </Button>
        }
      >
        <div className="max-h-96 overflow-y-auto">
          <LocationPicker
            label="Địa điểm tìm chuyến"
            value={pendingLocation}
            onChange={setPendingLocation}
            allowAreas
            instructions={false}
          />
        </div>
      </Modal>
      <Modal
        contained
        open={!!searchError}
        title="Kiểm tra thông tin tìm chuyến"
        onClose={() => setSearchError("")}
        footer={<Button onClick={() => setSearchError("")}>Đã hiểu</Button>}
      >
        <div role="alert">{searchError}</div>
      </Modal>
    </PhoneFrame>
  );
}

export const screens = [
  { id: "splash", code: "PA-01", title: "Màn hình khởi động", Comp: Splash },
  { id: "login", code: "PA-02", title: "Đăng nhập", Comp: Login },
  { id: "register", code: "PA-03", title: "Đăng ký", Comp: Register },
  { id: "home", code: "PA-04", title: "Trang chủ", Comp: Home },
] as const;

export function useAutoSplash(current: string, go: Nav["go"]) {
  useEffect(() => {
    if (current !== "splash") return;
    const t = setTimeout(() => go("login"), 2600);
    return () => clearTimeout(t);
  }, [current, go]);
}
