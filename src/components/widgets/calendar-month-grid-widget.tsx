"use client";

import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight, MapPin, Video } from "lucide-react";
import { useMemo, useState } from "react";

import {
  accentForEvent,
  eventsForDay,
  formatTimeRange,
  getMonthGridDays,
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

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

export function CalendarMonthGridWidget({ payload, onRetry, isRetrying }: WidgetProps) {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const allEvents = useMemo(
    () =>
      payload.items
        .map(toCalendarEvent)
        .filter((e): e is CalendarWidgetEvent => e !== null),
    [payload.items],
  );

  const gridDays = useMemo(() => getMonthGridDays(viewMonth), [viewMonth]);
  const dayEvents = useMemo(
    () => eventsForDay(selectedDay, allEvents),
    [selectedDay, allEvents],
  );

  // Forward-only: never page earlier than the current month.
  const canGoBack = !isSameMonth(viewMonth, today) && viewMonth > today;

  function selectDay(day: Date) {
    setSelectedDay(day);
    if (!isSameMonth(day, viewMonth)) setViewMonth(startOfMonth(day));
  }

  function goToToday() {
    setViewMonth(startOfMonth(today));
    setSelectedDay(today);
  }

  const isOnToday = isToday(selectedDay) && isSameMonth(viewMonth, today);

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
        <div className="flex h-full gap-3">
          {/* Month grid */}
          <div className="flex min-w-0 flex-1 flex-col">
            {/* Month nav */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={!canGoBack}
                onClick={() => setViewMonth((m) => subMonths(m, 1))}
                className="flex size-5 items-center justify-center rounded-md text-[#71717A] transition-colors hover:bg-[#F4F4F5] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Previous month"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <span className="text-[12px] font-semibold text-[#18181B]">
                {format(viewMonth, "MMMM yyyy")}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                className="flex size-5 items-center justify-center rounded-md text-[#71717A] transition-colors hover:bg-[#F4F4F5]"
                aria-label="Next month"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>

            {/* Weekday header */}
            <div className="mt-1.5 grid grid-cols-7">
              {WEEKDAY_LABELS.map((label, i) => (
                <span
                  key={i}
                  className="text-center text-[9px] font-medium uppercase tracking-wide text-[#A1A1AA]"
                >
                  {label}
                </span>
              ))}
            </div>

            {/* Day grid */}
            <div className="mt-0.5 grid flex-1 grid-cols-7 gap-y-0.5">
              {gridDays.map((day) => {
                const selected = isSameDay(day, selectedDay);
                const inMonth = isSameMonth(day, viewMonth);
                const isCurrent = isToday(day);
                const hasDot = hasDotForDay(day, allEvents);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => selectDay(day)}
                    className="flex flex-col items-center justify-start gap-0.5 py-0.5"
                  >
                    <span
                      className={cn(
                        "flex size-[22px] items-center justify-center rounded-full text-[11px] font-medium transition-colors",
                        selected
                          ? "bg-[#4285F4] text-white"
                          : isCurrent
                            ? "font-semibold text-[#4285F4]"
                            : inMonth
                              ? "text-[#18181B] hover:bg-[#F4F4F5]"
                              : "text-[#D4D4D8] hover:bg-[#F4F4F5]",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <div
                      className={cn(
                        "size-1 rounded-full",
                        hasDot && !selected ? "bg-[#4285F4]" : "bg-transparent",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day agenda */}
          <div className="flex w-[46%] shrink-0 flex-col border-l border-[#F0F0F2] pl-3">
            {/* Agenda header */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[24px] font-bold leading-none tracking-tight text-[#18181B]">
                    {format(selectedDay, "d")}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-[#4285F4]">
                    {format(selectedDay, "EEE")}
                  </span>
                </div>
                <p className="mt-1 truncate text-[11px] text-[#71717A]">
                  {format(selectedDay, "EEEE, MMM d")}
                </p>
                <p className="text-[10px] text-[#A1A1AA]">
                  {dayEvents.length} {dayEvents.length === 1 ? "event" : "events"}
                </p>
              </div>
              {!isOnToday && (
                <button
                  type="button"
                  onClick={goToToday}
                  className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-[#4285F4] transition-colors hover:bg-[#EEF2FF]"
                >
                  Today
                </button>
              )}
            </div>

            {/* Agenda list */}
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
              {dayEvents.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <p className="text-[12px] font-medium text-[#18181B]">No events</p>
                  <p className="mt-0.5 text-[10px] text-[#71717A]">Nothing scheduled.</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {dayEvents.map((event) => {
                    const accent = accentForEvent(event);
                    const platform = meetingPlatformLabel(event);
                    return (
                      <div
                        key={event.id}
                        className="flex items-stretch gap-2 rounded-[10px] px-1.5 py-1.5 transition-colors hover:bg-[#F8F8FA]"
                      >
                        <div
                          className="w-0.5 shrink-0 self-stretch rounded-full"
                          style={{ backgroundColor: accent }}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-medium text-[#A1A1AA]">
                            {formatTimeRange(event)}
                          </p>
                          <p className="truncate text-[12px] font-medium text-[#18181B]">
                            {event.title}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-[#71717A]">
                            {event.hangoutLink ? (
                              <span className="flex items-center gap-0.5">
                                <Video className="size-3" />
                                {platform ?? "Meet"}
                              </span>
                            ) : event.location ? (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="size-3" />
                                <span className="max-w-[90px] truncate">{event.location}</span>
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
