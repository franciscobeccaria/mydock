import { formatDistanceToNowStrict } from "date-fns";
import { ArrowUpRight, Clock3 } from "lucide-react";
import Link from "next/link";

import { ProviderIcon } from "@/components/widgets/provider-icon";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Provider, WidgetPayload } from "@/features/integrations/types";

const statusVariantMap = {
  disconnected: "secondary",
  pending: "outline",
  connected: "default",
  error: "destructive",
} as const;

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
                  <Badge
                    variant={statusVariantMap[payload.connectionStatus]}
                    className="rounded-full px-2.5"
                  >
                    {payload.isMock ? "Mock data" : payload.connectionStatus}
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger className="inline-flex items-center gap-1">
                      <Clock3 className="size-3.5" />
                      Updated{" "}
                      {formatDistanceToNowStrict(
                        new Date(payload.lastUpdatedAt),
                        {
                          addSuffix: true,
                        },
                      )}
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
      <CardFooter className="text-muted-foreground pt-1 text-xs">
        Built for a read-first MVP with real adapters scaffolded behind server
        routes.
      </CardFooter>
    </Card>
  );
}
