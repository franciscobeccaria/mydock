"use client";

import { format } from "date-fns";
import { Circle } from "lucide-react";
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
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WidgetProps } from "@/features/integrations/types";

// Reserved sentinel filter value; any other value is a literal list name.
// Google's "Starred" smart list is intentionally absent: the public Tasks API
// exposes no starred status, so such a filter could only ever show wrong data.
const ALL = "all";

export function GoogleTasksWidget({
  payload,
  onRetry,
  isRetrying,
  configValue,
  onConfigChange,
}: WidgetProps) {
  // The list names are already carried on each task by the adapter, so the
  // per-list filter is derived client-side (mirrors the Linear widget).
  const listOptions = useMemo(
    () =>
      Array.from(
        new Set(
          payload.items
            .map((item) => item.metadata?.list)
            .filter((value): value is string => typeof value === "string" && value.length > 0),
        ),
      ),
    [payload.items],
  );

  // The grid owns the list filter so it persists per instance; fall back to
  // local state when rendered standalone (e.g. previews).
  const [localView, setLocalView] = useState(ALL);
  const viewPref = configValue ?? localView;
  const setView = onConfigChange ?? setLocalView;
  // A persisted list may no longer exist (renamed/removed) — fall back to all.
  const view = viewPref === ALL || listOptions.includes(viewPref) ? viewPref : ALL;

  const items = useMemo(() => {
    if (view !== ALL) {
      return payload.items.filter((item) => item.metadata?.list === view);
    }

    // Already sorted newest-first by `updated` in the adapter.
    return payload.items;
  }, [payload.items, view]);

  const emptyMessage =
    view !== ALL
      ? `No tasks in ${view}.`
      : payload.emptyMessage ?? "No tasks waiting.";

  const selectedLabel = view !== ALL && listOptions.includes(view) ? view : "All";

  return (
    <WidgetCard
      provider="google_tasks"
      title="Tasks"
      headerLabel={selectedLabel}
      headerControl={
        <Select value={view} onValueChange={(value) => setView(String(value))}>
          <SelectTrigger className="h-8 min-w-[94px] px-2.5 text-[13px]">
            <SelectValue>{() => selectedLabel}</SelectValue>
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All</SelectItem>
            {listOptions.length > 0 ? <SelectSeparator /> : null}
            {listOptions.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {payload.state === "loading" ? <WidgetLoadingState /> : null}
      {payload.state === "error" ? (
        <WidgetErrorState
          message={payload.error ?? "Tasks could not load."}
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
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
          <div className="-mx-1 space-y-0.5">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-[#F8F8FA]"
              >
                <Circle className="size-4 shrink-0 text-[#C2C5CB]" strokeWidth={1.75} />
                <p className="line-clamp-1 text-[13px] font-medium text-[#18181B]">
                  {item.title}
                </p>
                <span className="shrink-0 text-[11px] whitespace-nowrap text-[#71717A]">
                  {item.occurredAt ? format(new Date(item.occurredAt), "MMM d") : ""}
                </span>
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
