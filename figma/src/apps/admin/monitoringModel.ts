import { seedLocation, type GeoLocation } from "../../address/model.ts";
import { arrival } from "../company/tripsModel.ts";
import { sampleAdministrativeAddress, type AdministrativeAddress } from "../../address/model.ts";

export type UserRole = "passenger" | "driver" | "company";
export type AccountStatus = "ACTIVE" | "LOCKED";
export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  status: AccountStatus;
  registered: string;
  city: string;
  administrativeAddress?: AdministrativeAddress;
  company?: string;
  lastLogin: string;
  lockReason: string;
  lockedAt: string;
  lockedBy: string;
};
export type MonitorTripStatus = "scheduled" | "active" | "completed" | "cancelled";
export type MonitorTrip = {
  id: string;
  company: string;
  driver: string;
  vehicle: string;
  capacity: number;
  from: string;
  to: string;
  routeName: string;
  departure: string;
  arrive: string;
  status: MonitorTripStatus;
};
export type MonitorBookingStatus = "confirmed" | "completed" | "cancelled";
export type MonitorBooking = {
  pickupLocation?: GeoLocation;
  dropoffLocation?: GeoLocation;
  id: string;
  tripId: string;
  passenger: string;
  seats: number;
  status: MonitorBookingStatus;
  pickup: string;
  dropoff: string;
};
export type DateRange = { from: string; to: string };

export const roleLabels: Record<UserRole, string> = {
  passenger: "Hành khách",
  driver: "Tài xế",
  company: "Quản lý nhà xe",
};
export const tripStatusLabels: Record<MonitorTripStatus, string> = {
  scheduled: "Sắp khởi hành",
  active: "Đang chạy",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};
export const bookingStatusLabels: Record<MonitorBookingStatus, string> = {
  confirmed: "Đã xác nhận",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};
export const DATA_DATES = [
  "2025-07-12",
  "2025-07-13",
  "2025-07-14",
  "2025-07-15",
  "2025-07-16",
  "2025-07-17",
  "2025-07-18",
];
export const TODAY = "2025-07-18";
export const NOW = "2025-07-18T10:00";
export const FULL_RANGE: DateRange = { from: DATA_DATES[0], to: TODAY };

const companies = [
  {
    name: "Nhà xe Minh Tâm",
    vehicles: [
      ["43A-123.45", 16],
      ["43A-245.18", 9],
    ],
    drivers: ["Nguyễn Văn Hải", "Trần Quốc Bảo"],
    contact: "Nguyễn Minh Tâm",
    city: "Đà Nẵng",
  },
  {
    name: "Nhà xe Hải Vân",
    vehicles: [
      ["43C-331.22", 16],
      ["43C-410.07", 16],
    ],
    drivers: ["Lê Thanh Tùng", "Phạm Minh Đức"],
    contact: "Phạm Thanh Hải",
    city: "Đà Nẵng",
  },
  {
    name: "Nhà xe Hương Giang",
    vehicles: [
      ["75A-208.14", 16],
      ["75A-339.52", 9],
    ],
    drivers: ["Võ Hoàng Nam", "Đặng Quốc Khánh"],
    contact: "Nguyễn Thị Hương",
    city: "Huế",
  },
  {
    name: "Nhà xe Quảng Nam Xanh",
    vehicles: [
      ["92B-120.45", 16],
      ["92A-332.18", 9],
    ],
    drivers: ["Bùi Văn Lợi", "Huỳnh Minh Tuấn"],
    contact: "Trần Văn Nam",
    city: "Quảng Nam",
  },
] as const;
const routes = [
  { name: "Đà Nẵng – Huế", from: "Đà Nẵng", to: "Huế", min: 180 },
  { name: "Đà Nẵng – Hội An", from: "Đà Nẵng", to: "Hội An", min: 60 },
  { name: "Hội An – Quảng Nam", from: "Hội An", to: "Quảng Nam", min: 75 },
  { name: "Huế – Đà Nẵng", from: "Huế", to: "Đà Nẵng", min: 180 },
] as const;
const slots = ["06:00", "07:30", "09:00", "11:00", "13:00", "15:30", "17:30", "19:30"];
const passengerNames = [
  "Nguyễn Minh Anh",
  "Trần Thị Lan",
  "Lê Hoàng Nam",
  "Phạm Quốc Việt",
  "Võ Thị Hương",
  "Đặng Minh Tuấn",
  "Nguyễn Thị Thu",
  "Bùi Ngọc Ánh",
  "Hoàng Văn Long",
  "Phan Thị Mai",
  "Lý Thanh Hằng",
  "Đỗ Quang Huy",
  "Trương Thị Ngọc",
  "Ngô Đức Thịnh",
];
const locked: Record<string, string> = {
  "Đặng Minh Tuấn": "Nhiều lần hủy chuyến sát giờ khởi hành.",
  "Trương Thị Ngọc": "Thông tin liên hệ không chính xác, không thể xác minh.",
};

export const normalize = (s: string) =>
  s
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
const slug = (s: string) => normalize(s).trim().replace(/\s+/g, ".");
const dateAt = (i: number) => new Date(Date.UTC(2025, 4, 2 + i * 3)).toISOString().slice(0, 10);
const phoneAt = (i: number) =>
  `0${[905, 914, 935, 977, 988, 934][i % 6]} ${100 + ((i * 137) % 900)} ${100 + ((i * 251) % 900)}`;

function makeUsers(): AdminUser[] {
  const base = (
    i: number,
    name: string,
    role: UserRole,
    city: string,
    extra: Partial<AdminUser> = {},
  ): AdminUser => ({
    id: `U-${String(i + 1).padStart(4, "0")}`,
    name,
    email: `${slug(name)}@${role === "company" ? "nhaxe" : "email"}.vn`,
    phone: phoneAt(i),
    role,
    status: locked[name] ? "LOCKED" : "ACTIVE",
    registered: dateAt(i),
    city,
    administrativeAddress: sampleAdministrativeAddress(city),
    lastLogin: locked[name]
      ? "10/07/2025 · 21:14"
      : `1${7 - (i % 4)}/07/2025 · ${String(7 + (i % 12)).padStart(2, "0")}:${String((i * 17) % 60).padStart(2, "0")}`,
    lockReason: locked[name] ?? "",
    lockedAt: locked[name] ? "11/07/2025 · 09:30" : "",
    lockedBy: locked[name] ? "Lê Hoàng Anh · Quản trị viên" : "",
    ...extra,
  });
  const cities = ["Đà Nẵng", "Huế", "Hội An", "Quảng Nam"];
  const users: AdminUser[] = [];
  passengerNames.forEach((n, i) => users.push(base(users.length, n, "passenger", cities[i % 4])));
  companies.forEach((c) =>
    c.drivers.forEach((n) =>
      users.push(base(users.length, n, "driver", c.city, { company: c.name })),
    ),
  );
  companies.forEach((c) =>
    users.push(base(users.length, c.contact, "company", c.city, { company: c.name })),
  );
  return users;
}
export const adminUsers: AdminUser[] = makeUsers();

function makeTrips(): MonitorTrip[] {
  const trips: MonitorTrip[] = [];
  DATA_DATES.forEach((date, d) =>
    slots.forEach((slot, s) => {
      const idx = d * 8 + s;
      const company = companies[(s + d) % 4];
      const route = routes[(s * 3 + d) % 4];
      const [vehicle, capacity] = company.vehicles[(s + d) % 2];
      const departure = `${date}T${slot}`;
      const arrive = arrival(departure, route.min);
      let status: MonitorTripStatus =
        arrive <= NOW ? "completed" : departure <= NOW ? "active" : "scheduled";
      if ((idx * 7 + 3) % 13 === 0 && status !== "active") status = "cancelled";
      trips.push({
        id: `CH-${3001 + idx}`,
        company: company.name,
        driver: company.drivers[(d + (s >> 1)) % 2],
        vehicle,
        capacity,
        from: route.from,
        to: route.to,
        routeName: route.name,
        departure,
        arrive,
        status,
      });
    }),
  );
  return trips;
}
export const adminTrips: MonitorTrip[] = makeTrips();

function makeBookings(trips: MonitorTrip[]): MonitorBooking[] {
  const list: MonitorBooking[] = [];
  trips.forEach((t, idx) => {
    let remaining = t.capacity;
    const count = 2 + ((idx * 5) % 3);
    for (let j = 0; j < count; j++) {
      let status: MonitorBookingStatus =
        t.status === "cancelled"
          ? "cancelled"
          : t.status === "completed"
            ? (idx + j) % 7 === 0
              ? "cancelled"
              : "completed"
            : t.status === "active"
              ? "confirmed"
              : (idx + j) % 6 === 0
                ? "cancelled"
                : "confirmed";
      let seats = 1 + ((idx + j) % 3);
      if (status !== "cancelled") {
        seats = Math.min(seats, remaining);
        if (seats < 1) continue;
        remaining -= seats;
      }
      list.push({
        id: `RSH-${5001 + list.length}`,
        tripId: t.id,
        passenger: passengerNames[(idx * 3 + j * 5) % passengerNames.length],
        seats,
        status,
        pickup: `${(j + idx) % 2 ? "Ngã tư trung tâm" : "Bến xe Trung tâm"} ${t.from}`,
        dropoff: `${(idx + j) % 3 ? "Bến xe Trung tâm" : "Ngã tư trung tâm"} ${t.to}`,
      });
    }
  });
  return list;
}
export const adminBookings: MonitorBooking[] = makeBookings(adminTrips).map((b) => {
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

export const tripDate = (t: MonitorTrip) => t.departure.slice(0, 10);
export const bookedSeatsOf = (tripId: string, bookings: MonitorBooking[]) =>
  bookings
    .filter((b) => b.tripId === tripId && b.status !== "cancelled")
    .reduce((n, b) => n + b.seats, 0);

export function filterUsers(users: AdminUser[], query: string, role = "all", status = "all") {
  const q = normalize(query.trim());
  return users
    .filter((u) => (role === "all" || u.role === role) && (status === "all" || u.status === status))
    .filter((u) => normalize(`${u.name} ${u.email} ${u.phone} ${u.id}`).includes(q))
    .sort((a, b) => b.registered.localeCompare(a.registered) || a.name.localeCompare(b.name, "vi"));
}
export function filterTrips(
  trips: MonitorTrip[],
  query: string,
  status = "all",
  company = "all",
  day = "all",
) {
  const q = normalize(query.trim());
  return trips
    .filter(
      (t) =>
        (status === "all" || t.status === status) &&
        (company === "all" || t.company === company) &&
        (day === "all" || tripDate(t) === day),
    )
    .filter((t) =>
      normalize(`${t.id} ${t.driver} ${t.vehicle} ${t.routeName} ${t.company}`).includes(q),
    )
    .sort((a, b) => b.departure.localeCompare(a.departure) || a.id.localeCompare(b.id));
}
export function filterBookings(
  bookings: MonitorBooking[],
  trips: MonitorTrip[],
  query: string,
  status = "all",
  tripId = "",
) {
  const q = normalize(query.trim());
  return bookings
    .filter((b) => (status === "all" || b.status === status) && (!tripId || b.tripId === tripId))
    .filter((b) => {
      const t = trips.find((x) => x.id === b.tripId);
      return normalize(`${b.id} ${b.passenger} ${b.tripId} ${t?.routeName ?? ""}`).includes(q);
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

export function activeTripsOf(user: AdminUser, trips: MonitorTrip[]) {
  if (user.role === "driver")
    return trips.filter((t) => t.driver === user.name && t.status === "active");
  if (user.role === "company")
    return trips.filter((t) => t.company === user.company && t.status === "active");
  return [];
}
/** Khóa hoặc mở khóa tài khoản. Luôn cần xác nhận; không thay đổi dữ liệu gốc. */
export function setUserLock(
  user: AdminUser,
  lock: boolean,
  confirmed: boolean,
  time: string,
  reason = "",
): { user: AdminUser; error: string } {
  if (!confirmed) return { user, error: "Cần xác nhận trước khi thay đổi trạng thái tài khoản." };
  if (lock && user.status === "LOCKED") return { user, error: "Tài khoản này đã bị khóa." };
  if (!lock && user.status === "ACTIVE") return { user, error: "Tài khoản này đang hoạt động." };
  if (reason.length > 300) return { user, error: "Lý do không được vượt quá 300 ký tự." };
  return {
    user: lock
      ? {
          ...user,
          status: "LOCKED",
          lockReason: reason.trim(),
          lockedAt: time,
          lockedBy: "Lê Hoàng Anh · Quản trị viên",
        }
      : { ...user, status: "ACTIVE", lockReason: "", lockedAt: "", lockedBy: "" },
    error: "",
  };
}

export function validateRange(from: string, to: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(to) ||
    !Number.isFinite(Date.parse(from)) ||
    !Number.isFinite(Date.parse(to))
  )
    return "Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.";
  if (from > to) return "Ngày bắt đầu không được sau ngày kết thúc.";
  return "";
}
export type Summary = ReturnType<typeof summarize>;
export function summarize(trips: MonitorTrip[], bookings: MonitorBooking[], range: DateRange) {
  const inRange = trips.filter((t) => tripDate(t) >= range.from && tripDate(t) <= range.to);
  const ids = new Set(inRange.map((t) => t.id));
  const inBookings = bookings.filter((b) => ids.has(b.tripId));
  const count = (s: MonitorTripStatus) => inRange.filter((t) => t.status === s).length;
  const seats = (b: MonitorBooking[]) =>
    b.filter((x) => x.status !== "cancelled").reduce((n, x) => n + x.seats, 0);
  const companyRows = [...new Set(trips.map((t) => t.company))].map((name) => {
    const ts = inRange.filter((t) => t.company === name);
    const tid = new Set(ts.map((t) => t.id));
    const bs = inBookings.filter((b) => tid.has(b.tripId));
    return {
      name,
      trips: ts.length,
      completed: ts.filter((t) => t.status === "completed").length,
      cancelled: ts.filter((t) => t.status === "cancelled").length,
      bookings: bs.length,
      seats: seats(bs),
    };
  });
  const routeRows = [...new Set(trips.map((t) => t.routeName))]
    .map((name) => {
      const ts = inRange.filter((t) => t.routeName === name);
      const tid = new Set(ts.map((t) => t.id));
      const bs = inBookings.filter((b) => tid.has(b.tripId));
      return { name, trips: ts.length, bookings: bs.length, seats: seats(bs) };
    })
    .sort((a, b) => b.bookings - a.bookings || a.name.localeCompare(b.name, "vi"));
  const days = DATA_DATES.filter((d) => d >= range.from && d <= range.to).map((d) => {
    const ts = inRange.filter((t) => tripDate(t) === d);
    return {
      date: d,
      total: ts.length,
      completed: ts.filter((t) => t.status === "completed").length,
      cancelled: ts.filter((t) => t.status === "cancelled").length,
    };
  });
  return {
    totalTrips: inRange.length,
    active: count("active"),
    completed: count("completed"),
    cancelled: count("cancelled"),
    scheduled: count("scheduled"),
    bookings: {
      total: inBookings.length,
      confirmed: inBookings.filter((b) => b.status === "confirmed").length,
      completed: inBookings.filter((b) => b.status === "completed").length,
      cancelled: inBookings.filter((b) => b.status === "cancelled").length,
      seats: seats(inBookings),
    },
    companies: companyRows,
    routes: routeRows,
    days,
  };
}

const bucketHours = [6, 9, 12, 15, 18];
function dashboard(range: DateRange, byDay: boolean) {
  const s = summarize(adminTrips, adminBookings, range);
  const ids = new Map(adminTrips.map((t) => [t.id, t]));
  const inRange = adminBookings.filter((b) => {
    const t = ids.get(b.tripId)!;
    return tripDate(t) >= range.from && tripDate(t) <= range.to;
  });
  const series = byDay
    ? DATA_DATES.map((d) => inRange.filter((b) => tripDate(ids.get(b.tripId)!) === d).length)
    : bucketHours.map(
        (h) =>
          inRange.filter((b) => {
            const hr = Number(ids.get(b.tripId)!.departure.slice(11, 13));
            return hr >= h && hr < h + 3;
          }).length,
      );
  const labels = byDay
    ? DATA_DATES.map((d) => `${d.slice(8)}/${d.slice(5, 7)}`)
    : bucketHours.map((h) => `${String(h).padStart(2, "0")}:00`);
  const { totalTrips, active, completed, cancelled, scheduled } = s;
  return {
    totalTrips,
    active,
    completed,
    cancelled,
    scheduled,
    bookings: {
      total: s.bookings.total,
      confirmed: s.bookings.confirmed,
      completed: s.bookings.completed,
      cancelled: s.bookings.cancelled,
    },
    series,
    labels,
  };
}
export const dashboardStats = {
  week: dashboard(FULL_RANGE, true),
  today: dashboard({ from: TODAY, to: TODAY }, false),
};
