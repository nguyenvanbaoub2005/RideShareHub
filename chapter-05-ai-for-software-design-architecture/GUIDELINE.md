# Chapter 5 — AI for Software Design & Architecture

## Goal

Turn accepted product behavior and design into the smallest implementable architecture package for RideShareHub V1.

## Workflow

1. Compare architecture options and state runtime assumptions.
2. Draft architecture, context, data model, API contract and ADRs.
3. Review traceability, ownership, authorization, concurrency, consistency and deployment complexity.
4. Human accepts, rejects or defers each decision.

## Rules

- Product requirements and design remain authoritative for behavior.
- Do not silently resolve open product decisions.
- Prefer the four-week end-to-end journey over speculative services.
- Architecture and ADRs remain `Proposed` until human approval.
- Only the human may mark the package `Accepted`.

## Outputs

- `docs/software-architecture.md`
- `design/system-context.mmd`
- `design/data-model.mmd`
- `design/database-schema.dbml`
- `api/openapi.yaml`
- `adrs/`
