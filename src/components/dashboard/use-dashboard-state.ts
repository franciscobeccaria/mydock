"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  dashboardStateSchema,
  defaultInstances,
  slotIdsToInstances,
  type DashboardStatePayload,
  type Shortcut,
  type WidgetInstance,
} from "@/components/dashboard/widget-instance";
import { DEFAULT_LAYOUT, isSlotId, type SlotId } from "@/components/widgets/widget-catalog";

const LAYOUT_KEY = "mydock:dashboard:v2";
const SHORTCUTS_KEY = "mydock:shortcuts:v1";
const WIDGET_PREF_PREFIX = "mydock:widget-pref:";
const SAVE_DEBOUNCE_MS = 500;

type DashboardState = {
  /** Placed widget instances, in display order. */
  layout: WidgetInstance[];
  shortcuts: Shortcut[];
  setLayout: (next: WidgetInstance[] | ((current: WidgetInstance[]) => WidgetInstance[])) => void;
  setShortcuts: (next: Shortcut[] | ((current: Shortcut[]) => Shortcut[])) => void;
  /** True until the server row (or its localStorage seed) has loaded. */
  isLoading: boolean;
};

/**
 * Read the legacy localStorage layout. The old value was a `SlotId[]`; we keep
 * reading that shape and convert to instances. A value already in instance shape
 * (written by this hook as the cache) is parsed back to instances directly.
 */
function readCachedState(): DashboardStatePayload {
  if (typeof window === "undefined") {
    return { layout: defaultInstances(), shortcuts: [] };
  }

  const layout = readCachedLayout();
  const shortcuts = readCachedShortcuts();
  return { layout, shortcuts };
}

function readCachedLayout(): WidgetInstance[] {
  try {
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    if (!raw) return slotIdsToInstances(readDefaultSlotIds(), readWidgetPrefs());

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultInstances();

    // Already instances? Validate and keep. Otherwise treat as the legacy SlotId[].
    if (parsed.every((entry) => typeof entry === "object" && entry !== null && "instanceId" in entry)) {
      const result = dashboardStateSchema.safeParse({ layout: parsed, shortcuts: [] });
      return result.success ? result.data.layout : defaultInstances();
    }

    const slotIds = parsed.filter((id): id is SlotId => typeof id === "string" && isSlotId(id));
    return slotIdsToInstances(slotIds, readWidgetPrefs());
  } catch {
    return defaultInstances();
  }
}

function readDefaultSlotIds(): SlotId[] {
  return [...DEFAULT_LAYOUT];
}

/** Collect the old per-widget preference keys so soft-migration can fold them in. */
function readWidgetPrefs(): Record<string, string> {
  const prefs: Record<string, string> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith(WIDGET_PREF_PREFIX)) continue;
      const value = window.localStorage.getItem(key);
      if (value !== null) prefs[key.slice(WIDGET_PREF_PREFIX.length)] = value;
    }
  } catch {
    // Storage unavailable — no prefs to migrate.
  }
  return prefs;
}

function readCachedShortcuts(): Shortcut[] {
  try {
    const raw = window.localStorage.getItem(SHORTCUTS_KEY);
    if (!raw) return [];
    const result = dashboardStateSchema.safeParse({ layout: [], shortcuts: JSON.parse(raw) });
    return result.success ? result.data.shortcuts : [];
  } catch {
    return [];
  }
}

function writeCache(state: DashboardStatePayload): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(state.layout));
    window.localStorage.setItem(SHORTCUTS_KEY, JSON.stringify(state.shortcuts));
  } catch {
    // Storage may be unavailable (private mode); state still works in-session.
  }
}

async function fetchServerState(): Promise<DashboardStatePayload | null> {
  const response = await fetch("/api/dashboard-state", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load dashboard state.");
  const json = (await response.json()) as unknown;
  if (json === null) return null;
  const result = dashboardStateSchema.safeParse(json);
  return result.success ? result.data : null;
}

async function putServerState(state: DashboardStatePayload): Promise<void> {
  await fetch("/api/dashboard-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
}

/**
 * Single source of truth for the dashboard's persisted state (layout + shortcuts).
 *
 * - Loads the server row on mount. If none exists, seeds it from localStorage
 *   (soft-migration of the legacy SlotId[] + widget-prefs + shortcuts) and PUTs it.
 * - Mutations update in-memory state immediately (optimistic), mirror to
 *   localStorage as a fast cache, and fire a debounced PUT. A failed PUT keeps the
 *   in-session state working (last-write-wins on the next success).
 */
export function useDashboardState(): DashboardState {
  // The grid is client-only (ssr: false), so reading localStorage in the lazy
  // initializer is safe and gives an instant first paint from cache.
  const [state, setState] = useState<DashboardStatePayload>(() => readCachedState());

  const query = useQuery({
    queryKey: ["dashboard-state"],
    queryFn: fetchServerState,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Debounced write-through. `scheduleSave` is given the exact value to send, so
  // there's no need to mirror state into a ref during render.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = useCallback((next: DashboardStatePayload) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      void putServerState(next);
    }, SAVE_DEBOUNCE_MS);
  }, []);
  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  // Reconcile once with the server when the query first resolves. This is the
  // legitimate "sync an external system into React state" case: the server row
  // is the source of truth, so it overwrites the cache-seeded initial state. A
  // null row means a fresh user — seed the server from the cached state instead
  // (a pure external write, no local state change). Guarded to run once.
  const reconciledRef = useRef(false);
  useEffect(() => {
    if (!query.isSuccess || reconciledRef.current) return;
    reconciledRef.current = true;
    if (query.data) {
      writeCache(query.data);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time reconcile of server data into state
      setState(query.data);
    } else {
      setState((current) => {
        void putServerState(current);
        return current;
      });
    }
  }, [query.isSuccess, query.data]);

  const setLayout = useCallback<DashboardState["setLayout"]>(
    (next) => {
      setState((current) => {
        const layout = typeof next === "function" ? next(current.layout) : next;
        const updated = { ...current, layout };
        writeCache(updated);
        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave],
  );

  const setShortcuts = useCallback<DashboardState["setShortcuts"]>(
    (next) => {
      setState((current) => {
        const shortcuts = typeof next === "function" ? next(current.shortcuts) : next;
        const updated = { ...current, shortcuts };
        writeCache(updated);
        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave],
  );

  return useMemo(
    () => ({
      layout: state.layout,
      shortcuts: state.shortcuts,
      setLayout,
      setShortcuts,
      isLoading: query.isLoading,
    }),
    [state.layout, state.shortcuts, setLayout, setShortcuts, query.isLoading],
  );
}
