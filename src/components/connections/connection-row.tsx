"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ConnectionRecord } from "@/features/connections/queries";

export function ConnectionRow({ connection }: { connection: ConnectionRecord }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PATCH = set default, DELETE = disconnect. Only refresh on success so a failed
  // mutation doesn't silently re-render unchanged as if it had worked.
  async function mutate(method: "PATCH" | "DELETE") {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/connections/${connection.id}`, { method });
      if (!res.ok) {
        setError(method === "DELETE" ? "Couldn't disconnect." : "Couldn't set as default.");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function setDefault() {
    if (connection.isDefault) return;
    void mutate("PATCH");
  }

  function disconnect() {
    if (connection.isDefault) return;
    void mutate("DELETE");
  }

  function reconnect() {
    if (connection.provider === "google") {
      window.location.href =
        "/api/integrations/google/start?next=/connections";
      return;
    }
    // Linear has no per-row reconnect: re-pasting a key via the group's
    // "Connect a Linear workspace" button upserts the same workspace.
  }

  // Reconnect is only meaningful for Google (OAuth re-auth). For Linear it is a
  // no-op — see the comment above; we leave the menu item inert rather than add
  // cross-component dialog plumbing.
  function reconnectDisabled() {
    return connection.provider === "linear";
  }

  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#F0F0F2] px-6 py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-[#18181B]">
            {connection.email ?? "Connected account"}
          </span>
          {connection.isDefault ? (
            <span className="rounded-full bg-[#F4F4F5] px-2 py-0.5 text-[11px] font-medium text-[#52525B]">
              Default · Login
            </span>
          ) : null}
        </div>
        {error ? <p className="mt-1 text-xs text-[#DC2626]">{error}</p> : null}
      </div>

      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs text-[#71717A]">
          <Check className="size-3.5 text-[#16A34A]" />
          Synced
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex size-8 items-center justify-center rounded-full text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#18181B]"
            aria-label="Connection options"
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={reconnect} disabled={reconnectDisabled()}>
              Reconnect
            </DropdownMenuItem>
            {!connection.isDefault ? (
              <DropdownMenuItem onClick={setDefault} disabled={busy}>
                Set as default
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              onClick={disconnect}
              disabled={connection.isDefault || busy}
              className={connection.isDefault ? "" : "text-[#DC2626]"}
            >
              {connection.isDefault ? "Can't remove default" : "Disconnect"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
