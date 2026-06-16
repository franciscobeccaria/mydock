"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type DashboardMode = "view" | "edit";

type DashboardModeContextValue = {
  mode: DashboardMode;
  isEditing: boolean;
  setMode: (mode: DashboardMode) => void;
  toggleMode: () => void;
  /** Add-widget catalog dialog open state. The trigger lives in the sidebar
   *  (outside the grid), so it's lifted here where both can reach it. */
  catalogOpen: boolean;
  setCatalogOpen: (open: boolean) => void;
};

const DashboardModeContext = createContext<DashboardModeContextValue | null>(null);

export function DashboardModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<DashboardMode>("view");
  const [catalogOpen, setCatalogOpen] = useState(false);

  const toggleMode = useCallback(() => {
    setMode((current) => {
      const next = current === "view" ? "edit" : "view";
      // Leaving edit mode closes the catalog so it can't linger in view mode.
      if (next === "view") setCatalogOpen(false);
      return next;
    });
  }, []);

  const value = useMemo<DashboardModeContextValue>(
    () => ({ mode, isEditing: mode === "edit", setMode, toggleMode, catalogOpen, setCatalogOpen }),
    [mode, toggleMode, catalogOpen],
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
