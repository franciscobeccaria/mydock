import { format } from "date-fns";

import { WidgetCard } from "@/components/widgets/widget-card";
import { WidgetEmptyState } from "@/components/widgets/widget-empty-state";
import { WidgetErrorState } from "@/components/widgets/widget-error-state";
import { WidgetLoadingState } from "@/components/widgets/widget-loading-state";
import { WidgetNotConnectedState } from "@/components/widgets/widget-not-connected-state";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WidgetPayload } from "@/features/integrations/types";

export function LinearWidget({ payload }: { payload: WidgetPayload }) {
  return (
    <WidgetCard provider="linear" title="Linear" payload={payload}>
      {payload.state === "loading" ? <WidgetLoadingState /> : null}
      {payload.state === "error" ? (
        <WidgetErrorState message={payload.error ?? "Linear could not load."} />
      ) : null}
      {payload.state === "empty" ? (
        <WidgetEmptyState message={payload.emptyMessage ?? "No issues need attention."} />
      ) : null}
      {payload.state === "not_connected" ? (
        <WidgetNotConnectedState providerLabel="Linear" />
      ) : null}
      {payload.state === "connected" ? (
        <ScrollArea className="h-[290px] pr-4">
          <div className="space-y-3">
            {payload.items.slice(0, 5).map((item) => (
              <div key={item.id} className="border-border/60 rounded-2xl border p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-muted-foreground text-xs font-medium tracking-[0.18em] uppercase">
                    {item.id}
                  </p>
                  <Badge
                    variant={
                      item.priority === "urgent" || item.priority === "high"
                        ? "destructive"
                        : "secondary"
                    }
                    className="rounded-full px-2.5"
                  >
                    {item.status}
                  </Badge>
                </div>
                <p className="leading-5 font-medium">{item.title}</p>
                <div className="text-muted-foreground mt-2 flex items-center justify-between gap-3 text-sm">
                  <span>{item.subtitle}</span>
                  <span>
                    {item.dueAt ? format(new Date(item.dueAt), "MMM d") : "No due date"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : null}
    </WidgetCard>
  );
}
