import { format } from "date-fns";

import { WidgetCard } from "@/components/widgets/widget-card";
import { WidgetEmptyState } from "@/components/widgets/widget-empty-state";
import { WidgetErrorState } from "@/components/widgets/widget-error-state";
import { WidgetLoadingState } from "@/components/widgets/widget-loading-state";
import { WidgetNotConnectedState } from "@/components/widgets/widget-not-connected-state";
import { WidgetPermissionRequiredState } from "@/components/widgets/widget-permission-required-state";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WidgetPayload } from "@/features/integrations/types";

export function GmailWidget({ payload }: { payload: WidgetPayload }) {
  return (
    <WidgetCard provider="gmail" title="Gmail" payload={payload}>
      {payload.state === "loading" ? <WidgetLoadingState /> : null}
      {payload.state === "error" ? (
        <WidgetErrorState message={payload.error ?? "Gmail could not load."} />
      ) : null}
      {payload.state === "empty" ? (
        <WidgetEmptyState message={payload.emptyMessage ?? "Inbox zero. Nice."} />
      ) : null}
      {payload.state === "not_connected" ? (
        <WidgetNotConnectedState providerLabel="Gmail" />
      ) : null}
      {payload.state === "permission_required" ? (
        <WidgetPermissionRequiredState providerLabel="Gmail" />
      ) : null}
      {payload.state === "connected" ? (
        <ScrollArea className="h-[290px] pr-4">
          <div className="space-y-3">
            {payload.items.slice(0, 5).map((item) => (
              <div key={item.id} className="border-border/60 rounded-2xl border p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium">{item.subtitle}</p>
                  <span className="text-muted-foreground text-xs">
                    {item.occurredAt ? format(new Date(item.occurredAt), "p") : ""}
                  </span>
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <p className="line-clamp-1 leading-5 font-medium">{item.title}</p>
                  {item.metadata?.unread === true ? (
                    <Badge className="rounded-full px-2">Unread</Badge>
                  ) : null}
                </div>
                <p className="text-muted-foreground line-clamp-2 text-sm">{item.summary}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : null}
    </WidgetCard>
  );
}
