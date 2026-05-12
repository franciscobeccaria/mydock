"use client";

import { format } from "date-fns";
import { useMemo, useState } from "react";

import { WidgetCard } from "@/components/widgets/widget-card";
import { WidgetEmptyState } from "@/components/widgets/widget-empty-state";
import { WidgetErrorState } from "@/components/widgets/widget-error-state";
import { WidgetLoadingState } from "@/components/widgets/widget-loading-state";
import { WidgetNotConnectedState } from "@/components/widgets/widget-not-connected-state";
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

export function LinearWidget({ payload }: { payload: WidgetPayload }) {
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

  const [project, setProject] = useState<string>("all_projects");

  const items = useMemo(() => {
    if (project === "all_projects") {
      return payload.items;
    }

    return payload.items.filter((item) => item.metadata?.project === project);
  }, [payload.items, project]);

  return (
    <WidgetCard
      provider="linear"
      title="Linear"
      headerControl={
        <Select value={project} onValueChange={(value) => setProject(String(value))}>
          <SelectTrigger className="min-w-[132px]">
            <SelectValue>
              {(value: string | null) => (value === "all_projects" || !value ? "Project" : value)}
            </SelectValue>
            <SelectIcon />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_projects">Project</SelectItem>
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
        <WidgetErrorState message={payload.error ?? "Linear could not load."} />
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
          <div className="space-y-2.5">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="rounded-[22px] border border-[#ECECEF] bg-[#FCFCFC] px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium tracking-[0.18em] text-[#71717A] uppercase">
                      {item.id}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm leading-5 font-medium text-[#18181B]">
                      {item.title}
                    </p>
                  </div>
                  {item.status ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-[#F4F4F5] px-2 py-0.5 text-[11px] font-medium text-[#52525B]"
                    >
                      {item.status}
                    </Badge>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[#71717A]">
                  <span className="truncate">
                    {(item.metadata?.project as string | undefined) ?? item.subtitle ?? "Linear"}
                  </span>
                  <span className="shrink-0">
                    {item.dueAt ? format(new Date(item.dueAt), "MMM d") : "No due date"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <WidgetEmptyState message="No issues need attention." />
        )
      ) : null}
    </WidgetCard>
  );
}
