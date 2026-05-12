import Link from "next/link";

import { ProviderIcon } from "@/components/widgets/provider-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Provider } from "@/features/integrations/types";

export function WidgetCard({
  provider,
  title,
  headerControl,
  footerAction,
  children,
  className,
}: {
  provider: Provider;
  title: string;
  headerControl?: React.ReactNode;
  footerAction?: {
    label: string;
    href: string;
  };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border border-[#E7E7EA] bg-white py-0 shadow-[0_12px_32px_rgba(17,24,39,0.05)] rounded-[28px]",
        className,
      )}
    >
      <CardHeader className="px-7 pt-7 pb-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#F4F4F5] text-[#18181B]">
              <ProviderIcon provider={provider} />
            </div>
            <CardTitle className="text-[1.05rem] font-semibold tracking-tight text-[#18181B]">
              {title}
            </CardTitle>
          </div>
          {headerControl ? <div className="shrink-0">{headerControl}</div> : null}
        </div>
      </CardHeader>

      <CardContent className="px-7 pt-6 pb-7">
        <div className="min-h-[300px]">{children}</div>

        {footerAction ? (
          <>
            <Separator className="my-6 h-px w-full bg-[#ECECEF]" />
            <Link
              href={footerAction.href}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-[#2563EB] transition-colors hover:text-[#1D4ED8]"
            >
              {footerAction.label}
            </Link>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
