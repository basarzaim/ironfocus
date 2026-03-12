# IronFocus – Beta v0.1

IronFocus is a desktop focus companion that helps you plan and run deep work sessions, capture structured logs, and analyze your focus time over days and weeks. This repository contains the **Beta v0.1** baseline that future versions will build on.

> Status: **Beta v0.1** (local-only, single-user, no persistence yet)

---

## Stack

- **Shell**: Tauri 2
- **Frontend**: React + TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts

---

## Features in Beta v0.1

- **Focus Timer**
  - Stopwatch mode and preset focus blocks (30–180 minutes).
  - Custom time selection from 1 to 180 minutes via circular dial.
  - Circle arc slims down as remaining minutes decrease.
  - Start / Stop / Reset controls.
  - On automatic completion of a focus block:
    - Three short beeps.
    - Desktop-style notification (`IronFocus – Your focus block is complete.`).
  - On Stop while running:
    - One short beep.
    - Session is captured and can be saved as a log, with time frozen on screen and resumable.

- **Quick Log**
  - Add manual log entries with:
    - Title
    - Category
    - Tags
    - Start / end times
    - Optional notes

- **Logs Page**
  - Full table of all logs with:
    - Search (title + notes).
    - Category filter.
    - Date range filters (From / To).
    - Sorting by date (asc/desc) and duration (asc/desc).
  - Range shortcuts:
    - All, Today, Week, Month.
    - Navigation buttons to move across periods.
    - Human-readable range label (`Week • Mar 5 – Mar 11, 2026`).
  - Edit and delete existing logs.

- **Categories**
  - Create, rename, delete categories.
  - Assign colors via color picker.
  - Category colors power:
    - Pills in Today’s Logs and Logs table.
    - Category Distribution chart.

- **Analytics**
  - Last 7 / Last 30 days range selector with week/month navigation.
  - **Weekly Hours** bar chart:
    - Minutes per day, aligned to local dates.
    - Empty-state overlays when no sessions in range.
  - **Category Distribution** chart:
    - Pie or Bars variant.
    - Horizontal / vertical toggle for bars.
  - **Focus Summary & Stats Cards**:
    - Total minutes and deep work minutes (sessions ≥ 60m).
    - Sessions count and average duration.
    - Average minutes per day in window.
    - Deep work ratio and top category.
  - All analytics follow the selected range and navigation.

- **Dashboard**
  - Focus Timer (top-left).
  - Quick Log (below timer).
  - Today’s Logs with category pills and durations.
  - Compact stats and charts sidebar.

- **Settings**
  - Displays **IronFocus Beta v0.1** version info and channel.
  - Notes future settings areas (data retention, export, theme, persistence).

---

## What is intentionally *not* in Beta v0.1

These are planned for future versions and **not implemented** yet:

- Persistent storage of logs and categories (data is in-memory only).
- Cloud sync, accounts, or multi-device support.
- Export/import of data (CSV/JSON).
- Onboarding or in-app tutorial.
- Light mode or theme switching.
- Advanced analytics (goals, streaks, habits).
- Automatic updates and multi-platform builds beyond the current Windows desktop build.

For a more detailed overview, see `BETA_v0.1_SUMMARY.md`.

---

## Running the app locally

Prerequisites:

- Node.js (LTS)
- Rust toolchain (for Tauri)

Install dependencies:

```bash
npm install
```

Run the Vite dev server with Tauri:

```bash
npm run tauri dev
```

This launches the IronFocus desktop app with hot reload.

---

## Building the desktop app (Windows)

From the project root:

```bash
npm run tauri build
```

This produces installers under:

- `src-tauri/target/release/bundle/nsis/` – `.exe` installer
- `src-tauri/target/release/bundle/msi/` – `.msi` installer

You can share the NSIS `.exe` with other Windows users to install IronFocus Beta.

---

## Versioning & Product Info

Core versioning metadata is centralized in:

- `src/config/productInfo.ts`

For Beta v0.1:

- `name`: `IronFocus`
- `version`: `0.1.0`
- `channel`: `Beta`
- `label`: `Beta v0.1`

Future releases (e.g. `Beta v0.2`, `v1.0`) can update this file and the Tauri config version to track new builds.

