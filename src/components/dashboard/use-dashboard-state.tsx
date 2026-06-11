"use client";

import { useQuery } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  dashboardStateSchema,
  defaultInstances,
  slotIdsToInstances,
  type DashboardStatePayload,
  type Shortcut,
  type WidgetInstance,
} from "@/components/dashboard/widget-instance";
import { DEFAULT_LAYOUT, isSlotId, type SlotId } from "@/components/widgets/widget-catalog";

// Cache keys are scoped per user so a shared browser (sign out → sign in as a
// different account) never seeds the new user's server row from the previous
// user's cached layout. The unscoped legacy keys below are read once and migrated
// into the current user's scoped keys.
const LAYOUT_KEY = (userId: string) => `mydock:dashboard:v2:${userId}`;
const SHORTCUTS_KEY = (userId: string) => `mydock:shortcuts:v1:${userId}`;
const LEGACY_LAYOUT_KEY = "mydock:dashboard:v2";
const LEGACY_SHORTCUTS_KEY = "mydock:shortcuts:v1";
const LAYOUT_V1_KEY = "mydock:widget-order:v1";
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
function readCachedState(userId: string | null): DashboardStatePayload {
  if (typeof window === "undefined" || !userId) {
    return { layout: defaultInstances(), shortcuts: [] };
  }

  const layout = readCachedLayout(userId);
  const shortcuts = readCachedShortcuts(userId);
  return { layout, shortcuts };
}

function readCachedLayout(userId: string): WidgetInstance[] {
  try {
    // Prefer the user-scoped cache; fall back to the unscoped legacy key once.
    const raw =
      window.localStorage.getItem(LAYOUT_KEY(userId)) ??
      window.localStorage.getItem(LEGACY_LAYOUT_KEY);
    if (!raw) return slotIdsToInstances(readLegacySlotIds(), readWidgetPrefs());

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

/**
 * Slot ids to seed from when no v2 layout exists. Honors the pre-v2
 * `mydock:widget-order:v1` key (an order-only array over the full default set)
 * so a user who hasn't loaded the app since the v1 era keeps their saved order
 * instead of having DEFAULT_LAYOUT seeded over it. Falls back to DEFAULT_LAYOUT.
 */
function readLegacySlotIds(): SlotId[] {
  try {
    const v1 = window.localStorage.getItem(LAYOUT_V1_KEY);
    if (v1) {
      const parsed = JSON.parse(v1) as unknown;
      if (Array.isArray(parsed)) {
        const seen = new Set<SlotId>();
        for (const id of parsed) {
          if (typeof id === "string" && isSlotId(id)) seen.add(id);
        }
        // v1 was order-only over the full set; back-fill any missing defaults.
        const ordered = [...seen, ...DEFAULT_LAYOUT.filter((id) => !seen.has(id))];
        if (ordered.length > 0) return ordered;
      }
    }
  } catch {
    // Unreadable v1 — fall through to defaults.
  }
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

function readCachedShortcuts(userId: string): Shortcut[] {
  try {
    const raw =
      window.localStorage.getItem(SHORTCUTS_KEY(userId)) ??
      window.localStorage.getItem(LEGACY_SHORTCUTS_KEY);
    if (!raw) return [];
    const result = dashboardStateSchema.safeParse({ layout: [], shortcuts: JSON.parse(raw) });
    return result.success ? result.data.shortcuts : [];
  } catch {
    return [];
  }
}

function writeCache(userId: string | null, state: DashboardStatePayload): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.localStorage.setItem(LAYOUT_KEY(userId), JSON.stringify(state.layout));
    window.localStorage.setItem(SHORTCUTS_KEY(userId), JSON.stringify(state.shortcuts));
  } catch {
    // Storage may be unavailable (private mode); state still works in-session.
  }
}

/**
 * Loads the server row. Returns `null` ONLY for a true "no row yet" (fresh user),
 * which is the signal to seed. A read failure or an unparseable/legacy payload
 * throws instead — we must not treat those as "no row", or the reconcile would
 * overwrite a real (if unreadable) server record with cached state.
 */
async function fetchServerState(): Promise<DashboardStatePayload | null> {
  const response = await fetch("/api/dashboard-state", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load dashboard state.");
  const json = (await response.json()) as unknown;
  if (json === null) return null;
  const result = dashboardStateSchema.safeParse(json);
  if (!result.success) {
    throw new Error("Server dashboard state failed validation.");
  }
  return result.data;
}

async function putServerState(state: DashboardStatePayload): Promise<void> {
  await fetch("/api/dashboard-state", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state),
  });
}

/**
 * The store. Owns the one in-memory `{ layout, shortcuts }` snapshot, the server
 * reconcile, and the debounced write-through. There must be exactly ONE of these
 * per dashboard — `setLayout`/`setShortcuts` each write the *whole* payload, so two
 * stores would clobber each other's slice. Mounted once by `DashboardStateProvider`;
 * consumers read it through `useDashboardState()`.
 *
 * - Loads the server row on mount. If none exists, seeds it from localStorage
 *   (soft-migration of the legacy SlotId[] + widget-prefs + shortcuts) and PUTs it.
 * - Mutations update in-memory state immediately (optimistic), mirror to
 *   localStorage as a fast cache, and fire a debounced PUT. A failed PUT keeps the
 *   in-session state working (last-write-wins on the next success).
 */
function useDashboardStateStore(userId: string | null): DashboardState {
  // The grid is client-only (ssr: false), so reading localStorage in the lazy
  // initializer is safe and gives an instant first paint from cache.
  const [state, setState] = useState<DashboardStatePayload>(() => readCachedState(userId));

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
      writeCache(userId, query.data);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time reconcile of server data into state
      setState(query.data);
    } else {
      setState((current) => {
        void putServerState(current);
        return current;
      });
    }
  }, [query.isSuccess, query.data, userId]);

  const setLayout = useCallback<DashboardState["setLayout"]>(
    (next) => {
      setState((current) => {
        const layout = typeof next === "function" ? next(current.layout) : next;
        const updated = { ...current, layout };
        writeCache(userId, updated);
        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave, userId],
  );

  const setShortcuts = useCallback<DashboardState["setShortcuts"]>(
    (next) => {
      setState((current) => {
        const shortcuts = typeof next === "function" ? next(current.shortcuts) : next;
        const updated = { ...current, shortcuts };
        writeCache(userId, updated);
        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave, userId],
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

const DashboardStateContext = createContext<DashboardState | null>(null);

/**
 * Provides the single dashboard-state store to its subtree. Mount once near the
 * top of the dashboard (inside the client-only grid). All consumers
 * (`useDashboardLayout`, `useShortcuts`) share this one store.
 */
export function DashboardStateProvider({
  userId,
  children,
}: {
  userId: string | null;
  children: React.ReactNode;
}) {
  const value = useDashboardStateStore(userId);
  return <DashboardStateContext.Provider value={value}>{children}</DashboardStateContext.Provider>;
}

/** Read the shared dashboard state. Must be used under `DashboardStateProvider`. */
export function useDashboardState(): DashboardState {
  const ctx = useContext(DashboardStateContext);
  if (!ctx) {
    throw new Error("useDashboardState must be used within a DashboardStateProvider");
  }
  return ctx;
}
