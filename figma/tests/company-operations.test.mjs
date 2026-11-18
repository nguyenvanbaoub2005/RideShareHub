import assert from "node:assert/strict";
import test from "node:test";
import {
  assignmentError,
  assignments,
  vehicles,
  drivers,
  routes,
  validateVehicle,
  validateDriver,
  validateRoute,
} from "../src/apps/company/operations.ts";

const candidate = {
  id: "new",
  tripId: "CH-TEST",
  vehicleId: "v3",
  driverId: "d3",
  start: "2025-07-18T08:00",
  end: "2025-07-18T11:00",
};
test("rejects overlapping vehicle assignments even with a different driver", () => {
  assert.match(
    assignmentError({ ...candidate, vehicleId: "v1" }, assignments),
    /Phương tiện.*CH-2041/,
  );
});
test("rejects overlapping driver assignments even with a different vehicle", () => {
  assert.match(assignmentError({ ...candidate, driverId: "d1" }, assignments), /Tài xế.*CH-2041/);
});
test("allows independent resources, adjacent times and another date", () => {
  assert.equal(assignmentError(candidate, assignments), "");
  assert.equal(
    assignmentError(
      {
        ...candidate,
        vehicleId: "v1",
        driverId: "d1",
        start: "2025-07-18T10:30",
        end: "2025-07-18T12:00",
      },
      assignments,
    ),
    "",
  );
  assert.equal(
    assignmentError(
      {
        ...candidate,
        vehicleId: "v1",
        driverId: "d1",
        start: "2025-07-19T08:00",
        end: "2025-07-19T11:00",
      },
      assignments,
    ),
    "",
  );
});
test("detects contained and enveloping time intervals", () => {
  assert.ok(
    assignmentError(
      { ...candidate, vehicleId: "v1", start: "2025-07-18T08:00", end: "2025-07-18T09:00" },
      assignments,
    ),
  );
  assert.ok(
    assignmentError(
      { ...candidate, vehicleId: "v1", start: "2025-07-18T07:00", end: "2025-07-18T12:00" },
      assignments,
    ),
  );
});
test("editing excludes only the current assignment; duplicate trip and invalid intervals are rejected", () => {
  assert.equal(assignmentError(assignments[0], assignments), "");
  assert.ok(assignmentError({ ...candidate, tripId: assignments[0].tripId }, assignments));
  assert.ok(assignmentError({ ...candidate, start: candidate.end }, assignments));
  assert.ok(assignmentError({ ...candidate, driverId: "" }, assignments));
});
test("sample vehicle, driver and route pass validation", () => {
  assert.ok(Object.values(validateVehicle(vehicles[0], vehicles)).every((x) => !x));
  assert.ok(Object.values(validateDriver(drivers[0], drivers)).every((x) => !x));
  assert.ok(Object.values(validateRoute(routes[0])).every((x) => !x));
});
test("vehicle validation rejects duplicates, missing data and invalid seat counts", () => {
  const errors = validateVehicle(
    { ...vehicles[0], id: "new", capacity: 1.5, model: "", type: "", year: 1990 },
    vehicles,
  );
  for (const key of ["plate", "capacity", "model", "type", "year"]) assert.ok(errors[key]);
  assert.ok(validateVehicle({ ...vehicles[0], plate: "" }, vehicles).plate);
});
test("driver validation rejects duplicate license, expiry and missing required fields", () => {
  const errors = validateDriver(
    { ...drivers[0], id: "new", name: "", phone: "123", email: "invalid", expiry: "2020-01-01" },
    drivers,
  );
  for (const key of ["name", "phone", "email", "license", "expiry"]) assert.ok(errors[key]);
  assert.ok(validateDriver({ ...drivers[0], expiry: "" }, drivers).expiry);
});
test("route validation rejects identical cities, blank or duplicate stops and invalid metrics", () => {
  const errors = validateRoute({
    ...routes[0],
    name: "",
    destination: routes[0].origin,
    stops: [""],
    distance: -1,
    duration: 0,
  });
  for (const key of ["name", "destination", "stops", "distance", "duration"])
    assert.ok(errors[key]);
  assert.ok(validateRoute({ ...routes[0], stops: ["Lăng Cô", "Lăng Cô"] }).stops);
  assert.equal(validateRoute({ ...routes[0], stops: [] }).stops, "");
});
