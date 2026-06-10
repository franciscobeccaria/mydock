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

type CalendarView = "today" | "next";

export function GoogleCalendarWidget({ payload }: { payload: WidgetPayload }) {
  const [view, setView] = useState<CalendarView>("today");

  const items = useMemo(() => {
    if (view === "today") {
      return payload.items.filter((item) => {
        if (!item.occurredAt) return false;
        return isToday(new Date(item.occurredAt));
      });
    }

    // "next" — every upcoming event (adapter already returns timeMin = now,
    // ordered by start time).
    return payload.items;
  }, [payload.items, view]);

  const emptyMessage =
    view === "today"
      ? "No events today."
      : payload.emptyMessage ?? "No upcoming events.";

  const selectedLabel = view === "next" ? "All next" : "All today";

  return (
    <WidgetCard
      provider="google_calendar"
      title="Calendar"
      headerLabel={selectedLabel}
      headerControl={
        <Select value={view} onValueChange={(value) => setView(value as CalendarView)}>
          <SelectTrigger className="h-8 min-w-[108px] px-2.5 text-[13px]">
            <SelectValue>{() => selectedLabel}</SelectValue>
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">All today</SelectItem>
            <SelectItem value="next">All next</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {payload.state === "loading" ? <WidgetLoadingState /> : null}
      {payload.state === "error" ? (
        <WidgetErrorState message={payload.error ?? "Calendar could not load."} />
      ) : null}
      {payload.state === "empty" ? <WidgetEmptyState message={emptyMessage} /> : null}
      {payload.state === "not_connected" ? (
        <WidgetNotConnectedState providerLabel="Google Calendar" />
      ) : null}
      {payload.state === "permission_required" ? (
        <WidgetPermissionRequiredState providerLabel="Google Calendar" />
      ) : null}
      {payload.state === "connected" ? (
        items.length > 0 ? (
          <div className="-mx-1 space-y-0.5">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[54px_minmax(0,1fr)] gap-2 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-[#F8F8FA]"
              >
                <div className="pt-0.5 text-[10px] font-medium text-[#71717A]">
                  {item.occurredAt ? format(new Date(item.occurredAt), "p") : "All day"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-[#18181B]">
                    {item.title}
                  </p>
                  {item.metadata?.location ? (
                    <p className="mt-0.5 truncate text-[11px] text-[#71717A]">
                      {item.metadata.location as string}
                    </p>
                  ) : null}
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
