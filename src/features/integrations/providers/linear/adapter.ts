import { linearGraphqlFetch } from "@/features/integrations/providers/linear/client";
import type { WidgetItem, WidgetPriority } from "@/features/integrations/types";

type LinearAssignedIssuesResponse = {
  viewer: {
    assignedIssues: {
      nodes: Array<{
        id: string;
        identifier: string;
        title: string;
        priority?: number | null;
        dueDate?: string | null;
        updatedAt?: string | null;
        url?: string | null;
        state?: { name?: string | null; type?: string | null; color?: string | null } | null;
        project?: { name?: string | null } | null;
        team?: { name?: string | null; key?: string | null } | null;
        assignee?: {
          name?: string | null;
          displayName?: string | null;
          avatarUrl?: string | null;
        } | null;
      }>;
    };
  };
};

function mapLinearPriority(priority: number | null | undefined): WidgetPriority {
  switch (priority) {
    case 1:
      return "urgent";
    case 2:
      return "high";
    case 3:
      return "medium";
    default:
      return "low";
  }
}

// Higher value = sorts first. Mirrors Linear's "My issues" priority grouping
// (Urgent → High → Medium → Low → No priority).
const PRIORITY_RANK: Record<number, number> = { 1: 4, 2: 3, 3: 2, 4: 1, 0: 0 };

// Workflow ordering used by Linear: started/in-progress work bubbles above
// backlog and unstarted, completed/cancelled sink to the bottom.
const STATE_TYPE_RANK: Record<string, number> = {
  started: 5,
  unstarted: 4,
  backlog: 3,
  triage: 2,
  completed: 1,
  canceled: 0,
};

export async function getLinearItems(userId: string): Promise<WidgetItem[]> {
  const data = await linearGraphqlFetch<LinearAssignedIssuesResponse>(
    userId,
    `
      query MyDockAssignedIssues {
        viewer {
          assignedIssues(first: 100) {
            nodes {
              id
              identifier
              title
              priority
              dueDate
              updatedAt
              url
              state {
                name
                type
                color
              }
              project {
                name
              }
              team {
                name
                key
              }
              assignee {
                name
                displayName
                avatarUrl
              }
            }
          }
        }
      }
    `,
  );

  return (data.viewer.assignedIssues.nodes ?? [])
    .filter((issue) => {
      const type = issue.state?.type ?? "";
      return type !== "completed" && type !== "canceled";
    })
    .map((issue) => {
      const priorityValue = issue.priority ?? 0;
      const stateType = issue.state?.type ?? "backlog";
      const assigneeName = issue.assignee?.displayName ?? issue.assignee?.name ?? undefined;

      return {
        id: issue.identifier,
        provider: "linear" as const,
        title: issue.title,
        subtitle: issue.team?.name ?? issue.team?.key ?? "Linear",
        status: issue.state?.name ?? undefined,
        priority: mapLinearPriority(issue.priority),
        dueAt: issue.dueDate ? new Date(issue.dueDate).toISOString() : undefined,
        occurredAt: issue.updatedAt ?? undefined,
        url: issue.url ?? undefined,
        metadata: {
          project: issue.project?.name ?? undefined,
          team: issue.team?.name ?? issue.team?.key ?? undefined,
          priorityValue,
          stateType,
          stateColor: issue.state?.color ?? undefined,
          assigneeName,
          assigneeAvatarUrl: issue.assignee?.avatarUrl ?? undefined,
        },
      } satisfies WidgetItem;
    })
    .sort((a, b) => {
      const priorityDelta =
        (PRIORITY_RANK[(b.metadata?.priorityValue as number) ?? 0] ?? 0) -
        (PRIORITY_RANK[(a.metadata?.priorityValue as number) ?? 0] ?? 0);
      if (priorityDelta !== 0) return priorityDelta;

      const stateDelta =
        (STATE_TYPE_RANK[(b.metadata?.stateType as string) ?? "backlog"] ?? 0) -
        (STATE_TYPE_RANK[(a.metadata?.stateType as string) ?? "backlog"] ?? 0);
      if (stateDelta !== 0) return stateDelta;

      const aUpdated = a.occurredAt ? new Date(a.occurredAt).getTime() : 0;
      const bUpdated = b.occurredAt ? new Date(b.occurredAt).getTime() : 0;
      return bUpdated - aUpdated;
    });
}
