import Link from "next/link";
import { PlugZap } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function WidgetNotConnectedState({
  providerLabel,
  actionHref = "/settings/integrations",
  actionLabel = "Open integrations",
}: {
  providerLabel: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-[18px] border border-dashed border-[#E5E7EB] bg-[#FCFCFC] px-5 py-8 text-center">
      <PlugZap className="mb-2 size-6 text-[#A1A1AA]" />
      <p className="mb-3 max-w-sm text-xs text-[#71717A]">
        Connect {providerLabel} to see its latest updates here.
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
