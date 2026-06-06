import { useState } from "react";
import { TimerPanel } from "../components/dashboard/TimerPanel";

export function DashboardPage() {
  const [focusMode, setFocusMode] = useState(false);

  return (
    <TimerPanel
      focusMode={focusMode}
      onToggleFocusMode={() => setFocusMode((v) => !v)}
    />
  );
}
