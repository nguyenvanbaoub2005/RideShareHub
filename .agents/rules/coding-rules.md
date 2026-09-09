# Coding Agent Rules

## Before Implementation

Do not implement product behaviour before:

requirements,
design,
and architecture

have reached their required review gates.

## Inspect First

Before modifying existing implementation:

1. inspect relevant files;
2. understand existing behaviour;
3. identify the smallest vertical slice;
4. propose a plan;
5. define verification.

## Scope

Do not rewrite unrelated code.

Do not create speculative abstractions.

Do not introduce new dependencies without justification.

## Verification

Do not claim:

- fixed
- working
- completed
- passed

without fresh verification evidence.

## Debugging

When a failure exists:

reproduce
→ inspect evidence
→ identify root cause
→ correct
→ verify.

Do not stack speculative patches.