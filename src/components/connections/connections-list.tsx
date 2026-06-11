"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { ProviderIcon } from "@/components/widgets/provider-icon";
import { ConnectionRow } from "@/components/connections/connection-row";
import { LinearConnectDialog } from "@/components/connections/linear-connect-dialog";
import type {
  ConnectionRecord,
  ConnectionsByProvider,
} from "@/features/connections/queries";

export function ConnectionsList({
  connections,
}: {
  connections: ConnectionsByProvider;
}) {
  const [linearOpen, setLinearOpen] = useState(false);

  return (
    <div className="grid gap-6">
      {/* ── Google group ─────────────────────────────────────────── */}
      {/* Connecting a SECOND Google account needs a dedicated OAuth flow with
          its own per-account refresh token (Supabase Auth is single-identity and
          doesn't expose durable per-identity tokens). Tracked as a follow-up;
          disabled for now. The login Google account is the default connection. */}
      <ProviderGroup
        provider="gmail"
        title="Google"
        connections={connections.google}
        addLabel="Connect another Google account"
        addDisabledHint="Coming soon"
        onAdd={() => {}}
      />

      {/* ── Linear group ─────────────────────────────────────────── */}
      <ProviderGroup
        provider="linear"
        title="Linear"
        connections={connections.linear}
        addLabel="Connect a Linear workspace"
        onAdd={() => setLinearOpen(true)}
      />

      <LinearConnectDialog open={linearOpen} onOpenChange={setLinearOpen} />
    </div>
  );
}

/* ── A provider group with its connection rows + add affordance ── */

function ProviderGroup({
  provider,
  title,
  connections,
  addLabel,
  onAdd,
  addDisabledHint,
}: {
  provider: "gmail" | "linear";
  title: string;
  connections: ConnectionRecord[];
  addLabel: string;
  onAdd: () => void;
  /** When set, the add button is disabled and shows this hint (e.g. "Coming soon"). */
  addDisabledHint?: string;
}) {
  return (
    <div className="rounded-[28px] border border-[#E7E7EA] bg-white shadow-[0_12px_32px_rgba(17,24,39,0.05)]">
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-[#F4F4F5]">
          <ProviderIcon provider={provider} />
        </div>
        <span className="text-lg font-semibold text-[#18181B]">{title}</span>
      </div>

      {connections.length > 0 ? (
        <div className="border-t border-[#F0F0F2]">
          {connections.map((c) => (
            <ConnectionRow key={c.id} connection={c} />
          ))}
        </div>
      ) : null}

      <div className="flex items-center gap-3 px-6 py-4">
        <button
          type="button"
          onClick={onAdd}
          disabled={Boolean(addDisabledHint)}
          className="flex items-center gap-2 rounded-full border border-dashed border-[#D4D4D8] px-4 py-2 text-sm font-medium text-[#52525B] transition-colors hover:border-[#18181B] hover:text-[#18181B] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[#D4D4D8] disabled:hover:text-[#52525B]"
        >
          <Plus className="size-4" />
          {addLabel}
        </button>
        {addDisabledHint ? (
          <span className="text-xs text-[#A1A1AA]">{addDisabledHint}</span>
        ) : null}
      </div>
    </div>
  );
}
