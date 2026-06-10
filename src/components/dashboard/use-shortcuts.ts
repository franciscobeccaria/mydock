"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mydock:shortcuts:v1";

export type Shortcut = {
  id: string;
  name: string;
  /** Always a normalized absolute URL (see {@link normalizeUrl}). */
  url: string;
  /** Optional custom image URL; when absent the favicon is used. */
  iconUrl?: string;
};

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

/** Keep only well-formed shortcuts, backfill ids, and drop duplicate URLs. */
function sanitize(raw: unknown): Shortcut[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: Shortcut[] = [];
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const candidate = entry as Record<string, unknown>;
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    const rawUrl = typeof candidate.url === "string" ? candidate.url : "";
    const url = normalizeUrl(rawUrl);
    if (!name || !url || seen.has(url)) continue;
    seen.add(url);
    const id = typeof candidate.id === "string" && candidate.id ? candidate.id : crypto.randomUUID();
    const iconUrl =
      typeof candidate.iconUrl === "string" ? normalizeUrl(candidate.iconUrl) : "";
    result.push({ id, name, url, ...(iconUrl ? { iconUrl } : {}) });
  }
  return result;
}

function readShortcuts(): Shortcut[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return sanitize(JSON.parse(stored));
  } catch {
    return [];
  }
}

export function useShortcuts(): UseShortcuts {
  // The shortcuts row renders only inside the client-only (ssr:false) widget
  // subtree, so reading localStorage in the initializer is safe and avoids a
  // hydration mismatch — same guarantee as useDashboardLayout.
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => readShortcuts());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts));
    } catch {
      // Storage may be unavailable (private mode); state still works in-session.
    }
  }, [shortcuts]);

  const addShortcut = useCallback(({ name, url, iconUrl }: NewShortcut) => {
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
  }, []);

  const removeShortcut = useCallback((id: string) => {
    setShortcuts((current) => current.filter((s) => s.id !== id));
  }, []);

  const reorder = useCallback((activeId: string, overId: string) => {
    setShortcuts((current) => {
      const from = current.findIndex((s) => s.id === activeId);
      const to = current.findIndex((s) => s.id === overId);
      if (from === -1 || to === -1 || from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  return { shortcuts, addShortcut, removeShortcut, reorder };
}
