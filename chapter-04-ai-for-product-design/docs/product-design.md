# RideShareHub — Product Design

**Status:** Accepted

## 1. Selected Direction

`Transit Ledger` is the accepted prototype direction because the core journey contains capacity, state and ownership information that benefits from compact, explicit presentation.

## 2. Direction

A warm off-white canvas, deep ink navigation, blue route accents and amber warnings. Surfaces resemble a clear travel ledger: strong typographic hierarchy, compact facts and visible state labels rather than decorative dashboard metrics.

## 3. Component Rules

- Role rail identifies the current review perspective.
- Journey stepper shows progress without becoming application navigation authority.
- Search form leads the Passenger view; Trip cards keep comparison fields aligned.
- Booking uses a focused panel and preserves fields on recoverable failure.
- Stop cards use numbered order plus explicit Pickup/Dropoff text.
- Live/stale status always combines icon/color with text.
- Primary action is singular per task region; destructive/cancelling behavior is not prototyped without policy.

## 4. Prototype Conventions

- Role switching and “advance demo” controls exist only to review the end-to-end flow.
- Mock approval, publication, booking, stop progression and rating reset on reload.
- A simulated capacity conflict is available to inspect recovery.
- No prototype action establishes Booking confirmation, cancellation, fare formula or production client decisions.

## 5. Rejected Alternatives

- `Route Atlas`: strongest journey orientation, but risks making a fake map look authoritative.
- `Warm Relay`: friendliest Passenger tone, but lower density for Company/Driver operations.

## 6. Known Review Limits

No human concept selection, browser screenshots, screen-reader pass, touch-device pass or production data test has occurred. These remain review evidence gaps, not passed checks.

## 7. Review Gate

Accepted by the human on 2026-09-22. Known evidence limits remain recorded and must not be reported as passed checks.
