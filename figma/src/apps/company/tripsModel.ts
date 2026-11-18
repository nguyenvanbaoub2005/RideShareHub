import {
  assignmentError,
  type Assignment,
  type Driver,
  type Route,
  type Vehicle,
} from "./operations.ts";
import type { CompanyStatus } from "./model.ts";
import {
  seedLocation,
  validLocation,
  dispatchPoint,
  haversineKm,
  locationFingerprint,
  type GeoLocation,
} from "../../address/model.ts";

export type TripStatus = "draft" | "published" | "active" | "completed" | "cancelled";
export type CompanyTrip = {
  id: string;
  routeId: string;
  departure: string;
  vehicleId: string;
  driverId: string;
  capacity: number;
  fare: number;
  status: TripStatus;
};
export type CompanyBooking = {
  pickupLocation?: GeoLocation | null;
  dropoffLocation?: GeoLocation | null;
  id: string;
  tripId: string;
  passenger: string;
  phone: string;
  seats: number;
  pickup: string;
  dropoff: string;
  status: "confirmed" | "completed" | "cancelled";
};
export type CompanyStop = {
  location?: GeoLocation | null;
  id: string;
  bookingId: string;
  type: "pickup" | "dropoff";
  address: string;
  x: number;
  y: number;
  status: "pending" | "arrived" | "done";
};
export const tripIds = [
  "trips",
  "tripForm",
  "tripDetail",
  "bookings",
  "stops",
  "optimization",
  "tracking",
];
export const statusLabels: Record<TripStatus, string> = {
  draft: "Bản nháp",
  published: "Đã công bố",
  active: "Đang chạy",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};
export const initialTrips: CompanyTrip[] = [
  {
    id: "CH-2041",
    routeId: "r1",
    departure: "2025-07-18T07:30",
    vehicleId: "v1",
    driverId: "d1",
    capacity: 16,
    fare: 120000,
    status: "active",
  },
  {
    id: "CH-2042",
    routeId: "r2",
    departure: "2025-07-18T09:00",
    vehicleId: "v2",
    driverId: "d2",
    capacity: 16,
    fare: 60000,
    status: "published",
  },
  {
    id: "CH-2044",
    routeId: "r4",
    departure: "2025-07-18T13:00",
    vehicleId: "v1",
    driverId: "d1",
    capacity: 16,
    fare: 120000,
    status: "draft",
  },
  {
    id: "CH-2045",
    routeId: "r3",
    departure: "2025-07-19T09:30",
    vehicleId: "v3",
    driverId: "d3",
    capacity: 9,
    fare: 45000,
    status: "draft",
  },
  {
    id: "CH-2038",
    routeId: "r4",
    departure: "2025-07-17T15:00",
    vehicleId: "v1",
    driverId: "d1",
    capacity: 16,
    fare: 120000,
    status: "completed",
  },
  {
    id: "CH-2036",
    routeId: "r2",
    departure: "2025-07-17T08:00",
    vehicleId: "v2",
    driverId: "d2",
    capacity: 16,
    fare: 60000,
    status: "cancelled",
  },
];
const bookingFixtures: CompanyBooking[] = [
  {
    id: "RSH-0317",
    tripId: "CH-2041",
    passenger: "Nguyễn Minh Anh",
    phone: "0905 123 456",
    seats: 2,
    pickup: "Bến xe Trung tâm Đà Nẵng",
    dropoff: "Bến xe phía Nam Huế",
    status: "confirmed",
  },
  {
    id: "RSH-0318",
    tripId: "CH-2041",
    passenger: "Trần Thị Lan",
    phone: "0914 220 118",
    seats: 3,
    pickup: "254 Nguyễn Văn Linh, Đà Nẵng",
    dropoff: "Lăng Cô, Phú Lộc",
    status: "confirmed",
  },
  {
    id: "RSH-0319",
    tripId: "CH-2041",
    passenger: "Phạm Quốc Việt",
    phone: "0988 301 775",
    seats: 4,
    pickup: "Bến xe Trung tâm Đà Nẵng",
    dropoff: "Bến xe phía Nam Huế",
    status: "confirmed",
  },
  {
    id: "RSH-0320",
    tripId: "CH-2041",
    passenger: "Võ Thị Hương",
    phone: "0977 456 002",
    seats: 3,
    pickup: "Ngã ba Hòa Khánh, Đà Nẵng",
    dropoff: "An Cựu, Huế",
    status: "confirmed",
  },
  {
    id: "RSH-0321",
    tripId: "CH-2042",
    passenger: "Lê Hoàng Nam",
    phone: "0935 884 120",
    seats: 3,
    pickup: "Bến xe Trung tâm Đà Nẵng",
    dropoff: "Bến xe Hội An",
    status: "confirmed",
  },
  {
    id: "RSH-0322",
    tripId: "CH-2042",
    passenger: "Nguyễn Thị Thu",
    phone: "0905 887 331",
    seats: 2,
    pickup: "Ngũ Hành Sơn, Đà Nẵng",
    dropoff: "Chùa Cầu, Hội An",
    status: "confirmed",
  },
  {
    id: "RSH-0301",
    tripId: "CH-2042",
    passenger: "Đặng Minh Tuấn",
    phone: "0905 776 998",
    seats: 1,
    pickup: "Bến xe Trung tâm Đà Nẵng",
    dropoff: "Bến xe Hội An",
    status: "cancelled",
  },
];
export const initialBookings: CompanyBooking[] = bookingFixtures.map((b) => {
  const pickupLocation = seedLocation(b.pickup),
    dropoffLocation = seedLocation(b.dropoff);
  return {
    ...b,
    pickupLocation,
    dropoffLocation,
    pickup: pickupLocation?.address ?? b.pickup,
    dropoff: dropoffLocation?.address ?? b.dropoff,
  };
});
export function seedStopMap(): Record<string, CompanyStop[]> {
  return Object.fromEntries(
    ["CH-2041", "CH-2042"].map((id) => {
      const bookings = initialBookings.filter((b) => b.tripId === id && b.status !== "cancelled");
      const picks = bookings.map((b, i): CompanyStop => ({
        id: `${b.id}-p`,
        bookingId: b.id,
        type: "pickup",
        address: b.pickup,
        location: b.pickupLocation,
        ...(b.pickupLocation ? dispatchPoint(b.pickupLocation) : { x: 0, y: 0 }),
        status: id === "CH-2041" && i === 0 ? "done" : "pending",
      }));
      const drops = bookings.map((b, i): CompanyStop => ({
        id: `${b.id}-d`,
        bookingId: b.id,
        type: "dropoff",
        address: b.dropoff,
        location: b.dropoffLocation,
        ...(b.dropoffLocation ? dispatchPoint(b.dropoffLocation) : { x: 0, y: 0 }),
        status: "pending",
      }));
      return [id, [...picks, ...drops]];
    }),
  );
}
// Fixed +07:00 conversion avoids dependence on the browser's local timezone.
export function arrival(departure: string, minutes: number) {
  const start = Date.parse(`${departure}:00+07:00`);
  if (!Number.isFinite(start)) return "";
  return new Date(start + minutes * 60000 + 7 * 3600000).toISOString().slice(0, 16);
}
export const bookedSeats = (tripId: string, bookings: CompanyBooking[]) =>
  bookings
    .filter((b) => b.tripId === tripId && b.status !== "cancelled")
    .reduce((sum, b) => sum + b.seats, 0);
export const seatsLeft = (t: CompanyTrip, bookings: CompanyBooking[]) =>
  t.capacity - bookedSeats(t.id, bookings);
export function validateTrip(
  t: CompanyTrip,
  context: {
    status: CompanyStatus;
    routes: Route[];
    vehicles: Vehicle[];
    drivers: Driver[];
    assignments: Assignment[];
    bookings: CompanyBooking[];
  },
  publish: boolean,
) {
  const route = context.routes.find((r) => r.id === t.routeId);
  const vehicle = context.vehicles.find((v) => v.id === t.vehicleId);
  const driver = context.drivers.find((d) => d.id === t.driverId);
  const end = route ? arrival(t.departure, route.duration) : "";
  const own = context.assignments.find((a) => a.tripId === t.id);
  const errors = {
    editable:
      t.status !== "draft"
        ? "Chỉ được chỉnh sửa hoặc công bố chuyến đang ở trạng thái bản nháp."
        : "",
    approval:
      publish && context.status !== "APPROVED"
        ? "Chỉ nhà xe đã được phê duyệt mới được công bố chuyến."
        : "",
    routeId: !route ? "Vui lòng chọn tuyến đường." : "",
    vehicleId: !vehicle
      ? "Vui lòng chọn phương tiện."
      : vehicle.status !== "ready"
        ? "Phương tiện chưa sẵn sàng."
        : "",
    driverId: !driver
      ? "Vui lòng chọn tài xế."
      : !driver.available
        ? "Tài xế đang tạm nghỉ."
        : driver.expiry < (end || t.departure).slice(0, 10)
          ? "Giấy phép tài xế hết hạn trước ngày đi."
          : "",
    departure:
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(t.departure) || !end
        ? "Chọn ngày và giờ khởi hành hợp lệ."
        : "",
    capacity:
      !Number.isInteger(t.capacity) || t.capacity < 1 || t.capacity > (vehicle?.capacity ?? 0)
        ? "Số chỗ mở bán phải nằm trong sức chứa xe."
        : t.capacity < bookedSeats(t.id, context.bookings)
          ? "Số chỗ không thể ít hơn số chỗ đã đặt."
          : "",
    fare:
      !Number.isInteger(t.fare) || t.fare < 1000
        ? "Giá vé tối thiểu 1.000 ₫, không có phần thập phân."
        : "",
    assignment: "",
  };
  if (end && vehicle && driver)
    errors.assignment = assignmentError(
      {
        id: own?.id ?? "new",
        tripId: t.id,
        vehicleId: t.vehicleId,
        driverId: t.driverId,
        start: t.departure,
        end,
      },
      context.assignments,
    );
  return errors;
}
export function bookingError(b: CompanyBooking, t: CompanyTrip, bookings: CompanyBooking[]) {
  if (t.status !== "published") return "Chỉ nhận đặt chỗ cho chuyến đã công bố và chưa khởi hành.";
  if (
    b.passenger.trim().length < 2 ||
    !/^(0|\+84)\d{9}$/.test(b.phone.replace(/\s/g, "")) ||
    !b.pickup.trim() ||
    !b.dropoff.trim()
  )
    return "Điền đầy đủ họ tên, số điện thoại hợp lệ, điểm đón và điểm trả.";
  if (
    !validLocation(b.pickupLocation) ||
    !validLocation(b.dropoffLocation) ||
    b.pickup !== b.pickupLocation.address ||
    b.dropoff !== b.dropoffLocation.address
  )
    return "Chọn điểm đón và điểm trả có tọa độ từ gợi ý hoặc bản đồ.";
  if (
    !Number.isInteger(b.seats) ||
    b.seats < 1 ||
    b.seats >
      seatsLeft(
        t,
        bookings.filter((x) => x.id !== b.id),
      )
  )
    return "Số chỗ đặt vượt quá số chỗ còn lại hoặc không hợp lệ.";
  return "";
}
export function updateBookingStops(stops: CompanyStop[], booking: CompanyBooking) {
  if (
    !validLocation(booking.pickupLocation) ||
    !validLocation(booking.dropoffLocation) ||
    booking.pickup !== booking.pickupLocation.address ||
    booking.dropoff !== booking.dropoffLocation.address
  )
    return { stops, error: "Chọn đủ điểm đón và trả có tọa độ." };
  if (stops.some((s) => s.bookingId === booking.id && s.status !== "pending"))
    return { stops, error: "Không thể sửa điểm đã được xử lý hoặc đang đến." };
  return {
    stops: stops.map((s) => {
      if (s.bookingId !== booking.id) return s;
      const location = s.type === "pickup" ? booking.pickupLocation! : booking.dropoffLocation!;
      return { ...s, location, address: location.address, ...dispatchPoint(location) };
    }),
    error: "",
  };
}
export function stopOrderError(proposed: CompanyStop[], original: CompanyStop[]) {
  if (
    proposed.length !== original.length ||
    new Set(proposed.map((s) => s.id)).size !== original.length ||
    proposed.some((s) => !original.some((o) => o.id === s.id))
  )
    return "Lộ trình phải giữ đầy đủ các điểm đón/trả, không được bỏ qua điểm dừng.";
  const immutable = original
    .map(
      (s) =>
        `${s.id}|${s.bookingId}|${s.type}|${s.status}|${s.address}|${s.x}|${s.y}|${locationFingerprint(s.location)}`,
    )
    .sort();
  if (
    JSON.stringify(immutable) !==
    JSON.stringify(
      proposed
        .map(
          (s) =>
            `${s.id}|${s.bookingId}|${s.type}|${s.status}|${s.address}|${s.x}|${s.y}|${locationFingerprint(s.location)}`,
        )
        .sort(),
    )
  )
    return "Tối ưu chỉ được đổi thứ tự, không được thay đổi thông tin hoặc trạng thái điểm dừng.";
  const lockedThrough = original.reduce((last, s, i) => (s.status !== "pending" ? i : last), -1);
  if (original.slice(0, lockedThrough + 1).some((s, i) => proposed[i]?.id !== s.id))
    return "Không được đổi thứ tự đoạn lộ trình đã xử lý hoặc đang đến.";
  for (const [i, s] of proposed.entries()) {
    if (
      s.type === "dropoff" &&
      !proposed.slice(0, i).some((p) => p.bookingId === s.bookingId && p.type === "pickup")
    )
      return "Điểm đón phải nằm trước điểm trả của cùng hành khách.";
  }
  return "";
}
const distanceBetween = (a: CompanyStop, b: CompanyStop) =>
  validLocation(a.location) && validLocation(b.location) ? haversineKm(a.location, b.location) : 0;
export function estimate(stops: CompanyStop[]) {
  if (stops.some((s) => !validLocation(s.location))) return { km: 0, minutes: 0, incomplete: true };
  const km = stops.reduce((sum, s, i) => sum + (i ? distanceBetween(stops[i - 1], s) : 0), 0);
  return { km: Math.round(km * 10) / 10, minutes: Math.round((km / 50) * 60 + stops.length * 4) };
}
/** Simple precedence-constrained nearest-neighbour heuristic, not AI or road navigation. */
export function optimizeStops(stops: CompanyStop[]) {
  if (stops.some((s) => !validLocation(s.location)))
    return { stops, error: "Có điểm dừng chưa có tọa độ xác nhận. Hãy định vị trước khi tối ưu." };
  const lockedThrough = stops.reduce((last, s, i) => (s.status !== "pending" ? i : last), -1);
  const result = stops.slice(0, lockedThrough + 1);
  const rest = stops.slice(lockedThrough + 1);
  while (rest.length) {
    const eligible = rest.filter(
      (s) =>
        s.type === "pickup" ||
        result.some((p) => p.type === "pickup" && p.bookingId === s.bookingId),
    );
    if (!eligible.length)
      return { stops, error: "Thiếu điểm đón tương ứng, không thể tối ưu an toàn." };
    const current = result[result.length - 1] ?? rest[0];
    eligible.sort((a, b) => distanceBetween(current, a) - distanceBetween(current, b));
    const chosen = eligible[0];
    result.push(chosen);
    rest.splice(
      rest.findIndex((s) => s.id === chosen.id),
      1,
    );
  }
  const error = stopOrderError(result, stops);
  // Never replace an existing route with a longer proposal.
  return { stops: error || estimate(result).km > estimate(stops).km ? stops : result, error };
}
export function advanceStop(stops: CompanyStop[]) {
  const current = stops.find((s) => s.status !== "done");
  if (!current) return { stops, error: "" };
  if (
    current.type === "dropoff" &&
    !stops.some(
      (s) => s.bookingId === current.bookingId && s.type === "pickup" && s.status === "done",
    )
  )
    return { stops, error: "Không thể trả hành khách chưa được đón." };
  return {
    stops: stops.map((s): CompanyStop =>
      s.id === current.id ? { ...s, status: s.status === "pending" ? "arrived" : "done" } : s,
    ),
    error: "",
  };
}
