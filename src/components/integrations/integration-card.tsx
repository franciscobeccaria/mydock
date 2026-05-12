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
    <Card className="rounded-[28px] border border-[#E7E7EA] bg-white py-0 shadow-[0_12px_32px_rgba(17,24,39,0.05)]">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-[#F4F4F5] text-[#18181B]">
              <ProviderIcon provider={record.provider} />
            </div>
            <div>
              <CardTitle className="text-lg text-[#18181B]">{record.label}</CardTitle>
              <CardDescription className="mt-1 max-w-lg text-[#71717A]">
                {record.description}
              </CardDescription>
            </div>
          </div>
          <IntegrationStatusBadge status={record.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 rounded-3xl border border-dashed border-[#E4E4E7] bg-[#FCFCFC] p-4 text-sm text-[#71717A] sm:grid-cols-2">
          <div>
            <dt className="font-medium text-[#18181B]">Connected account</dt>
            <dd className="mt-1">{record.providerAccountEmail ?? "Not connected"}</dd>
          </div>
          <div>
            <dt className="font-medium text-[#18181B]">Last updated</dt>
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
          <Link
            href={record.connectPath}
            className={cn(buttonVariants({ variant: "default" }), "rounded-full")}
          >
            {record.status === "connected" ? "Reconnect" : "Connect"}
          </Link>
          <Button variant="outline" disabled className="rounded-full">
            Disconnect
          </Button>
          <span
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "pointer-events-none px-0 text-[#71717A]",
            )}
          >
            Read-only for now.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
