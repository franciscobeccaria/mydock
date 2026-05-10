import type { WidgetItem } from "@/features/integrations/types";

export const linearMockItems: WidgetItem[] = [
  {
    id: "ENG-241",
    provider: "linear",
    title: "Implement bulk import for CSV",
    subtitle: "Revenue Ops workspace",
    status: "In Progress",
    priority: "high",
    dueAt: "2026-05-12T15:00:00.000Z",
    metadata: { project: "Sprint 24", assignee: "Jonas" },
  },
  {
    id: "ENG-238",
    provider: "linear",
    title: "Improve dashboard performance",
    subtitle: "Homepage metrics refresh",
    status: "In Progress",
    priority: "medium",
    dueAt: "2026-05-13T18:00:00.000Z",
    metadata: { project: "Sprint 24", assignee: "Maya" },
  },
  {
    id: "ENG-232",
    provider: "linear",
    title: "Add filters to activity feed",
    subtitle: "Reduce noise on updates",
    status: "Done",
    priority: "low",
    metadata: { project: "Sprint 23", assignee: "Tom" },
  },
  {
    id: "ENG-229",
    provider: "linear",
    title: "Fix allocation rounding error",
    subtitle: "Customer finance edge case",
    status: "High Priority",
    priority: "urgent",
    dueAt: "2026-05-11T14:30:00.000Z",
    metadata: { project: "Hotfix queue", assignee: "Ana" },
  },
];
