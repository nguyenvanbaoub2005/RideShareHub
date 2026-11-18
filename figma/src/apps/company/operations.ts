import {
  areaLocation,
  seedLocation,
  validLocation,
  type GeoLocation,
} from "../../address/model.ts";

export type Vehicle = {
  id: string;
  plate: string;
  type: string;
  capacity: number;
  model: string;
  year: number;
  status: "ready" | "maintenance" | "inactive";
  note: string;
};
export type Driver = {
  id: string;
  name: string;
  phone: string;
  email: string;
  license: string;
  expiry: string;
  available: boolean;
};
export type Route = {
  originLocation?: GeoLocation | null;
  destinationLocation?: GeoLocation | null;
  stopLocations?: (GeoLocation | null)[];
  id: string;
  name: string;
  origin: string;
  destination: string;
  stops: string[];
  distance: number;
  duration: number;
};
export type Assignment = {
  id: string;
  tripId: string;
  vehicleId: string;
  driverId: string;
  start: string;
  end: string;
};
export type TripSlot = { id: string; label: string; start: string; end: string };
export const cities = ["Đà Nẵng", "Huế", "Hội An", "Quảng Nam"];
export const referenceDate = "2025-07-18";
export const vehicles: Vehicle[] = [
  {
    id: "v1",
    plate: "43A-123.45",
    type: "Xe khách",
    capacity: 16,
    model: "Ford Transit",
    year: 2022,
    status: "ready",
    note: "Bảo dưỡng định kỳ mỗi 10.000 km",
  },
  {
    id: "v2",
    plate: "43B-678.90",
    type: "Xe khách",
    capacity: 16,
    model: "Hyundai Solati",
    year: 2023,
    status: "ready",
    note: "",
  },
  {
    id: "v3",
    plate: "43A-245.18",
    type: "Limousine",
    capacity: 9,
    model: "DCar Limousine",
    year: 2024,
    status: "ready",
    note: "",
  },
  {
    id: "v4",
    plate: "43B-402.76",
    type: "Xe khách",
    capacity: 29,
    model: "Thaco Town",
    year: 2021,
    status: "maintenance",
    note: "Kiểm tra hệ thống phanh",
  },
  {
    id: "v5",
    plate: "92A-332.18",
    type: "Xe hợp đồng",
    capacity: 7,
    model: "Toyota Fortuner",
    year: 2023,
    status: "ready",
    note: "",
  },
  {
    id: "v6",
    plate: "75B-028.36",
    type: "Xe khách",
    capacity: 16,
    model: "Mercedes Sprinter",
    year: 2020,
    status: "inactive",
    note: "",
  },
];
export const drivers: Driver[] = [
  {
    id: "d1",
    name: "Nguyễn Văn Hải",
    phone: "0905 111 222",
    email: "hai.nguyen@minhtam.vn",
    license: "430123456789",
    expiry: "2029-08-20",
    available: true,
  },
  {
    id: "d2",
    name: "Trần Quốc Bảo",
    phone: "0914 333 444",
    email: "bao.tran@minhtam.vn",
    license: "430234567890",
    expiry: "2028-12-10",
    available: true,
  },
  {
    id: "d3",
    name: "Lê Thanh Tùng",
    phone: "0935 555 666",
    email: "tung.le@minhtam.vn",
    license: "920345678901",
    expiry: "2030-03-15",
    available: true,
  },
  {
    id: "d4",
    name: "Phạm Minh Đức",
    phone: "0988 301 775",
    email: "duc.pham@minhtam.vn",
    license: "750456789012",
    expiry: "2027-06-28",
    available: false,
  },
  {
    id: "d5",
    name: "Võ Hoàng Nam",
    phone: "0977 456 002",
    email: "nam.vo@minhtam.vn",
    license: "430567890123",
    expiry: "2029-11-01",
    available: true,
  },
];
const routeFixtures: Route[] = [
  {
    id: "r1",
    name: "Đà Nẵng – Huế",
    origin: "Đà Nẵng",
    destination: "Huế",
    stops: ["Hầm Hải Vân", "Lăng Cô"],
    distance: 105,
    duration: 180,
  },
  {
    id: "r2",
    name: "Đà Nẵng – Hội An",
    origin: "Đà Nẵng",
    destination: "Hội An",
    stops: ["Ngũ Hành Sơn"],
    distance: 30,
    duration: 60,
  },
  {
    id: "r3",
    name: "Hội An – Quảng Nam",
    origin: "Hội An",
    destination: "Quảng Nam",
    stops: ["Duy Xuyên", "Thăng Bình"],
    distance: 48,
    duration: 75,
  },
  {
    id: "r4",
    name: "Huế – Đà Nẵng",
    origin: "Huế",
    destination: "Đà Nẵng",
    stops: ["Phú Lộc", "Lăng Cô"],
    distance: 105,
    duration: 180,
  },
];
export const routes: Route[] = routeFixtures.map((r) => {
  const stopLocations = r.stops.map((s) => seedLocation(s) ?? null);
  return {
    ...r,
    originLocation: areaLocation(r.origin),
    destinationLocation: areaLocation(r.destination),
    stopLocations,
    stops: stopLocations.map((p, i) => p?.label ?? r.stops[i]),
  };
});
export const tripSlots: TripSlot[] = [
  { id: "CH-2041", label: "Đà Nẵng → Huế", start: "2025-07-18T07:30", end: "2025-07-18T10:30" },
  { id: "CH-2042", label: "Đà Nẵng → Hội An", start: "2025-07-18T09:00", end: "2025-07-18T10:00" },
  { id: "CH-2043", label: "Đà Nẵng → Huế", start: "2025-07-18T08:00", end: "2025-07-18T11:00" },
  { id: "CH-2044", label: "Huế → Đà Nẵng", start: "2025-07-18T13:00", end: "2025-07-18T16:00" },
  {
    id: "CH-2045",
    label: "Hội An → Quảng Nam",
    start: "2025-07-19T09:30",
    end: "2025-07-19T10:45",
  },
];
export const assignments: Assignment[] = [
  {
    id: "a1",
    tripId: "CH-2041",
    vehicleId: "v1",
    driverId: "d1",
    start: tripSlots[0].start,
    end: tripSlots[0].end,
  },
  {
    id: "a2",
    tripId: "CH-2042",
    vehicleId: "v2",
    driverId: "d2",
    start: tripSlots[1].start,
    end: tripSlots[1].end,
  },
];
export const slotTime = (s: { start: string; end: string }) =>
  `${s.start.slice(8, 10)}/${s.start.slice(5, 7)} · ${s.start.slice(11)}–${s.end.slice(11)}`;
export function assignmentError(candidate: Assignment, existing: Assignment[]): string {
  if (!candidate.driverId || !candidate.vehicleId) return "Chọn đầy đủ tài xế và phương tiện.";
  if (
    !candidate.start ||
    !candidate.end ||
    !Number.isFinite(Date.parse(candidate.start)) ||
    !Number.isFinite(Date.parse(candidate.end)) ||
    candidate.start >= candidate.end
  )
    return "Khoảng thời gian phân công không hợp lệ.";
  for (const a of existing) {
    if (a.id === candidate.id) continue;
    const overlap = candidate.start < a.end && a.start < candidate.end;
    if (overlap && a.vehicleId === candidate.vehicleId)
      return `Phương tiện đã được phân công cho ${a.tripId} (${slotTime(a)}). Vui lòng chọn xe hoặc chuyến khác.`;
    if (overlap && a.driverId === candidate.driverId)
      return `Tài xế đã được phân công cho ${a.tripId} (${slotTime(a)}). Vui lòng chọn tài xế hoặc chuyến khác.`;
    if (a.tripId === candidate.tripId)
      return `Chuyến ${a.tripId} đã được phân công. Chọn chuyến khác để tránh ghi đè phân công hiện tại.`;
  }
  return "";
}
export function validateVehicle(v: Vehicle, list: Vehicle[]) {
  return {
    plate: !/^\d{2}[A-Z]{1,2}-\d{3}\.\d{2}$/.test(v.plate.trim().toUpperCase())
      ? "Biển số theo định dạng 43A-123.45."
      : list.some((x) => x.id !== v.id && x.plate === v.plate.trim().toUpperCase())
        ? "Biển số này đã tồn tại."
        : "",
    type: !v.type ? "Vui lòng chọn loại xe." : "",
    capacity:
      !Number.isInteger(v.capacity) || v.capacity < 1 || v.capacity > 60
        ? "Số chỗ phải là số nguyên từ 1 đến 60."
        : "",
    model: !v.model.trim() ? "Vui lòng nhập hãng / dòng xe." : "",
    year:
      !Number.isInteger(v.year) || v.year < 2000 || v.year > 2026
        ? "Năm sản xuất từ 2000 đến 2026."
        : "",
  };
}
export function validateDriver(d: Driver, list: Driver[]) {
  return {
    name: d.name.trim().length < 2 ? "Vui lòng nhập họ tên." : "",
    phone: !/^(0|\+84)\d{9}$/.test(d.phone.replace(/\s/g, "")) ? "Số điện thoại không hợp lệ." : "",
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim()) ? "Email không hợp lệ." : "",
    license: !/^\d{12}$/.test(d.license.trim())
      ? "Số giấy phép lái xe cần 12 chữ số."
      : list.some((x) => x.id !== d.id && x.license === d.license.trim())
        ? "Số giấy phép lái xe đã tồn tại."
        : "",
    expiry:
      !/^\d{4}-\d{2}-\d{2}$/.test(d.expiry) ||
      !Number.isFinite(Date.parse(d.expiry)) ||
      d.expiry <= referenceDate
        ? "Giấy phép phải còn hạn sau 18/07/2025 (ngày mô phỏng)."
        : "",
  };
}
export function validateRoute(r: Route) {
  return {
    name: r.name.trim().length < 3 ? "Tên tuyến cần ít nhất 3 ký tự." : "",
    origin:
      !r.origin.trim() ||
      !validLocation(r.originLocation, true) ||
      r.originLocation.area !== r.origin
        ? "Chọn điểm đi từ gợi ý hoặc bản đồ."
        : "",
    destination:
      !r.destination.trim() ||
      !validLocation(r.destinationLocation, true) ||
      r.destinationLocation.area !== r.destination
        ? "Vui lòng chọn điểm đến."
        : r.origin === r.destination
          ? "Điểm đến phải khác điểm đi."
          : "",
    stops: r.stops.some(
      (s, i) =>
        !s.trim() || !validLocation(r.stopLocations?.[i]) || r.stopLocations?.[i]?.label !== s,
    )
      ? "Điền hoặc xóa điểm dừng đang trống."
      : new Set(r.stops.map((s) => s.trim().toLocaleLowerCase("vi"))).size !== r.stops.length
        ? "Không nhập điểm dừng trùng nhau."
        : "",
    distance:
      !Number.isFinite(r.distance) || r.distance <= 0 || r.distance > 2000
        ? "Quãng đường lớn hơn 0 và không quá 2.000 km."
        : "",
    duration:
      !Number.isInteger(r.duration) || r.duration < 1 || r.duration > 2880
        ? "Thời gian từ 1 đến 2.880 phút."
        : "",
  };
}
