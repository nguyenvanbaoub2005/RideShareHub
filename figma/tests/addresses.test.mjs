import assert from "node:assert/strict";
import test from "node:test";
import {
  provinces,
  administrativeSource,
  provinceOf,
  communeOf,
  changeProvince,
  emptyAdministrativeAddress,
  sampleAdministrativeAddress,
  validateAdministrativeAddress,
  formatAdministrativeAddress,
  searchLocations,
  placeCatalog,
  areaCatalog,
  seedLocation,
  validLocation,
  fromMap,
  gpsLabel,
  haversineKm,
  dispatchPoint,
  fitLocationPoints,
} from "../src/address/model.ts";
import {
  initialBookings,
  initialTrips,
  seedStopMap,
  updateBookingStops,
  optimizeStops,
  stopOrderError,
  bookingError,
  estimate,
} from "../src/apps/company/tripsModel.ts";
import { routes, validateRoute } from "../src/apps/company/operations.ts";

test("administrative catalog contains 34 provinces and 3321 dependent communes including special zones", () => {
  assert.equal(provinces.length, 34);
  const communes = provinces.flatMap((p) => p.communes);
  assert.equal(communes.length, 3321);
  assert.equal(new Set(communes.map((w) => w.id)).size, communes.length);
  assert.ok(communes.some((w) => w.name === "Đặc khu Hoàng Sa"));
  assert.ok(!provinces.some((p) => p.name === "Quảng Nam" || p.name === "Hội An"));
  assert.ok(administrativeSource.source.includes("/v2/"));
});
test("changing province invalidates commune but preserves detailed address", () => {
  const original = sampleAdministrativeAddress("Đà Nẵng", "120 Nguyễn Văn Linh");
  const next = changeProvince(original, "46");
  assert.equal(next.communeId, "");
  assert.equal(next.detail, original.detail);
  assert.equal(original.provinceId, "48");
  assert.ok(validateAdministrativeAddress(next).communeId);
  assert.ok(validateAdministrativeAddress({ ...next, communeId: original.communeId }).communeId);
});
test("administrative address requires real province, matching commune and a detail", () => {
  assert.ok(
    Object.values(validateAdministrativeAddress(emptyAdministrativeAddress())).every(Boolean),
  );
  const valid = sampleAdministrativeAddress("Huế", "42 An Dương Vương");
  assert.ok(Object.values(validateAdministrativeAddress(valid)).every((e) => !e));
  const label = formatAdministrativeAddress(valid);
  assert.ok(
    label.includes("42 An Dương Vương") &&
      label.includes("Phường Thuận Hóa") &&
      label.includes("Thành phố Huế"),
  );
  assert.equal(communeOf("48", valid.communeId), undefined);
  assert.equal(provinceOf("48").name, "Thành phố Đà Nẵng");
});
test("personal address can remain undeclared, but a partially entered address must be complete", () => {
  assert.ok(
    Object.values(validateAdministrativeAddress(emptyAdministrativeAddress(), false)).every(
      (e) => !e,
    ),
  );
  assert.ok(
    validateAdministrativeAddress({ ...emptyAdministrativeAddress(), provinceId: "48" }, false)
      .communeId,
  );
});
test("place suggestions match names or addresses without Vietnamese accents", () => {
  assert.ok(searchLocations("nguyen van linh").some((p) => p.id === "dn-nvl"));
  assert.ok(searchLocations("254").some((p) => p.id === "dn-nvl"));
  assert.ok(searchLocations("", "Huế").every((p) => p.area === "Huế"));
  assert.deepEqual(searchLocations("khong-co-dia-diem-xyz"), []);
});
test("operational locations have GPS and do not require administrative re-entry", () => {
  for (const p of placeCatalog) {
    assert.ok(validLocation(p), p.label);
    assert.ok(communeOf(p.provinceId, p.communeId), p.label);
  }
  assert.equal(validLocation(areaCatalog[0]), false);
  assert.equal(validLocation(areaCatalog[0], true), true);
  assert.equal(validLocation({ ...placeCatalog[0], lat: NaN }), false);
  assert.equal(validLocation({ ...placeCatalog[0], lng: 181 }), false);
});
test("map selection retains exact GPS and recognises administrative context only near known fixtures", () => {
  const p = seedLocation("254 Nguyễn Văn Linh");
  const selected = fromMap(p.lat, p.lng);
  assert.equal(selected.lat, p.lat);
  assert.equal(selected.lng, p.lng);
  assert.equal(selected.provinceId, p.provinceId);
  assert.equal(selected.communeId, p.communeId);
  const unknown = fromMap(21.1, 105.8, "Hà Nội");
  assert.ok(validLocation(unknown));
  assert.equal(unknown.provinceId, undefined);
  assert.equal(unknown.communeId, undefined);
  assert.match(gpsLabel(unknown), /21.100000, 105.800000/);
});
test("existing company bookings, routes and stops carry geographic data, not only labels", () => {
  assert.ok(
    initialBookings.every(
      (b) => validLocation(b.pickupLocation) && validLocation(b.dropoffLocation),
    ),
  );
  assert.ok(routes.every((r) => Object.values(validateRoute(r)).every((e) => !e)));
  assert.ok(
    Object.values(seedStopMap())
      .flat()
      .every((s) => validLocation(s.location)),
  );
  assert.ok(validateRoute({ ...routes[0], originLocation: null }).origin);
  assert.ok(validateRoute({ ...routes[0], stopLocations: [] }).stops);
});
test("booking validation rejects label-only or stale address/GPS combinations", () => {
  const b = { ...initialBookings[4], id: "test" },
    t = initialTrips[1];
  assert.equal(bookingError(b, t, initialBookings), "");
  assert.ok(bookingError({ ...b, pickupLocation: null }, t, initialBookings));
  assert.ok(bookingError({ ...b, pickup: "Địa chỉ mới chưa định vị" }, t, initialBookings));
});
test("editing pickup changes coordinates, description and instructions atomically without changing stop status", () => {
  const original = seedStopMap()["CH-2042"];
  const old = initialBookings.find((b) => b.tripId === "CH-2042");
  const location = { ...seedLocation("254 Nguyễn Văn Linh"), instructions: "Chờ trước cổng số 2" };
  const edited = { ...old, pickup: location.address, pickupLocation: location };
  const before = JSON.stringify(original);
  const result = updateBookingStops(original, edited);
  assert.equal(result.error, "");
  const stop = result.stops.find((s) => s.bookingId === old.id && s.type === "pickup");
  assert.equal(stop.location.lat, location.lat);
  assert.equal(stop.location.lng, location.lng);
  assert.equal(stop.location.instructions, location.instructions);
  assert.equal(stop.address, location.address);
  assert.notEqual(estimate(result.stops).km, estimate(original).km);
  assert.deepEqual({ x: stop.x, y: stop.y }, dispatchPoint(location));
  assert.deepEqual(
    result.stops.map((s) => [s.id, s.status]),
    original.map((s) => [s.id, s.status]),
  );
  assert.equal(JSON.stringify(original), before);
  assert.equal(edited.status, old.status);
});
test("processed stops cannot have their location edited", () => {
  const original = seedStopMap()["CH-2041"],
    b = initialBookings[0];
  assert.ok(updateBookingStops(original, b).error);
});
test("optimization requires confirmed GPS and cannot change GPS or pickup/drop-off precedence", () => {
  const original = seedStopMap()["CH-2041"];
  const result = optimizeStops(original);
  assert.equal(result.error, "");
  assert.equal(stopOrderError(result.stops, original), "");
  const tampered = original.map((s, i) =>
    i ? s : { ...s, location: { ...s.location, lat: s.location.lat + 0.1 } },
  );
  assert.ok(stopOrderError(tampered, original));
  assert.ok(optimizeStops(original.map((s, i) => (i ? s : { ...s, location: null }))).error);
});
test("geographic distance and marker fitting follow coordinate changes", () => {
  const a = seedLocation("Bến xe Đà Nẵng"),
    b = seedLocation("Bến xe Huế");
  assert.equal(haversineKm(a, a), 0);
  assert.ok(haversineKm(a, b) > 50 && haversineKm(a, b) < 150);
  const points = fitLocationPoints([a, b]);
  assert.notDeepEqual(points[0], points[1]);
  assert.ok(points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
  assert.deepEqual(fitLocationPoints([null]), [{ x: 400, y: 195 }]);
});
