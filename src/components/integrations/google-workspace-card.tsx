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
    <Card className="rounded-[28px] border border-[#E7E7EA] bg-white py-0 shadow-[0_12px_32px_rgba(17,24,39,0.05)]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#F4F4F5] text-[#18181B]">
              <ProviderIcon provider="gmail" />
            </div>
            <div>
              <CardTitle className="text-lg text-[#18181B]">Google Workspace</CardTitle>
              <CardDescription className="mt-1 max-w-2xl text-[#71717A]">
                Connect Gmail, Calendar, and Tasks in one step, then choose which parts of your day you want MyDock to show.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="rounded-full border-[#E4E4E7] px-2.5 text-[#52525B]">
            {connectedCount}/{sortedRecords.length} ready
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 rounded-3xl border border-dashed border-[#E4E4E7] bg-[#FCFCFC] p-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-[#71717A]">Connected account</p>
            <p className="mt-1 font-medium text-[#18181B]">
              {primaryRecord?.providerAccountEmail ?? "Not connected yet"}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#71717A]">Last updated</p>
            <p className="mt-1 font-medium text-[#18181B]">
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
              className="flex items-center justify-between gap-4 rounded-2xl border border-[#ECECEF] bg-[#FCFCFC] p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-[#F4F4F5] text-[#18181B]">
                  <ProviderIcon provider={record.provider} />
                </div>
                <div>
                  <p className="font-medium text-[#18181B]">{record.label}</p>
                  <p className="text-sm text-[#71717A]">
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
          <Link
            href="/api/integrations/google/start?next=/settings/integrations"
            className={cn(buttonVariants(), "rounded-full")}
          >
            {primaryRecord?.providerAccountEmail ? "Review access" : "Connect Google Workspace"}
          </Link>
          <Button variant="outline" disabled className="rounded-full">
            Disconnect
          </Button>
          <span className={cn(buttonVariants({ variant: "ghost" }), "pointer-events-none px-0 text-[#71717A]")}>
            You can keep working even if only some permissions are enabled.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
