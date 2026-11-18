import { seedLocation, type GeoLocation } from "../../address/model.ts";
export type TripStatus = "open" | "cancelled" | "completed";
export type Trip = {
  id: string;
  company: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  durationMin: number;
  vehicle: string;
  plate: string;
  seatsTotal: number;
  seatsLeft: number;
  price: number;
  status: TripStatus;
  rating: number;
  reviews: number;
  amenities: string[];
};

export const companies = ["Nhà xe Minh Tâm", "Nhà xe Thành Công", "Nhà xe Hải Vân"];

const routeInfo: Record<string, { price: number; min: number }> = {
  "Đà Nẵng|Huế": { price: 120000, min: 180 },
  "Huế|Đà Nẵng": { price: 120000, min: 180 },
  "Đà Nẵng|Hội An": { price: 60000, min: 60 },
  "Hội An|Đà Nẵng": { price: 60000, min: 60 },
  "Hội An|Quảng Nam": { price: 45000, min: 45 },
  "Quảng Nam|Hội An": { price: 45000, min: 45 },
};

const templates = [
  {
    company: "Nhà xe Minh Tâm",
    depart: "06:00",
    vehicle: "Ford Transit 16 chỗ",
    plate: "43A-123.45",
    total: 16,
    left: 9,
    mult: 1,
    rating: 4.8,
    reviews: 412,
    status: "open",
  },
  {
    company: "Nhà xe Thành Công",
    depart: "07:30",
    vehicle: "Hyundai Solati 16 chỗ",
    plate: "43B-678.90",
    total: 16,
    left: 4,
    mult: 1,
    rating: 4.6,
    reviews: 287,
    status: "open",
  },
  {
    company: "Nhà xe Minh Tâm",
    depart: "09:00",
    vehicle: "Limousine 9 chỗ",
    plate: "43A-245.18",
    total: 9,
    left: 0,
    mult: 1.25,
    rating: 4.9,
    reviews: 156,
    status: "open",
  },
  {
    company: "Nhà xe Hải Vân",
    depart: "11:30",
    vehicle: "Mercedes Sprinter 16 chỗ",
    plate: "43C-331.22",
    total: 16,
    left: 6,
    mult: 1.1,
    rating: 4.7,
    reviews: 198,
    status: "open",
  },
  {
    company: "Nhà xe Thành Công",
    depart: "13:00",
    vehicle: "Ford Transit 16 chỗ",
    plate: "43B-402.76",
    total: 16,
    left: 5,
    mult: 1,
    rating: 4.6,
    reviews: 287,
    status: "completed",
  },
  {
    company: "Nhà xe Minh Tâm",
    depart: "15:30",
    vehicle: "Limousine 9 chỗ",
    plate: "43A-245.18",
    total: 9,
    left: 3,
    mult: 1.25,
    rating: 4.9,
    reviews: 156,
    status: "open",
  },
  {
    company: "Nhà xe Thành Công",
    depart: "17:00",
    vehicle: "Hyundai Solati 16 chỗ",
    plate: "43B-678.90",
    total: 16,
    left: 8,
    mult: 1,
    rating: 4.6,
    reviews: 287,
    status: "cancelled",
  },
  {
    company: "Nhà xe Hải Vân",
    depart: "19:00",
    vehicle: "Mercedes Sprinter 16 chỗ",
    plate: "43C-331.22",
    total: 16,
    left: 11,
    mult: 1.1,
    rating: 4.5,
    reviews: 198,
    status: "open",
  },
] as const;

const addMin = (t: string, m: number) => {
  const [h, mi] = t.split(":").map(Number);
  const x = h * 60 + mi + m;
  return `${String(Math.floor(x / 60) % 24).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};

export function buildTrips(from: string, to: string): Trip[] {
  if (from === to) return [];
  const r = routeInfo[`${from}|${to}`] ?? { price: 80000, min: 120 };
  return templates.map((t, i) => ({
    id: String(i),
    company: t.company,
    from,
    to,
    depart: t.depart,
    arrive: addMin(t.depart, r.min),
    durationMin: r.min,
    vehicle: t.vehicle,
    plate: t.plate,
    seatsTotal: t.total,
    seatsLeft: t.left,
    price: Math.round((r.price * t.mult) / 5000) * 5000,
    status: t.status,
    rating: t.rating,
    reviews: t.reviews,
    amenities:
      t.total === 9
        ? ["Điều hòa", "Wifi", "Nước uống", "Sạc USB"]
        : ["Điều hòa", "Nước uống", "Sạc USB"],
  }));
}

export const fmtDuration = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ""}` : `${m} phút`;

/** Returns a Vietnamese reason if the trip cannot be booked for `pax` passengers, otherwise null. */
export function bookBlock(t: Trip, pax = 1): string | null {
  if (t.status === "cancelled") return "Chuyến đã bị hủy";
  if (t.status === "completed") return "Chuyến đã hoàn thành";
  if (t.seatsLeft === 0) return "Đã hết chỗ";
  if (pax > t.seatsLeft) return `Chỉ còn ${t.seatsLeft} chỗ, không đủ cho ${pax} khách`;
  return null;
}

export const pickupPoints = (city: string) => [
  `Bến xe Trung tâm ${city}`,
  `Ngã tư trung tâm ${city}`,
];

export function assignSeats(t: Trip, n: number): string[] {
  const ids = Array.from(
    { length: t.seatsTotal },
    (_, i) => `${"ABCD"[Math.floor(i / 4)]}${(i % 4) + 1}`,
  );
  const taken = t.seatsTotal - t.seatsLeft;
  return ids.slice(taken, taken + n);
}

export const stopsFor = (t: Trip) => {
  const mid =
    t.from === "Đà Nẵng" && t.to === "Huế"
      ? "Lăng Cô"
      : t.from === "Huế" && t.to === "Đà Nẵng"
        ? "Lăng Cô"
        : null;
  return [
    {
      name: pickupPoints(t.from)[0],
      time: t.depart,
      type: "pickup" as const,
      status: "upcoming" as const,
      note: "Điểm đón chính",
    },
    ...(mid
      ? [
          {
            name: mid,
            time: addMin(t.depart, Math.round(t.durationMin * 0.6)),
            type: "stop" as const,
            status: "upcoming" as const,
          },
        ]
      : []),
    {
      name: pickupPoints(t.to)[0],
      time: t.arrive,
      type: "dropoff" as const,
      status: "upcoming" as const,
      note: "Điểm trả chính",
    },
  ];
};

export type Filters = {
  time: "all" | "morning" | "afternoon" | "evening";
  min: number;
  max: number;
  minSeats: number;
  companies: string[];
  sort: "time" | "price" | "rating";
};
export const defaultFilters: Filters = {
  time: "all",
  min: 0,
  max: 300000,
  minSeats: 1,
  companies: [],
  sort: "time",
};

export function activeFilterCount(f: Filters) {
  return (
    (f.time !== "all" ? 1 : 0) +
    (f.min > 0 || f.max < 300000 ? 1 : 0) +
    (f.minSeats > 1 ? 1 : 0) +
    (f.companies.length ? 1 : 0)
  );
}

export function applyFilters(trips: Trip[], f: Filters): Trip[] {
  const hour = (t: Trip) => Number(t.depart.slice(0, 2));
  return trips
    .filter(
      (t) =>
        f.time === "all" ||
        (f.time === "morning"
          ? hour(t) >= 5 && hour(t) < 12
          : f.time === "afternoon"
            ? hour(t) >= 12 && hour(t) < 18
            : hour(t) >= 18),
    )
    .filter((t) => t.price >= f.min && t.price <= f.max)
    .filter((t) => t.seatsLeft >= f.minSeats)
    .filter((t) => !f.companies.length || f.companies.includes(t.company))
    .sort((a, b) =>
      f.sort === "price"
        ? a.price - b.price
        : f.sort === "rating"
          ? b.rating - a.rating
          : a.depart.localeCompare(b.depart),
    );
}

export const fmtDate = (d: string) =>
  new Date(d + "T00:00").toLocaleDateString("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
export const fmtDateShort = (d: string) =>
  new Date(d + "T00:00").toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });

/* ---- Bookings (PA-11+) ---- */
export const NOW = new Date("2025-07-18T06:40:00"); // thời điểm demo cố định
export type BookingStatus = "upcoming" | "completed" | "cancelled";
export type MyBooking = {
  pickupLocation?: GeoLocation;
  dropoffLocation?: GeoLocation;
  tripKey?: string;
  id: string;
  from: string;
  to: string;
  date: string;
  depart: string;
  arrive: string;
  company: string;
  vehicle: string;
  plate: string;
  seats: string[];
  total: number;
  pickup: string;
  dropoff: string;
  name: string;
  phone: string;
  driver: { name: string; phone: string; rating: number };
  status: BookingStatus;
  rated: boolean;
};
export const minutesUntil = (b: MyBooking, now = NOW) =>
  (new Date(`${b.date}T${b.depart}`).getTime() - now.getTime()) / 60000;
/** Có thể hủy khi còn hơn 120 phút trước giờ khởi hành. */
export const canCancel = (b: MyBooking, now = NOW) =>
  b.status === "upcoming" && minutesUntil(b, now) > 120;
/** Theo dõi thời gian thực trong vòng 120 phút trước giờ đi. */
export const canTrack = (b: MyBooking, now = NOW) =>
  b.status === "upcoming" && minutesUntil(b, now) <= 120;

export const drivers = [
  { name: "Nguyễn Văn Hải", phone: "0905 111 222", rating: 4.9 },
  { name: "Trần Quốc Bảo", phone: "0914 333 444", rating: 4.8 },
  { name: "Lê Thanh Tùng", phone: "0935 555 666", rating: 4.7 },
];

const bookingFixtures: MyBooking[] = [
  {
    id: "RSH-250718-0317",
    from: "Đà Nẵng",
    to: "Huế",
    date: "2025-07-18",
    depart: "07:30",
    arrive: "10:30",
    company: "Nhà xe Thành Công",
    vehicle: "Hyundai Solati 16 chỗ",
    plate: "43B-678.90",
    seats: ["A1", "A2"],
    total: 240000,
    pickup: "Bến xe Trung tâm Đà Nẵng",
    dropoff: "Bến xe Trung tâm Huế",
    name: "Nguyễn Minh Anh",
    phone: "0905 123 456",
    driver: drivers[0],
    status: "upcoming",
    rated: false,
  },
  {
    id: "RSH-250722-0452",
    from: "Hội An",
    to: "Quảng Nam",
    date: "2025-07-22",
    depart: "09:30",
    arrive: "10:15",
    company: "Nhà xe Minh Tâm",
    vehicle: "Limousine 9 chỗ",
    plate: "43A-245.18",
    seats: ["B2"],
    total: 56250,
    pickup: "Ngã tư trung tâm Hội An",
    dropoff: "Bến xe Trung tâm Quảng Nam",
    name: "Nguyễn Minh Anh",
    phone: "0905 123 456",
    driver: drivers[1],
    status: "upcoming",
    rated: false,
  },
  {
    id: "RSH-250702-0188",
    from: "Hội An",
    to: "Đà Nẵng",
    date: "2025-07-02",
    depart: "16:00",
    arrive: "17:00",
    company: "Nhà xe Thành Công",
    vehicle: "Ford Transit 16 chỗ",
    plate: "43B-402.76",
    seats: ["C3"],
    total: 60000,
    pickup: "Bến xe Trung tâm Hội An",
    dropoff: "Bến xe Trung tâm Đà Nẵng",
    name: "Nguyễn Minh Anh",
    phone: "0905 123 456",
    driver: drivers[2],
    status: "completed",
    rated: false,
  },
  {
    id: "RSH-250620-0094",
    from: "Đà Nẵng",
    to: "Huế",
    date: "2025-06-20",
    depart: "06:00",
    arrive: "09:00",
    company: "Nhà xe Minh Tâm",
    vehicle: "Ford Transit 16 chỗ",
    plate: "43A-123.45",
    seats: ["A3", "A4"],
    total: 240000,
    pickup: "Bến xe Trung tâm Đà Nẵng",
    dropoff: "Ngã tư trung tâm Huế",
    name: "Nguyễn Minh Anh",
    phone: "0905 123 456",
    driver: drivers[0],
    status: "completed",
    rated: true,
  },
  {
    id: "RSH-250710-0061",
    from: "Huế",
    to: "Đà Nẵng",
    date: "2025-07-10",
    depart: "13:00",
    arrive: "16:00",
    company: "Nhà xe Hải Vân",
    vehicle: "Mercedes Sprinter 16 chỗ",
    plate: "43C-331.22",
    seats: ["D1"],
    total: 132000,
    pickup: "Bến xe Trung tâm Huế",
    dropoff: "Bến xe Trung tâm Đà Nẵng",
    name: "Nguyễn Minh Anh",
    phone: "0905 123 456",
    driver: drivers[1],
    status: "cancelled",
    rated: false,
  },
];

export const seedBookings: MyBooking[] = bookingFixtures.map((b) => {
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
