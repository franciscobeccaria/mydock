"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Lets a widget's header picker (e.g. the Notion page Combobox) tell the grid
 * that an overlay popup is open, so the grid can suspend its drag sensor while
 * it is.
 *
 * Why: in edit mode each tile is a dnd-kit drag handle listening for
 * `pointerdown` across its whole surface. A picker popup is portaled OUTSIDE the
 * tile, so the click that dismisses it lands on a tile and is also seen by
 * dnd-kit, which starts (then cancels) a drag — and that pointer cycle bounces
 * focus back to the picker, reopening it. Suspending the sensor while a picker
 * is open removes that cycle so an outside-click dismisses cleanly.
 */
type PickerLockContextValue = {
  /** True while any registered picker popup is open. */
  isPickerOpen: boolean;
  /** A picker reports its open/closed transitions here. */
  setPickerOpen: (open: boolean) => void;
};

const PickerLockContext = createContext<PickerLockContextValue | null>(null);

export function PickerLockProvider({ children }: { children: React.ReactNode }) {
  // Ref-count rather than a bare boolean: if two pickers ever overlap, the
  // sensor stays suspended until the last one closes.
  const [openCount, setOpenCount] = useState(0);

  const setPickerOpen = useCallback((open: boolean) => {
    setOpenCount((count) => Math.max(0, count + (open ? 1 : -1)));
  }, []);

  const value = useMemo(
    () => ({ isPickerOpen: openCount > 0, setPickerOpen }),
    [openCount, setPickerOpen],
  );

  return <PickerLockContext.Provider value={value}>{children}</PickerLockContext.Provider>;
}

/**
 * Reads the picker-lock state. Safe to call outside a provider (e.g. a widget
 * rendered in the catalog preview): it returns a no-op so the picker still works
 * there, just without the sensor-suspend behavior (no dnd context to fight).
 */
export function usePickerLock(): PickerLockContextValue {
  return useContext(PickerLockContext) ?? NOOP_PICKER_LOCK;
}

const NOOP_PICKER_LOCK: PickerLockContextValue = {
  isPickerOpen: false,
  setPickerOpen: () => {},
};
