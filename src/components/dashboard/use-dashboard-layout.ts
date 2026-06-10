"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_LAYOUT,
  WIDGET_CATALOG,
  isSlotId,
  type SlotId,
  type WidgetCatalogEntry,
} from "@/components/widgets/widget-catalog";

const V2_KEY = "mydock:dashboard:v2";
const V1_KEY = "mydock:widget-order:v1";

type UseDashboardLayout = {
  /** Active widget ids, in display order. */
  layout: SlotId[];
  /** Catalog entries not currently on the dashboard. */
  availableToAdd: WidgetCatalogEntry[];
  isActive: (id: SlotId) => boolean;
  addWidget: (id: SlotId) => void;
  removeWidget: (id: SlotId) => void;
  reorder: (activeId: SlotId, overId: SlotId) => void;
};

/** Keep only known ids and drop duplicates, preserving the given order. */
function sanitize(ids: string[]): SlotId[] {
  const seen = new Set<SlotId>();
  for (const id of ids) {
    if (isSlotId(id) && !seen.has(id)) seen.add(id);
  }
  return [...seen];
}

function readLayout(): SlotId[] {
  if (typeof window === "undefined") return [...DEFAULT_LAYOUT];
  try {
    const v2 = window.localStorage.getItem(V2_KEY);
    if (v2) return sanitize(JSON.parse(v2) as string[]);

    // Migration: v1 stored the ORDER of the full default set (all six active).
    const v1 = window.localStorage.getItem(V1_KEY);
    if (v1) {
      const migrated = sanitize(JSON.parse(v1) as string[]);
      // v1 was order-only over the full set; back-fill any default ids missing
      // from the saved order so a partial/old v1 still yields all six active.
      const missing = DEFAULT_LAYOUT.filter((id) => !migrated.includes(id));
      return [...migrated, ...missing];
    }

    return [...DEFAULT_LAYOUT];
  } catch {
    return [...DEFAULT_LAYOUT];
  }
}

export function useDashboardLayout(): UseDashboardLayout {
  // The grid is rendered client-only (ssr: false), so reading localStorage in
  // the initializer is safe and avoids a setState-in-effect cascade.
  const [layout, setLayout] = useState<SlotId[]>(() => readLayout());

  // Persist on every change (also writes the migrated value forward to v2).
  useEffect(() => {
    try {
      localStorage.setItem(V2_KEY, JSON.stringify(layout));
    } catch {
      // Storage may be unavailable (private mode); state still works in-session.
    }
  }, [layout]);

  const addWidget = useCallback((id: SlotId) => {
    setLayout((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const removeWidget = useCallback((id: SlotId) => {
    setLayout((current) => current.filter((x) => x !== id));
  }, []);

  const reorder = useCallback((activeId: SlotId, overId: SlotId) => {
    setLayout((current) => {
      const from = current.indexOf(activeId);
      const to = current.indexOf(overId);
      if (from === -1 || to === -1 || from === to) return current;
      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, activeId);
      return next;
    });
  }, []);

  const availableToAdd = useMemo(
    () => WIDGET_CATALOG.filter((w) => !layout.includes(w.id)),
    [layout],
  );

  const isActive = useCallback((id: SlotId) => layout.includes(id), [layout]);

  return { layout, availableToAdd, isActive, addWidget, removeWidget, reorder };
}
