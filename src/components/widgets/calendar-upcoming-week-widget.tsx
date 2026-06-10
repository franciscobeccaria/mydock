"use client";

import { endOfDay, format, isToday, startOfDay } from "date-fns";
import { AlertTriangle, MapPin, Video } from "lucide-react";
import { useMemo } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  accentForEvent,
  formatTimeRange,
  getWeekDays,
  hasConflict,
  hasDotForDay,
  meetingPlatformLabel,
  toCalendarEvent,
  type CalendarWidgetEvent,
} from "@/components/widgets/calendar/calendar-utils";
import { WidgetCard } from "@/components/widgets/widget-card";
import { WidgetErrorState } from "@/components/widgets/widget-error-state";
import { WidgetLoadingState } from "@/components/widgets/widget-loading-state";
import { WidgetNotConnectedState } from "@/components/widgets/widget-not-connected-state";
import { WidgetPermissionRequiredState } from "@/components/widgets/widget-permission-required-state";
import type { WidgetProps } from "@/features/integrations/types";
import { cn } from "@/lib/utils";

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function CalendarUpcomingWeekWidget({ payload, onRetry, isRetrying }: WidgetProps) {
  const today = useMemo(() => new Date(), []);
  const weekDays = useMemo(() => getWeekDays(today), [today]);

  const allEvents = useMemo(
    () =>
      payload.items
        .map(toCalendarEvent)
        .filter((e): e is CalendarWidgetEvent => e !== null),
    [payload.items],
  );

  const weekStart = startOfDay(weekDays[0]);
  const weekEnd = endOfDay(weekDays[6]);
  const weekEvents = useMemo(
    () => allEvents.filter((e) => e.start >= weekStart && e.start <= weekEnd),
    [allEvents, weekStart, weekEnd],
  );

  const upcomingEvents = useMemo(
    () =>
      weekEvents
        .filter((e) => e.start >= startOfDay(today))
        .sort((a, b) => a.start.getTime() - b.start.getTime())
        .slice(0, 5),
    [weekEvents, today],
  );

  const weekLabel = `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d")}`;

  return (
    <WidgetCard provider="google_calendar" title="Upcoming week">
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
        <div className="flex h-full flex-col gap-2">
          {/* Week range subtitle */}
          <p className="text-[11px] text-[#71717A]">{weekLabel}</p>

          {/* 7-day strip */}
          <div className="flex items-stretch gap-0.5">
            {weekDays.map((day) => {
              const active = isToday(day);
              const hasDot = hasDotForDay(day, weekEvents);

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-0.5 rounded-[8px] py-1",
                    active && "bg-[#4285F4]",
                  )}
                >
                  <span
                    className={cn(
                      "text-[9px] font-medium uppercase tracking-wide",
                      active ? "text-white/80" : "text-[#A1A1AA]",
                    )}
                  >
                    {format(day, "EEEEE")}
                  </span>
                  <span
                    className={cn(
                      "text-[12px] font-semibold",
                      active ? "text-white" : "text-[#18181B]",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div
                    className={cn(
                      "size-1 rounded-full",
                      hasDot ? (active ? "bg-white/60" : "bg-[#4285F4]") : "bg-transparent",
                    )}
                  />
                </div>
              );
            })}
          </div>

          {/* Upcoming events list */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {upcomingEvents.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-[13px] font-medium text-[#18181B]">Nothing left this week</p>
                <p className="mt-0.5 text-[11px] text-[#71717A]">Check back next week.</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {upcomingEvents.map((event) => {
                  const accent = accentForEvent(event);
                  const platform = meetingPlatformLabel(event);
                  const conflict = hasConflict(event, weekEvents);
                  return (
                    <div
                      key={event.id}
                      className="flex items-stretch gap-2 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-[#F8F8FA]"
                    >
                      <div
                        className="w-0.5 shrink-0 self-stretch rounded-full"
                        style={{ backgroundColor: accent }}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-medium text-[#A1A1AA]">
                          {isToday(event.start)
                            ? formatTimeRange(event)
                            : `${format(event.start, "EEE")} · ${formatTimeRange(event)}`}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-[13px] font-medium text-[#18181B]">
                            {event.title}
                          </p>
                          {conflict && (
                            <Badge
                              variant="destructive"
                              className="h-4 shrink-0 gap-0.5 px-1 py-0 text-[9px]"
                            >
                              <AlertTriangle className="size-2.5" />
                              conflict
                            </Badge>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2">
                          <div className="flex items-center gap-1 text-[11px] text-[#71717A]">
                            {event.hangoutLink ? (
                              <span className="flex items-center gap-0.5">
                                <Video className="size-3" />
                                {platform ?? "Meet"}
                              </span>
                            ) : event.location ? (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="size-3" />
                                <span className="truncate max-w-[100px]">{event.location}</span>
                              </span>
                            ) : null}
                          </div>

                          {event.attendees.length > 0 && (
                            <div className="ml-auto flex -space-x-1">
                              {event.attendees.slice(0, 3).map((a, i) => (
                                <Avatar
                                  key={a.email ?? i}
                                  className="size-4 border border-white text-[7px]"
                                >
                                  <AvatarFallback className="bg-[#EEF2FF] text-[#4285F4] text-[7px]">
                                    {getInitials(a.name)}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
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
