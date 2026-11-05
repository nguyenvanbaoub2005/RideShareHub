# SP2-P1-01 / SP2-P1-02 — Trip Search/Filter API and V1 Fare Estimation

Status: Implemented

Date: 2026-11-05

Branch: feature/sp2-p1-01-trip-search

Commit: 491431a

## Scope

**SP2-P1-01** — Trip Search/Filter API (Backend):

- `GET /api/trips/search` — authenticated passengers can filter PUBLISHED trips by:
  - `origin` (optional, case-insensitive substring)
  - `destination` (optional, case-insensitive substring)
  - `date` (optional, filters by UTC calendar day)
  - `minSeats` (optional, defaults to 1)
- Results ordered by `departureTime ASC`, max 50 per request (page-size cap).
- Authorization: `isAuthenticated()` — all authenticated roles may search.
- Result includes tripId, routeId, routeName, origin, destination, estimatedMinutes,
  departureTime, fare, estimatedFare, availableSeats, vehicleType, driverName, status.

**SP2-P1-02** — V1 Fare Estimation:

- Demand-based surcharge applied to `baseFare`:
  - < 20% seats remaining → +20%
  - < 50% seats remaining → +10%
  - otherwise → no surcharge
- Rounded to 2 decimal places (HALF_UP).

## Limitations

- `availableSeats` is `vehicle.seatCapacity` minus confirmed bookings.
  Until SP2-P2-01 (Booking API) is implemented, booked seat count is 0,
  so `availableSeats` equals full vehicle capacity.
- No booking sub-select in JPQL until SP2-P2-01 is merged.

## Infrastructure Fix

Mockito inline mock maker (byte-buddy) cannot self-attach on JDK 23 (Homebrew build).

Fixes applied:
- Added `src/test/resources/mockito-extensions/org.mockito.plugins.MockMaker`
  with content `mock-maker-subclass`.
- Added Surefire `<argLine>` in `pom.xml`:
  `-Djdk.attach.allowAttachSelf=true`, `-XX:+EnableDynamicAgentLoading`,
  `--add-opens java.base/java.lang=ALL-UNNAMED`,
  `--add-opens java.base/java.util=ALL-UNNAMED`.
  
This fix also enables previously failing test suites (AuthenticationServiceTest, etc.).

## Evidence

- `mvn test -Dtest=TripSearchServiceTest` → 13 tests, 0 failures, 0 errors.
- `mvn test` (full backend suite) → all tests pass, 0 failures, 0 errors.
- `mvn package -DskipTests` → BUILD SUCCESS.

