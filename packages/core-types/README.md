# @worldmonitor/core-types

Shared TypeScript type definitions for the WorldMonitor ecosystem.

## Overview

This package is the **foundation leaf package** of the WorldMonitor component ecosystem. It contains all shared TypeScript interfaces, enums, type definitions, and minimal runtime constants used across the platform — including `PanelConfig`, `MapLayers`, `DataSourceId`, `NewsItem`, and 100+ other types.

### Key characteristics

- **Minimal runtime footprint** — one exported runtime constant (`NATURAL_EVENT_CATEGORIES`); everything else is pure type definitions
- **Zero internal imports** — no imports from other `src/` directories
- **Leaf node** in the dependency graph — all other `@worldmonitor/*` packages depend on this one

## Installation

This package is published to [GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry).

Add the following to your `.npmrc`:

```
@worldmonitor:registry=https://npm.pkg.github.com
```

Then install:

```bash
npm install @worldmonitor/core-types
```

## Usage

```typescript
import type { PanelConfig, MapLayers, DataSourceId, NewsItem } from '@worldmonitor/core-types';
```

## Included Types

The package re-exports all types from the original `src/types/index.ts` of the WorldMonitor dashboard, including:

- `DataSourceId` — union of all supported data source identifiers
- `PanelConfig` / `AppState` — dashboard panel and application state types
- `MapLayers` — map layer configuration
- `NewsItem` / `Feed` / `PropagandaRisk` — news and RSS types
- `ThreatClassification` / `ThreatLevel` / `EventCategory` — threat assessment types
- `CyberThreat` / `APTGroup` — cyber intelligence types
- `Earthquake` / `NuclearFacility` / `Pipeline` — geospatial feature types
- `AIDataCenter` / `InternetOutage` / `Spaceport` — infrastructure types
- `SocialUnrestEvent` — protest and civil unrest types
- `EconomicCenter` / `CriticalMineralProject` — economic geography types
- And many more — see `src/index.ts` for the full list

The published package also includes an ambient module declaration for `globe.gl` in its distributed type definitions (`dist/globe-gl.d.ts`), referenced automatically via `/// <reference path="./globe-gl.d.ts" />` in the generated `dist/index.d.ts`.

## Dependency Graph Position

```
@worldmonitor/core-types   ← this package (leaf node, no deps)
         ↑
@worldmonitor/geo-utils
@worldmonitor/core-utils
@worldmonitor/panel-framework
@worldmonitor/map-core
         ...
```

All other `@worldmonitor/*` packages import their base types from here.

## Build

```bash
npm run build      # Produces dist/ (CJS + ESM + .d.ts)
npm run typecheck  # Type-check without emitting
npm run clean      # Remove dist/
```

## License

AGPL-3.0-or-later — see [LICENSE](./LICENSE).
