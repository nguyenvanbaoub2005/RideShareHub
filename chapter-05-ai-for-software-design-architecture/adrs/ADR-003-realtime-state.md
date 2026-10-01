# ADR-003 — Durable State with Ephemeral Realtime Delivery

**Status:** Accepted

## Decision

Persist Trip/Booking/stop transitions in PostgreSQL. Publish realtime notifications only after the durable change commits. On connection/reconnection, clients fetch a current snapshot before consuming new events.

Driver location samples are operational data with a retention policy still requiring human decision. WebSocket is the proposed transport; polling remains a fallback for the demo.

## Consequences

Dropped events do not corrupt business state. Clients must tolerate duplicates and use entity version/time to ignore stale updates.
