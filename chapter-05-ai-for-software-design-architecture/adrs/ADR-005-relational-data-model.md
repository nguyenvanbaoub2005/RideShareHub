# ADR-005 — Relational V1 Data Model and Identifiers

**Status:** Accepted

## Context

RideShareHub V1 requires transactional capacity checks, ownership constraints, state transitions and traceable route proposals. A detailed PostgreSQL ERD was supplied for architecture review.

## Decision

Use PostgreSQL tables with auto-incrementing `bigint` internal/public identifiers for V1 and expose them as OpenAPI `int64`. Keep core operational tables only. Store optimizer output in `route_proposals` and `route_proposal_stops`, not directly in `trip_stops`. Use `timestamptz`, foreign keys, explicit checks, uniqueness and version columns on mutable state records.

## Deferred tables and policies

Passenger profile extensions, notifications and detailed reports are excluded until their product behavior is accepted. Rating scale, Booking seat-holding statuses, location retention and manual override details remain open.

## Consequences

The schema and API identifiers stay consistent and simple for the MVP. Sequential identifiers must never be treated as authorization; every lookup still applies actor/ownership scope. A later public opaque-ID requirement would require an additional external identifier or a migration.
