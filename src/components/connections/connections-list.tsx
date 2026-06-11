"use client";

import { Plus } from "lucide-react";

import { ProviderIcon } from "@/components/widgets/provider-icon";
import { ConnectionRow } from "@/components/connections/connection-row";
import type {
  ConnectionRecord,
  ConnectionsByProvider,
} from "@/features/connections/queries";

export function ConnectionsList({
  connections,
}: {
  connections: ConnectionsByProvider;
}) {
  return (
    <div className="grid gap-6">
      {/* ── Google group ─────────────────────────────────────────── */}
      <ProviderGroup
        provider="gmail"
        title="Google"
        connections={connections.google}
        addLabel="Connect another Google account"
        onAdd={() => {
          window.location.href =
            "/api/integrations/google/start?next=/connections";
        }}
      />

      {/* ── Linear group ─────────────────────────────────────────── */}
      <ProviderGroup
        provider="linear"
        title="Linear"
        connections={connections.linear}
        addLabel="Connect a Linear workspace"
        onAdd={() => {
          // Linear connect dialog wired in Task 7
        }}
      />
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
}: {
  provider: "gmail" | "linear";
  title: string;
  connections: ConnectionRecord[];
  addLabel: string;
  onAdd: () => void;
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

      <div className="px-6 py-4">
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-2 rounded-full border border-dashed border-[#D4D4D8] px-4 py-2 text-sm font-medium text-[#52525B] transition-colors hover:border-[#18181B] hover:text-[#18181B]"
        >
          <Plus className="size-4" />
          {addLabel}
        </button>
      </div>
    </div>
  );
}
