"use client";

/**
 * THROWAWAY PREVIEW — FRA-138 UI direction (Connections).
 * Mocked data only; no DB, OAuth, or server actions. Delete after the ticket lands.
 * Three surfaces: (1) Connections list grouped by provider, (2) Linear paste-key
 * dialog, (3) locked-widget tile as it appears in the Add-widget dialog.
 */

import { useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  MoreHorizontal,
  Plus,
  ExternalLink,
} from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { ProviderIcon } from "@/components/widgets/provider-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Connection = {
  id: string;
  primary: string; // workspace name or email
  secondary?: string; // email sublabel
  isDefault?: boolean; // the login Google connection — not removable
};

const GOOGLE_CONNECTIONS: Connection[] = [
  { id: "g1", primary: "fran@koombea.com", isDefault: true },
  { id: "g2", primary: "fran.personal@gmail.com" },
];

const LINEAR_CONNECTIONS: Connection[] = [
  { id: "l1", primary: "Koombea workspace", secondary: "fran@koombea.com" },
];

export default function ConnectionsPreviewPage() {
  const [linearOpen, setLinearOpen] = useState(false);

  return (
    <PageContainer className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#18181B]">Connections</h1>
        <p className="mt-1 text-sm text-[#71717A]">
          Connect your accounts. Widgets use these connections to show your data.
        </p>
      </div>

      <div className="grid gap-6">
        {/* ── Google group ─────────────────────────────────────────── */}
        <ProviderGroup
          provider="gmail"
          title="Google"
          connections={GOOGLE_CONNECTIONS}
          addLabel="Connect another Google account"
          onAdd={() => alert("→ Google OAuth (sign in with another account)")}
        />

        {/* ── Linear group ─────────────────────────────────────────── */}
        <ProviderGroup
          provider="linear"
          title="Linear"
          connections={LINEAR_CONNECTIONS}
          addLabel="Connect a Linear workspace"
          onAdd={() => setLinearOpen(true)}
        />
      </div>

      {/* ── Surface 3: locked widget, as seen in the Add-widget dialog ─ */}
      <div className="space-y-3">
        <p className="text-xs font-semibold tracking-wide text-[#71717A] uppercase">
          Add-widget dialog · locked tile (when provider not connected)
        </p>
        <div className="flex flex-wrap gap-3">
          <LockedWidgetTile
            provider="linear"
            label="Linear · My Issues"
            onConnect={() => setLinearOpen(true)}
          />
        </div>
      </div>

      <LinearConnectDialog open={linearOpen} onOpenChange={setLinearOpen} />
    </PageContainer>
  );
}

/* ── Surface 1: a provider group with its connection rows + add affordance ── */

function ProviderGroup({
  provider,
  title,
  connections,
  addLabel,
  onAdd,
}: {
  provider: "gmail" | "linear";
  title: string;
  connections: Connection[];
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

      <div className="border-t border-[#F0F0F2]">
        {connections.map((c) => (
          <ConnectionRow key={c.id} connection={c} />
        ))}
      </div>

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

function ConnectionRow({ connection }: { connection: Connection }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#F0F0F2] px-6 py-4 last:border-b-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-[#18181B]">
            {connection.primary}
          </span>
          {connection.isDefault ? (
            <span className="rounded-full bg-[#F4F4F5] px-2 py-0.5 text-[11px] font-medium text-[#52525B]">
              Default · Login
            </span>
          ) : null}
        </div>
        {connection.secondary ? (
          <span className="text-xs text-[#71717A]">{connection.secondary}</span>
        ) : null}
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
            <DropdownMenuItem>Reconnect</DropdownMenuItem>
            {!connection.isDefault ? (
              <DropdownMenuItem>Set as default</DropdownMenuItem>
            ) : null}
            <DropdownMenuItem
              disabled={connection.isDefault}
              className={connection.isDefault ? "" : "text-[#DC2626]"}
            >
              {connection.isDefault ? "Can't remove login account" : "Disconnect"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

/* ── Surface 2: the Linear paste-key dialog ────────────────────────────────── */

function LinearConnectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [key, setKey] = useState("");
  const [reveal, setReveal] = useState(false);
  const [state, setState] = useState<"idle" | "verifying" | "ok" | "error">("idle");

  function submit() {
    if (!key.trim()) return;
    setState("verifying");
    // Mock validation: keys starting with lin_api_ "succeed".
    setTimeout(() => {
      setState(key.startsWith("lin_api_") ? "ok" : "error");
    }, 1200);
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setKey("");
      setReveal(false);
      setState("idle");
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect a Linear workspace</DialogTitle>
          <DialogDescription>
            Create a personal API key in Linear and paste it below.
          </DialogDescription>
        </DialogHeader>

        <ol className="space-y-2.5 text-sm text-[#52525B]">
          <li className="flex gap-2">
            <Step n={1} />
            <span>
              Open Linear → Settings → Security &amp; access → API.{" "}
              <a
                href="https://linear.app/settings/api"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[#18181B] underline underline-offset-2"
              >
                Open Linear API settings <ExternalLink className="size-3" />
              </a>
            </span>
          </li>
          <li className="flex gap-2">
            <Step n={2} />
            <span>Click &ldquo;New API key&rdquo; and name it &ldquo;MyDock&rdquo;.</span>
          </li>
          <li className="flex gap-2">
            <Step n={3} />
            <span>Copy the key and paste it below.</span>
          </li>
        </ol>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#71717A]">Linear API key</label>
          <div className="relative">
            <Input
              type={reveal ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="lin_api_..."
              className="pr-10"
              disabled={state === "verifying" || state === "ok"}
            />
            <button
              type="button"
              onClick={() => setReveal((r) => !r)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-[#A1A1AA] hover:text-[#52525B]"
              aria-label={reveal ? "Hide key" : "Show key"}
            >
              {reveal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-xs text-[#A1A1AA]">
            We encrypt this and never show it again.
          </p>
        </div>

        {state === "verifying" ? (
          <p className="flex items-center gap-2 text-sm text-[#71717A]">
            <Loader2 className="size-4 animate-spin" /> Verifying key…
          </p>
        ) : null}
        {state === "ok" ? (
          <p className="flex items-center gap-2 text-sm text-[#16A34A]">
            <Check className="size-4" /> Connected &ldquo;Koombea&rdquo; (fran@koombea.com)
          </p>
        ) : null}
        {state === "error" ? (
          <p className="text-sm text-[#DC2626]">
            That key didn&rsquo;t work. Check it and try again.
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={state === "verifying" || state === "ok"}>
            Connect workspace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Step({ n }: { n: number }) {
  return (
    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#18181B] text-[11px] font-semibold text-white">
      {n}
    </span>
  );
}

/* ── Surface 3: a locked widget tile (disabled + connect CTA) ──────────────── */

function LockedWidgetTile({
  provider,
  label,
  onConnect,
}: {
  provider: "linear";
  label: string;
  onConnect: () => void;
}) {
  return (
    <div
      className={cn(
        "flex w-[220px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#E7E7EA] bg-[#FAFAFA] p-4 text-center",
      )}
    >
      <div className="flex size-9 items-center justify-center rounded-xl bg-white">
        <Lock className="size-4 text-[#A1A1AA]" />
      </div>
      <div className="flex items-center gap-1.5">
        <ProviderIcon provider={provider} className="size-3.5" />
        <p className="text-sm font-semibold text-[#A1A1AA]">{label}</p>
      </div>
      <p className="text-xs text-[#A1A1AA]">Connect Linear to use this widget.</p>
      <button
        type="button"
        onClick={onConnect}
        className="mt-1 rounded-full bg-[#18181B] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
      >
        Connect Linear →
      </button>
    </div>
  );
}
