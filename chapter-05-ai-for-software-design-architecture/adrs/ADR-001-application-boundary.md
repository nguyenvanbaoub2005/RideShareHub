# ADR-001 — Modular Monolith for Core Business Logic

**Status:** Accepted

## Context

V1 has a four-week target, one core journey and strong transactional rules across Trips, Bookings and stops.

## Decision

Use one Spring Boot modular monolith for identity, company, fleet, route, Trip, Booking, execution, rating and administration. Keep package/module boundaries explicit. Route optimization may run as a separately deployable Python service because its runtime/solver differs.

## Alternatives

- Full microservices: independent scaling but excessive distributed consistency and operations for V1.
- One application including optimizer: simplest deployment but couples Java business lifecycle to solver/runtime concerns.

## Consequences

Seat reservation and state transitions can use one PostgreSQL transaction. Modules can be extracted later only with evidence. The optimizer boundary needs timeout/failure handling.
