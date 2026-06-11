import { z } from "zod";

import { DEFAULT_LAYOUT, isSlotId, type SlotId } from "@/components/widgets/widget-catalog";

/**
 * A placed widget on the dashboard. Replaces the old flat `SlotId[]` layout:
 * each instance references a catalog slot and carries its own account + config,
 * so the same slot can appear more than once (e.g. two Linear widgets on
 * different projects) and per-widget preferences live per instance instead of
 * globally per slot type.
 */
export type WidgetInstance = {
  /** Stable per-instance id (crypto.randomUUID()). Drives keys, order, dnd. */
  instanceId: string;
  /** Catalog slot this instance renders. */
  slotId: SlotId;
  /** Bound account; `null` = the default (login) account. FRA-138-ready. */
  accountId: string | null;
  /** Per-instance prefs, e.g. `{ "gmail-view": "unread" }`. */
  config: Record<string, string>;
};

export const widgetInstanceSchema = z.object({
  instanceId: z.string().min(1),
  slotId: z.string().refine(isSlotId, "unknown slotId"),
  accountId: z.string().nullable(),
  config: z.record(z.string(), z.string()).default({}),
});

// Shortcut URLs are opened with window.open and rendered as <img> srcs, so the
// schema rejects anything that isn't an http(s) URL (blocks javascript:/data: etc.)
// at the PUT boundary, not just in the client.
const httpUrl = z.string().refine((u) => /^https?:\/\//i.test(u), "must be an http(s) URL");

export const shortcutSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: httpUrl,
  iconUrl: httpUrl.optional(),
});

/** A dock shortcut. `url`/`iconUrl` are normalized absolute URLs when present. */
export type Shortcut = z.infer<typeof shortcutSchema>;

export const dashboardStateSchema = z.object({
  layout: z.array(widgetInstanceSchema).default([]),
  shortcuts: z.array(shortcutSchema).default([]),
});

export type DashboardStatePayload = z.infer<typeof dashboardStateSchema>;

/**
 * Soft-migration: each saved SlotId becomes one instance on the default account.
 * `prefs` are the old `mydock:widget-pref:*` values, folded into each instance's
 * config so existing per-widget preferences carry over.
 */
export function slotIdsToInstances(
  slotIds: SlotId[],
  prefs: Record<string, string> = {},
): WidgetInstance[] {
  return slotIds.map((slotId) => ({
    instanceId: crypto.randomUUID(),
    slotId,
    accountId: null,
    config: prefForSlot(slotId, prefs),
  }));
}

/** Map old global prefs to the per-instance config keys each slot reads. */
function prefForSlot(slotId: SlotId, prefs: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  if (slotId === "gmail" && prefs["gmail-view"]) out["gmail-view"] = prefs["gmail-view"];
  if (slotId === "google_tasks" && prefs["tasks-view"]) out["tasks-view"] = prefs["tasks-view"];
  if (slotId === "linear" && prefs["linear-project"]) out["linear-project"] = prefs["linear-project"];
  return out;
}

export function defaultInstances(): WidgetInstance[] {
  return slotIdsToInstances([...DEFAULT_LAYOUT]);
}
