# RideShareHub — Project Context

**Status:** Draft — Pending Human Review

## 1. Product Identity

Project name:

RideShareHub.

Product type:

Multi-operator shared ride booking platform.

Core concept:

Transport Companies publish shared trips.

Passengers search across multiple Transport Companies and book a suitable Trip.

Trips may contain multiple passenger pickup/dropoff points.

A Route Optimization capability assists with ordering these stops.

---

## 2. Product Is Not

RideShareHub is not primarily:

* parcel delivery logistics;
* freight transportation ERP;
* vehicle rental;
* private car marketplace;
* taxi booking where every passenger automatically receives a dedicated vehicle;
* pure ticket-selling application.

The central product domain is:

multi-operator shared passenger transportation.

---

## 3. Source Precedence

When information conflicts, use:

1. latest accepted human decision in canonical docs;
2. accepted Feature Specification;
3. accepted Product Requirements;
4. accepted Project Context;
5. accepted Project Brief;
6. accepted Architecture;
7. current implementation;
8. conversation history.

Chat history must not override accepted documentation.

If information is missing, do not invent a requirement.

---

## 4. Core Actors

### PASSENGER

Searches and books shared trips.

### TRANSPORT_COMPANY

Provides shared transportation services.

Owns/manages:

* vehicles;
* drivers;
* routes;
* trips.

### DRIVER

Executes trips assigned by Transport Company.

### ADMIN

Operates platform governance.

---

## 5. Domain Vocabulary

### TransportCompany

A transportation provider registered on the platform.

A company must be APPROVED before publishing Trips.

### Vehicle

A physical vehicle controlled by a TransportCompany.

Important attributes include:

* capacity;
* type;
* operational status.

### Driver

A person executing Trips for a TransportCompany.

### Route

A reusable route definition.

Example:

Da Nang → Hue.

Route is not a specific departure.

### Trip

A scheduled instance of Route.

Example:

Da Nang → Hue

2026-10-20

07:00.

Trip owns:

* vehicle;
* driver;
* seat capacity;
* departure time;
* fare information.

### Booking

Passenger reservation for a Trip.

Booking contains:

* seat count;
* pickup;
* dropoff;
* fare;
* status.

### TripStop

A physical stop in a Trip route.

Types:

PICKUP

DROPOFF.

### Seat Capacity

Maximum passenger seat capacity of a Trip's vehicle.

### Available Seats

Seats that can still be booked.

### Route Optimization

Process of determining an efficient and valid ordering of TripStops.

---

## 6. Core Product Flow

Transport Company:

Register
→ Approved
→ Vehicle
→ Driver
→ Route
→ Trip
→ Publish.

Passenger:

Search
→ Compare
→ Select Company/Trip
→ Book
→ Track
→ Ride
→ Complete.

Driver:

Receive Trip
→ Accept
→ Start
→ Pickup
→ Dropoff
→ Complete.

---

## 7. Core Invariants

No overbooking.

bookedSeats <= tripCapacity.

A pickup stop must occur before the corresponding dropoff stop.

A cancelled Booking must not consume seat capacity once cancellation is final.

A Transport Company that is not APPROVED cannot publish new Trips.

A Vehicle cannot execute multiple overlapping active Trips.

A Driver cannot execute multiple overlapping active Trips.

A Passenger must not be marked DROPPED_OFF before PICKED_UP.

A Trip cannot become COMPLETED while unresolved active passenger stops remain.

Completed operations must not silently return to PENDING.

---

## 8. Product Boundary

V1 is responsible for:

* authentication;
* role authorization;
* Transport Company registration;
* company approval;
* driver management;
* vehicle management;
* route management;
* trip scheduling;
* trip search;
* filtering;
* seat availability;
* booking;
* shared pickup/dropoff;
* route optimization;
* trip execution;
* realtime status/location;
* basic fare calculation;
* rating.

V1 is not responsible for:

* real bank settlement;
* legal KYC workflow;
* insurance;
* demand forecasting;
* surge pricing;
* advanced fraud detection;
* dynamic autonomous fleet dispatch.

---

## 9. Human Decisions

The platform supports multiple Transport Companies.

Passenger chooses which Transport Company/Trip to book.

Transport Companies create Trips.

The core V1 is FIXED/SCHEDULED shared trips.

AI/optimization does not decide whether a passenger must buy a particular Trip.

Route optimization assists with pickup/dropoff ordering.

Human/operator authority remains above optimizer recommendations.

The project prioritizes a complete end-to-end journey over broad feature count.

The intended MVP development time is 4 weeks.

---

## 10. Technical Assumptions — Not Yet Architecture Decisions

Potential backend:

Java + Spring Boot.

Potential database:

PostgreSQL.

Potential passenger/driver client:

React Native + TypeScript.

Potential Transport Company/Admin frontend:

React + TypeScript.

Potential optimization service:

Python + FastAPI.

Potential optimization engine:

OR-Tools or another routing solver.

Potential realtime transport:

WebSocket.

Potential deployment:

Docker.

These are technical assumptions.

They become canonical architecture only after Chapter 5 approval.

---

## 11. Important Concurrency Concern

Seat reservation is a critical shared resource.

Example:

Trip has 2 remaining seats.

Passenger A requests 2 seats.

Passenger B requests 2 seats at the same time.

The final state must never become:

4 seats confirmed.

The backend implementation must eventually provide an atomic seat-reservation rule.

Exact implementation is an architecture/engineering decision, not a Product Context decision.

---

## 12. Route Optimization Context

Optimization receives a valid Trip and confirmed/pending TripStops.

It may consider:

* vehicle starting point;
* pickup coordinates;
* dropoff coordinates;
* pickup ordering;
* passenger state;
* capacity;
* time constraints if defined.

At minimum:

PICKUP(passenger A)

must precede

DROPOFF(passenger A).

Optimization output is a proposed ordered route.

Do not silently change Booking or Trip business state merely because the optimizer returns a different route.

---

## 13. Realtime Context

Driver location is operational runtime information.

Realtime data must not become the only durable source of Trip state.

Trip state belongs to the backend database.

Realtime transport provides updated views of current state.

---

## 14. Agent Behaviour

Before any significant task:

read AGENTS.md.

Read:

docs/project-brief.md

docs/project-context.md.

Then read rules relevant to the task.

Agent must inspect existing repository state before proposing changes.

Agent must not invent product features.

Agent must distinguish:

FACT

DECISION

ASSUMPTION

OPEN QUESTION.

If a missing decision materially affects implementation:

surface it explicitly.

Do not convert an assumption into a requirement.

Do not rewrite unrelated modules.

Prefer small vertical slices.

Do not claim implementation success without verification evidence.

---

## 15. Fresh Session Test

A new coding-agent session that receives only:

* AGENTS.md;
* project-brief.md;
* project-context.md;

should be able to explain:

* what RideShareHub is;
* who uses it;
* what Transport Company means;
* difference between Route and Trip;
* how Passenger searches and books;
* what role optimization plays;
* what V1 explicitly excludes.

If the agent needs to infer core product behavior from previous chat history, this context package is incomplete.

---

## 16. Open Questions

Not yet canonical:

* mobile app split;
* frontend ownership;
* map provider;
* routing provider;
* fare formula;
* seat selection model;
* booking confirmation policy;
* cancellation policy;
* location update frequency;
* allowed detour;
* payment simulation;
* operator manual route override behavior.
