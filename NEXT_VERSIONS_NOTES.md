# IronFocus – Post Beta v0.1 Notes (Unreleased Changes)

This document tracks changes made **after** the IronFocus **Beta v0.1** baseline, so we can later group them into proper versions (e.g. v0.2, v0.3, 1.0).

Nothing here is versioned yet – this is a working list for future releases.

---

## Persistence

- **Local persistence for logs and categories**
  - Implemented in `AppStateProvider` using `window.localStorage`.
  - Keys:
    - `ironfocus.categories.v1`
    - `ironfocus.logs.v1`
  - On startup:
    - Tries to load categories/logs from these keys.
    - Falls back to default categories + empty logs if not present or invalid.
  - On every change:
    - Automatically saves updated categories and logs back to localStorage.
  - Effect:
    - Logs and categories now survive:
      - App restarts.
      - Dev server restarts.
      - Rebuilds of the Tauri app (same user/machine).

---

## Timer & Focus Dial Behavior

- **Stop behavior**
  - Pressing **Stop** while the timer is running:
    - Freezes the display at the exact time.
    - Stores a session snapshot as `lastSession`.
    - Shows the **Save Log** panel so the session can be saved immediately.
  - Pressing **Start** again (for a focus preset) continues from the stopped time; the previous snapshot is replaced next time you Stop.

- **Preset focus pause vs. auto-completion**
  - Focus presets now distinguish:
    - **Auto-complete**: timer reaches target seconds → session duration equals preset, triple beep, notification, ready to log.
    - **Manual stop**: Stop pressed before target seconds → single beep, snapshot with the shorter duration, ready to log and resumable.

- **Custom dial resolution**
  - Dial now maps to **1-minute steps** between **1 and 180 minutes**.
  - Dragging the circle:
    - Snaps to whole minutes (no more 5-minute jumps).
    - Always clamps between 1 and 180 minutes.

- **Slimming arc granularity**
  - While a focus block is running:
    - The amber conic-gradient arc is driven by **remaining full minutes**, computed from `targetSeconds - elapsedSeconds`.
    - Arc length updates in **1-minute steps**, visually slimming slightly at each minute tick.

- **Dial label change while running**
  - When a focus preset is active or paused:
    - Center text switches to:
      - Top: `CUSTOM`
      - Middle: remaining minutes (2-digit)
      - Bottom: `MIN REMAINING`
  - When idle/planning:
    - Center minutes reflect the configured custom minutes and bottom label is `min`.

- **Dial interaction locking**
  - The custom circle is only draggable when:
    - Timer mode is `idle`.
    - Not running.
    - No session is ready to log.
    - No last session is present.
  - While stopwatch or focus is running or has a stopped session pending, the dial:
    - Visually dims slightly.
    - Ignores pointer drag to avoid accidental preset changes mid-session.

---

## Notification Sounds & Desktop Notifications

- **Beep patterns**
  - **Stop (manual)**:
    - When timer is running and **Stop** is pressed:
      - Play **one short beep** (single sine tone).
  - **Timer done (auto complete)**:
    - When a focus preset reaches its target time automatically:
      - Play **three quick beeps** in sequence.
      - Only triggers when the session duration equals the preset target (i.e. not for early manual stops).

- **Desktop-style notifications**
  - Uses the browser **Notification API** (works inside the Tauri webview).
  - On automatic focus completion:
    - Shows notification:
      - Title: `IronFocus`
      - Body: `Your focus block is complete.`
    - If permission is not yet granted:
      - Requests notification permission once; if granted, shows the notification.

---

## Categories – Drag & Drop Reordering

- **State support**
  - Added `reorderCategories(sourceId, targetId)` in `AppStateProvider`:
    - Moves the category with `sourceId` to the index of `targetId`.
    - Updates the categories array (and implicitly its localStorage representation).

- **UI behavior**
  - `CategoriesPanel`:
    - Each category row is now **draggable**.
    - Dragging one row and dropping it on another:
      - Calls `reorderCategories(draggingId, targetId)`.
      - Reorders the list so the dragged category appears above the drop target.
    - The dragged item fades slightly (`opacity`) while dragging to give a visual cue.

- **Impact**
  - The new order is reflected everywhere categories are listed.
  - Order survives app restarts due to the persistence mechanism.

---

## Versioning & Settings (Meta)

- **Product info config**
  - New file: `src/config/productInfo.ts`:
    - `name`: `"IronFocus"`
    - `shortName`: `"IronFocus"`
    - `channel`: `"Beta"`
    - `version`: `"0.1.0"`
    - `label`: `"Beta v0.1"`
  - Intended as a single place to bump name/channel/version/label for future releases.

- **Settings page**
  - `SettingsPage` now uses `PRODUCT_INFO` to display:
    - `IronFocus Beta v0.1`.
    - Version: `0.1.0 (Beta v0.1)`.
    - Channel: `Beta`.
  - Also includes a short note that:
    - This is the first beta baseline.
    - Future settings (data retention, export, theme, persistence controls) will be added later.

---

## Notes for Future Versioning

- When we decide to cut a new version (e.g. **v0.2.0**):
  - We can:
    - Update `PRODUCT_INFO.version` and `PRODUCT_INFO.label`.
    - Update `tauri.conf.json` version.
    - Add a new section to this file summarizing changes included in that version.
    - Optionally rename or archive this section under a concrete version heading.
- Until then, this file acts as a **staging changelog** for all work done since **Beta v0.1**.

