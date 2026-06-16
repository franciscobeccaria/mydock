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
  /**
   * Explicit cell on the 4-column dashboard grid (FRA-149). Blank cells are
   * preserved (iOS-18 style), so position is not derived from array order.
   * Optional for back-compat: legacy layouts lack x,y and get packed once on
   * load (see normalizeLayout in grid-layout.ts).
   */
  x?: number;
  y?: number;
};

export const widgetInstanceSchema = z.object({
  instanceId: z.string().min(1),
  slotId: z.string().refine(isSlotId, "unknown slotId"),
  accountId: z.string().nullable(),
  config: z.record(z.string(), z.string()).default({}),
  x: z.number().int().min(0).optional(),
  y: z.number().int().min(0).optional(),
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

/**
 * A dashboard page (FRA-140). The dashboard is a list of pages you swipe
 * between (iOS-style); each page owns its own free-coordinate `layout`. The
 * `shortcuts` dock is shared across pages (root-level), not per page.
 */
export const pageSchema = z.object({
  id: z.string().min(1),
  layout: z.array(widgetInstanceSchema).default([]),
});

export type DashboardPage = z.infer<typeof pageSchema>;

export const dashboardStateSchema = z.object({
  pages: z.array(pageSchema).min(1),
  shortcuts: z.array(shortcutSchema).default([]),
});

export type DashboardStatePayload = z.infer<typeof dashboardStateSchema>;

/**
 * The pre-FRA-140 shape: a single flat `layout` with no pages. Server rows and
 * cached values written before multi-page use this; `normalizeToPages` wraps
 * them into a one-page payload. Kept for read-compat — we never write it.
 */
export const legacyDashboardStateSchema = z.object({
  layout: z.array(widgetInstanceSchema).default([]),
  shortcuts: z.array(shortcutSchema).default([]),
});

export type LegacyDashboardStatePayload = z.infer<typeof legacyDashboardStateSchema>;

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

/** A fresh page id. Stable per page; drives the dots and nav, like an instanceId. */
export function newPageId(): string {
  return crypto.randomUUID();
}

/** A new empty page (used when adding a page in edit mode). */
export function emptyPage(): DashboardPage {
  return { id: newPageId(), layout: [] };
}

/** The seed for a brand-new user: one page holding the default widgets. */
export function defaultPages(): DashboardPage[] {
  return [{ id: newPageId(), layout: defaultInstances() }];
}

/**
 * Normalize any persisted/cached value into the multi-page shape (FRA-140).
 * Accepts the new `{ pages, shortcuts }`, the legacy flat `{ layout, shortcuts }`
 * (wrapped into one page), or anything unparseable (falls back to defaults).
 * Guarantees at least one page, since page 1 must always exist.
 */
export function normalizeToPages(value: unknown): DashboardStatePayload {
  const asNew = dashboardStateSchema.safeParse(value);
  if (asNew.success) {
    return asNew.data.pages.length > 0
      ? asNew.data
      : { pages: defaultPages(), shortcuts: asNew.data.shortcuts };
  }

  const asLegacy = legacyDashboardStateSchema.safeParse(value);
  if (asLegacy.success) {
    return {
      pages: [{ id: newPageId(), layout: asLegacy.data.layout }],
      shortcuts: asLegacy.data.shortcuts,
    };
  }

  return { pages: defaultPages(), shortcuts: [] };
}
