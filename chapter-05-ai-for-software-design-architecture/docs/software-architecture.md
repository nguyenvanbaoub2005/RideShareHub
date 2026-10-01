# RideShareHub — Software Architecture

**Status:** Accepted

## 1. Architecture Goal

Support the accepted V1 journey with the smallest deployable system that protects authorization, ownership, seat capacity and Trip/stop state. This package proposes technical choices; it does not close open product policies.

## 2. Inputs

- Accepted Project Context.
- Accepted Product Requirements and Feature Specification.
- Accepted Transit Ledger Product Design and prototype boundary.
- Four-week MVP constraint.

## 3. Option Comparison

| Option | Strength | Cost/Risk | Recommendation |
|---|---|---|---|
| Modular monolith + optimizer adapter/service | One transaction boundary; low operational cost; solver isolated | Requires disciplined modules | Recommended |
| Full microservices | Independent scaling/deployment | Distributed transactions and excessive V1 operations | Reject for V1 |
| One process including optimizer | Simplest topology | Couples Java lifecycle to Python/solver assumptions | Keep as fallback only |

## 4. Proposed Technology Baseline

- Core API: Java + Spring Boot.
- Database: PostgreSQL.
- Web operations client: React + TypeScript.
- Passenger/Driver client: topology remains open; React Native + TypeScript is an assumption, not an accepted decision.
- Optimizer: Python + FastAPI with OR-Tools-compatible adapter.
- Realtime: WebSocket proposed; snapshot/polling fallback.
- Packaging: Docker; initial deployment may use one host/Compose-like topology.

## 5. Core Modules

| Module | Owns | Must not own |
|---|---|---|
| Identity & Access | User identity, role checks | Company approval policy |
| Company Governance | Company profile and approval | Fleet records |
| Fleet | Vehicles, Drivers, company ownership | Trip lifecycle |
| Route Catalog | Reusable Routes | Scheduled departure state |
| Trip Scheduling | Trip assignment/publication/conflicts | Passenger Booking state |
| Booking & Capacity | Booking lifecycle, atomic seats | Optimizer decisions |
| Stop Planning | TripStops, proposal validation | Automatic business transitions |
| Trip Execution | Driver/stop/Trip transitions | Search ranking |
| Tracking | Location ingestion and current snapshot | Durable Trip lifecycle authority |
| Rating | Completed-Booking eligibility and rating | Trip completion |
| Administration | Cross-platform read/oversight actions | Bypassing domain invariants |

Modules communicate through application services and domain events inside the monolith. Direct cross-module table mutation is forbidden.

## 6. Authorization Model

- Authentication establishes `userId` and role.
- Authorization checks role plus resource ownership/assignment on every protected command.
- `companyId` is derived from authenticated ownership/membership, not trusted from client input.
- Passenger Booking access is scoped by `passengerId`.
- Driver Trip updates require `trip.driverId` matching the authenticated Driver.
- Admin actions are explicit; Admin does not bypass state-machine invariants.

## 7. Data and Consistency

PostgreSQL is the system of record. Internal identifiers use auto-incrementing `bigint`; API identifiers use `int64` consistently. Foreign keys protect ownership references; unique constraints protect email, license plate and Booking idempotency scope. Version columns on mutable aggregate/state records support stale-write detection.

The detailed proposed schema is recorded in `design/database-schema.dbml`; `design/data-model.mmd` is its relationship overview. V1 keeps only core tables. Passenger profile extensions, notifications and detailed report workflow remain deferred until product behavior is accepted.

### Seat reservation transaction

1. Validate Trip is bookable.
2. Atomically claim requested seats only if capacity remains.
3. Insert Booking and its two stops.
4. Commit together; otherwise roll back all changes.

Final Booking cancellation releases capacity in the same transaction and only once.

### Trip and stop transitions

Commands validate allowed current→next transitions. Driver assignment uses `ASSIGNED → ACCEPTED → READY`; the `START` command then moves the Trip to `IN_PROGRESS`, followed by `COMPLETED`. Stop completion locks/versions the target stop, enforces pickup precedence, persists the transition, then publishes an after-commit notification. `REJECTED` assignment and `SKIPPED` stop behavior are not part of V1 without a later product decision.

### Schedule conflicts

Application validation checks overlapping active Trip windows for Driver and Vehicle. Database-level enforcement strategy needs an implementation spike because estimated duration and status affect the time range.

## 8. API Style and Errors

Use versioned JSON HTTP resources under `/api/v1`. Commands that may be retried accept `Idempotency-Key`. Errors use one envelope:

```json
{
  "code": "TRIP_CAPACITY_EXCEEDED",
  "message": "The trip no longer has enough seats.",
  "fieldErrors": [],
  "traceId": "..."
}
```

Expected categories: authentication, authorization, validation, conflict/stale state, not found, dependency unavailable and internal failure. No error may claim a write succeeded before durable commit.

## 9. Realtime and Location

HTTP commands persist business state. After commit, realtime delivery broadcasts a versioned notification to authorized Trip channels. Reconnect flow fetches `/trips/{id}/tracking` before resuming events. Location frequency and retention remain open product decisions.

## 10. Optimization Boundary

Core API owns valid Bookings/stops. Optimizer receives an immutable input snapshot and returns ordered stop IDs plus estimates. Core API validates the response, rejects unknown/duplicate/missing stops and verifies precedence/capacity. A valid result is stored as `route_proposals` plus `route_proposal_stops`; it is not written directly into the operational stop records. Proposal status distinguishes `PROPOSED`, `ACCEPTED`, `REJECTED` and `SUPERSEDED`. Timeout/unavailability returns a recoverable failure and changes no Trip/Booking state.

## 11. Deployment View

Proposed V1 containers:

1. React operations web static host.
2. Spring Boot API/realtime process.
3. PostgreSQL.
4. Optional FastAPI optimizer.

Clients never access PostgreSQL or optimizer directly. Secrets enter through environment/secret management and are not committed. TLS terminates at a reverse proxy or managed edge. Exact hosting remains undecided.

## 12. Observability and Safety

- Structured logs with trace ID, actor ID, entity ID and transition outcome; no passwords or unnecessary precise location.
- Metrics for Booking success/conflict, transaction latency, optimizer failure/timeout, realtime connections and invalid transitions.
- Health checks distinguish process health from external dependency readiness.
- Database migrations are versioned and backward-safe for the active release.

## 13. Product Decisions Still Open

Client split, providers, fare formula, seat selection, Booking confirmation, cancellation, location retention/frequency, detour/time windows, payment simulation, manual route override, Admin report workflow and rating rules. Architecture provides extension points but defines none of these policies.

## 14. Requirement Traceability

| Requirement | Architecture responsibility |
|---|---|
| R-01–R-02 | Identity/Access and Company Governance |
| R-03–R-04 | Fleet, Route Catalog, Trip Scheduling |
| R-05 | Query endpoints over published Trip projections |
| R-06–R-07 | Booking & Capacity transaction/idempotency |
| R-08 | Stop Planning and optimizer adapter |
| R-09–R-10 | Trip Execution, Tracking and after-commit events |
| R-11–R-13 | Pricing reference, Rating, Administration |

## 15. Review Findings to Resolve

1. Client topology remains open and blocks final frontend deployment diagram.
2. Booking confirmation policy affects when seats are consumed/released.
3. Manual optimizer override details remain open; proposal history and acceptance state are persisted separately from TripStops.
4. Location retention affects storage volume and privacy.
5. Schedule-overlap database enforcement needs a technical spike.

## 16. Review Gate

Accepted by the human on 2026-10-01. Open product decisions remain deferred and implementation must not silently choose them.
