"use client";

import { useCallback, useMemo } from "react";

import { useDashboardState } from "@/components/dashboard/use-dashboard-state";
import { type WidgetInstance } from "@/components/dashboard/widget-instance";
import { WIDGET_CATALOG, type SlotId, type WidgetCatalogEntry } from "@/components/widgets/widget-catalog";

type UseDashboardLayout = {
  /** Placed widget instances, in display order. */
  layout: WidgetInstance[];
  /** Catalog entries (duplicates allowed, so every entry is always available). */
  availableToAdd: WidgetCatalogEntry[];
  /** Whether a slot has at least one instance on the dashboard. */
  isActive: (slotId: SlotId) => boolean;
  /** Add a new instance of a slot, bound to an account (`null` = default),
   *  optionally seeded with initial per-instance config (e.g. a Notion page id
   *  chosen in the catalog preview). */
  addWidget: (slotId: SlotId, accountId?: string | null, config?: Record<string, string>) => void;
  removeWidget: (instanceId: string) => void;
  reorder: (activeInstanceId: string, overInstanceId: string) => void;
  /** Set a single per-instance config value. */
  updateConfig: (instanceId: string, key: string, value: string) => void;
};

export function useDashboardLayout(): UseDashboardLayout {
  const { layout, setLayout } = useDashboardState();

  const addWidget = useCallback(
    (slotId: SlotId, accountId: string | null = null, config: Record<string, string> = {}) => {
      setLayout((current) => [
        ...current,
        { instanceId: crypto.randomUUID(), slotId, accountId, config },
      ]);
    },
    [setLayout],
  );

  const removeWidget = useCallback(
    (instanceId: string) => {
      setLayout((current) => current.filter((instance) => instance.instanceId !== instanceId));
    },
    [setLayout],
  );

  const reorder = useCallback(
    (activeInstanceId: string, overInstanceId: string) => {
      setLayout((current) => {
        const from = current.findIndex((i) => i.instanceId === activeInstanceId);
        const to = current.findIndex((i) => i.instanceId === overInstanceId);
        if (from === -1 || to === -1 || from === to) return current;
        const next = [...current];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    },
    [setLayout],
  );

  const updateConfig = useCallback(
    (instanceId: string, key: string, value: string) => {
      setLayout((current) =>
        current.map((instance) =>
          instance.instanceId === instanceId
            ? { ...instance, config: { ...instance.config, [key]: value } }
            : instance,
        ),
      );
    },
    [setLayout],
  );

  // Duplicates are allowed, so the catalog never disables an entry.
  const availableToAdd = useMemo(() => [...WIDGET_CATALOG], []);

  const activeSlots = useMemo(
    () => new Set(layout.map((instance) => instance.slotId)),
    [layout],
  );
  const isActive = useCallback((slotId: SlotId) => activeSlots.has(slotId), [activeSlots]);

  return { layout, availableToAdd, isActive, addWidget, removeWidget, reorder, updateConfig };
}
