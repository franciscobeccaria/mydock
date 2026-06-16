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
  defaultPages,
  emptyPage,
  type DashboardPage,
  type DashboardStatePayload,
  type Shortcut,
  type WidgetInstance,
} from "@/components/dashboard/widget-instance";
import { normalizeLayout } from "@/components/dashboard/grid-layout";

/**
 * Ensure every instance on every page carries an (x,y) cell. Legacy/default
 * layouts lack positions; this packs them once (first-fit) so the grid renders
 * by coordinates from the first paint. Applied wherever server state enters.
 */
function withPositions(payload: DashboardStatePayload): DashboardStatePayload {
  return {
    ...payload,
    pages: payload.pages.map((page) => ({ ...page, layout: normalizeLayout(page.layout) })),
  };
}

const SAVE_DEBOUNCE_MS = 500;

type DashboardState = {
  /** All dashboard pages, in order (FRA-140). */
  pages: DashboardPage[];
  /** The page currently shown. */
  activePageId: string;
  /** Widget instances on the active page (display order). */
  layout: WidgetInstance[];
  shortcuts: Shortcut[];
  /** Replace the active page's layout (the only layout a mutation touches). */
  setLayout: (next: WidgetInstance[] | ((current: WidgetInstance[]) => WidgetInstance[])) => void;
  setShortcuts: (next: Shortcut[] | ((current: Shortcut[]) => Shortcut[])) => void;
  /** Navigate to a page by id (no-op if it doesn't exist). */
  setActivePage: (pageId: string) => void;
  /** Step to the previous/next page, clamped at the edges. */
  goToPage: (direction: -1 | 1) => void;
  /** Append a new empty page and navigate to it. Returns the new page id. */
  addPage: () => string;
  /** Remove a page (no-op if it's the last one — page 1 must always exist). */
  removePage: (pageId: string) => void;
  /** True until the server row has loaded — the grid shows a skeleton meanwhile. */
  isLoading: boolean;
};

/**
 * Loads the server row. Returns `null` ONLY for a true "no row yet" (fresh user),
 * which is the signal to seed. A read failure or an unparseable payload throws
 * instead — we must not treat those as "no row", or the reconcile would overwrite
 * a real (if unreadable) server record. The API already returns the multi-page
 * shape (wrapping legacy single-layout rows), so we parse it directly.
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
 * The store. Owns the one in-memory `{ pages, shortcuts }` snapshot, the active
 * page, the server reconcile, and the debounced write-through. There must be
 * exactly ONE of these per dashboard — every setter writes the *whole* payload,
 * so two stores would clobber each other. Mounted once by `DashboardStateProvider`.
 *
 * Persistence is Supabase-only (FRA-140): no localStorage cache. The initial
 * state is neutral defaults; the real state arrives from the server row on the
 * first query resolve (the grid shows a skeleton until then). If no row exists,
 * we seed the server with defaults. Mutations are optimistic + a debounced PUT.
 */
function useDashboardStateStore(userId: string | null): DashboardState {
  // Neutral seed; the server row replaces this on reconcile. We do NOT read any
  // client cache, so there's never a flash of another account's (or stale) layout.
  const [state, setState] = useState<DashboardStatePayload>(() => ({
    pages: defaultPages(),
    shortcuts: [],
  }));
  const [activePageId, setActivePageId] = useState<string>(() => state.pages[0]!.id);

  const query = useQuery({
    queryKey: ["dashboard-state", userId],
    queryFn: fetchServerState,
    enabled: Boolean(userId),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });

  // Debounced write-through. `scheduleSave` is given the exact value to send.
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

  // Reconcile once with the server when the query first resolves. The server row
  // is the source of truth; a null row means a fresh user — seed defaults.
  const reconciledRef = useRef(false);
  useEffect(() => {
    if (!query.isSuccess || reconciledRef.current) return;
    reconciledRef.current = true;
    if (query.data) {
      const positioned = withPositions(query.data);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time reconcile of server data into state
      setState(positioned);
      setActivePageId(positioned.pages[0]!.id);
    } else {
      const seeded = withPositions({ pages: defaultPages(), shortcuts: [] });
      void putServerState(seeded);
      setState(seeded);
      setActivePageId(seeded.pages[0]!.id);
    }
  }, [query.isSuccess, query.data]);

  /** Write a whole payload: update state, fire the debounced PUT. */
  const commit = useCallback(
    (updater: (current: DashboardStatePayload) => DashboardStatePayload) => {
      setState((current) => {
        const updated = updater(current);
        scheduleSave(updated);
        return updated;
      });
    },
    [scheduleSave],
  );

  const setLayout = useCallback<DashboardState["setLayout"]>(
    (next) => {
      commit((current) => ({
        ...current,
        pages: current.pages.map((page) => {
          if (page.id !== activePageId) return page;
          const layout = typeof next === "function" ? next(page.layout) : next;
          return { ...page, layout };
        }),
      }));
    },
    [commit, activePageId],
  );

  const setShortcuts = useCallback<DashboardState["setShortcuts"]>(
    (next) => {
      commit((current) => ({
        ...current,
        shortcuts: typeof next === "function" ? next(current.shortcuts) : next,
      }));
    },
    [commit],
  );

  const setActivePage = useCallback(
    (pageId: string) => {
      if (state.pages.some((p) => p.id === pageId)) setActivePageId(pageId);
    },
    [state.pages],
  );

  const goToPage = useCallback(
    (direction: -1 | 1) => {
      const index = state.pages.findIndex((p) => p.id === activePageId);
      const next = state.pages[index + direction];
      if (next) setActivePageId(next.id);
    },
    [state.pages, activePageId],
  );

  const addPage = useCallback((): string => {
    const page = emptyPage();
    commit((current) => ({ ...current, pages: [...current.pages, page] }));
    setActivePageId(page.id);
    return page.id;
  }, [commit]);

  const removePage = useCallback(
    (pageId: string) => {
      commit((current) => {
        // Page 1 must always exist — never drop to zero pages.
        if (current.pages.length <= 1) return current;
        const index = current.pages.findIndex((p) => p.id === pageId);
        if (index === -1) return current;
        const pages = current.pages.filter((p) => p.id !== pageId);
        // If the removed page was active, fall back to the neighbour.
        if (pageId === activePageId) {
          const fallback = pages[Math.max(0, index - 1)]!;
          setActivePageId(fallback.id);
        }
        return { ...current, pages };
      });
    },
    [commit, activePageId],
  );

  const activeLayout = useMemo(
    () => state.pages.find((p) => p.id === activePageId)?.layout ?? [],
    [state.pages, activePageId],
  );

  return useMemo(
    () => ({
      pages: state.pages,
      activePageId,
      layout: activeLayout,
      shortcuts: state.shortcuts,
      setLayout,
      setShortcuts,
      setActivePage,
      goToPage,
      addPage,
      removePage,
      isLoading: query.isLoading,
    }),
    [
      state.pages,
      state.shortcuts,
      activePageId,
      activeLayout,
      setLayout,
      setShortcuts,
      setActivePage,
      goToPage,
      addPage,
      removePage,
      query.isLoading,
    ],
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
