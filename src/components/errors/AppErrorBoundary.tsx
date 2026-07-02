import { Component, type ErrorInfo, type ReactNode } from "react";
import { ACCENT_BTN } from "../../lib/accentStyles";
import { recordErrorReport } from "../../lib/errorReporting";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    recordErrorReport({
      message: error.message,
      stack: `${error.stack ?? ""}\n${info.componentStack}`,
      source: "react",
      timestamp: new Date().toISOString(),
    });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-neutral-950 p-6 text-neutral-100">
          <div className="max-w-md rounded-xl border border-neutral-800 bg-neutral-900/90 p-5">
            <h1 className="text-lg font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-neutral-400">
              IronFocus hit an unexpected error. You can reload the app or copy
              the error details from Settings → Help.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className={`mt-4 rounded-md px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] ${ACCENT_BTN}`}
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
