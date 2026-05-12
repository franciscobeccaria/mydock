"use client";

import { endOfWeek, format, isToday, isTomorrow, isWithinInterval } from "date-fns";
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

type CalendarView = "today" | "this_week" | "upcoming";

export function GoogleCalendarWidget({ payload }: { payload: WidgetPayload }) {
  const [view, setView] = useState<CalendarView>("today");

  const items = useMemo(() => {
    if (view === "today") {
      return payload.items.filter((item) => {
        if (!item.occurredAt) return false;
        const date = new Date(item.occurredAt);
        return isToday(date) || isTomorrow(date);
      });
    }

    if (view === "this_week") {
      const now = new Date();
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      return payload.items.filter((item) => {
        if (!item.occurredAt) return false;
        return isWithinInterval(new Date(item.occurredAt), { start: now, end: weekEnd });
      });
    }

    return payload.items;
  }, [payload.items, view]);

  const emptyMessage =
    view === "today"
      ? "No events today or tomorrow."
      : view === "this_week"
        ? "Nothing else is scheduled this week."
        : payload.emptyMessage ?? "No events on deck.";

  return (
    <WidgetCard
      provider="google_calendar"
      title="Calendar"
      headerControl={
        <Select value={view} onValueChange={(value) => setView(value as CalendarView)}>
          <SelectTrigger className="min-w-[126px]">
            <SelectValue>
              {(value: CalendarView | null) => {
                if (value === "this_week") return "This week";
                if (value === "upcoming") return "Upcoming";
                return "Today";
              }}
            </SelectValue>
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="this_week">This week</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
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
          <div className="space-y-2.5">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[74px_minmax(0,1fr)] gap-4 rounded-[22px] border border-[#ECECEF] bg-[#FCFCFC] px-4 py-3"
              >
                <div className="pt-0.5 text-sm font-medium text-[#71717A]">
                  {item.occurredAt ? format(new Date(item.occurredAt), "p") : "All day"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-start gap-2">
                    <span className="mt-1.5 size-2 rounded-full bg-[#3B82F6]" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[#18181B]">
                        {item.title}
                      </p>
                      <p className="mt-1 truncate text-sm text-[#71717A]">
                        {(item.metadata?.location as string | undefined) ?? "No location"}
                      </p>
                    </div>
                  </div>
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
