# RideShareHub — Implementation Plan

**Status:** Accepted

## 1. Objective

Deliver the accepted RideShareHub V1 core journey in four one-week sprints with two developers. Each sprint produces integrated, testable behavior rather than disconnected CRUD.

## 2. Accepted Inputs

- Chapter 3 Product Requirements and Feature Specification.
- Chapter 4 Transit Ledger Product Design and prototype.
- Chapter 5 Software Architecture, OpenAPI, database schema and ADRs.

## 3. Planning Decisions and Assumptions

### Decisions represented by this plan

- Backend: Spring Boot modular monolith.
- Database: PostgreSQL with Flyway migrations.
- Operations web: React + TypeScript.
- Optimizer: Python + FastAPI.
- Realtime: WebSocket plus REST snapshot recovery.
- CI: GitHub Actions for pull requests and pushes to `dev`.
- Local integration: Docker Compose.

### Accepted implementation decision

V1 uses one Expo/React Native project with role-based Passenger and Driver flows. This is an accepted implementation decision, not a retroactive product requirement.

### Deferred/optional behavior

- Notifications beyond realtime state/reconnect.
- Detailed Admin dashboard analytics.
- Incident/report workflow.
- Production deployment and automatic production release.

## 4. Repository Target

```text
RideShareHub/
├── backend/              # Spring Boot core API and WebSocket
├── web/                  # Company/Admin React application
├── mobile/               # Passenger/Driver Expo application
├── optimizer/            # Python/FastAPI optimization service
├── infra/                # Docker Compose and local configuration
└── .github/workflows/    # CI build/test workflows
```

This tree is created only after this plan is accepted.

## 5. Global Definition of Done

Every implementation task must satisfy all applicable checks:

1. Behavior traces to an accepted requirement and OpenAPI/schema contract.
2. Authorization and company/passenger/driver ownership are enforced server-side.
3. Database change uses a versioned Flyway migration and constraint where applicable.
4. Automated tests cover success and material failure paths in the proving layer.
5. API changes update OpenAPI or explicitly prove no contract change.
6. UI includes loading, empty, validation, failure and retry/recovery states where applicable.
7. No secrets, generated build output or local environment data are committed.
8. Focused tests, relevant module tests and build/type checks run successfully with fresh output.
9. Task uses its own branch and reviewable commit; limitations are recorded.

## 6. Branch Convention

Use one branch per task:

```text
feature/sp1-p1-01-auth-rbac
feature/sp2-p2-02-seat-concurrency
feature/sp3-p1-03-optimizer-integration
```

Do not share one long-lived feature branch across multiple unrelated tasks.

## 7. Sprint 1 — Foundation, Company and Trip

### Sprint outcome

An Admin can approve a company; the approved company can manage operational resources and publish a valid Trip. All projects build automatically in CI.

| ID | Owner | Layer | Task | SP | Depends on | Priority |
|---|---|---|---|---:|---|---|
| SP1-P1-01 | Person 1 | Backend | Authentication and RBAC | 2 | — | High |
| SP1-P1-02 | Person 1 | Backend | Company registration/approval and Vehicle API | 2 | SP1-P1-01, SP1-P2-01 | High |
| SP1-P1-03 | Person 1 | Web | Admin company approval flow | 2 | SP1-P1-02 | High |
| SP1-P1-04 | Person 1 | Web | Company profile and Vehicle flow | 2 | SP1-P1-02 | Medium |
| SP1-P1-05 | Person 1 | Web | Passenger registration and login page | 1 | SP1-P1-01 | Medium |
| SP1-P2-01 | Person 2 | Platform | Project skeleton, PostgreSQL, Flyway, Docker and baseline CI | 2 | — | High |
| SP1-P2-02 | Person 2 | Backend | Driver, Route and Trip APIs | 3 | SP1-P1-01, SP1-P1-02 | High |
| SP1-P2-03 | Person 2 | Web | Driver/Route and Trip management flow | 2 | SP1-P2-02 | High |
| SP1-P2-04 | Person 2 | Mobile | Expo skeleton, secure session boundary and role routing | 1 | SP1-P1-01 | Medium |
| SP1-P2-05 | Person 2 | Mobile | Driver home screen: assigned trip list and session routing | 1 | SP1-P2-04, SP1-P2-02 | High |

### Required details

- `SP1-P2-01`: Java/Node/Python builds, PostgreSQL health check, initial schema migration, secrets template and GitHub Actions without production deployment.
- `SP1-P1-01`: login/register, password hashing, JWT/session verification and all four roles; tests prove unauthorized/forbidden behavior.
- `SP1-P1-02`: `PENDING → APPROVED/REJECTED`; unapproved company cannot publish; Vehicle capacity/status constraints.
- `SP1-P1-05`: web login/register form for PASSENGER and TRANSPORT_COMPANY roles; validation, error state and redirect to role home.
- `SP1-P2-02`: ownership checks, Driver/Vehicle schedule-conflict validation and Trip publication rules.
- `SP1-P2-05`: Driver sees list of ASSIGNED trips after login; empty state; tap navigates to trip detail (SP3-P2-03 provides execution).

## 8. Sprint 2 — Search, Fare and Capacity-safe Booking

### Sprint outcome

Passenger can find a Trip, see its fare, create/cancel a Booking and the backend proves it cannot overbook under concurrent requests.

| ID | Owner | Layer | Task | SP | Depends on | Priority |
|---|---|---|---|---:|---|---|
| SP2-P1-01 | Person 1 | Backend | Trip search/filter API | 3 | SP1-P2-02 | High |
| SP2-P1-02 | Person 1 | Backend | V1 fare estimation | 1 | SP2-P1-01 | Medium |
| SP2-P1-03 | Person 1 | Mobile | Passenger search/filter flow | 2 | SP1-P2-04, SP2-P1-01 | High |
| SP2-P1-04 | Person 1 | Mobile | Trip detail and fare flow | 2 | SP2-P1-02, SP2-P1-03 | Medium |
| SP2-P1-05 | Person 1 | Web | Company Trip list and per-Trip Booking overview | 2 | SP1-P1-04, SP2-P2-01 | High |
| SP2-P2-01 | Person 2 | Backend | Booking lifecycle and seat release | 3 | SP1-P2-02, SP2-P1-02 | High |
| SP2-P2-02 | Person 2 | Backend | Atomic capacity, locking and idempotency | 2 | SP2-P2-01 | High |
| SP2-P2-03 | Person 2 | Mobile | Booking creation/status/cancellation flow | 2 | SP2-P1-04, SP2-P2-01 | High |
| SP2-P2-04 | Person 2 | Testing | Concurrent Booking integration test | 1 | SP2-P2-02 | High |
| SP2-P2-05 | Person 2 | Mobile | Passenger Booking history screen | 1 | SP2-P2-03 | Medium |
| SP2-P2-06 | Person 2 | Backend | Company Booking notification: polling endpoint for new Bookings | 1 | SP2-P2-01 | Low |

### Required details

- Booking commands require `Idempotency-Key`; retry returns the original outcome rather than duplicating a Booking.
- Capacity claim/release occurs in the same authoritative PostgreSQL transaction as Booking state change.
- The concurrency test starts with two remaining seats and submits two simultaneous two-seat requests; exactly one succeeds and capacity never becomes negative.
- Confirmation and cancellation policies that remain open must be represented by explicit configuration/placeholder boundary, not an invented business rule.
- `SP2-P1-05`: Company sees Trip list with DRAFT/PUBLISHED/FULL status badges; selects a Trip to view Bookings (PENDING/CONFIRMED/CANCELLED) with seat count and passenger name; no Booking mutation from this screen.
- `SP2-P2-05`: Passenger sees paginated list of own Bookings with status and trip summary; tap opens existing detail from SP2-P2-03.
- `SP2-P2-06`: Simple REST endpoint `GET /api/v1/companies/{id}/bookings/recent`; pushes are deferred to V2; explicitly marked out-of-scope for WebSocket in V1.

## 9. Sprint 3 — Shared Stops, Optimization and Realtime Execution

### Sprint outcome

Multiple Booking stops produce a reviewable route proposal; Driver executes valid pickup/dropoff transitions while Passenger receives recoverable realtime state.

| ID | Owner | Layer | Task | SP | Depends on | Priority |
|---|---|---|---|---:|---|---|
| SP3-P1-01 | Person 1 | Backend | TripStop creation and invariants | 2 | SP2-P2-01 | High |
| SP3-P1-02 | Person 1 | Optimizer | FastAPI optimization service and constraint tests | 3 | SP3-P1-01 | High |
| SP3-P1-03 | Person 1 | Backend | Optimizer integration and route-proposal review | 2 | SP3-P1-02 | High |
| SP3-P1-04 | Person 1 | Mobile | Passenger planned-stop/ETA view | 1 | SP3-P1-03 | Medium |
| SP3-P1-05 | Person 1 | Backend | Route-proposal review API (ACCEPT/REJECT by company) | 1 | SP3-P1-03 | High |
| SP3-P2-01 | Person 2 | Backend | Driver Trip lifecycle and stop transitions | 3 | SP1-P2-02, SP3-P1-01 | High |
| SP3-P2-01b | Person 2 | Backend | Driver assignment accept/reject API and state enforcement | 1 | SP3-P2-01 | High |
| SP3-P2-02 | Person 2 | Backend | WebSocket, location ingestion and snapshot API | 2 | SP3-P2-01 | High |
| SP3-P2-03 | Person 2 | Mobile | Driver Trip, stop and GPS flow | 2 | SP1-P2-04, SP3-P2-01, SP3-P2-02 | High |
| SP3-P2-04 | Person 2 | Mobile | Passenger live tracking, stale state and reconnect | 1 | SP3-P2-02 | High |
| SP3-P2-05 | Person 2 | Mobile | Driver accept/reject assignment screen | 1 | SP3-P2-01b, SP3-P2-03 | High |

### Required details

- Driver progression is `ASSIGNED → ACCEPTED → READY`; `START` changes Trip to `IN_PROGRESS`; completion requires resolved active stops.
- Pickup completion precedes related dropoff; stale/duplicate commands cannot reverse completed state.
- Optimizer output is stored as `PROPOSED`, reviewed as `ACCEPTED/REJECTED`, and prior proposals may become `SUPERSEDED`; it never directly mutates Booking state.
- Realtime connection loss displays stale/disconnected state; reconnect fetches a REST snapshot before resuming events.
- `SP3-P1-05`: Company reviews optimizer proposal via `POST /trips/{id}/proposals/{pid}/accept` or `/reject`; only PENDING proposals are actionable; rejected proposal does not alter Booking state.
- `SP3-P2-01b`: `POST /driver/trips/{id}/accept` and `/reject`; only ASSIGNED trips are actionable; enforces driver identity match; rejection returns trip to unassigned (policy boundary — not invented).
- `SP3-P2-05`: Driver sees pending assignment with trip details; confirms ACCEPT/REJECT with explicit confirmation dialog; result is reflected immediately without requiring app restart.

## 10. Sprint 4 — Rating, Basic Operations and Release Evidence

### Sprint outcome

The complete journey is demonstrable with rating, basic Admin monitoring, automated regression checks, API documentation and reproducible local builds.

| ID | Owner | Layer | Task | SP | Depends on | Priority |
|---|---|---|---|---:|---|---|
| SP4-P1-01 | Person 1 | Backend | Completed-Booking rating API | 2 | SP3-P2-01 | Medium |
| SP4-P1-02 | Person 1 | Web | Basic Admin Trip/Booking monitoring | 2 | SP1-P1-03, SP3-P2-02 | Medium |
| SP4-P1-02b | Person 1 | Web | Admin Driver and User listing | 1 | SP4-P1-02 | Medium |
| SP4-P1-03 | Person 1 | Mobile | Passenger rating flow | 1 | SP4-P1-01 | Medium |
| SP4-P1-04 | Person 1 | Testing | Module regression tests and OpenAPI review | 3 | SP4-P1-01, SP4-P1-02 | High |
| SP4-P1-04b | Person 1 | Testing | Web component and integration tests (Company, Admin flows) | 2 | SP4-P1-02, SP4-P1-02b | Medium |
| SP4-P2-01 | Person 2 | Testing | End-to-end core journey | 3 | SP3-P1-03, SP3-P2-04, SP4-P1-01 | High |
| SP4-P2-02 | Person 2 | DevOps | Docker/CI hardening, optimizer health check and clean-environment check | 2 | SP1-P2-01, SP4-P2-01 | High |
| SP4-P2-03 | Person 2 | Mobile | Passenger/Driver UI and realtime regression polish | 2 | SP3-P2-03, SP3-P2-04 | Medium |
| SP4-P2-04 | Person 2 | Optional | Minimal incident/report spike | 1 | SP3-P2-01 | Low |

### Required details

- Basic monitoring is limited to accepted operational visibility; it does not introduce analytics requirements.
- Incident/report is a stretch task and must be skipped before any High-priority task is reduced.
- CI build/test is execution evidence only for checks actually run; E2E must exercise Company → Trip → Search → Booking → Proposal → Driver → Pickup/Dropoff → Complete → Rating.
- `SP4-P1-02b`: Admin sees paginated list of Users (all roles) and Drivers with status; read-only; no bulk action or mutation from this screen (R-13).
- `SP4-P1-04b`: Cover Company approval flow (approve/reject renders correct state), Vehicle CRUD form validation and Trip list page; use testing-library/react; no screenshot-only tests.
- `SP4-P2-02`: Optimizer FastAPI container must be included in Compose with health check; CI Pytest must run against the container; clean `docker compose up` from scratch must reproduce a passing build.

## 11. CI Build Matrix

The baseline workflow runs on pull requests and pushes to `dev`:

| Component | Checks |
|---|---|
| Backend | compile, unit tests, integration tests, migration startup |
| Web | install, lint, type-check, tests, production build |
| Mobile | install, lint, type-check, tests |
| Optimizer | lint/type check where configured, Pytest |
| Contract | OpenAPI parse/lint and contract consistency check |
| Containers | Docker image build; Compose smoke check when runtime permits |

Automatic production deployment is excluded from Chapter 6 MVP unless separately approved.

## 12. First Vertical Slice for Approval

Start with `SP1-P2-01` and `SP1-P1-01` as the foundation, then complete:

```text
Company registration
→ Admin sees PENDING application
→ Admin approves
→ Company observes APPROVED
→ unapproved publish attempt remains forbidden
```

Before implementation, the slice owner must provide exact tests and commands available in the generated project.

## 13. Risks

- Eight story points per person per sprint is a planning cap, not evidence of actual velocity.
- Mobile client topology remains an assumption until explicitly confirmed.
- Map provider, fare formula, Booking confirmation/cancellation and rating scale remain open; tasks must use explicit boundaries rather than invent policy.
- Optimizer, realtime and four client roles create schedule risk; optional dashboard/report work is cut first.

## 14. Review Gate

Approved by the human on 2026-10-01:

1. the repository target structure;
2. one shared role-based mobile app for V1;
3. task ownership, dependency and priority;
4. CI checks and no automatic production deployment;
5. the first vertical slice.

The plan is `Accepted`; implementation may proceed one reviewed slice at a time.
