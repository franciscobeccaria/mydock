"use client";

import { format } from "date-fns";
import { FileText } from "lucide-react";

import { WidgetCard } from "@/components/widgets/widget-card";
import { WidgetEmptyState } from "@/components/widgets/widget-empty-state";
import { WidgetErrorState } from "@/components/widgets/widget-error-state";
import { WidgetLoadingState } from "@/components/widgets/widget-loading-state";
import { WidgetNotConnectedState } from "@/components/widgets/widget-not-connected-state";
import type { WidgetItem, WidgetProps } from "@/features/integrations/types";

const NOTION_HOME = "https://www.notion.so/";

function RecentPageRow({ item }: { item: WidgetItem }) {
  const emoji = item.metadata?.emoji as string | undefined;

  const content = (
    <>
      <span className="flex size-5 shrink-0 items-center justify-center text-[13px]">
        {emoji ?? <FileText className="size-3.5 text-[#A1A1AA]" />}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#18181B]">
        {item.title}
      </span>
      <span className="w-12 shrink-0 text-right text-[11px] text-[#8A8F98]">
        {item.occurredAt ? format(new Date(item.occurredAt), "MMM d") : ""}
      </span>
    </>
  );

  const className =
    "flex items-center gap-2 rounded-[10px] px-2 py-1.5 transition-colors hover:bg-[#F8F8FA]";

  return item.url ? (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      data-interactive="true"
      className={className}
    >
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

export function NotionRecentPagesWidget({ payload, onRetry, isRetrying }: WidgetProps) {
  return (
    <WidgetCard provider="notion" title="Recent pages" titleHref={NOTION_HOME}>
      {payload.state === "loading" ? <WidgetLoadingState /> : null}
      {payload.state === "error" ? (
        <WidgetErrorState
          message={payload.error ?? "Notion could not load."}
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      ) : null}
      {payload.state === "empty" ? (
        <WidgetEmptyState message={payload.emptyMessage ?? "No recent pages."} />
      ) : null}
      {payload.state === "not_connected" ? (
        <WidgetNotConnectedState
          providerLabel="Notion"
          actionHref="/connections"
          actionLabel="Connect Notion"
        />
      ) : null}
      {payload.state === "connected" ? (
        payload.items.length > 0 ? (
          <div className="-mx-1 space-y-0.5">
            {payload.items.slice(0, 12).map((item) => (
              <RecentPageRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <WidgetEmptyState message="No recent pages." />
        )
      ) : null}
    </WidgetCard>
  );
}
