import assert from "node:assert/strict";
import test from "node:test";
import {
  adminUsers,
  adminTrips,
  adminBookings,
  filterUsers,
  filterTrips,
  filterBookings,
  setUserLock,
  activeTripsOf,
  summarize,
  validateRange,
  bookedSeatsOf,
  dashboardStats,
  FULL_RANGE,
  NOW,
  tripDate,
} from "../src/apps/admin/monitoringModel.ts";

const passenger = adminUsers.find((u) => u.role === "passenger" && u.status === "ACTIVE");
const locked = adminUsers.find((u) => u.status === "LOCKED");

test("dataset contains all roles with unique ids and valid contact details", () => {
  assert.deepEqual([...new Set(adminUsers.map((u) => u.role))].sort(), [
    "company",
    "driver",
    "passenger",
  ]);
  assert.equal(new Set(adminUsers.map((u) => u.id)).size, adminUsers.length);
  for (const u of adminUsers) {
    assert.match(u.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    assert.match(u.phone, /^0\d{3} \d{3} \d{3}$/);
  }
});
test("locking and unlocking require confirmation and do not mutate the source user", () => {
  const before = JSON.stringify(passenger);
  assert.ok(setUserLock(passenger, true, false, "t").error);
  assert.ok(setUserLock(locked, false, false, "t").error);
  const result = setUserLock(passenger, true, true, "18/07/2025", "  Vi phạm điều khoản  ");
  assert.equal(result.error, "");
  assert.equal(result.user.status, "LOCKED");
  assert.equal(result.user.lockReason, "Vi phạm điều khoản");
  assert.equal(JSON.stringify(passenger), before);
  const reopened = setUserLock(result.user, false, true, "t");
  assert.equal(reopened.user.status, "ACTIVE");
  assert.equal(reopened.user.lockReason, "");
});
test("lock state transitions cannot be repeated and the reason is bounded", () => {
  assert.ok(setUserLock(locked, true, true, "t").error);
  assert.ok(setUserLock(passenger, false, true, "t").error);
  assert.ok(setUserLock(passenger, true, true, "t", "x".repeat(301)).error);
  assert.equal(setUserLock(passenger, true, true, "t", "x".repeat(300)).error, "");
});
test("locking a driver or company with an active trip is flagged", () => {
  const active = adminTrips.find((t) => t.status === "active");
  const driver = adminUsers.find((u) => u.role === "driver" && u.name === active.driver);
  assert.ok(activeTripsOf(driver, adminTrips).some((t) => t.id === active.id));
  assert.deepEqual(activeTripsOf(passenger, adminTrips), []);
});
test("user search ignores accents and combines role and status filters", () => {
  assert.ok(filterUsers(adminUsers, "nguyen minh anh").some((u) => u.name === "Nguyễn Minh Anh"));
  assert.ok(filterUsers(adminUsers, locked.phone).every((u) => u.phone === locked.phone));
  assert.ok(
    filterUsers(adminUsers, "", "passenger", "LOCKED").every(
      (u) => u.role === "passenger" && u.status === "LOCKED",
    ),
  );
  assert.deepEqual(filterUsers(adminUsers, "khong-ton-tai"), []);
});
test("trip and booking data obeys status, capacity and route invariants", () => {
  for (const t of adminTrips) {
    assert.notEqual(t.from, t.to);
    assert.ok(t.arrive > t.departure);
    assert.ok(bookedSeatsOf(t.id, adminBookings) <= t.capacity, `${t.id} vượt sức chứa`);
    const own = adminBookings.filter((b) => b.tripId === t.id);
    if (t.status === "cancelled") assert.ok(own.every((b) => b.status === "cancelled"));
    if (t.status === "scheduled" || t.status === "active")
      assert.ok(own.every((b) => b.status !== "completed"));
    if (t.status === "active") assert.ok(t.departure <= NOW && t.arrive > NOW);
  }
  assert.equal(new Set(adminBookings.map((b) => b.id)).size, adminBookings.length);
  for (const b of adminBookings)
    assert.ok(adminTrips.some((t) => t.id === b.tripId) && b.seats >= 1);
});
test("monitoring filters narrow trips and bookings correctly", () => {
  const trip = adminTrips[10];
  assert.deepEqual(
    filterTrips(adminTrips, trip.id).map((t) => t.id),
    [trip.id],
  );
  assert.ok(
    filterTrips(adminTrips, "", "cancelled", "all", "all").every((t) => t.status === "cancelled"),
  );
  assert.ok(
    filterTrips(adminTrips, "", "all", trip.company, tripDate(trip)).every(
      (t) => t.company === trip.company && tripDate(t) === tripDate(trip),
    ),
  );
  assert.ok(
    filterBookings(adminBookings, adminTrips, "", "all", trip.id).every(
      (b) => b.tripId === trip.id,
    ),
  );
  assert.ok(
    filterBookings(adminBookings, adminTrips, "", "cancelled").every(
      (b) => b.status === "cancelled",
    ),
  );
});
test("report summaries reconcile trips, bookings, companies, routes and days", () => {
  const s = summarize(adminTrips, adminBookings, FULL_RANGE);
  assert.equal(s.totalTrips, adminTrips.length);
  assert.equal(s.totalTrips, s.active + s.completed + s.cancelled + s.scheduled);
  assert.equal(s.bookings.total, adminBookings.length);
  assert.equal(
    s.bookings.total,
    s.bookings.confirmed + s.bookings.completed + s.bookings.cancelled,
  );
  for (const key of ["companies", "routes"]) {
    assert.equal(
      s[key].reduce((n, r) => n + r.trips, 0),
      s.totalTrips,
    );
    assert.equal(
      s[key].reduce((n, r) => n + r.bookings, 0),
      s.bookings.total,
    );
  }
  assert.equal(
    s.days.reduce((n, d) => n + d.total, 0),
    s.totalTrips,
  );
  assert.equal(
    s.companies.reduce((n, c) => n + c.completed, 0),
    s.completed,
  );
});
test("date filters include boundary days, support one day and return empty outside the data", () => {
  const day = summarize(adminTrips, adminBookings, { from: "2025-07-18", to: "2025-07-18" });
  assert.equal(day.totalTrips, adminTrips.filter((t) => tripDate(t) === "2025-07-18").length);
  assert.equal(day.days.length, 1);
  const outside = summarize(adminTrips, adminBookings, { from: "2025-08-01", to: "2025-08-02" });
  assert.equal(outside.totalTrips, 0);
  assert.equal(outside.bookings.total, 0);
  assert.equal(
    summarize(adminTrips, adminBookings, { from: "2025-07-18", to: "2025-07-12" }).totalTrips,
    0,
  );
});
test("date range validation rejects missing, malformed and reversed ranges", () => {
  assert.ok(validateRange("", "2025-07-18"));
  assert.ok(validateRange("2025-07-18", "bad"));
  assert.ok(validateRange("2025-07-18", "2025-07-12"));
  assert.equal(validateRange("2025-07-12", "2025-07-18"), "");
  assert.equal(validateRange("2025-07-18", "2025-07-18"), "");
});
test("dashboard figures are derived from the same monitoring data", () => {
  assert.equal(dashboardStats.week.totalTrips, adminTrips.length);
  assert.equal(dashboardStats.week.bookings.total, adminBookings.length);
  assert.equal(
    dashboardStats.today.totalTrips,
    adminTrips.filter((t) => tripDate(t) === "2025-07-18").length,
  );
});
