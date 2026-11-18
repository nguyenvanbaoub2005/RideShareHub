import { useEffect, useState, type ReactNode } from "react";
import Button from "../../components/ui/Button";
import Badge, { type BadgeKind } from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import { DataTable, Pagination } from "../../components/ui/Data";
import { TextInput, SearchInput, Field, inputBase } from "../../components/ui/Form";
import { ConfirmDialog, Modal } from "../../components/ui/Overlays";
import { cn } from "../../components/ui/cn";
import { formatVND } from "../../lib/format";
import { useOperations } from "./OperationsStore";
import type { CompanyScreen, CompanyStatus } from "./model";
import { LocationPicker } from "../../address/AddressFields";
import { validLocation, dispatchPoint, gpsLabel, fitLocationPoints } from "../../address/model";
import {
  tripIds,
  statusLabels,
  arrival,
  bookedSeats,
  seatsLeft,
  validateTrip,
  bookingError,
  updateBookingStops,
  estimate,
  optimizeStops,
  stopOrderError,
  advanceStop,
  type CompanyTrip,
  type CompanyBooking,
  type CompanyStop,
  type TripStatus,
} from "./tripsModel";

const box = "bg-surface border border-line rounded-[20px]";
const badgeKinds: Record<TripStatus, BadgeKind> = {
  draft: "pending",
  published: "active",
  active: "success",
  completed: "completed",
  cancelled: "error",
};
const fmtTime = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)} · ${s.slice(11)}`;
const freshTrip = (): CompanyTrip => ({
  id: "",
  routeId: "r1",
  departure: "2025-07-19T07:30",
  vehicleId: "",
  driverId: "",
  capacity: 16,
  fare: 120000,
  status: "draft",
});
const freshBooking = (tripId: string): CompanyBooking => ({
  id: "",
  tripId,
  passenger: "",
  phone: "",
  seats: 1,
  pickup: "",
  dropoff: "",
  pickupLocation: null,
  dropoffLocation: null,
  status: "confirmed",
});
const tripBadge = (t: CompanyTrip) => (
  <Badge kind={badgeKinds[t.status]}>{statusLabels[t.status]}</Badge>
);
function Select({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <Field label={label} status={error ? "error" : "default"} hint={error}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputBase(error ? "error" : "default")}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
function Message({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return (
    <div
      role={success ? "status" : "alert"}
      className={cn(
        "p-3.5 rounded-xl text-sm flex gap-2 border",
        success
          ? "bg-green-50 border-green-200 text-green-800"
          : "bg-red-50 border-red-200 text-red-800",
      )}
    >
      <Icon name={success ? "check" : "alert"} className="size-4 mt-0.5 shrink-0" />
      {children}
    </div>
  );
}
const Metric = ({ title, value, icon }: { title: string; value: ReactNode; icon: string }) => (
  <div className={cn(box, "p-5 flex gap-4 items-center")}>
    <span className="size-11 rounded-xl bg-blue-50 text-primary grid place-items-center">
      <Icon name={icon} />
    </span>
    <div>
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  </div>
);
const StopPill = ({ s }: { s: CompanyStop }) => (
  <span
    className={cn(
      "px-2 py-1 rounded-full text-[10px] font-bold",
      s.type === "pickup" ? "bg-teal-50 text-teal-800" : "bg-red-50 text-red-700",
    )}
  >
    {s.type === "pickup" ? "ĐÓN" : "TRẢ"}
  </span>
);

function RouteMap({
  stops,
  vehicle = false,
  title = "Sơ đồ lộ trình",
  progress = 0,
  origin = "Đà Nẵng",
  destination = "Huế",
}: {
  stops: CompanyStop[];
  vehicle?: boolean;
  title?: string;
  progress?: number;
  origin?: string;
  destination?: string;
}) {
  const fitted = fitLocationPoints(stops.map((s) => s.location));
  const points = stops.map((s, i) => {
    const offset =
      stops
        .slice(0, i)
        .filter((p) => p.location?.lat === s.location?.lat && p.location?.lng === s.location?.lng)
        .length * 12;
    return { x: fitted[i].x + offset, y: fitted[i].y - offset };
  });
  const nextIndex = stops.findIndex((s) => s.status !== "done");
  const currentIndex = Math.max(0, nextIndex < 0 ? stops.length - 1 : nextIndex);
  const current = points[currentIndex] ?? { x: 90, y: 300 };
  const last = points[Math.max(0, currentIndex - 1)] ?? current;
  return (
    <div className="relative h-[350px] overflow-hidden rounded-2xl bg-[#eaf0ef] border border-line">
      <svg
        viewBox="0 0 800 390"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={title}
      >
        <rect width="800" height="390" fill="#eef2ee" />
        <path
          d="M450 -20C350 70 500 130 415 205S370 340 450 420"
          stroke="#c5dfe9"
          strokeWidth="48"
          fill="none"
        />
        <g fill="#dce8db">
          <rect x="35" y="70" width="95" height="65" rx="16" />
          <rect x="535" y="190" width="130" height="70" rx="20" />
          <rect x="200" y="220" width="80" height="75" rx="16" />
        </g>
        <g stroke="white" fill="none" strokeWidth="12">
          <path d="M-10 75L810 110M0 290L810 325M160 0L205 400M610 0L540 400" />
          <path d="M0 190Q240 130 800 215" />
        </g>
        <g stroke="#d5dedb" fill="none" strokeWidth="2">
          <path d="M0 75L800 110M0 290L800 325M160 0L205 400M610 0L540 400" />
        </g>
        <g fontFamily="Inter" fill="#8b9d97" fontSize="12">
          <text x="55" y="355">
            {origin.toLocaleUpperCase("vi")}
          </text>
          <text x="620" y="50">
            {destination.toLocaleUpperCase("vi")}
          </text>
          <text x="385" y="190">
            Miền Trung
          </text>
        </g>
        <polyline
          points={points.map((p) => `${p.x},${p.y}`).join(" ")}
          stroke="#2563eb"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          opacity=".8"
        />
        {points.map((p, i) => (
          <g
            key={stops[i].id}
            transform={`translate(${p.x + (i % 2) * 9},${p.y - Math.floor(i / 6) * 10})`}
          >
            <circle
              r="13"
              fill={
                stops[i].status === "done"
                  ? "#16a34a"
                  : stops[i].type === "pickup"
                    ? "#0d9488"
                    : "#dc2626"
              }
              stroke="white"
              strokeWidth="3"
            />
            <text textAnchor="middle" y="4" fill="white" fontSize="10" fontWeight="700">
              {i + 1}
            </text>
          </g>
        ))}
        {vehicle && (
          <g
            transform={`translate(${last.x + (current.x - last.x) * progress},${last.y + (current.y - last.y) * progress})`}
          >
            <circle r="24" fill="#2563eb" opacity=".2" />
            <circle r="17" fill="#0f172a" stroke="white" strokeWidth="3" />
            <path
              d="M-6 -7H6V5H-6ZM-6 -1H6M-3 8V5M3 8V5"
              stroke="white"
              strokeWidth="2"
              fill="none"
            />
          </g>
        )}
      </svg>
      <div className="absolute top-4 left-4 bg-white rounded-xl px-3 py-2 shadow-sm text-xs font-semibold flex gap-2 items-center">
        <Icon name="route" className="size-4 text-primary" />
        {title}
      </div>
      <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center">
        <span className="bg-white/95 px-3 py-2 rounded-lg text-[10px] text-slate-500">
          Sơ đồ minh họa · không phải chỉ đường thực tế
        </span>
        <span className="bg-white/95 rounded-lg px-3 py-2 text-[10px] font-semibold flex gap-3">
          <span className="text-teal-700">● Đón</span>
          <span className="text-red-700">● Trả</span>
          <span className="text-green-700">● Đã xử lý</span>
        </span>
      </div>
    </div>
  );
}

export default function TripOperations({
  screen,
  go,
  status,
}: {
  screen: CompanyScreen;
  go: (s: CompanyScreen) => void;
  status: CompanyStatus;
}) {
  const ops = useOperations();
  const {
    vehicles,
    drivers,
    routes,
    assignments,
    setAssignments,
    trips,
    setTrips,
    bookings,
    setBookings,
    stopMap,
    setStopMap,
    selectedTripId,
    setSelectedTripId,
    editingTrip,
    setEditingTrip,
  } = ops;
  const [draft, setDraft] = useState<CompanyTrip>(freshTrip);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [publishTarget, setPublishTarget] = useState<CompanyTrip | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingDraft, setBookingDraft] = useState<CompanyBooking>(freshBooking(selectedTripId));
  const [addressBooking, setAddressBooking] = useState<CompanyBooking | null>(null);
  const [proposal, setProposal] = useState<CompanyStop[] | null>(null);
  const [applyConfirm, setApplyConfirm] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [updated, setUpdated] = useState("");
  const selected = trips.find((t) => t.id === selectedTripId) ?? trips[0];
  const route = routes.find((r) => r.id === selected.routeId);
  const vehicle = vehicles.find((v) => v.id === selected.vehicleId);
  const driver = drivers.find((d) => d.id === selected.driverId);
  const stops = stopMap[selected.id] ?? [];
  const tripBookings = bookings.filter((b) => b.tripId === selected.id);
  const done = stops.filter((s) => s.status === "done").length;
  const current = stops.find((s) => s.status !== "done");
  const currentBooking = tripBookings.find((b) => b.id === current?.bookingId);
  const details = (id: string, destination: CompanyScreen = "tripDetail") => {
    setSelectedTripId(id);
    go(destination);
  };
  const newTrip = () => {
    setEditingTrip(null);
    setDraft(freshTrip());
    go("tripForm");
  };
  const editTrip = (t: CompanyTrip) => {
    setEditingTrip(t);
    setDraft({ ...t });
    go("tripForm");
  };
  const context = { status, routes, vehicles, drivers, assignments, bookings };
  const errs = validateTrip(draft, context, false);
  const draftRoute = routes.find((r) => r.id === draft.routeId);
  useEffect(() => {
    setError("");
    setQuery("");
    setFilter("all");
    setPage(1);
    setProposal(null);
    setPlaying(false);
    setProgress(0);
    if (screen === "tripForm") {
      setDraft(editingTrip ? { ...editingTrip } : freshTrip());
      setTried(false);
    }
  }, [screen, selectedTripId, editingTrip]);
  useEffect(() => {
    if (!playing || screen !== "tracking" || selected.status !== "active") return;
    const timer = setInterval(() => {
      setProgress((p) => Math.min(1, p + 0.2));
    }, 600);
    return () => clearInterval(timer);
  }, [playing, screen, selected.status]);
  useEffect(() => {
    if (progress < 1 || !playing) return;
    processNext();
    setProgress(0);
  }, [progress, playing]);
  if (!tripIds.includes(screen)) return null;
  if (status !== "APPROVED")
    return <Message>Nhà xe cần được phê duyệt trước khi truy cập điều hành chuyến.</Message>;
  const tripOptions = trips.map((t) => ({
    value: t.id,
    label: `${t.id} · ${routes.find((r) => r.id === t.routeId)?.name ?? "Chưa chọn tuyến"} · ${fmtTime(t.departure)}`,
  }));
  const saveTrip = (t: CompanyTrip, publish: boolean) => {
    const validation = validateTrip(t, context, publish);
    if (Object.values(validation).some(Boolean)) {
      setError(Object.values(validation).filter(Boolean).join(" "));
      return;
    }
    const id = t.id || `CH-${Math.max(2045, ...trips.map((x) => Number(x.id.slice(3)))) + 1}`;
    const next: CompanyTrip = { ...t, id, status: publish ? "published" : "draft" };
    const existing = assignments.find((a) => a.tripId === id);
    const end = arrival(t.departure, routes.find((r) => r.id === t.routeId)!.duration);
    setAssignments((list) => [
      ...list.filter((a) => a.tripId !== id),
      {
        id: existing?.id ?? `schedule-${id}`,
        tripId: id,
        vehicleId: t.vehicleId,
        driverId: t.driverId,
        start: t.departure,
        end,
      },
    ]);
    setTrips((list) => [...list.filter((x) => x.id !== id), next]);
    setSelectedTripId(id);
    setEditingTrip(null);
    setPublishTarget(null);
    setNotice(
      publish ? `Đã công bố chuyến ${id}.` : `Đã lưu bản nháp ${id} và giữ lịch phân công.`,
    );
    go("tripDetail");
  };
  function processNext() {
    if (selected.status !== "active") {
      setError("Chỉ mô phỏng vị trí cho chuyến đang chạy.");
      setPlaying(false);
      return;
    }
    const result = advanceStop(stops);
    if (result.error) {
      setError(result.error);
      setPlaying(false);
      return;
    }
    setStopMap((map) => ({ ...map, [selected.id]: result.stops }));
    const doneDrops = result.stops
      .filter((s) => s.type === "dropoff" && s.status === "done")
      .map((s) => s.bookingId);
    setBookings((list) =>
      list.map((b) => (doneDrops.includes(b.id) ? { ...b, status: "completed" } : b)),
    );
    if (result.stops.length && result.stops.every((s) => s.status === "done")) {
      setTrips((list) =>
        list.map((t) => (t.id === selected.id ? { ...t, status: "completed" } : t)),
      );
      setPlaying(false);
      setNotice("Tất cả điểm đón/trả đã xử lý. Chuyến đã hoàn thành trong mô phỏng.");
    }
    setUpdated(new Date().toLocaleTimeString("vi-VN"));
  }
  const tabs = [
    ["tripDetail", "Chi tiết"],
    ["bookings", "Đặt chỗ"],
    ["stops", "Đón / trả"],
    ["optimization", "Tối ưu lộ trình"],
    ["tracking", "Theo dõi"],
  ] as const;
  const scopedNav = screen !== "trips" && screen !== "tripForm" && (
    <div className="flex justify-between gap-3 mb-6 items-center">
      <div className="flex p-1 rounded-xl bg-slate-100 gap-1">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => go(id)}
            className={cn(
              "px-3 py-2.5 rounded-lg text-xs font-semibold",
              screen === id
                ? "bg-white text-primary shadow-sm"
                : "text-slate-500 hover:bg-white/60",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <select
        aria-label="Chuyến đang điều hành"
        value={selected.id}
        onChange={(e) => setSelectedTripId(e.target.value)}
        className="h-11 border border-line rounded-xl px-3 text-xs bg-white max-w-[410px]"
      >
        {tripOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
  const summary = (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <Metric
        title="Chỗ đã đặt / mở bán"
        value={`${bookedSeats(selected.id, bookings)} / ${selected.capacity}`}
        icon="users"
      />
      <Metric title="Chỗ còn lại" value={seatsLeft(selected, bookings)} icon="ticket" />
      <Metric title="Giá vé mỗi chỗ" value={formatVND(selected.fare)} icon="ticket" />
      <Metric title="Trạng thái chuyến" value={tripBadge(selected)} icon="bus" />
    </div>
  );
  const bookingRows = (list: CompanyBooking[]) => (
    <DataTable
      rows={list}
      columns={[
        {
          key: "id",
          header: "Mã đặt chỗ",
          render: (b) => (
            <span className="font-mono text-xs font-semibold text-primary">{b.id}</span>
          ),
        },
        {
          key: "passenger",
          header: "Hành khách",
          render: (b) => (
            <div className="font-semibold">
              {b.passenger}
              <p className="text-xs text-slate-400 font-normal mt-1">{b.phone}</p>
            </div>
          ),
        },
        { key: "seats", header: "Chỗ" },
        { key: "pickup", header: "Điểm đón" },
        { key: "dropoff", header: "Điểm trả" },
        {
          key: "status",
          header: "Trạng thái",
          render: (b) => (
            <Badge
              kind={
                b.status === "confirmed"
                  ? "active"
                  : b.status === "completed"
                    ? "completed"
                    : "error"
              }
            >
              {b.status === "confirmed"
                ? "Đã xác nhận"
                : b.status === "completed"
                  ? "Hoàn thành"
                  : "Đã hủy"}
            </Badge>
          ),
        },
      ]}
    />
  );
  let content: ReactNode = null;
  if (screen === "trips") {
    const matching = trips
      .filter(
        (t) =>
          `${t.id} ${routes.find((r) => r.id === t.routeId)?.name}`
            .toLocaleLowerCase("vi")
            .includes(query.toLocaleLowerCase("vi")) &&
          (filter === "all" || t.status === filter),
      )
      .sort((a, b) => b.departure.localeCompare(a.departure));
    const safePage = Math.min(page, Math.max(1, Math.ceil(matching.length / 5)));
    content = (
      <>
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            ["Tổng chuyến", trips.length, "bus"],
            ["Đã công bố", trips.filter((t) => t.status === "published").length, "check"],
            ["Đang chạy", trips.filter((t) => t.status === "active").length, "route"],
            ["Bản nháp", trips.filter((t) => t.status === "draft").length, "calendar"],
          ].map(([title, value, icon]) => (
            <Metric key={title} title={String(title)} value={value} icon={String(icon)} />
          ))}
        </div>
        <section className={cn(box, "p-6")}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-lg">Danh sách chuyến đi</h2>
              <p className="text-xs text-slate-500 mt-1">
                Quản lý lịch vận hành và trạng thái công bố
              </p>
            </div>
            <Button icon="plus" onClick={newTrip}>
              Tạo chuyến đi
            </Button>
          </div>
          <div className="flex gap-3 my-5">
            <div className="w-96">
              <SearchInput
                aria-label="Tìm chuyến đi"
                value={query}
                placeholder="Tìm mã chuyến, tuyến đường..."
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <select
              aria-label="Lọc trạng thái công bố"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              className="px-4 rounded-xl border border-line bg-white text-sm"
            >
              <option value="all">Tất cả trạng thái</option>
              {Object.entries(statusLabels).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <DataTable
            rows={matching.slice((safePage - 1) * 5, safePage * 5)}
            columns={[
              {
                key: "id",
                header: "Chuyến / Tuyến",
                render: (t) => (
                  <button onClick={() => details(t.id)} className="text-left">
                    <span className="text-primary text-xs font-semibold">{t.id}</span>
                    <p className="font-semibold mt-1">
                      {routes.find((r) => r.id === t.routeId)?.name}
                    </p>
                  </button>
                ),
              },
              {
                key: "departure",
                header: "Khởi hành",
                render: (t) => (
                  <span className="text-xs whitespace-nowrap">{fmtTime(t.departure)}</span>
                ),
              },
              {
                key: "vehicleId",
                header: "Xe / Tài xế",
                render: (t) => (
                  <div className="text-xs font-medium">
                    {vehicles.find((v) => v.id === t.vehicleId)?.plate}
                    <p className="mt-1 text-slate-500">
                      {drivers.find((d) => d.id === t.driverId)?.name}
                    </p>
                  </div>
                ),
              },
              {
                key: "capacity",
                header: "Đã đặt / chỗ",
                render: (t) => `${bookedSeats(t.id, bookings)} / ${t.capacity}`,
              },
              {
                key: "fare",
                header: "Giá vé",
                render: (t) => <b className="text-xs">{formatVND(t.fare)}</b>,
              },
              { key: "status", header: "Công bố", render: tripBadge },
              {
                key: "action",
                header: "Thao tác",
                render: (t) => (
                  <div className="flex gap-2">
                    <button
                      onClick={() => details(t.id)}
                      className="text-primary text-xs font-semibold py-2"
                    >
                      Chi tiết
                    </button>
                    {t.status === "draft" && (
                      <button
                        onClick={() => editTrip(t)}
                        className="text-slate-500 text-xs font-semibold py-2"
                      >
                        Sửa
                      </button>
                    )}
                  </div>
                ),
              },
            ]}
          />
          {!matching.length ? (
            <p className="py-12 text-center text-sm text-slate-500">
              Không tìm thấy chuyến phù hợp. Hãy thay đổi từ khóa hoặc bộ lọc.
            </p>
          ) : (
            <div className="mt-5">
              <Pagination
                page={safePage}
                pages={Math.ceil(matching.length / 5)}
                total={matching.length}
                perPage={5}
                onChange={setPage}
              />
            </div>
          )}
        </section>
      </>
    );
  }
  if (screen === "tripForm")
    content = (
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          saveTrip(draft, false);
        }}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-6">
          <section className={cn(box, "p-6")}>
            <h2 className="font-bold text-lg mb-1">
              {draft.id ? `Chỉnh sửa ${draft.id}` : "Thông tin chuyến mới"}
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              Các trường có dấu * là bắt buộc · Thời gian GMT+7
            </p>
            <div className="grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <Select
                  label="Tuyến đường *"
                  value={draft.routeId}
                  onChange={(id) => setDraft({ ...draft, routeId: id })}
                  error={tried ? errs.routeId : ""}
                  options={[
                    { value: "", label: "Chọn tuyến đường" },
                    ...routes.map((r) => ({
                      value: r.id,
                      label: `${r.name} · ${r.distance} km · ${r.duration} phút`,
                    })),
                  ]}
                />
              </div>
              <div className="col-span-2">
                <TextInput
                  label="Ngày và giờ khởi hành *"
                  type="datetime-local"
                  value={draft.departure}
                  onChange={(e) => setDraft({ ...draft, departure: e.target.value })}
                  status={tried && errs.departure ? "error" : "default"}
                  hint={tried ? errs.departure : ""}
                />
              </div>
              <Select
                label="Phương tiện *"
                value={draft.vehicleId}
                options={[
                  { value: "", label: "Chọn phương tiện" },
                  ...vehicles.map((v) => ({
                    value: v.id,
                    label: `${v.plate} · ${v.capacity} chỗ${v.status !== "ready" ? " · Không sẵn sàng" : ""}`,
                  })),
                ]}
                onChange={(id) =>
                  setDraft({
                    ...draft,
                    vehicleId: id,
                    capacity: vehicles.find((v) => v.id === id)?.capacity ?? 0,
                  })
                }
                error={tried ? errs.vehicleId : ""}
              />
              <Select
                label="Tài xế *"
                value={draft.driverId}
                options={[
                  { value: "", label: "Chọn tài xế" },
                  ...drivers.map((d) => ({
                    value: d.id,
                    label: `${d.name}${!d.available ? " · Tạm nghỉ" : ""}`,
                  })),
                ]}
                onChange={(id) => setDraft({ ...draft, driverId: id })}
                error={tried ? errs.driverId : ""}
              />
              <TextInput
                label="Số chỗ mở bán *"
                type="number"
                value={draft.capacity || ""}
                onChange={(e) => setDraft({ ...draft, capacity: Number(e.target.value) })}
                status={tried && errs.capacity ? "error" : "default"}
                hint={tried ? errs.capacity : "Không vượt quá sức chứa phương tiện"}
              />
              <TextInput
                label="Giá vé mỗi chỗ (VND) *"
                type="number"
                value={draft.fare || ""}
                onChange={(e) => setDraft({ ...draft, fare: Number(e.target.value) })}
                status={tried && errs.fare ? "error" : "default"}
                hint={tried ? errs.fare : ""}
              />
            </div>
            {errs.assignment && (
              <div className="mt-5">
                <Message>{errs.assignment}</Message>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-8 border-t border-line pt-5">
              <Button type="button" variant="secondary" onClick={() => go("trips")}>
                Hủy
              </Button>
              <Button type="submit" variant="secondary">
                Lưu bản nháp
              </Button>
              <Button
                type="button"
                disabled={status !== "APPROVED"}
                icon="check"
                onClick={() => {
                  setTried(true);
                  const errors = validateTrip(draft, context, true);
                  if (Object.values(errors).some(Boolean))
                    setError(Object.values(errors).filter(Boolean).join(" "));
                  else setPublishTarget(draft);
                }}
              >
                Công bố chuyến
              </Button>
            </div>
          </section>
          <aside className="space-y-5">
            <section className={cn(box, "p-6")}>
              <Icon name="route" className="size-9 text-primary" />
              <h3 className="font-bold mt-4">Tóm tắt lịch trình</h3>
              <dl className="mt-4 space-y-4 text-sm">
                {[
                  ["Tuyến", draftRoute?.name ?? "Chưa chọn"],
                  ["Điểm dừng", draftRoute?.stops.join(" → ") || "Đi thẳng"],
                  ["Khởi hành", fmtTime(draft.departure)],
                  [
                    "Dự kiến đến",
                    draftRoute ? fmtTime(arrival(draft.departure, draftRoute.duration)) : "—",
                  ],
                  ["Giá mỗi chỗ", formatVND(draft.fare)],
                ].map(([key, val]) => (
                  <div key={key}>
                    <dt className="text-xs text-slate-500">{key}</dt>
                    <dd className="mt-1 font-semibold">{val}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-900 leading-6">
              <Icon name="shield" className="size-6 mb-3" />
              Cả lưu nháp và công bố đều giữ lịch phương tiện, tài xế. Mỗi lần lưu sẽ kiểm tra lại
              lịch trùng và số chỗ.
            </div>
          </aside>
        </div>
      </form>
    );
  if (screen === "tripDetail")
    content = (
      <>
        {summary}
        <div className="grid grid-cols-[1.5fr_1fr] gap-6">
          <section className={cn(box, "p-6")}>
            <div className="flex justify-between">
              <h2 className="font-bold text-xl">{route?.name}</h2>
              {tripBadge(selected)}
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {selected.id} · {fmtTime(selected.departure)} →{" "}
              {route ? arrival(selected.departure, route.duration).slice(11) : "—"}
            </p>
            <div className="mt-5">
              <RouteMap
                origin={route?.origin}
                destination={route?.destination}
                stops={stops}
                title={route?.name ?? "Lộ trình"}
              />
            </div>
            <p className="mt-4 text-sm text-slate-500">
              {route?.origin} → {route?.stops.join(" → ")} → {route?.destination} ·{" "}
              {route?.distance} km · {route?.duration} phút
            </p>
          </section>
          <div className="space-y-5">
            <section className={cn(box, "p-6")}>
              <h3 className="font-bold mb-4">Phương tiện & tài xế</h3>
              <div className="flex items-center gap-3">
                <span className="size-12 rounded-xl bg-blue-50 text-primary grid place-items-center">
                  <Icon name="car" />
                </span>
                <div>
                  <b>{vehicle?.plate}</b>
                  <p className="text-xs text-slate-500 mt-1">
                    {vehicle?.model} · {vehicle?.capacity} chỗ
                  </p>
                </div>
              </div>
              <div className="mt-5 border-t border-line pt-5 flex items-center gap-3">
                <span className="size-12 rounded-full bg-teal-50 text-teal-800 font-bold grid place-items-center">
                  {driver?.name.split(" ").pop()?.[0]}
                </span>
                <div>
                  <b>{driver?.name}</b>
                  <p className="text-sm text-slate-500 mt-1">{driver?.phone}</p>
                </div>
              </div>
            </section>
            <section className={cn(box, "p-6 space-y-3")}>
              <h3 className="font-bold mb-4">Điều hành chuyến</h3>
              <Button fullWidth variant="secondary" onClick={() => go("stops")} icon="pin">
                Quản lý đón / trả
              </Button>
              <Button fullWidth variant="secondary" onClick={() => go("optimization")} icon="route">
                Tối ưu lộ trình
              </Button>
              <Button fullWidth onClick={() => go("tracking")} icon="bus">
                Theo dõi chuyến
              </Button>
              {selected.status === "draft" && (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => editTrip(selected)}>
                    Chỉnh sửa
                  </Button>
                  <Button className="flex-1" onClick={() => setPublishTarget(selected)}>
                    Công bố
                  </Button>
                </div>
              )}
            </section>
          </div>
        </div>
        <section className="mt-6">
          <div className="flex justify-between mb-4">
            <h2 className="font-bold text-lg">Đặt chỗ trên chuyến ({tripBookings.length})</h2>
            <button onClick={() => go("bookings")} className="text-primary text-sm font-semibold">
              Quản lý đặt chỗ →
            </button>
          </div>
          {tripBookings.length ? (
            bookingRows(tripBookings)
          ) : (
            <div className={cn(box, "p-10 text-center text-slate-500 text-sm")}>
              Chưa có đặt chỗ cho chuyến này.
            </div>
          )}
        </section>
      </>
    );
  if (screen === "bookings") {
    const list = tripBookings.filter(
      (b) =>
        `${b.id} ${b.passenger} ${b.phone}`
          .toLocaleLowerCase("vi")
          .includes(query.toLocaleLowerCase("vi")) &&
        (filter === "all" || b.status === filter),
    );
    content = (
      <>
        {summary}
        <section className={cn(box, "p-6")}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-bold text-lg">Danh sách đặt chỗ · {selected.id}</h2>
              <p className="text-xs text-slate-500 mt-1">
                Chỗ đã hủy không tính vào sức chứa chuyến.
              </p>
            </div>
            <Button
              icon="plus"
              disabled={selected.status !== "published" || seatsLeft(selected, bookings) <= 0}
              onClick={() => {
                setBookingDraft(freshBooking(selected.id));
                setBookingModal(true);
                setError("");
              }}
            >
              Thêm đặt chỗ
            </Button>
          </div>
          <div className="flex gap-3 my-5">
            <div className="w-96">
              <SearchInput
                placeholder="Mã đặt chỗ, hành khách, điện thoại..."
                aria-label="Tìm đặt chỗ"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="border border-line rounded-xl px-4 text-sm"
              aria-label="Lọc trạng thái đặt chỗ"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="confirmed">Đã xác nhận</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Đã hủy</option>
            </select>
            <Button className="ml-auto" variant="secondary" onClick={() => go("stops")}>
              Sắp xếp đón / trả
            </Button>
          </div>
          {bookingRows(list)}
          {!list.length && (
            <p className="text-sm text-slate-500 text-center py-12">Chưa có đặt chỗ phù hợp.</p>
          )}
          <p className="text-xs text-slate-400 mt-5">
            Chỉ thêm đặt chỗ cho chuyến đã công bố, chưa khởi hành và còn đủ chỗ. Không thu tiền qua
            ứng dụng.
          </p>
        </section>
      </>
    );
  }
  if (screen === "stops")
    content = (
      <>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Metric title="Lượt dừng" value={stops.length} icon="pin" />
          <Metric title="Đã xử lý" value={`${done} / ${stops.length}`} icon="check" />
          <Metric title="Hành khách" value={bookedSeats(selected.id, bookings)} icon="users" />
        </div>
        <section className={cn(box, "p-6")}>
          <div className="flex justify-between items-center mb-5">
            <div>
              <h2 className="text-lg font-bold">Kế hoạch đón và trả khách</h2>
              <p className="text-xs text-slate-500 mt-1">
                Điểm đón phải trước điểm trả · Khóa các điểm đã xử lý / đang đến
              </p>
            </div>
            <Button icon="route" onClick={() => go("optimization")}>
              Tối ưu thứ tự
            </Button>
          </div>
          <DataTable
            rows={stops}
            columns={[
              {
                key: "order",
                header: "Thứ tự",
                render: (s) => (
                  <span className="size-8 rounded-full bg-blue-50 text-primary font-bold grid place-items-center">
                    {stops.indexOf(s) + 1}
                  </span>
                ),
              },
              { key: "type", header: "Loại", render: (s) => <StopPill s={s} /> },
              {
                key: "bookingId",
                header: "Hành khách",
                render: (s) => {
                  const b = bookings.find((b) => b.id === s.bookingId);
                  return (
                    <div className="font-semibold text-sm">
                      {b?.passenger}
                      <p className="mt-1 text-xs text-slate-400 font-normal">
                        {s.bookingId} · {b?.seats} chỗ
                      </p>
                    </div>
                  );
                },
              },
              {
                key: "address",
                header: "Địa điểm / GPS",
                render: (s) => (
                  <div className="text-xs">
                    {s.address}
                    <div className="font-mono text-[10px] text-primary mt-1">
                      {gpsLabel(s.location)}
                    </div>
                    {s.location?.instructions && (
                      <div className="text-slate-500 mt-1">Chỉ dẫn: {s.location.instructions}</div>
                    )}
                  </div>
                ),
              },
              {
                key: "status",
                header: "Xử lý",
                render: (s) => (
                  <Badge
                    kind={
                      s.status === "done"
                        ? "completed"
                        : s.status === "arrived"
                          ? "active"
                          : "pending"
                    }
                  >
                    {s.status === "done"
                      ? "Đã xử lý"
                      : s.status === "arrived"
                        ? "Đã đến"
                        : "Chờ xử lý"}
                  </Badge>
                ),
              },
              {
                key: "actions",
                header: "Thao tác",
                render: (s) => {
                  const i = stops.indexOf(s);
                  return (
                    <div className="flex items-center gap-2">
                      <button
                        aria-label={`Đưa điểm ${i + 1} lên`}
                        disabled={
                          i === 0 ||
                          selected.status === "completed" ||
                          selected.status === "cancelled"
                        }
                        className="border border-line rounded-lg size-8 disabled:opacity-30"
                        onClick={() => {
                          const next = [...stops];
                          [next[i - 1], next[i]] = [next[i], next[i - 1]];
                          const e = stopOrderError(next, stops);
                          if (e) setError(e);
                          else {
                            setError("");
                            setStopMap((m) => ({ ...m, [selected.id]: next }));
                          }
                        }}
                      >
                        ↑
                      </button>
                      <button
                        disabled={
                          tripBookings.find((b) => b.id === s.bookingId)?.status !== "confirmed" ||
                          stops.some((x) => x.bookingId === s.bookingId && x.status !== "pending")
                        }
                        onClick={() => {
                          const b = tripBookings.find((b) => b.id === s.bookingId);
                          if (b) setAddressBooking({ ...b });
                        }}
                        className="text-primary text-xs font-semibold disabled:text-slate-300"
                      >
                        Địa chỉ
                      </button>
                    </div>
                  );
                },
              },
            ]}
          />
          {!stops.length && (
            <p className="py-12 text-center text-slate-500 text-sm">
              Chưa có điểm đón / trả. Thêm đặt chỗ để lập kế hoạch.
            </p>
          )}
        </section>
      </>
    );
  if (screen === "optimization") {
    const before = estimate(stops),
      after = estimate(proposal ?? stops);
    const allowed =
      ["published", "active"].includes(selected.status) &&
      stops.length > 0 &&
      stops.every((s) => validLocation(s.location));
    const orderList = (list: CompanyStop[], proposed = false) => (
      <ol className="divide-y divide-line">
        {list.map((s, i) => (
          <li key={s.id} className="py-2.5 flex gap-2.5 items-center text-xs">
            <span
              className={cn(
                "size-6 rounded-full grid place-items-center shrink-0 font-bold",
                proposed ? "bg-teal-50 text-teal-800" : "bg-slate-100 text-slate-500",
              )}
            >
              {i + 1}
            </span>
            <StopPill s={s} />
            <div className="min-w-0">
              <div className="font-semibold truncate">
                {bookings.find((b) => b.id === s.bookingId)?.passenger}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">{s.address}</div>
            </div>
            {s.status !== "pending" && (
              <Icon name="shield" className="size-3.5 text-slate-400 ml-auto shrink-0" />
            )}
          </li>
        ))}
      </ol>
    );
    content = (
      <>
        <div className="grid grid-cols-[1.45fr_1fr] gap-6">
          <section className={cn(box, "p-5")}>
            <RouteMap
              origin={route?.origin}
              destination={route?.destination}
              stops={proposal ?? stops}
              title={proposal ? "Phương án đề xuất" : "Lộ trình hiện tại"}
            />
            <div className="grid grid-cols-2 gap-4 mt-5">
              <div className="rounded-xl bg-canvas p-4">
                <p className="text-xs text-slate-500">Ước tính hiện tại</p>
                <p className="font-bold text-xl mt-1">
                  {before.km} km{" "}
                  <span className="font-normal text-xs text-slate-400">
                    · {before.minutes} phút
                  </span>
                </p>
              </div>
              <div className="rounded-xl bg-teal-50 p-4">
                <p className="text-xs text-teal-700">Sau tối ưu</p>
                <p className="font-bold text-xl mt-1 text-teal-900">
                  {after.km} km <span className="font-normal text-xs">· {after.minutes} phút</span>
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-4 leading-5">
              Ước tính khoảng cách GPS theo đường chim bay, không phải khoảng cách đường bộ. Thuật
              toán gần nhất có ràng buộc đón trước trả, không sử dụng AI.
            </p>
            <div className="mt-5 p-4 bg-blue-50 rounded-xl text-sm text-blue-900 flex gap-2">
              <Icon name="shield" className="size-5 shrink-0" />
              Không bỏ điểm dừng; không đổi trạng thái đặt chỗ; giữ nguyên đoạn đã xử lý và điểm
              đang đến.
            </div>
            <div className="flex gap-3 mt-5">
              <Button
                disabled={!allowed}
                icon="route"
                onClick={() => {
                  const result = optimizeStops(stops);
                  setError(result.error);
                  if (!result.error) setProposal(result.stops);
                }}
              >
                Tối ưu lộ trình
              </Button>
              <Button
                variant="secondary"
                disabled={!proposal || !allowed}
                onClick={() => setApplyConfirm(true)}
              >
                Áp dụng phương án
              </Button>
            </div>
            {!allowed && (
              <p className="mt-3 text-xs text-slate-400">
                Cần chuyến đã công bố / đang chạy và có điểm dừng.
              </p>
            )}
          </section>
          <div className="grid grid-cols-2 gap-3">
            <section className={cn(box, "p-4")}>
              <h3 className="font-bold text-sm mb-3">Thứ tự hiện tại</h3>
              {orderList(stops)}
            </section>
            <section className={cn(box, "p-4 border-teal-200")}>
              <h3 className="font-bold text-sm text-teal-800 mb-3">Thứ tự tối ưu</h3>
              {proposal ? (
                orderList(proposal, true)
              ) : (
                <p className="text-xs text-slate-400 leading-6 py-12 text-center">
                  Bấm “Tối ưu lộ trình” để tạo phương án.
                </p>
              )}
            </section>
          </div>
        </div>
      </>
    );
  }
  if (screen === "tracking")
    content = (
      <>
        <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
          <span className="text-xs text-blue-900 flex items-center gap-2">
            <Icon name="info" className="size-4" />
            Theo dõi mô phỏng · Không có kết nối GPS thực. Cập nhật cuối:{" "}
            {updated || "Chưa bắt đầu"}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              disabled={selected.status !== "active"}
              onClick={() => setPlaying(!playing)}
            >
              {playing ? "Tạm dừng mô phỏng" : "Chạy mô phỏng"}
            </Button>
            <Button
              disabled={selected.status !== "active"}
              onClick={() => {
                setPlaying(false);
                processNext();
              }}
            >
              Cập nhật bước tiếp
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-[1.7fr_1fr] gap-6">
          <div className={cn(box, "p-5")}>
            <div className="flex justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg">{route?.name}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  {selected.id} · {vehicle?.plate}
                </p>
              </div>
              {tripBadge(selected)}
            </div>
            <RouteMap
              origin={route?.origin}
              destination={route?.destination}
              stops={stops}
              vehicle
              progress={selected.status === "completed" ? 1 : playing ? progress : 0.7}
              title="Vị trí phương tiện (mô phỏng)"
            />
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                [`${done}/${stops.length}`, "Điểm đã xử lý"],
                [
                  current?.status === "arrived"
                    ? "Đã đến"
                    : current
                      ? "Đang di chuyển"
                      : "Hoàn tất",
                  "Trạng thái hiện tại",
                ],
                [
                  route ? arrival(selected.departure, route.duration).slice(11) : "—",
                  "Giờ đến theo lịch",
                ],
              ].map(([v, l]) => (
                <div key={l} className="bg-canvas rounded-xl p-4">
                  <div className="text-xs text-slate-500">{l}</div>
                  <div className="font-bold mt-2 text-sm">{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5">
            <section className={cn(box, "p-5")}>
              <h3 className="font-bold mb-4">Tài xế & phương tiện</h3>
              <div className="flex gap-3 items-center">
                <span className="size-12 rounded-full bg-teal-50 text-teal-800 font-bold grid place-items-center">
                  {driver?.name.split(" ").pop()?.[0]}
                </span>
                <div>
                  <div className="font-semibold">{driver?.name}</div>
                  <a
                    href={`tel:${driver?.phone.replace(/\s/g, "")}`}
                    className="text-sm text-primary"
                  >
                    {driver?.phone}
                  </a>
                </div>
              </div>
              <p className="border-t border-line mt-4 pt-4 text-sm text-slate-500">
                {vehicle?.model} · <b className="text-navy">{vehicle?.plate}</b>
              </p>
            </section>
            <section className={cn(box, "p-5")}>
              <div className="flex justify-between mb-3 text-sm font-semibold">
                <span>Tiến độ điểm dừng</span>
                <span className="text-primary">
                  {Math.round((done / Math.max(stops.length, 1)) * 100)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${(done / Math.max(stops.length, 1)) * 100}%` }}
                />
              </div>
              <div className="mt-5">
                {current ? (
                  <>
                    <StopPill s={current} />
                    <div className="font-bold mt-2">{currentBooking?.passenger}</div>
                    <div className="text-sm text-slate-500 mt-1">{current.address}</div>
                    <p className="text-xs text-slate-400 mt-2">
                      Điểm tiếp theo:{" "}
                      {stops[stops.indexOf(current) + 1]?.address ?? "Cuối hành trình"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500">Không còn điểm dừng cần xử lý.</p>
                )}
              </div>
              <Button variant="secondary" fullWidth className="mt-5" onClick={() => go("stops")}>
                Xem toàn bộ điểm dừng
              </Button>
            </section>
          </div>
        </div>
      </>
    );

  return (
    <div>
      {scopedNav}
      {notice && (
        <div className="mb-5">
          <Message success>
            {notice}
            <button className="ml-auto" onClick={() => setNotice("")} aria-label="Đóng">
              <Icon name="x" className="size-4" />
            </button>
          </Message>
        </div>
      )}
      {error && (
        <div className="mb-5">
          <Message>{error}</Message>
        </div>
      )}
      {content}
      <ConfirmDialog
        contained
        open={!!publishTarget}
        title="Công bố chuyến đi?"
        message="Chuyến sẽ xuất hiện trong kết quả tìm kiếm của hành khách. Hệ thống sẽ kiểm tra lại quyền nhà xe, phương tiện, tài xế, chỗ trống và lịch phân công trước khi công bố."
        confirmLabel="Công bố chuyến"
        onCancel={() => setPublishTarget(null)}
        onConfirm={() => {
          if (publishTarget) {
            const t = publishTarget;
            setPublishTarget(null);
            saveTrip(t, true);
          }
        }}
      />
      <ConfirmDialog
        contained
        open={applyConfirm}
        title="Áp dụng lộ trình tối ưu?"
        message="Chỉ thay đổi thứ tự các điểm chưa xử lý. Giữ đủ điểm đón/trả, bảo toàn thứ tự đón trước trả và không thay đổi trạng thái đặt chỗ."
        confirmLabel="Áp dụng"
        onCancel={() => setApplyConfirm(false)}
        onConfirm={() => {
          setApplyConfirm(false);
          if (!proposal) return;
          const e = stopOrderError(proposal, stops);
          if (e) {
            setError(e);
            return;
          }
          setStopMap((m) => ({ ...m, [selected.id]: proposal }));
          setProposal(null);
          setNotice("Đã áp dụng thứ tự mới. Trạng thái đặt chỗ được giữ nguyên.");
        }}
      />
      <Modal
        contained
        open={bookingModal}
        title={`Thêm đặt chỗ · Còn ${seatsLeft(selected, bookings)} chỗ`}
        onClose={() => setBookingModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBookingModal(false)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                const t = trips.find((t) => t.id === bookingDraft.tripId);
                const e = !t ? "Không tìm thấy chuyến." : bookingError(bookingDraft, t, bookings);
                if (e) {
                  setError(e);
                  return;
                }
                const id = `RSH-${Math.max(400, ...bookings.map((b) => Number(b.id.split("-")[1]) || 0)) + 1}`;
                const next = { ...bookingDraft, id };
                setBookings((list) => [...list, next]);
                setStopMap((m) => ({
                  ...m,
                  [selected.id]: [
                    ...(m[selected.id] ?? []),
                    {
                      id: `${id}-p`,
                      bookingId: id,
                      type: "pickup",
                      address: next.pickup,
                      location: next.pickupLocation,
                      ...dispatchPoint(next.pickupLocation!),
                      status: "pending",
                    },
                    {
                      id: `${id}-d`,
                      bookingId: id,
                      type: "dropoff",
                      address: next.dropoff,
                      location: next.dropoffLocation,
                      ...dispatchPoint(next.dropoffLocation!),
                      status: "pending",
                    },
                  ],
                }));
                setBookingModal(false);
                setError("");
                setNotice(`Đã thêm ${id}, giữ ${next.seats} chỗ.`);
              }}
            >
              Xác nhận đặt chỗ
            </Button>
          </>
        }
      >
        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
          {error && <Message>{error}</Message>}
          <TextInput
            label="Họ tên *"
            value={bookingDraft.passenger}
            onChange={(e) => setBookingDraft({ ...bookingDraft, passenger: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextInput
              label="Số điện thoại *"
              type="tel"
              value={bookingDraft.phone}
              onChange={(e) => setBookingDraft({ ...bookingDraft, phone: e.target.value })}
            />
            <TextInput
              label="Số chỗ *"
              type="number"
              value={bookingDraft.seats}
              onChange={(e) => setBookingDraft({ ...bookingDraft, seats: Number(e.target.value) })}
            />
          </div>
          <LocationPicker
            label="Địa chỉ đón *"
            area={route?.origin}
            value={bookingDraft.pickupLocation}
            onChange={(pickupLocation) =>
              setBookingDraft({
                ...bookingDraft,
                pickupLocation,
                pickup: pickupLocation?.address ?? "",
              })
            }
          />
          <LocationPicker
            label="Địa chỉ trả *"
            area={route?.destination}
            value={bookingDraft.dropoffLocation}
            onChange={(dropoffLocation) =>
              setBookingDraft({
                ...bookingDraft,
                dropoffLocation,
                dropoff: dropoffLocation?.address ?? "",
              })
            }
          />
          <p className="text-sm text-slate-500">
            Tạm tính:{" "}
            <b className="text-primary">{formatVND(bookingDraft.seats * selected.fare)}</b> · Không
            thanh toán trực tuyến.
          </p>
        </div>
      </Modal>
      <Modal
        contained
        open={!!addressBooking}
        title="Cập nhật địa chỉ đón / trả"
        onClose={() => setAddressBooking(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddressBooking(null)}>
              Hủy
            </Button>
            <Button
              onClick={() => {
                if (!addressBooking) return;
                const update = updateBookingStops(stops, addressBooking);
                if (update.error) {
                  setError(update.error);
                  return;
                }
                setBookings((list) =>
                  list.map((b) => (b.id === addressBooking.id ? addressBooking : b)),
                );
                setStopMap((map) => ({ ...map, [selected.id]: update.stops }));
                setAddressBooking(null);
                setError("");
                setNotice(
                  "Đã cập nhật địa chỉ, tọa độ và chỉ dẫn. Thứ tự điểm dừng và trạng thái đặt chỗ được giữ nguyên.",
                );
              }}
            >
              Lưu địa chỉ
            </Button>
          </>
        }
      >
        {addressBooking && (
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
            {error && <Message>{error}</Message>}
            <p className="font-semibold">
              {addressBooking.passenger} · {addressBooking.id}
            </p>
            <LocationPicker
              label="Điểm đón *"
              area={route?.origin}
              value={addressBooking.pickupLocation}
              onChange={(pickupLocation) =>
                setAddressBooking({
                  ...addressBooking,
                  pickupLocation,
                  pickup: pickupLocation?.address ?? "",
                })
              }
            />
            <LocationPicker
              label="Điểm trả *"
              area={route?.destination}
              value={addressBooking.dropoffLocation}
              onChange={(dropoffLocation) =>
                setAddressBooking({
                  ...addressBooking,
                  dropoffLocation,
                  dropoff: dropoffLocation?.address ?? "",
                })
              }
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
