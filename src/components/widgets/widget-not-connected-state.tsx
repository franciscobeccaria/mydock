import Link from "next/link";
import { PlugZap } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";

export function WidgetNotConnectedState({
  providerLabel,
}: {
  providerLabel: string;
}) {
  return (
    <div className="border-border/70 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center">
      <PlugZap className="text-muted-foreground mb-3 size-8" />
      <p className="text-muted-foreground mb-4 max-w-sm text-sm">
        Connect {providerLabel} in integrations to replace mock previews with
        live data.
      </p>
      <Link
        href="/settings/integrations"
        className={buttonVariants({ variant: "outline", size: "sm" })}
      >
        Open integrations
      </Link>
    </div>
  );
}
