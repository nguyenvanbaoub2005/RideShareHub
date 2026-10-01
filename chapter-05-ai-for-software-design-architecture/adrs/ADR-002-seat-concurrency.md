# ADR-002 — Atomic Seat Reservation

**Status:** Accepted

## Decision

Reserve seats inside a database transaction using a conditional atomic update or row lock on Trip, then insert the Booking with an idempotency key. The transaction succeeds only when remaining capacity covers the request.

## Consequences

The database remains the capacity authority. API retries can return the prior result for the same Passenger/idempotency key. Contention is localized to a Trip row; load testing must validate the final query strategy.
