# RideShareHub — Product Requirements

**Status:** Accepted

## 1. Product Outcome

RideShareHub V1 demonstrates one complete multi-operator shared-ride journey: an approved company publishes a scheduled Trip, a Passenger books seats with pickup/dropoff points, a Driver executes it, and the Passenger rates the completed ride.

This PRD defines product behavior, not UI, API, database or architecture.

## 2. Sources and Actors

Sources: Accepted Project Brief, Accepted Project Context, and newer explicit human decisions.

- **PASSENGER:** search, book, track and rate.
- **TRANSPORT_COMPANY:** manage resources and publish Trips.
- **DRIVER:** execute assigned Trips.
- **ADMIN:** approve companies and provide basic oversight.

## 3. Goals

1. Compare scheduled Trips from multiple companies.
2. Operate a shared Trip with different pickup/dropoff points.
3. Protect capacity and stop-order invariants, including concurrency.
4. Make the journey observable through completion.
5. Prefer one end-to-end MVP over broad disconnected CRUD.

## 4. Requirements

### R-01 — Identity and authorization — Must

Support the four accepted roles and enforce role and resource ownership. Protected unauthenticated or unauthorized actions are rejected without changing data. A company cannot manage another company's resources; a Driver updates only assigned Trips.

### R-02 — Company approval — Must

Company registration starts `PENDING`; Admin changes it to `APPROVED` or `REJECTED`. Only `APPROVED` companies publish Trips. Every transition is persisted and visible to the affected company.

### R-03 — Vehicle and Driver management — Must

A company manages its own Vehicles and Drivers, including capacity, license and status information. Invalid required data and cross-company ownership changes are rejected.

### R-04 — Route and Trip management — Must

A company creates reusable Routes and scheduled Trips with Route, departure, Vehicle, Driver, capacity and fare data. Publishing rejects missing data, unapproved companies and overlapping active Driver/Vehicle assignments. Trip states remain distinguishable: `DRAFT`, `PUBLISHED`, `FULL`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.

### R-05 — Search and comparison — Must

Passenger searches by origin, destination and date across companies. Bookable results expose company, departure, fare, vehicle type, available seats and rating when available, with accepted filters/sorts. Passenger chooses the Trip.

### R-06 — Booking — Must

A Booking records Passenger, Trip, seat count, pickup, dropoff, fare estimate and status. Invalid/unbookable Trips reject new Bookings. A Passenger cannot modify another Passenger's Booking. States remain distinguishable: `PENDING`, `CONFIRMED`, `PICKED_UP`, `COMPLETED`, `CANCELLED`, `NO_SHOW`.

### R-07 — Seat integrity — Must

Active booked seats never exceed capacity. Successful active Booking consumes seats; final cancellation releases them once; a failed request consumes none. Concurrent requests admit only a capacity-safe subset and available seats never becomes negative.

### R-08 — Shared stops and route proposal — Must

Stops identify Booking/Passenger and `PICKUP` or `DROPOFF`. Pickup precedes its dropoff and the ordered proposal respects capacity. Optimization failure changes no business state. A human remains above the optimizer recommendation.

### R-09 — Trip execution — Must

Only assigned Driver accepts, starts and updates a Trip. Passenger cannot be dropped off before pickup. Trip cannot complete with unresolved active stops. Completed operations do not silently return to pending.

### R-10 — Realtime tracking — Must for demo

During an active Trip, authorized Passengers can observe latest Driver location, Trip status, next stop and ETA when available. Connection loss does not mutate durable state; reload/reconnect retrieves authoritative state.

### R-11 — Fare — Must

Passenger sees a fare estimate before Booking and the Booking retains it. Missing pricing is visible rather than invented. V1 does not settle real money.

### R-12 — Rating — Should

Only a Passenger with the related completed Booking can rate its company and Driver; the rating remains associated with that journey.

### R-13 — Basic administration — Should

Admin can inspect users, companies, Drivers and Trips and perform accepted basic oversight. Non-Admin actors cannot use platform-wide administration actions.

## 5. Cross-cutting Rules

- The authoritative backend protects invariants; client controls are insufficient.
- Failure is visibly different from success and does not claim an unpersisted change.
- Critical state reloads after refresh or connection loss.
- Core controls do not rely only on color or pointer drag.
- No quantitative SLA is implied until accepted.

## 6. V1 Exclusions

Real payment/settlement, automated KYC, insurance, chat, referral, loyalty, large coupons, surge pricing, demand forecasting, advanced fraud detection, automatic Trip creation, dynamic passenger insertion, autonomous dispatch, multi-country and freight/rental workflows.

## 7. Core Acceptance

V1 is demonstrable when company approval, resource/Trip setup, multi-company search, capacity-safe Booking, shared stop ordering, Driver execution, realtime observation, completion and rating form one consistent journey.

## 8. Open Decisions

1. Client split among four roles.
2. Map/routing providers.
3. Fare formula.
4. Seat quantity versus specific-seat selection.
5. Immediate versus company-approved Booking.
6. Cancellation cutoff/consequences.
7. Location frequency and retention.
8. Allowed pickup/dropoff deviation and time windows.
9. Fare-only versus payment simulation.
10. Manual route override workflow.
11. Minimum Admin report workflow.
12. Rating scale and submission limit.

## 9. Traceability

| Accepted capability | Requirement |
|---|---|
| Roles and company approval | R-01–R-02 |
| Vehicle, Driver, Route and Trip | R-03–R-04 |
| Search, Booking and seats | R-05–R-07 |
| Shared stops and execution | R-08–R-10 |
| Fare, rating and administration | R-11–R-13 |

## 10. Review Gate

Accepted by the human on 2026-09-22. Deferred open decisions must not be silently resolved later.
