# Chapter 6 — AI Coding & Pair Programming

## Goal

Implement RideShareHub as small end-to-end slices from the accepted requirements, design and architecture.

## Workflow

1. Draft and approve `docs/implementation-plan.md`.
2. Select one task/slice with explicit acceptance checks and non-goals.
3. Add a failing automated test where behavior can be tested.
4. Implement the smallest change that satisfies the task.
5. Run relevant verification and record fresh evidence.
6. Human reviews the diff, evidence and limitations before the next slice.

## Rules

- Do not implement before the plan review gate.
- Accepted Chapter 3–5 artifacts are authoritative.
- Inspect current code and the Chapter 4 prototype before each relevant slice.
- Do not silently decide an open product policy.
- Build success does not prove the user journey.
- Do not report a test as passed unless it was run and its output inspected.

## Outputs

- `docs/implementation-plan.md`
- Source code, migrations, tests and build configuration created after plan approval.
- Fresh verification evidence in commits or task records.
