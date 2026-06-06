import { useState, type ReactElement } from "react";
import { AppShell, type AppViewKey } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { LogsPage } from "./pages/LogsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AppStateProvider } from "./state/AppStateProvider";
import { FocusTimerProvider } from "./features/timer/TimerProvider";
import { ThemeProvider } from "./state/ThemeProvider";

function AppInner() {
  const [view, setView] = useState<AppViewKey>("dashboard");

  let content: ReactElement;
  switch (view) {
    case "logs":
      content = <LogsPage />;
      break;
    case "categories":
      content = <CategoriesPage />;
      break;
    case "analytics":
      content = <AnalyticsPage />;
      break;
    case "settings":
      content = <SettingsPage />;
      break;
    case "dashboard":
    default:
      content = <DashboardPage />;
  }

  return (
    <AppShell activeView={view} onChangeView={setView}>
      {content}
    </AppShell>
  );
}

function App() {
  return (
    <AppStateProvider>
      <ThemeProvider>
        <FocusTimerProvider>
          <AppInner />
        </FocusTimerProvider>
      </ThemeProvider>
    </AppStateProvider>
  );
}

export default App;