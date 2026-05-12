"use client";

import { format, isToday } from "date-fns";
import { useMemo, useState } from "react";

import { WidgetCard } from "@/components/widgets/widget-card";
import { WidgetEmptyState } from "@/components/widgets/widget-empty-state";
import { WidgetErrorState } from "@/components/widgets/widget-error-state";
import { WidgetLoadingState } from "@/components/widgets/widget-loading-state";
import { WidgetNotConnectedState } from "@/components/widgets/widget-not-connected-state";
import { WidgetPermissionRequiredState } from "@/components/widgets/widget-permission-required-state";
import {
  Select,
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WidgetPayload } from "@/features/integrations/types";

type TasksView = "mine" | "today" | "all";

export function GoogleTasksWidget({ payload }: { payload: WidgetPayload }) {
  const [view, setView] = useState<TasksView>("mine");

  const items = useMemo(() => {
    if (view === "today") {
      return payload.items.filter((item) => item.dueAt && isToday(new Date(item.dueAt)));
    }

    return payload.items;
  }, [payload.items, view]);

  const emptyMessage =
    view === "today"
      ? "No tasks due today."
      : payload.emptyMessage ?? "No tasks waiting.";

  return (
    <WidgetCard
      provider="google_tasks"
      title="Tasks"
      headerControl={
        <Select value={view} onValueChange={(value) => setView(value as TasksView)}>
          <SelectTrigger className="min-w-[108px]">
            <SelectValue />
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mine">Mine</SelectItem>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {payload.state === "loading" ? <WidgetLoadingState /> : null}
      {payload.state === "error" ? (
        <WidgetErrorState message={payload.error ?? "Tasks could not load."} />
      ) : null}
      {payload.state === "empty" ? <WidgetEmptyState message={emptyMessage} /> : null}
      {payload.state === "not_connected" ? (
        <WidgetNotConnectedState providerLabel="Google Tasks" />
      ) : null}
      {payload.state === "permission_required" ? (
        <WidgetPermissionRequiredState providerLabel="Google Tasks" />
      ) : null}
      {payload.state === "connected" ? (
        items.length > 0 ? (
          <div className="space-y-2.5">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-[22px] border border-[#ECECEF] bg-[#FCFCFC] px-4 py-3"
              >
                <span className="mt-1 size-4 rounded-full border border-[#D4D4D8] bg-white" />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm leading-5 font-medium text-[#18181B]">
                    {item.title}
                  </p>
                  <p className="mt-1 truncate text-sm text-[#71717A]">
                    {item.subtitle ?? "My tasks"}
                  </p>
                </div>
                <div className="pt-0.5 text-right text-xs font-medium whitespace-nowrap text-[#71717A]">
                  {item.dueAt ? format(new Date(item.dueAt), "MMM d") : "Mine"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <WidgetEmptyState message={emptyMessage} />
        )
      ) : null}
    </WidgetCard>
  );
}
