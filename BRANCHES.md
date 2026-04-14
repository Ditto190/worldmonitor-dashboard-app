# Polyrepo Branch Registry

Canonical branch tracker for package and extension extraction work. Keep this file aligned with project board/issue tracker status.

## Status Legend

- `active`: currently in implementation/review
- `planned`: approved backlog, not started
- `blocked`: waiting on dependency or design decision
- `done`: merged to `main`

## Plan Branches

| Branch | Scope | Status | Notes |
|---|---|---|---|
| `plan/initiate-polyrepo` | Program kickoff docs (`PLAN.md`, `BRANCHES.md`) | active | Canonical root for extraction governance |

## Core/Infrastructure Package Branches

| Branch | Package | Status | Notes |
|---|---|---|---|
| `pkg/core-types` | `@worldmonitor/core-types` | planned | Extract stable type contracts first |
| `pkg/core-config` | `@worldmonitor/core-config` | planned | Variant/panel config split from app |
| `pkg/core-utils` | `@worldmonitor/core-utils` | planned | Shared utility extraction |
| `pkg/panel-framework` | `@worldmonitor/panel-framework` | planned | Includes Next.js App Router React adapter |
| `pkg/data-services` | `@worldmonitor/data-services` | planned | Runtime/bootstrap/caching abstractions |
| `pkg/map-core` | `@worldmonitor/map-core` | planned | DeckGL/Globe map runtime extraction |
| `pkg/map-layers` | `@worldmonitor/map-layers` | planned | Layer schema and shared map config |
| `pkg/ai-services` | `@worldmonitor/ai-services` | planned | AI analysis and worker-facing services |
| `pkg/auth` | `@worldmonitor/auth` | planned | Auth/entitlements/billing module |
| `pkg/news-core` | `@worldmonitor/news-core` | planned | Shared news ingestion pipeline |
| `pkg/layout-shell` | `@worldmonitor/layout-shell` | planned | Host shell + dashboard composition |
| `pkg/workers` | `@worldmonitor/workers` | planned | Worker protocol and packaging |
| `pkg/i18n` | `@worldmonitor/i18n` | planned | Locale framework and assets |
| `pkg/proto-client` | `@worldmonitor/proto-client` | planned | Generated RPC client artifacts |

## Extension Branches

| Branch | Package | Status | Notes |
|---|---|---|---|
| `ext/news` | `@worldmonitor/ext-news` | planned | First extension extraction priority |
| `ext/finance` | `@worldmonitor/ext-finance` | planned | Second extraction priority |
| `ext/geopolitics` | `@worldmonitor/ext-geopolitics` | planned | Domain extension |
| `ext/military` | `@worldmonitor/ext-military` | planned | Domain extension |
| `ext/climate` | `@worldmonitor/ext-climate` | planned | Domain extension |
| `ext/infrastructure` | `@worldmonitor/ext-infrastructure` | planned | Domain extension |
| `ext/aviation` | `@worldmonitor/ext-aviation` | planned | Domain extension |
| `ext/cyber` | `@worldmonitor/ext-cyber` | planned | Domain extension |
| `ext/tech` | `@worldmonitor/ext-tech` | planned | Domain extension |
| `ext/wellbeing` | `@worldmonitor/ext-wellbeing` | planned | Domain extension |
| `ext/consumer` | `@worldmonitor/ext-consumer` | planned | Domain extension |
| `ext/webcams` | `@worldmonitor/ext-webcams` | planned | Domain extension |

## Proposing a New Package/Extension Branch

1. Open a tracking issue describing motivation, scope, and dependency impacts.
2. Create a branch using conventions:
   - package: `pkg/<name>`
   - extension: `ext/<name>`
   - planning/meta: `plan/<topic>`
3. Open a PR with title format:
   - `plan: <topic>`
   - `feat(pkg/<name>): <summary>`
   - `feat(ext/<name>): <summary>`
   - `refactor(pkg/<name>): <summary>`
4. In PR description, include:
   - package/extension manifest changes
   - dependency graph changes
   - release impact (`@worldmonitor/<package>` on GitHub Packages)
   - migration notes if breaking
5. Update this file with status transitions (`planned` -> `active` -> `done` or `blocked`).

## Collaboration Rules

- One branch should target one package/extension concern.
- Keep PRs reviewable; split oversized extractions into incremental PRs.
- Do not merge extension branches that violate core dependency direction.
- Keep plan docs (`PLAN.md`, `BRANCHES.md`) in sync with actual branch reality.
