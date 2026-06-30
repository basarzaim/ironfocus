import { useState, type ReactElement } from "react";
import { AppShell, type AppViewKey } from "./components/layout/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { LogsPage } from "./pages/LogsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { AppStateProvider } from "./state/AppStateProvider";
import { PreferencesProvider } from "./state/PreferencesProvider";
import { FocusTimerProvider } from "./features/timer/TimerProvider";
import { ThemeProvider } from "./state/ThemeProvider";
import { OnboardingModal } from "./components/onboarding/OnboardingModal";
import { isOnboardingCompleted } from "./lib/onboarding";

function AppInner() {
  const [view, setView] = useState<AppViewKey>("focus");
  const [showOnboarding, setShowOnboarding] = useState(
    () => !isOnboardingCompleted(),
  );

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
      content = (
        <SettingsPage onReplayOnboarding={() => setShowOnboarding(true)} />
      );
      break;
    case "focus":
    default:
      content = <DashboardPage />;
  }

  return (
    <>
      <AppShell activeView={view} onChangeView={setView}>
        {content}
      </AppShell>
      <OnboardingModal
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </>
  );
}

function App() {
  return (
    <AppStateProvider>
      <PreferencesProvider>
        <ThemeProvider>
          <FocusTimerProvider>
            <AppInner />
          </FocusTimerProvider>
        </ThemeProvider>
      </PreferencesProvider>
    </AppStateProvider>
  );
}

export default App;
