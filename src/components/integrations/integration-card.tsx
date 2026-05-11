import { formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";

import { IntegrationStatusBadge } from "@/components/integrations/integration-status-badge";
import { ProviderIcon } from "@/components/widgets/provider-icon";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { IntegrationStatusRecord } from "@/features/integrations/types";

export function IntegrationCard({
  record,
}: {
  record: IntegrationStatusRecord;
}) {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-accent text-foreground flex size-11 items-center justify-center rounded-2xl">
              <ProviderIcon provider={record.provider} />
            </div>
            <div>
              <CardTitle className="text-lg">{record.label}</CardTitle>
              <CardDescription className="mt-1 max-w-lg">
                {record.description}
              </CardDescription>
            </div>
          </div>
          <IntegrationStatusBadge status={record.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="text-muted-foreground grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-foreground font-medium">Connected account</dt>
            <dd className="mt-1">{record.providerAccountEmail ?? "Not connected"}</dd>
          </div>
          <div>
            <dt className="text-foreground font-medium">Last updated</dt>
            <dd className="mt-1">
              {record.lastSyncAt
                ? formatDistanceToNowStrict(new Date(record.lastSyncAt), {
                    addSuffix: true,
                  })
                : "No sync yet"}
            </dd>
          </div>
        </dl>

        <div className="flex flex-wrap gap-3">
          <Link href={record.connectPath} className={buttonVariants({ variant: "default" })}>
            {record.status === "connected" ? "Reconnect" : "Connect"}
          </Link>
          <Button variant="outline" disabled>
            Disconnect
          </Button>
          <span
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "text-muted-foreground pointer-events-none px-0",
            )}
          >
            Read-only for now.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
