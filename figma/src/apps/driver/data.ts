import { seedLocation, type GeoLocation } from "../../address/model.ts";
import { NOW } from "../passenger/data";

export type DTripStatus =
  | "pending"
  | "confirmed"
  | "ongoing"
  | "completed"
  | "cancelled"
  | "rejected";
export type DTrip = {
  id: string;
  code: string;
  from: string;
  to: string;
  date: string;
  depart: string;
  arrive: string;
  pax: number;
  seatsTotal: number;
  vehicle: string;
  plate: string;
  status: DTripStatus;
  pickups: string[];
  dropoffs: string[];
  note?: string;
};

export const driver = {
  name: "Nguyễn Văn Hải",
  short: "Hải",
  phone: "0905 111 222",
  rating: 4.9,
  trips: 312,
  company: "Nhà xe Thành Công",
  vehicle: "Hyundai Solati 16 chỗ",
  plate: "43B-678.90",
};

export const statusMeta: Record<DTripStatus, { label: string }> = {
  pending: { label: "Chờ xác nhận" },
  confirmed: { label: "Đã xác nhận" },
  ongoing: { label: "Đang chạy" },
  completed: { label: "Hoàn thành" },
  cancelled: { label: "Đã hủy" },
  rejected: { label: "Đã từ chối" },
};

const v = { vehicle: driver.vehicle, plate: driver.plate, seatsTotal: 16 };
export const trips: DTrip[] = [
  {
    id: "t1",
    code: "CH-2041",
    from: "Đà Nẵng",
    to: "Huế",
    date: "2025-07-18",
    depart: "07:30",
    arrive: "10:30",
    pax: 12,
    status: "confirmed",
    pickups: ["Bến xe Trung tâm Đà Nẵng · 9 khách", "254 Nguyễn Văn Linh · 3 khách"],
    dropoffs: ["Lăng Cô · 2 khách", "Bến xe phía Nam Huế · 10 khách"],
    ...v,
  },
  {
    id: "t2",
    code: "CH-2042",
    from: "Huế",
    to: "Đà Nẵng",
    date: "2025-07-18",
    depart: "13:00",
    arrive: "16:00",
    pax: 9,
    status: "confirmed",
    pickups: ["Bến xe phía Nam Huế · 9 khách"],
    dropoffs: ["Bến xe Trung tâm Đà Nẵng · 9 khách"],
    ...v,
  },
  {
    id: "t3",
    code: "CH-2043",
    from: "Đà Nẵng",
    to: "Hội An",
    date: "2025-07-18",
    depart: "17:30",
    arrive: "18:30",
    pax: 6,
    status: "pending",
    pickups: ["Ngã tư trung tâm Đà Nẵng · 6 khách"],
    dropoffs: ["Bến xe Trung tâm Hội An · 6 khách"],
    note: "Chờ nhà xe xác nhận tài xế",
    ...v,
  },
  {
    id: "t4",
    code: "CH-2044",
    from: "Đà Nẵng",
    to: "Huế",
    date: "2025-07-19",
    depart: "06:00",
    arrive: "09:00",
    pax: 14,
    status: "confirmed",
    pickups: ["Bến xe Trung tâm Đà Nẵng · 14 khách"],
    dropoffs: ["Bến xe phía Nam Huế · 14 khách"],
    ...v,
  },
  {
    id: "t5",
    code: "CH-2045",
    from: "Hội An",
    to: "Quảng Nam",
    date: "2025-07-20",
    depart: "09:30",
    arrive: "10:15",
    pax: 4,
    status: "pending",
    pickups: ["Bến xe Trung tâm Hội An · 4 khách"],
    dropoffs: ["Bến xe Trung tâm Quảng Nam · 4 khách"],
    ...v,
  },
  {
    id: "t6",
    code: "CH-2038",
    from: "Huế",
    to: "Đà Nẵng",
    date: "2025-07-17",
    depart: "15:00",
    arrive: "18:00",
    pax: 11,
    status: "completed",
    pickups: ["Bến xe phía Nam Huế · 11 khách"],
    dropoffs: ["Bến xe Trung tâm Đà Nẵng · 11 khách"],
    ...v,
  },
  {
    id: "t7",
    code: "CH-2036",
    from: "Đà Nẵng",
    to: "Hội An",
    date: "2025-07-17",
    depart: "08:00",
    arrive: "09:00",
    pax: 0,
    status: "cancelled",
    pickups: [],
    dropoffs: [],
    note: "Nhà xe hủy do không đủ khách",
    ...v,
  },
];

export const isToday = (t: DTrip) => t.date === "2025-07-18";
export const isUpcoming = (t: DTrip) =>
  t.date > "2025-07-18" && (t.status === "confirmed" || t.status === "pending");
export const minutesUntil = (t: DTrip) =>
  Math.round((new Date(`${t.date}T${t.depart}`).getTime() - NOW.getTime()) / 60000);
export const fmtUntil = (m: number) =>
  m < 60 ? `${m} phút` : `${Math.floor(m / 60)} giờ ${m % 60 ? `${m % 60} phút` : ""}`.trim();
export const dayLabel = (d: string) =>
  d === "2025-07-18"
    ? "Hôm nay"
    : d === "2025-07-19"
      ? "Ngày mai"
      : d === "2025-07-17"
        ? "Hôm qua"
        : d.split("-").reverse().slice(0, 2).join("/");

/* ---- Điểm dừng & quy tắc thực hiện chuyến (DR-04+) ---- */
export type StopStatus = "pending" | "arrived" | "done";
export type DStop = {
  location?: GeoLocation;
  id: string;
  type: "pickup" | "dropoff";
  pid: string;
  name: string;
  seats: number;
  phone: string;
  address: string;
  time: string;
  status: StopStatus;
  note?: string;
};
export type StopAction = "ARRIVED" | "PICKED_UP" | "DROPPED_OFF";

const addMin = (t: string, m: number) => {
  const x = Number(t.slice(0, 2)) * 60 + Number(t.slice(3)) + m;
  return `${String(Math.floor(x / 60) % 24).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};
const mk = (
  id: string,
  type: DStop["type"],
  pid: string,
  name: string,
  seats: number,
  phone: string,
  address: string,
  time: string,
  note?: string,
): DStop => {
  const point = seedLocation(address);
  const location = point ? { ...point, instructions: note ?? point.instructions } : undefined;
  return {
    id,
    type,
    pid,
    name,
    seats,
    phone,
    address: location?.address ?? address,
    location,
    time,
    status: "pending",
    note,
  };
};

const T1 = {
  p1: ["Nguyễn Minh Anh", 2, "0905 123 456"],
  p2: ["Trần Thị Lan", 3, "0914 220 118"],
  p3: ["Lê Hoàng Nam", 1, "0935 884 120"],
  p4: ["Phạm Quốc Việt", 4, "0988 301 775"],
  p5: ["Võ Thị Hương", 2, "0977 456 002"],
} as const;
const q = (k: keyof typeof T1) => [T1[k][0], T1[k][1], T1[k][2]] as [string, number, string];
const BX = "Bến xe Trung tâm Đà Nẵng",
  NVL = "254 Nguyễn Văn Linh, Đà Nẵng",
  LC = "Lăng Cô, Phú Lộc",
  HUE = "Bến xe phía Nam Huế";

export function genStops(t: DTrip): DStop[] {
  if (t.pax === 0) return [];
  if (t.id === "t1") {
    return [
      mk("s1", "pickup", "p1", ...q("p1"), BX, "07:30"),
      mk("s2", "pickup", "p2", ...q("p2"), BX, "07:30"),
      mk("s3", "pickup", "p4", ...q("p4"), BX, "07:30"),
      mk("s4", "pickup", "p3", ...q("p3"), NVL, "07:50", "Đứng trước cổng chung cư"),
      mk("s5", "pickup", "p5", ...q("p5"), NVL, "07:50"),
      mk("s6", "dropoff", "p2", ...q("p2"), LC, "09:10"),
      mk("s7", "dropoff", "p5", ...q("p5"), LC, "09:10"),
      mk("s8", "dropoff", "p1", ...q("p1"), HUE, "10:30"),
      mk("s9", "dropoff", "p3", ...q("p3"), HUE, "10:30"),
      mk("s10", "dropoff", "p4", ...q("p4"), HUE, "10:30"),
    ];
  }
  const names = ["Trần Thị Lan", "Lê Hoàng Nam", "Phạm Quốc Việt", "Võ Thị Hương"];
  const k = Math.min(4, Math.max(1, Math.ceil(t.pax / 3)));
  const seats = Array.from(
    { length: k },
    (_, i) => Math.floor(t.pax / k) + (i < t.pax % k ? 1 : 0),
  );
  const A = `Bến xe Trung tâm ${t.from}`,
    B = `Ngã tư trung tâm ${t.from}`,
    D1 = `Bến xe Trung tâm ${t.to}`,
    D2 = `Ngã tư trung tâm ${t.to}`;
  const pk = names.slice(0, k).map((n, i) => ({
    n,
    s: seats[i],
    ph: `0905 12${i} 45${i}`,
    pid: `p${i + 1}`,
    from: i < Math.ceil(k / 2) ? A : B,
    to: i === k - 1 && k > 1 ? D2 : D1,
  }));
  return [
    ...pk.map((p, i) =>
      mk(
        `s${i + 1}`,
        "pickup",
        p.pid,
        p.n,
        p.s,
        p.ph,
        p.from,
        p.from === A ? t.depart : addMin(t.depart, 15),
      ),
    ),
    ...[...pk]
      .sort((a, b) => a.to.localeCompare(b.to))
      .map((p, i) =>
        mk(
          `s${k + i + 1}`,
          "dropoff",
          p.pid,
          p.n,
          p.s,
          p.ph,
          p.to,
          p.to === D1 ? t.arrive : addMin(t.arrive, -10),
        ),
      ),
  ];
}

export type Group = {
  location?: GeoLocation;
  key: string;
  n: number;
  address: string;
  label: "Đón" | "Trả" | "Đón & trả";
  seats: number;
  time: string;
  stopIds: string[];
};
export function groupStops(stops: DStop[]): Group[] {
  const g: Group[] = [];
  for (const s of stops) {
    let x = g.find((y) => y.address === s.address);
    if (!x) {
      x = {
        location: s.location,
        key: s.address,
        n: g.length + 1,
        address: s.address,
        label: s.type === "pickup" ? "Đón" : "Trả",
        seats: 0,
        time: s.time,
        stopIds: [],
      };
      g.push(x);
    } else if (
      (x.label === "Đón" && s.type === "dropoff") ||
      (x.label === "Trả" && s.type === "pickup")
    )
      x.label = "Đón & trả";
    x.seats += s.seats;
    x.stopIds.push(s.id);
  }
  return g;
}

const kmTable: Record<string, number> = {
  "Đà Nẵng|Huế": 105,
  "Huế|Đà Nẵng": 105,
  "Đà Nẵng|Hội An": 30,
  "Hội An|Đà Nẵng": 30,
  "Hội An|Quảng Nam": 28,
  "Quảng Nam|Hội An": 28,
};
export const tripKm = (t: DTrip) => kmTable[`${t.from}|${t.to}`] ?? 60;
export const tripMinutes = (t: DTrip) =>
  Number(t.arrive.slice(0, 2)) * 60 +
  Number(t.arrive.slice(3)) -
  Number(t.depart.slice(0, 2)) * 60 -
  Number(t.depart.slice(3));
export const fmtMin = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)} giờ${m % 60 ? ` ${m % 60} phút` : ""}` : `${m} phút`;

/** Quy tắc cốt lõi: đón trước trả; không trả khách chưa đón; phải "đã đến" trước khi đón/trả. */
export function stopRule(
  stops: DStop[],
  s: DStop,
): { next: StopAction | null; blocked: string | null } {
  if (s.status === "done") return { next: null, blocked: null };
  if (s.type === "dropoff") {
    const pick = stops.find((x) => x.type === "pickup" && x.pid === s.pid);
    if (pick && pick.status !== "done")
      return { next: null, blocked: `Chưa thể trả khách: ${s.name} chưa được đón.` };
  }
  return s.status === "pending"
    ? { next: "ARRIVED", blocked: null }
    : { next: s.type === "pickup" ? "PICKED_UP" : "DROPPED_OFF", blocked: null };
}
export const remaining = (stops: DStop[]) => stops.filter((s) => s.status !== "done").length;
export const currentStop = (stops: DStop[]) => stops.find((s) => s.status !== "done");
