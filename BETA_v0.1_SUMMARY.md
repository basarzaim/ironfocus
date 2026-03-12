# IronFocus – Beta v0.1 Summary

## A. Product Overview

IronFocus is a focused-work companion app that helps you plan, run, and review deep work sessions on your desktop. It combines a stopwatch / focus timer, structured logging, category-based analytics, and a clean dashboard into one dark, minimal console.

This document describes the **Beta v0.1** baseline that future versions will build on.

## B. Current Features

- **Focus Timer**
  - Stopwatch mode and preset focus blocks (30–180 minutes).
  - Large circular dial for choosing custom focus duration (1–180 minutes).
  - Visual countdown arc that slims down as minutes elapse.
  - Start, Stop, and Reset controls.
  - When a focus block finishes:
    - Three short beeps are played.
    - A desktop-style notification is shown (`IronFocus – Your focus block is complete.`).
  - When Stop is pressed:
    - One short beep is played.
    - A log-conversion panel appears with captured duration.
    - The timer display freezes at the stopped time, and can be resumed from that point.

- **Session to Log Conversion**
  - Finished sessions can be converted into structured log entries:
    - Title
    - Category
    - Duration (derived from timer)
    - Optional notes

- **Quick Log (Manual Entries)**
  - Create logs without running the timer.
  - Fields: title, category, tags, start/end times, notes.
  - Validation and inline error feedback.

- **Logs Management**
  - Full Logs page with:
    - Search (title + notes).
    - Category filter.
    - Sort by date (asc/desc) and duration (asc/desc).
    - Date range filters (From / To).
    - Edit & delete for existing logs.
  - Range quick filters:
    - All, Today, Week, Month.
    - Navigation buttons (‹ / ›) to move across days/weeks/months.
    - Human-readable range label (e.g. `Week • Mar 5 – Mar 11, 2026`).

- **Categories**
  - Category management page:
    - Create, rename, delete categories.
    - Assign a color to each category via color picker.
  - Category colors are used throughout the app:
    - Pills in Today’s Logs.
    - Pills in the Logs table.
    - Category distribution charts.

- **Analytics**
  - Analytics page with:
    - Range selector: Last 7 days / Last 30 days.
    - Week and month navigation with proper local date handling.
    - Weekly Hours chart:
      - Bars for minutes per day.
      - Proper weekday/month alignment.
      - Empty-state overlays when no data in the selected range.
    - Category Distribution chart:
      - Pie and bar modes.
      - Horizontal/vertical layout toggle for bars.
      - Category colors reflected in the chart.
    - Focus Summary and Stats Cards:
      - Total minutes.
      - Deep work minutes (sessions ≥ 60 minutes).
      - Sessions count.
      - Average session duration.
      - Average minutes per day in the window.
      - Deep work ratio and most focused category.
    - All analytics respect the selected week/month window and navigation offsets.

- **Dashboard**
  - Focus Timer block (primary).
  - Quick Log below timer.
  - Today’s Logs list:
    - Only today’s sessions.
    - Category pills and duration.
  - Compact stats cards summarizing:
    - Today
    - Last 7 days
    - Deep work
  - Small weekly hours and category distribution panels.

- **Styling & UX**
  - Dark, ZaimStrength-inspired theme with amber highlights.
  - Custom dark scrollbars.
  - Sidebar with app identity and navigation.
  - Contextual empty states for Logs and Analytics.
  - Keyboard shortcuts (defined earlier in the project) for common actions.

## C. Existing Pages

- **Dashboard**
  - Focus Timer
  - Quick Log
  - Today’s Logs
  - Summary stats + compact charts

- **Analytics**
  - Range selector (7 / 30 days) with navigation.
  - Weekly Hours chart.
  - Category Distribution chart.
  - Focus Summary and Stats Cards.

- **Logs**
  - Quick Log (manual entry) at top.
  - Filters (search, category, date range, sort).
  - Range controls (All / Today / Week / Month) with navigation.
  - Editable logs table.

- **Categories**
  - Category list with color pickers.
  - Add / rename / delete categories.

- **Settings**
  - Version and channel information for IronFocus Beta v0.1.
  - Placeholder text for future preferences (data retention, export, theme, persistence).

## D. Known Limitations (Beta v0.1)

- Data is stored only in memory for this beta session:
  - There is no durable persistence to disk, database, or cloud yet.
  - All logs and categories reset when the app restarts.
- No authentication, accounts, or multi-device sync.
- No export/import of logs or analytics yet.
- No light mode or theming controls (dark mode only).
- No onboarding or in-app tutorial.
- No advanced statistics beyond the current summaries (e.g. streaks, goals).
- No localization / translation (English only).
- No mobile or web deployment targets defined (desktop only via Tauri).

## E. Planned Improvements (Post Beta v0.1)

The following areas are intentionally left for future versions:

- **Persistence & Sync**
  - Local persistence of logs and categories (e.g. file or lightweight database).
  - Optional cloud backup / sync.

- **Settings & Preferences**
  - Data retention policies.
  - Export (CSV/JSON) and import.
  - Theme controls (light/dark toggle, accent customization).

- **Product Experience**
  - First-run onboarding or walkthrough.
  - In-app help, tips, or documentation.
  - More granular notification preferences.

- **Analytics Enhancements**
  - Goal tracking (e.g. daily/weekly target minutes).
  - Streaks, trends, and deeper session quality metrics.
  - Additional chart types or comparative views.

- **Platform**
  - Mac and Linux distribution pipelines (currently only Windows build is validated).
  - Automatic update mechanism.

## F. Technical Stack

- **Runtime & Shell**
  - [Tauri 2](https://tauri.app/) for the desktop shell.

- **Frontend**
  - [React](https://react.dev/) with hooks.
  - [TypeScript](https://www.typescriptlang.org/).
  - [Vite](https://vitejs.dev/) bundler.
  - [Tailwind CSS](https://tailwindcss.com/) for styling.

- **Charts**
  - [Recharts](https://recharts.org/) for Weekly Hours and Category Distribution.

- **State & Types**
  - Local React state + context for logs and categories.
  - Typed models (`LogEntry`, `Category`, `TimerSession`) in `src/types`.

This summary reflects the baseline as of **IronFocus Beta v0.1** and is intended to guide future iterative releases (v0.2, v0.3, etc.).

