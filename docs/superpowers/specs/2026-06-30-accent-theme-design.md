# Accent Theme System — Design Spec

**Date:** 2026-06-30  
**Status:** Approved (brainstorming)  
**Scope:** Settings UI, UI accent tokens, Iron Core palette sync

## Summary

Replace the binary Classic / Rose accent toggle with a two-tier appearance model:

1. **Classic (recommended)** — the product’s default amber iron identity.
2. **Six named accent presets** — color-only swatches with no visible labels (pink, blue, purple, green, red, turquoise).

Rose is retired as a named theme; existing rose users migrate to the pink preset. The outer Iron Core shell stays unchanged; only core veins, flood, and aura colors follow the selected accent.

## Goals

- Unify UI accent color with Iron Core vein animation per preset.
- Keep Classic as the prominent, recommended default.
- Offer limited, curated colors (no free color picker).
- Preserve dark/light color mode independently.
- Migrate existing users without data loss.

## Non-Goals

- Custom hex / hue slider / full color picker.
- Per-theme Voronoi bake or GLB re-export.
- Per-accent shell material changes.
- Separate Iron Core palettes for light mode in v1.

## User Decisions (Brainstorming)

| Question | Decision |
|----------|----------|
| Custom theme freedom | Limited preset swatches only |
| Classic role | Default / recommended product identity |
| Rose naming | Removed; pink swatch only (no label) |
| Preset count | Classic + 6 accents (7 total) |

## Settings UI — Appearance

### Layout (recommended: two-tier)

```
Appearance
├── Classic (recommended)     [card, selected by default]
│   └── subtitle: default iron-core look
├── Or pick an accent color   [6 circular swatches, no text labels]
│   └── pink · blue · purple · green · red · turquoise
├── Color mode                [Dark | Light — unchanged]
└── Visual quality            [AppearanceSection — unchanged]
```

### Interaction

- Selecting **Classic** deselects any accent swatch.
- Selecting any **swatch** deselects the Classic card.
- Change applies immediately (no Apply button, no restart).
- Swatches use `aria-label` only (e.g. “Blue accent”) for accessibility.

### Removed

- Accent theme toggle: Classic | Rose

## Data Model

```ts
type AccentId =
  | "classic"
  | "pink"
  | "blue"
  | "purple"
  | "green"
  | "red"
  | "turquoise";
```

### Persistence

- New persisted field: `accentId` (Tauri store / localStorage).
- `ThemeProvider` sets `html[data-accent="<id>"]` on change.
- Export/import JSON includes `accentId`.

### Migration

| Legacy value | New `accentId` |
|--------------|----------------|
| `theme: "classic"` | `classic` |
| `theme: "rose"` | `pink` |
| `theme: "wife"` | `pink` |
| invalid / missing | `classic` |

## UI Architecture

### Problem

~16 files branch on `isRose ? pink : amber`. This does not scale to seven accents.

### Solution

CSS custom properties driven by `data-accent`:

```css
html[data-accent="classic"] { --if-accent: …; --if-accent-muted: …; … }
html[data-accent="blue"]     { --if-accent: …; … }
```

Components consume `var(--if-accent-*)` instead of Tailwind `pink-*` / `amber-*` ternaries.

`colorMode` (dark/light) remains orthogonal; accent tokens may vary per mode where contrast requires it.

### Key files to touch

- `src/state/ThemeProvider.tsx` — `AccentId`, migration, DOM attribute
- `src/index.css` — accent token definitions
- `src/pages/SettingsPage.tsx` — new Appearance controls
- Components currently using `isRose` — migrate to tokens or `useAccent()`

## Iron Core Architecture

### Voronoi bake

`rgb-compose.png` is a data map (R = distance, G = cavity AO). **No new model export** is required for accent colors.

### Shader palettes

New file: `src/features/timer/iron/ironThemePalettes.ts`

Each `AccentId` maps to:

- `hot`, `amber`, `orange`, `seep`, `shell`, `deep`, `floodHot` (and related tuning)

### Shader update

`applyIronCoreUniforms` must modulate colors from the palette base using heat/depth/glow — **not** hardcoded orange `setRGB` values.

### Unchanged

- `cracked_shell.glb` + `IRON_SCENE_TUNING.shell` (gray metal shell).

### Aura (same release)

- `IronCoreParticles` — shift HSL hue from accent palette.
- `IronCoreHaze` — `armColor` / `dustColor` from palette.

### Art rule

Accent color applies to veins and lava flood; cell bodies (`deep`, `black`, neutral `shell` in ramp) stay dark/neutral to avoid a monochromatic “blue ball” look.

## Component Boundaries

| Unit | Responsibility |
|------|------------------|
| `ThemeProvider` | Persist `accentId`, set `data-accent`, expose `useAccent()` |
| `accentTokens.css` / `index.css` | UI token values per accent × mode |
| `ironThemePalettes.ts` | 3D palette values per accent |
| `SettingsPage` Appearance | Classic card + swatch grid |
| `applyIronCoreUniforms` | Runtime shader colors from palette + animation state |

## Error Handling

- Invalid `accentId` on load or import → fallback `classic`.
- Missing palette entry → log once in dev, use classic palette.

## Testing

| Type | Cases |
|------|-------|
| Unit | Migration paths; invalid id → classic; export/import round-trip |
| Manual visual | All 7 accents: Settings, Timer, Sidebar, one chart |
| Iron Core | classic, pink, blue: idle, mid-session, flood end |
| Persist | Restart retains selection |
| a11y | Swatch keyboard nav; `aria-label`; contrast in dark and light |

## Rollout

Prefer **single release** (UI + Core together) so users never see blue UI with orange core.

If split:

1. **PR-1:** `accentId`, Settings UI, CSS tokens, `isRose` removal.
2. **PR-2:** Iron Core + particles/haze palettes.

## Success Criteria

1. Classic appears as recommended; six unlabeled swatches visible.
2. Accent change updates UI and core veins in sync; shell unchanged.
3. Former rose users land on pink preset automatically.
4. No `isRose` / `theme === "rose"` branches remain in source.

## Open Items

None — brainstorming decisions are complete. Implementation plan is the next step.
