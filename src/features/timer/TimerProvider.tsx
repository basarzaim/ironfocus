import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { useFocusTimer } from "./hooks/useFocusTimer";

type FocusTimerValue = ReturnType<typeof useFocusTimer>;

const FocusTimerContext = createContext<FocusTimerValue | null>(null);

type FocusTimerProviderProps = {
  children: ReactNode;
};

export function FocusTimerProvider({ children }: FocusTimerProviderProps) {
  const timer = useFocusTimer();

  return (
    <FocusTimerContext.Provider value={timer}>
      {children}
    </FocusTimerContext.Provider>
  );
}

export function useFocusTimerContext(): FocusTimerValue {
  const ctx = useContext(FocusTimerContext);
  if (!ctx) {
    throw new Error("useFocusTimerContext must be used within FocusTimerProvider");
  }
  return ctx;
}

