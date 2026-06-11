import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WidgetPermissionRequiredState({
  providerLabel,
  actionHref = "/api/integrations/google/start?next=/",
  actionLabel = "Review access",
}: {
  providerLabel: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[18px] border border-dashed border-[#E5E7EB] bg-[#FCFCFC] px-5 py-8 text-center">
      <ShieldAlert className="mb-2 size-6 text-[#A1A1AA]" />
      <p className="text-xs font-medium text-[#18181B]">
        Grant access to show your {providerLabel.toLowerCase()}.
      </p>
      <p className="mt-1.5 mb-3 max-w-sm text-xs text-[#71717A]">
        You&apos;re signed in. MyDock just needs your approval for this part of Google Workspace.
      </p>
      <Link
        href={actionHref}
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "rounded-full border-[#E4E4E7] bg-white px-3 text-xs text-[#18181B] hover:bg-[#F4F4F5]",
        )}
      >
        {actionLabel}
      </Link>
    </div>
  );
}
