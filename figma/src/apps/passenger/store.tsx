import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  buildTrips,
  defaultFilters,
  seedBookings,
  NOW,
  type Filters,
  type MyBooking,
  type Trip,
} from "./data";
import { reservationKey } from "./validation";
import {
  sampleAdministrativeAddress,
  areaLocation,
  seedLocation,
  type AdministrativeAddress,
  type GeoLocation,
} from "../../address/model";

export type ScreenId =
  | "splash"
  | "login"
  | "register"
  | "home"
  | "results"
  | "filters"
  | "details"
  | "booking"
  | "confirm"
  | "success"
  | "bookings"
  | "bookingDetail"
  | "tracking"
  | "notifications"
  | "rating"
  | "profile";

export type Booking = {
  pickupLocation?: GeoLocation | null;
  dropoffLocation?: GeoLocation | null;
  seats: number;
  pickup: string;
  pickupCustom: string;
  dropoff: string;
  dropoffCustom: string;
  name: string;
  phone: string;
  email: string;
};
export type Notif = {
  id: string;
  kind: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
  time: string;
  unread: boolean;
  bookingId: string;
  target: "bookingDetail" | "tracking" | "rating";
};
export type Profile = {
  name: string;
  email: string;
  phone: string;
  city: string;
  administrativeAddress: AdministrativeAddress;
};

type Ctx = {
  demo: boolean;
  search: {
    from: string;
    to: string;
    date: string;
    pax: number;
    fromLocation?: GeoLocation | null;
    toLocation?: GeoLocation | null;
  };
  setSearch: (s: Partial<Ctx["search"]>) => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  tripId: string;
  setTripId: (id: string) => void;
  trip: Trip | undefined;
  availableTrips: Trip[];
  clock: Date;
  advanceToDeparture: () => void;
  booking: Booking;
  setBooking: (b: Partial<Booking>) => void;
  ref: string;
  setRef: (r: string) => void;
  bookings: MyBooking[];
  addBooking: (b: MyBooking) => string | null;
  cancelBooking: (id: string) => void;
  rateBooking: (id: string) => string | null;
  completeBooking: (id: string) => void;
  selectedId: string;
  setSelectedId: (id: string) => void;
  selected: MyBooking | undefined;
  notifs: Notif[];
  markRead: (id: string) => void;
  markAllRead: () => void;
  unread: number;
  profile: Profile;
  setProfile: (p: Profile) => void;
  preferences: { push: boolean; reminders: boolean };
  setPreferences: (p: Partial<{ push: boolean; reminders: boolean }>) => void;
};

const C = createContext<Ctx>(null as never);
export const useStore = () => useContext(C);

const seedNotifs: Notif[] = [
  {
    id: "n1",
    kind: "info",
    title: "Tài xế sắp đến điểm đón",
    body: "Tài xế Nguyễn Văn Hải cách bạn khoảng 5 phút. Xe 43B-678.90.",
    time: "2 phút trước",
    unread: true,
    bookingId: "RSH-250718-0317",
    target: "tracking",
  },
  {
    id: "n2",
    kind: "success",
    title: "Đặt chỗ được xác nhận",
    body: "Chuyến Đà Nẵng → Huế 07:30, ghế A1, A2 · Nhà xe Thành Công.",
    time: "1 giờ trước",
    unread: true,
    bookingId: "RSH-250718-0317",
    target: "bookingDetail",
  },
  {
    id: "n3",
    kind: "warning",
    title: "Chuyến đi thay đổi giờ",
    body: "Chuyến Hội An → Quảng Nam ngày 22/07 dời từ 09:00 sang 09:30.",
    time: "Hôm qua",
    unread: true,
    bookingId: "RSH-250722-0452",
    target: "bookingDetail",
  },
  {
    id: "n4",
    kind: "success",
    title: "Chuyến đi đã hoàn thành",
    body: "Hội An → Đà Nẵng ngày 02/07. Hãy đánh giá trải nghiệm của bạn.",
    time: "16 ngày trước",
    unread: false,
    bookingId: "RSH-250702-0188",
    target: "rating",
  },
];

export function PassengerProvider({
  demo = false,
  children,
}: {
  demo?: boolean;
  children: ReactNode;
}) {
  const [search, s1] = useState<Ctx["search"]>({
    from: "Đà Nẵng",
    to: "Huế",
    date: "2025-07-18",
    pax: 2,
    fromLocation: areaLocation("Đà Nẵng"),
    toLocation: areaLocation("Huế"),
  });
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [tripId, setTripId] = useState(demo ? "1" : "");
  const [booking, b1] = useState<Booking>({
    seats: 2,
    pickup: demo ? seedLocation("Bến xe Trung tâm Đà Nẵng")!.address : "",
    pickupLocation: demo ? seedLocation("Bến xe Trung tâm Đà Nẵng") : null,
    pickupCustom: "",
    dropoff: demo ? seedLocation("Bến xe Trung tâm Huế")!.address : "",
    dropoffLocation: demo ? seedLocation("Bến xe Trung tâm Huế") : null,
    dropoffCustom: "",
    name: "Nguyễn Minh Anh",
    phone: demo ? "0905 123 456" : "",
    email: "",
  });
  const [ref, setRef] = useState(demo ? "RSH-250718-0317" : "");
  const [bookings, setBookings] = useState<MyBooking[]>(seedBookings);
  const [selectedId, setSelectedId] = useState("RSH-250718-0317");
  const [notifs, setNotifs] = useState<Notif[]>(seedNotifs);
  const [profile, setProfile] = useState<Profile>({
    name: "Nguyễn Minh Anh",
    email: "minhanh@email.com",
    phone: "0905 123 456",
    city: "Đà Nẵng",
    administrativeAddress: sampleAdministrativeAddress("Đà Nẵng", "25 Nguyễn Văn Linh"),
  });
  const [clock, setClock] = useState(NOW);
  const [completedTrips, setCompletedTrips] = useState<string[]>([]);
  const [preferences, updatePreferences] = useState({ push: true, reminders: true });
  const availableTrips = useMemo(
    () =>
      buildTrips(search.from, search.to).map((t) => ({
        ...t,
        status: completedTrips.includes(reservationKey(search, t.id))
          ? ("completed" as const)
          : t.status,
        seatsLeft: Math.max(
          0,
          t.seatsLeft -
            bookings
              .filter((b) => b.tripKey === reservationKey(search, t.id) && b.status !== "cancelled")
              .reduce((n, b) => n + b.seats.length, 0),
        ),
      })),
    [search.from, search.to, search.date, bookings, completedTrips],
  );
  const trip = availableTrips.find((t) => t.id === tripId);

  return (
    <C.Provider
      value={{
        demo,
        search,
        setSearch: (s) => s1((p) => ({ ...p, ...s })),
        filters,
        setFilters,
        tripId,
        setTripId,
        trip,
        availableTrips,
        clock,
        advanceToDeparture: () => {
          const b = bookings.find((b) => b.id === selectedId);
          if (b)
            setClock(
              new Date(
                Math.max(NOW.getTime(), new Date(`${b.date}T${b.depart}`).getTime() - 5 * 60000),
              ),
            );
        },
        booking,
        setBooking: (b) => b1((p) => ({ ...p, ...b })),
        ref,
        setRef,
        bookings,
        addBooking: (b) => {
          if (
            !trip ||
            trip.status !== "open" ||
            b.seats.length < 1 ||
            b.seats.length > trip.seatsLeft ||
            bookings.some((x) => x.id === b.id)
          )
            return "Chuyến không còn đủ chỗ hoặc đặt chỗ đã được xử lý. Vui lòng chọn lại chuyến.";
          setBookings((l) => [b, ...l]);
          setSelectedId(b.id);
          setNotifs((list) => [
            {
              id: `confirmed-${b.id}`,
              kind: "success",
              title: "Đặt chỗ được xác nhận",
              body: `${b.from} → ${b.to} · ${b.depart} · ${b.company}`,
              time: "Vừa xong",
              unread: true,
              bookingId: b.id,
              target: "bookingDetail",
            },
            ...list,
          ]);
          return null;
        },
        cancelBooking: (id) =>
          setBookings((l) => l.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b))),
        rateBooking: (id) => {
          const b = bookings.find((b) => b.id === id);
          if (!b || b.status !== "completed" || b.rated)
            return "Chỉ có thể đánh giá một lần sau khi chuyến đã hoàn thành.";
          setBookings((l) => l.map((b) => (b.id === id ? { ...b, rated: true } : b)));
          return null;
        },
        completeBooking: (id) => {
          const completed = bookings.find((b) => b.id === id && b.status === "upcoming");
          if (!completed) return;
          if (completed.tripKey)
            setCompletedTrips((list) =>
              list.includes(completed.tripKey!) ? list : [...list, completed.tripKey!],
            );
          setBookings((l) =>
            l.map((b) =>
              (b.id === id || (completed.tripKey && b.tripKey === completed.tripKey)) &&
              b.status === "upcoming"
                ? { ...b, status: "completed" }
                : b,
            ),
          );
        },
        selectedId,
        setSelectedId,
        selected: bookings.find((b) => b.id === selectedId),
        notifs,
        markRead: (id) =>
          setNotifs((l) => l.map((n) => (n.id === id ? { ...n, unread: false } : n))),
        markAllRead: () => setNotifs((l) => l.map((n) => ({ ...n, unread: false }))),
        unread: notifs.filter((n) => n.unread).length,
        profile,
        setProfile,
        preferences,
        setPreferences: (p) => updatePreferences((current) => ({ ...current, ...p })),
      }}
    >
      {children}
    </C.Provider>
  );
}
