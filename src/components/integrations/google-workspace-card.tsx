import { formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";

import { IntegrationStatusBadge } from "@/components/integrations/integration-status-badge";
import { ProviderIcon } from "@/components/widgets/provider-icon";
import { Badge } from "@/components/ui/badge";
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

const capabilityOrder = ["gmail", "google_calendar", "google_tasks"] as const;

export function GoogleWorkspaceCard({
  records,
}: {
  records: IntegrationStatusRecord[];
}) {
  const sortedRecords = capabilityOrder
    .map((provider) => records.find((record) => record.provider === provider))
    .filter((record): record is IntegrationStatusRecord => Boolean(record));

  const connectedCount = sortedRecords.filter((record) => !record.needsConsent && record.status === "connected").length;
  const primaryRecord = sortedRecords.find((record) => record.providerAccountEmail) ?? sortedRecords[0];
  const lastSyncAt = sortedRecords
    .map((record) => record.lastSyncAt)
    .find((value): value is string => Boolean(value));

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-accent text-foreground flex size-11 items-center justify-center rounded-2xl">
              <ProviderIcon provider="gmail" />
            </div>
            <div>
              <CardTitle className="text-lg">Google Workspace</CardTitle>
              <CardDescription className="mt-1 max-w-2xl">
                Connect Gmail, Calendar, and Tasks in one step, then choose which parts of your day you want MyDock to show.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="rounded-full px-2.5">
            {connectedCount}/{sortedRecords.length} ready
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-3xl border border-dashed p-4 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground text-sm">Connected account</p>
            <p className="mt-1 font-medium">
              {primaryRecord?.providerAccountEmail ?? "Not connected yet"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-sm">Last updated</p>
            <p className="mt-1 font-medium">
              {lastSyncAt
                ? formatDistanceToNowStrict(new Date(lastSyncAt), {
                    addSuffix: true,
                  })
                : "No sync yet"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {sortedRecords.map((record) => (
            <div
              key={record.provider}
              className="border-border/60 flex items-center justify-between gap-4 rounded-2xl border p-4"
            >
              <div className="flex items-center gap-3">
                <div className="bg-accent text-foreground flex size-10 items-center justify-center rounded-2xl">
                  <ProviderIcon provider={record.provider} />
                </div>
                <div>
                  <p className="font-medium">{record.label}</p>
                  <p className="text-muted-foreground text-sm">
                    {record.needsConsent
                      ? `Needs access to show your ${record.label.toLowerCase()}.`
                      : record.description}
                  </p>
                </div>
              </div>
              <IntegrationStatusBadge status={record.needsConsent ? "pending" : record.status} />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/api/integrations/google/start?next=/settings/integrations" className={buttonVariants()}>
            {primaryRecord?.providerAccountEmail ? "Review access" : "Connect Google Workspace"}
          </Link>
          <Button variant="outline" disabled>
            Disconnect
          </Button>
          <span className={cn(buttonVariants({ variant: "ghost" }), "pointer-events-none px-0 text-muted-foreground")}>
            You can keep working even if only some permissions are enabled.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
