import { formatDistanceToNowStrict } from "date-fns";
import { ArrowUpRight, Clock3 } from "lucide-react";
import Link from "next/link";

import { ProviderIcon } from "@/components/widgets/provider-icon";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Provider, WidgetPayload } from "@/features/integrations/types";

function getStatusBadge(payload: WidgetPayload) {
  if (payload.state === "permission_required") {
    return {
      label: "Needs access",
      variant: "outline" as const,
    };
  }

  if (payload.state === "error" || payload.connectionStatus === "error") {
    return {
      label: "Issue",
      variant: "destructive" as const,
    };
  }

  if (payload.connectionStatus === "connected") {
    return {
      label: "Connected",
      variant: "default" as const,
    };
  }

  if (payload.connectionStatus === "pending") {
    return {
      label: "Needs attention",
      variant: "outline" as const,
    };
  }

  return {
    label: "Not connected",
    variant: "secondary" as const,
  };
}

export function WidgetCard({
  provider,
  title,
  payload,
  children,
  href,
  wide = false,
}: {
  provider: Provider | "today";
  title: string;
  payload?: WidgetPayload;
  children: React.ReactNode;
  href?: string;
  wide?: boolean;
}) {
  const badge = payload ? getStatusBadge(payload) : null;

  return (
    <Card
      className={
        wide
          ? "border-border/70 col-span-full shadow-sm lg:col-span-2"
          : "border-border/70 shadow-sm"
      }
    >
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-accent text-foreground flex size-11 items-center justify-center rounded-2xl">
              <ProviderIcon provider={provider} />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold tracking-tight">
                {title}
              </CardTitle>
              {payload ? (
                <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                  {badge ? (
                    <Badge variant={badge.variant} className="rounded-full px-2.5">
                      {badge.label}
                    </Badge>
                  ) : null}
                  <Tooltip>
                    <TooltipTrigger className="inline-flex items-center gap-1">
                      <Clock3 className="size-3.5" />
                      Updated {formatDistanceToNowStrict(new Date(payload.lastUpdatedAt), {
                        addSuffix: true,
                      })}
                    </TooltipTrigger>
                    <TooltipContent>
                      {new Date(payload.lastUpdatedAt).toLocaleString()}
                    </TooltipContent>
                  </Tooltip>
                </div>
              ) : null}
            </div>
          </div>

          {href ? (
            <Link
              href={href}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground rounded-full",
              )}
            >
              View all <ArrowUpRight className="ml-1 size-4" />
            </Link>
          ) : (
            <span
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-muted-foreground rounded-full opacity-50",
              )}
            >
              View all <ArrowUpRight className="ml-1 size-4" />
            </span>
          )}
        </div>
        <Separator />
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
