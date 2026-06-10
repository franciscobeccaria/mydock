"use client";

import { useState } from "react";

import { faviconUrl } from "@/components/dashboard/use-shortcuts";
import { cn } from "@/lib/utils";

/**
 * Renders a shortcut's icon, preferring a user-supplied custom image, then the
 * site's favicon (via Google's favicon service), and finally the first letter
 * of the name. Each source advances to the next when its image fails to load.
 * Shared by the dock chips and the add-shortcut preview so they never diverge.
 */
export function ShortcutFavicon({
  url,
  name,
  iconUrl,
  className,
}: {
  url: string;
  name: string;
  /** Optional custom image URL; takes precedence over the favicon when set. */
  iconUrl?: string;
  className?: string;
}) {
  // Track which sources have failed rather than resetting in an effect — this
  // re-attempts automatically when url/iconUrl change (e.g. typing in the
  // dialog) without a setState-in-effect cascade.
  const [failed, setFailed] = useState<Set<string>>(new Set());

  // Source chain: custom icon → favicon → letter.
  const sources = [iconUrl?.trim() || null, faviconUrl(url)].filter(
    (s): s is string => !!s,
  );
  const src = sources.find((s) => !failed.has(s));

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote icons aren't known at build time
      <img
        src={src}
        alt=""
        width={28}
        height={28}
        // referrerPolicy keeps the dashboard URL from leaking to remote hosts.
        referrerPolicy="no-referrer"
        onError={() => setFailed((prev) => new Set(prev).add(src))}
        className={cn("size-7", className)}
      />
    );
  }

  return (
    <span className={cn("text-sm font-semibold text-[#71717A]", className)}>
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}
