import assert from "node:assert/strict";
import test from "node:test";
import {
  loginValidation,
  registrationValidation,
  bookingValidation,
  reservationKey,
} from "../src/apps/passenger/validation.ts";
import { buildTrips, assignSeats, canCancel, canTrack } from "../src/apps/passenger/data.ts";
import { seedLocation } from "../src/address/model.ts";

test("passenger login validates identity and password before navigating", () => {
  assert.ok(loginValidation("", "").identifier);
  assert.ok(loginValidation("0905", "short").password);
  assert.ok(Object.values(loginValidation("0905123456", "Demo12345")).every((v) => !v));
  assert.ok(Object.values(loginValidation("passenger@example.vn", "Demo12345")).every((v) => !v));
});
test("registration requires all fields, matching passwords and terms acceptance", () => {
  const empty = { name: "", email: "", phone: "", password: "", confirm: "", terms: false };
  assert.ok(Object.values(registrationValidation(empty)).every(Boolean));
  const valid = {
    name: "Nguyễn Minh Anh",
    email: "minhanh@example.vn",
    phone: "0905123456",
    password: "Demo12345",
    confirm: "Demo12345",
    terms: true,
  };
  assert.ok(Object.values(registrationValidation(valid)).every((v) => !v));
  assert.ok(registrationValidation({ ...valid, confirm: "different" }).confirm);
});
test("booking form and confirmation share required-field and seat validation", () => {
  const trip = buildTrips("Đà Nẵng", "Huế")[1];
  const valid = {
    seats: 2,
    pickup: seedLocation("Bến xe Đà Nẵng").address,
    pickupLocation: seedLocation("Bến xe Đà Nẵng"),
    pickupCustom: "",
    dropoff: seedLocation("Bến xe Huế").address,
    dropoffLocation: seedLocation("Bến xe Huế"),
    dropoffCustom: "",
    name: "Nguyễn Minh Anh",
    phone: "0905123456",
    email: "",
  };
  assert.ok(Object.values(bookingValidation(valid, trip)).every((v) => !v));
  assert.ok(bookingValidation({ ...valid, pickup: "" }, trip).pickup);
  assert.ok(bookingValidation({ ...valid, pickupLocation: null }, trip).pickup);
  assert.ok(bookingValidation({ ...valid, pickup: "custom" }, trip).pickupCustom);
  assert.ok(bookingValidation({ ...valid, seats: trip.seatsLeft + 1 }, trip).seats);
  assert.ok(bookingValidation({ ...valid, seats: 1.5 }, trip).seats);
  assert.ok(bookingValidation(valid, { ...trip, status: "cancelled" }).trip);
  assert.ok(bookingValidation(valid, { ...trip, status: "completed" }).trip);
});
test("auto-assigned seats remain stable and cannot overlap consecutive reservations", () => {
  const trip = buildTrips("Đà Nẵng", "Huế")[1];
  const first = assignSeats(trip, 2);
  const next = assignSeats({ ...trip, seatsLeft: trip.seatsLeft - 2 }, 2);
  assert.equal(first.length, 2);
  assert.equal(next.length, 2);
  assert.equal(new Set([...first, ...next]).size, 4);
});
test("seat reservation keys distinguish dates, routes and trips", () => {
  const s = { from: "Đà Nẵng", to: "Huế", date: "2025-07-18" };
  assert.notEqual(reservationKey(s, "1"), reservationKey(s, "2"));
  assert.notEqual(reservationKey(s, "1"), reservationKey({ ...s, date: "2025-07-19" }, "1"));
  assert.notEqual(reservationKey(s, "1"), reservationKey({ ...s, to: "Hội An" }, "1"));
});
test("the prototype clock advances tracking eligibility without bypassing cancellation rules", () => {
  const booking = { date: "2025-07-22", depart: "09:30", status: "upcoming" };
  const before = new Date("2025-07-22T06:00");
  const nearDeparture = new Date("2025-07-22T09:25");
  assert.equal(canCancel(booking, before), true);
  assert.equal(canTrack(booking, before), false);
  assert.equal(canCancel(booking, nearDeparture), false);
  assert.equal(canTrack(booking, nearDeparture), true);
  assert.equal(canTrack({ ...booking, status: "cancelled" }, nearDeparture), false);
});
