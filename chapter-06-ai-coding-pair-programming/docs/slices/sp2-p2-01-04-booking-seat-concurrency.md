# SP2-P2-01..04 — Booking Lifecycle, Atomic Seat Concurrency, Mobile Booking UI & Concurrency Test

Status: Implemented

Date: 2026-11-11

Branch: feature/sp2-booking-seat

## Scope

- **SP2-P2-01** — Booking Lifecycle BE (`com.ridesharehub.booking.*`):
  - Flyway migration `V5__bookings.sql` adding `booked_seats` and `version` to `trips`, `booking_status` enum, and `bookings` table with unique constraint `(passenger_id, idempotency_key)`.
  - `POST /api/v1/trips/{tripId}/bookings` — creates Booking (`CONFIRMED` or `PENDING` per `booking.policy.auto-confirm`), calculates estimated fare using V1 surcharge tiers, and enforces `Idempotency-Key`.
  - `GET /api/v1/bookings/me`, `GET /api/v1/bookings/{bookingId}`, `GET /api/v1/trips/{tripId}/bookings`.
  - `POST /api/v1/bookings/{bookingId}/cancel`, `POST /api/v1/bookings/{bookingId}/confirm`, `POST /api/v1/bookings/{bookingId}/no-show`.
  - Integrates live `trip.getBookedSeats()` into `TripSearchService` so search results reflect remaining capacity and demand-based fare surcharges.

- **SP2-P2-02** — Seat Concurrency / Locking & Idempotency:
  - Uses `@Lock(LockModeType.PESSIMISTIC_WRITE)` (`TripRepository.findByIdForUpdate`) inside the transactional boundary (`BookingService`).
  - Atomically claims seats on `Trip` (`PUBLISHED → FULL` when capacity is reached) and releases seats once upon cancellation or `NO_SHOW` (`FULL → PUBLISHED`).
  - Deduplicates retries via `(passenger_id, idempotency_key)`.

- **SP2-P2-03** — Mobile Passenger Booking UI:
  - Booking panel on `/(passenger)/trip/[tripId]` with seat count stepper (`1..availableSeats`), pickup/dropoff address inputs, total fare preview, validation, and safe retry preserving `Idempotency-Key`.
  - Passenger bookings screen `/(passenger)/bookings` displaying booking code, status badge, route/trip details, and interactive cancellation with confirmation prompt.

- **SP2-P2-04** — Concurrent Booking Integration Test:
  - `ConcurrentBookingTest` starts with a `PUBLISHED` Trip having 2 remaining seats and dispatches 2 simultaneous 2-seat booking requests via `CountDownLatch` and `ExecutorService`.
  - Proves that strictly 1 booking succeeds (`CONFIRMED`), 1 fails with `409 CONFLICT`, remaining seats never become negative (`bookedSeats == capacity`, `TripStatus.FULL`), and cancelling the winning booking releases the 2 seats for subsequent booking.

