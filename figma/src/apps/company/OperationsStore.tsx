import { createContext, useContext, useState, type ReactNode } from "react";
import {
  vehicles as seedVehicles,
  drivers as seedDrivers,
  routes as seedRoutes,
  assignments as seedAssignments,
} from "./operations";
import { initialTrips, initialBookings, seedStopMap, type CompanyTrip } from "./tripsModel";

function useStateStore() {
  const [vehicles, setVehicles] = useState(seedVehicles);
  const [drivers, setDrivers] = useState(seedDrivers);
  const [routes, setRoutes] = useState(seedRoutes);
  const [assignments, setAssignments] = useState(seedAssignments);
  const [tripRecords, setTrips] = useState(initialTrips);
  const [bookings, setBookings] = useState(initialBookings);
  const [stopMap, setStopMap] = useState(seedStopMap);
  const [selectedTripId, setSelectedTripId] = useState("CH-2041");
  const [editingTrip, setEditingTrip] = useState<CompanyTrip | null>(null);
  const trips = tripRecords.map((t) => {
    const a = assignments.find((a) => a.tripId === t.id);
    return a ? { ...t, vehicleId: a.vehicleId, driverId: a.driverId, departure: a.start } : t;
  });
  return {
    vehicles,
    setVehicles,
    drivers,
    setDrivers,
    routes,
    setRoutes,
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
  };
}
const OperationsContext = createContext<ReturnType<typeof useStateStore> | null>(null);
export function OperationsProvider({ children }: { children: ReactNode }) {
  const value = useStateStore();
  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>;
}
export function useOperations() {
  const value = useContext(OperationsContext);
  if (!value) throw new Error("Company operations require OperationsProvider");
  return value;
}
