import { fitLocationPoints, gpsLabel } from "../../address/model";
import { useState, type ReactNode } from "react";
import PhoneFrame from "../passenger/PhoneFrame";
import Icon from "../../components/ui/Icon";
import Button from "../../components/ui/Button";
import { ConfirmDialog, Modal } from "../../components/ui/Overlays";
import { Radio } from "../../components/ui/Form";
import { EmptyState } from "../../components/ui/Feedback";
import { cn } from "../../components/ui/cn";
import { useDriver } from "./store";
import { Badge, type DNav } from "./Screens";
import {
  driver,
  groupStops,
  tripKm,
  tripMinutes,
  fmtMin,
  dayLabel,
  stopRule,
  remaining,
  currentStop,
  type DStop,
  type DTrip,
  type Group,
} from "./data";

/* ---------- Thành phần dùng chung ---------- */
function Bar({
  title,
  sub,
  onBack,
  icon = "left",
  right,
}: {
  title: string;
  sub?: string;
  onBack: () => void;
  icon?: string;
  right?: ReactNode;
}) {
  return (
    <div className="bg-navy text-white -mt-11 pt-14 pb-3 px-3 flex items-center gap-1 shrink-0">
      <button
        onClick={onBack}
        className="size-14 rounded-full hover:bg-white/10 grid place-items-center"
        aria-label="Quay lại"
      >
        <Icon name={icon} className="size-7" />
      </button>
      <div className="flex-1 min-w-0 leading-tight">
        <div className="text-xl font-extrabold truncate">{title}</div>
        {sub && <div className="text-sm text-slate-300 truncate">{sub}</div>}
      </div>
      {right}
    </div>
  );
}
const Foot = ({ children }: { children: ReactNode }) => (
  <div className="bg-surface border-t-2 border-line px-4 pt-3 pb-8 shrink-0 space-y-3">
    {children}
  </div>
);
const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={cn("bg-surface border-2 border-line rounded-[22px] p-5", className)}>
    {children}
  </div>
);
const H = ({ children }: { children: ReactNode }) => (
  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-3">{children}</h3>
);
const Warn = ({ children, tone = "red" }: { children: ReactNode; tone?: "red" | "amber" }) => (
  <div
    className={cn(
      "flex gap-2.5 rounded-xl p-3.5 text-[15px] font-medium",
      tone === "red" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900",
    )}
  >
    <Icon name="alert" className="size-5 shrink-0 mt-0.5" />
    {children}
  </div>
);

function useTrip(tripId?: string) {
  const d = useDriver();
  const id = tripId ?? d.selectedId;
  const trip = d.trips.find((t) => t.id === id);
  return { ...d, trip, stops: trip ? d.getStops(trip.id) : [] };
}
const NoTrip = ({ go }: DNav) => (
  <PhoneFrame statusLight className="bg-canvas">
    <Bar title="Chuyến đi" onBack={() => go("trips")} />
    <EmptyState title="Chưa chọn chuyến" body="Vui lòng chọn một chuyến từ danh sách." />
  </PhoneFrame>
);

/* ---------- Bản đồ lộ trình ---------- */
function RouteMap({
  groups,
  stops,
  height,
  showVehicle,
}: {
  groups: Group[];
  stops: DStop[];
  height: number;
  showVehicle?: boolean;
}) {
  const n = groups.length;
  const cur = currentStop(stops);
  const curIdx = cur ? groups.findIndex((g) => g.stopIds.includes(cur.id)) : n - 1;
  const points = fitLocationPoints(
    groups.map((g) => g.location),
    390,
    height,
  );
  const pos = (i: number) => {
    const p = points[i] ?? { x: 195, y: height / 2 };
    return { left: `${(p.x / 390) * 100}%`, top: `${(p.y / height) * 100}%` };
  };
  const d = points.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  const done = showVehicle ? Math.max(0, curIdx) / Math.max(1, n - 1) : 0;
  return (
    <div className="relative overflow-hidden bg-[#E8EEF5]" style={{ height }}>
      <svg
        viewBox={`0 0 390 ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 size-full"
        aria-hidden
      >
        <g stroke="#fff" strokeWidth="12" fill="none">
          <path
            d={`M-10 ${height * 0.3} Q130 ${height * 0.4} 210 ${height * 0.2} T410 ${height * 0.4}`}
          />
          <path d={`M70 -10 L130 ${height + 10}`} />
          <path d={`M310 -10 L270 ${height + 10}`} />
        </g>
        <g stroke="#fff" strokeWidth="5" fill="none">
          <path d={`M-10 ${height * 0.75} L410 ${height * 0.85}`} />
          <path d={`M190 -10 L215 ${height + 10}`} />
        </g>
        <path d={d} stroke="#BFD3F7" strokeWidth="7" strokeLinecap="round" fill="none" />
        {showVehicle && (
          <path
            d={d}
            pathLength={1}
            strokeDasharray={`${done} 1`}
            stroke="#2563EB"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
          />
        )}
      </svg>
      {groups.map((g, i) => {
        const allDone = g.stopIds.every((id) => stops.find((s) => s.id === id)?.status === "done");
        const isCur = showVehicle && i === curIdx && !allDone;
        const col =
          allDone && showVehicle
            ? "bg-success"
            : isCur
              ? "bg-primary ring-4 ring-primary/30"
              : "bg-navy";
        const tag =
          g.label === "Đón"
            ? "bg-teal text-navy"
            : g.label === "Trả"
              ? "bg-danger text-white"
              : "bg-warning text-navy";
        return (
          <div
            key={g.key}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={pos(i)}
          >
            <span
              className={cn(
                "size-9 rounded-full text-white font-extrabold grid place-items-center ring-2 ring-white",
                col,
              )}
            >
              {allDone && showVehicle ? <Icon name="check" className="size-5" /> : g.n}
            </span>
            <span
              className={cn(
                "mt-1 text-[11px] font-bold rounded-full px-2 py-0.5 whitespace-nowrap",
                tag,
              )}
            >
              {g.label}
            </span>
          </div>
        );
      })}
      {showVehicle && curIdx >= 0 && (
        <span
          className="absolute -translate-x-1/2 -translate-y-1/2 size-8 rounded-full bg-navy text-white grid place-items-center ring-2 ring-white"
          style={{ ...pos(curIdx), zIndex: 5 }}
        >
          <Icon name="bus" className="size-4" />
        </span>
      )}
    </div>
  );
}

const dateStr = (t: DTrip) => `${dayLabel(t.date)}, ${t.date.split("-").reverse().join("/")}`;

/* ---------- DR-04 / DR-05 ---------- */
function DetailsBody({ t, stops }: { t: DTrip; stops: DStop[] }) {
  const groups = groupStops(stops);
  const pax = stops.filter((s) => s.type === "pickup");
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [scrollbar-width:none]">
      <Card>
        <div className="flex items-center justify-between">
          <span className="font-mono text-sm font-bold text-slate-500">{t.code}</span>
          <Badge t={t} />
        </div>
        <div className="mt-2 text-2xl font-extrabold leading-tight">
          {t.from} → {t.to}
        </div>
        <div className="mt-1 text-slate-600">{dateStr(t)}</div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            [t.depart, "Khởi hành"],
            [t.arrive, "Dự kiến đến"],
            [`${tripKm(t)} km`, fmtMin(tripMinutes(t))],
          ].map(([v, l]) => (
            <div key={l} className="bg-slate-50 rounded-xl py-3">
              <div className="text-xl font-extrabold">{v}</div>
              <div className="text-xs text-slate-500 font-medium">{l}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <H>Phương tiện</H>
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-blue-50 text-primary grid place-items-center">
            <Icon name="car" className="size-8" />
          </div>
          <div>
            <div className="font-bold text-lg">{t.plate}</div>
            <div className="text-slate-600">{t.vehicle}</div>
            <div className="text-sm text-slate-500">
              {t.pax}/{t.seatsTotal} chỗ đã đặt
            </div>
          </div>
        </div>
      </Card>
      <Card>
        <H>Hành khách ({t.pax} khách)</H>
        {pax.length === 0 && <p className="text-slate-500">Chưa có hành khách.</p>}
        <div className="divide-y-2 divide-line">
          {pax.map((p) => {
            const drop = stops.find((s) => s.type === "dropoff" && s.pid === p.pid);
            return (
              <div key={p.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-lg">{p.name}</span>
                  <span className="text-sm font-semibold bg-slate-100 rounded-full px-3 py-1">
                    {p.seats} khách
                  </span>
                </div>
                <div className="mt-1 text-[15px] text-slate-600">
                  <span className="font-semibold text-teal">Đón:</span> {p.address}
                </div>
                <div className="text-[15px] text-slate-600">
                  <span className="font-semibold text-danger">Trả:</span> {drop?.address}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <H>Tổng quan lộ trình</H>
        <ol className="space-y-3">
          {groups.map((g) => (
            <li key={g.key} className="flex gap-3 items-start">
              <span className="size-8 rounded-full bg-navy text-white font-bold text-sm grid place-items-center shrink-0">
                {g.n}
              </span>
              <div className="flex-1">
                <div className="font-semibold leading-snug">{g.address}</div>
                <div className="text-sm text-slate-500">
                  {g.label} · {g.time} · {g.seats} khách
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

export function TripDetails(props: DNav) {
  const { go } = props;
  const { trip: t, stops, setIntent } = useTrip(props.tripId);
  if (!t) return <NoTrip {...props} />;
  return (
    <PhoneFrame statusLight className="bg-canvas">
      <Bar
        title="Chi tiết chuyến"
        sub={`${t.code} · ${t.from} → ${t.to}`}
        onBack={() => go("trips")}
      />
      <DetailsBody t={t} stops={stops} />
      <Foot>
        {t.status === "pending" && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              size="xl"
              variant="secondary"
              className="!text-danger !border-danger/40"
              onClick={() => {
                setIntent("reject");
                go("accept");
              }}
            >
              Từ chối
            </Button>
            <Button
              size="xl"
              onClick={() => {
                setIntent("accept");
                go("accept");
              }}
            >
              Nhận chuyến
            </Button>
          </div>
        )}
        {t.status === "confirmed" && (
          <Button size="xl" fullWidth icon="route" onClick={() => go("route")}>
            Xem lộ trình tối ưu
          </Button>
        )}
        {t.status === "ongoing" && (
          <Button size="xl" fullWidth icon="bus" onClick={() => go("active")}>
            Tiếp tục chuyến
          </Button>
        )}
        {(t.status === "completed" || t.status === "cancelled" || t.status === "rejected") && (
          <div className="text-center font-semibold text-slate-500 py-3">
            Chuyến này{" "}
            {t.status === "completed"
              ? "đã hoàn thành"
              : t.status === "rejected"
                ? "đã bị bạn từ chối"
                : "đã bị hủy"}
            .
          </div>
        )}
      </Foot>
    </PhoneFrame>
  );
}

const reasons = [
  "Xe đang bận hoặc cần bảo dưỡng",
  "Trùng lịch với chuyến khác",
  "Lý do cá nhân / sức khỏe",
];
export function TripAcceptance(props: DNav) {
  const { go } = props;
  const { trip: t, stops, acceptTrip, rejectTrip, intent } = useTrip(props.tripId);
  const [step, setStep] = useState<"ask" | "reason">(intent === "reject" ? "reason" : "ask");
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);
  if (!t) return <NoTrip {...props} />;
  const pending = t.status === "pending";
  return (
    <PhoneFrame statusLight className="bg-canvas">
      <Bar
        title="Chi tiết chuyến"
        sub={`${t.code} · ${t.from} → ${t.to}`}
        onBack={() => go("details")}
      />
      <DetailsBody t={t} stops={stops} />
      <Modal
        contained
        open
        title={step === "ask" ? "Xác nhận nhận chuyến?" : "Từ chối chuyến"}
        onClose={() => go("details")}
        width="max-w-md"
      >
        <div className="rounded-2xl bg-slate-50 p-4 text-slate-800">
          <div className="text-lg font-extrabold leading-tight">
            {t.from} → {t.to}
          </div>
          <div className="mt-1 text-[15px]">
            {dateStr(t)} · {t.depart}
          </div>
          <div className="mt-1 text-[15px]">
            {t.pax} khách · {t.plate}
          </div>
        </div>
        {!pending ? (
          <div className="mt-4">
            <Warn tone="amber">
              Chuyến này đã được phản hồi ({t.status === "rejected" ? "đã từ chối" : "đã nhận"}).
            </Warn>
            <Button size="xl" fullWidth className="mt-4" onClick={() => go("details")}>
              Quay lại chi tiết
            </Button>
          </div>
        ) : step === "ask" ? (
          <div className="mt-4 space-y-3">
            <p className="text-[15px]">
              Khi nhận chuyến, bạn cam kết có mặt đúng giờ và thực hiện theo lộ trình đã tối ưu.
            </p>
            <Button
              size="xl"
              fullWidth
              onClick={() => {
                acceptTrip(t.id);
                go("route");
              }}
            >
              Nhận chuyến
            </Button>
            <Button
              size="xl"
              fullWidth
              variant="secondary"
              className="!text-danger !border-danger/40"
              onClick={() => setStep("reason")}
            >
              Từ chối chuyến
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-[15px] font-semibold">
              Chọn lý do từ chối <span className="text-danger">*</span>
            </p>
            <div className="space-y-3.5">
              {reasons.map((r) => (
                <Radio
                  key={r}
                  name="reason"
                  label={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                />
              ))}
            </div>
            {tried && !reason && (
              <p className="text-sm text-danger font-medium">Vui lòng chọn lý do từ chối.</p>
            )}
            <Button
              size="xl"
              fullWidth
              variant="destructive"
              onClick={() => {
                setTried(true);
                if (reason) {
                  rejectTrip(t.id);
                  go("trips");
                }
              }}
            >
              Xác nhận từ chối
            </Button>
            <Button size="xl" fullWidth variant="secondary" onClick={() => setStep("ask")}>
              Quay lại
            </Button>
          </div>
        )}
      </Modal>
    </PhoneFrame>
  );
}

/* ---------- DR-06 ---------- */
export function OptimizedRoute(props: DNav) {
  const { go } = props;
  const { trip: t, stops, startTrip } = useTrip(props.tripId);
  const [confirm, setConfirm] = useState(false);
  if (!t) return <NoTrip {...props} />;
  const groups = groupStops(stops);
  const km = tripKm(t),
    min = tripMinutes(t);
  const canStart = t.status === "confirmed";
  return (
    <PhoneFrame statusLight className="bg-canvas">
      <Bar
        title="Lộ trình tối ưu"
        sub={`${t.code} · ${t.from} → ${t.to}`}
        onBack={() => go("details")}
      />
      <div className="flex-1 overflow-y-auto [scrollbar-width:none]">
        <RouteMap groups={groups} stops={stops} height={250} />
        <div className="px-4 py-4 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center -mt-10 relative">
            {[
              [`${km} km`, "Quãng đường"],
              [fmtMin(min), "Thời gian"],
              [`${groups.length}`, `Điểm dừng (${stops.length} lượt)`],
            ].map(([v, l]) => (
              <div
                key={l}
                className="bg-surface border-2 border-line rounded-2xl py-3 px-1"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="text-lg font-extrabold text-primary leading-tight">{v}</div>
                <div className="text-[11px] font-medium text-slate-600">{l}</div>
              </div>
            ))}
          </div>
          <Card>
            <H>Thứ tự điểm dừng</H>
            <ol>
              {groups.map((g, i) => {
                const names = g.stopIds.map((id) =>
                  stops
                    .find((s) => s.id === id)!
                    .name.split(" ")
                    .slice(-2)
                    .join(" "),
                );
                return (
                  <li key={g.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span className="size-9 rounded-full bg-navy text-white font-extrabold grid place-items-center shrink-0">
                        {g.n}
                      </span>
                      {i < groups.length - 1 && <span className="w-0.5 flex-1 bg-slate-200 my-1" />}
                    </div>
                    <div className="pb-5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "text-xs font-bold rounded-full px-2.5 py-1",
                            g.label === "Đón"
                              ? "bg-teal/20 text-teal-800"
                              : g.label === "Trả"
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-900",
                          )}
                        >
                          {g.label.toUpperCase()}
                        </span>
                        <span className="font-mono text-sm font-bold text-slate-500">{g.time}</span>
                      </div>
                      <div className="mt-1 font-bold leading-snug">{g.address}</div>
                      <div className="text-sm text-slate-500">
                        {g.seats} lượt khách · {names.join(", ")}
                      </div>
                      {i < groups.length - 1 && (
                        <div className="text-xs text-slate-400 mt-1">
                          → {Math.round(km / (groups.length - 1))} km ·{" "}
                          {fmtMin(Math.round(min / (groups.length - 1)))} đến điểm kế tiếp
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
          <div className="flex gap-2.5 text-sm text-slate-600 bg-slate-100 rounded-xl p-3.5">
            <Icon name="info" className="size-5 shrink-0" />
            Lộ trình được sắp xếp để mỗi hành khách được đón trước khi được trả.
          </div>
        </div>
      </div>
      <Foot>
        {canStart && (
          <Button size="xl" fullWidth icon="bus" onClick={() => setConfirm(true)}>
            Bắt đầu chuyến
          </Button>
        )}
        {t.status === "ongoing" && (
          <Button size="xl" fullWidth icon="bus" onClick={() => go("active")}>
            Tiếp tục chuyến
          </Button>
        )}
        {t.status === "pending" && (
          <>
            <Button size="xl" fullWidth disabled>
              Bắt đầu chuyến
            </Button>
            <p className="text-center text-sm text-slate-500">
              Bạn cần nhận chuyến trước khi bắt đầu.
            </p>
          </>
        )}
        {(t.status === "completed" || t.status === "cancelled" || t.status === "rejected") && (
          <p className="text-center font-semibold text-slate-500 py-3">
            Chuyến này không còn hoạt động.
          </p>
        )}
      </Foot>
      <ConfirmDialog
        contained
        large
        open={confirm}
        title="Bắt đầu chuyến?"
        message={`Chuyến ${t.from} → ${t.to} lúc ${t.depart} với ${t.pax} khách sẽ chuyển sang trạng thái đang chạy.`}
        confirmLabel="Bắt đầu chuyến"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          startTrip(t.id);
          setConfirm(false);
          go("active");
        }}
      />
    </PhoneFrame>
  );
}

/* ---------- DR-07 ---------- */
export function ActiveTrip(props: DNav) {
  const { go } = props;
  const { trip: t, stops, setStopId, completeTrip } = useTrip(props.tripId);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState("");
  if (!t) return <NoTrip {...props} />;
  const groups = groupStops(stops);
  const cur = currentStop(stops);
  const left = remaining(stops);
  const rest = stops.filter((s) => s.status !== "done");
  const nxt = rest[1];
  const doneN = stops.length - left;
  const open = (id: string) => {
    setStopId(id);
    go("stop");
  };
  const typeTag = (s: DStop) => (
    <span
      className={cn(
        "text-xs font-bold rounded-full px-2.5 py-0.5",
        s.type === "pickup" ? "bg-teal/20 text-teal-800" : "bg-red-100 text-red-800",
      )}
    >
      {s.type === "pickup" ? "ĐÓN" : "TRẢ"}
    </span>
  );
  return (
    <PhoneFrame className="bg-canvas">
      <div className="relative shrink-0 -mt-11" style={{ height: 270 }}>
        <RouteMap groups={groups} stops={stops} height={270} showVehicle />
        <div className="absolute top-14 left-3 right-3 flex items-center gap-2 z-10">
          <button
            onClick={() => go("route")}
            className="size-14 rounded-full bg-surface grid place-items-center shrink-0"
            style={{ boxShadow: "var(--shadow-card)" }}
            aria-label="Quay lại"
          >
            <Icon name="left" className="size-7" />
          </button>
          <div
            className="flex-1 min-w-0 bg-navy text-white rounded-2xl px-4 py-2.5 flex items-center gap-3"
            style={{ boxShadow: "var(--shadow-dropdown)" }}
          >
            <Icon name="route" className="size-6 text-teal shrink-0" />
            <div className="min-w-0 leading-tight">
              <div className="text-xs text-slate-300">
                {cur ? "Điểm đến hiện tại" : "Đã xử lý hết điểm dừng"}
              </div>
              <div className="font-bold truncate">{cur ? cur.address : `${t.from} → ${t.to}`}</div>
            </div>
          </div>
        </div>
      </div>
      <div
        className="flex-1 -mt-5 relative z-10 bg-canvas rounded-t-[28px] overflow-y-auto px-4 pt-5 pb-3 space-y-3 [scrollbar-width:none]"
        style={{ boxShadow: "0 -8px 24px rgba(15,23,42,.08)" }}
      >
        <Card className="!p-4">
          <div className="flex items-center justify-between text-sm font-bold">
            <span>Tiến độ chuyến</span>
            <span className="text-primary">
              {doneN}/{stops.length} điểm dừng
            </span>
          </div>
          <div className="mt-2 h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${(doneN / Math.max(1, stops.length)) * 100}%` }}
            />
          </div>
        </Card>
        {cur ? (
          <div className="rounded-[22px] bg-primary text-white p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold opacity-90">Điểm dừng hiện tại</span>
              <span className="text-sm font-bold bg-white/20 rounded-full px-3 py-0.5">
                {cur.type === "pickup" ? "ĐÓN KHÁCH" : "TRẢ KHÁCH"}
              </span>
            </div>
            <div className="mt-1.5 text-xl font-extrabold leading-tight">
              {cur.name} · {cur.seats} khách
            </div>
            <div className="text-sm opacity-90">
              {cur.address} · {cur.time}
              {cur.status === "arrived" ? " · Đã đến" : ""}
            </div>
          </div>
        ) : (
          <div className="rounded-[22px] bg-success text-white p-4 font-bold flex items-center gap-3">
            <Icon name="check" className="size-7" />
            Tất cả điểm dừng đã hoàn tất. Bạn có thể hoàn thành chuyến.
          </div>
        )}
        {nxt && (
          <Card className="!p-4 flex items-center gap-3">
            <div className="size-10 rounded-full bg-slate-100 grid place-items-center">
              <Icon name="right" className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-500">Điểm dừng kế tiếp</div>
              <div className="font-bold truncate">
                {nxt.type === "pickup" ? "Đón" : "Trả"} {nxt.name} · {nxt.address}
              </div>
            </div>
          </Card>
        )}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 mb-2">
            Danh sách điểm dừng
          </h3>
          <div className="space-y-2">
            {stops.map((s) => (
              <button
                key={s.id}
                onClick={() => open(s.id)}
                className={cn(
                  "w-full text-left flex items-center gap-3 rounded-2xl border-2 p-3 bg-surface",
                  cur?.id === s.id ? "border-primary" : "border-line",
                  s.status === "done" && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "size-9 rounded-full grid place-items-center shrink-0 text-white",
                    s.status === "done"
                      ? "bg-success"
                      : s.status === "arrived"
                        ? "bg-primary"
                        : "bg-slate-300",
                  )}
                >
                  {s.status === "done" ? (
                    <Icon name="check" className="size-5" />
                  ) : s.status === "arrived" ? (
                    <Icon name="pin" className="size-5" />
                  ) : (
                    <Icon name="clock" className="size-4" />
                  )}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-2">
                    {typeTag(s)}
                    <span className="font-bold truncate">{s.name}</span>
                  </span>
                  <span className="block text-sm text-slate-500 truncate">
                    {s.address} · {s.time}
                  </span>
                </span>
                <Icon name="right" className="size-5 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      </div>
      <Foot>
        {err && <Warn>{err}</Warn>}
        {cur ? (
          <Button size="xl" fullWidth onClick={() => open(cur.id)}>
            {cur.type === "pickup" ? "Xử lý điểm đón" : "Xử lý điểm trả"} ·{" "}
            {cur.name.split(" ").slice(-1)}
          </Button>
        ) : (
          <Button size="xl" fullWidth icon="check" onClick={() => setConfirm(true)}>
            Hoàn thành chuyến
          </Button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Button size="lg" variant="secondary" icon="alert" onClick={() => go("incident")}>
            Báo sự cố
          </Button>
          {cur ? (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                const e =
                  left > 0 ? `Còn ${left} điểm dừng chưa xử lý. Không thể hoàn thành chuyến.` : "";
                setErr(e);
                if (!e) setConfirm(true);
              }}
              className="!border-slate-300"
            >
              Hoàn thành ({left})
            </Button>
          ) : (
            <div />
          )}
        </div>
      </Foot>
      <ConfirmDialog
        contained
        large
        open={confirm}
        title="Hoàn thành chuyến?"
        message={`Bạn đã xử lý ${doneN}/${stops.length} điểm dừng. Sau khi hoàn thành sẽ không thể thay đổi.`}
        confirmLabel="Hoàn thành chuyến"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          const e = completeTrip(t.id);
          setConfirm(false);
          setErr(e ?? "");
          if (!e) go("completed");
        }}
      />
    </PhoneFrame>
  );
}

/* ---------- DR-08 ---------- */
export function StopDetails(props: DNav) {
  const { go } = props;
  const { trip: t, stops, stopId, applyAction } = useTrip(props.tripId);
  const [confirm, setConfirm] = useState(false);
  const [err, setErr] = useState("");
  if (!t) return <NoTrip {...props} />;
  const s = stops.find((x) => x.id === stopId) ?? currentStop(stops);
  if (!s)
    return (
      <PhoneFrame statusLight className="bg-canvas">
        <Bar title="Điểm dừng" onBack={() => go("active")} />
        <EmptyState title="Không có điểm dừng" body="Chuyến này chưa có điểm dừng." />
      </PhoneFrame>
    );
  const r = stopRule(stops, s);
  const pick = s.type === "pickup";
  const finalAct = pick ? "PICKED_UP" : "DROPPED_OFF";
  const steps = ["Chưa đến", "Đã đến", pick ? "Đã đón" : "Đã trả"];
  const stepIdx = s.status === "pending" ? 0 : s.status === "arrived" ? 1 : 2;
  const idx = stops.findIndex((x) => x.id === s.id) + 1;
  return (
    <PhoneFrame statusLight className="bg-canvas">
      <Bar
        title={`Điểm dừng ${idx}/${stops.length}`}
        sub={`${t.code} · ${t.from} → ${t.to}`}
        onBack={() => go("active")}
      />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [scrollbar-width:none]">
        <div
          className={cn("rounded-[22px] p-5 text-white", pick ? "bg-teal !text-navy" : "bg-danger")}
        >
          <div className="text-sm font-bold tracking-wide opacity-90">
            {pick ? "ĐÓN KHÁCH" : "TRẢ KHÁCH"}
          </div>
          <div className="mt-1 text-[28px] font-extrabold leading-tight">{s.name}</div>
          <div className="mt-1 font-semibold">
            {s.seats} khách · dự kiến {s.time}
          </div>
        </div>
        <Card>
          <div className="flex gap-3">
            <Icon
              name="pin"
              className={cn("size-7 shrink-0", pick ? "text-teal" : "text-danger")}
            />
            <div>
              <div className="text-sm text-slate-500 font-medium">
                {pick ? "Địa chỉ đón" : "Địa chỉ trả"}
              </div>
              <div className="text-lg font-bold leading-snug">{s.address}</div>
              <div className="text-xs font-mono text-primary mt-1">GPS: {gpsLabel(s.location)}</div>
              {s.note && <div className="mt-1 text-[15px] text-slate-600">Ghi chú: {s.note}</div>}
            </div>
          </div>
        </Card>
        <Card className="flex items-center gap-4">
          <div className="flex-1">
            <div className="text-sm text-slate-500 font-medium">Liên hệ hành khách</div>
            <div className="text-xl font-bold">{s.phone}</div>
          </div>
          <a
            href={`tel:${s.phone.replace(/\s/g, "")}`}
            className="size-16 rounded-full bg-success text-white grid place-items-center"
            aria-label="Gọi hành khách"
          >
            <Icon name="phone" className="size-8" />
          </a>
        </Card>
        <Card>
          <H>Trạng thái</H>
          <div className="flex items-center">
            {steps.map((l, i) => (
              <div key={l} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1">
                  <span
                    className={cn(
                      "size-9 rounded-full grid place-items-center font-bold text-sm",
                      i <= stepIdx ? "bg-primary text-white" : "bg-slate-200 text-slate-500",
                    )}
                  >
                    {i < stepIdx || (i === 2 && stepIdx === 2) ? (
                      <Icon name="check" className="size-5" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      i <= stepIdx ? "text-primary" : "text-slate-400",
                    )}
                  >
                    {l}
                  </span>
                </div>
                {i < 2 && (
                  <span
                    className={cn(
                      "flex-1 h-1 mx-2 mb-5 rounded",
                      i < stepIdx ? "bg-primary" : "bg-slate-200",
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </Card>
        {r.blocked && <Warn>{r.blocked} Hãy hoàn tất điểm đón của hành khách này trước.</Warn>}
        {err && <Warn>{err}</Warn>}
        {s.status === "done" && (
          <div className="rounded-xl bg-green-50 text-green-800 p-3.5 font-semibold flex gap-2.5">
            <Icon name="check" className="size-5 shrink-0" />
            Điểm dừng này đã hoàn tất.
          </div>
        )}
      </div>
      <Foot>
        {s.status === "done" ? (
          <Button size="xl" fullWidth onClick={() => go("active")}>
            Quay lại chuyến đi
          </Button>
        ) : (
          <>
            <Button
              size="xl"
              fullWidth
              variant={r.next === "ARRIVED" ? "primary" : "secondary"}
              disabled={r.next !== "ARRIVED"}
              icon="pin"
              onClick={() => {
                const e = applyAction(t.id, s.id, "ARRIVED");
                setErr(e ?? "");
              }}
            >
              ĐÃ ĐẾN ĐIỂM DỪNG
            </Button>
            <Button
              size="xl"
              fullWidth
              variant={r.next === finalAct ? "primary" : "secondary"}
              disabled={r.next !== finalAct}
              icon="check"
              onClick={() => setConfirm(true)}
            >
              {pick ? "ĐÃ ĐÓN KHÁCH" : "ĐÃ TRẢ KHÁCH"}
            </Button>
            {r.next === finalAct
              ? null
              : !r.blocked &&
                s.status === "pending" && (
                  <p className="text-center text-sm text-slate-500">
                    Bấm "Đã đến" trước khi xác nhận {pick ? "đón" : "trả"} khách.
                  </p>
                )}
          </>
        )}
      </Foot>
      <ConfirmDialog
        contained
        large
        open={confirm}
        title={pick ? "Xác nhận đã đón khách?" : "Xác nhận đã trả khách?"}
        message={`${s.name} (${s.seats} khách) ${pick ? "đã lên xe" : "đã xuống xe"} tại ${s.address}.`}
        confirmLabel={pick ? "Đã đón khách" : "Đã trả khách"}
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          const e = applyAction(t.id, s.id, finalAct);
          setConfirm(false);
          setErr(e ?? "");
          if (!e) go("active");
        }}
      />
    </PhoneFrame>
  );
}

/* ---------- DR-09 ---------- */
const incidentTypes: [string, string][] = [
  ["Sự cố phương tiện", "car"],
  ["Tai nạn giao thông", "alert"],
  ["Kẹt xe kéo dài", "clock"],
  ["Hành khách không có mặt", "users"],
  ["Vấn đề an toàn", "shield"],
  ["Sự cố khác", "info"],
];
export function IncidentReport(props: DNav) {
  const { go } = props;
  const { trip: t, addIncident } = useTrip(props.tripId);
  const [type, setType] = useState("");
  const [text, setText] = useState("");
  const [tried, setTried] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [sent, setSent] = useState(false);
  if (!t) return <NoTrip {...props} />;
  const e = {
    type: !type ? "Vui lòng chọn loại sự cố" : "",
    text: text.trim().length < 10 ? "Vui lòng mô tả ít nhất 10 ký tự" : "",
  };
  if (sent) {
    return (
      <PhoneFrame statusLight className="bg-canvas">
        <Bar title="Báo sự cố" onBack={() => go("active")} />
        <div className="flex-1 grid place-items-center text-center px-8">
          <div>
            <div className="mx-auto size-24 rounded-full bg-success/15 grid place-items-center">
              <span className="size-16 rounded-full bg-success text-white grid place-items-center">
                <Icon name="check" className="size-9" />
              </span>
            </div>
            <h2 className="mt-5 text-2xl font-extrabold">Đã gửi báo cáo</h2>
            <p className="mt-2 text-slate-600">
              Nhà xe {driver.company.replace("Nhà xe ", "")} đã nhận báo cáo "{type}". Bộ phận điều
              hành sẽ liên hệ với bạn sớm.
            </p>
          </div>
        </div>
        <Foot>
          <Button size="xl" fullWidth onClick={() => go("active")}>
            Quay lại chuyến đi
          </Button>
        </Foot>
      </PhoneFrame>
    );
  }
  return (
    <PhoneFrame statusLight className="bg-canvas">
      <Bar
        title="Báo sự cố"
        sub={`${t.code} · ${t.from} → ${t.to}`}
        icon="x"
        onBack={() => go("active")}
      />
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 [scrollbar-width:none]">
        <Card>
          <H>
            Loại sự cố <span className="text-danger">*</span>
          </H>
          <div className="grid grid-cols-2 gap-3">
            {incidentTypes.map(([l, i]) => (
              <button
                key={l}
                onClick={() => setType(l)}
                aria-pressed={type === l}
                className={cn(
                  "rounded-2xl border-2 p-3.5 text-left min-h-[88px] flex flex-col gap-2",
                  type === l ? "border-primary bg-blue-50 text-primary" : "border-line",
                )}
              >
                <Icon name={i} className="size-7" />
                <span className="font-bold text-[15px] leading-tight text-navy">{l}</span>
              </button>
            ))}
          </div>
          {tried && e.type && <p className="mt-2 text-sm text-danger font-medium">{e.type}</p>}
        </Card>
        <Card>
          <label className="block">
            <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Mô tả <span className="text-danger">*</span>
            </span>
            <textarea
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              maxLength={500}
              rows={5}
              placeholder="Mô tả ngắn gọn điều gì đã xảy ra, vị trí hiện tại và hành khách bị ảnh hưởng..."
              className={cn(
                "mt-3 w-full rounded-xl border-2 px-4 py-3 text-base outline-none resize-none placeholder:text-slate-400 focus:border-primary focus:ring-4 focus:ring-primary/15",
                tried && e.text ? "border-danger" : "border-line",
              )}
            />
          </label>
          <div className="flex justify-between text-sm">
            <span className="text-danger font-medium">{tried ? e.text : ""}</span>
            <span className="text-slate-400">{text.length}/500</span>
          </div>
        </Card>
      </div>
      <Foot>
        <Button
          size="xl"
          fullWidth
          variant="destructive"
          icon="alert"
          onClick={() => {
            setTried(true);
            if (!e.type && !e.text) setConfirm(true);
          }}
        >
          Gửi báo cáo
        </Button>
      </Foot>
      <ConfirmDialog
        contained
        large
        open={confirm}
        title="Gửi báo cáo sự cố?"
        message={`Loại: ${type}. Báo cáo sẽ được gửi đến nhà xe và quản trị viên ngay lập tức.`}
        confirmLabel="Gửi báo cáo"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          addIncident({ tripId: t.id, type, text });
          setConfirm(false);
          setSent(true);
        }}
      />
    </PhoneFrame>
  );
}

/* ---------- DR-10 ---------- */
export function TripCompleted(props: DNav) {
  const { go } = props;
  const { trip: t, stops: raw, demo, incidents } = useTrip(props.tripId);
  if (!t) return <NoTrip {...props} />;
  // Bản xem trước tĩnh: hiển thị trạng thái "đã xử lý hết" khi đang ở chế độ demo.
  const stops =
    demo && remaining(raw) > 0 ? raw.map((s) => ({ ...s, status: "done" as const })) : raw;
  const left = remaining(stops);
  if (left > 0) {
    return (
      <PhoneFrame statusLight className="bg-canvas">
        <Bar title="Hoàn thành chuyến" onBack={() => go("active")} />
        <div className="flex-1 px-4 py-6">
          <Warn>Còn {left} điểm dừng chưa xử lý. Không thể hoàn thành chuyến.</Warn>
        </div>
        <Foot>
          <Button size="xl" fullWidth onClick={() => go("active")}>
            Quay lại chuyến đi
          </Button>
        </Foot>
      </PhoneFrame>
    );
  }
  const pk = stops.filter((s) => s.type === "pickup"),
    dp = stops.filter((s) => s.type === "dropoff");
  const rows: [string, string][] = [
    ["Tuyến", `${t.from} → ${t.to}`],
    ["Ngày", dateStr(t)],
    ["Giờ chạy", `${t.depart} – ${t.arrive}`],
    ["Quãng đường", `${tripKm(t)} km`],
    ["Hành khách", `${t.pax} khách`],
    ["Phương tiện", t.plate],
    ["Sự cố đã báo", String(incidents.filter((i) => i.tripId === t.id).length)],
  ];
  return (
    <PhoneFrame statusLight className="bg-canvas">
      <div className="flex-1 overflow-y-auto pb-4 [scrollbar-width:none]">
        <div className="bg-navy text-white -mt-11 pt-16 pb-14 px-5 text-center">
          <div className="mx-auto size-24 rounded-full bg-success/25 grid place-items-center">
            <span className="size-16 rounded-full bg-success grid place-items-center">
              <Icon name="check" className="size-9" />
            </span>
          </div>
          <h1 className="mt-4 text-[28px] font-extrabold">Chuyến đã hoàn thành</h1>
          <p className="text-slate-300">
            {t.code} · Cảm ơn {driver.short}, bạn đã làm rất tốt!
          </p>
        </div>
        <div className="px-4 -mt-8 space-y-4">
          <div
            className="bg-surface border-2 border-line rounded-[22px] p-5 text-center"
            style={{ boxShadow: "var(--shadow-card)" }}
          >
            <div className="text-sm font-bold uppercase tracking-wide text-slate-500">
              Điểm dừng đã xử lý
            </div>
            <div className="mt-1 text-[40px] font-extrabold text-primary leading-none">
              {stops.length}/{stops.length}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm font-semibold">
              <div className="bg-teal/15 text-teal-900 rounded-xl py-2.5">
                Đã đón {pk.length}/{pk.length}
              </div>
              <div className="bg-red-50 text-red-800 rounded-xl py-2.5">
                Đã trả {dp.length}/{dp.length}
              </div>
            </div>
          </div>
          <Card>
            <H>Tóm tắt chuyến</H>
            <div className="divide-y-2 divide-line">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5 text-[15px]">
                  <span className="text-slate-500">{k}</span>
                  <span className="font-bold text-right">{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <Foot>
        <Button size="xl" fullWidth onClick={() => go("home")}>
          Về trang chủ
        </Button>
        <Button size="lg" fullWidth variant="secondary" onClick={() => go("trips")}>
          Danh sách chuyến
        </Button>
      </Foot>
    </PhoneFrame>
  );
}

export const tripScreens = [
  { id: "details", code: "DR-04", title: "Chi tiết chuyến", Comp: TripDetails },
  { id: "accept", code: "DR-05", title: "Xác nhận nhận chuyến", Comp: TripAcceptance },
  { id: "route", code: "DR-06", title: "Lộ trình tối ưu", Comp: OptimizedRoute },
  { id: "active", code: "DR-07", title: "Chuyến đang chạy", Comp: ActiveTrip },
  { id: "stop", code: "DR-08", title: "Chi tiết điểm dừng", Comp: StopDetails },
  { id: "incident", code: "DR-09", title: "Báo sự cố", Comp: IncidentReport },
  { id: "completed", code: "DR-10", title: "Hoàn thành chuyến", Comp: TripCompleted },
] as const;
