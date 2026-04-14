# Polyrepo Extraction Status Update (2026-04-14)

## 1) Open extraction-related branches in `Ditto190/worldmonitor-dashboard-app`

> Canonical branch names in `PLAN.md`/`BRANCHES.md` use `plan/*`, `pkg/*`, `ext/*`.
> Current live branches are Copilot-created equivalents.

| Live branch | Canonical plan branch | Purpose | Status |
|---|---|---|---|
| `copilot/planinitiate-polyrepo` | `plan/initiate-polyrepo` | Polyrepo kickoff docs (`PLAN.md`, `BRANCHES.md`) | PR opened |
| `copilot/packagescore-types` | `pkg/core-types` | `@worldmonitor/core-types` extraction | PR opened |
| `copilot/review-open-branches-and-prs` | `plan/status-review` | Status review + sequencing update | PR opened |

## 2) Open pull requests (focus: plan kickoff + package extraction)

| PR | Title | Head branch | Scope | Status |
|---|---|---|---|---|
| [#2](https://github.com/Ditto190/worldmonitor-dashboard-app/pull/2) | docs: initiate polyrepo extraction with canonical PLAN and BRANCHES governance docs | `copilot/planinitiate-polyrepo` | Program kickoff docs | Open (draft) |
| [#1](https://github.com/Ditto190/worldmonitor-dashboard-app/pull/1) | feat: create `packages/core-types` — `@worldmonitor/core-types` foundation package | `copilot/packagescore-types` | First package extraction | Open |
| [#3](https://github.com/Ditto190/worldmonitor-dashboard-app/pull/3) | [WIP] Provide status review for polyrepo extraction plan | `copilot/review-open-branches-and-prs` | Status reporting + next-sequence initiation | Open (draft) |

## 3) Planned package/extension branch status (from PLAN/BRANCHES)

### Core + infrastructure

| Planned branch | Package | Current status |
|---|---|---|
| `pkg/core-types` | `@worldmonitor/core-types` | PR opened |
| `pkg/core-config` | `@worldmonitor/core-config` | queued |
| `pkg/core-utils` | `@worldmonitor/core-utils` | queued |
| `pkg/panel-framework` | `@worldmonitor/panel-framework` | queued |
| `pkg/data-services` | `@worldmonitor/data-services` | queued |
| `pkg/map-core` | `@worldmonitor/map-core` | queued |
| `pkg/map-layers` | `@worldmonitor/map-layers` | queued |
| `pkg/ai-services` | `@worldmonitor/ai-services` | queued |
| `pkg/auth` | `@worldmonitor/auth` | queued |
| `pkg/news-core` | `@worldmonitor/news-core` | queued |
| `pkg/layout-shell` | `@worldmonitor/layout-shell` | queued |
| `pkg/workers` | `@worldmonitor/workers` | queued |
| `pkg/i18n` | `@worldmonitor/i18n` | queued |
| `pkg/proto-client` | `@worldmonitor/proto-client` | queued |

### Extensions

| Planned branch | Package | Current status |
|---|---|---|
| `ext/news` | `@worldmonitor/ext-news` | queued |
| `ext/finance` | `@worldmonitor/ext-finance` | queued |
| `ext/geopolitics` | `@worldmonitor/ext-geopolitics` | queued |
| `ext/military` | `@worldmonitor/ext-military` | queued |
| `ext/climate` | `@worldmonitor/ext-climate` | queued |
| `ext/infrastructure` | `@worldmonitor/ext-infrastructure` | queued |
| `ext/aviation` | `@worldmonitor/ext-aviation` | queued |
| `ext/cyber` | `@worldmonitor/ext-cyber` | queued |
| `ext/tech` | `@worldmonitor/ext-tech` | queued |
| `ext/wellbeing` | `@worldmonitor/ext-wellbeing` | queued |
| `ext/consumer` | `@worldmonitor/ext-consumer` | queued |
| `ext/webcams` | `@worldmonitor/ext-webcams` | queued |

## 4) Program flow summary

- **Running now:**
  - Kickoff governance docs (`plan/initiate-polyrepo`) — PR #2 open (draft)
  - `@worldmonitor/core-types` extraction (`pkg/core-types`) — PR #1 open
  - Status/coordination update — PR #3 open (draft)
- **Queued:** all remaining `pkg/*` and `ext/*` branches listed above.
- **Next in sequence after `core-types`:** `pkg/core-config` then `pkg/core-utils`.

## 5) Initiation of next extraction sequence (`core-config` -> `core-utils`)

Initiated in this status cycle as follows:

1. **`pkg/core-config`** marked as immediate next extraction target (first after `core-types`).
2. **`pkg/core-utils`** marked as second-next extraction target (starts immediately after `core-config` branch/PR is opened).
3. Queue order for the foundation track is now explicitly: `core-types` (open PR) -> `core-config` (next) -> `core-utils` (next).

Recommended immediate execution commands for maintainers/automation:

```bash
git checkout main
git pull

git checkout -b pkg/core-config
# extract @worldmonitor/core-config
# open PR: feat(pkg/core-config): extract @worldmonitor/core-config

git checkout main
git checkout -b pkg/core-utils
# extract @worldmonitor/core-utils
# open PR: feat(pkg/core-utils): extract @worldmonitor/core-utils
```
