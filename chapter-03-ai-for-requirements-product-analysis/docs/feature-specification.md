# RideShareHub — Feature Specification

**Status:** Accepted

## 1. Boundary

This specification derives from the accepted PRD. It specifies behavior without selecting screens, API, storage or technology.

## 2. Shared Contract

- Every protected action checks identity, role and ownership.
- Invalid or rejected writes cause no partial business-state change.
- Failure identifies a corrective action and retains safe retry input where possible.
- Retrying cannot silently duplicate a Booking or completed transition.
- Durable state survives reload; realtime events are not its sole source.

## 3. Company Onboarding

Company submits valid registration → system persists `PENDING` → Admin approves/rejects → result is persisted and visible. Invalid submission is correctable; non-Admin review is rejected. Only `APPROVED` enables publication.

## 4. Setup and Publication

Approved company creates Vehicle, Driver and Route, then a `DRAFT` Trip. Publication validates ownership, required scheduling data and overlap constraints. Failure keeps it non-public and identifies correction; success makes it searchable.

## 5. Search and Selection

Passenger enters origin, destination and date → system returns matching bookable Trips → Passenger filters/sorts and chooses. No match is an explicit empty result. Search failure is retryable and changes no Booking. Availability is revalidated at Booking.

## 6. Booking and Capacity

Passenger provides seat count and pickup/dropoff. System validates Trip, authority, input and fare, atomically checks capacity, creates Booking/stops, records fare and updates availability. A losing concurrent request consumes no seats. Final cancellation releases seats once. An uncertain retry cannot silently duplicate the request.

**Open:** immediate confirmation versus company acceptance; specific-seat selection; cancellation policy.

## 7. Stop Planning

System sends valid stops and constraints to optimizer → receives proposal → verifies pickup precedence/capacity → human reviews. No valid proposal or provider failure leaves Trip/Booking unchanged and is retryable.

**Open:** provider, time/deviation constraints and manual override workflow.

## 8. Driver Execution

Assigned Driver accepts → readies → starts → marks each stop `ARRIVED` then `COMPLETED`. Pickup changes related passenger state; dropoff is permitted only afterward. Trip completes only when all required active stops resolve. Invalid/duplicate transition returns current state without reversing completed work.

## 9. Realtime Tracking

Active Driver sends location; authorized Passenger observes latest location, Trip state, next stop and ETA when available. Disconnection is shown as stale/disconnected. Reconnect loads authoritative state then resumes updates.

**Open:** update frequency and retention.

## 10. Fare and Rating

Fare estimate is visible before Booking and retained afterward; missing pricing is explicit. Only Passenger with related `COMPLETED` Booking can rate company/Driver.

**Open:** fare formula, payment simulation, rating scale/editability/limit.

## 11. Invariants

- `activeBookedSeats <= tripCapacity`.
- Final cancellation releases capacity once.
- Pickup precedes corresponding dropoff.
- Driver/Vehicle have no overlapping active Trips.
- Trip cannot complete with unresolved active stops.
- Completed work does not silently return to pending.
- Optimizer output alone changes no Trip/Booking state.

## 12. Design Handoff

Design must represent authorization denial, pending approval, search empty/error, capacity conflict, stop-proposal failure, invalid Driver transition, realtime stale/recovery and rating eligibility. Any prototype-only convention must be labelled and must not become a product decision.

## 13. Review Gate

Accepted by the human on 2026-09-22. Its explicitly unresolved policies remain open.
