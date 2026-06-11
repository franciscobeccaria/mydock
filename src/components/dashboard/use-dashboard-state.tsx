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
  type DashboardStatePayload,
  type Shortcut,
  type WidgetInstance,
} from "@/components/dashboard/widget-instance";

// Cache keys are scoped per user so a shared browser (sign out → sign in as a
// different account) never seeds the new user's server row from the previous
// user's cache. We deliberately do NOT read the older *unscoped* cache keys
// (mydock:dashboard:v2 / :shortcuts:v1 / :widget-order:v1 / :widget-pref:*): they
// can't be attributed to the current user, so reading them would re-open that
// cross-account leak. A returning user is restored from their server row instead
// (the source of truth); a fresh user is seeded with neutral defaults.
const LAYOUT_KEY = (userId: string) => `mydock:dashboard:v2:${userId}`;
const SHORTCUTS_KEY = (userId: string) => `mydock:shortcuts:v1:${userId}`;
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
    // Only the user-scoped key is trusted for paint. No scoped key → neutral
    // defaults (the unscoped legacy keys can't be attributed to this user, so
    // reading them would risk painting another account's layout on a shared
    // browser). The real layout arrives from the server row on reconcile.
    const raw = window.localStorage.getItem(LAYOUT_KEY(userId));
    if (!raw) return defaultInstances();

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return defaultInstances();

    const result = dashboardStateSchema.safeParse({ layout: parsed, shortcuts: [] });
    return result.success ? result.data.layout : defaultInstances();
  } catch {
    return defaultInstances();
  }
}

function readCachedShortcuts(userId: string): Shortcut[] {
  try {
    const raw = window.localStorage.getItem(SHORTCUTS_KEY(userId));
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
  // null row means a fresh user — seed the server with neutral defaults. Guarded
  // to run once.
  const reconciledRef = useRef(false);
  useEffect(() => {
    if (!query.isSuccess || reconciledRef.current) return;
    reconciledRef.current = true;
    if (query.data) {
      writeCache(userId, query.data);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time reconcile of server data into state
      setState(query.data);
    } else {
      // Fresh user (no server row): seed neutral DEFAULT_LAYOUT, never the in-memory
      // state — that could carry unscoped legacy-cache data from another account on
      // a shared browser. The one-time localStorage→server migration for the original
      // user already ran (they have a row), so a null row genuinely means "new user".
      const seeded: DashboardStatePayload = { layout: defaultInstances(), shortcuts: [] };
      void putServerState(seeded);
      writeCache(userId, seeded);
      setState(seeded);
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
