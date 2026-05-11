import { format } from "date-fns";

import { WidgetCard } from "@/components/widgets/widget-card";
import { WidgetEmptyState } from "@/components/widgets/widget-empty-state";
import { WidgetErrorState } from "@/components/widgets/widget-error-state";
import { WidgetLoadingState } from "@/components/widgets/widget-loading-state";
import { WidgetNotConnectedState } from "@/components/widgets/widget-not-connected-state";
import { WidgetPermissionRequiredState } from "@/components/widgets/widget-permission-required-state";
import { Badge } from "@/components/ui/badge";
import type { WidgetPayload } from "@/features/integrations/types";

export function GoogleTasksWidget({ payload }: { payload: WidgetPayload }) {
  return (
    <WidgetCard provider="google_tasks" title="Tasks" payload={payload}>
      {payload.state === "loading" ? <WidgetLoadingState /> : null}
      {payload.state === "error" ? (
        <WidgetErrorState message={payload.error ?? "Tasks could not load."} />
      ) : null}
      {payload.state === "empty" ? (
        <WidgetEmptyState message={payload.emptyMessage ?? "No tasks waiting."} />
      ) : null}
      {payload.state === "not_connected" ? (
        <WidgetNotConnectedState providerLabel="Google Tasks" />
      ) : null}
      {payload.state === "permission_required" ? (
        <WidgetPermissionRequiredState providerLabel="Google Tasks" />
      ) : null}
      {payload.state === "connected" ? (
        <div className="space-y-3">
          {payload.items.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="border-border/60 flex items-center justify-between gap-3 rounded-2xl border p-3"
            >
              <div className="min-w-0">
                <p className="leading-5 font-medium">{item.title}</p>
                <p className="text-muted-foreground truncate text-sm">{item.subtitle}</p>
              </div>
              <Badge variant="secondary" className="rounded-full px-2.5">
                {item.dueAt ? format(new Date(item.dueAt), "MMM d") : item.status}
              </Badge>
            </div>
          ))}
        </div>
      ) : null}
    </WidgetCard>
  );
}
