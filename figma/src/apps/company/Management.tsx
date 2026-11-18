import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Icon from "../../components/ui/Icon";
import { DataTable, Pagination } from "../../components/ui/Data";
import { TextInput, SearchInput, Field, inputBase } from "../../components/ui/Form";
import { cn } from "../../components/ui/cn";
import type { CompanyScreen } from "./model";
import { useOperations } from "./OperationsStore";
import { arrival } from "./tripsModel";
import { LocationPicker } from "../../address/AddressFields";
import { areaLocation } from "../../address/model";
import {
  vehicles as seedVehicles,
  drivers as seedDrivers,
  routes as seedRoutes,
  tripSlots,
  cities,
  slotTime,
  assignmentError,
  validateVehicle,
  validateDriver,
  validateRoute,
  type Vehicle,
  type Driver,
  type Route,
  type Assignment,
} from "./operations";

export const managementIds = [
  "vehicles",
  "vehicleForm",
  "drivers",
  "driverForm",
  "routes",
  "routeForm",
];
const box = "bg-surface border border-line rounded-[20px]";
const freshVehicle = (): Vehicle => ({
  id: "",
  plate: "",
  type: "Xe khách",
  capacity: 16,
  model: "",
  year: 2024,
  status: "ready",
  note: "",
});
const freshDriver = (): Driver => ({
  id: "",
  name: "",
  phone: "",
  email: "",
  license: "",
  expiry: "",
  available: true,
});
const freshRoute = (): Route => ({
  id: "",
  name: "",
  origin: "Đà Nẵng",
  destination: "Huế",
  originLocation: areaLocation("Đà Nẵng"),
  destinationLocation: areaLocation("Huế"),
  stopLocations: [],
  stops: [],
  distance: 0,
  duration: 0,
});
const uid = () => crypto.randomUUID();
const hasErrors = (e: object) => Object.values(e).some(Boolean);
const pageSize = 5;
const norm = (v: string) =>
  v
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

function Select({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint} status={hint ? "error" : "default"}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputBase(hint ? "error" : "default")}
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
const Heading = ({ icon, title, sub }: { icon: string; title: string; sub: string }) => (
  <div className="flex gap-3 items-center mb-6">
    <span className="size-11 rounded-xl bg-blue-50 text-primary grid place-items-center">
      <Icon name={icon} />
    </span>
    <div>
      <h2 className="font-bold text-lg">{title}</h2>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  </div>
);
const ErrorNote = ({ children }: { children: ReactNode }) => (
  <div
    role="alert"
    className="p-4 border border-red-200 bg-red-50 text-red-800 rounded-xl text-sm flex gap-2"
  >
    <Icon name="alert" className="size-5 shrink-0" />
    {children}
  </div>
);
const vehicleLabels: Record<Vehicle["status"], string> = {
  ready: "Sẵn sàng",
  maintenance: "Bảo dưỡng",
  inactive: "Ngừng hoạt động",
};
const typeOptions = ["Xe khách", "Limousine", "Xe hợp đồng"].map((v) => ({ value: v, label: v }));

export default function Management({
  screen,
  go,
  allowed,
  companyName = "Nhà xe Minh Tâm",
}: {
  screen: CompanyScreen;
  go: (s: CompanyScreen) => void;
  allowed: boolean;
  companyName?: string;
}) {
  const {
    vehicles,
    setVehicles,
    drivers,
    setDrivers,
    routes,
    setRoutes,
    assignments,
    setAssignments,
    trips,
  } = useOperations();
  const [v, setV] = useState<Vehicle>(() => ({ ...seedVehicles[0] }));
  const [d, setD] = useState<Driver>(() => ({ ...seedDrivers[0] }));
  const [r, setR] = useState<Route>(() => ({ ...seedRoutes[0], stops: [...seedRoutes[0].stops] }));
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [tried, setTried] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [slotId, setSlotId] = useState("");
  const [resourceId, setResourceId] = useState("");
  const [assignmentId, setAssignmentId] = useState("");
  useEffect(() => {
    setQuery("");
    setFilter("all");
    setPage(1);
    setTried(false);
    setError("");
    setSlotId("");
    setResourceId("");
    setAssignmentId("");
  }, [screen]);
  if (!managementIds.includes(screen)) return null;
  if (!allowed)
    return <ErrorNote>Hồ sơ nhà xe cần được phê duyệt trước khi truy cập quản lý.</ErrorNote>;
  const isVehicle = screen === "vehicles" || screen === "vehicleForm";
  const isDriver = screen === "drivers" || screen === "driverForm";
  const isForm = screen.endsWith("Form");
  const resetList = () => {
    setPage(1);
    setQuery("");
    setFilter("all");
  };
  const openForm = (entity?: Vehicle | Driver | Route) => {
    setTried(false);
    setError("");
    setSaved("");
    setSlotId("");
    setResourceId("");
    setAssignmentId("");
    if (isVehicle) {
      setV(entity ? { ...(entity as Vehicle) } : freshVehicle());
      go("vehicleForm");
    } else if (isDriver) {
      setD(entity ? { ...(entity as Driver) } : freshDriver());
      go("driverForm");
    } else {
      setR(entity ? { ...(entity as Route), stops: [...(entity as Route).stops] } : freshRoute());
      go("routeForm");
    }
  };
  const back = () => go(isVehicle ? "vehicles" : isDriver ? "drivers" : "routes");
  const findDriver = (id: string) => drivers.find((x) => x.id === id);
  const findVehicle = (id: string) => vehicles.find((x) => x.id === id);
  const editingId = isVehicle ? v.id : isDriver ? d.id : r.id;
  const linked = assignments.filter((a) =>
    isVehicle ? a.vehicleId === v.id : a.driverId === d.id,
  );
  const liveSlots = [
    ...tripSlots.filter((s) => !trips.some((t) => t.id === s.id)),
    ...trips
      .filter((t) => t.status !== "completed" && t.status !== "cancelled")
      .map((t) => {
        const route = routes.find((r) => r.id === t.routeId);
        return {
          id: t.id,
          label: route?.name ?? t.id,
          start: t.departure,
          end: route ? arrival(t.departure, route.duration) : t.departure,
        };
      }),
  ];
  const slot = liveSlots.find((s) => s.id === slotId);
  const selectedExisting = assignments.find((a) => a.id === assignmentId);
  const candidate: Assignment | undefined =
    (isVehicle || isDriver) && slot
      ? {
          id: assignmentId || "new",
          tripId: slot.id,
          start: slot.start,
          end: slot.end,
          vehicleId: isVehicle ? v.id || "new-vehicle" : resourceId,
          driverId: isDriver ? d.id || "new-driver" : resourceId,
        }
      : undefined;
  const conflict = candidate ? assignmentError(candidate, assignments) : "";
  const ve = validateVehicle(v, vehicles),
    de = validateDriver(d, drivers),
    re = validateRoute(r);
  const validation: Record<string, string> = isVehicle ? ve : isDriver ? de : re;
  const fieldError = (key: string) => (tried ? validation[key] || "" : "");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setError("");
    if (hasErrors(isVehicle ? ve : isDriver ? de : re)) {
      setError("Vui lòng kiểm tra các trường được đánh dấu trước khi lưu.");
      return;
    }
    const relevant = isVehicle
      ? assignments.filter((a) => a.vehicleId === v.id)
      : assignments.filter((a) => a.driverId === d.id);
    if (isVehicle && v.status !== "ready" && (relevant.length || slot)) {
      setError(
        "Phương tiện đang có lịch phân công. Giữ trạng thái sẵn sàng hoặc chuyển toàn bộ lịch sang xe khác trước.",
      );
      return;
    }
    if (isDriver && !d.available && (relevant.length || slot)) {
      setError(
        "Tài xế đang có lịch phân công. Chuyển toàn bộ lịch sang tài xế khác trước khi đặt tạm nghỉ.",
      );
      return;
    }
    if (
      isVehicle &&
      trips.some(
        (t) =>
          t.vehicleId === v.id &&
          ["draft", "published", "active"].includes(t.status) &&
          t.capacity > v.capacity,
      )
    ) {
      setError("Sức chứa xe không được nhỏ hơn số chỗ đã thiết lập trên chuyến đang sử dụng xe.");
      return;
    }
    if (isDriver && assignments.some((a) => a.driverId === d.id && a.end.slice(0, 10) > d.expiry)) {
      setError("Giấy phép phải còn hiệu lực đến hết các chuyến đã phân công.");
      return;
    }
    if (
      !isVehicle &&
      !isDriver &&
      trips.some((t) => t.routeId === r.id && ["published", "active"].includes(t.status))
    ) {
      setError(
        "Tuyến đang có chuyến công bố / đang chạy. Tạo tuyến mới để không thay đổi hành trình đã thông báo cho hành khách.",
      );
      return;
    }
    if (candidate) {
      if (conflict) {
        setError(conflict);
        return;
      }
      const counterpart = isVehicle ? findDriver(resourceId) : findVehicle(resourceId);
      if (
        !counterpart ||
        (isVehicle
          ? !(counterpart as Driver).available
          : (counterpart as Vehicle).status !== "ready")
      ) {
        setError("Tài xế hoặc phương tiện chưa sẵn sàng để phân công.");
        return;
      }
      const driver = isDriver ? d : findDriver(resourceId);
      if (driver && driver.expiry < slot!.end.slice(0, 10)) {
        setError("Giấy phép lái xe hết hạn trước ngày thực hiện chuyến.");
        return;
      }
      const assignedTrip = trips.find((t) => t.id === candidate.tripId);
      const assignedVehicle = isVehicle ? v : findVehicle(resourceId);
      if (assignedTrip && assignedVehicle && assignedTrip.capacity > assignedVehicle.capacity) {
        setError("Xe được chọn không đủ sức chứa số chỗ của chuyến.");
        return;
      }
    }
    let rescheduled = assignments;
    if (!isVehicle && !isDriver) {
      rescheduled = assignments.map((a) =>
        trips.some((t) => t.id === a.tripId && t.routeId === r.id)
          ? { ...a, end: arrival(a.start, r.duration) }
          : a,
      );
      const overlap = rescheduled.map((a) => assignmentError(a, rescheduled)).find(Boolean);
      if (overlap) {
        setError(`Thời gian tuyến mới gây trùng lịch: ${overlap}`);
        return;
      }
    }
    const id = editingId || uid();
    if (isVehicle)
      setVehicles((list) =>
        v.id
          ? list.map((x) => (x.id === id ? { ...v, plate: v.plate.trim().toUpperCase() } : x))
          : [...list, { ...v, id, plate: v.plate.trim().toUpperCase() }],
      );
    else if (isDriver)
      setDrivers((list) =>
        d.id
          ? list.map((x) =>
              x.id === id ? { ...d, name: d.name.trim(), license: d.license.trim() } : x,
            )
          : [...list, { ...d, id, name: d.name.trim(), license: d.license.trim() }],
      );
    else
      setRoutes((list) =>
        r.id
          ? list.map((x) =>
              x.id === id ? { ...r, name: r.name.trim(), stops: r.stops.map((s) => s.trim()) } : x,
            )
          : [...list, { ...r, id, name: r.name.trim(), stops: r.stops.map((s) => s.trim()) }],
      );
    if (candidate) {
      const next = {
        ...candidate,
        id: assignmentId || uid(),
        ...(isVehicle ? { vehicleId: id } : { driverId: id }),
      };
      setAssignments((list) => [...list.filter((x) => x.id !== next.id), next]);
    }
    if (!isVehicle && !isDriver) setAssignments(rescheduled);
    setSaved(
      `${editingId ? "Đã cập nhật" : "Đã thêm"} ${isVehicle ? "phương tiện" : isDriver ? "tài xế" : "tuyến đường"} thành công.`,
    );
    resetList();
    back();
  };

  const assignmentPanel = (
    <section className={cn(box, "p-6 mt-6")}>
      <Heading
        icon="calendar"
        title="Lịch phân công"
        sub="Tùy chọn · Kiểm tra đồng thời lịch xe và tài xế trước khi lưu"
      />
      {linked.length > 0 && (
        <div className="space-y-2 mb-5">
          {linked.map((a) => (
            <div
              key={a.id}
              className="flex justify-between items-center bg-canvas border border-line rounded-xl px-4 py-3"
            >
              <div>
                <div className="font-semibold text-sm">
                  {a.tripId} · {liveSlots.find((s) => s.id === a.tripId)?.label}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {slotTime(a)} ·{" "}
                  {isVehicle ? findDriver(a.driverId)?.name : findVehicle(a.vehicleId)?.plate}
                </div>
              </div>
              <button
                type="button"
                disabled={trips.some((t) => t.id === a.tripId && t.status === "active")}
                onClick={() => {
                  setAssignmentId(a.id);
                  setSlotId(a.tripId);
                  setResourceId(isVehicle ? a.driverId : a.vehicleId);
                }}
                className="text-primary text-sm font-semibold disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                Điều chỉnh
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-5">
        <Select
          label={assignmentId ? "Điều chỉnh chuyến đã phân công" : "Phân công thêm chuyến"}
          value={slotId}
          onChange={(id) => setSlotId(id)}
          options={[
            { value: "", label: "Không thay đổi / thêm phân công" },
            ...liveSlots
              .filter(
                (t) =>
                  (!assignmentId || t.id === selectedExisting?.tripId) &&
                  !trips.some((x) => x.id === t.id && x.status === "active"),
              )
              .map((t) => ({ value: t.id, label: `${t.id} · ${slotTime(t)}` })),
          ]}
        />
        <Select
          label={isVehicle ? "Tài xế thực hiện" : "Phương tiện thực hiện"}
          value={resourceId}
          onChange={setResourceId}
          options={[
            { value: "", label: isVehicle ? "Chọn tài xế" : "Chọn phương tiện" },
            ...(isVehicle
              ? drivers.filter((x) => x.available).map((x) => ({ value: x.id, label: x.name }))
              : vehicles
                  .filter((x) => x.status === "ready")
                  .map((x) => ({ value: x.id, label: `${x.plate} · ${x.model}` }))),
          ]}
        />
      </div>
      {selectedExisting && (
        <button
          type="button"
          onClick={() => {
            setAssignmentId("");
            setSlotId("");
            setResourceId("");
          }}
          className="mt-3 text-sm text-primary font-semibold"
        >
          Hủy điều chỉnh phân công
        </button>
      )}
      {slot && (
        <div className="mt-4">
          {conflict ? (
            <ErrorNote>{conflict}</ErrorNote>
          ) : (
            <p className="text-sm bg-green-50 text-green-800 rounded-xl p-3 flex items-center gap-2">
              <Icon name="check" className="size-4" />
              Lịch phân công không trùng với lịch hiện tại.
            </p>
          )}
        </div>
      )}
    </section>
  );
  const input = (
    label: string,
    key: string,
    value: string | number,
    change: (v: string) => void,
    type = "text",
  ) => (
    <TextInput
      label={label}
      type={type}
      value={Number.isNaN(value) ? "" : value}
      onChange={(e) => change(e.target.value)}
      hint={fieldError(key)}
      status={fieldError(key) ? "error" : "default"}
    />
  );

  if (isForm)
    return (
      <form noValidate onSubmit={submit}>
        <button
          type="button"
          onClick={back}
          className="text-sm text-slate-500 hover:text-primary flex gap-1 items-center mb-5"
        >
          <Icon name="left" className="size-4" />
          Quay lại danh sách
        </button>
        <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-6">
          <div>
            <section className={cn(box, "p-6")}>
              <Heading
                icon={isVehicle ? "car" : isDriver ? "user" : "route"}
                title={`${editingId ? "Chỉnh sửa" : "Thêm mới"} ${isVehicle ? "phương tiện" : isDriver ? "tài xế" : "tuyến đường"}`}
                sub="Các trường có dấu * là bắt buộc"
              />
              <div className="grid grid-cols-2 gap-5">
                {isVehicle ? (
                  <>
                    {input("Biển số đăng ký *", "plate", v.plate, (x) => setV({ ...v, plate: x }))}
                    <Select
                      label="Loại phương tiện *"
                      value={v.type}
                      onChange={(x) => setV({ ...v, type: x })}
                      options={typeOptions}
                      hint={fieldError("type")}
                    />
                    {input(
                      "Số chỗ ngồi *",
                      "capacity",
                      v.capacity,
                      (x) => setV({ ...v, capacity: Number(x) }),
                      "number",
                    )}
                    {input("Hãng / dòng xe *", "model", v.model, (x) => setV({ ...v, model: x }))}
                    {input(
                      "Năm sản xuất *",
                      "year",
                      v.year,
                      (x) => setV({ ...v, year: Number(x) }),
                      "number",
                    )}
                    <Select
                      label="Trạng thái"
                      value={v.status}
                      onChange={(x) => setV({ ...v, status: x as Vehicle["status"] })}
                      options={Object.entries(vehicleLabels).map(([value, label]) => ({
                        value,
                        label,
                      }))}
                    />
                    <label className="col-span-2 text-sm font-medium">
                      Thông tin bổ sung
                      <textarea
                        rows={3}
                        value={v.note}
                        onChange={(e) => setV({ ...v, note: e.target.value })}
                        placeholder="Trang bị, lịch bảo dưỡng hoặc ghi chú vận hành..."
                        className="block w-full border border-line rounded-xl mt-2 p-3 text-sm outline-none focus:ring-4 focus:ring-primary/15 focus:border-primary resize-y"
                      />
                    </label>
                  </>
                ) : isDriver ? (
                  <>
                    {input("Họ và tên *", "name", d.name, (x) => setD({ ...d, name: x }))}
                    {input(
                      "Số điện thoại *",
                      "phone",
                      d.phone,
                      (x) => setD({ ...d, phone: x }),
                      "tel",
                    )}
                    <div className="col-span-2">
                      {input("Email *", "email", d.email, (x) => setD({ ...d, email: x }), "email")}
                    </div>
                    {input("Số giấy phép lái xe *", "license", d.license, (x) =>
                      setD({ ...d, license: x }),
                    )}
                    {input(
                      "Ngày hết hạn giấy phép *",
                      "expiry",
                      d.expiry,
                      (x) => setD({ ...d, expiry: x }),
                      "date",
                    )}
                    <div className="col-span-2">
                      <Select
                        label="Trạng thái sẵn sàng"
                        value={d.available ? "yes" : "no"}
                        onChange={(x) => setD({ ...d, available: x === "yes" })}
                        options={[
                          { value: "yes", label: "Sẵn sàng nhận chuyến" },
                          { value: "no", label: "Tạm nghỉ / không khả dụng" },
                        ]}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="col-span-2">
                      {input("Tên tuyến đường *", "name", r.name, (x) => setR({ ...r, name: x }))}
                    </div>
                    <LocationPicker
                      label="Điểm đi *"
                      value={r.originLocation}
                      onChange={(originLocation) =>
                        setR({ ...r, originLocation, origin: originLocation?.area ?? "" })
                      }
                      allowAreas
                      instructions={false}
                      error={fieldError("origin")}
                    />
                    <LocationPicker
                      label="Điểm đến *"
                      value={r.destinationLocation}
                      onChange={(destinationLocation) =>
                        setR({
                          ...r,
                          destinationLocation,
                          destination: destinationLocation?.area ?? "",
                        })
                      }
                      allowAreas
                      instructions={false}
                      error={fieldError("destination")}
                    />
                    <div className="col-span-2 border-t border-line pt-5">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-sm">Điểm dừng trung gian</span>
                        <Button
                          type="button"
                          variant="secondary"
                          icon="plus"
                          onClick={() =>
                            setR({
                              ...r,
                              stops: [...r.stops, ""],
                              stopLocations: [...(r.stopLocations ?? []), null],
                            })
                          }
                        >
                          Thêm điểm dừng
                        </Button>
                      </div>
                      {!r.stops.length && (
                        <p className="text-sm text-slate-400 py-4">
                          Tuyến đi thẳng · Chưa thêm điểm dừng trung gian.
                        </p>
                      )}
                      <div className="space-y-3 mt-3">
                        {r.stops.map((s, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="size-7 shrink-0 rounded-full bg-blue-50 text-primary grid place-items-center text-xs font-bold">
                              {i + 1}
                            </span>
                            <LocationPicker
                              label={`Điểm dừng ${i + 1}`}
                              value={r.stopLocations?.[i]}
                              onChange={(location) =>
                                setR({
                                  ...r,
                                  stops: r.stops.map((x, j) =>
                                    j === i ? (location?.label ?? "") : x,
                                  ),
                                  stopLocations: r.stops.map((_, j) =>
                                    j === i ? location : (r.stopLocations?.[j] ?? null),
                                  ),
                                })
                              }
                            />
                            <button
                              type="button"
                              disabled={i === 0}
                              aria-label={`Đưa điểm dừng ${i + 1} lên trên`}
                              className="size-10 shrink-0 rounded-lg border border-line disabled:opacity-30"
                              onClick={() => {
                                const next = [...r.stops];
                                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                                const locations = [...(r.stopLocations ?? [])];
                                [locations[i - 1], locations[i]] = [locations[i], locations[i - 1]];
                                setR({ ...r, stops: next, stopLocations: locations });
                              }}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              aria-label={`Xóa điểm dừng ${i + 1}`}
                              className="size-10 shrink-0 grid place-items-center text-danger hover:bg-red-50 rounded-lg"
                              onClick={() =>
                                setR({
                                  ...r,
                                  stops: r.stops.filter((_, j) => i !== j),
                                  stopLocations: r.stopLocations?.filter((_, j) => i !== j),
                                })
                              }
                            >
                              <Icon name="x" className="size-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {fieldError("stops") && (
                        <p className="text-xs text-danger mt-2">{fieldError("stops")}</p>
                      )}
                    </div>
                    {input(
                      "Quãng đường dự kiến (km) *",
                      "distance",
                      r.distance || "",
                      (x) => setR({ ...r, distance: Number(x) }),
                      "number",
                    )}
                    {input(
                      "Thời gian dự kiến (phút) *",
                      "duration",
                      r.duration || "",
                      (x) => setR({ ...r, duration: Number(x) }),
                      "number",
                    )}
                  </>
                )}
              </div>
            </section>
            {(isVehicle || isDriver) && assignmentPanel}
            {error && (
              <div className="mt-5">
                <ErrorNote>{error}</ErrorNote>
              </div>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" type="button" onClick={back}>
                Hủy thay đổi
              </Button>
              <Button type="submit" icon="check">
                Lưu {isVehicle ? "phương tiện" : isDriver ? "tài xế" : "tuyến đường"}
              </Button>
            </div>
          </div>
          <aside className="space-y-5">
            <section className={cn(box, "p-6")}>
              <Icon
                name={isVehicle ? "car" : isDriver ? "shield" : "route"}
                className="size-9 text-primary"
              />
              <h3 className="font-bold mt-4">
                {isVehicle
                  ? "Hồ sơ phương tiện"
                  : isDriver
                    ? "An toàn mỗi hành trình"
                    : "Xem trước tuyến đường"}
              </h3>
              <p className="text-sm text-slate-500 mt-2 leading-6">
                {isVehicle
                  ? "Biển số duy nhất giúp nhận diện xe chính xác. Cập nhật trạng thái khi bảo dưỡng để tránh phân công nhầm."
                  : isDriver
                    ? "Thông tin liên hệ và giấy phép cần chính xác. Không phân công cho tài xế có giấy phép hết hạn."
                    : "Thứ tự điểm dừng được sử dụng khi lập lịch và xây dựng lộ trình chuyến đi."}
              </p>
              {!isVehicle && !isDriver && (
                <ol className="mt-5 space-y-4">
                  {[r.origin, ...r.stops, r.destination].map((p, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="size-6 rounded-full bg-primary/10 text-primary font-bold text-xs grid place-items-center shrink-0">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{p || "Điểm dừng mới"}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
            <section className="bg-blue-50 border border-blue-100 rounded-[20px] p-5 text-sm text-blue-900 leading-6 flex gap-3">
              <Icon name="info" className="size-5 shrink-0 mt-0.5" />
              <p>
                {isVehicle || isDriver
                  ? "Lịch phân công không được giao nhau. Chuyến kết thúc đúng lúc chuyến sau bắt đầu không được tính là trùng lịch. Thời gian trong mẫu: 18–19/07/2025."
                  : "Khoảng cách và thời gian là ước tính do nhà xe nhập, chưa được tính từ dịch vụ bản đồ."}
              </p>
            </section>
          </aside>
        </div>
      </form>
    );

  const search = norm(query);
  const data = isVehicle
    ? vehicles.filter(
        (x) =>
          norm(
            `${x.plate} ${x.model} ${drivers
              .filter((d) => assignments.some((a) => a.vehicleId === x.id && a.driverId === d.id))
              .map((d) => d.name)
              .join(" ")}`,
          ).includes(search) &&
          (filter === "all" || x.status === filter),
      )
    : isDriver
      ? drivers.filter(
          (x) =>
            norm(`${x.name} ${x.phone} ${x.license}`).includes(search) &&
            (filter === "all" || (x.available ? "ready" : "off") === filter),
        )
      : routes.filter(
          (x) =>
            norm(`${x.name} ${x.origin} ${x.destination} ${x.stops.join(" ")}`).includes(search) &&
            (filter === "all" || x.origin === filter),
        );
  const pageCount = Math.max(1, Math.ceil(data.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const slice = data.slice((safePage - 1) * pageSize, safePage * pageSize);
  const action = (entity: Vehicle | Driver | Route) => (
    <button
      onClick={() => openForm(entity)}
      className="px-3 py-2 rounded-lg font-semibold text-primary hover:bg-blue-50 text-xs"
    >
      Chỉnh sửa
    </button>
  );
  return (
    <div className="space-y-6">
      {saved && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex justify-between items-center"
        >
          <span className="flex gap-2 items-center">
            <Icon name="check" className="size-4" />
            {saved}
          </span>
          <button onClick={() => setSaved("")} aria-label="Đóng thông báo">
            <Icon name="x" className="size-4" />
          </button>
        </div>
      )}
      <div className="grid grid-cols-3 gap-5">
        {(isVehicle
          ? [
              [vehicles.length, "Tổng phương tiện", "car"],
              [vehicles.filter((x) => x.status === "ready").length, "Sẵn sàng vận hành", "check"],
              [
                vehicles.filter((x) => x.status !== "ready").length,
                "Bảo dưỡng / ngừng hoạt động",
                "settings",
              ],
            ]
          : isDriver
            ? [
                [drivers.length, "Tổng tài xế", "users"],
                [drivers.filter((x) => x.available).length, "Sẵn sàng nhận chuyến", "check"],
                [new Set(assignments.map((a) => a.driverId)).size, "Tài xế đã có lịch", "calendar"],
              ]
            : [
                [routes.length, "Tuyến đang khai thác", "route"],
                [
                  new Set(routes.flatMap((r) => [r.origin, r.destination])).size,
                  "Địa phương kết nối",
                  "pin",
                ],
                [routes.reduce((n, r) => n + r.distance, 0), "Tổng quãng đường (km)", "bus"],
              ]
        ).map(([n, label, icon]) => (
          <div key={label} className={cn(box, "p-5 flex items-center gap-4")}>
            <span className="size-12 bg-blue-50 rounded-xl text-primary grid place-items-center">
              <Icon name={String(icon)} className="size-6" />
            </span>
            <div>
              <div className="text-3xl font-bold tracking-tight">{n}</div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </div>
          </div>
        ))}
      </div>
      <section className={cn(box, "p-6")}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="font-bold text-lg">
              Danh sách {isVehicle ? "phương tiện" : isDriver ? "tài xế" : "tuyến đường"}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {companyName} · {data.length} kết quả
            </p>
          </div>
          <Button icon="plus" onClick={() => openForm()}>
            {isVehicle ? "Thêm phương tiện" : isDriver ? "Thêm tài xế" : "Tạo tuyến đường"}
          </Button>
        </div>
        <div className="flex gap-4 mb-5">
          <div className="w-[420px]">
            <SearchInput
              aria-label="Tìm kiếm danh sách"
              placeholder={
                isVehicle
                  ? "Tìm biển số, dòng xe, tài xế..."
                  : isDriver
                    ? "Tìm tên, số điện thoại, giấy phép..."
                    : "Tìm tên tuyến, điểm đi, điểm đến..."
              }
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <select
            aria-label={isVehicle || isDriver ? "Lọc trạng thái" : "Lọc điểm đi"}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className="border border-line rounded-xl px-4 h-11 bg-surface text-sm"
          >
            <option value="all">
              {isVehicle || isDriver ? "Tất cả trạng thái" : "Tất cả điểm đi"}
            </option>
            {(isVehicle
              ? Object.entries(vehicleLabels)
              : isDriver
                ? [
                    ["ready", "Sẵn sàng"],
                    ["off", "Tạm nghỉ"],
                  ]
                : cities.map((c) => [c, c])
            ).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {(query || filter !== "all") && (
            <button onClick={resetList} className="text-sm text-primary font-semibold">
              Xóa bộ lọc
            </button>
          )}
        </div>
        {isVehicle ? (
          <DataTable
            rows={slice as Vehicle[]}
            columns={[
              {
                key: "plate",
                header: "Biển số / Phương tiện",
                render: (x) => (
                  <div>
                    <span className="font-semibold">{x.plate}</span>
                    <p className="text-xs text-slate-500 mt-1">
                      {x.model} · {x.year}
                    </p>
                  </div>
                ),
              },
              { key: "type", header: "Loại xe" },
              { key: "capacity", header: "Số chỗ", render: (x) => `${x.capacity} chỗ` },
              {
                key: "status",
                header: "Trạng thái",
                render: (x) => (
                  <Badge
                    kind={
                      x.status === "ready"
                        ? "success"
                        : x.status === "maintenance"
                          ? "warning"
                          : "pending"
                    }
                  >
                    {vehicleLabels[x.status]}
                  </Badge>
                ),
              },
              {
                key: "assigned",
                header: "Tài xế / Lịch gần nhất",
                render: (x) => {
                  const a = assignments
                    .filter((a) => a.vehicleId === x.id)
                    .sort((a, b) => a.start.localeCompare(b.start))[0];
                  return a ? (
                    <div className="text-sm">
                      {findDriver(a.driverId)?.name}
                      <p className="text-xs text-slate-400 mt-1">
                        {a.tripId} · {slotTime(a)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs">Chưa phân công</span>
                  );
                },
              },
              { key: "actions", header: "Thao tác", render: action },
            ]}
          />
        ) : isDriver ? (
          <DataTable
            rows={slice as Driver[]}
            columns={[
              {
                key: "name",
                header: "Tài xế",
                render: (x) => (
                  <div className="flex gap-3 items-center">
                    <span className="size-9 rounded-full bg-teal/10 text-teal-700 font-semibold grid place-items-center">
                      {x.name.split(" ").pop()?.[0]}
                    </span>
                    <div className="font-semibold">
                      {x.name}
                      <p className="text-xs font-normal text-slate-500 mt-1">{x.email}</p>
                    </div>
                  </div>
                ),
              },
              { key: "phone", header: "Điện thoại" },
              {
                key: "license",
                header: "Giấy phép",
                render: (x) => (
                  <div className="font-mono text-xs">
                    {x.license}
                    <p className="font-sans text-slate-400 mt-1">
                      Hạn: {x.expiry.split("-").reverse().join("/")}
                    </p>
                  </div>
                ),
              },
              {
                key: "available",
                header: "Sẵn sàng",
                render: (x) => (
                  <Badge kind={x.available ? "success" : "pending"}>
                    {x.available ? "Sẵn sàng" : "Tạm nghỉ"}
                  </Badge>
                ),
              },
              {
                key: "trip",
                header: "Chuyến được giao",
                render: (x) => {
                  const a = assignments
                    .filter((a) => a.driverId === x.id)
                    .sort((a, b) => a.start.localeCompare(b.start))[0];
                  return a ? (
                    <div className="text-sm font-medium">
                      {a.tripId}
                      <p className="text-xs text-slate-400 mt-1">{slotTime(a)}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">Chưa có lịch</span>
                  );
                },
              },
              { key: "actions", header: "Thao tác", render: action },
            ]}
          />
        ) : (
          <DataTable
            rows={slice as Route[]}
            columns={[
              {
                key: "name",
                header: "Tên tuyến",
                render: (x) => <span className="font-semibold text-primary">{x.name}</span>,
              },
              { key: "origin", header: "Điểm đi" },
              { key: "destination", header: "Điểm đến" },
              {
                key: "stops",
                header: "Điểm dừng trung gian",
                render: (x) => (
                  <span className="text-sm text-slate-500">
                    {x.stops.join(" → ") || "Đi thẳng"}
                  </span>
                ),
              },
              { key: "distance", header: "Quãng đường", render: (x) => `${x.distance} km` },
              {
                key: "duration",
                header: "Dự kiến",
                render: (x) =>
                  `${Math.floor(x.duration / 60) ? `${Math.floor(x.duration / 60)} giờ ` : ""}${x.duration % 60 ? `${x.duration % 60} phút` : ""}`,
              },
              { key: "actions", header: "Thao tác", render: action },
            ]}
          />
        )}
        {!data.length ? (
          <div className="py-14 text-center">
            <Icon name="search" className="size-9 mx-auto text-slate-300" />
            <h3 className="font-semibold mt-3">Không tìm thấy kết quả</h3>
            <p className="text-sm text-slate-500 mt-1">Thử từ khóa khác hoặc xóa bộ lọc.</p>
            <button className="mt-4 font-semibold text-primary text-sm" onClick={resetList}>
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="mt-5">
            <Pagination
              page={safePage}
              pages={pageCount}
              total={data.length}
              perPage={pageSize}
              onChange={setPage}
            />
          </div>
        )}
      </section>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Icon name="shield" className="size-4 text-teal" />
        {isVehicle || isDriver
          ? "Mọi thay đổi phân công đều được kiểm tra trùng lịch phương tiện và tài xế."
          : "Các điểm dừng được giữ đúng thứ tự nhà xe thiết lập."}
      </div>
    </div>
  );
}
