"use client";

import { format } from "date-fns";
import { useMemo } from "react";

import { useWidgetPreference } from "@/components/dashboard/use-widget-preference";
import { WidgetCard } from "@/components/widgets/widget-card";
import { WidgetEmptyState } from "@/components/widgets/widget-empty-state";
import { WidgetErrorState } from "@/components/widgets/widget-error-state";
import { WidgetLoadingState } from "@/components/widgets/widget-loading-state";
import { WidgetNotConnectedState } from "@/components/widgets/widget-not-connected-state";
import { LinearPriorityIcon, LinearStatusIcon } from "@/components/widgets/linear-icons";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WidgetItem, WidgetProps } from "@/features/integrations/types";

/**
 * Linear issue URLs look like https://linear.app/<workspace>/issue/ABC-123/...
 * Pull the workspace slug off the first item that has a URL so we can link to
 * the user's own "My Issues → Assigned" view (matches what the widget shows).
 * Returns undefined when no Linear URL is available yet.
 */
export function deriveLinearAssignedUrl(items: WidgetItem[]): string | undefined {
  const firstUrl = items.find((item) => item.url)?.url;
  if (!firstUrl) return undefined;

  try {
    const { hostname, pathname } = new URL(firstUrl);
    if (hostname !== "linear.app") return undefined;
    const workspace = pathname.split("/").filter(Boolean)[0];
    return workspace ? `https://linear.app/${workspace}/my-issues/assigned` : undefined;
  } catch {
    return undefined;
  }
}

function initialsFromName(name: string | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function LinearIssueRow({ item }: { item: WidgetItem }) {
  const project = item.metadata?.project as string | undefined;
  const assigneeName = item.metadata?.assigneeName as string | undefined;
  const assigneeAvatarUrl = item.metadata?.assigneeAvatarUrl as string | undefined;
  const stateType = item.metadata?.stateType as string | undefined;
  const stateColor = item.metadata?.stateColor as string | undefined;
  const priorityValue = (item.metadata?.priorityValue as number | undefined) ?? 0;

  const content = (
    <>
      <LinearPriorityIcon priority={priorityValue} />
      <LinearStatusIcon stateType={stateType} color={stateColor} />
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[#18181B]">
        {item.title}
      </span>
      {project ? (
        <Badge
          variant="secondary"
          className="hidden shrink-0 rounded-md bg-[#F4F4F5] px-1.5 py-0.5 text-[10px] font-medium text-[#52525B] sm:inline-flex"
        >
          {project}
        </Badge>
      ) : null}
      <Avatar size="sm" className="size-5 shrink-0">
        {assigneeAvatarUrl ? <AvatarImage src={assigneeAvatarUrl} alt={assigneeName ?? ""} /> : null}
        <AvatarFallback className="bg-[#E4E4E7] text-[9px] font-medium text-[#52525B]">
          {initialsFromName(assigneeName)}
        </AvatarFallback>
      </Avatar>
      <span className="w-10 shrink-0 text-right text-[11px] text-[#8A8F98]">
        {item.dueAt
          ? format(new Date(item.dueAt), "MMM d")
          : item.occurredAt
            ? format(new Date(item.occurredAt), "MMM d")
            : ""}
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

export function LinearWidget({ payload, onRetry, isRetrying }: WidgetProps) {
  const projectOptions = useMemo(() => {
    const uniqueProjects = Array.from(
      new Set(
        payload.items
          .map((item) => item.metadata?.project)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      ),
    );

    return ["all_projects", ...uniqueProjects];
  }, [payload.items]);

  const [project, setProject] = useWidgetPreference("linear-project", "all_projects");

  const items = useMemo(() => {
    // A persisted project may no longer exist (renamed/removed) — fall back to all.
    if (project === "all_projects" || !projectOptions.includes(project)) {
      return payload.items;
    }

    return payload.items.filter((item) => item.metadata?.project === project);
  }, [payload.items, project, projectOptions]);

  const selectedLabel =
    !project || project === "all_projects" || !projectOptions.includes(project)
      ? "All issues"
      : project;

  const workspaceUrl = useMemo(
    () => deriveLinearAssignedUrl(payload.items),
    [payload.items],
  );

  return (
    <WidgetCard
      provider="linear"
      title="Linear"
      titleHref={workspaceUrl}
      headerLabel={selectedLabel}
      headerControl={
        <Select value={project} onValueChange={(value) => setProject(String(value))}>
          <SelectTrigger className="h-8 min-w-[112px] px-2.5 text-[13px]">
            <SelectValue>{() => selectedLabel}</SelectValue>
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_projects">All issues</SelectItem>
            {projectOptions
              .filter((option) => option !== "all_projects")
              .map((option) => (
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
          message={payload.error ?? "Linear could not load."}
          onRetry={onRetry}
          isRetrying={isRetrying}
        />
      ) : null}
      {payload.state === "empty" ? (
        <WidgetEmptyState message={payload.emptyMessage ?? "No issues need attention."} />
      ) : null}
      {payload.state === "not_connected" ? (
        <WidgetNotConnectedState
          providerLabel="Linear"
          actionHref="/api/integrations/linear/start?next=/dashboard"
          actionLabel="Connect Linear"
        />
      ) : null}
      {payload.state === "connected" ? (
        items.length > 0 ? (
          <div className="-mx-1 space-y-0.5">
            {items.slice(0, 10).map((item) => (
              <LinearIssueRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <WidgetEmptyState message="No issues need attention." />
        )
      ) : null}
    </WidgetCard>
  );
}
