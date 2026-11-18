import assert from "node:assert/strict";
import test from "node:test";
import { vehicles, drivers, routes, assignments } from "../src/apps/company/operations.ts";
import {
  initialTrips,
  initialBookings,
  seedStopMap,
  validateTrip,
  bookingError,
  arrival,
  seatsLeft,
  optimizeStops,
  stopOrderError,
  estimate,
  advanceStop,
} from "../src/apps/company/tripsModel.ts";
const context = {
  status: "APPROVED",
  vehicles,
  drivers,
  routes,
  assignments,
  bookings: initialBookings,
};
const draft = { ...initialTrips[3], status: "draft" };
test("draft can publish only after company approval", () => {
  assert.ok(Object.values(validateTrip(draft, context, true)).every((s) => !s));
  for (const status of ["DRAFT", "PENDING"])
    assert.ok(validateTrip(draft, { ...context, status }, true).approval);
});
test("trip requires route, vehicle, driver, valid schedule, capacity and fare", () => {
  const errors = validateTrip(
    { ...draft, routeId: "", vehicleId: "", driverId: "", departure: "", capacity: 0, fare: 0 },
    context,
    true,
  );
  for (const key of ["routeId", "vehicleId", "driverId", "departure", "capacity", "fare"])
    assert.ok(errors[key]);
  assert.ok(validateTrip({ ...draft, capacity: 10 }, context, false).capacity);
  assert.ok(validateTrip({ ...draft, status: "active" }, context, true).editable);
});
test("publication rejects overlapping vehicle and driver schedules", () => {
  const t = {
    ...draft,
    id: "CH-NEW",
    routeId: "r1",
    departure: "2025-07-18T08:00",
    vehicleId: "v1",
    driverId: "d3",
    capacity: 16,
  };
  assert.match(validateTrip(t, context, true).assignment, /Phương tiện/);
  assert.match(
    validateTrip({ ...t, vehicleId: "v3", driverId: "d1", capacity: 9 }, context, true).assignment,
    /Tài xế/,
  );
});
test("bookings respect available seats, exclude cancellations, reject inactive trips and invalid fields", () => {
  const t = initialTrips[1];
  const b = { ...initialBookings[4], id: "new", seats: 11 };
  assert.equal(seatsLeft(t, initialBookings), 11);
  assert.equal(bookingError(b, t, initialBookings), "");
  assert.ok(bookingError({ ...b, seats: 12 }, t, initialBookings));
  assert.ok(bookingError({ ...b, seats: -1 }, t, initialBookings));
  assert.ok(bookingError({ ...b, phone: "", pickup: "" }, t, initialBookings));
  for (const status of ["draft", "active", "completed", "cancelled"])
    assert.ok(bookingError(b, { ...t, status }, initialBookings));
});
test("arrival handles midnight with explicit Vietnamese timezone", () => {
  assert.equal(arrival("2025-07-18T23:30", 180), "2025-07-19T02:30");
});
test("optimization preserves all stops, pickup precedences, locked prefix and booking statuses", () => {
  const source = seedStopMap()["CH-2041"];
  const before = JSON.stringify(source);
  const bookingSnapshot = JSON.stringify(initialBookings);
  const proposal = optimizeStops(source);
  assert.equal(proposal.error, "");
  assert.equal(stopOrderError(proposal.stops, source), "");
  assert.deepEqual(proposal.stops.map((s) => s.id).sort(), source.map((s) => s.id).sort());
  assert.equal(proposal.stops[0].id, source[0].id);
  assert.ok(estimate(proposal.stops).km <= estimate(source).km);
  assert.equal(JSON.stringify(source), before);
  assert.equal(JSON.stringify(initialBookings), bookingSnapshot);
});
test("optimization cannot omit, duplicate, rewrite or reorder processed stops", () => {
  const source = seedStopMap()["CH-2041"];
  assert.ok(stopOrderError(source.slice(1), source));
  assert.ok(stopOrderError([source[1], ...source.slice(1)], source));
  assert.ok(
    stopOrderError(
      source.map((s, i) => (i === 0 ? { ...s, status: "pending" } : s)),
      source,
    ),
  );
  assert.ok(stopOrderError([source[1], source[0], ...source.slice(2)], source));
  assert.ok(
    stopOrderError([source[0], source[5], ...source.slice(1, 5), ...source.slice(6)], source),
  );
});
test("arrived stops also lock their preceding route segment", () => {
  const source = seedStopMap()["CH-2041"].map((s, i) =>
    i === 2 ? { ...s, status: "arrived" } : s,
  );
  const proposal = optimizeStops(source);
  assert.deepEqual(proposal.stops.slice(0, 3), source.slice(0, 3));
});
test("processing cannot drop a passenger before pickup", () => {
  const stops = seedStopMap()["CH-2042"];
  const drop = stops.find((s) => s.type === "dropoff");
  const result = advanceStop([drop, ...stops.filter((s) => s.id !== drop.id)]);
  assert.match(result.error, /chưa được đón/);
});
test("every stop requires arrival then processing and completion has no remaining required stops", () => {
  let stops = seedStopMap()["CH-2042"];
  const count = stops.length;
  for (let i = 0; i < count * 2; i++) {
    const result = advanceStop(stops);
    assert.equal(result.error, "");
    stops = result.stops;
  }
  assert.ok(stops.every((s) => s.status === "done"));
  assert.deepEqual(advanceStop(stops).stops, stops);
});
