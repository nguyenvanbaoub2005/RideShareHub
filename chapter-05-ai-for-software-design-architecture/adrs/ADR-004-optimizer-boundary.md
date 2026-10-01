# ADR-004 — Advisory Route Optimizer

**Status:** Accepted

## Decision

Expose optimization as a synchronous request with strict timeout for MVP. The optimizer receives a snapshot of valid stops/constraints and returns a proposal only. The core API revalidates pickup precedence and capacity, then stores the proposal and its ordered stop references separately from operational TripStops. A proposal has `PROPOSED`, `ACCEPTED`, `REJECTED` or `SUPERSEDED` status and does not change Trip/Booking business state merely because it exists.

## Consequences

Provider/solver failure is recoverable without cancelling Bookings. Manual override and proposal approval persistence remain open product decisions.
