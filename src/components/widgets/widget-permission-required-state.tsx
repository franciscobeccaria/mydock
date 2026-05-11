import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WidgetPermissionRequiredState({
  providerLabel,
}: {
  providerLabel: string;
}) {
  return (
    <div className="border-border/70 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center">
      <ShieldAlert className="text-muted-foreground mb-3 size-8" />
      <p className="text-foreground text-sm font-medium">
        Grant access to show your {providerLabel.toLowerCase()}.
      </p>
      <p className="text-muted-foreground mt-2 mb-4 max-w-sm text-sm">
        You&apos;re signed in. MyDock just needs your approval for this part of Google Workspace.
      </p>
      <Link
        href="/api/integrations/google/start?next=/settings/integrations"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Review access
      </Link>
    </div>
  );
}
