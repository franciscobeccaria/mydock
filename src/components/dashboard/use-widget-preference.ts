"use client";

import { useCallback, useEffect, useState } from "react";

const KEY_PREFIX = "mydock:widget-pref:";

/**
 * Persist a single per-widget UI preference (e.g. the Gmail All/Unread filter or
 * the Linear project filter) to localStorage so it survives leaving edit mode,
 * navigating away, and reloads.
 *
 * Mirrors useDashboardLayout: the grid is client-only (ssr: false), so reading
 * localStorage in the initializer is safe and avoids a setState-in-effect cascade.
 */
export function useWidgetPreference(
  widgetKey: string,
  defaultValue: string,
): [string, (value: string) => void] {
  const storageKey = `${KEY_PREFIX}${widgetKey}`;

  const [value, setValue] = useState<string>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      return window.localStorage.getItem(storageKey) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      // Storage may be unavailable (private mode); state still works in-session.
    }
  }, [storageKey, value]);

  const set = useCallback((next: string) => setValue(next), []);

  return [value, set];
}
