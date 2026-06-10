"use client";

import { format, isToday } from "date-fns";
import { MapPin, Video } from "lucide-react";
import { useMemo } from "react";

import {
  accentForEvent,
  formatTimeRange,
  meetingPlatformLabel,
  toCalendarEvent,
} from "@/components/widgets/calendar/calendar-utils";
import { WidgetCard } from "@/components/widgets/widget-card";
import { WidgetErrorState } from "@/components/widgets/widget-error-state";
import { WidgetLoadingState } from "@/components/widgets/widget-loading-state";
import { WidgetNotConnectedState } from "@/components/widgets/widget-not-connected-state";
import { WidgetPermissionRequiredState } from "@/components/widgets/widget-permission-required-state";
import type { WidgetProps } from "@/features/integrations/types";

export function CalendarTodayAgendaWidget({ payload, onRetry, isRetrying }: WidgetProps) {
  const today = new Date();

  const events = useMemo(() => {
    return payload.items
      .map(toCalendarEvent)
      .filter((e): e is NonNullable<typeof e> => e !== null && isToday(e.start))
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .slice(0, 5);
  }, [payload.items]);

  return (
    <WidgetCard provider="google_calendar" title="Calendar">
      {payload.state === "loading" && <WidgetLoadingState />}
      {payload.state === "error" && (
        <WidgetErrorState
          message={payload.error ?? "Calendar could not load."}
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      )}
      {payload.state === "not_connected" && (
        <WidgetNotConnectedState providerLabel="Google Calendar" />
      )}
      {payload.state === "permission_required" && (
        <WidgetPermissionRequiredState providerLabel="Google Calendar" />
      )}
      {(payload.state === "connected" || payload.state === "empty") && (
        <div className="flex h-full gap-4">
          {/* Large date block */}
          <div className="flex w-14 shrink-0 flex-col items-center justify-start pt-1">
            <span className="text-[38px] font-bold leading-none tracking-tight text-[#18181B]">
              {format(today, "d")}
            </span>
            <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-widest text-[#4285F4]">
              {format(today, "EEE")}
            </span>
            <span className="text-[11px] font-medium text-[#71717A]">
              {format(today, "MMM")}
            </span>
          </div>

          {/* Agenda */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {events.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-[13px] font-medium text-[#18181B]">No more events today</p>
                <p className="mt-0.5 text-[11px] text-[#71717A]">Enjoy the extra focus time.</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {events.map((event) => {
                  const accent = accentForEvent(event);
                  const platform = meetingPlatformLabel(event);
                  return (
                    <div
                      key={event.id}
                      className="flex items-stretch gap-2 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-[#F8F8FA]"
                    >
                      {/* Color accent bar */}
                      <div
                        className="w-0.5 shrink-0 self-stretch rounded-full"
                        style={{ backgroundColor: accent }}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium text-[#A1A1AA]">
                          {formatTimeRange(event)}
                        </p>
                        <p className="truncate text-[13px] font-medium text-[#18181B]">
                          {event.title}
                        </p>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#71717A]">
                          {event.hangoutLink ? (
                            <span className="flex items-center gap-0.5">
                              <Video className="size-3" />
                              {platform ?? "Meet"}
                            </span>
                          ) : event.location ? (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="size-3" />
                              <span className="truncate max-w-[120px]">{event.location}</span>
                            </span>
                          ) : (
                            <span>Google Calendar</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
