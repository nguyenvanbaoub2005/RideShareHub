# RideShareHub — Product Design Brief

**Status:** Accepted

## 1. Design Problem

Four actors must understand one shared journey without losing ownership, capacity or Trip state. Passenger needs fast comparison and confidence; Company needs operational setup; Driver needs a low-distraction stop sequence; Admin needs clear approval state.

## 2. Prototype Boundary

The prototype demonstrates the core journey with local mock state. Its role switch is a **review convention**, not a production role-switching feature or client-topology decision. It has no backend, real map, optimizer, authentication, payment or persistence.

## 3. Core Journeys

- Admin reviews and approves a pending company.
- Company reviews resources and publishes a Trip.
- Passenger searches, compares and books seats with pickup/dropoff.
- Company/Driver reviews the proposed stop sequence.
- Driver progresses pickup/dropoff stops.
- Passenger observes progress and rates a completed ride.

## 4. Information Hierarchy

1. Current review role and journey progress.
2. Page-specific primary task.
3. State/status and invariant-sensitive information.
4. Primary action, recovery action and contextual details.

## 5. Interaction Contract

- Search has explicit initial, results, empty and failure states.
- Trip cards expose company, departure, vehicle, fare, seats and rating.
- Booking retains entered locations after validation/capacity failure.
- Stop order visually pairs pickup/dropoff and never implies invalid precedence.
- Driver actions expose current and next valid transition.
- Tracking distinguishes live, stale and unavailable data.
- Rating appears only after completed Booking.

## 6. Visual Direction Candidates

- **Transit Ledger:** dense, calm operational clarity.
- **Route Atlas:** map-inspired spatial journey emphasis.
- **Warm Relay:** approachable cards with strong handoff/status cues.

No external visual reference was supplied or inspected. Concepts are original CSS explorations and must be reviewed by the human.

## 7. Accessibility and Responsive Rules

- Semantic controls, visible labels/focus and status text independent of color.
- Keyboard-operable role navigation, forms, Trip selection and actions.
- Errors announced and placed near the affected task.
- At narrow widths, comparison cards stack; no critical action is clipped.
- Reduced motion removes nonessential animation.

## 8. Exclusions

No production auth, actual maps/routing, payment, company analytics, chat, V2 matching or architecture/client split decision.

## 9. Review Gate

Accepted by the human on 2026-09-22. Transit Ledger is the selected direction.
