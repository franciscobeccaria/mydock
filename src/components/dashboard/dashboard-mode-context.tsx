"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type DashboardMode = "view" | "edit";

type DashboardModeContextValue = {
  mode: DashboardMode;
  isEditing: boolean;
  setMode: (mode: DashboardMode) => void;
  toggleMode: () => void;
};

const DashboardModeContext = createContext<DashboardModeContextValue | null>(null);

export function DashboardModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<DashboardMode>("view");

  const toggleMode = useCallback(() => {
    setMode((current) => (current === "view" ? "edit" : "view"));
  }, []);

  const value = useMemo<DashboardModeContextValue>(
    () => ({ mode, isEditing: mode === "edit", setMode, toggleMode }),
    [mode, toggleMode],
  );

  return (
    <DashboardModeContext.Provider value={value}>{children}</DashboardModeContext.Provider>
  );
}

export function useDashboardMode() {
  const context = useContext(DashboardModeContext);
  if (!context) {
    throw new Error("useDashboardMode must be used within a DashboardModeProvider");
  }
  return context;
}
