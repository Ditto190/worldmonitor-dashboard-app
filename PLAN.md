# Polyrepo Extraction Plan Initiation

This document formally initiates the polyrepo-as-branches extraction program requested by maintainers and stakeholders. It is the canonical planning root for all package and extension branch work.

## Scope and Strategy

We will execute a **polyrepo-as-branches** model inside this repository:

- each reusable package/extension is developed on a dedicated long-lived branch
- branches are merged into `main` through reviewable PRs
- extracted artifacts are published to **GitHub Packages**
- domain features ship as pluggable extension branches/packages

This preserves a single operational repository while allowing package-level ownership, release cadence, and parallel delivery.

## Package Taxonomy

### Core packages (foundation)

- `@worldmonitor/core-types`
- `@worldmonitor/core-config`
- `@worldmonitor/core-utils`
- `@worldmonitor/panel-framework` (includes an optional Next.js App Router-ready React adapter, additive to the current Preact runtime)
- `@worldmonitor/data-services`

### Infrastructure packages

- `@worldmonitor/map-core`
- `@worldmonitor/map-layers`
- `@worldmonitor/ai-services`
- `@worldmonitor/auth`
- `@worldmonitor/news-core`
- `@worldmonitor/layout-shell`
- `@worldmonitor/workers`
- `@worldmonitor/i18n`
- `@worldmonitor/proto-client`

### Domain extension packages (plugin model)

- `@worldmonitor/ext-news` (first extraction priority)
- `@worldmonitor/ext-finance` (second extraction priority)
- `@worldmonitor/ext-geopolitics`
- `@worldmonitor/ext-military`
- `@worldmonitor/ext-climate`
- `@worldmonitor/ext-infrastructure`
- `@worldmonitor/ext-aviation`
- `@worldmonitor/ext-cyber`
- `@worldmonitor/ext-tech`
- `@worldmonitor/ext-wellbeing`
- `@worldmonitor/ext-consumer`
- `@worldmonitor/ext-webcams`

## Dependency Graph (Target)

```text
@worldmonitor/core-types
  -> @worldmonitor/core-config
  -> @worldmonitor/core-utils
  -> @worldmonitor/data-services
  -> @worldmonitor/panel-framework
  -> @worldmonitor/map-core (+ @worldmonitor/map-layers)
  -> @worldmonitor/ext-*
  -> @worldmonitor/layout-shell
```

Rules:

- `core-types` must stay leaf-level and stable
- extensions depend on framework/services; framework never depends on extensions
- app shell composes extensions through manifests and runtime registration

## Extension Plugin Design

Each extension exports an `ExtensionManifest` with:

- extension metadata (`id`, `name`, `version`)
- panel registrations (lazy component loaders)
- optional map layer registrations
- optional service factories

Host apps (WorldMonitor and downstream projects) consume only selected manifests to compose dashboards by use case.

## Branch Naming Convention

### Plan and coordination

- `plan/initiate-polyrepo` (this branch)
- `plan/<topic>` for planning/program docs

### Core and infrastructure packages

- `pkg/core-types`
- `pkg/core-config`
- `pkg/core-utils`
- `pkg/panel-framework`
- `pkg/data-services`
- `pkg/map-core`
- `pkg/map-layers`
- `pkg/ai-services`
- `pkg/auth`
- `pkg/news-core`
- `pkg/layout-shell`
- `pkg/workers`
- `pkg/i18n`
- `pkg/proto-client`

### Domain extensions

- `ext/news`
- `ext/finance`
- `ext/geopolitics`
- `ext/military`
- `ext/climate`
- `ext/infrastructure`
- `ext/aviation`
- `ext/cyber`
- `ext/tech`
- `ext/wellbeing`
- `ext/consumer`
- `ext/webcams`

### Optional follow-up branches

- `release/<package>/<version>` for controlled cutovers
- `hotfix/<package>/<short-desc>` for urgent production fixes

## Release Process

### Packages

1. Merge package branch to `main` via reviewed PR.
2. Build/typecheck/tests must pass.
3. Publish package to **GitHub Packages** under `@worldmonitor/*`.
4. Tag release (`<package>-vX.Y.Z`) and document changelog impact.

### Extensions

- Extensions are developed in `ext/*` branches and published as `@worldmonitor/ext-*` packages.
- Host apps pin extension versions explicitly.
- Breaking extension changes require migration notes in PR description.

## Critical Constraints for Collaborators

- Keep changes scoped to the active package/extension branch; avoid unrelated refactors.
- Respect dependency direction: core -> framework/services -> extensions -> shell.
- Edge Functions in `api/*.js` remain self-contained and must not import from `src/` or `server/` runtime-incompatible paths.
- Do not edit generated `src/generated/` artifacts by hand; regenerate via proto workflow when required.
- Include docs updates for any public contract, extension manifest shape, or release process change.
- PR titles should use conventional prefixes (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`) and include branch/package scope.

## Source Context

This plan records and formalizes the previously agreed extraction direction:

- polyrepo approach implemented through package/extension branches
- GitHub Packages as distribution registry
- Next.js App Router-compatible React adapter priority in `panel-framework` as an additive integration layer (not a replacement for the existing Preact app architecture)
- extraction order beginning with `ext-news`, followed by `ext-finance`
