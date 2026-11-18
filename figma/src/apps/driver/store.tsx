import { createContext, useContext, useState, type ReactNode } from "react";
import {
  trips as seed,
  genStops,
  stopRule,
  remaining,
  type DStop,
  type DTrip,
  type StopAction,
} from "./data";

export type DScreen =
  | "login"
  | "home"
  | "trips"
  | "details"
  | "accept"
  | "route"
  | "active"
  | "stop"
  | "incident"
  | "completed";
export type Incident = { tripId: string; type: string; text: string };

type Ctx = {
  demo: boolean;
  available: boolean;
  setAvailable: (v: boolean) => void;
  trips: DTrip[];
  selectedId: string;
  setSelectedId: (id: string) => void;
  stopId: string;
  setStopId: (id: string) => void;
  intent: "accept" | "reject";
  setIntent: (i: "accept" | "reject") => void;
  getStops: (tripId: string) => DStop[];
  acceptTrip: (id: string) => void;
  rejectTrip: (id: string) => void;
  startTrip: (id: string) => void;
  /** Trả về thông báo lỗi tiếng Việt nếu vi phạm quy tắc, ngược lại null. */
  applyAction: (tripId: string, stopId: string, a: StopAction) => string | null;
  completeTrip: (id: string) => string | null;
  incidents: Incident[];
  addIncident: (i: Incident) => void;
};

const C = createContext<Ctx>(null as never);
export const useDriver = () => useContext(C);

export function DriverProvider({
  demo = false,
  children,
}: {
  demo?: boolean;
  children: ReactNode;
}) {
  const [available, setAvailable] = useState(true);
  const [trips, setTrips] = useState<DTrip[]>(
    demo ? seed.map((t) => (t.id === "t1" ? { ...t, status: "ongoing" } : t)) : seed,
  );
  const [selectedId, setSelectedId] = useState(demo ? "t1" : "t3");
  const [stopId, setStopId] = useState("s3");
  const [intent, setIntent] = useState<"accept" | "reject">("accept");
  const [map, setMap] = useState<Record<string, DStop[]>>(() => {
    if (!demo) return {} as Record<string, DStop[]>;
    const t1 = genStops(seed[0]).map((s) =>
      s.id === "s1" || s.id === "s2"
        ? { ...s, status: "done" as const }
        : s.id === "s3"
          ? { ...s, status: "arrived" as const }
          : s,
    );
    return { t1 };
  });
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const getStops = (id: string) => {
    const t = trips.find((t) => t.id === id);
    return t ? (map[id] ?? genStops(t)) : [];
  };
  const setStatus = (id: string, status: DTrip["status"]) =>
    setTrips((l) => l.map((t) => (t.id === id ? { ...t, status } : t)));

  return (
    <C.Provider
      value={{
        demo,
        available,
        setAvailable,
        trips,
        selectedId,
        setSelectedId,
        stopId,
        setStopId,
        intent,
        setIntent,
        getStops,
        acceptTrip: (id) => {
          if (trips.find((t) => t.id === id)?.status === "pending") setStatus(id, "confirmed");
        },
        rejectTrip: (id) => {
          if (trips.find((t) => t.id === id)?.status === "pending") setStatus(id, "rejected");
        },
        startTrip: (id) => {
          if (trips.find((t) => t.id === id)?.status !== "confirmed") return;
          setMap((m) => ({ ...m, [id]: m[id] ?? getStops(id) }));
          setStatus(id, "ongoing");
        },
        applyAction: (tripId, sid, a) => {
          if (trips.find((t) => t.id === tripId)?.status !== "ongoing")
            return "Chuyến chưa bắt đầu hoặc đã kết thúc, không thể xử lý điểm dừng.";
          const stops = getStops(tripId);
          const s = stops.find((x) => x.id === sid);
          if (!s) return "Không tìm thấy điểm dừng.";
          const r = stopRule(stops, s);
          if (r.blocked) return r.blocked;
          if (r.next !== a)
            return a === "ARRIVED"
              ? "Điểm dừng này đã được xử lý."
              : 'Cần xác nhận "Đã đến" trước khi thực hiện thao tác này.';
          setMap((m) => ({
            ...m,
            [tripId]: stops.map((x) =>
              x.id === sid ? { ...x, status: a === "ARRIVED" ? "arrived" : "done" } : x,
            ),
          }));
          return null;
        },
        completeTrip: (id) => {
          if (trips.find((t) => t.id === id)?.status !== "ongoing")
            return "Chỉ được hoàn thành chuyến đang chạy.";
          const n = remaining(getStops(id));
          if (n > 0) return `Còn ${n} điểm dừng chưa xử lý. Không thể hoàn thành chuyến.`;
          setStatus(id, "completed");
          return null;
        },
        incidents,
        addIncident: (i) => setIncidents((l) => [i, ...l]),
      }}
    >
      {children}
    </C.Provider>
  );
}
