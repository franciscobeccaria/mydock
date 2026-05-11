import { format } from "date-fns";

import { WidgetCard } from "@/components/widgets/widget-card";
import { WidgetEmptyState } from "@/components/widgets/widget-empty-state";
import { WidgetErrorState } from "@/components/widgets/widget-error-state";
import { WidgetLoadingState } from "@/components/widgets/widget-loading-state";
import { WidgetNotConnectedState } from "@/components/widgets/widget-not-connected-state";
import { WidgetPermissionRequiredState } from "@/components/widgets/widget-permission-required-state";
import type { WidgetPayload } from "@/features/integrations/types";

export function GoogleCalendarWidget({ payload }: { payload: WidgetPayload }) {
  return (
    <WidgetCard provider="google_calendar" title="Calendar" payload={payload}>
      {payload.state === "loading" ? <WidgetLoadingState /> : null}
      {payload.state === "error" ? (
        <WidgetErrorState message={payload.error ?? "Calendar could not load."} />
      ) : null}
      {payload.state === "empty" ? (
        <WidgetEmptyState message={payload.emptyMessage ?? "No events on deck."} />
      ) : null}
      {payload.state === "not_connected" ? (
        <WidgetNotConnectedState providerLabel="Google Calendar" />
      ) : null}
      {payload.state === "permission_required" ? (
        <WidgetPermissionRequiredState providerLabel="Google Calendar" />
      ) : null}
      {payload.state === "connected" ? (
        <div className="space-y-3">
          {payload.items.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="border-border/60 grid grid-cols-[76px_1fr] gap-4 rounded-2xl border p-3"
            >
              <div className="text-muted-foreground text-sm font-medium">
                {item.occurredAt ? format(new Date(item.occurredAt), "p") : "All day"}
              </div>
              <div className="min-w-0">
                <p className="leading-5 font-medium">{item.title}</p>
                <p className="text-muted-foreground mt-1 text-sm">{item.summary}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </WidgetCard>
  );
}
