"use client";

import { useCallback } from "react";

import { useDashboardState } from "@/components/dashboard/use-dashboard-state";
import { type Shortcut } from "@/components/dashboard/widget-instance";

export { type Shortcut } from "@/components/dashboard/widget-instance";

type NewShortcut = { name: string; url: string; iconUrl?: string };

type UseShortcuts = {
  shortcuts: Shortcut[];
  addShortcut: (shortcut: NewShortcut) => void;
  removeShortcut: (id: string) => void;
  reorder: (activeId: string, overId: string) => void;
};

/**
 * Turn possibly-incomplete user input into a normalized absolute URL.
 * `figma.com` → `https://figma.com/`. Returns "" when the input can't be parsed,
 * which callers treat as invalid.
 */
export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).href;
  } catch {
    return "";
  }
}

/**
 * Google's favicon service for a normalized URL's host. Returns null when the
 * URL can't be parsed (callers fall back to a letter glyph).
 */
export function faviconUrl(normalized: string): string | null {
  try {
    const host = new URL(normalized).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=64`;
  } catch {
    return null;
  }
}

/** Shortcuts are now backed by the per-user dashboard state (Supabase + cache). */
export function useShortcuts(): UseShortcuts {
  const { shortcuts, setShortcuts } = useDashboardState();

  const addShortcut = useCallback(
    ({ name, url, iconUrl }: NewShortcut) => {
      const normalized = normalizeUrl(url);
      const trimmedName = name.trim();
      if (!normalized || !trimmedName) return;
      const normalizedIcon = iconUrl ? normalizeUrl(iconUrl) : "";
      setShortcuts((current) => {
        // Re-check inside the callback so two fast adds can't both slip through.
        if (current.some((s) => s.url === normalized)) return current;
        return [
          ...current,
          {
            id: crypto.randomUUID(),
            name: trimmedName,
            url: normalized,
            ...(normalizedIcon ? { iconUrl: normalizedIcon } : {}),
          },
        ];
      });
    },
    [setShortcuts],
  );

  const removeShortcut = useCallback(
    (id: string) => {
      setShortcuts((current) => current.filter((s) => s.id !== id));
    },
    [setShortcuts],
  );

  const reorder = useCallback(
    (activeId: string, overId: string) => {
      setShortcuts((current) => {
        const from = current.findIndex((s) => s.id === activeId);
        const to = current.findIndex((s) => s.id === overId);
        if (from === -1 || to === -1 || from === to) return current;
        const next = [...current];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
    },
    [setShortcuts],
  );

  return { shortcuts, addShortcut, removeShortcut, reorder };
}
