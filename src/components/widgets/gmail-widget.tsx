"use client";

import { format, isToday } from "date-fns";
import Link from "next/link";

import { useState } from "react";

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
import type { WidgetProps } from "@/features/integrations/types";

type GmailView = "all" | "unread";

/** Emails from today show the time (6:54 PM); older emails show the date (2 Jun). */
function formatEmailDate(iso?: string) {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  return isToday(date) ? format(date, "p") : format(date, "d MMM");
}

export function GmailWidget({
  payload,
  onRetry,
  isRetrying,
  configValue,
  onConfigChange,
}: WidgetProps) {
  // The grid owns the view so it can key the per-view fetch and persist it per
  // instance; fall back to local state when rendered standalone (e.g. previews).
  const [localView, setLocalView] = useState("all");
  const view = (configValue ?? localView) as GmailView;
  const setView = onConfigChange ?? setLocalView;

  // Each view is its own server-fetched list now — no client-side filtering.
  const items = payload.items;

  const emptyMessage =
    view === "unread"
      ? "No unread emails right now."
      : payload.emptyMessage ?? "Inbox zero. Nice.";

  const selectedLabel = view === "unread" ? "Unread" : "All";

  return (
    <WidgetCard
      provider="gmail"
      title="Gmail"
      headerBadge={
        payload.unreadCount && payload.unreadCount > 0 ? (
          <span className="text-[11px] leading-none whitespace-nowrap text-[#4285F4]">
            {payload.unreadCount} unread
          </span>
        ) : null
      }
      headerLabel={selectedLabel}
      headerControl={
        <Select value={view} onValueChange={(value) => setView(String(value))}>
          <SelectTrigger className="h-8 min-w-[102px] px-2.5 text-[13px]">
            <SelectValue>{() => selectedLabel}</SelectValue>
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {payload.state === "loading" ? <WidgetLoadingState /> : null}
      {payload.state === "error" ? (
        <WidgetErrorState
          message={payload.error ?? "Gmail could not load."}
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      ) : null}
      {payload.state === "empty" ? <WidgetEmptyState message={emptyMessage} /> : null}
      {payload.state === "not_connected" ? (
        <WidgetNotConnectedState providerLabel="Gmail" />
      ) : null}
      {payload.state === "permission_required" ? (
        <WidgetPermissionRequiredState providerLabel="Gmail" />
      ) : null}
      {payload.state === "connected" ? (
        items.length > 0 ? (
          <div className="-mx-1 space-y-0.5">
            {items.slice(0, 10).map((item) => {
              const unread = item.metadata?.unread === true;
              const messageCount = Number(item.metadata?.messageCount ?? 1);

              return (
                <Link
                  key={item.id}
                  href={item.url ?? "https://mail.google.com/mail/u/0/#inbox"}
                  target="_blank"
                  rel="noreferrer"
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-[#F8F8FA]"
                >
                  <div className="min-w-0">
                    <p
                      className={
                        unread
                          ? "flex items-center gap-1 truncate text-[13px] font-semibold text-[#18181B]"
                          : "flex items-center gap-1 truncate text-[13px] font-normal text-[#3F3F46]"
                      }
                    >
                      <span className="truncate">{item.subtitle}</span>
                      {messageCount > 1 ? (
                        <span className="text-[11px] font-normal whitespace-nowrap text-[#A1A1AA]">
                          {messageCount}
                        </span>
                      ) : null}
                    </p>
                    <p
                      className={
                        unread
                          ? "truncate text-[12px] font-medium text-[#18181B]"
                          : "truncate text-[12px] font-normal text-[#71717A]"
                      }
                    >
                      {item.title}
                    </p>
                  </div>
                  <span
                    className={
                      unread
                        ? "pt-0.5 text-[10px] font-medium whitespace-nowrap text-[#71717A]"
                        : "pt-0.5 text-[10px] font-normal whitespace-nowrap text-[#A1A1AA]"
                    }
                  >
                    {formatEmailDate(item.occurredAt)}
                  </span>
                </Link>
              );
            })}
          </div>
        ) : (
          <WidgetEmptyState message={emptyMessage} />
        )
      ) : null}
    </WidgetCard>
  );
}
