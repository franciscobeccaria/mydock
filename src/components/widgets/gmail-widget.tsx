"use client";

import { format } from "date-fns";
import { useMemo, useState } from "react";

import { WidgetCard } from "@/components/widgets/widget-card";
import { WidgetEmptyState } from "@/components/widgets/widget-empty-state";
import { WidgetErrorState } from "@/components/widgets/widget-error-state";
import { WidgetLoadingState } from "@/components/widgets/widget-loading-state";
import { WidgetNotConnectedState } from "@/components/widgets/widget-not-connected-state";
import { WidgetPermissionRequiredState } from "@/components/widgets/widget-permission-required-state";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WidgetPayload } from "@/features/integrations/types";

type GmailView = "inbox" | "unread" | "important";

export function GmailWidget({ payload }: { payload: WidgetPayload }) {
  const [view, setView] = useState<GmailView>("inbox");

  const items = useMemo(() => {
    if (view === "unread") {
      return payload.items.filter((item) => item.metadata?.unread === true);
    }

    if (view === "important") {
      return payload.items.filter((item) => item.metadata?.important === true);
    }

    return payload.items;
  }, [payload.items, view]);

  const emptyMessage =
    view === "unread"
      ? "No unread emails right now."
      : view === "important"
        ? "No important emails right now."
        : payload.emptyMessage ?? "Inbox zero. Nice.";

  return (
    <WidgetCard
      provider="gmail"
      title="Gmail"
      headerControl={
        <Select value={view} onValueChange={(value) => setView(value as GmailView)}>
          <SelectTrigger className="min-w-[118px]">
            <SelectValue />
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="inbox">Inbox</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="important">Important</SelectItem>
          </SelectContent>
        </Select>
      }
      footerAction={{ label: "Open in Gmail", href: "https://mail.google.com/mail/u/0/#inbox" }}
    >
      {payload.state === "loading" ? <WidgetLoadingState /> : null}
      {payload.state === "error" ? (
        <WidgetErrorState message={payload.error ?? "Gmail could not load."} />
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
          <div className="space-y-2.5">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-[22px] border border-[#ECECEF] bg-[#FCFCFC] px-4 py-3"
              >
                <span className="mt-1 size-4 rounded-[5px] border border-[#D4D4D8] bg-white" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-[#18181B]">
                      {item.subtitle}
                    </p>
                    {item.metadata?.unread === true ? (
                      <Badge
                        variant="secondary"
                        className="rounded-full bg-[#EEF2FF] px-2 py-0.5 text-[11px] font-medium text-[#4338CA]"
                      >
                        Unread
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-sm font-medium text-[#18181B]">
                    {item.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-[#71717A]">
                    {item.summary}
                  </p>
                </div>
                <span className="pt-0.5 text-xs font-medium whitespace-nowrap text-[#71717A]">
                  {item.occurredAt ? format(new Date(item.occurredAt), "p") : ""}
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
